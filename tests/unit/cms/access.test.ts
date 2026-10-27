/**
 * public/admin/cms-access.js: "Who can edit" (DECISIONS D-20). Runs the real
 * cms-ui.js, cms-github.js and cms-access.js (and the dock) in a sandbox with a
 * fake GitHub (every request recorded; nothing reaches the network) and a fake
 * popup for the sign-in service, so every state and error is checked: the local
 * demo, a non-admin, an admin without and with the extra permission, the
 * handshake and its origin checks, a blocked or closed popup, the wrong account,
 * a token without "repo", look-up, invite, cancel and remove with their
 * confirmations, GitHub's error answers, and where the token is (and is not) kept.
 */
import { describe, expect, it } from "vitest";
import {
  CMS_DATA,
  FakeEvent,
  GITHUB_USER,
  boot,
  buttonNamed,
  flush,
  text,
  visibleText,
  type Answer,
  type Call,
  type FakeElement,
} from "./github-helpers";

const REPO = "bobalabx/bobalab-web";
const WORKER = "https://bobalab-cms-auth.bobalabx-034.workers.dev";
const DECAP = GITHUB_USER.token;
const EXTRA = "gho_extra_permission_test_token";
const KEY = "bobalab.access.v1";
const OWNER = {
  ...GITHUB_USER,
  login: "bobalabx",
  name: "BOBALAB",
  avatar_url: "https://avatars.githubusercontent.com/u/9000001?v=4",
};
const AV = (n: number) => `https://avatars.githubusercontent.com/u/${n}?v=4`;

// ---------------------------------------------------------------------------
// A fake GitHub with state

interface Person {
  login: string;
  admin?: boolean;
  direct?: boolean;
}
interface Invite {
  id: number;
  login: string;
  created_at: string;
  inviter: string;
  expired?: boolean;
}
interface Fake {
  admin: boolean;
  ownerType: "User" | "Organization";
  ownerLogin: string;
  decapScopes: string | null;
  tokens: Record<string, { login: string; scopes: string | null }>;
  collaborators: Person[];
  invitations: Invite[];
  users: Record<string, { login: string; name: string | null; type?: string; avatar_url?: string }>;
  /** "METHOD /path" → a fixed answer, or "network" for a failed request. */
  answers: Record<string, Answer | "network">;
  /** Called after a successful DELETE of a collaborator (e.g. an admin removing themselves). */
  onRemove?: (login: string) => void;
}

