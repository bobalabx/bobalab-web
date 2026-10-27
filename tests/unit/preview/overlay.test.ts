/**
 * WP2 (spec §2.2, §9): the form's draft put into the saved site.
 *   - tidy() is cms-hooks.js clean() on plain data;
 *   - the strict overlay (the site check) is exactly the saved file's entry, or
 *     E_SCHEMA on the edited file with the saved version kept;
 *   - the lenient overlay (the render) always shows something: placeholders for
 *     missing required fields, the last good value for an invalid one, dropped
 *     optional fields, then the last valid version or the saved one;
 *   - pages fill raw.pages, Settings raw.site;
 *   - the editor view forces the edited entry visible, and only it.
 */
import { describe, expect, it } from "vitest";
import { buildContent } from "@/lib/content/build";
import { COLLECTION_SCHEMAS, PAGE_SCHEMAS, siteSchema } from "@/lib/content/schema";
import { rawFromBase } from "@/lib/preview/base";
import {
  LENIENT_PASSES,
  PLACEHOLDERS,
  applyLenient,
  applyStrict,
  entryOf,
  forceVisible,
  tidy,
} from "@/lib/preview/overlay";
import type { DecapCollection } from "@/lib/preview/protocol";
import { fromJS, runAdminScripts, toJS } from "../cms/helpers";
import { CONTENT, TODAY, dataOf, decapBase } from "./helpers";

const { base, publishedSlugs } = decapBase(CONTENT);
const raw = rawFromBase(base, { publishedSlugs });
const opts = { today: TODAY };
const news = base.news.find((n) => n.data.draft !== true)!;
const pub = base.publications.find((p) => p.data.draft !== true)!;
const listed = base.people.find((p) => p.data.listed === true && p.data.draft !== true)!;
const draftProject = base.projects.find((p) => p.data.draft === true);

describe("tidy()", () => {
  const { window } = runAdminScripts(["cms-data.js", "cms-hooks.js"]);
  const clean = (window.BobalabCmsHooks as { clean: (v: unknown) => unknown }).clean;
  const cases: unknown[] = [
    { title: "  A title  ", summary: "", location: "   ", n: 0, b: false, list: [] },
    { link: { label: "", url: "" }, image: { image: "/uploads/a.jpg", alt: " A " } },
    { authors: [{ name: " A ", person: "" }, { name: "" }, {}], tags: ["x", "", " y "] },
    { nested: { a: { b: { c: "" } } }, keep: [[], ["", "z"]] },
    { body: "\n  Hello  \n", empty: null, gone: undefined },
  ];
  it.each(cases.map((c, i) => [i, c]))("case %i equals cms-hooks clean()", (_i, c) => {
    expect(tidy(c)).toEqual(toJS(clean(fromJS(c))));
  });
});

describe("strict overlay (the site check)", () => {
  it("replaces the saved entry with the edited one, as the deploy would read it", () => {
    const data = { ...dataOf(base, "news", news.slug), title: "  New title  ", body: "\n\nHi\n" };
    const r = applyStrict(raw, { collection: "news", slug: news.slug }, data);
    expect(r.schemaIssues).toEqual([]);
    const e = r.raw.entries.news.find((n) => n.slug === news.slug)!;
    expect(e).toMatchObject({ title: "New title", body: "Hi", file: `news/${news.slug}.md` });
    expect(r.raw.entries.news).toHaveLength(raw.entries.news.length);
    // The input raw is untouched.
    expect(raw.entries.news.find((n) => n.slug === news.slug)!.title).not.toBe("New title");
  });

  it("adds a new entry in file order", () => {
    const r = applyStrict(
      raw,
      { collection: "news", slug: "2026-10-26-a-new-item" },
      { date: "2026-10-26", type: "lab-life", title: "A new item" },
    );
    expect(r.schemaIssues).toEqual([]);
    const files = r.raw.entries.news.map((n) => n.file);
    expect(files).toContain("news/2026-10-26-a-new-item.md");
    expect(files).toEqual([...files].sort((a, b) => a.localeCompare(b)));
  });

  it("gives E_SCHEMA on the edited file and keeps the saved version when the schema fails", () => {
    const data = { ...dataOf(base, "news", news.slug), title: "", date: "soon" };
    const r = applyStrict(raw, { collection: "news", slug: news.slug }, data);
    expect(r.raw).toBe(raw);
    expect(r.schemaIssues.map((i) => [i.severity, i.code, i.file, i.field])).toEqual(
      expect.arrayContaining([
        ["error", "E_SCHEMA", `news/${news.slug}.md`, "date"],
        ["error", "E_SCHEMA", `news/${news.slug}.md`, "title"],
      ]),
    );
  });

  it("maps pages to raw.pages[slug] and Settings to raw.site", () => {
    const home = applyStrict(
      raw,
      { collection: "pages", slug: "home" },
      { ...dataOf(base, "pages", "home"), statement: "A new statement." },
    );
    expect(home.raw.pages.home?.statement).toBe("A new statement.");
    const site = applyStrict(
      raw,
      { collection: "settings", slug: "site" },
      { ...dataOf(base, "settings", "site"), email: "new@berkeley.edu" },
    );
    expect(site.raw.site?.email).toBe("new@berkeley.edu");
    expect(applyStrict(raw, { collection: "pages", slug: "nope" }, {}).raw).toBe(raw);
  });

  it("a new entry without an address yet is new-<collection>", () => {
    expect(entryOf({ collection: "news", slug: "" })).toEqual({
      collection: "news",
      slug: "new-news",
    });
    const r = applyStrict(raw, { collection: "people", slug: "" }, { name: "A B", role: "phd" });
    expect(r.raw.entries.people.some((p) => p.slug === "new-people")).toBe(true);
  });
});

