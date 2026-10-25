/**
 * WP5: Join, About, Accessibility, Privacy and the 404 page (brief §D11–§D12,
 * DECISIONS D-05). Runs against BASE_URL (default: the shared dev server at
 * http://localhost:3100, which includes drafts = preview mode).
 *
 *   npx playwright test tests/e2e/pages.spec.ts
 *
 * Expectations are derived from the content directory (preview mode, like the
 * dev server), so they follow content edits. Screenshots: test-results/WP5/.
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { buildContent, loadRawContent } from "../../src/lib/content/load";
import { formatDate } from "../../src/lib/content/dates";
import { INTRO_STORAGE_KEY, MOTION_STORAGE_KEY } from "../../src/lib/site/motion";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SHOTS = "test-results/WP5";
const CONTENT_DIR = path.resolve(process.cwd(), process.env.CONTENT_DIR || "content");
const content = () => buildContent(loadRawContent(CONTENT_DIR), { preview: true });

const ROUTES = [
  { name: "join", path: "/join/" },
  { name: "about", path: "/about/" },
  { name: "accessibility", path: "/accessibility/" },
  { name: "privacy", path: "/privacy/" },
  { name: "404", path: "/this-page-does-not-exist/" },
] as const;

async function open(page: Page, url: string) {
  const res = await page.goto(url);
  await page.waitForLoadState("networkidle");
  return res;
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return r.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s): ${v.nodes[0]?.target.join(" ")}`,
  );
}

const mailtoAddress = (href: string) =>
  decodeURIComponent(href.replace(/^mailto:/, "").split("?")[0]!);

// ---------------------------------------------------------------------------
// Join

test.describe("Join", () => {
  test("three audiences, opportunities with status and as-of dates, mailto links", async ({
    page,
  }) => {
    const c = content();
    await open(page, "/join/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Join the lab");
    for (const [id, title] of [
      ["students", "Students & research assistants"],
      ["partners", "Partners & data collaborators"],
      ["press", "Press"],
    ] as const) {
      await expect(page.locator(`h2#${id}`)).toHaveText(title);
      await expect(page.locator(`nav[aria-label="On this page"] a[href="#${id}"]`)).toBeVisible();
    }

    // Every opportunity in content is shown with its status and as-of date; nothing else.
    const cards = page.locator("article.pg-opp");
    await expect(cards).toHaveCount(c.opportunities.length);
    for (const o of c.opportunities) {
      const card = page.locator(`article[aria-labelledby="opp-${o.slug}"]`);
      await expect(card.locator("h3")).toHaveText(o.title);
      const status = card.locator(".pg-opp__status");
      const label = o.isOpen
        ? o.status === "rolling"
          ? "Open, rolling"
          : "Open"
        : o.status === "unknown"
          ? "Status not confirmed"
          : "Closed";
      await expect(status).toContainText(label);
      if (o.as_of) await expect(status).toContainText(`as of ${formatDate(o.as_of)}`);
      if (!o.closes_on) await expect(status).not.toContainText("Closes");
      // "Apply" only while open.
      await expect(card.getByRole("link", { name: /^Apply/ })).toHaveCount(
        o.isOpen && o.apply_url ? 1 : 0,
      );
      if (o.route) {
        // The route is shown verbatim, after a short label ("How to join:").
        await expect(card.locator(".pg-opp__route-text")).toHaveText(o.route);
        await expect(card.locator(".pg-opp__label")).toHaveText(/^(How to join|Next step):$/);
      }
    }
    // D-13 item 7: the hedge is said once. Unconfirmed rows show a dash (screen
    // readers hear "Status not confirmed" in the row) and one footnote explains it;
    // a shared "as of" date is stated once in that footnote.
    const unconfirmed = c.opportunities.filter((o) => !o.isOpen && o.status === "unknown");
    const shownHedges = await page.locator("main").evaluate((main) => {
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      const hits: string[] = [];
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.includes("Status not confirmed")) continue;
        if (!n.parentElement?.closest(".vh")) hits.push(n.parentElement?.className ?? "");
      }
      return hits;
    });
    expect(shownHedges, "visible 'Status not confirmed'").toEqual([]);
    expect(await page.locator("main .vh", { hasText: "Status not confirmed" }).count()).toBe(
      unconfirmed.length,
    );
    const note = page.locator("#join-note");
    const asOf = [...new Set(c.opportunities.map((o) => o.as_of ?? ""))];
    const shared = c.opportunities.length > 0 && asOf.length === 1 && Boolean(asOf[0]);
    await expect(note).toHaveCount(unconfirmed.length || shared ? 1 : 0);
    if (unconfirmed.length) await expect(note).toContainText("A dash marks");
    if (shared) {
      await expect(note).toContainText(`Statuses as of ${formatDate(asOf[0])}`);
    }
    // The ledger has no card boxes: rows are ruled, not bordered.
    if (c.opportunities.length) {
      const box = await page
        .locator("article.pg-opp")
        .first()
        .evaluate((el) => getComputedStyle(el).borderLeftWidth);
      expect(box).toBe("0px");
    }

    // The audience a card sits in matches its content audience.
    for (const o of c.opportunities) {
      const section =
        o.audience === "partners" ? "partners" : o.audience === "press" ? "press" : "students";
      await expect(
        page.locator(
          `section[aria-labelledby="${section}"] article[aria-labelledby="opp-${o.slug}"]`,
        ),
      ).toHaveCount(1);
    }

    // Email links are real mailto: links to addresses from content.
    const allowed = new Set([
      c.site.email,
      ...c.opportunities.flatMap((o) => (o.email ? [o.email] : [])),
    ]);
    const mailtos = await page
      .locator('main a[href^="mailto:"]')
      .evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
    expect(mailtos.length).toBeGreaterThan(0);
    for (const href of mailtos) expect(allowed.has(mailtoAddress(href))).toBe(true);
    // Each audience section offers the lab address.
    for (const id of ["students", "partners", "press"]) {
      await expect(
        page.locator(`section[aria-labelledby="${id}"] a[href^="mailto:${c.site.email}"]`).first(),
      ).toBeVisible();
    }
  });

  test("draft items carry the draft badge in preview", async ({ page }) => {
    const c = content();
    await open(page, "/join/");
    for (const o of c.opportunities.filter((x) => x.draft)) {
      await expect(
        page.locator(`article[aria-labelledby="opp-${o.slug}"] .bl-badge--draft`),
      ).toHaveText("Draft · pending lab review");
    }
  });
});

test.describe("Label-column grid", () => {
  test("section titles sit in the label column, left of their content (1366 px)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    for (const url of ["/join/", "/about/", "/this-page-does-not-exist/"]) {
      await open(page, url);
      const h1 = await page.locator("main h1").boundingBox();
      const rows = page.locator("main .pg-row");
      const n = await rows.count();
      expect(n, url).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        const label = await rows.nth(i).locator(".pg-row__label h2").boundingBox();
        const content = await rows
          .nth(i)
          .locator(":scope > :not(.pg-row__label)")
          .first()
          .boundingBox();
        expect(label!.x + label!.width, url).toBeLessThanOrEqual(content!.x);
        // The track starts where the h1 starts: one alignment system.
        expect(Math.abs(content!.x - h1!.x), url).toBeLessThanOrEqual(1);
      }
    }
  });

  test("no eyebrows, pills or boxed panels on the WP5 pages", async ({ page }) => {
    for (const r of ROUTES) {
      await open(page, r.path);
      const offenders = await page.locator("main *").evaluateAll((els) =>
        els
          .filter((el) => {
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            const bordered = ["Top", "Right", "Bottom", "Left"].every(
              (s) => cs.getPropertyValue(`border-${s.toLowerCase()}-width`) !== "0px",
            );
            const tracked =
              cs.textTransform === "uppercase" && parseFloat(cs.letterSpacing || "0") > 0.3;
            return (bordered && r.height > 0 && el.tagName !== "INPUT") || tracked;
          })
          .map((el) => `${el.tagName}.${el.className}`),
      );
      expect(offenders, r.path).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// About

test.describe("About", () => {
  test("mission, PI summary, affiliation, address and email from content", async ({ page }) => {
    const c = content();
    const pi = c.people.find((p) => p.role === "pi");
    await open(page, "/about/");
    await expect(page.locator("h1")).toHaveCount(1);
    if (c.pages.about?.title) await expect(page.locator("h1")).toHaveText(c.pages.about.title);
    if (c.pages.home?.mission) {
      await expect(page.locator(".pg-mission__text")).toHaveText(c.pages.home.mission.trim());
    }
    const facts = page.locator(".pg-facts");
    await expect(facts).toContainText(c.site.long_name);
    await expect(facts).toContainText(c.site.affiliation_text);
    await expect(facts.locator("address")).toHaveText(c.site.address);
    await expect(facts.locator(`a[href="mailto:${c.site.email}"]`)).toHaveText(c.site.email);
    if (pi) {
      await expect(facts.getByRole("link", { name: pi.name })).toHaveAttribute(
        "href",
        `/people/${pi.slug}/`,
      );
      if (pi.title) await expect(facts).toContainText(pi.title);
    }
    // The Haas faculty profile is linked from the page (body or fact sheet).
    const haas = await page.locator('main a[href^="https://haas.berkeley.edu/faculty/"]').count();
    const haasInContent =
      (c.pages.about?.body ?? "").includes("haas.berkeley.edu/faculty/") ||
      Boolean((pi?.links as Record<string, string | undefined> | undefined)?.haas);
    expect(haas > 0).toBe(haasInContent);

    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const org = ld.map((t) => JSON.parse(t)).find((j) => j["@type"] === "ResearchOrganization");
    expect(org?.name).toBe(c.site.name);
    expect(org?.email).toBe(c.site.email);
  });
});

// ---------------------------------------------------------------------------
// Statements

test.describe("Statements", () => {
  test("accessibility statement: WCAG 2.2 AA target, limits, how to report, contact", async ({
    page,
  }) => {
    const c = content();
    await open(page, "/accessibility/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(`main a[href^="mailto:${c.site.email}"]`).first()).toBeVisible();
    if (c.pages.accessibility?.body) {
      await expect(page.locator("main")).toContainText("WCAG");
      await expect(page.locator("main")).toContainText("2.2");
    }
  });

  test("privacy statement: storage keys match the code, contact", async ({ page }) => {
    const c = content();
    await open(page, "/privacy/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(`main a[href^="mailto:${c.site.email}"]`).first()).toBeVisible();
    if (c.pages.privacy?.body) {
      const main = page.locator("main");
      await expect(main).toContainText("localStorage");
      await expect(main).toContainText("sessionStorage");
      // The statement names the exact keys the site uses (src/lib/site/motion.ts).
      await expect(main).toContainText(MOTION_STORAGE_KEY);
      await expect(main).toContainText(INTRO_STORAGE_KEY);
    }
  });

  test("this site sets no cookies", async ({ page, context }) => {
    for (const r of ROUTES) await open(page, r.path);
    expect(await context.cookies()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 404

test.describe("Not found", () => {
  test("404 status, one <title>, the only pun, a link home and the directions", async ({
    page,
  }) => {
    const c = content();
    const res = await open(page, "/this-page-does-not-exist/");
    expect(res?.status()).toBe(404);
    const html = await res!.text();
    expect(html.match(/<title[\s>]/g)?.length).toBe(1);
    expect(await page.title()).toBe("Page not found · BOBALAB".replace("BOBALAB", c.site.name));
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator("h1")).toHaveText("This page got stuck in the straw");
    expect((await page.locator("main").innerText()).match(/straw/gi)?.length).toBe(1);
    await expect(page.locator('main a[href="/"]')).toBeVisible();
    const dirLinks = page.locator(".pg-dirs a");
    await expect(dirLinks).toHaveCount(c.directions.length);
    for (const d of c.directions) {
      await expect(page.locator(`.pg-dirs a[href="/research/${d.slug}/"]`)).toContainText(d.title);
    }
  });

  test("direction segments sit on the title's x-height, not on its baseline like an underscore", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await open(page, "/this-page-does-not-exist/");
    const rows = page.locator(".pg-dirs a");
    for (let i = 0; i < (await rows.count()); i++) {
      const seg = await rows.nth(i).locator(".bl-seg").boundingBox();
      const title = await rows
        .nth(i)
        .locator(".pg-dirs__title")
        .evaluate((el) => {
          const r = el.getClientRects()[0]!; // first line of the title
          return { top: r.top + scrollY, bottom: r.bottom + scrollY };
        });
      const mid = seg!.y + seg!.height / 2;
      // Between 30 % and 70 % of the first line box (an underscore sits at about 80 %).
      const rel = (mid - title.top) / (title.bottom - title.top);
      expect(rel, `row ${i}`).toBeGreaterThan(0.3);
      expect(rel, `row ${i}`).toBeLessThan(0.7);
    }
  });

  test("on phones the 'Page not found' label follows the h1 (no eyebrow above it)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "/this-page-does-not-exist/");
    const h1 = await page.locator("main h1").boundingBox();
    const label = await page.locator(".pg-head__side", { hasText: "Page not found" }).boundingBox();
    expect(label!.y).toBeGreaterThanOrEqual(h1!.y + h1!.height);
    // Desktop keeps it in the label column, level with the h1.
    await page.setViewportSize({ width: 1366, height: 768 });
    const h1d = await page.locator("main h1").boundingBox();
    const labeld = await page
      .locator(".pg-head__side", { hasText: "Page not found" })
      .boundingBox();
    expect(labeld!.x + labeld!.width).toBeLessThanOrEqual(h1d!.x);
    expect(Math.abs(labeld!.y - h1d!.y)).toBeLessThan(24);
  });

  test("the pun appears on no other WP5 page", async ({ page }) => {
    for (const r of ROUTES.filter((x) => x.name !== "404")) {
      await open(page, r.path);
      expect(await page.locator("main").innerText()).not.toMatch(/straw/i);
    }
  });
});

// ---------------------------------------------------------------------------
// Structure, accessibility and visual QA for every route

for (const r of ROUTES) {
  test.describe(`${r.name} page`, () => {
    test("one h1 (focus target), landmarks, no horizontal scroll at 320 px", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await open(page, r.path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main h1")).toHaveAttribute("tabindex", "-1");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    for (const scheme of ["light", "dark"] as const) {
      test(`zero axe violations and screenshots (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        for (const [w, h] of [
          [1366, 768],
          [390, 844],
        ] as const) {
          await page.setViewportSize({ width: w, height: h });
          await open(page, r.path);
          await page.screenshot({ path: `${SHOTS}/${r.name}-${w}-${scheme}.png`, fullPage: true });
          expect(await axe(page), `${r.path} at ${w}px`).toEqual([]);
        }
      });
    }
  });
}

/**
 * Production empty states: tests/unit/feed/production-render.test.tsx renders
 * each page with drafts excluded (as `npm run build` will) and saves the
 * markup; it is swapped into the live page here to check layout and contrast.
 */
