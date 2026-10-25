/**
 * Fig. 1 "Lines" model and geometry (DECISIONS D-13; P3 fig.js; JUDGE refinements
 * 3–5): lanes in direction_order, one dot per counted paper with a year, links and
 * gaps for shared papers, the shares sentence, the finite arrival, the geometry
 * thresholds, and the overflow rule (merge the oldest bins, packed per lane).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildContent, loadRawContent, type Content } from "@/lib/content/load";
import {
  buildFigure,
  buildFigureModel,
  figureState,
  laneCounts,
  numberWord,
  sharesSentence,
  type FigureInput,
  type FigureModel,
} from "@/lib/figure/buildFigure";
import {
  CW_MIN,
  LIST_CSS,
  PACK_AT,
  PACKED_CSS,
  REF_TRACK_W,
  figureCss,
  fitsAt,
  pitch,
  rawPitch,
  trackFor,
  zone,
} from "@/lib/figure/geometry";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const FIX = path.join(ROOT, "tests/fixtures/content");
const TODAY = "2026-10-20";
const load = (dir: string, preview = false): Content =>
  buildContent(loadRawContent(dir), { preview, today: TODAY });

/** Structural invariants every model must keep. */
function checkModel(m: FigureModel, c: { directions: Content["directions"] }) {
  expect(m.lanes.map((l) => l.slug)).toEqual(c.directions.map((d) => d.slug));
  // Columns: unique per paper unless the bin is packed; bins cover them in order.
  const unpacked = m.papers.filter((p) => !m.bins[p.bin]!.packed).map((p) => p.col);
  expect(new Set(unpacked).size).toBe(unpacked.length);
  let col = 0;
  for (const b of m.bins) {
    expect(b.col0).toBe(col);
    col += b.cols;
  }
  expect(m.cols).toBe(col);
  for (const p of m.papers) {
    const b = m.bins[p.bin]!;
    expect(p.col).toBeGreaterThanOrEqual(b.col0);
    expect(p.col).toBeLessThan(b.col0 + b.cols);
    expect(p.year).toBeGreaterThanOrEqual(b.from);
    expect(p.year).toBeLessThanOrEqual(b.to);
  }
  for (const l of m.lanes) {
    // A dot for every paper on the lane, never more than the lane's count.
    expect(l.dots.length).toBeLessThanOrEqual(l.papers);
    expect(l.dots.map((d) => d.s).sort()).toEqual(
      m.papers
        .filter((p) => p.lanes.includes(l.slug))
        .map((p) => p.slug)
        .sort(),
    );
    // Strip order: (year, slug).
    const keys = l.dots.map((d) => `${d.year}:${d.s}`);
    expect(keys).toEqual([...keys].sort());
    expect(l.first).toBe(l.dots.length ? Math.min(...l.dots.map((d) => d.col)) : null);
  }
  // Links: a shared paper is "down" on its first lane, "up" on its last, "through" between.
  const idx = new Map(m.lanes.map((l, i) => [l.slug, i]));
  for (const p of m.papers.filter((x) => x.lanes.length > 1)) {
    const li = p.lanes.map((s) => idx.get(s)!);
    const lo = Math.min(...li);
    const hi = Math.max(...li);
    m.lanes.forEach((l, i) => {
      const seg = l.segs.find((s) => s.s === p.slug);
      if (i < lo || i > hi) expect(seg).toBeUndefined();
      else expect(seg?.part).toBe(i === lo ? "down" : i === hi ? "up" : "through");
      // A gap only where the link passes over another direction's drawn line.
      const gap = l.gaps.includes(p.col);
      if (gap) expect(p.lanes).not.toContain(l.slug);
    });
  }
  // The arrival is finite and ends well inside the 2 s data-intro window.
  expect(m.end).toBeLessThanOrEqual(1500);
  for (const l of m.lanes) for (const d of l.dots) expect(d.t).toBeLessThanOrEqual(m.end);
}

describe("figure state", () => {
  it("0 → empty, 1 → single (strips), 2–8 → figure, > 8 → overflow (strips)", () => {
    expect(figureState(0)).toBe("empty");
    expect(figureState(1)).toBe("single");
    for (let n = 2; n <= 8; n++) expect(figureState(n)).toBe("figure");
    expect(figureState(9)).toBe("overflow");
  });
});

