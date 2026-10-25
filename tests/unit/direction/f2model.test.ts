/**
 * Figure 2 packing (src/components/direction/f2model.ts) and the research
 * index strips (DirectionStrip.tsx): redesign D-13 after P3 research.html.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { directionDetail } from "@/lib/content/queries";
import {
  F2_MAX_COLUMNS,
  f2Fit,
  figure2Model,
  figureTypeWord,
  shortTitle,
} from "@/components/direction/f2model";
import {
  STRIP_GAP,
  STRIP_PITCH,
  stripAxis,
  stripDots,
  stripLabels,
} from "@/components/direction/DirectionStrip";

const REAL = fileURLToPath(new URL("../../../content/", import.meta.url));
const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const real = buildContent(loadRawContent(REAL), { preview: false, today: "2026-10-24" });
const n4 = buildContent(loadRawContent(path.join(FIX, "n4")), {
  preview: false,
  today: "2026-10-20",
});

const model = (c: typeof real, slug: string) => {
  const d = directionDetail(c, slug)!;
  return figure2Model(d.direction, d.publications, d.inProgress, [
    ...c.directions,
    ...c.archivedDirections,
  ]);
};

describe("short titles for figure labels", () => {
  it("cuts at the first colon or question mark, keeping the question mark", () => {
    expect(shortTitle("Learning on the Go: Understanding How Gig Economy Workers Learn")).toBe(
      "Learning on the Go",
    );
    expect(shortTitle("Precise or Broad? The Reward-Learning Frontier")).toBe("Precise or Broad?");
    expect(shortTitle("Act, Ask, or Defer? Authority Design: Agentic AI")).toBe(
      "Act, Ask, or Defer?",
    );
    expect(shortTitle("Learning Across Jobs")).toBe("Learning Across Jobs");
  });
});

describe("Figure 2 model", () => {
  for (const c of [real, n4]) {
    for (const d of c.directions) {
      it(`${d.slug}: every counted paper once, in ascending year bins; WIP after now`, () => {
        const m = model(c, d.slug);
        const items = m.bins.flatMap((b) => b.items.map((i) => i.slug)).sort();
        expect(items).toEqual(
          c.countedPublications
            .filter((p) => p.directions.includes(d.slug))
            .map((p) => p.slug)
            .sort(),
        );
        expect(m.wip.map((w) => w.slug).sort()).toEqual(
          c.inProgress
            .filter((p) => p.directions.includes(d.slug))
            .map((p) => p.slug)
            .sort(),
        );
        const years = m.bins.map((b) => b.year ?? 9999);
        expect([...years].sort((a, b) => a - b)).toEqual(years);
        expect(m.columns).toBe(items.length + m.wip.length);
        expect(m.fit).toBe(m.columns <= F2_MAX_COLUMNS ? "lines" : "list");
        for (const it of [...m.bins.flatMap((b) => b.items), ...m.wip]) {
          expect(it.others.some((o) => o.slug === d.slug)).toBe(false);
        }
      });
    }
  }

  it("Learning on the Job (Oct 2026): three Platform Work stubs and one Algorithmic Advice stub", () => {
    const m = model(real, "learning-on-the-job");
    const others = m.bins.flatMap((b) => b.items.flatMap((i) => i.others.map((o) => o.slug)));
    expect(others.filter((s) => s === "platform-work")).toHaveLength(3);
    expect(others.filter((s) => s === "algorithmic-advice")).toHaveLength(1);
    expect(m.shared).toBe(true);
    expect(m.bins.map((b) => b.label)).toEqual(["2025", "2026"]);
    expect(m.wip.map((w) => w.meta)).toEqual(["In progress"]);
    const lotg = m.bins[0]!.items.find((i) => i.slug === "jiang-2025-learning-on-the-go")!;
    expect(lotg).toMatchObject({
      short: "Learning on the Go",
      meta: "Journal article, 2025",
      href: "/publications/jiang-2025-learning-on-the-go/",
    });
  });

  it("undated papers get their own bin just before now; too many columns → list", () => {
    const d = real.directions[0]!;
    const base = real.countedPublications[0]!;
    const pubs = [
      { ...base, slug: "x-undated", year: undefined, directions: [d.slug], directionRefs: [d] },
      { ...base, slug: "x-2020", year: 2020, directions: [d.slug], directionRefs: [d] },
    ];
    const m = figure2Model(d, pubs, [], real.directions);
    expect(m.bins.map((b) => b.label)).toEqual(["2020", "Year not given"]);
    expect(f2Fit(F2_MAX_COLUMNS)).toBe("lines");
    expect(f2Fit(F2_MAX_COLUMNS + 1)).toBe("list");
  });
});

describe("Figure 2: shared work in progress, type words, order within a year", () => {
  it("a stub on an in-progress item alone still reserves the stub band (no label collision)", () => {
    // Behavioral Pricing (archived): its only shared item is in progress.
    const m = model(real, "pricing-experimentation");
    expect(m.bins.some((b) => b.items.some((i) => i.others.length))).toBe(false);
    expect(m.wip.some((w) => w.others.length)).toBe(true);
    expect(m.shared).toBe(true);
  });
  it("a work-in-progress entry that counts through a documented talk is named for the talk", () => {
    const wipTalk = {
      type: "work-in-progress" as const,
      links: {},
      presentations: [{ event: "A conference", url: "https://conf.example/p" }],
    };
    expect(figureTypeWord(wipTalk)).toBe("Conference presentation");
    expect(figureTypeWord({ ...wipTalk, links: { pdf: "https://x.example/a.pdf" } })).toBe(
      "Work in progress",
    );
    expect(figureTypeWord({ type: "journal" })).toBe("Journal article");
    // Real content: Managing Human Agents… (Algorithmic Advice) is drawn as a paper.
    const aa = model(real, "algorithmic-advice");
    const talk = aa.bins
      .flatMap((b) => b.items)
      .find((i) => i.slug === "sinchaisri-2026-compliance-aware-rl");
    expect(talk?.meta).toBe("Conference presentation, 2026");
  });
  it("orders a year by date_online, then slug; the caption flag says when order is by slug", () => {
    const d = real.directions[0]!;
    const base = real.countedPublications[0]!;
    const pub = (slug: string, date_online?: string) => ({
      ...base,
      slug,
      year: 2024,
      date_online,
      directions: [d.slug],
      directionRefs: [d],
    });
    const dated = figure2Model(
      d,
      [pub("b-late", "2024-09"), pub("a-early", "2024-02")],
      [],
      real.directions,
    );
    expect(dated.bins[0]!.items.map((i) => i.slug)).toEqual(["a-early", "b-late"]);
    expect(dated.orderMeaningful).toBe(true);
    const mixed = figure2Model(
      d,
      [pub("z-dated", "2024-09"), pub("a-undated")],
      [],
      real.directions,
    );
    expect(mixed.bins[0]!.items.map((i) => i.slug)).toEqual(["z-dated", "a-undated"]);
    expect(mixed.orderMeaningful).toBe(false);
    // One paper per year: nothing to order.
    expect(figure2Model(d, [pub("solo")], [], real.directions).orderMeaningful).toBe(true);
  });
});

describe("research index strips (small multiples of Fig. 1, in year bins)", () => {
  const rows = [
    [2026, 2026, 2026, 2026],
    [2025, 2026, 2026],
    [2021, 2023, 2025, 2025, 2026, 2026, null],
  ];
  it("one bin per year with papers in any row, as wide as the fullest row needs", () => {
    const axis = stripAxis(rows);
    expect(axis.bins.map((b) => [b.year, b.cap])).toEqual([
      [2021, 1],
      [2023, 1],
      [2025, 2],
      [2026, 4],
    ]);
    // Bins left to right, never closer than the gap; now after the last bin.
    for (let i = 1; i < axis.bins.length; i++)
      expect(axis.bins[i]!.x - axis.bins[i - 1]!.x).toBeGreaterThanOrEqual(STRIP_GAP);
    const last = axis.bins.at(-1)!;
    expect(axis.nowX!).toBeGreaterThan(last.x + ((last.cap - 1) / 2) * STRIP_PITCH);
    expect(axis.width).toBeGreaterThan(axis.nowX!);
    expect(stripAxis([[2016], [2021]], false).nowX).toBeNull();
    expect(stripAxis([]).bins).toEqual([]);
  });
  it("one dot per dated paper; papers of one year side by side, centred on their bin, never touching", () => {
    const axis = stripAxis(rows);
    const dots = stripDots(rows[2]!, axis);
    expect(dots).toHaveLength(6);
    const y26 = dots.filter((d) => d.year === 2026).map((d) => d.x);
    const bin26 = axis.bins.find((b) => b.year === 2026)!;
    expect((y26[0]! + y26[1]!) / 2).toBeCloseTo(bin26.x);
    expect(y26[1]! - y26[0]!).toBe(STRIP_PITCH);
    // Every dot is before now.
    for (const d of stripDots(rows[0]!, axis)) expect(d.x).toBeLessThan(axis.nowX! - 7);
  });
  it("labels: now and the first year always, others where they fit, in x order", () => {
    const labels = stripLabels(stripAxis(rows)).map((l) => l.text);
    expect(labels[0]).toBe("2021");
    expect(labels.at(-1)).toBe("now");
    expect(labels).toContain("2026");
    const xs = stripLabels(stripAxis(rows)).map((l) => l.x);
    for (let i = 1; i < xs.length; i++)
      expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(STRIP_GAP);
  });
});
