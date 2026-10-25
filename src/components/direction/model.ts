/**
 * Pure helpers for the research pages (brief §D4–§D5, §E5; redesign D-13).
 * Everything shown on a direction page is derived here from the loaded
 * Content, so the rules are unit-tested (tests/unit/direction/**) and never
 * hard-coded in JSX.
 */
import type { Content, DirectionView, OpportunityView, ProjectView } from "@/lib/content/load";
import type { PublicPerson } from "@/lib/content/people";
import { comparePeople } from "@/lib/content/people";
import { openOpportunities } from "@/lib/content/queries";
import { TRANSITION, type TransitionType } from "@/lib/vt";

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** Small counts in running prose are words ("the two directions"); larger ones stay numerals. */
export const numberWord = (n: number) => WORDS[n] ?? String(n);

/** "a", "a and b", "a, b and c" (the site's house style has no serial comma). */
export function listJoin(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * A direction's counts as a short data label (research ledger, "More
 * directions"): "4 papers · 2 in progress · 5 projects". Work in progress is
 * counted separately (D-05) and named only when there is some.
 */
export function countsSentence(counts: DirectionView["counts"]): string {
  const parts = [plural(counts.papers, "paper")];
  if (counts.inProgress > 0) parts.push(`${counts.inProgress} in progress`);
  parts.push(plural(counts.projects, "project"));
  return parts.join(" · ");
}

/** "See all in Publications" keeps the direction filter (§D5.6; WP2 acceptance #5). */
export function publicationsHref(slug: string): string {
  return `/publications/?direction=${encodeURIComponent(slug)}`;
}

/**
 * "More directions" transition type (§E5): moving to a higher index slides
 * forward, to a lower one slides back. From an archived direction (no index)
 * every sibling is "forward".
 */
export function railTransition(
  current: Pick<DirectionView, "index">,
  target: Pick<DirectionView, "index">,
): TransitionType {
  if (current.index == null || target.index == null) return TRANSITION.navForward;
  return target.index > current.index ? TRANSITION.navForward : TRANSITION.navBack;
}

/**
 * People of a direction (§D5.8). Person records rarely carry their own
 * `directions` (all are empty in October 2026), so the list is the listed team
 * members of the direction's projects, plus anyone tagged with the direction
 * directly. Current people first (PI, then by role and name), alumni last.
 * Only people the loader already listed for this build are used (D-06).
 */
export function directionPeople(
  c: Pick<Content, "people">,
  d: Pick<DirectionView, "slug">,
  projects: ReadonlyArray<Pick<ProjectView, "teamRefs">>,
): PublicPerson[] {
  const seen = new Map<string, PublicPerson>();
  for (const p of projects) for (const m of p.teamRefs) seen.set(m.slug, m);
  for (const p of c.people) if (p.directions.includes(d.slug)) seen.set(p.slug, p);
  return [...seen.values()]
    .filter((p) => p.listed)
    .sort((a, b) => Number(a.isAlumni) - Number(b.isAlumni) || comparePeople(a, b));
}

/**
 * "Work with us on this" (§D5.9): shown when the direction is flagged
 * open_to_collaborators, or when an open/rolling opportunity lists it.
 */
export function workWithUs(
  c: Pick<Content, "opportunities">,
  d: Pick<DirectionView, "slug" | "open_to_collaborators">,
): { show: boolean; openToCollaborators: boolean; opportunities: OpportunityView[] } {
  const opportunities = openOpportunities(c as Content).filter((o) =>
    o.directions.includes(d.slug),
  );
  return {
    show: d.open_to_collaborators || opportunities.length > 0,
    openToCollaborators: d.open_to_collaborators,
    opportunities,
  };
}

/** Max publications listed on a direction page before "See all" carries the rest. */
export const DIRECTION_PUBLICATION_LIMIT = 10;