describe("model over the fixture sets and the real content", () => {
  const sets = ["n0", "n1", "n2", "n3", "n4", "n6", "n7", "n8", "long-labels", "seeds-0-1-7-12-24"];
  for (const set of sets) {
    it(`${set}: lanes in direction order, dots, columns and links are consistent`, () => {
      const c = load(path.join(FIX, set), true);
      const m = buildFigure(c);
      expect(m.n).toBe(c.directions.length);
      checkModel(m, c);
    });
  }

  it("real content: lanes follow site.direction_order; counts are the loader's", () => {
    const c = load(path.join(ROOT, "content"), true);
    const m = buildFigure(c);
    checkModel(m, c);
    const order = c.site.direction_order.filter((s) => c.directions.some((d) => d.slug === s));
    expect(m.lanes.map((l) => l.slug)).toEqual(order);
    for (const l of m.lanes) {
      const d = c.getDirection(l.slug)!;
      expect(l.papers).toBe(d.counts.papers);
      expect(l.inProgress).toBe(d.counts.inProgress);
      expect(l.wip.length).toBe(d.counts.inProgress);
    }
    // Years are bins in ascending order; today's data fits without merging.
    expect(m.bins.map((b) => b.from)).toEqual([...m.bins.map((b) => b.from)].sort());
    expect(m.merged).toBe(0);
  });
});

describe("copy helpers", () => {
  it("shares sentence, lane counts, number words", () => {
    expect(sharesSentence([])).toBeNull();
    expect(
      sharesSentence([
        { slug: "pw", label: "Platform Work", count: 3 },
        { slug: "aa", label: "Algorithmic Advice", count: 1 },
      ]),
    ).toBe("Shared papers: Platform Work (3), Algorithmic Advice (1)");
    expect(sharesSentence([{ slug: "a", label: "AI at Work", count: 1 }])).toBe(
      "Shared papers: AI at Work (1)",
    );
    expect(laneCounts({ papers: 4, inProgress: 2 })).toEqual(["4 papers", ", 2 in progress"]);
    expect(laneCounts({ papers: 1, inProgress: 0 })).toEqual(["1 paper", ""]);
    expect(numberWord(4)).toBe("four");
    expect(numberWord(12)).toBe("12");
  });
});

// ---------------------------------------------------------------------------
// Synthetic data for the geometry and the overflow rule.

type Dir = FigureInput["directions"][number];
type Pub = FigureInput["countedPublications"][number];
const dir = (slug: string, i: number): Dir =>
  ({
    slug,
    index: i + 1,
    short_label: slug.toUpperCase(),
    title: slug,
    color: "matcha",
    draft: false,
    counts: { papers: 0, projects: 0, inProgress: 0 },
  }) as unknown as Dir;
const pub = (slug: string, year: number, directions: string[]): Pub =>
  ({ slug, title: slug, year, type: "journal", directions }) as unknown as Pub;

/** n papers spread over 4 lanes and `years` years, every 5th shared by two lanes. */
function synthetic(n: number, years = 6): FigureInput {
  const directions = ["a", "b", "c", "d"].map(dir);
  const pubs: Pub[] = [];
  for (let i = 0; i < n; i++) {
    const lanes = i % 5 === 0 ? ["a", "c"] : [["a", "b", "c", "d"][i % 4]!];
    pubs.push(pub(`p${String(i).padStart(3, "0")}`, 2010 + (i % years), lanes));
  }
  for (const d of directions)
    (d.counts as { papers: number }).papers = pubs.filter((p) =>
      p.directions.includes(d.slug),
    ).length;
  return { directions, countedPublications: pubs, today: TODAY };
}

