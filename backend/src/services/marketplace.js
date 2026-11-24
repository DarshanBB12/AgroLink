const Equipment = require("../models/Equipment");
const Worker = require("../models/Worker");
const Seed = require("../models/Seed");
const Fertilizer = require("../models/Fertilizer");
const User = require("../models/User");
const { escapeRegex, cleanQuery } = require("../utils/escapeRegex");
const { parseCoords, fromGeoPoint, haversineKm } = require("../utils/geo");
const { parsePagination, buildPagination } = require("../utils/pagination");

const TYPES = ["equipment", "worker", "seed", "fertilizer"];
const FETCH_CAP = 500; // upper bound of candidates pulled when sorting in-app (distance / merged results)

const asBool = (v) => (v === "true" || v === true ? true : v === "false" || v === false ? false : undefined);
const asNum = (v) => (v === undefined || v === null || v === "" ? undefined : Number.isFinite(Number(v)) ? Number(v) : NaN);
const list = (v) => (v === undefined || v === "" ? [] : String(v).split(",").map((s) => cleanQuery(s)).filter(Boolean).slice(0, 10));

// Per-resource configuration so every search/filter behaves identically across the marketplace.
const CONFIG = {
  equipment: {
    model: Equipment,
    textFields: ["name", "category", "type", "description", "location", "specs.power", "specs.fuel", "specs.capacity"],
    priceField: "price",
    availField: "availability",
    categoryField: "category",
    ownerField: "ownerId",
    populate: [{ path: "ownerId", select: "name location businessName avatar isActive" }],
    unit: (d) => d.pricing?.unit || "day",
    price: (d) => d.pricing?.amount ?? d.price,
    normalize: (d) => ({
      name: d.name,
      category: d.category,
      description: d.description,
      available: d.availability !== false && d.available !== false,
      owner: ownerOf(d.ownerId),
      details: {
        discount: d.discount || 0,
        fine: d.fine || 0,
        specs: d.specs || {},
        imageUrl: d.imageUrl || "",
      },
    }),
  },
  worker: {
    model: Worker,
    textFields: ["skills", "location", "notes"],
    priceField: "pricing.amount",
    availField: "availability",
    categoryField: "skills",
    ownerField: "userId",
    populate: [{ path: "userId", select: "name location avatar isActive" }],
    unit: (d) => d.pricing?.unit || "day",
    price: (d) => d.pricing?.amount,
    normalize: (d) => ({
      name: d.userId?.name || "Worker",
      category: (d.skills || [])[0] || "General",
      description: d.notes || "",
      available: d.availability !== false && d.available !== false,
      owner: ownerOf(d.userId),
      details: { skills: d.skills || [], notes: d.notes || "", avatar: d.userId?.avatar || "" },
    }),
  },
  seed: {
    model: Seed,
    textFields: ["name", "category", "crop", "variety", "season", "description", "location"],
    priceField: "pricing.amount",
    availField: "available",
    categoryField: "category",
    ownerField: "seller",
    populate: [{ path: "seller", select: "name location businessName isActive" }],
    unit: (d) => d.pricing?.unit || "kg",
    price: (d) => d.pricing?.amount ?? d.price,
    normalize: (d) => ({
      name: d.name,
      category: d.category,
      description: d.description,
      available: d.available !== false && d.stock > 0,
      owner: ownerOf(d.seller),
      details: {
        crop: d.crop,
        variety: d.variety,
        season: d.season,
        stock: d.stock,
        discount: d.discount || 0,
        germinationRate: d.germinationRate,
        maturityDays: d.maturityDays,
        imageEmoji: d.imageEmoji,
      },
    }),
  },
  fertilizer: {
    model: Fertilizer,
    textFields: ["name", "category", "type", "description", "location", "suitableCrops", "npkRatio"],
    priceField: "pricing.amount",
    availField: "available",
    categoryField: "category",
    ownerField: "seller",
    populate: [{ path: "seller", select: "name location businessName isActive" }],
    unit: (d) => d.pricing?.unit || d.unit || "kg",
    price: (d) => d.pricing?.amount ?? d.price,
    normalize: (d) => ({
      name: d.name,
      category: d.category,
      description: d.description,
      available: d.available !== false && d.stock > 0,
      owner: ownerOf(d.seller),
      details: {
        fertilizerType: d.type,
        npkRatio: d.npkRatio,
        stock: d.stock,
        discount: d.discount || 0,
        benefits: d.benefits || [],
        suitableCrops: d.suitableCrops || [],
        applicationMethod: d.applicationMethod,
        imageEmoji: d.imageEmoji,
        colorClass: d.colorClass,
      },
    }),
  },
};

function ownerOf(u) {
  if (!u || !u._id) return null;
  return { id: u._id, name: u.businessName || u.name, location: u.location || "" };
}

