import { useCallback, useState } from "react";

export type GeoStatus = "idle" | "locating" | "success" | "denied" | "unavailable" | "timeout" | "unsupported" | "error";
export interface GeoResult {
  lat: number;
  lng: number;
  accuracy: number;
}
export class GeoError extends Error {
  status: Exclude<GeoStatus, "idle" | "locating" | "success">;
  constructor(status: GeoError["status"], message: string) {
    super(message);
    this.status = status;
  }
}

// One-shot position request. The browser shows its own permission prompt; we never call this without a user
// action and never use watchPosition (no continuous tracking).
export const requestPosition = (geo: Geolocation | undefined = typeof navigator !== "undefined" ? navigator.geolocation : undefined, timeoutMs = 12000): Promise<GeoResult> =>
  new Promise((resolve, reject) => {
    if (!geo) {
      reject(new GeoError("unsupported", "Geolocation is not supported by this browser"));
      return;
    }
    geo.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        if (err.code === 1) reject(new GeoError("denied", "Location permission was denied"));
        else if (err.code === 2) reject(new GeoError("unavailable", "Your position is unavailable"));
        else if (err.code === 3) reject(new GeoError("timeout", "Getting your location timed out"));
        else reject(new GeoError("error", err.message || "Could not get your location"));
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 }
    );
  });

export const useGeolocation = () => {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [position, setPosition] = useState<GeoResult | null>(null);

  const locate = useCallback(async () => {
    setStatus("locating");
    try {
      const result = await requestPosition();
      setPosition(result);
      setStatus("success");
      return result;
    } catch (error) {
      setStatus(error instanceof GeoError ? error.status : "error");
      return null;
    }
  }, []);

  return { status, position, locate, reset: () => setStatus("idle") };
};
