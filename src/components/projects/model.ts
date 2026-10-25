/**
 * Pure helpers for the project pages (WP2; brief §D4, §D6). Unit-tested in
 * tests/unit/direction/projects.test.ts.
 */
import type {
  Content,
  DirectionView,
  NewsView,
  ProjectView,
  PublicationView,
} from "@/lib/content/load";
import type { FindingView } from "@/lib/content/queries";
import type { MaterialKind, MaterialLink } from "@/components/ui/MaterialsRow";
import type { ProjectEntry } from "@/lib/content/schema";
import type { PublicPerson } from "@/lib/content/people";
import { listJoin } from "@/components/direction/model";
import { figureTypeWord, shortTitle } from "@/components/direction/f2model";

export const PROJECT_STATUS_LABELS: Record<ProjectView["status"], string> = {
  active: "Active",
  completed: "Completed",
  paused: "Paused",
  archived: "Archived",
};

/** Display order of statuses (index groups, chips). */
export const PROJECT_STATUS_ORDER: ProjectView["status"][] = [
  "active",
  "paused",
  "completed",
  "archived",
];

const statusRank = (s: ProjectView["status"]) => PROJECT_STATUS_ORDER.indexOf(s);

/** Active first, then newest start year, then title. */
export function compareProjects(a: ProjectView, b: ProjectView): number {
  return (
    statusRank(a.status) - statusRank(b.status) ||
    (b.start_year ?? 0) - (a.start_year ?? 0) ||
    a.title.localeCompare(b.title)
  );
}

/** "2021–2024" · "Since 2022" (active) · "2019" · null when no start year. */
export function projectYears(
  p: Pick<ProjectView, "start_year" | "end_year" | "status">,
): string | null {
  if (!p.start_year) return null;
  if (p.end_year && p.end_year !== p.start_year) return `${p.start_year}–${p.end_year}`;
  if (p.status === "active" || p.status === "paused") return `Since ${p.start_year}`;
  return String(p.start_year);
}

export interface ProjectGroup {
  /** null = projects without a direction in this build. */
  direction: DirectionView | null;
  /** Stable id for anchors and headings. */
  id: string;
  projects: ProjectView[];
}

/**
 * /projects/ (§D6): grouped by PRIMARY direction (the first one), live
 * directions in editorial order, then archived directions, then projects with
 * no direction in this build. Empty groups are dropped.
 */
export function groupProjectsByPrimaryDirection(
  c: Pick<Content, "directions" | "archivedDirections" | "projects">,
): ProjectGroup[] {
  const groups: ProjectGroup[] = [...c.directions, ...c.archivedDirections].map((d) => ({
    direction: d,
    id: `group-${d.slug}`,
    projects: [],
  }));
  const bySlug = new Map(groups.map((g) => [g.direction!.slug, g]));
  const none: ProjectGroup = { direction: null, id: "group-other", projects: [] };
  for (const p of c.projects) {
    const g = p.primaryDirection ? bySlug.get(p.primaryDirection.slug) : undefined;
    (g ?? none).projects.push(p);
  }
  return [...groups, none]
    .filter((g) => g.projects.length > 0)
    .map((g) => ({ ...g, projects: [...g.projects].sort(compareProjects) }));
}

/** /research/ (§D4): projects grouped by status (Active, Paused, Completed); archived projects are left out. */
export function groupProjectsByStatus(
  projects: readonly ProjectView[],
): Array<{ status: ProjectView["status"]; label: string; projects: ProjectView[] }> {
  return PROJECT_STATUS_ORDER.filter((s) => s !== "archived")
    .map((status) => ({
      status,
      label: PROJECT_STATUS_LABELS[status],
      projects: projects.filter((p) => p.status === status).sort(compareProjects),
    }))
    .filter((g) => g.projects.length > 0);
}

/** Status values present, in display order (for the optional chip filter). */
export function statusesPresent(projects: readonly ProjectView[]): ProjectView["status"][] {
  return PROJECT_STATUS_ORDER.filter((s) => projects.some((p) => p.status === s));
}

const OUTPUT_KIND: Record<ProjectEntry["outputs"][number]["type"], MaterialKind> = {
  paper: "publisher",
  "working-paper": "publisher",
  slides: "slides",
  code: "code",
  data: "data",
  talk: "video",
  press: "press",
  other: "publisher",
};

/** Project outputs → materials row links (§D6.7). The editor's label is shown. */
export function outputsToMaterials(outputs: ProjectEntry["outputs"]): MaterialLink[] {
  return outputs.map((o) => ({ kind: OUTPUT_KIND[o.type], href: o.url, label: o.label }));
}

export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumb Research › {primary direction} › {project} (§D6.1). */
export function projectBreadcrumb(p: Pick<ProjectView, "title" | "primaryDirection">): Crumb[] {
  const crumbs: Crumb[] = [{ label: "Research", href: "/research/" }];
  if (p.primaryDirection) {
    crumbs.push({
      label: p.primaryDirection.short_label,
      href: `/research/${p.primaryDirection.slug}/`,
    });
  } else {
    crumbs.push({ label: "Projects", href: "/projects/" });
  }
  crumbs.push({ label: p.title });
  return crumbs;
}

