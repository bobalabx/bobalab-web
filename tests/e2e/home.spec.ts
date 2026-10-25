/**
 * Home page (DECISIONS D-15 "the pearl figure", on the D-14 hero; the original
 * Fig. 1 behaviours of 4740e10 tests/e2e/figure.spec.ts):
 *   - first screen: one h1, the who line, the why line, one primary + one
 *     secondary link, then the pearl figure on a flat tea panel and the quiet
 *     link to /research/#map; every pearl and its label inside the first
 *     viewport at 1440×900, 1366×768 and 390×844 (a 2×2 grid on phones);
 *   - the figure: the original slot templates (2×2 offset cluster for 4); real
 *     links whose Tab order follows the pearls; hover (after the 80 ms intent)
 *     or focus lifts the pearl ≤ 3 px / ≤ 1.05, brightens its halo, blooms its
 *     seeds, dims the other pearls' graphics (never text) and swaps the caption
 *     to the direction's question and counts; the wordmark O takes the
 *     direction colour; Esc and leaving reset; Enter opens the direction with
 *     the pearl-{slug} morph (one element per name) and focus lands on its h1;
 *   - motion: settle once per session (its own session key), transform and
 *     opacity only, nothing under reduced motion or the site's switch;
 *   - below the fold: new papers beside news, then people (round consented
 *     photos, first names, the team in one sentence with no numbers);
 *   - the AI-tell probe (no gloss, numerals, pills, boxes, loops), no
 *     horizontal scroll at 390/320, no-JS links, zero off-origin requests, axe
 *     in light, dark, mobile and forced colours.
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
/** The homepage pearls' settle-once key (privacy.yml; the research map has "bobalab-intro"). */
const KEY = "bobalab-cup-intro";

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

const items = (page: Page) => page.locator(".pl-item");
const links = (page: Page) => page.locator(".pl-link");

/** Home, hydrated (the island has wired the figure). */
async function home(page: Page) {
  await page.goto("/");
  await page.locator(".pl[data-js]").waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function ctxPage(browser: Browser, opts: BrowserContextOptions) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(skipIntro);
  return { ctx, page: await ctx.newPage() };
}

/**
 * The key that moves focus through links in this browser: "Tab" (Chromium),
 * "Alt+Tab" (WebKit on macOS), or null (Playwright's WebKit on Windows).
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

const shownCap = (page: Page) =>
  page.locator(".pl-cap-l.is-on").evaluate((e) => (e as HTMLElement).dataset.cap);
const opacity = (page: Page, sel: string) =>
  page.locator(sel).evaluateAll((els) => els.map((e) => Number(getComputedStyle(e).opacity)));
/** The halo strength multiplier per pearl (--pl-k: 1 rest, > 1 active, < 1 dimmed). */
const haloK = (page: Page) =>
  items(page).evaluateAll((els) =>
    els.map((e) => Number(getComputedStyle(e).getPropertyValue("--pl-k").trim() || 1)),
  );

