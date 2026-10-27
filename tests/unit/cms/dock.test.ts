/**
 * public/admin/cms-dock.js: the status dock, the banner, the Undo toast and
 * Recent changes (editor v2, spec §3.4, §4.4, §4.5, §5). Runs the real
 * cms-ui/github/history/deploy scripts in a sandbox with a fake GitHub, a fake
 * CMS.editor, and fake BobalabLive/BobalabSave (WP4 and WP5 provide the real ones).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FIXTURES,
  FakeEvent,
  GITHUB_USER,
  T0,
  boot,
  buttonNamed,
  fixture,
  requested,
  text,
  type Answer,
  type BootOptions,
  type FakeElement,
  visibleText,
} from "./github-helpers";

const FILES = ["cms-ui.js", "cms-github.js", "cms-history.js", "cms-deploy.js", "cms-dock.js"];
const seq = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES, "sequences", name + ".json"), "utf8")) as {
    sha: string;
    polls: Array<{
      at: number;
      runs: Array<Record<string, unknown>>;
      jobs: Record<string, unknown[]>;
    }>;
  };

const SLUG = "2026-10-07-informs-talk";
const PATH = `content/news/${SLUG}.md`;
const SAVE_SHA = seq("success").sha;
const PARENT = "9".repeat(40);
const BASELINE = "8".repeat(40);
const SAVED = "Saved. The live site updates in about 2 minutes.";

function commit(
  o: { sha?: string; message?: string; at?: number; login?: string; parent?: string } = {},
) {
  const login = o.login ?? "ada-editor";
  return {
    sha: o.sha ?? SAVE_SHA,
    html_url: `https://github.com/bobalabx/bobalab-web/commit/${o.sha ?? SAVE_SHA}`,
    commit: {
      author: { name: "Ada Editor", date: new Date(T0 + (o.at ?? 2) * 1000).toISOString() },
      committer: { name: "GitHub", date: new Date(T0 + (o.at ?? 2) * 1000).toISOString() },
      message: o.message ?? `Edit News item “${SLUG}” (by @${login})`,
    },
    author: { login, avatar_url: "https://avatars.githubusercontent.com/u/1000001?v=4" },
    parents: [{ sha: o.parent ?? PARENT }],
  };
}

interface Opts extends Partial<BootOptions> {
  /** The commits list GitHub returns for the saved file, by seconds after T0. */
  mineAt?: (s: number) => unknown[];
  /** Deploy runs/jobs: a fixture sequence name, or fixed runs. */
  deploy?: string;
  runs?: Array<Record<string, unknown>>;
  jobs?: Record<string, unknown[]>;
  recent?: { content: unknown[]; uploads: unknown[]; more?: boolean } | "fail";
  livePath?: string | null;
  entry?: { path: string; hasChanged: boolean } | null;
}

