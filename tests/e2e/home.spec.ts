/**
 * Home page (DECISIONS D-13; prototype p3/index.html; JUDGE refinement 8):
 * statement → lab name + lede → Fig. 1 → recent publications → people → news;
 * the lab name stated once; the lede's direction words match the lanes; square
 * people tiles; the AI-tell probe (DIRECTION §5.0) on the home page; reflow,
 * no-JS rendering (the figure draws without a script), zero off-origin requests
 * and axe in light, dark, mobile and forced colours. Runs against BASE_URL.
 */
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

/** Next's dev overlay is not part of the site. */
const axe = (page: Page) => new AxeBuilder({ page }).withTags(TAGS).exclude("nextjs-portal");

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem("bobalab-intro", "1");
    } catch {}
  });
});

test("one h1 statement, the lab's name once, then Fig. 1 and the sections in order", async ({
  page,
}) => {
  await page.goto("/");
  const h1 = page.locator("main h1");
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveAttribute("tabindex", "-1");
  expect((await h1.innerText()).trim().length).toBeGreaterThan(10);
  // The long name is stated once in main (the header wordmark is the home link).
  const longName = (await page.locator(".hm-aff span").first().innerText()).trim();
  expect(longName.length).toBeGreaterThan(5);
  const main = await page.locator("main").innerText();
  expect(main.split(longName).length - 1).toBe(1);
  await expect(page.locator(".hm-aff")).toContainText("Haas School of Business");

  // DOM order: hero, figure, then the sections.
  const order = await page.evaluate(() => {
    const at = (s: string) => {
      const el = document.querySelector(s);
      return el ? [...document.querySelectorAll("main *")].indexOf(el) : -1;
    };
    return [".hm-hero", ".f1-plate", "#h-findings", "#h-pubs", "#h-people", "#h-news"].map(at);
  });
  const present = order.filter((i) => i >= 0);
  expect(present).toEqual([...present].sort((a, b) => a - b));
  expect(order[0]).toBeGreaterThanOrEqual(0);
  const h2s = (await page.locator("main h2").allInnerTexts()).map((t) => t.trim());
  const known = ["What we’ve learned", "Recent publications", "People", "News"];
  expect(h2s.filter((t) => known.includes(t))).toEqual(known.filter((t) => h2s.includes(t)));
  // Lists are capped: 3 publications, 5 news items.
  expect(
    await page.locator("#h-pubs ~ ol > li, section[aria-labelledby='h-pubs'] ol > li").count(),
  ).toBeLessThanOrEqual(3);
  expect(
    await page.locator("section[aria-labelledby='h-news'] ol > li").count(),
  ).toBeLessThanOrEqual(5);
});

test("lede: the mission, then one linked word per direction, in lane order, with its line segment", async ({
  page,
}) => {
  await page.goto("/");
  const words = page.locator(".hm-lede a.hm-dl[data-dir]");
  const lanes = page.locator(".f1-item");
  const n = await lanes.count();
  await expect(words).toHaveCount(n);
  for (let i = 0; i < n; i++) {
    const slug = (await lanes.nth(i).getAttribute("data-slug"))!;
    await expect(words.nth(i)).toHaveAttribute("data-dir", slug);
    await expect(words.nth(i)).toHaveAttribute("href", `/research/${slug}/`);
    await expect(words.nth(i).locator(".bl-seg")).toHaveAttribute("aria-hidden", "true");
    const label = (await lanes.nth(i).locator(".f1-label").innerText()).trim();
    await expect(words.nth(i)).toHaveText(label);
  }
});

test("hero on the content column; the lanes fit the first screen at 1366×768", async ({ page }) => {
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [1024, 768],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const x = await page.evaluate(() => {
      const left = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().left;
      return { h1: left(".hm-h1"), header: left("header a"), plate: left(".f1-plate") };
    });
    expect(Math.abs(x.h1 - x.header), `h1 vs header at ${width}`).toBeLessThanOrEqual(1);
    expect(Math.abs(x.plate - x.header), `figure vs header at ${width}`).toBeLessThanOrEqual(1);
    if (await page.locator(".f1-list").count()) {
      const r = (await page.locator(".f1-plate").boundingBox())!;
      expect(r.x + r.width).toBeLessThanOrEqual(width);
      const lanes = (await page.locator(".f1-list").boundingBox())!;
      if (width === 1366)
        expect(lanes.y + lanes.height, "last lane above the fold").toBeLessThanOrEqual(768);
    }
  }
});

