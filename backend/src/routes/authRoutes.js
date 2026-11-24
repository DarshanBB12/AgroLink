const express = require("express");
const rateLimit = require("express-rate-limit");
const c = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { registerValidation, loginValidation, changePasswordValidation } = require("../middleware/validators/authValidation");

const router = express.Router();

// Brute-force protection on credential endpoints (disabled under test so suites are deterministic).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many attempts. Please try again in a few minutes." },
});

router.post("/register", authLimiter, registerValidation, validate, c.register);
router.post("/login", authLimiter, loginValidation, validate, c.login);
router.post("/logout", protect, c.logout);
router.get("/me", protect, c.getMe);
router.put("/profile", protect, c.updateProfile);
router.put("/change-password", protect, changePasswordValidation, validate, c.changePassword);
router.put("/location", protect, c.updateLocation);
router.delete("/location", protect, c.clearLocation);
router.put("/settings", protect, c.updateSettings);

module.exports = router;
