/**
 * Editor v2, WP4: the live column in the browser (spec §2, §3.7, §4, §9 "WP4 cms-live.spec.ts").
 *
 * Runs the real /admin/ page (Decap 3.17.1 plus our scripts, from the dev server)
 * against a SCRATCH COPY of content/ and public/uploads/ in test-results/, written
 * by its own decap-server (port CMS_LIVE_PROXY_PORT, default 8092). The local admin
 * page and its config are served from memory through Playwright routes, so the
 * spec writes nothing into public/admin/ and never saves into this checkout.
 * GitHub (History, the conflict check) is api.github.com answered by a route from
 * a small fictional history; no request leaves the machine.
 *
 * Checks: typed text reaches the real page in the nested frame within 1 s for one
 * entry per collection plus the Home page and Settings (typing only: those two
 * are never saved); an uploaded image shows within 1 s with no typing; page tabs,
 * Find my entry and Desktop/Phone; Decap's frame never scrolls; History rows; the
 * older-version preview of a person whose photo consent was withdrawn shows no
 * photo; Restore saves (the richtext body intact); the dock's Undo; Undo from
 * another entry does not touch it; "Bring in their changes" merges and shows the
 * conflict; axe on our UI.
 *
 *   BASE_URL=http://localhost:3100 npx playwright test tests/e2e/cms-live.spec.ts --project=chromium
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
  type FrameLocator,
  type Page,
  type Route,
} from "@playwright/test";
import { guardFiles, guardFolder, REPO_ROOT, type FolderGuard } from "./helpers/content-guard";

test.describe.configure({ mode: "serial" });

const ROOT = REPO_ROOT;
const BASE = process.env.BASE_URL || "http://localhost:3100";
const PORT = Number(process.env.CMS_LIVE_PROXY_PORT || 8092);
const SCRATCH = path.join(ROOT, "test-results", "cms-live-scratch");
// Served from memory by page routes; never written to public/admin/.
const PAGE = "local-live.html";
const CONFIG = "config.local-live.yml";
const SMOKE = "cms-live-smoke";
const SAVE = { name: "Save", exact: true } as const;
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const REPO = "bobalabx/bobalab-web";

// A 2×2 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8DwnwEJMBIBAEhiAgL/F1CaAAAAAElFTkSuQmCC",
  "base64",
);

// ---------------------------------------------------------------------------
// The smoke person and her fictional history on GitHub

const PERSON = "cms-live-smoke-jane";
const PERSON_PATH = `content/people/${PERSON}.md`;
const PHOTO = "/uploads/people/alex-chen.jpg"; // an upload that exists (the restore keeps it)
const RICH_BODY = [
  "## About Jane",
  "",
  "Jane studies **gig work** and [algorithms](https://example.org/research).",
  "",
  "- Field data",
  "- Experiments",
].join("\n");

function personFile(d: Record<string, unknown>, body: string) {
  const lines = Object.entries(d).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join("\n")}\n---\n\n${body}\n`;
}

const V1 = {
  name: "Jane Smoke",
  role: "phd",
  title: "Student",
  listed: true,
  profile_page: true,
  photo: PHOTO,
  photo_alt: "Jane at the lab",
  photo_consent: true,
  email: "jane@example.edu",
  email_public: true,
  draft: false,
};
const V2 = { ...V1, title: "Researcher", program: "PhD in Operations" };
// Then Jane withdrew photo consent and asked to hide her email.
const V3 = {
  name: "Jane Smoke",
  role: "phd",
  title: "Senior researcher",
  program: "PhD in Operations",
  listed: true,
  profile_page: true,
  photo_consent: false,
  email: "jane@example.edu",
  email_public: false,
  draft: false,
};
const TEXT: Record<string, string> = {
  c1: personFile(V1, RICH_BODY),
  c2: personFile(V2, "Short bio."),
  c3: personFile(V3, "Short bio."),
};

interface Commit {
  sha: string;
  parents: Array<{ sha: string }>;
  html_url: string;
  author: { login: string; avatar_url: string | null } | null;
  commit: { message: string; author: { name: string; date: string }; committer: { date: string } };
}

function commit(
  sha: string,
  parent: string | null,
  date: string,
  message: string,
  login: string,
  name: string,
): Commit {
  return {
    sha,
    parents: parent ? [{ sha: parent }] : [],
    html_url: `https://github.com/${REPO}/commit/${sha}`,
    author: { login, avatar_url: null },
    commit: { message, author: { name, date }, committer: { date } },
  };
}

const HISTORY = () => [
  commit(
    "c3",
    "p3",
    "2026-10-26T18:00:00Z",
    `Edit Person “${PERSON}” (by @icho)`,
    "icho",
    "Isabelle Cho",
  ),
  commit(
    "c2",
    "p2",
    "2026-10-25T10:00:00Z",
    `Edit Person “${PERSON}” (by @jazzb)`,
    "jazzb",
    "Jazz Beecham",
  ),
  commit(
    "c1",
    "p0",
    "2026-10-24T17:02:00Z",
    `Add Person “${PERSON}” (by @jazzb)`,
    "jazzb",
    "Jazz Beecham",
  ),
];

/** What the GitHub route answers; reset before every test. */
const GH = {
  commits: {} as Record<string, Commit[]>,
  texts: {} as Record<string, string>,
  requests: [] as string[],
};