describe("lenient overlay (the render)", () => {
  it.each(Object.keys(PLACEHOLDERS) as DecapCollection[])(
    "PLACEHOLDERS.%s passes its schema",
    (c) => {
      const p = PLACEHOLDERS[c](TODAY);
      if (c === "settings") expect(siteSchema.safeParse(p).success).toBe(true);
      else if (c === "pages")
        for (const s of Object.values(PAGE_SCHEMAS)) expect(s.safeParse(p).success).toBe(true);
      else expect(COLLECTION_SCHEMAS[c].safeParse(p).success).toBe(true);
    },
  );

  it("a new publication with only a title renders, with placeholders", () => {
    const r = applyLenient(
      raw,
      { collection: "publications", slug: "" },
      { title: "A paper being typed" },
      null,
      opts,
    );
    expect(r.stillNeeded.map((i) => i.field)).toEqual(
      expect.arrayContaining(["authors", "type", "status"]),
    );
    const c = buildContent(r.raw, { preview: false, today: TODAY });
    const p = c.getPublication("new-publications");
    expect(p?.title).toBe("A paper being typed");
    expect(p?.authors).toEqual([{ name: "(Author not filled in yet)" }]);
  });

  it("missing required fields get the placeholder text", () => {
    const r = applyLenient(
      raw,
      { collection: "news", slug: "" },
      { body: "Just a body" },
      null,
      opts,
    );
    const n = buildContent(r.raw, { preview: false, today: TODAY }).getNews("new-news")!;
    expect(n.title).toBe("(Title not filled in yet)");
    expect(n.date).toBe(TODAY);
    expect(n.body).toBe("Just a body");
  });

  it("invalid optional fields are dropped; a bad list item goes, the list stays", () => {
    const data = {
      ...dataOf(base, "publications", pub.slug),
      doi: "not a doi",
      links: { pdf: "/uploads/x.pdf", ssrn: "nope" },
      authors: [{ name: "Ada Lovelace" }, { name: "", url: "ftp://x" }],
    };
    const r = applyLenient(raw, { collection: "publications", slug: pub.slug }, data, null, opts);
    const e = r.raw.entries.publications.find((p) => p.slug === pub.slug)!;
    expect(e.doi).toBeUndefined();
    expect(e.links).toEqual({ pdf: "/uploads/x.pdf" });
    expect(e.authors).toEqual([{ name: "Ada Lovelace" }]);
    expect(r.stillNeeded.length).toBeGreaterThan(0);
  });

  it("an invalid field keeps its last good value; a valid edit becomes the last good version", () => {
    const entry = { collection: "news" as const, slug: news.slug };
    const good = applyLenient(
      raw,
      entry,
      { ...dataOf(base, "news", news.slug), title: "Good title" },
      null,
      opts,
    );
    expect(good.stillNeeded).toEqual([]);
    expect(good.lastGood?.key).toBe(`news/${news.slug}`);
    const bad = applyLenient(
      raw,
      entry,
      { ...dataOf(base, "news", news.slug), title: "x".repeat(400), date: "2026-13-45" },
      good.lastGood,
      opts,
    );
    const e = bad.raw.entries.news.find((n) => n.slug === news.slug)!;
    expect(e.title).toBe("Good title");
    expect(e.date).toBe(news.data.date);
    expect(bad.lastGood).toBe(good.lastGood);
    expect(bad.stillNeeded.map((i) => i.field).sort()).toEqual(["date", "title"]);
    // Another entry's last good version is never used.
    const other = applyLenient(
      raw,
      { collection: "news", slug: "" },
      { title: "x".repeat(400) },
      good.lastGood,
      opts,
    );
    expect(other.raw.entries.news.find((n) => n.slug === "new-news")!.title).toBe(
      "(Title not filled in yet)",
    );
  });

  it(`gives up after ${LENIENT_PASSES} passes: the last valid version, else the saved one`, () => {
    const entry = { collection: "news" as const, slug: news.slug };
    const saved = raw.entries.news.find((n) => n.slug === news.slug)!;
    const valid = { ...dataOf(base, "news", news.slug), title: "Last valid" };
    const invalid = { ...dataOf(base, "news", news.slug), title: "" };
    const good = applyLenient(raw, entry, valid, null, opts);
    // With no repair pass left, the last valid version shows …
    const r1 = applyLenient(raw, entry, invalid, good.lastGood, { ...opts, passes: 0 });
    expect(r1.raw.entries.news.find((n) => n.slug === news.slug)!.title).toBe("Last valid");
    expect(r1.stillNeeded.map((i) => i.field)).toEqual(["title"]);
    // … else the saved one; a new entry without a valid version is not shown yet.
    const r2 = applyLenient(raw, entry, invalid, null, { ...opts, passes: 0 });
    expect(r2.raw.entries.news.find((n) => n.slug === news.slug)).toEqual(saved);
    const r3 = applyLenient(raw, { collection: "news", slug: "" }, { title: "" }, null, {
      ...opts,
      passes: 0,
    });
    expect(r3.raw).toBe(raw);
    // The default passes repair it.
    expect(
      applyLenient(raw, entry, invalid, null, opts).raw.entries.news.find(
        (n) => n.slug === news.slug,
      )!.title,
    ).toBe("(Title not filled in yet)");
  });

  it("Settings and pages render from the overlay", () => {
    const site = applyLenient(
      raw,
      { collection: "settings", slug: "site" },
      { ...dataOf(base, "settings", "site"), email: "" },
      null,
      opts,
    );
    expect(site.raw.site?.email).toBe(PLACEHOLDERS.settings(TODAY).email);
    expect(site.stillNeeded.map((i) => i.field)).toEqual(["email"]);
    const home = applyLenient(
      raw,
      { collection: "pages", slug: "home" },
      { ...dataOf(base, "pages", "home"), statement: "Typed just now." },
      null,
      opts,
    );
    expect(home.raw.pages.home?.statement).toBe("Typed just now.");
  });
});

