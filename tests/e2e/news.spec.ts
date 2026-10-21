/**
 * WP5: /news/, /news/{slug}/ and /news/feed.xml (brief §D10, §G3).
 * Runs against BASE_URL (default: the shared dev server, preview mode).
 *
 *   npx playwright test tests/e2e/news.spec.ts
 *
 * Expectations come from the content directory (preview mode, as on the dev
 * server). Screenshots: test-results/WP5/.
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { buildContent, loadRawContent } from "../../src/lib/content/load";
import { upcomingNews } from "../../src/lib/content/queries";
import { formatDate } from "../../src/lib/content/dates";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SHOTS = "test-results/WP5";
const FULL_DATE = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/;
const CONTENT_DIR = path.resolve(process.cwd(), process.env.CONTENT_DIR || "content");
const content = () => buildContent(loadRawContent(CONTENT_DIR), { preview: true });

const TYPE_LABELS: Record<string, string> = {
  publication: "Publication",
  award: "Award",
  talk: "Talk/Event",
  media: "Media",
  people: "People",
  grant: "Grant",
  "lab-life": "Lab life",
};

async function open(page: Page, url: string) {
  const res = await page.goto(url);
  await page.waitForLoadState("networkidle");
  return res;
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return r.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s): ${v.nodes[0]?.target.join(" ")}`,
  );
}

/** A detail page with related papers if there is one (for screenshots). */
function sampleSlugs() {
  const c = content();
  const withRelated = c.news.find((n) => n.publicationRefs.length > 1) ?? c.news[0];
  const plain = c.news.find((n) => !n.publicationRefs.length && !n.directionRefs.length);
  return [...new Set([withRelated?.slug, plain?.slug].filter((s): s is string => Boolean(s)))];
}

// ---------------------------------------------------------------------------
// Index

test.describe("News index", () => {
  test("every item with its full date and type, grouped under year headings, newest first", async ({
    page,
  }) => {
    const c = content();
    await open(page, "/news/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("News");

    const items = page.locator("section.nw-year article.bl-news");
    await expect(items).toHaveCount(c.news.length);
    const rendered = await items.evaluateAll((els) =>
      els.map((el) => ({
        title: el.querySelector(".bl-news__title")?.textContent?.trim() ?? "",
        date: el.querySelector("time.bl-news__date")?.textContent?.trim() ?? "",
        type: el.querySelector(".bl-badge")?.textContent?.trim() ?? "",
        year: el.closest("section")?.querySelector("h2")?.textContent?.trim() ?? "",
      })),
    );
    expect(rendered.map((r) => r.title)).toEqual(c.news.map((n) => n.title));
    rendered.forEach((r, i) => {
      const n = c.news[i]!;
      expect(r.date).toMatch(FULL_DATE);
      expect(r.date).toBe(formatDate(n.date));
      expect(r.type).toBe(TYPE_LABELS[n.type]);
      expect(r.year).toBe(n.date.slice(0, 4));
    });

    const years = await page.locator("section.nw-year h2").allTextContents();
    expect(years).toEqual([...years].sort((a, b) => Number(b) - Number(a)));
    for (const y of years) {
      await expect(page.locator(`nav[aria-label="News by year"] a[href="#year-${y}"]`)).toHaveText(
        y,
      );
    }

    // Draft items carry the badge in preview.
    for (const n of c.news.filter((x) => x.draft)) {
      await expect(
        page.locator(`article[aria-labelledby="news-${n.slug}"] .bl-badge--draft`),
      ).toBeVisible();
    }
  });

  test("'Upcoming talks' is computed from event dates (hidden when there are none)", async ({
    page,
  }) => {
    const c = content();
    const upcoming = upcomingNews(c);
    await open(page, "/news/");
    const block = page.locator("section.nw-upcoming");
    if (!upcoming.length) {
      await expect(block).toHaveCount(0);
      return;
    }
    await expect(block.locator("h2")).toHaveText("Upcoming talks");
    const titles = await block.locator(".nw-upcoming__title").allTextContents();
    expect(titles.map((t) => t.trim())).toEqual(upcoming.map((n) => n.title));
    const dates = await block.locator(".nw-upcoming__when time").allTextContents();
    dates.forEach((d, i) => expect(d).toBe(formatDate(upcoming[i]!.event_date)));
  });

  test("links the RSS feed (visible link and <link rel=alternate>)", async ({ page, request }) => {
    await open(page, "/news/");
    await expect(page.locator('main a.nw-feed[href="/news/feed.xml"]')).toBeVisible();
    await expect(
      page.locator('head link[rel="alternate"][type="application/rss+xml"]'),
    ).toHaveAttribute("href", /\/news\/feed\.xml$/);
    const res = await request.get("/news/feed.xml");
    expect(res.status()).toBe(200);
  });

  test("client navigation to an item moves focus to its h1", async ({ page }) => {
    const c = content();
    const first = c.news[0]!;
    await open(page, "/news/");
    await page.locator(`a[href="/news/${first.slug}/"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/news/${first.slug}/$`));
    await expect(page.locator("h1")).toHaveText(first.title);
    await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe("H1");
  });
});

