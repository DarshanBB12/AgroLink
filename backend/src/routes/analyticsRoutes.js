const express = require("express");
const { getPlatformStats, getMonthlyTrends } = require("../controllers/analyticsController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/stats", getPlatformStats);
router.get("/trends", getMonthlyTrends);

module.exports = router;
