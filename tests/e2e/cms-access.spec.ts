/**
 * "Who can edit" in the browser (public/admin/cms-access.js, DECISIONS D-20).
 *
 * Runs the real /admin/ page (Decap 3.17.1 plus our scripts, from the dev server)
 * in its local-demo form against a SCRATCH COPY of content/ served by its own
 * decap-server (port CMS_ACCESS_PROXY_PORT, default 8301); the page and its config
 * are served from memory through Playwright routes, so nothing is written into
 * public/admin/ and nothing is saved. Two more routes stand in for the outside:
 *
 *  - api.github.com: a small fictional repository with its collaborators,
 *    invitations and users. Every request is recorded with its method and token;
 *    writes change only this fake. No request leaves the machine.
 *  - the sign-in service (the lab's Worker origin): a fake of its last page, which
 *    speaks Decap's handshake ("authorizing:github", then
 *    "authorization:github:success:{…}") and, like the real Worker, answers only an
 *    opener whose origin it trusts.
 *
 * For the GitHub states the test makes the page believe it is signed in to GitHub
 * (BobalabGitHub.mode/user), as cms-live.spec.ts does.
 *
 * Checks: the admin flow (Give permission → the lists → look up → invite → cancel
 * an invitation → remove, each with its confirmation), which token every write
 * used, where the token is kept; a blocked popup, a closed popup and the wrong
 * account; the non-admin and local-demo views; keyboard and focus; axe on every
 * state; a 390 px phone. Screenshots go to ACCESS_SHOTS (default
 * test-results/cms-access-shots).
 *
 *   BASE_URL=http://localhost:3100 npx playwright test tests/e2e/cms-access.spec.ts --project=chromium
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page, type Route } from "@playwright/test";
import { REPO_ROOT } from "./helpers/content-guard";

test.describe.configure({ mode: "serial" });

const ROOT = REPO_ROOT;
const BASE = process.env.BASE_URL || "http://localhost:3100";
const PORT = Number(process.env.CMS_ACCESS_PROXY_PORT || 8301);
const SCRATCH = path.join(ROOT, "test-results", "cms-access-scratch");
const SHOTS = process.env.ACCESS_SHOTS || path.join(ROOT, "test-results", "cms-access-shots");
const PAGE = "local-access.html";
const CONFIG = "config.local-access.yml";
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const REPO = "bobalabx/bobalab-web";
const WORKER = "https://bobalab-cms-auth.bobalabx-034.workers.dev";
const DECAP_TOKEN = "not-a-token"; // the everyday sign-in the page is made to believe in
const EXTRA = "e2e-extra-permission-token";
const KEY = "bobalab.access.v1";

// ---------------------------------------------------------------------------
// The fake GitHub

interface Person {
  login: string;
  name: string | null;
  type?: string;
}
interface GitHubState {
  admin: boolean;
  ownerType: "User" | "Organization";
  tokens: Record<string, string>; // token → login
  collaborators: Array<{ login: string; admin?: boolean }>;
  invitations: Array<{ id: number; login: string; created_at: string; inviter: string }>;
  users: Record<string, Person>;
  requests: Array<{ method: string; path: string; auth: string }>;
}

let GH: GitHubState;

function resetGitHub() {
  GH = {
    admin: true,
    ownerType: "User",
    tokens: { [EXTRA]: "bobalabx" },
    collaborators: [{ login: "bobalabx", admin: true }, { login: "icho" }, { login: "jazzb" }],
    invitations: [
      { id: 501, login: "new-ra", created_at: "2026-10-24T17:00:00Z", inviter: "bobalabx" },
    ],
    users: {
      bobalabx: { login: "bobalabx", name: "BOBALAB" },
      icho: { login: "icho", name: "Isabelle Cho" },
      jazzb: { login: "jazzb", name: "Jazz Beecham" },
      "new-ra": { login: "new-ra", name: null },
      "nike-n": { login: "nike-n", name: "Nike Naiyarat" },
      "ada-editor": { login: "ada-editor", name: "Ada Editor" },
    },
    requests: [],
  };
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, content-type, accept, x-github-api-version, if-none-match",
  "access-control-allow-methods": "GET, PUT, DELETE",
  "access-control-expose-headers":
    "etag, link, x-oauth-scopes, x-ratelimit-remaining, x-ratelimit-reset",
};

async function answerGitHub(route: Route) {
  const req = route.request();
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
  const u = new URL(req.url());
  const p = decodeURIComponent(u.pathname);
  const auth = (req.headers()["authorization"] ?? "").replace(/^token /, "");
  GH.requests.push({ method: req.method(), path: p + u.search, auth });
  const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
    route.fulfill({
      status,
      headers: { ...CORS, "content-type": "application/json", ...extra },
      body: JSON.stringify(body),
    });
  const who = GH.tokens[auth];
  const base = `/repos/${REPO}`;
  if (req.method() === "GET" && p === base)
    return json({
      full_name: REPO,
      owner: { login: "bobalabx", type: GH.ownerType },
      permissions: { admin: GH.admin, push: true, pull: true },
    });
  if (req.method() === "GET" && p === "/user") {
    if (!who) return json({ message: "Bad credentials" }, 401);
    return json({ login: who }, 200, { "x-oauth-scopes": "repo" });
  }
  let m = /^\/users\/([^/]+)$/.exec(p);
  if (req.method() === "GET" && m) {
    const user = GH.users[m[1]!.toLowerCase()];
    if (!user) return json({ message: "Not Found" }, 404);
    return json({
      type: "User",
      avatar_url: null,
      html_url: `https://github.com/${user.login}`,
      ...user,
    });
  }
  if (req.method() === "GET" && p === `${base}/collaborators`) {
    if (!who) return json({ message: "Bad credentials" }, 401);
    return json(
      GH.collaborators.map((c) => ({
        login: c.login,
        avatar_url: null,
        permissions: { admin: !!c.admin, push: true, pull: true },
      })),
    );
  }
  if (req.method() === "GET" && p === `${base}/invitations`) {
    if (!who) return json({ message: "Bad credentials" }, 401);
    return json(
      GH.invitations.map((i) => ({
        id: i.id,
        invitee: { login: i.login, avatar_url: null },
        inviter: { login: i.inviter },
        created_at: i.created_at,
        expired: false,
      })),
    );
  }
  m = new RegExp(`^${base}/collaborators/([A-Za-z0-9-]+)$`).exec(p);
  if (m && req.method() === "PUT") {
    if (!who) return json({ message: "Bad credentials" }, 401);
    if (!GH.users[m[1]!]) return json({ message: "Not Found" }, 404);
    const inv = {
      id: 700 + GH.invitations.length,
      login: m[1]!,
      created_at: "2026-10-26T20:00:00Z",
      inviter: who,
    };
    GH.invitations.push(inv);
    return json({ id: inv.id, invitee: { login: inv.login } }, 201);
  }
  if (m && req.method() === "DELETE") {
    if (!who) return json({ message: "Bad credentials" }, 401);
    GH.collaborators = GH.collaborators.filter((c) => c.login !== m![1]);
    return route.fulfill({ status: 204, headers: CORS });
  }
  m = new RegExp(`^${base}/invitations/(\\d+)$`).exec(p);
  if (m && req.method() === "DELETE") {
    if (!who) return json({ message: "Bad credentials" }, 401);
    GH.invitations = GH.invitations.filter((i) => i.id !== Number(m![1]));
    return route.fulfill({ status: 204, headers: CORS });
  }
  if (req.method() !== "GET") return json({ message: "not in this fake" }, 405);
  // Anything else the editor reads (History, deploy runs): empty answers.
  if (p.includes("/actions/")) return json({ total_count: 0, workflow_runs: [], jobs: [] });
  return json([], 200);
}

// ---------------------------------------------------------------------------
// The fake sign-in service: its last page, as the real Worker's outputHTML writes it

type WorkerPlan =
  { kind: "success"; token: string } | { kind: "error"; code: string } | { kind: "close" };

let plan: WorkerPlan = { kind: "success", token: EXTRA };
const workerHits: string[] = [];

function workerPage(p: WorkerPlan) {
  if (p.kind === "close")
    return "<!doctype html><title>Sign-in</title><script>window.close()</script>";
  const state = p.kind === "success" ? "success" : "error";
  const content =
    p.kind === "success"
      ? { provider: "github", token: p.token }
      : { provider: "github", error: "Failed.", errorCode: p.code };
  const trusted = new URL(BASE).hostname;
  return `<!doctype html><html><head><title>Sign-in service (test)</title></head><body><p>Signing in…</p><script>
  (() => {
    const isTrusted = (origin) => { try { return new URL(origin).hostname === ${JSON.stringify(trusted)}; } catch { return false; } };
    window.addEventListener("message", ({ data, origin }) => {
      if (data !== "authorizing:github") return;
      if (!isTrusted(origin)) return;
      window.opener?.postMessage(${JSON.stringify(`authorization:github:${state}:`)} + ${JSON.stringify(JSON.stringify(content))}, origin);
    });
    window.opener?.postMessage("authorizing:github", "*");
  })();
  </script></body></html>`;
}

async function answerWorker(route: Route) {
  workerHits.push(route.request().url());
  return route.fulfill({
    status: 200,
    contentType: "text/html; charset=utf-8",
    body: workerPage(plan),
  });
}

// ---------------------------------------------------------------------------
// The harness (as cms-live.spec.ts)

let proxy: ChildProcess | null = null;
let proxyLog = "";
let html = "";
let yml = "";

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
  fs.rmSync(SCRATCH, { recursive: true, force: true });
  fs.mkdirSync(path.join(SCRATCH, "public"), { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.cpSync(path.join(ROOT, "content"), path.join(SCRATCH, "content"), { recursive: true });
  fs.cpSync(path.join(ROOT, "public", "uploads"), path.join(SCRATCH, "public", "uploads"), {
    recursive: true,
  });
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
});

test.beforeEach(async ({ context, request, browserName }) => {
  const res = await request.get("/admin/cms-access.js");
  test.skip(res.status() === 404, "needs a server that serves public/admin/");
  resetGitHub();
  plan = { kind: "success", token: EXTRA };
  workerHits.length = 0;
  if (browserName === "chromium")
    await context.grantPermissions(["local-network-access"]).catch(() => {});
  await serveLocalPage(context);
  await context.route("https://api.github.com/**", answerGitHub);
  await context.route(`${WORKER}/**`, answerWorker);
  await context.addInitScript(() => {
    try {
      localStorage.setItem("bobalab.saveTip.v1", "1");
    } catch {
      // ignore
    }
  });
});

async function serveLocalPage(context: BrowserContext) {
  await context.route(`**/admin/${PAGE}*`, (r) =>
    r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html }),
  );
  await context.route(`**/admin/${CONFIG}*`, (r) =>
    r.fulfill({ status: 200, contentType: "text/yaml; charset=utf-8", body: yml }),
  );
}

/** Page errors, without Decap's own unhandled rejection after a refused save (see cms-live.spec.ts). */
function pageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    if (e.message === "undefined" || e.message === "Object") return;
    errors.push(String(e.stack || e.message));
  });
  return errors;
}

async function login(page: Page) {
  await page.goto(`/admin/${PAGE}`);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Collections" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#bl-dock")).toBeVisible();
}

/** Make the page believe it is signed in to GitHub as `login`. */
async function asGitHub(page: Page, login: string, name: string) {
  await page.evaluate(
    ([l, n, t]) => {
      const g = (window as unknown as { BobalabGitHub: Record<string, unknown> }).BobalabGitHub;
      g.mode = () => "github";
      g.user = () => ({ login: l, name: n, token: t });
    },
    [login, name, DECAP_TOKEN],
  );
}

const panel = (page: Page) => page.locator("dialog.bl-access-sheet");
const status = (page: Page) => panel(page).locator(".bl-access__status");

async function openPanel(page: Page) {
  await page.locator("#bl-dock").getByRole("button", { name: "Who can edit" }).click();
  await expect(panel(page)).toBeVisible();
  await expect(
    panel(page).getByRole("heading", { name: "Who can edit", exact: true }),
  ).toBeVisible();
}

async function axe(page: Page, what: string, selector = "dialog.bl-dialog[open]") {
  const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).include(selector).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    bad.map((v) => `${what}: ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, name) });
}

