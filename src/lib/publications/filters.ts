/**
 * Publication filters and their URL form (brief §D2, §D7):
 *
 *   /publications/?direction=a,b&type=journal&year=2021-2025&member=x&q=gig
 *
 * - `direction`, `type`, `member`: comma-separated (repeated keys also accepted);
 *   OR within a facet, AND across facets.
 * - `year`: "2025", "2021-2025", "2021-" or "-2025" (inclusive range).
 * - `q`: free text (MiniSearch, see ./search.ts).
 *
 * Pure module (client island + server + tests). The URL is the source of truth;
 * `serializeFilters(parseFilters(x))` is stable, so state round-trips.
 */
import type { PubDoc } from "./search";

export type FacetKey = "direction" | "type" | "member";
export const FACET_KEYS: readonly FacetKey[] = ["direction", "type", "member"];

export interface FilterState {
  q: string;
  direction: string[];
  type: string[];
  member: string[];
  yearFrom?: number;
  yearTo?: number;
}

export const EMPTY_FILTERS: FilterState = { q: "", direction: [], type: [], member: [] };

export interface FacetOption {
  value: string;
  label: string;
}

/** The options each facet offers (built on the server from content). */
export interface Facets {
  direction: FacetOption[];
  type: FacetOption[];
  member: FacetOption[];
  /** Years present among the documents, newest first. */
  years: number[];
}

const MAX_Q = 200;

/**
 * Facets worth offering as chips: a facet with a single option filters
 * nothing, unless a link already selected it (e.g. a person page's
 * "?member=…" link); an active filter is always shown, so it can be seen and
 * switched off.
 */
export const visibleFacetKeys = (
  facets: Pick<Facets, FacetKey>,
  state?: Pick<FilterState, FacetKey>,
): FacetKey[] => FACET_KEYS.filter((k) => facets[k].length >= 2 || (state?.[k].length ?? 0) > 0);

/** Whether the island shows a filter panel (chips and/or a year range) besides search. */
export const hasFilterPanel = (facets: Facets): boolean =>
  visibleFacetKeys(facets).length > 0 || facets.years.length >= 2;

function listParam(params: URLSearchParams, key: string, allowed?: readonly FacetOption[]) {
  const raw = params
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
  const known = allowed ? new Set(allowed.map((o) => o.value)) : null;
  const out: string[] = [];
  for (const v of raw) if ((!known || known.has(v)) && !out.includes(v)) out.push(v);
  return out;
}

function parseYear(v: string | null): { from?: number; to?: number } {
  if (!v) return {};
  const m = /^\s*(\d{4})?\s*(?:(-|–|\.\.)\s*(\d{4})?)?\s*$/.exec(v);
  if (!m || (!m[1] && !m[3])) return {};
  const a = m[1] ? Number(m[1]) : undefined;
  const b = m[2] ? (m[3] ? Number(m[3]) : undefined) : a;
  if (a !== undefined && b !== undefined && a > b) return { from: b, to: a };
  return { from: a, to: b };
}

/** URL query → state. Unknown facet values are dropped when `facets` is given. */
export function parseFilters(
  query: string | URLSearchParams,
  facets?: Pick<Facets, FacetKey>,
): FilterState {
  const params = typeof query === "string" ? new URLSearchParams(query.replace(/^\?/, "")) : query;
  const { from, to } = parseYear(params.get("year"));
  const state: FilterState = {
    q: (params.get("q") ?? "").slice(0, MAX_Q),
    direction: listParam(params, "direction", facets?.direction),
    type: listParam(params, "type", facets?.type),
    member: listParam(params, "member", facets?.member),
  };
  if (from !== undefined) state.yearFrom = from;
  if (to !== undefined) state.yearTo = to;
  return state;
}

