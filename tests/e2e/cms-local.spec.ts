/**
 * WP6: the local no-account CMS demo, end to end (brief §I WP6 #4, #5; §F4),
 * updated for editor v2 ("Save goes live", the live column; spec §9 "WP6").
 *
 * Needs a `next dev` server serving public/ (BASE_URL, default the shared dev
 * server on :3100). The spec itself:
 *  1. copies content/ and public/uploads/ into a SCRATCH folder in test-results/
 *     and starts decap-server on :8081 (MODE=fs) writing into that copy, so no
 *     save ever reaches this checkout; the local admin page and its config are
 *     generated in memory and served through Playwright routes, so nothing is
 *     written into public/admin/ either (the content guard checks both at the end);
 *  2. measures the admin CSP: without 'unsafe-eval' Decap cannot start;
 *  3. creates a news item "CMS smoke test (delete me)" with one click on Save,
 *     checks the Markdown file, that it passes the content schema, that the live
 *     column's real News list shows it, that the page did not reload, and that a
 *     production build would include it (the news route's generateStaticParams
 *     input in production mode; `next build` itself is run by CI);
 *  4. checks the rich-text body fix (cms-widgets.js): opening an entry does not
 *     mark it changed, a real edit does (and reaches the real page in the live
 *     column), undoing it does not;
 *  5. checks the file-name guard (cms-hooks.js): a publication whose first
 *     author's name is too long for the 60-character address is not saved, the
 *     PI's name with a long title is, within 60 characters;
 *  6. checks the editor at phone widths (no sideways scrolling, account menu and
 *     Save reachable, the Edit / Preview & history switch);
 *  7. takes screenshots (1366×768, 390×844; light and dark) and runs axe, the
 *     media library opened from an image field (the header Media button is hidden);
 *  8. measures the base load, edit-to-render and the site check for TESTING-REPORT;
 *  9. checks the verification fixes (Direction order remove/reorder/names, the
 *     stale-editor reload, "required when …" and colour checks, focus rings,
 *     conditional labels, no framing) against a second SCRATCH COPY served by a
 *     second decap-server on :8088;
 * and ALWAYS cleans up (scratch folders, decap-servers), also on failure.
 *
 *   BASE_URL=http://localhost:3100 npx playwright test tests/e2e/cms-local.spec.ts --project=chromium
 * Screenshots, axe results and measurements: test-results/WP6/.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type BrowserContext,
  type Dialog,
  type FrameLocator,
  type Page,
} from "@playwright/test";
import { parseContentFiles } from "../../src/lib/content/read";
import { getContent } from "../../src/lib/content/load";
import { staticParams, staticSlugs } from "../../src/lib/content/queries";
import { SLUG_PATTERNS } from "../../src/lib/content/schema";
import {
  guardFiles,
  guardFolder,
  REPO_ROOT,
  type ContentGuard,
  type FolderGuard,
} from "./helpers/content-guard";

test.describe.configure({ mode: "serial" });

const ROOT = REPO_ROOT;
const BASE = process.env.BASE_URL || "http://localhost:3100";
const ADMIN_DIR = path.join(ROOT, "public", "admin");
const OUT = path.join(ROOT, "test-results", "WP6");
const PROXY_PORT = 8081;
// The main scratch copy: every save of the tests outside the describe below lands here.
const MAIN = path.join(ROOT, "test-results", "cms-local-scratch-main");
const NEWS_DIR = path.join(MAIN, "content", "news");
const PUBS_DIR = path.join(MAIN, "content", "publications");
const TITLE = "CMS smoke test (delete me)";
const SLUG_PART = "cms-smoke-test";
// Served from memory by page routes; never written to public/admin/.
const LOCAL = "local.html";
const LOCAL_CONFIG = "config.local.yml";
const PROBE = "_csp-probe.html";
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const SAVE = { name: "Save", exact: true } as const;
// Decap's own same-name question; it would delete the saved file at once (spec §3.10).
const REPLACE = /already exists\. Do you want to replace it\?$/;

let proxy: ChildProcess | null = null;
let proxyLog = "";
let localHtml = "";
let localYml = "";
let realGuards: FolderGuard[] = [];
let realContent: ContentGuard | null = null;
// The local page names this spec serves from memory: none of them may appear in public/admin/.
const SERVED = [LOCAL, LOCAL_CONFIG, PROBE, "local-scratch.html", "config.local-scratch.yml"];
const servedOnDisk = () => SERVED.filter((f) => fs.existsSync(path.join(ADMIN_DIR, f)));
let adminBefore: string[] = [];

const listFiles = (dir: string, rel = ""): string[] =>
  fs.existsSync(path.join(dir, rel))
    ? fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((d) => {
        const r = rel ? `${rel}/${d.name}` : d.name;
        return d.isDirectory() ? listFiles(dir, r) : [r];
      })
    : [];

const smokeFiles = (dir = NEWS_DIR) =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.includes(SLUG_PART)) : [];

function removeSmokeFiles() {
  for (const dir of [NEWS_DIR, PUBS_DIR])
    for (const f of smokeFiles(dir)) fs.rmSync(path.join(dir, f), { force: true });
}

function copyContent(to: string) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.join(to, "public"), { recursive: true });
  fs.cpSync(path.join(ROOT, "content"), path.join(to, "content"), { recursive: true });
  fs.cpSync(path.join(ROOT, "public", "uploads"), path.join(to, "public", "uploads"), {
    recursive: true,
  });
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

function startProxy(port: number, dir: string) {
  const child = spawn(
    process.execPath,
    [path.join(ROOT, "node_modules", "decap-server", "dist", "index.js")],
    {
      cwd: ROOT,
      env: { ...process.env, PORT: String(port), MODE: "fs", GIT_REPO_DIRECTORY: dir },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout?.on("data", (d) => (proxyLog += d));
  child.stderr?.on("data", (d) => (proxyLog += d));
  return child;
}

/** The local admin page and config for a decap-server on `port`, generated in memory. */
async function localFiles(port: number, config: string) {
  const { generate } = await import("../../scripts/cms/build-config.mjs");
  const files = (await generate({
    local: true,
    localSiteUrl: BASE,
    proxyUrl: `http://localhost:${port}/api/v1`,
  })) as Record<string, string>;
  return {
    html: files["public/admin/local.html"]!.replace('href="config.local.yml"', `href="${config}"`),
    yml: files["public/admin/config.local.yml"]!,
  };
}

