/**
 * The People index body (brief §D9, DECISIONS D-06; D-13 item 5). Server
 * component; the only client code is the optional filter island (PeopleFilters).
 * Label-column grid: each group's title sits in the label column (no headcounts,
 * copy sweep) and
 * its people in the track: the PI first (160 px square), then ruled rows with
 * 64 px square photos, then alumni as a compact ruled list by year.
 *
 * Order: Principal investigator → Postdocs → PhD students → Pre-docs & research
 * staff → Master's students → Undergraduate RAs → Affiliates & collaborators,
 * then Alumni in a collapsed <details>, grouped by end year (newest first).
 * Sorting inside a group: role → rank → last name (lib/content/people).
 * Groups without people are not rendered.
 */
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { Content } from "@/lib/content/load";
import { PageHeader } from "@/components/pages/PageHeader";
import { AlumniEntry, PeopleCard } from "./PeopleCard";
import { FilterGroup, FilterItem, PeopleFilters } from "./PeopleFilters";
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

export function PeopleIndex({ content }: { content: Content }) {
  const m = buildPeopleIndex(content);
  const f = m.showFilters;
  const affiliation = content.site.affiliation_text;

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
          </div>
          <ul className={g.role === "pi" ? "pp-grid pp-grid--lead" : "pp-grid"} role="list">
            {g.items.map((item) => (
              <MaybeItem
                key={item.person.slug}
                filterable={f}
                item={item}
                className="pp-grid__item"
              >
                <PeopleCard
                  item={item}
                  lead={g.role === "pi"}
                  affiliation={g.role === "pi" ? affiliation : undefined}
                />
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
          </div>
          <details className="pp-alumni__details">
            <summary className="pp-alumni__summary">
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
    <div className="bl-container pg pp-page">
      <PageHeader title="People">
        {/* D-15: no count sentence (the groups below carry the people); only the empty state. */}
        {m.summary.length === 0 ? <p className="pp-summary">No one is listed yet.</p> : null}
        {/* Internal tools for lab members (site.yml member_links), e.g. the lab scheduler. */}
        {content.site.member_links.length > 0 ? (
          <p className="pp-members">
            For lab members:{" "}
            {content.site.member_links.map((l, i) => (
              <Fragment key={l.url}>
                {i > 0 ? ", " : null}
                <a href={l.url} rel="noopener noreferrer">
                  {l.label}
                </a>
              </Fragment>
            ))}
          </p>
        ) : null}
      </PageHeader>

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

      <p className="pp-join pg-track">
        <Link className="bl-cta bl-cta--quiet" href="/join/">
          Work with us
        </Link>
      </p>
    </div>
  );
}
