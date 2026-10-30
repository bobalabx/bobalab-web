/**
 * WP4 render tests, now for the home page's People section (the separate
 * People page moved onto the home page, owner 2026-10-29) and the person page,
 * rendered to static HTML from the fictional "consent-edge-cases" fixture
 * (brief WP4 acceptance 1–6). The HTML is also written to
 * test-results/WP4/fixtures/ so the e2e visual pass can screenshot
 * fixture-only states (photos, directions, emails).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildContent, loadRawContent, type Content } from "@/lib/content/load";
import { DraftBadge } from "@/components/ui/Badge";
import { PeopleSection } from "@/components/home/HomeSections";
import { PeopleIndex } from "@/components/people/PeopleIndex";
import { PersonProfile } from "@/components/people/PersonProfile";
import { buildPeopleIndex, buildPersonProfile } from "@/components/people/model";

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const OUT = fileURLToPath(new URL("../../../test-results/WP4/fixtures/", import.meta.url));
const TODAY = "2026-10-20";
const load = (set: string, preview = false) =>
  buildContent(loadRawContent(path.join(FIX, set)), { preview, today: TODAY });
/** The home page's People section for a content set. */
const section = (c: Content) =>
  renderToStaticMarkup(<PeopleSection people={buildPeopleIndex(c)} site={c.site} />);
/** What the Draft (hidden) marker renders as, whatever its words are. */
const BADGE = renderToStaticMarkup(<DraftBadge />);

/** next/link drops the trailing slash outside a Next build (trailingSlash is a build option). */
const linksTo = (html: string, slug: string) => new RegExp(`href="/people/${slug}/?"`).test(html);

function save(name: string, html: string) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), html);
}

const between = (html: string, start: string, end: string) => {
  const i = html.indexOf(start);
  const j = html.indexOf(end, i + start.length);
  return i < 0 ? "" : html.slice(i, j < 0 ? undefined : j);
};

