const DAY_MS = 24 * 60 * 60 * 1000;

// Accepts "YYYY-MM-DD" or ISO strings; returns a Date at UTC midnight, or null when invalid.
const parseDay = (value) => {
  if (!value) return null;
  const s = String(value);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00.000Z`) : new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const todayUTC = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};

// Inclusive number of days between two UTC-midnight dates.
const inclusiveDays = (start, end) => Math.round((end - start) / DAY_MS) + 1;

module.exports = { DAY_MS, parseDay, todayUTC, inclusiveDays };
