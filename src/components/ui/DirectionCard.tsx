/**
 * Direction row for /research/ (brief §D4; D-13 item 5): the direction's line
 * segment and title, its guiding question, and "N projects, N papers" as plain
 * words. No pearl tile, no numeral, no coloured top stripe. `.bl-card` stays on
 * the element (selector-based tests) but draws no box.
 */
import Link from "next/link";
import type { DirectionView } from "@/lib/content/load";
import { DraftBadge, OpenToRAsBadge, Badge } from "./Badge";
import { DateText } from "./DateText";

export function countsLine(d: Pick<DirectionView, "counts">): string {
  const { projects, papers } = d.counts;
  return `${projects} ${projects === 1 ? "project" : "projects"}, ${papers} ${papers === 1 ? "paper" : "papers"}`;
}

export function DirectionCard({
  direction,
  as: H = "h3",
}: {
  direction: DirectionView;
  as?: "h2" | "h3" | "h4";
}) {
  const d = direction;
  const flags =
    d.status === "archived" || d.status === "emerging" || d.openToRAs || d.draft ? (
      <div className="bl-card__meta">
        {d.status === "archived" ? (
          <Badge>
            Archived
            {d.archived_on ? (
              <>
                {" "}
                <DateText value={d.archived_on} />
              </>
            ) : null}
          </Badge>
        ) : d.status === "emerging" ? (
          <Badge>Emerging</Badge>
        ) : null}
        {d.openToRAs && <OpenToRAsBadge />}
        <DraftBadge show={d.draft} />
      </div>
    ) : null;
  return (
    <article
      className="bl-card bl-card--link bl-direction-card"
      data-swatch={d.color}
      aria-labelledby={`dir-${d.slug}`}
    >
      <H className="bl-card__title" id={`dir-${d.slug}`}>
        <span className="bl-seg" aria-hidden="true" />
        <Link href={`/research/${d.slug}/`}>{d.title}</Link>
      </H>
      {d.question && <p className="bl-direction-card__q">{d.question}</p>}
      <p className="bl-direction-card__counts">{countsLine(d)}</p>
      {flags}
    </article>
  );
}