describe("People section of the home page (consent-edge-cases, production)", () => {
  const c = load("consent-edge-cases");
  const html = section(c);
  save("index.html", html);
  save("index-preview.html", section(load("consent-edge-cases", true)));

  it("is one <section id=people> under an h2; groups are h3 in §D9 order, names h4", () => {
    expect(html).toMatch(
      /^<section id="people" class="hm-sec hm-people-sec" aria-labelledby="h-people">/,
    );
    expect(html).not.toContain("<h1");
    expect(html.match(/<h2\b/g)).toHaveLength(1);
    expect(html).toContain('<h2 id="h-people">People</h2>');
    const h3 = [...html.matchAll(/<h3 id="(people-[a-z-]+)"/g)].map((m) => m[1]);
    expect(h3).toEqual([
      "people-pi",
      "people-postdoc",
      "people-graduate",
      "people-undergrad",
      "people-affiliate",
      "people-alumni",
    ]);
    // Names sit one level below their group; alumni names below their year (h4).
    expect(html).toMatch(/<h4 class="pp-card__name" id="person-avery-example">/);
    expect(html).toMatch(/<h4 id="alumni-2025" class="pp-year__title">/);
    expect(html).toMatch(/<h5 class="pp-alum__name" id="person-gray-alum">/);
    expect(html).not.toMatch(/<h[36] class="pp-(card|alum)__name"/);
  });

  it("gives the principal investigator the wide lead card (well-formed class names)", () => {
    expect(html).toContain('<ul class="pp-grid pp-grid--lead" role="list">');
    expect(html).toMatch(
      /<article class="pp-card pp-card--lead" aria-labelledby="person-avery-example"/,
    );
    expect(html).toMatch(/<article class="pp-card" aria-labelledby="person-blair-sample"/);
    // Guard against class concatenation without a space (e.g. "pp-cardpp-card--lead").
    expect(html).not.toMatch(/class="[^"]*pp-[a-z]+pp-/);
    // The lab's affiliation (site.yml) sits under the PI's title only.
    const lead = between(html, 'class="pp-card pp-card--lead"', "</article>");
    expect(lead).toContain(`<p class="pp-card__affil">${c.site.affiliation_text}</p>`);
    expect(html.match(/pp-card__affil/g)).toHaveLength(1);
  });

  it("labels alumni year groups as role=group (aria-labelledby is prohibited on a bare div)", () => {
    const years = [...html.matchAll(/<div class="pp-year"([^>]*)>/g)].map((m) => m[1]);
    expect(years.length).toBeGreaterThan(0);
    for (const attrs of years) expect(attrs).toMatch(/role="group" aria-labelledby="alumni-/);
  });

  it("shows no headcount anywhere (copy sweep, D-15)", () => {
    expect(html).not.toContain("pp-group__count");
    expect(html).not.toMatch(/>\d+ (person|people|members?|alumni)</i);
  });

  it("never renders or links an unlisted person (D-06, §F3)", () => {
    expect(html).not.toContain("Emery Hidden");
    expect(html).not.toContain("emery-hidden");
  });

  it("gates photo, email and now_at by consent", () => {
    // Blair consented to the photo and email; Devon set both without consent.
    expect(html.match(/<img\b/g)?.length).toBe(1);
    expect(html).toContain('alt="Fixture portrait placeholder"');
    expect(html).toContain("mailto:blair@example.edu");
    expect(html).not.toContain("devon@example.edu");
    expect(html).toContain("Now at Fixture Company");
    expect(html).not.toContain("Fixture University");
  });

  it("uses square initials tiles when there is no consented photo; alumni rows have no avatar", () => {
    const devon = between(html, 'id="person-devon-placeholder"', "</article>");
    expect(html).toMatch(/bl-pearl__initials">DP</);
    expect(devon).not.toContain("<img");
    // Every current member's row has exactly one square avatar (img or initials tile).
    const cards = html.split('<article class="pp-card').slice(1);
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      const n =
        (card.match(/<img\b/g)?.length ?? 0) + (card.match(/bl-pearl__initials/g)?.length ?? 0);
      expect(n).toBe(1);
    }
    // Alumni are a compact text list (D-13 item 5): no photo, no tile.
    const alums = html.split('<article class="pp-alum"').slice(1);
    expect(alums.length).toBeGreaterThan(0);
    for (const alum of alums) {
      const row = alum.slice(0, alum.indexOf("</article>"));
      expect(row).not.toContain("<img");
      expect(row).not.toContain("bl-pearl");
    }
    // The size classes people.css squares off (160 px lead, 64 px rows).
    expect(html).toMatch(/pp-avatar pp-avatar--lead/);
    expect(html).toMatch(/pp-avatar pp-avatar--card/);
  });

  it("links names only for people with a profile page", () => {
    expect(linksTo(html, "avery-example")).toBe(true);
    expect(linksTo(html, "blair-sample")).toBe(true);
    for (const s of [
      "devon-placeholder",
      "finley-alum",
      "gray-alum",
      "harper-future",
      "jules-noprofile",
    ]) {
      expect(linksTo(html, s)).toBe(false);
    }
  });

  it("puts alumni in a collapsed <details>, grouped by end year (newest first)", () => {
    expect(html).toMatch(/<details class="pp-alumni__details">/);
    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
    const years = [...html.matchAll(/<h4 id="alumni-(\d{4})"/g)].map((m) => m[1]);
    expect(years).toEqual(["2025", "2024"]);
    const alumni = between(html, '<details class="pp-alumni__details">', "</details>");
    expect(alumni).toContain("Finley Alum");
    expect(alumni).toContain("Gray Alum");
    expect(alumni).not.toContain("Harper Future");
  });

  it("has no filter chips and no client island: everything is a plain list", () => {
    expect(html).not.toMatch(/pp-filters|aria-pressed|<button|<noscript|role="status"/);
    expect(html).not.toMatch(/<(li|section|div)[^>]*\bhidden=""/);
  });

  it("ends with the way to join and the links for lab members, after the lists", () => {
    const foot = between(html, '<div class="hm-people-foot">', "</section>");
    expect(html.indexOf('<div class="hm-people-foot">')).toBeGreaterThan(
      html.indexOf("</details>"),
    );
    expect(foot).toMatch(
      />Want to join or work with us\? See <a href="\/join\/?">Join the lab<\/a>/,
    );
    expect(foot).toContain(`<a href="mailto:${c.site.email}">${c.site.email}</a>`);
    if (c.site.member_links.length) {
      expect(foot).toContain('<p class="hm-members">For lab members: ');
      for (const l of c.site.member_links) expect(foot).toContain(`href="${l.url}"`);
    } else expect(foot).not.toContain("hm-members");
    // No "Meet the lab" foot link any more: the section is the lab's list.
    expect(html).not.toMatch(/Meet the lab|href="\/people\/"/);
  });

  it("shows no Draft marker in production, and one per draft person in preview", () => {
    expect(html).not.toContain(BADGE);
    const pv = section(load("consent-edge-cases", true));
    const indigo = between(pv, 'id="person-indigo-draft"', "</article>");
    expect(indigo).toContain(BADGE);
    expect(pv.split(BADGE).length - 1).toBe(1);
  });
});

