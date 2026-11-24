// Shared CRUD factory for seller-owned products (seeds and fertilizers). Both follow the same rules:
// anyone signed in can browse, equipment owners (and admins) can create, and only the seller (or an admin)
// can edit or delete a product.
const Order = require("../models/Order");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { searchType, CONFIG, toListing } = require("../services/marketplace");
const { str, num, resolveListingGeo, assertOwner } = require("../utils/listingHelpers");
const { parseCoords } = require("../utils/geo");

const FERT_TYPES = ["organic", "chemical", "bio", "compost"];

const build = (kind, b, { partial }) => {
  const p = {};
  const name = str(b.name, 120);
  if (name !== undefined) p.name = name;
  else if (!partial) throw new ApiError(400, "Name is required");
  const category = str(b.category, 60);
  if (category !== undefined) p.category = category;
  else if (!partial) throw new ApiError(400, "Category is required");

  const amount = num(b.pricing?.amount ?? b.price, "Price", { min: 1, max: 10000000, required: !partial });
  if (amount !== undefined) {
    const defaultUnit = kind === "seed" ? "kg" : "kg";
    const unit = b.pricing?.unit || b.unit || defaultUnit;
    const allowed = kind === "seed" ? ["kg", "packet", "bag"] : ["kg", "bag"];
    if (!allowed.includes(unit)) throw new ApiError(400, `Unit must be one of: ${allowed.join(", ")}`);
    p.price = amount;
    p.pricing = { amount, unit };
    if (kind === "fertilizer") p.unit = unit;
  }
  const stock = num(b.stock, "Stock", { min: 0, max: 10000000 });
  if (stock !== undefined) p.stock = stock;
  const discount = num(b.discount, "Discount", { min: 0, max: 100 });
  if (discount !== undefined) p.discount = discount;
  if (b.description !== undefined) p.description = str(b.description, 1000);
  else if (!partial && kind === "fertilizer") throw new ApiError(400, "Description is required");
  if (b.location !== undefined) p.location = str(b.location, 150);
  if (b.available !== undefined) {
    if (typeof b.available !== "boolean") throw new ApiError(400, "available must be true or false");
    p.available = b.available;
  }
  if (b.imageEmoji !== undefined) p.imageEmoji = str(b.imageEmoji, 8);

  if (kind === "fertilizer") {
    const type = b.type !== undefined ? String(b.type).toLowerCase() : undefined;
    if (type !== undefined) {
      if (!FERT_TYPES.includes(type)) throw new ApiError(400, `Type must be one of: ${FERT_TYPES.join(", ")}`);
      p.type = type;
    } else if (!partial) throw new ApiError(400, "Type is required");
    if (b.npkRatio !== undefined) p.npkRatio = str(b.npkRatio, 40);
    if (b.applicationMethod !== undefined) p.applicationMethod = str(b.applicationMethod, 300);
    if (Array.isArray(b.benefits)) p.benefits = b.benefits.map((x) => str(x, 120)).filter(Boolean).slice(0, 10);
    if (Array.isArray(b.suitableCrops)) p.suitableCrops = b.suitableCrops.map((x) => str(x, 40)).filter(Boolean).slice(0, 20);
  } else {
    for (const f of ["crop", "variety", "season", "germinationRate"]) if (b[f] !== undefined) p[f] = str(b[f], 60);
    const md = num(b.maturityDays, "Maturity days", { min: 1, max: 600 });
    if (md !== undefined) p.maturityDays = md;
  }
  return p;
};

const makeController = (kind, Model) => {
  const type = kind;
  const populate = CONFIG[type].populate;

  return {
    list: asyncHandler(async (req, res) => {
      const { items, pagination } = await searchType(type, req.query);
      res.status(200).json({ success: true, count: items.length, data: items, pagination });
    }),
    mine: asyncHandler(async (req, res) => {
      const { items, pagination } = await searchType(type, { ...req.query, limit: req.query.limit || 50 }, { mineUserId: req.user._id });
      res.status(200).json({ success: true, count: items.length, data: items, pagination });
    }),
    getOne: asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id).populate(populate);
      if (!doc) throw new ApiError(404, `${kind === "seed" ? "Seed" : "Fertilizer"} not found`);
      res.status(200).json({ success: true, data: toListing(type, doc, parseCoords(req.query.lat, req.query.lng)) });
    }),
    create: asyncHandler(async (req, res) => {
      const payload = build(kind, req.body, { partial: false });
      const geo = resolveListingGeo(req.body, req.user);
      if (!payload.location && req.user.location) payload.location = req.user.location;
      const doc = await Model.create({ ...payload, seller: req.user._id, ...(geo ? { geo } : {}) });
      const populated = await doc.populate(populate);
      res.status(201).json({ success: true, message: "Product listed", data: toListing(type, populated) });
    }),
    update: asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id);
      assertOwner(doc, req.user, "seller");
      const payload = build(kind, req.body, { partial: true });
      const geo = resolveListingGeo(req.body, { geo: undefined });
      if (geo) payload.geo = geo;
      if (!Object.keys(payload).length) throw new ApiError(400, "Nothing to update");
      const updated = await Model.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true, runValidators: true }).populate(populate);
      res.status(200).json({ success: true, message: "Product updated", data: toListing(type, updated) });
    }),
    remove: asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id);
      assertOwner(doc, req.user, "seller");
      const open = await Order.countDocuments({ itemId: doc._id, status: { $in: ["pending", "approved"] }, paymentStatus: { $ne: "refunded" } });
      if (open > 0) throw new ApiError(409, "This product has open orders. Complete or cancel them first.");
      await doc.deleteOne();
      res.status(200).json({ success: true, message: "Product deleted", data: { id: String(doc._id) } });
    }),
  };
};

module.exports = { makeController };
