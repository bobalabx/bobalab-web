/**
 * Fig. 1 "Lines" model (DECISIONS D-13; prototype docs/redesign/prototypes/p3/fig.js,
 * JUDGE.md refinements 3–5). Built at build time from the loaded Content, so the
 * figure is server-rendered and needs no script to draw.
 *
 * - One lane per live direction, in `site.direction_order` (the loader's order).
 * - One dot per counted paper (D-05) with a year, in that paper's year bin; a paper
 *   in two directions is a dot on both lanes, joined by a vertical link that passes
 *   over any lane between them (that lane's line gets a paper-coloured gap).
 * - Each lane line starts at its own first paper and runs to the "now" rule, where
 *   the lane ends in its pearl (the morph source). Work in progress (not counted
 *   under D-05) sits after "now" as open rings, in no particular order.
 * - Columns: by default every paper has its own column, ordered (year, slug), so the
 *   x position inside a bin is arrival order, not a measurement.
 * - Overflow rule (P3 NOTES "RC-19", stated but not built there): when the columns no
 *   longer fit at the reference width (1366 px) at the 12 px minimum pitch, the oldest
 *   year bins are merged ("2021–2023") and packed per lane: papers that do not share a
 *   lane (or a link path) share a column. Merging continues one year at a time until
 *   the figure fits. Narrower viewports that still cannot fit fall back to the strip
 *   (list) layout through container queries (see ./geometry.ts).
 */
import type { Content, DirectionView, PublicationView } from "@/lib/content/load";
import type { SwatchId } from "@/lib/content/palette";
import type { PublicationType } from "@/lib/content/schema";
import { fitsAt, REF_TRACK_W } from "./geometry";

export const MIN_FIGURE_N = 2;
export const MAX_FIGURE_N = 8;

export type FigureState =
  /** 0 live directions: "Research directions coming soon". */
  | "empty"
  /** 1 direction: the strip (list) layout only. */
  | "single"
  /** 2–8 directions: the lanes figure (strips below 48rem). */
  | "figure"
  /** More than 8: the validator errors; strips only. */
  | "overflow";

export interface FigureDot {
  /** Paper slug. */
  s: string;
  year: number;
  /** Global column (0-based) and bin index. */
  col: number;
  bin: number;
  /** Arrival delay (ms) for the intro. */
  t: number;
  /** The paper is in more than one direction of the figure. */
  twin: boolean;
  /** Lanes (direction slugs) of the paper, figure order. */
  lanes: string[];
}

export interface FigureSeg {
  s: string;
  col: number;
  /** "down": centre → bottom (upper end), "through": full lane, "up": top → centre. */
  part: "down" | "through" | "up";
  t: number;
  lanes: string[];
}

export interface FigureWip {
  slug: string;
  title: string;
  lanes: string[];
}

export interface FigureShare {
  slug: string;
  label: string;
  count: number;
}

export interface FigureLane {
  slug: string;
  /** 1-based position in direction_order. */
  index: number;
  label: string;
  title: string;
  question?: string;
  summary?: string;
  swatch: SwatchId;
  draft: boolean;
  href: string;
  /** D-05 count (the number in the link's accessible name). */
  papers: number;
  inProgress: number;
  /** Dots in strip order (year, slug); desktop positions come from `col`. */
  dots: FigureDot[];
  /** Column of the lane's first dot (where its line starts), null without dots. */
  first: number | null;
  /** Arrival delay of the line (ms). */
  lineT: number;
  /** Columns where a link passes over this lane's line. */
  gaps: number[];
  segs: FigureSeg[];
  wip: FigureWip[];
  shares: FigureShare[];
}

export interface FigurePaper {
  slug: string;
  title: string;
  year: number;
  type: PublicationType;
  brief?: string;
  lanes: string[];
  col: number;
  bin: number;
}

export interface FigureBin {
  from: number;
  to: number;
  /** "2025" or "2021–2023". */
  label: string;
  col0: number;
  cols: number;
  /** Lane-packed (a merged bin). */
  packed: boolean;
}

export interface FigureModel {
  n: number;
  state: FigureState;
  lanes: FigureLane[];
  papers: FigurePaper[];
  bins: FigureBin[];
  /** Total columns across bins. */
  cols: number;
  /** Number of oldest years merged into the first bin (0 = none). */
  merged: number;
  wipMax: number;
  /** Some link passes over a lane between its two ends. */
  passesOver: boolean;
  /** Largest number of directions one paper belongs to. */
  maxShare: number;
  /** When the intro ends (ms): lines reach "now". */
  end: number;
  asOf: string;
  draftCount: number;
  /** Year of the oldest paper on the figure (null without papers). */
  firstYear: number | null;
}

export function figureState(n: number): FigureState {
  if (n <= 0) return "empty";
  if (n === 1) return "single";
  if (n > MAX_FIGURE_N) return "overflow";
  return "figure";
}

