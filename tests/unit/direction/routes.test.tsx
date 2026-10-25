/**
 * WP2 routes rendered on the server (no browser): static params for the export
 * (WP2 #1), one h1, one mounted element per pearl-{slug} name (WP2 #2), derived
 * counts (#4), the see-all filter (#5), breadcrumbs (#6) and JSON-LD (#7).
 * Pages read CONTENT_DIR, so each test points it at a fixture set.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement, ReactNode } from "react";

// next/link needs the App Router at runtime; a plain anchor is enough here.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    transitionTypes,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    transitionTypes?: string[];
  }) => (
    <a href={href} data-transition={transitionTypes?.join(" ")} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const ENV = { ...process.env };
function useFixture(set: string, drafts = false) {
  process.env.CONTENT_DIR = path.join(FIX, set);
  process.env.INCLUDE_DRAFTS = drafts ? "1" : "0";
}
afterAll(() => {
  process.env = ENV;
});

const html = async (el: Promise<ReactElement> | ReactElement) => renderToStaticMarkup(await el);
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe("generateStaticParams for the static export (WP2 #1)", () => {
  beforeEach(() => vi.resetModules());

  it("direction pages: one param per direction, dynamicParams = false", async () => {
    useFixture("n4");
    const { getContent } = await import("@/lib/content/load");
    const page = await import("@/app/research/[direction]/page");
    expect(page.dynamicParams).toBe(false);
    const c = getContent();
    expect(page.generateStaticParams().map((p) => p.direction)).toEqual(
      [...c.directions, ...c.archivedDirections].map((d) => d.slug),
    );
    expect(page.generateStaticParams()).toHaveLength(4);
  });
  it("never returns [] (0 live directions → the _none placeholder, which 404s)", async () => {
    useFixture("n0");
    const page = await import("@/app/research/[direction]/page");
    expect(page.generateStaticParams()).toEqual([{ direction: "_none" }]);
    await expect(page.default({ params: Promise.resolve({ direction: "_none" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });
  it("project pages: one param per project, placeholder when empty", async () => {
    useFixture("n4");
    const page = await import("@/app/projects/[slug]/page");
    expect(page.dynamicParams).toBe(false);
    expect(page.generateStaticParams()).toHaveLength(4);
    useFixture("n0");
    vi.resetModules();
    const empty = await import("@/app/projects/[slug]/page");
    expect(empty.generateStaticParams()).toEqual([{ slug: "_none" }]);
  });
});

describe("direction page markup", () => {
  beforeEach(() => vi.resetModules());

  it("one h1 (tabIndex -1), Figure 1 pearl = the only morph target, derived counts, see-all filter, More directions, no stat or provenance sentences", async () => {
    useFixture("n4");
    const { getContent } = await import("@/lib/content/load");
    const c = getContent();
    const page = await import("@/app/research/[direction]/page");
    for (const d of c.directions) {
      const out = await html(page.default({ params: Promise.resolve({ direction: d.slug }) }));
      expect(count(out, /<h1[\s>]/g)).toBe(1);
      expect(out).toMatch(/<h1 tabindex="-1"/i);
      // Exactly one DirectionPearl: the figure's pearl at "now", the morph target
      // (no rail pearls any more), carrying this direction's slug.
      const slugs = [...out.matchAll(/class="f1-dp[^"]*"[^>]*data-slug="([^"]+)"/g)].map(
        (m) => m[1],
      );
      const hasFigure = d.counts.papers + d.counts.inProgress > 0;
      expect(slugs).toEqual(hasFigure ? [d.slug] : []);
      // The direction's figure (the page's Figure 1): one column per counted paper and per
      // work in progress, each paper linked.
      if (hasFigure) {
        expect(out).toContain('aria-labelledby="dr-f2-cap"');
        expect(out).toContain("<b>Figure 1.</b>");
        expect(out).not.toContain("<b>Figure 2.</b>");
        expect(count(out, /class="dr-f2__p"/g)).toBe(d.counts.papers);
        expect(count(out, /class="dr-f2__p dr-f2__p--wip"/g)).toBe(d.counts.inProgress);
        for (const p of c.countedPublications.filter((x) => x.directions.includes(d.slug)))
          expect(out).toContain(`href="/publications/${p.slug}/"`);
      }
      // Section labels carry the derived counts; the header has no counts sentence.
      if (d.counts.projects > 0) expect(out).toContain(`${d.counts.projects} project`);
      if (d.counts.papers > 0) expect(out).toContain(`${d.counts.papers} paper`);
      expect(out).not.toContain('class="dr-status"');
      // Copy sweep: no stats-as-prose, date stamps or provenance hedges.
      expect(out).not.toMatch(/Shares \d|, as of |last updated|reported by the lab/i);
      expect(out).not.toContain("Order within a year");
      if (d.counts.papers > 0) expect(out).toContain(`href="/publications/?direction=${d.slug}"`);
      // More directions: every other live direction once, sliding by index;
      // "All directions" reverses the morph.
      const rail = /<nav class="dr-rail[\s\S]*?<\/nav>/.exec(out)?.[0] ?? "";
      const railHrefs = [...rail.matchAll(/href="\/research\/([a-z0-9-]+)\/"/g)].map((m) => m[1]);
      expect(railHrefs.sort()).toEqual(
        c.directions
          .filter((x) => x.slug !== d.slug)
          .map((x) => x.slug)
          .sort(),
      );
      expect(rail).toMatch(/data-transition="nav-(forward|back)"/);
      expect(out).toContain('data-transition="pearl-close"');
      // No pre-redesign kit: no tinted band, no numerals, no "This direction collects" hedges.
      expect(out).not.toContain("dr-band");
      expect(out).not.toContain("f1-idx");
      expect(out).not.toMatch(/Listed by title only/i);
      // JSON-LD
      expect(out).toContain('"@type":"ResearchProject"');
      // Empty sections are hidden: fixture n4 has no findings and no people.
      expect(out).not.toContain("What we’ve found");
    }
  });

  it("drafts are excluded in production, shown with a badge in preview", async () => {
    useFixture("n0", true);
    const { getContent } = await import("@/lib/content/load");
    const c = getContent();
    expect(c.directions.length).toBeGreaterThan(0);
    const page = await import("@/app/research/[direction]/page");
    const out = await html(
      page.default({ params: Promise.resolve({ direction: c.directions[0]!.slug }) }),
    );
    expect(out).toContain("Draft · pending lab review");
  });
});

describe("project page markup", () => {
  beforeEach(() => vi.resetModules());

  it("breadcrumb Research › Direction › Project, consent-gated team, JSON-LD", async () => {
    useFixture("consent-edge-cases");
    const page = await import("@/app/projects/[slug]/page");
    const out = await html(page.default({ params: Promise.resolve({ slug: "consent-project" }) }));
    const crumbs = /<nav aria-label="Breadcrumb"[\s\S]*?<\/nav>/.exec(out)?.[0] ?? "";
    expect(crumbs).toContain('href="/research/"');
    expect(crumbs).toContain('href="/research/advice/"');
    expect(crumbs).toContain('aria-current="page"');
    expect(crumbs).toContain("Fixture project consent-project");
    // Collaborators/partners only with consent / public.
    expect(out).toContain("Kai Consented");
    expect(out).not.toContain("Lee Notconsented");
    expect(out).toContain("Fixture Public Partner");
    expect(out).not.toContain("Fixture Private Partner");
    // Unlisted and (in production) draft people never appear.
    expect(out).not.toMatch(/emery-hidden|Emery/);
    expect(out).not.toMatch(/indigo-draft|Indigo/);
    expect(out).toContain('"@type":"ResearchProject"');
    // Copy sweep: the facts row has no People or Papers summaries (the Team and Papers
    // sections carry them), and the page has no provenance or date-stamp boilerplate.
    expect(out).not.toContain("<dt>People</dt>");
    expect(out).not.toContain("<dt>Papers</dt>");
    expect(out).not.toMatch(/reported by the lab|, as of |As of |full citation in APA/i);
  });
});

describe("archived direction (real content)", () => {
  beforeEach(() => vi.resetModules());

  it("no pearl and no morph name, 'Earlier research' with its date, Figure 1 only when there is a line, back to /research/", async () => {
    process.env.CONTENT_DIR = fileURLToPath(new URL("../../../content/", import.meta.url));
    process.env.INCLUDE_DRAFTS = "0";
    const { getContent } = await import("@/lib/content/load");
    const c = getContent();
    const page = await import("@/app/research/[direction]/page");
    for (const d of c.archivedDirections) {
      const out = await html(page.default({ params: Promise.resolve({ direction: d.slug }) }));
      expect(out).not.toContain("f1-dp");
      expect(out).toContain("<b>Earlier research</b>");
      // No archive date stamp (copy sweep).
      expect(out).not.toMatch(/archived <time dateTime=/);
      // A figure needs two or more items (a line); a lone paper is listed under Papers only.
      const items = d.counts.papers + d.counts.inProgress;
      if (items >= 2) {
        expect(out).toContain("<b>Figure 1.</b>");
        // No pearl at now, so the line stops at the last paper (the header already says
        // "Earlier research", so the caption does not explain it again).
        expect(out).not.toContain("The line ends at the last paper");
        expect(out).not.toMatch(/class="dr-f2"[^>]*data-live/);
      } else {
        expect(out).not.toContain('class="dr-f2"');
        if (d.counts.papers === 1) expect(out).toContain('class="dr-pubs"');
      }
      expect(out).toMatch(/<a href="\/research\/" class="dr-back"/);
    }
  });
});

describe("index pages: empty states and archived directions", () => {
  beforeEach(() => vi.resetModules());

  it("0 live directions (production before launch): short empty state, no empty sections", async () => {
    useFixture("n0");
    const research = await import("@/app/research/page");
    const out = await html(research.default());
    expect(out).toContain("Research directions are coming soon.");
    expect(out).not.toContain('id="rs-directions"');
    expect(out).not.toContain('id="rs-earlier"');
    const projects = await import("@/app/projects/page");
    expect(await html(projects.default())).toContain("Projects are coming soon.");
  });

  it("live directions in editorial order; archived ones only under 'Earlier and related research'", async () => {
    useFixture("n4");
    const { getContent } = await import("@/lib/content/load");
    const c = getContent();
    const research = await import("@/app/research/page");
    const out = await html(research.default());
    const grid = /id="rs-directions"[\s\S]*?<\/ol>/.exec(out)?.[0] ?? "";
    const hrefs = [...grid.matchAll(/href="\/research\/([a-z0-9-]+)\/"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(c.directions.map((d) => d.slug));
    for (const a of c.archivedDirections) expect(grid).not.toContain(`/research/${a.slug}/`);
  });
});

describe("project <title> is unique (WCAG 2.4.2; verify A11Y-03)", () => {
  beforeEach(() => vi.resetModules());

  it("uses '{Title} · BOBALAB' and qualifies it only when a paper has the same title", async () => {
    for (const set of ["n4", "real"]) {
      vi.resetModules();
      if (set === "real") {
        process.env.CONTENT_DIR = fileURLToPath(new URL("../../../content/", import.meta.url));
        process.env.INCLUDE_DRAFTS = "0";
      } else useFixture(set);
      const { getContent } = await import("@/lib/content/load");
      const c = getContent();
      const page = await import("@/app/projects/[slug]/page");
      const paperTitles = new Set(c.publications.map((x) => `${x.title} · ${c.site.name}`));
      const titles = new Set<string>();
      for (const p of c.projects) {
        const meta = await page.generateMetadata({ params: Promise.resolve({ slug: p.slug }) });
        const t = meta.title as { absolute: string };
        const clash = c.publications.some((x) => x.title.toLowerCase() === p.title.toLowerCase());
        expect(t.absolute).toBe(`${p.title}${clash ? " (project)" : ""} · ${c.site.name}`);
        expect(paperTitles.has(t.absolute)).toBe(false);
        titles.add(t.absolute);
      }
      expect(titles.size).toBe(c.projects.length);
    }
  });
});

describe("project Team credits paper authors in production (verify CON-11)", () => {
  beforeEach(() => vi.resetModules());

  it("every team member who authors one of the project's papers is named in Team (real content)", async () => {
    process.env.CONTENT_DIR = fileURLToPath(new URL("../../../content/", import.meta.url));
    process.env.INCLUDE_DRAFTS = "0";
    const { getContent } = await import("@/lib/content/load");
    const c = getContent();
    const page = await import("@/app/projects/[slug]/page");
    for (const p of c.projects) {
      const out = await html(page.default({ params: Promise.resolve({ slug: p.slug }) }));
      const team = /<section[^>]*aria-labelledby="team"[\s\S]*?<\/section>/.exec(out)?.[0] ?? "";
      let named = 0;
      for (const slug of p.team) {
        const listed = c.getPerson(slug);
        if (listed) {
          expect(team).toContain(listed.name);
          continue;
        }
        // Not public in this build (draft or unlisted): named only as a paper author here.
        const author = p.publicationRefs.flatMap((x) => x.authors).find((a) => a.person === slug);
        if (author) {
          expect(team, `${p.slug} team should name ${slug}`).toContain(author.name);
          named++;
        }
      }
      if (p.slug === "learning-on-the-go" && !c.getPerson("shunan-jiang")) expect(named).toBe(1);
      // Hidden members get no link, avatar or role: only listed people link to /people/.
      const links = [...team.matchAll(/href="\/people\/([a-z0-9-]+)\/"/g)].map((m) => m[1]);
      for (const s of links) expect(c.getPerson(s!)).toBeTruthy();
    }
  });
});
