/**
 * Research index `/research/` (brief §D4; DECISIONS D-04 archived directions).
 * Live directions as cards in editorial order, projects grouped by status,
 * archived directions under "Earlier and related research", and a link to
 * Publications. Copy that is not derived from content stays generic.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getContent } from "@/lib/content/load";
import { pageMetadata } from "@/lib/seo/metadata";
import { DirectionCard } from "@/components/ui/DirectionCard";
import { CompactProjectList } from "@/components/projects/CompactProjectList";
import { Icon } from "@/components/ui/icons";
import { groupProjectsByStatus } from "@/components/projects/model";
import { plural } from "@/components/direction/model";
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

export default function ResearchPage() {
  const c = getContent();
  const live = c.directions;
  const archived = c.archivedDirections;
  const projectGroups = groupProjectsByStatus(c.projects);
  const papers = c.countedPublications.length;

  return (
    <div className="bl-container rs-page">
      <header className="rs-head">
        <h1 tabIndex={-1}>Research</h1>
        {live.length > 0 ? (
          <p className="t-lead bl-measure">
            {c.site.name}&rsquo;s work is organized into {plural(live.length, "research direction")}
            . Each direction gathers projects and papers around one guiding question.
          </p>
        ) : (
          <p className="t-lead bl-measure">Research directions are coming soon.</p>
        )}
        <p className="rs-head__links">
          {c.projects.length > 0 && (
            <Link href="/projects/" className="dr-arrow-link">
              <span>All {plural(c.projects.length, "project")}</span>
              <Icon name="arrow-right" />
            </Link>
          )}
          <Link href="/publications/" className="dr-arrow-link">
            <span>{papers > 0 ? `All ${plural(papers, "publication")}` : "Publications"}</span>
            <Icon name="arrow-right" />
          </Link>
        </p>
      </header>

      {live.length > 0 && (
        <section aria-labelledby="rs-directions" className="rs-block">
          <h2 id="rs-directions" className="rs-block__title">
            Research directions
          </h2>
          <ol className="rs-grid rs-grid--dirs" role="list">
            {live.map((d) => (
              <li key={d.slug}>
                <DirectionCard direction={d} as="h3" />
              </li>
            ))}
          </ol>
        </section>
      )}

      {projectGroups.length > 0 && (
        <section aria-labelledby="rs-projects" className="rs-block">
          <div className="rs-block__head">
            <h2 id="rs-projects" className="rs-block__title">
              Projects
            </h2>
            <Link href="/projects/" className="dr-arrow-link">
              <span>Projects by direction</span>
              <Icon name="arrow-right" />
            </Link>
          </div>
          {projectGroups.map((g) => (
            <section key={g.status} aria-labelledby={`rs-status-${g.status}`} className="rs-status">
              <h3 id={`rs-status-${g.status}`} className="rs-status__title">
                {g.label}
                <span className="t-mono t-muted rs-status__count">{g.projects.length}</span>
              </h3>
              <CompactProjectList projects={g.projects} label={`${g.label} projects`} />
            </section>
          ))}
        </section>
      )}

      {archived.length > 0 && (
        <section aria-labelledby="rs-earlier" className="rs-block">
          <h2 id="rs-earlier" className="rs-block__title">
            Earlier and related research
          </h2>
          <p className="t-muted bl-measure rs-block__intro">
            Directions the lab no longer lists among its current research. Their pages keep the
            earlier work in one place.
          </p>
          <ul className="rs-grid rs-grid--dirs rs-grid--earlier" role="list">
            {archived.map((d) => (
              <li key={d.slug}>
                <DirectionCard direction={d} as="h3" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
