/**
 * Fixed slot templates for Fig. 1 (brief §E2). Deterministic: the layout for a
 * given number of directions never depends on content, so edits never reshuffle
 * the figure. DOM order = slot order = index number (row-major), so focus order
 * matches both the numbers and the visual order.
 */

export interface Slot {
  /** 1-based grid row. */
  row: number;
  /** 1-based starting grid column; every slot spans 2 columns. */
  col: number;
}

export interface Template {
  n: number;
  /** "row" for n ≤ 3 (one row of pearls), "cluster" otherwise. */
  kind: "row" | "cluster";
  columns: number;
  rows: number;
  slots: Slot[];
  /** Pearl diameter in figure mode (container query units). */
  diameter: string;
}

const D_LARGE = "clamp(5rem, 14cqi, 6.5rem)";
const D_MID = "clamp(4.5rem, 11cqi, 6.5rem)";
const D_SMALL = "clamp(4rem, 9cqi, 5.5rem)";

const s = (row: number, col: number): Slot => ({ row, col });

/** Brief §E2 table (n = 2…8). D for n ≤ 4 follows JUDGE.md ("104 px at 1366"). */
export const TEMPLATES: Record<number, Template> = {
  2: { n: 2, kind: "row", columns: 4, rows: 1, slots: [s(1, 1), s(1, 3)], diameter: D_LARGE },
  3: {
    n: 3,
    kind: "row",
    columns: 6,
    rows: 1,
    slots: [s(1, 1), s(1, 3), s(1, 5)],
    diameter: D_LARGE,
  },
  4: {
    n: 4,
    kind: "cluster",
    columns: 5,
    rows: 2,
    slots: [s(1, 1), s(1, 3), s(2, 2), s(2, 4)],
    diameter: D_LARGE,
  },
  5: {
    n: 5,
    kind: "cluster",
    columns: 6,
    rows: 2,
    slots: [s(1, 1), s(1, 3), s(1, 5), s(2, 2), s(2, 4)],
    diameter: D_MID,
  },
  6: {
    n: 6,
    kind: "cluster",
    columns: 7,
    rows: 2,
    slots: [s(1, 1), s(1, 3), s(1, 5), s(2, 2), s(2, 4), s(2, 6)],
    diameter: D_MID,
  },
  7: {
    n: 7,
    kind: "cluster",
    columns: 8,
    rows: 2,
    slots: [s(1, 1), s(1, 3), s(1, 5), s(1, 7), s(2, 2), s(2, 4), s(2, 6)],
    diameter: D_SMALL,
  },
  8: {
    n: 8,
    kind: "cluster",
    columns: 6,
    rows: 3,
    slots: [s(1, 1), s(1, 3), s(1, 5), s(2, 2), s(2, 4), s(3, 1), s(3, 3), s(3, 5)],
    diameter: D_SMALL,
  },
};

export const MIN_FIGURE_N = 2;
export const MAX_FIGURE_N = 8;

/** Template for n directions, or null when the figure is not drawn (n < 2 or n > 8). */
export function templateFor(n: number): Template | null {
  return TEMPLATES[n] ?? null;
}

/** Organic nudge per slot (×D), translate only (brief §E2). */
export const NUDGE_DX = [0, 0.06, -0.04, 0.03, -0.06, 0.05, -0.02, 0.04] as const;
export const NUDGE_DY = [0, 0.08, -0.05, 0.1, -0.07, 0.04, 0.09, -0.03] as const;

/** Idle float (JUDGE.md): periods and negative delays per slot, desynchronised. */
export const FLOAT_PERIOD_S = [7.4, 9.6, 8.3, 10.8, 7.9, 10.2, 8.8, 9.3] as const;
export const FLOAT_DELAY_S = [-1.2, -4.1, -2.7, -6.0, -3.4, -5.2, -0.7, -7.1] as const;

export function nudge(slotIndex0: number): { dx: number; dy: number } {
  return { dx: NUDGE_DX[slotIndex0] ?? 0, dy: NUDGE_DY[slotIndex0] ?? 0 };
}

export function float(slotIndex0: number): { period: number; delay: number } {
  return {
    period: FLOAT_PERIOD_S[slotIndex0] ?? 9,
    delay: FLOAT_DELAY_S[slotIndex0] ?? -3,
  };
}