function fakeGitHub(o: Partial<Fake> = {}): Fake {
  return {
    admin: true,
    ownerType: "User",
    ownerLogin: "bobalabx",
    decapScopes: "public_repo",
    tokens: { [EXTRA]: { login: "bobalabx", scopes: "repo" } },
    collaborators: [{ login: "bobalabx", admin: true }, { login: "icho" }, { login: "jazzb" }],
    invitations: [
      { id: 501, login: "new-ra", created_at: "2026-10-24T17:00:00Z", inviter: "bobalabx" },
    ],
    users: {
      bobalabx: { login: "bobalabx", name: "BOBALAB", avatar_url: AV(9000001) },
      icho: { login: "icho", name: "Isabelle Cho", avatar_url: AV(9000002) },
      jazzb: { login: "jazzb", name: "Jazz Beecham", avatar_url: AV(9000003) },
      "new-ra": { login: "new-ra", name: null, avatar_url: AV(9000004) },
      "nike-n": { login: "nike-n", name: "Nike Naiyarat", avatar_url: AV(9000005) },
      "ada-editor": { login: "ada-editor", name: "Ada Editor", avatar_url: AV(1000001) },
      "ben-editor": { login: "ben-editor", name: "Ben Editor", avatar_url: AV(9000006) },
      "carol-org": { login: "carol-org", name: "Carol Org", avatar_url: AV(9000007) },
      "berkeley-lab": { login: "berkeley-lab", name: "A Lab", type: "Organization" },
    },
    answers: {},
    ...o,
  };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Answer => ({
  status,
  body,
  headers: { "content-type": "application/json", ...headers },
});

function handler(f: Fake) {
  return (u: URL, call: Call): Answer => {
    const p = decodeURIComponent(u.pathname);
    const q = p + u.search;
    const token = (call.headers.Authorization ?? "").replace(/^token /, "");
    const fixed = f.answers[`${call.method} ${q}`] ?? f.answers[`${call.method} ${p}`];
    if (fixed === "network") throw new TypeError("Failed to fetch");
    if (fixed) return fixed;
    const who = f.tokens[token];
    const canList = !!who && (who.scopes === null || /\brepo\b/.test(who.scopes ?? ""));
    if (call.method === "GET" && p === `/repos/${REPO}`) {
      return json(
        {
          full_name: REPO,
          owner: { login: f.ownerLogin, type: f.ownerType },
          permissions: { admin: f.admin, push: true, pull: true },
        },
        200,
        f.decapScopes === null || token !== DECAP ? {} : { "x-oauth-scopes": f.decapScopes },
      );
    }
    if (call.method === "GET" && p === "/user") {
      if (!who) return json({ message: "Bad credentials" }, 401);
      return json(
        { login: who.login },
        200,
        who.scopes === null ? {} : { "x-oauth-scopes": who.scopes },
      );
    }
    let m = /^\/users\/([^/]+)$/.exec(p);
    if (call.method === "GET" && m) {
      const user = f.users[m[1]!.toLowerCase()];
      if (!user) return json({ message: "Not Found" }, 404);
      return json({
        type: "User",
        html_url: `https://github.com/${user.login}`,
        ...user,
      });
    }
    const base = `/repos/${REPO}`;
    if (call.method === "GET" && p === `${base}/collaborators`) {
      if (!who) return json({ message: "Bad credentials" }, 401);
      if (!canList)
        return json({ message: "Must have push access to view repository collaborators." }, 403);
      const direct = u.searchParams.get("affiliation") === "direct";
      return json(
        f.collaborators
          .filter((c) => !direct || c.direct !== false)
          .map((c) => ({
            login: c.login,
            avatar_url: f.users[c.login]?.avatar_url ?? null,
            permissions: { admin: !!c.admin, push: true, pull: true },
          })),
      );
    }
    if (call.method === "GET" && p === `${base}/invitations`) {
      if (!who) return json({ message: "Bad credentials" }, 401);
      if (!canList) return json({ message: "Not Found" }, 404);
      return json(
        f.invitations.map((i) => ({
          id: i.id,
          invitee: { login: i.login, avatar_url: f.users[i.login]?.avatar_url ?? null },
          inviter: { login: i.inviter },
          created_at: i.created_at,
          expired: !!i.expired,
          permissions: "write",
        })),
      );
    }
    m = new RegExp(`^${base}/collaborators/([^/]+)$`).exec(p);
    if (m && call.method === "PUT") {
      if (!who) return json({ message: "Bad credentials" }, 401);
      const login = m[1]!;
      if (!f.users[login.toLowerCase()]) return json({ message: "Not Found" }, 404);
      if (f.collaborators.some((c) => c.login === login)) return { status: 204 };
      const inv = {
        id: 600 + f.invitations.length,
        login,
        created_at: "2026-10-26T20:00:00Z",
        inviter: who.login,
      };
      f.invitations.push(inv);
      return json({ id: inv.id, invitee: { login }, inviter: { login: who.login } }, 201);
    }
    if (m && call.method === "DELETE") {
      if (!who) return json({ message: "Bad credentials" }, 401);
      const before = f.collaborators.length;
      f.collaborators = f.collaborators.filter((c) => c.login !== m![1]);
      if (f.collaborators.length === before) return json({ message: "Not Found" }, 404);
      f.onRemove?.(m[1]!);
      return { status: 204 };
    }
    m = new RegExp(`^${base}/invitations/(\\d+)$`).exec(p);
    if (m && call.method === "DELETE") {
      if (!who) return json({ message: "Bad credentials" }, 401);
      const before = f.invitations.length;
      f.invitations = f.invitations.filter((i) => i.id !== Number(m![1]));
      if (f.invitations.length === before) return json({ message: "Not Found" }, 404);
      return { status: 204 };
    }
    return json({ message: "Not Found" }, 404);
  };
}

// ---------------------------------------------------------------------------
// A fake popup for the sign-in service

class FakePopup {
  closed = false;
  focused = 0;
  posted: Array<{ data: unknown; origin: string }> = [];
  constructor(
    readonly url: string,
    readonly name: string,
    readonly features: string,
  ) {}
  postMessage(data: unknown, origin: string) {
    this.posted.push({ data, origin });
  }
  close() {
    this.closed = true;
  }
  focus() {
    this.focused++;
  }
}

interface Access {
  open(opener?: unknown): void;
  forget(): void;
  hasPermission(): boolean;
  parseUsername(s: unknown): { login?: string; problem?: string };
  _request(method: string, path: string, body?: unknown): Promise<{ status: number }>;
  _grantUrl(): string;
  _state(): { phase: string; busy: boolean };
}

interface SetupOpts {
  fake?: Partial<Fake>;
  user?: Record<string, unknown> | null;
  mode?: "github" | "local";
  blockPopup?: boolean;
  session?: Record<string, string>;
  dock?: boolean;
  /** window.BOBALAB_TEST_HOOKS (default true): the _request/_state/… test hooks. */
  hooks?: boolean;
  /** cms-data.js auth.scopes (default: the generated ones, ["repo"]). */
  scopes?: string[];
}

function setup(o: SetupOpts = {}) {
  const f = fakeGitHub(o.fake);
  const popups: FakePopup[] = [];
  const logged: unknown[][] = [];
  const spy =
    () =>
    (...args: unknown[]) =>
      logged.push(args);
  const files = o.dock
    ? [
        "cms-ui.js",
        "cms-github.js",
        "cms-history.js",
        "cms-deploy.js",
        "cms-access.js",
        "cms-dock.js",
      ]
    : ["cms-ui.js", "cms-github.js", "cms-access.js"];
  const b = boot({
    files,
    mode: o.mode,
    user: o.user === undefined ? OWNER : o.user,
    session: o.session,
    fetch: handler(f),
    cmsData: o.scopes ? { ...CMS_DATA, auth: { scopes: o.scopes } } : undefined,
    extra: {
      BOBALAB_TEST_HOOKS: o.hooks !== false,
      open: (url: string, name: string, features: string) => {
        const p = new FakePopup(url, name, features);
        popups.push(p);
        return o.blockPopup ? null : p;
      },
      console: { log: spy(), info: spy(), warn: spy(), error: spy(), debug: spy() },
    },
  });
  const access = b.win.BobalabAccess as Access;
  const doc = b.document!;
  const panel = () =>
    doc.querySelectorAll("dialog.bl-dialog").find((d) => d.classList.contains("bl-access-sheet")) ??
    null;
  const confirmDialog = () =>
    doc
      .querySelectorAll("dialog.bl-dialog")
      .find((d) => !d.classList.contains("bl-access-sheet")) ?? null;
  const status = () => text(panel()?.querySelector(".bl-access__status"));
  const view = () => visibleText(panel()?.querySelector(".bl-access__view"));
  const button = (name: string | RegExp, el: FakeElement | null = panel()) => {
    const btn = buttonNamed(el, name);
    if (!btn) throw new Error(`no button ${String(name)} in: ${visibleText(el)}`);
    return btn;
  };
  const input = () =>
    panel()!.querySelector("input.bl-access__input") as FakeElement & {
      value: string;
    };
  const settle = () => b.clock.advance(100);
  const openPanel = async () => {
    access.open();
    await settle();
  };
  /** The sign-in service's side of Decap's handshake, from the latest popup. */
  const handshake = async (popup = popups[popups.length - 1]!) => {
    b.fire("message", { data: "authorizing:github", origin: WORKER, source: popup });
    await settle();
  };
  const answer = async (
    payload: Record<string, unknown>,
    state: "success" | "error" = "success",
    popup = popups[popups.length - 1]!,
  ) => {
    b.fire("message", {
      data: `authorization:github:${state}:${JSON.stringify(payload)}`,
      origin: WORKER,
      source: popup,
    });
    await settle();
  };
  /** Give permission → handshake → token, as an admin. */
  const grant = async (token = EXTRA) => {
    button("Give permission").click();
    await settle();
    await handshake();
    await answer({ provider: "github", token });
  };
  const writes = () => b.calls.filter((c) => c.method !== "GET");
  const paths = (calls = b.calls) =>
    calls.map((c) => {
      const u = new URL(c.url);
      return `${c.method} ${decodeURIComponent(u.pathname + u.search)}`;
    });
  return {
    ...b,
    f,
    access,
    popups,
    logged,
    panel,
    confirmDialog,
    status,
    view,
    button,
    input,
    settle,
    openPanel,
    handshake,
    answer,
    grant,
    writes,
    paths,
  };
}

type B = ReturnType<typeof setup>;

async function lookUp(b: B, name: string) {
  b.input().value = name;
  b.button("Look up").click();
  await b.settle();
}

async function confirmWith(b: B, label: string | RegExp) {
  const dlg = b.confirmDialog();
  expect(dlg).not.toBeNull();
  b.button(label, dlg).click();
  await b.settle();
}

// ---------------------------------------------------------------------------

describe("cms-access.js: usernames", () => {
  const { access } = setup();
  it("accepts a username, @name and a github.com profile address", () => {
    expect(access.parseUsername("isabelle-cho")).toEqual({ login: "isabelle-cho" });
    expect(access.parseUsername("  @Jazz-B ")).toEqual({ login: "Jazz-B" });
    expect(access.parseUsername("https://github.com/nike-n")).toEqual({ login: "nike-n" });
    expect(access.parseUsername("github.com/nike-n/")).toEqual({ login: "nike-n" });
    expect(access.parseUsername("a".repeat(39))).toEqual({ login: "a".repeat(39) });
  });
  it("refuses empty text, an email address and anything GitHub would not accept, in plain words", () => {
    expect(access.parseUsername("").problem).toBe("Type their GitHub username first.");
    expect(access.parseUsername("jazz@berkeley.edu").problem).toMatch(
      /^That looks like an email address\. GitHub invitations need the person's GitHub username/,
    );
    for (const bad of ["two words", "-dash", "dash-", "dou--ble", "a".repeat(40), "ü-name"])
      expect(access.parseUsername(bad).problem, bad).toMatch(/isn't a GitHub username\./);
  });
});

describe("cms-access.js: who sees what", () => {
  it("local demo: explains that access is managed on the live dashboard, with no request", async () => {
    const b = setup({ mode: "local", user: { backendName: "proxy" } });
    await b.openPanel();
    expect(text(b.panel()!.querySelector(".bl-dialog__title"))).toBe("Who can edit");
    expect(b.view()).toContain("Editors are managed on the live dashboard");
    expect(b.view()).toContain("This is the local demo. It has no GitHub sign-in");
    expect(b.view()).toContain("the owner account bobalabx");
    const link = b.panel()!.querySelector(".bl-access__view a")!;
    expect(link.getAttribute("href")).toBe("https://bobalabx.github.io/bobalab-web/admin/");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(b.calls).toHaveLength(0);
    expect(b.popups).toHaveLength(0);
  });

  it("a non-admin (personal account): who manages access and how to ask; no list, no popup", async () => {
    const b = setup({ user: GITHUB_USER, fake: { admin: false } });
    await b.openPanel();
    expect(b.view()).toContain("Only the owner can change who can edit");
    expect(b.view()).toContain(
      "Adding and removing editors is done with the owner account, bobalabx.",
    );
    expect(b.view()).toContain(
      "send them the new editor's GitHub username, not their email address",
    );
    expect(b.view()).toContain("You are signed in as @ada-editor.");
    expect(b.view()).toContain(
      "If the lab moves the website to a GitHub organization, the repository's admins can manage editors here too.",
    );
    expect(b.paths()).toEqual([`GET /repos/${REPO}`]);
    expect(b.calls[0]!.headers.Authorization).toBe(`token ${DECAP}`);
    expect(b.popups).toHaveLength(0);
  });

  it("a non-admin in an organization: the organization's admins manage access", async () => {
    const b = setup({
      user: GITHUB_USER,
      fake: { admin: false, ownerType: "Organization", ownerLogin: "bobalabx" },
    });
    await b.openPanel();
    expect(b.view()).toContain("Only the repository's admins can change who can edit");
    expect(b.view()).not.toContain("If the lab moves the website to a GitHub organization");
    expect(b.view()).toContain(
      "by the admins of the bobalabx/bobalab-web repository in the bobalabx organization.",
    );
  });

  it("an admin without the extra permission: one explanation and [Give permission]", async () => {
    const b = setup();
    await b.openPanel();
    expect(b.view()).toContain("Managing editors needs one extra GitHub permission");
    expect(b.view()).toContain("(GitHub calls it “repo”)");
    expect(b.view()).toContain("Check that it shows your account, @bobalabx, then approve.");
    // What GitHub's window will say, and what this panel does with it.
    expect(b.view()).toContain(
      "GitHub describes the permission as full control of your account's public and private repositories; this panel uses it only to list, invite and remove the editors of bobalabx/bobalab-web.",
    );
    // Where it is kept: the page forgets it; GitHub keeps the grant until it is withdrawn.
    expect(b.view()).toContain(
      "This page keeps the permission until you reload or close it or press Turn it off now, and for at most 8 hours.",
    );
    expect(b.view()).toContain(
      "GitHub itself keeps it for your account until you withdraw it (github.com → Settings → Applications → Authorized OAuth Apps); withdrawing it also signs that account out of the dashboard. GitHub may also add it to your later sign-ins to this dashboard.",
    );
    expect(b.view()).not.toContain("browser tab");
    expect(b.view()).not.toContain("may open and close by itself");
    expect(b.button("Give permission").className).toContain("bl-btn--primary");
    // Nothing that needs the permission was asked for yet.
    expect(b.paths()).toEqual([`GET /repos/${REPO}`]);
  });

  it("an admin whose sign-in already carries repo is told the window may close by itself", async () => {
    const b = setup({ fake: { decapScopes: "public_repo, repo" } });
    await b.openPanel();
    expect(b.view()).toContain("so the window may open and close by itself");
  });

  it("errors while checking: expired sign-in, busy, missing repository, offline (with Try again)", async () => {
    const cases: Array<[Answer | "network", RegExp]> = [
      [json({ message: "Bad credentials" }, 401), /^Your GitHub sign-in has expired\. Log out/],
      [
        json({ message: "rate" }, 403, {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(Math.floor(Date.parse("2026-10-26T22:40:00Z") / 1000)),
        }),
        /^GitHub is busy; try again at \d{1,2}:\d\d (am|pm)\.$/,
      ],
      [
        json({ message: "Not Found" }, 404),
        /couldn't find the website's repository \(bobalabx\/bobalab-web\)/,
      ],
      ["network", /^Couldn't reach GitHub\. Check your connection and try again\.$/],
    ];
    for (const [ans, words] of cases) {
      const b = setup({ fake: { answers: { [`GET /repos/${REPO}`]: ans } } });
      await b.openPanel();
      expect(b.status()).toMatch(words);
      expect(b.view()).toContain("Who can edit couldn't be checked.");
      if (ans !== "network") continue;
      // Try again checks once more (a rate-limited GitHub would refuse until its reset time),
      // and the old problem does not stay above the working panel.
      delete b.f.answers[`GET /repos/${REPO}`];
      b.button("Try again").click();
      await b.settle();
      expect(b.view()).toContain("Managing editors needs one extra GitHub permission");
      expect(b.status()).toBe("");
      expect(b.panel()!.querySelector(".bl-access__status")!.getAttribute("data-tone")).toBe(
        "info",
      );
    }
    // The same for a non-admin: Try again leads to the explanation, without the old error.
    const c = setup({
      user: GITHUB_USER,
      fake: { admin: false, answers: { [`GET /repos/${REPO}`]: "network" } },
    });
    await c.openPanel();
    expect(c.status()).toMatch(/^Couldn't reach GitHub/);
    delete c.f.answers[`GET /repos/${REPO}`];
    c.button("Try again").click();
    await c.settle();
    expect(c.view()).toContain("Only the owner can change who can edit");
    expect(c.status()).toBe("");
  });

  it("a signed-in account that is not an editor is not told it can save", async () => {
    const b = setup({ user: GITHUB_USER, fake: { admin: false } });
    b.f.answers[`GET /repos/${REPO}`] = json({
      full_name: REPO,
      owner: { login: "bobalabx", type: "User" },
      permissions: { admin: false, push: false, pull: true },
    });
    await b.openPanel();
    expect(b.view()).toContain(
      "Your account isn't one of the website's editors at the moment, so it can't save changes. Adding and removing editors is done with the owner account, bobalabx.",
    );
    expect(b.view()).not.toContain("You can edit and save the website");
  });
});

describe("cms-access.js: Give permission (the sign-in service's popup)", () => {
  it("opens the sign-in service with scope=repo for this site, and completes Decap's handshake", async () => {
    const b = setup();
    await b.openPanel();
    b.button("Give permission").click();
    await b.settle();
    expect(b.popups).toHaveLength(1);
    const p = b.popups[0]!;
    expect(p.url).toBe(`${WORKER}/auth?provider=github&site_id=bobalabx.github.io&scope=repo`);
    expect(p.features).toMatch(/^width=960,height=600,/);
    expect(p.focused).toBe(1);
    expect(b.view()).toContain("Waiting for GitHub… Finish in the GitHub window.");
    expect(b.status()).toBe("Waiting for GitHub…");
    await b.handshake();
    // The echo goes to the popup only, addressed to the sign-in service's origin.
    expect(p.posted).toEqual([{ data: "authorizing:github", origin: WORKER }]);
    await b.answer({ provider: "github", token: EXTRA });
    expect(p.closed).toBe(true);
    // The token is checked against the signed-in account, then the lists load.
    expect(b.paths()).toEqual([
      `GET /repos/${REPO}`,
      "GET /user",
      `GET /repos/${REPO}/collaborators?affiliation=all&per_page=100&page=1`,
      `GET /repos/${REPO}/invitations?per_page=100&page=1`,
      "GET /users/bobalabx",
      "GET /users/icho",
      "GET /users/jazzb",
      "GET /users/new-ra",
    ]);
    const auth = (path: string) => b.calls.find((c) => c.url.includes(path))!.headers.Authorization;
    expect(auth("/user")).toBe(`token ${EXTRA}`);
    expect(auth("/collaborators")).toBe(`token ${EXTRA}`);
    expect(auth("/invitations")).toBe(`token ${EXTRA}`);
    expect(auth("/users/icho")).toBe(`token ${DECAP}`);
    expect(b.status()).toBe(
      "Permission given. You can now manage editors until you reload or close this page.",
    );
    expect(b.view()).toContain("Can edit (3)");
    expect(b.access.hasPermission()).toBe(true);
  });

  it("asks for exactly the scopes cms-data.js names, and refuses a token that lacks one", async () => {
    const b = setup({ scopes: ["repo", "read:org"] });
    await b.openPanel();
    expect(b.view()).toContain("(GitHub calls it “repo” and “read:org”)");
    b.button("Give permission").click();
    await b.settle();
    expect(b.popups[0]!.url).toBe(
      `${WORKER}/auth?provider=github&site_id=bobalabx.github.io&scope=repo%2Cread%3Aorg`,
    );
    expect(new URL(b.popups[0]!.url).searchParams.get("scope")).toBe("repo,read:org");
    // The Worker fell back to its default ("repo,user"): no read:org, so the token is refused.
    b.f.tokens[EXTRA] = { login: "bobalabx", scopes: "repo, user" };
    await b.handshake();
    await b.answer({ provider: "github", token: EXTRA });
    expect(b.status()).toBe(
      "GitHub didn't give “read:org”. The lab's sign-in service may not offer it yet: tell a maintainer (docs/HANDOVER.md §4). Nothing was changed.",
    );
    expect(b.access.hasPermission()).toBe(false);
    expect(b.paths().filter((p) => p.includes("/collaborators"))).toEqual([]);
    // A wider organization scope covers read:org.
    for (const scopes of ["repo, read:org", "admin:org, repo"]) {
      const c = setup({ scopes: ["repo", "read:org"] });
      c.f.tokens[EXTRA] = { login: "bobalabx", scopes };
      await c.openPanel();
      await c.grant();
      expect(c.view(), scopes).toContain("Can edit (3)");
    }
  });

  it("ignores messages from any other origin or window, and an answer before the handshake", async () => {
    const b = setup();
    await b.openPanel();
    b.button("Give permission").click();
    await b.settle();
    const p = b.popups[0]!;
    const other = new FakePopup("x", "y", "z");
    const token = `authorization:github:success:${JSON.stringify({ provider: "github", token: EXTRA })}`;
    b.fire("message", { data: "authorizing:github", origin: "https://evil.example", source: p });
    b.fire("message", { data: "authorizing:github", origin: WORKER, source: other });
    b.fire("message", { data: "authorizing:github", origin: `${WORKER}:443`, source: p });
    b.fire("message", { data: token, origin: WORKER, source: p }); // no handshake yet
    b.fire("message", { data: { token: EXTRA }, origin: WORKER, source: p });
    await b.settle();
    expect(p.posted).toEqual([]);
    expect(other.posted).toEqual([]);
    expect(b.paths()).toEqual([`GET /repos/${REPO}`]);
    await b.handshake();
    b.fire("message", { data: token, origin: "https://evil.example", source: p });
    b.fire("message", { data: token, origin: WORKER, source: other });
    b.fire("message", {
      data: "authorization:github:success:{not json",
      origin: WORKER,
      source: p,
    });
    await b.settle();
    expect(b.paths()).toEqual([`GET /repos/${REPO}`]);
    expect(b.access._state().phase).toBe("needs-grant"); // the malformed answer counts as an error
    expect(b.status()).toBe(
      "GitHub did not give the permission: the sign-in stopped on GitHub's side. Try again; if it keeps happening, tell a maintainer. Nothing was changed.",
    );
  });

  it("the popup's messages reach no other listener on the page (Decap's leftover sign-in listener)", async () => {
    const b = setup();
    // Decap's NetlifyAuthenticator, left over from an unfinished Login in this tab: a
    // non-capturing listener, added before ours, that would sign in with any token
    // from the Worker's origin (and keep it in localStorage).
    const decap: string[] = [];
    (
      b.win as { addEventListener: (t: string, fn: (e: { data: unknown }) => void) => void }
    ).addEventListener("message", (e) => decap.push(String(e.data)));
    await b.openPanel();
    b.button("Give permission").click();
    await b.settle();
    await b.handshake();
    await b.answer({ provider: "github", token: EXTRA });
    expect(b.view()).toContain("Can edit (3)");
    // A late or repeated message from that popup after the grant is stopped as well.
    b.fire("message", {
      data: `authorization:github:success:${JSON.stringify({ provider: "github", token: EXTRA })}`,
      origin: WORKER,
      source: b.popups[0],
    });
    expect(decap).toEqual([]);
    // Messages from any other window still reach the page's other listeners.
    b.fire("message", { data: "from the preview frame", origin: WORKER, source: {} });
    expect(decap).toEqual(["from the preview frame"]);
    for (const [k, v] of b.local.map) expect(v, k).not.toContain(EXTRA);
  });

  it("backstop: a token the dashboard's own sign-in took as well is not used", async () => {
    const b = setup();
    await b.openPanel();
    b.button("Give permission").click();
    await b.settle();
    await b.handshake();
    // As if Decap had stored the new token as its own sign-in.
    b.local.setItem("decap-cms-user", JSON.stringify({ ...OWNER, token: EXTRA }));
    await b.answer({ provider: "github", token: EXTRA });
    expect(b.status()).toBe(
      "The dashboard's own sign-in picked up the extra permission too. Log out (account menu, top right) and sign in again, then press Give permission.",
    );
    expect(b.access.hasPermission()).toBe(false);
    expect(b.paths().filter((p) => p.includes("/collaborators"))).toEqual([]);
  });

  it("a blocked popup: plain advice, nothing waits", async () => {
    const b = setup({ blockPopup: true });
    await b.openPanel();
    b.button("Give permission").click();
    await b.settle();
    expect(b.status()).toBe(
      "Your browser blocked the GitHub window. Allow pop-ups for this site (the browser shows an icon at the end of the address bar), then press Give permission again.",
    );
    expect(b.button("Give permission")).toBeTruthy();
    expect(b.access._state().phase).toBe("needs-grant");
  });

  it("the person closes the GitHub window: noticed within about a second; a late answer still counts", async () => {
    const b = setup();
    await b.openPanel();
    b.button("Give permission").click();
    await b.settle();
    b.popups[0]!.closed = true;
    await b.clock.advance(1200);
    expect(b.status()).toBe(
      "The GitHub window was closed before it finished. Nothing was changed.",
    );
    expect(b.button("Give permission")).toBeTruthy();
    // An answer that was already on its way when the window closed is still taken.
    b.button("Give permission").click();
    await b.settle();
    const p = b.popups[1]!;
    await b.handshake(p);
    p.closed = true;
    await b.clock.advance(500); // the poll sees it closed; the grace period starts
    await b.answer({ provider: "github", token: EXTRA }, "success", p);
    expect(b.view()).toContain("Can edit (3)");
  });

  it("Cancel while waiting closes the window and drops any later answer", async () => {
    const b = setup();
    await b.openPanel();
    b.button("Give permission").click();
    await b.settle();
    await b.handshake();
    b.button("Cancel").click();
    await b.settle();
    expect(b.popups[0]!.closed).toBe(true);
    expect(b.status()).toBe("Cancelled. Nothing was changed.");
    await b.answer({ provider: "github", token: EXTRA }, "success", b.popups[0]);
    expect(b.paths()).toEqual([`GET /repos/${REPO}`]);
    expect(b.access.hasPermission()).toBe(false);
  });

  it("closing the panel while waiting closes the GitHub window too", async () => {
    const b = setup();
    await b.openPanel();
    b.button("Give permission").click();
    await b.settle();
    b.button("Close", b.panel()).click();
    await b.settle();
    expect(b.panel()).toBeNull();
    expect(b.popups[0]!.closed).toBe(true);
  });

  it("gives up after 10 minutes without an answer", async () => {
    const b = setup();
    await b.openPanel();
    b.button("Give permission").click();
    await b.settle();
    await b.clock.advance(10 * 60 * 1000);
    expect(b.status()).toBe(
      "GitHub took too long (more than 10 minutes). Nothing was changed; try again.",
    );
    expect(b.popups[0]!.closed).toBe(true);
  });

  it("the sign-in service's errors in plain words", async () => {
    const cases: Array<[string, string]> = [
      ["AUTH_CODE_REQUEST_FAILED", "the GitHub window was cancelled or did not finish."],
      ["CSRF_DETECTED", "the GitHub window was open too long, or opened twice."],
      [
        "UNSUPPORTED_DOMAIN",
        "the sign-in service does not accept this site's address. Tell a maintainer.",
      ],
      ["MISCONFIGURED_CLIENT", "the sign-in service is not set up correctly. Tell a maintainer."],
      ["TOKEN_REQUEST_FAILED", "the sign-in service had a problem. Try again in a minute."],
    ];
    for (const [code, words] of cases) {
      const b = setup();
      await b.openPanel();
      b.button("Give permission").click();
      await b.settle();
      await b.handshake();
      await b.answer({ provider: "github", error: "x", errorCode: code }, "error");
      expect(b.status()).toBe(`GitHub did not give the permission: ${words} Nothing was changed.`);
      expect(b.popups[0]!.closed).toBe(true);
      expect(b.paths()).toEqual([`GET /repos/${REPO}`]);
    }
    // GitHub's own code without the Worker's errorCode ("success" with an error): no raw code shown.
    const b = setup();
    await b.openPanel();
    b.button("Give permission").click();
    await b.settle();
    await b.handshake();
    await b.answer({ provider: "github", error: "bad_verification_code" }, "error");
    expect(b.status()).toBe(
      "GitHub did not give the permission: the sign-in stopped on GitHub's side. Try again; if it keeps happening, tell a maintainer. Nothing was changed.",
    );
    expect(b.status()).not.toContain("bad_verification_code");
  });

  it("the wrong GitHub account: explains, keeps nothing and offers Try again", async () => {
    const b = setup({ fake: { tokens: { [EXTRA]: { login: "lab-laptop", scopes: "repo" } } } });
    await b.openPanel();
    await b.grant();
    expect(b.status()).toBe(
      "GitHub gave the permission for @lab-laptop, but you are signed in to this dashboard as @bobalabx. This panel didn't use it; nothing was changed.",
    );
    expect(b.view()).toContain(
      "To use the right account: in this browser, open github.com, switch to @bobalabx (or sign out of @lab-laptop), then press Try again.",
    );
    // That other account has now approved the permission on GitHub: how to withdraw it.
    expect(b.view()).toContain(
      "@lab-laptop has now given this permission on GitHub. To withdraw it, sign in to github.com as @lab-laptop and remove the app under Settings → Applications → Authorized OAuth Apps.",
    );
    expect(b.access.hasPermission()).toBe(false);
    expect(b.session.getItem(KEY)).toBeNull();
    // No list was read with the foreign token.
    expect(b.paths()).toEqual([`GET /repos/${REPO}`, "GET /user"]);
    b.f.tokens[EXTRA] = { login: "bobalabx", scopes: "repo" };
    b.button("Try again").click();
    await b.settle();
    await b.handshake();
    await b.answer({ provider: "github", token: EXTRA });
    expect(b.view()).toContain("Can edit (3)");
  });

  it("a token without repo is refused, in words that say what to do on GitHub's screen", async () => {
    const b = setup({
      fake: { tokens: { [EXTRA]: { login: "bobalabx", scopes: "public_repo" } } },
    });
    await b.openPanel();
    await b.grant();
    expect(b.status()).toBe(
      "GitHub gave less access than needed. Press Give permission again and, on GitHub's screen, leave “repo” (access to repositories) ticked.",
    );
    expect(b.access.hasPermission()).toBe(false);
  });

  it("GitHub rejects the new token, or cannot be reached while checking it", async () => {
    const b = setup({ fake: { tokens: {} } });
    await b.openPanel();
    await b.grant();
    expect(b.status()).toBe("GitHub didn't accept the new permission. Try again.");
    const c = setup({ fake: { answers: { "GET /user": "network" } } });
    await c.openPanel();
    await c.grant();
    expect(c.status()).toBe("Couldn't reach GitHub to check the permission. Try again.");
    expect(c.access.hasPermission()).toBe(false);
  });
});

describe("cms-access.js: where the extra permission is kept", () => {
  it("only in this page's memory: never in sessionStorage or localStorage, a log or an address", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    expect(b.access.hasPermission()).toBe(true);
    expect(b.session.getItem(KEY)).toBeNull();
    for (const [k, v] of b.session.map) expect(v, k).not.toContain(EXTRA);
    for (const [k, v] of b.local.map) expect(v, k).not.toContain(EXTRA);
    for (const c of b.calls) expect(c.url).not.toContain(EXTRA);
    expect(JSON.stringify(b.logged)).not.toContain(EXTRA);
    expect(b.logged).toEqual([]);
    // Everything that is not a GET uses the extra permission and nothing else.
    await lookUp(b, "nike-n");
    b.button("Send invitation").click();
    await b.settle();
    expect(b.writes().length).toBeGreaterThan(0);
    for (const w of b.writes()) expect(w.headers.Authorization).toBe(`token ${EXTRA}`);
    // The everyday token is only used to read the repository and public profiles.
    for (const c of b.calls.filter((x) => x.headers.Authorization === `token ${DECAP}`))
      expect(c.method + " " + new URL(c.url).pathname).toMatch(
        new RegExp(`^GET (/repos/${REPO}|/users/[A-Za-z0-9-]+)$`),
      );
  });

  it("a reload drops it (even with an old session entry); the next grant is one more click", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    // A reload: a fresh page in the same tab, even with what an earlier build kept there.
    const again = setup({
      session: { [KEY]: JSON.stringify({ token: EXTRA, login: "bobalabx", at: Date.now() }) },
    });
    expect(again.access.hasPermission()).toBe(false);
    await again.openPanel();
    expect(again.view()).toContain("Managing editors needs one extra GitHub permission");
    expect(again.paths()).toEqual([`GET /repos/${REPO}`]);
  });

  it("is dropped within the 2-second check on sign-out, for another account and after 8 hours", async () => {
    const out = setup();
    await out.openPanel();
    await out.grant();
    out.local.removeItem("decap-cms-user");
    await out.clock.advance(2100);
    expect(out.access._state().phase).toBe("ready");
    // (the check runs without the panel's help)
    out.local.setItem("decap-cms-user", JSON.stringify(OWNER));
    expect(out.access.hasPermission()).toBe(false);

    const other = setup();
    await other.openPanel();
    await other.grant();
    other.local.setItem("decap-cms-user", JSON.stringify({ ...OWNER, login: "someone-else" }));
    await other.clock.advance(2100);
    other.local.setItem("decap-cms-user", JSON.stringify(OWNER));
    expect(other.access.hasPermission()).toBe(false);

    const old = setup();
    await old.openPanel();
    await old.grant();
    await old.clock.advance(8 * 60 * 60 * 1000 + 2100);
    expect(old.access.hasPermission()).toBe(false);
    // The next change says why, and goes back to Give permission.
    await lookUp(old, "nike-n");
    old.button("Send invitation").click();
    await old.settle();
    expect(old.status()).toBe(
      "The extra permission ran out: this page keeps it for at most 8 hours. Give it again, then send the invitation again.",
    );
    expect(old.view()).toContain("Give permission");
    expect(old.writes()).toEqual([]);
  });

  it("signed out (or another account) in another tab while the panel is open: the next change says so", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    await lookUp(b, "nike-n");
    b.local.removeItem("decap-cms-user"); // Log out in another tab
    b.button("Send invitation").click();
    await b.settle();
    expect(b.status()).toBe(
      "You were signed out of the dashboard, so managing editors stopped and nothing was changed. Sign in again first.",
    );
    expect(b.view()).toBe("Sign in to GitHub first.");
    expect(b.writes()).toEqual([]);

    const c = setup();
    await c.openPanel();
    await c.grant();
    c.local.setItem("decap-cms-user", JSON.stringify({ ...GITHUB_USER })); // ada-editor signed in
    c.f.admin = false;
    c.button("Refresh").click();
    await c.settle();
    expect(c.status()).toBe(
      "Another account signed in to the dashboard in this browser, so the extra permission was dropped.",
    );
    expect(c.view()).toContain("Only the owner can change who can edit");
    expect(c.view()).toContain("You are signed in as @ada-editor.");
  });

  it("Turn it off now forgets it at once", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    b.button("Turn it off now").click();
    await b.settle();
    expect(b.access.hasPermission()).toBe(false);
    expect(b.status()).toBe("Managing editors is turned off on this page.");
    expect(b.view()).toContain("Managing editors needs one extra GitHub permission");
  });

  it("the footer says how long the page keeps it, and that GitHub keeps the grant until it is withdrawn", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    expect(visibleText(b.panel()!.querySelector(".bl-access__footer"))).toBe(
      "Managing editors is on for @bobalabx until you reload or close this page or press Turn it off now, and for at most 8 hours. GitHub keeps the permission for your account until you withdraw it (github.com → Settings → Applications → Authorized OAuth Apps); that also signs you out of the dashboard. Turn it off now",
    );
  });

  it("the page itself has no test hooks: nothing else can send a request with the permission", () => {
    const b = setup({ hooks: false });
    expect(Object.keys(b.access).sort()).toEqual([
      "forget",
      "hasPermission",
      "open",
      "parseUsername",
    ]);
  });

  it("never changes the owner account's own access, even when asked directly", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    const n = b.calls.length;
    for (const m of ["PUT", "DELETE"]) {
      for (const who of ["bobalabx", "BobalabX"]) {
        await expect(
          b.access._request(m, `/repos/${REPO}/collaborators/${who}`),
          `${m} ${who}`,
        ).rejects.toMatchObject({ kind: "refused" });
      }
    }
    expect(b.calls).toHaveLength(n);
    // Anyone else is still allowed.
    await expect(
      b.access._request("DELETE", `/repos/${REPO}/collaborators/icho`),
    ).resolves.toMatchObject({
      status: 204,
    });
  });

  it("refuses any other request without sending it", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    const n = b.calls.length;
    const refused = [
      ["PUT", `/repos/${REPO}/contents/content/site.yml`],
      ["POST", `/repos/${REPO}/collaborators/x`],
      ["PATCH", `/repos/${REPO}`],
      ["DELETE", `/repos/${REPO}`],
      ["PUT", `/repos/someone/else/collaborators/x`],
      ["PUT", `/repos/${REPO}/collaborators/x/../../contents`],
      ["GET", "https://evil.example/user"],
      ["DELETE", `/repos/${REPO}/invitations/abc`],
      ["GET", `/repos/${REPO}/collaborators`],
    ];
    for (const [m, p] of refused) {
      await expect(b.access._request(m!, p!), `${m} ${p}`).rejects.toMatchObject({
        kind: "refused",
      });
    }
    expect(b.calls).toHaveLength(n);
    // Without the permission, even an allowed request is not sent.
    b.access.forget();
    await expect(b.access._request("GET", "/user")).rejects.toMatchObject({
      kind: "no-permission",
    });
    expect(b.calls).toHaveLength(n);
  });
});

