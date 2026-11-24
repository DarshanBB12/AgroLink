const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  calculateEMI,
  getEligibilityConfig,
  applyForLoan,
  getFarmerLoans,
  getLoanDetails,
  recordEMIPayment,
  getEMIPaymentHistory,
  getAllLoans,
  getPendingLoans,
  getAdminEMIStats,
  approveLoan,
  rejectLoan,
  cancelLoan,
} = require("../controllers/emiController");

const router = express.Router();

// Available to any authenticated user (calculator + config are read-only helpers)
router.post("/calculate", protect, calculateEMI);
router.get("/config", protect, getEligibilityConfig);

// Farmer routes
router.post("/apply", protect, authorize("farmer"), applyForLoan);
router.get("/my-loans", protect, authorize("farmer"), getFarmerLoans);
// Farmers pay through POST /api/payments/emi/:loanId/create + /verify. This route is only for admins recording offline payments.
router.post("/pay", protect, authorize("admin"), recordEMIPayment);

// Admin routes — MUST be registered before the generic "/:loanId" routes below,
// otherwise Express would treat "admin" as a :loanId value and 404/misroute.
router.get("/admin/all", protect, authorize("admin"), getAllLoans);
router.get("/admin/pending", protect, authorize("admin"), getPendingLoans);
router.get("/admin/stats", protect, authorize("admin"), getAdminEMIStats);
router.put("/:loanId/approve", protect, authorize("admin"), approveLoan);
router.put("/:loanId/reject", protect, authorize("admin"), rejectLoan);
router.put("/:loanId/cancel", protect, authorize("farmer"), cancelLoan);

// Shared (farmer sees their own loan, admin sees any — enforced inside controller)
router.get("/:loanId/payments", protect, getEMIPaymentHistory);
router.get("/:loanId", protect, getLoanDetails);

module.exports = router;
