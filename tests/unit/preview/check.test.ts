/**
 * WP2 (spec §3.6e, §9): the site check blocks only the problems a save
 * introduces, in any file, by running the deploy's own rules on the saved site
 * with and without the change.
 */
import { describe, expect, it } from "vitest";
import { baseRaw, checkSave, liveProblems, type CheckState } from "@/lib/preview/check";
import type { PreviewBase } from "@/lib/preview/protocol";
import { CONTENT, TODAY, dataOf, decapBase, withData } from "./helpers";

const { base, publishedSlugs } = decapBase(CONTENT);
const ORIGINS = ["https://bobalabx.github.io"];
const state = (b: PreviewBase = base, extra: Partial<CheckState> = {}): CheckState => ({
  base: b,
  complete: true,
  publishedSlugs,
  today: TODAY,
  origins: ORIGINS,
  ...extra,
});
const live = <K extends keyof PreviewBase>(c: K) => base[c].filter((e) => e.data.draft !== true);
const codes = (xs: Array<{ code: string }>) => xs.map((i) => i.code);

const news = live("news")[0]!;
const project = live("projects")[0]!;
const pubs = [...live("publications")].sort((a, b) => a.slug.localeCompare(b.slug));
const dirs = live("directions").filter((d) => d.data.status !== "archived");
const person = live("people").find((p) => p.data.listed === true && p.data.role !== "pi")!;