export interface FigureInput {
  directions: readonly DirectionView[];
  /** Counted publications (D-05). */
  countedPublications: readonly PublicationView[];
  /** Work in progress (not counted). */
  inProgress?: readonly PublicationView[];
  today: string;
  /** Track width (px) the layout must fit at the minimum pitch; default 1366 px viewport. */
  fitWidth?: number;
}

const bySlug = (a: { slug: string }, b: { slug: string }) => a.slug.localeCompare(b.slug);

interface Placed {
  p: FigurePaper;
  /** Lane indices (figure order). */
  li: number[];
}

/**
 * Column assignment for the given number of merged oldest years; `packAll` also
 * packs the single-year bins per lane.
 */
function assign(placed: Placed[], years: number[], merged: number, packAll = false) {
  const bins: FigureBin[] = [];
  const groups: Placed[][] = [];
  const firstTo = merged > 0 ? years[merged]! : years[0]!;
  if (years.length) {
    groups.push(placed.filter((x) => x.p.year <= firstTo));
    bins.push({
      from: years[0]!,
      to: firstTo,
      label: merged > 0 ? `${years[0]}–${firstTo}` : String(years[0]),
      col0: 0,
      cols: 0,
      packed: merged > 0 || packAll,
    });
    for (const y of years.slice(merged + 1)) {
      groups.push(placed.filter((x) => x.p.year === y));
      bins.push({ from: y, to: y, label: String(y), col0: 0, cols: 0, packed: packAll });
    }
  }
  let col = 0;
  bins.forEach((b, k) => {
    b.col0 = col;
    const g = groups[k]!;
    if (b.packed) {
      // Lane-aware packing: a paper occupies every lane from its first to its last
      // (the link passes over the lanes between), so nothing crosses a dot.
      const used = new Map<number, Set<number>>();
      let width = 0;
      for (const x of g) {
        const lo = Math.min(...x.li);
        const hi = Math.max(...x.li);
        let c = 0;
        const free = (c: number) => {
          for (let l = lo; l <= hi; l++) if (used.get(l)?.has(c)) return false;
          return true;
        };
        while (!free(c)) c++;
        for (let l = lo; l <= hi; l++) {
          if (!used.has(l)) used.set(l, new Set());
          used.get(l)!.add(c);
        }
        x.p.col = col + c;
        x.p.bin = k;
        width = Math.max(width, c + 1);
      }
      b.cols = width;
    } else {
      g.forEach((x, j) => {
        x.p.col = col + j;
        x.p.bin = k;
      });
      b.cols = g.length;
    }
    col += b.cols;
  });
  return { bins, cols: col };
}

const and = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/** "Shares 3 papers with Platform Work and 1 with Algorithmic Advice." */
export function sharesSentence(shares: FigureShare[]): string | null {
  if (!shares.length) return null;
  const parts = shares.map((s, i) =>
    i === 0 ? `${plural(s.count, "paper")} with ${s.label}` : `${s.count} with ${s.label}`,
  );
  return `Shares ${and(parts)}.`;
}