async function grant(page: Page) {
  const popup = page.waitForEvent("popup");
  await panel(page).getByRole("button", { name: "Give permission" }).click();
  const p = await popup;
  await expect(status(page)).toHaveText(
    "Permission given. You can now manage editors until you reload or close this page.",
    { timeout: 15_000 },
  );
  await expect.poll(() => p.isClosed()).toBe(true);
  return p;
}

const writes = () => GH.requests.filter((r) => r.method !== "GET");

// ---------------------------------------------------------------------------

test("the owner gives the extra permission, then invites, cancels an invitation and removes an editor", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = pageErrors(page);
  await login(page);
  await asGitHub(page, "bobalabx", "BOBALAB");
  await openPanel(page);
  await expect(panel(page)).toContainText("Managing editors needs one extra GitHub permission");
  await expect(panel(page)).toContainText("Check that it shows your account, @bobalabx");
  await shot(page, "admin-1-needs-permission.png");
  await axe(page, "needs permission");

  await grant(page);
  expect(workerHits).toHaveLength(1);
  const asked = new URL(workerHits[0]!);
  expect(asked.pathname).toBe("/auth");
  expect(Object.fromEntries(asked.searchParams)).toEqual({
    provider: "github",
    site_id: "demo.decapcms.org", // Decap's own site_id on localhost; bobalabx.github.io live
    scope: "repo",
  });
  const rows = panel(page).locator(".bl-access__list").first().locator("li");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("BOBALAB");
  await expect(rows.nth(0)).toContainText("owner");
  await expect(rows.nth(0)).toContainText("you");
  await expect(rows.nth(0).getByRole("button")).toHaveCount(0);
  await expect(rows.nth(1)).toContainText("Isabelle Cho @icho");
  await expect(panel(page)).toContainText("Invited, not accepted yet (1)");
  await shot(page, "admin-2-list.png");
  await axe(page, "list");

  // Look up and invite.
  await panel(page).getByLabel("GitHub username").fill("nike-n");
  await panel(page).getByLabel("GitHub username").press("Enter");
  await expect(status(page)).toHaveText(
    "Found Nike Naiyarat (@nike-n). Check it is the right person, then send the invitation.",
  );
  await expect(
    panel(page).getByRole("button", { name: "Send invitation to Nike Naiyarat (@nike-n)" }),
  ).toBeFocused();
  await shot(page, "admin-3-lookup.png");
  await axe(page, "look up");
  await panel(page)
    .getByRole("button", { name: /^Send invitation/ })
    .click();
  await expect(status(page)).toHaveText(
    "Invitation sent. Nike Naiyarat must accept the email from GitHub before they can sign in.",
  );
  await expect(panel(page)).toContainText("Invited, not accepted yet (2)");
  await expect(panel(page).getByLabel("GitHub username")).toBeFocused();
  await shot(page, "admin-4-invited.png");

  // Cancel the older invitation.
  await panel(page).getByRole("button", { name: "Cancel invitation for @new-ra" }).click();
  const confirm = page.locator("dialog.bl-dialog--danger");
  await expect(confirm).toBeVisible();
  await expect(confirm.getByRole("heading")).toHaveText("Cancel the invitation for new-ra?");
  await expect(confirm.getByRole("button", { name: "Keep it" })).toBeFocused();
  await axe(page, "cancel invitation", "dialog.bl-dialog--danger");
  await confirm.getByRole("button", { name: "Cancel invitation" }).click();
  await expect(status(page)).toHaveText("Invitation for @new-ra cancelled.");
  await expect(panel(page)).toContainText("Invited, not accepted yet (1)");

  // Remove an editor.
  await panel(page).getByRole("button", { name: "Remove Jazz Beecham (@jazzb)" }).click();
  await expect(confirm).toBeVisible();
  await expect(confirm.getByRole("heading")).toHaveText("Remove Jazz Beecham?");
  await expect(confirm).toContainText(
    "Jazz Beecham will no longer be able to sign in to the dashboard or save. Their past changes stay in History.",
  );
  await shot(page, "admin-5-remove-confirm.png");
  await axe(page, "remove", "dialog.bl-dialog--danger");
  await confirm.getByRole("button", { name: "Remove Jazz Beecham" }).click();
  await expect(status(page)).toHaveText(
    "Jazz Beecham can no longer edit. Their past changes stay in History.",
  );
  await expect(rows).toHaveCount(2);
  await expect(panel(page).getByRole("heading", { name: "Can edit (2)" })).toBeFocused();
  await shot(page, "admin-6-removed.png");

  // Writes: exactly these, and only with the extra permission.
  expect(writes().map((w) => `${w.method} ${w.path}`)).toEqual([
    `PUT /repos/${REPO}/collaborators/nike-n`,
    `DELETE /repos/${REPO}/invitations/501`,
    `DELETE /repos/${REPO}/collaborators/jazzb`,
  ]);
  for (const w of writes()) expect(w.auth).toBe(EXTRA);
  for (const r of GH.requests.filter((x) => /collaborators|invitations|^\/user$/.test(x.path)))
    expect(r.auth, r.path).toBe(EXTRA);
  // Kept in this page's memory only: in no storage at all…
  const kept = await page.evaluate((k) => {
    const all = (st: Storage) => {
      const out: string[] = [];
      for (let i = 0; i < st.length; i++) out.push(st.getItem(st.key(i)!) ?? "");
      return out.join("\n");
    };
    return {
      key: sessionStorage.getItem(k),
      session: all(sessionStorage),
      local: all(localStorage),
      hooks: Object.keys((window as unknown as { BobalabAccess: object }).BobalabAccess).sort(),
    };
  }, KEY);
  expect(kept.key).toBeNull();
  expect(kept.session).not.toContain(EXTRA);
  expect(kept.local).not.toContain(EXTRA);
  // …and the page offers no hook that could send a request with it.
  expect(kept.hooks).toEqual(["forget", "hasPermission", "open", "parseUsername"]);
  // So a reload asks for it again.
  await page.reload();
  await expect(page.locator("#bl-dock")).toBeVisible({ timeout: 30_000 });
  await asGitHub(page, "bobalabx", "BOBALAB");
  await openPanel(page);
  await expect(panel(page)).toContainText("Managing editors needs one extra GitHub permission");
  expect(errors).toEqual([]);
});

