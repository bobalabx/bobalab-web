/**
 * People derivations (brief §D9, DECISIONS D-06).
 * - current vs alumni comes from `end` vs the build date in America/Los_Angeles;
 * - consent flags gate photo, email and "now at";
 * - `listed: false` people are never rendered or linked.
 */
import type { PersonEntry, PersonRole } from "./schema";
import { periodEndedBefore, parseDateParts, todayInLab } from "./dates";
import { DEFAULT_SWATCH_ORDER, type SwatchId } from "./palette";

/**
 * Deterministic pearl-initial avatar colour (brief §D9; WP4 request 1).
 * A person tagged with a direction takes that direction's colour (so the
 * avatar agrees with their tags); otherwise a stable FNV-1a hash of the slug
 * picks one from the CVD-checked set (§C3), so the same person gets the same
 * pearl on home, /people/ and every card.
 */
export function avatarSwatch(
  slug: string,
  directions: ReadonlyArray<{ color: SwatchId }> = [],
): SwatchId {
  const own = directions[0]?.color;
  if (own) return own;
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return DEFAULT_SWATCH_ORDER[h % DEFAULT_SWATCH_ORDER.length]!;
}

export const ROLE_ORDER: PersonRole[] = [
  "pi",
  "postdoc",
  "phd",
  "predoc-staff",
  "masters",
  "undergrad",
  "affiliate",
];

export const ROLE_LABELS: Record<PersonRole, { one: string; group: string }> = {
  pi: { one: "Faculty Director", group: "Faculty Director" },
  postdoc: { one: "Postdoctoral scholar", group: "Postdocs" },
  phd: { one: "PhD student", group: "PhD students" },
  "predoc-staff": { one: "Pre-doc / research staff", group: "Pre-docs & research staff" },
  masters: { one: "Master's student", group: "Master's students" },
  undergrad: { one: "Undergraduate RA", group: "Undergraduate RAs" },
  affiliate: { one: "Affiliate", group: "Affiliates & collaborators" },
};

export function isAlumni(
  p: Pick<PersonEntry, "end" | "role">,
  today: string = todayInLab(),
): boolean {
  if (p.role === "pi") return false;
  return p.end ? periodEndedBefore(p.end, today) : false;
}

/** Year used to group alumni (the `end` year). */
export function alumniYear(p: Pick<PersonEntry, "end">): number | null {
  return parseDateParts(p.end)?.year ?? null;
}

export function lastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1] ?? name).toLowerCase();
}

/** Sort: role → rank → last name → name. */
export function comparePeople(a: PersonEntry, b: PersonEntry): number {
  const r = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
  if (r) return r;
  const ra = a.rank ?? Number.POSITIVE_INFINITY;
  const rb = b.rank ?? Number.POSITIVE_INFINITY;
  if (ra !== rb) return ra < rb ? -1 : 1;
  const l = lastName(a.name).localeCompare(lastName(b.name));
  return l || a.name.localeCompare(b.name);
}

/** Initials for the pearl avatar: first + last initial. */
export function initials(name: string): string {
  const parts = name
    .replace(/["“”(].*?["“”)]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : "";
  return (first + last).toUpperCase();
}

/** The public view of a person: consent-gated fields removed. */
export interface PublicPerson extends PersonEntry {
  isAlumni: boolean;
  hasProfile: boolean;
}

export function toPublicPerson(p: PersonEntry, today: string = todayInLab()): PublicPerson {
  return {
    ...p,
    photo: p.photo_consent ? p.photo : undefined,
    photo_alt: p.photo_consent ? p.photo_alt : undefined,
    email: p.email_public ? p.email : undefined,
    now_at: p.now_at_public ? p.now_at : undefined,
    isAlumni: isAlumni(p, today),
    hasProfile: p.role === "pi" || p.profile_page,
  };
}

/** Group current people by role in §D9 order; alumni grouped by end year (desc). */
export function groupPeople(people: PublicPerson[]): {
  current: Array<{ role: PersonRole; label: string; people: PublicPerson[] }>;
  alumni: Array<{ year: number | null; people: PublicPerson[] }>;
} {
  const listed = people.filter((p) => p.listed);
  const current = ROLE_ORDER.map((role) => ({
    role,
    label: ROLE_LABELS[role].group,
    people: listed.filter((p) => !p.isAlumni && p.role === role).sort(comparePeople),
  })).filter((g) => g.people.length);
  const byYear = new Map<number | null, PublicPerson[]>();
  for (const p of listed.filter((x) => x.isAlumni)) {
    const y = alumniYear(p);
    byYear.set(y, [...(byYear.get(y) ?? []), p]);
  }
  const alumni = [...byYear.entries()]
    .sort((a, b) => (b[0] ?? 0) - (a[0] ?? 0))
    .map(([year, ps]) => ({ year, people: ps.sort(comparePeople) }));
  return { current, alumni };
}
