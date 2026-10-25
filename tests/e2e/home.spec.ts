/**
 * Home page (DECISIONS D-14 "the boba cup"; docs/simplify/JUDGE.md R1–R18):
 *   - first screen: one h1, the who line, the why line, one primary + one secondary
 *     link, then the cup; every pearl and its label inside the first viewport at
 *     1440×900 and 390×844 (and the hint on phones);
 *   - the cup: real buttons after hydration; Enter / Space / click / tap open one
 *     pearl at a time (it rises, its panel shows, the wordmark O tints); Tab
 *     reaches "Explore"; Esc, picking it again or pressing outside sinks it and
 *     returns focus (Esc never pulls focus back from elsewhere); hover only lifts;
 *     "Explore" morphs the pearl (pearl-{slug});
 *   - phones: a tap on a link below the open panel follows that link (closing
 *     waits for the click), a scroll drag never closes, a pearl's edge is its own;
 *   - motion: settle once per session; nothing moves under reduced motion;
 *   - below the fold: new papers beside news, then people (round consented photos,
 *     first names, the team in one sentence);
 *   - the AI-tell probe, no horizontal scroll at 390/320, no-JS (an <ol> of links),
 *     zero off-origin requests, axe in light, dark, mobile, open and forced colours.
 * Runs against BASE_URL (default: the shared dev server).
 */
