/**
 * Publications grouped by year (brief §D7), newest first. Shared by the static
 * server list (the <Suspense> fallback) and the client filter island, so both
 * render identical markup. No hooks: safe on either side.
 *
 * `entries` are the server-rendered <PublicationEntry> nodes keyed by slug.
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
}: {
  groups: YearGroup[];
  entries: Record<string, ReactNode>;
}) {
  return (
    <div className="pubs-groups">
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

/** "Jump to year" links for the groups currently shown. */
export function YearNav({ groups }: { groups: YearGroup[] }) {
  if (groups.length < 2) return null;
  return (
    <nav className="pubs-jump" aria-labelledby="pubs-jump-h">
      <h2 id="pubs-jump-h" className="pubs-jump__h">
        Jump to year
      </h2>
      <ul className="pubs-jump__list" role="list">
        {groups.map((g) => (
          <li key={yearAnchor(g.year)}>
            <a href={`#${yearAnchor(g.year)}`} className="pubs-jump__link">
              <span>{g.year ?? "Undated"}</span>
              <span className="pubs-jump__n">
                <span className="vh">, </span>
                {g.slugs.length}
                <span className="vh">
                  {g.slugs.length === 1 ? " publication" : " publications"}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
