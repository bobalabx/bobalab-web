/**
 * WP4 People (brief §D9, WP4 acceptance 1–6; DECISIONS D-06), since 2026-10-29
 * the home page's People section (#people): the owner moved the separate
 * /people/ page onto the home page. Person profile pages stay at /people/<slug>/.
 *
 * Runs against BASE_URL (default: the shared dev server http://localhost:3100,
 * which renders ./content in preview mode). Expected values are derived from
 * the same content folder through WP0's loader, so the spec follows content
 * edits. Overrides: PEOPLE_CONTENT_DIR (default "content"), PEOPLE_PREVIEW
 * ("1" default = drafts included, as in `next dev`; "0" for a production export).
 *
 * Screenshots: test-results/WP4/*.png (1366×768 and 390×844, light and dark).
 * The fixture-only states (consented photo, email, direction tags) are
 * rendered by tests/unit/people-page/render.test.tsx into
 * test-results/WP4/fixtures/*.html; when present they are screenshotted here
 * inside the real page chrome.
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { buildContent, loadRawContent } from "../../src/lib/content/load";
import { groupPeople, type PublicPerson } from "../../src/lib/content/people";
import { todayInLab } from "../../src/lib/content/dates";

const DIR = path.resolve(process.env.PEOPLE_CONTENT_DIR || "content");
const PREVIEW = (process.env.PEOPLE_PREVIEW ?? "1") !== "0";
const raw = loadRawContent(DIR);
const content = buildContent(raw, { preview: PREVIEW, today: todayInLab() });
const grouped = groupPeople(content.people);
const profiles = content.people.filter((p) => p.hasProfile);
const pi = content.people.find((p) => p.role === "pi");
const unlisted = raw.entries.people.filter((p) => !p.listed);
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SHOTS = "test-results/WP4";
/** The People section of the home page. */
const SEC = "section#people";

test.describe.configure({ timeout: 90_000 });

