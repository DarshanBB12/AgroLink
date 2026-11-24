import { vi } from "vitest";
import type { Role } from "@/types/api";

// A controllable stand-in for AuthContext so component tests can run as any role without a server.
export const authState = {
  user: null as null | Record<string, unknown>,
  token: null as string | null,
  isAuthenticated: false,
  isLoading: false,
  sessionExpired: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  setUserFromServer: vi.fn(),
  refreshUser: vi.fn(),
};

export const makeUser = (role: Role, over: Record<string, unknown> = {}) => ({
  id: "u1", name: "Test User", email: "t@test.com", role, phone: "", location: "", coordinates: null, avatar: "", bio: "", farmSize: "", cropTypes: [], businessName: "",
  preferredLanguage: "en", theme: "light", planCode: "farmer_free",
  settings: { notifications: { booking: true, payment: true, message: true, weather: true }, listingPreferences: { defaultPricingUnit: "day", autoAcceptRequests: false, showPhoneAfterApproval: true } },
  ...over,
});

export const signInAs = (role: Role | null, over: Record<string, unknown> = {}) => {
  authState.user = role ? makeUser(role, over) : null;
  authState.token = role ? "token" : null;
  authState.isAuthenticated = Boolean(role);
};

export const authModule = {
  useAuth: () => authState,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
};
