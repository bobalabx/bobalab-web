/**
 * Home visual QA (D-15 "the pearl figure", on the D-14 hero): the home at
 * 1440×900 and 390×844, light and dark (first screen and full page), 1366×768 /
 * 1280×800 / 1024×768 / 768×1024, and the figure's states: each pearl hovered
 * (desktop, light and dark), keyboard focus, the morph mid-flight and its
 * destination, the settle intro frames, reduced motion, forced colours and no
 * JS. Writes PNGs to test-results/simplify-home/ for review next to
 * docs/design/shots/c-desktop-*.png (no pixel assertions).
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
      if (vp.width > 500) {
        const n = await page.locator(".pl-item").count();
        for (let i = 0; i < n; i++) {
          await page.locator(".pl-item").nth(i).locator(".pl-body").hover();
          await page.waitForTimeout(600);
          await shot(page, `home-${vp.width}-${scheme}-hover-${i + 1}`);
        }
      }
      await ctx.close();
    });
  }
}

test("home at 1366×768, 1280×800 and the tablet widths", async ({ browser }) => {
  for (const [width, height] of [
    [1366, 768],
    [1280, 800],
    [1024, 768],
    [768, 1024],
  ] as const) {
    const { ctx, page } = await open(browser, { viewport: { width, height } });
    await ready(page);
    await shot(page, `home-${width}x${height}`);
    await ctx.close();
  }
});

test("pearl states: keyboard focus, reduced motion, the morph mid-flight", async ({ browser }) => {
  const { ctx, page } = await open(browser, { viewport: { width: 1440, height: 900 } });
  await ready(page);
  const fig = page.locator(".hm-fig");
  await page.locator(".hm-links a").last().focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
  await fig.screenshot({ path: path.join(OUT, "pearls-focus-2.png") });
  await ctx.close();

  const r = await open(browser, {
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await ready(r.page);
  await r.page.locator(".pl-item").nth(1).locator(".pl-body").hover();
  await r.page.waitForTimeout(300);
  await r.page
    .locator(".hm-fig")
    .screenshot({ path: path.join(OUT, "pearls-reduced-motion-hover.png") });
  await r.ctx.close();

  const m = await open(browser, { viewport: { width: 1440, height: 900 } });
  await m.ctx.addInitScript(() => {
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    document.startViewTransition = ((arg: never) => {
      const t = start(arg);
      t.ready
        .then(() => {
          for (const a of document.getAnimations()) {
            a.pause();
            a.currentTime = 200;
          }
          (window as unknown as { __mid: boolean }).__mid = true;
        })
        .catch(() => {});
      return t;
    }) as typeof document.startViewTransition;
  });
  await ready(m.page);
  const href = (await m.page.locator(".pl-link").first().getAttribute("href"))!;
  await m.page.evaluate(async (u) => void (await fetch(u)), href);
  await m.page.waitForTimeout(1200);
  await m.page.locator(".pl-body").first().click();
  await m.page.waitForFunction(() => (window as unknown as { __mid?: boolean }).__mid);
  await shot(m.page, "morph-200ms");
  await m.page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
  await m.page.waitForTimeout(600);
  await shot(m.page, "morph-destination");
  await m.ctx.close();
});

test("settle intro frames (client navigation to home, fresh session)", async ({ browser }) => {
  const { ctx, page } = await open(browser, { viewport: { width: 1440, height: 900 } }, true);
  await page.goto("/research/");
  await page.locator(".bl-header__brand").click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.evaluate(() => {
    for (const a of document.getAnimations()) a.pause();
  });
  for (const t of [0, 120, 250, 450, 700, 1000]) {
    await page.evaluate((ms) => {
      for (const a of document.getAnimations()) a.currentTime = ms;
    }, t);
    await page.locator(".hm-fig").screenshot({ path: path.join(OUT, `intro-${t}ms.png`) });
  }
  await ctx.close();
});

test("forced colours and no JS", async ({ browser }) => {
  const f = await open(browser, { viewport: { width: 1440, height: 900 }, forcedColors: "active" });
  await ready(f.page);
  await f.page.locator(".pl-link").first().focus();
  await f.page.waitForTimeout(300);
  await shot(f.page, "home-forced-colors-focus");
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
