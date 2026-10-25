/**
 * Fig. 1 "Lines" fixture gallery: n = 0, 1, 2, 3, 4, 6, 7, 8, long labels, the
 * real content (production and preview) and synthetic growth (2x, 4x, 8x papers).
 *  - Screenshots of the figure at 1366, 1024 and 768 px (light; dark at 1366)
 *    and of the strips at 390 px.
 *  - Layout checks wherever the lanes are drawn, at text zoom 100 % and 200 %:
 *    one "now" x for every pearl; every dot between the label column and "now";
 *    rings inside the plate; year labels never overlap.
 *  - No horizontal scroll at 390 and 320 px.
 * D-14: `cup-<set>` pages hold the real home page with the boba cup for 0–8 live
 * directions (R17): screenshots of the hero, and checks that no two pearls or
 * labels overlap and every label stays inside the viewport.
 * Needs `npx vitest run --config tests/visual/vitest.render.config.ts` first.
 */
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DIR = path.resolve(process.cwd(), "test-results/redesign-home/gallery");
const pages = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith(".html")) : [];

async function layoutProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const plate = document.querySelector<HTMLElement>(".f1-plate");
    if (!plate) return [];
    if (getComputedStyle(plate).getPropertyValue("--f1-mode").trim() !== "fig") {
      // Strips (also where packed columns no longer fit on desktop): a dot is a
      // line-and-disc cell, never boxed by the packed layout's twin outline.
      const boxed = [...plate.querySelectorAll(".f1-dot")].filter(
        (d) => getComputedStyle(d).outlineStyle !== "none",
      ).length;
      return boxed ? [`strips: ${boxed} dot cell(s) outlined`] : [];
    }
    const out: string[] = [];
    const R = (el: Element) => el.getBoundingClientRect();
    const pr = R(plate);
    const pearls = [...plate.querySelectorAll(".f1-pearl")].map((e) => R(e));
    const now = pearls[0] ? pearls[0].left + pearls[0].width / 2 : 0;
    if (pearls.some((p) => Math.abs(p.left + p.width / 2 - now) > 0.5))
      out.push("pearls off the now rule");
    for (const li of plate.querySelectorAll<HTMLElement>(".f1-item")) {
      const track = R(li.querySelector(".f1-track")!);
      for (const d of li.querySelectorAll(".f1-dot")) {
        const r = R(d);
        if (r.left < track.left + 4 || r.right > now - 17)
          out.push(`${li.dataset.slug}: dot outside ${Math.round(r.left)}–${Math.round(r.right)}`);
      }
      for (const g of li.querySelectorAll(".f1-ring")) {
        if (R(g).right > pr.right) out.push(`${li.dataset.slug}: ring past the plate`);
      }
    }
    const yrs = [...plate.querySelectorAll(".f1-yr")].map((e) => {
      const r = document.createRange();
      r.selectNodeContents(e);
      return r.getBoundingClientRect();
    });
    for (let i = 1; i < yrs.length; i++)
      if (yrs[i]!.left < yrs[i - 1]!.right + 2) out.push(`year labels ${i - 1}/${i} overlap`);
    return out;
  });
}

/** The cup: pearls never overlap, label rows never overlap, labels stay on screen. */
async function cupProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const boxes = (sel: string) =>
      [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect());
    const pearls = boxes(".cup-pearl");
    for (let i = 1; i < pearls.length; i++)
      if (pearls[i]!.left < pearls[i - 1]!.right - 0.5) out.push(`pearls ${i - 1}/${i} overlap`);
    const labs = boxes(".cup-lab-t");
    for (let i = 1; i < labs.length; i++)
      if (labs[i]!.top < labs[i - 1]!.bottom - 1) out.push(`labels ${i - 1}/${i} overlap`);
    for (const l of labs)
      if (l.right > document.documentElement.clientWidth) out.push("label past the viewport");
    return out;
  });
}

for (const file of pages) {
  const name = file.replace(/\.html$/, "");
  const url = pathToFileURL(path.join(DIR, file)).href;
  test(`gallery ${name}`, async ({ browser }) => {
    for (const [width, scheme] of [
      [1366, "light"],
      [1366, "dark"],
      [1024, "light"],
      [768, "light"],
    ] as const) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: scheme,
      });
      const page = await ctx.newPage();
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      const fig = page.locator(".f1, .hm-soon, .hm-hero").first();
      if (await fig.count())
        await fig.screenshot({ path: path.join(DIR, `${name}-${width}-${scheme}.png`) });
      expect(await cupProblems(page), `${name} cup at ${width} px`).toEqual([]);
      if (scheme === "light") {
        for (const zoom of ["100%", "200%"]) {
          await page.evaluate((z) => (document.documentElement.style.fontSize = z), zoom);
          expect(await layoutProblems(page), `${name} at ${width} px, text ${zoom}`).toEqual([]);
        }
      }
      await ctx.close();
    }
    for (const width of [390, 320]) {
      const ctx = await browser.newContext({
        viewport: { width, height: 844 },
        deviceScaleFactor: 2,
      });
      const page = await ctx.newPage();
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      if (width === 390 && (await page.locator(".f1").count()))
        await page.locator(".f1").screenshot({ path: path.join(DIR, `${name}-390.png`) });
      if (width === 390 && (await page.locator(".cup").count()))
        await page.locator(".cup").screenshot({ path: path.join(DIR, `${name}-390.png`) });
      expect(await cupProblems(page), `${name} cup at ${width} px`).toEqual([]);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(over, `${name}: horizontal scroll at ${width} px`).toBeLessThanOrEqual(0);
      await ctx.close();
    }
  });
}
