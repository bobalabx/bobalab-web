/**
 * WP6: the local no-account CMS demo, end to end (brief §I WP6 #4, #5; §F4).
 *
 * Needs a `next dev` server serving public/ (BASE_URL, default the shared dev
 * server on :3100). The spec itself:
 *  1. writes the git-ignored local files (public/admin/config.local.yml, local.html)
 *     and starts decap-server on :8081 (MODE=fs, writing into this checkout);
 *  2. measures the admin CSP: without 'unsafe-eval' Decap cannot start;
 *  3. creates a news item "CMS smoke test (delete me)" in the CMS UI, checks the
 *     Markdown file in content/news/, that it passes the content schema, that
 *     /news/ and its detail page show it, and that a production build would
 *     include it (the news route's generateStaticParams input in production
 *     mode; `next build` itself is run by CI); then deletes the file;
 *  4. checks the rich-text body fix (cms-widgets.js): opening an entry does not
 *     mark it changed, a real edit does, undoing it does not;
 *  5. checks the file-name guard (cms-hooks.js): a publication whose first
 *     author's name is too long for the 60-character address is not saved, the
 *     PI's name with a long title is, within 60 characters;
 *  6. checks the editor at phone widths (no sideways scrolling, account menu reachable);
 *  7. takes screenshots (1366×768, 390×844; light and dark) and runs axe;
 *  8. checks the verification fixes (Direction order remove/reorder/names, the
 *     stale-editor reload, "required when …" and colour checks, focus rings,
 *     conditional labels, no framing) against a SCRATCH COPY of content/ served
 *     by a second decap-server on :8088, so these saves never touch this checkout;
 * and ALWAYS cleans up (smoke files, local files, probe page, decap-server), also on failure.
 *
 *   npx playwright test tests/e2e/cms-local.spec.ts
 * Screenshots and axe results: test-results/WP6/.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { parseContentFiles } from "../../src/lib/content/read";
import { getContent } from "../../src/lib/content/load";
import { staticParams, staticSlugs } from "../../src/lib/content/queries";
import { SLUG_PATTERNS } from "../../src/lib/content/schema";

test.describe.configure({ mode: "serial" });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const NEWS_DIR = path.join(ROOT, "content", "news");
const PUBS_DIR = path.join(ROOT, "content", "publications");
const ADMIN_DIR = path.join(ROOT, "public", "admin");
const OUT = path.join(ROOT, "test-results", "WP6");
const PROXY_PORT = 8081;
const TITLE = "CMS smoke test (delete me)";
const SLUG_PART = "cms-smoke-test";
const PROBE = "_csp-probe.html";
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

let proxy: ChildProcess | null = null;
let proxyLog = "";

const smokeFiles = (dir = NEWS_DIR) =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.includes(SLUG_PART)) : [];

function removeSmokeFiles() {
  for (const dir of [NEWS_DIR, PUBS_DIR])
    for (const f of smokeFiles(dir)) fs.rmSync(path.join(dir, f), { force: true });
}

function killTree(child: ChildProcess | null) {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
  else child.kill("SIGTERM");
}

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: "127.0.0.1" });
    s.once("connect", () => {
      s.end();
      resolve(true);
    });
    s.once("error", () => resolve(false));
  });
}

async function waitForPort(port: number, ms: number) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await portOpen(port)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`decap-server did not open port ${port}:\n${proxyLog}`);
}

function node(args: string[]) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`node ${args.join(" ")} failed:\n${r.stderr}`);
}

async function login(page: Page) {
  await page.goto("/admin/local.html");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Collections" })).toBeVisible({ timeout: 30_000 });
}

async function publish(page: Page) {
  await page.getByRole("button", { name: "Publish" }).first().click();
  await page.getByText("Publish now", { exact: true }).click();
}

/** Open one entry in a fresh tab (the session lives in the context's storage). */
async function openEntry(page: Page, collection: string, slug: string) {
  const tab = await page.context().newPage();
  const size = page.viewportSize();
  if (size) await tab.setViewportSize(size);
  tab.on("dialog", (d) => d.accept().catch(() => {}));
  await tab.goto(`/admin/local.html#/collections/${collection}/entries/${slug}`);
  await expect(tab.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
  return tab;
}

async function axe(page: Page, name: string) {
  const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const rows = r.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    // Violations inside the preview iframe come from our templates; the rest from Decap's UI.
    where: v.nodes.some((n) => n.target.length > 1) ? "preview-iframe" : "decap-ui",
    first: v.nodes[0]?.target.join(" ⟶ "),
  }));
  fs.writeFileSync(path.join(OUT, `axe-${name}.json`), JSON.stringify(rows, null, 2));
  return rows;
}

