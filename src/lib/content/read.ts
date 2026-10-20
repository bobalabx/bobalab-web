/**
 * Reading content files: disk → virtual files → parsed, schema-checked entries.
 * `parseContentFiles` is pure (no fs), so tests can build content in memory.
 */
import fs from "node:fs";
import path from "node:path";
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