function resetGitHub() {
  GH.commits = { [PERSON_PATH]: HISTORY() };
  GH.texts = Object.fromEntries(
    Object.entries(TEXT).map(([sha, t]) => [`${PERSON_PATH}@${sha}`, t]),
  );
  GH.requests = [];
}

function listFolder(rel: string, recursive: boolean) {
  const dir = path.join(SCRATCH, rel);
  if (!fs.existsSync(dir)) return [];
  const out: Array<{ path: string; type: string }> = [];
  const walk = (d: string, prefix: string) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = prefix ? `${prefix}/${f.name}` : f.name;
      if (f.isDirectory()) {
        out.push({ path: p, type: "tree" });
        if (recursive) walk(path.join(d, f.name), p);
      } else out.push({ path: p, type: "blob" });
    }
  };
  walk(dir, "");
  return out;
}

async function answerGitHub(route: Route) {
  const req = route.request();
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "GET",
    "access-control-expose-headers": "*",
  };
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
  const u = new URL(req.url());
  const p = decodeURIComponent(u.pathname);
  GH.requests.push(decodeURIComponent(u.pathname + u.search));
  const json = (body: unknown, status = 200) =>
    route.fulfill({
      status,
      headers: { ...cors, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  if (req.method() !== "GET") return json({ message: "read-only mock" }, 405);
  if (p === `/repos/${REPO}/commits`) {
    const file = u.searchParams.get("path") ?? "";
    const per = Number(u.searchParams.get("per_page") ?? 30);
    const page = Number(u.searchParams.get("page") ?? 1);
    const rows = (GH.commits[file] ?? []).slice((page - 1) * per, page * per);
    return json(rows);
  }
  let m = new RegExp(`^/repos/${REPO}/contents/(.+)$`).exec(p);
  if (m) {
    const text = GH.texts[`${m[1]}@${u.searchParams.get("ref")}`];
    if (text === undefined) return json({ message: "Not Found" }, 404);
    return route.fulfill({
      status: 200,
      headers: { ...cors, "content-type": "text/plain; charset=utf-8" },
      body: text,
    });
  }
  m = new RegExp(`^/repos/${REPO}/git/trees/main:(.+)$`).exec(p);
  if (m) return json({ sha: "tree", tree: listFolder(m[1]!, u.searchParams.has("recursive")) });
  if (p.startsWith(`/repos/${REPO}/actions/`))
    return json({ total_count: 0, workflow_runs: [], jobs: [] });
  return json({ message: "Not Found" }, 404);
}

// ---------------------------------------------------------------------------
// The harness

let proxy: ChildProcess | null = null;
let proxyLog = "";
let html = "";
let yml = "";
let realGuards: FolderGuard[] = [];
const scratch = (rel: string) => path.join(SCRATCH, rel);
// Real entries the typing test opens (it never saves; this proves it).
const realFiles = guardFiles([
  "content/news/2023-08-30-nasa-symposium.md",
  "content/publications/allon-2023-gig-drivers.md",
  "content/people/park-sinchaisri.md",
  "content/directions/ai-at-work.md",
  "content/projects/agentic-ai-authority.md",
  "content/opportunities/collaborators.md",
  "content/pages/home.yml",
  "content/site.yml",
]);

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

function killTree(child: ChildProcess | null) {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
  else child.kill("SIGTERM");
}

test.beforeAll(async () => {
  realGuards = [
    guardFolder("content/news", new RegExp(SMOKE)),
    guardFolder("content/people", new RegExp(SMOKE)),
    guardFolder("public/uploads", /cms-live/),
  ];
  fs.rmSync(SCRATCH, { recursive: true, force: true });
  fs.mkdirSync(scratch("public"), { recursive: true });
  fs.cpSync(path.join(ROOT, "content"), scratch("content"), { recursive: true });
  fs.cpSync(path.join(ROOT, "public", "uploads"), scratch("public/uploads"), { recursive: true });
  const { generate } = await import("../../scripts/cms/build-config.mjs");
  const files = (await generate({
    local: true,
    localSiteUrl: BASE,
    proxyUrl: `http://localhost:${PORT}/api/v1`,
  })) as Record<string, string>;
  html = files["public/admin/local.html"]!.replace('href="config.local.yml"', `href="${CONFIG}"`);
  yml = files["public/admin/config.local.yml"]!;
  if (await portOpen(PORT)) throw new Error(`port ${PORT} is busy (another decap-server?)`);
  proxy = spawn(
    process.execPath,
    [path.join(ROOT, "node_modules", "decap-server", "dist", "index.js")],
    {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT), MODE: "fs", GIT_REPO_DIRECTORY: SCRATCH },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  proxy.stdout?.on("data", (d) => (proxyLog += d));
  proxy.stderr?.on("data", (d) => (proxyLog += d));
  const until = Date.now() + 30_000;
  while (!(await portOpen(PORT))) {
    if (Date.now() > until) throw new Error(`decap-server did not open port ${PORT}:\n${proxyLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }
});

test.afterAll(() => {
  killTree(proxy);
  proxy = null;
  fs.rmSync(SCRATCH, { recursive: true, force: true });
  const left = realGuards.flatMap((g) => g.removeAdded());
  if (left.length) throw new Error(`smoke files were saved into this checkout: ${left.join(", ")}`);
  realFiles.assertUnchanged();
});

test.beforeEach(async ({ context, request, browserName }) => {
  const res = await request.get("/admin/cms-live.js");
  test.skip(res.status() === 404, "needs a server that serves public/admin/");
  resetGitHub();
  // The smoke person, as saved on "GitHub" (version c3).
  fs.writeFileSync(scratch(PERSON_PATH), TEXT.c3!);
  // The page comes from a route, so Chromium treats the proxy on another localhost
  // port as a local-network request (WebKit has no such permission).
  if (browserName === "chromium")
    await context.grantPermissions(["local-network-access"]).catch(() => {});
  await serveLocalPage(context);
  await context.route("https://api.github.com/**", answerGitHub);
  // The first-use tip (cms-save.js) would sit over the bottom of the form.
  await context.addInitScript(() => {
    try {
      localStorage.setItem("bobalab.saveTip.v1", "1");
    } catch {
      // ignore
    }
  });
});

test.afterEach(() => {
  fs.rmSync(scratch(PERSON_PATH), { force: true });
});

async function serveLocalPage(context: BrowserContext) {
  await context.route(`**/admin/${PAGE}*`, (r) =>
    r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html }),
  );
  await context.route(`**/admin/${CONFIG}*`, (r) =>
    r.fulfill({ status: 200, contentType: "text/yaml; charset=utf-8", body: yml }),
  );
}

/**
 * Page errors, without the one Decap 3.17.1 causes itself when a save stops (see
 * cms-save.spec.ts): its persist promise's rejection is left unhandled. Chromium
 * reports it as "undefined" or "Object", WebKit as "Unhandled Promise Rejection: …".
 */
function pageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    if (e.message === "undefined" || e.message === "Object") return;
    const first = String(e.stack || e.message)
      .split(/\r?\n/)[0]!
      .trim();
    if (/^(Unhandled Promise Rejection: )?(undefined|\[object Object\])$/.test(first)) return;
    errors.push(String(e.stack || e.message));
  });
  return errors;
}

async function login(page: Page) {
  page.on("dialog", (d) => d.accept().catch(() => {}));
  await page.goto(`/admin/${PAGE}`);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Collections" })).toBeVisible({ timeout: 30_000 });
}

async function openEditor(page: Page, hash: string) {
  await page.goto(`/admin/${PAGE}${hash}`);
  await expect(page.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
}

const live = (page: Page): FrameLocator => page.frameLocator("#preview-pane");
const site = (page: Page): FrameLocator => live(page).frameLocator("iframe.bl-live__site");

/** The preview is up and has the saved site (BobalabLive.whenReady). */
async function ready(page: Page) {
  // A direct address change from one entry to another reloads the page
  // (cms-start.js), so the old document can still answer openEditor's check while
  // the new one has not run our scripts yet (MEASURED in WebKit under load, WP6):
  // wait for the scripts, and retry once if the reload replaces the document.
  for (let attempt = 0; ; attempt++) {
    try {
      await page.waitForFunction(() => "BobalabLive" in window, null, { timeout: 30_000 });
      const ok = await page.evaluate(() =>
        (
          window as unknown as { BobalabLive: { whenReady(ms: number): Promise<boolean> } }
        ).BobalabLive.whenReady(60_000),
      );
      expect(ok).toBe(true);
      return;
    } catch (e) {
      if (attempt > 0 || !/context was destroyed|navigation/i.test(String(e))) throw e;
      await page.waitForLoadState("load");
    }
  }
}

/** Make the page behave as if signed in to GitHub (the dock, Undo and the conflict check need it). */
async function asGitHub(page: Page) {
  await page.evaluate(() => {
    const g = (window as unknown as { BobalabGitHub: Record<string, unknown> }).BobalabGitHub;
    g.mode = () => "github";
    g.user = () => ({ login: "e2e-editor", name: "E2E Editor", token: "not-a-token" });
  });
}

function scratchText(rel: string) {
  return fs.readFileSync(scratch(rel), "utf8");
}

// ---------------------------------------------------------------------------
// The live preview

const CASES: Array<{ name: string; hash: string; label: string | RegExp }> = [
  { name: "news", hash: "#/collections/news/entries/2023-08-30-nasa-symposium", label: "Title" },
  {
    name: "publications",
    hash: "#/collections/publications/entries/allon-2023-gig-drivers",
    label: "Title",
  },
  { name: "people", hash: "#/collections/people/entries/park-sinchaisri", label: "Name" },
  { name: "directions", hash: "#/collections/directions/entries/ai-at-work", label: "Title" },
  { name: "projects", hash: "#/collections/projects/entries/agentic-ai-authority", label: "Title" },
  {
    name: "opportunities",
    hash: "#/collections/opportunities/entries/collaborators",
    label: "Title",
  },
  // Decap appends "(optional)" to this one's name.
  {
    name: "pages/home",
    hash: "#/collections/pages/entries/home",
    label: /^Statement \(page heading\)/,
  },
  { name: "settings/site", hash: "#/collections/settings/entries/site", label: "Full lab name" },
];

test("typed text shows in the real page within 1 s, for every collection, the Home page and Settings", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const errors = pageErrors(page);
  await login(page);
  const times: string[] = [];
  for (const c of CASES) {
    await openEditor(page, c.hash);
    await ready(page);
    const field =
      typeof c.label === "string"
        ? page.getByLabel(c.label, { exact: true })
        : page.getByLabel(c.label);
    const before = await field.inputValue();
    await expect(site(page).locator("body")).toContainText(before.slice(0, 30), {
      timeout: 15_000,
    });
    const typed = `${before} Live${c.name.replace(/\W/g, "")}`;
    const t0 = Date.now();
    await field.fill(typed);
    await expect(site(page).locator("body"), c.name).toContainText(typed, { timeout: 1000 });
    times.push(`${c.name} ${Date.now() - t0} ms`);
  }
  console.log(`[cms-live] edit → nested frame: ${times.join(", ")}`);
  expect(errors).toEqual([]);
  // Typing only: nothing was saved (the scratch copy keeps its bytes too).
  for (const f of realFiles.files)
    expect(scratchText(f), f).toBe(fs.readFileSync(path.join(ROOT, f), "utf8"));
});

test("an uploaded image shows in the real page within 1 s, without typing; nothing is written", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const errors = pageErrors(page);
  const uploads = guardFolder("public/uploads", /./, { root: SCRATCH });
  await login(page);
  await openEditor(page, "#/collections/news/entries/2023-08-30-nasa-symposium");
  await ready(page);
  const top = page.locator('[class*="TopBarContainer"]').filter({ hasText: /^Image/ });
  const chooser = page.locator("button", { hasText: /^Choose an image$/ }).first();
  if (!(await chooser.isVisible()))
    await top.locator('button[class*="ExpandButton"]').first().click();
  await chooser.scrollIntoViewIfNeeded();
  await chooser.click();
  await expect(page.locator("input[type=file]").first()).toBeAttached({ timeout: 10_000 });
  await page.waitForTimeout(500);
  await page.locator("input[type=file]").first().setInputFiles({
    name: "cms-live-upload.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  const choose = page.getByRole("button", { name: "Choose selected" });
  await expect(choose).toBeEnabled({ timeout: 10_000 });
  const t0 = Date.now();
  await choose.click();
  const img = site(page).locator('img[src^="data:image/png;base64,"]');
  await expect(img).toBeVisible({ timeout: 1000 });
  console.log(`[cms-live] upload → nested frame: ${Date.now() - t0} ms`);
  await page.waitForTimeout(1000);
  expect(uploads.added()).toEqual([]);
  expect(errors).toEqual([]);
});

test("page tabs, Find my entry and Desktop/Phone work; Decap's frame never scrolls", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const errors = pageErrors(page);
  await login(page);
  await openEditor(page, "#/collections/news/entries/2023-08-30-nasa-symposium");
  await ready(page);
  const bar = live(page);
  const tabs = bar.getByRole("tablist", { name: "Page" });
  await expect(tabs.getByRole("tab")).toHaveText(["Article", "News list", "Home page"]);
  await expect(tabs.getByRole("tab", { name: "Article" })).toHaveAttribute("aria-selected", "true");
  // Manual activation: arrows move the focus, Enter selects.
  await tabs.getByRole("tab", { name: "Article" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "News list" })).toBeFocused();
  await expect(tabs.getByRole("tab", { name: "Article" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expect(tabs.getByRole("tab", { name: "News list" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(site(page).locator("h1").first()).toHaveText("News");
  const mark = site(page).locator('[data-entry="news/2023-08-30-nasa-symposium"]').first();
  await expect(mark).toHaveAttribute("data-ep-editing", "Editing");
  await expect(bar.locator(".bl-live__address")).toContainText("/news/ · saved version");
  await expect(bar.locator("iframe.bl-live__site")).toHaveAttribute(
    "title",
    "Site preview: News list, saved version",
  );
  // Find my entry: the card is scrolled to, focused and flashed.
  await bar.getByRole("button", { name: "Find my entry" }).click();
  await expect(mark).toHaveClass(/ep-flash/);
  await expect(mark).toBeFocused();
  // Desktop | Phone, kept after a reload.
  const frame = bar.locator("iframe.bl-live__site");
  expect(await frame.evaluate((f) => f.style.width)).toMatch(/^1\d{3}(\.\d+)?px$/);
  await bar.getByRole("button", { name: "Phone" }).click();
  await expect(bar.getByRole("button", { name: "Phone" })).toHaveAttribute("aria-pressed", "true");
  expect(await frame.evaluate((f) => f.style.width)).toBe("390px");
  await page.reload();
  await expect(page.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
  await expect(live(page).getByRole("button", { name: "Phone" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await live(page).getByRole("button", { name: "Desktop" }).click();
  await ready(page);
  // Scrolling the form never scrolls Decap's frame (its scroll sync has nothing to move).
  const pane = page.locator('[class*="StyledSplitPane"] > .Pane1');
  const box = await pane.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, 2500);
  await page.waitForTimeout(600);
  const scrolled = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[class*="StyledSplitPane"] > .Pane1 *'));
    return Math.max(0, ...els.map((e) => (e as HTMLElement).scrollTop));
  });
  expect(scrolled).toBeGreaterThan(0);
  const frameScroll = await page.evaluate(() => {
    const f = document.querySelector("iframe#preview-pane") as HTMLIFrameElement;
    return f.contentDocument!.scrollingElement!.scrollTop;
  });
  expect(frameScroll).toBe(0);
  expect(errors).toEqual([]);
});

test("the site check runs the deploy's validator: a duplicate title shows in the bar and blocks checkSave", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const errors = pageErrors(page);
  const file = "content/publications/allon-2026-multihoming-workers.md";
  const guard = guardFiles([file], { root: SCRATCH });
  await login(page);
  await openEditor(page, "#/collections/publications/entries/allon-2026-multihoming-workers");
  await ready(page);
  const other = /^title: (.*)$/m
    .exec(scratchText("content/publications/allon-2023-gig-drivers.md"))![1]!
    .replace(/^["']|["']$/g, "");
  await page.getByLabel("Title", { exact: true }).fill(other);
  const band = live(page).locator(".bl-band--problem");
  await expect(band).toContainText("The site check would stop this save:", { timeout: 5000 });
  // Said from this publication's side (both carry the same title): the field, the
  // other one's title, and a button that opens the other one.
  await expect(band).toContainText(
    `Title: Another publication already has this exact title (“${other}”). Change one of them.`,
  );
  await expect(band).toContainText("Save is blocked until this is fixed.");
  await expect(band.getByRole("button", { name: "Open the other publication" })).toBeVisible();
  const r = await page.evaluate(
    (title) =>
      (
        window as unknown as {
          BobalabLive: {
            checkSave(
              o: object,
            ): Promise<{ available: boolean; blocking: Array<{ code: string; file: string }> }>;
          };
        }
      ).BobalabLive.checkSave({
        entry: { collection: "publications", slug: "allon-2026-multihoming-workers" },
        isNew: false,
        data: {
          ...(
            window as unknown as { CMS: { editor: { getCurrentEntry(): { data: object } } } }
          ).CMS.editor.getCurrentEntry().data,
          title,
        },
      }),
    other,
  );
  expect(r.available).toBe(true);
  expect(r.blocking.map((i) => i.code)).toContain("E_DUP_TITLE");
  // Typing only: nothing was written.
  await page.waitForTimeout(500);
  guard.assertUnchanged();
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// History, Restore, Undo, Bring in their changes

test("History lists the saves; an older version of a person who withdrew photo consent shows no photo", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const errors = pageErrors(page);
  await login(page);
  await openEditor(page, `#/collections/people/entries/${PERSON}`);
  await ready(page);
  const bar = live(page);
  await bar.getByRole("tab", { name: "History" }).click();
  await expect(
    bar.getByText("History is read from GitHub (bobalabx/bobalab-web), not from your computer."),
  ).toBeVisible();
  const rows = bar.locator(".bl-history__row");
  await expect(rows).toHaveCount(3, { timeout: 20_000 });
  await expect(rows.nth(0)).toContainText("Isabelle Cho changed Position title", {
    timeout: 20_000,
  });
  await expect(rows.nth(0)).toContainText("Current version");
  await expect(rows.nth(1)).toContainText("Jazz Beecham changed Position title, Program");
  await expect(rows.nth(2)).toContainText("Jazz Beecham created this entry");
  // The top row: what changed (masked), and Undo.
  await rows.nth(0).click();
  await expect(bar.locator(".bl-history__changes")).toContainText(
    "Image: removed (hidden: Photo consent is off)",
  );
  await expect(bar.locator(".bl-history__changes")).not.toContainText("alex-chen");
  await expect(bar.getByRole("button", { name: /^Undo this change/ })).toBeVisible();
  // The first version had a photo with consent; the preview shows what Restore would save.
  await bar.locator('[data-sha="c1"]').click();
  await expect(bar.locator(".bl-band--older")).toContainText(
    "Older version · saved by Jazz Beecham",
  );
  await expect(bar.locator(".bl-band--older")).toContainText("“Photo consent” stays off");
  await expect(bar.locator(".bl-live__address")).toContainText("older version");
  await expect(site(page).locator("h1").first()).toContainText("Jane Smoke");
  await expect(site(page).locator("body")).toContainText("Student"); // the old position title
  await expect(site(page).locator(`img[src*="alex-chen"]`)).toHaveCount(0);
  await expect(site(page).locator("body")).not.toContainText("jane@example.edu");
  // Back to the current version.
  await bar.getByRole("button", { name: "Back to the current version" }).click();
  await expect(site(page).locator("body")).toContainText("Senior researcher");
  // Nothing was written by looking.
  expect(scratchText(PERSON_PATH)).toBe(TEXT.c3);
  expect(errors).toEqual([]);
});

test("keyboard: closing the Restore dialog (Esc or Cancel) gives the focus back to its button", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const errors = pageErrors(page);
  await login(page);
  await openEditor(page, `#/collections/people/entries/${PERSON}`);
  await ready(page);
  const bar = live(page);
  await bar.getByRole("tab", { name: "History" }).click();
  await expect(bar.locator(".bl-history__row")).toHaveCount(3, { timeout: 20_000 });
  await bar.locator('[data-sha="c1"]').click();
  const restore = bar
    .locator(".bl-band--older")
    .getByRole("button", { name: /^Restore the version from/ });
  const dialog = page.getByRole("dialog");
  for (const close of ["Escape", "Cancel"]) {
    await restore.focus();
    await page.keyboard.press("Enter");
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press(close === "Escape" ? "Escape" : "Enter");
    await expect(dialog).toHaveCount(0);
    // The opener lives in Decap's preview frame; the focus must not stop on that frame's page.
    await expect(restore, close).toBeFocused();
  }
  expect(scratchText(PERSON_PATH)).toBe(TEXT.c3);
  expect(errors).toEqual([]);
});

test("Restore asks, then saves through Save; the richtext body comes back intact", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = pageErrors(page);
  await login(page);
  await openEditor(page, `#/collections/people/entries/${PERSON}`);
  await ready(page);
  const bar = live(page);
  await bar.getByRole("tab", { name: "History" }).click();
  await expect(bar.locator(".bl-history__row")).toHaveCount(3, { timeout: 20_000 });
  await bar.locator('[data-sha="c1"]').click();
  await bar
    .locator(".bl-band--older")
    .getByRole("button", { name: /^Restore the version from/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Restore the version from");
  await expect(dialog).toContainText("It replaces 2 later saves:");
  await expect(dialog).toContainText(
    "It is saved now and the live site updates in about 2 minutes.",
  );
  await expect(
    dialog.getByRole("checkbox", {
      name: "Also bring back removed personal details (email, now at, photo, CV)",
    }),
  ).not.toBeChecked();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Restore this version" }).click();
  await expect
    .poll(() => scratchText(PERSON_PATH), { timeout: 30_000 })
    .toContain("title: Student");
  const saved = scratchText(PERSON_PATH);
  // The body, exactly; the photo did not come back (no consent), consent stays off.
  const body = saved.split(/^---$/m)[2]!.trim();
  expect(body).toBe(RICH_BODY);
  expect(saved).not.toContain("alex-chen");
  expect(saved).toMatch(/photo_consent: false/);
  expect(saved).toMatch(/email_public: false/);
  expect(errors).toEqual([]);
});

test("the dock's Undo restores the version before the save", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = pageErrors(page);
  await login(page);
  await asGitHub(page);
  await openEditor(page, `#/collections/people/entries/${PERSON}`);
  await asGitHub(page);
  await ready(page);
  await page.getByLabel(/^Position title/).fill("Visiting scholar");
  await page.getByRole("button", SAVE).click();
  await expect
    .poll(() => scratchText(PERSON_PATH), { timeout: 30_000 })
    .toContain("Visiting scholar");
  // GitHub now has the save (made by this editor, after c3).
  GH.texts[`${PERSON_PATH}@c4`] = scratchText(PERSON_PATH);
  GH.commits[PERSON_PATH] = [
    commit(
      "c4",
      "c3",
      new Date().toISOString(),
      `Edit Person “${PERSON}” (by @e2e-editor)`,
      "e2e-editor",
      "E2E Editor",
    ),
    ...HISTORY(),
  ];
  const undo = page
    .locator("#bl-toasts")
    .getByRole("button", { name: "Undo this save: go back to the version before it" });
  await expect(undo).toBeVisible({ timeout: 20_000 });
  await undo.click();
  await expect
    .poll(() => scratchText(PERSON_PATH), { timeout: 30_000 })
    .not.toContain("Visiting scholar");
  expect(scratchText(PERSON_PATH)).toContain("Senior researcher");
  expect(errors).toEqual([]);
});

test("Undo from another entry does not touch it: the saved entry's History opens instead", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const errors = pageErrors(page);
  const other = "content/news/2023-08-30-nasa-symposium.md";
  const guard = guardFiles([other], { root: SCRATCH });
  await login(page);
  await openEditor(page, "#/collections/news/entries/2023-08-30-nasa-symposium");
  await ready(page);
  const r = await page.evaluate(
    (p) =>
      (
        window as unknown as {
          BobalabLive: { restoreVersion(o: object): Promise<{ ok: boolean; routed?: boolean }> };
        }
      ).BobalabLive.restoreVersion({
        path: p,
        sha: "c3",
        save: true,
        source: "undo",
      }),
    PERSON_PATH,
  );
  expect(r).toMatchObject({ ok: false, routed: true });
  await expect(page).toHaveURL(new RegExp(`#/collections/people/entries/${PERSON}$`), {
    timeout: 15_000,
  });
  await expect(page.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
  const bar = live(page);
  await expect(bar.getByRole("tab", { name: "History" })).toHaveAttribute("aria-selected", "true", {
    timeout: 20_000,
  });
  await expect(bar.locator('[data-sha="c3"]')).toHaveAttribute("aria-expanded", "true", {
    timeout: 20_000,
  });
  await expect(bar.getByRole("button", { name: /^Undo this change/ })).toBeVisible();
  await page.waitForTimeout(1000);
  guard.assertUnchanged();
  expect(scratchText(PERSON_PATH)).toBe(TEXT.c3);
  expect(errors).toEqual([]);
});

test("a colleague's newer save: Save stops, and Bring in their changes merges and shows the conflict", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = pageErrors(page);
  await login(page);
  await asGitHub(page);
  await openEditor(page, `#/collections/people/entries/${PERSON}`);
  await asGitHub(page);
  await ready(page);
  await page.waitForTimeout(1500); // the conflict baseline (c3) is read when the entry opens
  await page.getByLabel(/^Position title/).fill("Visiting scholar");
  // Meanwhile Isabelle saves: a new program and her own position title.
  const theirs = { ...V3, title: "Postdoc", program: "PhD in Marketing" };
  GH.texts[`${PERSON_PATH}@c5`] = personFile(theirs, "Short bio.");
  GH.commits[PERSON_PATH] = [
    commit(
      "c5",
      "c3",
      new Date(Date.now() - 60_000).toISOString(),
      `Edit Person “${PERSON}” (by @icho)`,
      "icho",
      "Isabelle Cho",
    ),
    ...HISTORY(),
  ];
  await page.getByRole("button", SAVE).click();
  const band = page.locator("#bl-refusal");
  await expect(band).toContainText("Not saved: Isabelle Cho (@icho) saved this entry at", {
    timeout: 20_000,
  });
  await band.getByRole("button", { name: "Bring in their changes" }).click();
  const bar = live(page);
  await expect(bar.locator(".bl-band--info")).toContainText("Brought in Isabelle Cho's save from", {
    timeout: 20_000,
  });
  await expect(bar.locator(".bl-band--info")).toContainText(
    "You both changed Position title: the form now has their text; yours is below.",
  );
  await expect(bar.locator("pre.bl-band__mine")).toHaveText("Visiting scholar");
  await expect(bar.getByRole("button", { name: "Copy my Position title" })).toBeVisible();
  await expect(page.getByLabel(/^Position title/)).toHaveValue("Postdoc");
  await expect(page.getByLabel(/^Program/)).toHaveValue("PhD in Marketing");
  // Nothing was saved yet: the editor checks the preview, then presses Save.
  expect(scratchText(PERSON_PATH)).toBe(TEXT.c3);
  expect(errors).toEqual([]);
});

test("no serious or critical axe violations in the live column (preview, bands, History)", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await login(page);
  await openEditor(page, `#/collections/people/entries/${PERSON}`);
  await ready(page);
  const scan = async (what: string) => {
    const r = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .include(["#preview-pane", ".bl-live"])
      .exclude(["#preview-pane", "iframe.bl-live__site"])
      .analyze();
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(
      bad.map((v) => `${what}: ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
    ).toEqual([]);
  };
  await scan("live preview");
  const bar = live(page);
  await bar.getByRole("tab", { name: "History" }).click();
  await expect(bar.locator(".bl-history__row")).toHaveCount(3, { timeout: 20_000 });
  await bar.locator('[data-sha="c3"]').click();
  await scan("history");
  await bar.locator('[data-sha="c1"]').click();
  await expect(bar.locator(".bl-band--older")).toBeVisible();
  await scan("older version");
});
