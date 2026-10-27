/**
 * public/admin/cms-deploy.js: is the live site up to date? (editor v2, spec §5)
 * The state machine runs against recorded runs/jobs and synthetic sequences
 * (tests/fixtures/github/sequences/*.json): "live" comes from the deploy JOB
 * (a record-slugs failure afterwards is still live), cancelled runs are
 * followed through the newer run, a failure behind an earlier failure names
 * the oldest failing run, a scheduled rebuild is not blamed on a save, and
 * the timing rules (unknown after 90 s, slow after 6 min, polling cadence).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FIXTURES,
  T0,
  boot,
  fixture,
  requested,
  type Answer,
  type BootOptions,
} from "./github-helpers";

interface Run {
  id: number;
  head_sha: string;
  event: string;
  status: string;
  conclusion: string | null;
}
interface Poll {
  at: number;
  runs: Run[];
  jobs: Record<string, unknown[]>;
  expect: string;
  failedStep?: string;
  culprit?: Record<string, unknown>;
}
interface Sequence {
  description: string;
  sha: string;
  startedAt: string;
  polls: Poll[];
}
interface DeployState {
  sha: string;
  stage: string;
  runUrl?: string;
  failedStep?: string;
  culprit?: Record<string, unknown>;
  elapsedMs: number;
}
interface SiteState {
  ok: boolean;
  updating: boolean;
  liveSha: string | null;
  liveAt: string | null;
  failed?: Record<string, unknown>;
}
interface Tracker {
  on(fn: (s: DeployState) => void): () => void;
  stop(): void;
  state(): DeployState;
}
interface Api {
  track(sha: string, o?: { startedAt?: number | string }): Tracker;
  site(): Promise<SiteState>;
  onSite(fn: (s: SiteState) => void): () => void;
  stepText(name: string): string;
  _evaluate(
    sha: string,
    runs: Run[],
    jobsFor: (r: Run) => unknown,
    at: number,
    startedAt: number,
  ): Promise<DeployState>;
  _siteFrom(runs: Run[], jobsFor: (r: Run) => unknown): Promise<SiteState>;
}

const SEQ_DIR = path.join(FIXTURES, "sequences");
const sequences: Record<string, Sequence> = Object.fromEntries(
  fs
    .readdirSync(SEQ_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => [
      f.replace(/\.json$/, ""),
      JSON.parse(fs.readFileSync(path.join(SEQ_DIR, f), "utf8")),
    ]),
);

const FILES = ["cms-ui.js", "cms-github.js", "cms-history.js", "cms-deploy.js"];

function setup(o: Partial<BootOptions> = {}) {
  const b = boot({ files: FILES, ...o });
  return { ...b, d: b.win.BobalabDeploy as Api };
}

/** Answers GitHub's runs and jobs from the sequence's poll for the current time. */
function seqHandler(seq: Sequence, now: () => number) {
  const pollAt = () => {
    const s = (now() - Date.parse(seq.startedAt)) / 1000;
    let p = seq.polls[0]!;
    for (const x of seq.polls) if (x.at <= s) p = x;
    return p;
  };
  return (u: URL): Answer => {
    const p = pollAt();
    if (/\/actions\/workflows\/deploy\.yml\/runs$/.test(u.pathname))
      return { status: 200, body: { total_count: p.runs.length, workflow_runs: p.runs } };
    const m = /\/actions\/runs\/(\d+)\/jobs$/.exec(u.pathname);
    if (m) return { status: 200, body: { total_count: 0, jobs: p.jobs[m[1]!] ?? [] } };
    return { status: 404, body: {} };
  };
}

const jobsOf = (p: Poll) => (r: Run) => p.jobs[String(r.id)] ?? null;

