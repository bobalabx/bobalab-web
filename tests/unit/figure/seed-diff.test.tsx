/**
 * Brief §E10.2 end to end: adding one paper FILE to a fixture (through the real
 * loader, D-05 counting and the figure model) changes only that direction's
 * rendered seeds; every other direction's markup is byte-identical, and the
 * existing dots of the changed direction do not move (≤ 5 seeds).
 */
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildContent } from "@/lib/content/load";
import { parseContentFiles, readContentFiles, type VirtualFile } from "@/lib/content/read";
import { buildFigure } from "@/lib/figure/buildFigure";
import { SeedOrbit } from "@/components/figure/parts";

const FIX = fileURLToPath(new URL("../../fixtures/content/n4", import.meta.url));
const TODAY = "2026-10-20";

const extraPaper = (direction: string): VirtualFile => ({
  path: "publications/example-2026-fixture-paper-extra.md",
  text: [
    "---",
    "title: Fixture paper added by the seed diff test",
    "authors:",
    "  - name: Avery Example",
    "    person: avery-example",
    "type: journal",
    "venue: Journal of Fixtures",
    "year: 2026",
    "doi: 10.5555/fixture.n4.extra",
    "status: published",
    "links:",
    "  pdf: https://example.org/papers/fixture-extra.pdf",
    "presentations: []",
    "directions:",
    `  - ${direction}`,
    "in_brief: Fixture plain-language summary written for layout testing.",
    "featured: false",
    "draft: false",
    "---",
    "",
  ].join("\n"),
});

function figureFrom(files: VirtualFile[]) {
  const raw = parseContentFiles(files);
  expect(raw.issues.filter((i) => i.severity === "error")).toEqual([]);
  const c = buildContent(raw, { preview: false, today: TODAY });
  const m = buildFigure(c);
  return new Map(
    m.items.map((it) => [
      it.slug,
      { ...it, html: renderToStaticMarkup(<SeedOrbit papers={it.papers} />) },
    ]),
  );
}

describe("adding one paper file (brief §E10.2)", () => {
  const files = readContentFiles(FIX);
  const base = figureFrom(files);

  for (const target of ["ai-work", "advice"]) {
    it(`to "${target}" changes only that direction's seeds`, () => {
      const after = figureFrom([...files, extraPaper(target)]);
      expect([...after.keys()]).toEqual([...base.keys()]);
      for (const [slug, now] of after) {
        const was = base.get(slug)!;
        if (slug !== target) {
          expect(now.html, slug).toBe(was.html);
          expect(now.papers, slug).toBe(was.papers);
          continue;
        }
        expect(now.papers).toBe(was.papers + 1);
        expect(now.seeds).toBe(Math.min(12, was.seeds + 1));
        // The dots that were already there keep their exact markup (same angle, same k).
        const dots = (html: string) => html.match(/<i [^>]*><\/i>/g) ?? [];
        const before = dots(was.html);
        expect(dots(now.html).slice(0, before.length)).toEqual(before);
        expect(dots(now.html)).toHaveLength(before.length + 1);
      }
    });
  }
});
