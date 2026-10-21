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

// ---------------------------------------------------------------------------
// Display wording (formatting only: these helpers never add a fact).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO dates inside running text, written the way the site writes dates: "2026-07-14" → "Jul 14, 2026". */
export function humanDates(text) {
  return String(text).replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (all, y, m, d) => {
    const mi = Number(m) - 1;
    return MONTHS[mi] ? `${MONTHS[mi]} ${Number(d)}, ${y}` : all;
  });
}

/** Number ranges with an en dash ("9-11 hours", "July 13-14" → "9–11", "13–14"). */
export function enDashRanges(text) {
  return String(text).replace(/(\d)-(?=\d)/g, "$1–");
}

/**
 * Conference names the PI's CV spells out (CV "Invited Conference/Workshop
 * Presentations" and the paper list). Applied to presentation `event` text so
 * visitors do not meet lab-internal abbreviations. Order matters.
 */
export const EVENT_NAME_EXPANSIONS = [
  [/\bBOC\b/g, "Behavioral Operations Conference"],
  [/\bINFORMS RMP spotlight\b/g, "INFORMS Revenue Management & Pricing Conference (spotlight)"],
  [/\bINFORMS RMP Conference\b/g, "INFORMS Revenue Management & Pricing Conference"],
  [/\bINFORMS RMP\b/g, "INFORMS Revenue Management & Pricing Conference"],
  [/\bBDRM\b/g, "Behavioral Decision Research in Management Conference"],
  [/\bYinzOR \(CMU\)/g, "YinzOR at Carnegie Mellon University"],
  [/(?<!University of )\bMichigan\b/g, "University of Michigan"],
  // POMS stays: the CV and the field use the acronym as the society's name.
];

export function expandEventNames(text) {
  let s = String(text);
  for (const [re, to] of EVENT_NAME_EXPANSIONS) s = s.replace(re, to);
  return s;
}

/** Program tokens that are acronyms (the PI roster writes them in lower case). */
const PROGRAM_ACRONYMS = {
  ieor: "IEOR",
  eecs: "EECS",
  isf: "ISF",
  cs: "CS",
  ds: "DS",
  ms: "MS",
  phd: "PhD",
  mba: "MBA",
};
/** A trailing degree token the role already states ("Master's student · IEOR", not "· ieor ms"). */
const ROLE_DEGREE = { masters: /\s+(ms|ma|meng|mba)$/i, phd: /\s+phd$/i };

/**
 * Display casing for a person's `program` (CON-04): acronyms upper case, other
 * words capitalised, and a trailing degree that repeats the role dropped.
 * No word is expanded or added, so no new fact is introduced.
 */
export function programLabel(program, role) {
  if (program == null) return undefined;
  let s = String(program).trim();
  if (!s) return undefined;
  const deg = ROLE_DEGREE[role];
  if (deg && deg.test(s) && s.replace(deg, "").trim()) s = s.replace(deg, "").trim();
  return s.replace(/[A-Za-z]+/g, (w) => {
    const acr = PROGRAM_ACRONYMS[w.toLowerCase()];
    if (acr) return acr;
    return w === w.toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w;
  });
}

/**
 * Public copy names the PI instead of the lab jargon "the PI" (CON-08):
 * "the PI's" → "Park Sinchaisri's", "with the PI as" → "with Park Sinchaisri as".
 */
export function namePI(text, piName) {
  return String(text)
    .replace(/\b[Tt]he PI's\b/g, `${piName}'s`)
    .replace(/\b[Tt]he PI\b/g, piName);
}

/**
 * First mention of the PI by full name (CON-08): the first bare "Park" in a
 * news title or summary becomes "Park Sinchaisri"; later mentions are kept.
 */
export function fullNameFirst(text, given, full) {
  const s = String(text);
  if (s.includes(full)) return s;
  return s.replace(new RegExp(`\\b${given}\\b`), full);
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
