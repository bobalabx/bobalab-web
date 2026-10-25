/**
 * WP5 news item template with EVERY optional field (brief §D10: date, type,
 * title, body, event details, related people/papers/directions, an external
 * link, previous/next). The real content has no bodies, events, links or
 * people on news items yet, so this renders a fictional item on top of the
 * `long-labels` fixture set (all fictional) in production mode.
 *
 * Side output for visual QA: test-results/WP5/rich-news-item.html (the page
 * markup), which tests/e2e/news.spec.ts swaps into a live news page for
 * screenshots at 1366/390 px in light and dark.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { clearContentCache, getContent } from "@/lib/content/load";
import { formatDate } from "@/lib/content/dates";
import NewsItemPage from "@/app/news/[slug]/page";
import { buildRssFeed } from "@/components/news/rss";

const FIXTURE = path.join(process.cwd(), "tests/fixtures/content/long-labels");
const SLUG = "2026-10-05-fixture-rich-item";
const TITLE =
  "Fixture talk with a deliberately long title to check how the news item header wraps across several lines on narrow screens";
const RICH = `---
date: 2026-10-05
type: talk
title: ${JSON.stringify(TITLE)}
summary: Fixture summary of a talk with every optional field filled in, so the template can be reviewed.
event_date: 2099-02-01
location: Fixture Auditorium, Example Hall, Room 1234, Example City
people:
  - avery-example
directions:
  - advice
  - platforms
publications:
  - example-2025-fixture-paper-135
link:
  label: Event page
  url: https://example.org/fixture-event
draft: false
---

## About the talk

Fixture body paragraph with an [internal link](/publications/) and **bold** text.

- First fixture point
- Second fixture point
`;

const saved = { INCLUDE_DRAFTS: process.env.INCLUDE_DRAFTS, CONTENT_DIR: process.env.CONTENT_DIR };
let dir = "";

describe("news item with every optional field (fixture)", () => {
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "wp5-rich-"));
    fs.cpSync(FIXTURE, dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "news", `${SLUG}.md`), RICH);
    process.env.INCLUDE_DRAFTS = "0";
    process.env.CONTENT_DIR = dir;
    clearContentCache();
  });
  afterAll(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    clearContentCache();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it("renders event details, body, external link, related groups, pager and JSON-LD", async () => {
    const c = getContent();
    const item = c.news.find((n) => n.slug === SLUG);
    expect(item).toBeDefined();
    const html = renderToStaticMarkup(
      await NewsItemPage({ params: Promise.resolve({ slug: SLUG }) }),
    );
    fs.mkdirSync(path.join(process.cwd(), "test-results/WP5"), { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), "test-results/WP5/rich-news-item.html"), html);

    // Header: full date, type, Upcoming (event in the future), the long title.
    expect(html).toContain(`>${formatDate("2026-10-05")}</time>`);
    expect(html).toContain('<span class="bl-badge">Talk</span>');
    expect(html).not.toContain("Talk/Event");
    expect(html).toContain("Upcoming");
    expect(html).toContain(TITLE);
    // Event details with a full date.
    expect(html).toContain('<dl class="nw-event">');
    expect(html).toContain(`>${formatDate("2099-02-01")}</time>`);
    expect(html).toContain("Fixture Auditorium");
    // Body (Markdown) and the external link.
    expect(html).toContain("About the talk");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toMatch(
      /<a class="bl-cta bl-cta--quiet" href="https:\/\/example\.org\/fixture-event" rel="noopener noreferrer">Event page/,
    );
    // Related: paper, person (profile link), directions.
    expect(html).toContain('href="/publications/example-2025-fixture-paper-135');
    expect(html).toContain('href="/people/avery-example');
    expect(html).toContain('href="/research/advice');
    expect(html).toContain('href="/research/platforms');
    // Previous/next and JSON-LD.
    expect(html).toContain('aria-label="More news"');
    expect(html).toContain('"@type":"NewsArticle"');
    expect(html).toContain(`"name":"${c.site.name}"`);
  });

  it("puts the item in the feed with absolute links in its HTML", () => {
    const xml = buildRssFeed(getContent(), { now: new Date("2026-10-20T18:30:00Z") });
    const start = xml.indexOf(`/news/${SLUG}/</link>`);
    expect(start).toBeGreaterThan(-1);
    const itemXml = xml.slice(start, xml.indexOf("</item>", start));
    expect(itemXml).toContain('href="https://example.invalid/publications/"');
    // The summary as written; the event date and place live on the page, not in a templated line.
    expect(itemXml).not.toContain("Event: Feb 1, 2099");
  });
});
