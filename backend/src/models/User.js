const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { geoField } = require("../utils/geo");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: true,
      select: false,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["farmer", "worker", "equipment_owner", "admin"],
      default: "farmer",
      set: (value) => (value === "equipment" ? "equipment_owner" : value),
    },
    planCode: {
      type: String,
      enum: ["farmer_free", "farmer_pro", "equipment_owner", "enterprise"],
      default: "farmer_free",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "past_due", "cancelled"],
      default: "active",
    },
    subscriptionEndsAt: {
      type: Date,
      default: null,
    },
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    // GeoJSON point of the user's own saved location. Private: never returned to other users.
    geo: geoField,
    locationSource: { type: String, enum: ["gps", "manual", null], default: null },
    locationUpdatedAt: { type: Date, default: null },
    // Incremented on password change so previously issued JWTs stop working.
    tokenVersion: { type: Number, default: 0, select: true },
    businessName: { type: String, default: "", trim: true },
    settings: {
      notifications: {
        booking: { type: Boolean, default: true },
        payment: { type: Boolean, default: true },
        message: { type: Boolean, default: true },
        weather: { type: Boolean, default: true },
        sound: { type: Boolean, default: true },
        desktop: { type: Boolean, default: false },
      },
      listingPreferences: {
        defaultPricingUnit: { type: String, enum: ["hour", "day"], default: "day" },
        autoAcceptRequests: { type: Boolean, default: false },
        showPhoneAfterApproval: { type: Boolean, default: true },
      },
    },
    avatar: { type: String, default: "" },
    preferredLanguage: {
      type: String,
      enum: ["en", "hi", "kn", "ml", "ta", "te"],
      default: "en",
    },
    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },
    bio: { type: String, default: "" },
    farmSize: { type: String, default: "" },
    cropTypes: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.tokenVersion;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

userSchema.index({ geo: "2dsphere" });
userSchema.index({ role: 1, isActive: 1 });

userSchema.virtual("workerProfile", {
  ref: "Worker",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

userSchema.virtual("ownedEquipment", {
  ref: "Equipment",
  localField: "_id",
  foreignField: "ownerId",
});

userSchema.virtual("listedFertilizers", {
  ref: "Fertilizer",
  localField: "_id",
  foreignField: "seller",
});

userSchema.virtual("farmerOrders", {
  ref: "Order",
  localField: "_id",
  foreignField: "farmerId",
});

userSchema.virtual("providerOrders", {
  ref: "Order",
  localField: "_id",
  foreignField: "providerId",
});

userSchema.virtual("farmerBookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "farmerId",
});

userSchema.virtual("providerBookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "providerId",
});

userSchema.pre("save", async function hashPassword(next) {
  if (!this.planCode) {
    if (this.role === "farmer") this.planCode = "farmer_free";
    if (this.role === "equipment_owner") this.planCode = "equipment_owner";
    if (this.role === "admin") this.planCode = "enterprise";
    if (this.role === "worker") this.planCode = "farmer_free";
  }

  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