describe("geometry", () => {
  const g = { cols: 13, bins: 4, wipMax: 3 };

  it("pitch is clamped to 12–64 px; thresholds invert the formula", () => {
    expect(pitch(250, g)).toBe(CW_MIN);
    expect(pitch(3000, { cols: 2, bins: 1, wipMax: 0 })).toBe(64);
    for (const c of [CW_MIN, PACK_AT]) {
      const t = trackFor(c, g);
      expect(rawPitch(t, g)).toBeGreaterThanOrEqual(c - 0.01);
      expect(rawPitch(t - 2, g)).toBeLessThan(c);
    }
  });

  it("today's 13 papers: links at a 1366 px viewport, packed at 768 px", () => {
    expect(rawPitch(REF_TRACK_W, g)).toBeGreaterThanOrEqual(PACK_AT);
    expect(rawPitch(768 - 48 - 200, g)).toBeLessThan(PACK_AT);
    expect(fitsAt(768 - 48 - 200, g)).toBe(true);
  });

  it("the zone grows with the busiest lane's rings", () => {
    expect(zone(0).zmin).toBe(140);
    expect(zone(3).zmin).toBe(140);
    expect(zone(12).zmin).toBeGreaterThan(140);
    expect(zone(12).zmax).toBeGreaterThanOrEqual(zone(12).zmin);
  });

  it("the generated stylesheet: strips below 48rem, packed where it can occur, safe as <style> text", () => {
    const css = figureCss(g, false);
    expect(css).toContain(`@media (max-width:47.99rem){${LIST_CSS}}`);
    expect(css).toContain(PACKED_CSS);
    // Thresholds in rem (label column + track), so enlarged text moves them too.
    expect(css).toMatch(
      /@media \(min-width:48rem\) and \(max-width:63\.99rem\)\{@container f1 \(max-width:\d+(\.\d+)?rem\)/,
    );
    expect(css).not.toMatch(/[<>&"']/);
    expect(figureCss(g, true)).toBe(LIST_CSS);
    // Both switches are written for both desktop ranges (enlarged text reaches them).
    expect(css.split(PACKED_CSS).length - 1).toBe(2);
    expect(css.split(LIST_CSS).length - 1).toBe(3);
  });
});

describe("overflow rule (P3 NOTES RC-19): merge the oldest bins, packed per lane", () => {
  it("fits without merging up to the reference width", () => {
    const m = buildFigureModel(synthetic(40));
    expect(m.merged).toBe(0);
    expect(m.cols).toBe(40);
    checkModel(m, { directions: synthetic(40).directions as Content["directions"] });
  });

  it("past the reference width, the oldest years merge into one packed bin until it fits", () => {
    const input = synthetic(120, 15);
    const m = buildFigureModel(input);
    checkModel(m, { directions: input.directions as Content["directions"] });
    expect(m.merged).toBeGreaterThan(0);
    // Years after the merged bin keep their own bins (the newest is never merged).
    expect(m.bins.length).toBeGreaterThan(1);
    const b = m.bins[0]!;
    expect(b.packed).toBe(true);
    expect(b.label).toBe(`${b.from}–${b.to}`);
    expect(b.from).toBe(2010);
    expect(m.bins.slice(1).every((x) => !x.packed && x.from === x.to)).toBe(true);
    expect(fitsAt(REF_TRACK_W, { cols: m.cols, bins: m.bins.length, wipMax: m.wipMax })).toBe(true);
    // Packing never puts two papers whose lane spans overlap in one column.
    const idx = new Map(m.lanes.map((l, i) => [l.slug, i]));
    const span = (lanes: string[]) => {
      const li = lanes.map((s) => idx.get(s)!);
      return [Math.min(...li), Math.max(...li)] as const;
    };
    const inBin = m.papers.filter((p) => p.bin === 0);
    for (const p of inBin)
      for (const q of inBin) {
        if (p === q || p.col !== q.col) continue;
        const [a, b2] = span(p.lanes);
        const [c, d] = span(q.lanes);
        expect(b2 < c || d < a).toBe(true);
      }
    expect(b.cols).toBeLessThan(inBin.length);
  });

  it("when merging the older years is not enough, every year is packed per lane and keeps its label", () => {
    const input = synthetic(100, 2);
    const m = buildFigureModel(input);
    checkModel(m, { directions: input.directions as Content["directions"] });
    expect(m.merged).toBe(0);
    expect(m.bins.map((b) => b.label)).toEqual(["2010", "2011"]);
    expect(m.bins.every((b) => b.packed)).toBe(true);
    expect(fitsAt(REF_TRACK_W, { cols: m.cols, bins: m.bins.length, wipMax: m.wipMax })).toBe(true);
  });

  it("the newest year always keeps its own bin, even when nothing fits (strips take over)", () => {
    for (const [n, years] of [
      [400, 4],
      [600, 6],
      [300, 2],
      [2000, 15],
    ] as const) {
      const input = synthetic(n, years);
      const m = buildFigureModel(input);
      checkModel(m, { directions: input.directions as Content["directions"] });
      const last = m.bins[m.bins.length - 1]!;
      expect(last.from).toBe(2010 + years - 1);
      expect(last.to).toBe(last.from);
      expect(m.bins.length).toBeGreaterThanOrEqual(2);
      // Where the lanes cannot fit, the container query switches to strips.
      const g = { cols: m.cols, bins: m.bins.length, wipMax: m.wipMax };
      if (!fitsAt(REF_TRACK_W, g)) expect(trackFor(CW_MIN, g)).toBeGreaterThan(REF_TRACK_W);
    }
  });

  it("merges only as many years as needed: more papers never merge fewer years", () => {
    expect(buildFigureModel({ ...synthetic(160, 15), fitWidth: 100000 }).merged).toBe(0);
    let last = 0;
    for (const n of [40, 80, 120, 160, 200, 260]) {
      const m = buildFigureModel(synthetic(n, 15));
      expect(m.merged).toBeGreaterThanOrEqual(last);
      last = m.merged;
    }
    expect(last).toBeGreaterThan(0);
  });

  it("many papers still arrive within the intro window", () => {
    const m = buildFigureModel(synthetic(300, 12));
    expect(m.end).toBeLessThanOrEqual(1500);
  });
});