describe("cms-access.js: the lists", () => {
  it("who can edit (owner first, you, then by name; no Remove for the owner) and the waiting invitations", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    const rows = b.panel()!.querySelectorAll(".bl-access__list")[0]!.querySelectorAll("li");
    expect(rows.map((r) => visibleText(r))).toEqual([
      "BOBALAB @bobalabx you owner",
      "Isabelle Cho @icho Remove",
      "Jazz Beecham @jazzb Remove",
    ]);
    expect(rows[0]!.querySelector("button")).toBeNull();
    expect(rows[0]!.querySelector("img")!.getAttribute("alt")).toBe("");
    expect(rows[0]!.querySelector("img")!.getAttribute("src")).toBe(`${AV(9000001)}&s=64`);
    expect(buttonNamed(rows[1]!, "Remove")!.getAttribute("aria-label")).toBe(
      "Remove Isabelle Cho (@icho)",
    );
    const invites = b.panel()!.querySelectorAll(".bl-access__list")[1]!.querySelectorAll("li");
    expect(invites).toHaveLength(1);
    expect(visibleText(invites[0]!)).toMatch(
      /^new-ra Invited Oct 2[45], 2026 by @bobalabx · waiting for them to accept the email from GitHub Cancel invitation$/,
    );
    expect(buttonNamed(invites[0]!, "Cancel invitation")!.getAttribute("aria-label")).toBe(
      "Cancel invitation for @new-ra",
    );
    expect(b.view()).toContain("Invited, not accepted yet (1)");
  });

  it("an expired invitation says so; an empty list says none are waiting", async () => {
    const b = setup({
      fake: {
        invitations: [
          {
            id: 9,
            login: "new-ra",
            created_at: "2026-10-01T17:00:00Z",
            inviter: "bobalabx",
            expired: true,
          },
        ],
      },
    });
    await b.openPanel();
    await b.grant();
    expect(b.view()).toContain("Expired Cancel it and invite them again.");
    const c = setup({ fake: { invitations: [] } });
    await c.openPanel();
    await c.grant();
    expect(c.view()).toContain("Invited, not accepted yet (0) No invitations are waiting.");
  });

  it("an organization: admins marked, people with access through the organization have no Remove", async () => {
    const b = setup({
      user: GITHUB_USER,
      fake: {
        ownerType: "Organization",
        ownerLogin: "bobalabx",
        tokens: { [EXTRA]: { login: "ada-editor", scopes: "repo" } },
        collaborators: [
          { login: "ada-editor", admin: true },
          { login: "ben-editor" },
          { login: "carol-org", admin: true, direct: false },
        ],
        invitations: [],
      },
    });
    await b.openPanel();
    await b.grant();
    expect(b.paths()).toContain(
      `GET /repos/${REPO}/collaborators?affiliation=direct&per_page=100&page=1`,
    );
    const rows = b.panel()!.querySelectorAll(".bl-access__list")[0]!.querySelectorAll("li");
    expect(rows.map((r) => visibleText(r))).toEqual([
      "Ada Editor @ada-editor you admin Remove",
      "Ben Editor @ben-editor Remove",
      "Carol Org @carol-org admin through the organization",
    ]);
    expect(buttonNamed(rows[0]!, "Remove")!.getAttribute("aria-label")).toBe(
      "Remove yourself (@ada-editor)",
    );
  });

  it("list errors: an expired permission goes back to Give permission; offline offers Try again", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    b.f.tokens = {}; // withdrawn on GitHub
    b.button("Refresh").click();
    await b.settle();
    expect(b.status()).toBe(
      "The extra permission has expired or was withdrawn on GitHub. Give it again to manage editors.",
    );
    expect(b.view()).toContain("Give permission");
    expect(b.session.getItem(KEY)).toBeNull();

    const c = setup();
    await c.openPanel();
    await c.grant();
    c.f.answers[`GET /repos/${REPO}/invitations?per_page=100&page=1`] = "network";
    c.button("Refresh").click();
    await c.settle();
    expect(c.status()).toBe("Couldn't reach GitHub. Check your connection and try again.");
    expect(c.view()).toContain("The lists couldn't be loaded.");
    delete c.f.answers[`GET /repos/${REPO}/invitations?per_page=100&page=1`];
    c.button("Try again").click();
    await c.settle();
    expect(c.view()).toContain("Can edit (3)");
  });

  it("GitHub refuses the list to an admin with a repo token (read:org): explains, links github.com, no loop", async () => {
    const list = `GET /repos/${REPO}/collaborators?affiliation=all&per_page=100&page=1`;
    for (const ans of [
      json({ message: "Must have push access to view repository collaborators." }, 403),
      json({ message: "Not Found" }, 404),
    ]) {
      const b = setup();
      b.f.answers[list] = ans;
      await b.openPanel();
      await b.grant();
      expect(b.status()).toBe("GitHub didn't show who can edit.");
      expect(b.view()).toContain("GitHub didn't show who can edit");
      expect(b.view()).toContain(
        "Your account is an admin of the repository and GitHub gave the extra permission, but GitHub still refused to list the editors. GitHub's documentation says this list also needs a second permission, “read:org”, which the lab's sign-in service doesn't ask for yet. Nothing was changed.",
      );
      expect(b.view()).toContain("Tell a maintainer (docs/HANDOVER.md §4 says what to change).");
      expect(b.view()).not.toContain("may no longer be an admin");
      const a = b.panel()!.querySelector(".bl-access__view a")!;
      expect(a.getAttribute("href")).toBe(`https://github.com/${REPO}/settings/access`);
      expect(text(a)).toBe("Open the repository's collaborators on github.com (opens a new tab)");
      expect(b.view()).toContain(`GitHub's answer: ${ans.status}`);
      expect(b.document!.activeElement!.getAttribute("data-k")).toBe("refused");
      // Not back to Give permission: no second popup, and the token is still there.
      expect(b.view()).not.toContain("Give permission");
      expect(b.popups).toHaveLength(1);
      expect(b.access.hasPermission()).toBe(true);
      // Try again reads the lists again with the same permission.
      delete b.f.answers[list];
      b.button("Try again").click();
      await b.settle();
      expect(b.view()).toContain("Can edit (3)");
      expect(b.popups).toHaveLength(1);
    }
    // With read:org asked for already, the words do not blame it.
    const c = setup({ scopes: ["repo", "read:org"] });
    c.f.tokens[EXTRA] = { login: "bobalabx", scopes: "repo, read:org" };
    c.f.answers[list] = json({ message: "Forbidden" }, 403);
    await c.openPanel();
    await c.grant();
    expect(c.view()).toContain(
      "but GitHub still refused to list the editors. Nothing was changed.",
    );
    expect(c.view()).not.toContain("doesn't ask for yet");
  });

  it("GitHub refuses the list because the account is no longer an admin: the plain not-admin view", async () => {
    const b = setup();
    b.f.answers[`GET /repos/${REPO}/collaborators?affiliation=all&per_page=100&page=1`] = json(
      { message: "Must have push access to view repository collaborators." },
      403,
    );
    await b.openPanel();
    b.f.admin = false;
    await b.grant();
    expect(b.status()).toBe("GitHub says your account can't manage editors any more.");
    expect(b.view()).toContain("Only the owner can change who can edit");
    expect(b.access.hasPermission()).toBe(false);
  });

  it("a secondary rate limit (403 without Retry-After) is 'busy', and the permission stays", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    b.f.answers[`GET /repos/${REPO}/invitations?per_page=100&page=1`] = json(
      {
        message:
          "You have exceeded a secondary rate limit. Please wait a few minutes before you try again.",
      },
      403,
      { "x-ratelimit-remaining": "4990" },
    );
    b.button("Refresh").click();
    await b.settle();
    expect(b.status()).toMatch(/^GitHub is busy; try again at \d{1,2}:\d\d (am|pm)\.$/);
    expect(b.view()).toContain("The lists couldn't be loaded.");
    expect(b.access.hasPermission()).toBe(true);
    // The same while removing: busy, nothing changed, the permission kept.
    delete b.f.answers[`GET /repos/${REPO}/invitations?per_page=100&page=1`];
    b.button("Try again").click();
    await b.settle();
    b.f.answers[`DELETE /repos/${REPO}/collaborators/icho`] = json(
      { message: "You have exceeded a secondary rate limit." },
      403,
    );
    buttonNamed(b.panel()!.querySelector('[data-login="icho"]'), "Remove")!.click();
    await b.settle();
    await confirmWith(b, "Remove Isabelle Cho");
    expect(b.status()).toMatch(/^GitHub is busy; try again at .+\. Nothing was changed\.$/);
    expect(b.access.hasPermission()).toBe(true);
  });
});

