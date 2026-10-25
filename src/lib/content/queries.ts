/**
 * Page-level queries over the loaded Content (server only, pure functions).
 * They keep the relation rules in one place so every page package derives
 * lists the same way (D-05 counting, consent, draft filtering already applied
 * by load.ts):
 *
 *   import { getContent } from "@/lib/content/load";
 *   import { directionDetail } from "@/lib/content/queries";
 *   const d = directionDetail(getContent(), slug);   // undefined → notFound()
 *
 * Every list returned here contains only items present in this build (drafts
 * removed in production; unlisted people never appear).
 */
import type {
  Content,
  DirectionView,
  NewsView,
  OpportunityView,
  ProjectView,
  PublicationView,
} from "./load";
import type { PublicPerson } from "./people";
import type { EvidenceLevel, OpportunityEntry } from "./schema";
import { dateSortKey } from "./dates";

// ---------------------------------------------------------------------------
// Findings (direction `findings[]` and home `featured_findings[]`)

export interface FindingView {
  text: string;
  evidence: EvidenceLevel;
  /** Present only when the referenced publication is in this build. */
  publication?: PublicationView;
  /** Present only when the referenced direction is in this build. */
  direction?: DirectionView;
}

/** Resolve finding slugs to views. Unresolvable references are dropped, the text is kept. */
export function resolveFindings(
  c: Content,
  findings: ReadonlyArray<{
    text: string;
    evidence: EvidenceLevel;
    publication?: string;
    direction?: string;
  }>,
): FindingView[] {
  return findings.map((f) => ({
    text: f.text,
    evidence: f.evidence,
    publication: f.publication ? c.getPublication(f.publication) : undefined,
    direction: f.direction ? c.getDirection(f.direction) : undefined,
  }));
}

/** Home "What we've learned" (brief §D3.2): pages.home.featured_findings, resolved. */
export function featuredFindings(c: Content): FindingView[] {
  return resolveFindings(c, c.pages.home?.featured_findings ?? []);
}

// ---------------------------------------------------------------------------
// Helpers

const byStatusThenYear = (a: ProjectView, b: ProjectView) => {
  const rank = (p: ProjectView) =>
    p.status === "active" ? 0 : p.status === "paused" ? 1 : p.status === "completed" ? 2 : 3;
  return (
    rank(a) - rank(b) || (b.start_year ?? 0) - (a.start_year ?? 0) || a.title.localeCompare(b.title)
  );
};

/** Directions of a person (slugs → views present in this build, editorial order kept). */
export function directionsOf(c: Content, slugs: readonly string[]): DirectionView[] {
  return slugs.map((s) => c.getDirection(s)).filter((d): d is DirectionView => Boolean(d));
}

/** Current (non-alumni) listed people, PI first (home "People strip", §D3.5). */
export function currentPeople(c: Content): PublicPerson[] {
  return c.people.filter((p) => !p.isAlumni);
}

/** Open or rolling opportunities, optionally for one audience (Join page, home "Work with us"). */
export function openOpportunities(
  c: Content,
  audience?: OpportunityEntry["audience"],
): OpportunityView[] {
  return c.opportunities.filter((o) => o.isOpen && (!audience || o.audience === audience));
}

/** Upcoming talks/events (event_date ≥ build date), soonest first (§D10). */
export function upcomingNews(c: Content): NewsView[] {
  return c.news
    .filter((n) => n.upcoming)
    .sort((a, b) => dateSortKey(a.event_date).localeCompare(dateSortKey(b.event_date)));
}

/** Group items by year, newest first; items without a year go last under `year: null`. */
export function groupByYear<T>(
  items: readonly T[],
  yearOf: (x: T) => number | null | undefined,
): Array<{ year: number | null; items: T[] }> {
  const map = new Map<number | null, T[]>();
  for (const x of items) {
    const y = yearOf(x) ?? null;
    map.set(y, [...(map.get(y) ?? []), x]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] === null ? 1 : b[0] === null ? -1 : b[0] - a[0]))
    .map(([year, xs]) => ({ year, items: xs }));
}

