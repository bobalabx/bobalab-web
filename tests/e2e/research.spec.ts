/**
 * /research/ and /research/{direction}/ (brief §D4–§D5, §E5; redesign D-13 after
 * docs/redesign/prototypes/p3/research.html).
 * Runs against BASE_URL (default: the shared dev server http://localhost:3100,
 * drafts included). Routes are discovered from the rendered index, so the spec
 * follows whatever content the server has.
 *   npx playwright test tests/e2e/research.spec.ts
 * Screenshots: test-results/redesign-research/.
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SHOTS = "test-results/redesign-research";
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
      .locator(`${sel} .rs-dir__title a`)
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
  // Strips (wide): one width for every row of a list, year-bin labels that never touch.
  await page.setViewportSize({ width: 1440, height: 900 });
  const strips = await page
    .locator('section[aria-labelledby="rs-directions"] .rs-strip')
    .evaluateAll((ss) => ss.map((s) => Math.round(s.getBoundingClientRect().width)));
  expect(new Set(strips).size).toBe(1);
  const labels = await page
    .locator('section[aria-labelledby="rs-directions"] .rs-axis__track > span')
    .evaluateAll((ls) => ls.map((l) => l.getBoundingClientRect().toJSON() as DOMRect));
  expect(labels.map((l) => l.width).every((w) => w > 0)).toBe(true);
  for (let i = 1; i < labels.length; i++)
    expect(labels[i]!.left, "axis labels overlap").toBeGreaterThanOrEqual(labels[i - 1]!.right);
});

// ---------------------------------------------------------------------------
// Direction page

test("direction page: header, derived counts, Figure 2, see-all filter, sections, one pearl", async ({
  page,
}) => {
  const { live } = await discover(page);
  for (const slug of live) {
    await open(page, `/research/${slug}/`);
    const h1 = page.locator("main h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveAttribute("tabindex", "-1");

    // Label column: "Research direction", the counts sentence, "All directions" → Fig. 1.
    await expect(page.locator(".dr-kind")).toContainText("Research direction");
    await expect(page.locator(".dr-back")).toHaveAttribute("href", "/");

    // Exactly one pearl on the page: Figure 2's, for this direction (the morph target).
    await expect(page.locator(".f1-dp")).toHaveCount(1);
    await expect(page.locator(`.dr-f2 .f1-dp[data-slug="${slug}"]`)).toHaveCount(1);

    // Counts are derived and match what the page lists.
    const status = (await page.locator(".dr-status").textContent()) ?? "";
    const projects = Number(/(\d+) projects?/.exec(status)?.[1]);
    const papers = Number(/(\d+) papers?/.exec(status)?.[1]);
    const wip = Number(/(\d+) in progress/.exec(status)?.[1] ?? 0);
    await expect(page.locator(".dr-project")).toHaveCount(projects);
    await expect(page.locator(".dr-f2__p:not(.dr-f2__p--wip)")).toHaveCount(papers);
    await expect(page.locator(".dr-f2__p--wip")).toHaveCount(wip);
    if (papers > 0) {
      const aside = await page
        .locator('section[aria-labelledby="publications"] .dr-section__aside')
        .textContent();
      expect(aside).toContain(`${papers} paper`);
      const href = await page.locator(".dr-seeall a").getAttribute("href");
      expect(href).toBe(`/publications/?direction=${slug}`);
    }
    // Every figure label is a link to the paper page; the figure is captioned.
    for (const href of await page
      .locator(".dr-f2__p:not(.dr-f2__p--wip) .dr-f2__t")
      .evaluateAll((as) => as.map((a) => a.getAttribute("href"))))
      expect(href).toMatch(/^\/publications\/[a-z0-9-]+\/$/);
    await expect(page.locator(".dr-f2 figcaption")).toContainText("Figure 2.");

    // Empty sections are hidden: every section has content.
    const empties = await page
      .locator(".dr-section")
      .evaluateAll(
        (ss) => ss.filter((s) => !s.querySelector(".dr-section__body")?.textContent?.trim()).length,
      );
    expect(empties).toBe(0);

    // No pre-redesign hedges in the page chrome (D-13 item 7).
    await expect(page.locator("main")).not.toContainText("Listed by title only");

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

test("Figure 2 geometry: the pearl sits on the line at now (wide); beside the h1, in view (phone)", async ({
  page,
}) => {
  const { live } = await discover(page);
  for (const slug of live) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, `/research/${slug}/`);
    const fit = await page.locator(".dr-f2").getAttribute("data-fit");
    const pearl = (await page.locator(".dr-f2__pearl").boundingBox())!;
    if (fit === "lines") {
      const dots = await page
        .locator(".dr-f2__dot")
        .evaluateAll((ds) => ds.map((d) => d.getBoundingClientRect().toJSON()));
      for (const d of dots) {
        // Dots sit on one line through the pearl's centre, all before "now".
        expect(Math.abs(d.y + d.height / 2 - (pearl.y + pearl.height / 2)), slug).toBeLessThan(2);
        expect(d.x + d.width, slug).toBeLessThan(pearl.x + pearl.width / 2);
      }
      expect(Math.round(pearl.width)).toBe(96);
      // The caption describes the stubs that are drawn, not the phone's "Also in" lines.
      if (await page.locator(".dr-f2[data-shared]").count()) {
        await expect(page.locator(".dr-f2__cap-w")).toBeVisible();
        await expect(page.locator(".dr-f2__cap-l")).toBeHidden();
      }
    }
    // Phone: the list layout; the pearl beside the h1, inside the first screen, clear of its text.
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, `/research/${slug}/`);
    const p2 = (await page.locator(".dr-f2__pearl").boundingBox())!;
    const h1 = (await page.locator("main h1").boundingBox())!;
    expect(p2.y + p2.height, slug).toBeLessThan(844);
    expect(Math.abs(p2.y - h1.y), slug).toBeLessThan(24);
    expect(p2.x, slug).toBeGreaterThan(h1.x + 100);
    const overlap = await page.evaluate(() => {
      const p = document.querySelector(".dr-f2__pearl")!.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(document.querySelector(".dr-title")!);
      return [...range.getClientRects()].some(
        (r) => r.right > p.left && r.left < p.right && r.bottom > p.top && r.top < p.bottom,
      );
    });
    expect(overlap, `${slug}: h1 text under the pearl`).toBe(false);
    if (await page.locator(".dr-f2[data-shared]").count()) {
      await expect(page.locator(".dr-f2__cap-l")).toBeVisible();
      await expect(page.locator(".dr-f2__cap-w")).toBeHidden();
    }
  }
});

test("Figure 2 labels never collide (wide): 'Also in' labels clear the twin dots, years and each other", async ({
  page,
}) => {
  const { live, archived } = await discover(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const slug of [...live, ...archived]) {
    await open(page, `/research/${slug}/`);
    if (!(await page.locator('.dr-f2[data-fit="lines"]').count())) continue;
    const hits = await page.evaluate(() => {
      const r = (e: Element) => e.getBoundingClientRect();
      const meets = (a: DOMRect, b: DOMRect) =>
        a.left < b.right - 1 &&
        b.left < a.right - 1 &&
        a.top < b.bottom - 1 &&
        b.top < a.bottom - 1;
      const labels = [...document.querySelectorAll(".dr-f2 :is(.dr-f2__other, .dr-f2__lab)")].map(
        r,
      );
      const marks = [
        ...document.querySelectorAll(
          ".dr-f2 :is(.dr-f2__tw, .dr-f2__dot, .dr-f2__ring, .dr-f2__yr)",
        ),
      ].map(r);
      let n = 0;
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) if (meets(labels[i]!, labels[j]!)) n++;
        for (const m of marks) if (meets(labels[i]!, m)) n++;
      }
      return n;
    });
    expect(hits, `${slug}: overlapping Figure 2 labels`).toBe(0);
  }
});

test("archived direction: 'Earlier research' with its date, no pearl, not in the main list", async ({
  page,
}) => {
  const { archived } = await discover(page);
  test.skip(!archived.length, "no archived directions in this content");
  await open(page, `/research/${archived[0]}/`);
  await expect(page.locator(".dr-kind")).toContainText("Earlier research");
  await expect(page.locator(".dr-kind time")).toHaveCount(1);
  // No index and no Fig. 1 pearl to morph from: no pearl at all.
  await expect(page.locator(".f1-dp")).toHaveCount(0);
  await expect(page.locator(".dr-back")).toHaveAttribute("href", "/research/");
  await expect(page.locator(".dr-f2 figcaption")).toContainText("Figure 1.");
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

test("Figure 2 arrival is finite and motion-gated", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const ctx = await browser.newContext({ reducedMotion, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const { live } = await discover(page);
    await page.goto(`/research/${live[0]}/`);
    const anims = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => (a.effect as KeyframeEffect | null)?.target?.closest?.(".dr-f2"))
        .map((a) => {
          const t = a.effect!.getComputedTiming();
          return { iterations: Number(t.iterations), end: Number(t.endTime) };
        }),
    );
    if (reducedMotion === "reduce") expect(anims).toHaveLength(0);
    else {
      expect(anims.length).toBeGreaterThan(0);
      for (const a of anims) {
        expect(Number.isFinite(a.iterations)).toBe(true);
        expect(a.end).toBeLessThanOrEqual(2000);
      }
    }
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

test("wide screens: one label-column grid; Figure 2 stays inside the content column", async ({
  page,
}) => {
  const { live, archived } = await discover(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  for (const slug of [...live, ...archived]) {
    await open(page, `/research/${slug}/`);
    const box = (sel: string) =>
      page
        .locator(sel)
        .first()
        .evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);
    // The h1 starts on the section-body vertical; the label column on the section heads'.
    const title = await box(".dr-title");
    const body = await box(".dr-section__body");
    expect(Math.abs(title.left - body.left), slug).toBeLessThanOrEqual(1);
    const side = await box(".dr-head__side");
    const head = await box(".dr-section__head");
    expect(Math.abs(side.left - head.left), slug).toBeLessThanOrEqual(1);
    if (await page.locator(".dr-f2").count()) {
      const track = await box(".dr-f2__track");
      const sec = await box(".dr-section");
      expect(track.right, slug).toBeLessThanOrEqual(sec.right + 1);
    }
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
