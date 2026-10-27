/**
 * The research index body (/research/), shared by the static route and the
 * editor live preview (src/app/editor-preview). Synchronous and pure:
 * everything comes from Content. The page's structure is described in
 * src/app/research/page.tsx.
 */
import Link from "next/link";
import { ViewTransition } from "react";
import type { Content, DirectionView } from "@/lib/content/build";
import { buildFigure } from "@/lib/figure/buildFigure";
import { entryMark } from "@/lib/preview/mark";
import { PAGE_ENTER_EXIT } from "@/lib/vt";
import { PearlFigure } from "@/components/figure/PearlFigure";
import { DraftBadge, OpenToRAsBadge } from "@/components/ui/Badge";
import { CompactProjectList } from "@/components/projects/CompactProjectList";
import { groupProjectsByStatus } from "@/components/projects/model";
import { countsSentence, numberWord } from "@/components/direction/model";
import {
  DirectionStrip,
  StripAxisLabels,
  stripAxis,
  type StripAxis,
} from "@/components/direction/DirectionStrip";
import "@/components/direction/direction.css";
import "@/components/projects/projects.css";

function DirectionRow({
  d,
  strip,
}: {
  d: DirectionView;
  /** Earlier research only: the row's papers on the list's shared year axis. */
  strip?: { years: Array<number | undefined>; axis: StripAxis };
}) {
  return (
    <li
      className={strip ? "rs-dir rs-dir--strip" : "rs-dir"}
      data-swatch={d.color}
      {...entryMark("directions", d.slug)}
    >
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
      {strip && <DirectionStrip direction={d} years={strip.years} axis={strip.axis} />}
      <p className="rs-dir__counts">{countsSentence(d.counts)}</p>
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

export function ResearchView({ c }: { c: Content }) {
  const live = c.directions;
  const archived = c.archivedDirections;
  const projectGroups = groupProjectsByStatus(c.projects);
  const yearsOf = (d: DirectionView) =>
    c.countedPublications.filter((p) => p.directions.includes(d.slug)).map((p) => p.year);
  // Earlier research: one binned year axis for its rows, so they compare on a shared scale.
  const earlierAxis = stripAxis(
    archived.map((d) => yearsOf(d)),
    false,
  );
  const figure = buildFigure(c);

  return (
    <ViewTransition enter={PAGE_ENTER_EXIT} exit={PAGE_ENTER_EXIT} default="none">
      <div className="rs">
        <div className="bl-container rs-page">
          <header className="rs-head">
            <h1 tabIndex={-1} className="rs-title">
              Research
            </h1>
            <div className="rs-head__row">
              <p className="rs-head__side">
                <span className="rs-head__links">
                  {c.projects.length > 0 && <Link href="/projects/">All projects</Link>}
                  <Link href="/publications/">All publications</Link>
                  {figure.state !== "empty" && <a href="#map">Map of every paper</a>}
                </span>
              </p>
              {live.length > 0 ? (
                <p className="t-lead rs-lede">
                  {live.length === 1
                    ? "Our current work has one direction."
                    : `Our current work falls into ${numberWord(live.length)} directions.`}
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
                <ol className="rs-dirs" role="list">
                  {live.map((d) => (
                    <DirectionRow key={d.slug} d={d} />
                  ))}
                </ol>
              </div>
            </section>
          )}
        </div>

        {figure.state !== "empty" && (
          <section id="map" aria-labelledby="map-h" className="rs-map">
            <div className="bl-container">
              <PearlFigure
                model={figure}
                heading={
                  <h2 id="map-h" className="dr-section__title rs-map__title">
                    {figure.n > 1 ? "How the directions connect" : "Every paper by year"}
                  </h2>
                }
              />
            </div>
          </section>
        )}

        <div className="bl-container rs-page">
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
                  {live.length > 0
                    ? `Work outside our ${numberWord(live.length)} current ${live.length === 1 ? "direction" : "directions"}.`
                    : "Work outside our current directions."}
                </p>
                <AxisRow axis={earlierAxis} />
                <ul className="rs-dirs" role="list">
                  {archived.map((d) => (
                    <DirectionRow
                      key={d.slug}
                      d={d}
                      strip={{ years: yearsOf(d), axis: earlierAxis }}
                    />
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>
    </ViewTransition>
  );
}