export type TeamRow =
  /** A listed lab person in this build: avatar, link (when they have a profile) and role. */
  | { kind: "member"; person: PublicPerson }
  /** A team member without a public record in this build (draft or unlisted). */
  | { kind: "name"; slug: string; name: string };

/**
 * Project team rows in the editor's order (§D6.6; verify CON-11).
 *
 * The loader drops team members who are not listed in this build (in
 * production: every draft person, D-06), so a project could credit only the
 * PI while its paper, on the same page, names the student first author.
 * A hidden member is still named, as plain text with no link, role or avatar,
 * when, and only when, one of the project's papers in this build lists them
 * as an author: the name is then already public on that paper. Nothing from
 * their person record is used (no profile or details before consent, D-06).
 * Hidden members who are not authors of a paper here stay hidden.
 */
export function projectTeamRows(
  p: Pick<ProjectView, "team" | "teamRefs" | "publicationRefs">,
): TeamRow[] {
  const listed = new Map(p.teamRefs.map((m) => [m.slug, m]));
  const authorName = (slug: string) => {
    for (const pub of p.publicationRefs) {
      const a = pub.authors.find((x) => x.person === slug);
      if (a?.name.trim()) return a.name.trim();
    }
    return undefined;
  };
  const rows: TeamRow[] = [];
  for (const slug of new Set(p.team)) {
    const person = listed.get(slug);
    if (person) {
      rows.push({ kind: "member", person });
      continue;
    }
    const name = authorName(slug);
    if (name) rows.push({ kind: "name", slug, name });
  }
  return rows;
}

/**
 * Key findings for a project (§D6.5): projects have no findings field, so we
 * use the lab-written direction findings that cite one of the project's papers.
 */
