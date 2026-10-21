/**
 * Small server pieces of the paper page (brief §D8): author list, venue line,
 * status note. Lab members are highlighted, and linked only when they are
 * listed and have a profile page. External coauthors are not people (D-05):
 * their name links to the web page entered for them (brief critic table:
 * "author names with an external link only"), or is plain text without one.
 */
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { AuthorView, PublicationView } from "@/lib/content/load";
import { formatDate } from "@/lib/content/dates";
import { venueLine } from "@/lib/publications/csl";
import { PUBLICATION_STATUS_LABELS } from "@/components/ui/labels";

export function AuthorList({ authors }: { authors: AuthorView[] }) {
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
            <Link href={`/people/${a.person.slug}/`} className="pub-author pub-author--lab">
              {a.name}
            </Link>
          ) : (
            <strong className="pub-author pub-author--lab">{a.name}</strong>
          );
        } else if (a.url) {
          name = (
            <a href={a.url} rel="noopener noreferrer" className="pub-author pub-author--ext">
              {a.name}
            </a>
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

/** "<cite>Management Science</cite> 2026, 72(1):733–755; online May 22, 2025". */
export function VenueLineText({ pub }: { pub: PublicationView }) {
  const v = venueLine(pub);
  if (!v.venue && !v.detail && !v.online) return null;
  const serial = pub.type === "journal" || pub.type === "conference" || pub.type === "chapter";
  return (
    <>
      {v.venue && <cite className="pub-venue__name">{v.venue}</cite>}
      {v.detail && (
        <span className="pub-venue__detail">
          {v.venue && serial ? " " : ""}
          {v.detail}
        </span>
      )}
      {v.online && <span className="pub-venue__online">; {v.online}</span>}
    </>
  );
}

/**
 * The lab's own claim about a paper under review, with its date and source
 * (brief §D7: statuses are SELF-REPORTED; show them as such with "as of").
 * A working paper whose status is just "Working paper" makes no claim beyond
 * its type (already in the eyebrow), so it gets no note.
 */
export function StatusNote({ pub }: { pub: PublicationView }) {
  if (pub.status === "published") return null;
  if (pub.status === "working-paper" && pub.type === "working-paper" && !pub.status_note) {
    return null;
  }
  const label = PUBLICATION_STATUS_LABELS[pub.status];
  const provenance = [
    pub.as_of ? `As of ${formatDate(pub.as_of)}` : null,
    pub.status_source === "self-reported" ? "reported by the lab" : null,
  ].filter(Boolean);
  return (
    <div className="pub-status">
      <p className="pub-status__main">
        <span className="pub-status__label">{label}</span>
        {pub.status_note ? ` ${pub.status_note}` : ""}
      </p>
      {provenance.length > 0 && <p className="pub-status__meta">{provenance.join(" · ")}</p>}
    </div>
  );
}
