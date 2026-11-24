
const Transaction = require("../models/Transaction");
const Order = require("../models/Order");
const Loan = require("../models/Loan");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const gateway = require("../services/paymentGateway");
const pay = require("../services/paymentService");
const { notify } = require("../utils/notify");
const { parsePagination, buildPagination } = require("../utils/pagination");
const { sendCsv } = require("../utils/csv");
const { escapeRegex, cleanQuery } = require("../utils/escapeRegex");
const { parseDay } = require("../utils/dates");

const STATUSES = ["created", "pending", "completed", "failed", "cancelled", "refunded"];

const formatTxn = (t, extra = {}) => ({
  id: String(t._id),
  transactionRef: t.transactionRef,
  receiptNo: t.receiptNo,
  type: t.type,
  purpose: t.purpose,
  amount: t.amount,
  currency: t.currency || "INR",
  status: t.status,
  mode: t.mode,
  isTest: t.mode === "test",
  description: t.description,
  relatedId: t.relatedId ? String(t.relatedId) : null,
  relatedModel: t.relatedModel,
  razorpayOrderId: t.razorpayOrderId,
  failureReason: t.failureReason || "",
  paidAt: t.paidAt,
  createdAt: t.createdAt,
  ...extra,
});

const config = asyncHandler(async (req, res) => {
  const mode = gateway.getMode();
  res.status(200).json({
    success: true,
    data: {
      mode, // "razorpay" (real) or "test" (no real money)
      keyId: mode === "razorpay" ? process.env.RAZORPAY_KEY_ID : null, // public key id only; the secret never leaves the server
      currency: "INR",
      testModeNotice: mode === "test" ? "Test mode: no real money is charged and payments are labelled as test payments." : null,
    },
  });
});

// Create (or reuse) a gateway order for something the user must pay. Amount always comes from the database.
const startPayment = async ({ user, purpose, amount, relatedId, relatedModel, description, meta }) => {
  const mode = gateway.getMode();
  if (mode === "test" && !gateway.testModeAllowed()) {
    throw new ApiError(503, "Online payments are not configured. Please contact support.");
  }

  // Idempotency: reuse an unfinished transaction for the same thing instead of creating duplicates.
  const open = await Transaction.findOne({ userId: user._id, relatedId, purpose, status: { $in: ["created", "pending"] }, mode }).sort({ createdAt: -1 });
  if (open && open.amount === amount) return open;
  if (open) await Transaction.updateOne({ _id: open._id }, { $set: { status: "cancelled", failureReason: "Superseded by a new payment attempt" } });

  const transactionRef = pay.newTransactionRef();
  let razorpayOrderId = `test_order_${transactionRef}`;
  if (mode === "razorpay") {
    try {
      const rzOrder = await gateway.getClient().orders.create({
        amount: pay.toPaise(amount),
        currency: "INR",
        receipt: transactionRef.slice(0, 40),
        notes: { purpose, relatedId: String(relatedId), userId: String(user._id) },
      });
      razorpayOrderId = rzOrder.id;
    } catch (error) {
      console.error("[payments] razorpay order creation failed:", error?.error?.description || error.message);
      throw new ApiError(502, "Could not start the payment with the payment gateway. Please try again.");
    }
  }

  return Transaction.create({
    userId: user._id,
    type: purpose === "emi" ? "emi_payment" : "order_payment",
    purpose,
    amount,
    status: "created",
    description,
    relatedId,
    relatedModel,
    paymentMethod: mode === "razorpay" ? "razorpay" : "online",
    mode,
    transactionRef,
    razorpayOrderId,
    meta,
  });
};

const checkoutPayload = (txn, user) => ({
  transaction: formatTxn(txn),
  checkout: {
    mode: txn.mode,
    keyId: txn.mode === "razorpay" ? process.env.RAZORPAY_KEY_ID : null,
    razorpayOrderId: txn.razorpayOrderId,
    amountPaise: pay.toPaise(txn.amount),
    currency: "INR",
    name: "AgroLink",
    description: txn.description,
    prefill: { name: user.name, email: user.email, contact: user.phone || "" },
  },
});

