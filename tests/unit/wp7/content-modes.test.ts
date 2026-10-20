/**
 * WP7: the imported content/ loads in both modes (DECISIONS D-03, D-06).
 * Production drops every draft; preview keeps them; unlisted people never appear.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildContent, loadRawContent } from "@/lib/content/load";

const dir = path.resolve(process.cwd(), "content");
const TODAY = "2026-10-20";

describe.skipIf(!fs.existsSync(path.join(dir, "site.yml")))(
  "content/ in production vs preview",
  () => {
    const raw = loadRawContent(dir);
    const prod = buildContent(raw, { preview: false, today: TODAY, dir });
    const prev = buildContent(raw, { preview: true, today: TODAY, dir });

    const summary = (c: typeof prod) => ({
      directions: c.directions.length,
      archivedDirections: c.archivedDirections.length,
      publications: c.publications.length,
      counted: c.countedPublications.length,
      inProgress: c.inProgress.length,
      projects: c.projects.length,
      people: c.people.length,
      news: c.news.length,
      opportunities: c.opportunities.length,
      pages: Object.keys(c.pages).length,
    });

    it("production excludes every draft", () => {
      console.info("production:", JSON.stringify(summary(prod)));
      for (const xs of [
        prod.directions,
        prod.archivedDirections,
        prod.publications,
        prod.projects,
        prod.news,
        prod.opportunities,
      ])
        for (const x of xs as Array<{ draft: boolean }>) expect(x.draft).toBe(false);
      expect(Object.keys(prod.pages)).toEqual(
        Object.entries(raw.pages)
          .filter(([, v]) => v && !v.draft)
          .map(([k]) => k),
      );
    });

    it("D-06: production shows the PI plus only non-draft, listed people", () => {
      expect(prod.people.some((p) => p.role === "pi")).toBe(true);
      const allowed = raw.entries.people.filter((p) => p.listed && !p.draft).map((p) => p.slug);
      expect(prod.people.map((p) => p.slug).sort()).toEqual(allowed.sort());
    });

    it("preview includes drafts; unlisted people never render", () => {
      console.info("preview:", JSON.stringify(summary(prev)));
      const listed = raw.entries.people.filter((p) => p.listed).length;
      expect(prev.people).toHaveLength(listed);
      for (const p of raw.entries.people.filter((x) => !x.listed))
        expect(prev.getPerson(p.slug)).toBeUndefined();
      expect(prev.publications.length).toBe(raw.entries.publications.length);
    });
  },
);