describe("checkSave", () => {
  it("an unchanged entry passes", () => {
    for (const [c, e] of [
      ["news", news],
      ["projects", project],
      ["people", person],
    ] as const) {
      const r = checkSave(state(), {
        entry: { collection: c, slug: e.slug },
        isNew: false,
        data: dataOf(base, c, e.slug),
      });
      expect(r, `${c}/${e.slug}`).toEqual({ available: true, blocking: [], warnings: [] });
    }
  });

  it("is unavailable until the base is loaded and complete (a dropped base file)", () => {
    const input = {
      entry: { collection: "news" as const, slug: news.slug },
      isNew: false,
      data: {},
    };
    expect(checkSave(state(base, { complete: false }), input)).toEqual({
      available: false,
      blocking: [],
      warnings: [],
    });
    expect(checkSave({ ...state(), base: null }, input).available).toBe(false);
  });

  it("a schema problem blocks, on the edited file", () => {
    const r = checkSave(state(), {
      entry: { collection: "news", slug: news.slug },
      isNew: false,
      data: { ...dataOf(base, "news", news.slug), title: "" },
    });
    expect(r.blocking).toEqual([
      expect.objectContaining({ code: "E_SCHEMA", file: `news/${news.slug}.md`, field: "title" }),
    ]);
  });

  it("a cross-file duplicate title blocks and names the other file", () => {
    const [first, second] = [pubs[0]!, pubs[1]!];
    // Editing the earlier file: the build reads files in order, so the error lands on the OTHER one.
    const r = checkSave(state(), {
      entry: { collection: "publications", slug: first.slug },
      isNew: false,
      data: { ...dataOf(base, "publications", first.slug), title: second.data.title },
    });
    expect(r.available).toBe(true);
    expect(r.blocking).toEqual([
      expect.objectContaining({
        code: "E_DUP_TITLE",
        file: `publications/${second.slug}.md`,
        message: `title duplicates publications/${first.slug}.md`,
      }),
    ]);
  });

  it("pre-existing errors never block, in the edited file or elsewhere", () => {
    const p = pubs[0]!;
    const broken = withData(base, "publications", p.slug, (d) => ({
      ...d,
      status: "under-review",
      as_of: undefined,
    }));
    expect(
      codes(
        checkSave(state(broken), {
          entry: { collection: "news", slug: news.slug },
          isNew: false,
          data: { ...dataOf(broken, "news", news.slug), title: "Edited" },
        }).blocking,
      ),
    ).toEqual([]);
    const sameEntry = checkSave(state(broken), {
      entry: { collection: "publications", slug: p.slug },
      isNew: false,
      data: { ...dataOf(broken, "publications", p.slug), in_brief: "Edited." },
    });
    expect(sameEntry.blocking).toEqual([]);
    // A saved entry the preview could not read (a data-shape problem) cancels out too.
    const shape = withData(base, "news", news.slug, (d) => ({ ...d, type: "gossip" }));
    const r = checkSave(state(shape), {
      entry: { collection: "news", slug: news.slug },
      isNew: false,
      data: { ...dataOf(shape, "news", news.slug), title: "Edited" },
    });
    expect(r.blocking).toEqual([]);
  });

  it("E_COLOR_DUP blocks when Settings switches `launched` on", () => {
    const [a, b] = [dirs[0]!, dirs[1]!];
    const same = withData(base, "directions", b.slug, (d) => ({ ...d, color: a.data.color }));
    const site = dataOf(same, "settings", "site");
    const off = checkSave(state(same), {
      entry: { collection: "settings", slug: "site" },
      isNew: false,
      data: site,
    });
    expect(off.blocking).toEqual([]);
    const on = checkSave(state(same), {
      entry: { collection: "settings", slug: "site" },
      isNew: false,
      data: { ...site, launched: true },
    });
    expect(on.blocking).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "E_COLOR_DUP", field: "color" })]),
    );
    expect(on.blocking.find((i) => i.code === "E_COLOR_DUP")!.file).toMatch(/^directions\//);
  });

  it("E_LINK_HIDDEN blocks hiding a project that a news item links to", () => {
    const linked = withData(base, "news", news.slug, (d) => ({
      ...d,
      body: `See [the project](/projects/${project.slug}/) for more.`,
    }));
    const r = checkSave(state(linked), {
      entry: { collection: "projects", slug: project.slug },
      isNew: false,
      data: { ...dataOf(linked, "projects", project.slug), draft: true },
    });
    expect(r.blocking).toEqual([
      expect.objectContaining({
        code: "E_LINK_HIDDEN",
        file: `news/${news.slug}.md`,
        field: "body",
      }),
    ]);
    // An absolute link on the site's own origin counts too.
    const absolute = withData(base, "news", news.slug, (d) => ({
      ...d,
      body: `See https://bobalabx.github.io/projects/${project.slug}/.`,
    }));
    expect(
      codes(
        checkSave(state(absolute), {
          entry: { collection: "projects", slug: project.slug },
          isNew: false,
          data: { ...dataOf(absolute, "projects", project.slug), draft: true },
        }).blocking,
      ),
    ).toEqual(["E_LINK_HIDDEN"]);
  });

  it("hiding a published page is a warning (W_PUBLISHED_HIDDEN), not a block", () => {
    const published = { projects: [project.slug], people: [person.slug] };
    const st = state(base, { publishedSlugs: published });
    const hide = checkSave(st, {
      entry: { collection: "projects", slug: project.slug },
      isNew: false,
      data: { ...dataOf(base, "projects", project.slug), draft: true },
    });
    expect(hide.blocking).toEqual([]);
    expect(hide.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "W_PUBLISHED_HIDDEN",
          file: `projects/${project.slug}.md`,
          field: "draft",
        }),
      ]),
    );
    const unlist = checkSave(st, {
      entry: { collection: "people", slug: person.slug },
      isNew: false,
      data: { ...dataOf(base, "people", person.slug), listed: false },
    });
    expect(codes(unlist.blocking)).not.toContain("E_REDIRECT_MISSING");
  });

  it("a reference to a draft does not block (it is a warning)", () => {
    const q = pubs[2]!;
    const drafted = withData(base, "publications", q.slug, (d) => ({ ...d, draft: true }));
    const r = checkSave(state(drafted), {
      entry: { collection: "news", slug: news.slug },
      isNew: false,
      data: { ...dataOf(drafted, "news", news.slug), publications: [q.slug] },
    });
    expect(r.blocking).toEqual([]);
    expect(codes(r.warnings)).toContain("W_DRAFT_REFERENCE");
  });

  it("a new entry's predicted or missing address never blocks (cms-hooks owns new slugs)", () => {
    const data = { date: "2026-10-26", type: "lab-life", title: "A new item" };
    for (const slug of ["", "new-news", "not-a-dated-slug"]) {
      const r = checkSave(state(), { entry: { collection: "news", slug }, isNew: true, data });
      expect(r, slug).toEqual({ available: true, blocking: [], warnings: [] });
    }
    // The same address on an existing entry would block: the drop is for new entries only.
    expect(
      codes(
        checkSave(state(), { entry: { collection: "news", slug: "new-news" }, isNew: false, data })
          .blocking,
      ),
    ).toEqual(["E_SLUG"]);
    const pub = checkSave(state(), {
      entry: { collection: "publications", slug: "" },
      isNew: true,
      data: {
        title: "A new paper",
        authors: [{ name: "Ada Lovelace" }],
        type: "working-paper",
        status: "in-progress",
        as_of: "2026-10",
        status_source: "documented",
        directions: [dirs[0]!.slug],
      },
    });
    expect(pub.blocking).toEqual([]);
  });

  it("the homepage copy rules block too", () => {
    const home = dataOf(base, "pages", "home");
    const r = checkSave(state(), {
      entry: { collection: "pages", slug: "home" },
      isNew: false,
      data: { ...home, why: Array.from({ length: 45 }, () => "go").join(" ") },
    });
    expect(codes(r.blocking)).toEqual(expect.arrayContaining(["E_HOME_WHY_LONG"]));
  });

  it("uses the posted data, never what the live problems last saw", () => {
    const [first, second] = [pubs[0]!, pubs[1]!];
    const entry = { collection: "publications" as const, slug: first.slug };
    const dup = { ...dataOf(base, "publications", first.slug), title: second.data.title };
    expect(codes(liveProblems(state(), { entry, isNew: false, data: dup }).blocking)).toEqual([
      "E_DUP_TITLE",
    ]);
    expect(
      checkSave(state(), { entry, isNew: false, data: dataOf(base, "publications", first.slug) }),
    ).toEqual({ available: true, blocking: [], warnings: [] });
  });
});