export function buildFigureModel(input: FigureInput): FigureModel {
  const n = input.directions.length;
  const state = figureState(n);
  const order = new Map(input.directions.map((d, i) => [d.slug, i]));
  const live = (slugs: readonly string[]) =>
    slugs.filter((s) => order.has(s)).sort((a, b) => order.get(a)! - order.get(b)!);

  // Papers on the figure: counted, with a year, in at least one live direction.
  const placed: Placed[] = input.countedPublications
    .filter((p) => typeof p.year === "number" && live(p.directions).length > 0)
    .map((p) => {
      const lanes = live(p.directions);
      return {
        p: {
          slug: p.slug,
          title: p.title,
          year: p.year as number,
          type: p.type,
          brief: p.in_brief,
          lanes,
          col: 0,
          bin: 0,
        },
        li: lanes.map((s) => order.get(s)!),
      };
    })
    .sort((a, b) => a.p.year - b.p.year || bySlug(a.p, b.p));
  const years = [...new Set(placed.map((x) => x.p.year))];

  const wips: FigureWip[] = (input.inProgress ?? [])
    .filter((p) => live(p.directions).length > 0)
    .map((p) => ({ slug: p.slug, title: p.title, lanes: live(p.directions) }))
    .sort((a, b) => a.title.localeCompare(b.title));
  const wipMax = Math.max(
    0,
    ...input.directions.map((d) => wips.filter((w) => w.lanes.includes(d.slug)).length),
  );

  // Overflow rule. In order, the first layout whose columns fit at the reference
  // width at the 12 px minimum pitch:
  //   1. every paper its own column;
  //   2. the oldest years merged into one bin, packed per lane, one more year at a
  //      time;
  //   3. every year packed per lane (years kept), then 4. merged from the oldest.
  // The newest year always keeps its own bin (P3 NOTES: merge the *oldest* bins),
  // so the figure never loses its time axis. If even step 4 does not fit, the most
  // compact layout is kept and the container queries draw strips wherever it cannot
  // fit (geometry.ts figureCss).
  const fitW = input.fitWidth ?? REF_TRACK_W;
  const fits = (l: ReturnType<typeof assign>) =>
    fitsAt(fitW, { cols: l.cols, bins: l.bins.length, wipMax });
  const steps: Array<[number, boolean]> = [[0, false]];
  for (let m = 1; m < years.length - 1; m++) steps.push([m, false]);
  for (let m = 0; m < Math.max(1, years.length - 1); m++) steps.push([m, true]);
  let merged = 0;
  let layout = assign(placed, years, 0);
  for (const [m, all] of steps) {
    layout = assign(placed, years, m, all);
    merged = m;
    if (fits(layout)) break;
  }

  // Arrival: papers in (year, slug) order, 60 ms beat between bins; the per-paper
  // stagger shrinks with many papers so the intro always ends within 2 s.
  const N = placed.length;
  const step = N ? Math.min(30, 900 / N) : 30;
  const T = new Map<string, number>();
  placed.forEach((x, i) => T.set(x.p.slug, Math.round(120 + i * step + x.p.bin * 60)));
  const end = Math.round(120 + N * step + layout.bins.length * 60);

  let passesOver = false;
  const lanes: FigureLane[] = input.directions.map((d, li) => {
    const mine = placed.filter((x) => x.p.lanes.includes(d.slug));
    const dots: FigureDot[] = mine.map((x) => ({
      s: x.p.slug,
      year: x.p.year,
      col: x.p.col,
      bin: x.p.bin,
      t: T.get(x.p.slug)!,
      twin: x.p.lanes.length > 1,
      lanes: x.p.lanes,
    }));
    const first = dots.length ? Math.min(...dots.map((x) => x.col)) : null;
    const firstDot = dots.find((x) => x.col === first);
    const segs: FigureSeg[] = [];
    const gaps: number[] = [];
    for (const x of placed) {
      if (x.li.length < 2) continue;
      const lo = Math.min(...x.li);
      const hi = Math.max(...x.li);
      if (li < lo || li > hi) continue;
      const part = li === lo ? "down" : li === hi ? "up" : "through";
      segs.push({ s: x.p.slug, col: x.p.col, part, t: T.get(x.p.slug)! + 200, lanes: x.p.lanes });
      if (part === "through" && !x.li.includes(li) && first !== null && x.p.col >= first) {
        gaps.push(x.p.col);
        passesOver = true;
      }
    }
    const shareMap = new Map<string, number>();
    for (const x of mine)
      for (const o of x.p.lanes) if (o !== d.slug) shareMap.set(o, (shareMap.get(o) ?? 0) + 1);
    const shares = [...shareMap.entries()]
      .map(([slug, count]) => ({
        slug,
        count,
        label: input.directions[order.get(slug)!]!.short_label,
      }))
      .sort((a, b) => b.count - a.count || order.get(a.slug)! - order.get(b.slug)!);
    return {
      slug: d.slug,
      index: d.index ?? li + 1,
      label: d.short_label,
      title: d.title,
      question: d.question,
      summary: d.summary,
      swatch: d.color,
      draft: d.draft,
      href: `/research/${d.slug}/`,
      papers: d.counts.papers,
      inProgress: d.counts.inProgress,
      dots,
      first,
      lineT: firstDot?.t ?? end,
      gaps,
      segs,
      wip: wips.filter((w) => w.lanes.includes(d.slug)),
      shares,
    };
  });

  return {
    n,
    state,
    lanes,
    papers: placed.map((x) => x.p),
    bins: layout.bins,
    cols: layout.cols,
    merged,
    wipMax,
    passesOver,
    maxShare: Math.max(1, ...placed.map((x) => x.p.lanes.length)),
    end,
    asOf: input.today,
    draftCount: lanes.filter((l) => l.draft).length,
    firstYear: years[0] ?? null,
  };
}

export function buildFigure(c: Content): FigureModel {
  return buildFigureModel({
    directions: c.directions,
    countedPublications: c.countedPublications,
    inProgress: c.inProgress,
    today: c.today,
  });
}

/** "1 paper" / "7 papers". */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight"];
/** 4 → "four" (up to eight; digits beyond). */
export const numberWord = (n: number) => WORDS[n] ?? String(n);

/** "4 papers, 2 in progress" split for the lane label: [count, rest]. */
export function laneCounts(l: Pick<FigureLane, "papers" | "inProgress">): [string, string] {
  return [plural(l.papers, "paper"), l.inProgress ? `, ${l.inProgress} in progress` : ""];
}

/** "Algorithmic Advice and Learning on the Job". */
export const joinAnd = and;
