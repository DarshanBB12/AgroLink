import axios, { AxiosError } from "axios";
import { API_REQUEST_TIMEOUT_MS, resolveApiBaseUrl } from "@/lib/runtimeConfig";
import { clearSession, getToken, UNAUTHORIZED_EVENT } from "@/lib/session";

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { "Content-Type": "application/json" },
  timeout: API_REQUEST_TIMEOUT_MS,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Endpoints where a 401 means "wrong credentials", not "your session expired".
const AUTH_PATHS = ["/auth/login", "/auth/register"];

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ code?: string; message?: string }>) => {
    const url = error.config?.url || "";
    if (error.response?.status === 401 && !AUTH_PATHS.some((p) => url.includes(p))) {
      clearSession();
      // The AuthProvider listens for this and routes to /login without a full page reload.
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { code: error.response.data?.code } }));
    }
    return Promise.reject(error);
  }
);

// Turn any thrown value into a message that is safe to show to a user.
export const getErrorMessage = (error: unknown, fallback = "Something went wrong. Please try again."): string => {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") return "The request timed out. Please try again.";
    if (!error.response) return "Cannot reach the server. Check your connection and try again.";
    const data = error.response.data as { message?: string } | undefined;
    return data?.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export default api;