async function serve(context: BrowserContext, file: string, body: string, type: string) {
  await context.route(`**/admin/${file}*`, (r) =>
    r.fulfill({ status: 200, contentType: `${type}; charset=utf-8`, body }),
  );
}

/** Accept Decap's questions (leave page, local backup), but never "replace the saved file?". */
function answerDialogs(d: Dialog) {
  const answer = REPLACE.test(d.message()) ? d.dismiss() : d.accept();
  answer.catch(() => {});
}

async function login(page: Page, file = LOCAL) {
  page.on("dialog", answerDialogs);
  await page.goto(`/admin/${file}`);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Collections" })).toBeVisible({ timeout: 30_000 });
}

/** Editor v2: one click on Save (no "Publish now" menu). */
async function publish(page: Page) {
  await page.getByRole("button", SAVE).click();
}

const live = (page: Page): FrameLocator => page.frameLocator("#preview-pane");
const site = (page: Page): FrameLocator => live(page).frameLocator("iframe.bl-live__site");

/** The live column has the saved site (BobalabLive.whenReady). */
async function ready(page: Page, ms = 60_000) {
  // A direct address change from one entry to another reloads the page
  // (cms-start.js): wait for our scripts, and retry once if a reload replaces
  // the document meanwhile.
  for (let attempt = 0; ; attempt++) {
    try {
      await page.waitForFunction(() => "BobalabLive" in window, null, { timeout: 30_000 });
      const ok = await page.evaluate(
        (t) =>
          (
            window as unknown as { BobalabLive: { whenReady(ms: number): Promise<boolean> } }
          ).BobalabLive.whenReady(t),
        ms,
      );
      expect(ok).toBe(true);
      return;
    } catch (e) {
      if (attempt > 0 || !/context was destroyed|navigation/i.test(String(e))) throw e;
      await page.waitForLoadState("load");
    }
  }
}

