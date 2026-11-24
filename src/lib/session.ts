// Token storage. "Remember me" keeps the session in localStorage (survives browser restarts);
// otherwise it lives in sessionStorage (cleared when the browser closes). Refreshing the page never logs you out.
const TOKEN_KEY = "agrolink_token";
const USER_KEY = "agrolink_user";

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const getToken = (): string | null =>
  safe(() => sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY), null);

export const getCachedUser = <T,>(): T | null =>
  safe(() => {
    const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  }, null);

export const saveSession = (token: string, user: unknown, remember = true) => {
  clearSession();
  const store = remember ? localStorage : sessionStorage;
  safe(() => {
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
  }, undefined);
};

export const saveUser = (user: unknown) =>
  safe(() => {
    const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
    store.setItem(USER_KEY, JSON.stringify(user));
  }, undefined);

export const clearSession = () =>
  safe(() => {
    [localStorage, sessionStorage].forEach((s) => {
      s.removeItem(TOKEN_KEY);
      s.removeItem(USER_KEY);
    });
  }, undefined);

export const UNAUTHORIZED_EVENT = "agrolink:unauthorized";
