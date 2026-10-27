/**
 * WP2 (editor v2, spec §2, §9): /editor-preview/, the content manager's live
 * preview, driven by posting the protocol's messages to the page itself
 * (src/lib/preview/protocol.ts; the page answers its "parent", which is itself
 * when it is opened on its own). The saved site is built here from content/**
 * with yaml, the way the content manager loads it.
 *
 *   BASE_URL=http://localhost:3100 npx playwright test tests/e2e/editor-preview.spec.ts --project=chromium
 *   BASE_URL=http://127.0.0.1:4180/bobalab-web npx playwright test …   (a served export)
 *
 * BASE_URL may carry the base path. On a preview build (the dev server, or the
 * CI's out-preview), the real pages include drafts with a "Draft" badge and show
 * unverified study plates: the posted site then has every entry published and
 * every plate verified, and the badges are left out of the real page's text.
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const BASE = (process.env.BASE_URL || "http://localhost:3100").replace(/\/+$/, "");
const url = (p: string) => `${BASE}${p}`;
const CONTENT = path.resolve(process.cwd(), process.env.CONTENT_DIR || "content");

type Data = Record<string, unknown>;
type Entry = { slug: string; data: Data };
type Base = Record<string, Entry[]>;
type Msg = Record<string, unknown> & { type: string };

const FOLDERS = ["news", "publications", "people", "directions", "projects", "opportunities"];
const FM = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;

/** The saved site as the content manager's getCollection gives it: {slug, data (+ body)}. */
function readBase(dir: string): { base: Base; publishedSlugs: Record<string, string[]> | null } {
  const base: Base = { pages: [], settings: [] };
  for (const c of FOLDERS) {
    base[c] = fs
      .readdirSync(path.join(dir, c))
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map((f) => {
        const m = FM.exec(fs.readFileSync(path.join(dir, c, f), "utf8"))!;
        const data = (YAML.parse(m[1]!) ?? {}) as Data;
        return { slug: f.replace(/\.md$/, ""), data: { ...data, body: m[2] ?? "" } };
      });
  }
  for (const f of fs.readdirSync(path.join(dir, "pages")).filter((x) => x.endsWith(".yml")))
    base.pages!.push({
      slug: f.replace(/\.yml$/, ""),
      data: YAML.parse(fs.readFileSync(path.join(dir, "pages", f), "utf8")) ?? {},
    });
  base.settings = [
    { slug: "site", data: YAML.parse(fs.readFileSync(path.join(dir, "site.yml"), "utf8")) },
  ];
  const ps = path.join(dir, ".published-slugs.json");
  return {
    base,
    publishedSlugs: fs.existsSync(ps) ? JSON.parse(fs.readFileSync(ps, "utf8")) : null,
  };
}

/** Every entry published and every plate verified (to compare with a preview build). */
function allPublished(base: Base): Base {
  const out: Base = {};
  for (const [c, list] of Object.entries(base))
    out[c] = list.map((e) => ({
      slug: e.slug,
      data:
        c === "settings"
          ? e.data
          : {
              ...e.data,
              draft: false,
              ...(c === "publications" ? { plate_verified: true } : {}),
            },
    }));
  return out;
}

const SAVED = readBase(CONTENT);
const live = (c: string) => SAVED.base[c]!.filter((e) => e.data.draft !== true);
const pick = (c: string, ok: (d: Data) => boolean = () => true) => {
  const e = live(c).find((x) => ok(x.data));
  if (!e) throw new Error(`no ${c} entry for the test`);
  return e;
};
const DIRECTION = pick("directions", (d) => d.status !== "archived");
const PROJECT = pick("projects");
const PUBLICATION = live("publications").find((p) => p.data.doi) ?? pick("publications");
const PI = pick("people", (d) => d.role === "pi" && d.listed === true);
const NEWS = [...live("news")].sort((a, b) =>
  String(b.data.date).localeCompare(String(a.data.date)),
)[0]!;

