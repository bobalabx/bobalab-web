/**
 * One publication as a row of the publications ledger (D-13 item 5; P3
 * `publications.html` `.row`). Same element classes as the shared
 * `ui/PublicationEntry` (`.bl-pub`, `.bl-pub__*`) so selector-based tests and
 * the shared row styles hold; the publications pages need P3's meta column,
 * which the shared entry does not draw:
 *
 *   main — title (links to the paper page), authors (lab members in 600,
 *          linked when they have a profile), venue line plus the review
 *          status, and the lab's `in_brief` one-liner (2 lines at most);
 *   meta — the type word, the directions with their 16 px line segment,
 *          "7 awards" (linking to the paper page's award list), and the
 *          materials as plain text links "PDF  arXiv  DOI".
 */
import Link from "next/link";
import type { PublicationView } from "@/lib/content/load";
import { pageRange, typeWord } from "@/lib/publications/csl";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { MaterialsRow, materialsFromPublication } from "@/components/ui/MaterialsRow";
import { AuthorList, statusText } from "./PaperParts";

type Heading = "h2" | "h3" | "h4";

export function PublicationRow({
  pub,
  as: H = "h3",
  showYear = false,
  showBrief = true,
}: {
  pub: PublicationView;
  as?: Heading;
  /** The year next to the type word (lists that are not grouped by year). */
  showYear?: boolean;
  showBrief?: boolean;
}) {
  const status = statusText(pub);
  const venue = [
    pub.venue,
    pub.volume && `${pub.volume}${pub.issue ? `(${pub.issue})` : ""}`,
    pageRange(pub.pages),
  ]
    .filter(Boolean)
    .join(", ");
  const materials = materialsFromPublication(pub);
  const nAwards = pub.awards.length;
  return (
    <article className="bl-pub pubs-row" aria-labelledby={`pub-${pub.slug}`}>
      <div className="bl-pub__main">
        <H className="bl-pub__title" id={`pub-${pub.slug}`}>
          <Link href={`/publications/${pub.slug}/`}>{pub.title}</Link>
        </H>
        <p className="bl-pub__authors">
          <AuthorList authors={pub.authorList} variant="row" />
        </p>
        {(venue || status) && (
          <p className="bl-pub__venue">
            {venue && <cite>{venue}</cite>}
            {venue && status ? ". " : null}
            {status && <span className="bl-pub__status">{status}</span>}
          </p>
        )}
        {showBrief && pub.in_brief && <p className="bl-pub__brief">{pub.in_brief}</p>}
      </div>
      <div className="bl-pub__meta">
        <p className="bl-pub__type">
          <Badge>{typeWord(pub)}</Badge>
          {showYear && pub.year ? <span className="t-num">, {pub.year}</span> : null}
          {pub.draft && (
            <>
              {" "}
              <DraftBadge />
            </>
          )}
        </p>
        {pub.directionRefs.length > 0 && (
          <ul className="pubs-dirs" aria-label="Research directions">
            {pub.directionRefs.map((d) => (
              <li key={d.slug}>
                <span className="bl-seg" data-swatch={d.color} aria-hidden="true" />
                {d.short_label}
              </li>
            ))}
          </ul>
        )}
        {nAwards > 0 && (
          <p className="pubs-awards">
            <Link href={`/publications/${pub.slug}/#awards-h`}>
              {nAwards} {nAwards === 1 ? "award" : "awards"}
              <span className="vh"> for {pub.title}</span>
            </Link>
          </p>
        )}
        <MaterialsRow title={pub.title} items={materials} />
      </div>
    </article>
  );
}
