const Worker = require("../models/Worker");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { searchType, CONFIG, toListing } = require("../services/marketplace");
const { num, str } = require("../utils/listingHelpers");
const { parseCoords, fromGeoPoint } = require("../utils/geo");

const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await searchType("worker", req.query);
  res.status(200).json({ success: true, count: items.length, data: items, pagination });
});

const getOne = asyncHandler(async (req, res) => {
  const doc = await Worker.findById(req.params.id).populate(CONFIG.worker.populate);
  if (!doc) throw new ApiError(404, "Worker not found");
  res.status(200).json({ success: true, data: toListing("worker", doc, parseCoords(req.query.lat, req.query.lng)) });
});

// The worker's own profile (skills / availability / rate). Returns null data if not created yet.
const getMyProfile = asyncHandler(async (req, res) => {
  const doc = await Worker.findOne({ userId: req.user._id });
  res.status(200).json({
    success: true,
    data: doc
      ? {
          id: String(doc._id),
          skills: doc.skills,
          availability: doc.availability !== false,
          location: doc.location || req.user.location || "",
          pricing: doc.pricing,
          notes: doc.notes,
          rating: doc.rating,
          coordinates: fromGeoPoint(doc.geo),
        }
      : null,
  });
});

const upsertMyWorkerProfile = asyncHandler(async (req, res) => {
  const b = req.body;
  const set = {};
  if (b.skills !== undefined) {
    if (!Array.isArray(b.skills)) throw new ApiError(400, "skills must be an array");
    // de-duplicate case-insensitively, keeping the first spelling
    const seen = new Set();
    set.skills = b.skills
      .map((s) => String(s).trim())
      .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
      .slice(0, 15);
  }
  const availability = b.availability !== undefined ? b.availability : b.available;
  if (availability !== undefined) {
    if (typeof availability !== "boolean") throw new ApiError(400, "availability must be true or false");
    set.availability = availability;
    set.available = availability;
  }
  const amount = num(b.pricing?.amount, "Rate", { min: 1, max: 1000000 });
  if (amount !== undefined) set["pricing.amount"] = amount;
  if (b.pricing?.unit !== undefined) {
    if (!["hour", "day"].includes(b.pricing.unit)) throw new ApiError(400, "pricing.unit must be hour or day");
    set["pricing.unit"] = b.pricing.unit;
  }
  if (b.notes !== undefined) set.notes = str(b.notes, 500);
  if (b.location !== undefined) set.location = str(b.location, 150);
  if (!Object.keys(set).length) throw new ApiError(400, "Nothing to update");

  let doc = await Worker.findOne({ userId: req.user._id });
  if (!doc) {
    // Creating a listing requires a rate so the worker can actually be hired.
    if (amount === undefined) throw new ApiError(400, "Rate is required to create your worker profile");
    doc = new Worker({ userId: req.user._id, user: req.user._id, location: req.user.location || "", ...(req.user.geo?.coordinates ? { geo: req.user.geo } : {}) });
  }
  for (const [k, v] of Object.entries(set)) doc.set(k, v);
  await doc.save();
  const populated = await doc.populate(CONFIG.worker.populate);
  res.status(200).json({ success: true, message: "Worker profile saved", data: toListing("worker", populated) });
});

module.exports = { list, getOne, getMyProfile, upsertMyWorkerProfile };
