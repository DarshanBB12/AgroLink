#!/usr/bin/env node
/**
 * Translation consistency checker for AgroLink.
 *
 * Verifies that every locale file under src/locales/*.json contains the
 * exact same set of keys as the canonical en.json source, and that no
 * translated value is empty.
 *
 * Usage: npm run check:i18n
 * Exits with code 1 (and fails CI) if any locale has missing keys,
 * extra/orphaned keys, or empty values.
 */
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, "..", "src", "locales");
const SOURCE_LOCALE = "en";

function flatten(obj, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

function loadLocale(code) {
  const raw = readFileSync(join(LOCALES_DIR, `${code}.json`), "utf-8");
  return JSON.parse(raw);
}

function main() {
  const files = readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".json"));
  const localeCodes = files.map((f) => f.replace(/\.json$/, ""));

  if (!localeCodes.includes(SOURCE_LOCALE)) {
    console.error(`Source locale "${SOURCE_LOCALE}.json" not found in ${LOCALES_DIR}`);
    process.exit(1);
  }

  const sourceFlat = flatten(loadLocale(SOURCE_LOCALE));
  const sourceKeys = new Set(Object.keys(sourceFlat));

  let hasErrors = false;
  const otherLocales = localeCodes.filter((c) => c !== SOURCE_LOCALE);

  console.log(`Checking ${otherLocales.length} locale(s) against ${SOURCE_LOCALE}.json (${sourceKeys.size} keys)...\n`);

  // Duplicate-key detection: JSON.parse silently keeps only the last
  // occurrence of a duplicate key, so we check raw text for repeats.
  // Uses a stack of "seen key" sets, one per currently-open object literal,
  // so siblings across different nested objects are never confused.
  function findDuplicateKeys(code) {
    const raw = readFileSync(join(LOCALES_DIR, `${code}.json`), "utf-8");
    const lines = raw.split("\n");
    const stack = [new Set()]; // top-level object
    const dupes = [];
    for (const line of lines) {
      const match = line.match(/^\s*"([^"]+)"\s*:\s*(.*)$/);
      if (match) {
        const key = match[1];
        const rest = match[2];
        const current = stack[stack.length - 1];
        if (current.has(key)) {
          dupes.push(key);
        }
        current.add(key);
        // If this key's value opens a new object literal on this line
        // (and doesn't close it on the same line), push a new scope.
        if (/{\s*$/.test(rest)) {
          stack.push(new Set());
        }
      } else if (/^\s*}/.test(line) && stack.length > 1) {
        stack.pop();
      }
    }
    return dupes;
  }

  for (const code of [SOURCE_LOCALE, ...otherLocales]) {
    const dupes = findDuplicateKeys(code);
    if (dupes.length) {
      hasErrors = true;
      console.error(`✖ ${code}.json has duplicate keys: ${dupes.join(", ")}`);
    }
  }

  for (const code of otherLocales) {
    const flat = flatten(loadLocale(code));
    const keys = new Set(Object.keys(flat));

    const missing = [...sourceKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !sourceKeys.has(k));
    const empty = Object.entries(flat)
      .filter(([, v]) => typeof v === "string" && v.trim() === "")
      .map(([k]) => k);

    if (missing.length === 0 && extra.length === 0 && empty.length === 0) {
      console.log(`✔ ${code}.json — OK (${keys.size} keys)`);
      continue;
    }

    hasErrors = true;
    console.error(`✖ ${code}.json`);
    if (missing.length) console.error(`  missing keys (${missing.length}): ${missing.join(", ")}`);
    if (extra.length) console.error(`  extra/orphaned keys (${extra.length}): ${extra.join(", ")}`);
    if (empty.length) console.error(`  empty values (${empty.length}): ${empty.join(", ")}`);
  }

  console.log("");
  if (hasErrors) {
    console.error("Translation consistency check FAILED.");
    process.exit(1);
  } else {
    console.log("Translation consistency check passed — all locales match en.json.");
  }
}

main();
