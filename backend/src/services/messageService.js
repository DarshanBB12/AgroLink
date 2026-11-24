const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { getIO } = require("../utils/io");
const { notify, roleLink } = require("../utils/notify");

// Single place where a chat message is validated, stored and delivered. Used by both REST and Socket.IO
// so the rules (participants only, length limits, receiver must exist) cannot diverge.
const deliver = async (sender, { receiverId, message, mediaUrl, mediaType }) => {
  if (!receiverId || !mongoose.isValidObjectId(receiverId)) throw new ApiError(400, "A valid receiver is required");
  const text = String(message || "").trim();
  if (!text) throw new ApiError(400, "Message cannot be empty");
  if (text.length > 2000) throw new ApiError(400, "Message is too long (max 2000 characters)");
  if (String(receiverId) === String(sender._id)) throw new ApiError(400, "You cannot message yourself");
  if (mediaUrl && !/^https?:\/\//i.test(mediaUrl)) throw new ApiError(400, "Invalid media URL");

  const receiver = await User.findById(receiverId).select("name role isActive avatar");
  if (!receiver || !receiver.isActive) throw new ApiError(404, "Recipient not found");

  const io = getIO();
  const online = io?.isOnline ? io.isOnline(receiverId) : false;

  const created = await Message.create({
    senderId: sender._id,
    receiverId,
    message: text,
    mediaUrl: mediaUrl || null,
    mediaType: mediaUrl ? mediaType || "file" : null,
    isDelivered: Boolean(online),
    deliveredAt: online ? new Date() : null,
  });
  const msg = await Message.findById(created._id).populate("senderId", "name role avatar").lean();

  if (io?.emitToUser) {
    io.emitToUser(receiverId, "message:receive", msg);
    if (online) {
      io.emitToUser(sender._id, "message:delivered", { messageId: msg._id, receiverId });
    }
  }

  // Offline recipients get a notification (online ones see the message arrive live).
  if (!online) {
    await notify(receiverId, {
      senderId: sender._id,
      type: "message",
      title: `New message from ${sender.name}`,
      message: text.length > 60 ? `${text.slice(0, 60)}...` : text,
      link: roleLink(receiver.role, "chat"),
      metadata: {
        senderId: sender._id,
        senderName: sender.name,
        senderAvatar: sender.avatar || "",
      },
    });
  }
  return msg;
};

module.exports = { deliver };
