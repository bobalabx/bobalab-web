/**
 * WP3 publications: index and paper pages (brief §D7–§D8, D-05, WP3 acceptance).
 *
 * Runs against BASE_URL (default: the shared dev server http://localhost:3100,
 * which includes drafts). Expected values are computed from content/ with the
 * same loader the site uses, in the same draft mode as the server (detected
 * from <html data-preview>), so the spec follows content changes.
 *
 *   npx playwright test tests/e2e/publications.spec.ts
 *
 * Screenshots (1440×900 and 390×844, light and dark) land in
 * test-results/redesign-publications/ (D-13 redesign).
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { buildContent, loadRawContent, type Content } from "@/lib/content/load";
import { buildIndexData } from "@/lib/publications/index-data";
import { createIndex, searchSlugs } from "@/lib/publications/search";
import { applyFilters, parseFilters } from "@/lib/publications/filters";

test.describe.configure({ timeout: 90_000 });

const SHOTS = "test-results/redesign-publications";
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const GOLDEN = path.join(process.cwd(), "tests/unit/publications/golden");
const MS_PAPER = "bastani-2026-rl-tips";

const contentCache = new Map<boolean, Content>();
async function contentFor(page: Page): Promise<Content> {
  const preview = await page.evaluate(() => document.documentElement.hasAttribute("data-preview"));
  if (!contentCache.has(preview)) {
    contentCache.set(
      preview,
      buildContent(loadRawContent(path.join(process.cwd(), "content")), { preview }),
    );
  }
  return contentCache.get(preview)!;
}

async function open(page: Page, url: string) {
  const res = await page.goto(url, { waitUntil: "networkidle" });
  expect(res?.status(), url).toBe(200);
}

/** Wait until the filter island has hydrated (its chips and inputs work). */
async function openIndex(page: Page, query = "") {
  await open(page, `/publications/${query}`);
  await expect(page.locator(".pubs-layout[data-hydrated]")).toHaveCount(1, { timeout: 30_000 });
}

const status = (page: Page) => page.locator(".pubs-layout[data-hydrated] .pubs-status");

/** Slugs of the entries currently rendered (and visible) in the main list. */
async function listedSlugs(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>(".pubs-results .bl-pub"))
      .filter((el) => el.offsetParent !== null)
      .map((el) => (el.getAttribute("aria-labelledby") ?? "").replace(/^pub-/, "")),
  );
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    // Next's dev-tools overlay (dev server only) is not part of the site.
    .exclude("nextjs-portal")
    .analyze();
  return r.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.nodes[0]?.target.join(" ")}`,
  );
}

// ---------------------------------------------------------------------------
// Index without JavaScript (acceptance #1)

test("the full list is in the HTML without JavaScript, grouped by year with jump links", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await open(page, "/publications/");
  const c = await contentFor(page);
  const counted = c.countedPublications;
  expect(counted.length).toBeGreaterThan(0);

  expect((await listedSlugs(page)).sort()).toEqual(counted.map((p) => p.slug).sort());
  for (const p of counted) {
    await expect(
      page.locator(".pubs-results").getByRole("link", { name: p.title, exact: true }),
    ).toHaveAttribute("href", `/publications/${p.slug}/`);
  }
  const years = [...new Set(counted.map((p) => p.year))].sort((a, b) => (b ?? 0) - (a ?? 0));
  const headings = await page.locator(".pubs-results h2.pubs-year__h").allTextContents();
  expect(headings.slice(0, years.length)).toEqual(years.map((y) => String(y ?? "Undated")));
  if (years.length > 1) {
    const jump = page.getByRole("navigation", { name: "Jump to year" });
    await expect(jump.getByRole("link")).toHaveCount(years.length);
    await expect(jump.getByRole("link").first()).toHaveAttribute("href", `#y${years[0]}`);
  }

  // D-05: work in progress is collapsed below, never in the main list.
  const wip = c.inProgress.map((p) => p.slug);
  for (const slug of wip) expect(await listedSlugs(page)).not.toContain(slug);
  if (wip.length) {
    const details = page.locator(".pubs-wip details");
    await expect(details).not.toHaveAttribute("open");
    await expect(page.getByRole("heading", { name: "Work in progress" })).toBeVisible();
    await expect(details.locator(".bl-pub")).toHaveCount(wip.length);
  }
  await ctx.close();
});

