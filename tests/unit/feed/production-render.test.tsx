/**
 * WP5 pages in PRODUCTION mode (drafts excluded, DECISIONS D-03), rendered
 * to static HTML without Next. The shared dev server always runs in preview
 * mode, so this is the evidence for what `npm run build` will publish today:
 * only non-draft content, empty sections hidden, and a contact on every page.
 *
 * Runs against the real content directory (skipped if it is absent).
 * Side output for visual QA: test-results/WP5/prod-<page>.html (the <main>
 * contents), which tests/e2e/pages.spec.ts swaps into the live page for
 * screenshots of the production empty states.
 */
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { clearContentCache, getContent } from "@/lib/content/load";
import { formatDate } from "@/lib/content/dates";
import JoinPage from "@/app/join/page";
import AboutPage, { generateMetadata as aboutMetadata } from "@/app/about/page";
import AccessibilityPage from "@/app/accessibility/page";
import PrivacyPage from "@/app/privacy/page";
import NewsPage from "@/app/news/page";
import NewsItemPage from "@/app/news/[slug]/page";
import NotFound from "@/app/not-found";

const OUT = path.join(process.cwd(), "test-results/WP5");
function keep(name: string, html: string) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `prod-${name}.html`), html);
}

const present = fs.existsSync(path.join(process.cwd(), "content", "site.yml"));
const saved = { INCLUDE_DRAFTS: process.env.INCLUDE_DRAFTS, CONTENT_DIR: process.env.CONTENT_DIR };

describe.skipIf(!present)("WP5 pages in a production build (drafts excluded)", () => {
  beforeAll(() => {
    process.env.INCLUDE_DRAFTS = "0";
    delete process.env.CONTENT_DIR;
    clearContentCache();
  });
  afterAll(() => {
    if (saved.INCLUDE_DRAFTS === undefined) delete process.env.INCLUDE_DRAFTS;
    else process.env.INCLUDE_DRAFTS = saved.INCLUDE_DRAFTS;
    if (saved.CONTENT_DIR !== undefined) process.env.CONTENT_DIR = saved.CONTENT_DIR;
    clearContentCache();
  });

  it("loads production content", () => {
    const c = getContent();
    expect(c.preview).toBe(false);
    expect(c.news.every((n) => !n.draft)).toBe(true);
    expect(c.opportunities.every((o) => !o.draft)).toBe(true);
  });

  it("Join: only published opportunities, status with as-of date, a mailto in every audience", () => {
    const c = getContent();
    const html = renderToStaticMarkup(<JoinPage />);
    keep("join", html);
    expect(html).not.toContain("Draft · pending lab review");
    for (const o of c.opportunities) {
      expect(html).toContain(o.title.replace(/&/g, "&amp;"));
      if (o.as_of) expect(html).toContain(formatDate(o.as_of));
    }
    for (const id of ["students", "partners", "press"]) {
      const start = html.indexOf(`<section class="pg-section" aria-labelledby="${id}"`);
      expect(start, id).toBeGreaterThan(-1);
      const end = html.indexOf("</section>", start);
      expect(html.slice(start, end)).toContain(`href="mailto:${c.site.email}`);
    }
  });

  it("About: fact sheet from site.yml and the PI record, even without the draft About text", () => {
    const c = getContent();
    const html = renderToStaticMarkup(<AboutPage />);
    keep("about", html);
    expect(html).toContain(c.site.long_name);
    expect(html).toContain(c.site.affiliation_text);
    expect(html).toContain(c.site.address);
    expect(html).toContain(`href="mailto:${c.site.email}"`);
    const pi = c.people.find((p) => p.role === "pi");
    if (pi) expect(html).toContain(pi.name);
    expect(html).toContain('"@type":"ResearchOrganization"');
    if (!c.pages.about) expect(html).not.toContain('class="prose"');
  });

  it("About: the meta description only promises sections the page renders (CON-15)", () => {
    const c = getContent();
    const html = renderToStaticMarkup(<AboutPage />);
    const description = String(aboutMetadata().description ?? "");
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(160);
    if (!c.pages.about?.intro) {
      const showsMission = html.includes('id="about-mission"');
      expect(description.includes("mission")).toBe(showsMission);
      expect(description.includes("principal investigator")).toBe(
        c.people.some((p) => p.role === "pi"),
      );
      expect(description.endsWith("contact.")).toBe(true);
    }
  });

  it("Accessibility and Privacy: a heading and a contact even before the statements are published", () => {
    const c = getContent();
    for (const [Page, title] of [
      [AccessibilityPage, "Accessibility"],
      [PrivacyPage, "Privacy"],
    ] as const) {
      const html = renderToStaticMarkup(<Page />);
      keep(title.toLowerCase(), html);
      expect(html).toMatch(/<h1[^>]*>/);
      expect(html).toContain(c.pages[title.toLowerCase() as "privacy"]?.title ?? title);
      expect(html).toContain(`href="mailto:${c.site.email}`);
    }
  });

  it("News: only published items, each with a full date", () => {
    const c = getContent();
    const html = renderToStaticMarkup(<NewsPage />);
    expect(html).not.toContain("Draft · pending lab review");
    for (const n of c.news) expect(html).toContain(`>${formatDate(n.date)}</time>`);
    const items = html.match(/<article class="bl-news"/g) ?? [];
    expect(items).toHaveLength(c.news.length);
  });

  it("News item: renders a published item; a draft slug is not found", async () => {
    const c = getContent();
    const first = c.news[0];
    if (first) {
      const el = await NewsItemPage({ params: Promise.resolve({ slug: first.slug }) });
      const html = renderToStaticMarkup(el);
      expect(html).toContain('"@type":"NewsArticle"');
      expect(html).toContain(formatDate(first.date));
    }
    const draft = fs
      .readdirSync(path.join(process.cwd(), "content", "news"))
      .map((f) => f.replace(/\.md$/, ""))
      .find((slug) => !c.news.some((n) => n.slug === slug));
    if (draft) {
      await expect(NewsItemPage({ params: Promise.resolve({ slug: draft }) })).rejects.toThrow();
    }
  });

  it("404: the pun, a link home, and only live (published) directions", () => {
    const c = getContent();
    const html = renderToStaticMarkup(<NotFound />);
    keep("404", html);
    expect(html).toContain("This page got stuck in the straw");
    expect(html).toMatch(/href="\/"/);
    expect((html.match(/class="pg-dirs"/g) ?? []).length).toBe(c.directions.length ? 1 : 0);
  });
});
