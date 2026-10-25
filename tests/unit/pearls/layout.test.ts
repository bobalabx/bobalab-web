/**
 * The homepage pearl figure's layout units (DECISIONS D-15), ported with the
 * figure from 4740e10 (tests/unit/figure/figure.test.ts): the fixed slot
 * templates for 2–8 directions and the seed fill order with the ±75° cap.
 */
import { describe, expect, it } from "vitest";
import { CLOCK_SLOTS, SEED_ARC_MAX, SEED_CAP, seedCount, seedLayout } from "@/lib/pearls/seeds";
import { TEMPLATES, templateFor, NUDGE_DX, NUDGE_DY, nudge } from "@/lib/pearls/templates";

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

  it("never places a seed beyond ±75°, for any count (no stir any more, D-15)", () => {
    for (let n = 0; n <= 30; n++) {
      for (const s of seedLayout(n)) expect(Math.abs(s.angle)).toBeLessThanOrEqual(SEED_ARC_MAX);
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

describe("ported unchanged from the original (4740e10)", () => {
  it("nudge() reads the per-slot constants and is 0 past the eighth slot", () => {
    expect(nudge(1)).toEqual({ dx: 0.06, dy: 0.08 });
    expect(nudge(8)).toEqual({ dx: 0, dy: 0 });
  });
  it("the 4-direction template is the 2×2 offset cluster", () => {
    const t = templateFor(4)!;
    expect(t.rows).toBe(2);
    expect(t.slots.map((s) => [s.row, s.col])).toEqual([
      [1, 1],
      [1, 3],
      [2, 2],
      [2, 4],
    ]);
    expect(t.diameter).toBe("clamp(5rem, 14cqi, 6.5rem)");
  });
});
