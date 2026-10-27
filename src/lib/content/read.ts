/**
 * Reading content files: disk → virtual files. The parsing itself
 * (`parseContentFiles`, `splitFrontMatter`, `parseFileData`, the Issue and
 * RawContent types) is pure and lives in ./parse.ts, re-exported here, so tests
 * can build content in memory and the browser can parse files too.
 */
import fs from "node:fs";
import path from "node:path";
import type { VirtualFile } from "./parse";

export * from "./parse";

/** Recursively read text files under `dir` (relative forward-slash paths). */
export function readContentFiles(dir: string): VirtualFile[] {
  const out: VirtualFile[] = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (abs: string, rel: string) => {
    for (const d of fs.readdirSync(abs, { withFileTypes: true })) {
      const a = path.join(abs, d.name);
      const r = rel ? `${rel}/${d.name}` : d.name;
      if (d.isDirectory()) {
        if (d.name === "node_modules") continue;
        walk(a, r);
      } else if (/\.(md|ya?ml|json)$/i.test(d.name)) {
        out.push({ path: r, text: fs.readFileSync(a, "utf8") });
      }
    }
  };
  walk(dir, "");
  return out;
}

/** Resolve CONTENT_DIR (default ./content, relative to the process cwd). */
export function contentDir(): string {
  return path.resolve(process.cwd(), process.env.CONTENT_DIR || "content");
}
