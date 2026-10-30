/**
 * Editor v2, WP5: "Save goes live" in the browser (spec §3, §8, §9 "WP5 cms-save.spec.ts").
 *
 * Runs the real /admin/ page (Decap 3.17.1 plus our scripts, from the dev server)
 * against a SCRATCH COPY of content/ and public/uploads/ in test-results/,
 * written by its own decap-server (port CMS_SAVE_PROXY_PORT, default 8093). The
 * local admin page and its config are served from memory through Playwright
 * routes, so the spec writes nothing into public/admin/ and never saves into
 * this checkout. The content guard (helpers/content-guard.ts) proves it: no
 * smoke file appears in the real content/ or public/uploads/, and the files the
 * tests touch in the scratch copy are checked byte for byte.
 *
 * Checks: one-click Save (no menu click), the double-click latch (one file, one
 * save), Ctrl/Cmd+S, typing alone writes nothing, the wording, the "Not saved"
 * band (still there after 10 s, [Go to …]), a .docx refused at Save, a same-name
 * upload that deletes and commits nothing, the header Media button and the media
 * library's Delete hidden, the live column forced back on after a reload, the
 * phone switch without overlaps at 375×812, no reload after a new entry's first
 * save, Decap's own menu as the fallback, and the site check refusing a
 * cross-file duplicate title (only once the live column, cms-live.js, is there).
 *
 *   BASE_URL=http://localhost:3100 npx playwright test tests/e2e/cms-save.spec.ts --project=chromium
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { guardFiles, guardFolder, REPO_ROOT, type FolderGuard } from "./helpers/content-guard";

test.describe.configure({ mode: "serial" });

const ROOT = REPO_ROOT;
const BASE = process.env.BASE_URL || "http://localhost:3100";
const PORT = Number(process.env.CMS_SAVE_PROXY_PORT || 8093);
const SCRATCH = path.join(ROOT, "test-results", "cms-save-scratch");
// Served from memory by page routes; never written to public/admin/.
const PAGE = "local-save.html";
const CONFIG = "config.local-save.yml";
const SMOKE = "cms-save-smoke";
const SAVE = { name: "Save", exact: true } as const;
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const EYE = 'button[title="Hide or show the live preview and history"]';
const PANE2 = '[class*="StyledSplitPane"] > .Pane2';
// A 1×1 and a 2×2 PNG: two different files with the same name.
const PNG_A = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const PNG_B = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8DwnwEJMBIBAEhiAgL/F1CaAAAAAElFTkSuQmCC",
  "base64",
);

let proxy: ChildProcess | null = null;
let proxyLog = "";
let html = "";
let yml = "";
let realGuards: FolderGuard[] = [];

const scratch = (rel: string) => path.join(SCRATCH, rel);
const smokeFiles = (folder: string) =>
  fs.existsSync(scratch(folder))
    ? fs.readdirSync(scratch(folder)).filter((f) => f.includes(SMOKE))
    : [];

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
  // Nothing may ever be saved into this checkout: remember what is there now.
  realGuards = [
    guardFolder("content/news", new RegExp(SMOKE)),
    guardFolder("content/people", new RegExp(SMOKE)),
    guardFolder("content/publications", new RegExp(SMOKE)),
    guardFolder("public/uploads", /cms-save|^cv\.docx$/),
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
});

test.beforeEach(async ({ context, request, browserName }) => {
  const res = await request.get("/admin/cms-save.js");
  test.skip(res.status() === 404, "needs a server that serves public/admin/");
  // MEASURED: the page comes from a route, not from the network, so Chromium
  // treats the proxy on another localhost port as a local-network request and
  // blocks it unless allowed. WebKit has no such permission (and needs none).
  if (browserName === "chromium") await context.grantPermissions(["local-network-access"]);
  await serveLocalPage(context);
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
 * Page errors, without the two Decap 3.17.1 causes itself when a save stops.
 * MEASURED (editor v2), with or without our scripts: its click handler leaves the
 * persist promise's rejection unhandled; the reason is nothing ("undefined", after
 * its required-field check) or its ENTRY_PERSIST_FAILURE action ("Object", after
 * any refusal or failed commit, cms-hooks.js's included).
 */
function pageErrors(page: Page) {
  const errors: string[] = [];
  // Chromium says "undefined" / "Object"; WebKit "Unhandled Promise Rejection: …".
  const decapRejection = /^(Unhandled Promise Rejection: )?(undefined|Object|\[object Object\])$/;
  page.on("pageerror", (e) => {
    if (decapRejection.test(e.message)) return;
    errors.push(String(e.stack || e.message));
  });
  return errors;
}

