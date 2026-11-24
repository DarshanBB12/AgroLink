const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      enum: ["booking", "message", "payment", "system", "weather", "crop", "equipment", "worker", "loan"],
      default: "system",
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ["info", "success", "warning", "critical"],
      default: "info",
    },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    link: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
