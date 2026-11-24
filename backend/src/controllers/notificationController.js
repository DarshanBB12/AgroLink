const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { getIO } = require("../utils/io");
const { parsePagination, buildPagination } = require("../utils/pagination");

const syncUnreadCount = async (userId) => {
  try {
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });
    const io = getIO();
    if (io?.emitToUser) io.emitToUser(userId, "notification:count", { unreadCount });
    return unreadCount;
  } catch {
    return 0;
  }
};

// Every query is scoped to req.user._id: users can only ever see or change their own notifications.
const getNotifications = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 30, maxLimit: 100 });
  const filter = { userId: req.user._id };
  if (req.query.unread === "true") filter.isRead = false;
  if (req.query.type) filter.type = String(req.query.type);

  const [total, notifications, unreadCount] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);
  res.status(200).json({ success: true, notifications, data: notifications, unreadCount, total, pagination: buildPagination(pg, total) });
});

const markAsRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid notification id");
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true, readAt: new Date() }, { new: true });
  if (!notification) throw new ApiError(404, "Notification not found");
  await syncUnreadCount(req.user._id);
  res.status(200).json({ success: true, notification, data: notification });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
  await syncUnreadCount(req.user._id);
  res.status(200).json({ success: true, message: "All notifications marked as read", data: { modified: result.modifiedCount } });
});

const deleteNotification = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid notification id");
  const deleted = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!deleted) throw new ApiError(404, "Notification not found");
  await syncUnreadCount(req.user._id);
  res.status(200).json({ success: true, message: "Notification deleted" });
});

const clearAllNotifications = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.readOnly === "true") filter.isRead = true;
  const result = await Notification.deleteMany(filter);
  await syncUnreadCount(req.user._id);
  res.status(200).json({ success: true, message: "Notifications cleared", deletedCount: result.deletedCount });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.status(200).json({ success: true, count, data: { count } });
});

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, getUnreadCount };
