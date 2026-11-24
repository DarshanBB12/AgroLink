const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const { deliver } = require("../services/messageService");

// userId -> Set of socket ids (a user can have several tabs/devices open at once)
const onlineUsers = new Map();

const setupSocket = (io) => {
  const emitToUser = (userId, event, payload) => {
    const sockets = onlineUsers.get(String(userId));
    if (!sockets) return false;
    sockets.forEach((sid) => io.to(sid).emit(event, payload));
    return true;
  };
  io.isOnline = (userId) => onlineUsers.has(String(userId));
  io.emitToUser = emitToUser;
  io.sendNotificationToUser = async (userId, notification) => {
    const delivered = emitToUser(userId, "notification:new", notification);
    try {
      const count = await Notification.countDocuments({ userId, isRead: false });
      emitToUser(userId, "notification:count", { unreadCount: count });
    } catch {}
    return delivered;
  };

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user || !user.isActive) return next(new Error("User not found or inactive"));
      if ((decoded.tv ?? 0) !== (user.tokenVersion ?? 0)) return next(new Error("Session is no longer valid"));
      socket.user = user;
      next();
    } catch (error) {
      next(new Error(error.name === "TokenExpiredError" ? "Session expired" : "Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    const isFirstTab = !onlineUsers.has(userId) || onlineUsers.get(userId).size === 0;
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Synchronously announce online users
    io.emit("users:online", Array.from(onlineUsers.keys()));

    // Synchronize initial counts to newly connected tab
    Notification.countDocuments({ userId, isRead: false })
      .then((c) => socket.emit("notification:count", { unreadCount: c }))
      .catch(() => {});
    Message.countDocuments({ receiverId: userId, isRead: false })
      .then((c) => socket.emit("messages:unread_count", { count: c }))
      .catch(() => {});

    // Mark undelivered messages to this user as delivered
    if (isFirstTab) {
      Message.find({ receiverId: userId, isDelivered: false })
        .then((undelivered) => {
          if (undelivered.length > 0) {
            Message.updateMany({ receiverId: userId, isDelivered: false }, { $set: { isDelivered: true, deliveredAt: new Date() } })
              .then(() => {
                const senders = new Set(undelivered.map((m) => String(m.senderId)));
                senders.forEach((senderId) => {
                  emitToUser(senderId, "messages:delivered", { receiverId: userId });
                });
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }

    socket.on("message:send", async (payload = {}, ack) => {
      try {
        const msg = await deliver(socket.user, payload);
        // Multi-tab sync: notify all open tabs of sender
        emitToUser(socket.user._id, "message:sent", msg);
        if (typeof ack === "function") ack({ success: true, message: msg });
      } catch (error) {
        const message = error.statusCode ? error.message : "Failed to send message";
        socket.emit("message:error", { error: message });
        if (typeof ack === "function") ack({ success: false, error: message });
      }
    });

    socket.on("typing:start", (p = {}) => p.receiverId && emitToUser(p.receiverId, "typing:start", { senderId: socket.user._id }));
    socket.on("typing:stop", (p = {}) => p.receiverId && emitToUser(p.receiverId, "typing:stop", { senderId: socket.user._id }));

    socket.on("messages:read", async (p = {}) => {
      try {
        if (!p.senderId) return;
        await Message.updateMany({ senderId: p.senderId, receiverId: socket.user._id, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
        await Notification.updateMany({ userId: socket.user._id, type: "message", "metadata.senderId": String(p.senderId), isRead: false }, { $set: { isRead: true, readAt: new Date() } });
        emitToUser(p.senderId, "messages:read", { readBy: socket.user._id });
        const unreadCount = await Notification.countDocuments({ userId: socket.user._id, isRead: false });
        emitToUser(socket.user._id, "notification:count", { unreadCount });
        const unreadMsgs = await Message.countDocuments({ receiverId: socket.user._id, isRead: false });
        emitToUser(socket.user._id, "messages:unread_count", { count: unreadMsgs });
      } catch (error) {
        console.error("messages:read error:", error.message);
      }
    });

    socket.on("notifications:sync", async () => {
      try {
        const count = await Notification.countDocuments({ userId: socket.user._id, isRead: false });
        socket.emit("notification:count", { unreadCount: count });
      } catch {}
    });

    // WebRTC signalling (relay only to the intended peer)
    socket.on("call:initiate", (p = {}) => {
      const delivered = emitToUser(p.receiverId, "call:incoming", { callerId: socket.user._id, callerName: socket.user.name, callerPic: socket.user.avatar, callType: p.callType || "voice" });
      if (!delivered) socket.emit("call:user-unavailable", { receiverId: p.receiverId });
    });
    socket.on("call:accept", (p = {}) => emitToUser(p.callerId, "call:accepted", { receiverId: socket.user._id }));
    socket.on("call:reject", (p = {}) => emitToUser(p.callerId, "call:rejected", { receiverId: socket.user._id }));
    socket.on("call:end", (p = {}) => emitToUser(p.peerId, "call:ended", { endedBy: socket.user._id }));
    socket.on("webrtc:offer", (p = {}) => emitToUser(p.receiverId, "webrtc:offer", { callerId: socket.user._id, offer: p.offer }));
    socket.on("webrtc:answer", (p = {}) => emitToUser(p.callerId, "webrtc:answer", { receiverId: socket.user._id, answer: p.answer }));
    socket.on("webrtc:ice-candidate", (p = {}) => emitToUser(p.peerId, "webrtc:ice-candidate", { senderId: socket.user._id, candidate: p.candidate }));

    User.updateOne({ _id: userId }, { $set: { isOnline: true, lastSeen: new Date() } }).catch((e) => console.error("presence update failed:", e.message));

    socket.on("disconnect", async () => {
      const set = onlineUsers.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineUsers.delete(userId);
          await User.updateOne({ _id: userId }, { $set: { isOnline: false, lastSeen: new Date() } });
          io.emit("users:online", Array.from(onlineUsers.keys()));
        }
      }
    });
  });
};

module.exports = setupSocket;
