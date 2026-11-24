const mongoose = require("mongoose");

// Key/value store for admin-managed platform configuration (system, marketplace,
// payments, platform notifications). One document per key.
const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    group: { type: String, enum: ["system", "marketplace", "payments", "notifications"], required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemSetting", systemSettingSchema);