import {
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const CUP_KEY = "bobalab-cup-intro";

/** Next's dev overlay is not part of the site. */
const axe = (page: Page) => new AxeBuilder({ page }).withTags(TAGS).exclude("nextjs-portal");

const skipIntro = () => {
  try {
    sessionStorage.setItem("bobalab-cup-intro", "1");
    sessionStorage.setItem("bobalab-intro", "1");
  } catch {}
};

test.beforeEach(async ({ context }) => {
  await context.addInitScript(skipIntro);
});

/** Home, hydrated (labels are buttons). */
async function home(page: Page) {
  await page.goto("/");
  await page.locator(".cup-stage[data-js]").waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function ctxPage(browser: Browser, opts: BrowserContextOptions) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(skipIntro);
  return { ctx, page: await ctx.newPage() };
}

/**
 * The key that moves focus through links in this browser (as in figure.spec):
 * "Tab" (Chromium), "Alt+Tab" (WebKit on macOS), or null (Playwright's WebKit on
 * Windows, whose Tab visits buttons only).
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

const labels = (page: Page) => page.locator(".cup-lab");
const expanded = (page: Page) =>
  page.locator(".cup-lab").evaluateAll((els) => els.map((e) => e.getAttribute("aria-expanded")));
const pearlTop = (page: Page, i: number) =>
  page
    .locator(".cup-pearl")
    .nth(i)
    .evaluate((e) => e.getBoundingClientRect().top);

test("first screen: one h1, who, why, two links (one primary), then the cup; sections in order", async ({
  page,
}) => {
  await home(page);
  const h1 = page.locator("main h1");
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveAttribute("tabindex", "-1");
  await expect(page.locator(".hm-who")).toContainText(
    /is a research lab at .*Haas School of Business/,
  );
  await expect(page.locator(".hm-who")).toContainText(/led by Prof\.\s?Park Sinchaisri\./);
  expect((await page.locator(".hm-why").innerText()).split(/\s+/).length).toBeLessThanOrEqual(40);
  const links = page.locator(".hm-links a");
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveText("Explore the research");
  await expect(links.nth(0)).toHaveAttribute("href", "/research/");
  await expect(links.nth(1)).toHaveText("Read the papers");
  await expect(links.nth(1)).toHaveAttribute("href", "/publications/");
  const weights = await links.evaluateAll((els) =>
    els.map((e) => Number(getComputedStyle(e).fontWeight)),
  );
  expect(weights[0]).toBeGreaterThan(weights[1]!); // exactly one visually primary action

  // DOM order: hero (copy, cup), then findings?, papers, news, people. No Fig. 1 here.
  const order = await page.evaluate(() => {
    const all = [...document.querySelectorAll("main *")];
    return [".hm-h1", ".hm-links", ".cup", "#h-findings", "#h-pubs", "#h-news", "#h-people"].map(
      (s) => {
        const el = document.querySelector(s);
        return el ? all.indexOf(el) : -1;
      },
    );
  });
  const present = order.filter((i) => i >= 0);
  expect(present).toEqual([...present].sort((a, b) => a - b));
  await expect(page.locator(".f1-plate")).toHaveCount(0);
  const h2s = (await page.locator("main h2").allInnerTexts()).map((t) => t.trim());
  expect(h2s.filter((t) => ["New papers", "News", "People"].includes(t))).toEqual([
    "New papers",
    "News",
    "People",
  ]);
  // The h1 is the largest text, at least 2× the next level (REFS C5).
  const sizes = await page.evaluate(() => {
    const px = (s: string) => parseFloat(getComputedStyle(document.querySelector(s)!).fontSize);
    return { h1: px(".hm-h1"), who: px(".hm-who"), h2: px("main h2") };
  });
  expect(sizes.h1).toBeGreaterThanOrEqual(2 * Math.max(sizes.who, sizes.h2));
});

for (const vp of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 1366, height: 768 },
]) {
  test(`every pearl and its label are in the first viewport at ${vp.width}×${vp.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(vp);
    await home(page);
    const n = await page.locator(".cup-pearl").count();
    expect(n).toBeGreaterThan(0);
    const boxes = await page
      .locator(".cup-pearl, .cup-lab")
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
    for (const b of boxes) {
      expect(b.top).toBeGreaterThanOrEqual(0);
      expect(b.bottom).toBeLessThanOrEqual(vp.height);
      expect(b.right).toBeLessThanOrEqual(vp.width);
    }
    // The h1 and the links come first; on phones the hint is on the first screen too.
    const linksBottom = await page
      .locator(".hm-links")
      .evaluate((e) => e.getBoundingClientRect().bottom);
    expect(linksBottom).toBeLessThanOrEqual(vp.height);
    if (vp.width < 500) {
      const hint = await page.locator(".cup-hint").evaluate((e) => e.getBoundingClientRect());
      expect(hint.bottom).toBeLessThanOrEqual(vp.height);
      expect(hint.top).toBeGreaterThan(linksBottom); // order: links, cup, hint
    }
    // Pearl size (R4): about 56 px on desktop, about 36 px on phones; hit areas ≥ 48 px.
    const w = await page
      .locator(".cup-pearl")
      .first()
      .evaluate((e) => e.getBoundingClientRect().width);
    if (vp.width >= 1440) expect(w).toBeGreaterThanOrEqual(52);
    if (vp.width < 500) expect(w).toBeGreaterThanOrEqual(30);
    const hit = await page
      .locator(".cup-pearl")
      .first()
      .evaluate((e) => {
        const s = getComputedStyle(e, "::after");
        return Math.min(parseFloat(s.width), parseFloat(s.height));
      });
    expect(hit).toBeGreaterThanOrEqual(48);
  });
}

test("labels look clickable at rest: an underline in the direction colour; the hint is in body colour", async ({
  page,
}) => {
  await home(page);
  const t = await page
    .locator(".cup-lab-t")
    .first()
    .evaluate((e) => {
      const s = getComputedStyle(e);
      const dir = getComputedStyle(e.closest(".cup-item")!).getPropertyValue("--dir").trim();
      return { line: s.textDecorationLine, color: s.textDecorationColor, dir };
    });
  expect(t.line).toContain("underline");
  const hex = (rgb: string) =>
    "#" +
    rgb
      .match(/\d+/g)!
      .slice(0, 3)
      .map((v) => Number(v).toString(16).padStart(2, "0"))
      .join("");
  expect(hex(t.color)).toBe(t.dir.toLowerCase());
  await expect(page.locator(".cup-pick-m")).toHaveText("Pick a pearl");
  await expect(page.locator(".cup-pick")).toBeVisible();
  await expect(page.locator(".cup-map")).toHaveAttribute("href", "/research/#map");
  await expect(page.locator(".cup-map")).toHaveText(/^See how the \w+ directions connect$/);
});

test("keyboard: Enter opens, Tab reaches Explore, Space switches, Esc sinks and returns focus", async ({
  page,
}) => {
  const tabKey = await linkTabKey(page);
  await home(page);
  const lab = labels(page);
  const n = await lab.count();
  // Tab from the h1 reaches the first label (after the two hero links).
  await page.locator("main h1").focus();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    if (await lab.first().evaluate((e) => e === document.activeElement)) break;
  }
  await expect(lab.first()).toBeFocused();
  expect(await lab.first().evaluate((e) => e.tagName)).toBe("BUTTON");
  const rest = await pearlTop(page, 0);

  await page.keyboard.press("Enter");
  await expect(lab.first()).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator(`#${await lab.first().getAttribute("aria-controls")}`);
  await expect(panel).toBeVisible();
  await expect.poll(() => pearlTop(page, 0)).toBeLessThan(rest - 40); // it rose
  await expect(page.locator("html")).toHaveAttribute("data-cup-open", /.+/);

  // The panel follows its button in the DOM: the next focusable things after the
  // button are the panel's links, ending with "Explore".
  const after = await lab.first().evaluate((b) => {
    const all = [...document.querySelectorAll<HTMLElement>("a[href], button")].filter(
      (e) => e.offsetParent !== null,
    );
    const i = all.indexOf(b as HTMLElement);
    return all.slice(i + 1, i + 4).map((e) => Boolean(e.closest(".cup-panel")));
  });
  expect(after[0]).toBe(true);
  // Tab lands inside it and reaches "Explore" (in browsers whose Tab visits links:
  // Playwright's WebKit on Windows visits buttons only, see linkTabKey).
  let reached = false;
  for (let i = 0; tabKey && i < 3 && !reached; i++) {
    await page.keyboard.press(tabKey);
    reached = await page.evaluate(() =>
      /^Explore /.test(document.activeElement?.textContent ?? ""),
    );
  }
  if (!tabKey) await panel.getByRole("link", { name: /^Explore / }).focus();
  else expect(reached).toBe(true);
  const explore = page.locator(":focus");
  await expect(explore).toHaveText(/^Explore /);
  await expect(explore).toHaveAttribute("href", /^\/research\/[a-z0-9-]+\/$/);

  // Esc from inside the panel sinks the pearl and returns focus to its button.
  await page.keyboard.press("Escape");
  await expect(lab.first()).toHaveAttribute("aria-expanded", "false");
  await expect(lab.first()).toBeFocused();
  await expect(panel).toBeHidden();
  await expect(page.locator("html")).not.toHaveAttribute("data-cup-open", /.*/);
  // Back on the floor (the focused label may still lift it by a hair, as hover does).
  await expect.poll(() => pearlTop(page, 0)).toBeGreaterThan(rest - 10);

  if (n > 1) {
    // Space on another label: one pearl at a time.
    await lab.nth(1).focus();
    await page.keyboard.press("Space");
    await expect(lab.nth(1)).toHaveAttribute("aria-expanded", "true");
    await lab.first().focus();
    await page.keyboard.press("Space");
    expect((await expanded(page)).filter((v) => v === "true")).toHaveLength(1);
    await expect(lab.first()).toHaveAttribute("aria-expanded", "true");
    // Picking it again sinks it.
    await page.keyboard.press("Enter");
    expect((await expanded(page)).every((v) => v === "false")).toBe(true);
  }
});

