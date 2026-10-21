/**
 * WP1 visual QA: home at 1366×768 and 390×844, light and dark, plus figure
 * states (hover, focus, reduced motion, forced colours, intro frames).
 * Writes PNGs to test-results/WP1/ for human review (no pixel assertions).
 */
import { test, type Page } from "@playwright/test";
import path from "node:path";

const OUT = path.resolve(process.cwd(), "test-results/WP1");
const shot = (p: Page, name: string, fullPage = false) =>
  p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });

const VIEWPORTS = [
  { tag: "desktop", width: 1366, height: 768 },
  { tag: "mobile", width: 390, height: 844 },
] as const;

for (const vp of VIEWPORTS) {
  for (const scheme of ["light", "dark"] as const) {
    test(`home ${vp.tag} ${scheme}`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: scheme,
        reducedMotion: "reduce", // stable frames: no intro or float in the stills
        deviceScaleFactor: vp.tag === "mobile" ? 2 : 1,
      });
      const page = await ctx.newPage();
      await page.goto("/", { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await shot(page, `home-${vp.tag}-${scheme}`);
      await shot(page, `home-${vp.tag}-${scheme}-full`, true);
      await ctx.close();
    });
  }
}

test("figure states (desktop)", async ({ browser }) => {
  for (const scheme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      colorScheme: scheme,
    });
    await ctx.addInitScript(() => {
      try {
        sessionStorage.setItem("bobalab-intro", "1");
      } catch {}
    });
    const page = await ctx.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const plate = page.locator(".f1-plate");
    await page.waitForTimeout(400);
    await plate.screenshot({ path: path.join(OUT, `figure-rest-${scheme}.png`) });
    // hover pearl 02
    const box = await page.locator('.f1-item[data-slot="2"] .f1-pearl').boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
    await page.waitForTimeout(1200);
    await plate.screenshot({ path: path.join(OUT, `figure-hover-02-${scheme}.png`) });
    await page.mouse.move(5, 5);
    await page.waitForTimeout(800);
    // keyboard focus on pearl 03
    await page.locator('.f1-item[data-slot="3"] a').focus();
    await page.waitForTimeout(600);
    await plate.screenshot({ path: path.join(OUT, `figure-focus-03-${scheme}.png`) });
    await ctx.close();
  }
});

test("figure reduced motion + forced colours", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "reduce",
    forcedColors: "active",
  });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator('.f1-item[data-slot="2"] a').focus();
  await page.waitForTimeout(300);
  await page.locator(".f1-plate").screenshot({ path: path.join(OUT, "figure-forced-colors.png") });
  await ctx.close();
});

test("intro frames", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForSelector(".f1-plate");
  await page.evaluate(() => {
    for (const a of document.getAnimations()) a.pause();
  });
  for (const t of [0, 150, 300, 500, 800, 1100]) {
    await page.evaluate((ms) => {
      for (const a of document.getAnimations()) a.currentTime = ms;
    }, t);
    await page.locator(".f1-plate").screenshot({ path: path.join(OUT, `intro-${t}ms.png`) });
  }
  await ctx.close();
});
