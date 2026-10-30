/**
 * public/admin/cms-history.js: saved versions of an entry, read from GitHub
 * (editor v2, spec §4.1): commit kinds from the content manager's commit
 * messages (in the order of Interfaces §3), authors, file text at a version
 * (kept in memory and sessionStorage), files on main, the editor's own save,
 * Recent changes, and the words for what changed (with privacy masking).
 */
import { describe, expect, it } from "vitest";
import {
  CMS_DATA,
  boot,
  fixture,
  requested,
  routes,
  type Answer,
  type BootOptions,
} from "./github-helpers";

interface Version {
  sha: string;
  parentSha: string | null;
  date: string;
  author: { login: string | null; name: string; avatarUrl: string | null };
  subject: string;
  kind: string;
  url: string;
  entry?: { collection: string; slug: string; label: string; name: string; text: string } | null;
  uploadPath?: string;
}
interface FieldChange {
  name: string;
  label: string;
  change: string;
  before?: string;
  after?: string;
}
interface Api {
  pathOf(c: string, s: string): string | null;
  entryOfPath(p: string): { collection: string; slug: string; label: string } | null;
  parseSubject(m: string): Record<string, unknown>;
  versions(p: string, o?: Record<string, unknown>): Promise<{ rows: Version[]; hasMore: boolean }>;
  latest(p: string, o?: Record<string, unknown>): Promise<Version | null>;
  textAt(p: string, sha: string): Promise<string | null>;
  fileAtMain(p: string): Promise<string | null>;
  treeCount(folder: string, ext: string): Promise<number>;
  uploadPaths(): Promise<Set<string>>;
  mine(o: Record<string, unknown>): Promise<Version | null>;
  recent(o?: Record<string, unknown>): Promise<{ rows: Version[]; hasMore: boolean }>;
  diff(a: unknown, b: unknown, fields: unknown[]): FieldChange[];
  display(c: FieldChange, o?: { mask?: string }): string;
  sameData(a: unknown, b: unknown): boolean;
}

const people = fixture("commits-content-people.json");
const main = fixture("commits-main.json");
const cms = fixture("commits-cms-synthetic.json");
const isabelle = fixture("contents-isabelle-cho-715bd47.json");

function setup(o: Partial<BootOptions> = {}) {
  const b = boot({ files: ["cms-ui.js", "cms-github.js", "cms-history.js"], ...o });
  return { ...b, h: b.win.BobalabHistory as Api };
}

const ok = (r: { headers: Record<string, string>; body: unknown }): Answer => ({
  status: 200,
  headers: r.headers,
  body: r.body,
});