test("the open panel never covers a label or leaves the screen (1200–1920 wide, phones)", async ({
  page,
}) => {
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1280, 800],
    [1200, 800],
    [1024, 768],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await home(page);
    const n = await labels(page).count();
    for (let i = 0; i < n; i++) {
      await labels(page).nth(i).click();
      await page.waitForTimeout(50);
      const r = await page.evaluate((k) => {
        const panel = document.querySelectorAll(".cup-panel")[k]!.getBoundingClientRect();
        const hits = [...document.querySelectorAll(".cup-lab-t, .cup-hint > *")]
          .map((e) => e.getBoundingClientRect())
          .filter(
            (b) =>
              b.height > 0 &&
              b.left < panel.right &&
              b.right > panel.left &&
              b.top < panel.bottom &&
              b.bottom > panel.top,
          ).length;
        return { hits, right: panel.right };
      }, i);
      expect(r.hits, `pearl ${i} at ${width}`).toBe(0);
      expect(r.right, `pearl ${i} at ${width}`).toBeLessThanOrEqual(width);
    }
  }
});

test("click: the pearl itself opens it; a click outside the cup closes it; hover only lifts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await home(page);
  const rest = await pearlTop(page, 1);
  await page.locator(".cup-lab").nth(1).hover();
  await expect.poll(() => pearlTop(page, 1)).toBeLessThan(rest - 2); // lift
  expect((await expanded(page)).every((v) => v === "false")).toBe(true); // hover never opens
  await page.locator(".cup-pearl").nth(1).click();
  await expect(page.locator(".cup-lab").nth(1)).toHaveAttribute("aria-expanded", "true");
  await page.locator(".hm-h1").click();
  await expect(page.locator(".cup-lab").nth(1)).toHaveAttribute("aria-expanded", "false");
});

