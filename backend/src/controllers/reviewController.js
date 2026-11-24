const mongoose = require("mongoose");
const Review = require("../models/Review");
const Order = require("../models/Order");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { MODEL_BY_TYPE } = require("../services/orderService");
const { notify } = require("../utils/notify");

const create = asyncHandler(async (req, res) => {
  const { orderId, rating, comment } = req.body;
  if (!mongoose.isValidObjectId(orderId)) throw new ApiError(400, "A valid orderId is required");
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) throw new ApiError(400, "Rating must be a whole number from 1 to 5");

  const order = await Order.findById(orderId);
  if (!order || String(order.farmerId) !== String(req.user._id)) throw new ApiError(404, "Order not found");
  if (order.status !== "completed") throw new ApiError(409, "You can review an order once it is completed");
  if (await Review.findOne({ orderId })) throw new ApiError(409, "You already reviewed this order");

  const review = await Review.create({ orderId, reviewerId: req.user._id, revieweeId: order.providerId, itemModel: order.itemModel, itemId: order.itemId, rating: r, comment: String(comment || "").slice(0, 1000) });

  // Recompute the item's average rating from all reviews.
  const agg = await Review.aggregate([{ $match: { itemId: order.itemId } }, { $group: { _id: null, avg: { $avg: "$rating" } } }]);
  const avg = Math.round((agg[0]?.avg || r) * 10) / 10;
  await MODEL_BY_TYPE[order.type].updateOne({ _id: order.itemId }, { $set: { rating: avg } });

  await notify(order.providerId, { type: "booking", title: "New review", message: `${req.user.name} rated ${order.itemName} ${r}/5.`, link: "/dashboard/worker/reviews" });
  res.status(201).json({ success: true, message: "Thanks for your review", data: review });
});

// Reviews received by the signed-in provider.
const received = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ revieweeId: req.user._id }).populate("reviewerId", "name").sort({ createdAt: -1 }).limit(100).lean();
  const avg = reviews.length ? Math.round((reviews.reduce((s, x) => s + x.rating, 0) / reviews.length) * 10) / 10 : 0;
  res.status(200).json({ success: true, data: reviews.map((x) => ({ id: x._id, rating: x.rating, comment: x.comment, reviewer: x.reviewerId?.name || "Farmer", createdAt: x.createdAt })), summary: { average: avg, count: reviews.length } });
});

module.exports = { create, received };