describe("cms-history.js: paths and commit kinds", () => {
  const { h } = setup();

  it("maps entries to repository paths and back", () => {
    expect(h.pathOf("news", "2026-10-07-x")).toBe("content/news/2026-10-07-x.md");
    expect(h.pathOf("people", "isabelle-cho")).toBe("content/people/isabelle-cho.md");
    expect(h.pathOf("pages", "home")).toBe("content/pages/home.yml");
    expect(h.pathOf("settings", "site")).toBe("content/site.yml");
    expect(h.pathOf("pages", "nope")).toBeNull();
    expect(h.pathOf("nope", "x")).toBeNull();
    expect(h.entryOfPath("content/people/isabelle-cho.md")).toMatchObject({
      collection: "people",
      slug: "isabelle-cho",
      label: "Person",
      text: "Person › isabelle-cho",
    });
    expect(h.entryOfPath("content/site.yml")).toMatchObject({
      collection: "settings",
      slug: "site",
      label: "Site",
    });
    expect(h.entryOfPath("content/README.md")).toBeNull();
  });

  it("uses its built-in collection list until cms-data.js has one", () => {
    const bare = setup({ cmsData: {} }).h;
    expect(bare.pathOf("directions", "trust")).toBe("content/directions/trust.md");
    expect(bare.pathOf("pages", "privacy")).toBe("content/pages/privacy.yml");
  });

  it("parses the content manager's commit messages, Upload/Delete file first", () => {
    const p = (m: string) => h.parseSubject(m);
    expect(p("Delete file “public/uploads/people/old.jpg” (by @ben-editor)")).toMatchObject({
      kind: "delete-file",
      path: "public/uploads/people/old.jpg",
      login: "ben-editor",
    });
    expect(p("Upload “public/uploads/people/isabelle-cho.jpg” (by @ben-editor)")).toMatchObject({
      kind: "upload",
      path: "public/uploads/people/isabelle-cho.jpg",
    });
    expect(p("Add Person “jane-doe” (by @ada-editor)")).toMatchObject({
      kind: "create",
      login: "ada-editor",
      entry: { collection: "people", slug: "jane-doe", label: "Person" },
    });
    expect(p("Edit News item “2026-10-07-informs-talk” (by @ada-editor)")).toMatchObject({
      kind: "edit",
      entry: {
        collection: "news",
        slug: "2026-10-07-informs-talk",
        name: "News item “2026-10-07-informs-talk”",
      },
    });
    expect(p("Delete News item “2026-10-07-x” (by @ada-editor)")).toMatchObject({ kind: "delete" });
    expect(p("Edit Pages “home” (by @ada-editor)")).toMatchObject({
      kind: "edit",
      entry: { collection: "pages", slug: "home", label: "Home page", text: "Pages › Home page" },
    });
    expect(p("Edit Settings “site” (by @ada-editor)").entry).toMatchObject({
      name: "Settings “Site”",
    });
    // Decap's own default messages
    expect(p("Update Publication “doe-2026-trust”")).toMatchObject({
      kind: "edit",
      login: null,
      entry: { collection: "publications", slug: "doe-2026-trust" },
    });
    expect(p("Create News item “2026-10-07-x”")).toMatchObject({ kind: "create" });
    expect(p("Upload “public/uploads/x.pdf”")).toMatchObject({
      kind: "upload",
      path: "public/uploads/x.pdf",
    });
    // the deploy's bookkeeping, and everything else
    expect(p("chore(content): record published slugs after deploy 14c739c")).toMatchObject({
      kind: "system",
    });
    expect(p('People: new members and photos; "Graduate students" group\n\nbody')).toEqual({
      kind: "maintainer",
      subject: 'People: new members and photos; "Graduate students" group',
    });
    // a label that is no collection: still an edit, without an entry
    expect(p("Edit Widgets “x” (by @a)")).toMatchObject({ kind: "edit", entry: null });
  });
});

