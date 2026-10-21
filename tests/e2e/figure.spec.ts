/**
 * Fig. 1 behaviour (brief §E1, §E3–§E7, §E10; DECISIONS D-02/D-02a):
 * DOM contract, keyboard order, live caption, Esc, hover intent, Pause/Play,
 * reduced motion, intro once per session, morph pseudo-element, focus on the
 * destination h1. Runs against BASE_URL (shared dev server).
 */
import { expect, test, type Page } from "@playwright/test";

const skipIntro = async (page: Page) =>
  page.context().addInitScript(() => {
    try {
      sessionStorage.setItem("bobalab-intro", "1");
    } catch {}
  });

const items = (page: Page) => page.locator(".f1-item");
const capOn = (page: Page) => page.locator(".f1-cap-layer.is-on");
const hydrated = (page: Page) => page.waitForSelector(".f1-plate[data-live]");

/**
 * The key that moves focus through links in this browser, probed on a blank
 * page: "Tab" (Chromium), "Alt+Tab" (WebKit on macOS), or
 * null when neither reaches a link: Playwright's WebKit on Windows (MEASURED
 * 2026-10-20, Playwright 1.64) only Tab-focuses buttons (verify request ci-docs-1).
 */
async function linkTabKey(page: Page): Promise<string | null> {
  const probe = await page.context().newPage();
  try {
    await probe.setContent('<button>b</button><a href="#x">a</a>');
    for (const key of ["Tab", "Alt+Tab"]) {
      await probe.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      for (let i = 0; i < 2; i++) {
        await probe.keyboard.press(key);
        if (await probe.evaluate(() => document.activeElement?.tagName === "A")) return key;
      }
    }
    return null;
  } finally {
    await probe.close();
  }
}

test.use({ viewport: { width: 1366, height: 768 } });

test("DOM contract: one labelled nav, one <ol role=list> of real links, unique VT names", async ({
  page,
}) => {
  await skipIntro(page);
  await page.goto("/");
  const fig = page.locator('figure[aria-label^="Fig. 1"]');
  await expect(fig).toHaveCount(1);
  const nav = fig.locator('nav[aria-label="Research directions"]');
  await expect(nav).toHaveCount(1);
  await expect(nav.locator('ol[role="list"]')).toHaveCount(1);
  const n = await items(page).count();
  expect(n).toBeGreaterThanOrEqual(2);
  expect(n).toBeLessThanOrEqual(8);
  await expect(fig).toHaveAttribute("data-n", String(n));
  for (let i = 0; i < n; i++) {
    const a = items(page).nth(i).locator("a");
    const href = await a.getAttribute("href");
    expect(href).toMatch(/^\/research\/[a-z0-9-]+\/$/);
    // Name = label + count; numeral and arrow are hidden.
    await expect(a).toHaveAccessibleName(/\S.* \d+ papers?$/);
    await expect(items(page).nth(i).locator(".f1-idx")).toHaveText(String(i + 1).padStart(2, "0"));
  }
  await expect(fig.locator(".f1-group").first()).toHaveAttribute("aria-hidden", "true");
  // The caption announces nothing.
  await expect(fig.locator(".f1-cap")).toHaveAttribute("aria-live", "off");
  // Exactly one element per pearl-{slug} name on the page.
  await hydrated(page);
  const names = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("*")]
      .map((el) => getComputedStyle(el).viewTransitionName)
      .filter((v) => v && v !== "none" && v.startsWith("pearl-")),
  );
  expect(new Set(names).size).toBe(names.length);
});

test("figure mode at 1366 and list mode below 46em", async ({ page }) => {
  await skipIntro(page);
  await page.goto("/");
  const mode = () =>
    page
      .locator(".f1-plate")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--f1-mode").trim());
  expect(await mode()).toBe("fig");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await mode()).toBe("list");
  await expect(page.locator(".f1-pause")).toBeHidden();
});