/** Decap's own saves, as the local proxy receives them. */
function proxyCalls(page: Page) {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith(`http://localhost:${PORT}/`) || r.method() !== "POST") return;
    const action = /"action"\s*:\s*"([^"]+)"/.exec(r.postData() || "")?.[1];
    if (action) calls.push(action);
  });
  return {
    all: calls,
    writes: () => calls.filter((a) => /persist|delete/i.test(a)),
    count: (action: string) => calls.filter((a) => a === action).length,
  };
}

async function login(page: Page, hash = "") {
  page.on("dialog", (d) => d.accept().catch(() => {}));
  await page.goto(`/admin/${PAGE}`);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Collections" })).toBeVisible({
    timeout: 30_000,
  });
  if (hash) await openEditor(page, hash);
}

async function openEditor(page: Page, hash: string) {
  await page.goto(`/admin/${PAGE}${hash}`);
  await expect(page.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
  // Decap fills the form's defaults (the date) just after it shows.
  await page.waitForTimeout(800);
}

async function newNews(page: Page, title: string) {
  await openEditor(page, "#/collections/news/new");
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Type", { exact: true }).click();
  await page.getByText("Lab life", { exact: true }).click();
}

/** Open the media library from an object's image or file field ("Image" › "Choose an image"). */
async function openLibrary(page: Page, object: string, button: RegExp) {
  const top = page
    .locator('[class*="TopBarContainer"]')
    .filter({ hasText: new RegExp(`^${object}`) });
  const chooser = page.locator("button", { hasText: button }).first();
  if (!(await chooser.isVisible()))
    await top.locator('button[class*="ExpandButton"]').first().click();
  await chooser.scrollIntoViewIfNeeded();
  await chooser.click();
  await expect(page.locator("input[type=file]").first()).toBeAttached({ timeout: 10_000 });
  await page.waitForTimeout(500);
}

const band = (page: Page) => page.locator("#bl-refusal");

test("one click on Save saves, with the plain wording; typing alone writes nothing", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = pageErrors(page);
  const calls = proxyCalls(page);
  await login(page);
  await newNews(page, "CMS save smoke one click");
  // Wording (spec §3.3–§3.5): the button is "Save", the status "Unsaved changes".
  const save = page.getByRole("button", SAVE);
  await expect(save).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();
  await expect(page.locator("#bl-save-note")).toHaveText("Save puts this on the live site");
  await expect(save).toHaveAttribute("aria-describedby", "bl-save-desc");
  await expect(page.locator("#bl-save-desc")).toHaveText(
    "Saves and updates the live site in about 2 minutes",
  );
  expect(await save.getAttribute("aria-haspopup")).toBeNull();
  // Typing alone writes nothing.
  await page.waitForTimeout(1500);
  expect(smokeFiles("content/news")).toEqual([]);
  expect(calls.writes()).toEqual([]);

  await save.click();
  await expect.poll(() => smokeFiles("content/news"), { timeout: 30_000 }).toHaveLength(1);
  // No menu click was needed, and Decap's menu never showed.
  await expect(page.getByRole("menuitem", { name: "Save now" })).toBeHidden();
  expect(calls.count("persistEntry")).toBe(1);
  // One success message: the status dock's, not Decap's "Saved." toast.
  await expect(
    page.locator("#bl-toasts .bl-toast", { hasText: "Saved to this computer" }),
  ).toBeVisible();
  await expect(page.locator(".Toastify__toast--success:visible")).toHaveCount(0);
  await expect(page.locator("#bl-dock")).toContainText("Saved to this computer");
  expect(errors).toEqual([]);
});

test("a double click on Save for a new news item gives exactly one file and one save, without a reload", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = pageErrors(page);
  const calls = proxyCalls(page);
  await login(page);
  await newNews(page, "CMS save smoke double click");
  await page.evaluate(() => ((window as unknown as { __noReload?: number }).__noReload = 1));
  await page.getByRole("button", SAVE).dblclick();
  await expect
    .poll(() => smokeFiles("content/news").filter((f) => f.includes("double")), {
      timeout: 30_000,
    })
    .toHaveLength(1);
  // Decap moves from "new" to the saved entry's address; give a second save time to land.
  await expect(page).toHaveURL(
    /#\/collections\/news\/entries\/\d{4}-\d{2}-\d{2}-cms-save-smoke-double-click$/,
  );
  await page.waitForTimeout(3000);
  const files = smokeFiles("content/news").filter((f) => f.includes("double"));
  expect(files).toEqual([
    expect.stringMatching(/^\d{4}-\d{2}-\d{2}-cms-save-smoke-double-click\.md$/),
  ]);
  expect(calls.count("persistEntry")).toBe(1);
  // cms-start.js did not reload the page after the first save (spec §3.11).
  expect(await page.evaluate(() => (window as unknown as { __noReload?: number }).__noReload)).toBe(
    1,
  );
  expect(errors).toEqual([]);
});