describe("cms-history.js: versions from the recorded GitHub answers", () => {
  it("lists the versions of a file, newest first, with author, kind and parent", async () => {
    const b = setup({ fetch: routes([[/\/commits\?/, ok(people)]]) });
    const { rows, hasMore } = await b.h.versions("content/people/isabelle-cho.md");
    expect(requested(b.calls)).toEqual([
      "/repos/bobalabx/bobalab-web/commits?sha=main&path=content/people/isabelle-cho.md&per_page=30&page=1",
    ]);
    expect(hasMore).toBe(false);
    expect(rows).toHaveLength(7);
    const top = rows[0]!;
    expect(top).toEqual({
      sha: "715bd47b7c54d015af9a906ef41fddd45b10cff6",
      parentSha: expect.stringMatching(/^587ed7e/),
      date: "2026-10-26T06:43:11Z",
      author: {
        login: "J12aGuan",
        name: "Jiaming Guan",
        avatarUrl: "https://avatars.githubusercontent.com/u/96441175?v=4",
      },
      subject: 'People: new members and photos; "Graduate students" group',
      kind: "maintainer",
      url: "https://github.com/bobalabx/bobalab-web/commit/715bd47b7c54d015af9a906ef41fddd45b10cff6",
    });
    // Every recorded commit was made outside the content manager.
    expect(new Set(rows.map((r) => r.kind))).toEqual(new Set(["maintainer"]));
    expect(new Set(rows.map((r) => r.author.login))).toEqual(new Set(["J12aGuan"]));
  });

  it("says there are older versions when GitHub sends a next page", async () => {
    const b = setup({ fetch: routes([[/\/commits\?/, ok(main)]]) });
    const r = await b.h.versions("content", { page: 2, perPage: 12 });
    expect(requested(b.calls)[0]).toContain("&per_page=12&page=2");
    expect(r.hasMore).toBe(true);
    expect(r.rows.map((x) => x.sha.slice(0, 7))).toContain("14c739c");
  });

  it("takes the name from the commit and falls back to the message's @login", async () => {
    const b = setup({ fetch: routes([[/\/commits\?/, ok(cms)]]) });
    const { rows } = await b.h.versions("content");
    const bySha = (s: string) => rows.find((r) => r.sha.startsWith(s))!;
    expect(bySha("a9").author).toEqual({
      login: "ada-editor",
      name: "Ada Editor",
      avatarUrl: "https://avatars.githubusercontent.com/u/1000001?v=4",
    });
    // No GitHub account on the commit: the name from git, no login, no avatar.
    expect(bySha("a2").author).toEqual({ login: null, name: "Jiaming Guan", avatarUrl: null });
    expect(bySha("a2").kind).toBe("maintainer");
    expect(bySha("a1").author.login).toBe("ada-editor");
    expect(rows.map((r) => r.kind)).toEqual([
      "edit",
      "delete-file",
      "upload",
      "create",
      "edit",
      "edit",
      "system",
      "maintainer",
      "edit",
    ]);
  });

  it("latest(): one row, remembered for 15 s unless fresh", async () => {
    const b = setup({
      fetch: routes([
        [/\/commits\?/, ok({ headers: {}, body: (people.body as unknown[]).slice(0, 1) })],
      ]),
    });
    const v = await b.h.latest("content/people/isabelle-cho.md");
    expect(v!.sha.slice(0, 7)).toBe("715bd47");
    expect(requested(b.calls)[0]).toContain("&per_page=1&page=1");
    await b.h.latest("content/people/isabelle-cho.md");
    expect(b.calls).toHaveLength(1);
    await b.h.latest("content/people/isabelle-cho.md", { fresh: true });
    expect(b.calls).toHaveLength(2);
    await b.clock.advance(16000);
    await b.h.latest("content/people/isabelle-cho.md");
    expect(b.calls).toHaveLength(3);
  });

  it("latest() is null for a file with no commits", async () => {
    const b = setup({ fetch: () => ({ status: 200, body: [] }) });
    expect(await b.h.latest("content/news/new.md")).toBeNull();
  });
});

describe("cms-history.js: file text", () => {
  const SHA = "715bd47b7c54d015af9a906ef41fddd45b10cff6";

  it("reads the raw text at a version once, then from memory and from sessionStorage", async () => {
    const answer = () => ({ status: 200, body: isabelle.body });
    const b = setup({ fetch: answer });
    const t = await b.h.textAt("content/people/isabelle-cho.md", SHA);
    expect(t).toContain("name: Isabelle Cho");
    expect(requested(b.calls)).toEqual([
      `/repos/bobalabx/bobalab-web/contents/content/people/isabelle-cho.md?ref=${SHA}`,
    ]);
    expect(b.calls[0]!.headers.Accept).toBe("application/vnd.github.raw+json");
    expect(await b.h.textAt("content/people/isabelle-cho.md", SHA)).toBe(t);
    expect(b.calls).toHaveLength(1);
    // A reload in the same tab: sessionStorage still has it.
    const again = setup({
      fetch: answer,
      session: { "bobalab.gh.text.v1": b.session.getItem("bobalab.gh.text.v1")! },
    });
    expect(await again.h.textAt("content/people/isabelle-cho.md", SHA)).toBe(t);
    expect(again.calls).toHaveLength(0);
  });

  it("is null when the file did not exist at that version, and remembers that too", async () => {
    const b = setup({ fetch: () => ({ status: 404, body: { message: "Not Found" } }) });
    expect(await b.h.textAt("content/news/x.md", "abc")).toBeNull();
    expect(await b.h.textAt("content/news/x.md", "abc")).toBeNull();
    expect(b.calls).toHaveLength(1);
  });

  it("keeps at most 2 MB in sessionStorage, dropping the oldest first", async () => {
    const big = "x".repeat(400 * 1024);
    const b = setup({ fetch: () => ({ status: 200, body: big }) });
    for (let i = 0; i < 8; i++) await b.h.textAt("content/news/x.md", "sha" + i);
    const stored = b.session.getItem("bobalab.gh.text.v1")!;
    expect(stored.length).toBeLessThanOrEqual(2 * 1024 * 1024);
    const s = JSON.parse(stored) as { keys: string[] };
    expect(s.keys[s.keys.length - 1]).toBe("content/news/x.md@sha7");
    expect(s.keys).not.toContain("content/news/x.md@sha0");
  });

  it("works when sessionStorage refuses to store", async () => {
    const b = setup({ fetch: () => ({ status: 200, body: "text" }) });
    b.session.throwOnSet = true;
    expect(await b.h.textAt("content/news/x.md", "s1")).toBe("text");
    expect(await b.h.textAt("content/news/x.md", "s1")).toBe("text");
    expect(b.calls).toHaveLength(1);
  });

  it("fileAtMain(): the file on main, read again every time; null when absent", async () => {
    const b = setup({
      fetch: routes([
        [/published-slugs/, { status: 404, body: {} }],
        [/site\.yml\?ref=main$/, { status: 200, body: "name: BOBALAB\n" }],
      ]),
    });
    expect(await b.h.fileAtMain("content/.published-slugs.json")).toBeNull();
    expect(await b.h.fileAtMain("content/site.yml")).toBe("name: BOBALAB\n");
    expect(await b.h.fileAtMain("content/site.yml")).toBe("name: BOBALAB\n");
    expect(requested(b.calls)).toEqual([
      "/repos/bobalabx/bobalab-web/contents/content/.published-slugs.json?ref=main",
      "/repos/bobalabx/bobalab-web/contents/content/site.yml?ref=main",
      "/repos/bobalabx/bobalab-web/contents/content/site.yml?ref=main",
    ]);
  });
});

