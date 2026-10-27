/**
 * WP1 (editor v2, spec §2.12): the site pipeline and the page views run in the
 * browser too (the editor live preview, src/app/editor-preview), so nothing
 * they import, directly or through other modules, may need Node or the App
 * Router's server-only notFound(). A static scan of the import graph from the
 * client-safe entry points, following value imports (type-only imports are
 * erased by the compiler), finds no node:*, fs, path, child_process,
 * server-only or notFound.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const SRC = path.join(ROOT, "src");

const FORBIDDEN = /^(node:.*|fs|fs\/promises|path|child_process|server-only)$/;

interface Import {
  spec: string;
  names: string;
}

/** Value imports and re-exports of a module (type-only ones left out). */
function valueImports(source: string): Import[] {
  // JSDoc blocks may quote import lines; only line-leading block comments are dropped.
  const code = source.replace(/^\s*\/\*[\s\S]*?\*\//gm, "");
  const out: Import[] = [];
  const statement =
    /^[ \t]*(import|export)\s+(type\s+)?([\s\S]*?)\s*from\s*["']([^"']+)["']|^[ \t]*import\s*["']([^"']+)["']/gm;
  for (const m of code.matchAll(statement)) {
    if (m[5]) {
      out.push({ spec: m[5], names: "" }); // side effect: import "./x.css"
      continue;
    }
    if (m[2]) continue; // import type … / export type …
    const names = m[3] ?? "";
    const braces = /\{([\s\S]*)\}/.exec(names);
    const outside = braces ? names.replace(braces[0], "").replace(/[,\s]/g, "") : names.trim();
    // `import { type A, type B } from` imports nothing at runtime.
    if (braces && !outside) {
      const parts = braces[1]!
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length && parts.every((p) => p.startsWith("type "))) continue;
    }
    out.push({ spec: m[4]!, names });
  }
  for (const m of code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g))
    out.push({ spec: m[1]!, names: "*" });
  return out;
}

function resolve(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null; // a package
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`])
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  throw new Error(`cannot resolve ${spec} from ${path.relative(ROOT, from)}`);
}

/** Every module reachable through value imports, and each forbidden import with its chain. */
function scan(entries: string[]) {
  const seen = new Map<string, string[]>(); // file → import chain from an entry point
  const problems: string[] = [];
  const queue: Array<[string, string[]]> = entries.map((e) => [e, [path.relative(ROOT, e)]]);
  while (queue.length) {
    const [file, chain] = queue.shift()!;
    if (seen.has(file)) continue;
    seen.set(file, chain);
    if (!/\.(ts|tsx)$/.test(file)) continue; // CSS and JSON imports are leaves
    for (const imp of valueImports(fs.readFileSync(file, "utf8"))) {
      const where = `${chain.join(" → ")} → ${imp.spec}`;
      if (FORBIDDEN.test(imp.spec)) problems.push(where);
      if (imp.spec === "next/navigation" && /\bnotFound\b/.test(imp.names))
        problems.push(`${where} (notFound)`);
      const next = resolve(file, imp.spec);
      if (next) queue.push([next, [...chain, path.relative(ROOT, next)]]);
    }
  }
  return {
    files: [...seen.keys()].map((f) => path.relative(ROOT, f).replace(/\\/g, "/")),
    problems,
  };
}

const VIEWS = path.join(SRC, "components", "views");
const ENTRIES = [
  "lib/content/build.ts",
  "lib/content/parse.ts",
  "lib/content/links.ts",
  "lib/content/copy-rules.ts",
  "lib/content/validate.ts",
  "lib/preview/mark.ts",
  "lib/preview/assets.ts",
].map((p) => path.join(SRC, p));

describe("client-safe modules (the editor live preview runs them in the browser)", () => {
  const views = fs
    .readdirSync(VIEWS)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => path.join(VIEWS, f));

  it("there are the 12 page views of the interface", () => {
    expect(views.map((v) => path.basename(v, ".tsx")).sort()).toEqual(
      [
        "AboutView",
        "DirectionPageView",
        "HomeView",
        "JoinView",
        "NewsArticleView",
        "NewsListView",
        "ProjectDetailView",
        "ProjectsView",
        "PublicationDetailView",
        "PublicationsView",
        "ResearchView",
        "TextPageView",
      ].sort(),
    );
  });

  it("nothing reachable from the pipeline, validator, marks, assets or views needs Node or notFound()", () => {
    const r = scan([...ENTRIES, ...views]);
    expect(r.problems).toEqual([]);
    // The scan really walked the component tree (and Img, which used to read the
    // media manifest with fs).
    expect(r.files.length).toBeGreaterThan(80);
    expect(r.files).toContain("src/components/ui/Img.tsx");
    expect(r.files).toContain("src/lib/content/queries.ts");
    expect(r.files).not.toContain("src/lib/content/load.ts");
    expect(r.files).not.toContain("src/lib/content/read.ts");
  });

  it("the views leave citation-js out (the citation box is a slot)", () => {
    const r = scan(views);
    expect(r.files).not.toContain("src/components/publications/CitationBlock.tsx");
    expect(r.files).not.toContain("src/lib/publications/citation.ts");
  });

  it("the scan does find what it looks for (fs in read.ts, notFound in a route)", () => {
    expect(scan([path.join(SRC, "lib/content/read.ts")]).problems.join("\n")).toMatch(/node:fs/);
    expect(scan([path.join(SRC, "lib/content/load.ts")]).problems.join("\n")).toMatch(/node:path/);
    expect(scan([path.join(SRC, "app/research/[direction]/page.tsx")]).problems.join("\n")).toMatch(
      /notFound/,
    );
  });

  it("type-only imports are not followed; mixed imports are", () => {
    expect(valueImports('import type { A } from "node:fs";')).toEqual([]);
    expect(valueImports('import { type A, type B } from "fs";')).toEqual([]);
    expect(valueImports('import { type A, b } from "fs";').map((i) => i.spec)).toEqual(["fs"]);
    expect(valueImports('export * from "./build";').map((i) => i.spec)).toEqual(["./build"]);
    expect(valueImports('export type { X } from "./read";')).toEqual([]);
    expect(valueImports('import "./x.css";').map((i) => i.spec)).toEqual(["./x.css"]);
    expect(valueImports('/**\n * import { a } from "fs";\n */\nconst x = 1;')).toEqual([]);
    expect(valueImports('const m = await import("@/lib/content/parse");')[0]?.spec).toBe(
      "@/lib/content/parse",
    );
  });
});