test("Ctrl+S saves (twice in a row: one save); on an unchanged entry it says there is nothing to save", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = pageErrors(page);
  const calls = proxyCalls(page);
  await login(page);
  await newNews(page, "CMS save smoke keys");
  await page.getByLabel("Summary", { exact: false }).fill("Saved with the keyboard.");
  await page.getByLabel("Summary", { exact: false }).press("Control+s");
  await page.keyboard.press("Control+s");
  await expect
    .poll(() => smokeFiles("content/news").filter((f) => f.includes("keys")), {
      timeout: 30_000,
    })
    .toHaveLength(1);
  const [file] = smokeFiles("content/news").filter((f) => f.includes("keys"));
  expect(fs.readFileSync(scratch(`content/news/${file}`), "utf8")).toContain(
    "Saved with the keyboard.",
  );
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeHidden({ timeout: 10_000 });
  await page.waitForTimeout(3500); // the latch lets go after the save
  expect(calls.count("persistEntry")).toBe(1);
  await page.keyboard.press("Control+s");
  await expect(page.locator("#bl-announce-polite")).toHaveText("No changes to save");
  expect(calls.count("persistEntry")).toBe(1);
  expect(errors).toEqual([]);
});

test("“Visible on the website” is a Yes/No switch over draft: opening changes nothing, No saves draft: true (D-21)", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const errors = pageErrors(page);
  const FILE = "content/news/2023-08-30-nasa-symposium.md";
  const draftLine = () => /^draft: .*$/m.exec(fs.readFileSync(scratch(FILE), "utf8"))?.[0];
  expect(draftLine()).toBe("draft: false");
  await login(page, "#/collections/news/entries/2023-08-30-nasa-symposium");
  const sw = page.getByRole("switch", { name: "Visible on the website", exact: true });
  await sw.scrollIntoViewIfNeeded();
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await expect(sw).toHaveText("Yes");
  await expect(page.getByText("No hides this from the live site.", { exact: false })).toBeVisible();
  // Opening the entry marks nothing as changed.
  await page.waitForTimeout(1500);
  await expect(page.getByText("All changes saved", { exact: false })).toBeVisible();
  await expect(page.getByText("Unsaved changes", { exact: true })).toHaveCount(0);
  // Space (keyboard) turns it to No: the form changes and the note says what Save will do.
  await sw.focus();
  await page.keyboard.press("Space");
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await expect(sw).toHaveText("No");
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();
  await expect(page.locator("#bl-save-note")).toHaveText("Save keeps it hidden: Visible is No");
  await expect(sw).toBeFocused();
  const control = page.locator('[class*="ControlContainer"]:has(button.bl-visible)');
  await control.screenshot({ path: test.info().outputPath("visible-switch-no-focused.png") });
  // Enter turns it back: the form equals the saved entry again.
  await page.keyboard.press("Enter");
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("All changes saved", { exact: false })).toBeVisible();
  // The switch and its label pass axe.
  const r = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .include('[class*="ControlContainer"]:has(button.bl-visible)')
    .analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual(
    [],
  );
  // No, then Save: the file stores the boolean draft: true (never a string).
  await sw.click();
  await expect(sw).toHaveText("No");
  await page.getByRole("button", SAVE).click();
  await expect.poll(draftLine, { timeout: 30_000 }).toBe("draft: true");
  await expect(page.locator("#bl-dock")).toContainText("Saved to this computer", {
    timeout: 15_000,
  });
  await expect(page.getByText("All changes saved", { exact: false })).toBeVisible({
    timeout: 15_000,
  });
  // Reloaded, the saved entry reads No; Yes, then Save: draft: false. (Reloaded
  // because Decap compares the form with the entries it loaded, which a save does
  // not refresh: right after a save, going back to the old value looks unchanged.)
  await page.waitForTimeout(3500); // the latch lets go after the save
  await page.reload();
  await expect(page.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(800);
  await sw.scrollIntoViewIfNeeded();
  await expect(sw).toHaveText("No");
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("Unsaved changes", { exact: true })).toHaveCount(0);
  await sw.click();
  await expect(sw).toHaveText("Yes");
  await page.getByRole("button", SAVE).click();
  await expect.poll(draftLine, { timeout: 30_000 }).toBe("draft: false");
  expect(errors).toEqual([]);
});

