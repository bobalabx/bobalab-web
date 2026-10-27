/**
 * public/admin/cms-live.js (editor v2, WP4): "Bring in their changes" (spec
 * §3.7, §9 WP4). The pure three-way merge _merge3 (the decision table, an
 * unknown base, consent and visibility switches that a colleague turned off,
 * nested project consent), and mergeLatest in the editor: it patches the
 * form, keeps the editor's own value of every field both changed, moves the
 * conflict baseline, and the proactive "saved this entry after you opened it"
 * band that offers it before Save.
 */
import { describe, expect, it } from "vitest";
import {
  PEOPLE_FIELDS,
  PROJECT_FIELDS,
  boot,
  button,
  commit,
  decapEntry,
  findAll,
  flush,
  mdFile,
  textOf,
  type GitHubAnswer,
} from "./live-helpers";

type Merge = {
  patches: Array<{ path: string; value: unknown }>;
  applied: string[];
  conflicts: Array<{ name: string; label: string; mine: unknown }>;
  held: Array<{ name: string; label: string }>;
  result: Record<string, unknown>;
};

const FIELDS = [
  { name: "title", label: "Title", widget: "string" },
  { name: "summary", label: "Summary", widget: "text" },
  { name: "tags", label: "Tags", widget: "list" },
  { name: "secret", label: "Secret", widget: "hidden" },
  { name: "body", label: "Bio", widget: "richtext" },
];

function merge(
  base: Record<string, unknown> | null,
  mine: Record<string, unknown>,
  theirs: Record<string, unknown>,
  fields: unknown[] = FIELDS,
): Merge {
  const { live } = boot();
  return live._merge3(base as never, mine as never, theirs as never, fields as never) as Merge;
}

describe("_merge3: the decision table (spec §3.7)", () => {
  it("mine = theirs: nothing; mine = base: theirs; theirs = base: mine; both changed: theirs, mine kept", () => {
    const base = { title: "T", summary: "S", tags: ["a"], body: "B" };
    const mine = { title: "T", summary: "S mine", tags: ["a", "b"], body: "B mine" };
    const theirs = { title: "T theirs", summary: "S mine", tags: ["a"], body: "B theirs" };
    const m = merge(base, mine, theirs);
    // title: mine = base → theirs. summary: mine = theirs → nothing. tags: theirs = base → mine.
    // body: both changed → theirs in the form, mine recorded.
    expect(m.patches).toEqual([
      { path: "title", value: "T theirs" },
      { path: "body", value: "B theirs" },
    ]);
    expect(m.applied).toEqual(["title", "body"]);
    expect(m.conflicts).toEqual([{ name: "body", label: "Bio", mine: "B mine" }]);
    expect(m.result).toMatchObject({
      title: "T theirs",
      summary: "S mine",
      tags: ["a", "b"],
      body: "B theirs",
    });
  });

  it("a field they removed is emptied (when the editor had not changed it)", () => {
    const m = merge({ title: "T", summary: "S" }, { title: "T", summary: "S" }, { title: "T" });
    expect(m.patches).toEqual([{ path: "summary", value: "" }]);
  });

  it("an unknown base (a backup from before this release): every difference is a conflict", () => {
    const m = merge(
      null,
      { title: "Mine", summary: "Same", body: "x" },
      { title: "Theirs", summary: "Same", body: "y" },
    );
    expect(m.patches.map((p) => p.path)).toEqual(["title", "body"]);
    expect(m.conflicts.map((c) => [c.name, c.mine])).toEqual([
      ["title", "Mine"],
      ["body", "x"],
    ]);
  });

  it("never touches hidden widgets", () => {
    const m = merge({ secret: "a" }, { secret: "b" }, { secret: "c" });
    expect(m.patches).toEqual([]);
    expect(m.conflicts).toEqual([]);
  });

  it("never silently overwrites a field both sides changed (every combination)", () => {
    const values = ["a", "b", "c", undefined];
    for (const b of values)
      for (const mi of values)
        for (const t of values) {
          const m = merge({ title: b }, { title: mi }, { title: t });
          const both = mi !== b && t !== b && mi !== t && !(mi === undefined && t === undefined);
          const patched = m.patches.find((p) => p.path === "title");
          if (both) {
            expect(
              m.conflicts.map((c) => c.name),
              JSON.stringify({ b, mi, t }),
            ).toEqual(["title"]);
            expect(m.conflicts[0]!.mine).toEqual(mi);
          }
          // The editor's own change is never lost without a trace: either kept, or listed as a conflict.
          if (mi !== b && patched) expect(m.conflicts.map((c) => c.name)).toContain("title");
        }
  });
});

