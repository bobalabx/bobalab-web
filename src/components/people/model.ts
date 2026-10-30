/**
 * View models for the People section of the home page and the person pages
 * (brief §D9, DECISIONS D-06; the separate /people/ list page moved onto the
 * home page, owner 2026-10-29). Server-side and pure: everything comes from the
 * loaded Content, which has already dropped hidden entries (production),
 * unlisted people and consent-gated fields.
 */
import type {
  Content,
  DirectionView,
  NewsView,
  ProjectView,
  PublicationView,
} from "@/lib/content/load";
import {
  ROLE_LABELS,
  avatarSwatch,
  formerRole,
  groupPeople,
  initials,
  type PeopleGroup,
  type PublicPerson,
} from "@/lib/content/people";
import { directionsOf, personDetail } from "@/lib/content/queries";
import { formatDate } from "@/lib/content/dates";
import type { SwatchId } from "@/lib/content/palette";

// ---------------------------------------------------------------------------
// Person-level helpers

/** Shared with PersonCard (WP4 request 1). */
export { avatarSwatch };

/**
 * "PhD student, Economics", or the position title (the PI's faculty title).
 * Undergraduates show only their title and major ("Lab manager", "EECS"), or
 * nothing until the major is known (PI, 2026-10-26).
 */
export function roleLine(p: Pick<PublicPerson, "role" | "title" | "program">): string {
  const role = p.title?.trim() || (p.role === "undergrad" ? "" : ROLE_LABELS[p.role].one);
  return [role, p.program?.trim()].filter(Boolean).join(", ");
}

/** "Since Aug 2023" · "2022–2024" · "Until 2025" · null. From `start` / `end` only. */
export function tenureLine(p: Pick<PublicPerson, "start" | "end" | "isAlumni">): string | null {
  const s = p.start ? formatDate(p.start) : "";
  const e = p.end ? formatDate(p.end) : "";
  if (s && e && p.isAlumni) return s === e ? s : `${s}–${e}`;
  if (s && !p.isAlumni) return `Since ${s}`;
  if (e && p.isAlumni) return `Until ${e}`;
  return null;
}

export interface PersonLink {
  key: string;
  label: string;
  href: string;
}

/**
 * Display order of a person's links. The Haas faculty profile leads: it is the
 * PI's official university page (R2 §2), the one a Haas visitor checks first.
 * Every key in the schema's `links` object must appear here, or it is dropped.
 */
export const LINK_ORDER = [
  "haas",
  "website",
  "scholar",
  "linkedin",
  "github",
  "orcid",
  "cv",
] as const satisfies ReadonlyArray<keyof NonNullable<PublicPerson["links"]>>;
const LINK_LABELS: Record<(typeof LINK_ORDER)[number], string> = {
  haas: "Haas faculty profile",
  website: "Website",
  scholar: "Google Scholar",
  linkedin: "LinkedIn",
  github: "GitHub",
  orcid: "ORCID",
  cv: "CV",
};

/** Public links in a fixed order, plus email only when the loader kept it (email_public). */
export function personLinks(p: Pick<PublicPerson, "links" | "email">): PersonLink[] {
  const links = (p.links ?? {}) as Partial<Record<(typeof LINK_ORDER)[number], string>>;
  const out: PersonLink[] = [];
  for (const key of LINK_ORDER) {
    const href = links[key];
    if (href) out.push({ key, label: LINK_LABELS[key], href });
  }
  if (p.email) out.push({ key: "email", label: "Email", href: `mailto:${p.email}` });
  return out;
}

// ---------------------------------------------------------------------------
// The People section (home page)

export interface PersonItem {
  person: PublicPerson;
  directions: DirectionView[];
  swatch: SwatchId;
  initials: string;
  roleLine: string;
}

export interface RoleGroup {
  role: PeopleGroup;
  label: string;
  id: string;
  items: PersonItem[];
}

export interface AlumniYearGroup {
  year: number | null;
  label: string;
  id: string;
  items: PersonItem[];
}

