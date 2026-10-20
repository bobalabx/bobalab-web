/**
 * Colour tokens and direction swatches (brief §C2–§C3).
 *
 * This module is the machine-readable copy of src/styles/tokens.css.
 * tests/unit/foundation/palette.test.ts checks that both agree, recomputes
 * every contrast pair listed in the brief and fails below WCAG thresholds.
 */

export const CORE_LIGHT = {
  paper: "#FCFAF6",
  surface: "#FFFFFF",
  "paper-alt": "#F4F0EA",
  plate: "#F7F1E8",
  ink: "#1F1712",
  "ink-muted": "#5C4F45",
  accent: "#8A4515",
  "accent-strong": "#6B3410",
  rule: "#857463",
  hairline: "#D8CAB6",
  pearl: "#2B1D15",
  "pearl-index": "#F7F1E8",
} as const;

export const CORE_DARK = {
  paper: "#17110E",
  surface: "#221A15",
  "paper-alt": "#1C1511",
  plate: "#1E1713",
  ink: "#F3ECE2",
  "ink-muted": "#BFB2A5",
  accent: "#E0A46B",
  "accent-strong": "#EDBD8F",
  rule: "#8A7766",
  hairline: "#3D3129",
  pearl: "#3A2C22",
  "pearl-rim": "#A47E62",
  "pearl-index": "#F3ECE2",
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
  /** Text and accents (light mode). */
  deep: string;
  /** Light-mode header band. */
  tint: string;
  /** Dark-mode accent. */
  light: string;
  /** Seed dot, light mode: deep at 40% over --plate. */
  seedLight: string;
  /** Seed dot, dark mode: light at 35% over the dark plate. */
  seedDark: string;
  /** Dark header band: light at 10% over night. */
  bandDark: string;
  reserve: boolean;
}

export const SWATCHES: Record<SwatchId, Swatch> = {
  "butterfly-pea": {
    id: "butterfly-pea",
    name: "Butterfly pea",
    deep: "#2F519B",
    tint: "#DFE6F5",
    light: "#A9C0F2",
    seedLight: "#A7B1C9",
    seedDark: "#4F5261",
    bandDark: "#262325",
    reserve: false,
  },
  oolong: {
    id: "oolong",
    name: "Oolong",
    deep: "#7A5913",
    tint: "#F1E8CC",
    light: "#E3C26E",
    seedLight: "#C5B493",
    seedDark: "#635333",
    bandDark: "#2B2318",
    reserve: false,
  },
  lychee: {
    id: "lychee",
    name: "Lychee",
    deep: "#993452",
    tint: "#F5DFE5",
    light: "#F0A5BC",
    seedLight: "#D1A5AC",
    seedDark: "#68494E",
    bandDark: "#2D201F",
    reserve: false,
  },
  matcha: {
    id: "matcha",
    name: "Matcha",
    deep: "#3E6A2F",
    tint: "#E3ECD8",
    light: "#A9CF8F",
    seedLight: "#ADBB9E",
    seedDark: "#4F573E",
    bandDark: "#26241B",
    reserve: false,
  },
  jasmine: {
    id: "jasmine",
    name: "Jasmine",
    deep: "#1E6660",
    tint: "#D8EBE8",
    light: "#8FD3C9",
    seedLight: "#A0B9B2",
    seedDark: "#465953",
    bandDark: "#232421",
    reserve: false,
  },
  "black-sesame": {
    id: "black-sesame",
    name: "Black sesame",
    deep: "#45413C",
    tint: "#E6E2DC",
    light: "#CFC8C0",
    seedLight: "#B0ABA3",
    seedDark: "#5C5550",
    bandDark: "#292320",
    reserve: false,
  },
  taro: {
    id: "taro",
    name: "Taro (reserve)",
    deep: "#5E4391",
    tint: "#ECE5F4",
    light: "#C6B3EB",
    seedLight: "#BAABC5",
    seedDark: "#594E5F",
    bandDark: "#282124",
    reserve: true,
  },
  "thai-tea": {
    id: "thai-tea",
    name: "Thai tea (reserve)",
    deep: "#A0461C",
    tint: "#F7E3D3",
    light: "#F2A57A",
    seedLight: "#D4AD96",
    seedDark: "#684937",
    bandDark: "#2D2019",
    reserve: true,
  },
};

/** Default assignment order (CVD-checked, brief §C3). */
export const DEFAULT_SWATCH_ORDER: SwatchId[] = [
  "butterfly-pea",
  "oolong",
  "lychee",
  "matcha",
  "jasmine",
  "black-sesame",
];

/** Pairs that are confusable under colour-vision deficiency (validator warns). */
export const CONFUSABLE_PAIRS: Array<[SwatchId, SwatchId, string]> = [
  ["taro", "butterfly-pea", "ΔE 3.2 under protan simulation"],
  ["thai-tea", "oolong", "ΔE 3.3 under deutan simulation"],
  ["matcha", "thai-tea", "ΔE 6.4"],
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