// ---------------------------------------------------------------------------
// Filter island (acceptance #2)

test("chips and year range round-trip through the URL and the count is announced", async ({
  page,
}) => {
  await openIndex(page);
  const c = await contentFor(page);
  const { docs, facets } = buildIndexData(c, c.countedPublications);
  const total = docs.length;
  const live = status(page);
  await expect(live).toHaveAttribute("role", "status");
  await expect(live).toHaveAttribute("aria-live", "polite");
  await expect(live).toHaveText(`${total} publications`);

  const dir = facets.direction[0];
  const type = facets.type.find((t) => t.value === "journal") ?? facets.type[0];
  test.skip(!dir || !type, "needs at least one direction and one type facet");

  const expectState = async (qs: string) => {
    const want = applyFilters(docs, parseFilters(qs, facets), null).map((d) => d.slug);
    await expect(live).toHaveText(`Showing ${want.length} of ${total} publications`);
    expect((await listedSlugs(page)).sort()).toEqual([...want].sort());
  };

  await page.getByRole("button", { name: new RegExp(`^${dir!.label}`) }).click();
  await expect(page).toHaveURL(new RegExp(`[?&]direction=${dir!.value}(&|$)`));
  await expectState(`direction=${dir!.value}`);

  await page.getByRole("button", { name: new RegExp(`^${type!.label}`) }).click();
  await expect(page).toHaveURL(`/publications/?direction=${dir!.value}&type=${type!.value}`);
  await expectState(`direction=${dir!.value}&type=${type!.value}`);

  // Reload: the state comes back from the URL.
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".pubs-layout[data-hydrated]")).toHaveCount(1, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: new RegExp(`^${dir!.label}`) })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expectState(`direction=${dir!.value}&type=${type!.value}`);

  // Year range
  await page.getByRole("button", { name: /^Clear all filters/ }).click();
  await expect(page).toHaveURL("/publications/");
  await expect(live).toHaveText(`${total} publications`);
  if (facets.years.length >= 2) {
    const from = facets.years[1]!;
    await page.getByRole("combobox", { name: "From", exact: true }).selectOption(String(from));
    await expect(page).toHaveURL(`/publications/?year=${from}-`);
    await expectState(`year=${from}-`);
    await page.getByRole("combobox", { name: "To", exact: true }).selectOption(String(from));
    await expect(page).toHaveURL(`/publications/?year=${from}`);
    await expectState(`year=${from}`);
  }
});

test("free-text search writes ?q= and filters with MiniSearch", async ({ page }) => {
  await openIndex(page);
  const c = await contentFor(page);
  const { docs } = buildIndexData(c, c.countedPublications);
  const index = createIndex(docs);
  const box = page.getByRole("searchbox", { name: "Search publications" });
  await box.fill("gig");
  await expect(page).toHaveURL("/publications/?q=gig");
  const want = [...(searchSlugs(index, "gig") ?? [])];
  await expect(status(page)).toHaveText(`Showing ${want.length} of ${docs.length} publications`);
  expect((await listedSlugs(page)).sort()).toEqual(want.sort());

  await box.fill("zzzz-no-such-paper");
  await expect(page.getByText("No publications match these filters.")).toBeVisible();
  await page.getByRole("button", { name: /^Clear all filters/ }).click();
  await expect(box).toHaveValue("");
  await expect(page).toHaveURL("/publications/");
});

