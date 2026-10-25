/**
 * Build-time content loader (server only; reads the file system).
 *
 *   import { getContent, isPreview } from "@/lib/content/load";
 *   const c = getContent();          // memoised per process
 *
 * Draft handling (DECISIONS D-03):
 *   - preview (drafts INCLUDED): NODE_ENV === "development" (unless INCLUDE_DRAFTS === "0"),
 *     or INCLUDE_DRAFTS === "1" (npm run build:preview);
 *   - otherwise drafts are excluded (npm run build).
 * CONTENT_DIR (default ./content) selects the content folder, e.g.
 *   CONTENT_DIR=tests/fixtures/content/n4 npm run dev
 *
 * Structural problems (YAML/schema) throw, so a broken file fails the build.
 * Publish-readiness rules live in ./validate.ts (npm run validate).
 */
import {
  contentDir,
  parseContentFiles,
  readContentFiles,
  type Issue,
  type RawContent,
} from "./read";
import { orderDirections } from "./directions";
import { countsAsPublication, hasPublicVersion, isLabWork } from "./relations";
import { swatchOf, type Swatch } from "./palette";
import { dateSortKey, isOnOrAfter, todayInLab } from "./dates";
import { toPublicPerson, comparePeople, type PublicPerson } from "./people";
import { typesetOpt as ts } from "./typeset";
import type {
  DirectionEntry,
  NewsEntry,
  OpportunityEntry,
  PagesData,
  ProjectEntry,
  PublicationEntry,
  SiteData,
} from "./schema";

// ---------------------------------------------------------------------------
// Modes

export function isPreview(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.INCLUDE_DRAFTS === "1") return true;
  if (env.INCLUDE_DRAFTS === "0") return false;
  return env.NODE_ENV === "development";
}

// ---------------------------------------------------------------------------
// Views

export interface DirectionView extends DirectionEntry {
  /** 1-based index among live directions in site.direction_order (null when archived). */
  index: number | null;
  swatch: Swatch;
  counts: {
    /** Publications that count under D-05 (public version or documented presentation). */
    papers: number;
    /** Non-archived projects tagged with this direction. */
    projects: number;
    /** Work-in-progress items without a public version. */
    inProgress: number;
  };
  /** "Open to RAs": an open/rolling student opportunity tagged with this direction. */
  openToRAs: boolean;
}

export interface AuthorView {
  name: string;
  url?: string;
  /** Present only when the person exists in this build and is listed. */
  person?: PublicPerson;
  /** Highlight as a lab member (listed lab person). */
  isLab: boolean;
}

export interface PublicationView extends PublicationEntry {
  authorList: AuthorView[];
  directionRefs: DirectionView[];
  publicVersion: boolean;
  /** D-05 counting rule. false → shown only as "In progress". */
  counted: boolean;
  labWork: boolean;
}

export interface ProjectView extends ProjectEntry {
  directionRefs: DirectionView[];
  primaryDirection?: DirectionView;
  teamRefs: PublicPerson[];
  publicationRefs: PublicationView[];
  /** Collaborators with consent: true only. */
  visibleCollaborators: ProjectEntry["collaborators"];
  /** Partners with public: true only. */
  visiblePartners: ProjectEntry["partners"];
}

export interface NewsView extends NewsEntry {
  directionRefs: DirectionView[];
  peopleRefs: PublicPerson[];
  publicationRefs: PublicationView[];
  /** event_date ≥ build date (lab time zone). */
  upcoming: boolean;
}

export interface OpportunityView extends OpportunityEntry {
  /** open/rolling and not past closes_on. */
  isOpen: boolean;
  directionRefs: DirectionView[];
}

export interface Content {
  preview: boolean;
  /** 'YYYY-MM-DD' in America/Los_Angeles at build time. */
  today: string;
  dir: string;
  site: SiteData;
  pages: PagesData;
  /** Live directions in editorial order (index 01…0N). */
  directions: DirectionView[];
  /** Archived directions ("Earlier and related research"). */
  archivedDirections: DirectionView[];
  /** Every publication, newest first (year desc, then title). */
  publications: PublicationView[];
  /** Publications that count (main lists, seeds). */
  countedPublications: PublicationView[];
  /** Work in progress without a public version. */
  inProgress: PublicationView[];
  projects: ProjectView[];
  /** Listed people only (consent-gated fields removed), sorted role → rank → name. */
  people: PublicPerson[];
  /** Newest first. */
  news: NewsView[];
  opportunities: OpportunityView[];
  /** Non-fatal parse warnings (unknown files etc.). */
  warnings: Issue[];
  getDirection(slug: string): DirectionView | undefined;
  getPublication(slug: string): PublicationView | undefined;
  getProject(slug: string): ProjectView | undefined;
  /** Listed people only; unlisted people are never rendered or linked. */
  getPerson(slug: string): PublicPerson | undefined;
  getNews(slug: string): NewsView | undefined;
}