describe("cms-access.js: invite someone", () => {
  async function ready(o: SetupOpts = {}) {
    const b = setup(o);
    await b.openPanel();
    await b.grant();
    return b;
  }

  it("look up → the account's avatar and name → Send invitation → the plain result, and the list updates", async () => {
    const b = await ready();
    b.input().value = "@nike-n";
    b.input().dispatchEvent(new FakeEvent("keydown", { key: "Enter" })); // Enter works like Look up
    await b.settle();
    expect(b.status()).toBe(
      "Found Nike Naiyarat (@nike-n). Check it is the right person, then send the invitation.",
    );
    const card = b.panel()!.querySelector(".bl-access__card")!;
    expect(visibleText(card)).toBe(
      "Nike Naiyarat @nike-n See their GitHub profile (opens a new tab)",
    );
    expect(card.querySelector("img")!.getAttribute("src")).toBe(`${AV(9000005)}&s=64`);
    expect(card.querySelector("a")!.getAttribute("href")).toBe("https://github.com/nike-n");
    expect(b.writes()).toHaveLength(0); // looking up changes nothing
    const send = b.button("Send invitation");
    expect(send.getAttribute("aria-label")).toBe("Send invitation to Nike Naiyarat (@nike-n)");
    send.click();
    await b.settle();
    expect(b.paths(b.writes())).toEqual([`PUT /repos/${REPO}/collaborators/nike-n`]);
    expect(b.writes()[0]!.init.body).toBeUndefined(); // a personal repository takes no permission
    expect(b.status()).toBe(
      "Invitation sent. Nike Naiyarat must accept the email from GitHub before they can sign in.",
    );
    expect(b.view()).toContain("Invited, not accepted yet (2)");
    expect(b.input().value).toBe("");
    expect(b.panel()!.querySelector(".bl-access__card")).toBeNull();
  });

  it("in an organization the invitation asks for write access (permission push)", async () => {
    const b = await ready({
      user: GITHUB_USER,
      fake: {
        ownerType: "Organization",
        tokens: { [EXTRA]: { login: "ada-editor", scopes: "repo" } },
        collaborators: [{ login: "ada-editor", admin: true }],
        invitations: [],
      },
    });
    await lookUp(b, "nike-n");
    b.button("Send invitation").click();
    await b.settle();
    expect(b.writes()[0]!.init.body).toBe(JSON.stringify({ permission: "push" }));
    expect(b.writes()[0]!.headers["Content-Type"]).toBe("application/json");
  });

  it("explains names that cannot be invited, before asking GitHub to change anything", async () => {
    const b = await ready();
    const cases: Array<[string, string]> = [
      ["", "Type their GitHub username first."],
      ["nike@berkeley.edu", "That looks like an email address."],
      ["no such", "“no such” isn't a GitHub username."],
      [
        "nobody-here",
        "There is no GitHub account called “nobody-here”. Check the spelling with them.",
      ],
      ["berkeley-lab", "“berkeley-lab” is an organization. Invite a person's own GitHub account."],
      ["ICHO", "Isabelle Cho (@icho) can already edit."],
      ["bobalabx", "@bobalabx is the owner account; it can always edit."],
      [
        "new-ra",
        "@new-ra already has an invitation waiting. They must accept the email from GitHub.",
      ],
    ];
    for (const [name, words] of cases) {
      await lookUp(b, name);
      expect(b.status(), name).toContain(words);
      expect(b.panel()!.querySelector(".bl-access__card"), name).toBeNull();
    }
    expect(b.writes()).toHaveLength(0);
  });

  it("GitHub's answers in plain words: already an editor (204), the daily limit, other 422s, 404, 403, offline", async () => {
    const put = `PUT /repos/${REPO}/collaborators/nike-n`;
    const cases: Array<[Answer | "network", string | RegExp]> = [
      [{ status: 204 }, "Nike Naiyarat can edit now; GitHub didn't need to send an invitation."],
      [
        json(
          {
            message: "Validation Failed",
            errors: [
              {
                message:
                  "You have exceeded the maximum number of invitations for this repository (50 per 24 hours).",
              },
            ],
          },
          422,
        ),
        "GitHub allows at most 50 invitations a day for this repository. Nothing was sent; try again tomorrow.",
      ],
      [
        // GitHub documents only "422 Validation failed, or the endpoint has been spammed".
        json({ message: "Validation Failed: the endpoint has been spammed." }, 422),
        "GitHub allows at most 50 invitations a day for this repository. Nothing was sent; try again tomorrow.",
      ],
      [
        json({ message: "You have exceeded a secondary rate limit." }, 403),
        /^GitHub is busy; try again at \d{1,2}:\d\d (am|pm)\. Nothing was changed\.$/,
      ],
      [
        json({ message: "Validation Failed", errors: [{ message: "User is blocked" }] }, 422),
        "GitHub couldn't invite Nike Naiyarat (@nike-n): “Validation Failed: User is blocked”. Nothing was sent.",
      ],
      [
        json({ message: "Not Found" }, 404),
        "GitHub couldn't find @nike-n (or the repository) any more. Nothing was sent; check the username and try again.",
      ],
      [
        json({ message: "Must have admin rights to Repository." }, 403),
        "GitHub refused: your account can't manage editors (any more). Nothing was changed.",
      ],
      ["network", "Couldn't reach GitHub. Nothing was changed; try again."],
      [
        json({ message: "Server Error" }, 502),
        "GitHub answered with an error. Nothing was sent; try again in a minute.",
      ],
    ];
    for (const [ans, words] of cases) {
      const b = await ready();
      b.f.answers[put] = ans;
      await lookUp(b, "nike-n");
      b.button("Send invitation").click();
      await b.settle();
      if (typeof words === "string") expect(b.status()).toBe(words);
      else expect(b.status()).toMatch(words);
    }
  });

  it("a 401 while inviting: the permission was withdrawn; back to Give permission", async () => {
    const b = await ready();
    b.f.answers[`PUT /repos/${REPO}/collaborators/nike-n`] = json(
      { message: "Bad credentials" },
      401,
    );
    await lookUp(b, "nike-n");
    b.button("Send invitation").click();
    await b.settle();
    expect(b.status()).toBe(
      "The extra permission has expired or was withdrawn on GitHub. Give it again, then send the invitation again.",
    );
    expect(b.view()).toContain("Give permission");
    expect(b.session.getItem(KEY)).toBeNull();
  });

  it("Not this person clears the card; typing again clears it too", async () => {
    const b = await ready();
    await lookUp(b, "nike-n");
    b.button("Not this person").click();
    await b.settle();
    expect(b.panel()!.querySelector(".bl-access__card")).toBeNull();
    await lookUp(b, "nike-n");
    b.input().value = "nike-x";
    b.input().dispatchEvent(new FakeEvent("input"));
    await b.settle();
    expect(b.panel()!.querySelector(".bl-access__card")).toBeNull();
  });
});

