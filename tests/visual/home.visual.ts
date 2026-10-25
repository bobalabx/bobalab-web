/**
 * Home visual QA (redesign, D-13): the live home at 1440×900 and 390×844, light
 * and dark (fold and full page), 1366×768 and the tablet widths, plus Fig. 1
 * states (a lane, a dot, a lede word, a ledger row, keyboard focus), forced
 * colours and the arrival frames. Writes PNGs to test-results/redesign-home/ for
 * human review against docs/redesign/prototypes/sheets/ (no pixel assertions).
 *   npx playwright test -c tests/visual/playwright.visual.config.ts home
 */
import { test, type Page } from "@playwright/test";
import path from "node:path";

const OUT = path.resolve(process.cwd(), "test-results/redesign-home");
const shot = (p: Page, name: string, fullPage = false) =>
  p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
const noIntro = () => {
  try {
    sessionStorage.setItem("bobalab-intro", "1");
  } catch {}
};

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;

for (const vp of VIEWPORTS) {
  for (const scheme of ["light", "dark"] as const) {
    test(`home ${vp.width} ${scheme}`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: vp,
        colorScheme: scheme,
        deviceScaleFactor: vp.width < 500 ? 2 : 1,
      });
      await ctx.addInitScript(noIntro);
      const page = await ctx.newPage();
      await page.goto("/", { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await shot(page, `home-${vp.width}-${scheme}`);
      await shot(page, `home-${vp.width}-${scheme}-full`, true);
      await ctx.close();
    });
  }
}

test("home at 1366×768 and the tablet widths", async ({ browser }) => {
  for (const [width, height] of [
    [1366, 768],
    [1024, 768],
    [768, 1024],
  ] as const) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    await ctx.addInitScript(noIntro);
    const page = await ctx.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await shot(page, `home-${width}x${height}`);
    await ctx.close();
  }
});

test("figure states", async ({ browser }) => {
  for (const scheme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: scheme,
    });
    await ctx.addInitScript(noIntro);
    const page = await ctx.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector(".f1-plate[data-live]");
    await page.evaluate(() => document.fonts.ready);
    const fig = page.locator(".f1");
    const rest = () => page.mouse.move(2, 2).then(() => page.waitForTimeout(400));
    await fig.screenshot({ path: path.join(OUT, `figure-rest-${scheme}.png`) });
    await page.locator(".f1-item").nth(2).locator(".f1-label").hover();
    await page.waitForTimeout(400);
    await fig.screenshot({ path: path.join(OUT, `figure-lane-${scheme}.png`) });
    await rest();
    const shared = page.locator(".f1-dot.is-tw").first();
    await ((await shared.count()) ? shared : page.locator(".f1-dot").first()).hover();
    await page.waitForTimeout(400);
    await fig.screenshot({ path: path.join(OUT, `figure-dot-${scheme}.png`) });
    await rest();
    await page.locator(".hm-dl").nth(1).hover();
    await page.waitForTimeout(400);
    await shot(page, `figure-lede-${scheme}`);
    await rest();
    await page.locator(".f1-link").nth(3).focus();
    await page.waitForTimeout(400);
    await fig.screenshot({ path: path.join(OUT, `figure-focus-${scheme}.png`) });
    await page.keyboard.press("Escape");
    const row = page.locator("[data-f1-row]").nth(1);
    if (await row.count()) {
      await row.hover();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT, `figure-row-${scheme}.png`), fullPage: true });
    }
    await ctx.close();
  }
});

test("figure in forced colours", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    forcedColors: "active",
  });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator(".f1-link").nth(1).focus();
  await page.waitForTimeout(300);
  await page.locator(".f1").screenshot({ path: path.join(OUT, "figure-forced-colors.png") });
  await ctx.close();
});

test("arrival frames", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForSelector(".f1-dot");
  await page.evaluate(() => {
    for (const a of document.getAnimations()) a.pause();
  });
  for (const t of [0, 150, 400, 800, 1200]) {
    await page.evaluate((ms) => {
      for (const a of document.getAnimations()) a.currentTime = ms;
    }, t);
    await page.locator(".f1").screenshot({ path: path.join(OUT, `intro-${t}ms.png`) });
  }
  await ctx.close();
});
