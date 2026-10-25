/**
 * Fig. 1 and DirectionPearl markup (DECISIONS D-13), rendered statically for every
 * fixture set: the lane links keep their count in the accessible name, every mark
 * is decorative, one pearl per lane, no numerals or Pause control, the generated
 * stylesheet is plain text, the caption swaps wording with the data, and
 * DirectionPearl keeps its contract for the research package.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { buildFigure } from "@/lib/figure/buildFigure";

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
const { DirectionPearl } = await import("@/components/figure/DirectionPearl");

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const FIX = path.join(ROOT, "tests/fixtures/content");
const TODAY = "2026-10-20";
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

const SETS = ["n1", "n2", "n3", "n4", "n6", "n7", "n8", "long-labels", "seeds-0-1-7-12-24"];

describe("Fig. 1 markup", () => {
  for (const set of [...SETS, "content"]) {
    it(`${set}: links with counts, decorative marks, one pearl per lane`, () => {
      const dir = set === "content" ? path.join(ROOT, "content") : path.join(FIX, set);
      const m = buildFigure(buildContent(loadRawContent(dir), { preview: true, today: TODAY }));
      const html = renderToStaticMarkup(<PearlFigure model={m} />);
      expect(html).toContain('<nav class="f1-nav" aria-label="Research directions">');
      expect(count(html, /class="f1-item"/g)).toBe(m.n);
      // Lane link: label, a hidden comma, and the count inside the link.
      for (const l of m.lanes) {
        const re = new RegExp(
          `href="/research/${l.slug}/" class="f1-link"><span class="f1-label">[^<]+</span><span class="vh">, </span><span class="f1-count">${l.papers} papers?</span></a>`,
        );
        expect(html).toMatch(re);
      }
      expect(count(html, /class="f1-track" aria-hidden="true"/g)).toBe(m.n);
      expect(count(html, /class="pearl f1-pearl"/g)).toBe(m.n);
      expect(count(html, /class="f1-dot( is-tw)?"/g)).toBe(
        m.lanes.reduce((a, l) => a + l.dots.length, 0),
      );
      expect(html).not.toMatch(/f1-idx|f1-pause|f1-halo|f1-seed|Pause motion/);
      expect(html).toContain('class="f1-cap" aria-live="off"');
      // The generated stylesheet renders as plain text.
      const css = html.match(/<style>([^<]*)<\/style>/)?.[1] ?? "";
      expect(css).toContain(".f1-plate{--f1-mode:list}");
      expect(css).not.toMatch(/&[a-z]+;/);
      // Strips only (no island, no live layers) for one or more than eight directions.
      if (m.state !== "figure") {
        expect(html).toContain('class="f1 f1--list"');
        expect(html).not.toContain('data-cap="d:');
      } else {
        expect(count(html, /data-cap="d:/g)).toBe(m.n);
        expect(count(html, /data-cap="p:/g)).toBe(m.papers.length);
      }
    });
  }

  it("caption wording follows the data: links vs twin rings, rings only with work in progress", () => {
    const c = buildContent(loadRawContent(path.join(ROOT, "content")), {
      preview: true,
      today: TODAY,
    });
    const m = buildFigure(c);
    const html = renderToStaticMarkup(<PearlFigure model={m} />);
    expect(html).toContain("Figure 1.");
    if (m.papers.some((p) => p.lanes.length > 1)) {
      expect(html).toContain("a vertical link joins a paper");
      expect(html).toContain("a ringed dot is a paper");
    }
    if (m.passesOver) expect(html).toContain("passing over any line between them");
    const noWip = { ...m, lanes: m.lanes.map((l) => ({ ...l, wip: [] })), wipMax: 0 };
    const h2 = renderToStaticMarkup(<PearlFigure model={noWip} />);
    expect(h2).not.toContain("Open rings");
    expect(h2).not.toContain('class="f1-wip-l"');
  });
});

describe("DirectionPearl (research package contract)", () => {
  it("hero and rail: the flat pearl, class before data-slug, decorative, no numeral", () => {
    for (const size of ["hero", "rail"] as const) {
      const html = renderToStaticMarkup(
        <DirectionPearl slug="ai-at-work" index={2} swatch="lychee" seedCount={5} size={size} />,
      );
      expect(html).toMatch(
        new RegExp(
          `^<span class="f1-dp f1-dp--${size}" data-swatch="lychee" data-slug="ai-at-work" aria-hidden="true"><span class="pearl f1-pearl"></span></span>$`,
        ),
      );
    }
  });

  it("archived: a quiet pearl that never takes a view-transition name", () => {
    const html = renderToStaticMarkup(
      <DirectionPearl
        slug="old"
        index={null}
        swatch="oolong"
        seedCount={0}
        size="hero"
        vtName="pearl-old"
      />,
    );
    expect(html).toContain('class="f1-dp f1-dp--hero f1-dp--quiet"');
    expect(html).not.toContain("f1-idx");
  });
});
