const mongoose = require("mongoose");
const User = require("../models/User");
const Worker = require("../models/Worker");
const Equipment = require("../models/Equipment");
const Order = require("../models/Order");
const Loan = require("../models/Loan");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const Transaction = require("../models/Transaction");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const settings = require("../services/settingsService");
const { serializeAdmin } = require("../utils/serializers");
const { parsePagination, buildPagination } = require("../utils/pagination");
const { escapeRegex, cleanQuery } = require("../utils/escapeRegex");
const { sendCsv } = require("../utils/csv");
const { notify } = require("../utils/notify");
const Seed = require("../models/Seed");
const Fertilizer = require("../models/Fertilizer");

const ROLES = ["farmer", "worker", "equipment_owner", "admin"];
const PLANS = ["farmer_free", "farmer_pro", "equipment_owner", "enterprise"];

const listUsers = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20 });
  const filter = {};
  if (ROLES.includes(req.query.role)) filter.role = req.query.role;
  if (req.query.active === "true") filter.isActive = true;
  if (req.query.active === "false") filter.isActive = false;
  const q = cleanQuery(req.query.q || "");
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { email: rx }, { location: rx }];
  }
  const [total, users] = await Promise.all([User.countDocuments(filter), User.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit)]);
  res.status(200).json({ success: true, data: users.map(serializeAdmin), pagination: buildPagination(pg, total) });
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!ROLES.includes(role)) throw new ApiError(400, "Invalid role");
  if (!name || String(name).trim().length < 2) throw new ApiError(400, "Name must be at least 2 characters");
  if (!/^\S+@\S+\.\S+$/.test(String(email || ""))) throw new ApiError(400, "Valid email is required");
  if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new ApiError(400, "Password must be 8+ characters with a letter and a number");
  if (await User.findOne({ email: String(email).toLowerCase() })) throw new ApiError(409, "Email already registered");
  const user = await User.create({ name, email: String(email).toLowerCase(), password, role });
  res.status(201).json({ success: true, message: "User created", data: serializeAdmin(user) });
});

const updateUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid user id");
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  const isSelf = String(user._id) === String(req.user._id);
  const { isActive, role, planCode } = req.body;

  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") throw new ApiError(400, "isActive must be true or false");
    if (isSelf && !isActive) throw new ApiError(400, "You cannot deactivate your own account");
    user.isActive = isActive;
  }
  if (role !== undefined) {
    if (!ROLES.includes(role)) throw new ApiError(400, "Invalid role");
    if (isSelf && role !== "admin") throw new ApiError(400, "You cannot change your own role");
    user.role = role;
  }
  if (planCode !== undefined) {
    if (!PLANS.includes(planCode)) throw new ApiError(400, "Invalid plan");
    user.planCode = planCode;
  }
  // Bump the token version when access is revoked so existing sessions stop working immediately.
  if (isActive === false || role !== undefined) user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  res.status(200).json({ success: true, message: "User updated", data: serializeAdmin(user) });
});

const deleteUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid user id");
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  if (String(user._id) === String(req.user._id)) throw new ApiError(400, "You cannot delete your own account");
  if (user.role === "admin" && (await User.countDocuments({ role: "admin" })) <= 1) throw new ApiError(400, "Cannot delete the last admin");

  // Accounts with financial history are deactivated, not erased, so records stay auditable.
  const [orders, loans, txns] = await Promise.all([
    Order.countDocuments({ $or: [{ farmerId: user._id }, { providerId: user._id }] }),
    Loan.countDocuments({ farmerId: user._id }),
    Transaction.countDocuments({ userId: user._id }),
  ]);
  if (orders || loans || txns) throw new ApiError(409, "This user has bookings or payments on record. Deactivate the account instead of deleting it.");

  await Promise.all([
    Worker.deleteMany({ userId: user._id }),
    Equipment.deleteMany({ ownerId: user._id }),
    Seed.deleteMany({ seller: user._id }),
    Fertilizer.deleteMany({ seller: user._id }),
    Notification.deleteMany({ userId: user._id }),
    Message.deleteMany({ $or: [{ senderId: user._id }, { receiverId: user._id }] }),
  ]);
  await user.deleteOne();
  res.status(200).json({ success: true, message: "User deleted", data: { id: String(user._id) } });
});

const getSettings = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await settings.getAll() });
});

const updateSettings = asyncHandler(async (req, res) => {
  const entries = Object.entries(req.body || {});
  if (!entries.length) throw new ApiError(400, "No settings provided");
  try {
    for (const [key, value] of entries) await settings.set(key, value, req.user._id);
  } catch (error) {
    throw new ApiError(400, error.message);
  }
  res.status(200).json({ success: true, message: "Settings saved", data: await settings.getAll() });
});

// Platform notification: one notification per recipient, created server-side.
const announce = asyncHandler(async (req, res) => {
  const { title, message, role, severity } = req.body;
  if (!title || !message) throw new ApiError(400, "Title and message are required");
  if (String(title).length > 120 || String(message).length > 500) throw new ApiError(400, "Title max 120, message max 500 characters");
  if (role && role !== "all" && !ROLES.includes(role)) throw new ApiError(400, "Invalid audience");
  if (!(await settings.get("notifications.announcementsEnabled"))) throw new ApiError(409, "Platform announcements are disabled in settings");
  const filter = { isActive: true };
  if (role && role !== "all") filter.role = role;
  const ids = await User.find(filter).distinct("_id");
  await Promise.all(ids.map((id) => notify(id, { type: "system", title: String(title), message: String(message), severity: ["info", "success", "warning", "critical"].includes(severity) ? severity : "info" })));
  res.status(200).json({ success: true, message: `Announcement sent to ${ids.length} users`, data: { recipients: ids.length } });
});

const exportUsersCsv = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(10000);
  const rows = users.map((u) => ({ userId: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone || "", location: u.location || "", active: u.isActive, createdAt: u.createdAt.toISOString() }));
  return sendCsv(res, "users-report.csv", rows.length ? rows : [{ userId: "", name: "", email: "", role: "", phone: "", location: "", active: "", createdAt: "" }]);
});

module.exports = { listUsers, createUser, updateUser, deleteUser, getSettings, updateSettings, announce, exportUsersCsv };
