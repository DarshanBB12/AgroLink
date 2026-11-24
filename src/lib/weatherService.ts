// Real weather from Open-Meteo (https://open-meteo.com): free, no API key, CORS-enabled.
// Requires coordinates (the user's saved location). Nothing here is mocked.
export interface WeatherDay { date: string; max: number; min: number; rainChance: number; rainMm: number; windKmh: number; code: number }
export interface WeatherData {
  current: { temp: number; feelsLike: number; humidity: number; windKmh: number; precipitation: number; code: number; isDay: boolean };
  daily: WeatherDay[];
  fetchedAt: string;
}
export type WeatherAlert = { id: string; severity: "info" | "warning" | "critical" | "success"; key: string; value?: string };

export const describeCode = (code: number): { key: string; icon: "sun" | "cloud-sun" | "cloud" | "fog" | "rain" | "snow" | "storm" } => {
  if (code === 0) return { key: "clear", icon: "sun" };
  if (code <= 2) return { key: "partlyCloudy", icon: "cloud-sun" };
  if (code === 3) return { key: "cloudy", icon: "cloud" };
  if (code <= 48) return { key: "fog", icon: "fog" };
  if (code <= 67 || (code >= 80 && code <= 82)) return { key: "rain", icon: "rain" };
  if (code <= 77 || code === 85 || code === 86) return { key: "snow", icon: "snow" };
  return { key: "storm", icon: "storm" };
};

export const fetchWeather = async (lat: number, lng: number, signal?: AbortSignal): Promise<WeatherData> => {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max` +
    `&timezone=auto&forecast_days=7`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
  const j = await res.json();
  if (!j.current || !j.daily) throw new Error("Weather service returned an unexpected response");
  return {
    fetchedAt: new Date().toISOString(),
    current: {
      temp: Math.round(j.current.temperature_2m),
      feelsLike: Math.round(j.current.apparent_temperature),
      humidity: j.current.relative_humidity_2m,
      windKmh: Math.round(j.current.wind_speed_10m),
      precipitation: j.current.precipitation,
      code: j.current.weather_code,
      isDay: j.current.is_day === 1,
    },
    daily: j.daily.time.map((date: string, i: number) => ({
      date,
      max: Math.round(j.daily.temperature_2m_max[i]),
      min: Math.round(j.daily.temperature_2m_min[i]),
      rainChance: j.daily.precipitation_probability_max[i] ?? 0,
      rainMm: j.daily.precipitation_sum[i] ?? 0,
      windKmh: Math.round(j.daily.wind_speed_10m_max[i]),
      code: j.daily.weather_code[i],
    })),
  };
};

// Advisory rules derived from the REAL forecast.
export const buildAlerts = (w: WeatherData): WeatherAlert[] => {
  const alerts: WeatherAlert[] = [];
  const next3 = w.daily.slice(0, 3);
  if (next3.some((d) => d.code >= 95)) alerts.push({ id: "storm", severity: "critical", key: "storm" });
  const rainy = next3.find((d) => d.rainChance >= 60 || d.rainMm >= 10);
  if (rainy) alerts.push({ id: "rain", severity: "warning", key: "rain", value: rainy.date });
  if (next3.some((d) => d.max >= 38)) alerts.push({ id: "heat", severity: "warning", key: "heat" });
  if (next3.some((d) => d.windKmh >= 35)) alerts.push({ id: "wind", severity: "warning", key: "wind" });
  if (!alerts.length) alerts.push({ id: "ok", severity: "success", key: "ok" });
  return alerts;
};