test.beforeAll(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  removeSmokeFiles(); // leftovers from an interrupted earlier run
  node(["scripts/cms/build-config.mjs", "--local"]);
  if (await portOpen(PROXY_PORT))
    throw new Error(`port ${PROXY_PORT} is busy (another decap-server?)`);
  proxy = spawn(
    process.execPath,
    [path.join(ROOT, "node_modules", "decap-server", "dist", "index.js")],
    {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PROXY_PORT), MODE: "fs", GIT_REPO_DIRECTORY: ROOT },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  proxy.stdout?.on("data", (d) => (proxyLog += d));
  proxy.stderr?.on("data", (d) => (proxyLog += d));
  await waitForPort(PROXY_PORT, 30_000);
});

test.afterAll(() => {
  removeSmokeFiles();
  fs.rmSync(path.join(ADMIN_DIR, PROBE), { force: true });
  killTree(proxy);
  proxy = null;
  try {
    node(["scripts/cms/build-config.mjs", "--clean-local"]);
  } catch {
    /* best effort */
  }
});

test.beforeEach(async ({ request }) => {
  const res = await request.get("/admin/local.html");
  test.skip(res.status() === 404, "needs a dev server that serves public/ (not a static export)");
});

test("CSP: Decap 3.17.1 needs 'unsafe-eval'; the generated policy lets it start", async ({
  page,
}) => {
  const local = fs.readFileSync(path.join(ADMIN_DIR, "local.html"), "utf8");
  expect(local).toContain("'unsafe-eval'");
  fs.writeFileSync(path.join(ADMIN_DIR, PROBE), local.replace(" 'unsafe-eval'", ""));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e?.message ?? e)));
  await page.goto(`/admin/${PROBE}`);
  await expect(page.getByText("Error loading the CMS configuration")).toBeVisible({
    timeout: 30_000,
  });
  expect(errors.join("\n")).toMatch(/unsafe-eval/);
  fs.rmSync(path.join(ADMIN_DIR, PROBE), { force: true });

  const page2 = await page.context().newPage();
  page2.on("dialog", (d) => d.accept().catch(() => {}));
  const cspErrors: string[] = [];
  page2.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy/i.test(m.text())) cspErrors.push(m.text());
  });
  const offOrigin: string[] = [];
  page2.on("request", (r) => {
    const u = new URL(r.url());
    if (
      !["localhost:3100", `localhost:${PROXY_PORT}`].includes(u.host) &&
      !/^(data|blob):/.test(r.url())
    )
      offOrigin.push(r.url());
  });
  // Every violation, also inside the preview iframe (it inherits the page's policy).
  await page2.addInitScript(() => {
    const w = window as unknown as { __csp?: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      w.__csp!.push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  await login(page2);
  // The flows an editor uses: a new entry, entries with their previews, the media library.
  await page2.goto("/admin/local.html#/collections/news/new");
  await expect(page2.getByLabel("Title", { exact: true })).toBeVisible({ timeout: 30_000 });
  for (const hash of [
    "#/collections/news/entries/2026-05-11-learning-to-gig-revision",
    "#/collections/people/entries/park-sinchaisri",
    "#/collections/directions/entries/algorithmic-advice",
  ]) {
    await page2.goto(`/admin/local.html${hash}`);
    await expect(page2.frameLocator("iframe").first().locator(".cms-preview")).toBeVisible({
      timeout: 30_000,
    });
  }
  await page2.goto("/admin/local.html#/collections/news");
  await page2.getByRole("button", { name: "Media", exact: true }).click();
  await expect(page2.getByText("Media assets", { exact: false }).first()).toBeVisible({
    timeout: 30_000,
  });
  await page2.screenshot({ path: path.join(OUT, "e2e-media-library.png") });
  await page2.waitForTimeout(1000);
  const violations = await page2.evaluate(
    () => (window as unknown as { __csp?: string[] }).__csp ?? [],
  );
  expect(violations).toEqual([]);
  expect(cspErrors).toEqual([]);
  expect(offOrigin).toEqual([]);
  await page2.close();
});

test("create a news item in the CMS → file in content/news/ → shown on /news/ → in the production build's routes → deleted", async ({
  page,
}) => {
  test.setTimeout(240_000);
  try {
    await login(page);
    await page.getByRole("link", { name: "News", exact: true }).click();
    await page.getByRole("link", { name: /News item/ }).click();
    const title = page.getByLabel("Title", { exact: true });
    await expect(title).toBeVisible({ timeout: 30_000 });
    await title.fill(TITLE);
    await page.getByLabel("Type", { exact: true }).click();
    await page.getByText("Lab life", { exact: true }).click();
    await page
      .getByLabel("Summary", { exact: false })
      .fill("Written by the WP6 end-to-end test; removed at the end.");
    // The rich-text body (cms-widgets.js passes real typing on).
    await page.locator(".slate-editor[role=textbox]").first().click();
    await page.keyboard.type("Body written in the rich-text editor.");
    await page.screenshot({ path: path.join(OUT, "e2e-news-editor.png") });

    await page.getByRole("button", { name: "Publish" }).first().click();
    await page.getByText("Publish now", { exact: true }).click();
    await expect.poll(() => smokeFiles().length, { timeout: 30_000 }).toBe(1);

    // The file Decap wrote: name yyyy-mm-dd-<slug>.md, valid against the content schema.
    const [file] = smokeFiles();
    expect(file).toMatch(/^\d{4}-\d{2}-\d{2}-cms-smoke-test-delete-me\.md$/);
    const text = fs.readFileSync(path.join(NEWS_DIR, file!), "utf8");
    const parsed = parseContentFiles([{ path: `news/${file}`, text }]);
    expect(parsed.issues).toEqual([]);
    const item = parsed.entries.news[0]!;
    expect(item.title).toBe(TITLE);
    expect(item.type).toBe("lab-life");
    expect(item.draft).toBe(false);
    expect(item.body).toContain("Body written in the rich-text editor.");
    expect(file!.startsWith(String(item.date).slice(0, 10))).toBe(true); // E_NEWS_SLUG_DATE
    fs.writeFileSync(path.join(OUT, "e2e-news-file.md"), text);

    // The site shows it (dev server reads content/ on each request).
    const slug = file!.replace(/\.md$/, "");
    await expect
      .poll(
        async () => {
          await page.goto("/news/");
          return page.getByText(TITLE).count();
        },
        { timeout: 90_000, intervals: [1000, 2000, 5000] },
      )
      .toBeGreaterThan(0);
    await page.screenshot({ path: path.join(OUT, "e2e-news-list.png"), fullPage: false });
    const detail = await page.goto(`/news/${slug}/`);
    if (detail?.status() === 404) {
      // MEASURED 2026-10-20 (Next 16.4 dev server): the detail route has
      // dynamicParams = false, and a long-running `next dev` keeps the
      // generateStaticParams result it computed earlier, so a page for a file
      // added since then is "not found" until the route recompiles (a copied
      // file without the CMS behaves the same). The production check below
      // covers the static export; docs/EDITING.md §11 tells editors.
      test.info().annotations.push({
        type: "dev-server",
        description: `/news/${slug}/ is 404 on this dev server (stale generateStaticParams)`,
      });
    } else {
      expect(detail?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
    }

    // A production build includes it: src/app/news/[slug]/page.tsx exports
    // generateStaticParams() = staticParams("slug", staticSlugs.news(getContent())),
    // and `next build` runs it with drafts excluded. (The build itself is CI's job.)
    const prod = getContent({ preview: false, dir: path.join(ROOT, "content") });
    expect(staticParams("slug", staticSlugs.news(prod))).toContainEqual({ slug });
    expect(prod.preview).toBe(false);

    // Delete the file; the site no longer lists it.
    fs.rmSync(path.join(NEWS_DIR, file!));
    expect(smokeFiles()).toEqual([]);
    await expect
      .poll(
        async () => {
          await page.goto("/news/");
          return page.getByText(TITLE).count();
        },
        { timeout: 60_000, intervals: [1000, 2000, 5000] },
      )
      .toBe(0);
  } finally {
    removeSmokeFiles();
  }
});

test("rich-text bodies: opening an entry changes nothing; an edit does; undoing it does not", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page);
  for (const [c, s] of [
    ["directions", "algorithmic-advice"],
    ["people", "park-sinchaisri"],
    ["pages", "join"],
  ] as const) {
    const tab = await openEntry(page, c, s);
    await tab.waitForTimeout(2000); // the editor re-serialises the body after mounting
    await expect(tab.getByText("Changes saved", { exact: false })).toBeVisible();
    await expect(tab.getByText("Unsaved changes", { exact: false })).toHaveCount(0);
    await tab.close({ runBeforeUnload: false });
  }
  const tab = await openEntry(page, "directions", "algorithmic-advice");
  await tab.waitForTimeout(1500);
  const editor = tab.locator(".slate-editor[role=textbox]").first();
  await editor.locator("p").last().click();
  await tab.keyboard.press("End");
  await tab.keyboard.press("ArrowLeft");
  await expect(tab.getByText("Unsaved changes", { exact: false })).toHaveCount(0);
  await tab.keyboard.press("End");
  // The first change re-renders the form and can put the caret back where it was
  // before End, so type one key, wait for the state change, then the second.
  await tab.keyboard.type("Z");
  await expect(tab.getByText("Unsaved changes", { exact: false })).toBeVisible();
  await tab.keyboard.press("End");
  await tab.keyboard.type("q");
  // The body's last four characters, from the file (the copy changes over time).
  const bodyEnd = fs
    .readFileSync(path.join(ROOT, "content", "directions", "algorithmic-advice.md"), "utf8")
    .trimEnd()
    .slice(-4);
  await expect(tab.frameLocator("iframe").first().locator(".cms-preview")).toContainText(
    `${bodyEnd}Zq`,
  );
  for (let i = 0; i < 2; i++) await tab.keyboard.press("Backspace");
  await expect(tab.getByText("Changes saved", { exact: false })).toBeVisible();
  await tab.close({ runBeforeUnload: false });
});