test("wordmark: the header O takes the open direction's colour and returns to ink", async ({
  page,
}) => {
  await home(page);
  const fill = () =>
    page.locator(".bl-header .bl-wordmark__pearl-o").evaluate((e) => getComputedStyle(e).fill);
  const ink = await fill();
  await labels(page).first().click();
  const dir = await page
    .locator(".cup-item")
    .first()
    .evaluate((e) => getComputedStyle(e).getPropertyValue("--dir").trim().toLowerCase());
  const hex = async () =>
    "#" +
    (await fill())
      .match(/\d+/g)!
      .slice(0, 3)
      .map((v) => Number(v).toString(16).padStart(2, "0"))
      .join("");
  await expect.poll(hex).toBe(dir);
  await labels(page).first().click();
  await expect.poll(fill).toBe(ink);
});

test("touch: a tap on a pearl opens it below the cup, the hint says Tap, a tap outside closes", async ({
  browser,
}) => {
  const { ctx, page } = await ctxPage(browser, {
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await home(page);
  await expect(page.locator(".cup-pick-t")).toBeVisible();
  await expect(page.locator(".cup-pick-m")).toBeHidden();
  await page.locator(".cup-pearl").nth(2).tap();
  const lab = page.locator(".cup-lab").nth(2);
  await expect(lab).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator(`#${await lab.getAttribute("aria-controls")}`);
  await expect(panel).toBeVisible();
  const [cupBottom, panelTop] = await Promise.all([
    page.locator(".cup-stage").evaluate((e) => e.getBoundingClientRect().bottom),
    panel.evaluate((e) => e.getBoundingClientRect().top),
  ]);
  expect(panelTop).toBeGreaterThanOrEqual(cupBottom); // below the cup
  // The hint flows below the panel (room is reserved, nothing overlaps).
  const hintTop = await page.locator(".cup-hint").evaluate((e) => e.getBoundingClientRect().top);
  const panelBottom = await panel.evaluate((e) => e.getBoundingClientRect().bottom);
  expect(hintTop).toBeGreaterThanOrEqual(panelBottom - 1);
  await page.locator(".hm-h1").tap();
  await expect(lab).toHaveAttribute("aria-expanded", "false");
  await ctx.close();
});

test.describe("phones: pressing around an open pearl", () => {
  const phone = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

  // Closing gives back the room reserved for the panel. If that happened on the
  // press (before the click landed), everything below the cup moved up under the
  // finger: the timeline link opened the first paper, a paper link did nothing.
  for (const [what, sel] of [
    ["the timeline link", ".cup-map"],
    ["a paper link", ".hm-papers a"],
  ] as const) {
    for (const how of ["tap", "click"] as const) {
      test(`a ${how} on ${what} below the open panel follows that link`, async ({ browser }) => {
        const { ctx, page } = await ctxPage(
          browser,
          how === "tap" ? phone : { viewport: phone.viewport },
        );
        await home(page);
        await labels(page).first().click();
        await expect(labels(page).first()).toHaveAttribute("aria-expanded", "true");
        const link = page.locator(sel).first();
        await link.scrollIntoViewIfNeeded();
        const href = (await link.getAttribute("href"))!;
        const b = (await link.boundingBox())!;
        const [x, y] = [b.x + Math.min(20, b.width / 2), b.y + b.height / 2];
        if (how === "tap") await page.touchscreen.tap(x, y);
        else await page.mouse.click(x, y);
        await page.waitForURL((u) => u.pathname + u.hash === href);
        await ctx.close();
      });
    }
  }

  test("a tap on a pearl's edge opens that pearl, not its neighbour (hit areas under the discs)", async ({
    browser,
  }) => {
    const { ctx, page } = await ctxPage(browser, phone);
    await home(page);
    const n = await page.locator(".cup-pearl").count();
    test.skip(n < 2, "needs two pearls side by side");
    // Every point of every visible disc belongs to its own pearl.
    const owners = await page.evaluate(() => {
      const items = [...document.querySelectorAll(".cup-item")];
      return [...document.querySelectorAll(".cup-pearl")].map((p) => {
        const b = p.getBoundingClientRect();
        const cy = b.top + b.height / 2;
        return [b.left + 2, b.left + 5, b.right - 5, b.right - 2].map((x) =>
          items.indexOf(document.elementFromPoint(x, cy)?.closest(".cup-item") as Element),
        );
      });
    });
    owners.forEach((o, i) => expect(o, `pearl ${i}`).toEqual([i, i, i, i]));
    // And the padded area still works where no disc is (≥ 48 px, D-14).
    const b = (await page.locator(".cup-pearl").first().boundingBox())!;
    await page.touchscreen.tap(b.x + b.width - 3, b.y + b.height / 2);
    await expect(labels(page).first()).toHaveAttribute("aria-expanded", "true");
    await ctx.close();
  });

  test("a touch drag that scrolls the page leaves the pearl up; a plain tap outside sinks it", async ({
    browser,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "raw touch input through CDP");
    const { ctx, page } = await ctxPage(browser, phone);
    await home(page);
    await labels(page).first().tap();
    await expect(labels(page).first()).toHaveAttribute("aria-expanded", "true");
    const cdp = await ctx.newCDPSession(page);
    const drag = async (x: number, y: number, dy: number) => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let i = 1; i <= 12; i++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: y + (dy * i) / 12 }],
        });
        await page.waitForTimeout(16);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    const y0 = await page.evaluate(() => scrollY);
    await drag(8, 600, -250); // from the side gutter, outside the cup
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y0 + 100);
    await page.waitForTimeout(600); // longer than the no-click fallback
    await expect(labels(page).first()).toHaveAttribute("aria-expanded", "true");
    await drag(6, 300, 0); // a tap in the side gutter, outside the cup
    await expect(labels(page).first()).toHaveAttribute("aria-expanded", "false");
    await ctx.close();
  });

  test("a pearl sunk by a second tap rests on the floor (no hover lift stuck after a tap)", async ({
    browser,
  }) => {
    const { ctx, page } = await ctxPage(browser, phone);
    await home(page);
    // In page coordinates: opening may scroll the panel into view.
    const top = async () => (await pearlTop(page, 1)) + (await page.evaluate(() => scrollY));
    const rest = await top();
    await labels(page).nth(1).tap();
    await expect.poll(top).toBeLessThan(rest - 40);
    await labels(page).nth(1).tap();
    await expect(labels(page).nth(1)).toHaveAttribute("aria-expanded", "false");
    await expect.poll(top).toBeCloseTo(rest, 0);
    await ctx.close();
  });

  test("with a pearl up, the hint drops its promise and the timeline link starts the line", async ({
    browser,
  }) => {
    for (const viewport of [phone.viewport, { width: 1024, height: 768 }]) {
      const { ctx, page } = await ctxPage(browser, { viewport });
      await home(page);
      await labels(page).first().click();
      await expect(page.locator(".cup-pick")).toBeHidden();
      const [hint, link] = await Promise.all([
        page.locator(".cup-hint").evaluate((e) => e.getBoundingClientRect().left),
        page.locator(".cup-map").evaluate((e) => e.getBoundingClientRect().left),
      ]);
      expect(Math.abs(link - hint), `${viewport.width}`).toBeLessThanOrEqual(1);
      await ctx.close();
    }
  });
});

