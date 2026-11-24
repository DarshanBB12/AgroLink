const mongoose = require("mongoose");
const { geoField } = require("../utils/geo");

const equipmentSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: { type: String, required: false },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    pricing: {
      amount: { type: Number, min: 0 },
      unit: {
        type: String,
        enum: ["hour", "day"],
        default: "day",
      },
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    location: { type: String, default: "", trim: true },
    geo: geoField,
    availability: { type: Boolean, default: true },
    available: { type: Boolean, default: true },
    discount: { type: Number, default: 0, min: 0 },
    description: { type: String, default: "" },
    fine: { type: Number, default: 0, min: 0 },
    specs: {
      power: { type: String, default: "" },
      fuel: { type: String, default: "" },
      capacity: { type: String, default: "" },
      year: { type: Number },
    },
    imageUrl: { type: String, default: "" },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

equipmentSchema.index({ geo: "2dsphere" });
equipmentSchema.index({ name: "text", category: "text", description: "text", location: "text" });
equipmentSchema.index({ ownerId: 1, createdAt: -1 });
equipmentSchema.index({ category: 1, availability: 1 });

equipmentSchema.virtual("orders", {
  ref: "Order",
  localField: "_id",
  foreignField: "itemId",
});

equipmentSchema.pre("validate", function syncLegacyFields(next) {
  if (!this.ownerId && this.owner) this.ownerId = this.owner;
  if (!this.owner && this.ownerId) this.owner = this.ownerId;
  if (!this.type && this.category) this.type = this.category;
  if (!this.category && this.type) this.category = this.type;
  if (this.availability === undefined && this.available !== undefined) {
    this.availability = this.available;
  }
  if (this.available === undefined && this.availability !== undefined) {
    this.available = this.availability;
  }
  next();
});

module.exports = mongoose.model("Equipment", equipmentSchema);