test("a person's switch says what it hides; the column notes a hidden entry (D-21)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page, "#/collections/people/entries/isabelle-cho");
  const sw = page.getByRole("switch", { name: "Visible on the website", exact: true });
  await sw.scrollIntoViewIfNeeded();
  await expect(sw).toHaveText("Yes");
  await page
    .locator('[class*="ControlContainer"]:has(button.bl-visible)')
    .screenshot({ path: test.info().outputPath("visible-switch-person-yes.png") });
  await expect(
    page.getByText(
      "No hides this person from the home page's People section (Alumni too) and from the people lists on research and project pages; their profile page is not published either. Their name still shows where other entries name them: on papers they wrote (and then on that project's team list) and in news text. “Listed” (consent) still has to be on for them to appear at all.",
      { exact: false },
    ),
  ).toBeVisible();
  await sw.click();
  await expect(sw).toHaveText("No");
  await expect(page.locator("#bl-save-note")).toHaveText("Save keeps it hidden: Visible is No");
  // The live column (cms-live.js) still draws the person, with a note.
  const frame = page.frameLocator("iframe#preview-pane");
  await expect(frame.locator(".bl-band")).toContainText(
    "Hidden from the live site: “Visible on the website” is No. Shown here so you can check it.",
    { timeout: 30_000 },
  );
  // Nothing was saved.
  expect(
    /^draft: .*$/m.exec(fs.readFileSync(scratch("content/people/isabelle-cho.md"), "utf8"))?.[0],
  ).toBe("draft: false");
});

test("Enter on the focused Save button saves; pressed twice, it still saves once", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = pageErrors(page);
  const calls = proxyCalls(page);
  await login(page);
  await newNews(page, "CMS save smoke enter");
  await page.getByRole("button", SAVE).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect
    .poll(() => smokeFiles("content/news").filter((f) => f.includes("enter")), {
      timeout: 30_000,
    })
    .toHaveLength(1);
  await page.waitForTimeout(3000);
  expect(smokeFiles("content/news").filter((f) => f.includes("enter"))).toHaveLength(1);
  expect(calls.count("persistEntry")).toBe(1);
  expect(errors).toEqual([]);
});

test("a refused save shows the 'Not saved' band, which stays after 10 s and leads to the field", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = pageErrors(page);
  const calls = proxyCalls(page);
  await login(page);
  await openEditor(page, "#/collections/news/new");
  await page.getByLabel("Title", { exact: true }).fill("CMS save smoke refused");
  await page.getByRole("button", SAVE).click(); // Type is still empty
  await expect(band(page)).toBeVisible({ timeout: 10_000 });
  await expect(band(page)).toHaveAttribute("role", "alert");
  await expect(band(page)).toContainText(
    "Not saved: a required field is empty. It is marked in red.",
  );
  // At the top of the form pane (the container selector held), not the fixed fallback.
  expect(
    await band(page).evaluate(
      (b) =>
        !!b.closest('[class*="StyledSplitPane"] > .Pane1 [class*="ControlPaneContainer"]') &&
        !b.classList.contains("bl-refusal--fixed"),
    ),
  ).toBe(true);
  // Decap's own toast (it vanishes after 8 s) gave way to the band.
  await expect(page.locator(".Toastify__toast--error:visible")).toHaveCount(0);
  await page.waitForTimeout(10_500);
  await expect(band(page)).toBeVisible();
  await band(page).getByRole("button", { name: "Go to Type" }).click();
  await expect(page.locator('[id^="type-field-"]')).toBeFocused();
  // The latch let go: Save works again, and the band stays until the save succeeds.
  expect(
    await page.evaluate(() =>
      (window as unknown as { BobalabSave: { isSaving(): boolean } }).BobalabSave.isSaving(),
    ),
  ).toBe(false);
  await page.getByLabel("Type", { exact: true }).click();
  await page.getByText("Lab life", { exact: true }).click();
  await page.getByRole("button", SAVE).click();
  await expect
    .poll(() => smokeFiles("content/news").filter((f) => f.includes("refused")), {
      timeout: 30_000,
    })
    .toHaveLength(1);
  await expect(band(page)).toBeHidden();
  expect(calls.count("persistEntry")).toBe(1);
  // No new serious or critical problems in our own UI.
  expect(errors).toEqual([]);
});

