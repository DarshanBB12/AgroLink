import { canHireWorker } from "@/lib/subscription";

describe("canHireWorker", () => {
  const referenceDate = new Date("2026-04-24T10:00:00.000Z");

  it("allows farmer_free when under limit", () => {
    const result = canHireWorker(
      { id: "u1", role: "farmer", planCode: "farmer_free" },
      [
        { type: "worker", createdAt: "2026-04-01T09:00:00.000Z" },
        { type: "worker", createdAt: "2026-04-15T09:00:00.000Z" },
      ],
      referenceDate
    );

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(3);
    expect(result.used).toBe(2);
  });

  it("blocks farmer_free at limit", () => {
    const result = canHireWorker(
      { id: "u2", role: "farmer", planCode: "farmer_free" },
      [
        { type: "worker", createdAt: "2026-04-05T09:00:00.000Z" },
        { type: "worker", createdAt: "2026-04-10T09:00:00.000Z" },
        { type: "worker", createdAt: "2026-04-20T09:00:00.000Z" },
      ],
      referenceDate
    );

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(3);
    expect(result.used).toBe(3);
  });

  it("ignores previous month bookings", () => {
    const result = canHireWorker(
      { id: "u3", role: "farmer", planCode: "farmer_free" },
      [
        { type: "worker", createdAt: "2026-03-31T23:59:59.000Z" },
        { type: "worker", createdAt: "2026-04-01T00:00:00.000Z" },
      ],
      referenceDate
    );

    expect(result.allowed).toBe(true);
    expect(result.used).toBe(1);
  });

  it("treats farmer_pro as unlimited", () => {
    const result = canHireWorker(
      { id: "u4", role: "farmer", planCode: "farmer_pro" },
      [
        { type: "worker", createdAt: "2026-04-01T09:00:00.000Z" },
        { type: "worker", createdAt: "2026-04-03T09:00:00.000Z" },
        { type: "worker", createdAt: "2026-04-05T09:00:00.000Z" },
        { type: "worker", createdAt: "2026-04-07T09:00:00.000Z" },
      ],
      referenceDate
    );

    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
  });
});
