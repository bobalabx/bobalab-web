/**
 * E_LINK_HIDDEN (spec §2.12.6b): a publicly rendered entry, page or site.yml
 * links to the page of an entry that has no page on the live site (a draft, an
 * unlisted person, a person without a profile page). export-check finds the
 * same thing in the built HTML (scripts/perf/export-check.mjs, "links to it"),
 * but only after the build; here validateContent() finds it first, names the
 * linking file and field, and the editor's site check sees it before Save.
 *
 * Pure (no file system), so the editor's live preview runs it in the browser.
 */
import type { Issue, RawContent } from "./parse";
import { COLLECTIONS, COLLECTION_ROUTES, type CollectionName, type EntryMap } from "./schema";

type AnyEntry = EntryMap[CollectionName];

/**
 * Does this entry produce a public page in a production build? (Re-exported by
 * ./validate.ts, its historical home; defined here so links.ts and validate.ts
 * do not import each other.)
 */
export function hasLivePage(c: CollectionName, e: AnyEntry): boolean {
  if (e.draft || !COLLECTION_ROUTES[c]) return false;
  if (c === "people") {
    const p = e as EntryMap["people"];
    return p.listed && (p.role === "pi" || p.profile_page);
  }
  return true;
}

export interface HiddenLinkOptions {
  /**
   * The site's own origins (absolute URLs on them count as links into the site),
   * e.g. ["https://bobalabx.github.io"]. An origin may carry the base path
   * ("https://bobalabx.github.io/bobalab-web"); a bare origin also matches one
   * base-path segment after it.
   */
  origins: string[];
}

const reEscape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Walk every string value of an object, yielding [dotted path, value]. */
function* strings(obj: unknown, prefix = ""): Generator<[string, string]> {
  if (typeof obj === "string") {
    yield [prefix, obj];
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++)
      yield* strings(obj[i], prefix ? `${prefix}.${i}` : String(i));
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (k === "slug" || k === "file") continue; // added by the loader, not content
      yield* strings(v, prefix ? `${prefix}.${k}` : k);
    }
  }
}

/** The URL prefixes of the site's own origins, as a regex alternation. */
function originPattern(origins: string[]): string | null {
  const alts = new Set<string>();
  for (const o of origins) {
    let u: URL;
    try {
      u = new URL(o);
    } catch {
      continue;
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") continue;
    const path = u.pathname.replace(/\/+$/, "");
    // Scheme optional ("//host/…" too); a bare origin may be followed by one
    // base-path segment (a GitHub Pages project site: /<repo>).
    const host = `(?:https?:)?//${reEscape(u.host)}`;
    alts.add(path ? `${host}${reEscape(path)}` : `${host}(?:/[A-Za-z0-9._~-]+)?`);
  }
  return alts.size ? [...alts].join("|") : null;
}

/**
 * One matcher for every hidden page: root-relative "/{seg}/{slug}" (after the
 * start, whitespace, a quote, "(", "[", "<", "=", ">" or ","), or absolute on an
 * own origin; with or without the trailing slash, and followed by the end, "/",
 * "#", "?", a quote, ")", "]", ">" or whitespace.
 */
function hiddenMatcher(paths: Map<string, string>, origins: string[]): RegExp | null {
  if (!paths.size) return null;
  const targets = [...paths.keys()]
    .sort((a, b) => b.length - a.length)
    .map((p) => reEscape(p.replace(/\/$/, "")))
    .join("|");
  const own = originPattern(origins);
  const before = own ? `(?:^|[\\s"'(\\[<=>,]|${own})` : `(?:^|[\\s"'(\\[<=>,])`;
  // No lookbehind (older Safari lacks it; the editor's preview runs this). The
  // character after a link is only looked at, never consumed, so it can still
  // open the next link ("/a/x/ /b/y/").
  return new RegExp(`${before}(${targets})(?=$|[/#?"')\\]>\\s])`, "g");
}

/** Where to send readers instead: the collection's index page ("/people/"). */
function indexOf(path: string): string {
  return `/${path.split("/")[1]}/`;
}

/**
 * E_LINK_HIDDEN issues, filed on the LINKING file and field. Scope: every
 * publicly rendered entry (not a draft; people only when listed), every page
 * that is not a draft, and site.yml except `redirects[].from` (a redirect's
 * source is the old address itself). Every string value is scanned, the body
 * included.
 */
export function hiddenLinkIssues(raw: RawContent, opts: HiddenLinkOptions): Issue[] {
  // Canonical page path of every entry without a live page → its collection.
  const hidden = new Map<string, string>();
  for (const c of COLLECTIONS) {
    const route = COLLECTION_ROUTES[c];
    if (!route) continue;
    for (const e of raw.entries[c] as AnyEntry[])
      if (!hasLivePage(c, e)) hidden.set(route(e.slug), c);
  }
  const re = hiddenMatcher(hidden, opts.origins);
  if (!re) return [];

  const issues: Issue[] = [];
  const seen = new Set<string>();
  const scan = (obj: unknown, file: string, skip?: (field: string) => boolean) => {
    for (const [field, value] of strings(obj)) {
      if (skip?.(field)) continue;
      for (const m of value.matchAll(re)) {
        const path = `${m[1]}/`;
        const key = `${file}|${field}|${path}`;
        if (seen.has(key)) continue;
        seen.add(key);
        issues.push({
          severity: "error",
          code: "E_LINK_HIDDEN",
          file,
          field: field || undefined,
          message: `This links to ${path}, which is not a page on the live site. Link to ${indexOf(path)} instead, or remove the link.`,
        });
      }
    }
  };

  for (const c of COLLECTIONS) {
    for (const e of raw.entries[c] as AnyEntry[]) {
      if (e.draft) continue;
      if (c === "people" && !(e as EntryMap["people"]).listed) continue;
      scan(e, e.file);
    }
  }
  for (const [name, page] of Object.entries(raw.pages)) {
    if (!page || (page as { draft?: boolean }).draft) continue;
    scan(page, `pages/${name}.yml`);
  }
  if (raw.site) scan(raw.site, "site.yml", (field) => /^redirects\.\d+\.from$/.test(field));
  return issues;
}