/** Year of a news item's `date`. */
export const newsYear = (n: Pick<NewsView, "date">) => Number(n.date.slice(0, 4));

// ---------------------------------------------------------------------------
// Detail pages

export interface DirectionDetail {
  direction: DirectionView;
  /** Counted publications tagged with the direction, newest first (§D5.6). */
  publications: PublicationView[];
  /** Work in progress tagged with the direction ("In progress", D-05). */
  inProgress: PublicationView[];
  /** Non-archived projects, active first (§D5.5). */
  projects: ProjectView[];
  /** Listed people tagged with the direction: current first, then alumni (§D5.7). */
  people: PublicPerson[];
  news: NewsView[];
  findings: FindingView[];
  /** Live directions for the "More directions" rail, excluding this one (§D5.10). */
  siblings: DirectionView[];
  /** Live neighbours in editorial order (null at the ends or for archived directions). */
  previous: DirectionView | null;
  next: DirectionView | null;
}

export function directionDetail(c: Content, slug: string): DirectionDetail | undefined {
  const direction = c.getDirection(slug);
  if (!direction) return undefined;
  const tagged = (xs: { directions: string[] }) => xs.directions.includes(slug);
  const live = c.directions;
  const i = live.findIndex((d) => d.slug === slug);
  return {
    direction,
    publications: c.countedPublications.filter(tagged),
    inProgress: c.inProgress.filter(tagged),
    projects: c.projects.filter((p) => p.status !== "archived" && tagged(p)).sort(byStatusThenYear),
    people: c.people.filter(tagged).sort((a, b) => Number(a.isAlumni) - Number(b.isAlumni)),
    news: c.news.filter(tagged),
    findings: resolveFindings(c, direction.findings),
    siblings: live.filter((d) => d.slug !== slug),
    previous: i > 0 ? live[i - 1]! : null,
    next: i >= 0 && i < live.length - 1 ? live[i + 1]! : null,
  };
}

export interface ProjectDetail {
  project: ProjectView;
  /** Projects sharing the primary direction (else any direction), max 3 (§D6.9). */
  related: ProjectView[];
  news: NewsView[];
}

export function projectDetail(c: Content, slug: string): ProjectDetail | undefined {
  const project = c.getProject(slug);
  if (!project) return undefined;
  const others = c.projects.filter((p) => p.slug !== slug && p.status !== "archived");
  const primary = project.primaryDirection?.slug;
  const samePrimary = others.filter((p) => primary && p.directions.includes(primary));
  const shared = others.filter(
    (p) => !samePrimary.includes(p) && p.directions.some((d) => project.directions.includes(d)),
  );
  const pubSlugs = new Set(project.publications);
  return {
    project,
    related: [...samePrimary, ...shared].sort(byStatusThenYear).slice(0, 3),
    news: c.news.filter((n) => n.publications.some((s) => pubSlugs.has(s))),
  };
}

export interface PublicationDetail {
  publication: PublicationView;
  /** Projects that list this publication (§D8 "Related … projects"). */
  projects: ProjectView[];
  /** Other papers from the same projects, then from the same directions; max 3. */
  related: PublicationView[];
  news: NewsView[];
}

export function publicationDetail(c: Content, slug: string): PublicationDetail | undefined {
  const publication = c.getPublication(slug);
  if (!publication) return undefined;
  const projects = c.projects.filter((p) => p.publications.includes(slug));
  const viaProjects = new Set(projects.flatMap((p) => p.publications));
  const others = c.countedPublications.filter((p) => p.slug !== slug);
  const sameProject = others.filter((p) => viaProjects.has(p.slug));
  const sameDirection = others.filter(
    (p) => !viaProjects.has(p.slug) && p.directions.some((d) => publication.directions.includes(d)),
  );
  return {
    publication,
    projects,
    related: [...sameProject, ...sameDirection].slice(0, 3),
    news: c.news.filter((n) => n.publications.includes(slug)),
  };
}

