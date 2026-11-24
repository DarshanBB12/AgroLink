const crypto = require("crypto");
const Transaction = require("../models/Transaction");
const Order = require("../models/Order");
const Loan = require("../models/Loan");
const EMIPayment = require("../models/EMIPayment");
const { notify } = require("../utils/notify");
const User = require("../models/User");

const newTransactionRef = () => `AGL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
const newReceiptNo = () => {
  const d = new Date();
  return `RCPT-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

// Apply the side effects of a verified, successful payment. Safe to call more than once for the same
// transaction (the order update is conditional and EMI recording is keyed on the transaction ref).
const finalizeSuccess = async (txn) => {
  if (txn.purpose === "order" && txn.relatedId) {
    const res = await Order.findOneAndUpdate(
      { _id: txn.relatedId, paymentStatus: "unpaid" },
      { $set: { paymentStatus: "paid", paidAt: txn.paidAt || new Date(), paymentId: txn._id, paymentMode: txn.mode } },
      { new: true }
    );
    if (res) {
      const providerUser = await User.findById(res.providerId).select("role");
      const label = txn.mode === "test" ? " (TEST payment — no real money)" : "";
      await notify(res.farmerId, {
        type: "payment",
        title: "Payment successful",
        message: `Payment of ₹${txn.amount.toLocaleString("en-IN")} for ${res.itemName} was confirmed${label}.`,
        severity: "success",
        link: `/dashboard/farmer/payments/${txn._id}`,
        metadata: { transactionId: txn._id, orderId: res._id },
      });
      await notify(res.providerId, {
        type: "payment",
        title: "Payment received",
        message: `₹${txn.amount.toLocaleString("en-IN")} was paid for ${res.itemName}${label}.`,
        severity: "success",
        link: `/dashboard/${providerUser?.role === "worker" ? "worker" : "owner"}/earnings`,
        metadata: { transactionId: txn._id, orderId: res._id },
      });
    }
  }

  if (txn.purpose === "emi" && txn.relatedId) {
    const exists = await EMIPayment.findOne({ transactionId: txn.transactionRef });
    if (!exists) {
      const loan = await Loan.findById(txn.relatedId);
      if (loan) {
        await EMIPayment.create({
          loanId: loan._id,
          farmerId: loan.farmerId,
          amount: txn.amount,
          paymentMethod: txn.mode === "test" ? "online" : "razorpay",
          transactionId: txn.transactionRef,
          paymentDate: txn.paidAt || new Date(),
          status: "completed",
        });
        loan.recordEMIPayment(txn.amount);
        await loan.save();
        await notify(loan.farmerId, {
          type: "loan",
          title: loan.loanStatus === "completed" ? "Loan fully repaid" : "EMI payment received",
          message: `EMI payment of ₹${txn.amount.toLocaleString("en-IN")} was confirmed.`,
          severity: "success",
          link: "/dashboard/farmer/emi",
          metadata: { loanId: loan._id, transactionId: txn._id },
        });
      }
    }
  }
};

// Flip a transaction to completed exactly once. Returns the transaction only for the caller that won the race.
const markCompleted = async (txnId, fields) =>
  Transaction.findOneAndUpdate(
    { _id: txnId, status: { $in: ["created", "pending", "failed", "cancelled"] } },
    { $set: { status: "completed", paidAt: new Date(), receiptNo: newReceiptNo(), failureReason: "", ...fields } },
    { new: true }
  );

module.exports = { newTransactionRef, newReceiptNo, toPaise, finalizeSuccess, markCompleted };
