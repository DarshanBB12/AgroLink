// City centres offered as a MANUAL location fallback when GPS is unavailable or denied. The user chooses the
// city themselves; these are approximate city-centre coordinates, not a device position, and are saved with
// source "manual".
export const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Bengaluru, KA", lat: 12.9716, lng: 77.5946 },
  { name: "Mysuru, KA", lat: 12.2958, lng: 76.6394 },
  { name: "Hubballi, KA", lat: 15.3647, lng: 75.124 },
  { name: "Davanagere, KA", lat: 14.4644, lng: 75.9218 },
  { name: "Belagavi, KA", lat: 15.8497, lng: 74.4977 },
  { name: "Mangaluru, KA", lat: 12.9141, lng: 74.856 },
  { name: "Pune, MH", lat: 18.5204, lng: 73.8567 },
  { name: "Nashik, MH", lat: 19.9975, lng: 73.7898 },
  { name: "Nagpur, MH", lat: 21.1458, lng: 79.0882 },
  { name: "Solapur, MH", lat: 17.6599, lng: 75.9064 },
  { name: "Aurangabad, MH", lat: 19.8762, lng: 75.3433 },
  { name: "Kolhapur, MH", lat: 16.705, lng: 74.2433 },
  { name: "Hyderabad, TS", lat: 17.385, lng: 78.4867 },
  { name: "Chennai, TN", lat: 13.0827, lng: 80.2707 },
  { name: "Coimbatore, TN", lat: 11.0168, lng: 76.9558 },
  { name: "Kochi, KL", lat: 9.9312, lng: 76.2673 },
  { name: "Vijayawada, AP", lat: 16.5062, lng: 80.648 },
  { name: "Ahmedabad, GJ", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur, RJ", lat: 26.9124, lng: 75.7873 },
  { name: "Lucknow, UP", lat: 26.8467, lng: 80.9462 },
  { name: "Bhopal, MP", lat: 23.2599, lng: 77.4126 },
  { name: "Ludhiana, PB", lat: 30.901, lng: 75.8573 },
];
