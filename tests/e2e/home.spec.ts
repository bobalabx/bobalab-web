/**
 * Home page (brief §D3, §G1; WP1 acceptance 3): section order, one h1, empty
 * states, reflow, no-JS rendering, zero off-origin requests and axe in light,
 * dark, mobile and forced colours. Runs against BASE_URL (shared dev server).
 */
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

/** Next's dev overlay is not part of the site. */
const axe = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(TAGS).exclude("nextjs-portal");

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem("bobalab-intro", "1");
    } catch {}
  });
});

test("one h1 naming the lab, then the §D3 sections in order", async ({ page }) => {
  await page.goto("/");
  const h1 = page.locator("main h1");
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveAttribute("tabindex", "-1");
  await expect(h1).toContainText("Berkeley Operations and Behavioral Analytics Lab");
  await expect(h1.getByRole("img", { name: "BOBALAB" })).toBeVisible();

  const order = [
    "Research directions",
    "What we’ve learned",
    "Recent publications",
    "Latest news",
    "People",
    "Work with us",
  ];
  const h2s = (await page.locator("main h2").allInnerTexts()).map((t) => t.trim());
  const present = order.filter((t) => h2s.includes(t));
  expect(present[0]).toBe("Research directions");
  expect(h2s.filter((t) => order.includes(t))).toEqual(present);
  // Lists are capped (§D3): 5 publications, 3 news items.
  const pubs = page.locator('section[aria-labelledby="h-pubs"] ol > li');
  expect(await pubs.count()).toBeLessThanOrEqual(5);
  const news = page.locator('section[aria-labelledby="h-news"] ol > li');
  expect(await news.count()).toBeLessThanOrEqual(3);
});

test("hero: affiliation, mission from content and the research CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".hm-aff")).toContainText("Haas School of Business");
  const cta = page.getByRole("link", { name: /Explore our research/ });
  await expect(cta).toHaveAttribute("href", "/research/");
});

test("hero: left edge on the site's content column, figure fits 1366×768", async ({ page }) => {
  for (const width of [1366, 1920]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const x = await page.evaluate(() => {
      const left = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().left;
      return { hero: left(".hm-wm"), header: left("header a"), section: left(".hm-sections") };
    });
    expect(Math.abs(x.hero - x.header), `wordmark vs header at ${width}`).toBeLessThanOrEqual(1);
    if (await page.locator(".f1-plate").count()) {
      const r = await page.locator(".f1-plate").boundingBox();
      expect(r!.x + r!.width).toBeLessThanOrEqual(width);
      if (width === 1366)
        expect(r!.y + r!.height, "plate bottom above the fold").toBeLessThanOrEqual(768);
    }
  }
});

test("work with us: the two §D3.6 routes plus the lab email", async ({ page }) => {
  await page.goto("/");
  const sec = page.locator('section[aria-labelledby="h-work"]');
  await expect(sec.getByRole("link", { name: /Students & RAs/ })).toHaveAttribute(
    "href",
    "/join/#students",
  );
  await expect(sec.getByRole("link", { name: /Partners & data collaborators/ })).toHaveAttribute(
    "href",
    "/join/#partners",
  );
  await expect(sec.locator('a[href^="mailto:"]')).toHaveCount(1);
});

test("people strip: no stray rules under the last person", async ({ page }) => {
  await page.goto("/");
  const last = page.locator(".hm-people > li:last-child > p");
  if (!(await last.count())) test.skip(true, "no people strip");
  const widths = await last.evaluateAll((els) =>
    els.map((e) => getComputedStyle(e).borderBottomWidth),
  );
  expect(widths.every((w) => w === "0px")).toBe(true);
});

test("empty sections are hidden, never placeholders", async ({ page }) => {
  await page.goto("/");
  const body = await page.locator("main").innerText();
  expect(body).not.toMatch(/lorem|ipsum|TODO|placeholder/i);
  // A section heading is rendered only with at least one item under it.
  for (const id of ["h-findings", "h-pubs", "h-news", "h-people"]) {
    const sec = page.locator(`section[aria-labelledby="${id}"]`);
    if (await sec.count()) expect(await sec.locator("li").count()).toBeGreaterThan(0);
  }
});

test("draft items carry the draft badge in preview", async ({ page }) => {
  await page.goto("/");
  const preview = await page.locator("html[data-preview]").count();
  test.skip(!preview, "production build: drafts are excluded");
  await expect(page.locator(".f1-foot .bl-badge--draft")).toBeVisible();
});

for (const width of [390, 320]) {
  test(`no horizontal scroll at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("works without JavaScript: links, legend, no Pause button", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/");
  const links = page.locator('nav[aria-label="Research directions"] ol > li > a');
  expect(await links.count()).toBeGreaterThan(0);
  await expect(page.locator('[data-cap="legend"]')).toBeVisible();
  await expect(page.locator(".f1-pause")).toBeHidden();
  await ctx.close();
});

test("zero off-origin requests", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const off: string[] = [];
  page.on("request", (r) => {
    const u = r.url();
    if (/^https?:/.test(u) && new URL(u).origin !== origin) off.push(u);
  });
  await page.goto("/", { waitUntil: "networkidle" });
  expect(off).toEqual([]);
});

const AXE_CASES = [
  { name: "desktop light", viewport: { width: 1366, height: 768 }, colorScheme: "light" as const },
  { name: "desktop dark", viewport: { width: 1366, height: 768 }, colorScheme: "dark" as const },
  {
    name: "mobile light (list mode)",
    viewport: { width: 390, height: 844 },
    colorScheme: "light" as const,
  },
  {
    name: "mobile dark (list mode)",
    viewport: { width: 390, height: 844 },
    colorScheme: "dark" as const,
  },
];
for (const c of AXE_CASES) {
  test(`axe: ${c.name}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: c.viewport, colorScheme: c.colorScheme });
    const page = await ctx.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    const results = await axe(page).analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`),
    ).toEqual([]);
    await ctx.close();
  });
}

test("axe: forced colours, with a direction active", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    forcedColors: "active",
  });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator(".f1-item").nth(1).locator("a").focus();
  const results = await axe(page).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  await ctx.close();
});

test("tablet hero: columns share a top line; iPad portrait list uses two columns (VIS-09)", async ({
  page,
}) => {
  const sizes: Array<[number, number]> = [
    [1024, 768],
    [768, 1024],
  ];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const g = await page.evaluate(() => {
      const r = (s: string) => document.querySelector(s)?.getBoundingClientRect() ?? null;
      return { wm: r(".hm-wm")!, mission: r(".hm-mission"), plate: r(".f1-plate") };
    });
    if (g.mission) {
      expect(Math.abs(g.wm.top - g.mission.top), `top line at ${width}`).toBeLessThanOrEqual(12);
    }
    if (!g.plate) continue;
    // The plate starts early enough for the first row of pearls to be in the first screen.
    expect(g.plate.top, `plate top at ${width}`).toBeLessThanOrEqual(height === 768 ? 380 : 420);
    const mode = await page
      .locator(".f1-plate")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--f1-mode").trim());
    if (mode === "list" && (await page.locator(".f1-item").count()) >= 2) {
      const tops = await page
        .locator(".f1-item")
        .evaluateAll((els) =>
          els.slice(0, 2).map((e) => Math.round(e.getBoundingClientRect().top)),
        );
      expect(tops[0], "rows 01 and 02 side by side").toBe(tops[1]);
    }
  }
});
