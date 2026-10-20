/** Project card (brief §D4, §D6): title, summary, status, years, direction tags. */
import Link from "next/link";
import type { ProjectView } from "@/lib/content/load";
import { Badge, DraftBadge } from "./Badge";
import { PearlTagList } from "./PearlTag";

const STATUS_LABELS: Record<ProjectView["status"], string> = {
  active: "Active",
  completed: "Completed",
  paused: "Paused",
  archived: "Archived",
};

export function ProjectCard({
  project,
  as: H = "h3",
}: {
  project: ProjectView;
  as?: "h2" | "h3" | "h4";
}) {
  const years =
    project.start_year && project.end_year && project.end_year !== project.start_year
      ? `${project.start_year}–${project.end_year}`
      : project.start_year
        ? project.status === "active"
          ? `Since ${project.start_year}`
          : String(project.start_year)
        : null;
  return (
    <article
      className="bl-card bl-card--link"
      aria-labelledby={`project-${project.slug}`}
      data-swatch={project.primaryDirection?.color}
    >
      <div className="bl-card__meta">
        <Badge tone={project.status === "active" ? "strong" : "neutral"}>
          {STATUS_LABELS[project.status]}
        </Badge>
        {years && <span className="t-mono">{years}</span>}
        <DraftBadge show={project.draft} />
      </div>
      <H className="bl-card__title" id={`project-${project.slug}`}>
        <Link href={`/projects/${project.slug}/`}>{project.title}</Link>
      </H>
      {project.summary && <p className="bl-project__summary">{project.summary}</p>}
      <PearlTagList items={project.directionRefs} />
    </article>
  );
}
