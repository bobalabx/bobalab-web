/**
 * Projects as a ruled table (P3 `.pt`; D-13 item 5): one row per project with
 * the title (and the lab's summary, when there is one), the other directions
 * it belongs to, then papers, people and status as plain words. No cards, no
 * empty title-only boxes: a project without a summary is a single line.
 *
 * The column heads are aria-hidden because every cell states its own unit
 * ("2 papers", "3 people", "Completed"), so the rows read correctly on their
 * own and on phones, where the heads are not shown.
 * Status is a word only when it says something: "Completed", "Paused",
 * "Archived". "Active" is the default state of almost every project, so it is
 * left out (P3 project row: "Completed" only when true; AUDIT P1).
 * Used on direction pages (`currentSlug` = that direction) and on /projects/
 * (`currentSlug` = the group's direction). `li[data-status]` feeds the
 * optional status filter.
 */
import Link from "next/link";
import type { ProjectView } from "@/lib/content/load";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { PROJECT_STATUS_LABELS, projectYears, projectTeamRows } from "./model";
import { plural } from "@/components/direction/model";

export function projectPapersCell(p: Pick<ProjectView, "publicationRefs">): string | null {
  const counted = p.publicationRefs.filter((x) => x.counted).length;
  const wip = p.publicationRefs.length - counted;
  if (counted) return plural(counted, "paper");
  if (wip) return `${wip} in progress`;
  return null;
}

export function ProjectLedger({
  projects,
  currentSlug,
  as: H = "h3",
  label,
}: {
  projects: ProjectView[];
  currentSlug?: string;
  as?: "h3" | "h4";
  /** Accessible name of the list (e.g. "Projects in Learning on the Job"). */
  label?: string;
}) {
  if (!projects.length) return null;
  return (
    <div className="pj-table">
      <div className="pj-table__h" aria-hidden="true">
        <span>Project</span>
        <span className="pj-n">Papers</span>
        <span className="pj-n">People</span>
        <span>Status</span>
      </div>
      <ol className="pj-table__rows" role="list" aria-label={label}>
        {projects.map((p) => {
          const others = p.directionRefs.filter((d) => d.slug !== currentSlug);
          const papers = projectPapersCell(p);
          const people = projectTeamRows(p).length + p.visibleCollaborators.length;
          const years = projectYears(p);
          return (
            <li key={p.slug} className="pj-table__row dr-project" data-status={p.status}>
              <div className="pj-table__main">
                <H className="dr-project__title" id={`pr-${p.slug}`}>
                  <Link href={`/projects/${p.slug}/`}>{p.title}</Link>
                </H>
                {p.summary && <p className="dr-project__summary">{p.summary}</p>}
                {others.length > 0 && (
                  <p className="pj-also">
                    Also in{" "}
                    {others.map((o, i) => (
                      <span key={o.slug} className="pj-also__d" data-swatch={o.color}>
                        {i > 0 ? (i === others.length - 1 ? " and " : ", ") : null}
                        <span className="bl-seg" aria-hidden="true" />
                        <Link href={`/research/${o.slug}/`}>{o.short_label}</Link>
                      </span>
                    ))}
                  </p>
                )}
                <DraftBadge show={p.draft} line />
              </div>
              <span className="pj-n">{papers}</span>
              <span className="pj-n">{people > 0 ? plural(people, "person", "people") : null}</span>
              <span className="pj-st">
                {p.status !== "active" && <Badge>{PROJECT_STATUS_LABELS[p.status]}</Badge>}
                {years && <span className="pj-st__y">{years}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
