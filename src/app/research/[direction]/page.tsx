/**
 * Research direction page `/research/{direction}/` (brief §D5, §E5; redesign
 * D-13 after P3 `research.html`): label-column header with the derived counts,
 * condensed h1 and the guiding question; Figure 2 (the direction's papers on
 * its line, ending in its pearl, the morph target); Why it matters; projects
 * as a ruled table; papers as a ruled ledger; people; More directions.
 * Static export: generateStaticParams via staticParams() (never []),
 * dynamicParams = false, notFound() for unknown slugs and the placeholder.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { getContent } from "@/lib/content/load";
import { directionDetail, showStudyPlate, staticParams, staticSlugs } from "@/lib/content/queries";
import { formatDate } from "@/lib/content/dates";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { researchProjectLd } from "@/lib/seo/jsonld";
import { PAGE_ENTER_EXIT } from "@/lib/vt";
import { JsonLd } from "@/components/ui/JsonLd";
import { Prose } from "@/components/ui/Prose";
import { PublicationEntry, needsProvenanceNote } from "@/components/ui/PublicationEntry";
import { DateText } from "@/components/ui/DateText";
import { DirectionHeader } from "@/components/direction/DirectionHeader";
import { DirectionRail } from "@/components/direction/DirectionRail";
import { Figure2 } from "@/components/direction/Figure2";
import { FindingList } from "@/components/direction/FindingList";
import { InProgressList, showsReportedStatus } from "@/components/direction/InProgressList";
import { KeyFigure } from "@/components/direction/KeyFigure";
import { Section } from "@/components/direction/Section";
import { WorkWithUs } from "@/components/direction/WorkWithUs";
import { contentLastUpdated } from "@/components/direction/lastUpdated";
import { figure2Model } from "@/components/direction/f2model";
import { lastUpdated as siteLastUpdated } from "@/lib/site/build-info";
import {
  DIRECTION_PUBLICATION_LIMIT,
  directionPeople,
  directionUpdatedDate,
  plural,
  publicationsHref,
  sharedWith,
  workWithUs,
} from "@/components/direction/model";
import { ProjectLedger } from "@/components/projects/ProjectLedger";
import { Roster } from "@/components/projects/TeamList";
import { StudyPlate, hasPlate } from "@/components/plates";
import "@/components/direction/direction.css";
import "@/components/projects/projects.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticParams("direction", staticSlugs.directions(getContent()));
}

type Props = { params: Promise<{ direction: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { direction } = await params;
  const c = getContent();
  const detail = directionDetail(c, direction);
  if (!detail) return { title: "Not found", robots: { index: false } };
  const d = detail.direction;
  // Unique "{Direction}, BOBALAB research" title (§E5) without the site suffix;
  // the lab name comes from site.yml, never hard-coded.
  const title = `${d.title}, ${c.site.name} research`;
  const meta = pageMetadata({
    title,
    description: clipDescription(d.summary ?? d.question),
    path: `/research/${d.slug}/`,
  });
  return { ...meta, title: { absolute: title } };
}

export default async function DirectionPage({ params }: Props) {
  const { direction } = await params;
  const c = getContent();
  const detail = directionDetail(c, direction);
  if (!detail) notFound();
  const d = detail.direction;
  const path = `/research/${d.slug}/`;
  const asOf = formatDate(c.today, { long: true });
  const work = workWithUs(c, d);
  const shownPubs = detail.publications.slice(0, DIRECTION_PUBLICATION_LIMIT);
  const archived = d.status === "archived" || d.index == null;
  const order = [...c.directions, ...c.archivedDirections];
  const shared = sharedWith(c, d, detail.publications);
  const f2 = figure2Model(d, detail.publications, detail.inProgress, order);
  // A live direction always draws Figure 2: it carries the pearl, the morph
  // target of Fig. 1. An archived one draws it only when there is a line to
  // draw (two or more items); a single dot is not a figure, and its paper is
  // listed under Papers anyway.
  const showF2 = archived ? f2.columns >= 2 : f2.columns > 0;
  const people = directionPeople(c, d, detail.projects);
  // The footnote only when a row on the page still prints a self-reported status.
  const provenance =
    needsProvenanceNote(detail.publications) || showsReportedStatus(detail.inProgress);
  const hasPapers = detail.publications.length > 0;
  // Shown only when it differs from the footer's site-wide date (VIS-12).
  const updated = directionUpdatedDate(
    contentLastUpdated(c.dir, [
      d.file,
      ...detail.projects.map((p) => p.file),
      ...detail.publications.map((p) => p.file),
      ...detail.inProgress.map((p) => p.file),
    ]),
    siteLastUpdated(),
  );
  const hasPublications = detail.publications.length > 0 || detail.inProgress.length > 0;
  // Study-design plates of this direction's papers (D-13 item 8): a plate belongs
  // to its paper, so it shows wherever the paper does, under the same gate.
  const plated = detail.publications.filter(
    (p) => hasPlate(p.slug) && showStudyPlate(p, c.preview),
  );
  let fig = archived ? 1 : 2;

  return (
    <ViewTransition enter={PAGE_ENTER_EXIT} exit={PAGE_ENTER_EXIT} default="none">
      <div
        className="dr-page bl-container"
        data-swatch={d.color}
        data-pearl={!archived && showF2 ? f2.fit : undefined}
      >
        <JsonLd data={researchProjectLd(d, path, c.site)} />
        <DirectionHeader direction={d} shared={shared} asOf={asOf} />

        {showF2 && <Figure2 direction={d} model={f2} number={fig++} asOf={asOf} />}

        {(d.summary || d.body.trim()) && (
          <Section id="why" title="Why it matters">
            {d.summary && <p className="t-lead dr-lede">{d.summary}</p>}
            {d.body.trim() && <Prose source={d.body} className="dr-prose" />}
          </Section>
        )}

        {plated.map((p) => (
          <StudyPlate key={p.slug} pub={p} preview={c.preview} figure={fig++} />
        ))}

        {detail.findings.length > 0 && (
          <Section id="found" title="What we’ve found">
            <FindingList findings={detail.findings} />
          </Section>
        )}

        {d.figure?.image && d.figure.alt && (
          <Section id="figure" title="Key figure">
            <KeyFigure figure={d.figure} number={fig++} />
          </Section>
        )}

        {detail.projects.length > 0 && (
          <Section id="projects" title="Projects" aside={plural(detail.projects.length, "project")}>
            <ProjectLedger
              projects={detail.projects}
              currentSlug={d.slug}
              label={`Projects in ${d.short_label}`}
            />
          </Section>
        )}

        {hasPublications && (
          // Titled for what it holds: "In progress" when no paper counts yet.
          <Section
            id="publications"
            title={hasPapers ? "Papers" : "In progress"}
            aside={hasPapers ? plural(detail.publications.length, "paper") : undefined}
          >
            {shownPubs.length > 0 && (
              <div className="dr-pubs">
                {shownPubs.map((p) => (
                  <PublicationEntry key={p.slug} pub={p} as="h3" />
                ))}
              </div>
            )}
            {detail.publications.length > 0 && (
              <p className="dr-seeall">
                <Link href={publicationsHref(d.slug)}>
                  {detail.publications.length > shownPubs.length
                    ? `All ${detail.publications.length} in Publications`
                    : "These papers in Publications"}
                  <span className="vh">, filtered to {d.short_label}</span>
                </Link>
              </p>
            )}
            <InProgressList
              items={detail.inProgress}
              headingId={hasPapers ? "in-progress" : "publications"}
              heading={hasPapers}
            />
          </Section>
        )}

        {people.length > 0 && (
          <Section id="people" title="People" aside={plural(people.length, "person", "people")}>
            <Roster people={people} label={`People in ${d.short_label}`} />
          </Section>
        )}

        {d.methods.length > 0 && (
          <Section id="methods" title="Methods and data">
            <p className="dr-methods">{d.methods.join(", ")}</p>
          </Section>
        )}

        {work.show && (
          <Section id="work" title="Work with us on this">
            <WorkWithUs
              directionTitle={d.title}
              openToCollaborators={work.openToCollaborators}
              opportunities={work.opportunities}
              email={c.site.email}
            />
          </Section>
        )}

        <DirectionRail current={d} siblings={detail.siblings} />

        {(provenance || updated) && (
          <div className="dr-notes">
            {provenance && (
              <p className="dr-fn">Review status and dates are as reported by the lab.</p>
            )}
            {updated && (
              <p className="dr-updated">
                This direction was last updated <DateText value={updated} long />.
              </p>
            )}
          </div>
        )}
      </div>
    </ViewTransition>
  );
}