test.describe("production rendering (drafts excluded)", () => {
  for (const name of ["join", "about", "accessibility", "privacy", "404"] as const) {
    test(`${name}: layout and axe in light and dark`, async ({ page }) => {
      const file = path.join(process.cwd(), SHOTS, `prod-${name}.html`);
      test.skip(!fs.existsSync(file), "run the unit tests first (vitest tests/unit/feed)");
      const html = fs.readFileSync(file, "utf8");
      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        for (const [w, h] of [
          [1366, 768],
          [390, 844],
        ] as const) {
          await page.setViewportSize({ width: w, height: h });
          await open(page, ROUTES.find((r) => r.name === name)!.path);
          await page.evaluate((markup) => {
            document.querySelector("main")!.innerHTML = markup;
            document.querySelector(".bl-preview")?.remove();
          }, html);
          await page.screenshot({
            path: `${SHOTS}/prod-${name}-${w}-${scheme}.png`,
            fullPage: true,
          });
          expect(await axe(page), `${name} at ${w}px (${scheme})`).toEqual([]);
        }
      }
    });
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("every WP5 page renders its h1 and contact from static HTML", async ({ page }) => {
    const c = content();
    for (const r of ROUTES) {
      await page.goto(r.path);
      await expect(page.locator("main h1"), r.path).toHaveCount(1);
      if (r.name !== "404") {
        await expect(page.locator(`main a[href^="mailto:${c.site.email}"]`).first()).toBeVisible();
      }
    }
  });
});