test("a blocked popup, a closed GitHub window and the wrong account, in plain words", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page);
  await asGitHub(page, "bobalabx", "BOBALAB");
  await openPanel(page);
  // Blocked: the browser's window.open answers null.
  await page.evaluate(() => {
    const w = window as unknown as { open: unknown; __open: unknown };
    w.__open = w.open;
    w.open = () => null;
  });
  await panel(page).getByRole("button", { name: "Give permission" }).click();
  await expect(status(page)).toHaveText(/^Your browser blocked the GitHub window\. Allow pop-ups/);
  await page.evaluate(() => {
    const w = window as unknown as { open: unknown; __open: unknown };
    w.open = w.__open;
  });
  // Closed before it finished.
  plan = { kind: "close" };
  await panel(page).getByRole("button", { name: "Give permission" }).click();
  await expect(status(page)).toHaveText(
    "The GitHub window was closed before it finished. Nothing was changed.",
    { timeout: 10_000 },
  );
  // The sign-in service's own error.
  plan = { kind: "error", code: "AUTH_CODE_REQUEST_FAILED" };
  await panel(page).getByRole("button", { name: "Give permission" }).click();
  await expect(status(page)).toHaveText(
    "GitHub did not give the permission: the GitHub window was cancelled or did not finish. Nothing was changed.",
    { timeout: 10_000 },
  );
  // The wrong account at GitHub.
  GH.tokens = { [EXTRA]: "lab-laptop" };
  plan = { kind: "success", token: EXTRA };
  await panel(page).getByRole("button", { name: "Give permission" }).click();
  await expect(status(page)).toHaveText(
    "GitHub gave the permission for @lab-laptop, but you are signed in to this dashboard as @bobalabx. This panel didn't use it; nothing was changed.",
    { timeout: 10_000 },
  );
  await expect(panel(page)).toContainText("switch to @bobalabx (or sign out of @lab-laptop)");
  await shot(page, "error-wrong-account.png");
  await axe(page, "wrong account");
  expect(await page.evaluate((k) => sessionStorage.getItem(k), KEY)).toBeNull();
  // Try again with the right account.
  GH.tokens = { [EXTRA]: "bobalabx" };
  await panel(page).getByRole("button", { name: "Try again" }).click();
  await expect(panel(page).getByRole("heading", { name: "Can edit (3)" })).toBeVisible({
    timeout: 15_000,
  });
  expect(writes()).toEqual([]);
});

