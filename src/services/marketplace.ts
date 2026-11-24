import api from "@/lib/api";
import type { Listing, ListingType } from "@/types/api";
import { clean, getList, unwrap } from "./http";

export interface SearchParams {
  q?: string;
  type?: ListingType | "all";
  category?: string;
  location?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  available?: "true" | "false" | "";
  skills?: string;
  season?: string;
  fertilizerType?: string;
  sort?: string;
  lat?: number;
  lng?: number;
  radius?: number | string;
  page?: number;
  limit?: number;
}

const BASE: Record<ListingType, string> = { equipment: "/equipment", worker: "/workers", seed: "/seeds", fertilizer: "/fertilizers" };

export const searchListings = (type: ListingType | "all", params: SearchParams) =>
  type === "all" ? getList<Listing>("/search", params as Record<string, unknown>) : getList<Listing>(BASE[type], params as Record<string, unknown>);

export const getListing = (type: ListingType, id: string, origin?: { lat: number; lng: number }) =>
  unwrap<Listing>(api.get(`${BASE[type]}/${id}`, { params: clean({ lat: origin?.lat, lng: origin?.lng }) }));

export const fetchSuggestions = (q: string) =>
  unwrap<{ text: string; type: ListingType; kind: string }[]>(api.get("/search/suggestions", { params: { q } }));

export const myListings = (type: "equipment" | "seed" | "fertilizer") => getList<Listing>(`${BASE[type]}/mine`, { limit: 100 });

export const saveListing = async (type: "equipment" | "seed" | "fertilizer", payload: Record<string, unknown>, id?: string) => {
  const res = id ? await api.put(`${BASE[type]}/${id}`, payload) : await api.post(BASE[type], payload);
  return res.data.data as Listing;
};

export const deleteListing = (type: "equipment" | "seed" | "fertilizer", id: string) => api.delete(`${BASE[type]}/${id}`);

export const equipmentAvailability = (id: string, start?: string, end?: string) =>
  unwrap<{ listed: boolean; bookedRanges: { start: string; end: string }[]; requested: { available: boolean } | null }>(
    api.get(`/equipment/${id}/availability`, { params: clean({ start, end }) })
  );

export const myWorkerProfile = () =>
  unwrap<null | { id: string; skills: string[]; availability: boolean; location: string; pricing: { amount: number; unit: "hour" | "day" }; notes: string; rating: number }>(api.get("/workers/me"));

export const saveWorkerProfile = (payload: Record<string, unknown>) => unwrap<Listing>(api.put("/workers/me", payload));