describe("cms-access.js: cancel an invitation, remove an editor", () => {
  async function ready(o: SetupOpts = {}) {
    const b = setup(o);
    await b.openPanel();
    await b.grant();
    return b;
  }

  it("Cancel invitation asks first; Keep it changes nothing; Cancel invitation deletes it", async () => {
    const b = await ready();
    const btn = b.button("Cancel invitation");
    btn.focus();
    btn.click();
    await b.settle();
    const dlg = b.confirmDialog()!;
    expect(text(dlg.querySelector(".bl-dialog__title"))).toBe("Cancel the invitation for new-ra?");
    expect(visibleText(dlg.querySelector(".bl-dialog__body"))).toBe(
      "The link in their invitation email stops working. You can invite them again later.",
    );
    expect(text(b.document!.activeElement)).toBe("Keep it");
    await confirmWith(b, "Keep it");
    expect(b.writes()).toHaveLength(0);
    b.button("Cancel invitation").click();
    await b.settle();
    await confirmWith(b, "Cancel invitation");
    expect(b.paths(b.writes())).toEqual([`DELETE /repos/${REPO}/invitations/501`]);
    expect(b.status()).toBe("Invitation for @new-ra cancelled.");
    expect(b.view()).toContain("Invited, not accepted yet (0)");
  });

  it("an invitation that is already gone (404) is not an error", async () => {
    const b = await ready();
    b.f.invitations = []; // accepted meanwhile
    b.button("Cancel invitation").click();
    await b.settle();
    await confirmWith(b, "Cancel invitation");
    expect(b.status()).toBe("That invitation is gone already (accepted, declined or cancelled).");
    expect(b.view()).toContain("Invited, not accepted yet (0)");
  });

  it("Remove asks with the exact words; Cancel changes nothing; Remove takes the person off", async () => {
    const b = await ready();
    const remove = () => buttonNamed(b.panel()!.querySelector('[data-login="jazzb"]'), "Remove")!;
    remove().click();
    await b.settle();
    const dlg = b.confirmDialog()!;
    expect(text(dlg.querySelector(".bl-dialog__title"))).toBe("Remove Jazz Beecham?");
    expect(visibleText(dlg.querySelector(".bl-dialog__body"))).toBe(
      "Jazz Beecham will no longer be able to sign in to the dashboard or save. Their past changes stay in History. To give them access again later, invite them again.",
    );
    expect(dlg.classList.contains("bl-dialog--danger")).toBe(true);
    await confirmWith(b, "Cancel");
    expect(b.writes()).toHaveLength(0);
    remove().click();
    await b.settle();
    await confirmWith(b, "Remove Jazz Beecham");
    expect(b.paths(b.writes())).toEqual([`DELETE /repos/${REPO}/collaborators/jazzb`]);
    expect(b.status()).toBe("Jazz Beecham can no longer edit. Their past changes stay in History.");
    expect(b.view()).toContain("Can edit (2)");
    expect(b.panel()!.querySelector('[data-login="jazzb"]')).toBeNull();
  });

  it("removing yourself (an organization admin) carries an extra warning, then drops the permission", async () => {
    const b = await ready({
      user: GITHUB_USER,
      fake: {
        ownerType: "Organization",
        tokens: { [EXTRA]: { login: "ada-editor", scopes: "repo" } },
        collaborators: [{ login: "ada-editor", admin: true }, { login: "ben-editor" }],
        invitations: [],
      },
    });
    b.f.onRemove = (login) => {
      if (login === "ada-editor") b.f.admin = false;
    };
    buttonNamed(b.panel()!.querySelector('[data-login="ada-editor"]'), "Remove")!.click();
    await b.settle();
    const dlg = b.confirmDialog()!;
    expect(text(dlg.querySelector(".bl-dialog__title"))).toBe("Remove your own access?");
    expect(visibleText(dlg.querySelector(".bl-dialog__body"))).toBe(
      "You will no longer be able to sign in to the dashboard or save. Your past changes stay in History. This happens at once, and you can't undo it yourself: only another admin of the bobalabx organization can invite you again.",
    );
    await confirmWith(b, "Remove my access");
    expect(b.paths(b.writes())).toEqual([`DELETE /repos/${REPO}/collaborators/ada-editor`]);
    expect(b.status()).toBe("You removed your own access.");
    expect(b.access.hasPermission()).toBe(false);
    // One short view that says what that means; nothing that says "you can save".
    expect(b.view()).toBe(
      "You no longer have edit access You can't save changes to the website any more. Your past changes stay in History. Log out (account menu, top right) when you are done. To get access again, ask another admin of the bobalabx organization to invite you.",
    );
    expect(b.view()).not.toContain("You can edit and save");
    expect(text(b.document!.activeElement)).toBe("You no longer have edit access");
  });

  it("remove errors: refused (403), already removed (404), withdrawn permission (401)", async () => {
    const del = `DELETE /repos/${REPO}/collaborators/icho`;
    const b = await ready();
    b.f.answers[del] = json({ message: "Must have admin rights" }, 403);
    buttonNamed(b.panel()!.querySelector('[data-login="icho"]'), "Remove")!.click();
    await b.settle();
    await confirmWith(b, "Remove Isabelle Cho");
    expect(b.status()).toBe(
      "GitHub refused: your account can't manage editors (any more). Nothing was changed.",
    );
    b.f.answers[del] = json({ message: "Not Found" }, 404);
    buttonNamed(b.panel()!.querySelector('[data-login="icho"]'), "Remove")!.click();
    await b.settle();
    await confirmWith(b, "Remove Isabelle Cho");
    expect(b.status()).toBe("Isabelle Cho (@icho) can't edit any more (already removed).");
    b.f.answers[del] = json({ message: "Bad credentials" }, 401);
    buttonNamed(b.panel()!.querySelector('[data-login="icho"]'), "Remove")!.click();
    await b.settle();
    await confirmWith(b, "Remove Isabelle Cho");
    expect(b.status()).toBe(
      "The extra permission has expired or was withdrawn on GitHub. Give it again, then remove them again.",
    );
  });

  it("clicks while a request runs are ignored (no double invitations)", async () => {
    const b = await ready();
    let release: () => void = () => {};

    await lookUp(b, "nike-n");
    // Hold GitHub's answer until released.
    const gate = new Promise<void>((r) => (release = r));
    const h = handler(b.f);
    (b.win as { fetch: unknown }).fetch = async (
      url: string,
      init: Record<string, unknown> = {},
    ) => {
      const headers = { ...((init.headers as Record<string, string>) ?? {}) };
      const call: Call = { url, method: String(init.method ?? "GET"), headers, init };
      b.calls.push(call);
      if (call.method === "PUT") await gate;
      const a = h(new URL(url), call);
      const status = a.status ?? 200;
      return {
        status,
        ok: status < 300,
        headers: { get: () => null },
        json: async () => a.body,
      };
    };
    const send = b.button("Send invitation");
    send.click();
    send.click();
    send.click();
    await b.settle();
    expect(send.getAttribute("aria-disabled")).toBe("true");
    release();
    await b.settle();
    expect(b.writes()).toHaveLength(1);
  });
});

