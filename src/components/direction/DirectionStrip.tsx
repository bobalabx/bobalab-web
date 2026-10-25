/**
 * A direction's papers as a small multiple of Fig. 1 (research index): one
 * dot per counted paper, in YEAR BINS shared by every row of the list (the
 * Fig. 1 grammar, DIRECTION §5.0 RC-15; a linear time axis is a P3 forbidden
 * move: it empties the early years and piles recent papers into one blob),
 * the direction's line from its first paper to "now", and its pearl at now
 * (live directions only; earlier research stops at its last paper).
 * Decorative (aria-hidden): the row's text states the counts, and the axis
 * labels above the list name the bins.
 * Same marks as Fig. 1 and Figure 2: dots are papers, the line is the
 * direction, the disc at now is the pearl.
 */
import type { DirectionView } from "@/lib/content/load";

export interface StripBin {
  year: number;
  /** Most papers any row of the list has in this year: the bin's width in dots. */
  cap: number;
  /** Centre of the bin. */
  x: number;
}

export interface StripAxis {
  bins: StripBin[];
  /** x of "now" (the pearl), or null when no row of the list is live. */
  nowX: number | null;
  /** Width of every strip in the list (px; one scale for all rows). */
  width: number;
}

export const STRIP_H = 24;
const PAD = 6;
const R = 3.25;
/** The first bin's centre: far enough in for its year label to be centred on it. */
const FIRST = 16;
export const STRIP_PITCH = 9;
/** Centre-to-centre gap between bins; also the minimum spacing of axis labels. */
export const STRIP_GAP = 36;
const NOW_GAP = 26;
const PEARL_R = 7;

const count = (years: ReadonlyArray<number | null | undefined>) => {
  const n = new Map<number, number>();
  for (const y of years) if (y) n.set(y, (n.get(y) ?? 0) + 1);
  return n;
};

/**
 * The shared axis of one list: a bin for every year in which any row has a
 * paper, as wide as the fullest row needs, then "now".
 * @param rows the paper years of each row (undated papers are left out of the
 *   strips, never out of the counts)
 */
export function stripAxis(
  rows: ReadonlyArray<ReadonlyArray<number | null | undefined>>,
  withNow = true,
): StripAxis {
  const cap = new Map<number, number>();
  for (const ys of rows) for (const [y, k] of count(ys)) cap.set(y, Math.max(cap.get(y) ?? 0, k));
  let cursor = FIRST;
  const bins = [...cap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, c]) => {
      const w = (c - 1) * STRIP_PITCH;
      const bin = { year, cap: c, x: cursor + w / 2 };
      cursor += w + STRIP_GAP;
      return bin;
    });
  const lastDot = bins.length ? cursor - STRIP_GAP : FIRST;
  const nowX = withNow ? lastDot + R + NOW_GAP : null;
  const width = Math.ceil((nowX != null ? nowX + PEARL_R : lastDot + R) + 1);
  return { bins, nowX, width };
}

/** Dot positions: papers of one year sit side by side, centred on their bin. */
export function stripDots(years: ReadonlyArray<number | null | undefined>, axis: StripAxis) {
  const dots: Array<{ year: number; x: number }> = [];
  for (const [year, n] of [...count(years).entries()].sort(([a], [b]) => a - b)) {
    const bin = axis.bins.find((b) => b.year === year);
    if (!bin) continue;
    for (let k = 0; k < n; k++) dots.push({ year, x: bin.x + (k - (n - 1) / 2) * STRIP_PITCH });
  }
  return dots;
}

/**
 * Axis labels: "now" and the first year always; the other years where they
 * fit (at least STRIP_GAP apart), newest first, so a crowded early stretch
 * loses a label before the recent years do.
 */
export function stripLabels(axis: StripAxis): Array<{ text: string; x: number }> {
  const kept: Array<{ text: string; x: number }> = [];
  const fits = (x: number) => kept.every((k) => Math.abs(k.x - x) >= STRIP_GAP);
  if (axis.nowX != null) kept.push({ text: "now", x: axis.nowX });
  const [first, ...rest] = axis.bins;
  if (first && fits(first.x)) kept.push({ text: String(first.year), x: first.x });
  for (const b of [...rest].reverse()) if (fits(b.x)) kept.push({ text: String(b.year), x: b.x });
  return kept.sort((a, b) => a.x - b.x);
}

export function StripAxisLabels({ axis }: { axis: StripAxis }) {
  return (
    <span className="rs-axis__track" style={{ width: axis.width }}>
      {stripLabels(axis).map((l) => (
        // Centred on its bin (the first bin sits far enough in for that).
        <span key={l.text} style={{ left: l.x }}>
          {l.text}
        </span>
      ))}
    </span>
  );
}

export function DirectionStrip({
  direction: d,
  years,
  axis,
}: {
  direction: Pick<DirectionView, "color" | "status" | "index">;
  years: ReadonlyArray<number | null | undefined>;
  axis: StripAxis;
}) {
  const dots = stripDots(years, axis);
  const live = d.status !== "archived" && d.index != null && axis.nowX != null;
  const y = STRIP_H / 2;
  const x0 = dots[0]?.x;
  const x1 = live ? axis.nowX! : dots[dots.length - 1]?.x;
  const axisEnd = axis.nowX ?? axis.width - R - 1;
  return (
    <svg
      className="rs-strip"
      data-swatch={d.color}
      viewBox={`0 0 ${axis.width} ${STRIP_H}`}
      width={axis.width}
      height={STRIP_H}
      aria-hidden="true"
      focusable="false"
    >
      <line className="rs-strip__axis" x1={PAD} x2={axisEnd} y1={y} y2={y} />
      {x0 != null && x1 != null && x1 > x0 && (
        <line className="rs-strip__line" x1={x0} x2={x1} y1={y} y2={y} />
      )}
      {dots.map((p, i) => (
        <circle key={i} className="rs-strip__dot" cx={p.x} cy={y} r={R} />
      ))}
      {live && <circle className="rs-strip__pearl" cx={axis.nowX!} cy={y} r={PEARL_R} />}
    </svg>
  );
}
