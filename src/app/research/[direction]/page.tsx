/**
 * Research direction page `/research/{direction}/` (brief §D5, §E5; WP2).
 * Static export: generateStaticParams via staticParams() (never []),
 * dynamicParams = false, notFound() for unknown slugs and the placeholder.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { getContent } from "@/lib/content/load";
import { directionDetail, directionsOf, staticParams, staticSlugs } from "@/lib/content/queries";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { researchProjectLd } from "@/lib/seo/jsonld";
import { PAGE_ENTER_EXIT } from "@/lib/vt";
import { JsonLd } from "@/components/ui/JsonLd";
import { Prose } from "@/components/ui/Prose";
import { PublicationEntry } from "@/components/ui/PublicationEntry";
import { PersonCard } from "@/components/ui/PersonCard";
import { DateText } from "@/components/ui/DateText";
import { Icon } from "@/components/ui/icons";
import { DirectionHeader } from "@/components/direction/DirectionHeader";
import { DirectionRail } from "@/components/direction/DirectionRail";
import { DirectionProjects } from "@/components/direction/DirectionProjects";
import { FindingList } from "@/components/direction/FindingList";
import { InProgressList } from "@/components/direction/InProgressList";
import { KeyFigure } from "@/components/direction/KeyFigure";
import { Section } from "@/components/direction/Section";
import { WorkWithUs } from "@/components/direction/WorkWithUs";
import { contentLastUpdated } from "@/components/direction/lastUpdated";
import { lastUpdated as siteLastUpdated } from "@/lib/site/build-info";
import {
  DIRECTION_PUBLICATION_LIMIT,
  directionUpdatedDate,
  plural,
  publicationsHref,
  workWithUs,
} from "@/components/direction/model";
import "@/components/direction/direction.css";

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
  const work = workWithUs(c, d);
  const shownPubs = detail.publications.slice(0, DIRECTION_PUBLICATION_LIMIT);
  const archived = d.status === "archived" || d.index == null;
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

  return (
    <ViewTransition enter={PAGE_ENTER_EXIT} exit={PAGE_ENTER_EXIT} default="none">
      <div className="dr-page" data-swatch={d.color}>
        <JsonLd data={researchProjectLd(d, path, c.site)} />
        <DirectionHeader direction={d} />

        <div className="bl-container dr-body">
          {archived && (
            <aside className="dr-archived" aria-label="Archived direction">
              <p>
                <strong>Archived</strong>
                {d.archived_on && (
                  <>
                    {" "}
                    {String(d.archived_on).length > 7 ? "on" : "in"}{" "}
                    <DateText value={d.archived_on} long />
                  </>
                )}
                . This direction is not one of the lab&rsquo;s current research directions; the page
                keeps its earlier work in one place.
              </p>
            </aside>
          )}

          {d.body.trim() && (
            <Section id="why" title="Why it matters">
              <Prose source={d.body} className="dr-prose" />
            </Section>
          )}

          {detail.findings.length > 0 && (
            <Section id="found" title="What we’ve found">
              <FindingList findings={detail.findings} />
            </Section>
          )}

          {d.figure?.image && d.figure.alt && (
            <Section id="figure" title="Key figure">
              <KeyFigure figure={d.figure} />
            </Section>
          )}

          {detail.projects.length > 0 && (
            <Section
              id="projects"
              title="Projects"
              aside={<span className="t-mono">{plural(detail.projects.length, "project")}</span>}
            >
              <DirectionProjects projects={detail.projects} currentSlug={d.slug} />
            </Section>
          )}

          {hasPublications && (
            <Section
              id="publications"
              title="Publications"
              aside={
                detail.publications.length > 0 ? (
                  <span className="t-mono">{plural(detail.publications.length, "paper")}</span>
                ) : undefined
              }
            >
              {shownPubs.length > 0 && (
                <div className="dr-pubs">
                  {shownPubs.map((p) => (
                    <PublicationEntry key={p.slug} pub={p} as="h3" showTags={false} />
                  ))}
                </div>
              )}
              {detail.publications.length > 0 && (
                <p className="dr-seeall">
                  <Link href={publicationsHref(d.slug)} className="dr-arrow-link">
                    <span>
                      {detail.publications.length > shownPubs.length
                        ? `See all ${detail.publications.length} in Publications`
                        : "See all in Publications"}
                      <span className="vh">, filtered to {d.short_label}</span>
                    </span>
                    <Icon name="arrow-right" />
                  </Link>
                </p>
              )}
              <InProgressList items={detail.inProgress} headingId="in-progress" />
            </Section>
          )}

          {detail.people.length > 0 && (
            <Section id="people" title="People">
              <ul className="dr-people" role="list">
                {detail.people.map((p) => (
                  <li key={p.slug}>
                    <PersonCard person={p} directions={directionsOf(c, p.directions)} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {d.methods.length > 0 && (
            <Section id="methods" title="Methods & data">
              <ul className="dr-methods" role="list">
                {d.methods.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
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

          {updated && (
            <p className="dr-updated t-sm t-muted">
              This direction was last updated <DateText value={updated} />
            </p>
          )}
        </div>
      </div>
    </ViewTransition>
  );
}
