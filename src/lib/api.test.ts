import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosAdapter, AxiosError } from "axios";
import api, { getErrorMessage } from "./api";
import { getToken, saveSession, UNAUTHORIZED_EVENT } from "./session";

const respond = (status: number, data: unknown): AxiosAdapter => (config) =>
  status < 400
    ? Promise.resolve({ data, status, statusText: "", headers: {}, config })
    : Promise.reject({ isAxiosError: true, config, response: { status, data, headers: {}, config, statusText: "" } } as unknown as AxiosError);

describe("api client", () => {
  const original = api.defaults.adapter;
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => { api.defaults.adapter = original; });

  it("attaches the bearer token", async () => {
    saveSession("abc", {}, true);
    let seen = "";
    api.defaults.adapter = (config) => { seen = String(config.headers.Authorization); return Promise.resolve({ data: {}, status: 200, statusText: "", headers: {}, config }); };
    await api.get("/x");
    expect(seen).toBe("Bearer abc");
  });

  it("an expired session (401) clears the token and notifies the app, once", async () => {
    saveSession("abc", {}, true);
    const spy = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, spy);
    api.defaults.adapter = respond(401, { code: "TOKEN_EXPIRED", message: "Session expired" });
    await expect(api.get("/orders/my")).rejects.toBeTruthy();
    window.removeEventListener(UNAUTHORIZED_EVENT, spy);
    expect(getToken()).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("a wrong-password 401 on /auth/login is NOT treated as an expired session", async () => {
    const spy = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, spy);
    api.defaults.adapter = respond(401, { message: "Invalid email or password." });
    await expect(api.post("/auth/login", {})).rejects.toBeTruthy();
    window.removeEventListener(UNAUTHORIZED_EVENT, spy);
    expect(spy).not.toHaveBeenCalled();
  });

  it("turns errors into user-safe messages", async () => {
    api.defaults.adapter = respond(409, { message: "These dates are already booked." });
    const err = await api.post("/orders", {}).catch((e) => e);
    expect(getErrorMessage(err)).toBe("These dates are already booked.");
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
  });

  it("reports an unreachable server clearly", async () => {
    api.defaults.adapter = () => Promise.reject({ isAxiosError: true, config: {}, message: "Network Error" } as unknown as AxiosError);
    const err = await api.get("/x").catch((e) => e);
    expect(getErrorMessage(err)).toMatch(/cannot reach the server/i);
  });
});