const createOrderPayment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order || String(order.farmerId) !== String(req.user._id)) throw new ApiError(404, "Order not found");
  if (order.paymentStatus === "paid") throw new ApiError(409, "This order has already been paid");
  if (order.paymentStatus === "refunded") throw new ApiError(409, "This order was refunded");
  if (["cancelled", "rejected"].includes(order.status)) throw new ApiError(409, `Cannot pay for a ${order.status} order`);
  if (["equipment", "worker"].includes(order.type) && order.status === "pending") {
    throw new ApiError(409, "You can pay once the provider approves your request");
  }
  const txn = await startPayment({
    user: req.user,
    purpose: "order",
    amount: order.totalPrice,
    relatedId: order._id,
    relatedModel: "Order",
    description: `${order.itemName} (${order.type})`,
    meta: { orderType: order.type },
  });
  res.status(201).json({ success: true, data: checkoutPayload(txn, req.user) });
});

const createEmiPayment = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.loanId);
  if (!loan || String(loan.farmerId) !== String(req.user._id)) throw new ApiError(404, "Loan not found");
  if (!["active", "approved"].includes(loan.loanStatus)) throw new ApiError(409, `Cannot pay EMI on a loan that is ${loan.loanStatus}`);
  if (!(loan.remainingAmount > 0)) throw new ApiError(409, "This loan has no outstanding balance");
  const amount = Math.round(Math.min(loan.monthlyEMI, loan.remainingAmount) * 100) / 100;
  const txn = await startPayment({
    user: req.user,
    purpose: "emi",
    amount,
    relatedId: loan._id,
    relatedModel: "Loan",
    description: `EMI payment for loan ${String(loan._id).slice(-6).toUpperCase()}`,
    meta: {},
  });
  res.status(201).json({ success: true, data: checkoutPayload(txn, req.user) });
});

const loadOwnTxn = async (id, user) => {
  let txn;
  try {
    txn = await Transaction.findById(id);
  } catch {
    throw new ApiError(400, "Invalid transaction id");
  }
  if (!txn || String(txn.userId) !== String(user._id)) throw new ApiError(404, "Transaction not found");
  return txn;
};

