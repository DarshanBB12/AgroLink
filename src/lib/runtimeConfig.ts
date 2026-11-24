const LOCAL_BACKEND_URL = "http://localhost:5000";

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeApiBase = (value: string) => {
  const trimmed = stripTrailingSlash(value);
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const normalizeSocketBase = (value: string) => {
  const trimmed = stripTrailingSlash(value);
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
};

const getBrowserOrigin = () => {
  if (typeof window === "undefined") return "";
  return window.location.origin;
};

export const resolveApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL;
  if (configured) return normalizeApiBase(configured);

  const browserOrigin = getBrowserOrigin();
  if (browserOrigin && !/^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/i.test(browserOrigin)) {
    return normalizeApiBase(browserOrigin);
  }

  return normalizeApiBase(LOCAL_BACKEND_URL);
};

export const resolveSocketBaseUrl = () => {
  const configured = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL;
  if (configured) return normalizeSocketBase(configured);

  const browserOrigin = getBrowserOrigin();
  if (browserOrigin && !/^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/i.test(browserOrigin)) {
    return stripTrailingSlash(browserOrigin);
  }

  return LOCAL_BACKEND_URL;
};

export const API_REQUEST_TIMEOUT_MS = 15000;