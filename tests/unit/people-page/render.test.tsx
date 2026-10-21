/**
 * WP4 render tests: the People index and person page rendered to static HTML
 * from the fictional "consent-edge-cases" fixture (brief WP4 acceptance 1–6).
 * The HTML is also written to test-results/WP4/fixtures/ so the e2e visual
 * pass can screenshot fixture-only states (photos, directions, emails).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { PeopleIndex } from "@/components/people/PeopleIndex";
import { PersonProfile } from "@/components/people/PersonProfile";
import { buildPersonProfile } from "@/components/people/model";

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const OUT = fileURLToPath(new URL("../../../test-results/WP4/fixtures/", import.meta.url));
const TODAY = "2026-10-20";
const load = (set: string, preview = false) =>
  buildContent(loadRawContent(path.join(FIX, set)), { preview, today: TODAY });

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

describe("People index (consent-edge-cases, production)", () => {
  const c = load("consent-edge-cases");
  const html = renderToStaticMarkup(<PeopleIndex content={c} />);
  save("index.html", html);
  save(
    "index-preview.html",
    renderToStaticMarkup(<PeopleIndex content={load("consent-edge-cases", true)} />),
  );

  it("renders exactly one h1 and group headings in §D9 order", () => {
    expect(html.match(/<h1\b/g)?.length).toBe(1);
    const h2 = [...html.matchAll(/<h2 id="(people-[a-z-]+)"/g)].map((m) => m[1]);
    expect(h2).toEqual([
      "people-pi",
      "people-postdoc",
      "people-phd",
      "people-undergrad",
      "people-affiliate",
      "people-alumni",
    ]);
  });

  it("gives the Faculty Director the wide lead card (well-formed class names)", () => {
    expect(html).toContain('<ul class="pp-grid pp-grid--lead" role="list">');
    expect(html).toMatch(
      /<article class="pp-card pp-card--lead" aria-labelledby="person-avery-example"/,
    );
    expect(html).toMatch(/<article class="pp-card" aria-labelledby="person-blair-sample"/);
    // Guard against class concatenation without a space (e.g. "pp-cardpp-card--lead").
    expect(html).not.toMatch(/class="[^"]*pp-[a-z]+pp-/);
  });

  it("labels alumni year groups as role=group (aria-labelledby is prohibited on a bare div)", () => {
    const years = [...html.matchAll(/<div class="pp-year"([^>]*)>/g)].map((m) => m[1]);
    expect(years.length).toBeGreaterThan(0);
    for (const attrs of years) expect(attrs).toMatch(/role="group" aria-labelledby="alumni-/);
  });

  it("hides the meaningless count next to the Faculty Director heading", () => {
    const pi = between(html, 'aria-labelledby="people-pi"', "</section>");
    expect(pi).not.toContain("pp-group__count");
    const phd = between(html, 'aria-labelledby="people-phd"', "</section>");
    expect(phd).toContain("pp-group__count");
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

  it("uses pearl-initial avatars when there is no consented photo", () => {
    const devon = between(html, 'id="person-devon-placeholder"', "</article>");
    expect(html).toMatch(/bl-pearl__initials">DP</);
    expect(devon).not.toContain("<img");
    // Every card has exactly one avatar (img or pearl).
    const cards = html.split('<article class="pp-').slice(1);
    for (const card of cards) {
      const n =
        (card.match(/<img\b/g)?.length ?? 0) + (card.match(/bl-pearl__initials/g)?.length ?? 0);
      expect(n).toBe(1);
    }
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
    const years = [...html.matchAll(/<h3 id="alumni-(\d{4})"/g)].map((m) => m[1]);
    expect(years).toEqual(["2025", "2024"]);
    const alumni = between(html, '<details class="pp-alumni__details">', "</details>");
    expect(alumni).toContain("Finley Alum");
    expect(alumni).toContain("Gray Alum");
    expect(alumni).not.toContain("Harper Future");
  });

  it("renders the filter chips as real buttons with aria-pressed, hidden without JS", () => {
    const buttons = [
      ...html.matchAll(/<button type="button" class="bl-chip press" aria-pressed="false">/g),
    ];
    // 6 role options + 2 direction options.
    expect(buttons.length).toBe(8);
    expect(html).toContain("<legend");
    expect(html).toContain(
      "<noscript><style>.pp-filters{display:none!important}</style></noscript>",
    );
    expect(html).toMatch(/role="status" aria-live="polite"/);
    // Nothing is hidden in the server render: everything is visible without JS.
    expect(html).not.toMatch(/<(li|section|div)[^>]*\bhidden=""/);
  });

  it("shows no draft badge in production, and one per draft person in preview", () => {
    expect(html).not.toContain("Draft · pending lab review");
    const pv = renderToStaticMarkup(<PeopleIndex content={load("consent-edge-cases", true)} />);
    const indigo = between(pv, 'id="person-indigo-draft"', "</article>");
    expect(indigo).toContain("Draft · pending lab review");
    expect(pv.match(/Draft · pending lab review/g)?.length).toBe(1);
  });
});

describe("People index for the real ./content in a production build (D-06)", () => {
  const dir = fileURLToPath(new URL("../../../content/", import.meta.url));
  const exists = fs.existsSync(path.join(dir, "people"));
  it.skipIf(!exists)(
    "renders exactly the non-draft listed people, never drafts or unlisted",
    () => {
      const raw = loadRawContent(dir);
      const c = buildContent(raw, { preview: false, today: TODAY });
      const html = renderToStaticMarkup(<PeopleIndex content={c} />);
      // What the public site shows today (for the visual pass in tests/e2e/people.spec.ts).
      save("real-index-production.html", html);
      for (const p of raw.entries.people) {
        const shown = html.includes(`id="person-${p.slug}"`);
        expect(shown, p.slug).toBe(p.listed && !p.draft);
        if (!p.listed) expect(html, p.slug).not.toContain(p.name);
      }
      expect(html).not.toContain("Draft · pending lab review");
      const pi = c.people.find((p) => p.role === "pi");
      const model = pi ? buildPersonProfile(c, pi.slug) : undefined;
      if (model) {
        const page = renderToStaticMarkup(<PersonProfile content={c} model={model} />);
        save("real-pi-production.html", page);
        expect(page).not.toContain("Draft · pending lab review");
        for (const p of raw.entries.people.filter((x) => !x.listed))
          expect(page, p.slug).not.toContain(p.name);
      }
    },
  );
});

describe("People index without anything to filter", () => {
  it("omits the filter island", () => {
    const c = load("n1");
    const html = renderToStaticMarkup(<PeopleIndex content={c} />);
    if (c.people.length <= 1) {
      expect(html).not.toContain("pp-filters");
      expect(html).not.toContain("aria-pressed");
    }
  });

  it("omits the summary line when it would only repeat the single group heading", () => {
    const c = load("n1");
    const groups = new Set(c.people.map((p) => (p.isAlumni ? "alumni" : p.role)));
    const html = renderToStaticMarkup(<PeopleIndex content={c} />);
    if (groups.size === 1) expect(html).not.toContain('class="pp-summary"');
    else expect(html).toContain('class="pp-summary"');
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

  it("puts the lab affiliation (site.yml) under the Faculty Director's title only", () => {
    const affil = c.site.affiliation_text;
    expect(html).toContain(`<p class="pp-profile__affil">${affil}</p>`);
    expect(blair).not.toContain("pp-profile__affil");
  });

  it("labels the publications link as a filtered view, with the person's name", () => {
    expect(html).toMatch(/href="\/publications\/?\?member=avery-example"/);
    expect(html).toContain("View in Publications");
    expect(html).toContain("filtered to Avery Example");
    expect(html).not.toContain("See all");
  });

  it("does not repeat 'Alumni' as a badge next to the eyebrow", () => {
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
    expect(h).toContain('<p class="t-eyebrow">Alumni · Undergraduate RA</p>');
    expect(h.match(/Alumni/g)?.length).toBe(1);
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
