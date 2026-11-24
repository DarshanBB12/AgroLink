const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Worker = require("../models/Worker");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { serializeSelf, normalizeRole } = require("../utils/serializers");
const { parseCoords, toGeoPoint } = require("../utils/geo");
const { notifyAdmins } = require("../utils/notify");
const settings = require("../services/settingsService");

const PUBLICLY_REGISTERABLE_ROLES = ["farmer", "worker", "equipment_owner"];
const LANGUAGES = ["en", "hi", "kn", "ml", "ta", "te"];

const roleDashboardMap = {
  farmer: "/dashboard/farmer",
  worker: "/dashboard/worker",
  equipment_owner: "/dashboard/owner",
  admin: "/dashboard/admin",
};

const generateToken = (user, remember = true) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT secret is not configured");
  const expiresIn = remember ? process.env.JWT_EXPIRE || "7d" : process.env.JWT_SESSION_EXPIRE || "1d";
  return jwt.sign({ id: user._id, tv: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn });
};

const sendTokenResponse = (user, statusCode, res, { remember = true, message } = {}) => {
  const role = normalizeRole(user.role);
  res.status(statusCode).json({
    success: true,
    message,
    token: generateToken(user, remember),
    user: serializeSelf(user),
    redirectTo: roleDashboardMap[role] || "/dashboard",
  });
};

const register = asyncHandler(async (req, res) => {
  if (!(await settings.get("system.allowRegistrations"))) {
    throw new ApiError(403, "New registrations are currently closed.");
  }
  const { name, email, password, phone, location, preferredLanguage } = req.body;
  const role = normalizeRole(req.body.role || "farmer");

  if (!PUBLICLY_REGISTERABLE_ROLES.includes(role)) {
    throw new ApiError(400, "Invalid role for self-registration");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (await User.findOne({ email: normalizedEmail })) {
    throw new ApiError(409, "Email already registered");
  }

  // A brand-new account starts with NO bookings, payments, notifications or messages:
  // none of those collections are touched or copied on registration.
  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role,
    phone,
    location,
    preferredLanguage: preferredLanguage || "en",
    planCode: role === "equipment_owner" ? "equipment_owner" : "farmer_free",
  });

  await notifyAdmins({ type: "system", title: "New user registered", message: `${user.name} joined as ${role.replace("_", " ")}.`, link: "/dashboard/admin/users" });

  return sendTokenResponse(user, 201, res, { message: "Account created successfully" });
});

const login = asyncHandler(async (req, res) => {
  const { email, password, remember = true } = req.body;
  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select("+password");

  // Same message for unknown email and wrong password so accounts cannot be enumerated.
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, "Invalid email or password.");
  }
  if (!user.isActive) throw new ApiError(403, "This account has been deactivated. Contact support.");

  // Use updateOne so we never re-hash or re-validate the whole document just to stamp lastLogin.
  await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
  return sendTokenResponse(user, 200, res, { remember: remember !== false, message: "Login successful!" });
});

// JWTs are stateless; logout is performed client-side by discarding the token. This endpoint
// exists so clients have a single, explicit call and so we can mark the user offline.
const logout = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $set: { isOnline: false, lastSeen: new Date() } });
  res.status(200).json({ success: true, message: "Logged out" });
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: serializeSelf(req.user) });
});

const AVATAR_MAX = 400000; // ~300 KB image as data URL
const updateProfile = asyncHandler(async (req, res) => {
  const b = req.body;
  const updates = {};
  if (b.name !== undefined) updates.name = String(b.name).trim();
  if (b.phone !== undefined) updates.phone = String(b.phone).trim();
  if (b.location !== undefined) updates.location = String(b.location).trim();
  if (b.bio !== undefined) updates.bio = String(b.bio).slice(0, 500);
  if (b.farmSize !== undefined) updates.farmSize = String(b.farmSize).slice(0, 50);
  if (b.businessName !== undefined) updates.businessName = String(b.businessName).trim().slice(0, 120);
  if (b.cropTypes !== undefined) {
    if (!Array.isArray(b.cropTypes)) throw new ApiError(400, "cropTypes must be an array");
    updates.cropTypes = b.cropTypes.map((c) => String(c).trim()).filter(Boolean).slice(0, 20);
  }
  if (b.preferredLanguage !== undefined) {
    if (!LANGUAGES.includes(b.preferredLanguage)) throw new ApiError(400, "Invalid language");
    updates.preferredLanguage = b.preferredLanguage;
  }
  if (b.theme !== undefined) {
    if (!["light", "dark"].includes(b.theme)) throw new ApiError(400, "Invalid theme");
    updates.theme = b.theme;
  }
  if (b.avatar !== undefined) {
    const avatar = String(b.avatar);
    if (avatar && !/^(https?:\/\/|data:image\/(png|jpeg|jpg|webp|gif);base64,)/i.test(avatar)) {
      throw new ApiError(400, "Avatar must be an image URL or an uploaded image");
    }
    if (avatar.length > AVATAR_MAX) throw new ApiError(400, "Profile picture is too large (max ~300 KB)");
    updates.avatar = avatar;
  }
  if (updates.name !== undefined && updates.name.length < 2) throw new ApiError(400, "Name must be at least 2 characters");
  if (updates.phone && !/^[+\d][\d\s-]{6,17}$/.test(updates.phone)) throw new ApiError(400, "Enter a valid phone number");

  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });

  // Keep the worker listing in sync with the profile text location.
  if (updates.location !== undefined && user.role === "worker") {
    await Worker.updateOne({ userId: user._id }, { $set: { location: updates.location } });
  }
  res.status(200).json({ success: true, message: "Profile updated", user: serializeSelf(user) });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.matchPassword(currentPassword))) throw new ApiError(400, "Current password is incorrect");
  if (currentPassword === newPassword) throw new ApiError(400, "New password must be different from the current password");

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // invalidates every previously issued token
  await user.save();
  return sendTokenResponse(user, 200, res, { message: "Password changed successfully" });
});