export function projectFindings(
  c: Pick<Content, "directions" | "archivedDirections" | "getPublication">,
  p: Pick<ProjectView, "publications">,
): FindingView[] {
  const pubs = new Set(p.publications);
  const seen = new Set<string>();
  const out: FindingView[] = [];
  for (const d of [...c.directions, ...c.archivedDirections]) {
    for (const f of d.findings) {
      if (!f.publication || !pubs.has(f.publication)) continue;
      const key = `${f.publication}|${f.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        text: f.text,
        evidence: f.evidence,
        publication: c.getPublication(f.publication),
        direction: d,
      });
    }
  }
  return out;
}

/**
 * The paper to cite for a project (§D6.10): its newest published, counted
 * paper (journal first). None → the "How to cite" block is hidden.
 */
export function canonicalPaper(
  p: Pick<ProjectView, "publicationRefs">,
): PublicationView | undefined {
  const published = p.publicationRefs
    .filter((x) => x.counted && x.status === "published")
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  return (
    published.find((x) => x.type === "journal") ??
    published.find((x) => x.type === "conference") ??
    published[0]
  );
}

// ---------------------------------------------------------------------------
// Project page facts and the project line (redesign D-13; P3 `project.html`)

/** "1 journal article and 2 working papers" (counted papers, D-05). */
export function papersByType(
  pubs: ReadonlyArray<
    Pick<PublicationView, "type"> &
      Partial<Pick<PublicationView, "doi" | "links" | "presentations">>
  >,
): string | null {
  if (!pubs.length) return null;
  const order: string[] = [];
  const n = new Map<string, number>();
  for (const p of pubs) {
    const label = figureTypeWord(p).toLowerCase();
    if (!n.has(label)) order.push(label);
    n.set(label, (n.get(label) ?? 0) + 1);
  }
  return listJoin(
    order.map((label) => {
      const k = n.get(label)!;
      return `${k} ${k === 1 ? label : pluralWord(label)}`;
    }),
  );
}

/** "2025 and 2026" · "2021, 2023 and 2026" · null when no paper has a year. */
export function paperYears(pubs: ReadonlyArray<Pick<PublicationView, "year">>): string | null {
  const ys = [...new Set(pubs.map((p) => p.year).filter((y): y is number => !!y))].sort();
  return ys.length ? listJoin(ys.map(String)) : null;
}

/** The "Papers" fact: "2 working papers, 2025 and 2026"; "1 in progress" when none counts yet. */
export function papersFact(p: Pick<ProjectView, "publicationRefs">): string | null {
  const counted = p.publicationRefs.filter((x) => x.counted);
  const wip = p.publicationRefs.length - counted.length;
  const parts: string[] = [];
  const types = papersByType(counted);
  if (types) {
    const years = paperYears(counted);
    parts.push(years ? `${types}, ${years}` : types);
  }
  if (wip) parts.push(`${wip} in progress`);
  return parts.length ? parts.join("; ") : null;
}

const pluralWord = (label: string) =>
  label.endsWith("work in progress") ? label : label.replace(/(\w+)$/, (w) => `${w}s`);

export interface LineLane {
  slug: string;
  short_label: string;
  color: DirectionView["color"];
}

export interface LineNote {
  kind: "news";
  key: string;
  date: string;
  day: string;
  title: string;
  href: string;
}

export type LineEvent =
  | {
      kind: "paper";
      key: string;
      title: string;
      fullTitle: string;
      href: string;
      meta: string;
      /** Indexes into `lanes` where the paper's dot sits. */
      lanes: number[];
      /** Where the paper sits inside its year ('' = only the year is known). */
      date: string;
      /**
       * The lab's news item about this paper from the same year (e.g. "posted on
       * SSRN"): drawn in the paper's own column, above the lanes, so the dot
       * and the dated note that explains it line up.
       */
      note?: LineNote;
    }
  | LineNote;

export interface LineYear {
  year: number;
  events: LineEvent[];
}

export interface ProjectLineModel {
  lanes: LineLane[];
  years: LineYear[];
  papers: number;
  news: number;
}

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-05-11" → "11 May" (the column already gives the year). */
export function dayMonth(date: string): string {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(date);
  if (!m) return date;
  const mon = MONTHS_LONG[Number(m[2]) - 1] ?? "";
  return m[3] ? `${Number(m[3])} ${mon}` : mon;
}

const noteOf = (n: Pick<NewsView, "slug" | "date" | "title">): LineNote => ({
  kind: "news",
  key: n.slug,
  date: String(n.date).slice(0, 10),
  day: dayMonth(String(n.date)),
  title: n.title,
  href: `/news/${n.slug}/`,
});

/**
 * The project line (P3 `project.html` Figure 1): one lane per project
 * direction; each counted paper with a year is a dot on the lanes it belongs
 * to; each news item about the project's papers is a dated note. Years are
 * bins, and inside a year events run in date order, so left to right is
 * earlier to later:
 * - a paper's date is its `date_online` when that falls in its year, else the
 *   date of the lab's news item about it from that year, which is then drawn
 *   in the paper's column (P3: "Dispatching to Develop, 4 August, posted on
 *   SSRN") instead of as a second, separate note;
 * - papers with only a year come first in their bin (by title);
 * - every remaining news item is a note in its own column.
 * Notes and labels therefore never overlap. Returns null when there is
 * nothing worth drawing (fewer than two events, or no dated paper): the facts
 * row and the papers list carry those pages.
 */
export function projectLineModel(
  p: Pick<ProjectView, "directionRefs" | "publicationRefs">,
  news: ReadonlyArray<Pick<NewsView, "slug" | "date" | "title"> & { publications?: string[] }>,
): ProjectLineModel | null {
  const lanes: LineLane[] = p.directionRefs.map((d) => ({
    slug: d.slug,
    short_label: d.short_label,
    color: d.color,
  }));
  if (!lanes.length) return null;
  const papers = p.publicationRefs.filter((x) => x.counted && x.year);
  if (!papers.length || papers.length + news.length < 2) return null;
  const sortedNews = [...news].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const used = new Set<string>();
  const byYear = new Map<number, LineEvent[]>();
  const push = (y: number, e: LineEvent) => byYear.set(y, [...(byYear.get(y) ?? []), e]);
  for (const x of [...papers].sort((a, b) => a.title.localeCompare(b.title))) {
    const year = x.year!;
    const idx = lanes.map((l, i) => (x.directions.includes(l.slug) ? i : -1)).filter((i) => i >= 0);
    const n = sortedNews.find(
      (n) =>
        !used.has(n.slug) &&
        n.publications?.includes(x.slug) &&
        Number(String(n.date).slice(0, 4)) === year,
    );
    if (n) used.add(n.slug);
    const online =
      x.date_online && Number(String(x.date_online).slice(0, 4)) === year
        ? String(x.date_online)
        : "";
    push(year, {
      kind: "paper",
      key: x.slug,
      title: shortTitle(x.title),
      fullTitle: x.title,
      href: `/publications/${x.slug}/`,
      meta: figureTypeWord(x),
      lanes: idx.length ? idx : [0],
      date: online || (n ? String(n.date).slice(0, 10) : ""),
      note: n ? noteOf(n) : undefined,
    });
  }
  for (const n of sortedNews) {
    const y = Number(String(n.date).slice(0, 4));
    if (!y || used.has(n.slug)) continue;
    push(y, noteOf(n));
  }
  // Stable sort: undated papers ('' sorts first) keep their title order.
  const years = [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, events]) => ({
      year,
      events: [...events].sort((a, b) => a.date.localeCompare(b.date)),
    }));
  return { lanes, years, papers: papers.length, news: news.length };
}

/** The newest news item about the project (the "Latest" fact), or null. */
export function latestNews<T extends Pick<NewsView, "date">>(news: readonly T[]): T | null {
  return [...news].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] ?? null;
}