describe("cms-deploy.js: the state machine on each fixture sequence", () => {
  const { d } = setup();
  for (const [name, seq] of Object.entries(sequences)) {
    it(`${name}: ${seq.description}`, async () => {
      for (const p of seq.polls) {
        const st = await d._evaluate(
          seq.sha,
          p.runs,
          jobsOf(p),
          Date.parse(seq.startedAt) + p.at * 1000,
          Date.parse(seq.startedAt),
        );
        expect(st.stage, `${name} at ${p.at} s`).toBe(p.expect);
        expect(st.elapsedMs).toBe(p.at * 1000);
        if (p.failedStep) expect(st.failedStep).toBe(p.failedStep);
        if (p.culprit) expect(st.culprit).toMatchObject(p.culprit);
      }
    });
  }

  it("a record-slugs failure after a successful deploy job is still live", async () => {
    const seq = sequences["record-slugs-failure"]!;
    const last = seq.polls.at(-1)!;
    expect(last.runs[0]).toMatchObject({ status: "completed", conclusion: "failure" });
    const st = await d._evaluate(seq.sha, last.runs, jobsOf(last), T0 + last.at * 1000, T0);
    expect(st.stage).toBe("live");
  });

  it("the culprit is the oldest failing push run, with its entry and author", async () => {
    const p = sequences["behind-earlier-failure"]!.polls[0]!;
    const st = await d._evaluate(
      sequences["behind-earlier-failure"]!.sha,
      p.runs,
      jobsOf(p),
      T0 + 62000,
      T0,
    );
    expect(st.stage).toBe("waiting-behind-failure");
    expect(st.culprit).toMatchObject({
      sha: expect.stringMatching(/^c0/),
      subject: "Edit News item “2026-09-30-bad-image” (by @ben-editor)",
      entry: {
        collection: "news",
        slug: "2026-09-30-bad-image",
        name: "News item “2026-09-30-bad-image”",
      },
      authorLogin: "ben-editor",
      event: "push",
      step: "an image could not be processed",
      runUrl: "https://github.com/bobalabx/bobalab-web/actions/runs/50005",
    });
  });

  it("a scheduled rebuild that failed is not blamed on a save", async () => {
    const p = sequences["schedule-failure"]!.polls[0]!;
    const st = await d._evaluate(
      sequences["schedule-failure"]!.sha,
      p.runs,
      jobsOf(p),
      T0 + 62000,
      T0,
    );
    expect(st.stage).toBe("waiting-behind-failure");
    expect(st.culprit!.event).toBe("schedule");
    expect(st.culprit!.entry).toBeUndefined();
    expect(st.culprit!.authorLogin).toBeUndefined();
  });

  it("puts every deploy step into plain words", () => {
    const build = (
      fixture("jobs-40283049218.json").body as {
        jobs: Array<{ name: string; steps: Array<{ name: string }> }>;
      }
    ).jobs.find((j) => j.name === "build")!;
    const words = Object.fromEntries(
      build.steps.map((s) => [s.name.split(" (")[0]!, d.stepText(s.name)]),
    );
    expect(words).toMatchObject({
      "Validate content": "the content check found a problem",
      "Upload types and sizes": "an uploaded file is too big or of the wrong type",
      "Image variants": "an image could not be processed",
      "Production export": "the site build failed",
      "Export contract": "the export check failed",
      "CMS sign-in configured": "the content manager's sign-in setting is wrong; tell a maintainer",
      "Run npm ci": "GitHub could not update the site; tell a maintainer",
    });
  });
});

