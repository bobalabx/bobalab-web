/**
 * WP2: /projects/ and /projects/{slug}/ (brief §D6; WP2 acceptance #1, #6, #7, #9, #10).
 * Runs against BASE_URL (default: the shared dev server, drafts included).
 * Routes are discovered from the rendered index.
 *   npx playwright test tests/e2e/projects.spec.ts
 * Screenshots: test-results/WP2/.
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SHOTS = "test-results/WP2";
const VIEWPORTS = [
  { name: "1366", width: 1366, height: 768 },
  { name: "390", width: 390, height: 844 },
] as const;

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return r.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.nodes[0]?.target.join(" ")}`,
  );
}

async function open(page: Page, path: string) {
  const res = await page.goto(path);
  expect(res?.status(), `${path} status`).toBe(200);
  await page.waitForLoadState("networkidle");
}

/** Project slugs in index order, plus the one with the richest page (team + papers). */
async function discover(page: Page) {
  await open(page, "/projects/");
  const slugs = await page
    .locator(".pj-group .bl-card__title a")
    .evaluateAll((as) =>
      as.map((a) => (a.getAttribute("href") ?? "").replace(/^\/projects\/|\/$/g, "")),
    );
  return { slugs };
}

async function richest(page: Page, slugs: string[]) {
  let best = slugs[0]!;
  let score = -1;
  for (const s of slugs) {
    await open(page, `/projects/${s}/`);
    const n = await page.locator(".dr-section").count();
    if (n > score) {
      score = n;
      best = s;
    }
  }
  return best;
}

test.describe("visual QA and axe", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const vp of VIEWPORTS) {
      test(`project routes · ${vp.name} · ${scheme}`, async ({ page }) => {
        test.setTimeout(240_000);
        const { slugs } = await discover(page);
        const rich = await richest(page, slugs);
        // Also a project with no direction or the shortest page, when present.
        const routes = ["/projects/", `/projects/${rich}/`, `/projects/${slugs.at(-1)}/`];
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const problems: string[] = [];
        for (const r of [...new Set(routes)]) {
          await open(page, r);
          const name = r === "/projects/" ? "projects-index" : `project-${r.split("/")[2]}`;
          await page.screenshot({
            path: `${SHOTS}/${name}-${vp.name}-${scheme}.png`,
            fullPage: true,
          });
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          if (overflow > 0) problems.push(`${r}: horizontal overflow ${overflow}px`);
          for (const v of await axe(page)) problems.push(`${r}: ${v}`);
        }
        expect(problems).toEqual([]);
      });
    }
  }
});

test("index: grouped by primary direction in editorial order, each project once, with a status chip", async ({
  page,
}) => {
  // Editorial order of live directions from /research/.
  await open(page, "/research/");
  const order = await page
    .locator('section[aria-labelledby="rs-directions"] .bl-card__title a')
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  const { slugs } = await discover(page);
  expect(slugs.length).toBeGreaterThan(0);
  expect(new Set(slugs).size).toBe(slugs.length);
  await expect(page.locator("main h1")).toHaveAttribute("tabindex", "-1");
  const groupHrefs = await page
    .locator(".pj-group__title a")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  const liveGroups = groupHrefs.filter((h) => order.includes(h));
  expect(liveGroups).toEqual(order.filter((h) => liveGroups.includes(h)));
  // Every card has a status badge.
  const cards = page.locator(".pj-group .bl-card");
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    await expect(cards.nth(i).locator(".bl-badge").first()).toHaveText(
      /Active|Completed|Paused|Archived/,
    );
  }
});

