/**
 * Home visual QA (D-14 "the boba cup"): the home at 1440×900 and 390×844, light
 * and dark (first screen and full page), 1366×768 / 1200×800 / 1024×768 /
 * 768×1024, and the cup's states: hover lift, keyboard focus, each pearl risen
 * (desktop and phone, light and dark), the rise mid-flight with bubbles, the
 * settle intro frames, reduced motion, forced colours and no JS. Writes PNGs to
 * test-results/simplify-home/ for review next to docs/simplify/sheets/c-*.jpg
 * (no pixel assertions).
 *   npx playwright test -c tests/visual/playwright.visual.config.ts home
 */
import { test, type BrowserContextOptions, type Browser, type Page } from "@playwright/test";
import path from "node:path";

const OUT = path.resolve(process.cwd(), "test-results/simplify-home");
const shot = (p: Page, name: string, fullPage = false) =>
  p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
const noIntro = () => {
  try {
    sessionStorage.setItem("bobalab-cup-intro", "1");
    sessionStorage.setItem("bobalab-intro", "1");
  } catch {}
};

async function open(browser: Browser, opts: BrowserContextOptions, intro = false) {
  const ctx = await browser.newContext(opts);
  if (!intro) await ctx.addInitScript(noIntro);
  const page = await ctx.newPage();
  return { ctx, page };
}
async function ready(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator(".cup-stage[data-js]").waitFor();
  await page.evaluate(() => document.fonts.ready);
  // Hide Next's dev indicator (not part of the site).
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;

for (const vp of VIEWPORTS) {
  for (const scheme of ["light", "dark"] as const) {
    test(`home ${vp.width} ${scheme}`, async ({ browser }) => {
      const { ctx, page } = await open(browser, {
        viewport: vp,
        colorScheme: scheme,
        deviceScaleFactor: vp.width < 500 ? 2 : 1,
      });
      await ready(page);
      await shot(page, `home-${vp.width}-${scheme}`);
      await shot(page, `home-${vp.width}-${scheme}-full`, true);
      const n = await page.locator(".cup-lab").count();
      for (let i = 0; i < n; i++) {
        await page.locator(".cup-lab").nth(i).click();
        await page.waitForTimeout(700);
        await shot(page, `home-${vp.width}-${scheme}-pearl-${i + 1}`);
      }
      await ctx.close();
    });
  }
}

test("home at 1366×768, 1200×800 and the tablet widths", async ({ browser }) => {
  for (const [width, height] of [
    [1366, 768],
    [1200, 800],
    [1024, 768],
    [768, 1024],
  ] as const) {
    const { ctx, page } = await open(browser, { viewport: { width, height } });
    await ready(page);
    await shot(page, `home-${width}x${height}`);
    await page.locator(".cup-lab").nth(1).click();
    await page.waitForTimeout(700);
    await shot(page, `home-${width}x${height}-pearl-2`);
    await ctx.close();
  }
});

test("cup states: hover, keyboard focus, rise mid-flight, reduced motion", async ({ browser }) => {
  const { ctx, page } = await open(browser, { viewport: { width: 1440, height: 900 } });
  await ready(page);
  const cup = page.locator(".hm-cup");
  await page.locator(".cup-lab").nth(2).hover();
  await page.waitForTimeout(400);
  await cup.screenshot({ path: path.join(OUT, "cup-hover.png") });
  await page.mouse.move(2, 2);
  await page.locator(".hm-links a").last().focus();
  await page.keyboard.press("Tab");
  await page.waitForTimeout(400);
  await cup.screenshot({ path: path.join(OUT, "cup-focus.png") });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await cup.screenshot({ path: path.join(OUT, "cup-rise-150ms.png") });
  await page.waitForTimeout(700);
  await page.keyboard.press("Tab");
  await cup.screenshot({ path: path.join(OUT, "cup-open-tab-in-panel.png") });
  await ctx.close();

  const r = await open(browser, {
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await ready(r.page);
  await r.page.locator(".cup-lab").nth(1).click();
  await r.page
    .locator(".hm-cup")
    .screenshot({ path: path.join(OUT, "cup-reduced-motion-open.png") });
  await r.ctx.close();
});

test("settle intro frames (client navigation to home, fresh session)", async ({ browser }) => {
  const { ctx, page } = await open(browser, { viewport: { width: 1440, height: 900 } }, true);
  await page.goto("/research/");
  await page.locator(".bl-header__brand").click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.evaluate(() => {
    for (const a of document.getAnimations()) a.pause();
  });
  for (const t of [0, 200, 400, 700, 950]) {
    await page.evaluate((ms) => {
      for (const a of document.getAnimations()) a.currentTime = ms;
    }, t);
    await page.locator(".hm-cup").screenshot({ path: path.join(OUT, `intro-${t}ms.png`) });
  }
  await ctx.close();
});

test("forced colours and no JS", async ({ browser }) => {
  const f = await open(browser, { viewport: { width: 1440, height: 900 }, forcedColors: "active" });
  await ready(f.page);
  await f.page.locator(".cup-lab").first().click();
  await f.page.waitForTimeout(400);
  await shot(f.page, "home-forced-colors-open");
  await f.ctx.close();
  for (const width of [1440, 390]) {
    const n = await open(browser, {
      viewport: { width, height: width < 500 ? 844 : 900 },
      javaScriptEnabled: false,
      deviceScaleFactor: width < 500 ? 2 : 1,
    });
    await n.page.goto("/");
    await shot(n.page, `home-${width}-nojs`);
    await n.ctx.close();
  }
});
