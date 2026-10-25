/**
 * Geometry of the homepage boba cup (DECISIONS D-14; docs/simplify/JUDGE.md R4, R5,
 * R17; prototype docs/simplify/prototypes/c/c.js `GEO`). Pure functions, no DOM.
 *
 * One drawing, two proportions, both computed on the server:
 *   - "wide"   (≥ 80rem): a tall cup beside the hero text; the label column sits
 *              to its right and the reveal panel opens in that column, level with
 *              the risen pearl. 1 unit ≈ 1 px at 1440.
 *   - "narrow" (< 80rem): a squat cup; the panel opens below it. 1 unit ≈ 0.5 px
 *              at 390.
 * The pearls rest on the cup floor in direction_order; each sends a leader line up
 * and out through the right wall to its word label (a specimen drawing). Pearl size
 * and spacing are defined for any count: 1–4 share one cup width, 5 widens the cup
 * and shrinks the pearls a little, more shrink further (R17: the site has had 6).
 * 0 directions draws the empty cup (the caller says "coming soon").
 */

export type CupKind = "wide" | "narrow";

export interface CupPearlGeo {
  /** Pearl centre x. */
  x: number;
  /** Label row y (where the leader meets the label). */
  ly: number;
}

export interface CupGeo {
  kind: CupKind;
  n: number;
  /** viewBox width and height. */
  W: number;
  H: number;
  /** Outer left and right wall x. */
  L: number;
  R: number;
  rim: number;
  /** Tea surface y. */
  surf: number;
  /** Inner floor y (the pearls rest on it). */
  floor: number;
  /** Outer bottom y. */
  bot: number;
  /** Pearl radius. */
  r: number;
  /** Resting pearl centre y (floor − r). */
  cy: number;
  /** Risen pearl centre y (just under the surface). */
  rise: number;
  /** Label column x. */
  lx: number;
  /** Hint row y (wide: under the labels; narrow: unused, the hint flows below). */
  hy: number;
  pearls: CupPearlGeo[];
  /** Graduation ticks on the right wall (R5: three, hairline). */
  ticks: number[];
  /** Straw: bottom centre (x0, y0), top centre (x1, y1), width. */
  straw: [number, number, number, number, number];
}

interface Spec {
  W0: number; // label column width (W = lx + W0)
  L: number;
  strawW: number;
  strawGap: number; // straw tip centre to the wall
  strawLean: number; // top x offset from the tip (negative leans left)
  strawTop: number;
  rim: number;
  surf: number;
  floor: number;
  base: number; // floor → outer bottom
  H: number;
  rMax: number;
  r5: number;
  rMin: number;
  gap: number;
  area: number; // floor width the pearls share for n ≤ 4
  wallGap: number; // last pearl → right wall
  lead: number; // right wall → label column
  riseGap: number;
  labelGap: number; // top of the pearls → lowest label row
  rowGap: number;
  rowGapMin: number;
  rowTop: number; // the highest a label row may go
  hint: number;
  ticks: [number, number, number];
}

const SPECS: Record<CupKind, Spec> = {
  wide: {
    W0: 372,
    L: 24,
    strawW: 28,
    strawGap: 30,
    strawLean: -9,
    strawTop: 88,
    rim: 126,
    surf: 170,
    floor: 676,
    base: 14,
    H: 728,
    rMax: 29,
    r5: 27,
    rMin: 20,
    gap: 5,
    area: 4 * 58 + 3 * 5 + 22,
    wallGap: 22,
    lead: 52,
    riseGap: 14,
    labelGap: 26,
    rowGap: 44,
    rowGapMin: 38,
    rowTop: 380,
    hint: 58,
    ticks: [300, 344, 388],
  },
  narrow: {
    W0: 318,
    L: 20,
    strawW: 24,
    strawGap: 26,
    strawLean: -7,
    strawTop: 22,
    rim: 52,
    surf: 92,
    floor: 424,
    base: 12,
    H: 444,
    rMax: 34,
    r5: 29,
    rMin: 22,
    gap: 4,
    area: 4 * 68 + 3 * 4 + 8,
    wallGap: 18,
    lead: 34,
    riseGap: 10,
    labelGap: 22,
    rowGap: 54,
    rowGapMin: 44,
    rowTop: 150,
    hint: 0,
    ticks: [104, 128, 152],
  },
};

const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Share of the stage the label column needs for labels of `chars` characters on
 * the narrow cup, whose label size follows the stage width (cup.css: 3.9cqw, never under 12 px; about
 * 0.55 em per character in Archivo 600). "Learning on the Job" (19) fits the
 * default column; a 28-character label (the CMS maximum) widens it, which scales
 * the cup down instead of wrapping labels into each other.
 */
const NARROW_CHAR_SHARE = 0.0235;