async function open(page: Page, url: string) {
  const res = await page.goto(url, { waitUntil: "load" });
  await page.waitForLoadState("networkidle");
  return res;
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    // Next's dev-only overlay/indicator is not part of the site.
    .exclude("nextjs-portal")
    .analyze();
  return r.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.nodes[0]?.target.join(" ")}`,
  );
}

/** Open the alumni <details> when there is one (no-op otherwise). */
async function openAlumni(page: Page) {
  const summary = page.locator("summary.pp-alumni__summary");
  if (await summary.count()) {
    const open = await page
      .locator("details.pp-alumni__details")
      .evaluate((d) => (d as HTMLDetailsElement).open);
    if (!open) await summary.click();
  }
}

const cardNames = (page: Page, scope: string) =>
  page.locator(`${scope} :is(.pp-card__name, .pp-alum__name)`).allInnerTexts();

// ---------------------------------------------------------------------------
// The section: place, order, sorting, alumni

test("home: People is the last section, an h2 at #people; groups in §D9 order, sorted role → rank → last name", async ({
  page,
}) => {
  await open(page, "/");
  const sec = page.locator(SEC);
  await expect(sec).toHaveCount(1);
  await expect(sec).toHaveAttribute("aria-labelledby", "h-people");
  await expect(sec.locator("h2")).toHaveText("People");
  await expect(sec.locator("h1")).toHaveCount(0);
  // Last section of the page body: after papers and news, nothing after it.
  const last = await page.evaluate(() => {
    const secs = [...document.querySelectorAll("main section.hm-sec")];
    return secs.at(-1)?.id;
  });
  expect(last).toBe("people");
  const titles = await sec.locator(".pp-group__title").allInnerTexts();
  const expected = grouped.current.map((g) => g.label);
  if (grouped.alumni.length) expected.push("Alumni");
  expect(titles).toEqual(expected);
  // Heading levels under the h2: groups h3, names h4 (alumni: year h4, name h5).
  await expect(sec.locator("h3.pp-group__title")).toHaveCount(expected.length);
  await expect(sec.locator("h4.pp-card__name")).toHaveCount(
    grouped.current.reduce((s, g) => s + g.people.length, 0),
  );
  for (const g of grouped.current) {
    const names = await cardNames(page, `section[aria-labelledby="people-${g.role}"]`);
    expect(names, g.label).toEqual(g.people.map((p) => p.name));
  }
  // Lab managers (rank 1) lead the undergraduates.
  const undergrads = grouped.current.find((g) => g.role === "undergrad");
  const managers = undergrads?.people.filter((p) => p.rank === 1) ?? [];
  if (managers.length)
    expect(
      (await cardNames(page, 'section[aria-labelledby="people-undergrad"]')).slice(
        0,
        managers.length,
      ),
    ).toEqual(managers.map((p) => p.name));
});

// D-15 (owner): no count sentence ("1 principal investigator, 1 master's student,
// 23 undergraduate RAs and 25 alumni."); the groups carry the people.
test("home: no people-count sentence and no filter chips in the People section", async ({
  page,
}) => {
  await open(page, "/");
  const sec = page.locator(SEC);
  await expect(sec.locator(".pp-summary, .pp-filters, button[aria-pressed]")).toHaveCount(0);
  expect(await sec.innerText()).not.toMatch(
    /\d+ (principal investigators?|master|undergraduate|alumni|PhD|members?)/i,
  );
});

test("home: alumni derive from `end`, collapsed <details> grouped by end year", async ({
  page,
}) => {
  test.skip(!grouped.alumni.length, "no alumni in this content");
  await open(page, "/");
  const details = page.locator(`${SEC} details.pp-alumni__details`);
  await expect(details).toHaveCount(1);
  expect(await details.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);
  // Collapsed: alumni are not visible until the summary is activated.
  await expect(page.locator(".pp-alum").first()).toBeHidden();
  await page.locator("summary.pp-alumni__summary").click();
  await expect(page.locator(".pp-alum").first()).toBeVisible();
  const years = await page.locator(".pp-year__title").allInnerTexts();
  expect(years).toEqual(grouped.alumni.map((y) => String(y.year)));
  for (const y of grouped.alumni) {
    const names = await cardNames(page, `[aria-labelledby="alumni-${y.year}"]`);
    expect(names, String(y.year)).toEqual(y.people.map((p) => p.name));
  }
  // Current members never appear among alumni and vice versa.
  const currentNames = await cardNames(page, ".pp-group:not(.pp-alumni)");
  for (const y of grouped.alumni)
    for (const p of y.people) expect(currentNames).not.toContain(p.name);
});

test("home: the PI leads with the affiliation and links; the foot is the way to join", async ({
  page,
}) => {
  test.skip(!pi, "no PI in content");
  await open(page, "/");
  const lead = page.locator(`${SEC} .pp-card--lead`);
  await expect(lead).toHaveCount(1);
  await expect(lead.locator(".pp-card__name")).toHaveText(pi!.name);
  await expect(lead.locator(".pp-card__affil")).toHaveText(content.site.affiliation_text);
  const haas = (pi as PublicPerson).links?.haas;
  if (haas) await expect(lead.locator(".pp-links a").first()).toHaveAttribute("href", haas);
  const foot = page.locator(`${SEC} .hm-people-foot`);
  await expect(foot.locator(".hm-join")).toContainText("Want to join or work with us?");
  await expect(foot.getByRole("link", { name: "Join the lab", exact: true })).toHaveAttribute(
    "href",
    "/join/",
  );
  await expect(foot.locator(`a[href="mailto:${content.site.email}"]`)).toHaveCount(1);
  for (const l of content.site.member_links)
    await expect(foot.getByRole("link", { name: l.label, exact: true })).toHaveAttribute(
      "href",
      l.url,
    );
  // The foot sits after the lists.
  const [list, f] = [
    await page.locator(`${SEC} .pp-groups`).boundingBox(),
    await foot.boundingBox(),
  ];
  expect(f!.y).toBeGreaterThanOrEqual(list!.y + list!.height - 1);
});

// ---------------------------------------------------------------------------
// Getting there: the header, profile pages and the old /people/ address

test("the header's People link and a profile's breadcrumb land on the People section", async ({
  page,
}) => {
  await open(page, "/news/");
  const nav = page.getByRole("navigation", { name: "Main" });
  const people = nav.getByRole("link", { name: "People", exact: true });
  await expect(people).toHaveAttribute("href", "/#people");
  await expect(people).not.toHaveAttribute("aria-current", "page");
  await people.click();
  await expect(page).toHaveURL(/\/#people$/);
  await expect(page.locator("#h-people")).toBeInViewport();
  // Keyboard focus follows the view: the section's heading, not the page's h1 (RouteFocus).
  await expect(page.locator("#h-people")).toBeFocused();
  if (!pi?.hasProfile) return;
  await open(page, `/people/${pi.slug}/`);
  // On a person's page, People is the current section.
  await expect(
    page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "People" }),
  ).toHaveAttribute("aria-current", "page");
  const crumb = page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", {
    name: "People",
  });
  await expect(crumb).toHaveAttribute("href", "/#people");
  await expect(page.getByRole("link", { name: "All people", exact: true })).toHaveAttribute(
    "href",
    "/#people",
  );
  await crumb.click();
  await expect(page).toHaveURL(/\/#people$/);
  await expect(page.locator("#h-people")).toBeInViewport();
  await expect(page.locator("#h-people")).toBeFocused();
});

test("no page links to the old /people/ list address", async ({ page }) => {
  for (const url of [
    "/",
    "/news/",
    "/join/",
    "/about/",
    ...profiles.map((p) => `/people/${p.slug}/`),
  ]) {
    await open(page, url);
    const old = await page
      .locator('a[href="/people/"], a[href="/people"]')
      .evaluateAll((as) => as.map((a) => a.outerHTML));
    expect(old, url).toEqual([]);
  }
});

test("the old /people/ address: a redirect to /#people (export stub, or 307 in next dev), never a list page", async ({
  request,
}) => {
  // The static export writes a redirect stub (content/site.yml → redirects); `next
  // dev` has no stubs and redirects there itself (next.config.ts, dev only).
  const res = await request.get("/people/", { maxRedirects: 0 });
  if (res.status() === 200) {
    const html = await res.text();
    expect(html).toMatch(/<meta http-equiv="refresh" content="0; url=[^"]*\/#people">/);
    expect(html).toMatch(/<meta name="robots" content="noindex">/);
    expect(html).not.toContain("pp-card");
  } else {
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toMatch(/^(https?:\/\/[^/]+)?(\/[^/#]+)*\/#people$/);
  }
});

test("an old /people/ link lands on the home page's People section (export and next dev)", async ({
  page,
}) => {
  for (const old of ["/people/", "/people", "/people/index.html"]) {
    await page.goto(old);
    // The export's stub refreshes to /#people (no JS needed); next dev answers 307.
    await expect(page, old).toHaveURL(/\/#people$/);
    await expect(
      page.locator(SEC).getByRole("heading", { level: 2, name: "People" }),
    ).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// Consent and listing (D-06)

const visibleText = (page: Page) => page.locator(SEC).innerText();

test("consent: photo, email and now_at render only with their flags", async ({ page }) => {
  await open(page, "/");
  await openAlumni(page);
  const listed = raw.entries.people.filter((p) => p.listed && (PREVIEW || !p.draft));
  // Alumni are a compact text list (D-13 item 5), so only current members show a photo.
  const isAlum = (slug: string) => content.people.find((x) => x.slug === slug)?.isAlumni;
  const photos = listed.filter((p) => p.photo && p.photo_consent && !isAlum(p.slug)).length;
  const emails = listed.filter((p) => p.email && p.email_public).length;
  await expect(page.locator(`${SEC} img.pp-avatar`)).toHaveCount(photos);
  await expect(page.locator(`${SEC} .pp-groups a[href^="mailto:"]`)).toHaveCount(emails);
  const text = await visibleText(page);
  for (const p of listed) {
    if (p.now_at && !p.now_at_public) expect(text, p.slug).not.toContain(p.now_at);
    if (p.now_at && p.now_at_public && content.people.find((x) => x.slug === p.slug)?.isAlumni)
      expect(text, p.slug).toContain(`Now at ${p.now_at}`);
    if (p.email && !p.email_public) expect(text, p.slug).not.toContain(p.email);
  }
  // A square initials tile for every current member without a consented photo;
  // alumni rows carry no avatar at all.
  const cards = await page.locator(".pp-card").count();
  await expect(page.locator(".pp-card .bl-pearl__initials")).toHaveCount(cards - photos);
  await expect(page.locator(".pp-alum :is(img, .bl-pearl)")).toHaveCount(0);
});

test("avatars are squares: 64 px rows, 160 px for the principal investigator", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await open(page, "/");
  const boxes = await page.locator(`${SEC} .pp-avatar`).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        lead: el.classList.contains("pp-avatar--lead"),
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius: cs.borderTopLeftRadius,
      };
    }),
  );
  expect(boxes.length).toBeGreaterThan(0);
  for (const b of boxes) {
    expect(b.radius, "no circles or rounded corners").toBe("0px");
    expect(b.w).toBe(b.h);
    expect(b.w).toBe(b.lead ? 160 : 64);
  }
});