test("a value in the wrong format is refused with the band (Decap sends no toast for it), naming the field", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = pageErrors(page);
  const calls = proxyCalls(page);
  await login(page);
  await newNews(page, "CMS save smoke pattern");
  const top = page.locator('[class*="TopBarContainer"]').filter({ hasText: /^Link/ });
  await top.locator('button[class*="ExpandButton"]').first().click();
  const text = page.getByLabel("Link text", { exact: false });
  const address = page.getByLabel("Address", { exact: false });
  await text.fill("Programme");
  await address.fill("www.informs.org/annual-meeting");
  // Back at the top of the form: the marked field is out of sight.
  await page.getByLabel("Title", { exact: true }).focus();
  await page.getByRole("button", SAVE).click();
  await expect(band(page)).toBeVisible({ timeout: 3000 });
  await expect(band(page).locator(".bl-refusal__text")).toHaveText(
    "Not saved: Link › Address: Use a full https:// address or a site path starting with /.",
  );
  await expect(page.locator(".Toastify__toast:visible")).toHaveCount(0);
  // Decap's own words for the field follow the same plain form.
  await expect(page.locator('[class*="ControlErrorsList"]').first()).toContainText(
    "Address: Use a full https:// address",
    { ignoreCase: true },
  );
  expect(calls.writes()).toEqual([]);
  await band(page).getByRole("button", { name: "Go to Link › Address" }).click();
  await expect(address).toBeFocused();
  expect(
    await page.evaluate(() =>
      (window as unknown as { BobalabSave: { isSaving(): boolean } }).BobalabSave.isSaving(),
    ),
  ).toBe(false);
  // Fixed: the band goes with the edit, and Save saves.
  await address.fill("https://www.informs.org/annual-meeting");
  await expect(band(page)).toBeHidden();
  await page.getByRole("button", SAVE).click();
  await expect
    .poll(() => smokeFiles("content/news").filter((f) => f.includes("pattern")), {
      timeout: 30_000,
    })
    .toHaveLength(1);
  // A saved entry: Decap's "Check for Preview" (deploy previews this site never has) is hidden.
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeHidden({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: /Check for Preview/ })).toHaveCount(0);
  for (const sel of ['[class*="PreviewButtonContainer"]', '[class*="RefreshPreviewButton"]'])
    for (const el of await page.locator(sel).all()) await expect(el).toBeHidden();
  expect(errors).toEqual([]);
});

test("moving by the address bar from a new entry to a new entry of another collection gives a fresh form", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = pageErrors(page);
  const calls = proxyCalls(page);
  await login(page);
  await newNews(page, "CMS save smoke new to new");
  await page.goto(`/admin/${PAGE}#/collections/publications/new`); // "Leave" is accepted
  await expect(page.getByText("Writing in Publications collection")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("", { timeout: 30_000 });
  await page.waitForFunction(() => "BobalabLive" in window, null, { timeout: 30_000 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as { BobalabLive: { current(): { collection: string } | null } }
          ).BobalabLive.current()?.collection ?? null,
      ),
    )
    .toBe("publications");
  expect(calls.writes()).toEqual([]);
  expect(errors).toEqual([]);
});

test("the band and the note next to Save pass axe", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  await openEditor(page, "#/collections/news/new");
  await page.getByLabel("Title", { exact: true }).fill("CMS save smoke axe");
  await page.getByRole("button", SAVE).click();
  await expect(band(page)).toBeVisible({ timeout: 10_000 });
  const r = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .include("#bl-refusal")
    .include("#bl-save-note")
    .analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual(
    [],
  );
});

test("a .docx uploaded into an entry is refused at Save; nothing is written", async ({ page }) => {
  test.setTimeout(150_000);
  const errors = pageErrors(page);
  const calls = proxyCalls(page);
  await login(page);
  await openEditor(page, "#/collections/people/new");
  await page.getByLabel("Name", { exact: true }).fill("CMS save smoke person");
  await page.getByLabel("Role", { exact: true }).click();
  await page.getByText("PhD student", { exact: true }).click();
  await openLibrary(page, "Links", /^Choose a file$/);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "cv.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from("not really a Word file"),
    });
  // Decap selects a file it has just uploaded.
  const choose = page.getByRole("button", { name: "Choose selected" });
  await expect(page.getByText("cv.docx", { exact: true }).first()).toBeVisible();
  await expect(choose).toBeEnabled({ timeout: 10_000 });
  await choose.click();
  await expect(page.getByRole("button", { name: "Choose selected" })).toHaveCount(0);
  await page.getByRole("button", SAVE).click();
  await expect(band(page)).toContainText(
    "Not saved: “cv.docx” can't go on the website. Upload a PDF (at most 10 MB) or a JPG, PNG, WebP or GIF image (at most 2 MB).",
    { timeout: 15_000 },
  );
  await page.waitForTimeout(1500);
  expect(smokeFiles("content/people")).toEqual([]);
  expect(fs.existsSync(scratch("public/uploads/cv.docx"))).toBe(false);
  expect(calls.writes()).toEqual([]);
  expect(errors).toEqual([]);
});