test("section heads are a plain h2; the way on is one factual line at the foot of each list", async ({
  page,
}) => {
  await page.goto("/");
  for (const [id, href, re] of [
    ["h-pubs", "/publications/", /^Publications: \d+ papers?(, \d+ in progress)?$/],
    ["h-people", "/people/", /^People: \d+ members?(, \d+ alumni)?$/],
    ["h-news", "/news/", /^News: \d+ items?( since \d{4})?$/],
  ] as const) {
    const sec = page.locator(`section[aria-labelledby="${id}"]`);
    if (!(await sec.count())) continue;
    // No "All N" link beside the heading (AUDIT: h2 + "All →" on every section).
    await expect(sec.locator(".hm-sec-h a")).toHaveCount(0);
    const more = sec.locator(":scope > .hm-more a");
    await expect(more).toHaveCount(1);
    await expect(more).toHaveAttribute("href", href);
    await expect(more).toHaveText(re);
    // It follows the list.
    const below = await sec.evaluate((s) => {
      const list = s.querySelector("ol, ul")!.getBoundingClientRect();
      return s.querySelector(".hm-more")!.getBoundingClientRect().top >= list.bottom - 1;
    });
    expect(below).toBe(true);
  }
});

test("recent publications: ruled rows linked to Fig. 1", async ({ page }) => {
  await page.goto("/");
  const sec = page.locator('section[aria-labelledby="h-pubs"]');
  if (!(await sec.count())) test.skip(true, "no publications");
  const rows = sec.locator("ol > li");
  expect(await rows.count()).toBeGreaterThan(0);
  for (const r of await rows.all()) {
    await expect(r).toHaveAttribute("data-f1-row", /[a-z0-9-]+/);
    await expect(r.locator(".bl-pub")).toHaveCount(1);
  }
});

