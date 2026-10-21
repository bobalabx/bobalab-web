/**
 * WP2: /research/ and /research/{direction}/ (brief §D4–§D5, §E5; WP2 acceptance).
 * Runs against BASE_URL (default: the shared dev server http://localhost:3100,
 * drafts included). Routes are discovered from the rendered index, so the spec
 * follows whatever content the server has.
 *   npx playwright test tests/e2e/research.spec.ts
 * Screenshots: test-results/WP2/.
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SWATCHES, CORE_DARK, blend, hexToRgb, type SwatchId } from "../../src/lib/content/palette";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SHOTS = "test-results/WP2";
const VIEWPORTS = [
  { name: "1366", width: 1366, height: 768 },
  { name: "390", width: 390, height: 844 },
] as const;

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return r.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.nodes[0]?.target.join(" ")}`,
  );
}

async function open(page: Page, path: string) {
  const res = await page.goto(path);
  expect(res?.status(), `${path} status`).toBe(200);
  await page.waitForLoadState("networkidle");
}

/** Live and archived direction slugs, read from the research index. */
async function discover(page: Page) {
  await open(page, "/research/");
  const slugsIn = async (sel: string) =>
    page
      .locator(`${sel} .bl-card__title a`)
      .evaluateAll((as) =>
        as.map((a) => (a.getAttribute("href") ?? "").replace(/^\/research\/|\/$/g, "")),
      );
  return {
    live: await slugsIn('section[aria-labelledby="rs-directions"]'),
    archived: await slugsIn('section[aria-labelledby="rs-earlier"]'),
  };
}

/** Record the transition types React passes to document.startViewTransition. */
async function recordTransitions(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __vt: string[][] };
    w.__vt = [];
    const d = document as unknown as {
      startViewTransition?: (arg: unknown) => unknown;
    };
    const orig = d.startViewTransition?.bind(d);
    if (!orig) return;
    d.startViewTransition = (arg: unknown) => {
      const types =
        arg && typeof arg === "object" && "types" in arg
          ? [...((arg as { types?: Iterable<string> }).types ?? [])]
          : [];
      w.__vt.push(types);
      return orig(arg);
    };
  });
}
const recorded = (page: Page) =>
  page.evaluate(() => (window as unknown as { __vt?: string[][] }).__vt ?? []);

// ---------------------------------------------------------------------------
// Visual QA + axe: every WP2 research route, 2 viewports × 2 schemes.

test.describe("visual QA and axe", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const vp of VIEWPORTS) {
      test(`research routes · ${vp.name} · ${scheme}`, async ({ page }) => {
        test.setTimeout(180_000);
        const { live, archived } = await discover(page);
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const routes = [
          "/research/",
          ...live.map((s) => `/research/${s}/`),
          ...archived.map((s) => `/research/${s}/`),
        ];
        const problems: string[] = [];
        for (const r of routes) {
          await open(page, r);
          const name = r === "/research/" ? "research-index" : `research-${r.split("/")[2]}`;
          await page.screenshot({
            path: `${SHOTS}/${name}-${vp.name}-${scheme}.png`,
            fullPage: true,
          });
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          if (overflow > 0) problems.push(`${r}: horizontal overflow ${overflow}px`);
          for (const v of await axe(page)) problems.push(`${r}: ${v}`);
        }
        expect(problems).toEqual([]);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Index

test("index: live directions in editorial order, archived under 'Earlier and related research'", async ({
  page,
}) => {
  const { live, archived } = await discover(page);
  expect(live.length).toBeGreaterThan(0);
  for (const a of archived) expect(live).not.toContain(a);
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("main h1")).toHaveAttribute("tabindex", "-1");
  await expect(page.locator('main a[href="/publications/"]').first()).toBeVisible();
  // Projects grouped by status (Active before Completed when both exist).
  const groups = await page
    .locator('section[aria-labelledby="rs-projects"] .rs-status__title')
    .allTextContents();
  const order = groups.map((g) => g.replace(/\d+/g, "").trim());
  if (order.includes("Active") && order.includes("Completed")) {
    expect(order.indexOf("Active")).toBeLessThan(order.indexOf("Completed"));
  }
});

// ---------------------------------------------------------------------------
// Direction page

test("direction page: header, derived counts, see-all filter, sections, one name per pearl", async ({
  page,
}) => {
  const { live } = await discover(page);
  for (const slug of live) {
    await open(page, `/research/${slug}/`);
    const h1 = page.locator("main h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveAttribute("tabindex", "-1");

    // Breadcrumb "Research / 0N" → /research/; "All directions" → Fig. 1.
    const crumbs = page.locator('.dr-band nav[aria-label="Breadcrumb"]');
    await expect(crumbs.locator('a[href="/research/"]')).toHaveText("Research");
    await expect(crumbs.locator('[aria-current="page"]')).toContainText(/\d{2}/);
    await expect(page.locator(".dr-back")).toHaveAttribute("href", "/");

    // Hero pearl present; every pearl slug on the page is unique (hero + rail).
    await expect(page.locator(`.dr-band .f1-dp--hero[data-slug="${slug}"]`)).toHaveCount(1);
    const slugs = await page
      .locator(".f1-dp[data-slug]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-slug")));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.filter((s) => s === slug)).toHaveLength(1);

    // Status line counts are derived and match what the page lists.
    const status = (await page.locator(".dr-status").textContent()) ?? "";
    const projects = Number(/(\d+) projects?/.exec(status)?.[1]);
    const papers = Number(/(\d+) papers?/.exec(status)?.[1]);
    await expect(page.locator(".dr-project")).toHaveCount(projects);
    if (papers > 0) {
      const aside = await page
        .locator('section[aria-labelledby="publications"] .dr-section__aside')
        .textContent();
      expect(aside).toContain(`${papers} paper`);
      const href = await page.locator(".dr-seeall a").getAttribute("href");
      expect(href).toBe(`/publications/?direction=${slug}`);
    }
    // Empty sections are hidden: every section has content.
    const empties = await page
      .locator(".dr-section")
      .evaluateAll(
        (ss) => ss.filter((s) => !s.querySelector(".dr-section__body")?.textContent?.trim()).length,
      );
    expect(empties).toBe(0);

    // ResearchProject JSON-LD.
    const ld = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((ss) => ss.map((s) => JSON.parse(s.textContent || "{}")));
    expect(
      ld.some((x) => x["@type"] === "ResearchProject" && x.url.endsWith(`/research/${slug}/`)),
    ).toBe(true);

    // Unique page title.
    await expect(page).toHaveTitle(/, BOBALAB research$/);
  }
});

