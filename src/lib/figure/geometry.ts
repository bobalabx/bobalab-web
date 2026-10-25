/**
 * Fig. 1 geometry (DECISIONS D-13; P3 fig.js `draw()`), expressed so that CSS can
 * lay the figure out at any width without a script.
 *
 * The track is the part of a lane right of the 18rem label column (12.5rem from
 * 48rem). Inside it, with W = track width − PAD:
 *   Z  = clamp(zmin, 0.24·W, zmax)            the in-progress zone after "now"
 *   cw = clamp(12px, (W − Z − G) / cols, 64px) column pitch (G = bin gaps)
 *   x(col, bin) = PAD + (col + ½)·cw + bin·GAP
 *   now = PAD + cols·cw + G + NOW_GAP
 * figure.css evaluates exactly these formulas with custom properties; this file
 * mirrors them to find the widths where the layout changes, and writes those as
 * container queries (the thresholds depend on the data, so they cannot live in
 * the static stylesheet):
 *   - packed (cw < 28 px, P3's rule): 10 px dots, links become twin rings;
 *   - strip  (cw would be < 12 px): the figure becomes the phone layout.
 * Every length is in rem (px values below are at the 16 px root), so enlarged
 * text scales the whole figure and moves it to packed columns or strips sooner
 * instead of crowding labels (WCAG 1.4.4, 1.4.10).
 */

export const PAD = 16;
export const GAP = 16;
export const NOW_GAP = 20;
export const CW_MIN = 12;
export const CW_MAX = 64;
export const PACK_AT = 28;
export const Z_FRAC = 0.24;
export const Z_MIN = 140;
export const Z_MAX = 230;
export const RING_X0 = 40;
export const RING_PITCH = 22;
/** Label column widths (src/styles/tokens.css `--lab`). */
export const LAB_TABLET_REM = 12.5;
export const LAB_DESKTOP_REM = 18;
/** Track at a 1366 px viewport: 1366 − 2·32 (gutters) − 288 (18rem label column). */
export const REF_TRACK_W = 1366 - 64 - 288;

export interface GeoInput {
  cols: number;
  bins: number;
  wipMax: number;
}

export function zone(wipMax: number): { zmin: number; zmax: number } {
  // Room for the pearl's right half and every ring of the busiest lane, plus air.
  const need = wipMax > 0 ? RING_X0 + (wipMax - 1) * RING_PITCH + 7 + 24 : 0;
  const zmin = Math.max(Z_MIN, need);
  return { zmin, zmax: Math.max(Z_MAX, zmin) };
}

const gaps = (bins: number) => Math.max(0, bins - 1) * GAP;

/** Unclamped column pitch at a given track width. */
export function rawPitch(track: number, g: GeoInput): number {
  const W = track - PAD;
  const { zmin, zmax } = zone(g.wipMax);
  const Z = Math.min(zmax, Math.max(zmin, W * Z_FRAC));
  return (W - Z - gaps(g.bins)) / Math.max(1, g.cols);
}

export function pitch(track: number, g: GeoInput): number {
  return Math.min(CW_MAX, Math.max(CW_MIN, rawPitch(track, g)));
}

export function fitsAt(track: number, g: GeoInput): boolean {
  return g.cols === 0 || rawPitch(track, g) >= CW_MIN;
}

/** Smallest track width (px, rounded up) at which the raw pitch reaches `c`. */
export function trackFor(c: number, g: GeoInput): number {
  const { zmin, zmax } = zone(g.wipMax);
  const R = c * Math.max(1, g.cols) + gaps(g.bins);
  // W − Z(W) = R, with Z piecewise in W.
  const cands = [
    { W: R + zmin, ok: (W: number) => W * Z_FRAC <= zmin },
    { W: R / (1 - Z_FRAC), ok: (W: number) => W * Z_FRAC >= zmin && W * Z_FRAC <= zmax },
    { W: R + zmax, ok: (W: number) => W * Z_FRAC >= zmax },
  ];
  const W = cands.find((k) => k.ok(k.W))?.W ?? R + zmax;
  return Math.ceil(W + PAD);
}

