const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["worker", "equipment", "fertilizer"],
      required: true,
    },
    itemModel: {
      type: String,
      enum: ["Worker", "Equipment", "Fertilizer"],
      required: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    itemType: {
      type: String,
      enum: ["Equipment", "Fertilizer", "Worker"],
      required: false,
    },
    itemName: { type: String, required: true },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "itemModel",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    days: { type: Number, default: 1, min: 1 },
    quantity: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: ["Pending", "Active", "Completed", "Cancelled"],
      default: "Active",
    },
    category: { type: String, default: "" },
    location: { type: String, default: "" },
    fine: { type: Number, min: 0 },
  },
  { timestamps: true }
);

bookingSchema.pre("validate", function syncBookingFields(next) {
  if (!this.farmerId && this.farmer) this.farmerId = this.farmer;
  if (!this.farmer && this.farmerId) this.farmer = this.farmerId;

  if (!this.providerId && this.provider) this.providerId = this.provider;
  if (!this.provider && this.providerId) this.provider = this.providerId;

  if (!this.type && this.itemType) {
    const map = { Equipment: "equipment", Fertilizer: "fertilizer", Worker: "worker" };
    this.type = map[this.itemType];
  }

  if (!this.itemType && this.type) {
    const reverseMap = { equipment: "Equipment", fertilizer: "Fertilizer", worker: "Worker" };
    this.itemType = reverseMap[this.type];
  }

  if (!this.itemModel && this.type) {
    const modelMap = { equipment: "Equipment", fertilizer: "Fertilizer", worker: "Worker" };
    this.itemModel = modelMap[this.type];
  }

  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
