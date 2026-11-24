const express = require("express");
const { protect } = require("../middleware/auth");
const { assistantChat, recommendCrops, getMarketPrices } = require("../controllers/aiController");

const router = express.Router();

router.use(protect);

router.post("/assistant", assistantChat);
router.post("/crop-recommend", recommendCrops);
router.get("/market-prices", getMarketPrices);

module.exports = router;
