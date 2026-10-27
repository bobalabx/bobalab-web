/**
 * WP2 (spec §2.2, §9): rawFromBase() turns the content manager's saved entries
 * into the same RawContent the build reads from the files, so the preview
 * renders, and the site check validates, what the deploy does. Proven on the
 * real content and on every fixture set: same entries, site, pages and
 * published slugs as parseContentFiles(); the same Content in production and
 * preview mode; the same validator results.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildContent, type Content } from "@/lib/content/build";
import { parseContentFiles, type Issue, type RawContent } from "@/lib/content/parse";
import { validateContent } from "@/lib/content/validate";
import { BASE_SCHEMA_CODE, entryInput, normalizeBody, rawFromBase } from "@/lib/preview/base";
import { splitFrontMatter } from "@/lib/content/parse";
import { CONTENT, TODAY, contentSets, decapBase, withData } from "./helpers";

const label = (dir: string) => path.basename(dir);
const sortIssues = (xs: Issue[]) =>
  [...xs].sort((a, b) =>
    `${a.file}|${a.code}|${a.field}|${a.message}`.localeCompare(
      `${b.file}|${b.code}|${b.field}|${b.message}`,
    ),
  );
/** Content as data (the getters are functions, which JSON leaves out). */
const plain = (c: Content) => JSON.parse(JSON.stringify({ ...c, warnings: [] }));
const isEntryOrPage = (file = "") =>
  /^(directions|projects|publications|people|news|opportunities)\/[^/]+\.md$/.test(file) ||
  /^pages\/[^/]+\.ya?ml$/.test(file) ||
  file === "site.yml";

describe.each(contentSets())("rawFromBase on %s", (dir) => {
  const { base, publishedSlugs, files, unreadable } = decapBase(dir);
  const ref = parseContentFiles(files);
  const raw = rawFromBase(base, { publishedSlugs });

  it("has the same entries, site, pages and published slugs as parseContentFiles", () => {
    expect(raw.entries).toEqual(ref.entries);
    expect(raw.site).toEqual(ref.site);
    expect(raw.pages).toEqual(ref.pages);
    expect(raw.publishedSlugs).toEqual(ref.publishedSlugs);
    expect(raw.files).toEqual([]);
  });

  it("lists a schema failure as a warning instead of an error, so the render never throws", () => {
    const expected = ref.issues
      .filter((i) => !unreadable.includes(i.file ?? "") && isEntryOrPage(i.file))
      .map((i) =>
        i.code === "E_SCHEMA" ? { ...i, severity: "warning" as const, code: BASE_SCHEMA_CODE } : i,
      );
    expect(sortIssues(raw.issues)).toEqual(sortIssues(expected));
    expect(raw.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  const structural = ref.issues.some((i) => i.severity === "error");
  it.skipIf(structural)("builds the same Content in production and preview mode", () => {
    for (const preview of [false, true]) {
      const a = buildContent(raw, { preview, today: TODAY });
      const b = buildContent(ref, { preview, today: TODAY });
      expect(plain(a), `${label(dir)} preview=${preview}`).toEqual(plain(b));
    }
  });

  it.skipIf(structural)(
    "gives the same validator results (character coverage needs the files)",
    () => {
      const keep = (xs: Issue[]) =>
        sortIssues(
          xs.filter((i) => i.code !== "W_NON_LATIN1" && isEntryOrPage(i.file ?? "site.yml")),
        );
      expect(keep(validateContent(raw, { today: TODAY }))).toEqual(
        keep(validateContent(ref, { today: TODAY })),
      );
    },
  );
});

describe("rawFromBase details", () => {
  const { base, publishedSlugs } = decapBase(CONTENT);

  it("normalises the body like splitFrontMatter", () => {
    for (const body of ["\n\nText.\n\n", "Text.  \n", "\n  \nA\n\nB\n", "", "\n\n"]) {
      const viaFile = splitFrontMatter(`---\na: 1\n---\n${body}`)!.body;
      expect(normalizeBody(body)).toBe(viaFile);
    }
    expect(entryInput({ title: "x", body: "\n\n" })).toEqual({ title: "x" });
    expect(entryInput({ title: "x", body: "\nHello\n" })).toEqual({ title: "x", body: "Hello" });
  });

  it("keeps every draft (the render and the check decide)", () => {
    const drafts = Object.values(rawFromBase(base, { publishedSlugs }).entries)
      .flat()
      .filter((e) => e.draft);
    const inBase = Object.entries(base)
      .filter(([c]) => c !== "pages" && c !== "settings")
      .flatMap(([, l]) => l)
      .filter((e) => e.data.draft === true);
    expect(drafts.length).toBe(inBase.length);
  });

  it("skips an entry that fails its schema, with one warning per problem on its file", () => {
    const slug = base.news[0]!.slug;
    const broken = withData(base, "news", slug, (d) => ({ ...d, title: "", type: "gossip" }));
    const raw = rawFromBase(broken, { publishedSlugs });
    expect(raw.entries.news.some((n) => n.slug === slug)).toBe(false);
    const w = raw.issues.filter((i) => i.file === `news/${slug}.md`);
    expect(w.map((i) => [i.severity, i.code, i.field])).toEqual(
      expect.arrayContaining([
        ["warning", BASE_SCHEMA_CODE, "title"],
        ["warning", BASE_SCHEMA_CODE, "type"],
      ]),
    );
    expect(() => buildContent(raw, { preview: false, today: TODAY })).not.toThrow();
  });

  it("reads Date values as the plain dates the files hold", () => {
    const slug = base.news[0]!.slug;
    const dated = withData(base, "news", slug, (d) => ({
      ...d,
      date: new Date(`${String(d.date).slice(0, 10)}T00:00:00Z`),
    }));
    const raw = rawFromBase(dated, { publishedSlugs });
    const ref = rawFromBase(base, { publishedSlugs });
    expect(raw.entries.news.find((n) => n.slug === slug)?.date).toBe(
      ref.entries.news.find((n) => n.slug === slug)?.date.slice(0, 10),
    );
  });

  it("treats a missing collection as empty and carries the published slugs", () => {
    const raw: RawContent = rawFromBase(
      { news: base.news, settings: base.settings },
      { publishedSlugs: { news: ["a"], projects: ["b"] } },
    );
    expect(raw.entries.people).toEqual([]);
    expect(raw.pages).toEqual({});
    expect(raw.site).not.toBeNull();
    expect(raw.publishedSlugs).toEqual({ news: ["a"], projects: ["b"] });
  });

  it("sorts entries in file order, like the build", () => {
    const reversed = { ...base, people: [...base.people].reverse() };
    const raw = rawFromBase(reversed, { publishedSlugs });
    const files = raw.entries.people.map((p) => p.file);
    expect(files).toEqual([...files].sort((a, b) => a.localeCompare(b)));
  });
});
