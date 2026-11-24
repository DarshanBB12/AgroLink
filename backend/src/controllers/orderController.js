const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
const Review = require("../models/Review");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const settings = require("../services/settingsService");
const svc = require("../services/orderService");
const { notify, roleLink } = require("../utils/notify");
const { canHireWorker } = require("../utils/planGuards");
const { parseDay, todayUTC, inclusiveDays } = require("../utils/dates");
const { parsePagination, buildPagination } = require("../utils/pagination");
const { escapeRegex, cleanQuery } = require("../utils/escapeRegex");
const { sendCsv } = require("../utils/csv");

const ORDER_TYPES = ["worker", "equipment", "fertilizer", "seed"];
const STATUSES = ["pending", "approved", "completed", "rejected", "cancelled"];

const idOf = (v) => String(v?._id || v);

// Shape sent to clients. Contact details of the other party are only revealed once the request is approved.
const formatOrder = (o, viewer) => {
  const isFarmer = viewer && idOf(o.farmerId) === String(viewer._id);
  const isProvider = viewer && idOf(o.providerId) === String(viewer._id);
  const approved = ["approved", "completed"].includes(o.status);
  const party = (u, show) =>
    u && u._id ? { id: u._id, name: u.name, location: u.location || "", ...(show && approved && u.phone ? { phone: u.phone } : {}), ...(show && viewer.role === "admin" ? { email: u.email, phone: u.phone } : {}) } : { id: idOf(u) };
  const adminView = viewer?.role === "admin";

  const needsApproval = o.type === "equipment" || o.type === "worker";
  const canPay =
    o.paymentStatus === "unpaid" &&
    !["cancelled", "rejected"].includes(o.status) &&
    (needsApproval ? ["approved", "completed"].includes(o.status) : true);

  return {
    id: String(o._id),
    type: o.type,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMode: o.paymentMode || null,
    itemId: idOf(o.itemId),
    itemName: o.itemName || "",
    price: o.price,
    unit: o.pricing?.unit,
    discountPercent: o.discountPercent || 0,
    totalPrice: o.totalPrice,
    quantity: o.quantity,
    duration: o.duration,
    startDate: o.startDate,
    endDate: o.endDate,
    notes: o.notes,
    cancelReason: o.cancelReason || "",
    location: o.location || "",
    paidAt: o.paidAt,
    canPay: Boolean(isFarmer || adminView) && canPay,
    farmer: party(o.farmerId, isProvider || adminView),
    provider: party(o.providerId, isFarmer || adminView),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

const POPULATE = [
  { path: "farmerId", select: "name location phone email" },
  { path: "providerId", select: "name location phone email businessName" },
];

const createOrder = asyncHandler(async (req, res) => {
  const type = String(req.body.type || req.body.orderType || "").toLowerCase();
  if (!ORDER_TYPES.includes(type)) throw new ApiError(400, "Invalid order type");
  if (!req.body.itemId) throw new ApiError(400, "itemId is required");

  const target = await svc.resolveTarget(type, req.body.itemId);
  if (String(target.providerId) === String(req.user._id)) throw new ApiError(400, "You cannot order your own listing");

  const isProduct = svc.PRODUCT_TYPES.includes(type);
  const notes = String(req.body.notes || "").slice(0, 500);
  let quantity = 1;
  let duration = 1;
  let startDate = null;
  let endDate = null;

  if (isProduct) {
    quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw new ApiError(400, "Quantity must be a whole number of at least 1");
    if (quantity > target.doc.stock) throw new ApiError(409, `Only ${target.doc.stock} in stock`);
    duration = 1;
  } else {
    startDate = parseDay(req.body.startDate);
    if (!startDate) throw new ApiError(400, "A valid start date is required");
    const earliest = new Date(todayUTC().getTime() - 24 * 60 * 60 * 1000);
    if (startDate < earliest) throw new ApiError(400, "Start date cannot be in the past");

    if (target.unit === "hour") {
      // Hourly items occupy a single day; duration is the number of hours.
      endDate = startDate;
      duration = Number(req.body.duration ?? req.body.hours);
      if (!Number.isInteger(duration) || duration < 1 || duration > 24) throw new ApiError(400, "Hours must be a whole number between 1 and 24");
    } else {
      endDate = parseDay(req.body.endDate) || startDate;
      if (endDate < startDate) throw new ApiError(400, "End date cannot be before the start date");
      duration = inclusiveDays(startDate, endDate);
      const maxDays = await settings.get("marketplace.maxRentalDays");
      if (duration > maxDays) throw new ApiError(400, `Bookings are limited to ${maxDays} days`);
    }

    if (type === "worker") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const used = await Order.countDocuments({ farmerId: req.user._id, type: "worker", createdAt: { $gte: monthStart, $lt: monthEnd }, status: { $nin: ["cancelled", "rejected"] } });
      const permission = canHireWorker({ user: req.user, usedThisMonth: used });
      if (!permission.allowed) {
        return res.status(403).json({ success: false, message: permission.reason, plan: { code: permission.planCode, used: permission.used, limit: permission.limit } });
      }
    }

    if (await svc.findConflict(target.doc._id, startDate, endDate)) {
      throw new ApiError(409, "These dates are already booked. Please choose different dates.");
    }
    const duplicate = await Order.findOne({ farmerId: req.user._id, itemId: target.doc._id, status: "pending", startDate: { $lte: endDate }, endDate: { $gte: startDate } });
    if (duplicate) throw new ApiError(409, "You already have a pending request for these dates");
  }

  // Price is always computed on the server from the stored listing price.
  const multiplier = isProduct ? quantity : duration;
  const discountPercent = target.discount || 0;
  const totalPrice = svc.round2(target.unitPrice * multiplier * (1 - discountPercent / 100));

  if (isProduct && !(await svc.reserveStock(type, target.doc._id, quantity))) {
    throw new ApiError(409, "Not enough stock available");
  }

  let autoAccept = false;
  if (type === "equipment") {
    const owner = await User.findById(target.providerId).select("settings");
    autoAccept = Boolean(owner?.settings?.listingPreferences?.autoAcceptRequests);
  }

  let order;
  try {
    order = await Order.create({
      farmerId: req.user._id,
      farmer: req.user._id,
      providerId: target.providerId,
      provider: target.providerId,
      itemId: target.doc._id,
      itemModel: svc.ITEM_MODEL_NAME[type],
      type,
      orderType: type,
      [type]: target.doc._id,
      itemName: target.itemName,
      price: target.unitPrice,
      pricing: { amount: target.unitPrice, unit: target.unit },
      discountPercent,
      quantity,
      duration,
      startDate: startDate || new Date(),
      endDate,
      totalPrice,
      // Products are bought instantly (stock already reserved); rentals/hires wait for the provider.
      status: isProduct || autoAccept ? "approved" : "pending",
      notes,
      location: target.location || "",
    });
  } catch (error) {
    if (isProduct) await svc.releaseStock({ type, itemId: target.doc._id, quantity });
    throw error;
  }

  const kind = isProduct ? "order" : type === "worker" ? "hire request" : "rental request";
  await notify(target.providerId, {
    type: "booking",
    title: `New ${kind}`,
    message: `${req.user.name} sent a ${kind} for ${target.itemName} (₹${totalPrice.toLocaleString("en-IN")}).`,
    link: roleLink((await User.findById(target.providerId).select("role"))?.role, type === "worker" ? "jobs" : "rentals"),
    metadata: { orderId: order._id },
  });
  await notify(req.user._id, {
    type: "booking",
    title: order.status === "approved" ? "Order confirmed" : "Request submitted",
    message: order.status === "approved" ? `${target.itemName} is confirmed. You can pay now.` : `Your request for ${target.itemName} was sent and is awaiting approval.`,
    link: "/dashboard/farmer/rentals",
    metadata: { orderId: order._id },
  });

  const populated = await Order.findById(order._id).populate(POPULATE);
  res.status(201).json({ success: true, message: "Order created", data: formatOrder(populated, req.user) });
});

const listFilter = (query, base) => {
  const f = { ...base };
  if (query.status && STATUSES.includes(String(query.status).toLowerCase())) f.status = String(query.status).toLowerCase();
  if (query.type === "product") f.type = { $in: ["fertilizer", "seed"] };
  else if (query.type && ORDER_TYPES.includes(String(query.type).toLowerCase())) f.type = String(query.type).toLowerCase();
  if (query.paymentStatus && ["unpaid", "paid", "refunded"].includes(query.paymentStatus)) f.paymentStatus = query.paymentStatus;
  if (query.from || query.to) {
    f.createdAt = {};
    const from = parseDay(query.from);
    const to = parseDay(query.to);
    if (from) f.createdAt.$gte = from;
    if (to) f.createdAt.$lt = new Date(to.getTime() + 24 * 60 * 60 * 1000);
  }
  const q = cleanQuery(query.q || "");
  if (q) f.itemName = new RegExp(escapeRegex(q), "i");
  return f;
};

const respondList = async (req, res, filter) => {
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
  ]);
  res.status(200).json({ success: true, data: orders.map((o) => formatOrder(o, req.user)), pagination: buildPagination(pg, total) });
};

