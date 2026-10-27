/**
 * The projects index body (/projects/), shared by the static route and the
 * editor live preview (src/app/editor-preview). Synchronous and pure:
 * everything comes from Content. One ruled table per primary direction; with JS
 * the status toggles filter the rows (src/app/projects/page.tsx).
 */
import Link from "next/link";
import type { Content } from "@/lib/content/build";
import { DraftBadge } from "@/components/ui/Badge";
import {
  PROJECT_STATUS_LABELS,
  groupProjectsByPrimaryDirection,
  statusesPresent,
} from "@/components/projects/model";
import { ProjectStatusFilter } from "@/components/projects/ProjectStatusFilter";
import { ProjectLedger } from "@/components/projects/ProjectLedger";
import { plural } from "@/components/direction/model";
import "@/components/direction/direction.css";
import "@/components/projects/projects.css";

const NOSCRIPT_CSS = ".pj-filter__bar{display:none!important}";

export function ProjectsView({ c }: { c: Content }) {
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
            className="pj-group dr-section"
            data-group=""
            data-swatch={d?.color}
          >
            <div className="dr-section__head pj-group__head">
              <h2 id={g.id} className="pj-group__title">
                {d && <span className="bl-seg" aria-hidden="true" />}
                {d ? <Link href={`/research/${d.slug}/`}>{d.short_label}</Link> : "Other projects"}
              </h2>
              {d && (
                <p className="pj-group__meta">
                  {d.status === "archived"
                    ? "Earlier research"
                    : plural(g.projects.length, "project")}
                  {d.draft && (
                    <>
                      {" "}
                      <DraftBadge />
                    </>
                  )}
                </p>
              )}
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
        {c.projects.length === 0 && (
          <div className="rs-head__row">
            <p className="t-lead rs-lede">Projects are coming soon.</p>
          </div>
        )}
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
