/**
 * Parsing content files (pure, no file system): virtual files → parsed,
 * schema-checked entries. Runs in Node (build, validator, tests) and in the
 * browser (the editor live preview). ./read.ts adds the disk reader and
 * re-exports everything here.
 */
import { parse as parseYaml, YAMLParseError } from "yaml";
import type { ZodError } from "zod";
import {
  COLLECTIONS,
  COLLECTION_SCHEMAS,
  PAGE_SCHEMAS,
  siteSchema,
  type CollectionName,
  type EntryMap,
  type PageName,
  type PagesData,
  type SiteData,
} from "./schema";

export type Severity = "error" | "warning";

export interface Issue {
  severity: Severity;
  /** Stable rule code, e.g. E_SCHEMA, W_DIR_COUNT_HIGH (see docs/ARCHITECTURE.md). */
  code: string;
  /** Path relative to the content dir, e.g. "publications/smith-2024-x.md". */
  file?: string;
  /** Field path inside the file, e.g. "authors.0.person". */
  field?: string;
  message: string;
}

export interface VirtualFile {
  /** Relative path inside the content dir, forward slashes. */
  path: string;
  text: string;
}

export interface RawContent {
  entries: { [C in CollectionName]: EntryMap[C][] };
  site: SiteData | null;
  pages: PagesData;
  /** content/.published-slugs.json (D-05), if present. */
  publishedSlugs: Partial<Record<CollectionName, string[]>> | null;
  issues: Issue[];
  /** All files seen, for character-coverage checks. */
  files: VirtualFile[];
}

const FRONT_MATTER = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;

export function splitFrontMatter(text: string): { data: string; body: string } | null {
  const m = FRONT_MATTER.exec(text);
  if (!m) return null;
  return { data: m[1] ?? "", body: (m[2] ?? "").replace(/^\s*\n/, "").replace(/\s+$/, "") };
}

function zodIssues(err: ZodError, file: string): Issue[] {
  return err.issues.map((i) => ({
    severity: "error" as const,
    code: "E_SCHEMA",
    file,
    field: i.path.join(".") || undefined,
    message: i.message,
  }));
}

function parseYamlText(text: string, file: string, issues: Issue[]): unknown {
  try {
    return parseYaml(text, { prettyErrors: true }) ?? {};
  } catch (e) {
    const msg = e instanceof YAMLParseError ? e.message.split("\n")[0] : String(e);
    issues.push({ severity: "error", code: "E_PARSE", file, message: `YAML: ${msg}` });
    return undefined;
  }
}

export function emptyEntries(): RawContent["entries"] {
  return {
    directions: [],
    projects: [],
    publications: [],
    people: [],
    news: [],
    opportunities: [],
  };
}

export function parseContentFiles(files: VirtualFile[]): RawContent {
  const issues: Issue[] = [];
  const entries = emptyEntries();
  let site: SiteData | null = null;
  const pages: PagesData = {};
  let publishedSlugs: RawContent["publishedSlugs"] = null;

  for (const f of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const rel = f.path.replace(/\\/g, "/");
    const parts = rel.split("/");

    if (rel === "site.yml" || rel === "site.yaml") {
      const raw = parseYamlText(f.text, rel, issues);
      if (raw === undefined) continue;
      const r = siteSchema.safeParse(raw);
      if (r.success) site = r.data;
      else issues.push(...zodIssues(r.error, rel));
      continue;
    }

    if (rel === ".published-slugs.json") {
      try {
        publishedSlugs = JSON.parse(f.text);
      } catch {
        issues.push({ severity: "error", code: "E_PARSE", file: rel, message: "invalid JSON" });
      }
      continue;
    }

    if (parts.length === 2 && parts[0] === "pages" && /\.ya?ml$/.test(parts[1]!)) {
      const name = parts[1]!.replace(/\.ya?ml$/, "") as PageName;
      const schema = PAGE_SCHEMAS[name];
      if (!schema) {
        issues.push({
          severity: "warning",
          code: "W_UNKNOWN_FILE",
          file: rel,
          message: "unknown page file (ignored)",
        });
        continue;
      }
      const raw = parseYamlText(f.text, rel, issues);
      if (raw === undefined) continue;
      const r = schema.safeParse(raw);
      if (r.success) (pages as Record<string, unknown>)[name] = r.data;
      else issues.push(...zodIssues(r.error, rel));
      continue;
    }

    if (
      parts.length === 2 &&
      (COLLECTIONS as string[]).includes(parts[0]!) &&
      parts[1]!.endsWith(".md")
    ) {
      const collection = parts[0] as CollectionName;
      const slug = parts[1]!.replace(/\.md$/, "");
      const fm = splitFrontMatter(f.text);
      if (!fm) {
        issues.push({
          severity: "error",
          code: "E_PARSE",
          file: rel,
          message: "missing YAML front matter (--- … ---)",
        });
        continue;
      }
      const raw = parseYamlText(fm.data, rel, issues);
      if (raw === undefined) continue;
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        issues.push({
          severity: "error",
          code: "E_PARSE",
          file: rel,
          message: "front matter must be a mapping",
        });
        continue;
      }
      const input = { ...(raw as Record<string, unknown>) };
      if (fm.body) input.body = fm.body;
      const r = COLLECTION_SCHEMAS[collection].safeParse(input);
      if (!r.success) {
        issues.push(...zodIssues(r.error, rel));
        continue;
      }
      (entries[collection] as unknown[]).push({ ...r.data, slug, file: rel });
      continue;
    }

    if (/(^|\/)\.|readme\.md$/i.test(rel)) continue; // dotfiles, READMEs
    issues.push({
      severity: "warning",
      code: "W_UNKNOWN_FILE",
      file: rel,
      message: "file is not part of any collection (ignored)",
    });
  }

  return { entries, site, pages, publishedSlugs, issues, files };
}

// ---------------------------------------------------------------------------
// One file, before the schema (the editor's History and Restore)

export type ParsedFile = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

/**
 * The data of one content file BEFORE the schema: the YAML mapping, plus `body`
 * (the Markdown after the front matter, trimmed like splitFrontMatter) for a .md
 * entry. This is the shape the content manager loads into its form.
 * `path` is "site.yml", "pages/<name>.yml" or "<collection>/<slug>.md",
 * optionally prefixed with "content/".
 */
export function parseFileData(path: string, text: string): ParsedFile {
  const rel = path.replace(/\\/g, "/").replace(/^content\//, "");
  const parts = rel.split("/");
  const issues: Issue[] = [];
  const mapping = (raw: unknown): ParsedFile => {
    if (raw === undefined) return { ok: false, error: issues[0]?.message ?? "YAML: unreadable" };
    if (typeof raw !== "object" || raw === null || Array.isArray(raw))
      return { ok: false, error: "the file must be a YAML mapping (key: value lines)" };
    return { ok: true, data: { ...(raw as Record<string, unknown>) } };
  };

  if (
    rel === "site.yml" ||
    (parts.length === 2 && parts[0] === "pages" && /\.ya?ml$/.test(parts[1]!))
  )
    return mapping(parseYamlText(text, rel, issues));

  if (
    parts.length === 2 &&
    (COLLECTIONS as string[]).includes(parts[0]!) &&
    parts[1]!.endsWith(".md")
  ) {
    const fm = splitFrontMatter(text);
    if (!fm) return { ok: false, error: "missing YAML front matter (--- … ---)" };
    const r = mapping(parseYamlText(fm.data, rel, issues));
    if (r.ok) r.data.body = fm.body;
    return r;
  }

  return { ok: false, error: `not a content file: ${path}` };
}