test("a deep link with ?direction= (direction pages' 'See all') applies on load", async ({
  page,
}) => {
  await open(page, "/publications/");
  const c = await contentFor(page);
  const { docs, facets } = buildIndexData(c, c.countedPublications);
  const dir = facets.direction.at(-1);
  test.skip(!dir, "no direction facet in this build");
  await openIndex(page, `?direction=${dir!.value}`);
  const want = applyFilters(docs, parseFilters(`direction=${dir!.value}`, facets), null);
  await expect(status(page)).toHaveText(`Showing ${want.length} of ${docs.length} publications`);
  await expect(page.getByRole("button", { name: new RegExp(`^${dir!.label}`) })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("on a phone the filters sit behind a disclosure button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openIndex(page);
  const toggle = page.getByRole("button", { name: /^Filters/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#pubs-panel")).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#pubs-panel")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Entry anatomy (acceptance #4, #7)

test("every materials link's accessible name includes the paper title", async ({ page }) => {
  for (const url of ["/publications/", `/publications/${MS_PAPER}/`]) {
    await open(page, url);
    const bad = await page.evaluate(() => {
      const out: string[] = [];
      for (const a of document.querySelectorAll<HTMLAnchorElement>(".bl-materials a")) {
        const list = a.closest(".bl-materials");
        const title = (list?.getAttribute("aria-label") ?? "").replace(/^Materials for /, "");
        if (!title || !(a.textContent ?? "").includes(title)) out.push(a.href);
      }
      return out;
    });
    expect(bad, url).toEqual([]);
    expect(await page.locator(".bl-materials a").count()).toBeGreaterThan(0);
  }
});

test("statuses are plain labels: no 'as of' date and no 'reported by the lab' footnote (copy sweep)", async ({
  page,
}) => {
  await open(page, "/publications/");
  const c = await contentFor(page);
  // A real review claim: Under review or Under revision (a bare Work in
  // progress on a working paper repeats the type word and is not shown).
  const p = c.countedPublications.find(
    (x) => (x.status === "under-review" || x.status === "under-revision") && x.as_of,
  );
  test.skip(!p, "no dated review status in this build");
  const entry = page.locator(`.pubs-results article[aria-labelledby="pub-${p!.slug}"]`).first();
  await expect(entry.locator(".bl-pub__status")).toHaveText(/^Under (review|revision) at [^,]+$/);
  await expect(page.locator("main")).not.toContainText("as of ");
  await expect(page.locator("main")).not.toContainText("reported by the lab");
  await expect(page.locator(".pubs-fn")).toHaveCount(0);

  // A working paper or work in progress says so once (the type word), not
  // again as "Work in progress".
  for (const wipRow of c.countedPublications.filter(
    (x) =>
      (x.type === "work-in-progress" || x.type === "working-paper") &&
      x.status === "in-progress" &&
      !x.status_note,
  )) {
    await expect(
      page.locator(`.pubs-results article[aria-labelledby="pub-${wipRow.slug}"] .bl-pub__status`),
    ).toHaveCount(0);
  }

  // The paper page states its status as one plain line, with no date or source note.
  await open(page, `/publications/${p!.slug}/`);
  await expect(page.locator(".pub-status")).toHaveText(/^Under (review|revision) at [^,]+$/);
  await expect(page.locator(".pub-status__meta")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("As of ");
});

test("ledger rows have one link in the main column: the title (names are plain, P3)", async ({
  page,
}) => {
  await open(page, "/publications/");
  // Lab members are set in 600 without a link; the paper page links them.
  await expect(page.locator(".pubs-results .bl-pub__authors a")).toHaveCount(0);
  expect(await page.locator(".pubs-results strong.bl-pub__author--lab").count()).toBeGreaterThan(0);
  const extra = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".pubs-results .bl-pub__main"))
      .filter((m) => m.querySelectorAll("a").length !== 1)
      .map((m) => m.closest("article")?.getAttribute("aria-labelledby")),
  );
  expect(extra).toEqual([]);
});

test("lab members are highlighted and linked only when listed; external authors link to their web page", async ({
  page,
}) => {
  await open(page, `/publications/${MS_PAPER}/`);
  const c = await contentFor(page);
  const p = c.getPublication(MS_PAPER)!;
  const authors = page.locator(".pub-authors");
  // The fixture paper must exercise both branches (a profile link and an external page).
  expect(p.authorList.some((a) => !a.isLab && a.url)).toBe(true);
  for (const a of p.authorList) {
    if (a.isLab && a.person?.hasProfile) {
      await expect(authors.getByRole("link", { name: a.name })).toHaveAttribute(
        "href",
        `/people/${a.person.slug}/`,
      );
    } else if (!a.isLab && a.url) {
      // PUB-01: the "Web page" entered for an external coauthor is shown as a link.
      const link = authors.getByRole("link", { name: a.name });
      await expect(link).toHaveAttribute("href", a.url);
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      await expect(link).toHaveClass(/pub-author--ext/);
    } else {
      await expect(authors.getByRole("link", { name: a.name })).toHaveCount(0);
      await expect(authors).toContainText(a.name);
    }
  }
});

test("talks and awards carry no provenance marks or footnotes (copy sweep, owner ruling)", async ({
  page,
}) => {
  await page.goto("/");
  const c = await contentFor(page);
  const withTalks = c.publications.filter((x) => x.presentations.length > 0).slice(0, 3);
  const p = c.getPublication(MS_PAPER);
  for (const x of [...withTalks, ...(p ? [p] : [])]) {
    await open(page, `/publications/${x.slug}/`);
    await expect(page.locator("main")).not.toContainText(/reported by the lab/i);
    await expect(page.locator(".pub-award__src, .pub-talks__src, .pub-fn")).toHaveCount(0);
    if (x.presentations.length)
      await expect(page.locator(".pub-talks li")).toHaveCount(x.presentations.length);
    if (x.awards.length) {
      await expect(page.locator('section[aria-labelledby="awards-h"] .pub-award')).toHaveCount(
        x.awards.length,
      );
      // No generated "4 awards, 2019 to 2020" summary above the list.
      await expect(page.locator(".pub-side")).not.toContainText(/\d+ awards?, \d{4}/);
    }
  }
  // An earlier title is a short parenthesis, not a repeated "Under its earlier title" line.
  if (p?.awards.some((a) => a.under_title)) {
    await open(page, `/publications/${MS_PAPER}/`);
    await expect(page.locator("main")).not.toContainText("Under its earlier title");
    await expect(page.locator(".pub-award__under").first()).toHaveText(/^\(as “.+”\)$/);
  }
});

// ---------------------------------------------------------------------------
// Paper page (acceptance #3, #5, #6)

test("paper page: venue line, Scholar meta, ScholarlyArticle JSON-LD and build-time BibTeX", async ({
  page,
}) => {
  await open(page, `/publications/${MS_PAPER}/`);
  const c = await contentFor(page);
  const p = c.getPublication(MS_PAPER)!;
  await expect(page.locator("h1")).toHaveText(p.title);
  await expect(page.locator(".pub-venue")).toHaveText(
    "Management Science 2026, 72(1):733–755; online May 22, 2025",
  );

  const meta = (name: string) =>
    page
      .locator(`meta[name="${name}"]`)
      .evaluateAll((els) => els.map((e) => e.getAttribute("content")));
  expect(await meta("citation_title")).toEqual([p.title]);
  expect(await meta("citation_author")).toEqual(p.authors.map((a) => a.name));
  expect(await meta("citation_publication_date")).toEqual(["2026"]);
  expect(await meta("citation_journal_title")).toEqual(["Management Science"]);
  expect(await meta("citation_doi")).toEqual([p.doi]);

  const lds = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) => els.map((e) => JSON.parse(e.textContent ?? "{}")));
  const article = lds.find((x) => x["@type"] === "ScholarlyArticle");
  expect(article).toBeTruthy();
  expect(article.headline).toBe(p.title);
  expect(article.author).toHaveLength(p.authors.length);

  const golden = fs.readFileSync(path.join(GOLDEN, `${MS_PAPER}.bib`), "utf8").trim();
  expect((await page.locator("#pub-bibtex").textContent())?.trim()).toBe(golden);
  const apa = fs.readFileSync(path.join(GOLDEN, `${MS_PAPER}.apa.txt`), "utf8").trim();
  await expect(page.locator(".pub-cite__text")).toHaveText(apa);

  // Awards show the title they were given under.
  const under = p.awards.find((a) => a.under_title);
  if (under) await expect(page.locator(".pub-awards")).toContainText(under.under_title!);
});

test("Copy BibTeX copies the <pre> and announces 'Copied'", async ({ browser, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permissions differ by browser (brief §G5)");
  const ctx = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  await open(page, `/publications/${MS_PAPER}/`);
  const button = page.getByRole("button", { name: "Copy BibTeX" });
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator(".pub-bib [role=status]")).toHaveText("Copied");
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  // The OS clipboard may hand back CRLF line ends (Windows).
  const raw = await page.evaluate(() => navigator.clipboard.readText());
  const clip = raw.split(String.fromCharCode(13)).join("");
  expect(clip).toBe(await page.locator("#pub-bibtex").textContent());
  expect(clip.startsWith("@article{")).toBe(true);
  await ctx.close();
});

test("without JavaScript the BibTeX <pre> is there and the Copy button is hidden", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await open(page, `/publications/${MS_PAPER}/`);
  await expect(page.locator("pre #pub-bibtex")).toContainText("@article{bastani2026improving,");
  // Both Copy buttons (APA and BibTeX) stay hidden without JavaScript.
  await expect(page.locator(".pub-copy")).toHaveCount(2);
  for (const b of await page.locator(".pub-copy").all()) await expect(b).toBeHidden();
  await ctx.close();
});

test("work in progress pages say so and carry no Scholar meta", async ({ page }) => {
  await open(page, "/publications/");
  const c = await contentFor(page);
  const wip = c.inProgress[0];
  test.skip(!wip, "no work in progress in this build");
  await open(page, `/publications/${wip!.slug}/`);
  // The type word only (copy sweep: no "In progress: no public version yet" line); the
  // page has no PDF or DOI to offer, and the list files it under "Work in progress".
  await expect(page.locator(".pub-side .pub-type")).toHaveText(
    /^(Work in progress|Working paper|Journal article|Conference paper|Book chapter|Thesis|Dissertation|Other)$/,
  );
  await expect(page.locator("main")).not.toContainText("no public version");
  await expect(page.locator('meta[name="citation_title"]')).toHaveCount(0);
  await expect(page.locator(".pub-cite")).toHaveCount(0);
});

test("Scholar tags: only for papers with a public version, with a real institution", async ({
  page,
}) => {
  await open(page, "/publications/");
  const c = await contentFor(page);
  // Counted through a documented talk only (D-05): a page, JSON-LD, but nothing for Scholar.
  const talkOnly = c.countedPublications.find((p) => !p.publicVersion);
  if (talkOnly) {
    await open(page, `/publications/${talkOnly.slug}/`);
    await expect(page.locator('meta[name="citation_title"]')).toHaveCount(0);
    const types = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) => els.map((e) => JSON.parse(e.textContent ?? "{}")["@type"]));
    expect(types).toContain("ScholarlyArticle");
  }
  // An SSRN working paper names SSRN and the report number, not the venue string.
  const ssrn = c.countedPublications.find((p) => /^SSRN working paper \d+$/.test(p.venue ?? ""));
  test.skip(!ssrn, "no SSRN working paper in this build");
  await open(page, `/publications/${ssrn!.slug}/`);
  await expect(page.locator('meta[name="citation_technical_report_institution"]')).toHaveAttribute(
    "content",
    "SSRN",
  );
  await expect(page.locator('meta[name="citation_technical_report_number"]')).toHaveAttribute(
    "content",
    ssrn!.venue!.replace(/^SSRN working paper /, ""),
  );
});