test("a non-admin sees who manages access and how to ask; nothing else is asked of GitHub", async ({
  page,
}) => {
  test.setTimeout(90_000);
  GH.admin = false;
  await login(page);
  await asGitHub(page, "ada-editor", "Ada Editor");
  let popups = 0;
  page.on("popup", () => popups++);
  await openPanel(page);
  await expect(panel(page)).toContainText("Only the owner can change who can edit");
  await expect(panel(page)).toContainText("with the owner account, bobalabx.");
  await expect(panel(page)).toContainText("You are signed in as @ada-editor.");
  await shot(page, "non-admin.png");
  await axe(page, "non-admin");
  expect(
    GH.requests.map((r) => r.path).filter((p) => /collaborators|invitations|^\/user$/.test(p)),
  ).toEqual([]);
  expect(popups).toBe(0);
  expect(writes()).toEqual([]);
});

test("the local demo explains that access is managed on the live dashboard, with no request", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  const before = GH.requests.length;
  await openPanel(page);
  await expect(panel(page)).toContainText("Editors are managed on the live dashboard");
  await expect(panel(page)).toContainText("This is the local demo. It has no GitHub sign-in");
  await expect(panel(page).getByRole("link", { name: /Open the live dashboard/ })).toHaveAttribute(
    "href",
    "https://bobalabx.github.io/bobalab-web/admin/",
  );
  await shot(page, "local-demo.png");
  await axe(page, "local demo");
  expect(GH.requests.length).toBe(before);
});

