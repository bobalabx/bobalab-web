/**
 * Server-side data for the publications index: search documents and the
 * facet options (brief §D7). Facet options list only values that occur in
 * this build's counted publications, in editorial order:
 *   direction → live directions (site.direction_order), then archived ones;
 *   type      → schema order;
 *   member    → listed lab people in People-page order (role → rank → name).
 */
import type { Content, PublicationView } from "@/lib/content/load";
import { PUBLICATION_TYPES } from "@/lib/content/schema";
import { PUBLICATION_TYPE_LABELS } from "@/components/ui/labels";
import { typeWord } from "./csl";
import { toPubDoc, type PubDoc } from "./search";
import type { Facets } from "./filters";

export interface IndexData {
  docs: PubDoc[];
  facets: Facets;
}

/**
 * A type toggle's label: the type word its items share ("Thesis" when every
 * `other` entry is a thesis, see typeWord), otherwise the schema label.
 */
function typeLabel(pubs: readonly PublicationView[], t: PublicationView["type"]): string {
  const words = new Set(pubs.filter((p) => p.type === t).map(typeWord));
  return words.size === 1 ? [...words][0]! : PUBLICATION_TYPE_LABELS[t];
}

export function buildIndexData(
  c: Pick<Content, "directions" | "archivedDirections" | "people">,
  pubs: readonly PublicationView[],
): IndexData {
  const docs = pubs.map(toPubDoc);
  const used = (pick: (d: PubDoc) => readonly string[]) => new Set(docs.flatMap(pick));

  const dirs = used((d) => d.directions);
  const types = used((d) => [d.type]);
  const members = used((d) => d.members);

  const facets: Facets = {
    direction: [...c.directions, ...c.archivedDirections]
      .filter((d) => dirs.has(d.slug))
      .map((d) => ({ value: d.slug, label: d.short_label, swatch: d.color })),
    type: PUBLICATION_TYPES.filter((t) => types.has(t)).map((t) => ({
      value: t,
      label: typeLabel(pubs, t),
    })),
    member: c.people
      .filter((p) => members.has(p.slug))
      .map((p) => ({ value: p.slug, label: p.name })),
    years: [...new Set(docs.map((d) => d.year).filter((y): y is number => !!y))].sort(
      (a, b) => b - a,
    ),
  };
  return { docs, facets };
}
