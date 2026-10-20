/** Helpers for content-rule tests: in-memory edits of a fixture set. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import {
  readContentFiles,
  parseContentFiles,
  splitFrontMatter,
  type VirtualFile,
  type Issue,
} from "@/lib/content/read";
import { validateContent } from "@/lib/content/validate";

export const FIXTURES = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "fixtures",
  "content",
);
export const TODAY = "2026-10-20";

export function fixtureFiles(set: string): VirtualFile[] {
  return readContentFiles(path.join(FIXTURES, set));
}

export function validateFiles(files: VirtualFile[]): Issue[] {
  return validateContent(parseContentFiles(files), { today: TODAY });
}

export const codes = (issues: Issue[]) => issues.map((i) => i.code);
export const errors = (issues: Issue[]) => issues.filter((i) => i.severity === "error");

export class Files {
  constructor(public files: VirtualFile[]) {}
  static of(set: string) {
    return new Files(fixtureFiles(set));
  }
  get(p: string) {
    const f = this.files.find((x) => x.path === p);
    if (!f) throw new Error(`fixture file not found: ${p}`);
    return f;
  }
  paths(prefix: string) {
    return this.files.filter((f) => f.path.startsWith(prefix)).map((f) => f.path);
  }
  set(p: string, text: string) {
    this.files = [...this.files.filter((x) => x.path !== p), { path: p, text }];
    return this;
  }
  remove(p: string) {
    this.files = this.files.filter((x) => x.path !== p);
    return this;
  }
  /** Edit the YAML front matter (or whole YAML file) of `p`. */
  edit(p: string, fn: (data: Record<string, unknown>) => void) {
    const f = this.get(p);
    if (p.endsWith(".md")) {
      const fm = splitFrontMatter(f.text)!;
      const data = parse(fm.data) as Record<string, unknown>;
      fn(data);
      return this.set(p, `---\n${stringify(data)}---\n\n${fm.body}\n`);
    }
    const data = parse(f.text) as Record<string, unknown>;
    fn(data);
    return this.set(p, stringify(data));
  }
  /** Copy `p` to `q`, then edit the copy. */
  copy(p: string, q: string, fn: (data: Record<string, unknown>) => void = () => {}) {
    this.set(q, this.get(p).text);
    return this.edit(q, fn);
  }
  validate() {
    return validateFiles(this.files);
  }
}