// Verify the checkout result. A transaction only becomes "completed" after the HMAC signature is valid
// AND (when live) the gateway confirms the payment amount/order.
const verify = asyncHandler(async (req, res) => {
  const { transactionId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  const txn = transactionId
    ? await loadOwnTxn(transactionId, req.user)
    : await Transaction.findOne({ razorpayOrderId: orderId, userId: req.user._id });
  if (!txn) throw new ApiError(404, "Transaction not found");
  if (txn.mode !== "razorpay") throw new ApiError(400, "This transaction is not a gateway payment");

  if (txn.status === "completed") {
    await pay.finalizeSuccess(txn); // idempotent: repairs a half-applied payment
    return res.status(200).json({ success: true, message: "Payment already confirmed", data: formatTxn(txn), duplicate: true });
  }
  if (txn.status === "refunded") throw new ApiError(409, "This payment was refunded");

  if (!orderId || orderId !== txn.razorpayOrderId || !gateway.verifyCheckoutSignature({ orderId, paymentId, signature })) {
    await Transaction.updateOne({ _id: txn._id, status: { $ne: "completed" } }, { $set: { status: "failed", failureReason: "Signature verification failed" } });
    await notify(req.user._id, { type: "payment", title: "Payment could not be verified", message: "We could not verify your payment. If money was deducted it will be refunded by your bank.", severity: "critical", link: "/dashboard/farmer/payments" });
    throw new ApiError(400, "Payment verification failed");
  }

  // Cross-check with the gateway so a valid signature for a different/short amount is still rejected.
  try {
    const rzPayment = await gateway.getClient().payments.fetch(paymentId);
    const okStatus = ["captured", "authorized"].includes(rzPayment.status);
    if (rzPayment.order_id !== txn.razorpayOrderId || Number(rzPayment.amount) !== pay.toPaise(txn.amount) || !okStatus) {
      await Transaction.updateOne({ _id: txn._id, status: { $ne: "completed" } }, { $set: { status: "failed", failureReason: "Gateway payment did not match" } });
      throw new ApiError(400, "Payment details did not match. Payment not confirmed.");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("[payments] gateway fetch failed:", error?.error?.description || error.message);
    throw new ApiError(502, "Could not confirm the payment with the gateway. Please retry in a moment.");
  }

  const done = await pay.markCompleted(txn._id, { razorpayPaymentId: paymentId, status: "completed" });
  const finalTxn = done || (await Transaction.findById(txn._id));
  if (done) await pay.finalizeSuccess(finalTxn);
  res.status(200).json({ success: true, message: "Payment confirmed", data: formatTxn(finalTxn) });
});

// Test mode only: explicit, labelled simulation. Never available while real keys are configured.
const testConfirm = asyncHandler(async (req, res) => {
  const txn = await loadOwnTxn(req.params.id, req.user);
  if (txn.mode !== "test" || gateway.isLive()) throw new ApiError(400, "Test confirmation is only available in test mode");
  if (!gateway.testModeAllowed()) throw new ApiError(403, "Test payments are disabled in production");
  const outcome = req.body.outcome || "success";
  if (!["success", "failure", "cancel"].includes(outcome)) throw new ApiError(400, "Invalid outcome");
  if (txn.status === "completed") return res.status(200).json({ success: true, message: "Already confirmed (test payment)", data: formatTxn(txn), duplicate: true });

  if (outcome === "success") {
    const done = await pay.markCompleted(txn._id, { meta: { ...(txn.meta || {}), simulated: true } });
    const finalTxn = done || (await Transaction.findById(txn._id));
    if (done) await pay.finalizeSuccess(finalTxn);
    return res.status(200).json({ success: true, message: "TEST payment recorded. No real money was charged.", data: formatTxn(finalTxn) });
  }
  const status = outcome === "cancel" ? "cancelled" : "failed";
  const reason = outcome === "cancel" ? "Cancelled by user" : "Simulated failure (test mode)";
  const updated = await Transaction.findOneAndUpdate({ _id: txn._id, status: { $ne: "completed" } }, { $set: { status, failureReason: reason } }, { new: true });
  res.status(200).json({ success: true, message: `Test payment ${status}`, data: formatTxn(updated) });
});

// Client reports that checkout failed or was dismissed. This can only ever move a transaction AWAY from success.
const reportFailure = asyncHandler(async (req, res) => {
  const txn = await loadOwnTxn(req.params.id, req.user);
  if (txn.status === "completed" || txn.status === "refunded") throw new ApiError(409, `Payment is already ${txn.status}`);
  const status = req.body.cancelled ? "cancelled" : "failed";
  const reason = String(req.body.reason || (req.body.cancelled ? "Cancelled by user" : "Payment failed")).slice(0, 200);
  const updated = await Transaction.findOneAndUpdate({ _id: txn._id, status: { $in: ["created", "pending", "failed", "cancelled"] } }, { $set: { status, failureReason: reason } }, { new: true });
  if (!updated) throw new ApiError(409, "Payment state changed");
  if (status === "failed") {
    await notify(req.user._id, { type: "payment", title: "Payment failed", message: `${txn.description}: ${reason}`, severity: "warning", link: `/dashboard/farmer/payments/${txn._id}` });
  }
  res.status(200).json({ success: true, message: `Payment ${status}`, data: formatTxn(updated) });
});

// Razorpay webhook (payment.captured): lets us confirm payments even if the browser closed before /verify.
const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const raw = req.body; // Buffer (express.raw)
  if (!Buffer.isBuffer(raw) || !gateway.verifyWebhookSignature(raw, signature)) return res.status(400).json({ success: false, message: "Invalid signature" });
  const event = JSON.parse(raw.toString("utf8"));
  if (event.event === "payment.captured" || event.event === "order.paid") {
    const entity = event.payload?.payment?.entity;
    const txn = entity && (await Transaction.findOne({ razorpayOrderId: entity.order_id, mode: "razorpay" }));
    if (txn && entity.amount === pay.toPaise(txn.amount)) {
      const done = await pay.markCompleted(txn._id, { razorpayPaymentId: entity.id });
      if (done) await pay.finalizeSuccess(done);
      else if (txn.status === "completed") await pay.finalizeSuccess(txn);
    }
  }
  res.status(200).json({ success: true });
});

