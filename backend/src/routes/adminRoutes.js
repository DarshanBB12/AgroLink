const express = require("express");
const c = require("../controllers/adminController");
const orders = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect, authorize("admin"));

router.get("/users", c.listUsers);
router.post("/users", c.createUser);
router.put("/users/:id", c.updateUser);
router.delete("/users/:id", c.deleteUser);

router.get("/orders", orders.getAllOrders);
router.put("/orders/:id/status", orders.updateOrderStatus);

router.get("/settings", c.getSettings);
router.put("/settings", c.updateSettings);
router.post("/announcements", c.announce);

router.get("/exports/users", c.exportUsersCsv);
router.get("/exports/orders", orders.exportOrdersCsv);
router.get("/exports/rentals", orders.exportOrdersCsv);

module.exports = router;