for (const url of ["/", ...profiles.map((p) => `/people/${p.slug}/`)]) {
  test(`unlisted people never appear or get linked: ${url}`, async ({ page }) => {
    await open(page, url);
    await openAlumni(page);
    const html = await page.content();
    const text = await page.locator("body").innerText();
    for (const p of unlisted) {
      expect(html, `link to ${p.slug}`).not.toContain(`/people/${p.slug}/`);
      if (url === "/") expect(text, p.slug).not.toContain(p.name);
    }
  });
}

test("profile links only for profile_page people; other person URLs are not served", async ({
  page,
  request,
}) => {
  await open(page, "/");
  const hrefs = await page
    .locator(`${SEC} a[href^="/people/"]`)
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  const linked = new Set(hrefs.map((h) => h.split("/")[2]).filter(Boolean));
  expect([...linked].sort()).toEqual(profiles.map((p) => p.slug).sort());
  expect(hrefs.every((h) => h.endsWith("/"))).toBe(true);

  // Not generated → not served. The static export has no file (404); `next dev`
  // with output: "export" answers 404 or, once its static-paths cache is warm,
  // 500 "missing param in generateStaticParams()". Either way: never a page.
  const notServed = async (url: string) => {
    const res = await request.get(url);
    expect(res.status(), url).toBeGreaterThanOrEqual(400);
  };
  const noProfile = content.people.find((p) => !p.hasProfile);
  if (noProfile) await notServed(`/people/${noProfile.slug}/`);
  if (unlisted[0]) await notServed(`/people/${unlisted[0].slug}/`);
  await notServed("/people/_none/");
  if (pi) expect((await request.get(`/people/${pi.slug}/`)).status()).toBe(200);
});

