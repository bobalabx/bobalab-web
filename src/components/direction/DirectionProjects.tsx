/**
 * Projects on a direction page (§D5.5, §C9): a list whose bullets are 8–10 px
 * flat dots in the direction tone, always beside text. Each row: title link,
 * status, years, summary and the project's other directions.
 */
import Link from "next/link";
import type { ProjectView } from "@/lib/content/load";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { PearlTagList } from "@/components/ui/PearlTag";
import { PROJECT_STATUS_LABELS, projectYears } from "@/components/projects/model";

export function DirectionProjects({
  projects,
  currentSlug,
}: {
  projects: ProjectView[];
  currentSlug: string;
}) {
  if (!projects.length) return null;
  return (
    <ul className="dr-projects" role="list">
      {projects.map((p) => {
        const years = projectYears(p);
        const others = p.directionRefs.filter((d) => d.slug !== currentSlug);
        return (
          <li key={p.slug} className="dr-project">
            <span className="bl-dot dr-project__dot" aria-hidden="true" />
            <article className="dr-project__body" aria-labelledby={`dp-${p.slug}`}>
              <h3 className="dr-project__title" id={`dp-${p.slug}`}>
                <Link href={`/projects/${p.slug}/`}>{p.title}</Link>
              </h3>
              <div className="bl-card__meta">
                <Badge tone={p.status === "active" ? "strong" : "neutral"}>
                  {PROJECT_STATUS_LABELS[p.status]}
                </Badge>
                {years && <span className="t-mono">{years}</span>}
                <DraftBadge show={p.draft} />
              </div>
              {p.summary && <p className="dr-project__summary">{p.summary}</p>}
              {others.length > 0 && (
                <PearlTagList items={others} label={`Also in these directions: ${p.title}`} />
              )}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
