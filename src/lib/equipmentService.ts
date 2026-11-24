import api from "@/lib/api";
import tractorImg from "@/assets/equipment/tractor.jpg";
import harvesterImg from "@/assets/equipment/harvester.jpg";
import pumpImg from "@/assets/equipment/pump.jpg";
import rotavatorImg from "@/assets/equipment/rotavator.jpg";
import seeddrillImg from "@/assets/equipment/seeddrill.jpg";
import sprayerImg from "@/assets/equipment/sprayer.jpg";

export type EquipmentCategory = "Tractor" | "Harvester" | "Irrigation" | "Tillage" | "Seeding" | "Sprayer" | string;

export interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  location: string;
  image: string;
  available: boolean;
  discount: number;
  specs: {
    power: string;
    fuel: string;
    capacity: string;
    year: string;
  };
  description: string;
  fine: number;
  ownerPhone: string;
}

type BackendOwner = {
  name?: string;
  phone?: string;
  location?: string;
};

type BackendEquipment = {
  _id?: string;
  id?: string;
  name?: string;
  category?: EquipmentCategory;
  type?: EquipmentCategory;
  price?: number;
  rating?: number;
  location?: string;
  available?: boolean;
  availability?: boolean;
  discount?: number;
  description?: string;
  fine?: number;
  specs?: {
    power?: string;
    fuel?: string;
    capacity?: string;
    year?: string | number;
  };
  owner?: BackendOwner | string | null;
};

type EquipmentResponse = {
  success: boolean;
  data?: BackendEquipment[];
  message?: string;
};

const equipmentImages: Record<string, string> = {
  tractor: tractorImg,
  harvester: harvesterImg,
  irrigation: pumpImg,
  pump: pumpImg,
  rotavator: rotavatorImg,
  tillage: rotavatorImg,
  seeding: seeddrillImg,
  seed: seeddrillImg,
  sprayer: sprayerImg,
};

const fallbackPhoneByCategory: Record<string, string> = {
  Tractor: "+91-98765-43210",
  Harvester: "+91-98765-43211",
  Irrigation: "+91-98765-43212",
  Tillage: "+91-98765-43213",
  Seeding: "+91-98765-43214",
  Sprayer: "+91-98765-43215",
};

const defaultSpecByCategory: Record<string, EquipmentItem["specs"]> = {
  Tractor: { power: "50 HP", fuel: "Diesel", capacity: "2200 kg", year: "2023" },
  Harvester: { power: "76 HP", fuel: "Diesel", capacity: "1400 L", year: "2024" },
  Irrigation: { power: "5 HP", fuel: "Electric", capacity: "12000 L/hr", year: "2021" },
  Tillage: { power: "PTO 45 HP", fuel: "N/A", capacity: "7 ft", year: "2022" },
  Seeding: { power: "PTO 35 HP", fuel: "N/A", capacity: "9 rows", year: "2023" },
  Sprayer: { power: "2 HP", fuel: "Petrol", capacity: "20 L", year: "2024" },
};

const pickImage = (category: string, name: string) => {
  const key = `${category} ${name}`.toLowerCase();
  const found = Object.entries(equipmentImages).find(([candidate]) => key.includes(candidate));
  return found?.[1] || tractorImg;
};

const normalizeYear = (value: string | number | undefined, fallback: string) => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

export const normalizeEquipment = (item: BackendEquipment, index: number): EquipmentItem => {
  const category = String(item.category || item.type || "Equipment");
  const fallbackSpecs = defaultSpecByCategory[category] || defaultSpecByCategory.Tractor;
  const owner = typeof item.owner === "string" ? { name: item.owner } : item.owner || {};
  const fallbackPhone = fallbackPhoneByCategory[category] || fallbackPhoneByCategory.Tractor;
  const available = item.available ?? item.availability ?? true;

  return {
    // Preserve the real MongoDB ObjectId as a string. NEVER coerce to
    // Number — ObjectIds are 24-char hex strings and Number() would
    // silently produce NaN or a garbage numeric value, breaking any
    // downstream lookup against the backend. Fall back to a stable
    // synthetic string id only when no server id is present at all.
    id: String(item._id ?? item.id ?? `local-${index + 1}`),
    name: item.name || "Unnamed Equipment",
    category,
    price: Number(item.price || 0),
    rating: Number(item.rating || 0),
    location: item.location || owner.location || "AgroLink Network",
    image: pickImage(category, item.name || category),
    available: Boolean(available),
    discount: Number(item.discount || 0),
    specs: {
      power: item.specs?.power || fallbackSpecs.power,
      fuel: item.specs?.fuel || fallbackSpecs.fuel,
      capacity: item.specs?.capacity || fallbackSpecs.capacity,
      year: normalizeYear(item.specs?.year, fallbackSpecs.year),
    },
    description: item.description || `Available ${category.toLowerCase()} listing from AgroLink live inventory.`,
    fine: Number(item.fine || 0),
    ownerPhone: owner.phone || fallbackPhone,
  };
};

export const fetchEquipmentListings = async () => {
  const response = await api.get<EquipmentResponse>("/equipment");
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to load equipment listings");
  }

  return (response.data.data || []).map((item, index) => normalizeEquipment(item, index));
};
