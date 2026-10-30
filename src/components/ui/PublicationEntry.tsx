/**
 * One publication as a ruled ledger row (D-13 item 5; P3 `.row`):
 *   main  — title link (t-title 600), authors (lab members in weight 600, the CV
 *           convention, never a disc), venue and status in muted meta, the
 *           lab's `in_brief` line (clamped to 2 lines), awards;
 *   meta  — the type word and year as plain words, direction names with their
 *           16 px line segment, and the materials as plain text links.
 * Two columns from 64rem (main | 17.5rem meta), stacked below.
 * The review status is a plain academic label, with no "as of" date and no
 * provenance note (copy sweep, docs/CONTENT-QUESTIONS.md).
 */
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { PublicationView, AuthorView } from "@/lib/content/load";
import { pageRange, typeWord } from "@/lib/publications/csl";
import { Badge, DraftBadge } from "./Badge";
import { PearlTagList } from "./PearlTag";
import { MaterialsRow, materialsFromPublication } from "./MaterialsRow";
import { rowStatus } from "@/lib/publications/status";
import { entryMark } from "@/lib/preview/mark";

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
 * "Under revision at Manufacturing & Service Operations Management": the status
 * as a plain label. Pass the publication `type` so a bare Work in progress on a
 * working paper or a work in progress (which only repeats the type word and
 * claims nothing) is dropped (WP3 request 3). Pass the `venue` too: after
 * "arXiv preprint" a version-only note ("v2") is left out. Wording rules:
 * src/lib/publications/status.ts.
 */
export function statusLine(
  p: Pick<PublicationView, "status" | "status_note"> & { venue?: string },
  type?: PublicationView["type"],
): string | null {
  return rowStatus({ status: p.status, status_note: p.status_note, venue: p.venue, type });
}

export function PublicationEntry({
  pub,
  as: H = "h3",
  showTags = true,
  showType = true,
  showAwards = true,
  showBrief = true,
  currentPerson,
}: {
  pub: PublicationView;
  as?: Heading;
  showTags?: boolean;
  showType?: boolean;
  /** false leaves the award list out entirely (home digest, brief §D3.3; WP1 request 5). */
  showAwards?: boolean;
  /** false leaves out the lab's `in_brief` line (shown clamped to 2 lines by default). */
  showBrief?: boolean;
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
  const materials = materialsFromPublication(pub);
  return (
    <article
      className="bl-pub"
      aria-labelledby={`pub-${pub.slug}`}
      {...entryMark("publications", pub.slug)}
    >
      <div className="bl-pub__main">
        <H className="bl-pub__title" id={`pub-${pub.slug}`}>
          <Link href={`/publications/${pub.slug}/`}>{pub.title}</Link>
        </H>
        <p className="bl-pub__authors">
          <Authors authors={pub.authorList} currentPerson={currentPerson} />
        </p>
        {(venue || status) && (
          <p className="bl-pub__venue">
            {venue && <cite>{venue}</cite>}
            {venue && status && <span aria-hidden="true">. </span>}
            {status && <span className="bl-pub__status">{status}</span>}
          </p>
        )}
        {showBrief && pub.in_brief && <p className="bl-pub__brief">{pub.in_brief}</p>}
        {showAwards && pub.awards.length > 0 && (
          <ul className="bl-pub__awards" aria-label="Awards">
            {pub.awards.slice(0, LIST_AWARDS).map((a) => (
              <li key={`${a.name}-${a.year}`}>
                <Badge tone="strong">
                  {a.name}, {a.year}
                </Badge>
                {a.under_title && (
                  <span className="t-muted"> (as &ldquo;{a.under_title}&rdquo;)</span>
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
      </div>
      <div className="bl-pub__meta">
        {(showType || pub.year || pub.draft) && (
          <p className="bl-pub__type">
            {showType && <Badge>{typeWord(pub)}</Badge>}
            {showType && pub.year ? ", " : null}
            {pub.year && <span className="t-num">{pub.year}</span>}
            {pub.draft && (
              <>
                {" "}
                <DraftBadge />
              </>
            )}
          </p>
        )}
        {showTags && <PearlTagList items={pub.directionRefs} />}
        <MaterialsRow title={pub.title} items={materials} />
      </div>
    </article>
  );
}