test("first screen: one h1, who, why, two links (one primary), then the pearls; sections in order", async ({
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
  const hl = page.locator(".hm-links a");
  await expect(hl).toHaveCount(2);
  await expect(hl.nth(0)).toHaveText("Explore the research");
  await expect(hl.nth(0)).toHaveAttribute("href", "/research/");
  await expect(hl.nth(1)).toHaveText("Read the papers");
  await expect(hl.nth(1)).toHaveAttribute("href", "/publications/");
  const weights = await hl.evaluateAll((els) =>
    els.map((e) => Number(getComputedStyle(e).fontWeight)),
  );
  expect(weights[0]).toBeGreaterThan(weights[1]!);

  // DOM order: hero (copy, pearls, map link), then findings?, papers, news, people.
  const order = await page.evaluate(() => {
    const all = [...document.querySelectorAll("main *")];
    return [
      ".hm-h1",
      ".hm-links",
      ".pl",
      ".pl-more",
      "#h-findings",
      "#h-pubs",
      "#h-news",
      "#h-people",
    ].map((s) => {
      const el = document.querySelector(s);
      return el ? all.indexOf(el) : -1;
    });
  });
  const present = order.filter((i) => i >= 0);
  expect(present).toEqual([...present].sort((a, b) => a - b));
  await expect(page.locator(".f1-plate, .cup, .cup-stage")).toHaveCount(0); // no timeline, no cup
  const more = page.locator(".pl-more a");
  await expect(more).toHaveAttribute("href", "/research/#map");
  await expect(more).toHaveText(/^See how the \w+ directions connect$/);
  const h2s = (await page.locator("main h2").allInnerTexts()).map((t) => t.trim());
  expect(h2s.filter((t) => ["New papers", "News", "People"].includes(t))).toEqual([
    "New papers",
    "News",
    "People",
  ]);
  const sizes = await page.evaluate(() => {
    const px = (s: string) => parseFloat(getComputedStyle(document.querySelector(s)!).fontSize);
    return { h1: px(".hm-h1"), who: px(".hm-who"), h2: px("main h2") };
  });
  expect(sizes.h1).toBeGreaterThanOrEqual(2 * Math.max(sizes.who, sizes.h2));
});

test("the panel: flat --tea, no border, radius or crop marks; the default caption is one plain sentence", async ({
  page,
}) => {
  await home(page);
  const s = await page.locator(".pl").evaluate((el) => {
    const cs = getComputedStyle(el);
    const probe = document.createElement("i");
    probe.style.color = "var(--tea)";
    document.body.append(probe);
    const tea = getComputedStyle(probe).color;
    probe.remove();
    const after = getComputedStyle(el, "::after");
    return {
      bg: cs.backgroundColor,
      tea,
      border: parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth),
      radius: cs.borderTopLeftRadius,
      after: after.content,
    };
  });
  expect(s.bg).toBe(s.tea);
  expect(s.border).toBe(0);
  expect(s.radius).toBe("0px");
  expect(s.after).toBe("none");
  await expect(page.locator(".pl-cap-l.is-on")).toHaveText(
    "Each pearl is a research direction; each small dot is one of its papers.",
  );
});

test("the original layout: 2×2 offset cluster for four, slot order = DOM order, seeds within ±75°", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await home(page);
  const n = await items(page).count();
  test.skip(n !== 4, "the four-direction template");
  await expect(page.locator(".pl")).toHaveAttribute("data-state", "cluster");
  const c = await page.locator(".pl-body").evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
    }),
  );
  // Row 1: 01, 02; row 2 (offset right by half a slot): 03, 04.
  expect(c[0]!.x).toBeLessThan(c[2]!.x);
  expect(c[2]!.x).toBeLessThan(c[1]!.x);
  expect(c[1]!.x).toBeLessThan(c[3]!.x);
  expect(Math.min(c[2]!.y, c[3]!.y)).toBeGreaterThan(Math.max(c[0]!.y, c[1]!.y));
  expect(c[0]!.w).toBeGreaterThanOrEqual(80); // D = clamp(5rem, 14cqi, 6.5rem)
  // Every seed sits above its pearl's equator (the ±75° cap).
  const below = await items(page).evaluateAll((els) =>
    els.flatMap((li) => {
      const b = li.querySelector(".pl-body")!.getBoundingClientRect();
      const cy = b.top + b.height / 2;
      return [...li.querySelectorAll(".pl-seed")]
        .map((s) => s.getBoundingClientRect())
        .filter((r) => r.top + r.height / 2 > cy - 2);
    }),
  );
  expect(below).toEqual([]);
  // One seed per paper (≤ 12), and the count is in the label.
  for (const li of await items(page).all()) {
    const papers = Number((await li.locator(".pl-count").innerText()).match(/\d+/)![0]);
    await expect(li.locator(".pl-seed")).toHaveCount(Math.min(12, papers));
  }
});

