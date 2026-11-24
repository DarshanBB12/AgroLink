const express = require("express");
const { body, param } = require("express-validator");
const c = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("farmer"),
  [
    body("type").optional().isIn(["worker", "equipment", "fertilizer", "seed"]).withMessage("Invalid order type"),
    body("itemId").isMongoId().withMessage("A valid itemId is required"),
    body("quantity").optional().isInt({ min: 1 }).withMessage("quantity must be a whole number of at least 1"),
    body("duration").optional().isInt({ min: 1 }).withMessage("duration must be a whole number"),
  ],
  validate,
  c.createOrder
);

router.get("/my", protect, authorize("farmer"), c.getMyOrders);
router.get("/my-rentals", protect, authorize("farmer"), c.getMyOrders);
router.get("/provider", protect, authorize("worker", "equipment_owner"), c.getProviderOrders);
router.get("/incoming", protect, authorize("worker", "equipment_owner"), c.getProviderOrders);
router.get("/earnings", protect, authorize("worker", "equipment_owner"), c.earnings);
router.get("/exports/orders", protect, authorize("farmer", "admin"), c.exportOrdersCsv);
router.get("/exports/rentals", protect, authorize("farmer", "admin"), c.exportOrdersCsv);
router.get("/", protect, authorize("admin"), c.getAllOrders);
router.get("/:id", protect, [param("id").isMongoId().withMessage("Invalid order id")], validate, c.getOrder);
router.put(
  "/:id/status",
  protect,
  [param("id").isMongoId().withMessage("Invalid order id"), body("status").isIn(["pending", "approved", "rejected", "completed", "cancelled"]).withMessage("Invalid status")],
  validate,
  c.updateOrderStatus
);

module.exports = router;
