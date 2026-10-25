/**
 * Home helpers and markup (DECISIONS D-14, carrying over D-13's coverage from
 * tests/unit/figure/home.test.tsx):
 *  - "New papers" is ordered by the newest dated evidence the content holds
 *    (date_online, or the newest news item citing the entry), papers with a
 *    public version first inside a year; nothing is invented, only ordered;
 *  - each section's way on is one factual line at the foot of its list;
 *  - the hero: one h1, the who line from content (University of California kept
 *    together), the why line, exactly two links (one primary);
 *  - people (R18): only consented photos, round, alt = full name, first names
 *    (duplicates disambiguated), no initials discs, the team in words with no
 *    numbers (D-15: the count sentence is gone).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildContent, loadRawContent, type Content } from "@/lib/content/load";
import { currentPeople, homeHeroCopy } from "@/lib/content/queries";
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
const {
  PapersSection,
  PeopleSection,
  NewsSection,
  publicationsLine,
  peopleLine,
  newsLine,
  firstNames,
  teamWords,
  paperMeta,
} = await import("@/components/home/HomeSections");
const { affiliationText, HomeHero, HOME_STATEMENT } = await import("@/components/home/HomeHero");

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const TODAY = "2026-10-25";
const content = (preview = false): Content =>
  buildContent(loadRawContent(path.join(ROOT, "content")), { preview, today: TODAY });

describe("new papers", () => {
  it("newest dated evidence first inside the newest year; papers with a public version first", () => {
    const c = content(true);
    const recent = recentPublications(c, 3);
    expect(recent).toHaveLength(Math.min(3, c.countedPublications.length));
    const keys = recencyKeys(c);
    const year = Math.max(...c.countedPublications.map((p) => p.year ?? 0));
    const pool = c.countedPublications.filter((p) => p.year === year);
    if (pool.length >= 3) for (const p of recent) expect(p.year).toBe(year);
    const rank = (p: (typeof recent)[number]) =>
      `${p.year ?? 0}|${Number(p.publicVersion)}|${keys.get(p.slug) ?? ""}`;
    const shown = new Set(recent.map((p) => p.slug));
    const lowest = recent.map(rank).sort()[0]!;
    for (const p of c.countedPublications)
      if (!shown.has(p.slug)) expect(rank(p) <= lowest).toBe(true);
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

  it("rows: title link, authors, one meta line with direction tags; no abstracts", () => {
    const c = content();
    const items = recentPublications(c, 3);
    const html = renderToStaticMarkup(
      <PapersSection items={items} total={c.countedPublications.length} />,
    );
    expect(html.match(/<li>/g)).toHaveLength(items.length);
    for (const p of items) {
      expect(html).toContain(`<a href="/publications/${p.slug}/">`);
      expect(html).toContain(paperMeta(p).replace(/&/g, "&amp;"));
    }
    expect(html).not.toContain("bl-pub__brief");
    expect(paperMeta({ type: "journal", venue: "Management Science", year: 2026 })).toMatch(
      /, Management Science, 2026$/,
    );
  });
});

describe("section foot lines", () => {
  it("wording", () => {
    expect(publicationsLine(17, 8)).toBe("Publications: 17 papers, 8 in progress");
    expect(publicationsLine(1, 0)).toBe("Publications: 1 paper");
    // D-15: no people counts on the home page.
    expect(peopleLine(25)).toBe("People: current members and alumni");
    expect(peopleLine(0)).toBe("People: current members");
    expect(newsLine(19, "2023-07-20")).toBe("News: 19 items since 2023");
    expect(newsLine(1)).toBe("News: 1 item");
  });

  it("the link sits after the list, never in the section head; news is 4 one-liners", () => {
    const c = content();
    const html = [
      renderToStaticMarkup(
        <PapersSection
          items={recentPublications(c, 3)}
          total={c.countedPublications.length}
          inProgress={c.inProgress.length}
        />,
      ),
      renderToStaticMarkup(
        <PeopleSection
          people={currentPeople(c)}
          lead="Prof. Park Sinchaisri"
          alumni={c.people.filter((p) => p.isAlumni).length}
          email="lab@example.edu"
        />,
      ),
      renderToStaticMarkup(
        <NewsSection
          items={c.news.slice(0, 4)}
          total={c.news.length}
          since={c.news.at(-1)?.date}
        />,
      ),
    ];
    for (const h of html) {
      const head = h.match(/<div class="bl-sec-h hm-sec-h">(.*?)<\/div>/)![1]!;
      expect(head).toMatch(/^<h2 id="h-[a-z]+">[^<]+<\/h2>$/);
      expect(h).toMatch(
        /<p class="hm-more"><a href="\/(publications|people|news)\/">[^<]+<\/a><\/p><\/section>$/,
      );
      expect(h).not.toMatch(/>All \d+/);
    }
    expect(html[2]!.match(/<li>/g)).toHaveLength(Math.min(4, c.news.length));
    expect(html[2]).not.toContain("bl-tags"); // one-liners: no direction tags
  });
});

describe("hero", () => {
  it("one h1, the who line from content, the why line, one primary and one secondary link", () => {
    const c = content();
    const copy = homeHeroCopy(c);
    const html = renderToStaticMarkup(<HomeHero copy={copy} figure={<i className="fig-x" />} />);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain(`>${copy.statement ?? HOME_STATEMENT}</h1>`);
    expect(html).toContain("University of California");
    expect(html).toMatch(/led by Prof\. Park Sinchaisri\./);
    expect(html).toContain('<p class="hm-why">');
    const links = [...html.matchAll(/<a href="([^"]+)"( class="hm-go")?>([^<]+)<\/a>/g)];
    expect(links.map((m) => [m[1], m[3]])).toEqual([
      ["/research/", "Explore the research"],
      ["/publications/", "Read the papers"],
    ]);
    expect(links.filter((m) => m[2])).toHaveLength(1);
    // The pearl figure comes after the copy.
    expect(html.indexOf("fig-x")).toBeGreaterThan(html.indexOf("Read the papers"));
    expect(affiliationText("University of California, Berkeley")).toBe(
      "University of California, Berkeley",
    );
  });
});

describe("people", () => {
  const c = content();
  const people = currentPeople(c);
  const html = renderToStaticMarkup(
    <PeopleSection people={people} lead="Prof. Park Sinchaisri" alumni={7} email="a@b.edu" />,
  );

  it("only photo_consent people are drawn; alt = full name; no initials discs", () => {
    const imgs = [...html.matchAll(/<img [^>]*alt="([^"]*)"[^>]*>/g)].map((m) => m[1]);
    const consented = people.filter((p) => p.photo_consent && p.photo);
    expect(imgs).toHaveLength(consented.length);
    for (const p of consented) expect(imgs).toContain(p.name.replace(/"/g, "&quot;"));
    for (const p of people.filter((x) => !x.photo_consent)) expect(imgs).not.toContain(p.name);
    expect(html).not.toContain("hm-ini");
  });

  it("the team in one sentence, by role, with no numbers (D-15)", () => {
    const team = teamWords(people);
    expect(html).toContain(`Prof. Park Sinchaisri leads the lab with ${team}.`);
    expect(team).not.toMatch(/\d|\b(one|two|three|four|five|six|seven|eight)\b/);
    if (people.filter((p) => p.role === "undergrad").length > 1)
      expect(team).toContain("undergraduate RAs");
    expect(teamWords([{ role: "masters" }, { role: "phd" }, { role: "phd" }])).toBe(
      "PhD students and a master’s student",
    );
    expect(teamWords([{ role: "undergrad" }, { role: "affiliate" }])).toBe(
      "an undergraduate RA and an affiliate",
    );
    expect(html).toContain("The people page also lists former members.");
    const sentence = html.match(/<p class="hm-team">([^<]*)<\/p>/)?.[1] ?? "";
    expect(sentence).not.toMatch(/\d/);
    // Only the PI, or nobody but the team: no count either.
    const solo = renderToStaticMarkup(
      <PeopleSection people={people.filter((p) => p.role === "pi")} lead="Prof. X" />,
    );
    expect(solo).toContain(">Prof. X leads the lab.</p>");
  });

  it("first names: preferred name in quotes, duplicates get a last initial", () => {
    const m = firstNames([
      { slug: "a", name: 'Zixian "Amy" Li' },
      { slug: "b", name: "Ryan Sing Chan" },
      { slug: "c", name: "Ryan Jesubalan" },
      { slug: "d", name: "Mingyuan (Jeremy) Ma" },
      { slug: "e", name: "Chloe Xiao" },
    ]);
    expect([...m.values()]).toEqual(["Amy", "Ryan C.", "Ryan J.", "Jeremy", "Chloe"]);
  });
});
