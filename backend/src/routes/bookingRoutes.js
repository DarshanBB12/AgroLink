const express = require("express");
const { createBooking, getMyBookings, getAllBookings, updateBookingStatus } = require("../controllers/bookingController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, authorize("farmer"), createBooking);
router.get("/my", protect, authorize("farmer"), getMyBookings);
router.get("/", protect, authorize("admin"), getAllBookings);
router.put("/:id", protect, updateBookingStatus);

module.exports = router;
