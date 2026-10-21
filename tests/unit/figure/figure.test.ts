/** Fig. 1 layout units: slot templates, seed fill, and the figure model over fixtures. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildContent, loadRawContent } from "@/lib/content/load";
import {
  CLOCK_SLOTS,
  SEED_ARC_MAX,
  SEED_CAP,
  STIR_DEG,
  seedCount,
  seedLayout,
} from "@/lib/figure/seeds";
import { TEMPLATES, templateFor, NUDGE_DX, NUDGE_DY } from "@/lib/figure/templates";
import { buildFigure, buildFigureModel, figureState, metaLine } from "@/lib/figure/buildFigure";

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const TODAY = "2026-10-20";
const load = (set: string, preview = false) =>
  buildContent(loadRawContent(path.join(FIX, set)), { preview, today: TODAY });

describe("slot templates (brief §E2)", () => {
  it("exist for n = 2…8 only", () => {
    expect(templateFor(0)).toBeNull();
    expect(templateFor(1)).toBeNull();
    expect(templateFor(9)).toBeNull();
    for (let n = 2; n <= 8; n++) expect(templateFor(n)?.slots).toHaveLength(n);
  });

  it("match the brief's table exactly", () => {
    const table: Record<number, [number, Array<[number, number]>]> = {
      2: [
        4,
        [
          [1, 1],
          [1, 3],
        ],
      ],
      3: [
        6,
        [
          [1, 1],
          [1, 3],
          [1, 5],
        ],
      ],
      4: [
        5,
        [
          [1, 1],
          [1, 3],
          [2, 2],
          [2, 4],
        ],
      ],
      5: [
        6,
        [
          [1, 1],
          [1, 3],
          [1, 5],
          [2, 2],
          [2, 4],
        ],
      ],
      6: [
        7,
        [
          [1, 1],
          [1, 3],
          [1, 5],
          [2, 2],
          [2, 4],
          [2, 6],
        ],
      ],
      7: [
        8,
        [
          [1, 1],
          [1, 3],
          [1, 5],
          [1, 7],
          [2, 2],
          [2, 4],
          [2, 6],
        ],
      ],
      8: [
        6,
        [
          [1, 1],
          [1, 3],
          [1, 5],
          [2, 2],
          [2, 4],
          [3, 1],
          [3, 3],
          [3, 5],
        ],
      ],
    };
    for (const [n, [cols, slots]] of Object.entries(table)) {
      const t = TEMPLATES[Number(n)]!;
      expect(t.columns).toBe(cols);
      expect(t.slots.map((s) => [s.row, s.col])).toEqual(slots);
    }
  });

  it("uses the row template for n ≤ 3 and clusters above", () => {
    expect(TEMPLATES[2]!.kind).toBe("row");
    expect(TEMPLATES[3]!.kind).toBe("row");
    for (let n = 4; n <= 8; n++) expect(TEMPLATES[n]!.kind).toBe("cluster");
  });

  it("keeps every 2-column slot inside the grid, with no two slots overlapping", () => {
    for (let n = 2; n <= 8; n++) {
      const t = TEMPLATES[n]!;
      const taken = new Set<string>();
      for (const s of t.slots) {
        expect(s.col + 1).toBeLessThanOrEqual(t.columns);
        for (const c of [s.col, s.col + 1]) {
          const key = `${s.row}:${c}`;
          expect(taken.has(key)).toBe(false);
          taken.add(key);
        }
      }
    }
  });

  it("orders slots row-major so DOM order = focus order = index", () => {
    for (let n = 2; n <= 8; n++) {
      const keys = TEMPLATES[n]!.slots.map((s) => s.row * 100 + s.col);
      expect([...keys].sort((a, b) => a - b)).toEqual(keys);
    }
  });

  it("has constant organic nudges for all 8 slots", () => {
    expect(NUDGE_DX).toEqual([0, 0.06, -0.04, 0.03, -0.06, 0.05, -0.02, 0.04]);
    expect(NUDGE_DY).toEqual([0, 0.08, -0.05, 0.1, -0.07, 0.04, 0.09, -0.03]);
  });
});

describe("seeds (brief §E2 + JUDGE.md cap)", () => {
  it("draws one dot per paper up to the cap", () => {
    expect(seedCount(0)).toBe(0);
    expect(seedCount(1)).toBe(1);
    expect(seedCount(7)).toBe(7);
    expect(seedCount(12)).toBe(12);
    expect(seedCount(24)).toBe(SEED_CAP);
    expect(seedCount(-3)).toBe(0);
    expect(seedLayout(24)).toHaveLength(12);
  });

  it("fills clock slots 12, 1, 11, 2, 10 for small counts", () => {
    expect(seedLayout(5).map((s) => s.angle)).toEqual([...CLOCK_SLOTS]);
    expect(seedLayout(3).map((s) => s.angle)).toEqual([0, 30, -30]);
  });

  it("adding a paper (≤ 5) fills the next slot and moves nothing else", () => {
    for (let n = 1; n < 5; n++) {
      const a = seedLayout(n).map((s) => s.angle);
      const b = seedLayout(n + 1).map((s) => s.angle);
      expect(b.slice(0, n)).toEqual(a);
    }
  });

  it("never places a seed beyond ±75° (±89° with the stir), for any count", () => {
    for (let n = 0; n <= 30; n++) {
      for (const s of seedLayout(n)) {
        expect(Math.abs(s.angle)).toBeLessThanOrEqual(SEED_ARC_MAX);
        expect(Math.abs(s.angle) + STIR_DEG).toBeLessThan(90);
      }
    }
  });

  it("spreads 6+ seeds evenly across −75°…+75°, distinct and symmetric", () => {
    for (const n of [6, 7, 12]) {
      const angles = seedLayout(n)
        .map((s) => s.angle)
        .sort((a, b) => a - b);
      expect(angles[0]).toBe(-75);
      expect(angles[angles.length - 1]).toBe(75);
      expect(new Set(angles).size).toBe(n);
      const step = angles[1]! - angles[0]!;
      for (let i = 1; i < angles.length; i++)
        expect(angles[i]! - angles[i - 1]!).toBeCloseTo(step, 1);
    }
  });

  it("numbers the fill order k = 0…n-1, nearest 12 o'clock first", () => {
    const seeds = seedLayout(7);
    expect(seeds.map((s) => s.k)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(seeds[0]!.angle).toBe(0);
  });
});

describe("figure model over fixtures", () => {
  it("maps n to the §E9 state", () => {
    expect(figureState(0)).toBe("empty");
    expect(figureState(1)).toBe("single");
    expect(figureState(2)).toBe("figure");
    expect(figureState(8)).toBe("figure");
    expect(figureState(9)).toBe("overflow");
  });

  it.each([
    ["n0", 0, "empty"],
    ["n1", 1, "single"],
    ["n2", 2, "figure"],
    ["n3", 3, "figure"],
    ["n4", 4, "figure"],
    ["n6", 6, "figure"],
    ["n7", 7, "figure"],
    ["n8", 8, "figure"],
  ] as const)("%s → %i directions, state %s", (set, n, state) => {
    const m = buildFigure(load(set));
    expect(m.n).toBe(n);
    expect(m.state).toBe(state);
    expect(m.items.map((it) => it.index)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    if (state === "figure") {
      expect(m.template?.n).toBe(n);
      m.items.forEach((it, i) => expect(it.slot).toEqual(m.template!.slots[i]));
    } else {
      expect(m.template).toBeNull();
    }
  });

  it("excludes archived directions and (in production) drafts", () => {
    const prod = load("n0");
    const preview = load("n0", true);
    expect(buildFigure(prod).n).toBe(0);
    // n0 holds 2 draft directions: hidden in production, shown (with badges) in preview.
    expect(buildFigure(preview).n).toBe(2);
    expect(buildFigure(preview).draftCount).toBe(2);
    for (const set of ["n4", "seeds-0-1-7-12-24"]) {
      const c = load(set, true);
      const slugs = buildFigure(c).items.map((it) => it.slug);
      for (const a of c.archivedDirections) expect(slugs).not.toContain(a.slug);
    }
  });

  it("derives seed counts from D-05 counted papers (0, 1, 7, 12, 24 → capped)", () => {
    const c = load("seeds-0-1-7-12-24");
    const m = buildFigure(c);
    for (const it of m.items) {
      const d = c.getDirection(it.slug)!;
      expect(it.papers).toBe(d.counts.papers);
      expect(it.seeds).toBe(Math.min(12, d.counts.papers));
    }
    expect(m.items.map((it) => it.papers).sort((a, b) => a - b)).toEqual([0, 1, 7, 12, 24]);
  });

  it("adding one paper changes only that direction's seeds", () => {
    const c = load("n4");
    const base = buildFigureModel({
      directions: c.directions,
      countedPublications: c.countedPublications,
      today: TODAY,
    });
    const target = c.directions[1]!;
    const extra = {
      ...c.countedPublications[0]!,
      slug: "extra-2026-paper",
      directions: [target.slug],
    };
    const bumped = buildFigureModel({
      directions: c.directions.map((d) =>
        d.slug === target.slug ? { ...d, counts: { ...d.counts, papers: d.counts.papers + 1 } } : d,
      ),
      countedPublications: [...c.countedPublications, extra],
      today: TODAY,
    });
    bumped.items.forEach((it, i) => {
      const was = base.items[i]!;
      if (it.slug === target.slug) expect(it.seeds).toBe(Math.min(12, was.seeds + 1));
      else expect({ ...it }).toEqual({ ...was });
    });
  });

  it("formats the caption meta line", () => {
    expect(metaLine({ projects: 1, papers: 7, since: 2021 })).toBe(
      "1 project · 7 papers · since 2021",
    );
    expect(metaLine({ projects: 0, papers: 1 })).toBe("0 projects · 1 paper");
  });

  it("reads figure_mode and builds a shared year axis for the dot plot", () => {
    const c = load("n4");
    const m = buildFigureModel({
      directions: c.directions,
      countedPublications: c.countedPublications,
      figureMode: "dotplot",
      today: TODAY,
    });
    expect(m.mode).toBe("dotplot");
    const years = m.items.flatMap((it) => it.years);
    if (years.length) expect(m.yearRange).toEqual([Math.min(...years), Math.max(...years)]);
    else expect(m.yearRange).toBeNull();
  });
});
