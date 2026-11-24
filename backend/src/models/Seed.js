const mongoose = require("mongoose");
const { geoField } = require("../utils/geo");

const seedSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true }, // e.g. Cereal, Vegetable, Pulse
    crop: { type: String, default: "", trim: true },
    variety: { type: String, default: "", trim: true },
    season: { type: String, default: "", trim: true }, // Kharif / Rabi / Zaid
    price: { type: Number, required: true, min: 0 },
    pricing: {
      amount: { type: Number, min: 0 },
      unit: { type: String, enum: ["kg", "packet", "bag"], default: "kg" },
    },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    stock: { type: Number, default: 100, min: 0 },
    available: { type: Boolean, default: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    description: { type: String, default: "", trim: true },
    germinationRate: { type: String, default: "" },
    maturityDays: { type: Number, min: 0 },
    imageEmoji: { type: String, default: "🌱" },
    location: { type: String, default: "", trim: true },
    geo: geoField,
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

seedSchema.pre("validate", function syncPrice(next) {
  if (this.pricing?.amount === undefined || this.pricing?.amount === null) {
    this.pricing = { amount: this.price, unit: this.pricing?.unit || "kg" };
  }
  if ((this.price === undefined || this.price === null) && this.pricing?.amount !== undefined) {
    this.price = this.pricing.amount;
  }
  next();
});

seedSchema.index({ geo: "2dsphere" });
seedSchema.index({ name: "text", category: "text", crop: "text", description: "text", location: "text" });
seedSchema.index({ seller: 1, createdAt: -1 });

module.exports = mongoose.model("Seed", seedSchema);