describe("cms-history.js: files on main", () => {
  const trees = routes([
    [/git\/trees\/main:content\/news$/, ok(fixture("tree-content-news.json"))],
    [/git\/trees\/main:content\/pages$/, ok(fixture("tree-content-pages.json"))],
    [/git\/trees\/main:public\/uploads\?recursive=1$/, ok(fixture("tree-public-uploads.json"))],
  ]);

  it("treeCount(): one tree read per folder, counting files with the extension", async () => {
    const b = setup({ fetch: trees });
    expect(await b.h.treeCount("content/news", ".md")).toBe(19);
    expect(await b.h.treeCount("content/news", "md")).toBe(19);
    expect(await b.h.treeCount("content/pages", ".yml")).toBe(5);
    expect(await b.h.treeCount("content/projects", ".md")).toBe(0); // not in the fixture: 404
    expect(requested(b.calls)[0]).toBe("/repos/bobalabx/bobalab-web/git/trees/main:content/news");
  });

  it("treeCount() fails when GitHub cannot be reached (the preview then says it is incomplete)", async () => {
    const b = setup({
      fetch: () => {
        throw new TypeError("Failed to fetch");
      },
    });
    await expect(b.h.treeCount("content/news", ".md")).rejects.toMatchObject({ kind: "network" });
  });

  it("uploadPaths(): every upload's public path", async () => {
    const b = setup({ fetch: trees });
    const set = await b.h.uploadPaths();
    expect(set.has("/uploads/people/isabelle-cho.jpg")).toBe(true);
    expect(set.has("/uploads/people")).toBe(false); // folders are not files
    expect(set.size).toBe(29);
  });
});

