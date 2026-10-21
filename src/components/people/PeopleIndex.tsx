/**
 * The People index body (brief §D9, DECISIONS D-06). Server component; the only
 * client code is the optional filter island (PeopleFilters).
 *
 * Order: Principal investigator → Postdocs → PhD students → Pre-docs & research
 * staff → Master's students → Undergraduate RAs → Affiliates & collaborators,
 * then Alumni in a collapsed <details>, grouped by end year (newest first).
 * Sorting inside a group: role → rank → last name (lib/content/people).
 * Groups without people are not rendered.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { Content } from "@/lib/content/load";
import { Icon } from "@/components/ui/icons";
import { AlumniEntry, PeopleCard } from "./PeopleCard";
import { FilterCount, FilterGroup, FilterItem, PeopleFilters } from "./PeopleFilters";
import { buildPeopleIndex, type PersonItem } from "./model";
import "./people.css";

/** No-JS visitors see the full list, so the (inert) filter bar is hidden for them. */
const NOSCRIPT_CSS = ".pp-filters{display:none!important}";

// Filterable wrappers are client components only when the island is on, so a
// page without filters ships no extra JS.

function MaybeItem({
  filterable,
  item,
  className,
  children,
}: {
  filterable: boolean;
  item: PersonItem;
  className: string;
  children: ReactNode;
}) {
  if (filterable)
    return (
      <FilterItem meta={item.meta} className={className}>
        {children}
      </FilterItem>
    );
  return <li className={className}>{children}</li>;
}

function MaybeGroup({
  filterable,
  items,
  as: Tag = "section",
  className,
  labelledBy,
  children,
}: {
  filterable: boolean;
  items: PersonItem[];
  as?: "section" | "div";
  className: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  // aria-labelledby is prohibited on a generic <div>; a labelled div is a group.
  const role = Tag === "div" && labelledBy ? "group" : undefined;
  if (filterable)
    return (
      <FilterGroup
        metas={items.map((i) => i.meta)}
        as={Tag}
        role={role}
        className={className}
        labelledBy={labelledBy}
      >
        {children}
      </FilterGroup>
    );
  return (
    <Tag className={className} role={role} aria-labelledby={labelledBy}>
      {children}
    </Tag>
  );
}

function MaybeCount({
  filterable,
  items,
  noun,
}: {
  filterable: boolean;
  items: PersonItem[];
  noun: [string, string];
}) {
  if (filterable) return <FilterCount metas={items.map((i) => i.meta)} noun={noun} />;
  return (
    <>
      {items.length}
      <span className="vh"> {items.length === 1 ? noun[0] : noun[1]}</span>
    </>
  );
}

export function PeopleIndex({ content }: { content: Content }) {
  const m = buildPeopleIndex(content);
  const f = m.showFilters;

  const list = (
    <div className="pp-groups">
      {m.groups.map((g) => (
        <MaybeGroup
          key={g.role}
          filterable={f}
          items={g.items}
          className="pp-group"
          labelledBy={g.id}
        >
          <div className="pp-group__head">
            <h2 id={g.id} className="pp-group__title">
              {g.label}
            </h2>
            {/* A count of "1" next to "Principal investigator" says nothing. */}
            {g.role !== "pi" && (
              <span className="pp-group__count">
                <MaybeCount filterable={f} items={g.items} noun={["person", "people"]} />
              </span>
            )}
          </div>
          <ul className={g.role === "pi" ? "pp-grid pp-grid--lead" : "pp-grid"} role="list">
            {g.items.map((item) => (
              <MaybeItem
                key={item.person.slug}
                filterable={f}
                item={item}
                className="pp-grid__item"
              >
                <PeopleCard item={item} lead={g.role === "pi"} />
              </MaybeItem>
            ))}
          </ul>
        </MaybeGroup>
      ))}

      {m.alumni.length > 0 && (
        <MaybeGroup
          filterable={f}
          items={m.alumniItems}
          className="pp-group pp-alumni"
          labelledBy="people-alumni"
        >
          <div className="pp-group__head">
            <h2 id="people-alumni" className="pp-group__title">
              Alumni
            </h2>
            <span className="pp-group__count">
              <MaybeCount filterable={f} items={m.alumniItems} noun={["alum", "alumni"]} />
            </span>
          </div>
          <details className="pp-alumni__details">
            <summary className="pp-alumni__summary">
              <Icon name="chevron" className="pp-alumni__chev" />
              <span className="pp-alumni__show">Show alumni</span>
              <span className="pp-alumni__hide">Hide alumni</span>
            </summary>
            <div className="pp-alumni__years">
              {m.alumni.map((y) => (
                <MaybeGroup
                  key={y.id}
                  filterable={f}
                  items={y.items}
                  as="div"
                  className="pp-year"
                  labelledBy={y.id}
                >
                  <h3 id={y.id} className="pp-year__title">
                    {y.label}
                  </h3>
                  <ul className="pp-alumni__list" role="list">
                    {y.items.map((item) => (
                      <MaybeItem
                        key={item.person.slug}
                        filterable={f}
                        item={item}
                        className="pp-alumni__item"
                      >
                        <AlumniEntry item={item} />
                      </MaybeItem>
                    ))}
                  </ul>
                </MaybeGroup>
              ))}
            </div>
          </details>
        </MaybeGroup>
      )}
    </div>
  );

  return (
    <div className="bl-container pp-page">
      <header className="pp-head">
        <h1 tabIndex={-1}>People</h1>
        {/* With a single group the summary would only repeat its heading. */}
        {m.summary.length > 1 ? (
          <p className="pp-summary">
            {m.summary.map((s, i) => (
              <span key={s.label} className="pp-summary__part">
                <span className="pp-summary__n">{s.count}</span> {s.label}
                {i < m.summary.length - 1 && (
                  <>
                    <span className="vh">,</span>
                    <span className="pp-summary__sep" aria-hidden="true">
                      ·
                    </span>
                  </>
                )}
              </span>
            ))}
          </p>
        ) : m.summary.length === 0 ? (
          <p className="pp-summary">No one is listed yet.</p>
        ) : null}
      </header>

      {f ? (
        <>
          <noscript>
            <style>{NOSCRIPT_CSS}</style>
          </noscript>
          <PeopleFilters
            roleOptions={m.roleOptions.map(({ value, label }) => ({ value, label }))}
            directionOptions={m.directionOptions.map(({ value, label, swatch }) => ({
              value,
              label,
              swatch,
            }))}
            all={m.all.map((i) => i.meta)}
          >
            {list}
          </PeopleFilters>
        </>
      ) : (
        list
      )}

      <p className="pp-join">
        <Link className="bl-cta bl-cta--quiet" href="/join/">
          Work with us <Icon name="arrow-right" />
        </Link>
      </p>
    </div>
  );
}