test("Esc with focus outside the cup sinks the pearl but leaves focus (and the scroll) where it was", async ({
  page,
}) => {
  await home(page);
  await labels(page).nth(1).click();
  await expect(labels(page).nth(1)).toHaveAttribute("aria-expanded", "true");
  const far = page.locator("footer a").last();
  await far.focus();
  const y = await page.evaluate(() => scrollY);
  await page.keyboard.press("Escape");
  await expect(labels(page).nth(1)).toHaveAttribute("aria-expanded", "false");
  await expect(far).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(y);
});

test("Explore morphs the risen pearl into the direction page (pearl-{slug}, one name per slug)", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "view-transition pseudo-elements are read in Chromium");
  await page.context().addInitScript(() => {
    const w = window as unknown as { __vt: string[] | null };
    w.__vt = null;
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    document.startViewTransition = ((arg: never) => {
      const t = start(arg);
      t.ready
        .then(() => {
          w.__vt = document
            .getAnimations()
            .map((a) => (a.effect as KeyframeEffect | null)?.pseudoElement ?? "")
            .map((pe) => /^::view-transition-group\((.+)\)$/.exec(pe)?.[1] ?? "")
            .filter(Boolean);
        })
        .catch(() => {});
      return t;
    }) as typeof document.startViewTransition;
  });
  await home(page);
  const li = page.locator(".cup-item").first();
  const href = (await li.locator(".cup-panel a[href^='/research/']").getAttribute("href"))!;
  const slug = href.split("/")[2]!;
  await page.evaluate(async (u) => void (await fetch(u)), href);
  await page.waitForTimeout(1200);
  await li.locator(".cup-lab").click();
  // Only the risen pearl is named; at rest no cup pearl carries a name.
  await li.locator(".cup-panel a[href^='/research/']").click();
  await page.waitForURL(`**${href}`);
  await expect(page.locator("h1")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __vt: string[] | null }).__vt))
    .not.toBeNull();
  const groups = (await page.evaluate(() => (window as unknown as { __vt: string[] }).__vt))!;
  expect(groups).toContain(`pearl-${slug}`);
  expect(groups.filter((g) => g.startsWith("pearl-"))).toEqual([`pearl-${slug}`]);
});

