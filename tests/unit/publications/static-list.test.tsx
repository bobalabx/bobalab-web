/**
 * The no-JS list (WP3 acceptance #1): the <Suspense> fallback that the static
 * export writes into /publications/index.html renders every counted paper,
 * grouped by year (newest first) with "Jump to year" links.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicationsStatic } from "@/components/publications/PublicationsStatic";
import { buildIndexData } from "@/lib/publications/index-data";
import { groupDocsByYear } from "@/lib/publications/filters";
import { hasContent, loadContent } from "./helpers";

describe.skipIf(!hasContent)("PublicationsStatic", () => {
  for (const preview of [false, true]) {
    it(`lists every counted publication by year (${preview ? "preview" : "production"})`, () => {
      const c = loadContent(undefined, preview);
      const { docs } = buildIndexData(c, c.countedPublications);
      const groups = groupDocsByYear(docs).map((g) => ({
        year: g.year,
        slugs: g.items.map((d) => d.slug),
      }));
      // Stand-in entries (the real page passes server-rendered <PublicationEntry>s).
      const entries = Object.fromEntries(
        docs.map((d) => [d.slug, <article key={d.slug} data-slug={d.slug} />]),
      );
      const html = renderToStaticMarkup(
        <PublicationsStatic groups={groups} entries={entries} total={docs.length} />,
      );

      const slugs = [...html.matchAll(/data-slug="([^"]+)"/g)].map((m) => m[1]);
      expect(slugs).toEqual(groups.flatMap((g) => g.slugs));
      expect(new Set(slugs)).toEqual(new Set(c.countedPublications.map((p) => p.slug)));
      // No work in progress in the main list (D-05).
      for (const p of c.inProgress) expect(slugs).not.toContain(p.slug);

      const years = [...html.matchAll(/<h2 id="(y[^"]+)" class="pubs-year__h">/g)].map((m) => m[1]);
      expect(years).toEqual(groups.map((g) => (g.year === null ? "y-undated" : `y${g.year}`)));
      if (groups.length > 1) {
        const jumps = [...html.matchAll(/href="#(y[^"]+)"/g)].map((m) => m[1]);
        expect(jumps).toEqual(years);
      }
      expect(html).toContain(`${docs.length} publications`);
    });
  }

  it("reserves the island's search block (no layout shift) and hides it without JavaScript", () => {
    const html = renderToStaticMarkup(
      <PublicationsStatic groups={[]} entries={{}} total={0} hasPanel />,
    );
    const pending =
      /<div class="pubs-filters pubs-filters--pending" aria-hidden="true" inert="">([\s\S]*?)<\/div><\/div>/.exec(
        html,
      );
    expect(pending, html).not.toBeNull();
    // No-JS visitors never see a dead control.
    expect(html).toContain(
      "<noscript><style>.pubs-filters--pending{display:none!important}</style></noscript>",
    );
    // Nothing in the stand-in is reachable by keyboard or announced.
    expect(html).toMatch(/<input[^>]*class="pubs-input"[^>]*tabindex="-1"[^>]*>/);
    expect(html).toMatch(/<input[^>]*readonly=""/i);
    expect(html).not.toMatch(/<button|<h2>Search/);
    expect(html).toContain('class="pubs-toggle"');
    expect(
      renderToStaticMarkup(<PublicationsStatic groups={[]} entries={{}} total={0} />),
    ).not.toContain('class="pubs-toggle"');
  });
});