test("Clear all filters keeps keyboard focus on the page (on the result count)", async ({
  page,
}) => {
  await openIndex(page);
  const box = page.getByRole("searchbox", { name: "Search publications" });
  await box.fill("gig");
  await expect(page).toHaveURL("/publications/?q=gig");
  const clear = page.getByRole("button", { name: /^Clear all filters/ });
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/publications/");
  await expect(status(page)).toBeFocused();
});

test("no layout shift when the island replaces the static list (fallback ≡ island)", async ({
  browser,
}) => {
  // The static export ships the <Suspense> fallback; with JavaScript the island
  // replaces it. Simulate the fallback as a scripting browser sees it (load
  // without JS, drop the <noscript> style) and compare with the hydrated island.
  for (const width of [390, 768, 1366]) {
    const top = async (js: boolean) => {
      const ctx = await browser.newContext({
        viewport: { width, height: 844 },
        javaScriptEnabled: js,
      });
      const p = await ctx.newPage();
      await open(p, "/publications/");
      if (js) {
        await expect(p.locator(".pubs-layout[data-hydrated]")).toHaveCount(1, { timeout: 30_000 });
      } else {
        await p.evaluate(() => document.querySelectorAll("noscript").forEach((n) => n.remove()));
      }
      const y = await p.evaluate(() => {
        const h = Array.from(document.querySelectorAll<HTMLElement>(".pubs-year__h")).find(
          (el) => el.offsetParent !== null,
        );
        return Math.round((h?.getBoundingClientRect().top ?? NaN) + window.scrollY);
      });
      await ctx.close();
      return y;
    };
    expect(await top(true), `${width}px`).toBe(await top(false));
  }
});

