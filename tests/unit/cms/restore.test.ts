/**
 * public/admin/cms-live.js (editor v2, WP4): History and Restore (spec §4.2,
 * §4.3, §4.4, §9 WP4). The restore patch builder (only differing fields,
 * empty values per widget, one-way consent, opt-in personal details, the
 * draft guard, no photo without consent, missing uploads), the History list
 * and its privacy masking, the older-version preview that equals what Restore
 * would save, the Restore dialog and save, and Undo that never acts on
 * another entry or over unsaved changes.
 */
import { describe, expect, it } from "vitest";
import { parseFileData } from "@/lib/content/parse";
import {
  NEWS_FIELDS,
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

type Plan = {
  patches: Array<{ path: string; value: unknown }>;
  notes: string[];
  result: Record<string, unknown>;
  held: { draft: boolean; personal: string[]; oneWay: string[] };
};

function plan(
  current: Record<string, unknown>,
  old: Record<string, unknown>,
  fields: unknown[],
  opts: Record<string, unknown> = {},
): Plan {
  const { live } = boot();
  return live._buildRestorePatch(
    current as never,
    old as never,
    fields as never,
    opts as never,
  ) as Plan;
}

const paths = (p: Plan) => p.patches.map((x) => x.path);
const valueOf = (p: Plan, name: string) => p.patches.find((x) => x.path === name)?.value;

describe("_buildRestorePatch: only what differs (spec §4.3 step 4)", () => {
  it("patches only top-level fields whose old value differs; trimmed text and defaults count as equal", () => {
    const p = plan(
      { title: "New title", type: "talk", summary: "Same ", draft: false, people: [] },
      { title: "Old title", type: "talk", summary: "Same", people: [] },
      NEWS_FIELDS,
    );
    expect(p.patches).toEqual([{ path: "title", value: "Old title" }]);
  });

  it("empty() per widget, only for fields the old version lacks and the current one has", () => {
    const fields = [
      { name: "s", label: "S", widget: "string" },
      { name: "t", label: "T", widget: "text" },
      { name: "md", label: "Md", widget: "markdown" },
      { name: "rt", label: "Rt", widget: "richtext" },
      { name: "c", label: "C", widget: "color" },
      { name: "dt", label: "Dt", widget: "datetime" },
      { name: "sel", label: "Sel", widget: "select" },
      { name: "img", label: "Img", widget: "image" },
      { name: "file", label: "File", widget: "file" },
      { name: "rel", label: "Rel", widget: "relation" },
      { name: "rels", label: "Rels", widget: "relation", multiple: true },
      { name: "list", label: "List", widget: "list" },
      { name: "obj", label: "Obj", widget: "object" },
      { name: "flag", label: "Flag", widget: "boolean" },
      { name: "on", label: "On", widget: "boolean", default: true },
      { name: "n", label: "N", widget: "number" },
      { name: "untouched", label: "U", widget: "string" },
    ];
    const current = {
      s: "x",
      t: "x",
      md: "x",
      rt: "x",
      c: "#fff",
      dt: "2026-10-26",
      sel: "a",
      img: "/uploads/i.png",
      file: "/uploads/f.pdf",
      rel: "a",
      rels: ["a"],
      list: ["a"],
      obj: { a: "1" },
      flag: true,
      on: false,
      n: 3,
    };
    const p = plan(current, {}, fields);
    const byPath = Object.fromEntries(p.patches.map((x) => [x.path, x.value]));
    expect(byPath).toEqual({
      s: "",
      t: "",
      md: "",
      rt: "",
      c: "",
      dt: "",
      sel: "",
      img: "",
      file: "",
      rel: "",
      rels: [],
      list: [],
      obj: {},
      flag: false,
      on: true,
      n: "",
    });
    expect(paths(p)).not.toContain("untouched");
  });

  it("“Visible on the website” (widget visible) empties to Yes: draft false, a boolean (D-21)", () => {
    const fields = [{ name: "draft", label: "Visible on the website", widget: "visible" }];
    expect(plan({ draft: true }, {}, fields, { unhide: true }).patches).toEqual([
      { path: "draft", value: false },
    ]);
  });

  it("a publication status the site no longer uses comes back as today's, and says so (D-21)", () => {
    const fields = [
      { name: "title", label: "Title", widget: "string" },
      {
        name: "status",
        label: "Status",
        widget: "select",
        options: [
          { label: "Work in progress", value: "in-progress" },
          { label: "Under review", value: "under-review" },
          { label: "Under revision", value: "under-revision" },
          { label: "Published", value: "published" },
        ],
      },
    ];
    const cases: Array<[string, string, string]> = [
      ["major-revision", "under-revision", "Under revision"],
      ["revise-resubmit", "under-revision", "Under revision"],
      ["submitted", "under-review", "Under review"],
      ["working-paper", "in-progress", "Work in progress"],
      ["preprint", "in-progress", "Work in progress"],
      ["forthcoming", "published", "Published"],
    ];
    for (const [old, now, word] of cases) {
      const p = plan({ title: "T", status: "published" }, { title: "T", status: old }, fields, {
        collection: "publications",
      });
      expect(p.result.status, old).toBe(now);
      expect(p.notes, old).toContain(
        `“Status”: that version says “${old}”, which the site no longer uses, so it comes back as “${word}”.`,
      );
    }
    // Today's values, and other collections, are left alone.
    const same = plan(
      { title: "T", status: "published" },
      { title: "T", status: "under-review" },
      fields,
      { collection: "publications" },
    );
    expect(valueOf(same, "status")).toBe("under-review");
    expect(same.notes).toEqual([]);
    const other = plan({ status: "active" }, { status: "submitted" }, fields, {
      collection: "projects",
    });
    expect(valueOf(other, "status")).toBe("submitted");
  });

  it("never touches hidden widgets", () => {
    const fields = [
      { name: "title", label: "Title", widget: "string" },
      { name: "figure_mode", label: "Fig", widget: "hidden" },
    ];
    const p = plan({ title: "a", figure_mode: "x" }, { title: "b", figure_mode: "y" }, fields);
    expect(paths(p)).toEqual(["title"]);
  });

  it("restores a richtext body exactly, character for character", () => {
    const body =
      "## Heading\n\nA paragraph with **bold**, a [link](https://example.org) and `code`.\n\n- one\n- two\n\n> quoted";
    const p = plan({ title: "x", body: "Changed later." }, { title: "x", body }, NEWS_FIELDS);
    expect(p.patches).toEqual([{ path: "body", value: body }]);
  });
});

describe("_buildRestorePatch: the guards (spec §4.3 step 5)", () => {
  it("people: consent and visibility switches may go on → off, never off → on", () => {
    const current = {
      name: "Jane",
      listed: false,
      profile_page: false,
      photo_consent: false,
      email_public: false,
      now_at_public: true,
    };
    const old = {
      name: "Jane",
      listed: true,
      profile_page: true,
      photo_consent: true,
      email_public: true,
      now_at_public: false,
    };
    const p = plan(current, old, PEOPLE_FIELDS);
    expect(p.patches).toEqual([{ path: "now_at_public", value: false }]); // on → off is fine
    expect(p.held.oneWay.sort()).toEqual([
      "email_public",
      "listed",
      "photo_consent",
      "profile_page",
    ]);
    expect(p.notes).toContain(
      "“Listed” stays off: a restore never turns a consent or visibility switch back on. Turn it on in the form if the person has agreed.",
    );
  });

  it("projects: a collaborator's consent and a partner's Public, matched by name, never come back on", () => {
    const current = {
      title: "P",
      collaborators: [
        { name: "Ann", consent: false },
        { name: "Bo", consent: true },
      ],
      partners: [{ name: "Org A", public: true }],
    };
    const old = {
      title: "P",
      collaborators: [
        { name: "Ann", consent: true },
        { name: "Bo", consent: false },
        { name: "Cy", consent: true }, // removed since: off now
      ],
      partners: [
        { name: "Org A", public: false },
        { name: "Org B", public: true },
      ],
    };
    const p = plan(current, old, PROJECT_FIELDS);
    expect(valueOf(p, "collaborators")).toEqual([
      { name: "Ann", consent: false },
      { name: "Bo", consent: false },
      { name: "Cy", consent: false },
    ]);
    expect(valueOf(p, "partners")).toEqual([
      { name: "Org A", public: false },
      { name: "Org B", public: false },
    ]);
    expect(p.notes.some((n) => n.startsWith("“Ann” (Collaborators) stays hidden"))).toBe(true);
  });

  it("personal details that are empty now stay empty unless asked for (email, now at, photo, CV)", () => {
    const current = {
      name: "Jane",
      listed: true,
      email: "",
      email_public: true,
      now_at_public: true,
      photo_consent: true,
      links: { website: "https://j.example" },
    };
    const old = {
      name: "Jane",
      listed: true,
      email: "jane@example.edu",
      email_public: true,
      now_at: "Acme",
      now_at_public: true,
      photo: "/uploads/people/jane.jpg",
      photo_alt: "Jane",
      photo_consent: true,
      links: { website: "https://old.example", cv: "/uploads/cv.pdf" },
    };
    const kept = plan(current, old, PEOPLE_FIELDS, { source: "undo" });
    expect(kept.result.email).toBe("");
    expect(kept.result.now_at ?? "").toBe("");
    expect(kept.result.photo ?? "").toBe("");
    expect(kept.result.links).toEqual({ website: "https://old.example" });
    expect(paths(kept)).toEqual(["links"]);
    expect(kept.held.personal.sort()).toEqual([
      "email",
      "links.cv",
      "now_at",
      "photo",
      "photo_alt",
    ]);
    expect(kept.notes).toContain(
      "Email, Now at, Photo and CV were not brought back. To bring back removed personal details, use History.",
    );
    const fromHistory = plan(current, old, PEOPLE_FIELDS, { source: "history" });
    expect(fromHistory.notes).toContain(
      "Email, Now at, Photo and CV were not brought back. Removed personal details come back only with “Also bring back removed personal details” ticked.",
    );
    const asked = plan(current, old, PEOPLE_FIELDS, { personal: true });
    expect(asked.result).toMatchObject({
      email: "jane@example.edu",
      now_at: "Acme",
      photo: "/uploads/people/jane.jpg",
      links: { website: "https://old.example", cv: "/uploads/cv.pdf" },
    });
  });

  it("one removed detail reads as the spec's note", () => {
    const p = plan(
      { name: "Jane", listed: true, email: "", email_public: true },
      { name: "Jane", listed: true, email: "jane@example.edu", email_public: true },
      PEOPLE_FIELDS,
      { source: "undo" },
    );
    expect(p.notes).toEqual([
      "Email was not brought back. To bring back removed personal details, use History.",
    ]);
  });

  it("without photo consent the photo and its alt text are cleared", () => {
    const current = { name: "Jane", listed: true, photo: "", photo_consent: false };
    const old = {
      name: "Jane",
      listed: true,
      photo: "/uploads/p.jpg",
      photo_alt: "Jane",
      photo_consent: true,
    };
    const p = plan(current, old, PEOPLE_FIELDS, { personal: true });
    expect(p.result.photo).toBe("");
    expect(p.result.photo_alt).toBe("");
    expect(p.result.photo_consent).toBe(false);
    expect(p.notes).toContain("Photo not shown: Photo consent is off now.");
    // A photo already in the form without consent (it could not be saved) is cleared too.
    const q = plan(
      { name: "Jane", listed: true, photo: "/uploads/new.jpg", photo_consent: false },
      { name: "Jane", listed: true, photo: "/uploads/new.jpg", photo_consent: false, title: "Dr" },
      PEOPLE_FIELDS,
    );
    expect(valueOf(q, "photo")).toBe("");
  });

  it("a draft stays a draft unless asked to show it", () => {
    const p = plan({ title: "x", draft: true }, { title: "y", draft: false }, NEWS_FIELDS);
    expect(paths(p)).toEqual(["title"]);
    expect(p.held.draft).toBe(true);
    expect(p.notes[0]).toBe(
      "It stays hidden: “Visible on the website” stays No. Tick “Also make it visible on the live site” to show it.",
    );
    const shown = plan({ title: "x", draft: true }, { title: "y", draft: false }, NEWS_FIELDS, {
      unhide: true,
    });
    expect(valueOf(shown, "draft")).toBe(false);
    // A draft may always be restored as a draft.
    const hide = plan({ title: "x", draft: false }, { title: "y", draft: true }, NEWS_FIELDS);
    expect(valueOf(hide, "draft")).toBe(true);
  });

  it("uploads that are no longer on the site are left empty, with a note; dropped uploads stay on the site", () => {
    const current = { title: "x", image: { image: "/uploads/new.jpg", alt: "New" } };
    const old = { title: "x", image: { image: "/uploads/gone.jpg", alt: "Old" } };
    const p = plan(current, old, NEWS_FIELDS, { uploads: new Set(["/uploads/new.jpg"]) });
    expect(valueOf(p, "image")).toEqual({ image: "", alt: "Old" });
    expect(p.notes).toContain("“Image” left empty: /uploads/gone.jpg is no longer on the site.");
    expect(p.notes).toContain("The file stays at /uploads/new.jpg until a maintainer deletes it.");
    const kept = plan(current, old, NEWS_FIELDS, { uploads: new Set(["/uploads/gone.jpg"]) });
    expect(valueOf(kept, "image")).toEqual({ image: "/uploads/gone.jpg", alt: "Old" });
    // When the uploads can't be read, nothing is cleared.
    expect(valueOf(plan(current, old, NEWS_FIELDS), "image")).toEqual({
      image: "/uploads/gone.jpg",
      alt: "Old",
    });
  });
});

// ---------------------------------------------------------------------------
// History against recorded-style GitHub answers

const PATH = "content/people/jane-doe.md";
const V1 = {
  name: "Jane Doe",
  role: "phd",
  listed: true,
  photo: "/uploads/people/jane.jpg",
  photo_alt: "Jane at the lab",
  photo_consent: true,
  email: "jane@example.edu",
  email_public: true,
};
const V2 = { ...V1, title: "Student", program: "PhD in Operations" };
// Jane withdrew photo consent and asked to hide her (new) email address.
const V3 = {
  name: "Jane Doe",
  role: "phd",
  title: "Researcher",
  program: "PhD in Operations",
  listed: true,
  photo_consent: false,
  email: "jane.doe@new.example",
  email_public: false,
};
const TEXT: Record<string, string> = {
  c1: mdFile(V1, "First bio."),
  c2: mdFile(V2, "First bio."),
  c3: mdFile(V3, "First bio."),
};
const ROWS = [
  commit("c3", "p3", "2026-10-26T18:00:00Z", "Edit Person “jane-doe” (by @icho)"),
  commit(
    "c2",
    "p2",
    "2026-10-25T10:00:00Z",
    "Edit Person “jane-doe” (by @jazzb)",
    "jazzb",
    "Jazz Beecham",
  ),
  commit(
    "c1",
    "p0",
    "2026-10-24T17:02:00Z",
    "Add Person “jane-doe” (by @jazzb)",
    "jazzb",
    "Jazz Beecham",
  ),
];

function github(extra: (p: string) => GitHubAnswer | null = () => null) {
  return (p: string): GitHubAnswer => {
    const x = extra(p);
    if (x) return x;
    if (p.includes("/commits?") && p.includes(`path=${PATH}`)) return { data: ROWS };
    const m = /\/contents\/content\/people\/jane-doe\.md\?ref=(\w+)/.exec(p);
    if (m) return TEXT[m[1]!] ? { data: TEXT[m[1]!] } : { status: 404 };
    if (p.includes("git/trees/main:public/uploads?recursive=1"))
      return { data: { tree: [{ path: "people/jane.jpg", type: "blob" }] } };
    return { status: 404 };
  };
}

/** The form as it is now: the saved V3 (consent withdrawn), maybe with more changes. */
const parsed = (sha: string) => {
  const r = parseFileData(PATH, TEXT[sha]!);
  if (!r.ok) throw new Error(r.error);
  return r.data;
};

async function openPerson(
  o: Parameters<typeof boot>[0] = {},
  form: Record<string, unknown> = parsed("c3"),
  hasChanged = false,
) {
  const env = boot({
    github: github(),
    login: "ada-editor",
    site: { liveAt: "2026-10-25T12:00:00Z" },
    ...o,
  });
  env.state.editor = {
    collection: "people",
    slug: "jane-doe",
    data: JSON.parse(JSON.stringify(form)),
    fields: PEOPLE_FIELDS,
    hasChanged,
    path: PATH,
  };
  const col = env.mount(decapEntry("people", "jane-doe", form));
  env.send({ type: "bobalab:ready", v: 1 });
  await flush();
  return { env, col };
}

async function openHistory(
  env: Awaited<ReturnType<typeof openPerson>>["env"],
  col: Awaited<ReturnType<typeof openPerson>>["col"],
) {
  button(col.inst.tree, "History")!.props.onClick!.call(null);
  await flush(80);
}

const rowOf = (tree: unknown, sha: string) =>
  findAll(tree, (n) => n.type === "button" && n.props["data-sha"] === sha)[0]!;

describe("History (spec §4.2)", () => {
  it("lists every save newest first, with who, what changed, when, Current version and Not live yet", async () => {
    const { env, col } = await openPerson();
    await openHistory(env, col);
    const items = findAll(
      col.inst.tree,
      (n) => n.type === "li" && String(n.props.className).startsWith("bl-history__item"),
    );
    expect(items.map(textOf)).toEqual([
      "ICIsabelle Cho changed Position title, Image, Photo alt text and 3 moreAGO(2026-10-26T18:00:00Z)Current versionNot live yet",
      "JBJazz Beecham changed Position title, ProgramAGO(2026-10-25T10:00:00Z)",
      "JBJazz Beecham created this entryAGO(2026-10-24T17:02:00Z)",
    ]);
    const time = findAll(col.inst.tree, (n) => n.type === "time")[0]!;
    expect(time.props).toMatchObject({
      dateTime: "2026-10-26T18:00:00Z",
      title: "FULLZ(2026-10-26T18:00:00Z)",
    });
    // Avatars are decorative.
    expect(findAll(col.inst.tree, (n) => n.type === "img").every((n) => n.props.alt === "")).toBe(
      true,
    );
    // The top row offers Undo; its parent is the version before it.
    rowOf(col.inst.tree, "c3").props.onClick!.call(null);
    expect(button(col.inst.tree, "Undo this change")).toBeDefined();
  });

  it("a new entry has no history yet; the local demo says where History comes from", async () => {
    const env = boot({ mode: "local" });
    env.state.editor = {
      collection: "news",
      slug: null,
      newRecord: true,
      data: {},
      fields: NEWS_FIELDS,
    };
    const col = env.mount(decapEntry("news", "", { title: "x" }, { newRecord: true }));
    button(col.inst.tree, "History")!.props.onClick!.call(null);
    const text = textOf(col.inst.tree);
    expect(text).toContain(
      "History is read from GitHub (bobalabx/bobalab-web), not from your computer.",
    );
    expect(text).toContain("No history yet. The first row appears when you save.");
  });

  it("shows the unsaved changes on top while the form has them", async () => {
    const { env, col } = await openPerson({}, { ...parsed("c3"), program: "Changed" }, true);
    await openHistory(env, col);
    expect(textOf(col.inst.tree)).toContain("Your unsaved changes (not saved yet)");
  });

  it("masks personal details whose switch is off now: no values, the switch named", async () => {
    const { env, col } = await openPerson();
    await openHistory(env, col);
    rowOf(col.inst.tree, "c3").props.onClick!.call(null);
    const detail = findAll(
      col.inst.tree,
      (n) => n.props.className === "bl-history__changes",
    )[0]!.children.map(textOf);
    expect(detail).toEqual([
      "Position title: “Student” → “Researcher”",
      "Image: removed (hidden: Photo consent is off)",
      "Photo alt text (required with a photo): removed (hidden: Photo consent is off)",
      "Photo consent: on → off",
      "Email: changed (hidden: Email public is off)",
      "Email public: on → off",
    ]);
    expect(detail.join(" ")).not.toMatch(/jane\.doe@new\.example|jane@example\.edu|jane\.jpg/);
    // Unlisted now: every personal detail is hidden, behind Listed.
    const { live } = boot();
    expect(
      live._maskFor(
        "email" as never,
        { listed: false, email_public: true } as never,
        "people" as never,
        PEOPLE_FIELDS as never,
      ),
    ).toBe("Listed");
    expect(
      live._maskFor(
        "links.cv" as never,
        { listed: true } as never,
        "people" as never,
        PEOPLE_FIELDS as never,
      ),
    ).toBeNull();
    expect(
      live._maskFor("email" as never, { listed: true } as never, "news" as never, [] as never),
    ).toBeNull();
  });

  it("selecting an older row shows EXACTLY what Restore would save: the withdrawn photo never comes back", async () => {
    const { env, col } = await openPerson();
    await openHistory(env, col);
    rowOf(col.inst.tree, "c1").props.onClick!.call(null);
    await flush(80);
    const current = parsed("c3");
    const restore = env.live._buildRestorePatch(
      current as never,
      parsed("c1") as never,
      PEOPLE_FIELDS as never,
      {
        unhide: false,
        personal: false,
        collection: "people",
        uploads: new Set(["/uploads/people/jane.jpg"]),
      } as never,
    ) as Plan;
    const expected = env.live._applyPatches(current as never, restore.patches as never);
    const overlay = env.last("bobalab:overlay") as { data: Record<string, unknown> };
    expect(overlay.data).toEqual(expected);
    expect(overlay.data.photo_consent).toBe(false);
    expect(overlay.data.photo ?? "").toBe("");
    expect(overlay.data.email_public).toBe(false);
    // The column switched to the preview, with the amber band.
    const text = textOf(col.inst.tree);
    expect(text).toContain(
      "Older version · saved by Jazz Beecham on FULL(2026-10-24T17:02:00Z). The form still has the current text; Save saves the form, not this version.",
    );
    expect(text).toContain("“Photo consent” stays off");
    expect(text).toContain("Images show the file that is at that address today.");
    const addr = findAll(col.inst.tree, (n) => n.props.className === "bl-live__address")[0];
    expect(textOf(addr)).toBe(
      "localhost:3100/#people · older version · FULL(2026-10-24T17:02:00Z)",
    );
    // Back to the current version: the form's data again.
    button(col.inst.tree, "Back to the current version")!.props.onClick!.call(null);
    expect((env.last("bobalab:overlay") as { data: unknown }).data).toEqual(current);
  });
});

describe("Restore (spec §4.3)", () => {
  it("asks first, with the changes, the later saves, the guards and the tick boxes, then saves", async () => {
    const { env, col } = await openPerson();
    await openHistory(env, col);
    const p = env.live.restoreVersion({
      path: PATH,
      sha: "c1",
      save: true,
      source: "history",
    } as never) as Promise<{
      ok: boolean;
      notes: string[];
    }>;
    await flush(80);
    expect(env.state.confirms).toHaveLength(1);
    const dlg = env.state.confirms[0] as {
      title: string;
      body: unknown[];
      checkboxes: Array<{ id: string; label: string }>;
      confirm: string;
    };
    expect(dlg.title).toBe("Restore the version from FULL(2026-10-24T17:02:00Z)?");
    expect(dlg.confirm).toBe("Restore this version");
    const body = JSON.stringify(dlg.body);
    expect(body).toContain("It replaces 2 later saves:");
    expect(body).toContain("Isabelle Cho, FULL(2026-10-26T18:00:00Z)");
    expect(body).toContain("“Photo consent” stays off");
    expect(body).toContain(
      "It is saved now and the live site updates in about 2 minutes. Nothing is lost: the current version stays in History.",
    );
    // The email is masked (Email public is off now); the photo stays out (no consent).
    expect(body).not.toMatch(/jane@example\.edu|jane\.doe@new\.example|jane\.jpg/);
    expect(body).toContain("Email: changed (hidden: Email public is off)");
    expect(dlg.checkboxes.map((c) => c.id)).toEqual(["check", "personal"]);
    expect(dlg.checkboxes[1]!.label).toBe(
      "Also bring back removed personal details (email, now at, photo, CV)",
    );
    expect(env.state.saves).toBe(1);
    expect(env.state.patches).toHaveLength(1);
    expect(env.state.patches[0]!.map((x) => x.path)).toEqual(["title", "program", "email"]);
    env.finishSave(true, PATH);
    await env.clock.advance(400);
    const r = await p;
    expect(r.ok).toBe(true);
    expect(
      env.state.announced.some((a) => a.startsWith("Restored the version from DATE(2026-10-24)")),
    ).toBe(true);
  });

  it("'Let me check it in the form first' puts the values in the form and does not save", async () => {
    const { env, col } = await openPerson({
      confirm: () => ({ ok: true, checked: { check: true } }),
    });
    await openHistory(env, col);
    const r = (await env.live.restoreVersion({
      path: PATH,
      sha: "c2",
      save: true,
      source: "history",
    } as never)) as {
      ok: boolean;
    };
    expect(r.ok).toBe(true);
    expect(env.state.patches).toHaveLength(1);
    expect(env.state.saves).toBe(0);
    expect(textOf(col.inst.tree)).toContain(
      "The form now has the version from DATE(2026-10-25). Check it, then press Save.",
    );
  });

  it("the dialog gives the focus back to the button that opened it, inside Decap's preview frame", async () => {
    const { env, col } = await openPerson({ confirm: () => ({ ok: false }) });
    await openHistory(env, col);
    // The Restore button is in Decap's srcdoc frame: the admin page only knows
    // that the frame has the focus, so the opener is the frame document's own.
    const restoreButton = { tagName: "BUTTON", focus() {} };
    (col.inst.props.document as Record<string, unknown>).activeElement = restoreButton;
    await env.live.restoreVersion({
      path: PATH,
      sha: "c1",
      save: true,
      source: "history",
    } as never);
    expect(env.state.confirms).toHaveLength(1);
    expect((env.state.confirms[0] as { returnFocus?: unknown }).returnFocus).toBe(restoreButton);
  });

  it("Cancel in the dialog changes nothing", async () => {
    const { env, col } = await openPerson({ confirm: () => ({ ok: false }) });
    await openHistory(env, col);
    const r = (await env.live.restoreVersion({
      path: PATH,
      sha: "c1",
      save: true,
      source: "history",
    } as never)) as {
      ok: boolean;
    };
    expect(r.ok).toBe(false);
    expect(env.state.patches).toEqual([]);
    expect(env.state.saves).toBe(0);
  });

  it("a blocked save keeps the values in the form, says so, and [Cancel restore] puts the form back", async () => {
    const { env, col } = await openPerson();
    await openHistory(env, col);
    const p = env.live.restoreVersion({
      path: PATH,
      sha: "c2",
      save: true,
      source: "history",
    } as never) as Promise<{
      ok: boolean;
    }>;
    await flush(80);
    env.finishSave(false); // a check refused the save
    await env.clock.advance(2000);
    expect((await p).ok).toBe(false);
    const text = textOf(col.inst.tree);
    expect(text).toContain(
      "These are the values from DATE(2026-10-25). Fix the marked problem, then press Save.",
    );
    expect(env.state.patches[0]).toEqual([
      { path: "title", value: "Student" },
      { path: "email", value: "jane@example.edu" },
    ]);
    button(col.inst.tree, "Cancel restore")!.props.onClick!.call(null);
    expect(env.state.patches[1]).toEqual([
      { path: "title", value: "Researcher" },
      { path: "email", value: "jane.doe@new.example" },
    ]);
    expect(env.state.editor!.data).toMatchObject({
      title: "Researcher",
      email: "jane.doe@new.example",
    });
    expect(textOf(col.inst.tree)).not.toContain("These are the values from");
  });

  it("with unsaved changes, History's restore asks to replace them", async () => {
    const { env, col } = await openPerson({}, { ...parsed("c3"), program: "Typed" }, true);
    await openHistory(env, col);
    void env.live.restoreVersion({
      path: PATH,
      sha: "c2",
      save: false,
      source: "history",
    } as never);
    await flush(80);
    const dlg = env.state.confirms[0] as { body: unknown[] };
    expect(dlg.body[0]).toBe(
      "Replace your unsaved changes with the version from FULL(2026-10-25T10:00:00Z)?",
    );
  });
});

describe("Undo (spec §4.3 step 1, §4.4)", () => {
  it("restores the parent at once on its own entry, without a dialog and without personal details", async () => {
    const { env } = await openPerson(
      {},
      { ...V1, email: "", photo: "", photo_alt: "", photo_consent: true },
      false,
    );
    // The form is V1 with the email and photo removed; Undo goes back to c2 (which has them).
    const r = env.live.restoreVersion({
      path: PATH,
      sha: "c2",
      save: true,
      source: "undo",
    } as never) as Promise<{
      ok: boolean;
      notes: string[];
    }>;
    await flush(80);
    expect(env.state.confirms).toEqual([]);
    expect(env.state.saves).toBe(1);
    const patched = env.state.patches[0]!.map((x) => x.path);
    expect(patched).toContain("program");
    expect(patched).not.toContain("email");
    expect(patched).not.toContain("photo");
    env.finishSave(true, PATH);
    await env.clock.advance(400);
    const res = await r;
    expect(res.ok).toBe(true);
    expect(res.notes).toContain(
      "Email and Photo were not brought back. To bring back removed personal details, use History.",
    );
    expect(
      env.state.toasts.some((t) =>
        String(t.text).includes("Email and Photo were not brought back"),
      ),
    ).toBe(true);
  });

  it("on another entry it does not patch: it opens the saved entry's History instead", async () => {
    const env = boot({ github: github(), login: "ada-editor" });
    env.state.editor = {
      collection: "news",
      slug: "2026-10-07-other",
      data: { title: "Other" },
      fields: NEWS_FIELDS,
      path: "content/news/2026-10-07-other.md",
    };
    env.mount(decapEntry("news", "2026-10-07-other", { title: "Other" }));
    const r = (await env.live.restoreVersion({
      path: PATH,
      sha: "c2",
      save: true,
      source: "undo",
    } as never)) as {
      ok: boolean;
      routed?: boolean;
    };
    expect(r).toMatchObject({ ok: false, routed: true });
    expect(env.state.patches).toEqual([]);
    expect(env.state.saves).toBe(0);
    expect(env.location.hash).toBe("#/collections/people/entries/jane-doe");
    expect(JSON.parse(env.session.getItem("bobalab.live.intent")!)).toMatchObject({
      path: PATH,
      tab: "history",
      select: "top",
    });
    expect(env.state.announced).toContain("Undo is in this entry's History");
  });

  it("with unsaved changes it does not patch either: History opens with the top row selected", async () => {
    const { env, col } = await openPerson({}, { ...parsed("c3"), program: "Typed" }, true);
    const r = (await env.live.restoreVersion({
      path: PATH,
      sha: "c2",
      save: true,
      source: "undo",
    } as never)) as {
      routed?: boolean;
    };
    expect(r.routed).toBe(true);
    expect(env.state.patches).toEqual([]);
    await flush(80);
    const tab = findAll(col.inst.tree, (n) => n.props.id === "bl-live-tab-history")[0]!;
    expect(tab.props["aria-selected"]).toBe("true");
    expect(rowOf(col.inst.tree, "c3").props["aria-expanded"]).toBe("true");
    expect(button(col.inst.tree, "Undo this change")).toBeDefined();
    expect(env.session.getItem("bobalab.live.intent")).toBeNull();
  });

  it("the intent opens History when the entry's editor opens", async () => {
    const { env, col } = await openPerson({
      session: {
        "bobalab.live.intent": JSON.stringify({
          path: PATH,
          tab: "history",
          select: "top",
          at: Date.parse("2026-10-26T20:00:00Z"),
        }),
      },
    });
    await flush(80);
    expect(
      findAll(col.inst.tree, (n) => n.props.id === "bl-live-tab-history")[0]!.props[
        "aria-selected"
      ],
    ).toBe("true");
    expect(rowOf(col.inst.tree, "c3").props["aria-expanded"]).toBe("true");
    expect(env.session.getItem("bobalab.live.intent")).toBeNull();
  });
});

describe("Restore right after a save in the same editor (Decap's out-of-date copy)", () => {
  /** Decap opens the entry again: its copy is now the saved file, which the form shows. */
  async function reopen(
    env: Awaited<ReturnType<typeof openPerson>>["env"],
    data: Record<string, unknown>,
  ) {
    env.state.stale = JSON.parse(JSON.stringify(data));
    env.state.editor = {
      collection: "people",
      slug: "jane-doe",
      data: JSON.parse(JSON.stringify(data)),
      fields: PEOPLE_FIELDS,
      hasChanged: false,
      path: PATH,
    };
    const col = env.mount(decapEntry("people", "jane-doe", data));
    env.send({ type: "bobalab:ready", v: 1 });
    await flush(40);
    await env.clock.advance(1); // the resumed restore starts on the next turn
    await flush(80);
    return col;
  }

  it("reopens the entry and finishes the restore there, without asking again", async () => {
    // The editor saved "Visiting" over c3 in this editor; Decap's own copy is still c3,
    // so putting c3's values back looks like "no change" to Decap (no Save button).
    const saved = { ...parsed("c3"), title: "Visiting" };
    const { env, col } = await openPerson({ staleCopy: parsed("c3") }, saved, false);
    const r = (await env.live.restoreVersion({
      path: PATH,
      sha: "c3",
      save: true,
      source: "undo",
    })) as { ok: boolean; reopened?: boolean };
    expect(r).toMatchObject({ ok: true, reopened: true });
    expect(env.state.saves).toBe(0);
    expect(env.location.hash).toBe("#/collections/people");
    expect(JSON.parse(env.session.getItem("bobalab.live.intent")!)).toMatchObject({
      path: PATH,
      restore: { sha: "c3", source: "undo", unhide: false, personal: false },
    });
    await env.clock.advance(300);
    expect(env.location.hash).toBe("#/collections/people/entries/jane-doe");
    col.unmount();
    await reopen(env, saved);
    expect(env.state.confirms).toEqual([]); // Undo never asks
    expect(env.state.saves).toBe(1);
    expect(env.state.patches[env.state.patches.length - 1]).toEqual([
      { path: "title", value: "Researcher" },
    ]);
    expect(env.session.getItem("bobalab.live.intent")).toBeNull();
  });

  it("a restore from History keeps the editor's answers (personal details) when it resumes", async () => {
    const form = { ...parsed("c3"), email: "" };
    const { env, col } = await openPerson(
      { confirm: () => ({ ok: true, checked: { personal: true } }) },
      form,
      false,
    );
    await openHistory(env, col);
    // Decap's copy happens to be exactly what the restore puts in the form.
    const plan = env.live._buildRestorePatch(form, parsed("c2"), PEOPLE_FIELDS, {
      personal: true,
      collection: "people",
      uploads: new Set(["/uploads/people/jane.jpg"]),
    }) as Plan;
    env.state.stale = env.live._applyPatches(form, plan.patches) as Record<string, unknown>;
    const r = (await env.live.restoreVersion({
      path: PATH,
      sha: "c2",
      save: true,
      source: "history",
    })) as { ok: boolean; reopened?: boolean };
    expect(r).toMatchObject({ ok: true, reopened: true });
    expect(env.state.confirms).toHaveLength(1);
    expect(JSON.parse(env.session.getItem("bobalab.live.intent")!).restore).toMatchObject({
      sha: "c2",
      source: "history",
      personal: true,
    });
    await env.clock.advance(300);
    col.unmount();
    await reopen(env, form);
    expect(env.state.confirms).toHaveLength(1); // not asked again
    expect(env.state.saves).toBe(1);
    expect(env.state.patches[env.state.patches.length - 1]!.map((p) => p.path)).toContain("email");
  });
});

describe("the status line (spec §2.6)", () => {
  it("names the last save and opens History", async () => {
    const { env, col } = await openPerson();
    await flush(40);
    const status = button(col.inst.tree, /^Last saved by /)!;
    expect(status).toBeDefined();
    expect(textOf(status)).toBe("Last saved by Isabelle Cho · AGO(2026-10-26T18:00:00Z)");
    status.props.onClick!();
    await flush(60);
    expect(
      findAll(col.inst.tree, (n) => n.props.id === "bl-live-tab-history")[0]!.props[
        "aria-selected"
      ],
    ).toBe("true");
    expect(env.state.github.some((p) => p.includes("per_page=30"))).toBe(true);
  });

  it("is not shown in the local demo (History there is GitHub's, not this computer's)", async () => {
    const { col } = await openPerson({ mode: "local" });
    await flush(40);
    expect(button(col.inst.tree, /^Last saved by /)).toBeUndefined();
  });
});
