/**
 * Colour tokens and direction swatches (DECISIONS D-13 item 4: P3 "Lines").
 *
 * This module is the machine-readable copy of src/styles/tokens.css.
 * tests/unit/foundation/palette.test.ts checks that both agree, recomputes
 * every contrast pair and fails below WCAG thresholds.
 *
 * Paper is white, ink is near-black, and there is no brand accent: links are
 * ink with an underline. Colour encodes research directions and nothing else.
 * The older token names (surface, paper-alt, plate, ink-muted, accent, …) are
 * kept as aliases of the new set so that every page keeps rendering while the
 * page packages move to the new names; none of them is cream or clay any more.
 */

export const CORE_LIGHT = {
  paper: "#FFFFFF",
  band: "#F2F3F1",
  ink: "#111410",
  muted: "#50564F",
  rule: "#80877F",
  hairline: "#D9DCD6",
  /** D-14: the tea inside the homepage cup drawing only (never a page or panel background). */
  tea: "#F4ECE2",
  /** D-14: the literal dark-mode tea (tokens.css `--tea-dark`; `--tea` switches to it in dark mode). */
  "tea-dark": "#211C17",
  // aliases (legacy names, same values as above)
  surface: "#FFFFFF",
  "paper-alt": "#F2F3F1",
  plate: "#FFFFFF",
  "ink-muted": "#50564F",
  accent: "#111410",
  "accent-strong": "#111410",
  pearl: "#111410",
  "pearl-index": "#FFFFFF",
} as const;

export const CORE_DARK = {
  paper: "#101210",
  band: "#181B18",
  ink: "#E7EAE5",
  muted: "#A6ACA4",
  rule: "#7A8178",
  hairline: "#2B302B",
  tea: "#211C17",
  "tea-dark": "#211C17",
  surface: "#101210",
  "paper-alt": "#181B18",
  plate: "#101210",
  "ink-muted": "#A6ACA4",
  accent: "#E7EAE5",
  "accent-strong": "#E7EAE5",
  /** Dark mode: the pearl is a flat light-ink disc (a black disc would vanish on the dark paper). */
  pearl: "#E7EAE5",
  "pearl-index": "#101210",
} as const;

export type CoreToken = keyof typeof CORE_LIGHT;

export const SWATCH_IDS = [
  "butterfly-pea",
  "oolong",
  "lychee",
  "matcha",
  "jasmine",
  "black-sesame",
  "taro",
  "thai-tea",
] as const;
export type SwatchId = (typeof SWATCH_IDS)[number];

export interface Swatch {
  id: SwatchId;
  name: string;
  /** Light mode: text, lines and marks (the "deep" tone). */
  deep: string;
  /** Light-mode tint: deep at 8% over paper (a highlight, never a page band). */
  tint: string;
  /** Dark mode: text, lines and marks (the "light" tone). */
  light: string;
  /** Faint mark, light mode: deep at 40% over paper (decorative). */
  seedLight: string;
  /** Faint mark, dark mode: light at 35% over the dark paper (decorative). */
  seedDark: string;
  /** Dark-mode tint: light at 10% over the dark paper. */
  bandDark: string;
  reserve: boolean;
}

/**
 * The four live directions use the DIRECTION.md §5.0 tones (minimum CVD
 * ΔE_OK×100 8.2 between them, deep and light). Jasmine, Black sesame, Taro and
 * Thai tea keep their earlier deep/light tones (archived or reserve colours).
 */
