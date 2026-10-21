/**
 * WP8: site-wide accessibility (brief §G1, §G5 `a11y` job; WP8 acceptance #5).
 *
 * axe (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa) on:
 *   - every section page and every detail page linked from the section indexes
 *     (directions, projects, publications, people, news) at 1366×768;
 *   - one page per template at 390×844 (mobile);
 *   - the home page in figure mode (1366×768) and list mode (390×844);
 *   - the not-found page;
 * each in the light AND dark colour schemes. Forced colours are in
 * motion-and-colors.spec.ts.
 *
 * Target: BASE_URL (default http://localhost:3100, the shared dev server). In CI
 * it is the preview export served by scripts/serve-out.mjs (E2E_STATIC=1), so
 * draft pages are audited too. Pages are discovered from the section indexes,
 * so the spec never needs updating when content changes.
 *   A11Y_SAMPLE=<n>  audit at most n detail pages per template (default: all
 *                    with E2E_STATIC=1, else 3 to spare the dev server);
 *   A11Y_SHOTS=1     also save a full-page screenshot of every audited page to
 *                    test-results/WP8/a11y/.
 */
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const STATIC = process.env.E2E_STATIC === "1";
const SAMPLE = Number(process.env.A11Y_SAMPLE ?? (STATIC ? Infinity : 3));
const SHOTS = process.env.A11Y_SHOTS === "1";
const DESKTOP = { width: 1366, height: 768 };
const MOBILE = { width: 390, height: 844 };

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
const TEMPLATES = {
  direction: { index: "/research/", re: /^\/research\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/ },
  project: { index: "/projects/", re: /^\/projects\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/ },
  publication: { index: "/publications/", re: /^\/publications\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/ },
  person: { index: "/people/", re: /^\/people\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/ },
  news: { index: "/news/", re: /^\/news\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/ },
} as const;
type Template = keyof typeof TEMPLATES;
const NOT_FOUND = "/wp8-this-page-does-not-exist/";

const htmlCache = new Map<string, string | null>();
async function html(request: APIRequestContext, path: string): Promise<string | null> {
  if (!htmlCache.has(path)) {
    const res = await request.get(path, { timeout: 120_000 });
    htmlCache.set(path, res.ok() ? await res.text() : null);
  }
  return htmlCache.get(path)!;
}

/** Same-origin page links in an HTML document (paths only). */
function links(doc: string, baseURL: string): string[] {
  const origin = new URL(baseURL).origin;
  const out = new Set<string>();
  for (const m of doc.matchAll(/href="([^"]+)"/g)) {
    const raw = (m[1] ?? "").replace(/&amp;/g, "&");
    let u: URL;
    try {
      u = new URL(raw, baseURL);
    } catch {
      continue;
    }
    if (u.origin === origin) out.add(u.pathname);
  }
  return [...out];
}

async function detailPages(request: APIRequestContext, baseURL: string, t: Template) {
  const { index, re } = TEMPLATES[t];
  const doc = await html(request, index);
  if (!doc) return { indexMissing: true, routes: [] as string[] };
  const routes = links(doc, baseURL)
    .filter((p) => re.test(p))
    .sort();
  return { indexMissing: false, routes };
}

/** Wait for fonts and for finite animations (intro, transitions) to finish. */
async function settle(page: Page) {
  await page.waitForLoadState("load");
  await page.evaluate(async () => {
    await document.fonts.ready;
    const finite = document
      .getAnimations()
      .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
      .map((a) => a.finished.catch(() => undefined));
    await Promise.race([Promise.all(finite), new Promise((r) => setTimeout(r, 3000))]);
  });
}

async function audit(page: Page, path: string, label: string): Promise<string[]> {
  const expected = path === NOT_FOUND ? 404 : 200;
  let r: Awaited<ReturnType<AxeBuilder["analyze"]>> | undefined;
  // Two attempts: under `next dev` another package's edit can trigger a full
  // reload mid-scan ("Execution context was destroyed"); that is not a finding.
  for (let attempt = 1; !r; attempt++) {
    const res = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect.soft(res?.status(), `${path} HTTP status`).toBe(expected);
    try {
      await settle(page);
      if (SHOTS) {
        const name = `${label}-${path.replace(/^\/|\/$/g, "").replace(/\//g, "__") || "home"}`;
        await page.screenshot({ path: `test-results/WP8/a11y/${name}.png`, fullPage: true });
      }
      r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    } catch (e) {
      if (attempt >= 2 || !/context was destroyed|navigat/i.test(String(e))) throw e;
    }
  }
  return r.violations.map(
    (v) =>
      `${path}: ${v.id} (${v.impact}) ×${v.nodes.length}: ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join(" | ")}`,
  );
}

async function auditAll(page: Page, routes: string[], label: string) {
  const all: string[] = [];
  for (const r of routes) all.push(...(await audit(page, r, label)));
  expect(all, `axe violations (${label})`).toEqual([]);
}

/**
 * Fig. 1's layout mode as the figure itself reads it (`--f1-mode` on
 * .f1-plate: "fig" from a 46em container up, else "list"; WP1). null when the
 * build has no figure (no live directions).
 */
async function figureMode(page: Page): Promise<string | null> {
  const plate = page.locator(".f1-plate").first();
  if (!(await plate.count())) return null;
  return plate.evaluate((el) => getComputedStyle(el).getPropertyValue("--f1-mode").trim());
}

