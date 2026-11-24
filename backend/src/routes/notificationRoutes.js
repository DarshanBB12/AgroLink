const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount,
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", protect, getNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.route("/read-all").put(protect, markAllAsRead).patch(protect, markAllAsRead);
router.route("/clear-all").delete(protect, clearAllNotifications);
router.delete("/", protect, clearAllNotifications);
router.route("/:id/read").put(protect, markAsRead).patch(protect, markAsRead);
router.delete("/:id", protect, deleteNotification);

module.exports = router;
