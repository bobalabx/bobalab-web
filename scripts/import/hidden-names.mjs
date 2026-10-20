/**
 * Guard for DECISIONS D-06 / brief WP7 #6: names that appear ONLY on the PI
 * site's commented-out ("hidden") roster cards must never enter this repo.
 *
 * The names themselves are not stored anywhere in the repo: only salted
 * SHA-256 hashes (tests/content/wp7-hidden-name-hashes.json). This module
 * scans text for any 2- or 3-word window whose normalized form hashes to one
 * of them (2-word windows also in reverse order, e.g. "Last, First").
 *
 * Used by tests/content/wp7-hidden-names.test.ts and by the importer.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HASH_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "tests",
  "content",
  "wp7-hidden-name-hashes.json",
);

/** NFKD, no diacritics or parentheticals, lower-case, letters only, single spaces. */
export function normalizeName(s) {
  return String(s)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function hashName(salt, normalized) {
  return crypto.createHash("sha256").update(`${salt}:${normalized}`).digest("hex");
}

export function loadHashes(file = HASH_FILE) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return { salt: json.salt, hashes: new Set(json.hashes), count: json.count };
}

/** Token list of a text, using the same normalization as names (no parenthetical removal). */
function tokens(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
}

/**
 * Returns the number of windows in `text` that match a hidden-only name hash,
 * plus their token offsets (never the matched words, so failures don't leak them).
 */
export function scanText(text, { salt, hashes }) {
  const hits = new Set();
  // Raw text, and the text with parentheticals removed ("First (Nick) Last").
  for (const variant of [text, String(text).replace(/\([^)\n]{0,40}\)/g, " ")]) {
    const t = tokens(variant);
    for (let i = 0; i < t.length; i++) {
      const cands = [];
      if (i + 1 < t.length) cands.push(`${t[i]} ${t[i + 1]}`, `${t[i + 1]} ${t[i]}`);
      if (i + 2 < t.length) cands.push(t.slice(i, i + 3).join(" "));
      if (i + 3 < t.length) cands.push(t.slice(i, i + 4).join(" "));
      if (cands.some((c) => hashes.has(hashName(salt, c)))) hits.add(i);
    }
  }
  return [...hits].sort((a, b) => a - b);
}
