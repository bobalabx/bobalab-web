/**
 * /sitemap.xml (brief §G3, §D2; WP8).
 *
 * One root sitemap, prerendered at build (`force-static`; nested sitemaps are
 * mishandled under `output: "export"`, Next issue #98126). It lists only pages
 * that are public in a production build:
 *   - the fixed section pages (home, research, projects, publications, news,
 *     join, about, accessibility, privacy; the People list is a section of
 *     the home page since 2026-10-29, and /people/ only redirects there);
 *   - every non-draft direction (live and archived), project, publication and
 *     news item;
 *   - people with a profile page who are listed (consented) and not drafts.
 * Never listed: /admin/ (Decap), /kit/ (component kit, not-found in
 * production), drafts (also in preview builds, which include them), unlisted
 * people, redirect stubs, and the `_none` placeholder pages that
 * `staticParams()` emits for empty collections (docs/ARCHITECTURE.md §3).
 *
 * URLs are absolute: siteOrigin() (NEXT_PUBLIC_SITE_URL → site.yml site_url →
 * the planned GitHub Pages origin) + NEXT_PUBLIC_BASE_PATH + a path with a
 * trailing slash (trailingSlash: true).
 */
import type { MetadataRoute } from "next";
import { getContent } from "@/lib/content/load";
import { EMPTY_PARAM } from "@/lib/content/queries";
import { COLLECTION_ROUTES } from "@/lib/content/schema";
import { siteOrigin } from "@/lib/seo/metadata";
import { BASE_PATH } from "@/lib/site/paths";

export const dynamic = "force-static";

/** Section pages that exist in every build (brief §D2). */
const SECTION_PAGES: ReadonlyArray<{ path: string; page?: "about" | "accessibility" | "privacy" }> =
  [
    { path: "/" },
    { path: "/research/" },
    { path: "/projects/" },
    { path: "/publications/" },
    { path: "/news/" },
    { path: "/join/" },
    { path: "/about/", page: "about" },
    { path: "/accessibility/", page: "accessibility" },
    { path: "/privacy/", page: "privacy" },
  ];

/** 'YYYY-MM-DD' from a date or ISO date-time string; undefined when absent. */
function day(value: string | undefined): string | undefined {
  const m = value ? /^\d{4}-\d{2}-\d{2}/.exec(value) : null;
  return m ? m[0] : undefined;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const c = getContent();
  const origin = siteOrigin(c.site.site_url);
  const url = (path: string) => `${origin}${BASE_PATH}${path}`;
  const live = <T extends { slug: string; draft: boolean }>(xs: readonly T[]) =>
    xs.filter((x) => !x.draft && x.slug !== EMPTY_PARAM);

  const entry = (path: string, lastModified?: string) =>
    lastModified ? { url: url(path), lastModified } : { url: url(path) };

  const entries: MetadataRoute.Sitemap = SECTION_PAGES.map(({ path, page }) => {
    const text = page ? c.pages[page] : undefined;
    return entry(path, text && !text.draft ? day(text.last_reviewed) : undefined);
  });

  const route = COLLECTION_ROUTES;
  for (const d of live([...c.directions, ...c.archivedDirections])) {
    entries.push(entry(route.directions!(d.slug)));
  }
  for (const p of live(c.projects)) entries.push(entry(route.projects!(p.slug)));
  for (const p of live(c.publications)) entries.push(entry(route.publications!(p.slug)));
  for (const p of live(c.people.filter((x) => x.listed && x.hasProfile))) {
    entries.push(entry(route.people!(p.slug)));
  }
  for (const n of live(c.news)) entries.push(entry(route.news!(n.slug), day(n.date)));

  // Deduplicate defensively (a slug can only map to one URL per collection).
  const seen = new Set<string>();
  return entries.filter((e) => (seen.has(e.url) ? false : (seen.add(e.url), true)));
}
