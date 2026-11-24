const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

const isValidLat = (lat) => Number.isFinite(lat) && lat >= -90 && lat <= 90;
const isValidLng = (lng) => Number.isFinite(lng) && lng >= -180 && lng <= 180;

// Parse "lat"/"lng" from request input. Returns null when absent or invalid so callers
// never operate on fabricated or NaN coordinates.
const parseCoords = (lat, lng) => {
  if (lat === undefined || lat === null || lat === "" || lng === undefined || lng === null || lng === "") {
    return null;
  }
  const la = Number(lat);
  const ln = Number(lng);
  if (!isValidLat(la) || !isValidLng(ln)) return null;
  return { lat: la, lng: ln };
};

const toGeoPoint = ({ lat, lng }) => ({ type: "Point", coordinates: [lng, lat] });

const fromGeoPoint = (geo) => {
  if (!geo || !Array.isArray(geo.coordinates) || geo.coordinates.length !== 2) return null;
  const [lng, lat] = geo.coordinates;
  return isValidLat(lat) && isValidLng(lng) ? { lat, lng } : null;
};

const haversineKm = (a, b) => {
  if (!a || !b) return null;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h)) * 10) / 10;
};

// Mongoose sub-schema fragment for a GeoJSON point. Left undefined when no coordinates are known
// so the 2dsphere index simply skips the document.
const geoField = {
  type: { type: String, enum: ["Point"] },
  coordinates: {
    type: [Number],
    default: undefined,
    validate: {
      validator: (v) => v === undefined || (Array.isArray(v) && v.length === 2 && isValidLng(v[0]) && isValidLat(v[1])),
      message: "Coordinates must be [longitude, latitude] within valid ranges",
    },
  },
};

module.exports = { parseCoords, toGeoPoint, fromGeoPoint, haversineKm, geoField, isValidLat, isValidLng };