const getMyOrders = asyncHandler((req, res) => respondList(req, res, listFilter(req.query, { farmerId: req.user._id })));
const getProviderOrders = asyncHandler((req, res) => respondList(req, res, listFilter(req.query, { providerId: req.user._id })));

const getAllOrders = asyncHandler(async (req, res) => {
  const filter = listFilter(req.query, {});
  const q = cleanQuery(req.query.q || "");
  if (q) {
    // Admin search also matches farmer / provider names.
    const rx = new RegExp(escapeRegex(q), "i");
    const ids = await User.find({ name: rx }).distinct("_id");
    delete filter.itemName;
    filter.$or = [{ itemName: rx }, { farmerId: { $in: ids } }, { providerId: { $in: ids } }];
  }
  return respondList(req, res, filter);
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(POPULATE);
  if (!order) throw new ApiError(404, "Order not found");
  const involved = [idOf(order.farmerId), idOf(order.providerId)].includes(String(req.user._id));
  if (!involved && req.user.role !== "admin") throw new ApiError(404, "Order not found"); // do not reveal existence
  const review = await Review.findOne({ orderId: order._id }).lean();
  const payment = order.paymentId ? await Transaction.findById(order.paymentId).select("transactionRef receiptNo mode status paidAt amount").lean() : null;
  res.status(200).json({ success: true, data: { ...formatOrder(order, req.user), review: review ? { rating: review.rating, comment: review.comment, createdAt: review.createdAt } : null, payment: payment ? { id: String(payment._id), transactionRef: payment.transactionRef, receiptNo: payment.receiptNo, mode: payment.mode, status: payment.status, paidAt: payment.paidAt, amount: payment.amount } : null } });
});

