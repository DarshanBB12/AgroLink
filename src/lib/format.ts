export const formatINR = (value: number | undefined | null, opts: { decimals?: boolean } = {}) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  })}`;

export const formatDate = (value?: string | Date | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

export const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export const formatDistance = (km?: number | null) => (km === null || km === undefined ? null : km < 1 ? "< 1 km" : `${km} km`);

export const todayISO = () => new Date().toISOString().slice(0, 10);

// Same arithmetic as the server so the on-screen estimate matches the final price.
export const estimatePrice = (args: { unitPrice: number; unit: string; type: string; quantity?: number; hours?: number; start?: string; end?: string; discount?: number }) => {
  const { unitPrice, unit, type, quantity = 1, hours = 1, start, end, discount = 0 } = args;
  let multiplier = 1;
  if (type === "fertilizer" || type === "seed") multiplier = quantity;
  else if (unit === "hour") multiplier = hours;
  else if (start) {
    const s = new Date(`${start}T00:00:00Z`).getTime();
    const e = new Date(`${end || start}T00:00:00Z`).getTime();
    multiplier = Math.max(Math.round((e - s) / 86400000) + 1, 1);
  }
  const total = Math.round(unitPrice * multiplier * (1 - discount / 100) * 100) / 100;
  return { multiplier, total };
};