/** Open one entry in a fresh tab (the session lives in the context's storage). */
async function openEntry(page: Page, collection: string, slug: string, file = LOCAL) {
  const tab = await page.context().newPage();
  const size = page.viewportSize();
  if (size) await tab.setViewportSize(size);
  tab.on("dialog", answerDialogs);
  await tab.goto(`/admin/${file}#/collections/${collection}/entries/${slug}`);
  await expect(tab.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
  return tab;
}

/** Open the media library from an object's image field ("Image" › "Choose an image"). */
async function openLibrary(page: Page, object: string, button: RegExp) {
  const top = page
    .locator('[class*="TopBarContainer"]')
    .filter({ hasText: new RegExp(`^${object}`) });
  const chooser = page.locator("button", { hasText: button }).first();
  if (!(await chooser.isVisible()))
    await top.locator('button[class*="ExpandButton"]').first().click();
  await chooser.scrollIntoViewIfNeeded();
  await chooser.click();
  // From an image field the library is titled "Images" (the header's was "Media assets").
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Images" })).toBeVisible({
    timeout: 30_000,
  });
}

async function axe(page: Page, name: string) {
  // The site's own pages inside the live column are checked by the site's specs
  // (a11y-sitewide, editor-preview); here: Decap's UI, our scripts and the live bar.
  const r = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .exclude(["#preview-pane", "iframe.bl-live__site"])
    .analyze();
  const rows = r.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    // Violations inside Decap's preview frame come from the live bar (cms-live.js).
    where: v.nodes.some((n) => n.target.length > 1) ? "live-column" : "decap-ui",
    first: v.nodes[0]?.target.join(" ⟶ "),
  }));
  fs.writeFileSync(path.join(OUT, `axe-${name}.json`), JSON.stringify(rows, null, 2));
  return rows;
}

function measured(name: string, data: unknown) {
  fs.writeFileSync(path.join(OUT, `measure-${name}.json`), JSON.stringify(data, null, 2));
  test
    .info()
    .annotations.push({ type: "measured", description: `${name}: ${JSON.stringify(data)}` });
}

test.beforeAll(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  // Nothing may ever be saved into this checkout or written into public/admin/.
  realGuards = [
    guardFolder("content/news", new RegExp(SLUG_PART)),
    guardFolder("content/publications", new RegExp(SLUG_PART)),
  ];
  realContent = guardFiles(listFiles(path.join(ROOT, "content")).map((f) => `content/${f}`));
  adminBefore = servedOnDisk(); // another tool's local demo may have its own copies
  copyContent(MAIN);
  ({ html: localHtml, yml: localYml } = await localFiles(PROXY_PORT, LOCAL_CONFIG));
  if (await portOpen(PROXY_PORT))
    throw new Error(`port ${PROXY_PORT} is busy (another decap-server?)`);
  proxy = startProxy(PROXY_PORT, MAIN);
  await waitForPort(PROXY_PORT, 30_000);
});

test.afterAll(() => {
  killTree(proxy);
  proxy = null;
  fs.rmSync(MAIN, { recursive: true, force: true });
  const left = realGuards.flatMap((g) => g.removeAdded());
  if (left.length) throw new Error(`smoke files were saved into this checkout: ${left.join(", ")}`);
  realContent?.assertUnchanged();
  expect(servedOnDisk()).toEqual(adminBefore);
});

test.beforeEach(async ({ context, request, browserName }) => {
  const res = await request.get("/admin/cms-live.js");
  test.skip(res.status() === 404, "needs a dev server that serves public/ (not a static export)");
  // MEASURED (WP5): the page comes from a route, so Chromium treats the proxy on
  // another localhost port as a local-network request unless allowed.
  if (browserName === "chromium")
    await context.grantPermissions(["local-network-access"]).catch(() => {});
  await serve(context, LOCAL, localHtml, "text/html");
  await serve(context, LOCAL_CONFIG, localYml, "text/yaml");
  // History and Recent changes read GitHub; no test here needs it, and nothing
  // may leave the machine. The CSP test checks that the flows make no such call.
  await context.route("https://api.github.com/**", (r) =>
    r.fulfill({ status: 404, contentType: "application/json", body: '{"message":"Not Found"}' }),
  );
  // The first-use tip (cms-save.js) would sit over the bottom of the form.
  await context.addInitScript(() => {
    try {
      localStorage.setItem("bobalab.saveTip.v1", "1");
    } catch {
      // ignore
    }
  });
});

