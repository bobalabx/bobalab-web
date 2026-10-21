/**
 * "In progress" (DECISIONS D-05): work without a public version is listed by
 * title only, with its self-reported status and "as of" date. It never counts
 * toward paper totals or seeds.
 */
import Link from "next/link";
import type { PublicationView } from "@/lib/content/load";
import { statusLine } from "@/components/ui/PublicationEntry";
import { DraftBadge } from "@/components/ui/Badge";

export function InProgressList({
  items,
  headingId,
  as: H = "h3",
}: {
  items: PublicationView[];
  headingId: string;
  as?: "h3" | "h4";
}) {
  if (!items.length) return null;
  return (
    <div className="dr-wip">
      <H id={headingId} className="dr-wip__title">
        In progress
      </H>
      <p className="t-sm t-muted dr-wip__note">
        Listed by title only until a public version exists.
      </p>
      <ul className="dr-wip__list" role="list" aria-labelledby={headingId}>
        {items.map((p) => {
          const status = statusLine(p);
          return (
            <li key={p.slug}>
              <Link href={`/publications/${p.slug}/`} className="dr-wip__link">
                {p.title}
              </Link>
              {status && <span className="t-sm t-muted dr-wip__status">{status}</span>}
              <DraftBadge show={p.draft} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
