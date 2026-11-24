const Order = require("../models/Order");
const Equipment = require("../models/Equipment");
const Fertilizer = require("../models/Fertilizer");
const Seed = require("../models/Seed");
const Worker = require("../models/Worker");
const User = require("../models/User");
const ApiError = require("../utils/apiError");

const MODEL_BY_TYPE = { worker: Worker, equipment: Equipment, fertilizer: Fertilizer, seed: Seed };
const ITEM_MODEL_NAME = { worker: "Worker", equipment: "Equipment", fertilizer: "Fertilizer", seed: "Seed" };
const PRODUCT_TYPES = ["fertilizer", "seed"];

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Load the item being ordered and derive provider, unit price and availability FROM THE DATABASE.
// Nothing about price or provider is ever trusted from the client.
const resolveTarget = async (type, itemId) => {
  const Model = MODEL_BY_TYPE[type];
  if (!Model) throw new ApiError(400, "Invalid order type");
  let doc;
  try {
    doc = await Model.findById(itemId);
  } catch {
    throw new ApiError(400, "Invalid item id");
  }
  if (!doc) throw new ApiError(404, "Item not found");

  if (type === "worker") {
    const user = await User.findById(doc.userId).select("name isActive location");
    if (!user || !user.isActive) throw new ApiError(404, "Worker not found or unavailable");
    if (doc.availability === false) throw new ApiError(409, "This worker is currently unavailable");
    return { doc, providerId: doc.userId, itemName: user.name, unitPrice: doc.pricing.amount, unit: doc.pricing.unit, discount: 0, location: doc.location || user.location || "" };
  }
  if (type === "equipment") {
    const ownerId = doc.ownerId || doc.owner;
    if (!ownerId) throw new ApiError(409, "This equipment has no owner and cannot be booked");
    if (doc.availability === false) throw new ApiError(409, "This equipment is not available for rent");
    return { doc, providerId: ownerId, itemName: doc.name, unitPrice: doc.pricing?.amount ?? doc.price, unit: doc.pricing?.unit || "day", discount: doc.discount || 0, location: doc.location };
  }
  // seed / fertilizer
  if (!doc.seller) throw new ApiError(409, "This product has no seller");
  if (doc.available === false) throw new ApiError(409, "This product is not available");
  return { doc, providerId: doc.seller, itemName: doc.name, unitPrice: doc.pricing?.amount ?? doc.price, unit: doc.pricing?.unit || doc.unit || "kg", discount: doc.discount || 0, location: doc.location };
};

// Approved rentals overlapping [start, end] for the same item (day granularity, inclusive).
const findConflict = (itemId, start, end, excludeOrderId) =>
  Order.findOne({
    itemId,
    status: "approved",
    ...(excludeOrderId ? { _id: { $ne: excludeOrderId } } : {}),
    startDate: { $lte: end },
    $or: [{ endDate: { $gte: start } }, { endDate: null, startDate: { $gte: start } }],
  });

// Atomically reserve stock for product orders. Returns false when there is not enough stock.
const reserveStock = async (type, itemId, qty) => {
  const Model = MODEL_BY_TYPE[type];
  const res = await Model.findOneAndUpdate({ _id: itemId, stock: { $gte: qty }, available: { $ne: false } }, { $inc: { stock: -qty } }, { new: true });
  return Boolean(res);
};

const releaseStock = async (order) => {
  if (!PRODUCT_TYPES.includes(order.type)) return;
  await MODEL_BY_TYPE[order.type].updateOne({ _id: order.itemId }, { $inc: { stock: order.quantity } });
};

module.exports = { MODEL_BY_TYPE, ITEM_MODEL_NAME, PRODUCT_TYPES, round2, resolveTarget, findConflict, reserveStock, releaseStock };