describe("editor view", () => {
  it("forces only the edited entry visible", () => {
    const entry = { collection: "people" as const, slug: listed.slug };
    const drafted = applyLenient(
      raw,
      entry,
      { ...dataOf(base, "people", listed.slug), draft: true },
      null,
      opts,
    ).raw;
    expect(buildContent(drafted, { preview: false, today: TODAY }).getPerson(listed.slug)).toBe(
      undefined,
    );
    const shown = forceVisible(drafted, entry);
    expect(
      buildContent(shown, { preview: false, today: TODAY }).getPerson(listed.slug),
    ).toBeDefined();
    if (draftProject) {
      // Other drafts stay hidden.
      expect(
        buildContent(shown, { preview: false, today: TODAY }).getProject(draftProject.slug),
      ).toBeUndefined();
    }
    // Listed off is not Draft: the editor view never shows an unlisted person.
    const unlisted = forceVisible(
      applyLenient(
        raw,
        entry,
        { ...dataOf(base, "people", listed.slug), listed: false },
        null,
        opts,
      ).raw,
      entry,
    );
    expect(buildContent(unlisted, { preview: false, today: TODAY }).getPerson(listed.slug)).toBe(
      undefined,
    );
  });

  it("forces a draft page visible", () => {
    const entry = { collection: "pages" as const, slug: "about" };
    const drafted = applyLenient(
      raw,
      entry,
      { ...dataOf(base, "pages", "about"), draft: true },
      null,
      opts,
    ).raw;
    expect(buildContent(drafted, { preview: false, today: TODAY }).pages.about).toBeUndefined();
    expect(
      buildContent(forceVisible(drafted, entry), { preview: false, today: TODAY }).pages.about,
    ).toBeDefined();
    expect(forceVisible(raw, entry)).toBe(raw);
  });
});
