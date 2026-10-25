/**
 * Fig. 1 as the /research map (DECISIONS D-14; JUDGE.md "Where the timeline
 * moves"): with a `heading`, PearlFigure renders the heading, ONE key sentence
 * whose clauses follow the data (links / twin rings / "named under each line",
 * rings only with work in progress), and a short caption that leaves the key's
 * content to the key. Without a heading nothing changes (the long caption).
 * Also: every mark and text colour the map draws on the --band ground keeps its
 * contrast (text AA; marks 3:1), in both schemes.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { buildFigure } from "@/lib/figure/buildFigure";
import { CORE_DARK, CORE_LIGHT, SWATCHES, contrastRatio } from "@/lib/content/palette";

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

const { PearlFigure } = await import("@/components/figure/PearlFigure");

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const FIX = path.join(ROOT, "tests/fixtures/content");
const TODAY = "2026-10-20";
const model = (set: string) =>
  buildFigure(
    buildContent(
      loadRawContent(set === "content" ? path.join(ROOT, "content") : path.join(FIX, set)),
      {
        preview: true,
        today: TODAY,
      },
    ),
  );
const H = <h2 id="map-h">Explore</h2>;
/** Visible text of an element of the static markup (tags stripped). */
const textOf = (html: string, cls: string) => {
  const m = html.match(new RegExp(`<p class="${cls}">([\\s\\S]*?)</p>`));
  return (m?.[1] ?? "").replace(/<[^>]+>/g, "");
};

describe("map variant markup", () => {
  for (const set of ["n2", "n3", "n4", "n8", "content"]) {
    it(`${set}: heading + a short plain-sentence key before the plate, short caption`, () => {
      const m = model(set);
      const html = renderToStaticMarkup(<PearlFigure model={m} heading={H} />);
      expect(html).toContain('class="f1 f1--map"');
      const head = html.indexOf('class="f1-head"');
      expect(head).toBeGreaterThan(-1);
      expect(html.indexOf('<h2 id="map-h">')).toBeGreaterThan(head);
      expect(html.indexOf('class="f1-key"')).toBeLessThan(html.indexOf("<figure"));
      // Every glyph of the key is decorative.
      for (const g of html.match(/<i class="f1-k [^"]+"[^>]*>/g) ?? [])
        expect(g).toContain('aria-hidden="true"');
      // Short plain sentences, not one colon-and-semicolon chain (copy sweep).
      const key = textOf(html, "f1-key");
      expect(key.startsWith("Each line is a direction and each dot a paper, placed by year.")).toBe(
        true,
      );
      expect(key).not.toMatch(/: /);
      expect(key.trim().endsWith(".")).toBe(true);
      // The short caption leaves the encoding to the key, with no inclusion rule or date stamp.
      expect(html).toContain("<b>Figure 1.</b> The lab’s papers by direction and year.");
      expect(html).not.toMatch(
        /with a public version or a documented talk|Order within a year|As of /,
      );
      expect(html).not.toContain("Lines follow the lab");
      expect(html).not.toContain("a vertical link joins a paper that belongs");
      // The figure itself is unchanged: one pearl per lane, links with counts.
      expect((html.match(/class="pearl f1-pearl"/g) ?? []).length).toBe(m.n);
    });
  }

  it("key clauses follow the data: shared papers, packed rings, strips, work in progress", () => {
    const m = model("content");
    const html = renderToStaticMarkup(<PearlFigure model={m} heading={H} />);
    if (m.papers.some((p) => p.lanes.length > 1)) {
      expect(html).toMatch(/class="f1-cv-l">A <i[^>]*><\/i>vertical link joins a paper shared by/);
      expect(html).toMatch(/class="f1-cv-r">A <i[^>]*><\/i>ringed dot is a paper shared by/);
      expect(html).toContain(
        'class="f1-cap-m"> Papers shared with another direction are listed under each line.',
      );
    }
    if (m.lanes.some((l) => l.wip.length))
      expect(html).toContain("open rings after it are work in progress");
    const bare = {
      ...m,
      papers: m.papers.map((p) => ({ ...p, lanes: p.lanes.slice(0, 1) })),
      lanes: m.lanes.map((l) => ({ ...l, wip: [] })),
      wipMax: 0,
    };
    const h2 = renderToStaticMarkup(<PearlFigure model={bare} heading={H} />);
    expect(h2).not.toContain("vertical link");
    expect(h2).not.toContain("open rings");
    expect(textOf(h2, "f1-key")).toBe(
      "Each line is a direction and each dot a paper, placed by year. The pearl marks today.",
    );
  });

  it("without a heading the figure is unchanged: no key, the long caption", () => {
    const html = renderToStaticMarkup(<PearlFigure model={model("content")} />);
    expect(html).not.toContain("f1-key");
    expect(html).not.toContain("f1-head");
    expect(html).toContain('class="f1"');
    expect(html).toContain("<b>Figure 1.</b> Papers in the lab’s");
    expect(html).not.toMatch(/Order within a year|As of |documented talk/);
  });
});

describe("map band contrast (--band ground; the zone after now is --paper)", () => {
  const LIVE = ["butterfly-pea", "lychee", "matcha", "oolong"] as const;
  for (const [scheme, core, tone] of [
    ["light", CORE_LIGHT, "deep"],
    ["dark", CORE_DARK, "light"],
  ] as const) {
    it(`${scheme}: text AA, marks and rules 3:1`, () => {
      for (const bg of [core.band, core.paper]) {
        // Lane names, key and caption text.
        expect(contrastRatio(core.ink, bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(core.muted, bg)).toBeGreaterThanOrEqual(4.5);
        // Pearls, glyphs, the dashed "now" rule, and every direction's dots and lines
        // (also the lit lane label, 2rem bold: large text, 3:1).
        expect(contrastRatio(core.pearl, bg)).toBeGreaterThanOrEqual(3);
        for (const id of LIVE)
          expect(contrastRatio(SWATCHES[id][tone], bg), `${id} on ${bg}`).toBeGreaterThanOrEqual(3);
      }
    });
  }
});