/** State → URL query without "?" ("" when nothing is set). Key order follows brief §D2. */
export function serializeFilters(s: FilterState): string {
  const parts: string[] = [];
  const enc = (v: string) => encodeURIComponent(v).replace(/%2C/gi, ",").replace(/%20/g, "+");
  if (s.direction.length) parts.push(`direction=${s.direction.map(enc).join(",")}`);
  if (s.type.length) parts.push(`type=${s.type.map(enc).join(",")}`);
  if (s.yearFrom !== undefined || s.yearTo !== undefined) {
    const y =
      s.yearFrom !== undefined && s.yearFrom === s.yearTo
        ? String(s.yearFrom)
        : `${s.yearFrom ?? ""}-${s.yearTo ?? ""}`;
    parts.push(`year=${y}`);
  }
  if (s.member.length) parts.push(`member=${s.member.map(enc).join(",")}`);
  const q = s.q.trim();
  if (q) parts.push(`q=${enc(q)}`);
  return parts.join("&");
}

export function activeFilterCount(s: FilterState): number {
  return (
    s.direction.length +
    s.type.length +
    s.member.length +
    (s.yearFrom !== undefined || s.yearTo !== undefined ? 1 : 0) +
    (s.q.trim() ? 1 : 0)
  );
}

export const isEmptyFilter = (s: FilterState) => activeFilterCount(s) === 0;

function inYear(doc: PubDoc, s: FilterState): boolean {
  if (s.yearFrom === undefined && s.yearTo === undefined) return true;
  if (doc.year === undefined) return false;
  if (s.yearFrom !== undefined && doc.year < s.yearFrom) return false;
  if (s.yearTo !== undefined && doc.year > s.yearTo) return false;
  return true;
}

function facetValues(doc: PubDoc, key: FacetKey): readonly string[] {
  if (key === "direction") return doc.directions;
  if (key === "member") return doc.members;
  return [doc.type];
}

/**
 * Does `doc` pass every active filter? `hits` are the search matches (null =
 * no text query). `ignore` skips one facet (used for per-option counts).
 */
export function matches(
  doc: PubDoc,
  s: FilterState,
  hits: ReadonlySet<string> | null,
  ignore?: FacetKey,
): boolean {
  if (hits && !hits.has(doc.slug)) return false;
  if (!inYear(doc, s)) return false;
  for (const key of FACET_KEYS) {
    if (key === ignore) continue;
    const wanted = s[key];
    if (wanted.length && !facetValues(doc, key).some((v) => wanted.includes(v))) return false;
  }
  return true;
}

export function applyFilters<T extends PubDoc>(
  docs: readonly T[],
  s: FilterState,
  hits: ReadonlySet<string> | null,
): T[] {
  return docs.filter((d) => matches(d, s, hits));
}

/**
 * For each option of `key`: how many documents match the other active filters
 * plus that option (what selecting it would add, given OR within the facet).
 */
export function facetCounts(
  docs: readonly PubDoc[],
  s: FilterState,
  hits: ReadonlySet<string> | null,
  key: FacetKey,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const d of docs) {
    if (!matches(d, s, hits, key)) continue;
    for (const v of new Set(facetValues(d, key))) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

/** Toggle one value in a facet (returns a new state). */
export function toggleValue(s: FilterState, key: FacetKey, value: string): FilterState {
  const cur = s[key];
  return { ...s, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
}

/** Group documents by year, newest first; documents without a year go last (year null). */
export function groupDocsByYear<T extends Pick<PubDoc, "year">>(
  docs: readonly T[],
): Array<{ year: number | null; items: T[] }> {
  const map = new Map<number | null, T[]>();
  for (const d of docs) {
    const y = d.year ?? null;
    const list = map.get(y);
    if (list) list.push(d);
    else map.set(y, [d]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] === null ? 1 : b[0] === null ? -1 : b[0] - a[0]))
    .map(([year, items]) => ({ year, items }));
}

/** Anchor id for a year group ("y2026"; "y-undated" for items without a year). */
export const yearAnchor = (year: number | null) => (year === null ? "y-undated" : `y${year}`);
