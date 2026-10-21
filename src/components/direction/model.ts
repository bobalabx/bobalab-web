/**
 * Pure helpers for the research pages (WP2; brief §D4–§D5, §E5). Everything
 * shown on a direction page is derived here from the loaded Content, so the
 * rules are unit-tested (tests/unit/direction/**) and never hard-coded in JSX.
 */
import type { Content, DirectionView, OpportunityView } from "@/lib/content/load";
import { openOpportunities } from "@/lib/content/queries";
import { CORE_DARK, CORE_LIGHT, blend, contrastRatio, swatchOf } from "@/lib/content/palette";
import type { SwatchId } from "@/lib/content/palette";
import { TRANSITION, type TransitionType } from "@/lib/vt";

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Header status line (§D5.1): "Active since 2021 · 3 projects · 5 papers",
 * computed from content. `active_since` is optional, so the first part is
 * dropped when the lab has not set it. Work in progress is counted separately
 * (D-05) and shown only when there is some.
 */
export function directionStatusParts(
  d: Pick<DirectionView, "status" | "active_since" | "counts">,
): string[] {
  const parts: string[] = [];
  if (d.status === "emerging") {
    parts.push(d.active_since ? `Emerging since ${d.active_since}` : "Emerging");
  } else if (d.status === "active" && d.active_since) {
    parts.push(`Active since ${d.active_since}`);
  }
  parts.push(plural(d.counts.projects, "project"), plural(d.counts.papers, "paper"));
  if (d.counts.inProgress > 0) parts.push(`${d.counts.inProgress} in progress`);
  return parts;
}

export const directionStatusLine = (d: Parameters<typeof directionStatusParts>[0]) =>
  directionStatusParts(d).join(" · ");

/** "See all in Publications →" keeps the direction filter (§D5.6; WP2 acceptance #5). */
export function publicationsHref(slug: string): string {
  return `/publications/?direction=${encodeURIComponent(slug)}`;
}

/**
 * Sibling rail transition type (§E5): moving to a higher index slides forward,
 * to a lower one slides back. From an archived direction (no index) every
 * sibling is "forward".
 */
export function railTransition(
  current: Pick<DirectionView, "index">,
  target: Pick<DirectionView, "index">,
): TransitionType {
  if (current.index == null || target.index == null) return TRANSITION.navForward;
  return target.index > current.index ? TRANSITION.navForward : TRANSITION.navBack;
}

/**
 * Header band colours (§C3): light mode = the swatch tint; dark mode = the
 * swatch's light tone at 10 % over the night paper, computed here (and in
 * tokens.css as --dir-band-d; the unit test checks both agree).
 */
export function bandColors(id: SwatchId) {
  const s = swatchOf(id);
  return {
    light: {
      band: s.tint,
      ink: CORE_LIGHT.ink,
      muted: CORE_LIGHT["ink-muted"],
      link: CORE_LIGHT.accent,
      deep: s.deep,
    },
    dark: {
      band: blend(s.light, CORE_DARK.paper, 0.1),
      ink: CORE_DARK.ink,
      muted: CORE_DARK["ink-muted"],
      link: CORE_DARK.accent,
      deep: s.light,
    },
  };
}

/** Lowest text contrast on the band for a swatch (both modes); must stay ≥ 4.5. */
export function bandMinContrast(id: SwatchId): number {
  const b = bandColors(id);
  return Math.min(
    ...(["light", "dark"] as const).flatMap((m) => {
      const x = b[m];
      return [x.ink, x.muted, x.link, x.deep].map((fg) => contrastRatio(fg, x.band));
    }),
  );
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

/**
 * Direction "last updated" line (§D5.11). The site footer already prints
 * "Last updated {site date}" directly below the page, so the direction's own
 * date is shown only when it says something the footer does not: when its
 * content files last changed on a different (earlier) day (verify VIS-12).
 * Returns null when the footer already carries the same date.
 */
export function directionUpdatedDate(directionDate: string, siteDate: string): string | null {
  if (!directionDate || directionDate === siteDate) return null;
  return directionDate;
}

/** Max publications listed on a direction page before "See all" carries the rest. */
export const DIRECTION_PUBLICATION_LIMIT = 10;
