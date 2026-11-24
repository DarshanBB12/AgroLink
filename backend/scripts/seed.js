// Adds the shared demo marketplace listings. Idempotent and NON-destructive: existing documents are never modified or removed.
require("dotenv").config();
const mongoose = require("mongoose");
const { seedMarketplace } = require("../src/seed/marketplaceData");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await seedMarketplace();
  console.log("Seed complete:", JSON.stringify(result));
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
