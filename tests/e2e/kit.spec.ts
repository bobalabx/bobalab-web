/**
 * FOUNDATION kit page checks (brief WP0 acceptance #5–#6; D-13 primitives). Needs a server started with
 * NEXT_PUBLIC_KIT=1, e.g.:
 *   NEXT_PUBLIC_KIT=1 npx next dev --port 3101
 *   BASE_URL=http://localhost:3101 npx playwright test tests/e2e/kit.spec.ts
 * Screenshots land in test-results/kit/.
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function openKit(page: Page) {
  const res = await page.goto("/kit/");
  // In an export /kit/ is the not-found page served with 200, so detect the kit by its
  // own heading (the enabled kit is noindex too; WP8 request 2).
  const enabled =
    res?.status() === 200 &&
    (await page.getByRole("heading", { level: 1, name: "Component kit" }).count()) > 0;
  test.skip(!enabled, "kit page disabled (start the server with NEXT_PUBLIC_KIT=1)");
  await page.waitForLoadState("networkidle");
  // Load lazy images so full-page screenshots show them.
  await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("img[loading=lazy]"));
    imgs.forEach((i) => (i.loading = "eager"));
    await Promise.all(
      imgs.map((i) =>
        i.complete ? null : new Promise((r) => i.addEventListener("load", r, { once: true })),
      ),
    );
  });
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return r.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.nodes[0]?.target.join(" ")}`,
  );
}

for (const scheme of ["light", "dark"] as const) {
  test(`kit renders with zero axe violations (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await openKit(page);
    await page.screenshot({ path: `test-results/kit/kit-${scheme}.png`, fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: `test-results/kit/kit-${scheme}-375.png`, fullPage: true });
    expect(await axe(page)).toEqual([]);
  });
}

test("kit renders with zero axe violations (forced colours)", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await openKit(page);
  await page.screenshot({ path: "test-results/kit/kit-forced-colors.png", fullPage: true });
  expect(await axe(page)).toEqual([]);
});

test("no horizontal scroll at 320 px (WCAG 1.4.10)", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openKit(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("zero off-origin requests", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const off: string[] = [];
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith(origin) && !u.startsWith("data:") && !u.startsWith("blob:")) off.push(u);
  });
  await openKit(page);
  expect(off).toEqual([]);
});

test("preloaded fonts total ≤ 100 KiB", async ({ page }) => {
  const sizes: number[] = [];
  page.on("response", async (r) => {
    if (/\.woff2(\?|$)/.test(r.url())) sizes.push((await r.body()).length);
  });
  await openKit(page);
  const total = sizes.reduce((a, b) => a + b, 0);
  expect(sizes.length).toBeGreaterThan(0);
  expect(total / 1024).toBeLessThanOrEqual(100);
});

test("skip link is first and moves focus to main", async ({ page }) => {
  await openKit(page);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});

test("Reduce motion toggle writes localStorage and <html data-motion>", async ({ page }) => {
  await openKit(page);
  const sw = page.getByRole("switch", { name: /Reduce motion/ });
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "true");
  expect(
    await page.evaluate(() => [
      localStorage.getItem("bobalab-motion"),
      document.documentElement.dataset.motion,
    ]),
  ).toEqual(["reduce", "reduce"]);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.motion)).toBe("reduce");
  await page.getByRole("switch", { name: /Reduce motion/ }).click();
  expect(await page.evaluate(() => localStorage.getItem("bobalab-motion"))).toBeNull();
});

test("RouteFocus focuses the h1 after a client-side navigation", async ({ page }) => {
  await openKit(page);
  await page.getByRole("link", { name: "BOBALAB home" }).click();
  await page.waitForURL((u) => u.pathname === "/" || u.pathname.endsWith("/"));
  await expect(page.locator("main h1")).toBeFocused();
});

test("data-intro is set on the first home view only", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-intro"))).toBe(true);
  await page.waitForTimeout(2100); // the pre-paint script clears it after 2 s (WP1 request 3)
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-intro"))).toBe(
    false,
  );
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-intro"))).toBe(
    false,
  );
});

// D-13: the restyled primitives carry none of the AI-tell markers (DIRECTION §5.0 probe).
test("primitives: no pills, rounded boxes, tracked caps, mono, gradients, shadows or loops", async ({
  page,
}) => {
  await openKit(page);
  const found = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const border = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth);
      const radius = parseFloat(cs.borderTopLeftRadius);
      const tag = `${el.tagName.toLowerCase()}.${el.className}`;
      if (border > 0 && radius >= r.height / 2 - 1 && r.width > r.height * 1.3)
        out.push(`pill ${tag}`);
      // Pearls (discs) and photos are exempt, as in the DIRECTION §5.0 probe.
      const exempt = el.tagName === "IMG" || el.classList.contains("bl-pearl");
      if (r.height > 60 && radius > 2 && !exempt) out.push(`rounded box ${tag}`);
      if (cs.textTransform === "uppercase" && parseFloat(cs.letterSpacing) > 0.3)
        out.push(`tracked caps ${tag}`);
      const text = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim());
      if (
        text &&
        /mono|consolas|plex/i.test(cs.fontFamily) &&
        !el.closest("code, pre, .doi, .bibtex")
      )
        out.push(`mono ${tag}`);
      if (/gradient/.test(cs.backgroundImage)) out.push(`gradient ${tag}`);
      if (cs.boxShadow !== "none") out.push(`shadow ${tag}`);
    }
    if (/[→↗↘›]/.test(document.body.innerText)) out.push("arrow glyph");
    const loops = document
      .getAnimations()
      .filter((a) => a.effect?.getTiming().iterations === Infinity).length;
    if (loops) out.push(`${loops} infinite animations`);
    return out;
  });
  expect(found).toEqual([]);
});

test("header: the outlined BOBALAB wordmark is the home link; five nav items", async ({ page }) => {
  await openKit(page);
  const home = page.getByRole("banner").getByRole("link", { name: "BOBALAB home" });
  await expect(home.locator("svg.bl-wordmark circle")).toHaveCount(1);
  await expect(home.locator("svg.bl-wordmark path")).toHaveCount(6);
  await expect(page.locator(".bl-nav__link")).toHaveText([
    "Research",
    "Publications",
    "People",
    "News",
    "Join",
  ]);
});
