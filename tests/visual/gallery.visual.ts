/**
 * Fig. 1 "Lines" fixture gallery: n = 0, 1, 2, 3, 4, 6, 7, 8, long labels, the
 * real content (production and preview) and synthetic growth (2x, 4x, 8x papers).
 *  - Screenshots of the figure at 1366, 1024 and 768 px (light; dark at 1366)
 *    and of the strips at 390 px.
 *  - Layout checks wherever the lanes are drawn, at text zoom 100 % and 200 %:
 *    one "now" x for every pearl; every dot between the label column and "now";
 *    rings inside the plate; year labels never overlap.
 *  - No horizontal scroll at 390 and 320 px.
 * D-15: `pearls-<set>` pages hold the real home page with the pearl figure for
 * 0–8 live directions: screenshots of the hero, and checks that no two pearls or
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

/** The pearls (D-15): no two pearls, orbits or labels overlap; labels stay on screen. */
async function pearlProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const boxes = (sel: string) =>
      [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect());
    const hit = (a: DOMRect, b: DOMRect) =>
      a.left < b.right - 0.5 &&
      b.left < a.right - 0.5 &&
      a.top < b.bottom - 0.5 &&
      b.top < a.bottom - 0.5;
    for (const sel of [".pl-ring", ".pl-label", ".pl-count"]) {
      const b = boxes(sel);
      for (let i = 0; i < b.length; i++)
        for (let j = i + 1; j < b.length; j++)
          if (hit(b[i]!, b[j]!)) out.push(`${sel} ${i}/${j} overlap`);
    }
    const rings = boxes(".pl-ring");
    for (const l of boxes(".pl-label")) {
      if (l.right > document.documentElement.clientWidth) out.push("label past the viewport");
      if (rings.some((r) => hit(r, l))) out.push("a label touches an orbit");
    }
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
      expect(await pearlProblems(page), `${name} pearls at ${width} px`).toEqual([]);
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
      if (width === 390 && (await page.locator(".pl").count()))
        await page.locator(".pl").screenshot({ path: path.join(DIR, `${name}-390.png`) });
      expect(await pearlProblems(page), `${name} pearls at ${width} px`).toEqual([]);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(over, `${name}: horizontal scroll at ${width} px`).toBeLessThanOrEqual(0);
      await ctx.close();
    }
  });
}