test("new publication: the address is checked before the first save (D-05, E_SLUG)", async ({
  page,
}) => {
  test.setTimeout(180_000);
  // Each attempt in a fresh tab: Decap keeps an unsaved new entry while the tab lives.
  const fill = async (author: string, title: string) => {
    const tab = await page.context().newPage();
    tab.on("dialog", (d) => d.accept().catch(() => {}));
    await tab.goto("/admin/local.html#/collections/publications/new");
    await expect(tab.getByLabel("Title", { exact: true })).toBeVisible({ timeout: 30_000 });
    await tab.getByLabel("Title", { exact: true }).fill(title);
    await tab.getByRole("button", { name: /Add authors/i }).click();
    await tab.getByLabel("Name", { exact: true }).fill(author);
    await tab.getByLabel("Type", { exact: true }).click();
    await tab.getByRole("option", { name: "Journal article", exact: true }).click();
    await tab.getByLabel("Status", { exact: true }).click();
    await tab.getByRole("option", { name: "Published", exact: true }).click();
    // A published paper needs a direction (validator E_DIRECTIONS_EMPTY; cms-hooks.js).
    await tab.getByLabel(/^Research directions/).click();
    await tab.getByRole("option").first().click();
    await tab.keyboard.press("Escape");
    await publish(tab);
    return tab;
  };
  try {
    await login(page);
    // Too long: 44-character name + year + title > 60 characters → not saved, explained.
    const t1 = await fill(
      "Maximiliana Alexandra von Hohenberg-Ostrowski",
      "CMS smoke test publication",
    );
    await expect(t1.getByText(/Not saved: this publication’s address would be/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(t1.getByText(/type only the first author’s last name/)).toBeVisible();
    await t1.screenshot({ path: path.join(OUT, "e2e-publication-slug-guard.png") });
    expect(smokeFiles(PUBS_DIR)).toEqual([]);
    await t1.close({ runBeforeUnload: false });

    // The PI (26-character name) with a long title fits: ≤ 60 characters, D-05 pattern.
    const t2 = await fill(
      "Wichinpong Park Sinchaisri",
      "CMS smoke test publication with a deliberately long title",
    );
    // The full name fits, but the lab's addresses use the last name: advice once (CMS-11)…
    await expect(t2.getByText(/Not saved yet: check the address first/).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(t2.getByText(/type only “Sinchaisri”/).first()).toBeVisible();
    await t2.screenshot({ path: path.join(OUT, "e2e-publication-slug-advice.png") });
    expect(smokeFiles(PUBS_DIR)).toEqual([]);
    // …and saving again keeps the address as shown.
    await publish(t2);
    await expect.poll(() => smokeFiles(PUBS_DIR).length, { timeout: 30_000 }).toBe(1);
    await t2.close({ runBeforeUnload: false });
    const [file] = smokeFiles(PUBS_DIR);
    const slug = file!.replace(/\.md$/, "");
    expect(slug).toBe(
      `wichinpong-park-sinchaisri-${new Date().getUTCFullYear()}-cms-smoke-test-publication-w`,
    );
    expect(slug.length).toBeLessThanOrEqual(SLUG_PATTERNS.publications.max);
    expect(slug).toMatch(SLUG_PATTERNS.publications.re);
    const text = fs.readFileSync(path.join(PUBS_DIR, file!), "utf8");
    expect(parseContentFiles([{ path: `publications/${file}`, text }]).issues).toEqual([]);
  } finally {
    removeSmokeFiles();
  }
});

test("phone widths: the editor fits the screen and the account menu is reachable", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page);
  for (const [w, h] of [
    [390, 844],
    [320, 640],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    const tab = await openEntry(page, "news", "2026-05-11-learning-to-gig-revision");
    await tab.waitForTimeout(800);
    const [scrollW, innerW] = await tab.evaluate(() => [
      document.documentElement.scrollWidth,
      window.innerWidth,
    ]);
    expect(scrollW).toBeLessThanOrEqual(innerW);
    const box = await tab.getByRole("button", { name: "Account options dropdown" }).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(w);
    await expect(tab.getByRole("button", { name: "Publish" }).first()).toBeInViewport();
    await tab.screenshot({ path: path.join(OUT, `e2e-editor-${w}.png`) });
    await tab.close({ runBeforeUnload: false });
  }
});

const VIEWPORTS = [
  { name: "1366", width: 1366, height: 768 },
  { name: "390", width: 390, height: 844 },
] as const;

for (const vp of VIEWPORTS) {
  for (const scheme of ["light", "dark"] as const) {
    test(`visual QA and axe: admin screens at ${vp.name} (${scheme})`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({ colorScheme: scheme });
      const tag = `${vp.name}-${scheme}`;

      // Production page: GitHub login screen (no account needed to render it).
      await page.goto("/admin/index.html");
      await expect(page.getByRole("button", { name: /Login with GitHub/i })).toBeVisible({
        timeout: 30_000,
      });
      await page.screenshot({ path: path.join(OUT, `admin-login-${tag}.png`) });
      const loginAxe = await axe(page, `login-${tag}`);

      // Local demo: collections, then one entry of every collection with its preview.
      await login(page);
      await page.screenshot({ path: path.join(OUT, `admin-collections-${tag}.png`) });
      const listAxe = await axe(page, `collections-${tag}`);
      // Media library (modal).
      await page.getByRole("button", { name: "Media", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Media assets" })).toBeVisible({
        timeout: 30_000,
      });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT, `admin-media-${tag}.png`) });
      const mediaAxe = await axe(page, `media-${tag}`);
      await page.keyboard.press("Escape");
      const results: Record<string, Awaited<ReturnType<typeof axe>>> = {
        login: loginAxe,
        collections: listAxe,
        media: mediaAxe,
      };
      for (const [c, s] of [
        ["news", "2026-05-11-learning-to-gig-revision"],
        ["people", "park-sinchaisri"],
        ["publications", "jiang-2025-learning-on-the-go"],
        ["directions", "algorithmic-advice"],
        ["projects", "agentic-ai-authority"],
        ["opportunities", "research-assistants"],
        ["pages", "about"],
        ["pages", "join"], // links inside the rich-text editor (contrast fix in admin.css)
        ["pages", "home"],
      ] as const) {
        const file = c === "pages" ? `content/pages/${s}.yml` : `content/${c}/${s}.md`;
        if (!fs.existsSync(path.join(ROOT, file))) continue;
        const tab = await page.context().newPage();
        await tab.setViewportSize({ width: vp.width, height: vp.height });
        await tab.emulateMedia({ colorScheme: scheme });
        tab.on("dialog", (d) => d.accept().catch(() => {}));
        await tab.goto(`/admin/local.html#/collections/${c}/entries/${s}`);
        await expect(tab.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
        const preview = tab.frameLocator("iframe").first().locator(".cms-preview");
        // Our templates (brief §I WP6 #6 requires news, people, publications) on wide
        // screens; below 800px the editor shows the form only (admin.css).
        if (vp.width >= 800) await expect(preview).toBeVisible({ timeout: 30_000 });
        else await expect(tab.locator("iframe")).toBeHidden();
        await tab.waitForTimeout(800);
        const name = c === "pages" ? `pages-${s}` : c;
        await tab.screenshot({ path: path.join(OUT, `admin-${name}-${tag}.png`) });
        results[name] = await axe(tab, `${name}-${tag}`);
        await tab.close({ runBeforeUnload: false });
      }
      // Zero violations: our preview templates (inside the iframe) and Decap's own UI
      // as patched by cms-a11y.js and admin.css. Details: test-results/WP6/axe-*.json.
      const all = Object.entries(results).flatMap(([screen, rows]) =>
        rows.map((v) => `${screen}: ${v.id} (${v.where}) ${v.first}`),
      );
      expect(all).toEqual([]);
    });
  }
}

