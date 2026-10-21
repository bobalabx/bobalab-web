/**
 * Free-text search over publications (brief §D7) with MiniSearch.
 *
 * The server builds a small `PubDoc` per counted publication (`toPubDoc`);
 * the client island indexes them on load (a few dozen documents, so building
 * the index in the browser is cheaper than shipping a serialised one).
 * Pure module: no server-only imports.
 */
import MiniSearch from "minisearch";
import type { PublicationView } from "@/lib/content/load";
import type { PublicationType } from "@/lib/content/schema";

/** What the client needs to search and filter one publication. */
export interface PubDoc {
  slug: string;
  title: string;
  /** Author names, comma-separated (searchable). */
  authors: string;
  venue?: string;
  year?: number;
  type: PublicationType;
  /** Direction slugs present in this build. */
  directions: string[];
  /** Direction labels (searchable). */
  directionLabels: string;
  /** Slugs of listed lab people among the authors. */
  members: string[];
  /** The lab-written "In brief" (searchable). */
  text?: string;
}

export function toPubDoc(p: PublicationView): PubDoc {
  return {
    slug: p.slug,
    title: p.title,
    authors: p.authors.map((a) => a.name).join(", "),
    ...(p.venue ? { venue: p.venue } : {}),
    ...(p.year ? { year: p.year } : {}),
    type: p.type,
    directions: p.directionRefs.map((d) => d.slug),
    directionLabels: p.directionRefs.map((d) => `${d.short_label} ${d.title}`).join(" "),
    members: p.authorList.filter((a) => a.isLab && a.person).map((a) => a.person!.slug),
    ...(p.in_brief ? { text: p.in_brief } : {}),
  };
}

/** Lower-case and strip diacritics so "Blättchen" matches "blattchen". */
export function foldTerm(term: string): string {
  return term
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const FIELDS = ["title", "authors", "venue", "year", "directionLabels", "text"] as const;

export type PubIndex = MiniSearch<PubDoc>;

export function createIndex(docs: readonly PubDoc[]): PubIndex {
  const ms = new MiniSearch<PubDoc>({
    idField: "slug",
    fields: [...FIELDS],
    storeFields: [],
    extractField: (doc, field) => {
      const v = (doc as unknown as Record<string, unknown>)[field];
      return v === undefined || v === null ? "" : String(v);
    },
    processTerm: (term) => {
      const t = foldTerm(term);
      return t.length ? t : null;
    },
    searchOptions: {
      prefix: true,
      fuzzy: (term) => (term.length > 4 ? 0.2 : false),
      combineWith: "AND",
      boost: { title: 3, authors: 2, directionLabels: 1.5 },
    },
  });
  ms.addAll(docs as PubDoc[]);
  return ms;
}

/** Slugs matching `query`, or null when the query is blank (no text filter). */
export function searchSlugs(index: PubIndex, query: string): Set<string> | null {
  const q = query.trim();
  if (!q) return null;
  return new Set(index.search(q).map((r) => String(r.id)));
}
