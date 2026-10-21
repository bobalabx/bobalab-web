/**
 * WP5 acceptance #1 (render level): the news "Upcoming talks" block lists only
 * items whose event_date is on or after the build date, soonest first, each
 * with a full date ("Jan 15, 2099"); it renders nothing when there are none.
 * Uses the fictional fixture set (the real content has no upcoming talks yet).
 *
 * Side output for visual QA: test-results/WP5/upcoming-fixture.html, which
 * tests/e2e/news.spec.ts injects into /news/ for a screenshot of the block.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { upcomingNews } from "@/lib/content/queries";
import { formatDate } from "@/lib/content/dates";
import { UpcomingTalks } from "@/components/news/UpcomingTalks";

const FIXTURE = path.join(process.cwd(), "tests/fixtures/content/consent-edge-cases");

describe("UpcomingTalks", () => {
  it("shows only future events, soonest first, with full dates and links", () => {
    const c = buildContent(loadRawContent(FIXTURE), { preview: false, today: "2026-10-20" });
    const items = upcomingNews(c);
    expect(items.length).toBeGreaterThan(0);
    expect(c.news.some((n) => n.event_date && !n.upcoming)).toBe(true); // a past event exists
    const html = renderToStaticMarkup(<UpcomingTalks items={items} />);
    expect(html).toContain(">Upcoming talks</h2>");
    for (const n of items) {
      // next/link outside Next drops the trailing slash; the app adds it (trailingSlash: true).
      expect(html).toContain(`href="/news/${n.slug}`);
      expect(html).toContain(`>${formatDate(n.event_date)}</time>`);
      expect(formatDate(n.event_date)).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    }
    for (const n of c.news.filter((x) => !x.upcoming)) {
      expect(html).not.toContain(`href="/news/${n.slug}`);
    }

    const out = path.join(process.cwd(), "test-results/WP5");
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, "upcoming-fixture.html"), html);
  });

  it("moves an item out of 'upcoming' once its date has passed (lab time zone)", () => {
    const before = buildContent(loadRawContent(FIXTURE), { preview: false, today: "2099-01-15" });
    const after = buildContent(loadRawContent(FIXTURE), { preview: false, today: "2099-01-16" });
    expect(upcomingNews(before).length).toBeGreaterThan(0);
    expect(upcomingNews(after)).toHaveLength(0);
    expect(renderToStaticMarkup(<UpcomingTalks items={upcomingNews(after)} />)).toBe("");
  });
});
