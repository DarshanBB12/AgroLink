const express = require("express");
const { protect } = require("../middleware/auth");
const { getUserById, getAllUsersForChat, updateProfile } = require("../controllers/userController");

const router = express.Router();

router.get("/chat/all", protect, getAllUsersForChat);
router.put("/profile", protect, updateProfile);
router.get("/:id", protect, getUserById);

module.exports = router;