const providerTransitions = { pending: ["approved", "rejected"], approved: ["completed"] };

const updateOrderStatus = asyncHandler(async (req, res) => {
  const next = String(req.body.status || "").toLowerCase();
  if (!STATUSES.includes(next)) throw new ApiError(400, "Invalid status");

  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  const isAdmin = req.user.role === "admin";
  const isProvider = String(order.providerId) === String(req.user._id);
  const isFarmer = String(order.farmerId) === String(req.user._id);
  if (!isAdmin && !isProvider && !isFarmer) throw new ApiError(404, "Order not found");
  if (order.status === next) throw new ApiError(400, `Order is already ${next}`);

  if (!isAdmin) {
    if (isProvider) {
      if (!(providerTransitions[order.status] || []).includes(next)) throw new ApiError(400, `You cannot change status from ${order.status} to ${next}`);
      if (next === "completed" && svc.PRODUCT_TYPES.includes(order.type) && order.paymentStatus !== "paid") {
        throw new ApiError(400, "Product orders can be completed after payment");
      }
    } else if (isFarmer) {
      const allowed = next === "cancelled" && (order.status === "pending" || (order.status === "approved" && order.paymentStatus === "unpaid"));
      if (!allowed) throw new ApiError(400, order.paymentStatus === "paid" ? "Paid orders cannot be cancelled here. Contact support for a refund." : "You can only cancel orders that are pending or unpaid");
    }
  } else if (["completed", "rejected", "cancelled"].includes(order.status)) {
    throw new ApiError(400, `Order is already ${order.status}`);
  }

  if (next === "approved" && (order.type === "equipment" || order.type === "worker")) {
    const conflict = await svc.findConflict(order.itemId, order.startDate, order.endDate || order.startDate, order._id);
    if (conflict) throw new ApiError(409, "Cannot approve: these dates overlap another approved booking");
  }

  const wasLive = ["pending", "approved"].includes(order.status);
  order.status = next;
  if ((next === "cancelled" || next === "rejected") && req.body.reason) order.cancelReason = String(req.body.reason).slice(0, 300);
  if (next === "cancelled" && order.paymentStatus === "paid" && isAdmin) {
    order.paymentStatus = "refunded";
    if (order.paymentId) await Transaction.updateOne({ _id: order.paymentId }, { $set: { status: "refunded" } });
  }
  await order.save();
  if ((next === "cancelled" || next === "rejected") && wasLive) await svc.releaseStock(order);

  const verbs = { approved: "approved", rejected: "rejected", completed: "marked as completed", cancelled: "cancelled" };
  const actor = isFarmer ? order.providerId : order.farmerId;
  const actorUser = await User.findById(actor).select("role");
  const summary = `${order.itemName || "Your request"} was ${verbs[next] || next}${order.cancelReason ? ` (${order.cancelReason})` : ""}.`;
  await notify(actor, {
    type: "booking",
    title: `Booking ${next}`,
    message: summary,
    severity: next === "rejected" || next === "cancelled" ? "warning" : "success",
    link: roleLink(actorUser?.role, isFarmer ? (order.type === "worker" ? "jobs" : "rentals") : "rentals"),
    metadata: { orderId: order._id },
  });
  if (isAdmin) {
    const other = isFarmer ? order.farmerId : order.providerId;
    const otherUser = await User.findById(other).select("role");
    await notify(other, { type: "booking", title: `Booking ${next}`, message: `An administrator updated: ${summary}`, link: roleLink(otherUser?.role, "rentals"), metadata: { orderId: order._id } });
  }

  const populated = await Order.findById(order._id).populate(POPULATE);
  res.status(200).json({ success: true, message: `Order ${next}`, data: formatOrder(populated, req.user) });
});

