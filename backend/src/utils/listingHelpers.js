const ApiError = require("./apiError");
const { parseCoords, toGeoPoint, fromGeoPoint } = require("./geo");

const str = (v, max = 200) => (v === undefined || v === null ? undefined : String(v).trim().slice(0, max));

const num = (v, field, { min = 0, max = 1e9, required = false } = {}) => {
  if (v === undefined || v === null || v === "") {
    if (required) throw new ApiError(400, `${field} is required`);
    return undefined;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new ApiError(400, `${field} must be a number between ${min} and ${max}`);
  return n;
};

// Resolve coordinates for a listing: explicit lat/lng from the owner > the owner's own saved location > none.
// Never invents coordinates.
const resolveListingGeo = (body, owner) => {
  const explicit = parseCoords(body.lat ?? body.latitude, body.lng ?? body.longitude);
  if ((body.lat !== undefined || body.lng !== undefined) && !explicit && (body.lat !== "" || body.lng !== "")) {
    throw new ApiError(400, "Latitude must be -90..90 and longitude -180..180");
  }
  if (explicit) return toGeoPoint(explicit);
  const saved = fromGeoPoint(owner?.geo);
  return saved ? toGeoPoint(saved) : undefined;
};

const assertOwner = (doc, user, field) => {
  if (!doc) throw new ApiError(404, "Listing not found");
  const ownerId = doc[field]?._id || doc[field];
  if (user.role !== "admin" && String(ownerId) !== String(user._id)) {
    throw new ApiError(403, "You can only modify your own listings");
  }
};

module.exports = { str, num, resolveListingGeo, assertOwner };
