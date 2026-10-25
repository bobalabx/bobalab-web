/**
 * WP4 People pages (brief §D9, WP4 acceptance 1–6; DECISIONS D-06).
 *
 * Runs against BASE_URL (default: the shared dev server http://localhost:3100,
 * which renders ./content in preview mode). Expected values are derived from
 * the same content folder through WP0's loader, so the spec follows content
 * edits. Overrides: PEOPLE_CONTENT_DIR (default "content"), PEOPLE_PREVIEW
 * ("1" default = drafts included, as in `next dev`; "0" for a production export).
 *
 * Screenshots: test-results/WP4/*.png (1366×768 and 390×844, light and dark).
 * The fixture-only states (consented photo, email, direction chips) are
 * rendered by tests/unit/people-page/render.test.tsx into
 * test-results/WP4/fixtures/*.html; when present they are screenshotted here
 * inside the real page chrome.
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { buildContent, loadRawContent } from "../../src/lib/content/load";
import { ROLE_LABELS, groupPeople, type PublicPerson } from "../../src/lib/content/people";
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
// Index: order, sorting, alumni

test("index: one h1, groups in §D9 order, people sorted role → rank → last name", async ({
  page,
}) => {
  await open(page, "/people/");
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("main h1")).toHaveText("People");
  const titles = await page.locator(".pp-group__title").allInnerTexts();
  const expected = grouped.current.map((g) => g.label);
  if (grouped.alumni.length) expected.push("Alumni");
  expect(titles).toEqual(expected);
  for (const g of grouped.current) {
    const names = await cardNames(page, `section[aria-labelledby="people-${g.role}"]`);
    expect(names, g.label).toEqual(g.people.map((p) => p.name));
  }
});

// D-15 (owner): no count sentence under the title ("1 principal investigator, 1
// master's student, 23 undergraduate RAs and 25 alumni."); the groups carry the people.
test("index: no people-count sentence in the page header", async ({ page }) => {
  await open(page, "/people/");
  await expect(page.locator(".pp-summary")).toHaveCount(0);
  const header = await page.locator("main h1").evaluate((h) => h.parentElement!.innerText);
  expect(header).not.toMatch(/\d+ (principal investigators?|master|undergraduate|alumni|PhD)/i);
});

test("index: alumni derive from `end`, collapsed <details> grouped by end year", async ({
  page,
}) => {
  test.skip(!grouped.alumni.length, "no alumni in this content");
  await open(page, "/people/");
  const details = page.locator("details.pp-alumni__details");
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

// ---------------------------------------------------------------------------
// Consent and listing (D-06)

const visibleText = (page: Page) => page.locator("main").innerText();

test("consent: photo, email and now_at render only with their flags", async ({ page }) => {
  await open(page, "/people/");
  await openAlumni(page);
  const listed = raw.entries.people.filter((p) => p.listed && (PREVIEW || !p.draft));
  // Alumni are a compact text list (D-13 item 5), so only current members show a photo.
  const isAlum = (slug: string) => content.people.find((x) => x.slug === slug)?.isAlumni;
  const photos = listed.filter((p) => p.photo && p.photo_consent && !isAlum(p.slug)).length;
  const emails = listed.filter((p) => p.email && p.email_public).length;
  await expect(page.locator("main img.pp-avatar")).toHaveCount(photos);
  await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(emails);
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
  await open(page, "/people/");
  const boxes = await page.locator(".pp-avatar").evaluateAll((els) =>
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

for (const url of ["/people/", ...profiles.map((p) => `/people/${p.slug}/`)]) {
  test(`unlisted people never appear or get linked: ${url}`, async ({ page }) => {
    await open(page, url);
    await openAlumni(page);
    const html = await page.content();
    const text = await page.locator("body").innerText();
    for (const p of unlisted) {
      expect(html, `link to ${p.slug}`).not.toContain(`/people/${p.slug}/`);
      if (url === "/people/") expect(text, p.slug).not.toContain(p.name);
    }
  });
}

test("profile links only for profile_page people; other person URLs are not served", async ({
  page,
  request,
}) => {
  await open(page, "/people/");
  const hrefs = await page
    .locator('main a[href^="/people/"]')
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

test("draft people show the Draft badge in preview", async ({ page }) => {
  await open(page, "/people/");
  await openAlumni(page);
  const drafts = content.people.filter((p) => p.draft).length;
  await expect(page.locator(".pp-card__badges .bl-badge--draft")).toHaveCount(PREVIEW ? drafts : 0);
});

// ---------------------------------------------------------------------------
// Filters

test("filters: role chips are <button aria-pressed> and narrow the list", async ({ page }) => {
  await open(page, "/people/");
  const chips = page.locator(".pp-filters button[aria-pressed]");
  test.skip((await chips.count()) === 0, "nothing to filter in this content");
  const roleGroup = page.getByRole("group", { name: "Role" });
  const chip = roleGroup.getByRole("button").last();
  await expect(chip).toHaveAttribute("aria-pressed", "false");
  const label = (await chip.locator("span").first().innerText()).trim();
  const role = grouped.current.find((g) => g.label === label)?.role;

  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".pp-filters__status")).toContainText("Showing");
  if (role) {
    // Other current groups are hidden; the chosen one stays.
    for (const g of grouped.current) {
      const sec = page.locator(`section[aria-labelledby="people-${g.role}"]`);
      if (g.role === role) await expect(sec).toBeVisible();
      else await expect(sec).toBeHidden();
    }
  }
  // Keyboard: toggle off with Enter, then clear restores everything.
  await chip.focus();
  await page.keyboard.press("Enter");
  await expect(chip).toHaveAttribute("aria-pressed", "false");
  await chip.click();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(chip).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".pp-filters__status")).toHaveText("");
  await expect(page.locator(".pp-group").first()).toBeVisible();
  const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-pressed"));
  expect(focused).not.toBeNull(); // focus stayed on a chip
});

test("filters: a focused toggle's 2 px ring is not clipped by its row (WCAG 2.4.7)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await open(page, "/people/");
  const chips = page.locator(".pp-filters button[aria-pressed]");
  test.skip((await chips.count()) === 0, "nothing to filter in this content");
  await chips.first().focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const clipped = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    if (!el?.matches("button[aria-pressed]")) return ["focus not on a toggle"];
    const out: string[] = [];
    for (let a = el.parentElement; a && !a.matches(".pp-filters"); a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible") out.push(a.className);
    }
    const cs = getComputedStyle(el);
    if (cs.outlineStyle === "none" || parseFloat(cs.outlineWidth) < 2) out.push("no 2 px outline");
    return out;
  });
  expect(clipped).toEqual([]);
});

test("filters: a role held only by alumni reveals the collapsed Alumni list", async ({ page }) => {
  const alumniOnly = [...new Set(content.people.map((p) => p.role))].filter((role) =>
    content.people.filter((p) => p.role === role).every((p) => p.isAlumni),
  );
  test.skip(!alumniOnly.length, "no alumni-only role in this content");
  await open(page, "/people/");
  const label = ROLE_LABELS[alumniOnly[0]!].group;
  await page
    .getByRole("group", { name: "Role" })
    .getByRole("button", { name: label, exact: true })
    .click();
  expect(
    await page
      .locator("details.pp-alumni__details")
      .evaluate((d) => (d as HTMLDetailsElement).open),
  ).toBe(true);
  await expect(page.locator(".pp-filters__status")).toContainText("in Alumni");
  await expect(page.locator(".pp-alum:visible").first()).toBeVisible();
  for (const g of grouped.current)
    await expect(page.locator(`section[aria-labelledby="people-${g.role}"]`)).toBeHidden();
});

test("no JavaScript: the full list is visible and the inert filter bar is hidden", async ({
  browser,
  baseURL,
}) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await ctx.newPage();
  await page.goto("/people/");
  await expect(page.locator(".pp-filters")).toBeHidden();
  const n = await page.locator(".pp-card").count();
  expect(n).toBe(grouped.current.reduce((s, g) => s + g.people.length, 0));
  // The native <details> still works without JS.
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
  // The newest five are listed; "See all N" carries the rest (VIS-08).
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
        name: new RegExp(
          `^(View in Publications|See all ${counted} in Publications) ?, filtered to ${pi!.name}$`,
        ),
      }),
    ).toHaveAttribute("href", `/publications/?member=${pi!.slug}`);
});

// ---------------------------------------------------------------------------
// Accessibility, reflow, visual QA

const ROUTES = [
  { name: "index", url: "/people/" },
  ...(pi ? [{ name: "pi", url: `/people/${pi.slug}/` }] : []),
];

for (const scheme of ["light", "dark"] as const) {
  for (const r of ROUTES) {
    test(`axe: zero violations on ${r.name} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, r.url);
      expect(await axe(page)).toEqual([]);
      if (r.name === "index") {
        await openAlumni(page);
        expect(await axe(page)).toEqual([]);
        const chip = page.locator(".pp-filters button[aria-pressed]").first();
        if (await chip.count()) {
          await chip.click();
          expect(await axe(page)).toEqual([]);
        }
      }
    });
  }
}

test("forced colours: zero axe violations on the index", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await open(page, "/people/");
  expect(await axe(page)).toEqual([]);
});

for (const r of ROUTES) {
  test(`no horizontal scroll at 320 px: ${r.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await open(page, r.url);
    await openAlumni(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("layout: group titles sit in the label column, people in the track (PI first, full width)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await open(page, "/people/");
  const lead = page.locator(".pp-grid--lead").first();
  test.skip(!(await lead.count()), "needs the PI");
  const title = page.locator(".pp-group__title").first();
  const [t, l] = [await title.boundingBox(), await lead.boundingBox()];
  // The title is in the label column, left of the list; the PI row starts the track.
  expect(t!.x + t!.width).toBeLessThanOrEqual(l!.x);
  // Every group's list shares the PI row's track edges.
  const lists = await page.locator(".pp-group > .pp-grid").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return [Math.round(r.left), Math.round(r.right)];
    }),
  );
  for (const [left, right] of lists) {
    expect(Math.abs(left! - l!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(right! - (l!.x + l!.width))).toBeLessThanOrEqual(1);
  }
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
        await page.screenshot({
          path: `${SHOTS}/${r.name}-${vp.tag}-${scheme}.png`,
          fullPage: true,
        });
        if (r.name === "index") {
          await openAlumni(page);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({
            path: `${SHOTS}/${r.name}-alumni-open-${vp.tag}-${scheme}.png`,
            fullPage: true,
          });
          const chip = page.getByRole("group", { name: "Role" }).getByRole("button").last();
          if (await chip.count()) {
            await chip.click();
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({
              path: `${SHOTS}/${r.name}-filtered-${vp.tag}-${scheme}.png`,
              fullPage: false,
            });
          }
        }
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
        // /people/ loads the pp- stylesheet; the profile CSS is the same file.
        await open(page, "/people/");
        const html = fs.readFileSync(file, "utf8");
        await page.evaluate(async (h) => {
          const main = document.querySelector("main")!;
          main.innerHTML = h;
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
  await open(page, "/people/");
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
  await open(page, "/people/");
  if (pi) await open(page, `/people/${pi.slug}/`);
  expect(off).toEqual([]);
});
