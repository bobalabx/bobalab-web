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

  it("one h1 (tabIndex -1), hero = morph target, rail names unique, derived counts, see-all filter", async () => {
    useFixture("n4");
    const { getContent } = await import("@/lib/content/load");
    const c = getContent();
    const page = await import("@/app/research/[direction]/page");
    for (const d of c.directions) {
      const out = await html(page.default({ params: Promise.resolve({ direction: d.slug }) }));
      expect(count(out, /<h1[\s>]/g)).toBe(1);
      expect(out).toMatch(/<h1 tabindex="-1"/i);
      // Every pearl slug on the page appears on exactly one DirectionPearl.
      const slugs = [...out.matchAll(/class="f1-dp[^"]*"[^>]*data-slug="([^"]+)"/g)].map(
        (m) => m[1],
      );
      expect(new Set(slugs).size).toBe(slugs.length);
      expect(slugs[0]).toBe(d.slug);
      expect(slugs.slice(1).sort()).toEqual(
        c.directions
          .filter((x) => x.slug !== d.slug)
          .map((x) => x.slug)
          .sort(),
      );
      // Status line is derived from the loader counts.
      expect(out).toContain(`${d.counts.projects} project`);
      expect(out).toContain(`${d.counts.papers} paper`);
      if (d.counts.papers > 0) expect(out).toContain(`href="/publications/?direction=${d.slug}"`);
      // Rail links slide by index; "All directions" reverses the morph.
      expect(out).toMatch(/data-transition="nav-(forward|back)"/);
      expect(out).toContain('data-transition="pearl-close"');
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
