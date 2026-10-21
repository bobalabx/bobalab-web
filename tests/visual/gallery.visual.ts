/**
 * Fig. 1 fixture gallery (brief §E10.1): n = 0, 1, 2, 3, 4, 6, 7, 8, long labels
 * (8 / 28 characters, two-line labels in t7/t8), seeds 0/1/7/12/24, the dot plot,
 * and the real content in production and preview. Each page is the real home
 * hero, so 1366 and 1024 px show the real column widths.
 *  - Screenshots of the hero at 1366×768 and 1024×768, light and dark.
 *  - Overlap check at text zoom 100 % and 200 %: no label or count box over
 *    another pearl, and no two label boxes overlapping.
 *  - No horizontal scroll at 320 px.
 * Needs `npx vitest run --config tests/visual/vitest.render.config.ts` first.
 */
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DIR = path.resolve(process.cwd(), "test-results/WP1/gallery");
const pages = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith(".html")) : [];

for (const file of pages) {
  const name = file.replace(/\.html$/, "");
  const url = pathToFileURL(path.join(DIR, file)).href;
  test(`gallery ${name}`, async ({ browser }) => {
    for (const width of [1366, 1024]) {
      for (const scheme of ["light", "dark"] as const) {
        const ctx = await browser.newContext({
          viewport: { width, height: 768 },
          colorScheme: scheme,
        });
        const page = await ctx.newPage();
        await page.goto(url);
        await page.evaluate(() => document.fonts.ready);
        await page
          .locator(".hm-hero")
          .screenshot({ path: path.join(DIR, `${name}-${width}-${scheme}.png`) });
        if (name.startsWith("home-") && scheme === "light") {
          await page.screenshot({
            path: path.join(DIR, `${name}-${width}-full.png`),
            fullPage: true,
          });
        }
        await ctx.close();
      }
    }
    // Phones: list mode, no horizontal scroll.
    for (const width of [390, 320]) {
      const ctx = await browser.newContext({
        viewport: { width, height: 844 },
        deviceScaleFactor: 2,
      });
      const page = await ctx.newPage();
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      if (width === 390) {
        await page.locator(".hm-hero").screenshot({ path: path.join(DIR, `${name}-390.png`) });
      }
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(over, `${name}: horizontal scroll at ${width} px`).toBeLessThanOrEqual(0);
      await ctx.close();
    }
    // Overlap check at text zoom 100 % and 200 %.
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await ctx.newPage();
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    for (const zoom of ["100%", "200%"]) {
      await page.evaluate((z) => (document.documentElement.style.fontSize = z), zoom);
      const overlaps = await page.evaluate(() => {
        const items = [...document.querySelectorAll<HTMLElement>(".f1-item")];
        const hits: string[] = [];
        const r = (el: Element | null) => el?.getBoundingClientRect();
        const hit = (a?: DOMRect, b?: DOMRect) =>
          !!a &&
          !!b &&
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
        items.forEach((a, i) => {
          const label = r(a.querySelector(".f1-label"));
          const count = r(a.querySelector(".f1-count"));
          items.forEach((b, j) => {
            if (i === j) return;
            const pearl = r(b.querySelector(".f1-pearl"));
            if (hit(label, pearl) || hit(count, pearl))
              hits.push(`${a.dataset.slug} text over ${b.dataset.slug} pearl`);
            if (j > i && hit(label, r(b.querySelector(".f1-label"))))
              hits.push(`${a.dataset.slug} label over ${b.dataset.slug} label`);
          });
        });
        return hits;
      });
      if (zoom === "200%") {
        await page.screenshot({ path: path.join(DIR, `${name}-zoom200.png`), fullPage: true });
      }
      expect(overlaps, `${name} at ${zoom}`).toEqual([]);
    }
    await ctx.close();
  });
}
