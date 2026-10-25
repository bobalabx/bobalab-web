/**
 * The homepage pearl figure's model (DECISIONS D-15; ported from the original
 * Fig. 1 model at 4740e10:src/lib/figure/buildFigure.ts). Built at build time
 * from the live directions in editorial order (archived and, in production,
 * draft directions are already removed by the loader): counts from the D-05
 * counting rule, the hover caption from `homeQuestion` (queries.ts), and the
 * fixed slot template for n.
 */
import type { DirectionView } from "@/lib/content/load";
import type { SwatchId } from "@/lib/content/palette";
import { seedLayout, type Seed } from "./seeds";
import { MAX_FIGURE_N, nudge, templateFor, type Slot, type Template } from "./templates";

export interface PearlItem {
  slug: string;
  /** short_label (≤ 28 characters). */
  label: string;
  href: string;
  swatch: SwatchId;
  draft: boolean;
  papers: number;
  inProgress: number;
  /** The caption on hover / focus: `home_question`, else `question`, else the summary. */
  question?: string;
  /** Dots drawn on the orbit (≤ 12), in fill order. */
  seeds: Seed[];
  /** Slot in the cluster template (null when the compact grid is used at every width). */
  slot: Slot | null;
  nudge: { dx: number; dy: number };
}

/**
 * - "empty": no live direction (the hero says research directions are coming soon);
 * - "grid": 1 or more than 8 directions, the compact grid at every width;
 * - "cluster": 2–8 directions, the slot template from the figure-mode width.
 */
export type PearlsState = "empty" | "grid" | "cluster";

export interface PearlsModel {
  n: number;
  state: PearlsState;
  template: Template | null;
  items: PearlItem[];
}

export function pearlsState(n: number): PearlsState {
  if (n <= 0) return "empty";
  if (n === 1 || n > MAX_FIGURE_N) return "grid";
  return "cluster";
}

type Dir = Pick<
  DirectionView,
  "slug" | "short_label" | "color" | "draft" | "counts" | "homeQuestion" | "summary"
>;

export function buildPearls(directions: readonly Dir[]): PearlsModel {
  const n = directions.length;
  const state = pearlsState(n);
  const template = state === "cluster" ? templateFor(n) : null;
  const items = directions.map<PearlItem>((d, i) => ({
    slug: d.slug,
    label: d.short_label,
    href: `/research/${d.slug}/`,
    swatch: d.color,
    draft: d.draft,
    papers: d.counts.papers,
    inProgress: d.counts.inProgress,
    question: d.homeQuestion ?? d.summary,
    seeds: seedLayout(d.counts.papers),
    slot: template?.slots[i] ?? null,
    nudge: nudge(i),
  }));
  return { n, state, template, items };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "4 papers, 2 in progress" (the wording of the research pages). */
export function countsLine(c: { papers: number; inProgress: number }): string {
  return `${plural(c.papers, "paper")}${c.inProgress ? `, ${c.inProgress} in progress` : ""}`;
}

/** The label's quiet count: "4 papers". */
export const papersLine = (papers: number) => plural(papers, "paper");

/** The default caption: one plain sentence (D-15). */
export const PEARLS_LEGEND =
  "Each pearl is a research direction; each small dot is one of its papers.";