// ---------------------------------------------------------------------------
// Detail

test.describe("News item pages", () => {
  test("each item: title, full date, type, summary, related links, previous/next, NewsArticle JSON-LD", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const c = content();
    for (const [i, n] of c.news.entries()) {
      const res = await open(page, `/news/${n.slug}/`);
      expect(res?.status(), n.slug).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(n.title);
      const date = page.locator(".pg-head__meta time");
      await expect(date).toHaveText(formatDate(n.date));
      await expect(date).toHaveText(FULL_DATE);
      await expect(page.locator(".pg-head__meta")).toContainText(TYPE_LABELS[n.type]!);
      if (n.summary) await expect(page.locator(".pg-lead")).toHaveText(n.summary);
      await expect(page.locator(".pg-head__meta .bl-badge--draft")).toHaveCount(n.draft ? 1 : 0);

      for (const p of n.publicationRefs) {
        await expect(page.locator(`.nw-related a[href="/publications/${p.slug}/"]`)).toHaveText(
          p.title,
        );
      }
      for (const d of n.directionRefs) {
        await expect(page.locator(`.nw-related a[href="/research/${d.slug}/"]`)).toBeVisible();
      }
      for (const p of n.peopleRefs) {
        await expect(page.locator(".nw-related")).toContainText(p.name);
      }
      if (!n.publicationRefs.length && !n.directionRefs.length && !n.peopleRefs.length) {
        await expect(page.locator(".nw-related")).toHaveCount(0);
      }
      if (n.link) await expect(page.locator(".nw-detail__actions a")).toHaveText(n.link.label);

      const older = c.news[i + 1];
      const newer = c.news[i - 1];
      const pager = page.locator('nav[aria-label="More news"]');
      await expect(pager.locator(".nw-pager__prev a")).toHaveCount(older ? 1 : 0);
      await expect(pager.locator(".nw-pager__next a")).toHaveCount(newer ? 1 : 0);
      if (older) {
        await expect(pager.locator(".nw-pager__prev a")).toHaveAttribute(
          "href",
          `/news/${older.slug}/`,
        );
      }
      if (newer) {
        await expect(pager.locator(".nw-pager__next a")).toHaveAttribute(
          "href",
          `/news/${newer.slug}/`,
        );
      }

      const ld = (await page.locator('script[type="application/ld+json"]').allTextContents())
        .map((t) => JSON.parse(t))
        .find((j) => j["@type"] === "NewsArticle");
      expect(ld, n.slug).toBeDefined();
      expect(ld.headline).toBe(n.title);
      expect(ld.datePublished).toBe(n.date);
      expect(ld.url).toMatch(new RegExp(`/news/${n.slug}/$`));
      // Self-contained: the lab is named here, not only referenced by @id
      // (its full node lives on Home/About).
      expect(ld.publisher?.name).toBe(c.site.name);
      expect(ld.author?.name).toBe(c.site.name);
      expect(ld.mainEntityOfPage).toBe(ld.url);
    }
  });

  test("unknown slugs are not pages", async ({ page }) => {
    // The static export only writes generated slugs; any other path is served
    // GitHub Pages' 404.html. `next dev` with output: "export" answers 500
    // ("missing param in generateStaticParams") instead, so accept either.
    for (const url of ["/news/_none/", "/news/2026-01-01-no-such-item/"]) {
      const res = await open(page, url);
      expect([404, 500], url).toContain(res?.status());
    }
  });
});

