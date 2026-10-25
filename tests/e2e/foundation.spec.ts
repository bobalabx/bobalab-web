/**
 * Shared-foundation checks from the verification phase (motion.css, the site
 * header, badges). Runs against the dev server or a served export.
 */
import { expect, test, type Page } from "@playwright/test";

const skipIntro = (page: Page) =>
  page.context().addInitScript(() => {
    try {
      sessionStorage.setItem("bobalab-intro", "1");
      sessionStorage.setItem("bobalab-cup-intro", "1");
    } catch {}
  });

/**
 * On the first view transition, record the computed z-index of every group
 * pseudo-element that is animating (keyed by pseudo-element name).
 */
const recordGroupZ = () => {
  const w = window as unknown as { __vz: Record<string, string> | null };
  w.__vz = null;
  const start = document.startViewTransition?.bind(document);
  if (!start) return;
  document.startViewTransition = ((arg: never) => {
    const t = start(arg);
    t.ready
      .then(() => {
        const z: Record<string, string> = {};
        for (const a of document.getAnimations()) {
          const pe = (a.effect as KeyframeEffect | null)?.pseudoElement ?? "";
          const m = /^::view-transition-(?:group|new|old)\((.+)\)$/.exec(pe);
          if (!m?.[1]) continue;
          const group = `::view-transition-group(${m[1]})`;
          z[m[1]] = getComputedStyle(document.documentElement, group).zIndex;
        }
        w.__vz = z;
      })
      .catch(() => {});
    return t;
  }) as typeof document.startViewTransition;
};

// verify VIS-01: React's page-boundary groups (`_t_N_`, captured from the NEW page)
// paint after the pearl group (captured from the OLD page) unless the pearl is lifted,
// which washed the pearl out for the second half of the morph.
test("pearl morph: the travelling pearl paints above the page-swap groups, below the header", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "view-transition pseudo-elements are read in Chromium");
  await skipIntro(page);
  await page.context().addInitScript(recordGroupZ);
  await page.goto("/");
  // D-15 (change request pearls-1): the homepage morph source is the pearl itself
  // (.pl-body, named pearl-{slug}); its link opens the direction.
  await page.waitForSelector(".pl[data-js]");
  const explore = page.locator(".pl-item").first().locator("a.pl-link");
  const slug = (await explore.getAttribute("href"))!.split("/")[2]!;
  await page.evaluate(async (s) => void (await fetch(`/research/${s}/`)), slug);
  await page.waitForTimeout(1500);
  await explore.focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(`**/research/${slug}/`);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __vz: unknown }).__vz))
    .not.toBeNull();
  const z = (await page.evaluate(
    () => (window as unknown as { __vz: Record<string, string> }).__vz,
  )) as Record<string, string>;
  const num = (v: string | undefined) => (v === undefined || v === "auto" ? 0 : Number(v));
  const pearl = num(z[`pearl-${slug}`]);
  expect(pearl, JSON.stringify(z)).toBeGreaterThan(0);
  const pageGroups = Object.keys(z).filter((k) => k === "root" || /^_t_\d+_$/.test(k));
  expect(pageGroups.length, JSON.stringify(z)).toBeGreaterThan(0);
  for (const k of pageGroups) expect(pearl, `${k} ${JSON.stringify(z)}`).toBeGreaterThan(num(z[k]));
  if ("site-header" in z) expect(num(z["site-header"])).toBeGreaterThan(pearl);
});

// verify VIS-05: below 360 px the five links wrapped "Join" alone onto a third row.
for (const width of [320, 360, 390]) {
  test(`header at ${width} px: brand row + one nav row, no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/news/");
    const tops = await page
      .locator(".bl-nav__link")
      .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(tops).toHaveLength(5);
    expect(new Set(tops).size, `nav link tops ${tops.join(",")}`).toBe(1);
    const h = await page.locator(".bl-header").evaluate((e) => e.getBoundingClientRect().height);
    expect(h).toBeLessThanOrEqual(110);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}

// verify A11Y-05: the nowrap draft badge pushed 320 px pages sideways under WCAG 1.4.12
// text spacing (preview builds; a production build has no drafts, so this passes trivially).
test("badges wrap instead of overflowing at 320 px with WCAG 1.4.12 text spacing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/", "/research/", "/people/"]) {
    await page.goto(path);
    await page.addStyleTag({
      content:
        "*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}",
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: path })
      .toBe(320);
  }
});
