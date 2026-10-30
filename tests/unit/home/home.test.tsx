/**
 * Home helpers and markup (DECISIONS D-14, carrying over D-13's coverage from
 * tests/unit/figure/home.test.tsx):
 *  - "New papers" is ordered by the newest dated evidence the content holds
 *    (date_online, or the newest news item citing the entry), papers with a
 *    public version first inside a year; nothing is invented, only ordered;
 *  - each section's way on is one factual line at the foot of its list;
 *  - the hero: one h1, the who line from content (University of California kept
 *    together), the why line, exactly two links (one primary);
 *  - people (#people; owner 2026-10-29: the People page moved onto the home
 *    page): the section is the lab's whole list (the groups, the PI first,
 *    alumni collapsed), last on the page, with the way to join at its foot and
 *    no counts (D-15). The list itself is tested in tests/unit/people-page.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildContent, loadRawContent, type Content } from "@/lib/content/load";
import { homeHeroCopy } from "@/lib/content/queries";
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
const { PapersSection, PeopleSection, NewsSection, PUBLICATIONS_LINK, NEWS_LINK, paperMeta } =
  await import("@/components/home/HomeSections");
const { affiliationText, HomeHero, HOME_STATEMENT } = await import("@/components/home/HomeHero");
const { buildPeopleIndex } = await import("@/components/people/model");
const { HomeView } = await import("@/components/views/HomeView");

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
    const html = renderToStaticMarkup(<PapersSection items={items} />);
    expect(html.match(/<li>/g)).toHaveLength(items.length);
    for (const p of items) {
      expect(html).toContain(`<a href="/publications/${p.slug}/">`);
      expect(html).toContain(paperMeta(p).replace(/&/g, "&amp;"));
    }
    expect(html).not.toContain("bl-pub__brief");
    expect(paperMeta({ type: "journal", venue: "Management Science", year: 2026 })).toMatch(
      /, Management Science, 2026$/,
    );
    // A venue that already names the kind of paper stands for the type; no SSRN number.
    expect(paperMeta({ type: "working-paper", venue: "arXiv preprint", year: 2026 })).toBe(
      "arXiv preprint, 2026",
    );
    expect(
      paperMeta({ type: "working-paper", venue: "SSRN working paper 7151739", year: 2026 }),
    ).toBe("SSRN working paper, 2026");
  });
});

describe("section foot lines", () => {
  it("wording: plain links, no stats (copy sweep)", () => {
    expect(PUBLICATIONS_LINK).toBe("All publications");
    expect(NEWS_LINK).toBe("All news");
    for (const l of [PUBLICATIONS_LINK, NEWS_LINK]) expect(l).not.toMatch(/\d|:/);
  });

  it("the link sits after the list, never in the section head; news is 4 one-liners", () => {
    const c = content();
    const html = [
      renderToStaticMarkup(<PapersSection items={recentPublications(c, 3)} />),
      renderToStaticMarkup(<NewsSection items={c.news.slice(0, 4)} />),
    ];
    for (const h of html) {
      const head = h.match(/<div class="bl-sec-h hm-sec-h">(.*?)<\/div>/)![1]!;
      expect(head).toMatch(/^<h2 id="h-[a-z]+">[^<]+<\/h2>$/);
      expect(h).toMatch(
        /<p class="hm-more"><a href="\/(publications|news)\/">[^<]+<\/a><\/p><\/section>$/,
      );
      expect(h).not.toMatch(/>All \d+/);
    }
    expect(html[1]!.match(/<li>/g)).toHaveLength(Math.min(4, c.news.length));
    expect(html[1]).not.toContain("bl-tags"); // one-liners: no direction tags
    // People: the same plain head; its foot is the way to join (no "Meet the lab" link).
    const people = renderToStaticMarkup(
      <PeopleSection people={buildPeopleIndex(c)} site={c.site} />,
    );
    expect(people.match(/<div class="bl-sec-h hm-sec-h">(.*?)<\/div>/)![1]).toBe(
      '<h2 id="h-people">People</h2>',
    );
    expect(people).not.toContain("hm-more");
    expect(people).toMatch(
      /<div class="hm-people-foot"><p class="hm-join">[^]*<\/div><\/section>$/,
    );
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
  const model = buildPeopleIndex(c);
  const site = { ...c.site, email: "a@b.edu" };
  const html = renderToStaticMarkup(<PeopleSection people={model} site={site} />);

  it("is the home page's last section, at #people, with everyone the build keeps", () => {
    expect(html).toMatch(
      /^<section id="people" class="hm-sec hm-people-sec" aria-labelledby="h-people">/,
    );
    const home = renderToStaticMarkup(<HomeView c={c} />);
    expect(home.match(/ id="people"/g)).toHaveLength(1);
    const at = home.indexOf('<section id="people"');
    expect(at).toBeGreaterThan(home.indexOf('aria-labelledby="h-news"'));
    // Nothing follows it but the end of the page body.
    expect(home.slice(home.indexOf("</section>", home.lastIndexOf('class="hm-people-foot"')))).toBe(
      "</section></div>",
    );
    for (const p of c.people) expect(html, p.slug).toContain(`id="person-${p.slug}"`);
    // The People page's group headings, the PI first, alumni last.
    const groups = [
      ...html.matchAll(/<h3 id="people-[a-z-]+" class="pp-group__title">([^<]+)<\/h3>/g),
    ].map((m) => m[1]);
    expect(groups).toEqual([
      ...model.groups.map((g) => g.label),
      ...(model.alumni.length ? ["Alumni"] : []),
    ]);
    expect(groups[0]).toBe("Principal investigator");
  });

  it("no team sentence, no former-members sentence and no counts (owner, copy sweep)", () => {
    expect(html).not.toContain("hm-team");
    expect(html).not.toMatch(/leads the lab|former members|people page|Meet the lab/i);
    const foot = html.slice(html.indexOf('<div class="hm-people-foot">'));
    expect(foot.replace(/<[^>]+>/g, " ")).not.toMatch(/\b\d+\b/);
    expect(html).not.toMatch(/>\d+ (members?|people|students?|RAs?|alumni)\b/i);
    expect(html).toContain('<a href="/join/">Join the lab</a>');
    expect(html).toContain('<a href="mailto:a@b.edu">a@b.edu</a>');
    expect(html).toMatch(/>Want to join or work with us\? See /);
  });

  it("draws no round faces strip any more: square photos or initials in ruled rows", () => {
    expect(html).not.toMatch(/hm-face|hm-ini/);
    const imgs = [...html.matchAll(/<img [^>]*class="([^"]*)"/g)].map((m) => m[1]);
    for (const cls of imgs) expect(cls).toMatch(/^pp-avatar pp-avatar--(card|lead)$/);
    // Alumni rows carry no photo (D-13 item 5); current members show a consented one.
    expect(imgs).toHaveLength(c.people.filter((p) => p.photo && !p.isAlumni).length);
  });
});