// ---------------------------------------------------------------------------
// Feed

test.describe("RSS feed", () => {
  test("well-formed RSS 2.0 with every item (parsed by the browser's XML parser)", async ({
    page,
    request,
  }) => {
    const c = content();
    const res = await request.get("/news/feed.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/rss+xml");
    const xml = await res.text();
    await open(page, "/news/");
    const parsed = await page.evaluate((src) => {
      const doc = new DOMParser().parseFromString(src, "application/xml");
      const err = doc.querySelector("parsererror");
      const ch = doc.querySelector("rss > channel");
      const items = [...doc.querySelectorAll("rss > channel > item")].map((it) => ({
        title: it.querySelector("title")?.textContent ?? "",
        link: it.querySelector("link")?.textContent ?? "",
        guid: it.querySelector("guid")?.textContent ?? "",
        pubDate: it.querySelector("pubDate")?.textContent ?? "",
        description: it.querySelector("description")?.textContent ?? "",
      }));
      return {
        error: err?.textContent ?? null,
        version: doc.documentElement.getAttribute("version"),
        title: ch?.querySelector(":scope > title")?.textContent ?? null,
        link: ch?.querySelector(":scope > link")?.textContent ?? null,
        description: ch?.querySelector(":scope > description")?.textContent ?? null,
        items,
      };
    }, xml);
    expect(parsed.error).toBeNull();
    expect(parsed.version).toBe("2.0");
    expect(parsed.title).toBe(`${c.site.name} news`);
    expect(parsed.link).toMatch(/^https:\/\/.+\/news\/$/);
    expect(parsed.description).toBeTruthy();
    expect(parsed.items).toHaveLength(Math.min(c.news.length, 50));
    parsed.items.forEach((it, i) => {
      const n = c.news[i]!;
      expect(it.title).toBe(`${n.draft ? "[Draft] " : ""}${n.title}`);
      expect(it.link).toMatch(new RegExp(`/news/${n.slug}/$`));
      expect(it.guid).toBe(it.link);
      expect(Number.isNaN(Date.parse(it.pubDate))).toBe(false);
      expect(it.description.length).toBeGreaterThan(0);
    });
  });

  test("the footer RSS link resolves", async ({ page, request }) => {
    await open(page, "/news/");
    const href = await page.locator("footer a", { hasText: "RSS feed" }).getAttribute("href");
    expect(href).toBe("/news/feed.xml");
    expect((await request.get(href!)).status()).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Accessibility, reflow and visual QA

const ROUTES = () => [
  { name: "news", path: "/news/" },
  ...sampleSlugs().map((s, i) => ({ name: `news-item-${i + 1}`, path: `/news/${s}/` })),
];

for (const r of ROUTES()) {
  test.describe(`${r.name} (${r.path})`, () => {
    test("no horizontal scroll at 320 px", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await open(page, r.path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    for (const scheme of ["light", "dark"] as const) {
      test(`zero axe violations and screenshots (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        for (const [w, h] of [
          [1366, 768],
          [390, 844],
        ] as const) {
          await page.setViewportSize({ width: w, height: h });
          await open(page, r.path);
          await page.screenshot({ path: `${SHOTS}/${r.name}-${w}-${scheme}.png`, fullPage: true });
          expect(await axe(page), `${r.path} at ${w}px`).toEqual([]);
        }
      });
    }
  });
}

/**
 * The real content has no upcoming talks yet, so the block is rendered from
 * the fixture set by tests/unit/feed/upcoming-render.test.tsx and injected
 * into /news/ here, to check its look and contrast with the site's CSS.
 */
test.describe("Upcoming talks block (fixture markup)", () => {
  const file = path.join(process.cwd(), SHOTS, "upcoming-fixture.html");
  for (const scheme of ["light", "dark"] as const) {
    test(`renders cleanly with zero axe violations (${scheme})`, async ({ page }) => {
      test.skip(!fs.existsSync(file), "run the unit tests first (vitest tests/unit/feed)");
      const html = fs.readFileSync(file, "utf8");
      await page.emulateMedia({ colorScheme: scheme });
      for (const [w, h] of [
        [1366, 768],
        [390, 844],
      ] as const) {
        await page.setViewportSize({ width: w, height: h });
        await open(page, "/news/");
        await page.evaluate((markup) => {
          document.querySelector("section.nw-upcoming")?.remove();
          document.querySelector(".pg-head")?.insertAdjacentHTML("afterend", markup);
        }, html);
        const block = page.locator("section.nw-upcoming");
        await expect(block).toBeVisible();
        await block.screenshot({ path: `${SHOTS}/news-upcoming-${w}-${scheme}.png` });
        const r = await new AxeBuilder({ page })
          .include("section.nw-upcoming")
          .withTags(AXE_TAGS)
          .analyze();
        expect(r.violations.map((v) => v.id)).toEqual([]);
      }
    });
  }
});

/**
 * No real news item has a body, event details, a link or people yet, so the
 * full detail template is rendered from fixture content by
 * tests/unit/feed/rich-item-render.test.tsx and swapped into a live news page
 * here, to review it (long title, event box, body, link, Related panel, pager)
 * with the site's CSS and check its contrast.
 */
test.describe("News item with every optional field (fixture markup)", () => {
  const file = path.join(process.cwd(), SHOTS, "rich-news-item.html");
  for (const scheme of ["light", "dark"] as const) {
    test(`renders cleanly with zero axe violations (${scheme})`, async ({ page }) => {
      test.skip(!fs.existsSync(file), "run the unit tests first (vitest tests/unit/feed)");
      const html = fs.readFileSync(file, "utf8");
      const first = content().news[0];
      test.skip(!first, "no news item to host the markup");
      await page.emulateMedia({ colorScheme: scheme });
      for (const [w, h] of [
        [1366, 768],
        [390, 844],
      ] as const) {
        await page.setViewportSize({ width: w, height: h });
        await open(page, `/news/${first!.slug}/`);
        await page.evaluate((markup) => {
          const main = document.querySelector("main");
          if (main) main.innerHTML = markup;
        }, html);
        await expect(page.locator("main dl.nw-event")).toBeVisible();
        await expect(page.locator("main .nw-related")).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `horizontal scroll at ${w}px`).toBeLessThanOrEqual(0);
        await page.screenshot({ path: `${SHOTS}/news-rich-${w}-${scheme}.png`, fullPage: true });
        const r = await new AxeBuilder({ page }).include("main").withTags(AXE_TAGS).analyze();
        expect(r.violations.map((v) => v.id)).toEqual([]);
      }
    });
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the index and an item render fully from static HTML", async ({ page }) => {
    const c = content();
    await page.goto("/news/");
    await expect(page.locator("section.nw-year article.bl-news")).toHaveCount(c.news.length);
    const first = c.news[0]!;
    await page.goto(`/news/${first.slug}/`);
    await expect(page.locator("h1")).toHaveText(first.title);
  });
});
