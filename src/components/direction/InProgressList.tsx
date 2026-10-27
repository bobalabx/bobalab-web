/**
 * "In progress" (DECISIONS D-05): work without a public version or a
 * documented talk, as a ruled list of titles with their authors (lab members
 * in weight 600), venue and any status that adds something. It never counts
 * toward paper totals. Statuses are plain labels, with no provenance note
 * (copy sweep).
 *
 * `heading={false}`: the surrounding section is itself titled "In progress"
 * (a project or direction with no counted paper yet), so the list is labelled
 * by that section heading (`headingId`) instead of repeating it.
 */
import Link from "next/link";
import { Fragment } from "react";
import type { PublicationView } from "@/lib/content/load";
import { statusLine } from "@/components/ui/PublicationEntry";
import { DraftBadge } from "@/components/ui/Badge";
import { entryMark } from "@/lib/preview/mark";

/**
 * The status printed under an in-progress title, or null. Under an "In
 * progress" heading a bare in-progress status would repeat the heading on
 * every row; statuses that add something ("Submitted to …") stay.
 */
export function wipStatus(
  p: Pick<PublicationView, "status" | "status_note" | "type"> & { venue?: string },
): string | null {
  return p.status === "in-progress" && !p.status_note ? null : statusLine(p, p.type);
}

export function InProgressList({
  items,
  headingId,
  as: H = "h3",
  heading = true,
}: {
  items: PublicationView[];
  headingId: string;
  as?: "h3" | "h4";
  heading?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div className="dr-wip">
      {heading && (
        <H id={headingId} className="dr-wip__title">
          In progress
        </H>
      )}
      <ul className="dr-wip__list" role="list" aria-labelledby={headingId}>
        {items.map((p) => {
          const status = wipStatus(p);
          return (
            <li key={p.slug} {...entryMark("publications", p.slug)}>
              <Link href={`/publications/${p.slug}/`} className="dr-wip__link">
                {p.title}
              </Link>
              {p.authorList.length > 0 && (
                <span className="dr-wip__au">
                  {p.authorList.map((a, i, all) => (
                    <Fragment key={`${a.name}-${i}`}>
                      {/* Same joins as the paper rows above (PublicationEntry). */}
                      {i === 0
                        ? null
                        : i < all.length - 1
                          ? ", "
                          : all.length > 2
                            ? ", and "
                            : " and "}
                      {/* Lab members in weight 600, the CV convention (RC-8). */}
                      {a.isLab ? <b>{a.name}</b> : a.name}
                    </Fragment>
                  ))}
                </span>
              )}
              {p.venue && <span className="dr-wip__status">{p.venue}</span>}
              {status && <span className="dr-wip__status">{status}</span>}
              <DraftBadge show={p.draft} line />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
