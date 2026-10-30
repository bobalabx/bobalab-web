/**
 * Editor live preview: page ids ↔ site paths (spec §2.5), and which content
 * file an entry is. Paths here never carry the base path; targetFromPath()
 * strips it. Pure, so it runs in the browser and in unit tests.
 *
 *   home /                    research /research/       direction /research/{s}/
 *   projects /projects/       project /projects/{s}/
 *   publications /publications/                         publication /publications/{s}/
 *   people /#people           person /people/{s}/
 *   news /news/               news-item /news/{s}/
 *   join /join/   about /about/   accessibility /accessibility/   privacy /privacy/
 *
 * "people" is the home page's People section (the list had its own page until
 * 2026-10-29): its address is /#people, and the old /people/ address, which
 * the live site redirects there, still opens it.
 */
import {
  PREVIEW_PAGES,
  SLUG_PAGES,
  type DecapCollection,
  type EntryRef,
  type PreviewPage,
  type PreviewTarget,
} from "./protocol";

export { PREVIEW_PAGES, SLUG_PAGES };

/** The first path segment of every page (home has none). */
const SECTION: Record<Exclude<PreviewPage, "home">, string> = {
  research: "research",
  direction: "research",
  projects: "projects",
  project: "projects",
  publications: "publications",
  publication: "publications",
  people: "people",
  person: "people",
  news: "news",
  "news-item": "news",
  join: "join",
  about: "about",
  accessibility: "accessibility",
  privacy: "privacy",
};

/** Section segment → [index page, detail page or null]. */
const BY_SECTION: Record<string, [PreviewPage, PreviewPage | null]> = {
  research: ["research", "direction"],
  projects: ["projects", "project"],
  publications: ["publications", "publication"],
  people: ["people", "person"],
  news: ["news", "news-item"],
  join: ["join", null],
  about: ["about", null],
  accessibility: ["accessibility", null],
  privacy: ["privacy", null],
};

/** The People section's address on the home page (src/components/people/anchor.ts). */
const PEOPLE_PATH = "/#people";

/** The site path of a page, without the base path ("/news/x/"; the People section: "/#people"). */
export function pathOf(target: PreviewTarget): string {
  if (target.page === "home") return "/";
  if (target.page === "people") return PEOPLE_PATH;
  const section = SECTION[target.page];
  return (SLUG_PAGES as readonly string[]).includes(target.page)
    ? `/${section}/${target.slug ?? ""}/`
    : `/${section}/`;
}

/**
 * The page a site path shows, or null when it is not a page the preview can
 * draw (a file such as /uploads/x.pdf or /news/feed.xml, /admin/, an unknown
 * section, or a path outside the base path). `basePath` is the site's base
 * path ("/bobalab-web", or "" at the domain root). Query and hash are ignored.
 */
export function targetFromPath(pathname: string, basePath = ""): PreviewTarget | null {
  let p = pathname.split(/[?#]/)[0] ?? "";
  try {
    p = decodeURIComponent(p);
  } catch {
    return null;
  }
  const base = basePath.replace(/\/+$/, "");
  if (base) {
    if (p === base) p = "/";
    else if (p.startsWith(`${base}/`)) p = p.slice(base.length);
    else return null;
  }
  if (!p.startsWith("/")) return null;
  const segs = p.split("/").filter(Boolean);
  if (segs.length === 0) return { page: "home" };
  if (segs.length > 2) return null;
  const last = segs[segs.length - 1]!;
  if (/\.[A-Za-z0-9]+$/.test(last)) return null; // a file, not a page
  const pages = BY_SECTION[segs[0]!];
  if (!pages) return null;
  if (segs.length === 1) return { page: pages[0] };
  return pages[1] ? { page: pages[1], slug: segs[1]! } : null;
}

/** The content file of an entry, content-relative: "news/x.md", "pages/home.yml", "site.yml". */
export function fileOf(entry: EntryRef): string {
  if (entry.collection === "settings") return "site.yml";
  if (entry.collection === "pages") return `pages/${entry.slug}.yml`;
  return `${entry.collection}/${entry.slug}.md`;
}

/** The detail page of an entry's collection (people: the profile page), if it has one. */
export const ENTRY_PAGE: Partial<Record<DecapCollection, PreviewPage>> = {
  directions: "direction",
  projects: "project",
  publications: "publication",
  people: "person",
  news: "news-item",
};

/** Pages that show a page file or Settings directly. */
const FILE_PAGES: Record<string, readonly PreviewPage[]> = {
  "pages/home": ["home", "about"],
  "pages/join": ["join"],
  "pages/about": ["about"],
  "pages/accessibility": ["accessibility"],
  "pages/privacy": ["privacy"],
};

/**
 * Is `target` the edited entry's own page? A list entry's own page is its
 * detail page; a page file is the page(s) it fills in (pages/home also fills
 * the About page's mission); Settings shows on every page (footer, header).
 */
export function isOwnPage(entry: EntryRef, target: PreviewTarget): boolean {
  if (entry.collection === "settings") return true;
  if (entry.collection === "pages")
    return (FILE_PAGES[`pages/${entry.slug}`] ?? []).includes(target.page);
  return ENTRY_PAGE[entry.collection] === target.page && target.slug === entry.slug;
}

export function sameTarget(a: PreviewTarget | null, b: PreviewTarget | null): boolean {
  return !!a && !!b && a.page === b.page && (a.slug ?? "") === (b.slug ?? "");
}
