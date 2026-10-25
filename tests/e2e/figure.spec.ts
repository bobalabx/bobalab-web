/**
 * Fig. 1 "Lines" behaviour (DECISIONS D-13; prototype p3/fig.js; JUDGE refinements
 * 3–5 and 12): DOM contract, lanes vs strips, packed columns, linked highlighting
 * (lede ↔ lane ↔ dot ↔ ledger row; other lines dim to 0.3, pearls never dim),
 * the fixed-height live caption, keyboard and Esc, the finite arrival, reduced
 * motion, the pearl morph and focus on the destination h1. The in-figure Pause
 * button and the 01–0N numerals are gone (D-13 item 6, RC-7).
 * Runs against BASE_URL (shared dev server).
 */
import { expect, test, type Page } from "@playwright/test";

const skipIntro = async (page: Page) =>
  page.context().addInitScript(() => {
    try {
      sessionStorage.setItem("bobalab-intro", "1");
    } catch {}
  });

const items = (page: Page) => page.locator(".f1-item");
const plate = (page: Page) => page.locator(".f1-plate");
const hydrated = (page: Page) => page.waitForSelector(".f1-plate[data-live]");
/** The live caption layer in the slot, if any (the caption layer itself never hides). */
const liveCap = (page: Page) =>
  page.locator('.f1-cap-layer:not([hidden]):not([data-cap="legend"])');
const mode = (page: Page) =>
  plate(page).evaluate((el) => getComputedStyle(el).getPropertyValue("--f1-mode").trim());
const opacity = (page: Page, sel: string) =>
  page.locator(sel).evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));

