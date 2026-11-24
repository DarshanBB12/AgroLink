const SystemSetting = require("../models/SystemSetting");

// Defaults double as the schema of what admins may configure. Anything not listed here is rejected.
const DEFAULTS = {
  "system.maintenanceMode": { group: "system", type: "boolean", value: false },
  "system.allowRegistrations": { group: "system", type: "boolean", value: true },
  "marketplace.maxListingsPerOwner": { group: "marketplace", type: "number", value: 10, min: 1, max: 500 },
  "marketplace.maxRentalDays": { group: "marketplace", type: "number", value: 90, min: 1, max: 365 },
  "payments.platformFeePercent": { group: "payments", type: "number", value: 0, min: 0, max: 50 },
  "payments.emiMinAmount": { group: "payments", type: "number", value: 5000, min: 0, max: 10000000 },
  "payments.emiInterestRate": { group: "payments", type: "number", value: 8.5, min: 0, max: 40 },
  "notifications.announcementsEnabled": { group: "notifications", type: "boolean", value: true },
};

const getAll = async () => {
  const stored = await SystemSetting.find().lean();
  const map = Object.fromEntries(stored.map((s) => [s.key, s.value]));
  return Object.fromEntries(Object.entries(DEFAULTS).map(([key, def]) => [key, map[key] !== undefined ? map[key] : def.value]));
};

// Tiny in-memory cache so hot paths (maintenance check on every request) do not hit MongoDB each time.
const cache = new Map();
const TTL_MS = process.env.NODE_ENV === "test" ? 0 : 5000;

const get = async (key) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const stored = await SystemSetting.findOne({ key }).lean();
  const value = stored ? stored.value : DEFAULTS[key]?.value;
  cache.set(key, { value, at: Date.now() });
  return value;
};

// Validate and coerce a value against the setting definition. Throws a plain Error with a user-safe message.
const coerce = (key, value) => {
  const def = DEFAULTS[key];
  if (!def) throw new Error(`Unknown setting "${key}"`);
  if (def.type === "boolean") {
    if (typeof value !== "boolean") throw new Error(`${key} must be true or false`);
    return value;
  }
  if (def.type === "number") {
    const n = Number(value);
    if (!Number.isFinite(n) || n < def.min || n > def.max) throw new Error(`${key} must be a number between ${def.min} and ${def.max}`);
    return n;
  }
  const str = String(value).trim();
  if (!str || str.length > 200) throw new Error(`${key} must be 1-200 characters`);
  return str;
};

const set = async (key, value, userId) => {
  const coerced = coerce(key, value);
  await SystemSetting.findOneAndUpdate(
    { key },
    { key, value: coerced, group: DEFAULTS[key].group, updatedBy: userId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  cache.delete(key);
  return coerced;
};

module.exports = { DEFAULTS, getAll, get, set };
