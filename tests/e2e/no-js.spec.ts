/**
 * WP8: every page works without JavaScript (brief §0.1 principle 3, §E7, §G5
 * `e2e`: javaScriptEnabled: false).
 *
 * For each section page and the first detail page of each template:
 *   - the HTTP response is OK and the page has exactly one visible, non-empty h1;
 *   - the landmarks exist (banner, main#main, contentinfo) with a skip link;
 *   - the header navigation links are visible;
 *   - nothing in main is left invisible by a JS-gated start state (an
 *     element with text or a link whose effective opacity is ~0, e.g. an
 *     intro animation that never ran);
 *   - every <img> has an alt attribute.
 * Plus: the publications index server-renders the FULL list (same links as with
 * JS), and the Fig. 1 direction links on home work as ordinary links.
 * BASE_URL defaults to the shared dev server (http://localhost:3100).
 */
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const SECTIONS = [
  "/",
  "/research/",
  "/projects/",
  "/publications/",
  // No "/people/": the People list is the home page's #people section (D-21).
  "/news/",
  "/join/",
  "/about/",
  "/accessibility/",
  "/privacy/",
];
const DETAIL: Array<{ index: string; re: RegExp }> = [
  { index: "/research/", re: /^\/research\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/ },
  { index: "/projects/", re: /^\/projects\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/ },
  { index: "/publications/", re: /^\/publications\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/ },
  // Profile pages are linked from the home page's People section.
  { index: "/", re: /^\/people\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/ },
  { index: "/news/", re: /^\/news\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/ },
];

test.use({ javaScriptEnabled: false });
test.describe.configure({ mode: "parallel" });

async function pathsIn(request: APIRequestContext, index: string, re: RegExp, baseURL: string) {
  const res = await request.get(index, { timeout: 120_000 });
  if (!res.ok()) return null;
  const origin = new URL(baseURL).origin;
  const out = new Set<string>();
  for (const m of (await res.text()).matchAll(/href="([^"]+)"/g)) {
    const u = new URL((m[1] ?? "").replace(/&amp;/g, "&"), baseURL);
    if (u.origin === origin && re.test(u.pathname)) out.add(u.pathname);
  }
  return [...out].sort();
}

/** Elements in main that carry text or are links but are effectively invisible. */
async function invisibleContent(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return ["<main> missing"];
    const effectiveOpacity = (el: Element | null) => {
      let o = 1;
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
        o *= Number.parseFloat(getComputedStyle(e).opacity || "1");
      }
      return o;
    };
    const bad: string[] = [];
    for (const el of Array.from(main.querySelectorAll<HTMLElement>("a[href], h1, h2, h3, p, li"))) {
      if (el.closest("[hidden], [aria-hidden='true'], details:not([open]) > :not(summary)"))
        continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const text = (el.textContent ?? "").trim();
      if (!text && el.tagName !== "A") continue;
      if (effectiveOpacity(el) < 0.05) {
        bad.push(`${el.tagName.toLowerCase()}: "${text.slice(0, 40)}"`);
      }
    }
    return bad.slice(0, 10);
  });
}

async function checkPage(page: Page, path: string) {
  const res = await page.goto(path);
  expect(res?.status(), `${path} status`).toBe(200);
  const h1 = page.locator("h1");
  await expect(h1, `${path}: exactly one h1`).toHaveCount(1);
  await expect(h1).toBeVisible();
  expect((await h1.innerText()).trim().length, `${path}: h1 text`).toBeGreaterThan(0);
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.locator("main#main")).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.locator('a[href="#main"]').first()).toBeAttached();
  const nav = page.getByRole("banner").getByRole("link");
  expect(await nav.count(), `${path}: header links`).toBeGreaterThan(1);
  for (const link of await nav.all()) await expect(link).toBeVisible();
  expect(await invisibleContent(page), `${path}: content hidden without JS`).toEqual([]);
  expect(await page.locator("img:not([alt])").count(), `${path}: img without alt`).toBe(0);
}

for (const path of SECTIONS) {
  test(`renders without JS: ${path}`, async ({ page }) => {
    test.setTimeout(120_000);
    await checkPage(page, path);
  });
}

for (const { index, re } of DETAIL) {
  test(`renders without JS: first page linked from ${index}`, async ({
    page,
    request,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    const paths = await pathsIn(request, index, re, baseURL!);
    test.skip(paths === null, `${index} is not built yet`);
    test.skip(!paths!.length, `no detail pages linked from ${index}`);
    await checkPage(page, paths![0]!);
  });
}

test("publications: the full list is in the HTML without JS", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const re = /^\/publications\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;
  const collect = async (p: Page) => {
    const res = await p.goto("/publications/");
    test.skip(res?.status() === 404, "/publications/ is not built yet");
    await p.waitForLoadState("load");
    const hrefs = await p
      .locator("main a[href]")
      .evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).pathname));
    return new Set(hrefs.filter((h) => re.test(h)));
  };
  const noJs = await collect(page);
  const ctx = await browser.newContext({ javaScriptEnabled: true, baseURL });
  const withJs = await collect(await ctx.newPage());
  await ctx.close();
  expect([...noJs].sort(), "papers listed without JS = papers listed with JS").toEqual(
    [...withJs].sort(),
  );
});

test("home: Fig. 1 direction links are ordinary links without JS", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Research directions" });
  test.skip((await nav.count()) === 0, "no live directions in this build (figure suppressed)");
  const firstLink = nav.getByRole("link").first();
  await expect(firstLink).toBeVisible();
  const href = await firstLink.getAttribute("href");
  expect(href).toMatch(/\/research\/[a-z0-9-]+\/$/);
  await firstLink.click();
  await expect(page).toHaveURL(new RegExp(`${href!.replace(/[/.]/g, "\\$&")}$`));
  await expect(page.locator("h1")).toBeVisible();
});