test("unknown slugs are 404 (dynamicParams = false)", async ({ page }) => {
  const res = await page.goto("/publications/no-such-paper-2099-x/");
  expect(res?.status()).toBe(404);
});

test("no horizontal scroll at 320 px (WCAG 1.4.10)", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const url of ["/publications/", `/publications/${MS_PAPER}/`]) {
    await open(page, url);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, url).toBeLessThanOrEqual(0);
  }
});

// ---------------------------------------------------------------------------
// Study-design plate (D-13 item 8): preview or plate_verified only; a finite
// 4-step step-through; the whole design under reduced motion and without JS.

async function plateExpected(page: Page) {
  const c = await contentFor(page);
  const p = c.getPublication(MS_PAPER)!;
  return p.plate_verified === true || c.preview;
}

test("the Bastani plate shows only when verified or in preview, with its source line", async ({
  page,
}) => {
  await open(page, `/publications/${MS_PAPER}/`);
  const want = await plateExpected(page);
  const plate = page.locator("figure.plate");
  await expect(plate).toHaveCount(want ? 1 : 0);
  test.skip(!want, "plate not verified and not a preview build");
  await expect(plate.locator("figcaption")).toContainText("it shows no results");
  await expect(plate.locator(".plate-src")).toContainText("arXiv:2108.08454");
  // Labels are HTML, never SVG text.
  expect(await plate.locator("svg text").count()).toBe(0);
  // The Learning to Gig plate stays off.
  await open(page, "/publications/deng-2025-learning-to-gig/");
  await expect(page.locator("figure.plate")).toHaveCount(0);
});

