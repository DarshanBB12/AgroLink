const express = require("express");
const {
  getHowItWorks,
  getPricing,
  exportUsersCsvForFarmerOrAdmin,
} = require("../controllers/systemController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/how-it-works", getHowItWorks);
router.get("/pricing", protect, getPricing);
router.get("/exports/users", protect, authorize("farmer", "admin"), exportUsersCsvForFarmerOrAdmin);

module.exports = router;
