const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["order_payment", "emi_payment", "refund", "payout", "other"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["created", "pending", "completed", "failed", "cancelled", "refunded"],
      default: "pending",
    },
    description: {
      type: String,
      default: "",
    },
    // Generic reference to whatever this transaction relates to (Order, Loan, EMIPayment, ...)
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    relatedModel: {
      type: String,
      enum: ["Order", "Loan", "EMIPayment", "Booking", null],
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "check", "cash", "online", "razorpay", "stripe", "wallet"],
      default: "online",
    },
    purpose: { type: String, enum: ["order", "emi", "other"], default: "order" },
    currency: { type: String, default: "INR" },
    // "razorpay" = real gateway, verified server-side by HMAC signature.
    // "test" = development/test mode with NO real money moving; never treated as a real payment.
    mode: { type: String, enum: ["razorpay", "test", "offline"], default: "razorpay" },
    transactionRef: { type: String, unique: true, sparse: true }, // our unique transaction id (e.g. AGL-...)
    receiptNo: { type: String, default: null },
    razorpayOrderId: { type: String, default: null, index: true },
    razorpayPaymentId: { type: String, default: null },
    failureReason: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Prevents the same client-submitted payment from being recorded twice
    // NOTE: no `default: null` here. A sparse unique index still indexes explicit nulls, so a null default
    // made the SECOND transaction in the database fail with E11000. Leave the field absent instead.
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