const buildFilter = async (query, base) => {
  const f = { ...base };
  if (query.status && STATUSES.includes(query.status)) f.status = query.status;
  if (query.mode && ["razorpay", "test"].includes(query.mode)) f.mode = query.mode;
  if (query.purpose && ["order", "emi"].includes(query.purpose)) f.purpose = query.purpose;
  if (query.from || query.to) {
    f.createdAt = {};
    const from = parseDay(query.from);
    const to = parseDay(query.to);
    if (from) f.createdAt.$gte = from;
    if (to) f.createdAt.$lt = new Date(to.getTime() + 86400000);
  }
  const q = cleanQuery(query.q || "");
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    f.$or = [{ transactionRef: rx }, { description: rx }, { receiptNo: rx }];
    if (query.admin) {
      const ids = await User.find({ name: rx }).distinct("_id");
      if (ids.length) f.$or.push({ userId: { $in: ids } });
    }
  }
  return f;
};

const myPayments = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20 });
  const filter = await buildFilter(req.query, { userId: req.user._id });
  const [total, items, totals] = await Promise.all([
    Transaction.countDocuments(filter),
    Transaction.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    Transaction.aggregate([{ $match: { userId: req.user._id, status: "completed" } }, { $group: { _id: "$mode", total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
  ]);
  const sumFor = (mode) => totals.find((t) => t._id === mode)?.total || 0;
  res.status(200).json({ success: true, data: items.map((t) => formatTxn(t)), summary: { paid: sumFor("razorpay"), testModePaid: sumFor("test") }, pagination: buildPagination(pg, total) });
});

// Money received by a provider (worker / equipment owner) for orders they fulfil.
const receivedPayments = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20 });
  const orderIds = await Order.find({ providerId: req.user._id }).distinct("_id");
  const filter = await buildFilter(req.query, { relatedId: { $in: orderIds }, purpose: "order", status: "completed" });
  const [total, items] = await Promise.all([Transaction.countDocuments(filter), Transaction.find(filter).sort({ paidAt: -1 }).skip(pg.skip).limit(pg.limit)]);
  res.status(200).json({ success: true, data: items.map((t) => formatTxn(t)), pagination: buildPagination(pg, total) });
});

const canView = async (txn, user) => {
  if (user.role === "admin" || String(txn.userId) === String(user._id)) return true;
  if (txn.purpose === "order" && txn.relatedId) {
    const order = await Order.findById(txn.relatedId).select("providerId");
    return Boolean(order && String(order.providerId) === String(user._id));
  }
  return false;
};

const getOne = asyncHandler(async (req, res) => {
  let txn;
  try {
    txn = await Transaction.findById(req.params.id);
  } catch {
    throw new ApiError(400, "Invalid transaction id");
  }
  if (!txn || !(await canView(txn, req.user))) throw new ApiError(404, "Transaction not found");
  const payer = await User.findById(txn.userId).select("name email");
  const order = txn.purpose === "order" && txn.relatedId ? await Order.findById(txn.relatedId).select("itemName type quantity duration price totalPrice discountPercent status startDate endDate") : null;
  res.status(200).json({ success: true, data: formatTxn(txn, { payer: payer ? { name: payer.name, email: req.user.role === "admin" || String(payer._id) === String(req.user._id) ? payer.email : undefined } : null, order }) });
});