const earnings = asyncHandler(async (req, res) => {
  const fee = await settings.get("payments.platformFeePercent");
  const base = { providerId: req.user._id };
  const paid = await Order.find({ ...base, paymentStatus: "paid" }).select("totalPrice paymentMode paidAt itemName type farmerId").populate("farmerId", "name").sort({ paidAt: -1 }).lean();
  const real = paid.filter((o) => o.paymentMode !== "test");
  const test = paid.filter((o) => o.paymentMode === "test");
  const sum = (arr) => svc.round2(arr.reduce((s, o) => s + o.totalPrice, 0));
  const gross = sum(real);
  const platformFee = svc.round2((gross * fee) / 100);

  const [pendingAgg, completedJobs, activeJobs] = await Promise.all([
    Order.aggregate([{ $match: { ...base, status: { $in: ["approved", "completed"] }, paymentStatus: "unpaid" } }, { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } }]),
    Order.countDocuments({ ...base, status: "completed" }),
    Order.countDocuments({ ...base, status: "approved" }),
  ]);

  const months = {};
  for (const o of real) {
    const d = new Date(o.paidAt || Date.now());
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    months[key] = svc.round2((months[key] || 0) + o.totalPrice);
  }
  const monthly = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, amount]) => ({ month, amount }));

  res.status(200).json({
    success: true,
    data: {
      gross,
      platformFeePercent: fee,
      platformFee,
      net: svc.round2(gross - platformFee),
      testModeAmount: sum(test),
      pendingAmount: pendingAgg[0]?.total || 0,
      pendingCount: pendingAgg[0]?.count || 0,
      paidCount: real.length,
      completedJobs,
      activeJobs,
      monthly,
      recent: real.slice(0, 10).map((o) => ({ id: String(o._id), itemName: o.itemName, type: o.type, amount: o.totalPrice, paidAt: o.paidAt, farmer: o.farmerId?.name || "" })),
    },
  });
});

const exportOrdersCsv = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { farmerId: req.user._id };
  const orders = await Order.find(filter).populate("farmerId", "name").populate("providerId", "name").sort({ createdAt: -1 });
  const rows = orders.map((o) => ({
    orderId: o._id,
    type: o.type,
    item: o.itemName,
    status: o.status,
    paymentStatus: o.paymentStatus,
    farmer: o.farmerId?.name || "",
    provider: o.providerId?.name || "",
    quantity: o.quantity,
    duration: o.duration,
    totalPrice: o.totalPrice,
    startDate: o.startDate?.toISOString(),
    endDate: o.endDate?.toISOString() || "",
    createdAt: o.createdAt?.toISOString(),
  }));
  return sendCsv(res, "orders-report.csv", rows.length ? rows : [{ orderId: "", type: "", item: "", status: "", paymentStatus: "", farmer: "", provider: "", quantity: "", duration: "", totalPrice: "", startDate: "", endDate: "", createdAt: "" }]);
});

module.exports = { createOrder, getMyOrders, getProviderOrders, getAllOrders, getOrder, updateOrderStatus, earnings, exportOrdersCsv, formatOrder, POPULATE };