/**
 * The key that moves focus through links in this browser, probed on a blank
 * page: "Tab" (Chromium), "Alt+Tab" (WebKit on macOS), or null when neither
 * reaches a link (Playwright's WebKit on Windows; verify request ci-docs-1).
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

test("DOM contract: one labelled nav of real links with counts, one pearl per lane, no Pause, no numerals", async ({
  page,
}) => {
  await skipIntro(page);
  await page.goto("/");
  const fig = page.locator("figure.f1-plate");
  await expect(fig).toHaveCount(1);
  await expect(fig.locator("figcaption")).toContainText("Figure 1.");
  const nav = fig.locator('nav[aria-label="Research directions"]');
  await expect(nav).toHaveCount(1);
  await expect(nav.locator('ol[role="list"]')).toHaveCount(1);
  const n = await items(page).count();
  expect(n).toBeGreaterThanOrEqual(2);
  expect(n).toBeLessThanOrEqual(8);
  await expect(fig).toHaveAttribute("data-n", String(n));
  for (let i = 0; i < n; i++) {
    const li = items(page).nth(i);
    const a = li.locator("a.f1-link");
    await expect(a).toHaveAttribute("href", /^\/research\/[a-z0-9-]+\/$/);
    // Name = label + count (the count stays inside the link, JUDGE item 3).
    await expect(a).toHaveAccessibleName(/\S.* \d+ papers?$/);
    const count = Number((await a.locator(".f1-count").innerText()).match(/\d+/)![0]);
    // One dot per counted paper with a year; never more dots than the count says.
    const dots = await li.locator(".f1-dot").count();
    expect(dots).toBeLessThanOrEqual(count);
    if (dots < count)
      test.info().annotations.push({
        type: "figure",
        description: `${count - dots} paper(s) without a year`,
      });
    // The marks are decorative; one pearl per lane (the morph source).
    await expect(li.locator(".f1-track")).toHaveAttribute("aria-hidden", "true");
    await expect(li.locator(".f1-pearl")).toHaveCount(1);
  }
  await expect(fig.locator(".f1-idx, .f1-pause, .f1-halo, .f1-seed")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /pause|play/i })).toHaveCount(0);
  // The caption announces nothing.
  await expect(fig.locator(".f1-cap")).toHaveAttribute("aria-live", "off");
  // Exactly one element per pearl-{slug} view-transition name, also mid-render.
  await hydrated(page);
  const names = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("*")]
      .map((el) => getComputedStyle(el).viewTransitionName)
      .filter((v) => v && v !== "none" && v.startsWith("pearl-")),
  );
  expect(new Set(names).size).toBe(names.length);
});

test("lanes from 48rem (links drawn at 1366, packed with twin rings at 768); strips below", async ({
  page,
}) => {
  await skipIntro(page);
  await page.goto("/");
  expect(await mode(page)).toBe("fig");
  const segs = page.locator(".f1-seg");
  const shared = await segs.count();
  if (shared) await expect(segs.first()).toBeVisible();
  // Lanes keep one shared geometry: every pearl sits on the same "now" x.
  const xs = await page
    .locator(".f1-pearl")
    .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(new Set(xs).size).toBe(1);
  const dot = page.locator(".f1-dot").first();
  expect((await dot.boundingBox())!.width).toBeCloseTo(14, 0);

  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await mode(page)).toBe("fig");
  expect((await dot.boundingBox())!.width).toBeCloseTo(10, 0);
  if (shared) {
    await expect(segs.first()).toBeHidden();
    const tw = await page
      .locator(".f1-dot.is-tw")
      .first()
      .evaluate((e) => getComputedStyle(e).outlineStyle);
    expect(tw).toBe("solid");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await mode(page)).toBe("list");
  await expect(page.locator(".f1-axis")).toBeHidden();
  await expect(page.locator(".f1-y").first()).toBeVisible();
  await expect(page.locator(".f1-shares").first()).toBeVisible();
  const p = (await page.locator(".f1-pearl").first().boundingBox())!;
  expect(Math.round(p.width)).toBe(24);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("keyboard: Tab order follows the lanes; focus lights a lane, other lines dim, pearls never dim; Esc resets", async ({
  page,
}) => {
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
  for (let k = 0; tabKey && k < 60; k++) {
    await page.keyboard.press(tabKey);
    if (await first.evaluate((el) => el === document.activeElement)) break;
  }
  const height = (await page.locator(".f1-caption").boundingBox())!.height;
  for (let i = 0; i < n; i++) {
    const li = items(page).nth(i);
    if (!tabKey) await li.locator("a").focus();
    await expect(li.locator("a")).toBeFocused();
    const slug = (await li.getAttribute("data-slug"))!;
    await expect(li).toHaveClass(/is-on/);
    await expect(plate(page)).toHaveAttribute("data-active", slug);
    await expect(liveCap(page)).toHaveAttribute("data-cap", `d:${slug}`);
    // Its own line is lit; every other lane's line is dimmed to 0.3.
    await expect(li.locator(".f1-ln")).not.toHaveClass(/dim/);
    await page.waitForTimeout(260);
    const others = await page
      .locator(`.f1-item:not([data-slug="${slug}"]) .f1-ln`)
      .evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
    for (const o of others) expect(o).toBe("0.3");
    expect(new Set(await opacity(page, ".f1-pearl"))).toEqual(new Set(["1"]));
    // The live caption swaps in the same fixed-height slot.
    expect(
      Math.abs((await page.locator(".f1-caption").boundingBox())!.height - height),
    ).toBeLessThan(1);
    // A visible focus ring around the whole lane label (§G1 2.4.7).
    const ring = await li
      .locator(".f1-name")
      .evaluate(
        (el) => `${getComputedStyle(el).outlineStyle} ${getComputedStyle(el).outlineWidth}`,
      );
    expect(ring).toBe("solid 2px");
    if (tabKey && i < n - 1) await page.keyboard.press(tabKey);
  }
  await page.keyboard.press("Escape");
  await expect(liveCap(page)).toHaveCount(0);
  await expect(plate(page)).not.toHaveAttribute("data-active", /.+/);
  await expect(page.locator(".f1-plate .dim")).toHaveCount(0);
});

test("linked highlighting: a dot names its paper and lights its ledger row; a row lights its dots; a lede word lights its lane", async ({
  page,
}) => {
  await skipIntro(page);
  await page.goto("/");
  await hydrated(page);
  // A dot.
  const dot = page.locator(".f1-dot").last();
  const s = (await dot.getAttribute("data-s"))!;
  await dot.hover();
  await expect(liveCap(page)).toHaveAttribute("data-cap", `p:${s}`);
  await expect(page.locator(`.f1-dot[data-s="${s}"]`).first()).toHaveClass(/big/);
  const row = page.locator(`[data-f1-row="${s}"]`);
  if (await row.count()) await expect(row).toHaveClass(/is-hl/);
  const other = page.locator(`.f1-dot:not([data-s="${s}"])`).first();
  await expect(other).toHaveClass(/dim/);
  // A dimmed dot is a pale, opaque disc: a lit line never shows through it.
  await expect(other).toHaveCSS("opacity", "1");
  await page.mouse.move(2, 2);
  await expect(liveCap(page)).toHaveCount(0);

  // A ledger row.
  const r = page.locator("[data-f1-row]").first();
  const rs = (await r.getAttribute("data-f1-row"))!;
  await r.hover();
  if (await page.locator(`.f1-dot[data-s="${rs}"]`).count()) {
    await expect(page.locator(`.f1-dot[data-s="${rs}"]`).first()).toHaveClass(/big/);
    await expect(r).toHaveClass(/is-hl/);
  }
  await page.mouse.move(2, 2);

  // A lede direction word.
  const word = page.locator(".hm-dl[data-dir]").nth(1);
  const d = (await word.getAttribute("data-dir"))!;
  await word.hover();
  await expect(page.locator(`.f1-item[data-slug="${d}"]`)).toHaveClass(/is-on/);
  await expect(word).toHaveClass(/is-on/);
  await expect(liveCap(page)).toHaveAttribute("data-cap", `d:${d}`);
  await page.mouse.move(2, 2);
  await expect(page.locator(".f1-plate .dim")).toHaveCount(0);
});

test("a pearl is a pointer target for its lane: hover lights it, click opens the direction", async ({
  page,
}) => {
  await skipIntro(page);
  await page.goto("/");
  await hydrated(page);
  const li = items(page).nth(1);
  const slug = (await li.getAttribute("data-slug"))!;
  await li.locator(".f1-pearl").hover();
  await expect(li).toHaveClass(/is-on/);
  await li.locator(".f1-pearl").click();
  await page.waitForURL(`**/research/${slug}/`);
});

test("intro: papers arrive once per session, finitely, within 2 s; reduced motion: nothing runs", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForSelector(".f1-dot");
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-intro"))).toBe(true);
  const t = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => (a.effect as KeyframeEffect | null)?.target instanceof Element)
      .filter((a) => ((a.effect as KeyframeEffect).target as Element).closest(".f1-plate"))
      .map((a) => a.effect!.getComputedTiming()),
  );
  expect(t.length).toBeGreaterThan(0);
  for (const x of t) {
    expect(x.iterations).not.toBe(Infinity);
    expect(Number(x.endTime)).toBeLessThanOrEqual(2000);
  }
  await page.waitForTimeout(2300);
  await page.goto("/");
  await page.waitForSelector(".f1-dot");
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-intro"))).toBe(
    false,
  );
  expect(
    await page.evaluate(
      () =>
        document.getAnimations().filter((a) => {
          const el = (a.effect as KeyframeEffect | null)?.target;
          return el instanceof Element && el.closest(".f1-plate");
        }).length,
    ),
  ).toBe(0);
  await ctx.close();

  const rm = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "reduce",
  });
  const p2 = await rm.newPage();
  await p2.goto("/"); // first visit: the intro would play without the gate
  await p2.waitForSelector(".f1-plate");
  await p2.waitForTimeout(300);
  const running = await p2.evaluate(
    () =>
      document.getAnimations().filter((a) => {
        const el = (a.effect as KeyframeEffect | null)?.target;
        return el instanceof Element && el.closest(".f1-plate");
      }).length,
  );
  expect(running).toBe(0);
  await rm.close();
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

test("Enter opens the direction, the pearl morph group exists, focus lands on h1", async ({
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

test("forced colours: dots, lines and pearls take system colours; lanes keep their labels", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    forcedColors: "active",
  });
  const page = await ctx.newPage();
  await skipIntro(page);
  await page.goto("/");
  const c = await page.evaluate(() => {
    const cs = (s: string) => getComputedStyle(document.querySelector(s)!);
    return {
      text: getComputedStyle(document.body).color,
      dot: cs(".f1-dot").backgroundColor,
      pearl: cs(".f1-pearl").backgroundColor,
      line: cs(".f1-ln").borderTopColor,
    };
  });
  expect(c.dot).toBe(c.text);
  expect(c.pearl).toBe(c.text);
  expect(c.line).toBe(c.text);
  await expect(items(page).first().locator(".f1-label")).toBeVisible();
  // Every label is LinkText, so the lit lane is underlined instead of recoloured.
  await hydrated(page);
  await items(page).nth(1).locator("a").focus();
  await expect(items(page).nth(1)).toHaveClass(/is-on/);
  expect(
    await items(page)
      .nth(1)
      .locator(".f1-label")
      .evaluate((e) => getComputedStyle(e).textDecorationLine),
  ).toBe("underline");
  await ctx.close();
});

test("draft marking: when every direction is a draft, one summary badge, none per lane (VIS-03)", async ({
  page,
}) => {
  await skipIntro(page);
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const n = Number(await plate(page).getAttribute("data-n"));
    const drafts = await page.locator(".f1-foot-draft").count();
    test.skip(!drafts, "no draft directions in this build");
    const summary = (await page.locator(".f1-foot-draft").innerText()).trim();
    if (summary.includes(`all ${n} directions`) || summary.includes("this direction")) {
      await expect(page.locator(".f1-item .bl-badge")).toHaveCount(0);
    }
    await expect(page.locator(".f1-foot-draft .bl-badge--draft")).toBeVisible();
  }
});