describe("People section for the real ./content in a production build (D-06)", () => {
  const dir = fileURLToPath(new URL("../../../content/", import.meta.url));
  const exists = fs.existsSync(path.join(dir, "people"));
  it.skipIf(!exists)(
    "renders exactly the listed people the build keeps, never hidden or unlisted ones",
    () => {
      const raw = loadRawContent(dir);
      const c = buildContent(raw, { preview: false, today: TODAY });
      const html = section(c);
      // What the public site shows today (for the visual pass in tests/e2e/people.spec.ts).
      save("real-index-production.html", html);
      const kept = new Set(c.people.map((p) => p.slug));
      for (const p of raw.entries.people) {
        const shown = html.includes(`id="person-${p.slug}"`);
        expect(shown, p.slug).toBe(kept.has(p.slug));
        if (shown) expect(p.listed && !p.draft, p.slug).toBe(true);
        if (!p.listed) expect(html, p.slug).not.toContain(p.name);
      }
      expect(html).not.toContain(BADGE);
      // Lab managers (rank 1) lead the undergraduates.
      const undergrads = between(html, 'id="people-undergrad"', "</section>");
      const managers = c.people.filter(
        (p) => p.role === "undergrad" && !p.isAlumni && p.rank === 1,
      );
      const order = [...undergrads.matchAll(/id="person-([a-z0-9-]+)"/g)].map((m) => m[1]);
      expect(order.slice(0, managers.length).sort()).toEqual(managers.map((p) => p.slug).sort());
      const pi = c.people.find((p) => p.role === "pi");
      const model = pi ? buildPersonProfile(c, pi.slug) : undefined;
      if (model) {
        const page = renderToStaticMarkup(<PersonProfile content={c} model={model} />);
        save("real-pi-production.html", page);
        expect(page).not.toContain(BADGE);
        for (const p of raw.entries.people.filter((x) => !x.listed))
          expect(page, p.slug).not.toContain(p.name);
      }
    },
  );
});

describe("People section edge cases", () => {
  it("renders nothing when no one is listed", () => {
    const c = load("n1");
    expect(section({ ...c, people: [] })).toBe("");
  });

  // D-15 (change request pearls-2): no count sentence at any group count.
  it.each([
    ["n1", false],
    ["consent-edge-cases", false],
    ["consent-edge-cases", true],
  ] as const)("never prints a count summary line (%s, preview %s)", (set, preview) => {
    const html = section(load(set, preview));
    expect(html).not.toContain("pp-summary");
    expect(html).not.toMatch(/\b\d+ (principal investigators?|master|undergraduate|alumni|PhD)/i);
  });

  it("the editor preview's People view (PeopleIndex) is exactly the home page's section", () => {
    const c = load("consent-edge-cases");
    expect(renderToStaticMarkup(<PeopleIndex content={c} />)).toBe(
      `<div class="bl-container hm hm--people">${section(c)}</div>`,
    );
  });
});

