/**
 * D-13 item 4 ("Lines" palette): every token in tokens.css exists with its
 * exact hex and agrees with palette.ts, and every contrast pair is recomputed
 * (fails below the WCAG threshold or if it drifts from the documented ratio).
 * Documented ratios: docs/redesign/prototypes/p3/NOTES.md (core) and
 * DIRECTION.md §5.0 (direction tones), recomputed 2026-10-24.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CONFUSABLE_PAIRS,
  CORE_DARK,
  CORE_LIGHT,
  SWATCHES,
  SWATCH_IDS,
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

/** P3 token table (NOTES.md "Contrast"), plus the legacy aliases. */
const LIGHT_TABLE: Record<string, string> = {
  paper: "#FFFFFF",
  band: "#F2F3F1",
  ink: "#111410",
  muted: "#50564F",
  rule: "#80877F",
  hairline: "#D9DCD6",
  surface: "#FFFFFF",
  "paper-alt": "#F2F3F1",
  plate: "#FFFFFF",
  "ink-muted": "#50564F",
  accent: "#111410",
  "accent-strong": "#111410",
  pearl: "#111410",
  "pearl-index": "#FFFFFF",
};
const DARK_TABLE: Record<string, string> = {
  paper: "#101210",
  band: "#181B18",
  ink: "#E7EAE5",
  muted: "#A6ACA4",
  rule: "#7A8178",
  hairline: "#2B302B",
  surface: "#101210",
  "paper-alt": "#181B18",
  plate: "#101210",
  "ink-muted": "#A6ACA4",
  accent: "#E7EAE5",
  "accent-strong": "#E7EAE5",
  pearl: "#E7EAE5",
  "pearl-index": "#101210",
};

/** DIRECTION.md §5.0 deep (light mode) and light (dark mode) tones. */
const TONES: Partial<Record<SwatchId, [string, string]>> = {
  "butterfly-pea": ["#2B4FA8", "#8EA4F7"],
  lychee: ["#A12C5A", "#F590AE"],
  matcha: ["#4C7A1E", "#A8DA84"],
  oolong: ["#6B4500", "#C4943A"],
};

describe("tokens.css matches palette.ts and the D-13 tables", () => {
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
  it("palette.ts has no token the tables do not list", () => {
    expect(Object.keys(CORE_LIGHT).sort()).toEqual(Object.keys(LIGHT_TABLE).sort());
    expect(Object.keys(CORE_DARK).sort()).toEqual(Object.keys(DARK_TABLE).sort());
  });
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
  for (const [id, [deep, light]] of Object.entries(TONES)) {
    it(`${id} uses the DIRECTION §5.0 tones`, () => {
      expect(SWATCHES[id as SwatchId].deep).toBe(deep);
      expect(SWATCHES[id as SwatchId].light).toBe(light);
    });
  }
  it("no cream or clay is left in the tokens (D-13 item 4)", () => {
    for (const old of ["#FCFAF6", "#F4F0EA", "#F7F1E8", "#8A4515", "#6B3410", "#E0A46B", "#17110E"])
      expect(css.toUpperCase()).not.toContain(old);
  });
});

// [fg, bg, documented ratio, threshold]
type Pair = [string, string, number, number];
const L = CORE_LIGHT;
const D = CORE_DARK;
const TEXT = 4.5;
const UI = 3;

const CORE_PAIRS: Record<string, Pair> = {
  "light ink/paper": [L.ink, L.paper, 18.56, TEXT],
  "light muted/paper": [L.muted, L.paper, 7.54, TEXT],
  "light rule/paper (control boundaries)": [L.rule, L.paper, 3.69, UI],
  "light ink/band": [L.ink, L.band, 16.68, TEXT],
  "light muted/band": [L.muted, L.band, 6.77, TEXT],
  "light rule/band": [L.rule, L.band, 3.32, UI],
  "light pearl/paper": [L.pearl, L.paper, 18.56, UI],
  "light pearl-index/pearl": [L["pearl-index"], L.pearl, 18.56, TEXT],
  "light paper on ink (preview ribbon, selection)": [L.paper, L.ink, 18.56, TEXT],
  "dark ink/paper": [D.ink, D.paper, 15.5, TEXT],
  "dark muted/paper": [D.muted, D.paper, 8.12, TEXT],
  "dark rule/paper (control boundaries)": [D.rule, D.paper, 4.69, UI],
  "dark ink/band": [D.ink, D.band, 14.31, TEXT],
  "dark muted/band": [D.muted, D.band, 7.49, TEXT],
  "dark rule/band": [D.rule, D.band, 4.33, UI],
  "dark pearl/paper": [D.pearl, D.paper, 15.5, UI],
  "dark pearl-index/pearl": [D["pearl-index"], D.pearl, 15.5, TEXT],
};

