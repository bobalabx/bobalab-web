/**
 * Projects index `/projects/` (brief §D6; redesign D-13): one ruled table per
 * primary direction on the label-column grid (the direction's line segment
 * and name in the label column, its projects as rows with papers, people and
 * status). Without JS everything shows; with JS the status toggles
 * (<button aria-pressed>, text style) filter the rows.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getContent } from "@/lib/content/load";
import { formatDate } from "@/lib/content/dates";
import { pageMetadata } from "@/lib/seo/metadata";
import { DraftBadge } from "@/components/ui/Badge";
import {
  PROJECT_STATUS_LABELS,
  groupProjectsByPrimaryDirection,
  statusesPresent,
} from "@/components/projects/model";
import { ProjectStatusFilter } from "@/components/projects/ProjectStatusFilter";
import { ProjectLedger } from "@/components/projects/ProjectLedger";
import { listJoin, plural } from "@/components/direction/model";
import "@/components/direction/direction.css";
import "@/components/projects/projects.css";

const NOSCRIPT_CSS = ".pj-filter__bar{display:none!important}";

export function generateMetadata(): Metadata {
  const { site } = getContent();
  return pageMetadata({
    title: "Projects",
    description: `Research projects of ${site.name}, the ${site.long_name}, grouped by research direction.`,
    path: "/projects/",
  });
}

export default function ProjectsPage() {
  const c = getContent();
  const groups = groupProjectsByPrimaryDirection(c);
  const statuses = statusesPresent(c.projects);
  const options = statuses.map((s) => ({
    value: s,
    label: PROJECT_STATUS_LABELS[s],
    count: c.projects.filter((p) => p.status === s).length,
  }));
  const byStatus = statuses.map(
    (s) =>
      `${c.projects.filter((p) => p.status === s).length} ${PROJECT_STATUS_LABELS[s].toLowerCase()}`,
  );

  const list = (
    <div className="pj-groups">
      {groups.map((g) => {
        const d = g.direction;
        return (
          <section
            key={g.id}
            aria-labelledby={g.id}
            className="pj-group dr-section"
            data-group=""
            data-swatch={d?.color}
          >
            <div className="dr-section__head pj-group__head">
              <h2 id={g.id} className="pj-group__title">
                {d && <span className="bl-seg" aria-hidden="true" />}
                {d ? <Link href={`/research/${d.slug}/`}>{d.short_label}</Link> : "Other projects"}
              </h2>
              <p className="pj-group__meta">
                {plural(g.projects.length, "project")}
                {d?.status === "archived"
                  ? ", earlier research"
                  : d
                    ? null
                    : ", not yet in a direction"}
                {d?.draft && (
                  <>
                    {" "}
                    <DraftBadge />
                  </>
                )}
              </p>
            </div>
            <div className="dr-section__body">
              <ProjectLedger
                projects={g.projects}
                currentSlug={d?.slug}
                label={d ? `Projects in ${d.short_label}` : "Other projects"}
              />
            </div>
          </section>
        );
      })}
    </div>
  );

  return (
    <div className="bl-container rs-page pj-index">
      <header className="rs-head">
        <nav aria-label="Breadcrumb" className="pj-crumbs">
          <ol role="list">
            <li>
              <Link href="/research/">Research</Link>
            </li>
            <li aria-current="page" className="vh">
              <span>Projects</span>
            </li>
          </ol>
        </nav>
        <h1 tabIndex={-1} className="rs-title">
          Projects
        </h1>
        <div className="rs-head__row">
          <p className="rs-head__side">
            {c.projects.length > 0
              ? `${listJoin(byStatus)}, as of ${formatDate(c.today, { long: true })}.`
              : null}
          </p>
          {c.projects.length > 0 ? (
            <p className="t-lead rs-lede">
              By research direction. A project in more than one direction is listed under its first.
            </p>
          ) : (
            <p className="t-lead rs-lede">Projects are coming soon.</p>
          )}
        </div>
      </header>
      {groups.length > 0 &&
        (statuses.length > 1 ? (
          <>
            {/* Without JS the toggles could not filter, so the bar is hidden and every
                project shows (§D6). With JS there is no layout shift. */}
            <noscript>
              <style>{NOSCRIPT_CSS}</style>
            </noscript>
            <ProjectStatusFilter options={options} total={c.projects.length}>
              {list}
            </ProjectStatusFilter>
          </>
        ) : (
          list
        ))}
    </div>
  );
}