describe("cms-deploy.js: track()", () => {
  it("polls every 10 s, reports each stage once, and stops at live", async () => {
    const seq = sequences.success!;
    const b = setup({ now: T0 });
    b.win.fetch = wrap(
      b,
      seqHandler(seq, () => b.clock.t),
    );
    const seen: string[] = [];
    const t = b.d.track(seq.sha, { startedAt: seq.startedAt });
    t.on((s) => seen.push(s.stage));
    await b.clock.advance(120000);
    expect(seen).toEqual(["queued", "building", "publishing", "live"]);
    expect(t.state()).toMatchObject({
      stage: "live",
      runUrl: expect.stringContaining("/actions/runs/50010"),
    });
    const runPolls = requested(b.calls).filter((r) => r.includes("/runs?"));
    expect(runPolls[0]).toBe(
      "/repos/bobalabx/bobalab-web/actions/workflows/deploy.yml/runs?branch=main&per_page=10",
    );
    // t = 0, 10, …, 100 s: the deploy job is done at 92 s, seen at 100 s; nothing after that.
    expect(runPolls).toHaveLength(11);
    const n = b.calls.length;
    await b.clock.advance(10 * 60000);
    expect(b.calls).toHaveLength(n);
  });

  it("follows a cancelled run through the newer save's run", async () => {
    const seq = sequences["cancelled-superseded"]!;
    const b = setup();
    b.win.fetch = wrap(
      b,
      seqHandler(seq, () => b.clock.t),
    );
    const seen: string[] = [];
    b.d.track(seq.sha, { startedAt: seq.startedAt }).on((s) => seen.push(s.stage));
    await b.clock.advance(130000);
    expect(seen).toEqual(["queued", "building", "live"]);
  });

  it("stops at failed, with the step in plain words", async () => {
    const seq = sequences.failure!;
    const b = setup();
    b.win.fetch = wrap(
      b,
      seqHandler(seq, () => b.clock.t),
    );
    const t = b.d.track(seq.sha, { startedAt: seq.startedAt });
    await b.clock.advance(70000);
    expect(t.state()).toMatchObject({
      stage: "failed",
      failedStep: "the content check found a problem",
    });
    const n = b.calls.length;
    await b.clock.advance(60000);
    expect(b.calls).toHaveLength(n);
  });

  it("no run: waiting, unknown after 90 s, slow after 6 min; gives up after 25 min", async () => {
    const seq = sequences["no-run"]!;
    const b = setup();
    b.win.fetch = wrap(
      b,
      seqHandler(seq, () => b.clock.t),
    );
    const seen: string[] = [];
    const t = b.d.track(seq.sha, { startedAt: seq.startedAt });
    t.on((s) => seen.push(s.stage));
    await b.clock.advance(80000);
    expect(t.state().stage).toBe("waiting");
    await b.clock.advance(20000);
    expect(t.state().stage).toBe("unknown");
    await b.clock.advance(5 * 60000);
    expect(t.state().stage).toBe("slow");
    expect(seen).toEqual(["unknown", "slow"]);
    await b.clock.advance(20 * 60000);
    const n = b.calls.length;
    await b.clock.advance(5 * 60000);
    expect(b.calls).toHaveLength(n);
  });

  it("polls every 30 s while the tab is hidden, and at once when it is shown again", async () => {
    const seq = sequences["no-run"]!;
    const b = setup();
    b.win.fetch = wrap(
      b,
      seqHandler(seq, () => b.clock.t),
    );
    b.d.track(seq.sha, { startedAt: seq.startedAt });
    await b.clock.advance(1);
    b.document!.setVisibility("hidden");
    await b.clock.advance(10000); // the 10-s poll scheduled before hiding
    const at = b.calls.length;
    await b.clock.advance(29000);
    expect(b.calls).toHaveLength(at);
    await b.clock.advance(1000);
    expect(b.calls).toHaveLength(at + 1);
    await b.clock.advance(5000);
    b.document!.setVisibility("visible");
    await b.clock.advance(1);
    expect(b.calls).toHaveLength(at + 2);
  });

  it("slows to 30 s when fewer than 300 GitHub requests are left", async () => {
    const seq = sequences["no-run"]!;
    const b = setup();
    const inner = seqHandler(seq, () => b.clock.t);
    b.win.fetch = wrap(b, (u) => ({
      ...inner(u),
      headers: { "x-ratelimit-remaining": "120", "x-ratelimit-reset": "9999999999" },
    }));
    b.d.track(seq.sha, { startedAt: seq.startedAt });
    await b.clock.advance(1);
    expect(b.calls).toHaveLength(1);
    await b.clock.advance(29000);
    expect(b.calls).toHaveLength(1);
    await b.clock.advance(1000);
    expect(b.calls).toHaveLength(2);
  });

  it("makes no request in the local demo or before sign-in", async () => {
    for (const o of [{ mode: "local" as const, user: { backendName: "proxy" } }, { user: null }]) {
      const b = setup(o);
      b.win.fetch = wrap(b, () => ({ status: 200, body: { workflow_runs: [] } }));
      const t = b.d.track("abc", {});
      await b.clock.advance(5 * 60000);
      expect(t.state().stage).toBe("unknown");
      expect(await b.d.site()).toMatchObject({ ok: true, liveSha: null });
      expect(b.calls).toHaveLength(0);
    }
  });
});

