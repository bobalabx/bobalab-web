/**
 * Brief WP0 acceptance #4: every token in §C2–§C3 exists with its exact hex,
 * and every listed contrast pair is recomputed (fails below threshold).
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CORE_DARK,
  CORE_LIGHT,
  SWATCHES,
  blend,
  contrastRatio,
  hexToRgb,
  type SwatchId,
} from "@/lib/content/palette";

const css = fs.readFileSync(
  fileURLToPath(new URL("../../../src/styles/tokens.css", import.meta.url)),
  "utf8",
);
const darkBlock = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"));
const lightBlock = css.slice(0, css.indexOf("@media (prefers-color-scheme: dark)"));

function cssVar(block: string, name: string): string | undefined {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block);
  return m?.[1]?.toUpperCase();
}

/** Brief §C2 tables, verbatim. */
const LIGHT_TABLE: Record<string, string> = {
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
};
const DARK_TABLE: Record<string, string> = {
  paper: "#17110E",
  surface: "#221A15",
  plate: "#1E1713",
  ink: "#F3ECE2",
  "ink-muted": "#BFB2A5",
  accent: "#E0A46B",
  rule: "#8A7766",
  pearl: "#3A2C22",
  "pearl-rim": "#A47E62",
  "pearl-index": "#F3ECE2",
  "paper-alt": "#1C1511",
  "accent-strong": "#EDBD8F",
  hairline: "#3D3129",
};

describe("tokens.css matches the brief and palette.ts", () => {
  for (const [k, hex] of Object.entries(LIGHT_TABLE)) {
    it(`light --${k} = ${hex}`, () => {
      expect(cssVar(lightBlock, k)).toBe(hex);
      expect((CORE_LIGHT as Record<string, string>)[k]).toBe(hex);
    });
  }
  for (const [k, hex] of Object.entries(DARK_TABLE)) {
    it(`dark --${k} = ${hex}`, () => {
      expect(cssVar(darkBlock, k)).toBe(hex);
      expect((CORE_DARK as Record<string, string>)[k]).toBe(hex);
    });
  }
  for (const s of Object.values(SWATCHES)) {
    it(`swatch ${s.id} tokens`, () => {
      const block = css.slice(css.indexOf(`[data-swatch="${s.id}"]`));
      const scoped = block.slice(0, block.indexOf("}"));
      expect(cssVar(scoped, "dir-deep")).toBe(s.deep);
      expect(cssVar(scoped, "dir-tint")).toBe(s.tint);
      expect(cssVar(scoped, "dir-light")).toBe(s.light);
      expect(cssVar(scoped, "dir-seed-l")).toBe(s.seedLight);
      expect(cssVar(scoped, "dir-seed-d")).toBe(s.seedDark);
      expect(cssVar(scoped, "dir-band-d")).toBe(s.bandDark);
    });
  }
});

// [fg, bg, listed ratio, threshold]
type Pair = [string, string, number, number];
const L = CORE_LIGHT;
const D = CORE_DARK;
const TEXT = 4.5;
const UI = 3;