test("a name the lab asked never to publish is refused at Save, without printing it (fictional test name)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = pageErrors(page);
  const calls = proxyCalls(page);
  const { hashName, loadHashes, normalizeName } =
    await import("../../scripts/import/hidden-names.mjs");
  const { salt } = loadHashes();
  // Only this fictional name is "protected" in this page (the real list stays as it is).
  const fake = hashName(salt, normalizeName("Quinby Zorander"));
  await login(page);
  await page.evaluate((hash) => {
    const c = (window as unknown as { BOBALAB_CMS: { hiddenNames: { salt: string } } }).BOBALAB_CMS;
    c.hiddenNames = { salt: c.hiddenNames.salt, hashes: [hash] } as typeof c.hiddenNames;
  }, fake);
  await newNews(page, "CMS save smoke thanks to Quinby Zorander");
  await page.getByRole("button", SAVE).click();
  await expect(band(page)).toContainText(
    "Not saved: this entry contains a name the lab has asked never to publish. Ask the PI before adding it.",
    { timeout: 15_000 },
  );
  expect(await band(page).textContent()).not.toMatch(/quinby|zorander/i);
  await page.waitForTimeout(1000);
  expect(smokeFiles("content/news").filter((f) => f.includes("quinby"))).toEqual([]);
  expect(calls.writes()).toEqual([]);
  expect(errors).toEqual([]);
});

test("a same-name upload inside an entry deletes nothing and commits nothing; the library's Delete is hidden", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const NAME = "cms-save-same-name.png";
  fs.writeFileSync(scratch(`public/uploads/${NAME}`), PNG_A);
  const guard = guardFiles([`public/uploads/${NAME}`], { root: SCRATCH });
  const uploads = guardFolder("public/uploads", /./, { root: SCRATCH });
  const errors = pageErrors(page);
  const calls = proxyCalls(page);
  try {
    await login(page);
    await openEditor(page, "#/collections/news/new");
    await page.getByLabel("Title", { exact: true }).fill("CMS save smoke same name");
    await openLibrary(page, "Image", /^Choose an image$/);
    await expect(page.getByText(NAME, { exact: true }).first()).toBeVisible();
    // Selecting a saved file would offer "Delete selected", which deletes it on GitHub at once.
    await page.getByText(NAME, { exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Choose selected" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete selected" })).toHaveCount(0);
    // The same name again: Decap would ask "replace it?" and delete the saved file at once.
    await page.locator("input[type=file]").first().setInputFiles({
      name: NAME,
      mimeType: "image/png",
      buffer: PNG_B,
    });
    const rename = page.locator("#bl-toasts .bl-toast", {
      hasText: "A file with this name is already on the site",
    });
    await expect(rename).toBeVisible();
    await expect(rename).toContainText(
      "Rename your file (for example isabelle-cho-2026.jpg) and upload it again.",
    );
    // It shows above Decap's media library, not under its overlay.
    const onTop = await rename.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + 12);
      return !!hit && el.contains(hit);
    });
    expect(onTop).toBe(true);
    await page.waitForTimeout(1500);
    await page.keyboard.press("Escape");
    guard.assertUnchanged();
    expect(uploads.added()).toEqual([]);
    expect(calls.writes()).toEqual([]);
    expect(smokeFiles("content/news").filter((f) => f.includes("same-name"))).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    guard.restore();
    fs.rmSync(scratch(`public/uploads/${NAME}`), { force: true });
  }
});

test("the header Media button is hidden; Contents stays", async ({ page }) => {
  await login(page);
  await page.goto(`/admin/${PAGE}#/collections/news`);
  await expect(page.getByRole("link", { name: "Contents" })).toBeVisible({ timeout: 30_000 });
  await expect(
    page.locator('nav [class*="AppHeaderNavList"] li > button[class*="AppHeaderButton"]'),
  ).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Media", exact: true })).toHaveCount(0);
});