test("plate step-through: 4 finite steps announced politely, then back to the whole design", async ({
  page,
}) => {
  await open(page, `/publications/${MS_PAPER}/`);
  test.skip(!(await plateExpected(page)), "no plate in this build");
  const pl = page.locator(".pl");
  const step = page.locator(".plate-btn--step");
  const note = page.locator(".plate-note");
  await expect(note).toHaveAttribute("aria-live", "polite");
  await expect(pl).toHaveAttribute("data-at", "0");
  await expect(step).toHaveText("Step through the design");
  // Once stepping, the note's slot is as tall as the longest step: the plate
  // never moves between steps (checked at desktop and phone width).
  const plTop = () => pl.evaluate((el) => Math.round(el.getBoundingClientRect().top + scrollY));
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const tops: number[] = [];
    for (let k = 1; k <= 4; k++) {
      await step.click();
      await expect(pl).toHaveAttribute("data-at", String(k));
      await expect(note).toContainText(`Step ${k} of 4.`);
      tops.push(await plTop());
    }
    expect(new Set(tops).size, `${width}px: .pl top per step ${tops.join(",")}`).toBe(1);
    await expect(step).toHaveText("Start again");
    if (width !== 390) {
      await page.getByRole("button", { name: "Show all steps" }).click();
      await expect(pl).toHaveAttribute("data-at", "0");
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  // Step 1 dims the later steps (opacity only).
  await step.click();
  await expect(pl).toHaveAttribute("data-at", "1");
  await page.waitForTimeout(600);
  const dim = await page
    .locator('.pl [data-k="4"]')
    .first()
    .evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(dim).toBeLessThan(0.5);
  await page.getByRole("button", { name: "Show all steps" }).click();
  await expect(pl).toHaveAttribute("data-at", "0");
  await expect(step).toBeFocused();
  // Nothing loops.
  const infinite = await page.evaluate(
    () =>
      document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations === Infinity)
        .length,
  );
  expect(infinite).toBe(0);
});

