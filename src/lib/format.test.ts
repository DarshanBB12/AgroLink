import { describe, expect, it } from "vitest";
import { estimatePrice, formatDistance, formatINR } from "./format";

describe("format", () => {
  it("formats rupees with Indian grouping", () => {
    expect(formatINR(1234567)).toBe("₹12,34,567");
    expect(formatINR(null)).toBe("₹0");
    expect(formatINR(99.5, { decimals: true })).toBe("₹99.50");
  });
  it("formats distances", () => {
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(0.4)).toBe("< 1 km");
    expect(formatDistance(12.5)).toBe("12.5 km");
  });
});

// These mirror the server's pricing tests (booking.test.js) so on-screen estimates match the final charge.
describe("estimatePrice", () => {
  it("multi-day rental with discount: 1500 x 3 days - 10%", () => {
    expect(estimatePrice({ unitPrice: 1500, unit: "day", type: "equipment", start: "2026-12-01", end: "2026-12-03", discount: 10 }).total).toBe(4050);
  });
  it("single day when no end date", () => {
    expect(estimatePrice({ unitPrice: 800, unit: "day", type: "worker", start: "2026-12-01" })).toEqual({ multiplier: 1, total: 800 });
  });
  it("hourly items use the hours", () => {
    expect(estimatePrice({ unitPrice: 800, unit: "hour", type: "equipment", hours: 3, start: "2026-12-01" }).total).toBe(2400);
  });
  it("products use quantity", () => {
    expect(estimatePrice({ unitPrice: 50, unit: "kg", type: "fertilizer", quantity: 3 }).total).toBe(150);
  });
});