describe("cms-access.js: a change happened, but the lists did not reload", () => {
  const collaborators = `GET /repos/${REPO}/collaborators?affiliation=all&per_page=100&page=1`;

  async function ready() {
    const b = setup();
    await b.openPanel();
    await b.grant();
    return b;
  }

  /** The next list request fails once (offline), after the change itself succeeded. */
  function failNextList(b: B) {
    const h = handler(b.f);
    let failed = false;
    (b.win as { fetch: unknown }).fetch = async (
      url: string,
      init: Record<string, unknown> = {},
    ) => {
      const headers = { ...((init.headers as Record<string, string>) ?? {}) };
      const call: Call = { url, method: String(init.method ?? "GET"), headers, init };
      b.calls.push(call);
      const u = new URL(url);
      if (!failed && call.method === "GET" && `GET ${u.pathname}${u.search}` === collaborators) {
        failed = true;
        throw new TypeError("Failed to fetch");
      }
      const a = h(u, call);
      const st = a.status ?? 200;
      const hs = Object.fromEntries(
        Object.entries(a.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
      );
      return {
        status: st,
        ok: st < 300,
        headers: { get: (k: string) => hs[k.toLowerCase()] ?? null },
        json: async () => a.body,
      };
    };
  }

  const reloadFailed =
    " The lists couldn't be loaded: couldn't reach GitHub. Check your connection and try again.";

  it("invite: the success words stay, and the failed reload is added to them", async () => {
    const b = await ready();
    await lookUp(b, "nike-n");
    failNextList(b);
    b.button("Send invitation").click();
    await b.settle();
    expect(b.status()).toBe(
      "Invitation sent. Nike Naiyarat must accept the email from GitHub before they can sign in." +
        reloadFailed,
    );
    expect(b.view()).toContain("The lists couldn't be loaded.");
    expect(b.f.invitations.map((i) => i.login)).toContain("nike-n");
  });

  it("cancel: the success words stay", async () => {
    const b = await ready();
    failNextList(b);
    b.button("Cancel invitation").click();
    await b.settle();
    await confirmWith(b, "Cancel invitation");
    expect(b.status()).toBe("Invitation for @new-ra cancelled." + reloadFailed);
  });

  it("remove: the success words stay; Try again then shows the lists (and a fresh status)", async () => {
    const b = await ready();
    failNextList(b);
    buttonNamed(b.panel()!.querySelector('[data-login="icho"]'), "Remove")!.click();
    await b.settle();
    await confirmWith(b, "Remove Isabelle Cho");
    expect(b.status()).toBe(
      "Isabelle Cho can no longer edit. Their past changes stay in History." + reloadFailed,
    );
    b.button("Try again").click();
    await b.settle();
    expect(b.view()).toContain("Can edit (2)");
    expect(b.status()).toBe("");
  });
});

describe("cms-access.js: closing the panel while a change is sent", () => {
  /** Hold GitHub's answer to the PUT until release() is called. */
  function holdPut(b: B) {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const h = handler(b.f);
    (b.win as { fetch: unknown }).fetch = async (
      url: string,
      init: Record<string, unknown> = {},
    ) => {
      const headers = { ...((init.headers as Record<string, string>) ?? {}) };
      const call: Call = { url, method: String(init.method ?? "GET"), headers, init };
      b.calls.push(call);
      if (call.method === "PUT") await gate;
      const a = h(new URL(url), call);
      const st = a.status ?? 200;
      return { status: st, ok: st < 300, headers: { get: () => null }, json: async () => a.body };
    };
    return () => release();
  }

  it("opened again at once: it waits for the answer, then shows it with the updated lists", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    await lookUp(b, "nike-n");
    const release = holdPut(b);
    b.button("Send invitation").click();
    await b.settle();
    b.button("Close", b.panel()).click();
    await b.settle();
    await b.openPanel();
    expect(b.status()).toBe("Sending the invitation to Nike Naiyarat (@nike-n)…");
    expect(b.view()).toBe(
      "A change is still being sent to GitHub. Its result shows here in a moment.",
    );
    // Nothing can be sent twice meanwhile.
    expect(b.access._state().busy).toBe(true);
    release();
    await b.settle();
    expect(b.status()).toBe(
      "Invitation sent. Nike Naiyarat must accept the email from GitHub before they can sign in.",
    );
    expect(b.view()).toContain("Invited, not accepted yet (2)");
    expect(b.writes()).toHaveLength(1);
  });

  it("opened again later: the answer that came while it was closed is shown first", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    await lookUp(b, "nike-n");
    const release = holdPut(b);
    b.button("Send invitation").click();
    await b.settle();
    b.button("Close", b.panel()).click();
    await b.settle();
    release();
    await b.settle();
    expect(b.panel()).toBeNull();
    await b.openPanel();
    expect(b.status()).toBe(
      "Invitation sent. Nike Naiyarat must accept the email from GitHub before they can sign in.",
    );
    expect(b.view()).toContain("Invited, not accepted yet (2)");
    // Shown once: the next opening starts with an empty status line.
    b.button("Close", b.panel()).click();
    await b.settle();
    await b.openPanel();
    expect(b.status()).toBe("");
  });

  it("a failure while closed is shown too", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    await lookUp(b, "nike-n");
    b.f.answers[`PUT /repos/${REPO}/collaborators/nike-n`] = "network";
    const release = holdPut(b);
    b.button("Send invitation").click();
    await b.settle();
    b.button("Close", b.panel()).click();
    await b.settle();
    release();
    await b.settle();
    await b.openPanel();
    expect(b.status()).toBe("Couldn't reach GitHub. Nothing was changed; try again.");
    expect(b.view()).toContain("Invited, not accepted yet (1)");
  });
});

