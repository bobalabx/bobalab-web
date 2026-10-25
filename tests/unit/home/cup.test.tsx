/**
 * The homepage boba cup (DECISIONS D-14; JUDGE.md R4, R5, R7, R16, R17):
 *  - geometry for 0, 3, 4, 5 (and 6) live directions, both proportions: pearls
 *    on the floor inside the walls without overlapping, in order; label rows
 *    top-down in the same order and clear of the risen pearl's level (wide);
 *    leader lines never cross; three ticks; the straw clear of the pearls;
 *  - the server markup: a "Research directions" nav whose <ol> holds one link per
 *    live direction to /research/<slug>/ (the no-JS fallback), in direction order;
 *    the drawing aria-hidden with flat fills only; panels hidden until picked;
 *  - each panel shows at most three items: the short question, then ONE of
 *    "One finding" (only when findings[] is filled) or "A first read" (a real
 *    paper link), then "Explore <label>" with the counts;
 *  - the empty state.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildContent, loadRawContent, type Content } from "@/lib/content/load";
import { homePearls, type HomePearl } from "@/lib/content/queries";
import { cupGeometry, cupPaths, type CupKind } from "@/components/cup/geometry";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const { BobaCup, countsLine, venueYear } = await import("@/components/cup/BobaCup");

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const content = (): Content =>
  buildContent(loadRawContent(path.join(ROOT, "content")), { preview: false, today: "2026-10-25" });

const KINDS: CupKind[] = ["wide", "narrow"];

describe("cup geometry", () => {
  for (const kind of KINDS)
    for (const n of [1, 2, 3, 4, 5, 6]) {
      it(`${kind}, ${n} pearls: on the floor, inside the walls, in order, no overlap`, () => {
        const g = cupGeometry(n, kind);
        expect(g.pearls).toHaveLength(n);
        expect(g.cy + g.r).toBeCloseTo(g.floor, 0);
        const [sx0, , , , sw] = g.straw;
        for (let i = 0; i < n; i++) {
          const p = g.pearls[i]!;
          expect(p.x - g.r).toBeGreaterThan(sx0 + sw / 2); // clear of the straw
          expect(p.x + g.r).toBeLessThan(g.R); // inside the right wall
          if (i > 0) {
            const q = g.pearls[i - 1]!;
            expect(p.x - q.x).toBeGreaterThanOrEqual(2 * g.r); // no overlap, left to right
            expect(p.ly).toBeGreaterThan(q.ly); // labels top-down in the same order
            expect(p.ly - q.ly).toBeGreaterThanOrEqual(kind === "wide" ? 38 : 44);
          }
          // Each leader goes UP from its pearl to its row (so no two leaders cross).
          expect(p.ly).toBeLessThan(g.cy - g.r);
        }
        expect(g.lx).toBeGreaterThan(g.R); // labels outside the cup
        expect(g.W - g.lx).toBeGreaterThanOrEqual(300); // room for the panel / labels
        expect(g.rise).toBeGreaterThan(g.surf + g.r); // the risen pearl stays in the tea
        if (kind === "wide" && n > 0) {
          // The panel opens level with the risen pearl, above the highest label.
          expect(g.pearls[0]!.ly - g.rise).toBeGreaterThanOrEqual(n <= 5 ? 200 : 170);
          expect(g.hy).toBeLessThan(g.H);
        }
      });
    }

  it("pearl sizes: ~56 px wide, ~36 px narrow (R4); 5 widens the cup a little", () => {
    expect(2 * cupGeometry(4, "wide").r).toBeGreaterThanOrEqual(56);
    expect(2 * cupGeometry(4, "narrow").r).toBeGreaterThanOrEqual(66); // × ~0.5 at 390
    const four = cupGeometry(4, "wide");
    const five = cupGeometry(5, "wide");
    expect(five.R).toBeGreaterThan(four.R);
    expect(five.r).toBeLessThan(four.r);
    expect(cupGeometry(3, "wide").R).toBe(four.R); // 1–4 share one cup
  });

  it("long labels widen the narrow label column (the cup scales down; labels do not wrap)", () => {
    const short = cupGeometry(4, "narrow", 19);
    const long = cupGeometry(4, "narrow", 28);
    expect(short.W - short.lx).toBeLessThanOrEqual(340);
    expect(long.W).toBeGreaterThan(short.W);
    expect((long.W - long.lx) / long.W).toBeGreaterThanOrEqual(0.65);
    expect(cupGeometry(4, "wide", 28).W).toBe(cupGeometry(4, "wide").W);
  });

  it("empty cup: no pearls, still a drawing; three ticks (R5)", () => {
    const g = cupGeometry(0, "wide");
    expect(g.pearls).toEqual([]);
    const d = cupPaths(g);
    expect(d.ticks).toHaveLength(3);
    for (const k of Object.values(d).flat()) expect(String(k)).not.toMatch(/NaN|undefined/);
  });
});

describe("cup markup", () => {
  const c = content();
  const pearls = homePearls(c);
  const html = renderToStaticMarkup(<BobaCup pearls={pearls} />);

  it("no-JS: a Research directions nav, one link per live direction in direction order", () => {
    expect(html).toMatch(/<nav aria-label="Research directions"><ol role="list" class="cup-list">/);
    const hrefs = [...html.matchAll(/<a href="([^"]+)" class="cup-lab">/g)].map((m) => m[1]);
    expect(hrefs).toEqual(c.directions.map((d) => `/research/${d.slug}/`));
    expect(html).not.toMatch(/<button/); // buttons only after hydration
    for (const d of c.directions) expect(html).toContain(`>${d.short_label}</span></a>`);
  });

  it("the drawing is decorative and flat; --tea is the only fill colour besides paper", () => {
    const svgs = html.match(/<svg[^>]*>/g)!;
    expect(svgs).toHaveLength(2);
    for (const s of svgs) expect(s).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/Gradient|<filter|feTurbulence|box-shadow/i);
  });

  it("panels are hidden until a pearl is picked, one per direction, linked by id", () => {
    const panels = [...html.matchAll(/<div class="cup-panel" id="cup-p-([a-z0-9-]+)" hidden="">/g)];
    expect(panels.map((m) => m[1])).toEqual(c.directions.map((d) => d.slug));
  });

  it("each panel: question, then one finding OR a first read, then Explore + counts", () => {
    for (const p of pearls) {
      const one = renderToStaticMarkup(<BobaCup pearls={[p]} />);
      const panel = one.slice(one.indexOf('class="cup-panel"'));
      if (p.question) expect(panel).toContain(p.question.replace(/&/g, "&amp;").slice(0, 20));
      const finding = panel.includes("One finding:");
      const first = panel.includes("A first read:");
      expect(finding && first).toBe(false);
      expect(finding).toBe(Boolean(p.finding));
      if (p.firstRead) expect(panel).toContain(`href="/publications/${p.firstRead.slug}/"`);
      expect(panel).toContain(`Explore ${p.direction.short_label.replace(/&/g, "&amp;")}`);
      expect(panel).toContain(countsLine(p.direction.counts));
      expect(panel.match(/<p class="cup-(q|read|go)"/g)!.length).toBeLessThanOrEqual(3);
    }
  });

  it("a filled findings[] replaces the first read", () => {
    const p = pearls[0]!;
    const withFinding: HomePearl = {
      ...p,
      finding: { text: "A test finding.", evidence: "published" } as HomePearl["finding"],
      firstRead: undefined,
    };
    const one = renderToStaticMarkup(<BobaCup pearls={[withFinding]} />);
    expect(one).toContain('One finding: <span class="cup-read-t">A test finding.</span>');
    expect(one).not.toContain("A first read");
  });

  it("hint and one quiet link to the timeline on /research/#map", () => {
    expect(html).toContain("Pick a pearl</span>");
    expect(html).toContain("Tap a pearl</span>");
    expect(html).toMatch(
      /<a href="\/research\/#map" class="cup-map">See how the four directions connect<\/a>/,
    );
  });

  it("empty state: the cup with no pearls says the directions are coming", () => {
    const empty = renderToStaticMarkup(<BobaCup pearls={[]} />);
    expect(empty).not.toContain("cup-pearl");
    expect(empty).toContain("Research directions are coming soon.");
    expect(empty).not.toContain("Pick a pearl");
  });

  it("3 and 5 live directions render their pearls and labels", () => {
    for (const n of [3, 5]) {
      const list = Array.from({ length: n }, (_, i) => {
        const p = pearls[i % pearls.length]!;
        return { ...p, direction: { ...p.direction, slug: `${p.direction.slug}-${i}` } };
      });
      const out = renderToStaticMarkup(<BobaCup pearls={list} />);
      expect(out.match(/class="cup-pearl"/g)).toHaveLength(n);
      expect(out).toContain(`data-n="${n}"`);
    }
  });
});

describe("wording helpers", () => {
  it("counts and venue", () => {
    expect(countsLine({ papers: 4, inProgress: 2 })).toBe("4 papers, 2 in progress");
    expect(countsLine({ papers: 1, inProgress: 0 })).toBe("1 paper");
    expect(venueYear({ venue: "Management Science", year: 2026 })).toBe("Management Science, 2026");
    expect(venueYear({ year: 2025 })).toBe("2025");
  });
});
