/**
 * Compact project rows for the research index (§D4 "Projects grouped by
 * status, each with direction tags"): title link, years and direction tags on
 * a ruled list, so the index stays scannable. Full cards live on /projects/.
 */
import Link from "next/link";
import type { ProjectView } from "@/lib/content/load";
import { DraftBadge } from "@/components/ui/Badge";
import { PearlTagList } from "@/components/ui/PearlTag";
import { projectYears } from "./model";

export function CompactProjectList({
  projects,
  label,
}: {
  projects: ProjectView[];
  label: string;
}) {
  if (!projects.length) return null;
  return (
    <ul className="pj-rows" role="list" aria-label={label}>
      {projects.map((p) => {
        const years = projectYears(p);
        return (
          <li key={p.slug} className="pj-row">
            <p className="pj-row__title">
              <Link href={`/projects/${p.slug}/`}>{p.title}</Link>
            </p>
            <div className="pj-row__meta">
              <PearlTagList items={p.directionRefs} label={`Research directions: ${p.title}`} />
              {years && <span className="t-mono">{years}</span>}
              <DraftBadge show={p.draft} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
