const Equipment = require("../models/Equipment");
const Order = require("../models/Order");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const settings = require("../services/settingsService");
const { searchType, CONFIG, toListing } = require("../services/marketplace");
const { str, num, resolveListingGeo, assertOwner } = require("../utils/listingHelpers");
const { parseCoords } = require("../utils/geo");
const { toGeoPoint } = require("../utils/geo");

const buildPayload = (b, user, { partial = false } = {}) => {
  const p = {};
  const name = str(b.name, 120);
  if (name !== undefined) p.name = name;
  else if (!partial) throw new ApiError(400, "Name is required");
  if (p.name !== undefined && p.name.length < 2) throw new ApiError(400, "Name must be at least 2 characters");

  const category = str(b.category ?? b.type, 60);
  if (category !== undefined) {
    p.category = category;
    p.type = category;
  } else if (!partial) throw new ApiError(400, "Category is required");

  const amount = num(b.pricing?.amount ?? b.price, "Price", { min: 1, max: 10000000, required: !partial });
  if (amount !== undefined) {
    const unit = b.pricing?.unit || b.unit || user.settings?.listingPreferences?.defaultPricingUnit || "day";
    if (!["hour", "day"].includes(unit)) throw new ApiError(400, "Pricing unit must be hour or day");
    p.price = amount;
    p.pricing = { amount, unit };
  } else if (b.pricing?.unit || b.unit) {
    const unit = b.pricing?.unit || b.unit;
    if (!["hour", "day"].includes(unit)) throw new ApiError(400, "Pricing unit must be hour or day");
    p["pricing.unit"] = unit;
  }
  if (b.location !== undefined) p.location = str(b.location, 150);
  if (b.description !== undefined) p.description = str(b.description, 1000);
  if (b.imageUrl !== undefined) p.imageUrl = str(b.imageUrl, 500);
  const discount = num(b.discount, "Discount", { min: 0, max: 100 });
  if (discount !== undefined) p.discount = discount;
  const fine = num(b.fine, "Fine", { min: 0, max: 10000000 });
  if (fine !== undefined) p.fine = fine;
  if (b.available !== undefined || b.availability !== undefined) {
    const v = b.available ?? b.availability;
    if (typeof v !== "boolean") throw new ApiError(400, "available must be true or false");
    p.available = v;
    p.availability = v;
  }
  if (b.specs && typeof b.specs === "object") {
    for (const key of ["power", "fuel", "capacity"]) if (b.specs[key] !== undefined) p[`specs.${key}`] = str(b.specs[key], 60);
    const year = num(b.specs.year, "Year", { min: 1950, max: new Date().getFullYear() + 1 });
    if (year !== undefined) p["specs.year"] = year;
  }
  return p;
};

const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await searchType("equipment", req.query);
  res.status(200).json({ success: true, count: items.length, data: items, pagination });
});

const mine = asyncHandler(async (req, res) => {
  const { items, pagination } = await searchType("equipment", { ...req.query, limit: req.query.limit || 50 }, { mineUserId: req.user._id });
  res.status(200).json({ success: true, count: items.length, data: items, pagination });
});

const getOne = asyncHandler(async (req, res) => {
  const doc = await Equipment.findById(req.params.id).populate(CONFIG.equipment.populate);
  if (!doc) throw new ApiError(404, "Equipment not found");
  const origin = parseCoords(req.query.lat, req.query.lng);
  res.status(200).json({ success: true, data: toListing("equipment", doc, origin) });
});

const create = asyncHandler(async (req, res) => {
  const [limit, count] = await Promise.all([settings.get("marketplace.maxListingsPerOwner"), Equipment.countDocuments({ ownerId: req.user._id })]);
  if (req.user.role !== "admin" && count >= limit) {
    throw new ApiError(403, `Listing limit reached (${limit}). Remove a listing before adding a new one.`);
  }
  const payload = buildPayload(req.body, req.user);
  const geo = resolveListingGeo(req.body, req.user);
  if (!payload.location && req.user.location) payload.location = req.user.location;

  const doc = await Equipment.create({ ...flat(payload), ownerId: req.user._id, owner: req.user._id, ...(geo ? { geo } : {}) });
  const populated = await doc.populate(CONFIG.equipment.populate);
  res.status(201).json({ success: true, message: "Equipment listed", data: toListing("equipment", populated) });
});

// "specs.power" style keys are produced for partial updates; for create we need nested objects.
const flat = (p) => {
  const out = {};
  for (const [k, v] of Object.entries(p)) {
    const parts = k.split(".");
    let cur = out;
    parts.slice(0, -1).forEach((part) => (cur = cur[part] = cur[part] || {}));
    cur[parts[parts.length - 1]] = v;
  }
  return out;
};

const update = asyncHandler(async (req, res) => {
  const doc = await Equipment.findById(req.params.id);
  assertOwner(doc, req.user, "ownerId");
  const payload = buildPayload(req.body, req.user, { partial: true });
  const geo = resolveListingGeo(req.body, { geo: undefined });
  if (geo) payload.geo = geo;
  if (!Object.keys(payload).length) throw new ApiError(400, "Nothing to update");
  const updated = await Equipment.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true, runValidators: true }).populate(CONFIG.equipment.populate);
  res.status(200).json({ success: true, message: "Listing updated", data: toListing("equipment", updated) });
});

const remove = asyncHandler(async (req, res) => {
  const doc = await Equipment.findById(req.params.id);
  assertOwner(doc, req.user, "ownerId");
  const open = await Order.countDocuments({ itemId: doc._id, status: { $in: ["pending", "approved"] } });
  if (open > 0) throw new ApiError(409, "This equipment has pending or approved rental requests. Resolve them before deleting.");
  await doc.deleteOne();
  res.status(200).json({ success: true, message: "Listing deleted", data: { id: String(doc._id) } });
});

// Dates (YYYY-MM-DD) that are already taken by approved rentals, plus an overlap check for a requested range.
const availability = asyncHandler(async (req, res) => {
  const doc = await Equipment.findById(req.params.id).select("availability available");
  if (!doc) throw new ApiError(404, "Equipment not found");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const booked = await Order.find({ itemId: doc._id, status: "approved", endDate: { $gte: now } }).select("startDate endDate").sort({ startDate: 1 }).lean();
  const ranges = booked.map((o) => ({ start: o.startDate, end: o.endDate || o.startDate }));

  let requested = null;
  if (req.query.start && req.query.end) {
    const s = new Date(req.query.start);
    const e = new Date(req.query.end);
    if (Number.isNaN(s) || Number.isNaN(e) || e < s) throw new ApiError(400, "Invalid date range");
    const conflict = ranges.some((r) => new Date(r.start) <= e && new Date(r.end) >= s);
    requested = { start: s, end: e, available: doc.availability !== false && !conflict };
  }
  res.status(200).json({ success: true, data: { listed: doc.availability !== false, bookedRanges: ranges, requested } });
});

// Idempotent demo data loader: inserts only listings that do not exist yet. It NEVER deletes anything.
const seed = asyncHandler(async (req, res) => {
  const { seedMarketplace } = require("../seed/marketplaceData");
  const result = await seedMarketplace();
  res.status(200).json({ success: true, message: "Marketplace seed completed (existing data untouched)", data: result });
});

module.exports = { list, mine, getOne, create, update, remove, availability, seed, toGeoPoint };