test("hidden people (Visible on the website: No) show the badge in preview only", async ({
  page,
}) => {
  await open(page, "/");
  await openAlumni(page);
  const drafts = content.people.filter((p) => p.draft).length;
  await expect(page.locator(`${SEC} .pp-card__badges .bl-badge--draft`)).toHaveCount(
    PREVIEW ? drafts : 0,
  );
});

test("no JavaScript: the whole list is there; alumni still open (native <details>)", async ({
  browser,
  baseURL,
}) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await ctx.newPage();
  await page.goto("/");
  const n = await page.locator(`${SEC} .pp-card`).count();
  expect(n).toBe(grouped.current.reduce((s, g) => s + g.people.length, 0));
  await expect(page.locator(`${SEC} .pp-card`).first()).toBeVisible();
  if (grouped.alumni.length) {
    await page.locator("summary.pp-alumni__summary").click();
    await expect(page.locator(".pp-alum").first()).toBeVisible();
  }
  await ctx.close();
});

// ---------------------------------------------------------------------------
// Person page

test("PI profile: h1, breadcrumb, ProfilePage + Person JSON-LD", async ({ page }) => {
  test.skip(!pi, "no PI in content");
  await open(page, `/people/${pi!.slug}/`);
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("main h1")).toHaveText(pi!.name);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("People");
  const ld = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((ss) => ss.map((s) => JSON.parse(s.textContent || "{}")));
  const profile = ld.find((x) => x["@type"] === "ProfilePage");
  expect(profile).toBeTruthy();
  expect(profile.mainEntity["@type"]).toBe("Person");
  expect(profile.mainEntity.name).toBe(pi!.name);
  expect(String(profile.url)).toMatch(new RegExp(`/people/${pi!.slug}/$`));
  // Papers where the PI is a linked author are listed.
  const authored = content.publications.filter((p) =>
    p.authorList.some((a) => a.person?.slug === pi!.slug),
  );
  const counted = authored.filter((p) => p.counted).length;
  // The newest five are listed; "All N publications" carries the rest (VIS-08).
  if (counted)
    await expect(page.locator('section[aria-labelledby="publications"] .bl-pub')).toHaveCount(
      Math.min(counted, 5),
    );
  // Work in progress is collapsed under its heading; opening it shows the titles.
  const wip = authored.length - counted;
  if (wip) {
    const details = page.locator('section[aria-labelledby="in-progress"] details');
    await expect(details).not.toHaveAttribute("open");
    await expect(page.locator("#in-progress")).toBeVisible();
    await details.locator("summary").click();
    await expect(details.locator(".bl-pub")).toHaveCount(wip);
  }
  // The Haas faculty profile leads the header links when the person has one (VIS-07).
  const haas = (pi as PublicPerson).links?.haas;
  if (haas) {
    const first = page.locator(".pp-profile__head .pp-links a").first();
    await expect(first).toHaveAttribute("href", haas);
    await expect(first).toHaveAccessibleName(new RegExp(`^Haas faculty profile ?of ${pi!.name}$`));
  }
  // Sections without content are not rendered.
  if (!(pi as PublicPerson).body?.trim()) await expect(page.locator("#about")).toHaveCount(0);
  // Direction tags sit in the header, only when the person has directions in this build.
  const dirs = pi!.directions.filter((s) => content.getDirection(s)).length;
  await expect(page.locator(".pp-profile__head .bl-tags li")).toHaveCount(dirs);
  // The lab affiliation (site.yml) appears under the principal investigator's title.
  await expect(page.locator(".pp-profile__affil")).toHaveText(content.site.affiliation_text);
  // The lab role is meta after the name, not an eyebrow above the h1 (D-13 item 5),
  // on phones as well as desktop.
  for (const [w, h] of [
    [1366, 768],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    const h1 = await page.locator("main h1").boundingBox();
    const role = await page.locator(".pp-profile__role").boundingBox();
    expect(role!.y, `${w}px`).toBeGreaterThan(h1!.y + h1!.height);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  // Publications link: a filtered view of the list, named for the person.
  if (counted)
    await expect(
      // (Chromium puts a space before the visually hidden part of the name.)
      page.getByRole("link", {
        name: new RegExp(`^(View in Publications|All ${counted} publications) ?by ${pi!.name}$`),
      }),
    ).toHaveAttribute("href", `/publications/?member=${pi!.slug}`);
});

// ---------------------------------------------------------------------------
// Accessibility, reflow, visual QA

const ROUTES = [
  { name: "home-people", url: "/" },
  ...(pi ? [{ name: "pi", url: `/people/${pi.slug}/` }] : []),
];

for (const scheme of ["light", "dark"] as const) {
  for (const r of ROUTES) {
    test(`axe: zero violations on ${r.name} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, r.url);
      expect(await axe(page)).toEqual([]);
      if (r.name === "home-people") {
        await openAlumni(page);
        expect(await axe(page)).toEqual([]);
      }
    });
  }
}

test("forced colours: zero axe violations with the alumni open", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await open(page, "/");
  await openAlumni(page);
  expect(await axe(page)).toEqual([]);
});

for (const width of [320, 360, 390, 414]) {
  test(`no horizontal scroll at ${width} px: the People section, alumni open`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await open(page, "/");
    await openAlumni(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // Every row of the section stays inside the viewport.
    const right = await page
      .locator(`${SEC} :is(.pp-card, .pp-alum, .hm-join, .hm-members)`)
      .evaluateAll((els) => Math.max(...els.map((e) => e.getBoundingClientRect().right)));
    expect(right).toBeLessThanOrEqual(width);
  });
}

test("no horizontal scroll at 320 px: pi", async ({ page }) => {
  test.skip(!pi, "no PI in content");
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, `/people/${pi!.slug}/`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("layout: group titles sit in the label column, people in the track (PI first, full width)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await open(page, "/");
  const lead = page.locator(`${SEC} .pp-grid--lead`).first();
  test.skip(!(await lead.count()), "needs the PI");
  const title = page.locator(".pp-group__title").first();
  const [t, l] = [await title.boundingBox(), await lead.boundingBox()];
  // The title is in the label column, left of the list; the PI row starts the track.
  expect(t!.x + t!.width).toBeLessThanOrEqual(l!.x);
  // Every group's list shares the PI row's track edges, and so does the foot.
  const lists = await page
    .locator(`${SEC} :is(.pp-group > .pp-grid, .hm-people-foot)`)
    .evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return [Math.round(r.left), Math.round(r.right)];
      }),
    );
  for (const [left, right] of lists) {
    expect(Math.abs(left! - l!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(right! - (l!.x + l!.width))).toBeLessThanOrEqual(1);
  }
  // The section heading starts at the page's left edge, like the other home sections.
  const [h2, news] = [
    await page.locator("#h-people").boundingBox(),
    await page.locator("#h-pubs").boundingBox(),
  ];
  expect(Math.abs(h2!.x - news!.x)).toBeLessThanOrEqual(1);
  // Ruled list, not cards: rows have no box border or background.
  const card = await page
    .locator(".pp-card")
    .first()
    .evaluate((el) => {
      const cs = getComputedStyle(el);
      return { border: cs.borderTopWidth, bg: cs.backgroundColor };
    });
  expect(card.border).toBe("0px");
  expect(card.bg).toBe("rgba(0, 0, 0, 0)");
  // One column on a phone: the PI row fills the width without overflow.
  await page.setViewportSize({ width: 390, height: 844 });
  const c = await page.locator(".pp-grid--lead > .pp-grid__item").first().boundingBox();
  const g = await lead.boundingBox();
  expect(Math.abs(c!.width - g!.width)).toBeLessThanOrEqual(1);
});

const VIEWPORTS = [
  { tag: "1366", width: 1366, height: 768 },
  { tag: "390", width: 390, height: 844 },
];

for (const scheme of ["light", "dark"] as const) {
  for (const vp of VIEWPORTS) {
    test(`screenshots ${vp.tag} ${scheme}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      for (const r of ROUTES) {
        await open(page, r.url);
        if (r.name !== "home-people") {
          await page.screenshot({
            path: `${SHOTS}/${r.name}-${vp.tag}-${scheme}.png`,
            fullPage: true,
          });
          continue;
        }
        await page.locator(SEC).screenshot({ path: `${SHOTS}/${r.name}-${vp.tag}-${scheme}.png` });
        await openAlumni(page);
        await page.locator(SEC).screenshot({
          path: `${SHOTS}/${r.name}-alumni-open-${vp.tag}-${scheme}.png`,
        });
      }
    });
  }
}