describe("cms-access.js: small words", () => {
  it("only “@” (or an empty profile address) asks for the username first", async () => {
    const b = setup();
    for (const s of ["@", " @ ", "https://github.com/", "@ "])
      expect(b.access.parseUsername(s), JSON.stringify(s)).toEqual({
        problem: "Type their GitHub username first.",
      });
  });

  it("while the view itself says Loading, the status line stays empty (said once)", async () => {
    const b = setup();
    const invitations = `GET /repos/${REPO}/invitations?per_page=100&page=1`;
    b.f.answers[invitations] = "network";
    await b.openPanel();
    await b.grant();
    expect(b.view()).toContain("The lists couldn't be loaded.");
    delete b.f.answers[invitations];
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const h = handler(b.f);
    (b.win as { fetch: unknown }).fetch = async (
      url: string,
      init: Record<string, unknown> = {},
    ) => {
      const headers = { ...((init.headers as Record<string, string>) ?? {}) };
      const call: Call = { url, method: String(init.method ?? "GET"), headers, init };
      b.calls.push(call);
      if (url.includes("/invitations")) await gate;
      const a = h(new URL(url), call);
      const st = a.status ?? 200;
      return { status: st, ok: st < 300, headers: { get: () => null }, json: async () => a.body };
    };
    b.button("Try again").click();
    await b.settle();
    expect(b.view()).toBe("Loading who can edit…");
    expect(b.status()).toBe("");
    release();
    await b.settle();
    expect(b.view()).toContain("Can edit (3)");
    // With the lists on screen, a refresh says it in the status line instead (the lists stay).
    b.button("Refresh").click();
    expect(b.status()).toBe("Loading who can edit…");
    expect(b.view()).toContain("Can edit (3)");
    await b.settle();
  });
});

