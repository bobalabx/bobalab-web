/**
 * Direction card for /research/ (brief §D4): pearl + index, title, guiding
 * question, "N projects · N papers", "Open to RAs" when derived as open.
 * The pearl here is decorative and carries NO view-transition name.
 */
import Link from "next/link";
import type { DirectionView } from "@/lib/content/load";
import { Pearl } from "./Pearl";
import { DraftBadge, OpenToRAsBadge, Badge } from "./Badge";
import { DateText } from "./DateText";

export function countsLine(d: Pick<DirectionView, "counts">): string {
  const { projects, papers } = d.counts;
  return `${projects} ${projects === 1 ? "project" : "projects"} · ${papers} ${papers === 1 ? "paper" : "papers"}`;
}

export function DirectionCard({
  direction,
  as: H = "h3",
}: {
  direction: DirectionView;
  as?: "h2" | "h3" | "h4";
}) {
  const d = direction;
  return (
    <article
      className="bl-card bl-card--link bl-direction-card"
      data-swatch={d.color}
      aria-labelledby={`dir-${d.slug}`}
    >
      <div className="bl-direction-card__head">
        <Pearl swatch={d.color} size="card" index={d.index} />
        <div className="bl-card__meta">
          {d.status === "archived" ? (
            <Badge>
              Archived
              {d.archived_on ? (
                <>
                  {" "}
                  · <DateText value={d.archived_on} />
                </>
              ) : null}
            </Badge>
          ) : d.status === "emerging" ? (
            <Badge>Emerging</Badge>
          ) : null}
          {d.openToRAs && <OpenToRAsBadge />}
          <DraftBadge show={d.draft} />
        </div>
      </div>
      <H className="bl-card__title" id={`dir-${d.slug}`}>
        <Link href={`/research/${d.slug}/`}>{d.title}</Link>
      </H>
      {d.question && <p className="bl-direction-card__q">{d.question}</p>}
      <p className="bl-direction-card__counts">{countsLine(d)}</p>
    </article>
  );
}
