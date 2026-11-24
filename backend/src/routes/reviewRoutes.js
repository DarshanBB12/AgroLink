const express = require("express");
const c = require("../controllers/reviewController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.post("/", protect, authorize("farmer"), c.create);
router.get("/received", protect, authorize("worker", "equipment_owner"), c.received);

module.exports = router;
