/**
 * Direction ordering (DECISIONS D-04): the order lives in site.yml →
 * direction_order. Live = present after draft filtering and not archived.
 */
import type { DirectionEntry } from "./schema";

export interface DirectionOrderResult {
  /** Live directions in display order (index = position + 1). */
  live: DirectionEntry[];
  archived: DirectionEntry[];
  /** Live directions missing from direction_order (appended, sorted by slug). */
  missing: string[];
  /** Slugs listed more than once. */
  duplicates: string[];
  /** Slugs in direction_order with no direction file at all. */
  unknown: string[];
  /** Listed slugs that exist but are archived (ignored). */
  listedArchived: string[];
}

/**
 * @param directions directions visible in this build (drafts already filtered)
 * @param order      site.direction_order
 * @param allSlugs   every direction slug on disk, drafts included (to tell "unknown" from "draft")
 */
export function orderDirections(
  directions: DirectionEntry[],
  order: string[],
  allSlugs: Iterable<string> = directions.map((d) => d.slug),
): DirectionOrderResult {
  const all = new Set(allSlugs);
  const bySlug = new Map(directions.map((d) => [d.slug, d]));
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const unknown: string[] = [];
  const listedArchived: string[] = [];
  const live: DirectionEntry[] = [];

  for (const slug of order) {
    if (seen.has(slug)) {
      if (!duplicates.includes(slug)) duplicates.push(slug);
      continue;
    }
    seen.add(slug);
    if (!all.has(slug)) {
      unknown.push(slug);
      continue;
    }
    const d = bySlug.get(slug);
    if (!d) continue; // draft excluded from this build
    if (d.status === "archived") {
      listedArchived.push(slug);
      continue;
    }
    live.push(d);
  }
  const missing = directions
    .filter((d) => d.status !== "archived" && !seen.has(d.slug))
    .map((d) => d.slug)
    .sort();
  for (const slug of missing) live.push(bySlug.get(slug)!);
  const archived = directions
    .filter((d) => d.status === "archived")
    .sort((a, b) => a.title.localeCompare(b.title));
  return { live, archived, missing, duplicates, unknown, listedArchived };
}

export const pad2 = (n: number) => String(n).padStart(2, "0");
