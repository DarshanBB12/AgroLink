const { fromGeoPoint } = require("./geo");

const normalizeRole = (role) => (role === "equipment" ? "equipment_owner" : role);

// What a user may see about THEIR OWN account (includes saved coordinates and settings).
const serializeSelf = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: normalizeRole(user.role),
  planCode: user.planCode,
  subscriptionStatus: user.subscriptionStatus,
  subscriptionEndsAt: user.subscriptionEndsAt,
  phone: user.phone || "",
  location: user.location || "",
  coordinates: fromGeoPoint(user.geo),
  locationSource: user.locationSource || null,
  locationUpdatedAt: user.locationUpdatedAt || null,
  avatar: user.avatar || "",
  bio: user.bio || "",
  farmSize: user.farmSize || "",
  cropTypes: user.cropTypes || [],
  businessName: user.businessName || "",
  preferredLanguage: user.preferredLanguage || "en",
  theme: user.theme || "light",
  settings: {
    notifications: {
      booking: user.settings?.notifications?.booking !== false,
      payment: user.settings?.notifications?.payment !== false,
      message: user.settings?.notifications?.message !== false,
      weather: user.settings?.notifications?.weather !== false,
    },
    listingPreferences: {
      defaultPricingUnit: user.settings?.listingPreferences?.defaultPricingUnit || "day",
      autoAcceptRequests: Boolean(user.settings?.listingPreferences?.autoAcceptRequests),
      showPhoneAfterApproval: user.settings?.listingPreferences?.showPhoneAfterApproval !== false,
    },
  },
  isActive: user.isActive,
  createdAt: user.createdAt,
});

// What OTHER users may see: no email, phone, exact coordinates or settings.
const serializePublic = (user) => ({
  id: user._id,
  name: user.name,
  role: normalizeRole(user.role),
  avatar: user.avatar || "",
  location: user.location || "",
  businessName: user.businessName || "",
  isOnline: Boolean(user.isOnline),
  lastSeen: user.lastSeen || null,
});

// Admin view: everything except credentials.
const serializeAdmin = (user) => ({
  ...serializeSelf(user),
  phone: user.phone || "",
  isOnline: Boolean(user.isOnline),
  lastLogin: user.lastLogin || null,
  updatedAt: user.updatedAt,
});

module.exports = { serializeSelf, serializePublic, serializeAdmin, normalizeRole };