test.describe("motion", () => {
  test("settle once per session on the first home view (client navigation), never again", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ reducedMotion: "no-preference" });
    const page = await ctx.newPage(); // no init script: a fresh session
    await page.goto("/research/");
    await page.evaluate((k) => sessionStorage.removeItem(k), CUP_KEY);
    await page.locator(".bl-header__brand").click();
    await page.waitForURL((u) => u.pathname === "/");
    await expect(page.locator("html")).toHaveAttribute("data-cup-intro", "");
    const anim = await page
      .locator(".cup-pearl")
      .first()
      .evaluate((e) => e.getAnimations().map((a) => (a as CSSAnimation).animationName));
    expect(anim).toContain("cup-settle");
    const longest = await page.evaluate(() =>
      Math.max(
        ...document
          .getAnimations()
          .filter((a) => /^cup-/.test((a as CSSAnimation).animationName ?? ""))
          .map((a) => {
            const t = a.effect!.getComputedTiming();
            return Number(t.delay ?? 0) + Number(t.duration ?? 0);
          }),
      ),
    );
    expect(longest).toBeLessThanOrEqual(900); // R11: at most 0.9 s
    await expect(page.locator("html")).not.toHaveAttribute("data-cup-intro", /.*/, {
      timeout: 3000,
    });
    // Second home view in the same session: no intro.
    await page.goto("/research/");
    await page.locator(".bl-header__brand").click();
    await page.waitForURL((u) => u.pathname === "/");
    await page.locator(".cup-stage[data-js]").waitFor();
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-cup-intro"))).toBe(
      false,
    );
    await ctx.close();
  });

  test("a full page load: the intro, if any, starts before the pearls are painted (no jump)", async ({
    browser,
  }) => {
    // The pre-paint script may set data-cup-intro (change request home-1); the
    // island must never set it after the pearls are on screen.
    const ctx = await browser.newContext({ reducedMotion: "no-preference" });
    await ctx.addInitScript(() => {
      const w = window as unknown as { __cupIntro: string[] };
      w.__cupIntro = [];
      new MutationObserver(() => {
        if (document.documentElement.hasAttribute("data-cup-intro"))
          w.__cupIntro.push(document.querySelector(".cup-pearl") ? "after-paint" : "pre-paint");
      }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-cup-intro"],
      });
    });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.locator(".cup-stage[data-js]").waitFor();
    await page.waitForTimeout(200);
    const when = await page.evaluate(
      () => (window as unknown as { __cupIntro: string[] }).__cupIntro,
    );
    expect(when.filter((w) => w === "after-paint")).toEqual([]);
    expect(await page.evaluate((k) => sessionStorage.getItem(k), CUP_KEY)).toBe("1");
    await ctx.close();
  });

  test("reduced motion: no intro, no rise animation, no bubbles; 0 running animations", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage(); // fresh session: the intro would run if not gated
    await page.goto("/research/");
    await page.locator(".bl-header__brand").click();
    await page.waitForURL((u) => u.pathname === "/");
    await page.locator(".cup-stage[data-js]").waitFor();
    // The page swap's ≤ 120 ms cross-fade (motion.css) is not the cup's; wait it out.
    const running = () =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (a) =>
                a.playState === "running" &&
                !(a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
                  "::view-transition",
                ),
            ).length,
      );
    expect(await running()).toBe(0);
    await page.locator(".cup-lab").first().click();
    expect(await running()).toBe(0);
    const moving = await page.evaluate(() =>
      [...document.querySelectorAll(".cup-pearl, .cup-ext, .cup-sfc")].map(
        (e) => getComputedStyle(e).transitionDuration,
      ),
    );
    expect(moving.every((d) => d.split(",").every((x) => parseFloat(x) === 0))).toBe(true);
    await expect(page.locator(".cup-bub").first()).toBeHidden();
    await ctx.close();
  });

  test("the site's Reduce motion switch also stops the cup", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("bobalab-motion", "reduce"));
    await home(page);
    await page.locator(".cup-lab").first().click();
    const running = await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === "running").length,
    );
    expect(running).toBe(0);
  });
});

