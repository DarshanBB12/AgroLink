const Notification = require("../models/Notification");
const User = require("../models/User");
const { getIO } = require("./io");

const ROLE_PATH = { farmer: "farmer", worker: "worker", equipment_owner: "owner", admin: "admin" };

const settingKeyByType = {
  booking: "booking",
  payment: "payment",
  message: "message",
  weather: "weather",
  worker: "booking",
  equipment: "booking",
  loan: "payment",
};

// Build a dashboard link that matches the recipient's role.
const roleLink = (role, section) => `/dashboard/${ROLE_PATH[role] || "farmer"}/${section}`.replace(/\/$/, "");

// Create a notification for ONE user (never a broadcast). Honours the user's notification
// preferences (system/critical notifications are always delivered) and pushes it over
// Socket.IO if the user is online. Failures are logged, never swallowed silently, and
// never break the business operation that triggered them.
const notify = async (userId, { type = "system", title, message, severity = "info", link = null, metadata = {}, senderId = null }) => {
  try {
    const user = await User.findById(userId).select("role settings isActive");
    if (!user || !user.isActive) return null;

    const prefKey = settingKeyByType[type];
    const prefs = user.settings?.notifications;
    if (prefKey && prefs && prefs[prefKey] === false && severity !== "critical") return null;

    const notification = await Notification.create({ userId, senderId, type, title, message, severity, link, metadata });
    const io = getIO();
    if (io && io.sendNotificationToUser) await io.sendNotificationToUser(userId, notification);
    return notification;
  } catch (error) {
    console.error("[notify] failed:", error.message);
    return null;
  }
};

const notifyAdmins = async (payload) => {
  const admins = await User.find({ role: "admin", isActive: true }).select("_id");
  return Promise.all(admins.map((a) => notify(a._id, { link: "/dashboard/admin", ...payload })));
};

module.exports = { notify, notifyAdmins, roleLink };
