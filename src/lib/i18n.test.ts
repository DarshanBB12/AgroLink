import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import kn from "@/locales/kn.json";
import ml from "@/locales/ml.json";
import ta from "@/locales/ta.json";
import te from "@/locales/te.json";

type Tree = { [k: string]: string | Tree };
const flatten = (o: Tree, p = ""): Record<string, string> =>
  Object.entries(o).reduce((acc, [k, v]) => (typeof v === "string" ? { ...acc, [p + k]: v } : { ...acc, ...flatten(v, `${p}${k}.`) }), {});
const placeholders = (s: string) => (s.match(/\{\w+\}/g) || []).sort().join(",");

const base = flatten(en as Tree);
describe.each([["hi", hi], ["kn", kn], ["ml", ml], ["ta", ta], ["te", te]])("%s locale", (_name, locale) => {
  const flat = flatten(locale as Tree);
  it("has every key that English has", () => {
    expect(Object.keys(base).filter((k) => !(k in flat))).toEqual([]);
  });
  it("keeps {placeholders} intact in every string", () => {
    const bad = Object.keys(base).filter((k) => placeholders(base[k]) !== placeholders(flat[k] || ""));
    expect(bad).toEqual([]);
  });
  it("has no empty strings", () => {
    expect(Object.entries(flat).filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
  });
});

describe("app namespace is actually translated, not copied from English", () => {
  it("differs from English for the core UI strings in every non-English language", () => {
    for (const locale of [hi, kn, ml, ta, te]) {
      const f = flatten(locale as Tree);
      for (const key of ["app.common.save", "app.payments.payNow", "app.search.noResults", "app.settings.title"]) expect(f[key]).not.toBe(base[key]);
    }
  });
});
