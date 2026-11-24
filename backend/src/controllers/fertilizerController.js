const Fertilizer = require("../models/Fertilizer");
const asyncHandler = require("../utils/asyncHandler");
const { makeController } = require("./productController");

const c = makeController("fertilizer", Fertilizer);

// Idempotent: adds missing demo products, never deletes existing data.
const seed = asyncHandler(async (req, res) => {
  const { seedMarketplace } = require("../seed/marketplaceData");
  const result = await seedMarketplace();
  res.status(200).json({ success: true, message: "Marketplace seed completed (existing data untouched)", data: result });
});

module.exports = { ...c, seed };
