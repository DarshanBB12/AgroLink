const express = require("express");
const c = require("../controllers/paymentController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// NOTE: the webhook route is mounted separately in app.js with a raw body parser (signature needs raw bytes).
router.get("/config", protect, c.config);
router.get("/my", protect, c.myPayments);
router.get("/received", protect, authorize("worker", "equipment_owner"), c.receivedPayments);

router.post("/orders/:orderId/create", protect, authorize("farmer"), c.createOrderPayment);
router.post("/emi/:loanId/create", protect, authorize("farmer"), c.createEmiPayment);
router.post("/verify", protect, authorize("farmer"), c.verify);

router.get("/admin/all", protect, authorize("admin"), c.adminAll);
router.get("/admin/export", protect, authorize("admin"), c.adminExport);
router.put("/admin/:id/refund", protect, authorize("admin"), c.adminRefund);

router.post("/:id/test-confirm", protect, authorize("farmer"), c.testConfirm);
router.post("/:id/fail", protect, authorize("farmer"), c.reportFailure);
router.get("/:id/invoice", protect, c.invoice);
router.get("/:id", protect, c.getOne);

module.exports = router;
