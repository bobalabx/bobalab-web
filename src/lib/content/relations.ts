/**
 * Relations between collections (slugs stored in front matter) and the
 * derived flags that depend on them (D-05 counting rule, lab_work).
 */
import type { CollectionName, EntryMap, PersonEntry, PublicationEntry } from "./schema";

export interface RelationRef {
  /** Field path for messages, e.g. "authors.2.person". */
  field: string;
  target: CollectionName;
  slug: string;
}

/** Every slug reference an entry makes. Used by the validator and the loader. */
export function relationsOf<C extends CollectionName>(
  collection: C,
  e: EntryMap[C],
): RelationRef[] {
  const refs: RelationRef[] = [];
  const many = (field: string, target: CollectionName, slugs: string[] | undefined) =>
    (slugs ?? []).forEach((slug, i) => refs.push({ field: `${field}.${i}`, target, slug }));
  switch (collection) {
    case "directions": {
      const d = e as EntryMap["directions"];
      d.findings.forEach((f, i) => {
        if (f.publication)
          refs.push({
            field: `findings.${i}.publication`,
            target: "publications",
            slug: f.publication,
          });
      });
      break;
    }
    case "projects": {
      const p = e as EntryMap["projects"];
      many("directions", "directions", p.directions);
      many("team", "people", p.team);
      many("publications", "publications", p.publications);
      break;
    }
    case "publications": {
      const p = e as EntryMap["publications"];
      p.authors.forEach((a, i) => {
        if (a.person) refs.push({ field: `authors.${i}.person`, target: "people", slug: a.person });
      });
      many("directions", "directions", p.directions);
      break;
    }
    case "people": {
      const p = e as EntryMap["people"];
      many("directions", "directions", p.directions);
      break;
    }
    case "news": {
      const n = e as EntryMap["news"];
      many("people", "people", n.people);
      many("directions", "directions", n.directions);
      many("publications", "publications", n.publications);
      break;
    }
    case "opportunities": {
      const o = e as EntryMap["opportunities"];
      many("directions", "directions", o.directions);
      break;
    }
  }
  return refs;
}

/**
 * D-05: a publication has a public version when it has a DOI, an SSRN, arXiv,
 * PDF or publisher link.
 */
export function hasPublicVersion(p: Pick<PublicationEntry, "doi" | "links">): boolean {
  const l = p.links ?? {};
  return Boolean(p.doi || l.ssrn || l.arxiv || l.pdf || l.publisher);
}

/** D-05: …or a documented conference presentation (an entry with a source URL). */
export function hasDocumentedPresentation(p: Pick<PublicationEntry, "presentations">): boolean {
  return (p.presentations ?? []).some((x) => Boolean(x.url));
}

/**
 * D-05 counting rule: counts toward seeds, direction counts and the main
 * publications list. Everything else is "In progress" only.
 */
export function countsAsPublication(
  p: Pick<PublicationEntry, "doi" | "links" | "presentations">,
): boolean {
  return hasPublicVersion(p) || hasDocumentedPresentation(p);
}

/**
 * lab_work: at least one author is linked to a lab person other than the PI
 * (every paper has the PI, so the PI alone would make the flag meaningless).
 */
export function isLabWork(
  p: Pick<PublicationEntry, "authors">,
  peopleBySlug: Map<string, PersonEntry>,
): boolean {
  return p.authors.some((a) => {
    if (!a.person) return false;
    const person = peopleBySlug.get(a.person);
    return Boolean(person && person.role !== "pi");
  });
}