describe("_merge3: consent and visibility (ONE_WAY)", () => {
  it("a colleague's withdrawal always survives, whatever the base and whatever the editor did", () => {
    const base = { name: "Jane", listed: true, photo_consent: true, email_public: true };
    const mine = { name: "Jane Q", listed: true, photo_consent: true, email_public: true };
    const theirs = { name: "Jane", listed: true, photo_consent: false, email_public: false };
    const m = merge(base, mine, theirs, PEOPLE_FIELDS);
    expect(m.result).toMatchObject({ name: "Jane Q", photo_consent: false, email_public: false });
    expect(m.patches).toEqual([
      { path: "photo_consent", value: false },
      { path: "email_public", value: false },
    ]);
    // Unknown base: still theirs.
    const u = merge(null, mine, theirs, PEOPLE_FIELDS);
    expect(u.result).toMatchObject({ photo_consent: false, email_public: false, listed: true });
  });

  it("theirs off wins even when the editor turned it on (and the bar says it stays off)", () => {
    const m = merge(
      { name: "Jane", listed: false },
      { name: "Jane", listed: true },
      { name: "Jane", listed: false },
      PEOPLE_FIELDS,
    );
    expect(m.result.listed).toBe(false);
    expect(m.patches).toEqual([{ path: "listed", value: false }]);
    expect(m.held).toEqual([{ name: "listed", label: "Listed" }]);
  });

  it("projects: a collaborator whose consent is off in their version stays hidden, matched by name", () => {
    // They did not touch the list; the editor turned Ann's consent on and added someone.
    const base = { title: "P", collaborators: [{ name: "Ann", consent: false }] };
    const mine = {
      title: "P2",
      collaborators: [
        { name: "Ann", consent: true },
        { name: "New", consent: true },
      ],
    };
    const theirs = { title: "P", collaborators: [{ name: "Ann", consent: false }] };
    const m = merge(base, mine, theirs, PROJECT_FIELDS);
    expect(m.result.collaborators).toEqual([
      { name: "Ann", consent: false },
      { name: "New", consent: true },
    ]);
    expect(m.result.title).toBe("P2");
    expect(m.held.map((x) => x.name)).toEqual(["collaborators"]);
    // Both changed the list: their list goes into the form, the editor's is kept to copy.
    const both = merge(
      { title: "P", collaborators: [{ name: "Ann", consent: true }] },
      mine,
      { title: "P", collaborators: [{ name: "Ann", consent: false }] },
      PROJECT_FIELDS,
    );
    expect(both.result.collaborators).toEqual([{ name: "Ann", consent: false }]);
    expect(both.conflicts.map((c) => c.name)).toEqual(["collaborators"]);
    expect(both.conflicts[0]!.mine).toEqual(mine.collaborators);
  });
});

// ---------------------------------------------------------------------------
// mergeLatest and the proactive band, in the editor

const PATH = "content/people/jane-doe.md";
const BASE = { name: "Jane Doe", role: "phd", listed: true, photo_consent: true, program: "PhD" };
const THEIRS = { ...BASE, photo_consent: false, program: "PhD in Operations" };
const TEXT: Record<string, string> = {
  base1: mdFile(BASE, "Bio before."),
  theirs2: mdFile(THEIRS, "Their bio."),
};

function github(): (p: string) => GitHubAnswer {
  return (p) => {
    if (p.includes("/commits?") && p.includes(`path=${PATH}`))
      return {
        data: [
          commit("theirs2", "base1", "2026-10-26T19:57:00Z", "Edit Person “jane-doe” (by @icho)"),
          commit(
            "base1",
            "p0",
            "2026-10-24T10:00:00Z",
            "Add Person “jane-doe” (by @jazzb)",
            "jazzb",
            "Jazz Beecham",
          ),
        ],
      };
    const m = /\/contents\/content\/people\/jane-doe\.md\?ref=(\w+)/.exec(p);
    if (m) return TEXT[m[1]!] ? { data: TEXT[m[1]!] } : { status: 404 };
    return { status: 404 };
  };
}

async function editor(o: Parameters<typeof boot>[0] = {}) {
  const env = boot({ github: github(), login: "ada-editor", ...o });
  const mine = { ...BASE, name: "Jane Q. Doe", body: "My bio." };
  env.state.editor = {
    collection: "people",
    slug: "jane-doe",
    data: JSON.parse(JSON.stringify(mine)),
    fields: PEOPLE_FIELDS,
    hasChanged: true,
    path: PATH,
  };
  const col = env.mount(decapEntry("people", "jane-doe", mine));
  env.send({ type: "bobalab:ready", v: 1 });
  await flush();
  return { env, col };
}

