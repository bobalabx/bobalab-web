/**
 * Figure 2 data (P3 `research.html`): one direction's papers on its line, in
 * year bins, with a stub for every paper it shares with another direction,
 * then "now" (the direction's pearl) and the work in progress. Pure, so the
 * packing rules are unit-tested (tests/unit/direction/f2model.test.ts).
 *
 * Packing rule (JUDGE §6 "real packing rules"): every paper and every
 * in-progress item gets its own equal-width column, so labels never overlap.
 * Labels always sit below the line; shared-paper stubs always rise above it
 * (a label is never on the same side as a stub). The horizontal figure is
 * drawn from 64rem; below that, and at any width when there are more than
 * F2_MAX_COLUMNS columns (labels would get too narrow), the same markup is
 * drawn as a vertical list (`fit: "list"`).
 *
 * Order within a year (DIRECTION §5.0 RC-15): by `date_online` where present,
 * otherwise by slug; when any bin with two or more papers falls back to the
 * slug, the caption says so (`orderMeaningful: false`).
 */
import type { DirectionView, PublicationView } from "@/lib/content/load";
import { hasDocumentedPresentation, hasPublicVersion } from "@/lib/content/relations";
import { PUBLICATION_TYPE_LABELS } from "@/components/ui/labels";

export interface F2Other {
  slug: string;
  short_label: string;
  color: DirectionView["color"];
}

export interface F2Item {
  slug: string;
  /** The title up to its colon (or question mark): "Learning on the Go". */
  short: string;
  title: string;
  href: string;
  /** "Journal article, 2025" / "In progress". */
  meta: string;
  /** Other directions this paper belongs to, in editorial order. */
  others: F2Other[];
}

export interface F2Bin {
  year: number | null;
  label: string;
  items: F2Item[];
}

/** "lines": horizontal from 64rem (vertical list below); "list": always the vertical list. */
export type F2Fit = "lines" | "list";

export interface F2Model {
  bins: F2Bin[];
  wip: F2Item[];
  /** Any paper or in-progress item shared with another direction (the stub band above the line is drawn). */
  shared: boolean;
  /** Paper columns + in-progress columns. */
  columns: number;
  fit: F2Fit;
  /** False when some year with two or more papers is ordered by slug, not by date. */
  orderMeaningful: boolean;
}

/** Most columns the horizontal figure takes (≈ 95 px each at 64rem, 137 px at 80rem). */
export const F2_MAX_COLUMNS = 8;

/** "Learning on the Go: Understanding …" → "Learning on the Go"; "Precise or Broad? The …" → "Precise or Broad?". */
export function shortTitle(title: string): string {
  const t = title.trim();
  const colon = t.indexOf(": ");
  const q = t.indexOf("? ");
  const cuts = [colon, q >= 0 ? q + 1 : -1].filter((i) => i > 0);
  if (!cuts.length) return t;
  return t.slice(0, Math.min(...cuts)).trim();
}

/**
 * The type word for a figure label. A `work-in-progress` entry that counts as a
 * paper only because of a documented conference presentation (D-05) is drawn
 * as a filled dot, so "Work in progress" under it would contradict the
 * caption's "open rings are work in progress": it is named for what makes it
 * count, a conference presentation.
 */
export function figureTypeWord(
  p: Pick<PublicationView, "type"> &
    Partial<Pick<PublicationView, "doi" | "links" | "presentations">>,
): string {
  if (
    p.type === "work-in-progress" &&
    !hasPublicVersion({ doi: p.doi, links: p.links ?? {} }) &&
    hasDocumentedPresentation({ presentations: p.presentations ?? [] })
  )
    return "Conference presentation";
  return PUBLICATION_TYPE_LABELS[p.type];
}

export function f2Fit(columns: number): F2Fit {
  return columns <= F2_MAX_COLUMNS ? "lines" : "list";
}

/** RC-15 order inside a year bin: dated (date_online) first by date, then the rest by slug. */
function byDateThenSlug(
  a: Pick<PublicationView, "date_online" | "slug">,
  b: Pick<PublicationView, "date_online" | "slug">,
): number {
  if (a.date_online && b.date_online && a.date_online !== b.date_online)
    return a.date_online < b.date_online ? -1 : 1;
  if (a.date_online && !b.date_online) return -1;
  if (!a.date_online && b.date_online) return 1;
  return a.slug.localeCompare(b.slug);
}

/**
 * @param order directions in editorial order (live, then archived): orders the
 *   stubs of a paper that belongs to several other directions.
 */
export function figure2Model(
  d: Pick<DirectionView, "slug">,
  papers: readonly PublicationView[],
  inProgress: readonly PublicationView[],
  order: readonly DirectionView[],
): F2Model {
  const rank = (slug: string) => {
    const i = order.findIndex((o) => o.slug === slug);
    return i < 0 ? order.length : i;
  };
  const item = (p: PublicationView, meta: string): F2Item => ({
    slug: p.slug,
    short: shortTitle(p.title),
    title: p.title,
    href: `/publications/${p.slug}/`,
    meta,
    others: p.directionRefs
      .filter((x) => x.slug !== d.slug)
      .sort((a, b) => rank(a.slug) - rank(b.slug))
      .map((x) => ({ slug: x.slug, short_label: x.short_label, color: x.color })),
  });

  const byYear = new Map<number | null, PublicationView[]>();
  for (const p of papers) {
    const y = p.year ?? null;
    byYear.set(y, [...(byYear.get(y) ?? []), p]);
  }
  let orderMeaningful = true;
  // Dated bins in order; papers without a year sit in their own bin just before "now".
  const bins: F2Bin[] = [...byYear.entries()]
    .sort(([a], [b]) => (a ?? 9999) - (b ?? 9999))
    .map(([year, pubs]) => {
      if (pubs.length > 1 && pubs.some((p) => !p.date_online)) orderMeaningful = false;
      return {
        year,
        label: year == null ? "Year not given" : String(year),
        items: [...pubs]
          .sort(byDateThenSlug)
          .map((p) => item(p, p.year ? `${figureTypeWord(p)}, ${p.year}` : figureTypeWord(p))),
      };
    });

  const wip = [...inProgress]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((p) => item(p, "In progress"));

  const columns = papers.length + wip.length;
  return {
    bins,
    wip,
    shared: [...bins.flatMap((b) => b.items), ...wip].some((i) => i.others.length > 0),
    columns,
    fit: f2Fit(columns),
    orderMeaningful,
  };
}
