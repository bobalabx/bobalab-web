/**
 * People filter semantics (brief §D9 "Filters"), shared by the server render
 * and the client island. Pure functions, no React.
 *
 * - Nothing selected → everyone matches (the server render is the full list).
 * - Within one facet the chips are OR'ed ("PhD students" or "Postdocs").
 * - Across facets they are AND'ed (role AND direction).
 */

/** What a person contributes to filtering. Plain data, so it can cross into the client island. */
export interface FilterMeta {
  role: string;
  /** Direction slugs present in this build. */
  directions: string[];
  alumni: boolean;
}

export interface FilterState {
  roles: string[];
  directions: string[];
}

export const EMPTY_FILTER: FilterState = { roles: [], directions: [] };

export function isFiltering(s: FilterState): boolean {
  return s.roles.length > 0 || s.directions.length > 0;
}

export function matches(meta: FilterMeta, s: FilterState): boolean {
  if (s.roles.length && !s.roles.includes(meta.role)) return false;
  if (s.directions.length && !meta.directions.some((d) => s.directions.includes(d))) return false;
  return true;
}

/** Toggle a value in one facet (returns a new state). */
export function toggle(s: FilterState, facet: keyof FilterState, value: string): FilterState {
  const cur = s[facet];
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
  return { ...s, [facet]: next };
}

/** "Showing 3 of 31 people (2 in Alumni)." (empty string when not filtering). */
export function statusText(all: readonly FilterMeta[], s: FilterState): string {
  if (!isFiltering(s)) return "";
  const hits = all.filter((m) => matches(m, s));
  if (!hits.length) return "No one matches these filters.";
  const alumni = hits.filter((m) => m.alumni).length;
  const noun = all.length === 1 ? "person" : "people";
  const base = `Showing ${hits.length} of ${all.length} ${noun}`;
  return alumni ? `${base} (${alumni} in Alumni).` : `${base}.`;
}
