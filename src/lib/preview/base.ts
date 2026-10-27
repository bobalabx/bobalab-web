/**
 * Editor live preview: the saved site, as the content manager loaded it, turned
 * into the RawContent the build makes from the files (spec §2.2).
 *
 * The content manager (public/admin/cms-live.js) reads every collection with
 * Decap's own getCollection and posts `{slug, data}` per entry: `data` is the
 * file's YAML mapping, plus `body` (the Markdown after the front matter) for a
 * .md entry. rawFromBase() runs each entry through the same schema as
 * parseContentFiles() (src/lib/content/parse.ts), with the body normalised like
 * splitFrontMatter() and the entries in file order, so the site check sees what
 * the deploy's validator sees. All drafts are kept: the render drops them with
 * buildContent({preview: false}), the site check needs them.
 *
 * An entry that fails its schema is skipped and listed as a WARNING
 * (W_PREVIEW_SCHEMA, one per schema problem, on the entry's file): buildContent
 * throws on errors in raw.issues, and the site check compares with and without
 * the change, so such problems cancel out instead of blocking a save.
 *
 * Pure (no file system, no DOM); a unit test proves parity with
 * parseContentFiles() on the real content.
 */
import type { ZodError } from "zod";
import type { Issue, RawContent } from "@/lib/content/parse";
import {
  COLLECTIONS,
  COLLECTION_SCHEMAS,
  PAGE_SCHEMAS,
  siteSchema,
  type CollectionName,
  type PageName,
  type PagesData,
  type SiteData,
} from "@/lib/content/schema";
import type { BaseEntry, PreviewBase, PublishedSlugs } from "./protocol";

/** Code of the warning for a saved entry the preview could not read. */
export const BASE_SCHEMA_CODE = "W_PREVIEW_SCHEMA";

/** splitFrontMatter()'s body rule: no leading blank lines, no trailing whitespace. */
export function normalizeBody(body: string): string {
  return body.replace(/^\s*\n/, "").replace(/\s+$/, "");
}

/**
 * YAML loaded by older tools may carry Date objects where the files hold plain
 * dates; the schema wants the 'YYYY-MM-DD' (or ISO date-time) text.
 */
function plainValue(v: unknown): unknown {
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return v;
    const iso = v.toISOString();
    return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso.replace(/\.000Z$/, "Z");
  }
  if (Array.isArray(v)) return v.map(plainValue);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = plainValue(x);
    return out;
  }
  return v;
}

/** The schema input for a .md entry: the mapping, with the body as the build reads it. */
export function entryInput(data: Record<string, unknown>): Record<string, unknown> {
  const input = plainValue(data) as Record<string, unknown>;
  const body = typeof input.body === "string" ? normalizeBody(input.body) : undefined;
  delete input.body;
  if (body) input.body = body;
  return input;
}

/** Zod problems of one file as preview warnings (field = the zod path). */
export function schemaWarnings(err: ZodError, file: string): Issue[] {
  return err.issues.map((i) => ({
    severity: "warning" as const,
    code: BASE_SCHEMA_CODE,
    file,
    field: i.path.map(String).join(".") || undefined,
    message: i.message,
  }));
}

const byFile = (a: { file: string }, b: { file: string }) => a.file.localeCompare(b.file);

export interface RawFromBaseOptions {
  publishedSlugs: PublishedSlugs;
}

/** RawContent from the content manager's saved entries (all drafts kept; `files` is empty). */
export function rawFromBase(
  base: Partial<PreviewBase>,
  { publishedSlugs }: RawFromBaseOptions,
): RawContent {
  const issues: Issue[] = [];
  const entries: RawContent["entries"] = {
    directions: [],
    projects: [],
    publications: [],
    people: [],
    news: [],
    opportunities: [],
  };

  for (const c of COLLECTIONS) {
    const list: Array<{ slug: string; file: string }> = [];
    for (const e of (base[c] ?? []) as BaseEntry[]) {
      const file = `${c}/${e.slug}.md`;
      const r = COLLECTION_SCHEMAS[c].safeParse(entryInput(e.data));
      if (!r.success) {
        issues.push(...schemaWarnings(r.error, file));
        continue;
      }
      list.push({ ...r.data, slug: e.slug, file });
    }
    (entries as Record<CollectionName, unknown[]>)[c] = list.sort(byFile);
  }

  const pages: PagesData = {};
  for (const e of [...(base.pages ?? [])].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const file = `pages/${e.slug}.yml`;
    const schema = PAGE_SCHEMAS[e.slug as PageName];
    if (!schema) {
      issues.push({
        severity: "warning",
        code: "W_UNKNOWN_FILE",
        file,
        message: "unknown page file (ignored)",
      });
      continue;
    }
    const r = schema.safeParse(plainValue(e.data));
    if (r.success) (pages as Record<string, unknown>)[e.slug] = r.data;
    else issues.push(...schemaWarnings(r.error, file));
  }

  let site: SiteData | null = null;
  const settings = base.settings?.find((e) => e.slug === "site") ?? base.settings?.[0];
  if (settings) {
    const r = siteSchema.safeParse(plainValue(settings.data));
    if (r.success) site = r.data;
    else issues.push(...schemaWarnings(r.error, "site.yml"));
  }

  return {
    entries,
    site,
    pages,
    publishedSlugs: publishedSlugsOf(publishedSlugs),
    issues,
    files: [],
  };
}

/** content/.published-slugs.json as parseContentFiles() keeps it (a copy). */
function publishedSlugsOf(p: PublishedSlugs): RawContent["publishedSlugs"] {
  if (!p) return null;
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, [...v]]));
}
