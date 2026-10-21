/**
 * Pure helpers for the project pages (WP2; brief §D4, §D6). Unit-tested in
 * tests/unit/direction/projects.test.ts.
 */
import type { Content, DirectionView, ProjectView, PublicationView } from "@/lib/content/load";
import type { FindingView } from "@/lib/content/queries";
import type { MaterialKind, MaterialLink } from "@/components/ui/MaterialsRow";
import type { ProjectEntry } from "@/lib/content/schema";
import type { PublicPerson } from "@/lib/content/people";

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
