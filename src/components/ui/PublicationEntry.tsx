/**
 * One publication in a list (brief §D7 entry anatomy): title link, authors
 * (lab members highlighted and linked), venue/year, status with "as of" and
 * self-reported wording, awards, direction tags, materials row.
 */
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { PublicationView, AuthorView } from "@/lib/content/load";
import { formatDate } from "@/lib/content/dates";
import { pageRange } from "@/lib/publications/csl";
import { Badge, DraftBadge } from "./Badge";
import { PearlTagList } from "./PearlTag";
import { MaterialsRow, materialsFromPublication } from "./MaterialsRow";
import { PUBLICATION_STATUS_LABELS, PUBLICATION_TYPE_LABELS } from "./labels";

type Heading = "h2" | "h3" | "h4";

/** Awards shown in a list entry before the "N more awards" link (WP3 request 3). */
const LIST_AWARDS = 2;

function Authors({ authors, currentPerson }: { authors: AuthorView[]; currentPerson?: string }) {
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
          // No self-link on the person's own page (WP4 request 4).
          name =
            a.person.hasProfile && a.person.slug !== currentPerson ? (
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

/**
 * "Major revision at M&SOM · as of Apr 2026 · reported by the lab".
 * Pass the publication `type` so a bare "Working paper" status on a working
 * paper (which only repeats the type badge and claims nothing) is dropped
 * (WP3 request 3).
 */
export function statusLine(
  p: Pick<PublicationView, "status" | "status_note" | "as_of" | "status_source">,
  type?: PublicationView["type"],
): string | null {
  if (p.status === "published") return null;
  if (p.status === "working-paper" && type === "working-paper" && !p.status_note) return null;
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
  showAwards = true,
  currentPerson,
}: {
  pub: PublicationView;
  as?: Heading;
  showTags?: boolean;
  showType?: boolean;
  /** false leaves the award list out entirely (home digest, brief §D3.3; WP1 request 5). */
  showAwards?: boolean;
  /** Slug of the person whose page this list is on: their name is not linked (WP4 request 4). */
  currentPerson?: string;
}) {
  const status = statusLine(pub, pub.type);
  const venue = [
    pub.venue,
    pub.volume && `${pub.volume}${pub.issue ? `(${pub.issue})` : ""}`,
    pageRange(pub.pages),
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
        <Authors authors={pub.authorList} currentPerson={currentPerson} />
      </p>
      {(venue || status) && (
        <p className="bl-pub__venue">
          {venue && <cite>{venue}</cite>}
          {venue && status && <span aria-hidden="true"> · </span>}
          {status && <span className="bl-pub__status">{status}</span>}
        </p>
      )}
      {showAwards && pub.awards.length > 0 && (
        <ul className="bl-pub__awards" aria-label="Awards">
          {pub.awards.slice(0, LIST_AWARDS).map((a) => (
            <li key={`${a.name}-${a.year}`}>
              <Badge tone="strong">
                {a.name}, {a.year}
              </Badge>
              {a.under_title && (
                <span className="t-sm t-muted"> (as &ldquo;{a.under_title}&rdquo;)</span>
              )}
            </li>
          ))}
          {pub.awards.length > LIST_AWARDS && (
            <li>
              <Link href={`/publications/${pub.slug}/#awards-h`}>
                {pub.awards.length - LIST_AWARDS} more{" "}
                {pub.awards.length - LIST_AWARDS === 1 ? "award" : "awards"}
                <span className="vh"> for {pub.title}</span>
              </Link>
            </li>
          )}
        </ul>
      )}
      {showTags && <PearlTagList items={pub.directionRefs} />}
      <MaterialsRow title={pub.title} items={materialsFromPublication(pub)} />
    </article>
  );
}