test("the live column comes back after a reload; [Show it] brings it back at once", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = pageErrors(page);
  await login(page);
  await openEditor(page, "#/collections/news/new");
  await expect(page.locator(PANE2)).toHaveCount(1);
  const note = page.locator("#bl-save-note");
  await page.getByLabel("Title", { exact: true }).fill("CMS save smoke eye");
  await page.locator(EYE).click();
  await expect(page.locator(PANE2)).toHaveCount(0);
  await expect(note).toContainText(
    "Site check and History are off while the live column is hidden.",
  );
  await note.getByRole("button", { name: "Show it" }).click();
  await expect(page.locator(PANE2)).toHaveCount(1);
  await expect(note).toHaveText("Save puts this on the live site");
  // Off again, then reload: Decap would remember "off" for good; cms-layout.js puts it back.
  await page.locator(EYE).click();
  await expect(page.locator(PANE2)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(/Writing in .* collection/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(PANE2)).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem("cms.right-pane"))).toBe("preview");
  expect(errors).toEqual([]);
});

test("Skip to the live preview is the first stop for the keyboard on editor routes", async ({
  page,
}) => {
  await login(page);
  await openEditor(page, "#/collections/news/new");
  const first = await page.evaluate(() => document.body.firstElementChild?.id);
  expect(first).toBe("bl-skip");
  // Start keyboard navigation at the top of the page, as after loading it.
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
    document.body.removeAttribute("tabindex");
  });
  await page.keyboard.press("Tab");
  await expect(page.locator("#bl-skip")).toBeFocused();
  await expect(page.locator("#bl-skip")).toHaveText("Skip to the live preview");
  await page.keyboard.press("Enter");
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName))
    .toBe("preview-pane");
});

test("without Decap's 'Save now' item the menu simply shows: two clicks, never a dead button", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const calls = proxyCalls(page);
  await login(page);
  await newNews(page, "CMS save smoke fallback");
  // As if Decap renamed its menu items: the one-click pick finds nothing.
  await page.evaluate(() => {
    (
      window as unknown as { BobalabSave: { _options: { menuItem: string } } }
    ).BobalabSave._options.menuItem = '[role="no-such-item"]';
  });
  await page.getByRole("button", SAVE).click();
  await page.waitForTimeout(900);
  await expect(page.getByRole("menuitem", { name: "Save now" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.classList.contains("bl-one-click")),
  ).toBe(false);
  expect(calls.count("persistEntry")).toBe(0);
  await page.getByRole("menuitem", { name: "Save now" }).click();
  await expect
    .poll(() => smokeFiles("content/news").filter((f) => f.includes("fallback")), {
      timeout: 30_000,
    })
    .toHaveLength(1);
  expect(calls.count("persistEntry")).toBe(1);
});

/**
 * A new publication with the title of content/publications/allon-2023-gig-drivers.md.
 * Type "Work in progress" and status "Published" (no directions, year, as_of or
 * status source needed), so the duplicate title (E_DUP_TITLE) is the only problem.
 */
async function duplicatePublication(page: Page) {
  const existing = /^title: (.*)$/m
    .exec(fs.readFileSync(scratch("content/publications/allon-2023-gig-drivers.md"), "utf8"))![1]!
    .replace(/^["']|["']$/g, "");
  await page.getByLabel("Title", { exact: true }).fill(existing);
  await page
    .getByRole("button", { name: /^Add authors?$/i })
    .first()
    .click();
  await page.getByLabel("Name", { exact: true }).first().fill("Smoketest");
  await page.getByLabel("Type", { exact: true }).click();
  await page.getByText("Work in progress", { exact: true }).first().click();
  await page.getByLabel("Status", { exact: true }).click();
  await page.getByText("Published", { exact: true }).first().click();
  return existing;
}

const pubSmoke = () =>
  fs.readdirSync(scratch("content/publications")).filter((f) => f.includes("smoketest"));

test("a blocking site-check answer refuses the save, names the problem and opens the other entry (live column stubbed)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = pageErrors(page);
  const calls = proxyCalls(page);
  await login(page);
  await openEditor(page, "#/collections/publications/new");
  await duplicatePublication(page);
  // cms-live.js's answer, as the interfaces define it (spec §3.6e): the new error
  // lands on the OTHER publication, so the band offers to open it.
  const requests = await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown> & { __checks: unknown[] };
    w.__checks = [];
    const real = w.BobalabLive as Record<string, unknown> | undefined;
    w.BobalabLive = {
      ...(real ?? {}),
      checkSave: (req: unknown) => {
        w.__checks.push(req);
        return Promise.resolve({
          available: true,
          blocking: [
            {
              code: "E_DUP_TITLE",
              file: "publications/allon-2023-gig-drivers.md",
              field: "title",
              message: "title duplicates publications/quinn-smoketest.md",
            },
          ],
          warnings: [],
        });
      },
      formatIssue: (i: { message: string }) =>
        `Publication “allon-2023-gig-drivers” › Title: ${i.message}`,
    };
    return w.__checks;
  });
  expect(requests).toEqual([]);
  await page.getByRole("button", SAVE).click();
  await expect(band(page)).toContainText(
    "Not saved: the site check would reject this: Publication “allon-2023-gig-drivers” › Title: title duplicates publications/quinn-smoketest.md.",
    { timeout: 15_000 },
  );
  const checks = await page.evaluate(() => (window as unknown as { __checks: unknown[] }).__checks);
  expect(checks).toHaveLength(1);
  // Exactly the data being saved, for the predicted new entry.
  expect(checks[0]).toMatchObject({
    entry: {
      collection: "publications",
      slug: expect.stringMatching(/^smoketest-\d{4}-the-impact/),
    },
    isNew: true,
    data: { authors: [{ name: "Smoketest" }], type: "work-in-progress", status: "published" },
  });
  await page.waitForTimeout(1000);
  expect(pubSmoke()).toEqual([]);
  expect(calls.writes()).toEqual([]);
  await band(page)
    .getByRole("button", { name: /^Open Publication/ })
    .click();
  await expect(page).toHaveURL(/#\/collections\/publications\/entries\/allon-2023-gig-drivers$/);
  expect(errors).toEqual([]);
});