/** Custom properties set on the plate (lengths without percentages). */
/** px at the 16 px root → rem. */
export const rem = (px: number) => `${Math.round((px / 16) * 10000) / 10000}rem`;

export function plateVars(g: GeoInput): Record<`--${string}`, string | number> {
  const { zmin, zmax } = zone(g.wipMax);
  return {
    "--f1-cols": Math.max(1, g.cols),
    "--f1-G": rem(gaps(g.bins)),
    "--f1-zmin": rem(zmin),
    "--f1-zmax": rem(zmax),
  };
}

/**
 * Strip (list) layout: each direction becomes a strip of its papers by year,
 * the pearl, then its rings (P3 mobile). Used below 48rem, for one or more than
 * eight directions, and where the lanes cannot fit (container query).
 * Kept free of quotes, `<`, `>` and `&` so it is safe as <style> text.
 */
export const LIST_CSS = [
  ".f1-plate{--f1-mode:list}",
  ".f1-axis,.f1-body::before,.f1-body::after,.f1-ln,.f1-gap,.f1-seg{display:none}",
  ".f1-item{display:block;min-height:0;padding:16px 0 18px}",
  ".f1-lab{padding:0}",
  ".f1-shares{position:static;width:auto;height:auto;margin:2px 0 0;overflow:visible;clip:auto;clip-path:none;white-space:normal}",
  ".f1-track{display:flex;flex-wrap:wrap;align-items:center;row-gap:8px;margin-top:10px}",
  // The strip's dot is a 22×24 cell (line + disc), so the packed layout's twin
  // outline must not draw around it (it would box the cell; strips name shared
  // papers in the shares sentence instead).
  ".f1-dot,.f1-dot.is-tw{position:relative;left:auto;top:auto;width:22px;height:24px;border-radius:0;background:none;flex:none;outline:none}",
  ".f1-dot::before{inset:11px 0 auto;height:0;border-radius:0;border-top:1px solid var(--dir)}",
  ".f1-dot::after{display:block}",
  ".f1-y{display:block}",
  ".f1-pearl-at{position:relative;left:auto;top:auto;width:24px;height:24px;margin:0 10px 0 6px;flex:none}",
  ".f1-ring{position:relative;left:auto;top:auto;margin:0 8px 0 0;flex:none}",
  ".f1-cap-d{display:none}",
  ".f1-cap-m{display:inline}",
].join("");

/** Packed columns (P3: pitch below 28 px): smaller dots, links become twin rings. */
export const PACKED_CSS = [
  ".f1-track{--r:0.3125rem}",
  ".f1-seg,.f1-gap{display:none}",
  ".f1-dot.is-tw{outline:1.5px solid var(--ink);outline-offset:2px}",
  ".f1-yr[data-narrow] .f1-yr-c{display:none}",
  ".f1-yr[data-narrow] .f1-yr-a{display:inline}",
  ".f1-cv-l{display:none}",
  ".f1-cv-r{display:inline}",
].join("");

const cq = (lab: number, track: number, css: string) =>
  `@container f1 (max-width:${rem(lab * 16 + track - 0.02)}){${css}}`;

/**
 * The figure's data-dependent stylesheet: strips below 48rem; packed and strip
 * thresholds in each desktop range. Both are always written: with enlarged text
 * (rem lengths grow) they occur at any viewport width.
 */
export function figureCss(g: GeoInput, listOnly: boolean): string {
  if (listOnly) return LIST_CSS;
  const pack = trackFor(PACK_AT, g);
  const list = trackFor(CW_MIN, g);
  const range = (lab: number) => cq(lab, pack, PACKED_CSS) + cq(lab, list, LIST_CSS);
  return (
    `@media (max-width:47.99rem){${LIST_CSS}}` +
    `@media (min-width:48rem) and (max-width:63.99rem){${range(LAB_TABLET_REM)}}` +
    `@media (min-width:64rem){${range(LAB_DESKTOP_REM)}}`
  );
}
