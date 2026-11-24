const mongoose = require("mongoose");
const { geoField } = require("../utils/geo");

const workerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    skills: [{ type: String, trim: true }],
    location: { type: String, default: "", trim: true },
    geo: geoField,
    availability: { type: Boolean, default: true },
    available: { type: Boolean, default: true },
    pricing: {
      amount: { type: Number, required: true, min: 0 },
      unit: {
        type: String,
        enum: ["hour", "day"],
        default: "day",
      },
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

workerSchema.index({ geo: "2dsphere" });
workerSchema.index({ skills: 1 });
workerSchema.index({ location: "text", notes: "text", skills: "text" });

workerSchema.virtual("orders", {
  ref: "Order",
  localField: "_id",
  foreignField: "itemId",
});

workerSchema.pre("validate", function syncLegacyFields(next) {
  if (!this.userId && this.user) this.userId = this.user;
  if (!this.user && this.userId) this.user = this.userId;
  if (this.availability === undefined && this.available !== undefined) {
    this.availability = this.available;
  }
  if (this.available === undefined && this.availability !== undefined) {
    this.available = this.availability;
  }
  next();
});

module.exports = mongoose.model("Worker", workerSchema);
