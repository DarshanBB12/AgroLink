import { beforeEach, describe, expect, it } from "vitest";
import { clearSession, getCachedUser, getToken, saveSession, saveUser } from "./session";

describe("session storage", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it("'remember me' persists in localStorage so a refresh or restart keeps the user signed in", () => {
    saveSession("tok", { id: "1" }, true);
    expect(localStorage.getItem("agrolink_token")).toBe("tok");
    expect(sessionStorage.getItem("agrolink_token")).toBeNull();
    expect(getToken()).toBe("tok");
    expect(getCachedUser<{ id: string }>()).toEqual({ id: "1" });
  });
  it("without 'remember me' it lives in sessionStorage only", () => {
    saveSession("tok", { id: "1" }, false);
    expect(localStorage.getItem("agrolink_token")).toBeNull();
    expect(sessionStorage.getItem("agrolink_token")).toBe("tok");
  });
  it("saving a new session never leaves the previous user's token behind", () => {
    saveSession("old", { id: "old" }, true);
    saveSession("new", { id: "new" }, false);
    expect(localStorage.getItem("agrolink_token")).toBeNull();
    expect(getToken()).toBe("new");
  });
  it("saveUser keeps the user in the store that holds the token", () => {
    saveSession("tok", { id: "1" }, false);
    saveUser({ id: "1", name: "X" });
    expect(sessionStorage.getItem("agrolink_user")).toContain("X");
    expect(localStorage.getItem("agrolink_user")).toBeNull();
  });
  it("clearSession removes everything and tolerates corrupt data", () => {
    saveSession("tok", { id: "1" }, true);
    clearSession();
    expect(getToken()).toBeNull();
    localStorage.setItem("agrolink_user", "{broken");
    expect(getCachedUser()).toBeNull();
  });
});
