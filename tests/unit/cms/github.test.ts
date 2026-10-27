/**
 * public/admin/cms-github.js: the read-only GitHub client behind History,
 * Recent changes and the deploy status (editor v2, spec §4.1). It only makes
 * GET requests, sends the signed-in editor's token to api.github.com only,
 * makes no request at all before sign-in, and reuses answers through ETags.
 */
import { describe, expect, it } from "vitest";
import { GITHUB_USER, boot, fixture, flush, type Answer, type BootOptions } from "./github-helpers";

interface GitHubError extends Error {
  kind: string;
  status: number;
  resetAt?: number;
}
interface Api {
  mode(): string;
  repo(): string;
  branch(): string;
  user(): { login: string; name: string; token: string } | null;
  signedIn(): boolean;
  get(
    path: string,
    opts?: Record<string, unknown>,
  ): Promise<{ status: number; data: unknown; link: { next?: string }; notModified?: boolean }>;
  rate(): { remaining: number | null; resetAt: number | null };
  parseLink(h: string): Record<string, string>;
}

const commits = fixture("commits-main.json");

function setup(o: Partial<BootOptions> = {}) {
  const b = boot({ files: ["cms-ui.js", "cms-github.js"], ...o });
  return { ...b, gh: b.win.BobalabGitHub as Api };
}

async function rejection(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e as GitHubError;
  }
  throw new Error("expected a rejection");
}

