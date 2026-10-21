/**
 * WP8: reduced motion, the "Reduce motion" toggle, pause control and forced
 * colours, site-wide (brief §E7, §E10 #4–5, §G1; DECISIONS D-02).
 *
 *   - prefers-reduced-motion: reduce → after load, after hovering/focusing
 *     links and during a pearl click: nothing loops, nothing moves (no
 *     transform/position/size animation of any duration; E7 "no lift or
 *     scale"), and view transitions are at most a 120 ms cross-fade (E10 #5).
 *     Opacity/colour changes on hover are not motion and are allowed;
 *   - the footer toggle (localStorage "bobalab-motion" = "reduce", applied
 *     pre-paint as <html data-motion="reduce">) does the same with the OS set
 *     to no-preference;
 *   - with no preference, anything that loops can be paused (WCAG 2.2.2): if an
 *     infinite animation runs, a visible "Pause motion" button exists and
 *     pressing it stops every infinite animation;
 *   - forced colours: zero axe violations and a visible focus outline.
 * BASE_URL defaults to the shared dev server (http://localhost:3100).
 * Screenshots: test-results/WP8/forced-colors-*.png.
 */
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const ROUTES = ["/", "/research/", "/publications/", "/people/", "/news/", "/join/"];
const MAX_MS = 120;

test.describe.configure({ mode: "parallel" });

/** First direction page linked from /research/ (or null). */
async function firstDirection(request: APIRequestContext): Promise<string | null> {
  const res = await request.get("/research/", { timeout: 120_000 });
  if (!res.ok()) return null;
  const m = /href="(\/research\/[a-z0-9]+(?:-[a-z0-9]+)*\/)"/.exec(await res.text());
  return m ? m[1]! : null;
}

interface AnimInfo {
  kind: string;
  name: string;
  target: string;
  /** Animated CSS properties (from the keyframes). */
  props: string[];
  duration: number;
  iterations: number;
  playState: string;
}

/** Properties whose animation is movement (WCAG 2.3.3 "motion animation"). */
const MOTION =
  /^(transform|translate|rotate|scale|offset|inset|top|left|right|bottom|margin|padding|width|height|min-|max-|cx|cy|r$|x$|y$|d$|perspective|background-position|object-position|clip-path|letter-spacing|word-spacing)/i;

/** Every animation and transition that is running or about to run. */
async function animations(page: Page): Promise<AnimInfo[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState !== "finished" && a.playState !== "idle")
      .map((a) => {
        const effect = a.effect as KeyframeEffect | null;
        const t = effect?.getComputedTiming();
        const target = effect?.target as Element | null;
        const skip = new Set(["offset", "computedOffset", "easing", "composite"]);
        const props = [
          ...new Set(
            (effect?.getKeyframes() ?? []).flatMap((k) =>
              Object.keys(k).filter((p) => !skip.has(p)),
            ),
          ),
        ];
        const cls = String(target?.getAttribute("class") ?? "")
          .split(/\s+/)
          .slice(0, 2)
          .join(".");
        return {
          kind: a.constructor.name,
          name:
            (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? a.id,
          target: target
            ? `${target.tagName.toLowerCase()}${effect?.pseudoElement ?? ""}.${cls}`
            : "(document)",
          props,
          duration: Number(t?.duration ?? 0),
          iterations: Number(t?.iterations ?? 1),
          playState: a.playState,
        };
      }),
  );
}

/**
 * Reduced-motion rule (brief §E7, E10 #5): nothing loops, nothing MOVES
 * (transform, position or size animations of any duration), and view
 * transitions are at most a 120 ms cross-fade. Opacity and colour changes on
 * hover/focus are not motion and are allowed.
 */
async function motionViolations(page: Page): Promise<string[]> {
  return (await animations(page)).flatMap((a) => {
    const why: string[] = [];
    if (a.iterations === Infinity) why.push("loops");
    const moving = a.props.filter((p) =>
      MOTION.test(p.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)),
    );
    if (moving.length && a.duration > 0) why.push(`moves (${moving.join(", ")})`);
    if (a.target.includes("::view-transition") && a.duration > MAX_MS)
      why.push(`view transition ${a.duration} ms`);
    return why.length ? [`${why.join("; ")}: ${JSON.stringify(a)}`] : [];
  });
}

/** Infinite animations currently running. */
async function loops(page: Page): Promise<AnimInfo[]> {
  return (await animations(page)).filter(
    (a) => a.iterations === Infinity && a.playState === "running",
  );
}

/** Hover and focus the first few links in main to trigger hover/focus motion. */
async function poke(page: Page) {
  const links = page.locator("main a[href]");
  const n = Math.min(await links.count(), 4);
  for (let i = 0; i < n; i++) {
    const l = links.nth(i);
    if (!(await l.isVisible())) continue;
    await l.hover({ timeout: 5000 }).catch(() => undefined);
    await l.focus().catch(() => undefined);
  }
}

async function routesWithDirection(request: APIRequestContext) {
  const d = await firstDirection(request);
  return d ? [...ROUTES, d] : ROUTES;
}

