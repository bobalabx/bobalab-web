/**
 * Home helpers and markup (DECISIONS D-13; prototype p3/index.html):
 *  - "Recent publications" is ordered by the newest dated evidence the content
 *    holds (date_online, or the newest news item citing the entry), papers with a
 *    public version first inside a year; nothing is invented, only ordered;
 *  - each section's way on is one factual line at the foot of its list, never an
 *    "All N" link beside the heading (AUDIT: h2 + "All →" on every section);
 *  - the address block keeps "University of California" together and drops the
 *    comma at its line break (kept for screen readers).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildContent, loadRawContent, type Content } from "@/lib/content/load";
import { currentPeople } from "@/lib/content/queries";
import { dateSortKey } from "@/lib/content/dates";

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

const { recentPublications, recencyKeys } = await import("@/components/home/recent");
const { PublicationsSection, PeopleSection, NewsSection, publicationsLine, peopleLine, newsLine } =
  await import("@/components/home/HomeSections");
const { affiliationText, splitFirst, HomeHero } = await import("@/components/home/HomeHero");

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const TODAY = "2026-10-20";
const content = (): Content =>
  buildContent(loadRawContent(path.join(ROOT, "content")), { preview: true, today: TODAY });

describe("recent publications", () => {
  it("newest dated evidence first inside the newest year; papers with a public version first", () => {
    const c = content();
    const recent = recentPublications(c, 3);
    expect(recent).toHaveLength(Math.min(3, c.countedPublications.length));
    const keys = recencyKeys(c);
    const year = Math.max(...c.countedPublications.map((p) => p.year ?? 0));
    const pool = c.countedPublications.filter((p) => p.year === year);
    // Every entry shown is from the newest year while that year has enough entries.
    if (pool.length >= 3) for (const p of recent) expect(p.year).toBe(year);
    // No entry left out is newer (by year, public version, then evidence) than one shown.
    const rank = (p: (typeof recent)[number]) =>
      `${p.year ?? 0}|${Number(p.publicVersion)}|${keys.get(p.slug) ?? ""}`;
    const shown = new Set(recent.map((p) => p.slug));
    const lowest = recent.map(rank).sort()[0]!;
    for (const p of c.countedPublications)
      if (!shown.has(p.slug)) expect(rank(p) <= lowest).toBe(true);
    // The key is real: date_online, or the date of a news item that cites the entry.
    for (const p of recent) {
      const k = keys.get(p.slug)!;
      const sources = [
        dateSortKey(p.date_online),
        ...c.news
          .filter((n) => n.publicationRefs.some((r) => r.slug === p.slug))
          .map((n) => n.date),
      ];
      expect(sources).toContain(k);
    }
  });

  it("orders by the evidence, not alphabetically, on a small synthetic set", () => {
    type P = Content["countedPublications"][number];
    type N = Content["news"][number];
    const pub = (slug: string, year: number, publicVersion: boolean, date_online?: string) =>
      ({ slug, title: slug, year, publicVersion, date_online }) as unknown as P;
    const a = pub("a-title", 2026, true);
    const b = pub("b-title", 2026, true, "2026-02-01");
    const z = pub("z-title", 2026, true);
    const talk = pub("c-talk", 2026, false);
    const old = pub("old", 2025, true, "2025-12-31");
    const news = [{ date: "2026-09-01", publicationRefs: [z] } as unknown as N];
    const got = recentPublications({ countedPublications: [a, b, talk, old, z], news }, 5);
    expect(got.map((p) => p.slug)).toEqual(["z-title", "b-title", "a-title", "c-talk", "old"]);
  });
});

describe("section foot lines", () => {
  it("wording", () => {
    expect(publicationsLine(17, 8)).toBe("Publications: 17 papers, 8 in progress");
    expect(publicationsLine(1, 0)).toBe("Publications: 1 paper");
    expect(peopleLine(25, 25)).toBe("People: 25 members, 25 alumni");
    expect(peopleLine(1, 0)).toBe("People: 1 member");
    expect(newsLine(19, "2023-07-20")).toBe("News: 19 items since 2023");
    expect(newsLine(1)).toBe("News: 1 item");
  });

  it("the link sits after the list, never in the section head", () => {
    const c = content();
    const html = [
      renderToStaticMarkup(
        <PublicationsSection
          items={recentPublications(c, 3)}
          total={c.countedPublications.length}
          inProgress={c.inProgress.length}
        />,
      ),
      renderToStaticMarkup(
        <PeopleSection
          people={currentPeople(c)}
          alumni={c.people.filter((p) => p.isAlumni).length}
          email="lab@example.edu"
        />,
      ),
      renderToStaticMarkup(
        <NewsSection
          items={c.news.slice(0, 5)}
          total={c.news.length}
          since={c.news.at(-1)?.date}
        />,
      ),
    ];
    for (const h of html) {
      const head = h.match(/<div class="bl-sec-h hm-sec-h">(.*?)<\/div>/)![1]!;
      expect(head).toMatch(/^<h2 id="h-[a-z]+">[^<]+<\/h2>$/);
      expect(h).toMatch(
        /<p class="hm-more"><a href="\/(publications|people|news)\/">[^<]+<\/a><\/p>/,
      );
      expect(h).not.toMatch(/>All \d+/);
    }
    // People: the join note sits between the faces and the foot line, which is always last.
    expect(html[1]!.indexOf('class="hm-join"')).toBeGreaterThan(html[1]!.indexOf("hm-people"));
    expect(html[1]!.indexOf('class="hm-more"')).toBeGreaterThan(
      html[1]!.indexOf('class="hm-join"'),
    );
    for (const h of html) expect(h).toMatch(/<p class="hm-more">.*<\/p><\/section>$/);
    // Roles carry the program where content has one (shared with /people/).
    expect(html[1]).toMatch(/Undergraduate RA, [A-Z]/);
  });
});

describe("hero address block", () => {
  it("keeps University of California together and breaks the line at the first comma", () => {
    const t = affiliationText("Haas School of Business, University of California, Berkeley");
    expect(t).toContain("University of California");
    expect(splitFirst(t)).toEqual([
      "Haas School of Business",
      "University of California, Berkeley",
    ]);
    const html = renderToStaticMarkup(
      <HomeHero
        longName="Berkeley Operations and Behavioral Analytics Lab"
        affiliation="Haas School of Business, University of California, Berkeley"
        directions={[]}
      />,
    );
    expect(html).toContain('<span>Haas School of Business<span class="vh">,</span> </span>');
    expect(html).not.toContain("Business, ");
  });
});