for (const vp of [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`every pearl and its label are in the first viewport at ${vp.width}×${vp.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(vp);
    await home(page);
    const n = await items(page).count();
    expect(n).toBeGreaterThan(0);
    const boxes = await page
      .locator(".pl-body, .pl-label, .pl-count")
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
    for (const b of boxes) {
      expect(b.top).toBeGreaterThanOrEqual(0);
      expect(b.bottom).toBeLessThanOrEqual(vp.height);
      expect(b.right).toBeLessThanOrEqual(vp.width);
    }
    const linksBottom = await page
      .locator(".hm-links")
      .evaluate((e) => e.getBoundingClientRect().bottom);
    if (vp.width < 500) {
      // Phones: under the text, a compact 2×2 grid of ~56 px pearls with halos.
      const first = await page.locator(".pl").evaluate((e) => e.getBoundingClientRect().top);
      expect(first).toBeGreaterThan(linksBottom);
      await expect(page.locator(".pl")).toHaveAttribute("data-state", "cluster");
      const cols = await page
        .locator(".pl-list")
        .evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length);
      expect(cols).toBe(2);
      const w = await page
        .locator(".pl-body")
        .first()
        .evaluate((e) => e.getBoundingClientRect().width);
      expect(w).toBeGreaterThanOrEqual(52);
      expect(w).toBeLessThanOrEqual(60);
      const rows = new Set(
        await page
          .locator(".pl-body")
          .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top))),
      );
      expect(rows.size).toBe(Math.ceil(n / 2));
      // Tap targets: the whole pearl + label + count is one link, ≥ 48 px tall.
      const h = await links(page)
        .first()
        .evaluate((e) => e.getBoundingClientRect().height);
      expect(h).toBeGreaterThanOrEqual(48);
    } else {
      expect(linksBottom).toBeLessThanOrEqual(vp.height);
    }
  });
}

test("labels look like links: Archivo, ink, an underline in the direction colour; counts are muted", async ({
  page,
}) => {
  await home(page);
  const t = await page
    .locator(".pl-label")
    .first()
    .evaluate((e) => {
      const s = getComputedStyle(e);
      const li = e.closest(".pl-item")!;
      const dir = getComputedStyle(li).getPropertyValue("--dir").trim();
      const count = getComputedStyle(li.querySelector(".pl-count")!);
      const probe = document.createElement("i");
      probe.style.color = "var(--muted)";
      document.body.append(probe);
      const muted = getComputedStyle(probe).color;
      probe.style.color = "var(--ink)";
      const ink = getComputedStyle(probe).color;
      probe.remove();
      return {
        line: s.textDecorationLine,
        deco: s.textDecorationColor,
        color: s.color,
        family: s.fontFamily,
        dir,
        count: count.color,
        muted,
        ink,
      };
    });
  expect(t.line).toContain("underline");
  const hex = (rgb: string) =>
    "#" +
    rgb
      .match(/\d+/g)!
      .slice(0, 3)
      .map((v) => Number(v).toString(16).padStart(2, "0"))
      .join("");
  expect(hex(t.deco)).toBe(t.dir.toLowerCase());
  expect(t.color).toBe(t.ink);
  expect(t.family).toMatch(/Archivo/i);
  expect(t.count).toBe(t.muted);
});

test("keyboard: Tab order follows the pearls; focus swaps the caption and tints the O; Esc resets", async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await home(page);
  const tabKey = await linkTabKey(page);
  const n = await items(page).count();
  await page.locator(".hm-links a").last().focus();
  const slugs = await items(page).evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).dataset.slug),
  );
  for (let i = 0; i < n; i++) {
    if (tabKey) await page.keyboard.press(tabKey);
    else await links(page).nth(i).focus();
    const focused = await page.evaluate(
      () => (document.activeElement?.closest(".pl-item") as HTMLElement | null)?.dataset.slug,
    );
    expect(focused, `Tab ${i + 1}`).toBe(slugs[i]);
    expect(await shownCap(page)).toBe(slugs[i]);
    await expect(items(page).nth(i)).toHaveClass(/is-on/);
    await expect(page.locator(".pl")).toHaveAttribute("data-active", "");
    await expect(page.locator("html")).toHaveAttribute("data-pearl-on", slugs[i]!);
  }
  // The live caption names the direction's question and its counts.
  const cap = page.locator(".pl-cap-l.is-on");
  await expect(cap.locator(".pl-cap-c")).toHaveText(/^\d+ papers?(, \d+ in progress)?$/);
  // A visible focus ring on the pearl.
  const ring = await page.evaluate(() => {
    const b = document.activeElement!.querySelector(".pl-body")!;
    const s = getComputedStyle(b);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
  expect(ring.style).toBe("solid");
  expect(ring.width).toBeGreaterThanOrEqual(2);
  await page.keyboard.press("Escape");
  expect(await shownCap(page)).toBe("legend");
  await expect(page.locator(".pl")).not.toHaveAttribute("data-active", /.*/);
  await expect(page.locator("html")).not.toHaveAttribute("data-pearl-on", /.*/);
  test.info().annotations.push({ type: "browser", description: browserName });
});

test("hover: the pearl lifts ≤ 3 px and ≤ 1.05, its halo brightens and seeds bloom; others dim graphics only; leaving resets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await home(page);
  const n = await items(page).count();
  const li = items(page).nth(1);
  const slug = (await li.getAttribute("data-slug"))!;
  const restBody = await li.locator(".pl-body").evaluate((e) => e.getBoundingClientRect().toJSON());
  const restSeed = await li.locator(".pl-ring").evaluate((e) => e.getBoundingClientRect().width);
  await li.locator(".pl-body").hover();
  await expect(li).toHaveClass(/is-on/);
  expect(await shownCap(page)).toBe(slug);
  await page.waitForTimeout(500); // transitions settle
  const t = await li
    .locator(".pl-g")
    .evaluate((e) => new DOMMatrixReadOnly(getComputedStyle(e).transform));
  expect(t.f).toBeGreaterThanOrEqual(-3);
  expect(t.f).toBeLessThan(0);
  expect(t.a).toBeLessThanOrEqual(1.05);
  expect(t.a).toBeGreaterThan(1);
  const body = await li.locator(".pl-body").evaluate((e) => e.getBoundingClientRect().toJSON());
  expect(restBody.top - body.top).toBeLessThanOrEqual(3 + restBody.height * 0.05);
  const ring = await li.locator(".pl-ring").evaluate((e) => e.getBoundingClientRect().width);
  expect(ring / restSeed).toBeGreaterThan(1.12); // ~10 % bloom on top of the 1.05 lift
  const k = await haloK(page);
  expect(k[1]).toBeGreaterThan(1);
  for (let i = 0; i < n; i++) if (i !== 1) expect(k[i]).toBeLessThan(1);
  // Other pearls: orbit and seeds dim; bodies, labels and counts never do.
  const seeds = await opacity(page, ".pl-seeds");
  const rings = await opacity(page, ".pl-ring");
  for (let i = 0; i < n; i++) {
    if (i === 1) continue;
    expect(seeds[i]).toBeLessThan(0.6);
    expect(rings[i]).toBeLessThan(0.6);
  }
  for (const sel of [".pl-body", ".pl-label", ".pl-count", ".pl-link"])
    expect(
      (await opacity(page, sel)).every((o) => o === 1),
      sel,
    ).toBe(true);
  // The wordmark O takes the direction colour.
  const fill = () =>
    page.locator(".bl-header .bl-wordmark__pearl-o").evaluate((e) => getComputedStyle(e).fill);
  const dir = await li.evaluate((e) => {
    const probe = document.createElement("i");
    probe.style.color = getComputedStyle(e).getPropertyValue("--dir");
    document.body.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  });
  await expect.poll(fill).toBe(dir);
  // Leave: back to the sentence after ~300 ms.
  await page.mouse.move(2, 2);
  await expect.poll(() => shownCap(page)).toBe("legend");
  await expect(page.locator("html")).not.toHaveAttribute("data-pearl-on", /.*/);
  await expect.poll(fill).not.toBe(dir);
});

test("Enter opens the direction with the pearl morph (one pearl-{slug} per name); focus lands on its h1", async ({
  page,
  browserName,
}) => {
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
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await home(page);
  const li = items(page).first();
  const href = (await li.locator("a").getAttribute("href"))!;
  const slug = href.split("/")[2]!;
  // One pearl per direction on the page (React names each pearl-{slug} only while
  // a transition is captured, so a duplicate slug would be a duplicate name).
  const slugs = await items(page).evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).dataset.slug),
  );
  expect(new Set(slugs).size).toBe(slugs.length);
  await expect(page.locator(".pl-body")).toHaveCount(slugs.length);
  await page.evaluate(async (u) => void (await fetch(u)), href);
  await page.waitForTimeout(1200);
  await li.locator("a").focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(`**${href}`);
  await expect(page.locator("main h1")).toBeFocused({ timeout: 5000 });
  if (browserName === "chromium") {
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __vt: string[] | null }).__vt))
      .not.toBeNull();
    const groups = (await page.evaluate(() => (window as unknown as { __vt: string[] }).__vt))!;
    expect(groups.filter((g) => g.startsWith("pearl-"))).toEqual([`pearl-${slug}`]);
  }
  // The direction header pearl carries the same halo, so the morph reads continuous.
  const shadow = await page
    .locator(".f1-dp--hero .f1-pearl")
    .first()
    .evaluate((e) => getComputedStyle(e).boxShadow);
  expect(shadow).not.toBe("none");
  expect(errors.filter((e) => /view-transition|duplicate|same name/i.test(e))).toEqual([]);
});

test("tap on a phone navigates to the direction", async ({ browser }) => {
  const { ctx, page } = await ctxPage(browser, {
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await home(page);
  const href = (await links(page).nth(2).getAttribute("href"))!;
  await links(page).nth(2).locator(".pl-label").tap();
  await page.waitForURL(`**${href}`);
  await ctx.close();
});

test.describe("motion", () => {
  test("settle once per session on the first home view (client navigation), never again", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ reducedMotion: "no-preference" });
    const page = await ctx.newPage(); // no init script: a fresh session
    await page.goto("/research/");
    await page.evaluate((k) => sessionStorage.removeItem(k), KEY);
    await page.locator(".bl-header__brand").click();
    await page.waitForURL((u) => u.pathname === "/");
    await expect(page.locator(".pl")).toHaveAttribute("data-intro", "");
    const anim = await page
      .locator(".pl-g")
      .first()
      .evaluate((e) => e.getAnimations().map((a) => (a as CSSAnimation).animationName));
    expect(anim).toContain("pl-settle");
    // Transform and opacity only, finite, all done within ~1.2 s.
    const props = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => /^pl-/.test((a as CSSAnimation).animationName ?? ""))
        .map((a) => {
          const t = a.effect!.getComputedTiming();
          const kf = (a.effect as KeyframeEffect).getKeyframes();
          return {
            end: Number(t.delay ?? 0) + Number(t.duration ?? 0),
            iterations: t.iterations,
            props: [...new Set(kf.flatMap((f) => Object.keys(f)))].filter(
              (p) => !["offset", "easing", "composite", "computedOffset"].includes(p),
            ),
          };
        }),
    );
    expect(props.length).toBeGreaterThan(0);
    for (const p of props) {
      expect(p.iterations).toBe(1);
      expect(p.end).toBeLessThanOrEqual(1300);
      for (const k of p.props) expect(["transform", "translate", "opacity"]).toContain(k);
    }
    expect(await page.evaluate((k) => sessionStorage.getItem(k), KEY)).toBe("1");
    expect(await page.evaluate(() => sessionStorage.getItem("bobalab-intro"))).toBeNull();
    await expect(page.locator(".pl")).not.toHaveAttribute("data-intro", /.*/, { timeout: 3000 });
    // Second home view in the same session: no intro.
    await page.goto("/research/");
    await page.locator(".bl-header__brand").click();
    await page.waitForURL((u) => u.pathname === "/");
    await page.locator(".pl-item").first().waitFor();
    await page.waitForTimeout(200);
    expect(await page.locator(".pl").getAttribute("data-intro")).toBeNull();
    const again = await page.evaluate(
      () =>
        document.getAnimations().filter((a) => /^pl-/.test((a as CSSAnimation).animationName ?? ""))
          .length,
    );
    expect(again).toBe(0);
    await ctx.close();
  });

  test("a full page load: the intro starts before the pearls are painted (no jump)", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ reducedMotion: "no-preference" });
    await ctx.addInitScript(() => {
      const w = window as unknown as { __intro: string[] };
      w.__intro = [];
      new MutationObserver(() => {
        if (document.documentElement.hasAttribute("data-cup-intro"))
          w.__intro.push(document.querySelector(".pl-body") ? "after-paint" : "pre-paint");
      }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-cup-intro"],
      });
    });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.locator(".pl-item").first().waitFor();
    await page.waitForTimeout(300);
    const when = await page.evaluate(() => (window as unknown as { __intro: string[] }).__intro);
    expect(when.filter((w) => w === "after-paint")).toEqual([]);
    expect(await page.evaluate((k) => sessionStorage.getItem(k), KEY)).toBe("1");
    await ctx.close();
  });

  test("reduced motion: no intro, no lift or bloom transition; 0 running animations", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage(); // fresh session: the intro would run if not gated
    await page.goto("/research/");
    await page.locator(".bl-header__brand").click();
    await page.waitForURL((u) => u.pathname === "/");
    await page.locator(".pl-item").first().waitFor();
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
    await page.waitForTimeout(200); // the page swap's ≤ 120 ms cross-fade is not the figure's
    expect(await running()).toBe(0);
    await items(page).nth(1).locator(".pl-body").hover();
    await expect(items(page).nth(1)).toHaveClass(/is-on/);
    expect(await running()).toBe(0);
    const t = await items(page)
      .nth(1)
      .locator(".pl-g")
      .evaluate((e) => getComputedStyle(e).transform);
    expect(t).toBe("none"); // no lift
    const moving = await page.evaluate(() =>
      [...document.querySelectorAll(".pl-g, .pl-ring, .pl-seed, .pl-body, .pl-cap-l")].map(
        (e) => getComputedStyle(e).transitionDuration,
      ),
    );
    expect(moving.every((d) => d.split(",").every((x) => parseFloat(x) === 0))).toBe(true);
    await ctx.close();
  });

  test("the site's Reduce motion switch also stops the pearls", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("bobalab-motion", "reduce"));
    await home(page);
    await items(page).first().locator(".pl-body").hover();
    await expect(items(page).first()).toHaveClass(/is-on/);
    const running = await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === "running").length,
    );
    expect(running).toBe(0);
  });
});

test("people: round consented photos with first names, the way to join, no team sentence and no numbers", async ({
  page,
}) => {
  await home(page);
  const sec = page.locator('section[aria-labelledby="h-people"]');
  if (!(await sec.count())) test.skip(true, "no people");
  // Owner, copy sweep: no "… leads the lab with …" sentence and no "former members" line.
  await expect(sec.locator(".hm-team")).toHaveCount(0);
  expect(await sec.innerText()).not.toMatch(/leads the lab|former members|people page/i);
  // D-15: no people count anywhere in the section, the foot link included.
  expect(await sec.innerText()).not.toMatch(/\d+\s+(members?|alumni|former|students?|RAs?)\b/i);
  const faces = sec.locator(".hm-face");
  const n = await faces.count();
  expect(n).toBeGreaterThan(0);
  for (const f of (await faces.all()).slice(0, 6)) {
    const img = f.locator("img");
    await expect(img).toHaveAttribute("alt", /\S+ \S+/);
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
  await expect(sec.getByRole("link", { name: "Meet the lab", exact: true })).toHaveAttribute(
    "href",
    "/people/",
  );
  await expect(sec.locator(".hm-join")).toContainText("Want to join or work with us?");
  await expect(sec.getByRole("link", { name: "Join the lab", exact: true })).toHaveAttribute(
    "href",
    "/join/",
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
  expect(Math.abs(a!.y - b!.y)).toBeLessThanOrEqual(2);
  // Plain links, no stats (copy sweep).
  await expect(papers.locator(".hm-more a")).toHaveText("All publications");
  await expect(news.locator(".hm-more a")).toHaveText("All news");
});

test("AI-tell probe: no gloss, numerals, pills, boxes, tracked caps, arrows or loops", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await home(page);
  for (const active of [false, true]) {
    if (active) {
      await items(page).nth(2).locator(".pl-body").hover();
      await page.waitForTimeout(500);
    }
    const r = await page.evaluate(() => {
      const out = {
        pills: 0,
        boxes: 0,
        caps: 0,
        gradients: 0,
        shadows: 0,
        gloss: 0,
        numerals: 0,
        arrows: 0,
        loops: 0,
        mono: 0,
      };
      // The pearl body (matte shading + its halo, D-15) is the one exempt graphic.
      const pearl = (el: Element) => el.classList.contains("pl-body");
      for (const el of document.querySelectorAll<HTMLElement>("main *")) {
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
        // Discs (pearls, orbits) are exempt, as in the kit probe; boxes are not.
        const r0 = cs.borderTopLeftRadius;
        const px = r0.endsWith("%") ? (parseFloat(r0) / 100) * Math.min(b.width, b.height) : rad;
        const disc = px >= Math.min(b.width, b.height) / 2 - 1;
        if (rad > 2 && b.width > 60 && b.height > 60 && (boxed || filled) && !disc) out.boxes++;
        if (cs.textTransform === "uppercase" && parseFloat(cs.letterSpacing) > 0.5) out.caps++;
        if (/gradient/.test(cs.backgroundImage) && !pearl(el)) out.gradients++;
        if (cs.boxShadow !== "none" && !pearl(el)) out.shadows++;
        for (const pe of ["::before", "::after"]) {
          const p = getComputedStyle(el, pe);
          if (el.closest(".pl-g") && p.content !== "none" && p.content !== "normal") out.gloss++;
        }
        if (
          /monospace|Mono|Consolas/i.test(cs.fontFamily.split(",")[0]!) &&
          el.childElementCount === 0 &&
          el.textContent?.trim()
        )
          out.mono++;
      }
      // The body shading has no light specular stop (a gloss would be near-white).
      for (const b of document.querySelectorAll(".pl-body")) {
        const img = getComputedStyle(b).backgroundImage;
        const stops = [...img.matchAll(/rgb\((\d+), (\d+), (\d+)\)/g)].map(
          (m) => (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3,
        );
        if (stops.some((v) => v > 140)) out.gloss++;
      }
      out.numerals = [...document.querySelectorAll(".pl-g")].filter((g) =>
        /\d/.test(g.textContent ?? ""),
      ).length;
      const text = document.querySelector("main")!.textContent ?? "";
      out.arrows = (text.match(/[→←↗↘➔⟶]/g) ?? []).length;
      out.loops = document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations === Infinity).length;
      return out;
    });
    expect(r, active ? "with a pearl active" : "at rest").toEqual({
      pills: 0,
      boxes: 0,
      caps: 0,
      gradients: 0,
      shadows: 0,
      gloss: 0,
      numerals: 0,
      arrows: 0,
      loops: 0,
      mono: 0,
    });
  }
  // No Pause button, no buttons at all in the figure.
  await expect(page.locator(".pl button")).toHaveCount(0);
});

for (const width of [390, 320]) {
  test(`no horizontal scroll at ${width} px; every label inside the viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await home(page);
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
    expect(await overflow()).toBeLessThanOrEqual(0);
    const right = await page
      .locator(".pl-label")
      .evaluateAll((els) => Math.max(...els.map((e) => e.getBoundingClientRect().right)));
    expect(right).toBeLessThanOrEqual(width);
    await links(page).first().focus();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
}

test("works without JavaScript: the pearls draw and their <ol> is a list of direction links", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Research directions" });
  const l = nav.locator("ol > li > a.pl-link");
  const n = await l.count();
  expect(n).toBeGreaterThan(0);
  for (const a of await l.all())
    await expect(a).toHaveAttribute("href", /^\/research\/[a-z0-9-]+\/$/);
  await expect(page.locator(".pl-body")).toHaveCount(n);
  await expect(page.locator(".pl-body").first()).toBeVisible();
  await expect(page.locator(".pl-cap-l.is-on")).toHaveText(/^Each pearl is a research direction/);
  await expect(page.locator(".pl-more a")).toBeVisible();
  await l.first().click();
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
  test(`axe: ${c.name}, at rest and with a pearl active`, async ({ browser }) => {
    const { ctx, page } = await ctxPage(browser, {
      viewport: c.viewport,
      colorScheme: c.colorScheme,
    });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator(".pl-item").first().waitFor();
    const fmt = (r: Awaited<ReturnType<ReturnType<typeof axe>["analyze"]>>) =>
      r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`);
    expect(fmt(await axe(page).analyze())).toEqual([]);
    await links(page).nth(2).focus();
    await page.waitForTimeout(400);
    expect(fmt(await axe(page).analyze())).toEqual([]);
    await ctx.close();
  });
}

test("axe: forced colours, with a pearl focused; pearls stay visible in system colours", async ({
  browser,
}) => {
  const { ctx, page } = await ctxPage(browser, {
    viewport: { width: 1440, height: 900 },
    forcedColors: "active",
  });
  await home(page);
  await links(page).nth(1).focus();
  const results = await axe(page).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  const bg = await page
    .locator(".pl-body")
    .first()
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  await ctx.close();
});