describe("cms-github.js", () => {
  it("loads without a DOM and without cms-data.js, with the repository defaults", () => {
    const { gh, calls } = setup({ dom: false, cmsData: null });
    expect(gh.repo()).toBe("bobalabx/bobalab-web");
    expect(gh.branch()).toBe("main");
    expect(gh.mode()).toBe("github");
    expect(calls).toHaveLength(0);
  });

  it("tells the local demo by its config link (config.local.yml and e2e copies of it)", () => {
    expect(setup({ mode: "local" }).gh.mode()).toBe("local");
    const b = setup();
    expect(b.gh.mode()).toBe("github");
    b.document!.querySelector('link[rel="cms-config-url"]')!.setAttribute(
      "href",
      "config.local-scratch.yml",
    );
    expect(b.gh.mode()).toBe("local");
  });

  it("reads the signed-in user from Decap's localStorage entry, for the GitHub backend only", () => {
    expect(setup().gh.user()).toEqual({
      login: "ada-editor",
      name: "Ada Editor",
      token: GITHUB_USER.token,
      avatarUrl: GITHUB_USER.avatar_url,
    });
    expect(setup({ user: { ...GITHUB_USER, backendName: "proxy" } }).gh.user()).toBeNull();
    expect(setup({ user: null }).gh.user()).toBeNull();
    const broken = setup({ user: null });
    broken.local.setItem("decap-cms-user", "{not json");
    expect(broken.gh.user()).toBeNull();
    // The local demo counts as signed in once Decap has its (proxy) user.
    expect(setup({ mode: "local", user: { backendName: "proxy" } }).gh.signedIn()).toBe(true);
    expect(setup({ mode: "local", user: null }).gh.signedIn()).toBe(false);
  });

  it("sends GET with the API version, the token and no-cache to api.github.com", async () => {
    const { gh, calls } = setup({ fetch: () => ({ status: 200, body: [] }) });
    await gh.get("/repos/bobalabx/bobalab-web/commits?sha=main&per_page=1");
    expect(calls).toHaveLength(1);
    const c = calls[0]!;
    expect(c.url).toBe(
      "https://api.github.com/repos/bobalabx/bobalab-web/commits?sha=main&per_page=1",
    );
    expect(c.method).toBe("GET");
    expect(c.init.cache).toBe("no-cache");
    expect(c.headers).toMatchObject({
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: "token " + GITHUB_USER.token,
    });
    await gh.get("/repos/bobalabx/bobalab-web/contents/x.md?ref=main", { accept: "raw" });
    expect(calls[1]!.headers.Accept).toBe("application/vnd.github.raw+json");
  });

  it("refuses POST, PUT, PATCH and DELETE (and a body) without making a request", () => {
    const { gh, calls } = setup({ fetch: () => ({ status: 200, body: {} }) });
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "post"]) {
      expect(() => gh.get("/repos/bobalabx/bobalab-web/contents/x.md", { method })).toThrow(
        /read-only/,
      );
    }
    expect(() => gh.get("/repos/x/y/git/refs", { body: "{}" })).toThrow(/read-only/);
    expect(calls).toHaveLength(0);
  });

  it("talks to api.github.com only, so the token never goes anywhere else", () => {
    const { gh, calls } = setup({ fetch: () => ({ status: 200, body: {} }) });
    expect(() => gh.get("https://example.org/repos/x")).toThrow(/only talks to/);
    expect(() => gh.get("https://api.github.com.evil.example/repos/x")).toThrow(/only talks to/);
    expect(() => gh.get("repos/x")).toThrow(/start with/);
    expect(calls).toHaveLength(0);
  });

  it("makes no request before sign-in on the live site (kind auth)", async () => {
    const { gh, calls } = setup({ user: null, fetch: () => ({ status: 200, body: [] }) });
    const e = await rejection(gh.get("/repos/bobalabx/bobalab-web/commits"));
    expect(e).toMatchObject({ name: "GitHubError", kind: "auth" });
    expect(calls).toHaveLength(0);
  });

  it("reads GitHub anonymously in the local demo (History comes from GitHub there)", async () => {
    const { gh, calls } = setup({
      mode: "local",
      user: { backendName: "proxy" },
      fetch: () => ({ body: [] }),
    });
    await gh.get("/repos/bobalabx/bobalab-web/commits");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.headers.Authorization).toBeUndefined();
  });

  it("sends If-None-Match from the remembered ETag and returns the remembered data on 304", async () => {
    let n = 0;
    const { gh, calls } = setup({
      fetch: (_u, call) => {
        n++;
        if (call.headers["If-None-Match"] === commits.headers.etag)
          return { status: 304, headers: {} };
        return { status: 200, headers: commits.headers, body: commits.body };
      },
    });
    const first = await gh.get("/repos/bobalabx/bobalab-web/commits?sha=main");
    expect(calls[0]!.headers["If-None-Match"]).toBeUndefined();
    const second = await gh.get("/repos/bobalabx/bobalab-web/commits?sha=main");
    expect(n).toBe(2);
    expect(calls[1]!.headers["If-None-Match"]).toBe(commits.headers.etag);
    expect(second.notModified).toBe(true);
    expect(second.status).toBe(200);
    expect(second.data).toEqual(first.data);
    expect((second.data as unknown[]).length).toBe(12);
  });

  it("asks for the same address once while a request is under way", async () => {
    let release: (a: Answer) => void = () => {};
    const { gh, calls } = setup({ fetch: () => new Promise<Answer>((r) => (release = r)) });
    const a = gh.get("/repos/x/y/commits");
    const b = gh.get("/repos/x/y/commits");
    await flush();
    expect(calls).toHaveLength(1);
    release({ status: 200, body: [1] });
    expect((await a).data).toEqual([1]);
    expect((await b).data).toEqual([1]);
  });

  it("parses Link headers (rel=next) like GitHub's", async () => {
    const { gh } = setup({ fetch: () => ({ status: 200, headers: commits.headers, body: [] }) });
    const r = await gh.get("/repos/bobalabx/bobalab-web/commits?sha=main&per_page=12");
    expect(r.link.next).toBe(
      "https://api.github.com/repositories/1427902156/commits?sha=main&per_page=12&page=2",
    );
    expect(gh.parseLink(commits.headers.link!)).toMatchObject({
      last: expect.stringContaining("page=6"),
    });
    expect(gh.parseLink("")).toEqual({});
  });

  it("follows a Link address on api.github.com", async () => {
    const { gh, calls } = setup({ fetch: () => ({ status: 200, body: [] }) });
    await gh.get("https://api.github.com/repositories/1427902156/commits?sha=main&page=2");
    expect(calls[0]!.url).toBe(
      "https://api.github.com/repositories/1427902156/commits?sha=main&page=2",
    );
  });

  it("keeps the rate-limit state from the headers", async () => {
    const { gh } = setup({ fetch: () => ({ status: 200, headers: commits.headers, body: [] }) });
    expect(gh.rate()).toEqual({ remaining: null, resetAt: null });
    await gh.get("/repos/x/y/commits");
    expect(gh.rate()).toEqual({ remaining: 44, resetAt: 1793001569000 });
  });

  it("turns failures into the five plain-English error kinds", async () => {
    const answers: Record<string, Answer | "throw"> = {
      "/a": { status: 401, body: { message: "Bad credentials" } },
      "/b": fixture("rate-limited.json") as Answer,
      "/c": { status: 404, body: { message: "Not Found" } },
      "/d": "throw",
      "/e": { status: 502, body: "Bad gateway" },
      "/f": { status: 403, body: { message: "Resource not accessible by integration" } },
      "/g": { status: 429, headers: { "retry-after": "30" }, body: {} },
    };
    // The recorded limit resets at 07:59:29 UTC: the clock stands just before it.
    const b = setup({
      now: "2026-10-26T07:45:00Z",
      fetch: (u) => {
        const a = answers[u.pathname]!;
        if (a === "throw") throw new TypeError("Failed to fetch");
        return a;
      },
    });
    const kinds: Record<string, GitHubError> = {};
    for (const p of ["/a", "/c", "/d", "/e", "/f"]) kinds[p] = await rejection(b.gh.get(p));
    expect(kinds["/a"]).toMatchObject({
      kind: "auth",
      status: 401,
      message: expect.stringMatching(/Sign in again/),
    });
    expect(kinds["/c"]).toMatchObject({ kind: "not-found", status: 404 });
    expect(kinds["/d"]).toMatchObject({ kind: "network", message: "Couldn't reach GitHub." });
    expect(kinds["/e"]).toMatchObject({ kind: "http", status: 502 });
    expect(kinds["/f"]).toMatchObject({ kind: "http", status: 403 });
    for (const e of Object.values(kinds)) expect(e.name).toBe("GitHubError");

    const rate = await rejection(b.gh.get("/b"));
    expect(rate).toMatchObject({ kind: "rate", status: 403, resetAt: 1793001569000 });
    expect(rate.message).toMatch(
      /^GitHub is busy; History will be back at \d{1,2}:\d{2} (am|pm)\.$/,
    );
    // Until GitHub's reset time, nothing more is sent.
    const before = b.calls.length;
    expect(await rejection(b.gh.get("/a"))).toMatchObject({ kind: "rate" });
    expect(b.calls).toHaveLength(before);
  });

  it("treats a 429 with Retry-After as a rate limit", async () => {
    const b = setup({ fetch: () => ({ status: 429, headers: { "retry-after": "30" }, body: {} }) });
    const e = await rejection(b.gh.get("/g"));
    expect(e).toMatchObject({ kind: "rate", resetAt: b.clock.t + 30000 });
  });

  it("gives up after timeoutMs with a network error that says so", async () => {
    const b = setup({
      fetch: (_u, call) =>
        new Promise<Answer>((_r, reject) =>
          (call.init.signal as AbortSignal).addEventListener("abort", () =>
            reject(new Error("aborted")),
          ),
        ),
    });
    const p = rejection(b.gh.get("/slow", { timeoutMs: 5000 }));
    await b.clock.advance(5000);
    expect(await p).toMatchObject({
      kind: "network",
      timeout: true,
      message: "GitHub didn't answer in time.",
    });
  });
});
