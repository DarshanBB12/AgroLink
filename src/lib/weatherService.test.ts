import { describe, expect, it } from "vitest";
import { buildAlerts, describeCode, type WeatherData } from "./weatherService";

const day = (over: Partial<WeatherData["daily"][number]> = {}) => ({ date: "2026-12-01", max: 30, min: 20, rainChance: 0, rainMm: 0, windKmh: 10, code: 1, ...over });
const data = (daily: ReturnType<typeof day>[]): WeatherData => ({ fetchedAt: "", current: { temp: 30, feelsLike: 31, humidity: 50, windKmh: 5, precipitation: 0, code: 1, isDay: true }, daily });

describe("weather advisories derive from the real forecast", () => {
  it("all clear", () => expect(buildAlerts(data([day(), day(), day()])).map((a) => a.id)).toEqual(["ok"]));
  it("rain, heat and wind each raise a warning", () => {
    const ids = buildAlerts(data([day({ rainChance: 80 }), day({ max: 40 }), day({ windKmh: 50 })])).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(["rain", "heat", "wind"]));
    expect(ids).not.toContain("ok");
  });
  it("thunderstorm is critical", () => expect(buildAlerts(data([day({ code: 96 })]))[0]).toMatchObject({ id: "storm", severity: "critical" }));
  it("ignores bad weather beyond the next 3 days", () => expect(buildAlerts(data([day(), day(), day(), day({ rainChance: 100 })])).map((a) => a.id)).toEqual(["ok"]));
  it("maps WMO codes to icons", () => {
    expect(describeCode(0).icon).toBe("sun");
    expect(describeCode(63).icon).toBe("rain");
    expect(describeCode(95).icon).toBe("storm");
  });
});