test("plate under reduced motion and without JS: every step shown, no step button", async ({
  browser,
}) => {
  for (const mode of ["reduce", "nojs"] as const) {
    const ctx = await browser.newContext({
      reducedMotion: mode === "reduce" ? "reduce" : "no-preference",
      javaScriptEnabled: mode !== "nojs",
    });
    const page = await ctx.newPage();
    await open(page, `/publications/${MS_PAPER}/`);
    const c = await contentFor(page);
    const p = c.getPublication(MS_PAPER)!;
    if (!(p.plate_verified || c.preview)) {
      await ctx.close();
      continue;
    }
    await expect(page.locator(".plate-btn--step"), mode).toBeHidden();
    await expect(page.locator(".pl")).toHaveAttribute("data-at", "0");
    const hidden = await page.evaluate(
      () =>
        Array.from(
          document.querySelectorAll<HTMLElement>('.pl [data-k]:not([data-k="3o"])'),
        ).filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length,
    );
    expect(hidden, mode).toBe(0);
    await page.locator("figure.plate").screenshot({ path: `${SHOTS}/plate-${mode}.png` });
    await ctx.close();
  }
});

// ---------------------------------------------------------------------------
// D-13 AI-tell probe on both templates (DIRECTION §5.0): no pills or rounded
// boxes, no arrows in text, no tracked caps, no mono outside DOI/BibTeX, at
// most two heavy (2 px) rules per 900 px window.

