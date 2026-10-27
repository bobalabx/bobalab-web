/**
 * WP2 test helpers: a content folder read the way the content manager loads
 * it (Decap's getCollection → `{slug, data}`, `data.body` = the Markdown after
 * the front matter, unnormalised), for the editor preview's pure modules.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { readContentFiles, type VirtualFile } from "@/lib/content/read";
import type { BaseEntry, PreviewBase, PublishedSlugs } from "@/lib/preview/protocol";

export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const CONTENT = path.join(ROOT, "content");
export const FIXTURES = path.join(ROOT, "tests", "fixtures", "content");
export const TODAY = "2026-10-26";

const FOLDERS = ["news", "publications", "people", "directions", "projects", "opportunities"];
const FM = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;

export interface Loaded {
  base: PreviewBase;
  publishedSlugs: PublishedSlugs;
  files: VirtualFile[];
  /** Files the content manager could not load (broken YAML or front matter). */
  unreadable: string[];
}

function mapping(text: string): Record<string, unknown> | null {
  try {
    const v = YAML.parse(text) ?? {};
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The saved site of a content folder, as the content manager posts it. */
export function decapBase(dir: string): Loaded {
  const files = readContentFiles(dir);
  const base = Object.fromEntries(
    [...FOLDERS, "pages", "settings"].map((c) => [c, [] as BaseEntry[]]),
  ) as PreviewBase;
  let publishedSlugs: PublishedSlugs = null;
  const unreadable: string[] = [];
  for (const f of files) {
    const parts = f.path.split("/");
    if (f.path === ".published-slugs.json") {
      publishedSlugs = JSON.parse(f.text);
    } else if (f.path === "site.yml") {
      const data = mapping(f.text);
      if (data) base.settings.push({ slug: "site", data });
      else unreadable.push(f.path);
    } else if (parts.length === 2 && parts[0] === "pages" && parts[1]!.endsWith(".yml")) {
      const data = mapping(f.text);
      if (data) base.pages.push({ slug: parts[1]!.replace(/\.yml$/, ""), data });
      else unreadable.push(f.path);
    } else if (parts.length === 2 && FOLDERS.includes(parts[0]!) && parts[1]!.endsWith(".md")) {
      const m = FM.exec(f.text);
      const data = m ? mapping(m[1]!) : null;
      if (!data) {
        unreadable.push(f.path);
        continue;
      }
      (base[parts[0] as keyof PreviewBase] as BaseEntry[]).push({
        slug: parts[1]!.replace(/\.md$/, ""),
        data: { ...data, body: m![2] ?? "" },
      });
    }
  }
  return { base, publishedSlugs, files, unreadable };
}

/** Every fixture content set with a site.yml, plus the real content. */
export function contentSets(): string[] {
  const sets = fs
    .readdirSync(FIXTURES)
    .map((d) => path.join(FIXTURES, d))
    .filter((d) => fs.existsSync(path.join(d, "site.yml")));
  return [CONTENT, ...sets];
}

/** A copy of a base with one entry's data changed (or added). */
export function withData(
  base: PreviewBase,
  collection: keyof PreviewBase,
  slug: string,
  change: (data: Record<string, unknown>) => Record<string, unknown>,
): PreviewBase {
  const list = base[collection];
  const at = list.findIndex((e) => e.slug === slug);
  const data = change(at >= 0 ? structuredClone(list[at]!.data) : {});
  const next =
    at >= 0 ? list.map((e, i) => (i === at ? { slug, data } : e)) : [...list, { slug, data }];
  return { ...base, [collection]: next };
}

/** One entry's data (a deep copy). */
export function dataOf(base: PreviewBase, collection: keyof PreviewBase, slug: string) {
  const e = base[collection].find((x) => x.slug === slug);
  if (!e) throw new Error(`no ${collection}/${slug}`);
  return structuredClone(e.data);
}