test.describe("prefers-reduced-motion: reduce", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("nothing loops or moves; view transitions ≤ 120 ms", async ({ page, request }) => {
    test.setTimeout(5 * 60_000);
    const problems: string[] = [];
    for (const path of await routesWithDirection(request)) {
      // Fresh session each time so the home intro would run if it were not gated.
      await page.evaluate(() => sessionStorage.clear()).catch(() => undefined);
      const res = await page.goto(path);
      if (res?.status() === 404) continue;
      await page.waitForLoadState("load");
      for (const v of await motionViolations(page)) problems.push(`${path} on load: ${v}`);
      await poke(page);
      for (const v of await motionViolations(page)) problems.push(`${path} on hover/focus: ${v}`);
    }
    // A pearl click (client navigation with a view transition) from home.
    await page.goto("/");
    const pearl = page.getByRole("navigation", { name: "Research directions" }).getByRole("link");
    if (await pearl.count()) {
      const seen: string[] = [];
      const sampler = (async () => {
        for (let i = 0; i < 20; i++) {
          seen.push(...(await motionViolations(page).catch(() => [])));
          await page.waitForTimeout(25);
        }
      })();
      await pearl.first().click();
      await sampler;
      problems.push(...new Set(seen.map((v) => `pearl click: ${v}`)));
    }
    expect(problems).toEqual([]);
  });

  test("home: no animation longer than 0 ms on the pearl groups (E10 #5)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    const running = await page.locator(".pearl-group, .f1-group").evaluateAll((els) =>
      els
        .flatMap((e) => e.getAnimations())
        .map((a) => Number(a.effect?.getComputedTiming().duration ?? 0))
        .filter((d) => d > 0),
    );
    expect(running).toEqual([]);
  });
});

test.describe("Reduce motion toggle (no OS preference)", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("stored choice applies pre-paint; nothing loops or moves", async ({ page, request }) => {
    test.setTimeout(5 * 60_000);
    await page.addInitScript(() => {
      try {
        localStorage.setItem("bobalab-motion", "reduce");
      } catch {
        /* storage blocked */
      }
    });
    const problems: string[] = [];
    for (const path of await routesWithDirection(request)) {
      const res = await page.goto(path);
      if (res?.status() === 404) continue;
      expect(await page.evaluate(() => document.documentElement.dataset.motion)).toBe("reduce");
      await page.waitForLoadState("load");
      await page.waitForTimeout(150);
      for (const v of await motionViolations(page)) problems.push(`${path}: ${v}`);
      await poke(page);
      for (const v of await motionViolations(page)) problems.push(`${path} hover/focus: ${v}`);
    }
    expect(problems).toEqual([]);
  });

  test("the footer switch is on every page, in the same place", async ({ page }) => {
    for (const path of ROUTES) {
      const res = await page.goto(path);
      if (res?.status() === 404) continue;
      await expect(
        page.getByRole("contentinfo").getByRole("switch", { name: /Reduce motion/ }),
        path,
      ).toHaveCount(1);
    }
  });

  test("anything that loops can be paused (WCAG 2.2.2)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500); // after the intro hand-off
    const looping = await loops(page);
    test.skip(!looping.length, "nothing loops on home");
    const pause = page.getByRole("button", { name: /pause motion/i });
    await expect(pause, "a Pause motion control exists").toBeVisible();
    await pause.click();
    await page.waitForTimeout(200);
    expect(await loops(page), "infinite animations still running after Pause").toEqual([]);
    await page.evaluate(() => localStorage.removeItem("bobalab-motion"));
  });
});

test.describe("forced colours", () => {
  test.use({ contextOptions: { forcedColors: "active" } });

  test("zero axe violations and a visible keyboard focus outline", async ({ page, request }) => {
    test.setTimeout(5 * 60_000);
    // WebKit has no forced-colors mode: without this guard the test would pass
    // there without testing anything.
    await page.goto("/");
    test.skip(
      !(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)),
      "this browser does not emulate forced colours",
    );
    const violations: string[] = [];
    for (const path of await routesWithDirection(request)) {
      const res = await page.goto(path);
      if (res?.status() === 404) continue;
      await page.waitForLoadState("load");
      await page.waitForTimeout(300);
      const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      for (const v of r.violations) {
        violations.push(`${path}: ${v.id} ×${v.nodes.length} ${v.nodes[0]?.target.join(" ")}`);
      }
      // Skip link, then the first header link: both must show an outline.
      for (let i = 0; i < 2; i++) {
        await page.keyboard.press("Tab");
        const ring = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return "no focus";
          const s = getComputedStyle(el);
          return s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) >= 1
            ? "ok"
            : `${el.tagName} outline ${s.outlineStyle} ${s.outlineWidth}`;
        });
        if (ring !== "ok") violations.push(`${path}: focus ring after Tab ${i + 1}: ${ring}`);
      }
      if (path === "/" || path === "/research/") {
        const name = path === "/" ? "home" : "research";
        await page.screenshot({
          path: `test-results/WP8/forced-colors-${name}.png`,
          fullPage: true,
        });
      }
    }
    expect(violations).toEqual([]);
  });
});