describe("cms-access.js: a closed panel", () => {
  it("an answer that arrives after the panel was closed and opened again is dropped", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const h = handler(b.f);
    (b.win as { fetch: unknown }).fetch = async (
      url: string,
      init: Record<string, unknown> = {},
    ) => {
      const headers = { ...((init.headers as Record<string, string>) ?? {}) };
      const call: Call = { url, method: String(init.method ?? "GET"), headers, init };
      b.calls.push(call);
      if (call.url.endsWith("/users/nike-n")) await gate;
      const a = h(new URL(url), call);
      const st = a.status ?? 200;
      return { status: st, ok: st < 300, headers: { get: () => null }, json: async () => a.body };
    };
    b.input().value = "nike-n";
    b.button("Look up").click();
    await b.settle();
    b.button("Close", b.panel()).click();
    await b.settle();
    await b.openPanel();
    expect(b.view()).toContain("Can edit (3)");
    release();
    await b.settle();
    // The old look-up neither shows its card nor its message in the new panel.
    expect(b.panel()!.querySelector(".bl-access__card")).toBeNull();
    expect(b.status()).not.toContain("Found Nike Naiyarat");
    expect(b.access._state().busy).toBe(false);
  });
});

describe("cms-access.js: keyboard and focus", () => {
  it("the panel opens with Close focused and gives the focus back to the opener; focus follows the steps", async () => {
    const b = setup();
    const opener = b.document!.createElement("button");
    b.document!.body.appendChild(opener);
    opener.focus();
    b.access.open(opener);
    await b.settle();
    expect(text(b.document!.activeElement)).toBe("Close");
    // Give permission by keyboard: focus moves to Cancel while waiting, then to the list heading.
    const give = b.button("Give permission");
    give.focus();
    give.click();
    await b.settle();
    expect(b.document!.activeElement!.getAttribute("data-k")).toBe("grant-cancel");
    await b.handshake();
    await b.answer({ provider: "github", token: EXTRA });
    expect(text(b.document!.activeElement)).toBe("Can edit (3)");
    // Look up keeps the focus in the field on a problem, then moves it to Send invitation.
    b.input().focus();
    b.input().value = "two words";
    b.input().dispatchEvent(new FakeEvent("keydown", { key: "Enter" }));
    await b.settle();
    expect(b.document!.activeElement).toBe(b.input());
    b.input().value = "nike-n";
    b.input().dispatchEvent(new FakeEvent("keydown", { key: "Enter" }));
    await b.settle();
    expect(b.document!.activeElement!.getAttribute("data-k")).toBe("send");
    b.document!.activeElement!.click();
    await b.settle();
    expect(b.document!.activeElement).toBe(b.input()); // ready for the next one
    // After a removal the focus goes to the list's heading, not the page behind.
    const remove = buttonNamed(b.panel()!.querySelector('[data-login="icho"]'), "Remove")!;
    remove.focus();
    remove.click();
    await b.settle();
    expect(text(b.document!.activeElement)).toBe("Cancel"); // the confirm dialog: Cancel first
    await confirmWith(b, "Remove Isabelle Cho");
    expect(text(b.document!.activeElement)).toBe("Can edit (2)");
    // Close gives the focus back to the opener.
    b.button("Close", b.panel()).click();
    await b.settle();
    expect(b.document!.activeElement).toBe(opener);
  });

  it("Escape closes the panel like Close", async () => {
    const b = setup();
    await b.openPanel();
    const dlg = b.panel()!;
    dlg.dispatchEvent(new FakeEvent("cancel"));
    await b.settle();
    expect(b.panel()).toBeNull();
  });

  it("the status line is a polite live region; the same words twice are announced again", async () => {
    const b = setup();
    await b.openPanel();
    await b.grant();
    const s = b.panel()!.querySelector(".bl-access__status")!;
    expect(s.getAttribute("role")).toBe("status");
    expect(s.getAttribute("aria-live")).toBe("polite");
    await lookUp(b, "two words");
    b.button("Look up").click();
    expect(b.status()).toBe(""); // cleared for a moment …
    await b.clock.advance(100);
    expect(b.status()).toContain("isn't a GitHub username"); // … then said again
  });
});

describe("cms-access.js: the dock's Who can edit button", () => {
  it("sits next to Recent changes for everyone signed in, and opens the panel", async () => {
    const b = setup({ dock: true, user: GITHUB_USER, fake: { admin: false } });
    await b.settle();
    const dock = b.document!.querySelector("#bl-dock")!;
    const names = dock
      .querySelectorAll("button")
      .filter((x) => !x.hidden)
      .map((x) => text(x));
    expect(names.slice(-2)).toEqual(["Recent changes", "Who can edit"]);
    const who = buttonNamed(dock, "Who can edit")!;
    who.focus();
    who.click();
    await b.settle();
    expect(b.view()).toContain("Only the owner can change who can edit");
    b.button("Close", b.panel()).click();
    await b.settle();
    expect(b.document!.activeElement).toBe(who);
  });

  it("is also at the top of Recent changes (phones show it there instead), which it closes", async () => {
    const b = setup({ dock: true, user: GITHUB_USER, fake: { admin: false } });
    await b.settle();
    const dock = b.document!.querySelector("#bl-dock")!;
    // cms-ui.css hides the dock's own button below 800 px and shows the sheet's one there.
    expect(buttonNamed(dock, "Who can edit")!.classList.contains("bl-dock__access")).toBe(true);
    const recent = buttonNamed(dock, "Recent changes")!;
    // Clicked without taking the focus first, as Safari does with a mouse click.
    (b.document!.activeElement as { blur?: () => void } | null)?.blur?.();
    expect(b.document!.activeElement).not.toBe(recent);
    recent.click();
    await b.settle();
    const sheet = b.document!.querySelector("dialog.bl-sheet")!;
    expect(text(sheet.querySelector(".bl-dialog__title"))).toBe("Recent changes");
    const row = sheet.querySelector(".bl-sheet__content")!.children[0]!;
    expect(row.classList.contains("bl-sheet__access")).toBe(true);
    buttonNamed(row, "Who can edit")!.click();
    await b.settle();
    // One dialog at a time: the sheet closed, the panel opened.
    expect(
      b.document!.querySelectorAll("dialog.bl-dialog").map((d) => text(d.querySelector("h2"))),
    ).toEqual(["Who can edit"]);
    expect(b.view()).toContain("Only the owner can change who can edit");
    // Close: the focus goes back to Recent changes in the dock.
    b.button("Close", b.panel()).click();
    await b.settle();
    expect(b.document!.activeElement).toBe(recent);
  });

  it("is there in the local demo too", async () => {
    const b = setup({ dock: true, mode: "local", user: { backendName: "proxy" } });
    await b.settle();
    buttonNamed(b.document!.querySelector("#bl-dock"), "Who can edit")!.click();
    await b.settle();
    expect(b.view()).toContain("Editors are managed on the live dashboard");
    expect(b.calls).toHaveLength(0);
  });

  it("without cms-access.js the dock has only Recent changes (as before)", async () => {
    const b = boot({
      files: ["cms-ui.js", "cms-github.js", "cms-history.js", "cms-deploy.js", "cms-dock.js"],
    });
    await flush();
    const names = b
      .document!.querySelector("#bl-dock")!
      .querySelectorAll("button")
      .map((x) => text(x));
    expect(names).not.toContain("Who can edit");
    expect(names).toContain("Recent changes");
  });
});