/** Prove the audit ran in the intended figure mode (not just at a viewport size). */
async function expectFigureMode(page: Page, mode: "fig" | "list") {
  const actual = await figureMode(page);
  if (actual === null) {
    test.info().annotations.push({ type: "figure", description: "no Fig. 1 in this build" });
    return;
  }
  expect(actual, "Fig. 1 layout mode during the audit").toBe(mode);
}

test.describe.configure({ mode: "parallel" });

for (const scheme of ["light", "dark"] as const) {
  test.describe(`axe, ${scheme} scheme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    test(`home in figure mode (1366×768, ${scheme})`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await auditAll(page, ["/"], `figure-${scheme}`);
      await expectFigureMode(page, "fig");
    });

    test(`home in list mode (390×844, ${scheme})`, async ({ page }) => {
      await page.setViewportSize(MOBILE);
      await auditAll(page, ["/"], `list-${scheme}`);
      await expectFigureMode(page, "list");
    });

    test(`section pages and not-found (1366×768, ${scheme})`, async ({ page }) => {
      test.setTimeout(10 * 60_000);
      await page.setViewportSize(DESKTOP);
      await auditAll(page, [...SECTIONS.slice(1), NOT_FOUND], `sections-${scheme}`);
    });

    test(`section pages (390×844, ${scheme})`, async ({ page }) => {
      test.setTimeout(10 * 60_000);
      await page.setViewportSize(MOBILE);
      await auditAll(page, SECTIONS.slice(1), `sections-mobile-${scheme}`);
    });

    for (const t of Object.keys(TEMPLATES) as Template[]) {
      test(`${t} pages (1366×768 all, 390×844 first, ${scheme})`, async ({
        page,
        request,
        baseURL,
      }) => {
        test.setTimeout(20 * 60_000);
        const { indexMissing, routes } = await detailPages(request, baseURL!, t);
        test.skip(indexMissing, `${TEMPLATES[t].index} is not built yet`);
        test.skip(!routes.length, `no ${t} pages are linked from ${TEMPLATES[t].index}`);
        const picked = routes.slice(0, SAMPLE);
        test.info().annotations.push({
          type: "pages",
          description: `${picked.length} of ${routes.length} ${t} page(s)`,
        });
        await page.setViewportSize(DESKTOP);
        const violations: string[] = [];
        for (const r of picked) violations.push(...(await audit(page, r, `${t}-${scheme}`)));
        await page.setViewportSize(MOBILE);
        violations.push(...(await audit(page, picked[0]!, `${t}-mobile-${scheme}`)));
        expect(violations, `axe violations (${t}, ${scheme})`).toEqual([]);
      });
    }
  });
}

test.describe("reflow (WCAG 1.4.10, brief §G1)", () => {
  test("no horizontal scrolling at 320 CSS px on any page", async ({ page, request, baseURL }) => {
    test.setTimeout(20 * 60_000);
    await page.setViewportSize({ width: 320, height: 640 });
    const routes = [...SECTIONS, NOT_FOUND];
    for (const t of Object.keys(TEMPLATES) as Template[]) {
      routes.push(...(await detailPages(request, baseURL!, t)).routes.slice(0, SAMPLE));
    }
    const overflow: string[] = [];
    for (const path of routes) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await settle(page);
      const r = await page.evaluate(() => {
        const de = document.documentElement;
        if (de.scrollWidth <= de.clientWidth) return null;
        let worst = "";
        let right = 0;
        for (const el of Array.from(document.querySelectorAll("body *"))) {
          const b = el.getBoundingClientRect();
          if (b.width && b.right > right && getComputedStyle(el).position !== "fixed") {
            right = b.right;
            worst = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${String(el.getAttribute("class") ?? "").split(/\s+/)[0]}`;
          }
        }
        return `scrollWidth ${de.scrollWidth} > ${de.clientWidth}; widest: ${worst} (right ${right.toFixed(1)})`;
      });
      if (r) overflow.push(`${path}: ${r}`);
    }
    test.info().annotations.push({ type: "pages", description: `${routes.length} page(s)` });
    expect(overflow, "pages that scroll sideways at 320 px").toEqual([]);
  });
});

test.describe("SEO files (WP8 routes)", () => {
  for (const [path, type] of [
    ["/robots.txt", /^text\/plain/],
    ["/sitemap.xml", /xml/],
  ] as const) {
    test(`${path} is served and readable`, async ({ page, request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toMatch(type);
      const body = await res.text();
      if (path === "/robots.txt") {
        expect(body).toMatch(/^Disallow: \/admin\/$/m);
        expect(body).toMatch(/^Sitemap: https?:\/\/\S+\/sitemap\.xml$/m);
      } else {
        expect(body).toContain("<urlset");
        expect(body).not.toMatch(/\/(admin|kit|_none)\//);
      }
      // Visual QA record (brief WP8 handover): both viewports, both schemes.
      for (const scheme of ["light", "dark"] as const) {
        for (const [vp, size] of [
          ["1366", DESKTOP],
          ["390", MOBILE],
        ] as const) {
          await page.emulateMedia({ colorScheme: scheme });
          await page.setViewportSize(size);
          await page.goto(path);
          await page.screenshot({
            path: `test-results/WP8/${path.slice(1).replace(".", "-")}-${vp}-${scheme}.png`,
          });
        }
      }
    });
  }
});
