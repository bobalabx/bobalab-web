/**
 * Projects index `/projects/` (brief §D6): grouped by primary direction, each
 * project with its status chip. Without JS everything shows; a small chip
 * filter (status) enhances it.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getContent } from "@/lib/content/load";
import { pageMetadata } from "@/lib/seo/metadata";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { pad2 } from "@/lib/content/directions";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import {
  PROJECT_STATUS_LABELS,
  groupProjectsByPrimaryDirection,
  statusesPresent,
} from "@/components/projects/model";
import { ProjectStatusFilter } from "@/components/projects/ProjectStatusFilter";
import { plural } from "@/components/direction/model";
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

  const list = (
    <div className="pj-groups">
      {groups.map((g) => {
        const d = g.direction;
        return (
          <section
            key={g.id}
            aria-labelledby={g.id}
            className="pj-group"
            data-group=""
            data-swatch={d?.color}
          >
            <div className="pj-group__head">
              <p className="t-eyebrow pj-group__eyebrow">
                {d && <span className="bl-dot" aria-hidden="true" />}
                <span>
                  {d?.index != null
                    ? `Direction ${pad2(d.index)}`
                    : d
                      ? "Earlier research"
                      : "Not yet in a direction"}
                </span>
              </p>
              <h2 id={g.id} className="pj-group__title">
                {d ? <Link href={`/research/${d.slug}/`}>{d.title}</Link> : "Other projects"}
              </h2>
              <p className="pj-group__meta">
                <span className="t-mono">{plural(g.projects.length, "project")}</span>
                {d?.status === "archived" && <Badge>Archived direction</Badge>}
                {d?.draft && <DraftBadge />}
              </p>
            </div>
            <ul className="rs-grid rs-grid--projects" role="list">
              {g.projects.map((p) => (
                <li key={p.slug} data-status={p.status}>
                  <ProjectCard project={p} as="h3" />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );

  return (
    <div className="bl-container rs-page">
      <header className="rs-head">
        <nav aria-label="Breadcrumb" className="pj-crumbs">
          <ol role="list">
            <li>
              <Link href="/research/">Research</Link>
            </li>
            <li aria-current="page">
              <span>Projects</span>
            </li>
          </ol>
        </nav>
        <h1 tabIndex={-1}>Projects</h1>
        {c.projects.length > 0 ? (
          <p className="t-lead bl-measure">
            {plural(c.projects.length, "project")}, grouped by the research direction each one
            belongs to first.
          </p>
        ) : (
          <p className="t-lead bl-measure">Projects are coming soon.</p>
        )}
      </header>
      {groups.length > 0 &&
        (statuses.length > 1 ? (
          <>
            {/* Without JS the chips could not filter, so the bar is hidden and every
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