test("header band uses the swatch tokens; the dark band is the computed blend", async ({
  page,
}) => {
  const { live } = await discover(page);
  const slug = live[0]!;
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, `/research/${slug}/`);
    const band = page.locator(".dr-band");
    const id = (await band.getAttribute("data-swatch")) as SwatchId;
    const s = SWATCHES[id];
    const expected = scheme === "light" ? s.tint : blend(s.light, CORE_DARK.paper, 0.1);
    const bg = await band.evaluate((el) => getComputedStyle(el).backgroundColor);
    const got = (bg.match(/\d+/g) ?? []).slice(0, 3).map(Number);
    const want = hexToRgb(expected);
    // tokens.css carries the brief's rounded hexes: allow ±1 per channel.
    expect(
      Math.max(...got.map((v, i) => Math.abs(v - want[i]!))),
      `${id} ${scheme} ${bg}`,
    ).toBeLessThanOrEqual(1);
  }
});

test("archived direction: dated Archived note, no index, not in the main grid", async ({
  page,
}) => {
  const { archived } = await discover(page);
  test.skip(!archived.length, "no archived directions in this content");
  await open(page, `/research/${archived[0]}/`);
  await expect(page.locator(".dr-archived")).toContainText("Archived");
  // No index (and so no Fig. 1 pearl to morph from): a quiet pearl without a numeral.
  await expect(page.locator(".dr-band .f1-dp--hero")).toHaveCount(1);
  await expect(page.locator(".dr-band .f1-idx")).toHaveCount(0);
  await expect(page.locator(".dr-archived time")).toHaveCount(1);
  await expect(page.locator('.dr-band [aria-current="page"]')).toHaveText("Earlier research");
});

test("rail: nav-forward / nav-back transition types, focus lands on the h1", async ({ page }) => {
  const { live } = await discover(page);
  test.skip(live.length < 2, "needs two live directions");
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await open(page, `/research/${live[0]}/`);
  await recordTransitions(page);
  await page.locator(`.dr-rail a[href="/research/${live[1]}/"]`).click();
  await expect(page).toHaveURL(new RegExp(`/research/${live[1]}/$`));
  await expect(page.locator("main h1")).toBeFocused();
  // Back to the first direction: a lower index slides back.
  await page.locator(`.dr-rail a[href="/research/${live[0]}/"]`).click();
  await expect(page).toHaveURL(new RegExp(`/research/${live[0]}/$`));
  await expect(page.locator("main h1")).toBeFocused();
  const types = await recorded(page);
  const supported = await page.evaluate(() => "startViewTransition" in document);
  if (supported) {
    expect(types.some((t) => t.includes("nav-forward"))).toBe(true);
    expect(types.some((t) => t.includes("nav-back"))).toBe(true);
  }
  expect(errors.filter((e) => /ViewTransition|same name|duplicate/i.test(e))).toEqual([]);
});

