/**
 * Pure helpers for the WP7 content importer (scripts/import/import-dataset.mjs).
 * No file system access here, so tests/unit/wp7/import-lib.test.ts can cover them.
 * Rules come from docs/CONTENT-MAPPING.md (WP0) and docs/DECISIONS.md D-03…D-06.
 */
import { Document, isScalar, visit } from "yaml";

/**
 * Hosts we checked serve https (MEASURED 2026-10-20 with `curl -I`, plus the
 * hosts CONTENT-MAPPING §0 lists). Any other http:// URL is dropped and reported.
 */
export const HTTPS_OK_HOSTS = [
  "linkedin.com",
  "www.linkedin.com",
  "hdl.handle.net",
  "www-stat.wharton.upenn.edu",
  "repository.upenn.edu",
  "www.samanthakeppler.com",
  "samanthakeppler.com",
];

/** https URL, an https-upgraded http URL on a known host, or null (with a reason). */
export function toHttps(url) {
  if (url == null || url === "") return { url: null, reason: null };
  const u = String(url).trim();
  if (/^https:\/\//i.test(u)) return { url: u, reason: null };
  const m = /^http:\/\/([^/]+)(.*)$/i.exec(u);
  if (m) {
    const host = m[1].toLowerCase();
    const ok = HTTPS_OK_HOSTS.includes(host) || host.endsWith(".upenn.edu");
    if (ok) return { url: `https://${m[1]}${m[2]}`, reason: null };
    return { url: null, reason: `http:// URL on a host not known to serve https: ${u}` };
  }
  return { url: null, reason: `not an absolute URL: ${u}` };
}

/** ASCII-fold and lower-case. */
export function asciiFold(s) {
  return String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function kebab(s) {
  return asciiFold(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Last name token of an author name ("Wichinpong Park Sinchaisri" → "sinchaisri"). */
export function lastNameToken(name) {
  const cleaned = String(name)
    .replace(/\([^)]*\)/g, " ")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return kebab(parts[parts.length - 1] ?? "");
}

/** Year of a 'YYYY…' string, or null. */
export function yearOf(s) {
  const m = /^(\d{4})/.exec(String(s ?? ""));
  return m ? Number(m[1]) : null;
}

/** Strip parenthetical notes from a dataset date: "2023-03 (Crossref …)" → "2023-03". */
export function cleanDate(s) {
  if (s == null) return null;
  const m = /^(\d{4}(?:-\d{2}(?:-\d{2})?)?)/.exec(String(s).trim());
  return m ? m[1] : null;
}

/**
 * D-05 publication slug: {first-author-lastname}-{year}-{short-title}, ≤ 60 chars.
 * `year` falls back to the year of `asOf`. The short title is the old slug
 * without a trailing -YYYY. `overrides` maps old slug → short title.
 */
export function publicationSlug(oldSlug, firstAuthorName, year, asOf, overrides = {}) {
  const y = year ?? yearOf(asOf);
  if (!y) throw new Error(`publication ${oldSlug}: no year and no as_of year for the slug`);
  const short = overrides[oldSlug] ?? oldSlug.replace(/-(19|20)\d{2}$/, "");
  const slug = `${lastNameToken(firstAuthorName)}-${y}-${short}`;
  if (slug.length > 60) throw new Error(`publication slug longer than 60 chars: ${slug}`);
  return slug;
}

/** News file slug: {date}-{dataset slug without its leading yyyy-mm-}. */
export function newsSlug(datasetSlug, date) {
  return `${date}-${datasetSlug.replace(/^\d{4}-\d{2}-/, "")}`;
}

/** The single distinct 4-digit year in a text, else null. */
export function singleYear(text) {
  const years = new Set(String(text).match(/\b(19|20)\d{2}\b/g) ?? []);
  return years.size === 1 ? Number([...years][0]) : null;
}

/**
 * CONTENT-MAPPING §3.1: a presentation keeps its evidence URL only when the
 * label starts with DOCUMENTED and is not "PI-reported only".
 */
export function presentationHasEvidence(label) {
  const l = String(label ?? "");
  return /^DOCUMENTED/.test(l) && !/PI-reported only/i.test(l);
}

/**
 * Pick the direction's guiding question (≤ max chars), skipping inferred ones.
 * `preferredIdx` (non-inferred, e.g. the one matching a URAP question) wins when
 * it fits; `override` (own-words shortening of a non-inferred question) wins over all.
 * @param {string[]} questions
 * @param {number[]} [inferredIdx]
 * @param {{ max?: number, preferredIdx?: number, override?: { basedOn: number, text: string } }} [opts]
 * @returns {{ text: string, index: number, shortened: boolean } | null}
 */
export function chooseQuestion(
  questions,
  inferredIdx = [],
  { max = 140, preferredIdx, override } = {},
) {
  if (override) {
    if (override.text.length > max) throw new Error(`question override > ${max}: ${override.text}`);
    if (inferredIdx.includes(override.basedOn))
      throw new Error(`question override is based on inferred question ${override.basedOn}`);
    return { text: override.text, index: override.basedOn, shortened: true };
  }
  const ok = (i) => !inferredIdx.includes(i) && questions[i] != null && questions[i].length <= max;
  if (preferredIdx != null && ok(preferredIdx))
    return { text: questions[preferredIdx], index: preferredIdx, shortened: false };
  for (let i = 0; i < questions.length; i++)
    if (ok(i)) return { text: questions[i], index: i, shortened: false };
  return null;
}

/** Word count, same rule as the validator's W_BODY_LENGTH. */
export function wordCount(s) {
  return String(s)
    .replace(/[#*_>`[\]()-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Sentence count (rough; for the ≤ 3-sentence in_brief rule). */
export function sentenceCount(s) {
  return (String(s).match(/[.!?](\s|$)/g) ?? []).length;
}

/** Remove keys whose value is null/undefined, "" or an empty object (arrays are kept). */
export function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === "") continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    out[k] = v;
  }
  return out;
}

const DATE_LIKE = /^\d{4}(-\d{2}){0,2}$/;

/** YAML text with date-like strings double-quoted (so YAML 1.1 readers keep them as strings). */
export function toYaml(data) {
  const doc = new Document(data);
  visit(doc, {
    Scalar(_key, node) {
      if (isScalar(node) && typeof node.value === "string" && DATE_LIKE.test(node.value))
        node.type = "QUOTE_DOUBLE";
    },
  });
  return doc.toString({ lineWidth: 0 });
}

/** Markdown file with YAML front matter. */
export function frontMatterFile(data, body = "") {
  const fm = toYaml(data).trimEnd();
  const b = String(body ?? "").trim();
  return `---\n${fm}\n---\n${b ? `\n${b}\n` : ""}`;
}
