/**
 * View models for the People index and person pages (brief §D9, DECISIONS D-06).
 * Server-side and pure: everything comes from the loaded Content, which has
 * already dropped drafts (production), unlisted people and consent-gated fields.
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
  ROLE_ORDER,
  avatarSwatch,
  groupPeople,
  initials,
  type PublicPerson,
} from "@/lib/content/people";
import { directionsOf, personDetail } from "@/lib/content/queries";
import { formatDate } from "@/lib/content/dates";
import type { SwatchId } from "@/lib/content/palette";
import type { PersonRole } from "@/lib/content/schema";
import type { FilterMeta } from "./filter";

// ---------------------------------------------------------------------------
// Person-level helpers

/** Shared with PersonCard and the home People strip (WP4 request 1). */
export { avatarSwatch };

/** "Undergraduate RA · applied math", or the position title (the PI's faculty title). */
export function roleLine(p: Pick<PublicPerson, "role" | "title" | "program">): string {
  const role = p.title?.trim() || ROLE_LABELS[p.role].one;
  return [role, p.program?.trim()].filter(Boolean).join(" · ");
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

/** Singular / plural group label: "1 Master's student", "8 Undergraduate RAs". */
export function countLabel(role: PersonRole, n: number): string {
  return n === 1 ? ROLE_LABELS[role].one : ROLE_LABELS[role].group;
}

// ---------------------------------------------------------------------------
// People index

export interface PersonItem {
  person: PublicPerson;
  directions: DirectionView[];
  swatch: SwatchId;
  initials: string;
  roleLine: string;
  meta: FilterMeta;
}

export interface RoleGroup {
  role: PersonRole;
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

export interface ChipOptionModel {
  value: string;
  label: string;
  count: number;
  /** Direction chips carry the direction colour (FilterChips dot; WP4 request 3). */
  swatch?: SwatchId;
}

export interface PeopleIndexModel {
  groups: RoleGroup[];
  alumni: AlumniYearGroup[];
  current: PersonItem[];
  alumniItems: PersonItem[];
  /** Every rendered person, current first, in DOM order. */
  all: PersonItem[];
  roleOptions: ChipOptionModel[];
  directionOptions: ChipOptionModel[];
  /** Show the filter island only when it can actually narrow the list. */
  showFilters: boolean;
  /** "1 Principal investigator · 8 Undergraduate RAs · 21 Alumni" parts. */
  summary: Array<{ count: number; label: string }>;
}

export function toItem(c: Content, person: PublicPerson): PersonItem {
  const directions = directionsOf(c, person.directions);
  return {
    person,
    directions,
    swatch: avatarSwatch(person.slug, directions),
    initials: initials(person.name),
    roleLine: roleLine(person),
    meta: { role: person.role, directions: directions.map((d) => d.slug), alumni: person.isAlumni },
  };
}

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
  const all = [...current, ...alumniItems];

  const roleOptions: ChipOptionModel[] = ROLE_ORDER.map((role) => ({
    value: role,
    label: ROLE_LABELS[role].group,
    count: all.filter((i) => i.person.role === role).length,
  })).filter((o) => o.count > 0);

  const dirOrder = [...c.directions, ...c.archivedDirections];
  const directionOptions: ChipOptionModel[] = dirOrder
    .map((d) => ({
      value: d.slug,
      label: d.short_label,
      swatch: d.color,
      count: all.filter((i) => i.meta.directions.includes(d.slug)).length,
    }))
    .filter((o) => o.count > 0);

  const summary = [
    ...groups.map((g) => ({ count: g.items.length, label: countLabel(g.role, g.items.length) })),
    ...(alumniItems.length ? [{ count: alumniItems.length, label: "Alumni" }] : []),
  ];

  return {
    groups,
    alumni,
    current,
    alumniItems,
    all,
    roleOptions,
    directionOptions,
    showFilters: all.length > 1 && (roleOptions.length > 1 || directionOptions.length > 0),
    summary,
  };
}

// ---------------------------------------------------------------------------
// Person page

export interface PersonProfileModel {
  item: PersonItem;
  /** "Principal investigator" · "Alumni · Undergraduate RA". */
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
    eyebrow: p.isAlumni ? `Alumni · ${roleOne}` : roleOne,
    lead: p.title?.trim() && p.program?.trim() ? `${p.title.trim()} · ${p.program.trim()}` : lead,
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