/** Per swatch: deep/paper, deep/band, ink/tint, deep/tint, light/dark paper, light/dark band, dark ink/bandDark. */
const SWATCH_RATIOS: Record<SwatchId, [number, number, number, number, number, number, number]> = {
  "butterfly-pea": [7.54, 6.77, 16.42, 6.67, 7.89, 7.28, 13.32],
  oolong: [8.48, 7.62, 16.33, 7.46, 6.85, 6.32, 13.58],
  lychee: [6.95, 6.24, 16.32, 6.11, 8.5, 7.84, 13.27],
  matcha: [5.11, 4.59, 16.71, 4.6, 11.67, 10.78, 12.79],
  jasmine: [6.72, 6.04, 16.53, 5.99, 11.05, 10.2, 12.9],
  "black-sesame": [10.12, 9.09, 16.28, 8.88, 11.36, 10.49, 12.84],
  taro: [7.81, 7.02, 16.41, 6.91, 9.9, 9.14, 13.06],
  "thai-tea": [6.2, 5.57, 16.48, 5.5, 9.35, 8.64, 13.11],
};

const TOL = 0.02;

describe("contrast pairs are recomputed and pass", () => {
  for (const [name, [fg, bg, listed, min]] of Object.entries(CORE_PAIRS)) {
    it(`${name}: ${listed} ≥ ${min}`, () => {
      const r = contrastRatio(fg, bg);
      expect(r).toBeGreaterThanOrEqual(min);
      expect(Math.abs(r - listed)).toBeLessThanOrEqual(TOL);
    });
  }
  it("focus ring (ink) ≥ 3:1 on paper and band in both modes", () => {
    for (const bg of [L.paper, L.band]) expect(contrastRatio(L.ink, bg)).toBeGreaterThanOrEqual(3);
    for (const bg of [D.paper, D.band]) expect(contrastRatio(D.ink, bg)).toBeGreaterThanOrEqual(3);
  });
  it("links are ink (no brand accent)", () => {
    expect(L.accent).toBe(L.ink);
    expect(D.accent).toBe(D.ink);
  });
  it("hairline is decorative only (below 3:1 by design)", () => {
    expect(contrastRatio(L.hairline, L.paper)).toBeCloseTo(1.39, 1);
    expect(contrastRatio(D.hairline, D.paper)).toBeCloseTo(1.4, 1);
  });
});

describe("direction swatches", () => {
  const close = (a: string, b: string) => {
    const x = hexToRgb(a);
    const y = hexToRgb(b);
    return x.every((v, i) => Math.abs(v - y[i]!) <= 1);
  };
  for (const s of Object.values(SWATCHES)) {
    const ratios = SWATCH_RATIOS[s.id];
    it(`${s.id}: text and line pairs pass AA and match the documented ratios`, () => {
      const pairs: Array<[string, string]> = [
        [s.deep, L.paper],
        [s.deep, L.band],
        [L.ink, s.tint],
        [s.deep, s.tint],
        [s.light, D.paper],
        [s.light, D.band],
        [D.ink, s.bandDark],
      ];
      pairs.forEach(([fg, bg], i) => {
        const r = contrastRatio(fg, bg);
        expect(r, `${fg} on ${bg}`).toBeGreaterThanOrEqual(TEXT);
        expect(Math.abs(r - ratios[i]!)).toBeLessThanOrEqual(TOL);
      });
    });
    it(`${s.id}: tints and faint marks are the documented blends`, () => {
      expect(close(blend(s.deep, L.paper, 0.08), s.tint)).toBe(true);
      expect(close(blend(s.deep, L.paper, 0.4), s.seedLight)).toBe(true);
      expect(close(blend(s.light, D.paper, 0.35), s.seedDark)).toBe(true);
      expect(close(blend(s.light, D.paper, 0.1), s.bandDark)).toBe(true);
    });
  }
  it("every confusable pair names two real swatches and the live four are not among them", () => {
    const live: SwatchId[] = ["butterfly-pea", "lychee", "matcha", "oolong"];
    for (const [a, b] of CONFUSABLE_PAIRS) {
      expect(SWATCH_IDS).toContain(a);
      expect(SWATCH_IDS).toContain(b);
      expect(live.includes(a) && live.includes(b)).toBe(false);
    }
  });
});