describe("cms-history.js: the editor's own save and Recent changes", () => {
  const path = "content/news/2026-10-07-informs-talk.md";
  const list = (rows: unknown[]) => routes([[/\/commits\?/, { status: 200, body: rows }]]);

  it("mine(): the editor's newest commit of the file that is not the starting version", async () => {
    const rows = (cms.body as Array<{ sha: string }>).slice(0, 5);
    const b = setup({ fetch: list(rows) });
    const v = await b.h.mine({ login: "Ada-Editor", path, since: "2026-10-26T20:10:00Z" });
    expect(requested(b.calls)[0]).toContain(
      "commits?sha=main&path=content/news/2026-10-07-informs-talk.md&per_page=5&page=1",
    );
    expect(v!.sha.startsWith("a9")).toBe(true);
    // the version the editor started from is skipped
    expect(
      (await b.h.mine({ login: "ada-editor", path, notSha: rows[0]!.sha }))!.sha.startsWith("a6"),
    ).toBe(true);
    expect(
      (await b.h.mine({
        login: "ada-editor",
        path,
        notSha: [rows[0]!.sha, rows[3]!.sha],
      }))!.sha.startsWith("a5"),
    ).toBe(true);
    // older than the click (minus 2 minutes of clock slack): not this save
    expect(
      await b.h.mine({
        login: "ada-editor",
        path,
        notSha: rows[0]!.sha,
        since: "2026-10-26T20:15:00Z",
      }),
    ).toBeNull();
    expect(await b.h.mine({ login: "someone-else", path })).toBeNull();
  });

  it("recent(): content and uploads merged by commit, newest first", async () => {
    const all = cms.body as Array<{ sha: string; commit: { message: string } }>;
    const content = all.filter((c) => !/^(Upload|Delete file)/.test(c.commit.message));
    const uploads = [all[1], all[2], all[0]]; // a9 also touched an upload
    const b = setup({
      fetch: routes([
        [
          /path=content&/,
          {
            status: 200,
            body: content,
            headers: { link: '<https://api.github.com/x?page=2>; rel="next"' },
          },
        ],
        [/path=public\/uploads&/, { status: 200, body: uploads }],
      ]),
    });
    const r = await b.h.recent();
    expect(requested(b.calls).sort()).toEqual([
      "/repos/bobalabx/bobalab-web/commits?sha=main&path=content&per_page=30&page=1",
      "/repos/bobalabx/bobalab-web/commits?sha=main&path=public/uploads&per_page=30&page=1",
    ]);
    expect(r.hasMore).toBe(true);
    expect(r.rows.map((x) => x.sha.slice(0, 2))).toEqual([
      "a9",
      "a8",
      "a7",
      "a6",
      "a5",
      "a4",
      "a3",
      "a2",
      "a1",
    ]);
    const upload = r.rows[2]!;
    expect(upload).toMatchObject({
      kind: "upload",
      uploadPath: "public/uploads/people/isabelle-cho.jpg",
      entry: null,
    });
    expect(r.rows[0]!.entry).toMatchObject({ collection: "news", slug: "2026-10-07-informs-talk" });
    expect(r.rows[7]!).toMatchObject({ kind: "maintainer", entry: null });
  });
});