const invoice = asyncHandler(async (req, res) => {
  let txn;
  try {
    txn = await Transaction.findById(req.params.id);
  } catch {
    throw new ApiError(400, "Invalid transaction id");
  }
  if (!txn || !(await canView(txn, req.user))) throw new ApiError(404, "Transaction not found");
  if (txn.status !== "completed") throw new ApiError(409, "Invoices are only available for completed payments");
  const payer = await User.findById(txn.userId).select("name email");
  const order = txn.purpose === "order" && txn.relatedId ? await Order.findById(txn.relatedId).lean() : null;

  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${txn.receiptNo || txn.transactionRef}.pdf"`);
  doc.pipe(res);

  const money = (n) => `INR ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  doc.fontSize(22).fillColor("#166534").text("AgroLink", { continued: true }).fillColor("#111").fontSize(12).text("   Payment Receipt / Invoice", { align: "left" });
  doc.moveDown(0.5).fontSize(10).fillColor("#555").text(`Receipt No: ${txn.receiptNo}`).text(`Transaction ID: ${txn.transactionRef}`).text(`Date: ${(txn.paidAt || txn.createdAt).toISOString().slice(0, 10)}`);
  if (txn.mode === "test") doc.moveDown(0.5).fillColor("#b45309").fontSize(11).text("TEST PAYMENT - no real money was charged. This document is not a tax invoice.");
  if (txn.razorpayPaymentId) doc.fillColor("#555").fontSize(10).text(`Gateway payment ID: ${txn.razorpayPaymentId}`);
  doc.moveDown().fillColor("#111").fontSize(12).text("Billed to", { underline: true }).fontSize(10).text(payer?.name || "-").text(payer?.email || "");
  doc.moveDown().fontSize(12).text("Details", { underline: true }).fontSize(10);
  doc.text(`Description: ${txn.description}`);
  if (order) {
    doc.text(`Item: ${order.itemName} (${order.type})`).text(`Unit price: ${money(order.price)}`).text(`${order.type === "fertilizer" || order.type === "seed" ? "Quantity" : "Duration"}: ${order.type === "fertilizer" || order.type === "seed" ? order.quantity : order.duration}`);
    if (order.discountPercent) doc.text(`Discount: ${order.discountPercent}%`);
  }
  doc.moveDown().fontSize(14).fillColor("#166534").text(`Total paid: ${money(txn.amount)}`);
  doc.moveDown(2).fontSize(8).fillColor("#888").text("Generated by AgroLink. This is a computer-generated document.");
  doc.end();
});

// ---------------- Admin ----------------
const adminAll = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20 });
  const filter = await buildFilter({ ...req.query, admin: true }, {});
  const [total, items, stats] = await Promise.all([
    Transaction.countDocuments(filter),
    Transaction.find(filter).populate("userId", "name email role").sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    Transaction.aggregate([{ $group: { _id: { status: "$status", mode: "$mode" }, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
  ]);
  const pick = (status, mode) => stats.filter((s) => s._id.status === status && (!mode || s._id.mode === mode)).reduce((a, s) => ({ total: a.total + s.total, count: a.count + s.count }), { total: 0, count: 0 });
  res.status(200).json({
    success: true,
    data: items.map((t) => formatTxn(t, { user: t.userId ? { id: t.userId._id, name: t.userId.name, email: t.userId.email, role: t.userId.role } : null })),
    summary: { completed: pick("completed", "razorpay"), testMode: pick("completed", "test"), failed: pick("failed"), pending: { total: pick("created").total + pick("pending").total, count: pick("created").count + pick("pending").count }, refunded: pick("refunded") },
    pagination: buildPagination(pg, total),
  });
});

const adminRefund = asyncHandler(async (req, res) => {
  const txn = await Transaction.findById(req.params.id);
  if (!txn) throw new ApiError(404, "Transaction not found");
  if (txn.status !== "completed") throw new ApiError(409, "Only completed payments can be marked refunded");
  txn.status = "refunded";
  txn.failureReason = String(req.body.reason || "Refunded by admin").slice(0, 200);
  await txn.save();
  if (txn.purpose === "order" && txn.relatedId) await Order.updateOne({ _id: txn.relatedId }, { $set: { paymentStatus: "refunded" } });
  await notify(txn.userId, { type: "payment", title: "Payment refunded", message: `${txn.description} was marked as refunded.${txn.mode === "razorpay" ? " The money is returned via the original payment method." : ""}`, severity: "info", link: `/dashboard/farmer/payments/${txn._id}` });
  res.status(200).json({ success: true, message: "Marked as refunded. For live payments also issue the refund in the Razorpay dashboard.", data: formatTxn(txn) });
});

const adminExport = asyncHandler(async (req, res) => {
  const items = await Transaction.find(await buildFilter({ ...req.query, admin: true }, {})).populate("userId", "name email").sort({ createdAt: -1 }).limit(5000);
  const rows = items.map((t) => ({ transactionRef: t.transactionRef, receiptNo: t.receiptNo || "", user: t.userId?.name || "", email: t.userId?.email || "", purpose: t.purpose, amount: t.amount, status: t.status, mode: t.mode, description: t.description, createdAt: t.createdAt.toISOString(), paidAt: t.paidAt ? t.paidAt.toISOString() : "" }));
  return sendCsv(res, "payments-report.csv", rows.length ? rows : [{ transactionRef: "", receiptNo: "", user: "", email: "", purpose: "", amount: "", status: "", mode: "", description: "", createdAt: "", paidAt: "" }]);
});

module.exports = { config, createOrderPayment, createEmiPayment, verify, testConfirm, reportFailure, webhook, myPayments, receivedPayments, getOne, invoice, adminAll, adminRefund, adminExport, formatTxn };
