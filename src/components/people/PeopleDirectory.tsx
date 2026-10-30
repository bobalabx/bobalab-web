/**
 * The people of the lab, as the home page's People section lists them (brief
 * §D9, DECISIONS D-06; D-13 item 5). This was the body of the separate /people/
 * page until the owner moved it onto the home page (2026-10-29). Server
 * component, no client code: the old filter chips were left out on the home
 * page, so everything is a plain list that works without JavaScript.
 *
 * Label-column grid: each group's title (h3) sits in the label column (no
 * headcounts, copy sweep) and its people in the track: the PI first (160 px
 * square, affiliation and links), then ruled rows with 64 px square photos or
 * initials, then alumni as a compact ruled list by year in a collapsed <details>.
 *
 * Order: Principal investigator → Postdocs → Graduate students (PhD, then
 * master's) → Pre-docs & research staff → Undergraduate RAs → Affiliates &
 * collaborators, then Alumni grouped by end year (newest first). Sorting inside
 * a group: role → rank → last name (lib/content/people), so lab managers
 * (rank 1) lead the undergraduates. Groups without people are not rendered.
 * Only listed people ever reach this list (the loader drops the rest, and
 * hidden entries in production).
 */
import { AlumniEntry, PeopleCard } from "./PeopleCard";
import type { PeopleIndexModel } from "./model";
import "./people.css";

export function PeopleDirectory({
  model: m,
  affiliation,
}: {
  model: PeopleIndexModel;
  /** The lab's affiliation (site.yml), shown under the PI's title. */
  affiliation?: string;
}) {
  return (
    <div className="pp-groups">
      {m.groups.map((g) => (
        <section key={g.role} className="pp-group" aria-labelledby={g.id}>
          <div className="pp-group__head">
            <h3 id={g.id} className="pp-group__title">
              {g.label}
            </h3>
          </div>
          <ul className={g.role === "pi" ? "pp-grid pp-grid--lead" : "pp-grid"} role="list">
            {g.items.map((item) => (
              <li key={item.person.slug} className="pp-grid__item">
                <PeopleCard
                  item={item}
                  lead={g.role === "pi"}
                  affiliation={g.role === "pi" ? affiliation : undefined}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {m.alumni.length > 0 && (
        <section className="pp-group pp-alumni" aria-labelledby="people-alumni">
          <div className="pp-group__head">
            <h3 id="people-alumni" className="pp-group__title">
              Alumni
            </h3>
          </div>
          <details className="pp-alumni__details">
            <summary className="pp-alumni__summary">
              <span className="pp-alumni__show">Show alumni</span>
              <span className="pp-alumni__hide">Hide alumni</span>
            </summary>
            <div className="pp-alumni__years">
              {m.alumni.map((y) => (
                // aria-labelledby is prohibited on a generic <div>; a labelled div is a group.
                <div key={y.id} className="pp-year" role="group" aria-labelledby={y.id}>
                  <h4 id={y.id} className="pp-year__title">
                    {y.label}
                  </h4>
                  <ul className="pp-alumni__list" role="list">
                    {y.items.map((item) => (
                      <li key={item.person.slug} className="pp-alumni__item">
                        <AlumniEntry item={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