test("index: status chips filter the list and announce the count", async ({ page }) => {
  await open(page, "/projects/");
  const chips = page.locator(".pj-filter button[aria-pressed]");
  test.skip((await chips.count()) < 2, "only one status in this content");
  await expect(page.locator(".pj-filter__bar")).toBeVisible();
  const total = await page.locator(".pj-group li[data-status]").count();
  const chip = chips.last();
  const label = (await chip.locator("span").first().textContent())!.trim();
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  const visible = page.locator(".pj-group li[data-status]:visible");
  const shown = await visible.count();
  expect(shown).toBeGreaterThan(0);
  expect(shown).toBeLessThan(total);
  for (const s of await visible.evaluateAll((els) => els.map((e) => e.getAttribute("data-status"))))
    expect(s?.toLowerCase()).toBe(label.toLowerCase());
  await expect(page.locator(".pj-filter__count")).toHaveText(
    `Showing ${shown} of ${total} projects`,
  );
  // Empty groups hide too.
  const emptyVisibleGroups = await page
    .locator(".pj-group:visible")
    .evaluateAll((gs) => gs.filter((g) => !g.querySelector("[data-status]:not([hidden])")).length);
  expect(emptyVisibleGroups).toBe(0);
  await chip.click();
  await expect(page.locator(".pj-group li[data-status]:visible")).toHaveCount(total);
});

test("detail: breadcrumb Research › Direction › Project, JSON-LD, team only listed people", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const { slugs } = await discover(page);
  for (const slug of slugs) {
    await open(page, `/projects/${slug}/`);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toHaveAttribute("tabindex", "-1");
    const crumbs = page.locator('.pj-head nav[aria-label="Breadcrumb"] li');
    await expect(crumbs).toHaveCount(3);
    await expect(crumbs.nth(0).locator("a")).toHaveAttribute("href", "/research/");
    const second = await crumbs.nth(1).locator("a").getAttribute("href");
    expect(second === "/projects/" || /^\/research\/[a-z0-9-]+\/$/.test(second ?? "")).toBe(true);
    await expect(crumbs.nth(2)).toHaveAttribute("aria-current", "page");
    await expect(crumbs.nth(2)).toHaveText((await page.locator("main h1").textContent())!.trim());
    // The breadcrumb direction is the first direction tag (primary).
    if (second !== "/projects/") {
      const firstTag = await page.locator(".pj-head .bl-tags a").first().getAttribute("href");
      expect(firstTag).toBe(second);
    }
    const ld = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((ss) => ss.map((s) => JSON.parse(s.textContent || "{}")));
    expect(
      ld.some((x) => x["@type"] === "ResearchProject" && x.url.endsWith(`/projects/${slug}/`)),
    ).toBe(true);
    // Team links only go to people pages that exist.
    for (const href of await page
      .locator(".pj-team a[href^='/people/']")
      .evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
      const res = await page.request.get(href!);
      expect(res.status(), href!).toBe(200);
    }
    // Empty sections are hidden.
    const empties = await page
      .locator(".dr-section")
      .evaluateAll(
        (ss) => ss.filter((s) => !s.querySelector(".dr-section__body")?.textContent?.trim()).length,
      );
    expect(empties).toBe(0);
  }
});

test("breadcrumb links navigate and focus the destination h1", async ({ page }) => {
  const { slugs } = await discover(page);
  await open(page, `/projects/${slugs[0]}/`);
  const crumb = page.locator('.pj-head nav[aria-label="Breadcrumb"] li').nth(1).locator("a");
  const href = (await crumb.getAttribute("href"))!;
  await crumb.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator("main h1")).toBeFocused();
});

test("no-JS: index shows every project; detail renders", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  const { slugs } = await discover(page);
  await expect(page.locator(".pj-group li[data-status]:visible")).toHaveCount(slugs.length);
  // Chips that cannot filter without JS are not shown (a <noscript> style hides the bar).
  await expect(page.locator(".pj-filter__bar")).toBeHidden();
  await open(page, `/projects/${slugs[0]}/`);
  await expect(page.locator("main h1")).toBeVisible();
  await ctx.close();
});

test("placeholder and unknown slugs are not pages", async ({ page }) => {
  for (const p of ["/projects/_none/", "/projects/not-a-project/"]) {
    const res = await page.goto(p);
    // The static export has no such page (404). `next dev` with output: "export"
    // sometimes answers 500 "missing param in generateStaticParams()" instead
    // (MEASURED 2026-10-20); either way it is never a 200 page.
    const status = res?.status() ?? 0;
    expect(status, p).toBeGreaterThanOrEqual(400);
    expect(status === 404 || status === 500, `${p} → ${status}`).toBe(true);
  }
});