describe("cms-history.js: what changed, in words", () => {
  const { h } = setup();
  const fields = [
    { name: "name", label: "Name", widget: "string" },
    { name: "listed", label: "Listed", widget: "boolean" },
    { name: "email", label: "Email", widget: "string" },
    { name: "photo", label: "Photo", widget: "image" },
    { name: "directions", label: "Research directions", widget: "relation", multiple: true },
    {
      name: "links",
      label: "Links",
      widget: "object",
      fields: [
        { name: "website", label: "Website", widget: "string" },
        { name: "cv", label: "CV", widget: "file" },
      ],
    },
    { name: "body", label: "Bio", widget: "markdown" },
  ];

  it("compares top-level fields (object fields per sub-field) and says how each changed", () => {
    const before = {
      name: "Isabelle Cho",
      listed: true,
      email: "",
      photo: "/uploads/people/isabelle-cho.jpg",
      directions: ["trust"],
      links: { website: "https://example.org", cv: "/uploads/cv.pdf" },
      body: "Old bio.",
    };
    const after = {
      name: "Isabelle Cho",
      listed: false,
      email: "icho@example.org",
      directions: ["trust", "algorithms"],
      links: { website: "https://example.org" },
      body: "New bio, much longer.",
    };
    expect(h.diff(before, after, fields)).toEqual([
      { name: "listed", label: "Listed", change: "changed", before: "on", after: "off" },
      { name: "email", label: "Email", change: "added", after: "icho@example.org" },
      {
        name: "photo",
        label: "Photo",
        change: "removed",
        before: "/uploads/people/isabelle-cho.jpg",
      },
      {
        name: "directions",
        label: "Research directions",
        change: "changed",
        before: "trust",
        after: "trust, algorithms",
      },
      { name: "links.cv", label: "Links › CV", change: "removed", before: "/uploads/cv.pdf" },
      { name: "body", label: "Bio", change: "changed" },
    ]);
  });

  it("a new entry (no earlier version): every filled field is added", () => {
    const d = h.diff(null, { name: "Jane Doe", listed: true, email: "" }, fields);
    expect(d.map((c) => [c.name, c.change])).toEqual([
      ["name", "added"],
      ["listed", "added"],
    ]);
  });

  it("ignores what Decap's rewriting changes: key order, spaces, empty values, false", () => {
    expect(
      h.diff(
        { name: "A", directions: [], links: {}, listed: false },
        { listed: undefined, name: " A ", email: "", links: { cv: "" } },
        fields,
      ),
    ).toEqual([]);
  });

  it("display(): short sentences, and no values at all when masked", () => {
    const d = h.diff(
      { name: "Old", email: "old@example.org", listed: true, body: "x" },
      { name: "New", email: "new@example.org", listed: false, body: "y" },
      fields,
    );
    expect(d.map((c) => h.display(c))).toEqual([
      "Name: “Old” → “New”",
      "Listed: on → off",
      "Email: “old@example.org” → “new@example.org”",
      "Bio: changed",
    ]);
    const masked = h.display(d[2]!, { mask: "Email public" });
    expect(masked).toBe("Email: changed (hidden: Email public is off)");
    expect(masked).not.toContain("example.org");
    expect(h.display({ name: "photo", label: "Photo", change: "removed", before: "/x.jpg" })).toBe(
      "Photo: removed",
    );
    expect(
      h.display(
        { name: "photo", label: "Photo", change: "added", after: "/x.jpg" },
        { mask: "Photo consent" },
      ),
    ).toBe("Photo: added (hidden: Photo consent is off)");
    expect(
      h.display({ name: "x", label: "Year", change: "changed", before: "2024", after: "2025" }),
    ).toBe("Year: 2024 → 2025");
  });

  it("“Visible on the website” reads the stored draft the other way round: Yes → No (D-21)", () => {
    const vis = [{ name: "draft", label: "Visible on the website", widget: "visible" }];
    const hid = h.diff({ draft: false }, { draft: true }, vis);
    expect(hid).toEqual([
      {
        name: "draft",
        label: "Visible on the website",
        change: "changed",
        before: "Yes",
        after: "No",
      },
    ]);
    expect(h.display(hid[0]!)).toBe("Visible on the website: Yes → No");
    expect(h.display(h.diff({ draft: true }, {}, vis)[0]!)).toBe(
      "Visible on the website: No → Yes",
    );
    // Not set is Yes, as the schema's default; a new hidden entry reads from that default.
    expect(h.diff({}, { draft: false }, vis)).toEqual([]);
    expect(h.diff(null, { draft: false }, vis)).toEqual([]);
    expect(h.display(h.diff(null, { draft: true }, vis)[0]!)).toBe(
      "Visible on the website: Yes → No",
    );
  });

  it("sameData(): equal parsed data despite Decap's rewriting (restore detection)", () => {
    const old = {
      title: "Talk",
      date: "2026-10-07",
      people: ["a", "b"],
      link: { label: "Slides", url: "https://x" },
    };
    const rewritten = {
      link: { url: "https://x", label: "Slides" },
      people: ["a", "b"],
      draft: false,
      date: "2026-10-07",
      title: "Talk ",
      tags: [],
    };
    expect(h.sameData(old, rewritten)).toBe(true);
    expect(h.sameData(old, { ...old, people: ["b", "a"] })).toBe(false);
    expect(h.sameData(old, { ...old, draft: true })).toBe(false);
    expect(h.sameData(null, {})).toBe(true);
  });
});

describe("cms-history.js loads alone", () => {
  it("without a DOM, without cms-data.js", () => {
    const b = boot({ files: ["cms-github.js", "cms-history.js"], dom: false, cmsData: null });
    const h = b.win.BobalabHistory as Api;
    expect(h.pathOf("news", "x")).toBe("content/news/x.md");
    expect(CMS_DATA.collections).toHaveLength(8);
  });
});
