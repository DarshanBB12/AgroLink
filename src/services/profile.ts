import api from "@/lib/api";
import type { ListingPrefs, NotificationPrefs, Role } from "@/types/api";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  planCode?: string;
  subscriptionStatus?: string;
  subscriptionEndsAt?: string | null;
  phone: string;
  location: string;
  coordinates: { lat: number; lng: number } | null;
  locationSource: "gps" | "manual" | null;
  locationUpdatedAt: string | null;
  avatar: string;
  bio: string;
  farmSize: string;
  cropTypes: string[];
  businessName: string;
  preferredLanguage: "en" | "hi" | "kn" | "ml" | "ta" | "te";
  theme: "light" | "dark";
  settings: { notifications: NotificationPrefs; listingPreferences: ListingPrefs };
  isActive: boolean;
  createdAt: string;
}

export type ProfileUpdate = Partial<Pick<AppUser, "name" | "phone" | "location" | "avatar" | "bio" | "farmSize" | "cropTypes" | "businessName" | "preferredLanguage" | "theme">>;

export const updateProfileApi = async (payload: ProfileUpdate) => (await api.put("/auth/profile", payload)).data.user as AppUser;
export const changePasswordApi = async (currentPassword: string, newPassword: string) => (await api.put("/auth/change-password", { currentPassword, newPassword })).data as { token: string; user: AppUser };
export const saveLocationApi = async (payload: { lat?: number; lng?: number; address?: string; source?: "gps" | "manual" }) => (await api.put("/auth/location", payload)).data.user as AppUser;
export const clearLocationApi = async () => (await api.delete("/auth/location")).data.user as AppUser;
export const saveSettingsApi = async (payload: { notifications?: Partial<NotificationPrefs>; listingPreferences?: Partial<ListingPrefs> }) => (await api.put("/auth/settings", payload)).data.user as AppUser;
