const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
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
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "itemModel",
      required: true,
    },
    itemModel: {
      type: String,
      enum: ["Worker", "Equipment", "Fertilizer", "Seed"],
      required: true,
    },
    type: {
      type: String,
      enum: ["worker", "equipment", "fertilizer", "seed"],
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
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
    orderType: {
      type: String,
      enum: ["worker", "equipment", "fertilizer", "seed"],
      required: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      default: null,
    },
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      default: null,
    },
    fertilizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fertilizer",
      default: null,
    },
    seed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seed",
      default: null,
    },
    itemName: { type: String, default: "" },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    paidAt: { type: Date, default: null },
    paymentMode: { type: String, enum: ["razorpay", "test", null], default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
    cancelReason: { type: String, default: "" },
    location: { type: String, default: "" },
    quantity: { type: Number, default: 1, min: 1 },
    duration: { type: Number, default: 1, min: 1 },
    pricing: {
      amount: { type: Number, required: true, min: 0 },
      unit: { type: String, required: true },
    },
    totalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "completed", "rejected", "cancelled"],
      default: "pending",
    },
    scheduledDate: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

orderSchema.pre("validate", function syncRequiredFields(next) {
  if (!this.farmerId && this.farmer) this.farmerId = this.farmer;
  if (!this.farmer && this.farmerId) this.farmer = this.farmerId;

  if (!this.providerId && this.provider) this.providerId = this.provider;
  if (!this.provider && this.providerId) this.provider = this.providerId;

  if (!this.type && this.orderType) this.type = this.orderType;
  if (!this.orderType && this.type) this.orderType = this.type;

  if (!this.itemId) {
    if (this.type === "worker" && this.worker) this.itemId = this.worker;
    if (this.type === "equipment" && this.equipment) this.itemId = this.equipment;
    if (this.type === "fertilizer" && this.fertilizer) this.itemId = this.fertilizer;
    if (this.type === "seed" && this.seed) this.itemId = this.seed;
  }

  if (!this.itemModel) {
    if (this.type === "worker") this.itemModel = "Worker";
    if (this.type === "equipment") this.itemModel = "Equipment";
    if (this.type === "fertilizer") this.itemModel = "Fertilizer";
    if (this.type === "seed") this.itemModel = "Seed";
  }

  if (this.price === undefined || this.price === null) {
    this.price = this.pricing?.amount ?? 0;
  }

  if (!this.startDate) this.startDate = this.scheduledDate || new Date();
  if (!this.scheduledDate && this.startDate) this.scheduledDate = this.startDate;

  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    return next(new Error("endDate cannot be before startDate"));
  }

  next();
});

orderSchema.index({ farmerId: 1, createdAt: -1 });
orderSchema.index({ providerId: 1, createdAt: -1 });
orderSchema.index({ itemId: 1, status: 1, startDate: 1, endDate: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