test("people: round consented photos with first names, the team in one sentence, no initials", async ({
  page,
}) => {
  await home(page);
  const sec = page.locator('section[aria-labelledby="h-people"]');
  if (!(await sec.count())) test.skip(true, "no people");
  await expect(sec.locator(".hm-team")).toContainText(/leads the lab with .+\./);
  const faces = sec.locator(".hm-face");
  const n = await faces.count();
  expect(n).toBeGreaterThan(0);
  for (const f of (await faces.all()).slice(0, 6)) {
    const img = f.locator("img");
    await expect(img).toHaveAttribute("alt", /\S+ \S+/); // the full name
    const r = await img.evaluate((e) => {
      const b = e.getBoundingClientRect();
      return { w: b.width, h: b.height, rad: getComputedStyle(e).borderTopLeftRadius };
    });
    expect(Math.abs(r.w - r.h)).toBeLessThanOrEqual(1);
    expect(r.rad).toBe("50%");
    const first = (await f.locator(".hm-face-name").innerText()).trim();
    const alt = (await img.getAttribute("alt"))!;
    expect(alt.replace(/["“”()]/g, " ")).toContain(first.replace(/ [A-Z]\.$/, ""));
  }
  await expect(sec.locator(".hm-ini")).toHaveCount(0);
  await expect(sec.getByRole("link", { name: /^People: \d+ members?/ })).toHaveAttribute(
    "href",
    "/people/",
  );
  await expect(sec.getByRole("link", { name: /Students & RAs/ })).toHaveAttribute(
    "href",
    "/join/#students",
  );
  await expect(sec.locator('a[href^="mailto:"]')).toHaveCount(1);
});

test("new papers beside news: 3 ruled rows and 4 dated one-liners, each with its foot line", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await home(page);
  const papers = page.locator('section[aria-labelledby="h-pubs"]');
  const news = page.locator('section[aria-labelledby="h-news"]');
  expect(await papers.locator("ol > li").count()).toBeLessThanOrEqual(3);
  expect(await news.locator("ol > li").count()).toBeLessThanOrEqual(4);
  for (const r of await news.locator("ol > li").all()) {
    await expect(r.locator("time[datetime]")).toHaveCount(1);
    await expect(r.locator('a[href^="/news/"]')).toHaveCount(1);
  }
  for (const r of await papers.locator("ol > li").all()) {
    await expect(r.locator('h3 a[href^="/publications/"]')).toHaveCount(1);
    await expect(r.locator(".hm-paper-meta")).toHaveCount(1);
  }
  const [a, b] = await Promise.all([papers.boundingBox(), news.boundingBox()]);
  expect(Math.abs(a!.y - b!.y)).toBeLessThanOrEqual(2); // side by side
  await expect(papers.locator(".hm-more a")).toHaveText(
    /^Publications: \d+ papers?(, \d+ in progress)?$/,
  );
  await expect(news.locator(".hm-more a")).toHaveText(/^News: \d+ items?( since \d{4})?$/);
});

test("AI-tell probe (DIRECTION §5.0): no pills, boxes, tracked caps, gradients, shadows, arrows or loops", async ({
  page,
}) => {
  await home(page);
  for (const open of [false, true]) {
    if (open) {
      await page.locator(".cup-lab").first().click();
      await page.waitForTimeout(400);
    }
    const r = await page.evaluate(() => {
      const els = [...document.querySelectorAll<HTMLElement>("main *")];
      const out = {
        pills: 0,
        boxes: 0,
        caps: 0,
        gradients: 0,
        shadows: 0,
        arrows: 0,
        loops: 0,
        mono: 0,
      };
      for (const el of els) {
        const cs = getComputedStyle(el);
        const b = el.getBoundingClientRect();
        const rad = parseFloat(cs.borderTopLeftRadius) || 0;
        const boxed =
          cs.borderTopStyle !== "none" &&
          parseFloat(cs.borderTopWidth) > 0 &&
          cs.borderLeftStyle !== "none" &&
          parseFloat(cs.borderLeftWidth) > 0;
        const filled = cs.backgroundColor !== "rgba(0, 0, 0, 0)";
        if (
          rad >= b.height / 2 - 1 &&
          b.width > b.height * 1.6 &&
          b.height > 8 &&
          (boxed || filled)
        )
          out.pills++;
        if (rad > 2 && b.width > 60 && b.height > 60 && (boxed || filled)) out.boxes++;
        if (cs.textTransform === "uppercase" && parseFloat(cs.letterSpacing) > 0.5) out.caps++;
        if (/gradient/.test(cs.backgroundImage)) out.gradients++;
        if (cs.boxShadow !== "none") out.shadows++;
        if (
          /monospace|Mono|Consolas/i.test(cs.fontFamily.split(",")[0]!) &&
          el.childElementCount === 0 &&
          el.textContent?.trim()
        )
          out.mono++;
      }
      const text = document.querySelector("main")!.textContent ?? "";
      out.arrows = (text.match(/[→←↗↘➔⟶]/g) ?? []).length;
      out.loops = document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations === Infinity).length;
      // The cup drawing: flat fills only (no gradient, pattern or filter).
      if (
        document.querySelector(
          ".cup-draw linearGradient, .cup-draw radialGradient, .cup-draw filter, .cup-draw pattern",
        )
      )
        out.gradients++;
      return out;
    });
    expect(r, open ? "with a pearl open" : "at rest").toEqual({
      pills: 0,
      boxes: 0,
      caps: 0,
      gradients: 0,
      shadows: 0,
      arrows: 0,
      loops: 0,
      mono: 0,
    });
  }
});

for (const width of [390, 320]) {
  test(`no horizontal scroll at ${width} px, at rest and with a pearl open`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await home(page);
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
    expect(await overflow()).toBeLessThanOrEqual(0);
    const n = await labels(page).count();
    for (let i = 0; i < n; i++) {
      await labels(page).nth(i).click();
      expect(await overflow(), `pearl ${i} open`).toBeLessThanOrEqual(0);
    }
    // Every label stays inside the viewport.
    const right = await labels(page).evaluateAll((els) =>
      Math.max(...els.map((e) => e.getBoundingClientRect().right)),
    );
    expect(right).toBeLessThanOrEqual(width);
  });
}