describe("Person page (consent-edge-cases)", () => {
  const c = load("consent-edge-cases");
  const pi = buildPersonProfile(c, "avery-example")!;
  const html = renderToStaticMarkup(<PersonProfile content={c} model={pi} />);
  save("person-pi.html", html);
  const blairModel = buildPersonProfile(c, "blair-sample")!;
  const blair = renderToStaticMarkup(<PersonProfile content={c} model={blairModel} />);
  save("person-member.html", blair);

  it("has one h1, a breadcrumb back to People, and the bio", () => {
    expect(html.match(/<h1\b/g)?.length).toBe(1);
    expect(html).toContain('aria-label="Breadcrumb"');
    // People live in the home page's People section now (no /people/ list page).
    const crumbs = between(html, 'aria-label="Breadcrumb"', "</nav>");
    expect(crumbs).toMatch(/<a href="\/#people">People<\/a>/);
    expect(html).toMatch(/<a class="bl-cta bl-cta--quiet" href="\/#people">All people<\/a>/);
    expect(html).not.toMatch(/href="\/people\/?"/);
    expect(html).toContain("Fixture biography for the principal investigator.");
  });

  it("carries ProfilePage + Person JSON-LD for the PI only", () => {
    const m = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(html);
    expect(m).not.toBeNull();
    const ld = JSON.parse(m![1]!);
    expect(ld["@type"]).toBe("ProfilePage");
    expect(ld.mainEntity["@type"]).toBe("Person");
    expect(ld.mainEntity.name).toBe("Avery Example");
    expect(ld.url).toMatch(/\/people\/avery-example\/$/);
    expect(blair).not.toContain("application/ld+json");
  });

  it("lists papers, work in progress and projects; empty sections are hidden", () => {
    expect(html).toContain('id="publications"');
    expect(html).toContain('id="in-progress"');
    expect(html).toContain('id="projects"');
    expect(html).not.toContain('id="news"'); // no news tags this person
    expect(blair).toContain('id="about"'); // body "Fixture person."
  });

  it("shows direction tags in the header (no heading for a handful of tags)", () => {
    const head = (h: string) => between(h, '<header class="pp-profile__head"', "</header>");
    expect(head(blair)).toContain('aria-label="Research directions of Blair Sample"');
    expect(head(blair)).toContain("Fixture Advice");
    expect(head(html)).not.toContain("Research directions of"); // the PI has no directions
    expect(blair).not.toContain('id="directions"');
  });

  it("sets the lab role after the name and title, never as an eyebrow above the h1 (D-13 item 5)", () => {
    const head = between(html, '<header class="pp-profile__head"', "</header>");
    const h1 = head.indexOf("<h1");
    const role = head.indexOf('<span class="pp-profile__role">Principal investigator</span>');
    expect(h1).toBeGreaterThan(-1);
    expect(role).toBeGreaterThan(h1);
    // Nothing but the avatar comes before the name in the header.
    expect(head.slice(0, h1)).not.toMatch(/<p\b/);
    expect(head).toContain('<div class="pp-profile__meta"><span class="pp-profile__role">');
  });

  it("labels papers and projects with their counts; no count or pipeline note on work in progress or news", () => {
    const wip = between(html, 'aria-labelledby="in-progress"', "</section>");
    expect(wip).not.toContain("pg-row__count");
    expect(wip).not.toMatch(/no public version|documented talk/);
    const news = between(html, 'aria-labelledby="news"', "</section>");
    expect(news).not.toMatch(/\d+ items?</);
    const projects = between(html, 'aria-labelledby="projects"', "</section>");
    const n = pi.projects.length;
    expect(projects).toContain(`class="pg-row__count">${n} ${n === 1 ? "project" : "projects"}<`);
  });

  it("prints no provenance footnote (copy sweep)", () => {
    expect(html).not.toMatch(/as reported by the lab|reported by the lab/i);
    expect(html).not.toContain('class="pg-fn');
  });

  it("puts the lab affiliation (site.yml) under the principal investigator's title only", () => {
    const affil = c.site.affiliation_text;
    expect(html).toContain(`<p class="pp-profile__affil">${affil}</p>`);
    expect(blair).not.toContain("pp-profile__affil");
  });

  it("lists the newest five papers and links to all of them, filtered to the person (VIS-08)", () => {
    const pubs = between(html, 'aria-labelledby="publications"', "</section>");
    expect(pi.publications.length).toBe(7);
    expect(pubs.match(/<article class="bl-pub"/g)?.length).toBe(5);
    for (const p of pi.publications.slice(0, 5)) expect(pubs).toContain(`id="pub-${p.slug}"`);
    for (const p of pi.publications.slice(5)) expect(pubs).not.toContain(`id="pub-${p.slug}"`);
    expect(pubs).toMatch(/href="\/publications\/?\?member=avery-example"/);
    expect(pubs).toContain("All 7 publications");
    expect(pubs).toContain('<span class="vh"> by Avery Example</span>');
    expect(pubs).not.toContain("filtered to");
    // The on-page count is the full total, not the five shown.
    expect(html).toMatch(/href="#publications">.*?<\/span>7<span class="vh">\)/);
  });

  it("says 'View in Publications' when every paper is already listed", () => {
    // Blair has one paper: nothing is cut, so no "See all N".
    const pubs = between(blair, 'aria-labelledby="publications"', "</section>");
    expect(pubs.match(/<article class="bl-pub"/g)?.length).toBe(1);
    expect(pubs).toContain("View in Publications");
    expect(pubs).not.toContain("See all");
  });

  it("collapses work in progress under a visible heading (no-JS <details>)", () => {
    const wip = between(html, 'aria-labelledby="in-progress"', "</section>");
    expect(wip).toContain('<h2 id="in-progress">Work in progress</h2>');
    expect(wip.indexOf('<h2 id="in-progress"')).toBeLessThan(wip.indexOf("<details"));
    expect(wip).toMatch(/<details class="pp-disclosure">/);
    expect(wip).not.toMatch(/<details[^>]*\sopen[\s=>]/);
    expect(wip).toContain("Show work in progress");
    expect(wip).toContain('id="pub-example-2020-fixture-paper-194"');
  });

  it("lists projects as compact rows, not cards", () => {
    const projects = between(html, 'aria-labelledby="projects"', "</section>");
    expect(projects).toContain('aria-label="Projects of Avery Example"');
    expect(projects.match(/<li class="pj-row"/g)?.length).toBe(pi.projects.length);
    expect(projects).not.toContain("bl-card");
  });

  it("leads the header links with the Haas faculty profile (VIS-07 / CON-12)", () => {
    const withHaas = {
      ...pi,
      links: [
        {
          key: "haas",
          label: "Haas faculty profile",
          href: "https://haas.berkeley.edu/faculty/x/",
        },
        ...pi.links,
      ],
    };
    const h = renderToStaticMarkup(<PersonProfile content={c} model={withHaas} />);
    const links = between(h, 'aria-label="Links for Avery Example"', "</ul>");
    expect(links.indexOf("Haas faculty profile")).toBeGreaterThan(-1);
    expect(links.indexOf("Haas faculty profile")).toBeLessThan(links.indexOf("Website"));
    expect(links).toContain('<span class="vh"> of Avery Example</span>');
  });

  it("does not repeat 'Alumni' as a badge next to the role line", () => {
    // No alum has a profile page in the fixture, so give Finley one for this render.
    const withProfile = {
      ...c,
      getPerson: (s: string) => {
        const p = c.getPerson(s);
        return p && { ...p, hasProfile: true };
      },
    };
    const finley = buildPersonProfile(withProfile, "finley-alum")!;
    expect(finley.item.person.isAlumni).toBe(true);
    const h = renderToStaticMarkup(<PersonProfile content={withProfile} model={finley} />);
    expect(h).toContain('<span class="pp-profile__role">Former undergraduate RA</span>');
    expect(h).not.toContain("Alumni,");
    expect(h).toContain("Now at Fixture Company");
  });

  it("never links an unlisted coauthor", () => {
    expect(linksTo(html, "emery-hidden")).toBe(false);
    expect(html).not.toMatch(/bl-pub__author--lab[^>]*>Emery Hidden/);
  });

  it("shows email only when public", () => {
    expect(blair).toContain("mailto:blair@example.edu");
    expect(html).not.toContain("mailto:");
  });
});
