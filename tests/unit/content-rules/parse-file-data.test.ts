/**
 * parseFileData(path, text) (src/lib/content/parse.ts; editor v2, spec §2.4,
 * §2.12.2): one content file's data BEFORE the schema, the shape the content
 * manager loads into its form. History and Restore parse old versions with it
 * in the browser. Put through the schema it gives exactly the entry the build
 * loads, for every file of the real content and of a fixture set.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parseContentFiles,
  parseFileData,
  readContentFiles,
  type VirtualFile,
} from "@/lib/content/read";
import {
  COLLECTION_SCHEMAS,
  PAGE_SCHEMAS,
  siteSchema,
  type CollectionName,
} from "@/lib/content/schema";

const FIX = fileURLToPath(new URL("../../fixtures/content/n4/", import.meta.url));
const REAL = fileURLToPath(new URL("../../../content/", import.meta.url));

function data(path: string, text: string): Record<string, unknown> {
  const r = parseFileData(path, text);
  if (!r.ok) throw new Error(`${path}: ${r.error}`);
  return r.data;
}

/** Schema-check parseFileData's output and compare it with what parseContentFiles loaded. */
function parity(files: VirtualFile[]) {
  const raw = parseContentFiles(files);
  let checked = 0;
  for (const f of files) {
    const parts = f.path.split("/");
    if (f.path === "site.yml") {
      expect(siteSchema.parse(data(f.path, f.text)), f.path).toEqual(raw.site);
    } else if (parts[0] === "pages") {
      const name = parts[1]!.replace(/\.yml$/, "") as keyof typeof PAGE_SCHEMAS;
      expect(PAGE_SCHEMAS[name].parse(data(f.path, f.text)), f.path).toEqual(raw.pages[name]);
    } else if (parts.length === 2 && parts[1]!.endsWith(".md") && parts[0]! in COLLECTION_SCHEMAS) {
      const c = parts[0] as CollectionName;
      const slug = parts[1]!.replace(/\.md$/, "");
      const loaded = (raw.entries[c] as Array<Record<string, unknown>>).find(
        (e) => e.slug === slug,
      )!;
      // The build adds slug and file; the schema output is everything else.
      const want = Object.fromEntries(
        Object.entries(loaded).filter(([k]) => k !== "slug" && k !== "file"),
      );
      expect(COLLECTION_SCHEMAS[c].parse(data(`content/${f.path}`, f.text)), f.path).toEqual(want);
    } else continue;
    checked++;
  }
  return checked;
}

describe("parseFileData", () => {
  it("parity with the build on every file of fixture n4", () => {
    expect(parity(readContentFiles(FIX))).toBeGreaterThan(30);
  });

  it.skipIf(!fs.existsSync(REAL))("parity with the build on every file of the real content", () => {
    expect(parity(readContentFiles(REAL))).toBeGreaterThan(100);
  });

  it("returns the data before the schema: no defaults added, unknown keys kept", () => {
    const d = data("news/2026-01-01-x.md", "---\ntitle: X\nlegacy_key: 1\n---\n\nBody text.\n");
    expect(d).toEqual({ title: "X", legacy_key: 1, body: "Body text." });
    expect(d).not.toHaveProperty("draft");
  });

  it("a .md entry always has body: the Markdown after the front matter, trimmed like splitFrontMatter", () => {
    expect(data("people/a-b.md", "---\nname: A B\n---\n").body).toBe("");
    expect(data("people/a-b.md", "---\nname: A B\n---\n\n\n  Hello\n\nWorld  \n\n").body).toBe(
      "  Hello\n\nWorld",
    );
    // A front-matter key called body is replaced by the real body, as in the build.
    expect(data("people/a-b.md", "---\nbody: nope\n---\nyes\n").body).toBe("yes");
  });

  it("accepts the paths with or without content/, with Windows separators, CRLF and a BOM", () => {
    const text = "﻿---\r\ntitle: X\r\n---\r\n\r\nBody\r\n";
    expect(data("content\\news\\2026-01-01-x.md", text)).toEqual({ title: "X", body: "Body" });
    expect(data("content/site.yml", "name: BOBALAB\n")).toEqual({ name: "BOBALAB" });
    expect(data("pages/home.yml", "draft: true\n")).toEqual({ draft: true });
    expect(data("pages/home.yml", "")).toEqual({});
  });

  it.each([
    ["invalid YAML", "news/2026-01-01-x.md", "---\ntitle: [unclosed\n---\n", /^YAML: /],
    ["no front matter", "news/2026-01-01-x.md", "Just text\n", /front matter/],
    ["a list instead of a mapping", "site.yml", "- a\n- b\n", /mapping/],
    ["front matter that is a list", "people/a-b.md", "---\n- a\n---\n", /mapping/],
    ["a file outside the collections", "misc/notes.md", "---\na: 1\n---\n", /not a content file/],
    ["a YAML file in a collection folder", "people/a-b.yml", "name: A\n", /not a content file/],
    ["the published-slugs record", ".published-slugs.json", "{}", /not a content file/],
  ])("refuses %s, in words", (_name, p, text, re) => {
    const r = parseFileData(p, text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(re);
  });

  it("lives in the fs-free parse.ts (read.ts only re-exports it)", async () => {
    const parse = await import("@/lib/content/parse");
    expect(parse.parseFileData).toBe(parseFileData);
  });
});