// ---------------------------------------------------------------------------
// Verification fixes (CMS-01…CMS-13, A11Y-02), against a SCRATCH COPY of
// content/: a second decap-server writes into test-results/, never into this
// checkout, so saving site.yml or a direction cannot touch real content.

test.describe("verification fixes, on a scratch copy of content/", () => {
  const SCRATCH_PORT = 8088;
  const SCRATCH = path.join(ROOT, "test-results", "cms-e2e-scratch");
  const PAGE = "local-scratch.html";
  const CONFIG = "config.local-scratch.yml";
  let scratchProxy: ChildProcess | null = null;
  const scratchFile = (rel: string) => fs.readFileSync(path.join(SCRATCH, rel), "utf8");
  const reset = (rel: string) => fs.copyFileSync(path.join(ROOT, rel), path.join(SCRATCH, rel));

  test.beforeAll(async () => {
    fs.rmSync(SCRATCH, { recursive: true, force: true });
    fs.mkdirSync(path.join(SCRATCH, "public", "uploads"), { recursive: true });
    fs.cpSync(path.join(ROOT, "content"), path.join(SCRATCH, "content"), { recursive: true });
    const { generate } = await import("../../scripts/cms/build-config.mjs");
    const files = (await generate({
      local: true,
      localSiteUrl: "http://localhost:3100",
      proxyUrl: `http://localhost:${SCRATCH_PORT}/api/v1`,
    })) as Record<string, string>;
    fs.writeFileSync(path.join(ADMIN_DIR, CONFIG), files["public/admin/config.local.yml"]!);
    fs.writeFileSync(
      path.join(ADMIN_DIR, PAGE),
      files["public/admin/local.html"]!.replace('href="config.local.yml"', `href="${CONFIG}"`),
    );
    if (await portOpen(SCRATCH_PORT)) throw new Error(`port ${SCRATCH_PORT} is busy`);
    scratchProxy = spawn(
      process.execPath,
      [path.join(ROOT, "node_modules", "decap-server", "dist", "index.js")],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          PORT: String(SCRATCH_PORT),
          MODE: "fs",
          GIT_REPO_DIRECTORY: SCRATCH,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    scratchProxy.stdout?.on("data", (d) => (proxyLog += d));
    scratchProxy.stderr?.on("data", (d) => (proxyLog += d));
    await waitForPort(SCRATCH_PORT, 30_000);
  });

  test.afterAll(() => {
    killTree(scratchProxy);
    scratchProxy = null;
    for (const f of [PAGE, CONFIG]) fs.rmSync(path.join(ADMIN_DIR, f), { force: true });
    fs.rmSync(SCRATCH, { recursive: true, force: true });
  });

  async function enter(page: Page, hash = "") {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e?.message ?? e)));
    page.on("dialog", (d) => d.accept().catch(() => {}));
    await page.goto(`/admin/${PAGE}`);
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByRole("heading", { name: "Collections" })).toBeVisible({
      timeout: 30_000,
    });
    if (hash) {
      await page.goto(`/admin/${PAGE}${hash}`);
      await expect(page.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(1200);
    }
    return errors;
  }
  const order = () =>
    (/direction_order:\n((?:\s+- .+\n)+)/.exec(scratchFile("content/site.yml"))?.[1] ?? "")
      .split("\n")
      .map((l) => l.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
  const handles = (page: Page) =>
    page.locator('[id^="direction_order"] [role="button"][aria-roledescription="sortable"]');

  test("Direction order: items show their address, reorder with the keyboard, and can be removed (CMS-01, CMS-03, CMS-12)", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    reset("content/site.yml");
    const before = order();
    expect(before.length).toBeGreaterThan(2);
    const errors = await enter(page, "#/collections/settings/entries/site");
    // CMS-03: each collapsed item shows the direction's address.
    const labels = page.locator('[id^="direction_order"] [class*="NestedObjectLabel"]');
    await expect(labels).toHaveText(before);
    await expect(page.getByRole("button", { name: /Add direction\b/ })).toBeVisible();
    // CMS-12: handles say what they move and where it is, and how to move it.
    await expect(handles(page).nth(1)).toHaveAttribute(
      "aria-label",
      `Reorder “${before[1]}”, item 2 of ${before.length}`,
    );
    const help = await handles(page)
      .nth(1)
      .evaluate(
        (e) => document.getElementById(e.getAttribute("aria-describedby") ?? "")?.textContent,
      );
    expect(help).toMatch(/up or down arrow key/);
    // Keyboard reorder: the item moves down, keeps the focus and is announced.
    await handles(page).nth(0).focus();
    await page.keyboard.press("ArrowDown");
    await expect(labels.nth(1)).toHaveText(before[0]!);
    await expect(page.locator(":focus")).toHaveAttribute(
      "aria-label",
      `Reorder “${before[0]}”, item 2 of ${before.length}`,
    );
    await expect(page.locator("#bobalab-reorder-status")).toHaveText(
      `“${before[0]}” moved to position 2 of ${before.length}.`,
    );
    // CMS-01: removing an item works (Decap 3.17.1 threw "Invalid keyPath").
    await page.getByRole("button", { name: `Remove “${before[2]}”` }).click();
    await expect(labels).toHaveCount(before.length - 1);
    await page.screenshot({ path: path.join(OUT, "e2e-direction-order.png") });
    await publish(page);
    const expected = [before[1], before[0], ...before.slice(3)];
    await expect.poll(order, { timeout: 30_000 }).toEqual(expected);
    expect(errors).toEqual([]);
    reset("content/site.yml");
  });

  test("an address change after a save opens the named entry, and Publish writes that file (CMS-02)", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const DIR = "content/directions/ai-at-work.md";
    const PROJECT = "content/projects/learning-on-the-go.md";
    test.skip(
      !fs.existsSync(path.join(SCRATCH, DIR)) || !fs.existsSync(path.join(SCRATCH, PROJECT)),
      "needs both entries",
    );
    try {
      await enter(page, "#/collections/directions/entries/ai-at-work");
      await page.getByLabel(/^Archived on/).fill("2026-10");
      await publish(page);
      await expect
        .poll(() => scratchFile(DIR), { timeout: 30_000 })
        .toMatch(/archived_on: .?2026-10/);
      // A pasted link or bookmark in the same tab: only the address changes.
      await page.evaluate(() => {
        location.hash = "#/collections/projects/entries/learning-on-the-go";
      });
      await expect(page.getByText("Writing in Projects collection")).toBeVisible({
        timeout: 30_000,
      });
      const title = /^title: (.*)$/m.exec(scratchFile(PROJECT))![1]!.replace(/^["']|["']$/g, "");
      await expect(page.getByLabel("Title", { exact: true })).toHaveValue(title, {
        timeout: 30_000,
      });
      await page
        .getByLabel(/^Summary/)
        .first()
        .fill("CMS e2e: written to the project");
      await publish(page);
      await expect
        .poll(() => scratchFile(PROJECT), { timeout: 30_000 })
        .toContain("CMS e2e: written to the project");
      expect(scratchFile(DIR)).not.toContain("CMS e2e");
    } finally {
      reset(DIR);
      reset(PROJECT);
    }
  });

  test("saves the validator would reject are refused with a message (CMS-04, CMS-07)", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const PUBS = path.join(SCRATCH, "content", "publications");
    const mine = () => fs.readdirSync(PUBS).filter((f) => f.includes("cms-e2e-working-paper"));
    try {
      await enter(page);
      await page.goto(`/admin/${PAGE}#/collections/publications/new`);
      await expect(page.getByLabel("Title", { exact: true })).toBeVisible({ timeout: 30_000 });
      await page.getByLabel("Title", { exact: true }).fill("CMS e2e working paper");
      await page.getByRole("button", { name: /Add authors/i }).click();
      await page.getByLabel("Name", { exact: true }).fill("Sinchaisri");
      await page.getByLabel("Type", { exact: true }).click();
      await page.getByRole("option", { name: "Working paper", exact: true }).click();
      await page.getByLabel("Status", { exact: true }).click();
      await page.getByRole("option", { name: "Working paper", exact: true }).click();
      await publish(page);
      await expect(page.getByText(/Not saved: “As of” is needed/).first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByText(/“Status source” is needed/).first()).toBeVisible();
      await expect(
        page.getByText(/choose at least one “Research direction”/).first(),
      ).toBeVisible();
      await page.screenshot({ path: path.join(OUT, "e2e-required-when.png") });
      expect(mine()).toEqual([]);

      // A colour another live direction uses: the preview says so, the save is refused.
      const DIR = "content/directions/platform-work.md";
      test.skip(!fs.existsSync(path.join(SCRATCH, DIR)), "needs platform-work");
      const others = fs
        .readdirSync(path.join(SCRATCH, "content", "directions"))
        .filter((f) => f !== "platform-work.md")
        .map((f) => fs.readFileSync(path.join(SCRATCH, "content", "directions", f), "utf8"))
        .filter((t) => !/^status: archived/m.test(t));
      const taken = /^color: (\S+)/m.exec(others[0]!)![1]!;
      const takenBy = /^short_label: (.*)$/m.exec(others[0]!)![1]!;
      const before = scratchFile(DIR);
      await page.goto(`/admin/${PAGE}#/collections/directions/entries/platform-work`);
      await expect(page.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(1500);
      await page.getByLabel(/^Colour/).click();
      // Option labels start with the colour's name, e.g. "Butterfly pea (blue)" for butterfly-pea.
      await page
        .getByRole("option", { name: new RegExp(`^${taken.replace(/-/g, " ")}\\b`, "i") })
        .click();
      const preview = page.frameLocator("iframe").first().locator(".cms-preview");
      await expect(preview).toContainText("Colour taken.", { timeout: 15_000 });
      await expect(preview).toContainText(`“${takenBy}”`);
      await publish(page);
      await expect(page.getByText(/is already the colour of/).first()).toBeVisible({
        timeout: 30_000,
      });
      await page.screenshot({ path: path.join(OUT, "e2e-colour-taken.png") });
      expect(scratchFile(DIR)).toBe(before);
    } finally {
      for (const f of mine()) fs.rmSync(path.join(PUBS, f), { force: true });
      reset("content/directions/platform-work.md");
    }
  });

  test("keyboard focus is visible in the form, and conditional fields drop '(optional)' (A11Y-02, CMS-09)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await enter(page, "#/collections/news/entries/2026-05-11-learning-to-gig-revision");
    const ring = async (sel: string) => {
      await page.waitForTimeout(300); // react-select animates its outline (100 ms)
      return page
        .locator(sel)
        .first()
        .evaluate((e) => {
          const c = getComputedStyle(e);
          return `${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor}`;
        });
    };
    await page.getByLabel("Title", { exact: true }).focus();
    expect(await ring(":focus")).toBe("solid 2px rgb(58, 105, 199)");
    await page.locator(".slate-editor[role=textbox]").first().focus();
    expect(await ring(":focus")).toBe("solid 2px rgb(58, 105, 199)");
    await page.locator('input[role="combobox"]').first().focus();
    expect(await ring('[class*="-control"]:focus-within')).toBe("solid 2px rgb(58, 105, 199)");
    await page.screenshot({ path: path.join(OUT, "e2e-focus-select.png") });

    await page.goto(`/admin/${PAGE}#/collections/people/entries/park-sinchaisri`);
    await expect(page.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
    const label = page.locator("label", { hasText: "Photo alt text (required with a photo)" });
    await expect(label).toBeVisible();
    expect(await label.innerText()).not.toMatch(/optional/i);
    await expect(
      // accessible name (the hidden suffix is not part of it)
      page.getByRole("textbox", { name: "Photo alt text (required with a photo)", exact: true }),
    ).toBeVisible();
  });

  test("inside a frame the content manager does not start (CMS-13)", async ({ page, baseURL }) => {
    test.setTimeout(60_000);
    await page.setContent(`<iframe title="x" src="${baseURL}/admin/index.html"></iframe>`);
    const frame = page.frameLocator("iframe");
    await expect(frame.getByText(/cannot be opened inside another page/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(frame.getByRole("link", { name: /Open it in its own window/ })).toHaveAttribute(
      "target",
      "_top",
    );
    await expect(frame.getByRole("button", { name: /Login with GitHub/i })).toHaveCount(0);
  });
});
