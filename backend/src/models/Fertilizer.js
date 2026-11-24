const mongoose = require("mongoose");
const { geoField } = require("../utils/geo");

const fertilizerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["organic", "chemical", "bio", "compost"],
      required: true,
    },
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    pricePerKg: { type: Number, default: null, min: 0 },
    pricePerBag: { type: Number, default: null, min: 0 },
    pricing: {
      amount: { type: Number, min: 0 },
      unit: {
        type: String,
        enum: ["kg", "bag"],
        default: "kg",
      },
    },
    unit: { type: String, default: "kg" },
    available: { type: Boolean, default: true },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    rating: { type: Number, default: 4, min: 0, max: 5 },
    description: { type: String, required: true },
    benefits: [{ type: String }],
    npkRatio: { type: String, default: "Organic" },
    applicationMethod: { type: String, default: "" },
    suitableCrops: [{ type: String }],
    location: { type: String, default: "", trim: true },
    geo: geoField,
    stock: { type: Number, default: 100, min: 0 },
    imageEmoji: { type: String, default: "🌿" },
    colorClass: { type: String, default: "from-green-50 to-green-100" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

fertilizerSchema.index({ geo: "2dsphere" });
fertilizerSchema.index({ name: "text", category: "text", description: "text", location: "text" });

fertilizerSchema.virtual("orders", {
  ref: "Order",
  localField: "_id",
  foreignField: "itemId",
});

fertilizerSchema.pre("validate", function syncPriceFields(next) {
  const unit = this.pricing?.unit || this.unit || "kg";
  if (!this.pricing?.amount && this.price) {
    this.pricing = { amount: this.price, unit };
  }
  if (this.pricePerKg === null && unit === "kg" && this.pricing?.amount !== undefined) {
    this.pricePerKg = this.pricing.amount;
  }
  if (this.pricePerBag === null && unit === "bag" && this.pricing?.amount !== undefined) {
    this.pricePerBag = this.pricing.amount;
  }
  if (!this.price && this.pricing?.amount !== undefined) {
    this.price = this.pricing.amount;
  }
  next();
});

module.exports = mongoose.model("Fertilizer", fertilizerSchema);