test("people: square photos or initials squares, names, and the routes to join", async ({
  page,
}) => {
  await page.goto("/");
  const sec = page.locator('section[aria-labelledby="h-people"]');
  if (!(await sec.count())) test.skip(true, "no people");
  const tiles = sec.locator(".hm-ph");
  expect(await tiles.count()).toBeGreaterThan(0);
  for (const t of (await tiles.all()).slice(0, 6)) {
    const b = (await t.boundingBox())!;
    expect(Math.abs(b.width - b.height)).toBeLessThanOrEqual(1);
    expect(await t.evaluate((e) => getComputedStyle(e).borderRadius)).toBe("0px");
    expect(await t.locator("img, .hm-ini").count()).toBe(1);
  }
  // No stray rules under the last person.
  const widths = await sec
    .locator(".hm-people > li:last-child > p")
    .evaluateAll((els) => els.map((e) => getComputedStyle(e).borderBottomWidth));
  expect(widths.every((w) => w === "0px")).toBe(true);
  await expect(sec.getByRole("link", { name: /^People: \d+ members?/ })).toHaveAttribute(
    "href",
    "/people/",
  );
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

test("people lattice: 8 across on desktop, 3 on phones; enlarged text gives fewer, wider columns", async ({
  page,
}) => {
  const cols = () =>
    page
      .locator(".hm-people")
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  for (const [width, n] of [
    [1440, 8],
    [1366, 8],
    [1024, 8],
    [390, 3],
    [320, 3],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (!(await page.locator(".hm-people").count())) test.skip(true, "no people");
    expect(await cols(), `columns at ${width}`).toBe(n);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  expect(await cols()).toBeLessThan(8);
  // No role or name is wider than its tile (nothing broken mid-word or spilling over).
  const spill = await page
    .locator(".hm-person")
    .evaluateAll(
      (lis) =>
        lis.filter((li) =>
          [...li.querySelectorAll("p")].some((p) => p.scrollWidth > li.clientWidth + 1),
        ).length,
    );
  expect(spill).toBe(0);
});

test("hero address: University of California stays on one line; no comma at the line break", async ({
  page,
}) => {
  for (const width of [768, 1024, 1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const r = await page.locator(".hm-aff").evaluate((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const t = n.textContent ?? "";
        const i = t.indexOf("University");
        const j = t.indexOf("California");
        if (i < 0 || j < 0) continue;
        const at = (k: number) => {
          const range = document.createRange();
          range.setStart(n!, k);
          range.setEnd(n!, k + 1);
          return range.getBoundingClientRect().top;
        };
        return Math.abs(at(i) - at(j));
      }
      return -1;
    });
    if (r >= 0) expect(r, `at ${width}`).toBeLessThan(2);
    // Visible address lines never end in a comma (the comma is kept for screen readers).
    const lines = await page.locator(".hm-aff > span").evaluateAll((spans) =>
      spans.map((s) => {
        const c = s.cloneNode(true) as HTMLElement;
        c.querySelectorAll(".vh").forEach((v) => v.remove());
        return (c.textContent ?? "").trim();
      }),
    );
    for (const l of lines) expect(l).not.toMatch(/,$/);
  }
});

test("news log: dated rows linking to each item", async ({ page }) => {
  await page.goto("/");
  const rows = page.locator('section[aria-labelledby="h-news"] ol > li');
  if (!(await rows.count())) test.skip(true, "no news");
  for (const r of await rows.all()) {
    await expect(r.locator("time[datetime]")).toHaveCount(1);
    await expect(r.locator('a[href^="/news/"]')).toHaveCount(1);
  }
});

test("empty sections are hidden, never placeholders", async ({ page }) => {
  await page.goto("/");
  const body = await page.locator("main").innerText();
  expect(body).not.toMatch(/lorem|ipsum|TODO|placeholder/i);
  for (const id of ["h-findings", "h-pubs", "h-news", "h-people"]) {
    const sec = page.locator(`section[aria-labelledby="${id}"]`);
    if (await sec.count()) expect(await sec.locator("li").count()).toBeGreaterThan(0);
  }
});

test("AI-tell probe (DIRECTION §5.0): no pills, boxes, tracked caps, gradients, shadows, arrows or loops", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const els = [...document.querySelectorAll<HTMLElement>("main *")];
    const out = {
      pills: 0,
      boxes: 0,
      caps: 0,
      gradients: 0,
      shadows: 0,
      arrows: 0,
      loops: 0,
      mono: 0,
    };
    for (const el of els) {
      const cs = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      const rad = parseFloat(cs.borderTopLeftRadius) || 0;
      const boxed =
        cs.borderTopStyle !== "none" &&
        parseFloat(cs.borderTopWidth) > 0 &&
        cs.borderLeftStyle !== "none" &&
        parseFloat(cs.borderLeftWidth) > 0;
      const filled = cs.backgroundColor !== "rgba(0, 0, 0, 0)";
      if (rad >= b.height / 2 - 1 && b.width > b.height * 1.6 && b.height > 8 && (boxed || filled))
        out.pills++;
      if (rad > 2 && b.width > 60 && b.height > 60 && (boxed || filled)) out.boxes++;
      if (cs.textTransform === "uppercase" && parseFloat(cs.letterSpacing) > 0.5) out.caps++;
      if (/gradient/.test(cs.backgroundImage)) out.gradients++;
      if (cs.boxShadow !== "none") out.shadows++;
      if (
        /monospace|Mono|Consolas/i.test(cs.fontFamily.split(",")[0]!) &&
        el.childElementCount === 0 &&
        el.textContent?.trim()
      )
        out.mono++;
    }
    const text = document.querySelector("main")!.textContent ?? "";
    out.arrows = (text.match(/[→←↗↘➔⟶]/g) ?? []).length;
    out.loops = document
      .getAnimations()
      .filter((a) => a.effect?.getComputedTiming().iterations === Infinity).length;
    return out;
  });
  expect(r).toEqual({
    pills: 0,
    boxes: 0,
    caps: 0,
    gradients: 0,
    shadows: 0,
    arrows: 0,
    loops: 0,
    mono: 0,
  });
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

test("works without JavaScript: the figure draws, links work, the caption is there", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1366, height: 768 },
  });
  const page = await ctx.newPage();
  await page.goto("/");
  const links = page.locator('nav[aria-label="Research directions"] ol > li a.f1-link');
  expect(await links.count()).toBeGreaterThan(0);
  await expect(page.locator('[data-cap="legend"]')).toBeVisible();
  await expect(page.locator(".f1-dot").first()).toBeVisible();
  await expect(page.locator(".f1-pearl").first()).toBeVisible();
  expect(
    await page
      .locator(".f1-plate")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--f1-mode").trim()),
  ).toBe("fig");
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
    name: "tablet light (packed)",
    viewport: { width: 768, height: 1024 },
    colorScheme: "light" as const,
  },
  {
    name: "mobile light (strips)",
    viewport: { width: 390, height: 844 },
    colorScheme: "light" as const,
  },
  {
    name: "mobile dark (strips)",
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