const TARGETS: Array<{ target: { page: string; slug?: string }; path: string }> = [
  { target: { page: "home" }, path: "/" },
  { target: { page: "research" }, path: "/research/" },
  { target: { page: "direction", slug: DIRECTION.slug }, path: `/research/${DIRECTION.slug}/` },
  { target: { page: "projects" }, path: "/projects/" },
  { target: { page: "project", slug: PROJECT.slug }, path: `/projects/${PROJECT.slug}/` },
  { target: { page: "publications" }, path: "/publications/" },
  {
    target: { page: "publication", slug: PUBLICATION.slug },
    path: `/publications/${PUBLICATION.slug}/`,
  },
  { target: { page: "people" }, path: "/people/" },
  { target: { page: "person", slug: PI.slug }, path: `/people/${PI.slug}/` },
  { target: { page: "news" }, path: "/news/" },
  { target: { page: "news-item", slug: NEWS.slug }, path: `/news/${NEWS.slug}/` },
  { target: { page: "join" }, path: "/join/" },
  { target: { page: "about" }, path: "/about/" },
  { target: { page: "accessibility" }, path: "/accessibility/" },
  { target: { page: "privacy" }, path: "/privacy/" },
];

// ---------------------------------------------------------------------------
// Helpers

/**
 * Console errors, page errors and CSP violations of a page, for the "0 console
 * errors" checks. A CSP violation that the page's code catches (zod's
 * `new Function` probe) is only a securitypolicyviolation event, not a console
 * error, so it is turned into one. Call before the page's first goto.
 */
