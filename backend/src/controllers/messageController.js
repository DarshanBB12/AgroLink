const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { deliver } = require("../services/messageService");
const { getIO } = require("../utils/io");
const { parsePagination } = require("../utils/pagination");

// Messages between the signed-in user and ONE other user. The query always includes the caller's id
// on one side, so a user can never read a conversation they are not part of.
const getMessages = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, "Invalid user id");
  const { limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const me = req.user._id;

  const messages = await Message.find({ $or: [{ senderId: me, receiverId: userId }, { senderId: userId, receiverId: me }] })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  await Message.updateMany({ senderId: userId, receiverId: me, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
  const ordered = messages.reverse();
  res.status(200).json({ success: true, messages: ordered, data: ordered });
});

const sendMessage = asyncHandler(async (req, res) => {
  const msg = await deliver(req.user, req.body);
  res.status(201).json({ success: true, message: msg, data: msg });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Message.countDocuments({ receiverId: req.user._id, isRead: false });
  res.status(200).json({ success: true, count, data: { count } });
});

// One row per conversation partner with the last message and unread count.
const conversations = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const rows = await Message.aggregate([
    { $match: { $or: [{ senderId: me }, { receiverId: me }] } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: { $cond: [{ $eq: ["$senderId", me] }, "$receiverId", "$senderId"] }, last: { $first: "$$ROOT" }, unread: { $sum: { $cond: [{ $and: [{ $eq: ["$receiverId", me] }, { $eq: ["$isRead", false] }] }, 1, 0] } } } },
    { $sort: { "last.createdAt": -1 } },
    { $limit: 100 },
  ]);
  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select("name role avatar isOnline");
  const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));
  const data = rows.filter((r) => byId[String(r._id)]).map((r) => ({
    user: { id: r._id, name: byId[String(r._id)].name, role: byId[String(r._id)].role, avatar: byId[String(r._id)].avatar, isOnline: Boolean(getIO()?.isOnline?.(r._id)) || byId[String(r._id)].isOnline },
    lastMessage: { message: r.last.message, createdAt: r.last.createdAt, fromMe: String(r.last.senderId) === String(me) },
    unread: r.unread,
  }));
  res.status(200).json({ success: true, data });
});

module.exports = { getMessages, sendMessage, getUnreadCount, conversations };