test("pearl click from Fig. 1 lands focus on the direction h1 (pearl-open)", async ({ page }) => {
  await open(page, "/");
  const link = page
    .locator('main a[href^="/research/"][href$="/"]:not([href="/research/"])')
    .first();
  test.skip((await link.count()) === 0, "home figure not available on this server yet");
  const href = (await link.getAttribute("href"))!;
  await recordTransitions(page);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator("main h1")).toBeFocused();
  const vt = await page.evaluate(() => "startViewTransition" in document);
  if (vt) expect((await recorded(page)).some((t) => t.includes("pearl-open"))).toBe(true);
  // Reverse: "All directions" carries pearl-close.
  await recordTransitions(page);
  await page.locator(".dr-back").click();
  await page.waitForURL((u) => u.pathname === "/");
  await expect.poll(async () => (await recorded(page)).length).toBeGreaterThan(vt ? 0 : -1);
  if (vt) expect((await recorded(page)).some((t) => t.includes("pearl-close"))).toBe(true);
});

test("forced colours: direction page and index have zero axe violations", async ({ page }) => {
  const { live } = await discover(page);
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  const problems: string[] = [];
  for (const r of ["/research/", `/research/${live[0]}/`]) {
    await open(page, r);
    const name = r === "/research/" ? "research-index" : `research-${live[0]}`;
    await page.screenshot({ path: `${SHOTS}/${name}-forced-colors.png`, fullPage: true });
    for (const v of await axe(page)) problems.push(`${r}: ${v}`);
  }
  expect(problems).toEqual([]);
});

test("hero re-bloom (bloomOnMount) is motion-gated", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const ctx = await browser.newContext({ reducedMotion });
    const page = await ctx.newPage();
    const { live } = await discover(page);
    await page.goto(`/research/${live[0]}/`);
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => (a.effect as KeyframeEffect | null)?.target?.closest?.(".f1-dp--hero"))
          .filter((a) => Number(a.effect?.getComputedTiming().duration ?? 0) > 0).length,
    );
    if (reducedMotion === "reduce") expect(running).toBe(0);
    else expect(running).toBeGreaterThan(0);
    await ctx.close();
  }
});

test("no-JS: direction page and index render fully", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  const { live } = await discover(page);
  await open(page, `/research/${live[0]}/`);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator(".dr-status")).toBeVisible();
  if (live.length > 1) await expect(page.locator(".dr-rail a")).toHaveCount(live.length - 1);
  await ctx.close();
});

test("placeholder and unknown slugs are not pages", async ({ page }) => {
  for (const p of ["/research/_none/", "/research/not-a-direction/"]) {
    const res = await page.goto(p);
    // The static export has no such page (404). `next dev` with output: "export"
    // sometimes answers 500 "missing param in generateStaticParams()" instead
    // (MEASURED 2026-10-20); either way it is never a 200 page.
    const status = res?.status() ?? 0;
    expect(status, p).toBeGreaterThanOrEqual(400);
    expect(status === 404 || status === 500, `${p} → ${status}`).toBe(true);
  }
});

test("wide screens: the hero text starts on the section-body vertical; rail tiles share a row", async ({
  page,
}) => {
  const { live, archived } = await discover(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  for (const slug of [live[0]!, ...archived]) {
    await open(page, `/research/${slug}/`);
    const x = (sel: string) =>
      page
        .locator(sel)
        .first()
        .evaluate((el) => Math.round(el.getBoundingClientRect().left));
    expect(
      Math.abs((await x(".dr-title")) - (await x(".dr-section__body"))),
      slug,
    ).toBeLessThanOrEqual(1);
    // "All directions" ends on the container's right edge (same as the section rules).
    const right = (sel: string) =>
      page
        .locator(sel)
        .first()
        .evaluate((el) => Math.round(el.getBoundingClientRect().right));
    expect(
      Math.abs((await right(".dr-back")) - (await right(".dr-section"))),
      slug,
    ).toBeLessThanOrEqual(1);
    const tops = await page
      .locator(".dr-rail__list > li")
      .evaluateAll((lis) => [
        ...new Set(lis.map((li) => Math.round(li.getBoundingClientRect().top))),
      ]);
    expect(tops.length, `${slug} rail rows`).toBeLessThanOrEqual(1);
  }
});

test("no horizontal scroll at 320 px", async ({ page }) => {
  const { live, archived } = await discover(page);
  await page.setViewportSize({ width: 320, height: 640 });
  for (const r of ["/research/", ...[...live, ...archived].map((s) => `/research/${s}/`)]) {
    await open(page, r);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, r).toBeLessThanOrEqual(0);
  }
});