const CORE_PAIRS: Record<string, Pair> = {
  "light ink/paper": [L.ink, L.paper, 16.93, TEXT],
  "light ink-muted/paper": [L["ink-muted"], L.paper, 7.57, TEXT],
  "light accent/paper": [L.accent, L.paper, 6.85, TEXT],
  "light rule/paper": [L.rule, L.paper, 4.31, UI],
  "light ink/surface": [L.ink, L.surface, 17.65, TEXT],
  "light ink-muted/surface": [L["ink-muted"], L.surface, 7.9, TEXT],
  "light accent/surface": [L.accent, L.surface, 7.14, TEXT],
  "light rule/surface": [L.rule, L.surface, 4.49, UI],
  "light ink/paper-alt": [L.ink, L["paper-alt"], 15.55, TEXT],
  "light ink-muted/paper-alt": [L["ink-muted"], L["paper-alt"], 6.96, TEXT],
  "light accent/paper-alt": [L.accent, L["paper-alt"], 6.29, TEXT],
  "light rule/paper-alt": [L.rule, L["paper-alt"], 3.96, UI],
  "light ink/plate": [L.ink, L.plate, 15.72, TEXT],
  "light ink-muted/plate": [L["ink-muted"], L.plate, 7.03, TEXT],
  "light accent/plate": [L.accent, L.plate, 6.36, TEXT],
  "light rule/plate": [L.rule, L.plate, 4.0, UI],
  "light button label paper/accent": [L.paper, L.accent, 6.85, TEXT],
  "light accent-strong/paper": [L["accent-strong"], L.paper, 9.48, TEXT],
  "light white/accent-strong": ["#FFFFFF", L["accent-strong"], 9.89, TEXT],
  "light pearl/paper": [L.pearl, L.paper, 15.62, UI],
  "light pearl/plate": [L.pearl, L.plate, 14.51, UI],
  "light pearl-index/pearl": [L["pearl-index"], L.pearl, 14.51, TEXT],
  "dark ink/paper": [D.ink, D.paper, 15.95, TEXT],
  "dark ink-muted/paper": [D["ink-muted"], D.paper, 9.02, TEXT],
  "dark accent/paper": [D.accent, D.paper, 8.63, TEXT],
  "dark rule/paper": [D.rule, D.paper, 4.37, UI],
  "dark ink/surface": [D.ink, D.surface, 14.6, TEXT],
  "dark ink-muted/surface": [D["ink-muted"], D.surface, 8.26, TEXT],
  "dark accent/surface": [D.accent, D.surface, 7.9, TEXT],
  "dark rule/surface": [D.rule, D.surface, 4.0, UI],
  "dark ink/plate": [D.ink, D.plate, 15.08, TEXT],
  "dark ink-muted/plate": [D["ink-muted"], D.plate, 8.53, TEXT],
  "dark accent/plate": [D.accent, D.plate, 8.16, TEXT],
  "dark rule/plate": [D.rule, D.plate, 4.14, UI],
  "dark button label/accent": ["#17110E", D.accent, 8.63, TEXT],
  "dark pearl-rim/paper": [D["pearl-rim"], D.paper, 5.11, UI],
  "dark pearl-rim/surface": [D["pearl-rim"], D.surface, 4.68, UI],
  "dark pearl-rim/plate": [D["pearl-rim"], D.plate, 4.83, UI],
  "dark pearl-index/pearl": [D["pearl-index"], D.pearl, 11.45, TEXT],
  "dark ink/paper-alt": [D.ink, D["paper-alt"], 15.37, TEXT],
  "dark ink-muted/paper-alt": [D["ink-muted"], D["paper-alt"], 8.69, TEXT],
  "dark accent/paper-alt": [D.accent, D["paper-alt"], 8.32, TEXT],
  "dark rule/paper-alt": [D.rule, D["paper-alt"], 4.22, UI],
  "dark accent-strong/paper": [D["accent-strong"], D.paper, 10.93, TEXT],
  "dark accent-strong/surface": [D["accent-strong"], D.surface, 10.01, TEXT],
  "dark paper/accent-strong": [D.paper, D["accent-strong"], 10.93, TEXT],
};