describe("mergeLatest (Bring in their changes)", () => {
  it("patches the form, keeps the editor's own Bio below the bar with [Copy], and moves the baseline", async () => {
    const { env, col } = await editor();
    const r = (await env.live.mergeLatest({
      path: PATH,
      baseSha: "base1",
      latestSha: "theirs2",
    } as never)) as {
      ok: boolean;
      applied: string[];
      conflicts: Array<{ name: string; mine: unknown }>;
    };
    expect(r.ok).toBe(true);
    expect(env.state.patches).toEqual([
      [
        { path: "program", value: "PhD in Operations" },
        { path: "photo_consent", value: false },
        { path: "body", value: "Their bio." },
      ],
    ]);
    expect(r.applied).toEqual(["program", "photo_consent", "body"]);
    expect(r.conflicts).toEqual([{ name: "body", label: "Bio", mine: "My bio." }]);
    expect(env.state.setBaselines).toEqual([[PATH, "theirs2"]]);
    expect(env.state.editor!.data.name).toBe("Jane Q. Doe"); // the editor's own change stays
    const text = textOf(col.inst.tree);
    expect(text).toContain(
      "Brought in Isabelle Cho's save from CLOCK(2026-10-26T19:57:00Z). Your other changes are kept.",
    );
    expect(text).toContain("You both changed Bio: the form now has their text; yours is below.");
    const pre = findAll(col.inst.tree, (n) => n.type === "pre")[0]!;
    expect(textOf(pre)).toBe("My bio.");
    expect(button(col.inst.tree, "Copy my Bio")).toBeDefined();
    expect(env.state.announced[env.state.announced.length - 1]).toBe(
      "Brought in Isabelle Cho's save from CLOCK(2026-10-26T19:57:00Z). Your other changes are kept.",
    );
  });

  it("an unknown baseline: every field both versions differ in is a conflict, theirs in the form", async () => {
    const { env } = await editor();
    const r = (await env.live.mergeLatest({
      path: PATH,
      baseSha: "unknown",
      latestSha: "theirs2",
    } as never)) as {
      conflicts: Array<{ name: string }>;
    };
    expect(r.conflicts.map((c) => c.name)).toEqual(["name", "program", "photo_consent", "body"]);
    expect(env.state.editor!.data).toMatchObject({
      name: "Jane Doe",
      photo_consent: false,
      body: "Their bio.",
    });
  });

  it("shows the live column first when it is hidden (parse runs in the preview)", async () => {
    const { env } = await editor({ layoutShown: false });
    await env.live.mergeLatest({ path: PATH, baseSha: "base1", latestSha: "theirs2" } as never);
    expect(env.state.shown).toBe(1);
  });
});

describe("the proactive check (spec §3.7)", () => {
  it("on focus, a newer save by someone else offers [Bring in their changes] before Save", async () => {
    const { env, col } = await editor();
    env.state.baselines[PATH] = "base1";
    for (const fn of env.winListeners.get("focus") ?? []) fn({});
    await flush(40);
    expect(textOf(col.inst.tree)).toContain(
      "@icho saved this entry AGO(2026-10-26T19:57:00Z), after you opened it.",
    );
    button(col.inst.tree, "Bring in their changes")!.props.onClick!.call(null);
    await flush(60);
    expect(env.state.setBaselines).toEqual([[PATH, "theirs2"]]);
    expect(textOf(col.inst.tree)).not.toContain("after you opened it");
  });

  it("says nothing when the newest save is the baseline, and checks every 2 minutes while there are changes", async () => {
    const { env, col } = await editor();
    env.state.baselines[PATH] = "theirs2";
    for (const fn of env.winListeners.get("focus") ?? []) fn({});
    await flush(40);
    expect(textOf(col.inst.tree)).not.toContain("after you opened it");
    const before = env.state.github.filter((p) => p.includes("per_page=1&")).length;
    env.state.baselines[PATH] = "base1";
    await env.clock.advance(2 * 60 * 1000);
    expect(env.state.github.filter((p) => p.includes("per_page=1&")).length).toBeGreaterThan(
      before,
    );
    expect(textOf(col.inst.tree)).toContain("after you opened it");
  });

  it("is off in the local demo", async () => {
    const { env, col } = await editor({ mode: "local" });
    env.state.baselines[PATH] = "base1";
    for (const fn of env.winListeners.get("focus") ?? []) fn({});
    await flush(40);
    expect(env.state.github.filter((p) => p.includes("/commits?"))).toEqual([]);
    expect(textOf(col.inst.tree)).not.toContain("after you opened it");
  });
});
