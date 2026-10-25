/**
 * The publications ledger grouped by year (brief §D7; D-13 "Lines"), newest
 * first. From 48rem each year is one band of the label-column grid: the
 * condensed year and its count sit in the 18rem label column and stay in view
 * while its rows scroll past (the year rail); the rows are a ruled ledger in
 * the track. Below 48rem the year is an inline heading over its rows.
 *
 * Shared by the static server list (the <Suspense> fallback) and the client
 * filter island, so both render identical markup. No hooks: safe on either side.
 * `entries` are the server-rendered rows keyed by slug.
 */
import type { ReactNode } from "react";
import { yearAnchor } from "@/lib/publications/filters";

export interface YearGroup {
  year: number | null;
  slugs: string[];
}

export const pubCount = (n: number) => `${n} ${n === 1 ? "publication" : "publications"}`;

export function YearGroups({
  groups,
  entries,
  steep,
}: {
  groups: YearGroup[];
  entries: Record<string, ReactNode>;
  /** Results changed after a filter change: they steep in once (opacity only). */
  steep?: boolean;
}) {
  return (
    <div className="pubs-groups" data-steep={steep ? "" : undefined}>
      {groups.map((g) => {
        const id = yearAnchor(g.year);
        return (
          <section key={id} className="pubs-year" aria-labelledby={id}>
            <div className="pubs-year__head">
              <h2 id={id} className="pubs-year__h">
                {g.year ?? "Undated"}
              </h2>
              <p className="pubs-year__count">{pubCount(g.slugs.length)}</p>
            </div>
            <ul className="pubs-list" role="list">
              {g.slugs.map((slug) => (
                <li key={slug}>{entries[slug]}</li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** "Jump to year" links for the groups currently shown (plain anchors: they work without JS). */
export function YearNav({ groups }: { groups: YearGroup[] }) {
  if (groups.length < 2) return null;
  return (
    <nav className="pubs-jump" aria-label="Jump to year">
      <span className="pubs-jump__h" aria-hidden="true">
        Jump to
      </span>
      <ul className="pubs-jump__list" role="list">
        {groups.map((g) => (
          <li key={yearAnchor(g.year)}>
            <a href={`#${yearAnchor(g.year)}`} className="pubs-jump__link">
              {g.year ?? "Undated"}
              <span className="vh">
                , {g.slugs.length} {g.slugs.length === 1 ? "publication" : "publications"}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
