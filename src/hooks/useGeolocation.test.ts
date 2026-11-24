import { describe, expect, it, vi } from "vitest";
import { GeoError, requestPosition } from "./useGeolocation";

const fakeGeo = (impl: (ok: PositionCallback, err: PositionErrorCallback) => void) =>
  ({ getCurrentPosition: vi.fn(impl), watchPosition: vi.fn(), clearWatch: vi.fn() }) as unknown as Geolocation;
const err = (code: number) => ({ code, message: "x", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }) as GeolocationPositionError;

describe("GPS permission handling", () => {
  it("returns real coordinates and accuracy on success", async () => {
    const geo = fakeGeo((ok) => ok({ coords: { latitude: 12.97, longitude: 77.59, accuracy: 30 } } as GeolocationPosition));
    expect(await requestPosition(geo)).toMatchObject({ lat: 12.97, lng: 77.59 });
  });
  it.each([
    [1, "denied"],
    [2, "unavailable"],
    [3, "timeout"],
  ])("maps browser error code %i to '%s'", async (code, status) => {
    const geo = fakeGeo((_ok, bad) => bad(err(code)));
    await expect(requestPosition(geo)).rejects.toMatchObject({ status });
  });
  it("reports unsupported browsers instead of throwing a TypeError", async () => {
    await expect(requestPosition(undefined)).rejects.toBeInstanceOf(GeoError);
    await expect(requestPosition(undefined)).rejects.toMatchObject({ status: "unsupported" });
  });
  it("is a one-shot read: never continuous tracking", async () => {
    const geo = fakeGeo((ok) => ok({ coords: { latitude: 1, longitude: 2, accuracy: 5 } } as GeolocationPosition));
    await requestPosition(geo);
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(geo.watchPosition).not.toHaveBeenCalled();
  });
  it("does not request location just by being imported or constructed", () => {
    const geo = fakeGeo(() => undefined);
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
  });
});
