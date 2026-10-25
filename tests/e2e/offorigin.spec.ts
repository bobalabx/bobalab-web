/**
 * WP8: privacy and network hygiene (brief §G4 "no cookies, analytics or
 * third-party requests (Playwright asserts zero off-origin requests)", §D12;
 * campus rule KB0015380; DECISIONS D-07).
 *
 *   - zero off-origin requests on every section page and on the first two
 *     detail pages of each template, including lazy images (scrolled into
 *     view) and link prefetches (hover);
 *   - no cookies; browser storage holds only the documented keys
 *     (localStorage "bobalab-motion"; sessionStorage "bobalab-intro" and the
 *     homepage pearls' "bobalab-cup-intro", privacy page);
 *   - against a static export (E2E_STATIC=1): no same-origin 4xx while
 *     navigating client-side through the header (this is how Next #85374's
 *     misnamed prefetch files show up), and the CSP <meta> is present.
 * BASE_URL defaults to the shared dev server (http://localhost:3100).
 */
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const STATIC = process.env.E2E_STATIC === "1";
const SECTIONS = [
  "/",
  "/research/",
  "/projects/",
  "/publications/",
  "/people/",
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
  { index: "/people/", re: /^\/people\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/ },
  { index: "/news/", re: /^\/news\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/ },
];
const ALLOWED_LOCAL = new Set(["bobalab-motion"]);
const ALLOWED_SESSION = new Set(["bobalab-intro", "bobalab-cup-intro"]);
// Keys Next's dev overlay may write when BASE_URL is `next dev` (never in an export).
const DEV_KEY = /^(__next|next|nextjs|__nextjs)/i;

test.describe.configure({ mode: "parallel" });

async function routes(request: APIRequestContext, baseURL: string): Promise<string[]> {
  const origin = new URL(baseURL).origin;
  const out: string[] = [];
  for (const path of SECTIONS) {
    const res = await request.get(path, { timeout: 120_000 });
    if (res.ok()) out.push(path);
  }
  for (const { index, re } of DETAIL) {
    const res = await request.get(index, { timeout: 120_000 });
    if (!res.ok()) continue;
    const found = new Set<string>();
    for (const m of (await res.text()).matchAll(/href="([^"]+)"/g)) {
      const u = new URL((m[1] ?? "").replace(/&amp;/g, "&"), baseURL);
      if (u.origin === origin && re.test(u.pathname)) found.add(u.pathname);
    }
    out.push(...[...found].sort().slice(0, 2));
  }
  return out;
}

function watch(page: Page, origin: string) {
  const offOrigin: string[] = [];
  const failed: string[] = [];
  page.on("request", (r) => {
    const u = r.url();
    if (/^(data|blob|about):/.test(u)) return;
    if (new URL(u).origin !== origin) offOrigin.push(`${r.resourceType()} ${u}`);
  });
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (u.origin === origin && r.status() >= 400) failed.push(`${r.status()} ${u.pathname}`);
  });
  return { offOrigin, failed };
}

/** Scroll through the page (lazy images) and hover links (prefetch). */
async function exercise(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  const links = page.locator("a[href^='/']");
  const n = Math.min(await links.count(), 8);
  for (let i = 0; i < n; i++) {
    const l = links.nth(i);
    if (await l.isVisible()) await l.hover({ timeout: 3000 }).catch(() => undefined);
  }
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
}

test("zero off-origin requests, no cookies, only the documented storage keys", async ({
  page,
  context,
  request,
  baseURL,
}) => {
  test.setTimeout(10 * 60_000);
  const origin = new URL(baseURL!).origin;
  const { offOrigin, failed } = watch(page, origin);
  const storage: string[] = [];
  const visited = await routes(request, baseURL!);
  expect(visited.length, "pages found").toBeGreaterThan(0);
  for (const path of visited) {
    await page.goto(path);
    await exercise(page);
    const keys = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }));
    for (const k of keys.local) {
      if (!ALLOWED_LOCAL.has(k) && !(!STATIC && DEV_KEY.test(k))) storage.push(`localStorage ${k}`);
    }
    for (const k of keys.session) {
      if (!ALLOWED_SESSION.has(k) && !(!STATIC && DEV_KEY.test(k)))
        storage.push(`sessionStorage ${k}`);
    }
  }
  // Toggle the motion preference once so its storage path is covered too.
  await page.goto("/");
  const sw = page.getByRole("switch", { name: /Reduce motion/ });
  if (await sw.count()) {
    await sw.click();
    await sw.click();
  }
  test.info().annotations.push({ type: "pages", description: visited.join(" ") });
  expect(offOrigin, "off-origin requests").toEqual([]);
  expect(await context.cookies(), "cookies").toEqual([]);
  expect([...new Set(storage)], "undocumented storage keys").toEqual([]);
  if (STATIC) expect([...new Set(failed)], "same-origin 4xx/5xx").toEqual([]);
  else if (failed.length)
    test.info().annotations.push({ type: "dev 4xx", description: failed.join(", ") });
});

test("client-side navigation through the header loads without 404s", async ({ page, baseURL }) => {
  test.skip(!STATIC, "segment prefetch files exist only in a static export (E2E_STATIC=1)");
  test.setTimeout(3 * 60_000);
  const { offOrigin, failed } = watch(page, new URL(baseURL!).origin);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const nav = page.getByRole("banner").getByRole("link");
  const names = (await nav.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  for (const name of names) {
    const link = page.getByRole("banner").getByRole("link", { name, exact: true }).first();
    if (!(await link.isVisible())) continue;
    await link.hover();
    await page.waitForTimeout(300);
    await link.click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toBeVisible();
  }
  expect(offOrigin).toEqual([]);
  expect([...new Set(failed)], "same-origin 4xx/5xx during client navigation").toEqual([]);
});

test("static export carries the CSP <meta> (brief §G4)", async ({ page }) => {
  test.skip(!STATIC, "the CSP <meta> is emitted in production builds only");
  for (const path of ["/", "/publications/", "/wp8-missing-page/"]) {
    await page.goto(path);
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute("content");
    expect(csp, path).toContain("default-src 'self'");
    expect(csp, path).toContain("object-src 'none'");
    expect(csp, path).toContain("connect-src 'self'");
  }
});