describe("liveProblems", () => {
  it("splits schema problems off as stillNeeded", () => {
    const [first, second] = [pubs[0]!, pubs[1]!];
    const p = liveProblems(state(), {
      entry: { collection: "publications", slug: first.slug },
      isNew: false,
      data: { ...dataOf(base, "publications", first.slug), title: second.data.title, year: 1 },
    });
    // The strict entry fails (year), so it is not applied: the duplicate cannot show yet.
    expect(p.available).toBe(true);
    expect(p.stillNeeded).toEqual([expect.objectContaining({ code: "E_SCHEMA", field: "year" })]);
    expect(p.blocking).toEqual([]);
  });

  it("without an overlay there is nothing to report; unavailable still lists stillNeeded", () => {
    expect(liveProblems(state(), null)).toEqual({
      available: true,
      blocking: [],
      warnings: [],
      stillNeeded: [],
    });
    const p = liveProblems(state(base, { complete: false }), {
      entry: { collection: "news", slug: news.slug },
      isNew: false,
      data: { ...dataOf(base, "news", news.slug), title: "" },
    });
    expect(p.available).toBe(false);
    expect(p.blocking).toEqual([]);
    expect(p.stillNeeded.map((i) => i.field)).toEqual(["title"]);
  });
});

describe("caching", () => {
  it("rawA is built once per base message", () => {
    const st = state();
    expect(baseRaw(st)).toBe(baseRaw(state()));
    const copy = { ...base };
    expect(baseRaw(state(copy))).not.toBe(baseRaw(st));
    expect(baseRaw({ base: null, publishedSlugs: null })).toBeNull();
  });
});