test("keyboard: open from the dock, move around, Escape closes; the focus comes back", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page);
  await asGitHub(page, "bobalabx", "BOBALAB");
  const who = page.locator("#bl-dock").getByRole("button", { name: "Who can edit" });
  await who.focus();
  await page.keyboard.press("Enter");
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).getByRole("button", { name: "Close" })).toBeFocused();
  // Give permission with the keyboard (Shift+Tab back from Close reaches it).
  await panel(page).getByRole("button", { name: "Give permission" }).focus();
  const popup = page.waitForEvent("popup");
  await page.keyboard.press("Enter");
  await popup;
  await expect(panel(page).getByRole("heading", { name: "Can edit (3)" })).toBeFocused({
    timeout: 15_000,
  });
  // Tab never reaches the page behind the modal panel (past its last control the
  // browser's own toolbar takes the focus, and document.activeElement is the body).
  const seen = new Set<string>();
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Tab");
    const where = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return "browser";
      return a.closest("dialog.bl-access-sheet")
        ? `panel: ${(a.getAttribute("aria-label") || a.textContent || a.tagName).trim().slice(0, 40)}`
        : `OUTSIDE: ${a.outerHTML.slice(0, 120)}`;
    });
    expect(where).not.toMatch(/^OUTSIDE/);
    seen.add(where);
  }
  // …and it goes round: the list's buttons, the field and Close are all reached.
  expect([...seen]).toEqual(
    expect.arrayContaining([
      "panel: Remove Isabelle Cho (@icho)",
      "panel: Cancel invitation for @new-ra",
      "panel: Look up",
      "panel: Close",
    ]),
  );
  // Remove → the confirmation starts on Cancel; Escape cancels and returns to Remove.
  const remove = panel(page).getByRole("button", { name: "Remove Isabelle Cho (@icho)" });
  await remove.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator("dialog.bl-dialog--danger").getByRole("button", { name: "Cancel" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog.bl-dialog--danger")).toHaveCount(0);
  await expect(remove).toBeFocused();
  expect(writes()).toEqual([]);
  // Escape closes the panel; the focus is back on the dock's button.
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);
  await expect(who).toBeFocused();
});

