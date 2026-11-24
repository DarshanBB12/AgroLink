export interface OwnerListing {
  id: number;
  name: string;
  category: string;
  rate: number;
  status: "Available" | "Rented" | "Maintenance";
}

export const ownerListingLimit = 10;

export const initialOwnerListings: OwnerListing[] = [
  { id: 1, name: "John Deere 5050D", category: "Tractor", rate: 2500, status: "Rented" },
  { id: 2, name: "Mahindra Harvester", category: "Harvester", rate: 4000, status: "Available" },
  { id: 3, name: "Rotavator HD", category: "Tillage", rate: 1500, status: "Available" },
  { id: 4, name: "Drip Irrigation Kit", category: "Irrigation", rate: 800, status: "Maintenance" },
  { id: 5, name: "Mini Row Crop Tractor", category: "Tractor", rate: 1800, status: "Available" },
  { id: 6, name: "Precision Seed Drill Pro", category: "Seeding", rate: 1400, status: "Available" },
  { id: 7, name: "Orchard Boom Sprayer", category: "Sprayer", rate: 900, status: "Rented" },
  { id: 8, name: "Compact Power Tiller", category: "Tillage", rate: 1100, status: "Available" },
];