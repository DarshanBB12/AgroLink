const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    revieweeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    itemModel: { type: String, enum: ["Worker", "Equipment", "Fertilizer", "Seed"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, refPath: "itemModel", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