// Build the Mongo filter for a resource from query-string params. All filters are ANDed together,
// so every combination of filters works.
const buildFilter = async (type, params, { mineUserId } = {}) => {
  const cfg = CONFIG[type];
  const and = [];

  const q = cleanQuery(params.q || params.search || "");
  if (q) {
    // Every word must match at least one field (partial, case-insensitive, regex-escaped).
    const tokens = q.split(" ").filter(Boolean).slice(0, 6);
    for (const token of tokens) {
      const rx = new RegExp(escapeRegex(token), "i");
      const or = cfg.textFields.map((f) => ({ [f]: rx }));
      if (type === "worker") {
        const ids = await User.find({ role: "worker", isActive: true, name: rx }).distinct("_id");
        if (ids.length) or.push({ userId: { $in: ids } });
      }
      if (type === "equipment" || type === "seed" || type === "fertilizer") {
        const sellerIds = await User.find({ isActive: true, businessName: rx }).distinct("_id");
        if (sellerIds.length) or.push({ [cfg.ownerField]: { $in: sellerIds } });
      }
      and.push({ $or: or });
    }
  }

  const categories = list(params.category || params.equipmentType || params.type_ || "");
  if (categories.length && cfg.categoryField !== "skills") {
    and.push({ $or: categories.map((c) => ({ [cfg.categoryField]: new RegExp(`^${escapeRegex(c)}$`, "i") })) });
  }

  // Worker skills: every requested skill must be present (partial, case-insensitive).
  const skills = list(params.skills || (type === "worker" ? params.category : ""));
  if (type === "worker" && skills.length) {
    for (const skill of skills) and.push({ skills: new RegExp(escapeRegex(skill), "i") });
  }

  // fertilizer sub-type (organic/chemical/...) is a real, separate field
  if (type === "fertilizer" && params.fertilizerType) {
    and.push({ type: String(params.fertilizerType).toLowerCase() });
  }
  if (type === "seed" && params.season) and.push({ season: new RegExp(`^${escapeRegex(cleanQuery(params.season))}$`, "i") });

  const location = cleanQuery(params.location || "");
  if (location) and.push({ location: new RegExp(escapeRegex(location), "i") });

  const min = asNum(params.minPrice);
  const max = asNum(params.maxPrice);
  if (Number.isNaN(min) || Number.isNaN(max)) {
    const err = new Error("minPrice and maxPrice must be numbers");
    err.statusCode = 400;
    throw err;
  }
  if (min !== undefined && max !== undefined && min > max) {
    const err = new Error("minPrice cannot be greater than maxPrice");
    err.statusCode = 400;
    throw err;
  }
  if (min !== undefined || max !== undefined) {
    const range = {};
    if (min !== undefined) range.$gte = min;
    if (max !== undefined) range.$lte = max;
    and.push({ [cfg.priceField]: range });
  }

  const available = asBool(params.available);
  if (available === true) {
    and.push({ [cfg.availField]: { $ne: false } });
    if (type === "seed" || type === "fertilizer") and.push({ stock: { $gt: 0 } });
  } else if (available === false) {
    and.push({ $or: [{ [cfg.availField]: false }, ...(type === "seed" || type === "fertilizer" ? [{ stock: { $lte: 0 } }] : [])] });
  }

  const minRating = asNum(params.minRating);
  if (minRating !== undefined && !Number.isNaN(minRating)) and.push({ rating: { $gte: minRating } });

  // Radius filter uses the 2dsphere index.
  const origin = parseCoords(params.lat, params.lng);
  const radiusKm = asNum(params.radius);
  if (origin && radiusKm && radiusKm > 0) {
    and.push({ geo: { $geoWithin: { $centerSphere: [[origin.lng, origin.lat], Math.min(radiusKm, 2000) / 6378.1] } } });
  }

  if (mineUserId) and.push({ [cfg.ownerField]: mineUserId });

  // Public marketplace only shows listings from active accounts.
  if (type === "worker") {
    const activeIds = await User.find({ role: "worker", isActive: true }).distinct("_id");
    and.push({ userId: { $in: activeIds } });
  }

  return and.length ? { $and: and } : {};
};

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: null, // filled per resource
  price_desc: null,
  rating: { rating: -1, createdAt: -1 },
  name: { name: 1 },
};

const toListing = (type, doc, origin) => {
  const cfg = CONFIG[type];
  const d = doc.toObject ? doc.toObject() : doc;
  const base = cfg.normalize(d);
  const coords = fromGeoPoint(d.geo);
  let distanceKm = null;
  if (origin && coords) {
    const km = haversineKm(origin, coords);
    // A worker's coordinates are a person's private location: round to whole km so the origin cannot be triangulated.
    distanceKm = type === "worker" ? Math.max(Math.round(km), 1) : km;
  }
  return {
    id: String(d._id),
    type,
    ...base,
    price: cfg.price(d) ?? 0,
    priceUnit: cfg.unit(d),
    rating: d.rating || 0,
    location: d.location || base.owner?.location || "",
    distanceKm,
    hasCoordinates: Boolean(coords),
    createdAt: d.createdAt,
  };
};