/** §C3 per-swatch listed ratios: deep/paper, deep/plate, ink/tint, deep/tint, light/night, dark-header ink. */
const SWATCH_RATIOS: Record<SwatchId, [number, number, number, number, number, number]> = {
  "butterfly-pea": [7.27, 6.75, 14.1, 6.05, 10.25, 13.27],
  oolong: [6.17, 5.73, 14.42, 5.25, 10.87, 13.2],
  lychee: [6.79, 6.3, 13.93, 5.58, 9.63, 13.38],
  matcha: [6.09, 5.65, 14.51, 5.22, 10.69, 13.26],
  jasmine: [6.45, 5.99, 14.26, 5.43, 10.98, 13.31],
  "black-sesame": [9.71, 9.02, 13.68, 7.85, 11.29, 13.21],
  taro: [7.5, 6.96, 14.36, 6.36, 9.84, 13.43],
  "thai-tea": [5.95, 5.52, 14.19, 4.98, 9.3, 13.44],
};
/** Seed contrast (decorative; listed for regression only). */
const SEED_RATIOS: Record<SwatchId, [number, number]> = {
  "butterfly-pea": [1.91, 2.28],
  oolong: [1.81, 2.37],
  lychee: [1.93, 2.23],
  matcha: [1.8, 2.33],
  jasmine: [1.86, 2.37],
  "black-sesame": [2.03, 2.42],
  taro: [1.92, 2.26],
  "thai-tea": [1.83, 2.19],
};

// The brief rounds to 2 decimals; allow rounding drift.
const TOL = 0.02;

describe("contrast pairs (brief §C2) are recomputed and pass", () => {
  for (const [name, [fg, bg, listed, min]] of Object.entries(CORE_PAIRS)) {
    it(`${name}: ${listed} ≥ ${min}`, () => {
      const r = contrastRatio(fg, bg);
      expect(r).toBeGreaterThanOrEqual(min);
      expect(Math.abs(r - listed)).toBeLessThanOrEqual(TOL);
    });
  }
  it("light focus ring (ink) ≥ 3:1 on every light surface", () => {
    for (const bg of [L.paper, L.surface, L["paper-alt"], L.plate])
      expect(contrastRatio(L.ink, bg)).toBeGreaterThanOrEqual(3);
  });
  it("dark focus ring (accent) ≥ 3:1 on every dark surface", () => {
    for (const bg of [D.paper, D.surface, D["paper-alt"], D.plate])
      expect(contrastRatio(D.accent, bg)).toBeGreaterThanOrEqual(3);
  });
  it("hairline is decorative only (below 3:1 by design)", () => {
    expect(contrastRatio(L.hairline, L.paper)).toBeCloseTo(1.54, 1);
    expect(contrastRatio(D.hairline, D.paper)).toBeCloseTo(1.49, 1);
  });
});

describe("direction swatches (brief §C3)", () => {
  const close = (a: string, b: string) => {
    const x = hexToRgb(a);
    const y = hexToRgb(b);
    return x.every((v, i) => Math.abs(v - y[i]!) <= 1);
  };
  for (const s of Object.values(SWATCHES)) {
    const [dp, dpl, it_, dt, ln, band] = SWATCH_RATIOS[s.id];
    it(`${s.id}: text pairs pass AA and match the listed ratios`, () => {
      const pairs: Array<[string, string, number]> = [
        [s.deep, L.paper, dp],
        [s.deep, L.plate, dpl],
        [L.ink, s.tint, it_],
        [s.deep, s.tint, dt],
        [s.light, D.paper, ln],
        [D.ink, s.bandDark, band],
      ];
      for (const [fg, bg, listed] of pairs) {
        const r = contrastRatio(fg, bg);
        expect(r).toBeGreaterThanOrEqual(TEXT);
        expect(Math.abs(r - listed)).toBeLessThanOrEqual(TOL);
      }
    });
    it(`${s.id}: seeds and dark band are the documented blends`, () => {
      expect(close(blend(s.deep, L.plate, 0.4), s.seedLight)).toBe(true);
      expect(close(blend(s.light, D.plate, 0.35), s.seedDark)).toBe(true);
      expect(close(blend(s.light, D.paper, 0.1), s.bandDark)).toBe(true);
      const [sl, sd] = SEED_RATIOS[s.id];
      expect(Math.abs(contrastRatio(s.seedLight, L.plate) - sl)).toBeLessThanOrEqual(TOL);
      expect(Math.abs(contrastRatio(s.seedDark, D.plate) - sd)).toBeLessThanOrEqual(TOL);
    });
  }
});