/**
 * Study-design plates (D-13 item 8): a paper's plate is a code component in a
 * registry keyed by publication slug, and it renders only when the authors have
 * checked it (`plate_verified: true`) or in a preview build (which shows drafts
 * for lab review). Pass `isPreview()` from load.ts as `preview`.
 */
export function showStudyPlate(
  pub: Pick<PublicationView, "plate_verified">,
  preview: boolean,
): boolean {
  return pub.plate_verified === true || preview;
}

export interface PersonDetail {
  person: PublicPerson;
  directions: DirectionView[];
  /** Publications where the person is a linked author (all, newest first). */
  publications: PublicationView[];
  /** Projects where the person is on the team. */
  projects: ProjectView[];
  news: NewsView[];
}

/** Person page data (§D9). Undefined for unknown or unlisted people, and for people without a profile page. */
export function personDetail(c: Content, slug: string): PersonDetail | undefined {
  const person = c.getPerson(slug);
  if (!person || !person.hasProfile) return undefined;
  return {
    person,
    directions: directionsOf(c, person.directions),
    publications: c.publications.filter((p) => p.authorList.some((a) => a.person?.slug === slug)),
    projects: c.projects.filter((p) => p.teamRefs.some((t) => t.slug === slug)),
    news: c.news.filter((n) => n.peopleRefs.some((t) => t.slug === slug)),
  };
}

export interface NewsDetail {
  item: NewsView;
  /** The next older item (null for the oldest). */
  previous: NewsView | null;
  /** The next newer item (null for the newest). */
  next: NewsView | null;
}

/** News item with previous/next (c.news is newest first). */
export function newsDetail(c: Content, slug: string): NewsDetail | undefined {
  const i = c.news.findIndex((n) => n.slug === slug);
  if (i < 0) return undefined;
  return {
    item: c.news[i]!,
    previous: c.news[i + 1] ?? null,
    next: i > 0 ? c.news[i - 1]! : null,
  };
}

// ---------------------------------------------------------------------------
// generateStaticParams

/**
 * Placeholder param emitted when a collection has NO pages in this build.
 * MEASURED 2026-10-20 (Next 16.4.2): with `output: "export"`, a
 * `generateStaticParams()` that returns `[]` FAILS the build ("returned an
 * empty array … at least one route must be generated"). The production build
 * currently has 0 non-draft directions, so every dynamic route must use
 * `staticParams()` and call `notFound()` for this value (it then exports a
 * noindex not-found page at e.g. /research/_none/; keep it out of the sitemap).
 * Content slugs are kebab-case, so "_none" can never collide with one.
 */
export const EMPTY_PARAM = "_none";

/**
 *   export const dynamicParams = false;
 *   export function generateStaticParams() {
 *     return staticParams("direction", staticSlugs.directions(getContent()));
 *   }
 *   // in the page: const d = directionDetail(c, slug); if (!d) notFound();
 */
export function staticParams<K extends string>(
  key: K,
  slugs: readonly string[],
): Array<Record<K, string>> {
  const list = slugs.length ? slugs : [EMPTY_PARAM];
  return list.map((s) => ({ [key]: s }) as Record<K, string>);
}

/** Slugs for generateStaticParams (only pages that exist in this build). */
export const staticSlugs = {
  directions: (c: Content) => [...c.directions, ...c.archivedDirections].map((d) => d.slug),
  projects: (c: Content) => c.projects.map((p) => p.slug),
  publications: (c: Content) => c.publications.map((p) => p.slug),
  people: (c: Content) => c.people.filter((p) => p.hasProfile).map((p) => p.slug),
  news: (c: Content) => c.news.map((n) => n.slug),
};
