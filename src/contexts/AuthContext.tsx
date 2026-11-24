import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import axios from "axios";
import api, { getErrorMessage } from "@/lib/api";
import { clearSession, getCachedUser, getToken, saveSession, saveUser, UNAUTHORIZED_EVENT } from "@/lib/session";
import { updateProfileApi, type AppUser, type ProfileUpdate } from "@/services/profile";

export type User = AppUser;

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: "farmer" | "worker" | "equipment_owner";
  phone?: string;
  preferredLanguage?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<{ redirectTo: string; user: User }>;
  register: (input: RegisterInput) => Promise<{ redirectTo: string; user: User }>;
  logout: () => Promise<void>;
  updateProfile: (payload: ProfileUpdate) => Promise<User>;
  setUserFromServer: (user: User, token?: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => getToken());
  // Start from the cached user so a refresh renders immediately; it is re-validated against the server below.
  const [user, setUser] = useState<User | null>(() => (getToken() ? getCachedUser<User>() : null));
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getToken()));
  const [sessionExpired, setSessionExpired] = useState(false);
  const rememberRef = useRef<boolean>(Boolean(localStorage.getItem("agrolink_token")));

  const endSession = useCallback((expired = false) => {
    clearSession();
    setToken(null);
    setUser(null);
    setSessionExpired(expired);
  }, []);

  // Validate the stored token once on startup. Only a 401 ends the session — a network error or a
  // temporarily unavailable server must NOT log the user out.
  useEffect(() => {
    const stored = getToken();
    if (!stored) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get("/auth/me")
      .then((res) => {
        if (cancelled) return;
        setUser(res.data.user);
        saveUser(res.data.user);
      })
      .catch((error) => {
        if (cancelled) return;
        if (axios.isAxiosError(error) && error.response?.status === 401) endSession(true);
        // otherwise keep the cached session; requests will retry
      })
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [endSession]);

  // The API client emits this when any request returns 401 (expired / revoked token).
  useEffect(() => {
    const handler = () => endSession(true);
    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
  }, [endSession]);

  const applySession = useCallback((newToken: string, newUser: User, remember: boolean) => {
    rememberRef.current = remember;
    saveSession(newToken, newUser, remember);
    setToken(newToken);
    setUser(newUser);
    setSessionExpired(false);
  }, []);

  const login: AuthContextType["login"] = useCallback(
    async (email, password, remember = true) => {
      const res = await api.post("/auth/login", { email, password, remember });
      applySession(res.data.token, res.data.user, remember);
      return { redirectTo: res.data.redirectTo, user: res.data.user };
    },
    [applySession]
  );

  const register: AuthContextType["register"] = useCallback(
    async (input) => {
      const res = await api.post("/auth/register", input);
      applySession(res.data.token, res.data.user, true);
      return { redirectTo: res.data.redirectTo, user: res.data.user };
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      if (getToken()) await api.post("/auth/logout");
    } catch (error) {
      // Logging out must always succeed locally, even if the server is unreachable.
      console.warn("Logout request failed:", getErrorMessage(error));
    } finally {
      endSession(false);
    }
  }, [endSession]);

  const setUserFromServer = useCallback((next: User, newToken?: string) => {
    setUser(next);
    if (newToken) {
      saveSession(newToken, next, rememberRef.current);
      setToken(newToken);
    } else saveUser(next);
  }, []);

  const updateProfile = useCallback(
    async (payload: ProfileUpdate) => {
      const next = await updateProfileApi(payload);
      setUserFromServer(next);
      return next;
    },
    [setUserFromServer]
  );

  const refreshUser = useCallback(async () => {
    const res = await api.get("/auth/me");
    setUserFromServer(res.data.user);
  }, [setUserFromServer]);

  const value = useMemo<AuthContextType>(
    () => ({ user, token, isAuthenticated: Boolean(token && user), isLoading, sessionExpired, login, register, logout, updateProfile, setUserFromServer, refreshUser }),
    [user, token, isLoading, sessionExpired, login, register, logout, updateProfile, setUserFromServer, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