test("the site check refuses a publication whose title another one already has (cms-hooks lets it through)", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await login(page);
  await openEditor(page, "#/collections/publications/new");
  const hasCheck = await page.evaluate(
    () =>
      typeof (window as unknown as { BobalabLive?: { checkSave?: unknown } }).BobalabLive
        ?.checkSave === "function",
  );
  test.skip(!hasCheck, "needs the live column (cms-live.js, WP4)");
  const calls = proxyCalls(page);
  await duplicatePublication(page);
  // The preview must have the saved site loaded for the check to run.
  const ready = await page.evaluate(() =>
    (
      window as unknown as { BobalabLive: { whenReady(ms?: number): Promise<boolean> } }
    ).BobalabLive.whenReady(60_000),
  );
  expect(ready).toBe(true);
  await page.getByRole("button", SAVE).click();
  await expect(band(page)).toContainText("Not saved: the site check would reject this", {
    timeout: 20_000,
  });
  await expect(band(page)).toContainText(/title/i);
  await page.waitForTimeout(1000);
  expect(pubSmoke()).toEqual([]);
  expect(calls.writes()).toEqual([]);
});

test.describe("phones (375×812)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("the Edit / Preview & history switch shows the live column; switch, dock and toasts do not overlap", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = pageErrors(page);
    await login(page);
    await openEditor(page, "#/collections/news/new");
    await page.getByLabel("Title", { exact: true }).fill("CMS save smoke phone");
    const bar = page.locator("#bl-phonebar");
    await expect(bar).toBeVisible();
    const edit = bar.getByRole("button", { name: "Edit" });
    const preview = bar.getByRole("button", { name: "Preview & history" });
    await expect(edit).toHaveAttribute("aria-pressed", "true");
    // In Edit the live column stays rendered (off-screen), so the checks keep working.
    await expect(page.locator(PANE2)).toHaveCount(1);
    await preview.click();
    await expect(preview).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveClass(/bl-phone-preview/);
    await expect(page.locator(PANE2)).toBeVisible();
    const pane = (await page.locator(PANE2).boundingBox())!;
    expect(pane.x).toBe(0);
    expect(pane.width).toBeGreaterThanOrEqual(370);
    // Save stays in the toolbar, at least 44 px tall.
    const save = (await page.getByRole("button", SAVE).boundingBox())!;
    expect(save.height).toBeGreaterThanOrEqual(44);
    // The switch, the status dock and the toasts (the first-use tip is up) do not overlap.
    await expect(page.locator("#bl-toasts .bl-toast").first()).toBeVisible();
    const boxes = {
      bar: (await bar.boundingBox())!,
      dock: (await page.locator("#bl-dock").boundingBox())!,
      toasts: (await page.locator("#bl-toasts").boundingBox())!,
    };
    const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    expect(overlap(boxes.bar, boxes.dock)).toBe(false);
    expect(overlap(boxes.bar, boxes.toasts)).toBe(false);
    expect(overlap(boxes.dock, boxes.toasts)).toBe(false);
    expect(boxes.bar.y + boxes.bar.height).toBeLessThanOrEqual(812);
    // Nothing scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      375,
    );
    await edit.click();
    await expect(page.locator("html")).not.toHaveClass(/bl-phone-preview/);
    await expect(page.getByLabel("Title", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