export const SWATCHES: Record<SwatchId, Swatch> = {
  "butterfly-pea": {
    id: "butterfly-pea",
    name: "Butterfly pea",
    deep: "#2B4FA8",
    tint: "#EEF1F8",
    light: "#8EA4F7",
    seedLight: "#AAB9DC",
    seedDark: "#3C4561",
    bandDark: "#1D2127",
    reserve: false,
  },
  oolong: {
    id: "oolong",
    name: "Oolong",
    deep: "#6B4500",
    tint: "#F3F0EB",
    light: "#C4943A",
    seedLight: "#C4B599",
    seedDark: "#4F401F",
    bandDark: "#221F14",
    reserve: false,
  },
  lychee: {
    id: "lychee",
    name: "Lychee",
    deep: "#A12C5A",
    tint: "#F7EEF2",
    light: "#F590AE",
    seedLight: "#D9ABBD",
    seedDark: "#603E47",
    bandDark: "#271F20",
    reserve: false,
  },
  matcha: {
    id: "matcha",
    name: "Matcha",
    deep: "#4C7A1E",
    tint: "#F1F4ED",
    light: "#A8DA84",
    seedLight: "#B7CAA5",
    seedDark: "#455839",
    bandDark: "#1F261C",
    reserve: false,
  },
  jasmine: {
    id: "jasmine",
    name: "Jasmine",
    deep: "#1E6660",
    tint: "#EDF3F2",
    light: "#8FD3C9",
    seedLight: "#A5C2BF",
    seedDark: "#3C5651",
    bandDark: "#1D2523",
    reserve: false,
  },
  "black-sesame": {
    id: "black-sesame",
    name: "Black sesame",
    deep: "#45413C",
    tint: "#F0F0EF",
    light: "#CFC8C0",
    seedLight: "#B5B3B1",
    seedDark: "#53524E",
    bandDark: "#232422",
    reserve: false,
  },
  taro: {
    id: "taro",
    name: "Taro (reserve)",
    deep: "#5E4391",
    tint: "#F2F0F6",
    light: "#C6B3EB",
    seedLight: "#BFB4D3",
    seedDark: "#504A5D",
    bandDark: "#222226",
    reserve: true,
  },
  "thai-tea": {
    id: "thai-tea",
    name: "Thai tea (reserve)",
    deep: "#A0461C",
    tint: "#F7F0ED",
    light: "#F2A57A",
    seedLight: "#D9B5A4",
    seedDark: "#5F4535",
    bandDark: "#27211B",
    reserve: true,
  },
};

/** Default assignment order (CVD-checked). */
export const DEFAULT_SWATCH_ORDER: SwatchId[] = [
  "butterfly-pea",
  "oolong",
  "lychee",
  "matcha",
  "jasmine",
  "black-sesame",
];

/**
 * Pairs that are confusable under colour-vision deficiency (validator warns).
 * Smallest ΔE_OK×100 over normal vision and Machado-2009 protan/deutan/tritan
 * simulations, in either the deep or the light tone (recomputed 2026-10-24 for
 * the D-13 tones; every pair below 5).
 */
export const CONFUSABLE_PAIRS: Array<[SwatchId, SwatchId, string]> = [
  ["jasmine", "black-sesame", "ΔE 1.4 under protan simulation (dark mode)"],
  ["matcha", "thai-tea", "ΔE 1.6 under deutan simulation"],
  ["lychee", "thai-tea", "ΔE 3.2 under tritan simulation"],
  ["butterfly-pea", "jasmine", "ΔE 3.3 under tritan simulation"],
  ["taro", "butterfly-pea", "ΔE 4.1 under protan simulation"],
  ["black-sesame", "taro", "ΔE 4.1 under tritan simulation (dark mode)"],
  ["lychee", "jasmine", "ΔE 4.5 under deutan simulation"],
  ["thai-tea", "oolong", "ΔE 4.8 under protan simulation"],
  ["matcha", "jasmine", "ΔE 4.9 under tritan simulation (dark mode)"],
];

// ---------------------------------------------------------------------------
// WCAG 2.x maths

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) throw new Error(`Bad hex colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Alpha-composite `fg` at `alpha` over opaque `bg` (sRGB, as browsers do). */
export function blend(fg: string, bg: string, alpha: number): string {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  return rgbToHex(
    [0, 1, 2].map((i) => f[i]! * alpha + b[i]! * (1 - alpha)) as [number, number, number],
  );
}

export function swatchOf(id: string | undefined | null): Swatch {
  return (id && (SWATCHES as Record<string, Swatch>)[id]) || SWATCHES["black-sesame"];
}