test("keyboard: Tab order 01→0N, focus updates the caption, Esc resets", async ({ page }) => {
  await skipIntro(page);
  await page.goto("/");
  await hydrated(page);
  const tabKey = await linkTabKey(page);
  if (!tabKey) {
    test.info().annotations.push({
      type: "keyboard",
      description:
        "Tab does not reach links in this browser (Playwright WebKit on Windows): each figure link is focused by script; the Tab order itself is checked in Chromium",
    });
  }
  const n = await items(page).count();
  const first = items(page).first().locator("a");
  // Tab until the first figure link is focused.
  for (let k = 0; tabKey && k < 40; k++) {
    await page.keyboard.press(tabKey);
    if (await first.evaluate((el) => el === document.activeElement)) break;
  }
  for (let i = 0; i < n; i++) {
    const li = items(page).nth(i);
    if (!tabKey) await li.locator("a").focus();
    await expect(li.locator("a")).toBeFocused();
    const slug = await li.getAttribute("data-slug");
    await expect(li).toHaveClass(/is-on/);
    await expect(capOn(page)).toHaveAttribute("data-cap", slug!);
    // A visible 2 px focus ring on the pearl, also with motion on (§G1 2.4.7).
    const ring = await li.locator(".f1-pearl").evaluate((el) => {
      const cs = getComputedStyle(el);
      return `${cs.outlineStyle} ${cs.outlineWidth}`;
    });
    expect(ring).toBe("solid 2px");
    if (tabKey && i < n - 1) await page.keyboard.press(tabKey);
  }
  await page.keyboard.press("Escape");
  await expect(capOn(page)).toHaveAttribute("data-cap", "legend");
  await expect(page.locator(".f1-plate")).not.toHaveAttribute("data-active", "");
});

test("hover: 80 ms intent, caption swap, revert 300 ms after leave", async ({ page }) => {
  await skipIntro(page);
  await page.goto("/");
  await hydrated(page);
  const li = items(page).nth(1);
  const box = (await li.locator(".f1-pearl").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
  await expect(capOn(page)).toHaveAttribute("data-cap", (await li.getAttribute("data-slug"))!);
  await page.mouse.move(2, 2);
  await expect(capOn(page)).toHaveAttribute("data-cap", "legend", { timeout: 2000 });
});

test("Pause/Play writes the shared motion preference and stops the float", async ({ page }) => {
  await skipIntro(page);
  await page.goto("/");
  await hydrated(page);
  const btn = page.locator(".f1-pause");
  await expect(btn).toHaveText(/Pause motion/);
  const floating = () =>
    page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (a) =>
              a.playState === "running" &&
              (a.effect as KeyframeEffect | null)?.target instanceof Element &&
              ((a.effect as KeyframeEffect).target as Element).classList.contains("f1-group"),
          ).length,
    );
  expect(await floating()).toBeGreaterThan(0);
  await btn.click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  expect(await page.evaluate(() => localStorage.getItem("bobalab-motion"))).toBe("reduce");
  await expect(btn).toHaveText(/Play motion/);
  expect(await floating()).toBe(0);
  // The footer toggle reflects the same preference.
  const sw = page.getByRole("switch", { name: /Reduce motion/ });
  if (await sw.count()) await expect(sw).toHaveAttribute("aria-checked", "true");
  await btn.click();
  await expect(page.locator("html")).not.toHaveAttribute("data-motion", "reduce");
  expect(await page.evaluate(() => localStorage.getItem("bobalab-motion"))).toBeNull();
});

test("reduced motion: no figure animation runs, outline marks the active pearl", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto("/"); // first visit: intro would play without the gate
  await page.waitForSelector(".f1-plate");
  await page.waitForTimeout(300);
  const running = await page.evaluate(
    () =>
      document.getAnimations().filter((a) => {
        const t = (a.effect as KeyframeEffect | null)?.target;
        return t instanceof Element && t.closest(".f1-plate");
      }).length,
  );
  expect(running).toBe(0);
  await expect(page.locator(".f1-pause")).toBeHidden();
  await items(page).nth(0).locator("a").focus();
  const outline = await items(page)
    .nth(0)
    .locator(".f1-pearl")
    .evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe("solid");
  await ctx.close();
});

test("intro plays on the first home view of a session only", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForSelector(".f1-plate");
  const first = await page.evaluate(
    () =>
      document.documentElement.hasAttribute("data-intro") ||
      document.querySelector(".f1-plate")!.hasAttribute("data-intro"),
  );
  expect(first).toBe(true);
  await page.waitForTimeout(2300);
  await expect(page.locator(".f1-plate")).not.toHaveAttribute("data-intro", "");
  await page.goto("/");
  await page.waitForSelector(".f1-plate");
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-intro"))).toBe(
    false,
  );
  await expect(page.locator(".f1-plate")).not.toHaveAttribute("data-intro", "");
  await ctx.close();
});

/** Records "pseudo-element|duration+delay" for every view-transition animation. */
const recordViewTransitions = () => {
  const w = window as unknown as { __vt: string[] };
  w.__vt = [];
  const start = document.startViewTransition?.bind(document);
  if (!start) return;
  document.startViewTransition = ((arg: never) => {
    const t = start(arg);
    t.ready
      .then(() => {
        for (const a of document.getAnimations()) {
          const fx = a.effect as KeyframeEffect | null;
          if (!fx?.pseudoElement) continue;
          const tm = fx.getTiming();
          w.__vt.push(`${fx.pseudoElement}|${Number(tm.duration) + Number(tm.delay ?? 0)}`);
        }
      })
      .catch(() => {});
    return t;
  }) as typeof document.startViewTransition;
};
const vtLog = (page: Page) => page.evaluate(() => (window as unknown as { __vt: string[] }).__vt);