/** Fixture-only states (rendered by the unit test) inside the real page chrome. */
for (const scheme of ["light", "dark"] as const) {
  for (const vp of VIEWPORTS) {
    test(`fixture screenshots ${vp.tag} ${scheme}`, async ({ page }) => {
      const dir = path.resolve(SHOTS, "fixtures");
      test.skip(!fs.existsSync(dir), "run the WP4 unit tests first");
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      for (const f of [
        "index.html",
        "index-preview.html",
        "person-pi.html",
        "person-member.html",
        // ./content as the production build renders it (no drafts): the public site today.
        "real-index-production.html",
        "real-pi-production.html",
      ]) {
        const file = path.join(dir, f);
        if (!fs.existsSync(file)) continue;
        // The home page loads the home and pp- stylesheets; a profile page adds pages.css.
        await open(
          page,
          f.includes("pi") || f.includes("member") ? `/people/${pi?.slug ?? ""}/` : "/",
        );
        const html = fs.readFileSync(file, "utf8");
        await page.evaluate(async (h) => {
          const main = document.querySelector("main")!;
          // The section markup is inside the home page's container, as on the site.
          main.innerHTML = h.startsWith("<section") ? `<div class="bl-container hm">${h}</div>` : h;
          main.querySelectorAll("details").forEach((d) => (d.open = true));
          // Lazy images below the fold would otherwise be blank in a full-page shot.
          const imgs = [...main.querySelectorAll("img")];
          imgs.forEach((i) => (i.loading = "eager"));
          await Promise.all(imgs.map((i) => i.decode().catch(() => undefined)));
        }, html);
        await page.screenshot({
          path: `${SHOTS}/fixture-${f.replace(".html", "")}-${vp.tag}-${scheme}.png`,
          fullPage: true,
        });
      }
    });
  }
}

test("no console errors or hydration warnings", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || /hydrat/i.test(m.text())) errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await open(page, "/");
  if (pi) await open(page, `/people/${pi.slug}/`);
  expect(errors).toEqual([]);
});

test("zero off-origin requests", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const off: string[] = [];
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith(origin) && !u.startsWith("data:") && !u.startsWith("blob:")) off.push(u);
  });
  await open(page, "/");
  if (pi) await open(page, `/people/${pi.slug}/`);
  expect(off).toEqual([]);
});
