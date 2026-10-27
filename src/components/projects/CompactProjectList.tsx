/**
 * Compact project rows (research index, person profiles): a ruled one-line
 * ledger of title link, the project's directions (16 px line segment + name)
 * and its years. No tags, no boxes (D-13 item 5).
 */
import Link from "next/link";
import type { ProjectView } from "@/lib/content/load";
import { DraftBadge } from "@/components/ui/Badge";
import { projectYears } from "./model";
import { entryMark } from "@/lib/preview/mark";

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
          <li key={p.slug} className="pj-row" {...entryMark("projects", p.slug)}>
            <p className="pj-row__title">
              <Link href={`/projects/${p.slug}/`}>{p.title}</Link>
              <DraftBadge show={p.draft} line />
            </p>
            <p className="pj-row__meta">
              {p.directionRefs.map((d) => (
                <span key={d.slug} className="pj-row__dir" data-swatch={d.color}>
                  <span className="bl-seg" aria-hidden="true" />
                  {d.short_label}
                </span>
              ))}
              {years && <span className="pj-row__years">{years}</span>}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
