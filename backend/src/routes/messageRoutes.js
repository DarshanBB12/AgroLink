const express = require("express");
const c = require("../controllers/messageController");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

router.get("/unread-count", c.getUnreadCount);
router.get("/conversations", c.conversations);
router.post("/send", c.sendMessage);
router.get("/:userId", c.getMessages);

module.exports = router;