export function cupGeometry(n: number, kind: CupKind, labelChars = 0): CupGeo {
  const s = SPECS[kind];
  const count = Math.max(0, Math.floor(n));
  const x0 = s.L + s.strawGap; // straw tip centre
  const a0 = x0 + s.strawW / 2 + 8; // where the pearls' floor starts
  // Radius: full size up to 4; at 5 a little smaller in a wider cup; beyond 5
  // the 5-pearl cup keeps its width and the pearls shrink to fit (never below rMin).
  let r = count <= 4 ? s.rMax : s.r5;
  const span = (k: number, rr: number) => k * 2 * rr + Math.max(0, k - 1) * s.gap;
  const area = Math.max(s.area, count <= 5 ? span(count, r) : span(5, s.r5));
  if (count > 5) r = Math.max(s.rMin, (area - (count - 1) * s.gap) / (2 * count));
  const used = span(count, r);
  const start = a0 + (area - used) / 2 + r;
  const R = a0 + area + s.wallGap;
  const lx = R + s.lead;
  const share = kind === "narrow" ? Math.min(0.66, labelChars * NARROW_CHAR_SHARE) : 0;
  const W = lx + Math.max(s.W0, Math.ceil((lx * share) / (1 - share)));
  const cy = s.floor - r;
  const lyLast = s.floor - 2 * r - s.labelGap;
  // A widened stage (long labels) draws everything smaller, so the label rows get
  // proportionally more units to keep their on-screen spacing (they may then
  // start beside the rim).
  const k = W / (lx + s.W0);
  const rowGap =
    count < 2
      ? 0
      : k > 1
        ? Math.min(s.rowGap * k, (lyLast - 12) / (count - 1))
        : Math.max(s.rowGapMin, Math.min(s.rowGap, (lyLast - s.rowTop) / (count - 1)));
  const pearls = Array.from({ length: count }, (_, i) => ({
    x: r1(start + i * (2 * r + s.gap)),
    ly: r1(lyLast - (count - 1 - i) * rowGap),
  }));
  return {
    kind,
    n: count,
    W: r1(W),
    H: s.H,
    L: s.L,
    R: r1(R),
    rim: s.rim,
    surf: s.surf,
    floor: s.floor,
    bot: s.floor + s.base,
    r: r1(r),
    cy: r1(cy),
    rise: r1(s.surf + r + s.riseGap),
    lx: r1(lx),
    hy: r1(lyLast + s.hint),
    pearls,
    ticks: [...s.ticks],
    straw: [x0, s.floor - 4, x0 + s.strawLean, s.strawTop, s.strawW],
  };
}

const P = (x: number, y: number) => `${r1(x)} ${r1(y)}`;

export interface CupPaths {
  wall: string;
  base: string;
  tea: string;
  surface: string;
  strawIn: string;
  strawOut: string;
  ticks: string[];
}

/** SVG path data for the drawing (C's beaker, flared lip on the left). */
export function cupPaths(g: CupGeo): CupPaths {
  const { L, R, rim, surf, bot, floor } = g;
  const rr = 22; // bottom corner radius
  const wall =
    `M${P(L - 14, rim - 10)} Q${P(L - 2, rim - 6)} ${P(L, rim + 8)} V${bot - rr} ` +
    `Q${P(L, bot)} ${P(L + rr, bot)} H${R - rr} Q${P(R, bot)} ${P(R, bot - rr)} V${rim} ` +
    `Q${P(R, rim - 6)} ${P(R + 6, rim - 8)}`;
  const top = `M${P(L, surf - 4)} Q${P(L + 5, surf)} ${P(L + 14, surf)} H${R - 14} Q${P(R - 5, surf)} ${P(R, surf - 4)}`;
  const tea = `${top} V${bot - rr} Q${P(R, bot)} ${P(R - rr, bot)} H${L + rr} Q${P(L, bot)} ${P(L, bot - rr)} Z`;
  // Straw: tip on the floor, top end above the rim, cut on a slant.
  const [sx0, sy0, sx1, sy1, sw] = g.straw;
  const len = Math.hypot(sx1 - sx0, sy1 - sy0);
  const dx = (sx1 - sx0) / len;
  const dy = (sy1 - sy0) / len;
  const nx = (-dy * sw) / 2;
  const ny = (dx * sw) / 2;
  const t = (surf - sy0) / (sy1 - sy0);
  const mx = sx0 + (sx1 - sx0) * t;
  const cut = 14;
  const strawOut =
    `M${P(mx - nx, surf - ny)} L${P(sx1 - nx + dx * cut, sy1 - ny + dy * cut)} ` +
    `L${P(sx1 + nx - dx * cut, sy1 + ny - dy * cut)} L${P(mx + nx, surf + ny)} Z`;
  const strawIn = `M${P(sx0 - nx, sy0 - ny)} L${P(mx - nx, surf - ny)} L${P(mx + nx, surf + ny)} L${P(sx0 + nx, sy0 + ny)} Z`;
  return {
    wall,
    base: `M${P(L + 10, floor)} H${R - 10}`,
    tea,
    surface: top,
    strawIn,
    strawOut,
    ticks: g.ticks.map((y, i) => `M${P(R - 2, y)} h${i === 1 ? -9 : -16}`),
  };
}

/** CSS custom properties a stage needs for one geometry (suffix -w or -n). */
export function stageVars(g: CupGeo): Record<string, number> {
  const k = g.kind === "wide" ? "w" : "n";
  return {
    [`--W-${k}`]: g.W,
    [`--H-${k}`]: g.H,
    [`--r-${k}`]: g.r,
    [`--cy-${k}`]: g.cy,
    [`--rise-${k}`]: g.rise,
    [`--lx-${k}`]: g.lx,
    [`--hy-${k}`]: g.hy,
    [`--R-${k}`]: g.R,
  };
}

/** CSS custom properties one pearl needs for one geometry. */
export function pearlVars(g: CupGeo, i: number): Record<string, number> {
  const k = g.kind === "wide" ? "w" : "n";
  const p = g.pearls[i]!;
  return { [`--x-${k}`]: p.x, [`--ly-${k}`]: p.ly };
}
