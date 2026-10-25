/**
 * Home "Recent publications" (DECISIONS D-13; prototype p3/index.html shows the
 * three newest papers). The loader orders publications by year, then
 * `date_online`, then title; most entries have no `date_online`, so inside a year
 * that order is alphabetical, not recent. The home list therefore uses the
 * newest dated evidence the content already holds for each entry: its
 * `date_online`, or the date of the newest news item that cites it (a preprint
 * posted, a revision, a conference programme). Nothing is shown from these dates;
 * they only order the list.
 *
 * Inside a year, entries a reader can open (a public version: link or DOI) come
 * before entries counted only for a documented talk (D-05). Those still count in
 * Fig. 1 and are listed on /publications/; the home list prefers papers.
 */
import type { Content, PublicationView } from "@/lib/content/load";
import { dateSortKey } from "@/lib/content/dates";

/** Newest dated evidence per publication slug ("YYYY-MM-DD", "0000-00-00" if none). */
export function recencyKeys(c: Pick<Content, "countedPublications" | "news">): Map<string, string> {
  const keys = new Map<string, string>();
  const bump = (slug: string, d: string) => {
    if (d > (keys.get(slug) ?? "")) keys.set(slug, d);
  };
  for (const p of c.countedPublications) bump(p.slug, dateSortKey(p.date_online));
  for (const n of c.news) for (const p of n.publicationRefs) bump(p.slug, dateSortKey(n.date));
  return keys;
}

export function recentPublications(
  c: Pick<Content, "countedPublications" | "news">,
  n = 3,
): PublicationView[] {
  const key = recencyKeys(c);
  const k = (p: PublicationView) => key.get(p.slug) ?? "0000-00-00";
  return [...c.countedPublications]
    .sort(
      (a, b) =>
        (b.year ?? 0) - (a.year ?? 0) ||
        Number(b.publicVersion) - Number(a.publicVersion) ||
        k(b).localeCompare(k(a)) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, n);
}