/** The dock's words (as cms-dock.js writes them) and how much of them shows. */
async function dockFit(page: Page, text: string, action: string) {
  return page.evaluate(
    ([t, a]: [string, string]) => {
      const dock = document.querySelector("#bl-dock")!;
      const te = dock.querySelector(".bl-dock__text") as HTMLElement;
      const ac = dock.querySelector(".bl-dock__action") as HTMLElement;
      te.textContent = t;
      ac.hidden = !a;
      ac.textContent = a;
      const body = dock.querySelector(".bl-dock__body")!.getBoundingClientRect();
      const ar = ac.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(ac);
      const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      const visible = [...dock.querySelectorAll("button")]
        .filter((b) => (b as HTMLElement).offsetParent !== null && !(b as HTMLElement).hidden)
        .map((b) => b.textContent!.trim());
      return {
        cut: te.scrollWidth > te.clientWidth + 1,
        actionInside: !a || (ar.left >= body.left - 1 && ar.right <= body.right + 1),
        actionLines: a ? lines : 0,
        buttons: visible,
      };
    },
    [text, action] as [string, string],
  );
}

for (const width of [375, 390]) {
  test.describe(`on a phone (${width} px)`, () => {
    test.use({ viewport: { width, height: 812 } });

    test("the dock keeps its words: Who can edit is in Recent changes instead", async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await login(page);
      await asGitHub(page, "bobalabx", "BOBALAB");
      const dock = page.locator("#bl-dock");
      await expect(dock.getByRole("button", { name: "Who can edit" })).toBeHidden();
      // The status words fit on the one-line dock (D-17 spec §8), with their link.
      for (const [t, a] of [
        ["Live on the site ✓", "View page"],
        ["Live site up to date", ""],
        ["The live site is updating…", ""],
      ] as const) {
        const r = await dockFit(page, t, a);
        expect(r, t).toEqual({
          cut: false,
          actionInside: true,
          actionLines: a ? 1 : 0,
          buttons: a ? [a, "Recent changes"] : ["Recent changes"],
        });
      }
      // The longest words are cut as before this feature (the toast says them in full),
      // with nothing but Recent changes beside them.
      const saved = await dockFit(page, "Saved. The live site updates in about 2 minutes.", "");
      expect(saved.buttons).toEqual(["Recent changes"]);
      await shot(page, `phone-${width}-0-dock.png`);
      // Recent changes → Who can edit → the panel; Close → back to Recent changes.
      const recent = dock.getByRole("button", { name: "Recent changes" });
      await recent.click();
      const sheet = page.locator("dialog.bl-sheet", { hasText: "Recent changes" });
      await expect(sheet).toBeVisible();
      const who = sheet.getByRole("button", { name: "Who can edit" });
      await expect(who).toBeVisible();
      expect((await who.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await shot(page, `phone-${width}-1-recent.png`);
      await axe(page, "recent changes with Who can edit");
      await who.click();
      await expect(panel(page)).toBeVisible();
      await expect(page.locator("dialog.bl-dialog[open]")).toHaveCount(1);
      await expect(panel(page)).toContainText("Managing editors needs one extra GitHub permission");
      await panel(page).getByRole("button", { name: "Close" }).click();
      await expect(panel(page)).toHaveCount(0);
      await expect(recent).toBeFocused();
    });
  });
}

test("on a desktop, Who can edit is in the dock, not in Recent changes", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  const dock = page.locator("#bl-dock");
  await expect(dock.getByRole("button", { name: "Who can edit" })).toBeVisible();
  await dock.getByRole("button", { name: "Recent changes" }).click();
  const sheet = page.locator("dialog.bl-sheet", { hasText: "Recent changes" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Who can edit" })).toBeHidden();
  await page.keyboard.press("Escape");
});

/** 16 editors and two invitations: a list long enough to scroll under the status line. */
function longLists() {
  const many = Array.from({ length: 14 }, (_, i) => `editor-${i + 1}`);
  GH.collaborators = [{ login: "bobalabx", admin: true }, { login: "icho" }].concat(
    many.map((login) => ({ login })),
  );
  for (const [i, login] of many.entries())
    GH.users[login] = { login, name: `Editor Number ${i + 1}` };
  GH.invitations.push({
    id: 502,
    login: "ada-editor",
    created_at: "2026-10-25T17:00:00Z",
    inviter: "bobalabx",
  });
}

/** How many pixels of the focused control the status line covers (null: no status, or focus elsewhere). */
function statusCover(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    const s = document.querySelector(".bl-access__status") as HTMLElement | null;
    if (!a || !s || !s.textContent || !a.closest("dialog.bl-access-sheet .bl-access__view"))
      return null;
    const r = a.getBoundingClientRect();
    const b = s.getBoundingClientRect();
    const px = Math.max(0, Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top));
    return { what: (a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 50), px };
  });
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 760 },
]) {
  test.describe(`focus at ${viewport.width} px`, () => {
    test.use({ viewport });

    test("a focused control is never hidden under the status line (WCAG 2.4.11)", async ({
      page,
    }) => {
      test.setTimeout(150_000);
      longLists();
      await login(page);
      await asGitHub(page, "bobalabx", "BOBALAB");
      if (viewport.width < 800) {
        await page.locator("#bl-dock").getByRole("button", { name: "Recent changes" }).click();
        await page
          .locator("dialog.bl-sheet", { hasText: "Recent changes" })
          .getByRole("button", { name: "Who can edit" })
          .click();
        await expect(panel(page)).toBeVisible();
      } else {
        await openPanel(page);
      }
      await grant(page);
      // An answer stays in the status line (as after an invitation)…
      await panel(page).getByLabel("GitHub username").fill("nike-n");
      await panel(page).getByLabel("GitHub username").press("Enter");
      await expect(panel(page).getByRole("button", { name: /^Send invitation/ })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(status(page)).toHaveText(/^Invitation sent\./);
      // …while the keyboard goes back up through the long list.
      const hidden: string[] = [];
      let checked = 0;
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press("Shift+Tab");
        await page.waitForTimeout(40);
        const c = await statusCover(page);
        if (!c) continue;
        checked++;
        if (c.px > 0) hidden.push(`${c.what}: ${c.px}px`);
      }
      expect(checked).toBeGreaterThan(20);
      expect(hidden).toEqual([]);
      // Focus the panel moves itself (to a heading in the middle, after a cancellation).
      await panel(page)
        .getByRole("button", { name: "Cancel invitation for Ada Editor (@ada-editor)" })
        .click();
      await page
        .locator("dialog.bl-dialog--danger")
        .getByRole("button", { name: "Cancel invitation" })
        .click();
      await expect(status(page)).toHaveText("Invitation for Ada Editor (@ada-editor) cancelled.");
      await expect(
        panel(page).getByRole("heading", { name: /^Invited, not accepted yet/ }),
      ).toBeFocused();
      await page.waitForTimeout(100);
      const c = await statusCover(page);
      expect(c && c.px, c ? c.what : "no status").toBe(0);
      await shot(page, `focus-visible-${viewport.width}.png`);
    });
  });
}