test("CSP: Decap 3.17.1 needs 'unsafe-eval'; the generated policy lets it start", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  expect(localHtml).toContain("'unsafe-eval'");
  await serve(context, PROBE, localHtml.replace(" 'unsafe-eval'", ""), "text/html");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e?.message ?? e)));
  await page.goto(`/admin/${PROBE}`);
  await expect(page.getByText("Error loading the CMS configuration")).toBeVisible({
    timeout: 30_000,
  });
  expect(errors.join("\n")).toMatch(/unsafe-eval/);

  const page2 = await context.newPage();
  const cspErrors: string[] = [];
  page2.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy/i.test(m.text())) cspErrors.push(m.text());
  });
  const offOrigin: string[] = [];
  const host = new URL(BASE).host;
  page2.on("request", (r) => {
    const u = new URL(r.url());
    if (![host, `localhost:${PROXY_PORT}`].includes(u.host) && !/^(data|blob):/.test(r.url()))
      offOrigin.push(r.url());
  });
  // Every violation, also inside the preview frames (they inherit the page's policy).
  await page2.addInitScript(() => {
    const w = window as unknown as { __csp?: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      w.__csp!.push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  await login(page2);
  // The flows an editor uses: a new entry, entries with the live column, the media library.
  await page2.goto(`/admin/${LOCAL}#/collections/news/new`);
  await expect(page2.getByLabel("Title", { exact: true })).toBeVisible({ timeout: 30_000 });
  for (const hash of [
    "#/collections/news/entries/2026-05-11-learning-to-gig-revision",
    "#/collections/people/entries/park-sinchaisri",
    "#/collections/directions/entries/algorithmic-advice",
  ]) {
    await page2.goto(`/admin/${LOCAL}${hash}`);
    await expect(live(page2).locator(".bl-live")).toBeVisible({ timeout: 30_000 });
  }
  await ready(page2);
  await expect(site(page2).locator("main")).toBeVisible({ timeout: 30_000 });
  // The header Media button is hidden (spec §3.10): the library opens from an image field.
  await page2.goto(`/admin/${LOCAL}#/collections/news/new`);
  await expect(page2.getByLabel("Title", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page2.getByRole("button", { name: "Media", exact: true })).toHaveCount(0);
  await openLibrary(page2, "Image", /^Choose an image$/);
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

test("create a news item in the CMS → one click on Save → file → shown in the live column's News list → in the production build's routes", async ({
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
    // The live column shows the new article on the real page, before any save.
    await ready(page);
    await expect(site(page).locator("main")).toContainText(TITLE, { timeout: 10_000 });
    await expect(page.locator("#bl-save-note")).toHaveText("Save puts this on the live site");
    await page.screenshot({ path: path.join(OUT, "e2e-news-editor.png") });

    const loadedAt = await page.evaluate(() => performance.timeOrigin);
    const t0 = Date.now();
    await publish(page);
    await expect.poll(() => smokeFiles().length, { timeout: 30_000 }).toBe(1);
    const writtenMs = Date.now() - t0;

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

    // Saved: the dock says what happened in the local demo, and the page did not reload.
    const slug = file!.replace(/\.md$/, "");
    await expect(page).toHaveURL(new RegExp(`#/collections/news/entries/${slug}$`), {
      timeout: 15_000,
    });
    await expect(page.locator("#bl-dock")).toContainText("Saved to this computer", {
      timeout: 15_000,
    });
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(loadedAt);
    await expect(page.getByText("All changes saved", { exact: false })).toBeVisible();
    // The real News list in the live column has it (the site's own view).
    await live(page).getByRole("tab", { name: "News list" }).click();
    await expect(site(page).locator("main")).toContainText(TITLE, { timeout: 15_000 });
    await page.screenshot({ path: path.join(OUT, "e2e-news-saved.png") });
    measured("new-entry-first-save", { saveToFileMs: writtenMs, reloaded: false });

    // A production build includes it: src/app/news/[slug]/page.tsx exports
    // generateStaticParams() = staticParams("slug", staticSlugs.news(getContent())),
    // and `next build` runs it with drafts excluded. (The build itself is CI's job.)
    const prod = getContent({ preview: false, dir: path.join(MAIN, "content") });
    expect(staticParams("slug", staticSlugs.news(prod))).toContainEqual({ slug });
    expect(prod.preview).toBe(false);
  } finally {
    removeSmokeFiles();
  }
});

test("rich-text bodies: opening an entry changes nothing; an edit does; undoing it does not", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await login(page);
  for (const [c, s] of [
    ["directions", "algorithmic-advice"],
    ["people", "park-sinchaisri"],
    ["pages", "join"],
  ] as const) {
    const tab = await openEntry(page, c, s);
    await tab.waitForTimeout(2000); // the editor re-serialises the body after mounting
    await expect(tab.getByText("All changes saved", { exact: false })).toBeVisible();
    await expect(tab.getByText("Unsaved changes", { exact: false })).toHaveCount(0);
    await tab.close({ runBeforeUnload: false });
  }
  const tab = await openEntry(page, "directions", "algorithmic-advice");
  await tab.waitForTimeout(1500);
  await ready(tab);
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
    .readFileSync(path.join(MAIN, "content", "directions", "algorithmic-advice.md"), "utf8")
    .trimEnd()
    .slice(-4);
  // The edit reaches the real direction page in the live column.
  await expect(site(tab).locator("main")).toContainText(`${bodyEnd}Zq`);
  for (let i = 0; i < 2; i++) await tab.keyboard.press("Backspace");
  await expect(tab.getByText("All changes saved", { exact: false })).toBeVisible();
  await tab.close({ runBeforeUnload: false });
});

test("new publication: the address is checked before the first save (D-05, E_SLUG)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  // Each attempt in a fresh tab: Decap keeps an unsaved new entry while the tab lives.
  const fill = async (author: string, title: string) => {
    const tab = await page.context().newPage();
    tab.on("dialog", answerDialogs);
    await tab.goto(`/admin/${LOCAL}#/collections/publications/new`);
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
    // The refusal stays in the "Not saved" band at the top of the form (spec §3.8).
    const band1 = t1.locator("#bl-refusal");
    await expect(band1).toContainText(/Not saved: this publication’s address would be/, {
      timeout: 30_000,
    });
    await expect(band1).toContainText(/type only the first author’s last name/);
    await t1.screenshot({ path: path.join(OUT, "e2e-publication-slug-guard.png") });
    expect(smokeFiles(PUBS_DIR)).toEqual([]);
    await t1.close({ runBeforeUnload: false });

    // The PI (26-character name) with a long title fits: ≤ 60 characters, D-05 pattern.
    const t2 = await fill(
      "Wichinpong Park Sinchaisri",
      "CMS smoke test publication with a deliberately long title",
    );
    // The full name fits, but the lab's addresses use the last name: advice once (CMS-11)…
    const band2 = t2.locator("#bl-refusal");
    await expect(band2).toContainText(/Not saved yet: check the address first/, {
      timeout: 30_000,
    });
    await expect(band2).toContainText(/type only “Sinchaisri”/);
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

test("phone widths: the editor fits the screen; the account menu, Save and the Edit / Preview switch are reachable", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await login(page);
  for (const [w, h] of [
    [390, 844],
    [320, 640],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    const tab = await openEntry(page, "news", "2026-05-11-learning-to-gig-revision");
    await tab.waitForTimeout(800);
    const fits = () =>
      tab.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(await fits()).toBe(true);
    const box = await tab.getByRole("button", { name: "Account options dropdown" }).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(w);
    // An unchanged entry shows "Saved"; a changed one "Save".
    await expect(tab.getByRole("button", { name: /^Saved?$/ }).first()).toBeInViewport();
    const bar = tab.locator("#bl-phonebar");
    await expect(bar).toBeInViewport();
    await expect(bar.locator('[data-view="edit"]')).toHaveAttribute("aria-pressed", "true");
    await tab.screenshot({ path: path.join(OUT, `e2e-editor-${w}.png`) });
    // Preview & history: the live column at full width, the form hidden.
    await bar.locator('[data-view="preview"]').click();
    await expect(live(tab).locator(".bl-live")).toBeInViewport({ timeout: 30_000 });
    await ready(tab);
    await expect(site(tab).locator("main")).toBeVisible({ timeout: 30_000 });
    expect(await fits()).toBe(true);
    await tab.waitForTimeout(500);
    await tab.screenshot({ path: path.join(OUT, `e2e-editor-${w}-preview.png`) });
    await bar.locator('[data-view="edit"]').click();
    await expect(tab.getByLabel("Title", { exact: true })).toBeInViewport();
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
      test.setTimeout(420_000);
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

      // Local demo: collections, then one entry of every collection with its live column.
      await login(page);
      await page.screenshot({ path: path.join(OUT, `admin-collections-${tag}.png`) });
      const listAxe = await axe(page, `collections-${tag}`);
      // Media library (modal), from a new news item's image field.
      await page.goto(`/admin/${LOCAL}#/collections/news/new`);
      await expect(page.getByLabel("Title", { exact: true })).toBeVisible({ timeout: 30_000 });
      // MEASURED (full parallel run): axe once caught the live bar before live.css
      // had reached Decap's frame (an unstyled "Back to the form" button), so let
      // the column finish first, as for the entries below.
      if (vp.width >= 800) {
        await expect(live(page).locator(".bl-live")).toBeVisible({ timeout: 30_000 });
        await ready(page);
      }
      await openLibrary(page, "Image", /^Choose an image$/);
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
        ["settings", "site"],
      ] as const) {
        const file =
          c === "settings"
            ? "content/site.yml"
            : c === "pages"
              ? `content/pages/${s}.yml`
              : `content/${c}/${s}.md`;
        if (!fs.existsSync(path.join(MAIN, file))) continue;
        const tab = await page.context().newPage();
        await tab.setViewportSize({ width: vp.width, height: vp.height });
        await tab.emulateMedia({ colorScheme: scheme });
        tab.on("dialog", answerDialogs);
        await tab.goto(`/admin/${LOCAL}#/collections/${c}/entries/${s}`);
        await expect(tab.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
        // The live column on wide screens; below 800 px the phone switch starts on Edit,
        // with the column kept off-screen (cms-layout.js, admin.css).
        if (vp.width >= 800) {
          await expect(live(tab).locator(".bl-live")).toBeVisible({ timeout: 30_000 });
          await ready(tab);
          await expect(site(tab).locator("main")).toBeVisible({ timeout: 30_000 });
        } else {
          await expect(tab.locator("#preview-pane")).toBeHidden();
          await expect(tab.locator("#bl-phonebar")).toBeVisible();
        }
        await tab.waitForTimeout(800);
        const name = c === "pages" ? `pages-${s}` : c;
        await tab.screenshot({ path: path.join(OUT, `admin-${name}-${tag}.png`) });
        results[name] = await axe(tab, `${name}-${tag}`);
        await tab.close({ runBeforeUnload: false });
      }
      // Zero violations: the live bar (inside Decap's frame) and Decap's own UI as
      // patched by cms-a11y.js, admin.css and cms-ui.css. Details: test-results/WP6/axe-*.json.
      const all = Object.entries(results).flatMap(([screen, rows]) =>
        rows.map((v) => `${screen}: ${v.id} [${v.impact}] (${v.where}) ${v.first}`),
      );
      expect(all).toEqual([]);
    });
  }
}

test("measurements for TESTING-REPORT: base load, edit to render, site check (local demo)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await login(page);
  const proxyRequests = (p: Page) => {
    let n = 0;
    p.on("request", (r) => {
      if (r.url().startsWith(`http://localhost:${PROXY_PORT}/`) && r.method() === "POST") n++;
    });
    return () => n;
  };
  const timeToReady = async (p: Page, go: () => Promise<unknown>) => {
    const count = proxyRequests(p);
    const t0 = Date.now();
    await go();
    await expect(p.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
    await ready(p, 120_000);
    return { ms: Date.now() - t0, proxyRequests: count() };
  };
  const HASH = "#/collections/news/entries/2026-05-11-learning-to-gig-revision";
  // First load in this browser context (a new tab: an empty module cache).
  const tab = await page.context().newPage();
  tab.on("dialog", answerDialogs);
  const first = await timeToReady(tab, () => tab.goto(`/admin/${LOCAL}${HASH}`));
  // Another entry in the same tab, the way an editor gets there (the collection
  // list, then the entry; no page load): the cached base (spec §2.2, 5 minutes).
  const hop = async (collection: string, entry: RegExp) => {
    await tab.evaluate((c) => {
      location.hash = `#/collections/${c}`;
    }, collection);
    const link = tab.getByRole("link", { name: entry }).first();
    await expect(link).toBeVisible({ timeout: 30_000 });
    return link;
  };
  const loadedAt = await tab.evaluate(() => performance.timeOrigin);
  const personLink = await hop("people", /Park Sinchaisri/);
  const other = await timeToReady(tab, () => personLink.click());
  expect(await tab.evaluate(() => performance.timeOrigin)).toBe(loadedAt);
  // A reload: a new page, Decap's own caches only.
  const reload = await timeToReady(tab, () => tab.reload());

  // Edit to render: one key in the Title, until the real page in the nested frame shows it.
  const newsLink = await hop("news", /Learning to Gig gets a major revision/);
  await newsLink.click();
  await expect(tab.getByText(/Writing in News collection/)).toBeVisible({ timeout: 30_000 });
  await ready(tab);
  const titleBox = tab.getByLabel("Title", { exact: true });
  await expect(site(tab).locator("main")).toBeVisible({ timeout: 30_000 });
  const frame = tab.frame({ url: /editor-preview/ });
  expect(frame).not.toBeNull();
  const renders: number[] = [];
  for (const ch of ["Q", "W", "E", "R", "T"]) {
    await frame!.evaluate((c) => {
      const w = window as unknown as { __seen?: number };
      w.__seen = 0;
      const want = new RegExp(`${c}$`);
      const h1 = () => document.querySelector("main h1")?.textContent?.trim() ?? "";
      const obs = new MutationObserver(() => {
        if (!w.__seen && want.test(h1())) {
          w.__seen = Date.now();
          obs.disconnect();
        }
      });
      obs.observe(document.body, { subtree: true, childList: true, characterData: true });
    }, ch);
    await titleBox.press("End");
    const t0 = await tab.evaluate(() => Date.now());
    await tab.keyboard.type(ch);
    await expect
      .poll(() => frame!.evaluate(() => (window as unknown as { __seen?: number }).__seen ?? 0))
      .toBeGreaterThan(0);
    const seen = await frame!.evaluate(() => (window as unknown as { __seen?: number }).__seen!);
    renders.push(seen - t0);
  }
  // The site check on the current form data (what Save runs, spec §3.6e).
  const checks = await tab.evaluate(async () => {
    const w = window as unknown as {
      CMS: { editor: { getCurrentEntry(): { data: unknown; slug?: string } } };
      BobalabLive: {
        checkSave(o: unknown): Promise<{ available: boolean; blocking: unknown[] }>;
      };
    };
    const e = w.CMS.editor.getCurrentEntry() as {
      data: { toJS?: () => unknown } | Record<string, unknown>;
    };
    const data =
      e.data && typeof (e.data as { toJS?: () => unknown }).toJS === "function"
        ? (e.data as { toJS: () => unknown }).toJS()
        : e.data;
    const out: Array<{ ms: number; available: boolean; blocking: number }> = [];
    for (let i = 0; i < 5; i++) {
      const t = performance.now();
      const r = await w.BobalabLive.checkSave({
        entry: { collection: "news", slug: "2026-05-11-learning-to-gig-revision" },
        isNew: false,
        data,
        timeoutMs: 4000,
      });
      out.push({
        ms: Math.round(performance.now() - t),
        available: r.available,
        blocking: r.blocking.length,
      });
    }
    return out;
  });
  for (const c of checks) expect(c.available).toBe(true);
  measured("live-column", {
    baseLoadFirst: first,
    baseLoadOtherEntrySameTab: other,
    baseLoadAfterReload: reload,
    editToRenderMs: renders,
    siteCheckMs: checks.map((c) => c.ms),
    siteCheckBlocking: checks.map((c) => c.blocking),
  });
  await tab.close({ runBeforeUnload: false });
});

// ---------------------------------------------------------------------------
// Verification fixes (CMS-01…CMS-13, A11Y-02), against a second SCRATCH COPY of
// content/: a second decap-server writes into test-results/, never into this
// checkout, so saving site.yml or a direction cannot touch real content.

test.describe("verification fixes, on a scratch copy of content/", () => {
  const SCRATCH_PORT = 8088;
  const SCRATCH = path.join(ROOT, "test-results", "cms-e2e-scratch");
  const PAGE = "local-scratch.html";
  const CONFIG = "config.local-scratch.yml";
  let scratchProxy: ChildProcess | null = null;
  let scratchHtml = "";
  let scratchYml = "";
  const scratchFile = (rel: string) => fs.readFileSync(path.join(SCRATCH, rel), "utf8");
  const reset = (rel: string) => fs.copyFileSync(path.join(ROOT, rel), path.join(SCRATCH, rel));

  test.beforeAll(async () => {
    copyContent(SCRATCH);
    ({ html: scratchHtml, yml: scratchYml } = await localFiles(SCRATCH_PORT, CONFIG));
    if (await portOpen(SCRATCH_PORT)) throw new Error(`port ${SCRATCH_PORT} is busy`);
    scratchProxy = startProxy(SCRATCH_PORT, SCRATCH);
    await waitForPort(SCRATCH_PORT, 30_000);
  });

  test.afterAll(() => {
    killTree(scratchProxy);
    scratchProxy = null;
    fs.rmSync(SCRATCH, { recursive: true, force: true });
  });

  test.beforeEach(async ({ context }) => {
    await serve(context, PAGE, scratchHtml, "text/html");
    await serve(context, CONFIG, scratchYml, "text/yaml");
  });

  async function enter(page: Page, hash = "") {
    const errors: string[] = [];
    page.on("pageerror", (e) => {
      // Decap 3.17.1 leaves its persist promise's rejection unhandled after any
      // refused save (MEASURED, WP5): "undefined" / "Object" in Chromium.
      const first = String(e.stack || e.message)
        .split(/\r?\n/)[0]!
        .trim();
      if (/^(Unhandled Promise Rejection: )?(undefined|Object|\[object Object\])$/.test(first))
        return;
      errors.push(String(e?.message ?? e));
    });
    page.on("dialog", answerDialogs);
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

  test("an address change after a save opens the named entry, and Save writes that file (CMS-02)", async ({
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
      // The refusal stays in the "Not saved" band at the top of the form (spec §3.8).
      const band = page.locator("#bl-refusal");
      await expect(band).toContainText(/Not saved: “As of” is needed/, { timeout: 30_000 });
      await expect(band).toContainText(/“Status source” is needed/);
      await expect(band).toContainText(/choose at least one “Research direction”/);
      await page.screenshot({ path: path.join(OUT, "e2e-required-when.png") });
      expect(mine()).toEqual([]);

      // A colour another live direction uses: the live column says so, the save is refused.
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
      const info = live(page).locator(".bl-band--info");
      await expect(info).toContainText("Colour taken.", { timeout: 15_000 });
      await expect(info).toContainText(`“${takenBy}”`);
      await publish(page);
      await expect(band).toContainText(/is already the colour of/, { timeout: 30_000 });
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
