import { describe, expect, it } from "vitest";
import { checkPassword, isStrongPassword, validateEmail, validatePhone } from "./validation";

describe("validation", () => {
  it("validates emails", () => {
    expect(validateEmail("")).toBe("required");
    expect(validateEmail("   ")).toBe("required");
    expect(validateEmail("not-an-email")).toBe("invalid");
    expect(validateEmail("a@b")).toBe("invalid");
    expect(validateEmail("farmer@agrolink.in")).toBeNull();
  });
  it("enforces the same password rules as the server (8+, letter, number)", () => {
    expect(isStrongPassword("short1")).toBe(false);
    expect(isStrongPassword("allletters")).toBe(false);
    expect(isStrongPassword("12345678")).toBe(false);
    expect(isStrongPassword("Passw0rd123")).toBe(true);
    expect(checkPassword("abc")).toEqual({ length: false, letter: true, number: false });
  });
  it("validates optional phone numbers", () => {
    expect(validatePhone("")).toBe(true);
    expect(validatePhone("+91 98765 43210")).toBe(true);
    expect(validatePhone("abc")).toBe(false);
    expect(validatePhone("12")).toBe(false);
  });
});