test("Enter opens the direction, the morph pseudo-element exists, focus lands on h1", async ({
  page,
  browserName,
}) => {
  await skipIntro(page);
  await page.context().addInitScript(recordViewTransitions);
  await page.goto("/");
  await hydrated(page);
  const li = items(page).first();
  const slug = (await li.getAttribute("data-slug"))!;
  // Warm the destination so it renders in the same commit (dev compiles on demand).
  await page.evaluate(async (s) => {
    await fetch(`/research/${s}/`);
  }, slug);
  await page.waitForTimeout(1500);
  await li.locator("a").focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(`**/research/${slug}/`);
  await expect(page.locator("main h1")).toBeFocused({ timeout: 5000 });
  if (browserName === "chromium") {
    await expect
      .poll(async () => (await vtLog(page)).map((e) => e.split("|")[0]))
      .toContain(`::view-transition-group(pearl-${slug})`);
    // The other pearls (exit-only groups) leave with the page (150 ms), never
    // lingering over the destination for the 420 ms morph.
    const others = (await vtLog(page)).filter(
      (e) => e.startsWith("::view-transition-old(pearl-") && !e.includes(`(pearl-${slug})`),
    );
    expect(others.length).toBeGreaterThan(0);
    for (const e of others) expect(Number(e.split("|")[1]), e).toBeLessThanOrEqual(150);
  }
});

test("reduced motion: every view-transition animation is ≤ 120 ms (§E10.5)", async ({
  browser,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "view-transition timing is read in Chromium");
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "reduce",
  });
  await ctx.addInitScript(recordViewTransitions);
  const page = await ctx.newPage();
  await page.goto("/");
  await hydrated(page);
  const li = items(page).nth(1);
  const slug = (await li.getAttribute("data-slug"))!;
  await page.evaluate(async (s) => {
    await fetch(`/research/${s}/`);
  }, slug);
  await page.waitForTimeout(1500);
  await li.locator("a").focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(`**/research/${slug}/`);
  await expect.poll(async () => (await vtLog(page)).length).toBeGreaterThan(0);
  for (const e of await vtLog(page)) expect(Number(e.split("|")[1]), e).toBeLessThanOrEqual(120);
  await ctx.close();
});

test("inactive pearls stay opaque on a light plate; only glow, halo and seeds dim (VIS-10)", async ({
  browser,
}) => {
  for (const colorScheme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, colorScheme });
    const page = await ctx.newPage();
    await skipIntro(page);
    await page.goto("/");
    await hydrated(page);
    const on = items(page).nth(1);
    const box = (await on.locator(".f1-pearl").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
    await expect(on).toHaveClass(/is-on/);
    await page.waitForTimeout(400); // --dur-base fade
    const off = await items(page)
      .nth(0)
      .evaluate((li) => {
        const cs = (s: string) => getComputedStyle(li.querySelector(s)!);
        const pearl = li.querySelector(".f1-pearl")!;
        return {
          pearl: cs(".f1-pearl").opacity,
          glow: getComputedStyle(pearl, "::after").opacity,
          // §G2: only transform and opacity animate (no filter).
          transitions: cs(".f1-pearl").transitionProperty,
          halo: cs(".f1-halo").opacity,
          seeds: cs(".f1-seeds").opacity,
        };
      });
    expect(off.transitions).not.toMatch(/filter/);
    if (colorScheme === "light") {
      expect(off.pearl).toBe("1");
      expect(off.glow).toBe("0.3");
    } else {
      expect(off.pearl).toBe("0.78");
      expect(off.glow).toBe("1");
    }
    expect(off.halo).toBe("0.35");
    expect(off.seeds).toBe("0.45");
    await ctx.close();
  }
});

test("draft marking: when every direction is a draft, one summary badge, none per row (VIS-03)", async ({
  page,
}) => {
  await skipIntro(page);
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const n = Number(await page.locator(".f1-plate").getAttribute("data-n"));
    const drafts = await page.locator(".f1-foot-draft").count();
    test.skip(!drafts, "no draft directions in this build");
    const summary = (await page.locator(".f1-foot-draft").innerText()).trim();
    if (summary.includes(`all ${n} directions`) || summary.includes("this direction")) {
      await expect(page.locator(".f1-item .bl-badge")).toHaveCount(0);
      await expect(page.locator(".f1-cap-layer .bl-badge")).toHaveCount(0);
    }
    await expect(page.locator(".f1-foot-draft .bl-badge--draft")).toBeVisible();
  }
});