test("works without JavaScript: the cup draws and its <ol> is a list of direction links", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Research directions" });
  const links = nav.locator("ol > li > a.cup-lab");
  const n = await links.count();
  expect(n).toBeGreaterThan(0);
  for (const l of await links.all())
    await expect(l).toHaveAttribute("href", /^\/research\/[a-z0-9-]+\/$/);
  await expect(nav.locator("button")).toHaveCount(0);
  await expect(page.locator(".cup-draw--wide")).toBeVisible();
  await expect(page.locator(".cup-pearl")).toHaveCount(n);
  await expect(page.locator(".cup-pearl").first()).toBeVisible();
  await expect(page.locator(".cup-panel").first()).toBeHidden();
  // No "pick a pearl" promise without the script; the timeline link stays.
  await expect(page.locator(".cup-pick")).toBeHidden();
  await expect(page.locator(".cup-map")).toBeVisible();
  await links.first().click();
  await expect(page).toHaveURL(/\/research\/[a-z0-9-]+\/$/);
  await ctx.close();
});

test("zero off-origin requests", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const off: string[] = [];
  page.on("request", (r) => {
    const u = r.url();
    if (/^https?:/.test(u) && new URL(u).origin !== origin) off.push(u);
  });
  await page.goto("/", { waitUntil: "networkidle" });
  expect(off).toEqual([]);
});

const AXE_CASES = [
  { name: "desktop light", viewport: { width: 1440, height: 900 }, colorScheme: "light" as const },
  { name: "desktop dark", viewport: { width: 1440, height: 900 }, colorScheme: "dark" as const },
  { name: "tablet light", viewport: { width: 768, height: 1024 }, colorScheme: "light" as const },
  { name: "mobile light", viewport: { width: 390, height: 844 }, colorScheme: "light" as const },
  { name: "mobile dark", viewport: { width: 390, height: 844 }, colorScheme: "dark" as const },
];
for (const c of AXE_CASES) {
  test(`axe: ${c.name}, at rest and with a pearl open`, async ({ browser }) => {
    const { ctx, page } = await ctxPage(browser, {
      viewport: c.viewport,
      colorScheme: c.colorScheme,
    });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator(".cup-stage[data-js]").waitFor();
    const fmt = (r: Awaited<ReturnType<ReturnType<typeof axe>["analyze"]>>) =>
      r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`);
    expect(fmt(await axe(page).analyze())).toEqual([]);
    await page.locator(".cup-lab").nth(2).click();
    await page.waitForTimeout(500);
    expect(fmt(await axe(page).analyze())).toEqual([]);
    await ctx.close();
  });
}

test("axe: forced colours, with a pearl open", async ({ browser }) => {
  const { ctx, page } = await ctxPage(browser, {
    viewport: { width: 1440, height: 900 },
    forcedColors: "active",
  });
  await home(page);
  await page.locator(".cup-lab").nth(1).click();
  const results = await axe(page).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  // Pearls stay visible in system colours.
  const bg = await page
    .locator(".cup-pearl")
    .first()
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  await ctx.close();
});