test("the GitHub window's messages reach no other listener (Decap's own sign-in)", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  await asGitHub(page, "bobalabx", "BOBALAB");
  // As Decap's sign-in leaves it after an unfinished Login: a message listener that
  // is not capturing, added before ours runs, which would keep any token it is given.
  await page.evaluate(() => {
    const w = window as unknown as { __seen: string[] };
    w.__seen = [];
    window.addEventListener("message", (e) => {
      if (typeof e.data === "string" && /^authoriz/.test(e.data))
        w.__seen.push(e.data.slice(0, 40));
    });
  });
  await openPanel(page);
  await grant(page);
  await expect(panel(page).getByRole("heading", { name: "Can edit (3)" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen)).toEqual([]);
});

test.describe("on a phone (390 px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the panel fills the screen without sideways scrolling; every target is 44 px", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page);
    await asGitHub(page, "bobalabx", "BOBALAB");
    await shot(page, "phone-1-dock.png");
    await page.locator("#bl-dock").getByRole("button", { name: "Recent changes" }).click();
    await page
      .locator("dialog.bl-sheet", { hasText: "Recent changes" })
      .getByRole("button", { name: "Who can edit" })
      .click();
    await expect(panel(page)).toBeVisible();
    await shot(page, "phone-2-needs-permission.png");
    await grant(page);
    await expect(panel(page).getByRole("heading", { name: "Can edit (3)" })).toBeVisible();
    const dlg = (await panel(page).boundingBox())!;
    expect(dlg.width).toBeGreaterThanOrEqual(388);
    expect(
      await panel(page).evaluate((d) => {
        const c = d.querySelector(".bl-sheet__content") as HTMLElement;
        return {
          content: c.scrollWidth - c.clientWidth,
          page: document.documentElement.scrollWidth,
        };
      }),
    ).toEqual({ content: 0, page: 390 });
    for (const b of await panel(page).getByRole("button").all()) {
      if (!(await b.isVisible())) continue;
      const r = (await b.boundingBox())!;
      expect(r.height, await b.innerText()).toBeGreaterThanOrEqual(44);
    }
    await shot(page, "phone-3-list.png");
    await panel(page).getByLabel("GitHub username").fill("nike-n");
    await panel(page).getByRole("button", { name: "Look up" }).click();
    await expect(panel(page).locator(".bl-access__card")).toBeVisible();
    await panel(page).locator(".bl-access__card").scrollIntoViewIfNeeded();
    // Links are targets too (the profile link on the card).
    for (const a of await panel(page).locator(".bl-access__view a").all()) {
      const r = (await a.boundingBox())!;
      expect(r.height, await a.innerText()).toBeGreaterThanOrEqual(44);
    }
    await shot(page, "phone-4-lookup.png");
    await axe(page, "phone");
  });
});
