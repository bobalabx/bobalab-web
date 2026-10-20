/**
 * One publication in a list (brief §D7 entry anatomy): title link, authors
 * (lab members highlighted and linked), venue/year, status with "as of" and
 * self-reported wording, awards, direction tags, materials row.
 */
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { PublicationView, AuthorView } from "@/lib/content/load";
import { formatDate } from "@/lib/content/dates";
import { Badge, DraftBadge } from "./Badge";
import { PearlTagList } from "./PearlTag";
import { MaterialsRow, materialsFromPublication } from "./MaterialsRow";
import { PUBLICATION_STATUS_LABELS, PUBLICATION_TYPE_LABELS } from "./labels";

type Heading = "h2" | "h3" | "h4";

function Authors({ authors }: { authors: AuthorView[] }) {
  return (
    <>
      {authors.map((a, i) => {
        const sep =
          i === 0
            ? ""
            : i === authors.length - 1
              ? authors.length > 2
                ? ", and "
                : " and "
              : ", ";
        let name: ReactNode = a.name;
        if (a.isLab && a.person) {
          name = a.person.hasProfile ? (
            <Link href={`/people/${a.person.slug}/`} className="bl-pub__author--lab">
              {a.name}
            </Link>
          ) : (
            <strong className="bl-pub__author--lab">{a.name}</strong>
          );
        }
        return (
          <Fragment key={`${a.name}-${i}`}>
            {sep}
            {name}
          </Fragment>
        );
      })}
    </>
  );
}

/** "Major revision at M&SOM · as of Apr 2026 · reported by the lab". */
export function statusLine(
  p: Pick<PublicationView, "status" | "status_note" | "as_of" | "status_source">,
): string | null {
  if (p.status === "published") return null;
  const parts = [
    `${PUBLICATION_STATUS_LABELS[p.status]}${p.status_note ? ` ${p.status_note}` : ""}`,
  ];
  if (p.as_of) parts.push(`as of ${formatDate(p.as_of)}`);
  if (p.status_source === "self-reported") parts.push("reported by the lab");
  return parts.join(" · ");
}

export function PublicationEntry({
  pub,
  as: H = "h3",
  showTags = true,
  showType = true,
}: {
  pub: PublicationView;
  as?: Heading;
  showTags?: boolean;
  showType?: boolean;
}) {
  const status = statusLine(pub);
  const venue = [
    pub.venue,
    pub.volume && `${pub.volume}${pub.issue ? `(${pub.issue})` : ""}`,
    pub.pages,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <article className="bl-pub" aria-labelledby={`pub-${pub.slug}`}>
      <div className="bl-card__meta">
        {showType && <Badge>{PUBLICATION_TYPE_LABELS[pub.type]}</Badge>}
        {pub.year && <span className="t-mono">{pub.year}</span>}
        <DraftBadge show={pub.draft} />
      </div>
      <H className="bl-pub__title" id={`pub-${pub.slug}`}>
        <Link href={`/publications/${pub.slug}/`}>{pub.title}</Link>
      </H>
      <p className="bl-pub__authors">
        <Authors authors={pub.authorList} />
      </p>
      {(venue || status) && (
        <p className="bl-pub__venue">
          {venue && <cite>{venue}</cite>}
          {venue && status && <span aria-hidden="true"> · </span>}
          {status && <span className="bl-pub__status">{status}</span>}
        </p>
      )}
      {pub.awards.length > 0 && (
        <ul className="bl-pub__awards" aria-label="Awards">
          {pub.awards.map((a) => (
            <li key={`${a.name}-${a.year}`}>
              <Badge tone="strong">
                {a.name}, {a.year}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {showTags && <PearlTagList items={pub.directionRefs} />}
      <MaterialsRow title={pub.title} items={materialsFromPublication(pub)} />
    </article>
  );
}