/** Fallback site values (DOCUMENTED facts from the brief §D11) when content/site.yml is absent. */
export const DEFAULT_SITE: SiteData = {
  name: "BOBALAB",
  long_name: "Berkeley Operations and Behavioral Analytics Lab",
  affiliation_text: "Haas School of Business, University of California, Berkeley",
  email: "bobalab@berkeley.edu",
  address: "2220 Piedmont Avenue, Berkeley, CA 94720",
  social: {},
  figure_mode: "cluster",
  launched: false,
  direction_order: [],
  member_links: [],
  redirects: [],
};

export class ContentError extends Error {
  constructor(
    message: string,
    public issues: Issue[],
  ) {
    super(message);
    this.name = "ContentError";
  }
}

// ---------------------------------------------------------------------------
// Build the views

export interface BuildOptions {
  preview: boolean;
  today?: string;
  dir?: string;
}

export function buildContent(raw: RawContent, opts: BuildOptions): Content {
  const fatal = raw.issues.filter((i) => i.severity === "error");
  if (fatal.length) {
    const list = fatal
      .slice(0, 20)
      .map((i) => `  - ${i.file ?? ""}${i.field ? ` › ${i.field}` : ""}: ${i.message}`)
      .join("\n");
    throw new ContentError(`Content has ${fatal.length} structural error(s):\n${list}`, fatal);
  }
  const preview = opts.preview;
  const today = opts.today ?? todayInLab();
  const keep = <T extends { draft: boolean }>(xs: T[]) =>
    preview ? xs : xs.filter((x) => !x.draft);

  const site = raw.site ?? DEFAULT_SITE;
  const pages: PagesData = typesetPages(
    Object.fromEntries(
      Object.entries(raw.pages).filter(
        ([, v]) => v && (preview || !(v as { draft?: boolean }).draft),
      ),
    ),
  );

  // People (all visible-mode people, for lab_work; listed subset for rendering)
  const allPeople = keep(raw.entries.people);
  const peopleBySlug = new Map(allPeople.map((p) => [p.slug, p]));
  const publicPeople = allPeople.map((p) => toPublicPerson(p, today));
  const listedPeople = publicPeople.filter((p) => p.listed).sort(comparePeople);
  const listedBySlug = new Map(listedPeople.map((p) => [p.slug, p]));

  // Directions
  const dirs = keep(raw.entries.directions);
  const order = orderDirections(
    dirs,
    site.direction_order,
    raw.entries.directions.map((d) => d.slug),
  );
  const dirView = new Map<string, DirectionView>();
  const mkDir = (d: DirectionEntry, index: number | null): DirectionView => ({
    ...d,
    question: ts(d.question),
    summary: ts(d.summary),
    findings: d.findings.map((f) => ({ ...f, text: ts(f.text) })),
    index,
    swatch: swatchOf(d.color),
    counts: { papers: 0, projects: 0, inProgress: 0 },
    openToRAs: false,
  });
  order.live.forEach((d, i) => dirView.set(d.slug, mkDir(d, i + 1)));
  order.archived.forEach((d) => dirView.set(d.slug, mkDir(d, null)));
  const refDirs = (slugs: string[]) =>
    slugs.map((s) => dirView.get(s)).filter((d): d is DirectionView => !!d);

  // Publications
  const pubs: PublicationView[] = keep(raw.entries.publications).map((p) => {
    const counted = countsAsPublication(p);
    return {
      ...p,
      in_brief: ts(p.in_brief),
      authorList: p.authors.map((a) => {
        const person = a.person ? listedBySlug.get(a.person) : undefined;
        return { name: a.name, url: a.url, person, isLab: Boolean(person) };
      }),
      directionRefs: refDirs(p.directions),
      publicVersion: hasPublicVersion(p),
      counted,
      labWork: isLabWork(p, peopleBySlug),
    };
  });
  pubs.sort(
    (a, b) =>
      (b.year ?? 0) - (a.year ?? 0) ||
      dateSortKey(b.date_online).localeCompare(dateSortKey(a.date_online)) ||
      a.title.localeCompare(b.title),
  );
  const pubBySlug = new Map(pubs.map((p) => [p.slug, p]));

  // Projects
  const projects: ProjectView[] = keep(raw.entries.projects).map((p) => {
    const directionRefs = refDirs(p.directions);
    return {
      ...p,
      summary: ts(p.summary),
      directionRefs,
      primaryDirection: directionRefs[0],
      teamRefs: p.team.map((s) => listedBySlug.get(s)).filter((x): x is PublicPerson => !!x),
      publicationRefs: p.publications
        .map((s) => pubBySlug.get(s))
        .filter((x): x is PublicationView => !!x),
      visibleCollaborators: p.collaborators.filter((c) => c.consent),
      visiblePartners: p.partners.filter((c) => c.public),
    };
  });
  projects.sort(
    (a, b) => (b.start_year ?? 0) - (a.start_year ?? 0) || a.title.localeCompare(b.title),
  );

  // Opportunities
  const opportunities: OpportunityView[] = keep(raw.entries.opportunities).map((o) => ({
    ...o,
    route: ts(o.route),
    isOpen:
      (o.status === "open" || o.status === "rolling") &&
      (!o.closes_on || isOnOrAfter(o.closes_on, today)),
    directionRefs: refDirs(o.directions),
  }));

  // Direction counts
  for (const d of dirView.values()) {
    d.counts.papers = pubs.filter((p) => p.counted && p.directions.includes(d.slug)).length;
    d.counts.inProgress = pubs.filter((p) => !p.counted && p.directions.includes(d.slug)).length;
    d.counts.projects = projects.filter(
      (p) => p.status !== "archived" && p.directions.includes(d.slug),
    ).length;
    d.openToRAs = opportunities.some(
      (o) => o.isOpen && o.audience === "students" && o.directions.includes(d.slug),
    );
  }

  // News
  const news: NewsView[] = keep(raw.entries.news)
    .map((n) => ({
      ...n,
      summary: ts(n.summary),
      directionRefs: refDirs(n.directions),
      peopleRefs: n.people.map((s) => listedBySlug.get(s)).filter((x): x is PublicPerson => !!x),
      publicationRefs: n.publications
        .map((s) => pubBySlug.get(s))
        .filter((x): x is PublicationView => !!x),
      upcoming: Boolean(n.event_date && isOnOrAfter(n.event_date, today)),
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

  const directions = order.live.map((d) => dirView.get(d.slug)!);
  const archivedDirections = order.archived.map((d) => dirView.get(d.slug)!);
  const projBySlug = new Map(projects.map((p) => [p.slug, p]));
  const newsBySlug = new Map(news.map((n) => [n.slug, n]));

  return {
    preview,
    today,
    dir: opts.dir ?? "",
    site,
    pages,
    directions,
    archivedDirections,
    publications: pubs,
    countedPublications: pubs.filter((p) => p.counted),
    inProgress: pubs.filter((p) => !p.counted),
    projects,
    people: listedPeople,
    news,
    opportunities,
    warnings: raw.issues.filter((i) => i.severity === "warning"),
    getDirection: (s) => dirView.get(s),
    getPublication: (s) => pubBySlug.get(s),
    getProject: (s) => projBySlug.get(s),
    getPerson: (s) => listedBySlug.get(s),
    getNews: (s) => newsBySlug.get(s),
  };
}

/** Typographic quotes in the pages' plain display fields (content-4a; join.intro is Markdown). */
function typesetPages(pages: PagesData): PagesData {
  const out: PagesData = { ...pages };
  if (out.home)
    out.home = {
      ...out.home,
      statement: ts(out.home.statement),
      mission: ts(out.home.mission),
      featured_findings: out.home.featured_findings.map((f) => ({ ...f, text: ts(f.text) })),
    };
  for (const k of ["about", "accessibility", "privacy"] as const) {
    const p = out[k];
    if (p) out[k] = { ...p, intro: ts(p.intro) };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Entry point

const cache = new Map<string, Content>();

export function loadRawContent(dir: string = contentDir()): RawContent {
  return parseContentFiles(readContentFiles(dir));
}

export function getContent(opts: Partial<BuildOptions> = {}): Content {
  const dir = opts.dir ?? contentDir();
  const preview = opts.preview ?? isPreview();
  const today = opts.today ?? todayInLab();
  // No memo in `next dev`, so CMS edits show up on reload (cms:local demo).
  const memo = process.env.NODE_ENV !== "development";
  const key = `${dir}|${preview}|${today}`;
  const hit = memo ? cache.get(key) : undefined;
  if (hit) return hit;
  const content = buildContent(loadRawContent(dir), { preview, today, dir });
  if (memo) cache.set(key, content);
  return content;
}

/** For tests. */
export function clearContentCache(): void {
  cache.clear();
}