function setup(o: Opts = {}) {
  const editorListeners: Array<(e: unknown) => void> = [];
  let entry = o.entry === undefined ? { path: PATH, hasChanged: false } : o.entry;
  const editor = {
    getCurrentEntry: () => entry,
    onEditorChange: (fn: (e: unknown) => void) => {
      editorListeners.push(fn);
      return () => editorListeners.splice(editorListeners.indexOf(fn), 1);
    },
  };
  const restores: unknown[] = [];
  const baselines: Array<[string, string]> = [];
  const extra = {
    CMS: { editor },
    BobalabLive: {
      current: () =>
        o.livePath === null
          ? null
          : { collection: "news", slug: SLUG, path: o.livePath ?? PATH, isNew: false },
      restoreVersion: async (a: unknown) => {
        restores.push(a);
        return { ok: true, notes: [], rejected: [] };
      },
    },
    BobalabSave: { setBaseline: (p: string, s: string) => baselines.push([p, s]) },
    ...(o.extra ?? {}),
  };
  const sequence = o.deploy ? seq(o.deploy) : null;
  let clockRef: () => number = () => T0;
  const handler = (u: URL): Answer => {
    const s = (clockRef() - T0) / 1000;
    const q = decodeURIComponent(u.pathname + u.search);
    if (/\/commits\?/.test(q) && q.includes("&per_page=5&"))
      return { status: 200, body: o.mineAt ? o.mineAt(s) : [] };
    if (/\/commits\?.*path=content&/.test(q)) {
      if (o.recent === "fail") throw new TypeError("Failed to fetch");
      return {
        status: 200,
        body: o.recent?.content ?? [],
        headers: o.recent?.more ? { link: '<https://api.github.com/x?page=2>; rel="next"' } : {},
      };
    }
    if (/\/commits\?.*path=public\/uploads&/.test(q)) {
      if (o.recent === "fail") throw new TypeError("Failed to fetch");
      return { status: 200, body: o.recent?.uploads ?? [] };
    }
    let poll = sequence ? sequence.polls[0]! : { runs: o.runs ?? [], jobs: o.jobs ?? {} };
    if (sequence) for (const p of sequence.polls) if (p.at <= s) poll = p;
    if (/\/runs\?/.test(q)) return { status: 200, body: { workflow_runs: poll.runs } };
    const m = /\/runs\/(\d+)\/jobs/.exec(q);
    if (m) return { status: 200, body: { jobs: poll.jobs[m[1]!] ?? [] } };
    return { status: 404, body: {} };
  };
  const b = boot({ files: FILES, fetch: handler, extra, ...o });
  clockRef = () => b.clock.t;
  const dock = b.win.BobalabDock as {
    saved(i: Record<string, unknown>): void;
    openRecentChanges(): void;
    _describe(m: Record<string, unknown>): {
      tone: string;
      text: string;
      notes: string[];
      action?: { kind: string; label: string };
    };
    _banner(s: unknown, now?: number): { text: string; entry: unknown } | null;
  };
  const $ = (sel: string) => b.document!.querySelector(sel);
  const toasts = () =>
    b.document!.querySelectorAll(".bl-toast").map((t) => text(t.querySelector(".bl-toast__text")));
  const undoToast = () =>
    b.document!.querySelectorAll(".bl-toast").find((t) => text(t).startsWith(SAVED)) ?? null;
  return {
    ...b,
    dock,
    editor: {
      emit: (e: unknown) => {
        entry = e as typeof entry;
        for (const fn of [...editorListeners]) fn(e);
      },
      listeners: editorListeners,
    },
    restores,
    baselines,
    $,
    dockText: () => visibleText($("#bl-dock .bl-dock__body")),
    toasts,
    undoToast,
  };
}

const saveInfo = (over: Record<string, unknown> = {}) => ({
  collection: "news",
  slug: SLUG,
  path: PATH,
  label: "News item",
  login: "ada-editor",
  startedAt: T0,
  baselineSha: BASELINE,
  view: { state: "live", path: `/news/${SLUG}/` },
  ...over,
});

// ---------------------------------------------------------------------------

