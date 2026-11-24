export const CITY_CENTRES: Record<string, [number, number]> = {
  pune: [18.5204, 73.8567],
  nashik: [19.9975, 73.7898],
  solapur: [17.6599, 75.9064],
  nagpur: [21.1458, 79.0882],
  aurangabad: [19.8762, 75.3433],
  kolhapur: [16.705, 74.2433],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  mysuru: [12.2958, 76.6394],
  mysore: [12.2958, 76.6394],
  hubballi: [15.3647, 75.124],
  hubli: [15.3647, 75.124],
  davanagere: [14.4644, 75.9218],
  hassan: [13.0033, 76.1004],
  mumbai: [19.076, 72.8777],
  hyderabad: [17.385, 78.4867],
  chennai: [13.0827, 80.2707],
  delhi: [28.6139, 77.209],
};

export const getCoordinatesForLocation = (location: string): [number, number] | null => {
  if (!location) return null;
  const lower = location.toLowerCase();
  for (const [city, coords] of Object.entries(CITY_CENTRES)) {
    if (lower.includes(city)) return coords;
  }
  return null;
};
