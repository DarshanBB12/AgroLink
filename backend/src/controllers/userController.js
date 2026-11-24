const mongoose = require("mongoose");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { serializePublic, serializeSelf, serializeAdmin } = require("../utils/serializers");
const authController = require("./authController");

// People you can chat with: public fields only (no email, phone or coordinates).
const getAllUsersForChat = asyncHandler(async (req, res) => {
  const filter = { _id: { $ne: req.user._id }, isActive: true };
  if (req.user.role !== "admin") filter.role = { $ne: "admin" };
  const users = await User.find(filter).sort({ isOnline: -1, name: 1 }).limit(300);
  const data = users.map(serializePublic);
  res.status(200).json({ success: true, users: data, data });
});

const getUserById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid user id");
  const user = await User.findById(req.params.id);
  if (!user || (!user.isActive && req.user.role !== "admin")) throw new ApiError(404, "User not found");
  const isSelf = String(user._id) === String(req.user._id);
  const out = isSelf ? serializeSelf(user) : req.user.role === "admin" ? serializeAdmin(user) : serializePublic(user);
  res.status(200).json({ success: true, user: out, data: out });
});

// Same implementation as PUT /auth/profile so there is only one place that validates profile edits.
const updateProfile = authController.updateProfile;

module.exports = { getAllUsersForChat, getUserById, updateProfile };