test("AI-tell probe: no pills, boxes, arrows, tracked caps or stray mono", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const url of ["/publications/", `/publications/${MS_PAPER}/`]) {
    await open(page, url);
    const r = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      const els = Array.from(main.querySelectorAll<HTMLElement>("*"));
      const out = { pills: 0, boxes: 0, arrows: 0, caps: 0, mono: [] as string[], heavy: 0 };
      for (const el of els) {
        const cs = getComputedStyle(el);
        const rad = parseFloat(cs.borderTopLeftRadius);
        const box = el.getBoundingClientRect();
        const painted = cs.borderTopWidth !== "0px" || cs.backgroundColor !== "rgba(0, 0, 0, 0)";
        const disc = Math.abs(box.width - box.height) < 2;
        if (painted && rad > 0 && rad >= box.height / 2 - 1 && box.height > 0 && !disc) out.pills++;
        if (painted && rad > 2 && box.width > 60 && !disc) out.boxes++;
        if (cs.textTransform === "uppercase" && parseFloat(cs.letterSpacing) > 0) out.caps++;
        const own = Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent ?? "")
          .join("");
        if (/[→←↗]/.test(own)) out.arrows++;
        if (own.trim() && /mono|consol|menlo/i.test(cs.fontFamily) && !el.closest(".doi, pre"))
          out.mono.push(el.className);
        if (box.height > 0) {
          for (const side of ["Top", "Bottom"] as const) {
            if (
              cs.getPropertyValue(`border-${side.toLowerCase()}-width`) === "2px" &&
              cs.getPropertyValue(`border-${side.toLowerCase()}-style`) === "solid"
            )
              out.heavy++;
          }
        }
      }
      return out;
    });
    expect(r.pills, url).toBe(0);
    expect(r.boxes, url).toBe(0);
    expect(r.arrows, url).toBe(0);
    expect(r.caps, url).toBe(0);
    expect(r.mono, url).toEqual([]);
    // The full ledger (index) or the plate (paper): one 2 px pair per page.
    expect(r.heavy, url).toBeLessThanOrEqual(2);
  }
});

// ---------------------------------------------------------------------------
// Visual QA + axe on every WP3 template, both schemes, desktop and phone

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
] as const;

async function routes(page: Page) {
  await open(page, "/publications/");
  const c = await contentFor(page);
  const statusPaper = c.countedPublications.find((p) => p.status !== "published");
  const wip = c.inProgress[0];
  const dir = buildIndexData(c, c.countedPublications).facets.direction[0];
  return [
    { name: "index", url: "/publications/" },
    ...(dir
      ? [{ name: "index-filtered", url: `/publications/?direction=${dir.value}&q=work` }]
      : []),
    { name: "paper-journal", url: `/publications/${MS_PAPER}/` },
    ...(statusPaper ? [{ name: "paper-status", url: `/publications/${statusPaper.slug}/` }] : []),
    ...(wip ? [{ name: "paper-wip", url: `/publications/${wip.slug}/` }] : []),
  ];
}

for (const scheme of ["light", "dark"] as const) {
  for (const vp of VIEWPORTS) {
    test(`zero axe violations + screenshots (${scheme}, ${vp.name})`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({ colorScheme: scheme });
      const problems: string[] = [];
      for (const r of await routes(page)) {
        await open(page, r.url);
        if (r.name.startsWith("index")) {
          await expect(page.locator(".pubs-layout[data-hydrated]")).toHaveCount(1, {
            timeout: 30_000,
          });
        }
        await page.screenshot({
          path: `${SHOTS}/${r.name}-${vp.name}-${scheme}.png`,
          fullPage: true,
        });
        for (const v of await axe(page)) problems.push(`${r.name}: ${v}`);
      }
      expect(problems).toEqual([]);
    });
  }
}

test("zero axe violations with the phone filter panel open and the WIP section expanded", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openIndex(page);
  await page.getByRole("button", { name: /^Filters/ }).click();
  const wip = page.locator(".pubs-wip summary");
  if (await wip.count()) await wip.click();
  await page.screenshot({ path: `${SHOTS}/index-panel-open-390-light.png`, fullPage: true });
  expect(await axe(page)).toEqual([]);
});

test("forced colours: zero axe violations on the index and a paper", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  for (const url of ["/publications/", `/publications/${MS_PAPER}/`]) {
    await open(page, url);
    expect(await axe(page), url).toEqual([]);
  }
  await page.screenshot({ path: `${SHOTS}/paper-journal-forced-colors.png`, fullPage: true });
});