const sortSpec = (type, sort) => {
  const cfg = CONFIG[type];
  if (sort === "price_asc") return { [cfg.priceField]: 1 };
  if (sort === "price_desc") return { [cfg.priceField]: -1 };
  if (type === "worker" && sort === "name") return { createdAt: -1 };
  return SORTS[sort] || SORTS.newest;
};

const searchType = async (type, params, extra = {}) => {
  const cfg = CONFIG[type];
  const filter = await buildFilter(type, params, extra);
  const origin = parseCoords(params.lat, params.lng);
  const sort = params.sort || "newest";
  const { page, limit, skip } = parsePagination(params, { defaultLimit: 12, maxLimit: 60 });

  const total = await cfg.model.countDocuments(filter);

  if (sort === "distance" && origin) {
    const docs = await cfg.model.find(filter).populate(cfg.populate).limit(FETCH_CAP);
    const items = docs.map((d) => toListing(type, d, origin));
    items.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    return { items: items.slice(skip, skip + limit), pagination: buildPagination({ page, limit }, total) };
  }

  const docs = await cfg.model.find(filter).populate(cfg.populate).sort(sortSpec(type, sort)).skip(skip).limit(limit);
  return { items: docs.map((d) => toListing(type, d, origin)), pagination: buildPagination({ page, limit }, total) };
};

// Global search across every marketplace collection.
const searchAll = async (params) => {
  const types = params.type && params.type !== "all" ? list(params.type).filter((t) => TYPES.includes(t)) : TYPES;
  const origin = parseCoords(params.lat, params.lng);
  const sort = params.sort || "newest";
  const { page, limit, skip } = parsePagination(params, { defaultLimit: 12, maxLimit: 60 });

  const perType = await Promise.all(
    types.map(async (type) => {
      const cfg = CONFIG[type];
      const filter = await buildFilter(type, params);
      const [total, docs] = await Promise.all([
        cfg.model.countDocuments(filter),
        cfg.model.find(filter).populate(cfg.populate).sort(sortSpec(type, sort)).limit(FETCH_CAP),
      ]);
      return { type, total, items: docs.map((d) => toListing(type, d, origin)) };
    })
  );

  let merged = perType.flatMap((r) => r.items);
  const cmp = {
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    name: (a, b) => a.name.localeCompare(b.name),
    distance: (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  }[sort] || ((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  merged.sort(cmp);

  const total = perType.reduce((sum, r) => sum + r.total, 0);
  return {
    items: merged.slice(skip, skip + limit),
    counts: Object.fromEntries(perType.map((r) => [r.type, r.total])),
    pagination: buildPagination({ page, limit }, total),
  };
};

// Type-ahead suggestions: distinct names / categories / skills / locations that contain the typed text.
const suggestions = async (rawQuery) => {
  const q = cleanQuery(rawQuery);
  if (q.length < 2) return [];
  const rx = new RegExp(escapeRegex(q), "i");
  const out = new Map();
  const add = (text, type, kind) => {
    if (!text) return;
    const key = `${String(text).toLowerCase()}|${kind}`;
    if (!out.has(key)) out.set(key, { text: String(text), type, kind });
  };

  const [equip, seeds, ferts, workers] = await Promise.all([
    Equipment.find({ $or: [{ name: rx }, { category: rx }, { location: rx }], availability: { $ne: false } }).select("name category location").limit(8).lean(),
    Seed.find({ $or: [{ name: rx }, { category: rx }, { crop: rx }] }).select("name category crop").limit(8).lean(),
    Fertilizer.find({ $or: [{ name: rx }, { category: rx }] }).select("name category").limit(8).lean(),
    Worker.find({ $or: [{ skills: rx }, { location: rx }] }).select("skills location").limit(8).lean(),
  ]);
  equip.forEach((e) => {
    if (rx.test(e.name)) add(e.name, "equipment", "name");
    else if (rx.test(e.category)) add(e.category, "equipment", "category");
    else add(e.location, "equipment", "location");
  });
  seeds.forEach((s) => (rx.test(s.name) ? add(s.name, "seed", "name") : rx.test(s.crop || "") ? add(s.crop, "seed", "crop") : add(s.category, "seed", "category")));
  ferts.forEach((f) => (rx.test(f.name) ? add(f.name, "fertilizer", "name") : add(f.category, "fertilizer", "category")));
  workers.forEach((w) => {
    const skill = (w.skills || []).find((s) => rx.test(s));
    if (skill) add(skill, "worker", "skill");
    else add(w.location, "worker", "location");
  });
  return Array.from(out.values()).slice(0, 8);
};

module.exports = { TYPES, CONFIG, buildFilter, searchType, searchAll, suggestions, toListing, asBool };