describe("cms-deploy.js: site()", () => {
  const recorded = fixture("runs-deploy.json");

  it("reads the live version from the recorded runs with one request", async () => {
    const b = setup({
      fetch: () => ({ status: 200, headers: recorded.headers, body: recorded.body }),
    });
    const s = await b.d.site();
    expect(s).toEqual({
      ok: true,
      updating: false,
      liveSha: "14c739cd9f216df68f5e5071acc1fe15e0484d27",
      liveAt: "2026-10-26T06:50:40Z",
    });
    expect(b.calls).toHaveLength(1);
  });

  it("is still live after a record-slugs failure; updating while a run is under way", async () => {
    const { d } = setup();
    const p = sequences["record-slugs-failure"]!.polls.at(-1)!;
    expect(await d._siteFrom(p.runs, jobsOf(p))).toMatchObject({
      ok: true,
      liveSha: sequences["record-slugs-failure"]!.sha,
    });
    const q = sequences.success!.polls[2]!;
    expect(await d._siteFrom(q.runs, jobsOf(q))).toMatchObject({
      ok: true,
      updating: true,
      liveSha: expect.stringMatching(/^b0/),
    });
  });

  it("names the oldest failing run after the last good deploy", async () => {
    const { d } = setup();
    const p = sequences["behind-earlier-failure"]!.polls[0]!;
    const s = await d._siteFrom(p.runs, jobsOf(p));
    expect(s.ok).toBe(false);
    expect(s.liveSha).toMatch(/^b0/);
    expect(s.failed).toMatchObject({
      sha: expect.stringMatching(/^c0/),
      event: "push",
      authorLogin: "ben-editor",
    });
  });

  it("a failed daily rebuild is reported as the schedule's, not a save's", async () => {
    const { d } = setup();
    const p = sequences["schedule-failure"]!.polls[0]!;
    const s = await d._siteFrom([p.runs[1]!, p.runs[2]!], jobsOf(p));
    expect(s).toMatchObject({
      ok: false,
      failed: { event: "schedule", step: "the site build failed" },
    });
    expect(s.failed!.entry).toBeUndefined();
  });

  it("onSite(): every 60 s while visible, only when something changed, paused while hidden", async () => {
    let runs = (recorded.body as { workflow_runs: Run[] }).workflow_runs;
    const b = setup();
    b.win.fetch = wrap(b, () => ({ status: 200, body: { workflow_runs: runs } }));
    const seen: SiteState[] = [];
    const off = b.d.onSite((s) => seen.push(s));
    await b.clock.advance(1);
    expect(b.calls).toHaveLength(1);
    expect(seen).toHaveLength(1);
    await b.clock.advance(60000);
    expect(b.calls).toHaveLength(2);
    expect(seen).toHaveLength(1); // the same answer: no new call to the listener
    const next = {
      ...runs[0]!,
      id: 1,
      head_sha: "f".repeat(40),
      status: "in_progress",
      conclusion: null,
    };
    runs = [{ ...next, created_at: "2026-10-26T07:30:00Z" } as Run, ...runs];
    await b.clock.advance(60000);
    expect(seen).toHaveLength(2);
    expect(seen[1]!.updating).toBe(true);
    b.document!.setVisibility("hidden");
    const n = b.calls.length;
    await b.clock.advance(5 * 60000);
    expect(b.calls).toHaveLength(n);
    b.document!.setVisibility("visible");
    await b.clock.advance(1);
    expect(b.calls.length).toBeGreaterThan(n);
    off();
    const m = b.calls.length;
    await b.clock.advance(5 * 60000);
    expect(b.calls).toHaveLength(m);
  });
});

/** Swap the sandbox's fetch handler, keeping the call log. */
function wrap(b: ReturnType<typeof setup>, handler: (u: URL) => Answer) {
  return async (url: string, init: Record<string, unknown> = {}) => {
    b.calls.push({
      url,
      method: String(init.method ?? "GET"),
      headers: (init.headers as Record<string, string>) ?? {},
      init,
    });
    const a = handler(new URL(url));
    const headers = Object.fromEntries(
      Object.entries(a.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
    );
    return {
      status: a.status ?? 200,
      headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
      json: async () => a.body,
      text: async () => JSON.stringify(a.body),
    };
  };
}