export interface PeopleIndexModel {
  groups: RoleGroup[];
  alumni: AlumniYearGroup[];
  current: PersonItem[];
  alumniItems: PersonItem[];
  /** Every rendered person, current first, in DOM order. */
  all: PersonItem[];
}

export function toItem(c: Content, person: PublicPerson): PersonItem {
  const directions = directionsOf(c, person.directions);
  return {
    person,
    directions,
    swatch: avatarSwatch(person.slug, directions),
    initials: initials(person.name),
    roleLine: roleLine(person),
  };
}

/**
 * The groups of the home page's People section, in order: Principal
 * investigator → Postdocs → Graduate students (PhD, then master's) → Pre-docs &
 * research staff → Undergraduate RAs (lab managers first: rank) → Affiliates &
 * collaborators; then alumni by end year, newest first. Empty groups are left out.
 */
export function buildPeopleIndex(c: Content): PeopleIndexModel {
  // c.people is already listed-only; filter again defensively (D-06).
  const people = c.people.filter((p) => p.listed);
  const grouped = groupPeople(people);
  const groups: RoleGroup[] = grouped.current.map((g) => ({
    role: g.role,
    label: g.label,
    id: `people-${g.role}`,
    items: g.people.map((p) => toItem(c, p)),
  }));
  const alumni: AlumniYearGroup[] = grouped.alumni.map((g) => ({
    year: g.year,
    label: g.year === null ? "Year not recorded" : String(g.year),
    id: `alumni-${g.year ?? "unknown"}`,
    items: g.people.map((p) => toItem(c, p)),
  }));
  const current = groups.flatMap((g) => g.items);
  const alumniItems = alumni.flatMap((g) => g.items);
  return { groups, alumni, current, alumniItems, all: [...current, ...alumniItems] };
}

// ---------------------------------------------------------------------------
// Person page

export interface PersonProfileModel {
  item: PersonItem;
  /**
   * The lab role: "Principal investigator", "Former undergraduate RA". The person
   * page shows it in the meta row after the name and title (not above the h1).
   */
  eyebrow: string;
  /** Position title (PI) or program, when present. */
  lead: string | null;
  tenure: string | null;
  links: PersonLink[];
  directions: DirectionView[];
  /** Papers that count under D-05, newest first. */
  publications: PublicationView[];
  /** The newest PROFILE_PUBLICATION_LIMIT of those, listed on the page; the rest are a link away. */
  shownPublications: PublicationView[];
  /** Work in progress without a public version (D-05 "In progress"). */
  inProgress: PublicationView[];
  projects: ProjectView[];
  news: NewsView[];
}

const STATUS_RANK: Record<ProjectView["status"], number> = {
  active: 0,
  paused: 1,
  completed: 2,
  archived: 3,
};
/** Active projects first, then newest start year, then title. */
const byStatus = (a: ProjectView, b: ProjectView) =>
  STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
  (b.start_year ?? 0) - (a.start_year ?? 0) ||
  a.title.localeCompare(b.title);

/** Papers listed on a person page before "See all N in Publications" carries the rest (VIS-08). */
export const PROFILE_PUBLICATION_LIMIT = 5;

export function buildPersonProfile(c: Content, slug: string): PersonProfileModel | undefined {
  const d = personDetail(c, slug);
  if (!d) return undefined;
  const p = d.person;
  const roleOne = ROLE_LABELS[p.role].one;
  const lead = p.title?.trim() || p.program?.trim() || null;
  const publications = d.publications.filter((x) => x.counted);
  return {
    item: toItem(c, p),
    eyebrow: p.isAlumni ? formerRole(p.role) : roleOne,
    lead: p.title?.trim() && p.program?.trim() ? `${p.title.trim()}, ${p.program.trim()}` : lead,
    tenure: tenureLine(p),
    links: personLinks(p),
    directions: d.directions,
    publications,
    shownPublications: publications.slice(0, PROFILE_PUBLICATION_LIMIT),
    inProgress: d.publications.filter((x) => !x.counted),
    projects: [...d.projects].sort(byStatus),
    news: d.news,
  };
}