// Save the user's location. Called only after the user explicitly chose to share GPS or typed
// an address — the server never infers or fabricates coordinates.
const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng, address, source } = req.body;
  const coords = parseCoords(lat, lng);
  const updates = {};

  if (lat !== undefined || lng !== undefined) {
    if (!coords) throw new ApiError(400, "Latitude must be -90..90 and longitude -180..180");
    if (source && source !== "gps" && source !== "manual") throw new ApiError(400, "Invalid location source");
    updates.geo = toGeoPoint(coords);
    updates.locationSource = source || "manual";
  } else if (!address || !String(address).trim()) {
    throw new ApiError(400, "Provide coordinates or an address");
  }
  if (address !== undefined) updates.location = String(address).trim().slice(0, 200);
  updates.locationUpdatedAt = new Date();

  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });

  if (user.role === "worker") {
    const workerUpdates = {};
    if (updates.geo) workerUpdates.geo = updates.geo;
    if (updates.location !== undefined) workerUpdates.location = updates.location;
    await Worker.updateOne({ userId: user._id }, { $set: workerUpdates });
  }
  res.status(200).json({ success: true, message: "Location saved", user: serializeSelf(user) });
});

const clearLocation = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { geo: "" }, $set: { locationSource: null, locationUpdatedAt: new Date() } },
    { new: true }
  );
  if (user.role === "worker") await Worker.updateOne({ userId: user._id }, { $unset: { geo: "" } });
  res.status(200).json({ success: true, message: "Saved coordinates removed", user: serializeSelf(user) });
});

const updateSettings = asyncHandler(async (req, res) => {
  const { notifications, listingPreferences } = req.body;
  const set = {};
  if (notifications !== undefined) {
    if (typeof notifications !== "object" || notifications === null) throw new ApiError(400, "Invalid notification settings");
    for (const key of ["booking", "payment", "message", "weather"]) {
      if (notifications[key] !== undefined) {
        if (typeof notifications[key] !== "boolean") throw new ApiError(400, `notifications.${key} must be true or false`);
        set[`settings.notifications.${key}`] = notifications[key];
      }
    }
  }
  if (listingPreferences !== undefined) {
    if (req.user.role !== "equipment_owner" && req.user.role !== "admin") {
      throw new ApiError(403, "Listing preferences are only available to equipment owners");
    }
    const lp = listingPreferences;
    if (lp.defaultPricingUnit !== undefined) {
      if (!["hour", "day"].includes(lp.defaultPricingUnit)) throw new ApiError(400, "Invalid pricing unit");
      set["settings.listingPreferences.defaultPricingUnit"] = lp.defaultPricingUnit;
    }
    for (const key of ["autoAcceptRequests", "showPhoneAfterApproval"]) {
      if (lp[key] !== undefined) {
        if (typeof lp[key] !== "boolean") throw new ApiError(400, `listingPreferences.${key} must be true or false`);
        set[`settings.listingPreferences.${key}`] = lp[key];
      }
    }
  }
  if (!Object.keys(set).length) throw new ApiError(400, "No valid settings provided");
  const user = await User.findByIdAndUpdate(req.user._id, { $set: set }, { new: true });
  res.status(200).json({ success: true, message: "Settings saved", user: serializeSelf(user) });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  updateLocation,
  clearLocation,
  updateSettings,
  roleDashboardMap,
};