async function watchErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) =>
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI} in ${e.sourceFile}`),
    );
  });
  return errors;
}

/**
 * Is the site a preview build (drafts shown)? Asked in a page of its own: the
 * home page's router prefetches the header's pages, and leaving it at once
 * cancels them, which WebKit reports as page errors of whatever page asked
 * (MEASURED: the 4 header pages, "due to access control checks").
 */
async function previewBuild(context: BrowserContext): Promise<boolean> {
  const p = await context.newPage();
  try {
    await p.goto(url("/"));
    return await p.evaluate(() => document.documentElement.hasAttribute("data-preview"));
  } finally {
    await p.close();
  }
}

/** Open /editor-preview/ with a recorder of what it posts (and of window.open). */
async function openPreview(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __ep: unknown[]; __opened: string[] };
    w.__ep = [];
    w.__opened = [];
    const mine = ["ready", "rendered", "navigated", "parsed", "checked", "key"];
    window.addEventListener("message", (e) => {
      const d = e.data as { type?: unknown } | null;
      if (d && typeof d.type === "string" && mine.includes(d.type.replace(/^bobalab:/, "")))
        w.__ep.push({ ...d, at: performance.now() });
    });
    window.open = ((u?: string | URL) => {
      w.__opened.push(String(u));
      return null;
    }) as typeof window.open;
  });
  await page.goto(url("/editor-preview/"));
  await page.waitForFunction(() =>
    (window as unknown as { __ep: Msg[] }).__ep.some((m) => m.type === "bobalab:ready"),
  );
}

async function send(page: Page, msg: Msg): Promise<number> {
  return page.evaluate((m) => {
    window.postMessage({ v: 1, ...m }, location.origin);
    return performance.now();
  }, msg);
}

async function count(page: Page, type: string): Promise<number> {
  return page.evaluate(
    (t) => (window as unknown as { __ep: Msg[] }).__ep.filter((m) => m.type === t).length,
    type,
  );
}

/**
 * Send, then wait for the message of `type` that answers it and return it: a
 * render of THIS overlay's rev, a render of THIS page after `navigate`, the
 * reply with this id, else the next one. The preview also posts `rendered`
 * again 400 ms after a render (with the live problems, for the render it had
 * then); that one can arrive between the count and this message, and is never
 * taken for the answer (MEASURED: the WebKit flake "found: absent").
 */
async function sendAndWait(page: Page, msg: Msg, type = "bobalab:rendered"): Promise<Msg> {
  const before = await count(page, type);
  const want: { rev?: number; target?: { page?: string; slug?: string }; id?: string } = {};
  if (msg.type === "bobalab:overlay" && typeof msg.rev === "number") want.rev = msg.rev;
  if (msg.type === "bobalab:navigate") want.target = msg.target as typeof want.target;
  if (typeof msg.id === "string") want.id = msg.id;
  await send(page, msg);
  const answer = await page.waitForFunction(
    ([t, n, w]) => {
      const fresh = (window as unknown as { __ep: Msg[] }).__ep
        .filter((m) => m.type === t)
        .slice(Number(n));
      const target = (m: Msg) => (m.target ?? {}) as { page?: string; slug?: string };
      return (
        fresh.find(
          (m) =>
            (w.rev === undefined || m.rev === w.rev) &&
            (w.id === undefined || m.id === w.id) &&
            (w.target === undefined ||
              (target(m).page === w.target.page &&
                (target(m).slug ?? "") === (w.target.slug ?? ""))),
        ) ?? null
      );
    },
    [type, before, want] as const,
    { timeout: 20_000 },
  );
  return (await answer.jsonValue()) as Msg;
}

async function loadSite(page: Page, opts: { visitor: boolean; base?: Base }) {
  await send(page, { type: "bobalab:mode", visitor: opts.visitor });
  await sendAndWait(page, {
    type: "bobalab:base",
    base: opts.base ?? SAVED.base,
    complete: true,
    publishedSlugs: SAVED.publishedSlugs,
  });
}

const go = (page: Page, target: { page: string; slug?: string }) =>
  sendAndWait(page, { type: "bobalab:navigate", target });

/** Visible text of the site part of a page, with the parts that legitimately differ removed. */
async function siteText(page: Page, root: string, drop: string[]): Promise<string> {
  return page.evaluate(
    ([sel, remove]) => {
      const el = document.querySelector<HTMLElement>(sel as string)!;
      const gone: Array<[Element, string]> = [];
      for (const x of el.querySelectorAll<HTMLElement>(
        (remove as string[]).join(",") || "x-none",
      )) {
        gone.push([x, x.style.display]);
        x.style.display = "none";
      }
      const text = el.innerText.trim();
      for (const [x, d] of gone) (x as HTMLElement).style.display = d;
      return text;
    },
    [root, drop] as const,
  );
}

const STYLE_PROPS = [
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-transform",
  "color",
  "background-color",
  "width",
] as const;

async function styleOf(page: Page, selector: string): Promise<Record<string, string> | null> {
  return page.evaluate(
    ([sel, props]) => {
      const el = document.querySelector(sel as string);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
    },
    [selector, [...STYLE_PROPS] as string[]] as const,
  );
}

const strip = (e: Entry) => e.data;

test.describe.configure({ timeout: 240_000 });

// ---------------------------------------------------------------------------

test.describe("/editor-preview/", () => {
  test("the shell: noindex, no view markup, no marks; standalone notice after 3 s", async ({
    page,
    request,
  }) => {
    const errors = await watchErrors(page);
    const html = await (await request.get(url("/editor-preview/"))).text();
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    expect(html).not.toContain("data-entry");
    expect(html).toContain("Loading the site…");
    const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? "";
    expect(main).not.toMatch(/<h1|data-entry|ep-page/);
    expect(main).toMatch(/class="ep-standalone" hidden/);

    await page.goto(url("/editor-preview/"));
    await expect(page.locator(".ep-loading")).toBeVisible();
    await expect(page.locator(".ep-standalone")).toBeHidden();
    await expect(page.locator(".ep-standalone")).toBeVisible({ timeout: 6000 });
    await expect(page.locator(".ep-standalone h1")).toHaveText("Content manager preview");
    await expect(page.locator(".ep-standalone p")).toHaveText(
      "This page shows the content manager’s live preview. Open it from the content manager.",
    );
    // Only the notice: no "Loading the site…" and no grey skeleton next to it.
    await expect(page.locator(".ep-loading")).toHaveCount(0);
    await expect(page.locator(".ep-skeleton")).toHaveCount(0);
    await expect(page.locator("h1")).toHaveCount(1);
    // The layout's own footer is hidden; the preview draws its own once the site arrives.
    await expect(page.locator("body > .bl-footer")).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("no standalone notice when a parent posts within 3 s; loading progress", async ({
    page,
  }) => {
    const errors = await watchErrors(page);
    await openPreview(page);
    await send(page, { type: "bobalab:mode", visitor: false });
    await send(page, { type: "bobalab:loading", done: 3, total: 8 });
    await expect(page.locator(".ep-loading")).toHaveText("Loading the site… (3 of 8)");
    await page.waitForTimeout(3500);
    await expect(page.locator(".ep-standalone")).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("main text is identical to the real page for all 15 page types (visitor view)", async ({
    page,
    context,
  }) => {
    const errors = await watchErrors(page);
    const preview = await previewBuild(context);
    const real = await context.newPage();
    const realErrors = await watchErrors(real);
    await openPreview(page);
    await loadSite(page, { visitor: true, base: preview ? allPublished(SAVED.base) : undefined });
    const dropReal = [".bl-draft-line", ".bl-badge--draft", ".plate-draft", ".pub-cite"];
    for (const { target, path: p } of TARGETS) {
      await real.goto(url(p));
      await real.waitForLoadState("networkidle");
      const expected = await siteText(real, "main", dropReal);
      expect(expected.length, `${p}: real page text`).toBeGreaterThan(200);
      const r = await go(page, target);
      expect(r.target).toEqual(target);
      await page.waitForTimeout(150);
      const got = await siteText(page, ".ep-page", [".ep-cite"]);
      expect(got, `${p}: preview text`).toBe(expected);
      expect(r.path).toBe(p);
      expect(r.title).toBe((await real.locator("main h1").first().innerText()).trim());
    }
    expect(errors).toEqual([]);
    expect(realErrors).toEqual([]);
  });

  test("computed styles match the real page on Home, People and a direction page", async ({
    page,
    context,
  }) => {
    const preview = await previewBuild(context);
    const real = await context.newPage();
    await openPreview(page);
    await loadSite(page, { visitor: true, base: preview ? allPublished(SAVED.base) : undefined });
    const cases = [
      { target: { page: "home" }, path: "/", card: ".hm-face", text: "main p" },
      { target: { page: "people" }, path: "/people/", card: ".pp-card", text: "main p" },
      {
        target: { page: "direction", slug: DIRECTION.slug },
        path: `/research/${DIRECTION.slug}/`,
        card: ".dr-rail__list > li",
        text: "main p",
      },
    ];
    for (const c of cases) {
      await real.goto(url(c.path));
      await real.waitForLoadState("networkidle");
      await go(page, c.target);
      await page.waitForTimeout(150);
      for (const sel of ["h1", c.text, c.card]) {
        const want = await styleOf(real, `main ${sel.replace(/^main /, "")}`);
        const got = await styleOf(page, `.ep-page ${sel.replace(/^main /, "")}`);
        expect(want, `${c.path} ${sel} exists`).not.toBeNull();
        expect(got, `${c.path} ${sel}`).toEqual(want);
      }
    }
  });

  test("an edit renders in under 500 ms, and the edited entry is highlighted on a list page", async ({
    page,
  }) => {
    const errors = await watchErrors(page);
    await openPreview(page);
    await loadSite(page, { visitor: false });
    await go(page, { page: "news" });
    const times: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const title = `Edited headline number ${i}`;
      const sentAt = await send(page, {
        type: "bobalab:overlay",
        rev: i,
        entry: { collection: "news", slug: NEWS.slug },
        isNew: false,
        data: { ...strip(NEWS), title },
      });
      await page.waitForFunction(
        (rev) =>
          (window as unknown as { __ep: Msg[] }).__ep.some(
            (m) => m.type === "bobalab:rendered" && m.rev === rev,
          ),
        i,
      );
      const at = await page.evaluate(
        (rev) =>
          (window as unknown as { __ep: Array<Msg & { at: number }> }).__ep.find(
            (m) => m.type === "bobalab:rendered" && m.rev === rev,
          )!.at,
        i,
      );
      times.push(at - sentAt);
      await expect(page.locator(".ep-page")).toContainText(title);
    }
    expect(
      Math.max(...times),
      `render times ${times.map((t) => t.toFixed(0)).join(", ")} ms`,
    ).toBeLessThan(500);
    const marked = page.locator(`[data-entry="news/${NEWS.slug}"][data-ep-editing="Editing"]`);
    await expect(marked.first()).toBeVisible();
    const last = await page.evaluate(() =>
      (window as unknown as { __ep: Msg[] }).__ep
        .filter((m) => m.type === "bobalab:rendered")
        .at(-1),
    );
    expect(last!.found).toBe("marker");
    // No highlight on the entry's own page.
    const own = await go(page, { page: "news-item", slug: NEWS.slug });
    expect(own.found).toBe("page");
    await expect(page.locator("[data-ep-editing]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("a new entry with only a title renders with placeholders; Still needed lists the rest", async ({
    page,
  }) => {
    const errors = await watchErrors(page);
    await openPreview(page);
    await loadSite(page, { visitor: false });
    await go(page, { page: "news" });
    const r = await sendAndWait(page, {
      type: "bobalab:overlay",
      rev: 1,
      entry: { collection: "news", slug: "" },
      isNew: true,
      data: { title: "A brand new lab announcement", body: "" },
    });
    expect(r.found).toBe("marker");
    await expect(page.locator(".ep-page")).toContainText("A brand new lab announcement");
    await expect(page.locator('[data-ep-editing="New · not saved yet"]').first()).toBeVisible();
    // 400 ms later the problems arrive: the missing date and type are still needed.
    const withProblems = await page.waitForFunction(() => {
      const r = (window as unknown as { __ep: Msg[] }).__ep
        .filter((m) => m.type === "bobalab:rendered" && m.rev === 1)
        .at(-1) as { problems: { stillNeeded: Array<{ field?: string }> } } | undefined;
      return r && r.problems.stillNeeded.length ? r.problems.stillNeeded.map((i) => i.field) : null;
    });
    expect(await withProblems.jsonValue()).toEqual(expect.arrayContaining(["date", "type"]));
    expect(errors).toEqual([]);
  });

  test("an invalid edit keeps the last good render", async ({ page }) => {
    const errors = await watchErrors(page);
    await openPreview(page);
    await loadSite(page, { visitor: false });
    await go(page, { page: "news-item", slug: NEWS.slug });
    await sendAndWait(page, {
      type: "bobalab:overlay",
      rev: 1,
      entry: { collection: "news", slug: NEWS.slug },
      isNew: false,
      data: { ...strip(NEWS), title: "A good title", summary: "A good summary." },
    });
    await expect(page.locator(".ep-page h1")).toHaveText("A good title");
    const datetime = await page.locator(".ep-page time").first().getAttribute("datetime");
    const r = await sendAndWait(page, {
      type: "bobalab:overlay",
      rev: 2,
      entry: { collection: "news", slug: NEWS.slug },
      isNew: false,
      data: {
        ...strip(NEWS),
        title: "x".repeat(400),
        date: "2026-13-45",
        summary: "A good summary.",
      },
    });
    expect(r.rev).toBe(2);
    expect(r.renderError).toBeUndefined();
    await expect(page.locator(".ep-page h1")).toHaveText("A good title");
    await expect(page.locator(".ep-page time").first()).toHaveAttribute("datetime", datetime!);
    await expect(page.locator(".ep-page")).toContainText("A good summary.");
    expect(errors).toEqual([]);
  });

  test("links stay inside the preview; other sites open in a new tab", async ({ page }) => {
    const errors = await watchErrors(page);
    await openPreview(page);
    await loadSite(page, { visitor: false });
    await go(page, { page: "people" });
    const before = await count(page, "bobalab:navigated");
    await page.locator(`.ep-page a[href$="/people/${PI.slug}/"]`).first().click();
    await page.waitForFunction(
      (n) =>
        (window as unknown as { __ep: Msg[] }).__ep.filter((m) => m.type === "bobalab:navigated")
          .length > n,
      before,
    );
    const nav = await page.evaluate(() =>
      (window as unknown as { __ep: Msg[] }).__ep
        .filter((m) => m.type === "bobalab:navigated")
        .at(-1),
    );
    expect(nav).toMatchObject({
      target: { page: "person", slug: PI.slug },
      path: `/people/${PI.slug}/`,
    });
    await expect(page.locator(".ep-page h1")).toContainText(String(PI.data.name));
    expect(new URL(page.url()).pathname).toMatch(/\/editor-preview\/$/);
    // The static header's links are intercepted too.
    await page.locator('header a[href$="/research/"]').first().click();
    await expect(page.locator(".ep-page h1").first()).toBeVisible();
    expect(new URL(page.url()).pathname).toMatch(/\/editor-preview\/$/);
    const external = page.locator('.ep-root a[href^="https://"]').first();
    const href = await external.getAttribute("href");
    await external.click();
    expect(
      await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened),
    ).toContain(href);
    expect(new URL(page.url()).pathname).toMatch(/\/editor-preview\/$/);
    expect(errors).toEqual([]);
  });

  test("Settings: the footer follows edits; an unsaved image shows as a data URL", async ({
    page,
  }) => {
    const errors = await watchErrors(page);
    await openPreview(page);
    await loadSite(page, { visitor: false });
    await go(page, { page: "people" });
    await sendAndWait(page, {
      type: "bobalab:overlay",
      rev: 1,
      entry: { collection: "settings", slug: "site" },
      isNew: false,
      data: { ...SAVED.base.settings![0]!.data, email: "edited-footer@berkeley.edu" },
    });
    await expect(page.locator(".ep-root > footer")).toContainText("edited-footer@berkeley.edu");
    await expect(page.locator("body > .bl-footer")).toBeHidden();

    const person = live("people").find(
      (p) => p.data.listed === true && p.data.photo_consent === true && p.data.photo,
    )!;
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const t0 = Date.now();
    await send(page, { type: "bobalab:assets", assets: { [String(person.data.photo)]: png } });
    await expect(page.locator(`.ep-page img[src="${png}"]`).first()).toBeAttached({
      timeout: 1000,
    });
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(errors).toEqual([]);
  });

  test("Ctrl+S posts `key`; Find scrolls to, flashes and focuses the entry", async ({ page }) => {
    const errors = await watchErrors(page);
    await openPreview(page);
    await loadSite(page, { visitor: false });
    await go(page, { page: "people" });
    const person = live("people")
      .filter((p) => p.data.listed === true)
      .at(-1)!;
    await sendAndWait(page, {
      type: "bobalab:overlay",
      rev: 1,
      entry: { collection: "people", slug: person.slug },
      isNew: false,
      data: strip(person),
    });
    await page.locator(".ep-page h1").first().click();
    const before = await count(page, "bobalab:key");
    await page.keyboard.press("Control+s");
    await page.waitForFunction(
      (n) =>
        (window as unknown as { __ep: Msg[] }).__ep.filter((m) => m.type === "bobalab:key").length >
        n,
      before,
    );
    await send(page, { type: "bobalab:find" });
    const mark = page.locator(`[data-entry="people/${person.slug}"]`).first();
    await expect(mark).toHaveClass(/ep-flash/);
    await expect(mark).toBeFocused();
    await expect(mark).toBeInViewport();
    expect(errors).toEqual([]);
  });

  test("services: parse answers with the file's data; check blocks a duplicate title in another file", async ({
    page,
  }) => {
    const errors = await watchErrors(page);
    await openPreview(page);
    await loadSite(page, { visitor: false });
    const file = fs.readFileSync(path.join(CONTENT, "news", `${NEWS.slug}.md`), "utf8");
    const parsed = await sendAndWait(
      page,
      { type: "bobalab:parse", id: "p1", path: `content/news/${NEWS.slug}.md`, text: file },
      "bobalab:parsed",
    );
    expect(parsed).toMatchObject({ id: "p1", ok: true, data: { title: NEWS.data.title } });
    const pubs = live("publications");
    const [a, b] = [pubs[0]!, pubs[1]!];
    const checked = await sendAndWait(
      page,
      {
        type: "bobalab:check",
        id: "c1",
        entry: { collection: "publications", slug: b.slug },
        isNew: false,
        data: { ...strip(b), title: a.data.title },
      },
      "bobalab:checked",
    );
    expect(checked.available).toBe(true);
    const blocking = checked.blocking as Array<{ code: string; file: string; message: string }>;
    expect(blocking.map((i) => i.code)).toContain("E_DUP_TITLE");
    expect(blocking.map((i) => `${i.file} ${i.message}`).join(" ")).toContain(
      `publications/${a.slug}.md`,
    );
    const unchanged = await sendAndWait(
      page,
      {
        type: "bobalab:check",
        id: "c2",
        entry: { collection: "publications", slug: b.slug },
        isNew: false,
        data: strip(b),
      },
      "bobalab:checked",
    );
    expect(unchanged).toMatchObject({ id: "c2", available: true, blocking: [] });
    expect(errors).toEqual([]);
  });
});
