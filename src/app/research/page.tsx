/**
 * Research index `/research/` (brief §D4; DECISIONS D-04 archived directions;
 * redesign D-13 in P3's grammar): condensed h1, derived counts in the label
 * column and a lede naming the directions; the live directions as a ruled
 * ledger, each with a small multiple of Fig. 1 on one shared year axis;
 * projects by status as one-line rows; archived directions under "Earlier
 * and related research". Copy that is not derived from content stays generic.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import type { DirectionView } from "@/lib/content/load";
import { getContent } from "@/lib/content/load";
import { formatDate } from "@/lib/content/dates";
import { pageMetadata } from "@/lib/seo/metadata";
import { DateText } from "@/components/ui/DateText";
import { DraftBadge, OpenToRAsBadge } from "@/components/ui/Badge";
import { CompactProjectList } from "@/components/projects/CompactProjectList";
import { groupProjectsByStatus } from "@/components/projects/model";
import { countsSentence, listJoin, numberWord, plural } from "@/components/direction/model";
import {
  DirectionStrip,
  StripAxisLabels,
  stripAxis,
  type StripAxis,
} from "@/components/direction/DirectionStrip";
import "@/components/direction/direction.css";
import "@/components/projects/projects.css";

export function generateMetadata(): Metadata {
  const { site } = getContent();
  return pageMetadata({
    title: "Research",
    description: `Research directions and projects of ${site.name}, the ${site.long_name}.`,
    path: "/research/",
  });
}

function DirectionRow({
  d,
  years,
  axis,
}: {
  d: DirectionView;
  years: Array<number | undefined>;
  axis: StripAxis;
}) {
  const archived = d.status === "archived" || d.index == null;
  return (
    <li className="rs-dir" data-swatch={d.color}>
      <div className="rs-dir__main">
        <h3 className="rs-dir__title bl-card__title" id={`dir-${d.slug}`}>
          <span className="bl-seg" aria-hidden="true" />
          <Link href={`/research/${d.slug}/`}>{d.title}</Link>
        </h3>
        {d.question && <p className="rs-dir__q">{d.question}</p>}
        {(d.openToRAs || d.draft) && (
          <p className="rs-dir__flags">
            {d.openToRAs && <OpenToRAsBadge />}
            <DraftBadge show={d.draft} />
          </p>
        )}
      </div>
      <DirectionStrip direction={d} years={years} axis={axis} />
      <p className="rs-dir__counts">
        {countsSentence(d.counts)}
        {archived && d.archived_on && (
          <span className="rs-dir__arch">
            Archived <DateText value={d.archived_on} long />
          </span>
        )}
      </p>
    </li>
  );
}

function AxisRow({ axis }: { axis: StripAxis }) {
  return (
    <div className="rs-axis" aria-hidden="true">
      <StripAxisLabels axis={axis} />
    </div>
  );
}

export default function ResearchPage() {
  const c = getContent();
  const live = c.directions;
  const archived = c.archivedDirections;
  const projectGroups = groupProjectsByStatus(c.projects);
  const papers = c.countedPublications.length;
  const yearsOf = (d: DirectionView) =>
    c.countedPublications.filter((p) => p.directions.includes(d.slug)).map((p) => p.year);
  // One binned year axis per list, so each set of rows compares on a shared scale.
  const axis = stripAxis(live.map((d) => yearsOf(d)));
  const earlierAxis = stripAxis(
    archived.map((d) => yearsOf(d)),
    false,
  );
  const asOf = formatDate(c.today, { long: true });

  return (
    <div className="bl-container rs-page">
      <header className="rs-head">
        <h1 tabIndex={-1} className="rs-title">
          Research
        </h1>
        <div className="rs-head__row">
          <p className="rs-head__side">
            {live.length > 0 ? (
              <>
                {plural(live.length, "direction")}, {plural(c.projects.length, "project")} and{" "}
                {plural(papers, "paper")}, as of {asOf}.
              </>
            ) : (
              <>As of {asOf}.</>
            )}
            <span className="rs-head__links">
              {c.projects.length > 0 && <Link href="/projects/">All projects</Link>}
              <Link href="/publications/">All publications</Link>
            </span>
          </p>
          {live.length > 0 ? (
            <p className="t-lead rs-lede">
              The lab&rsquo;s work runs along {numberWord(live.length)}{" "}
              {live.length === 1 ? "line" : "lines"}:{" "}
              {live.map((d, i) => (
                <Fragment key={d.slug}>
                  {i > 0 ? (i === live.length - 1 ? " and " : ", ") : null}
                  <Link href={`/research/${d.slug}/`} className="rs-dl" data-swatch={d.color}>
                    {d.short_label}
                  </Link>
                </Fragment>
              ))}
              .
            </p>
          ) : (
            <p className="t-lead rs-lede">Research directions are coming soon.</p>
          )}
        </div>
      </header>

      {live.length > 0 && (
        <section aria-labelledby="rs-directions" className="dr-section rs-block">
          <div className="dr-section__head">
            <h2 id="rs-directions" className="dr-section__title">
              Directions
            </h2>
          </div>
          <div className="dr-section__body">
            <AxisRow axis={axis} />
            <ol className="rs-dirs" role="list">
              {live.map((d) => (
                <DirectionRow key={d.slug} d={d} years={yearsOf(d)} axis={axis} />
              ))}
            </ol>
            <p className="rs-key">
              Dots are papers, grouped by year on one axis for every row (years without papers are
              left out); each line runs from the direction&rsquo;s first paper to now.
            </p>
          </div>
        </section>
      )}

      {projectGroups.length > 0 && (
        <section aria-labelledby="rs-projects" className="dr-section rs-block">
          <div className="dr-section__head">
            <h2 id="rs-projects" className="dr-section__title">
              Projects
            </h2>
            <p className="dr-section__aside">
              <Link href="/projects/">By direction</Link>
            </p>
          </div>
          <div className="dr-section__body">
            {projectGroups.map((g) => (
              <section
                key={g.status}
                aria-labelledby={`rs-status-${g.status}`}
                className="rs-status"
              >
                <h3 id={`rs-status-${g.status}`} className="rs-status__title">
                  {g.label}
                  <span className="rs-status__count">{g.projects.length}</span>
                </h3>
                <CompactProjectList projects={g.projects} label={`${g.label} projects`} />
              </section>
            ))}
          </div>
        </section>
      )}

      {archived.length > 0 && (
        <section aria-labelledby="rs-earlier" className="dr-section rs-block">
          <div className="dr-section__head">
            <h2 id="rs-earlier" className="dr-section__title">
              Earlier and related research
            </h2>
          </div>
          <div className="dr-section__body">
            <p className="rs-intro">
              {listJoin(archived.map((d) => d.short_label))} {archived.length === 1 ? "is" : "are"}{" "}
              no longer among the lab&rsquo;s current directions.
            </p>
            <AxisRow axis={earlierAxis} />
            <ul className="rs-dirs" role="list">
              {archived.map((d) => (
                <DirectionRow key={d.slug} d={d} years={yearsOf(d)} axis={earlierAxis} />
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
