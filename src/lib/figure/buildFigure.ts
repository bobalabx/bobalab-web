/**
 * Fig. 1 model (brief §E1–§E9, DECISIONS D-02a, D-05). Built at build time from
 * the loaded Content: live directions in editorial order (archived and, in
 * production, draft directions are already removed by the loader), counts from
 * the D-05 counting rule, and the fixed slot template for n.
 */
import type { Content, DirectionView, PublicationView } from "@/lib/content/load";
import type { SwatchId } from "@/lib/content/palette";
import { float, nudge, templateFor, MAX_FIGURE_N, type Slot, type Template } from "./templates";
import { seedCount } from "./seeds";

export interface FigureItem {
  slug: string;
  /** 1-based index (01…0N). */
  index: number;
  /** short_label (≤ 28 characters). */
  label: string;
  title: string;
  summary?: string;
  papers: number;
  projects: number;
  since?: number;
  swatch: SwatchId;
  draft: boolean;
  href: string;
  /** Dots drawn on the orbit (≤ 12). */
  seeds: number;
  /** Slot in the figure template (null in list-only states). */
  slot: Slot | null;
  nudge: { dx: number; dy: number };
  float: { period: number; delay: number };
  /** Years of the counted papers, ascending (dot-plot fallback, C10). */
  years: number[];
}

export type FigureState =
  /** 0 live directions: "Research directions coming soon" (§E9). */
  | "empty"
  /** 1 direction: list mode only, the figure is suppressed. */
  | "single"
  /** 2–8 directions: slot templates (or the dot plot). */
  | "figure"
  /** > 8: the validator errors; render the list only. */
  | "overflow";

export interface FigureModel {
  n: number;
  state: FigureState;
  /** site.figure_mode. */
  mode: "cluster" | "dotplot";
  template: Template | null;
  items: FigureItem[];
  /** Build date (counts "as of"). */
  asOf: string;
  draftCount: number;
  /** Shared year axis for the dot plot (inclusive), null when no paper has a year. */
  yearRange: [number, number] | null;
}

export function figureState(n: number): FigureState {
  if (n <= 0) return "empty";
  if (n === 1) return "single";
  if (n > MAX_FIGURE_N) return "overflow";
  return "figure";
}

export interface FigureInput {
  directions: readonly DirectionView[];
  countedPublications: readonly PublicationView[];
  figureMode?: "cluster" | "dotplot";
  today: string;
}

export function buildFigureModel(input: FigureInput): FigureModel {
  const n = input.directions.length;
  const state = figureState(n);
  const template = state === "figure" ? templateFor(n) : null;
  const items: FigureItem[] = input.directions.map((d, i) => {
    const years = input.countedPublications
      .filter((p) => p.directions.includes(d.slug) && typeof p.year === "number")
      .map((p) => p.year as number)
      .sort((a, b) => a - b);
    return {
      slug: d.slug,
      index: d.index ?? i + 1,
      label: d.short_label,
      title: d.title,
      summary: d.summary,
      papers: d.counts.papers,
      projects: d.counts.projects,
      since: d.active_since,
      swatch: d.color,
      draft: d.draft,
      href: `/research/${d.slug}/`,
      seeds: seedCount(d.counts.papers),
      slot: template?.slots[i] ?? null,
      nudge: nudge(i),
      float: float(i),
      years,
    };
  });
  const allYears = items.flatMap((it) => it.years);
  const yearRange: [number, number] | null = allYears.length
    ? [Math.min(...allYears), Math.max(...allYears)]
    : null;
  return {
    n,
    state,
    mode: input.figureMode ?? "cluster",
    template,
    items,
    asOf: input.today,
    draftCount: items.filter((it) => it.draft).length,
    yearRange,
  };
}

export function buildFigure(c: Content): FigureModel {
  return buildFigureModel({
    directions: c.directions,
    countedPublications: c.countedPublications,
    figureMode: c.site.figure_mode,
    today: c.today,
  });
}

/** "1 paper" / "7 papers". */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Caption meta line: "N projects · N papers · since YYYY" (§E3). */
export function metaLine(it: Pick<FigureItem, "projects" | "papers" | "since">): string {
  const parts = [plural(it.projects, "project"), plural(it.papers, "paper")];
  if (it.since) parts.push(`since ${it.since}`);
  return parts.join(" · ");
}
