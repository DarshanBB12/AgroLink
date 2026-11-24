// Creates an administrator. Usage: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='Str0ngPass1' npm run seed:admin
// Never overwrites an existing account's password.
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");

(async () => {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ chars, letter + number).");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      existing.planCode = "enterprise";
      await existing.save();
      console.log(`Existing user ${email} promoted to admin.`);
    } else console.log(`Admin ${email} already exists. Nothing changed.`);
  } else {
    await User.create({ name: process.env.ADMIN_NAME || "AgroLink Admin", email, password, role: "admin", planCode: "enterprise" });
    console.log(`Admin ${email} created.`);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
