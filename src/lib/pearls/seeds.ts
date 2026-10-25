/**
 * Seed placement for the homepage pearls (DECISIONS D-15, ported from the
 * original Fig. 1 at 4740e10:src/lib/figure/seeds.ts; JUDGE.md "Seeds and orbit").
 *
 * - One flat dot per counted paper (D-05), at most SEED_CAP dots; the label
 *   count always carries the real number.
 * - Dots sit on a hairline orbit around the pearl. Angles are measured
 *   clockwise from 12 o'clock, in degrees.
 * - Up to 5 seeds use fixed clock slots in fill order 12, 1, 11, 2, 10, so
 *   adding a paper fills the next slot and moves nothing else.
 * - With 6 or more seeds the dots are spread evenly across -75°…+75° (the
 *   judge's cap), so no seed reaches 3 or 9 o'clock and dangles beside a label.
 *
 * Pure and deterministic: the same count always gives the same layout. (The
 * original's ±14° "stir" is gone with every other idle motion, D-15.)
 */

export const SEED_CAP = 12;
/** Maximum angle from 12 o'clock (degrees). */
export const SEED_ARC_MAX = 75;
/** Fixed clock slots used while the count is small (12, 1, 11, 2, 10 o'clock). */
export const CLOCK_SLOTS = [0, 30, -30, 60, -60] as const;

export interface Seed {
  /** Fill / stagger order, 0-based (0 = the first paper). */
  k: number;
  /** Angle clockwise from 12 o'clock, degrees, within ±SEED_ARC_MAX. */
  angle: number;
}

const round = (x: number) => Math.round(x * 100) / 100;

/** Number of dots drawn for `papers` counted papers. */
export function seedCount(papers: number): number {
  if (!Number.isFinite(papers) || papers <= 0) return 0;
  return Math.min(SEED_CAP, Math.floor(papers));
}

/** Seeds for a direction with `papers` counted papers, in fill order (k ascending). */
export function seedLayout(papers: number): Seed[] {
  const n = seedCount(papers);
  if (n === 0) return [];
  if (n <= CLOCK_SLOTS.length) {
    return CLOCK_SLOTS.slice(0, n).map((angle, k) => ({ k, angle }));
  }
  // Even spread across the capped arc; fill order alternates outward from the
  // top (smallest |angle| first, the clockwise side before the anticlockwise).
  const step = (2 * SEED_ARC_MAX) / (n - 1);
  const angles = Array.from({ length: n }, (_, j) => round(-SEED_ARC_MAX + j * step));
  const ordered = [...angles].sort(
    (a, b) => Math.abs(a) - Math.abs(b) || (a >= 0 ? -1 : 1) - (b >= 0 ? -1 : 1),
  );
  return ordered.map((angle, k) => ({ k, angle }));
}