describe("cms-dock.js: the words for each state", () => {
  const { dock } = setup();
  const rec = saveInfo();
  const d = (save: unknown, deploy: unknown, extra: Record<string, unknown> = {}) =>
    dock._describe({ mode: "github", save, deploy, phase: "tracking", site: null, ...extra });

  it("idle: from the live site's state", () => {
    expect(d(null, null).text).toBe("Checking the live site…");
    expect(d(null, null, { site: { ok: true, updating: false } }).text).toBe(
      "Live site up to date",
    );
    expect(d(null, null, { site: { ok: true, updating: true } }).text).toBe(
      "The live site is updating…",
    );
    expect(d(null, null, { site: { ok: false, failed: { event: "push" } } })).toMatchObject({
      tone: "fail",
      text: "The live site is not updating",
      action: { kind: "why-site", label: "What happened?" },
    });
  });

  it("after a save: saved, live (View page / View the People page), hidden, slow, unknown", () => {
    expect(d(rec, null, { phase: "finding" }).text).toBe(SAVED);
    for (const stage of ["waiting", "queued", "building", "publishing"])
      expect(d(rec, { stage }).text).toBe(SAVED);
    expect(d(rec, { stage: "live" })).toMatchObject({
      text: "Live on the site ✓",
      action: { kind: "view", label: "View page" },
      notes: ["If you still see the old page, reload it."],
    });
    const elsewhere = {
      ...rec,
      view: { state: "elsewhere", path: "/people/", label: "People page" },
    };
    expect(d(elsewhere, { stage: "live" }).action!.label).toBe("View the People page");
    const draft = { ...rec, view: { state: "hidden", reason: "Draft is on" } };
    expect(d(draft, { stage: "building" }).text).toBe(
      "Saved · not shown on the live site because “Draft · pending lab review” is on",
    );
    expect(d(draft, { stage: "live" })).toMatchObject({
      text: "Saved · not shown on the live site because “Draft · pending lab review” is on",
    });
    expect(d(draft, { stage: "live" }).action).toBeUndefined();
    const unlisted = {
      ...rec,
      collection: "people",
      view: { state: "hidden", reason: "Listed is off" },
    };
    expect(d(unlisted, { stage: "live" }).text).toBe(
      "Saved · not shown on the live site because Listed is off",
    );
    expect(d(rec, { stage: "slow" }).text).toBe(
      "Saved · the live site is taking longer than usual",
    );
    expect(d(rec, { stage: "unknown" }).text).toBe(
      "Saved · GitHub hasn't started updating the live site yet",
    );
  });

  it("failed, and waiting behind an earlier failure (named), or behind the daily rebuild", () => {
    expect(d(rec, { stage: "failed" })).toMatchObject({
      tone: "fail",
      text: "Saved, but the live site did not update",
      action: { kind: "why", label: "What happened?" },
    });
    const culprit = {
      sha: "c0",
      event: "push",
      at: "2026-10-26T19:40:00Z",
      authorLogin: "ben-editor",
      entry: { name: "News item “2026-09-30-bad-image”" },
    };
    expect(
      d({ ...rec, date: "2026-10-26T20:00:02Z" }, { stage: "waiting-behind-failure", culprit })
        .text,
    ).toBe(
      "Saved. The live site is stuck on an earlier problem (News item “2026-09-30-bad-image”, saved by @ben-editor); your change goes live once that is fixed. No need to undo.",
    );
    expect(
      d(rec, { stage: "waiting-behind-failure", culprit: { sha: "b0", event: "schedule" } }).text,
    ).toBe(
      "Saved. The live site is stuck on an earlier problem (the daily rebuild, not caused by a save); your change goes live once that is fixed. No need to undo.",
    );
  });

  it("keeps the notes from the save (checks that could not run) until it is live", () => {
    const noted = { ...rec, notes: ["Saved without the site check (the preview wasn't ready)"] };
    expect(d(noted, { stage: "building" }).notes).toEqual([
      "Saved without the site check (the preview wasn't ready)",
    ]);
    expect(d(noted, { stage: "live" }).notes).toEqual([
      "If you still see the old page, reload it.",
    ]);
  });

  it("local demo", () => {
    expect(dock._describe({ mode: "local", save: rec }).text).toBe(
      "Saved to this computer (local demo: there is no live site)",
    );
    expect(dock._describe({ mode: "local", save: null }).text).toBe(
      "Local demo: Save writes to this computer",
    );
  });

  it("the banner names the save after which the site stopped, or says the daily rebuild failed", () => {
    expect(dock._banner({ ok: true })).toBeNull();
    const push = dock._banner(
      {
        ok: false,
        failed: {
          event: "push",
          at: "2026-10-26T22:14:00Z",
          authorLogin: "ben-editor",
          entry: { collection: "news", slug: "x", name: "News item “x”", text: "News item › x" },
        },
      },
      Date.parse("2026-10-26T23:00:00Z"),
    )!;
    expect(push.text).toMatch(
      /^The live site is not updating: the update after News item “x” \(saved by @ben-editor at \d{1,2}:14 (am|pm)\) failed\. Later saves wait until it is fixed\.$/,
    );
    expect(push.entry).toEqual({ collection: "news", slug: "x", text: "News item › x" });
    expect(dock._banner({ ok: false, failed: { event: "schedule" } })).toEqual({
      text: "The daily rebuild failed; this isn't caused by a save. Tell a maintainer. Saves are still recorded and go live once it is fixed.",
      entry: null,
    });
  });

  it("names the save by the entry's saved title once the live column knows it, else by its address", () => {
    const failed = {
      ok: false,
      failed: {
        event: "push",
        at: "2026-10-26T22:14:00Z",
        authorLogin: "ben-editor",
        entry: { collection: "news", slug: "x", name: "News item “x”", text: "News item › x" },
      },
    };
    const named = setup({
      extra: {
        BobalabLive: {
          current: () => null,
          savedEntryName: (c: string, s: string) =>
            c === "news" && s === "x" ? "News item “Learning to gig”" : "",
        },
      },
    }).dock;
    expect(named._banner(failed)!.text).toMatch(
      /^The live site is not updating: the update after News item “Learning to gig” \(saved by @ben-editor/,
    );
    const unknown = setup({
      extra: { BobalabLive: { current: () => null, savedEntryName: () => "" } },
    }).dock;
    expect(unknown._banner(failed)!.text).toContain("the update after News item “x” (saved by");
  });
});

describe("cms-dock.js: on screen only after sign-in", () => {
  it("no dock, no polling and no requests before sign-in; the dock appears once signed in", async () => {
    const b = setup({
      user: null,
      runs: (fixture("runs-deploy.json").body as { workflow_runs: never[] }).workflow_runs,
    });
    await b.clock.advance(60000);
    expect(b.$("#bl-dock")).toBeNull();
    expect(b.calls).toHaveLength(0);
    b.local.setItem("decap-cms-user", JSON.stringify(GITHUB_USER));
    await b.clock.advance(2000);
    expect(b.$("#bl-dock")).not.toBeNull();
    expect(b.$("#bl-dock")!.getAttribute("role")).toBe("region");
    expect(b.dockText()).toBe("Live site up to date");
    expect(text(b.$(".bl-dock__recent"))).toBe("Recent changes");
    // signing out removes it and stops polling
    b.local.removeItem("decap-cms-user");
    await b.clock.advance(2000);
    expect(b.$("#bl-dock")).toBeNull();
    const n = b.calls.length;
    await b.clock.advance(5 * 60000);
    expect(b.calls).toHaveLength(n);
  });

  it("local demo: the dock says so, and nothing is polled", async () => {
    const b = setup({ mode: "local", user: { backendName: "proxy" } });
    await b.clock.advance(5 * 60000);
    expect(b.dockText()).toBe("Local demo: Save writes to this computer");
    expect(b.calls).toHaveLength(0);
    b.dock.saved(saveInfo());
    expect(b.dockText()).toBe("Saved to this computer (local demo: there is no live site)");
    expect(b.toasts()).toEqual(["Saved to this computer (local demo: there is no live site)."]);
    expect(b.calls).toHaveLength(0);
    expect(b.session.getItem("bobalab.deploy.pending.v1")).toBeNull();
  });
});

describe("cms-dock.js: after a save", () => {
  it("finds the save's commit by path (5 retries 2 s apart), sets the baseline and follows the deploy to live", async () => {
    const b = setup({
      deploy: "success",
      mineAt: (s) => (s < 4 ? [commit({ sha: BASELINE })] : [commit(), commit({ sha: BASELINE })]),
    });
    await b.clock.advance(1);
    b.dock.saved(saveInfo());
    await b.clock.advance(1);
    expect(b.dockText()).toBe(SAVED);
    const looks = () => requested(b.calls).filter((r) => r.includes("&per_page=5&"));
    expect(looks()[0]).toBe(
      `/repos/bobalabx/bobalab-web/commits?sha=main&path=${PATH}&per_page=5&page=1`,
    );
    await b.clock.advance(4000);
    expect(looks()).toHaveLength(3); // 0 s, 2 s, 4 s
    expect(b.baselines).toEqual([[PATH, SAVE_SHA]]);
    const pending = JSON.parse(b.session.getItem("bobalab.deploy.pending.v1")!);
    expect(pending).toMatchObject({ path: PATH, sha: SAVE_SHA, parentSha: PARENT });
    await b.clock.advance(100000);
    expect(b.dockText()).toBe(
      "Live on the site ✓ View page If you still see the old page, reload it.",
    );
    expect(b.session.getItem("bobalab.deploy.pending.v1")).toBeNull();
    buttonNamed(b.$("#bl-dock"), "View page")!.click();
    expect(b.opened).toHaveLength(1);
    expect(b.opened[0]!.url).toMatch(
      new RegExp(`^https://bobalabx\\.github\\.io/bobalab-web/news/${SLUG}/\\?v=\\d+$`),
    );
    expect(b.opened[0]!).toMatchObject({ target: "_blank", features: "noopener" });
    // the live message goes after 30 s
    await b.clock.advance(30000);
    expect(b.dockText()).toBe("Live site up to date");
  });

  it("gives up looking after 5 retries and says the site updates soon", async () => {
    const b = setup({ mineAt: () => [] });
    b.dock.saved(saveInfo());
    await b.clock.advance(20000);
    expect(requested(b.calls).filter((r) => r.includes("&per_page=5&"))).toHaveLength(6);
    expect(b.dockText()).toBe(SAVED);
    expect(b.baselines).toEqual([]);
    // The toast (role=status) says "Saved…"; the dock does not say it a second time.
    expect(b.toasts()).toEqual([SAVED]);
    expect(text(b.$("#bl-announce-polite"))).toBe("");
  });

  it("signing out and in again resumes the pending save from sessionStorage", async () => {
    const b = setup({ deploy: "success", mineAt: () => [commit()] });
    b.dock.saved(saveInfo());
    await b.clock.advance(20000);
    b.local.removeItem("decap-cms-user");
    await b.clock.advance(2000);
    expect(b.$("#bl-dock")).toBeNull();
    b.local.setItem("decap-cms-user", JSON.stringify(GITHUB_USER));
    await b.clock.advance(2000);
    expect(b.dockText()).toBe(SAVED);
    await b.clock.advance(80000);
    expect(b.dockText()).toMatch(/^Live on the site ✓/);
  });

  it("a hidden save: 'Saved · not shown on the live site because …', still tracked", async () => {
    const b = setup({ deploy: "success", mineAt: () => [commit()] });
    b.dock.saved(saveInfo({ view: { state: "hidden", reason: "Draft is on" } }));
    await b.clock.advance(1000);
    expect(b.dockText()).toBe(
      "Saved · not shown on the live site because “Draft · pending lab review” is on",
    );
    await b.clock.advance(100000);
    expect(requested(b.calls).some((r) => r.includes("/runs?"))).toBe(true);
    expect(b.dockText()).toBe(
      "Saved · not shown on the live site because “Draft · pending lab review” is on",
    );
    expect(buttonNamed(b.$("#bl-dock"), /View/)).toBeNull();
  });

  it("an entry shown on another page: 'View the People page'", async () => {
    const b = setup({ deploy: "success", mineAt: () => [commit()] });
    b.dock.saved(
      saveInfo({
        collection: "people",
        view: { state: "elsewhere", path: "/people/", label: "People page" },
      }),
    );
    await b.clock.advance(110000);
    buttonNamed(b.$("#bl-dock"), "View the People page")!.click();
    expect(b.opened[0]!.url).toMatch(/\/bobalab-web\/people\/\?v=\d+$/);
  });

  it("a failed deploy of one's own save: said assertively, with What happened?", async () => {
    const b = setup({ deploy: "failure", mineAt: () => [commit()] });
    b.dock.saved(saveInfo({ notes: ["Saved without the conflict check (GitHub didn't answer)"] }));
    await b.clock.advance(71000);
    expect(b.dockText()).toBe(
      "Saved, but the live site did not update What happened? Saved without the conflict check (GitHub didn't answer)",
    );
    expect(text(b.$("#bl-announce-assertive"))).toMatch(/^Saved, but the live site did not update/);
    buttonNamed(b.$("#bl-dock"), "What happened?")!.click();
    const dlg = b.$("dialog")!;
    expect(text(dlg)).toContain(
      "The update after your save stopped because the content check found a problem.",
    );
    expect(dlg.querySelector("a")!.getAttribute("href")).toBe(
      "https://github.com/bobalabx/bobalab-web/actions/runs/50010",
    );
  });

  it("waiting behind an earlier failure names it, and the banner offers to open it", async () => {
    const b = setup({ deploy: "behind-earlier-failure", mineAt: () => [commit()] });
    await b.clock.advance(1);
    b.dock.saved(saveInfo());
    await b.clock.advance(70000);
    expect(b.dockText()).toBe(
      "Saved. The live site is stuck on an earlier problem (News item “2026-09-30-bad-image”, saved by @ben-editor); your change goes live once that is fixed. No need to undo.",
    );
    await b.clock.advance(60000); // the banner's own 60-s check
    const banner = b.$("#bl-banner")!;
    expect(banner.getAttribute("role")).toBe("status");
    expect(banner.getAttribute("data-state")).toBe("on");
    expect(text(banner.querySelector(".bl-banner__text"))).toMatch(
      /^The live site is not updating: the update after News item “2026-09-30-bad-image” \(saved by @ben-editor at .+\) failed\. Later saves wait until it is fixed\.$/,
    );
    buttonNamed(banner, "Open it")!.click();
    expect(b.location.hash).toBe("#/collections/news/entries/2026-09-30-bad-image");
  });
});

describe("cms-dock.js: the banner", () => {
  it("changes its text only when the problem changes", async () => {
    const p = seq("schedule-failure").polls[0]!;
    const b = setup({ runs: [p.runs[1]!, p.runs[2]!], jobs: p.jobs });
    await b.clock.advance(1000);
    const t = b.$("#bl-banner .bl-banner__text")!;
    expect(text(t)).toBe(
      "The daily rebuild failed; this isn't caused by a save. Tell a maintainer. Saves are still recorded and go live once it is fixed.",
    );
    expect(buttonNamed(b.$("#bl-banner"), "Open it")).toBeNull();
    let writes = 0;
    const proto = Object.getPrototypeOf(t) as object;
    const desc = Object.getOwnPropertyDescriptor(proto, "textContent")!;
    Object.defineProperty(t, "textContent", {
      get: () => desc.get!.call(t),
      set: (v) => {
        writes++;
        desc.set!.call(t, v);
      },
    });
    await b.clock.advance(5 * 60000);
    expect(writes).toBe(0);
    buttonNamed(b.$("#bl-banner"), "What happened?")!.click();
    expect(text(b.$("dialog"))).toContain(
      "The daily rebuild stopped because the site build failed. This isn't caused by a save.",
    );
  });

  it("is off (empty, still in the page) while the site is fine", async () => {
    const b = setup({
      runs: (fixture("runs-deploy.json").body as { workflow_runs: never[] }).workflow_runs,
    });
    await b.clock.advance(1000);
    expect(b.$("#bl-banner")!.getAttribute("data-state")).toBe("off");
    expect(visibleText(b.$("#bl-banner"))).toBe("");
  });
});

describe("cms-dock.js: the Undo toast", () => {
  async function saved(o: Opts = {}, info: Record<string, unknown> = {}) {
    const b = setup({ mineAt: () => [commit()], ...o });
    await b.clock.advance(1);
    b.dock.saved(saveInfo(info));
    await b.clock.advance(1);
    return b;
  }

  it("offers Undo once the save's commit is found; Undo restores the version before the save", async () => {
    const b = await saved();
    const toast = b.undoToast()!;
    expect(text(toast.querySelector(".bl-toast__text"))).toBe(SAVED);
    const undo = buttonNamed(toast, "Undo")!;
    expect(undo.getAttribute("aria-label")).toBe(
      "Undo this save: go back to the version before it",
    );
    await b.clock.advance(100);
    expect(text(b.$("#bl-announce-polite"))).toBe("Undo is also in this entry's History");
    undo.click();
    await b.clock.advance(1);
    expect(b.restores).toEqual([{ path: PATH, sha: PARENT, save: true, source: "undo" }]);
    expect(b.undoToast()).toBeNull();
  });

  it("stays 30 s, pausing while the pointer is over it", async () => {
    const b = await saved();
    await b.clock.advance(20000);
    b.undoToast()!.dispatchEvent(new FakeEvent("mouseenter"));
    await b.clock.advance(60000);
    expect(b.undoToast()).not.toBeNull();
    b.undoToast()!.dispatchEvent(new FakeEvent("mouseleave"));
    await b.clock.advance(10000);
    expect(b.undoToast()).toBeNull();
    expect(b.toasts()).toEqual([]); // timing out says nothing more
  });

  it("closes on a hashchange to another address, then says where Undo is for 5 s", async () => {
    const b = await saved();
    b.go(`#/collections/news/entries/${SLUG}`); // its own address (after a first save): stays
    expect(b.undoToast()).not.toBeNull();
    b.go("#/collections/people/entries/isabelle-cho");
    expect(b.undoToast()).toBeNull();
    expect(b.toasts()).toEqual(["Undo is in this entry's History"]);
    await b.clock.advance(5000);
    expect(b.toasts()).toEqual([]);
  });

  it("closes when the form changes again (hasChanged turns true)", async () => {
    const b = await saved();
    b.editor.emit({ path: PATH, hasChanged: false });
    expect(b.undoToast()).not.toBeNull();
    b.editor.emit({ path: PATH, hasChanged: true });
    expect(b.undoToast()).toBeNull();
    expect(b.toasts()).toEqual(["Undo is in this entry's History"]);
    expect(b.editor.listeners).toHaveLength(0);
  });

  it("does not close for unsaved changes from before the save, only for new ones", async () => {
    const b = await saved({ entry: { path: PATH, hasChanged: true } });
    b.editor.emit({ path: PATH, hasChanged: true });
    expect(b.undoToast()).not.toBeNull();
    b.editor.emit({ path: PATH, hasChanged: false });
    b.editor.emit({ path: PATH, hasChanged: true });
    expect(b.undoToast()).toBeNull();
  });

  it("closes when the editor shows another entry", async () => {
    const b = await saved();
    b.editor.emit({ path: "content/people/isabelle-cho.md", hasChanged: false });
    expect(b.undoToast()).toBeNull();
    expect(b.toasts()).toEqual(["Undo is in this entry's History"]);
  });

  it("no Undo when the live column shows another entry, or the save created the entry", async () => {
    const other = await saved({ livePath: "content/news/other.md" });
    expect(buttonNamed(other.undoToast(), "Undo")).toBeNull();
    const created = await saved({
      mineAt: () => [commit({ message: `Add News item “${SLUG}” (by @ada-editor)` })],
    });
    expect(buttonNamed(created.undoToast(), "Undo")).toBeNull();
    expect(created.toasts()).toEqual([
      SAVED + " To take it off the site, turn on “Draft · pending lab review” and Save.",
    ]);
    const person = await saved(
      { mineAt: () => [commit({ message: "Add Person “jane-doe” (by @ada-editor)" })] },
      { collection: "people", slug: "jane-doe", path: "content/people/jane-doe.md" },
    );
    expect(person.toasts()[0]).toBe(
      SAVED + " To take it off the site, turn off “Listed” and Save.",
    );
  });
});

describe("cms-dock.js: a reload keeps following the save (sessionStorage)", () => {
  const pending = (o: Record<string, unknown>) => ({
    "bobalab.deploy.pending.v1": JSON.stringify({ ...saveInfo(), notes: [], ...o }),
  });

  it("resumes tracking a found commit", async () => {
    const b = setup({
      deploy: "success",
      session: pending({
        sha: SAVE_SHA,
        parentSha: PARENT,
        date: new Date(T0 + 2000).toISOString(),
      }),
    });
    await b.clock.advance(1);
    expect(b.dockText()).toBe(SAVED);
    expect(b.undoToast()).toBeNull(); // the Undo toast belongs to the moment of saving
    await b.clock.advance(100000);
    expect(b.dockText()).toMatch(/^Live on the site ✓/);
    expect(b.session.getItem("bobalab.deploy.pending.v1")).toBeNull();
  });

  it("resumes looking for the commit when it was not found yet", async () => {
    const b = setup({ deploy: "success", mineAt: () => [commit()], session: pending({}) });
    await b.clock.advance(1000);
    expect(b.baselines).toEqual([[PATH, SAVE_SHA]]);
  });

  it("forgets a save older than 25 minutes", async () => {
    const b = setup({ now: T0 + 26 * 60000, session: pending({ sha: SAVE_SHA }) });
    await b.clock.advance(1);
    expect(b.session.getItem("bobalab.deploy.pending.v1")).toBeNull();
    expect(b.dockText()).not.toContain("Saved");
  });
});

describe("cms-dock.js: Recent changes", () => {
  const cms = fixture("commits-cms-synthetic.json").body as Array<{
    sha: string;
    commit: { message: string };
  }>;
  const content = cms.filter((c) => !/^(Upload|Delete file)/.test(c.commit.message));
  const uploads = cms.filter((c) => /^(Upload|Delete file)/.test(c.commit.message));

  async function open(o: Opts = {}) {
    // The live site shows the saves up to T0 + 450 s (between a5 and a4).
    const live = {
      ...(fixture("runs-deploy.json").body as { workflow_runs: Array<Record<string, unknown>> })
        .workflow_runs[0]!,
      head_commit: { message: "x", timestamp: new Date(T0 + 450000).toISOString() },
    };
    const b = setup({ now: T0 + 1000000, runs: [live], recent: { content, uploads }, ...o });
    await b.clock.advance(1000);
    buttonNamed(b.$("#bl-dock"), "Recent changes")!.click();
    await b.clock.advance(1);
    return b;
  }
  const rows = (b: ReturnType<typeof setup>) =>
    b.document!.querySelectorAll(".bl-change").map((r) => r as FakeElement);

  it("lists every save, newest first, grouped by day, without the deploy's bookkeeping", async () => {
    const b = await open();
    const dlg = b.$("dialog.bl-sheet")!;
    expect(text(b.document!.getElementById(dlg.getAttribute("aria-labelledby")!))).toBe(
      "Recent changes",
    );
    expect(text(dlg.querySelector(".bl-dialog__body"))).toBe(
      "Every save to the website, newest first.",
    );
    // Rows below are newer than the live site and GitHub has not started on them:
    // the card must not say "up to date" above "Not live yet".
    expect(text(dlg.querySelector(".bl-sheet__status"))).toMatch(
      /^Waiting for the live site to updateThe live site shows the saves up to .*\. The newer ones go live in a few minutes\.$/,
    );
    expect(dlg.querySelector(".bl-sheet__status")!.getAttribute("data-tone")).toBe("busy");
    expect(dlg.querySelectorAll(".bl-sheet__day").map((h) => text(h))).toEqual(["Today"]);
    const lines = rows(b).map((r) => text(r.querySelector(".bl-change__line")));
    expect(lines).toEqual([
      "Ada Editor changed News item › 2026-10-07-informs-talk",
      "Ben Editor deleted the file old-photo.jpg",
      "Ben Editor uploaded isabelle-cho.jpg",
      "Ada Editor created Person › jane-doe",
      "Ada Editor changed Pages › Home page",
      "Ben Editor changed Publication › doe-2026-trust",
      "Jiaming Guan changed outside the content manager",
      "Ada Editor changed Research direction › trust-in-ai",
    ]);
  });

  it("says 'Live site up to date' only when no listed save is newer than the live site", async () => {
    const old = content.map((c) => ({
      ...c,
      commit: {
        ...(c as { commit: Record<string, unknown> }).commit,
        committer: { date: new Date(T0).toISOString() },
        author: {
          ...((c as { commit: { author?: Record<string, unknown> } }).commit.author ?? {}),
          date: new Date(T0).toISOString(),
        },
      },
    }));
    const b = await open({ recent: { content: old, uploads: [] } });
    expect(rows(b).some((r) => !!r.querySelector(".bl-chip"))).toBe(false);
    const card = b.$("dialog.bl-sheet")!.querySelector(".bl-sheet__status")!;
    expect(text(card)).toMatch(/^Live site up to dateThe live site shows the saves up to .*\.$/);
    expect(card.getAttribute("data-tone")).toBe("ok");
  });

  it("marks saves newer than the live site 'Not live yet', and links maintainer changes to GitHub", async () => {
    const b = await open();
    const chips = rows(b).map((r) => !!r.querySelector(".bl-chip"));
    expect(chips).toEqual([true, true, true, true, true, false, false, false]);
    const maint = rows(b)[6]!;
    const a = maint.querySelector("a")!;
    expect(a.getAttribute("href")).toMatch(
      /^https:\/\/github\.com\/bobalabx\/bobalab-web\/commit\/a2/,
    );
    expect(a.getAttribute("target")).toBe("_blank");
    expect(text(maint.querySelector(".bl-change__meta"))).toContain(
      "“People: new members and photos;",
    );
    const time = rows(b)[0]!.querySelector("time")!;
    expect(time.getAttribute("datetime")).toBe(new Date(T0 + 900000).toISOString());
    expect(time.getAttribute("title")).toMatch(/^Oct 26, 2026, /);
    // avatars are decorative
    expect(rows(b)[0]!.querySelector("img")!.getAttribute("alt")).toBe("");
  });

  it("[Open] goes to the entry and closes the sheet", async () => {
    const b = await open();
    const open1 = buttonNamed(rows(b)[0]!, "Open")!;
    expect(open1.getAttribute("aria-label")).toBe("Open News item › 2026-10-07-informs-talk");
    open1.click();
    expect(b.location.hash).toBe(`#/collections/news/entries/${SLUG}`);
    expect(b.$("dialog")).toBeNull();
    expect(buttonNamed(rows(b)[1] ?? null, "Open")).toBeNull();
  });

  it("loads older saves on request", async () => {
    const b = await open({ recent: { content, uploads, more: true } });
    const more = buttonNamed(b.$("dialog"), "Show older saves")!;
    expect(more).not.toBeNull();
    more.click();
    await b.clock.advance(1);
    expect(
      requested(b.calls)
        .filter((r) => r.includes("path=content&"))
        .map((r) => r.slice(-6)),
    ).toEqual(["page=1", "page=2"]);
  });

  it("says so when GitHub cannot be reached, with Try again", async () => {
    const b = await open({ recent: "fail" });
    const dlg = b.$("dialog")!;
    expect(text(dlg.querySelector(".bl-sheet__problem"))).toMatch(/^Couldn't reach GitHub\./);
    expect(buttonNamed(dlg, "Try again")).not.toBeNull();
    buttonNamed(dlg, "Close")!.click();
    expect(b.$("dialog")).toBeNull();
  });
});

describe("cms-dock.js loads alone", () => {
  it("without a DOM", () => {
    const b = boot({ files: FILES, dom: false, cmsData: null });
    expect(typeof (b.win.BobalabDock as { saved: unknown }).saved).toBe("function");
    expect(b.calls).toHaveLength(0);
  });
});
