/**
 * One opportunity on /join/ (DECISIONS D-05), a ruled ledger row: title, route
 * (a sentence of its own, from content), body and links in the track; status
 * and closing date at the right. Nothing is inferred and statuses stay honest:
 * a status the lab has not set ("unknown") is simply not shown (copy sweep: no
 * dash, no "not confirmed" legend, no "as of" dates), and "Apply" appears only
 * while the opportunity is open.
 */
import type { OpportunityView } from "@/lib/content/load";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { DateText } from "@/components/ui/DateText";
import { Prose } from "@/components/ui/Prose";
import { mailtoHref } from "./MailLink";
import { entryMark } from "@/lib/preview/mark";
import "./pages.css";

/** The status in words, or null when the lab has not set one ("unknown" shows nothing). */
export function statusLabel(o: Pick<OpportunityView, "status" | "isOpen">): string | null {
  if (o.isOpen) return o.status === "rolling" ? "Open, rolling" : "Open";
  if (o.status === "unknown") return null;
  return "Closed";
}

/**
 * Where an opportunity's `url` goes, in words (change request content-4b: link text
 * says where a link goes, not "More information"). Falls back to the host name.
 */
export function urlLabel(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Details";
  }
  if (host === "urapprojects.berkeley.edu") return "URAP listing";
  if (host === "classes.berkeley.edu") return "Class listing";
  if (host === "parksinchaisri.github.io") return "Park Sinchaisri’s website";
  return host;
}

/** Open first, then closed (a known status), then unconfirmed; published before drafts; then title. */
export function compareOpportunities(a: OpportunityView, b: OpportunityView): number {
  const rank = (o: OpportunityView) => (o.isOpen ? 0 : o.status === "unknown" ? 2 : 1);
  return rank(a) - rank(b) || Number(a.draft) - Number(b.draft) || a.title.localeCompare(b.title);
}

export function OpportunityStatus({ o }: { o: OpportunityView }) {
  const label = statusLabel(o);
  const pastClose = (o.status === "open" || o.status === "rolling") && !o.isOpen && o.closes_on;
  if (!label && !o.draft) return null;
  return (
    <p className="pg-opp__status">
      {label ? (
        <>
          {/* Phones have no column head, so the row names its status column. */}
          <span className="pg-opp__statlabel" aria-hidden="true">
            Status:
          </span>
          <Badge>{label}</Badge>
        </>
      ) : null}
      {o.isOpen && o.closes_on ? (
        <span>
          Closes <DateText value={o.closes_on} />
        </span>
      ) : null}
      {pastClose ? (
        <span>
          on <DateText value={o.closes_on} />
        </span>
      ) : null}
      <DraftBadge show={o.draft} />
    </p>
  );
}

export function OpportunityCard({
  o,
  headingLevel: H = "h3",
  labEmail,
}: {
  o: OpportunityView;
  headingLevel?: "h3" | "h4";
  /**
   * The lab's own address, which the page already gives in its lead and in every
   * audience section. A row whose contact is that same address does not print it
   * again (it appeared up to seven times on /join/).
   */
  labEmail?: string;
}) {
  const id = `opp-${o.slug}`;
  const email = o.email && o.email.toLowerCase() !== labEmail?.toLowerCase() ? o.email : undefined;
  return (
    <article className="pg-opp" aria-labelledby={id} {...entryMark("opportunities", o.slug)}>
      <H className="pg-opp__title" id={id}>
        {o.title}
      </H>
      <OpportunityStatus o={o} />
      {o.route ? <p className="pg-opp__route">{o.route}</p> : null}
      {o.body?.trim() ? <Prose source={o.body} /> : null}
      {o.url || (o.isOpen && o.apply_url) || email ? (
        <ul className="pg-links" aria-label={`Links for ${o.title}`}>
          {o.isOpen && o.apply_url ? (
            <li>
              <a href={o.apply_url} rel="noopener noreferrer">
                Apply<span className="vh"> for {o.title}</span>
              </a>
            </li>
          ) : null}
          {o.url ? (
            <li>
              <a href={o.url} rel="noopener noreferrer">
                {urlLabel(o.url)}
                <span className="vh"> for {o.title}</span>
              </a>
            </li>
          ) : null}
          {email ? (
            <li>
              <a href={mailtoHref(email, o.title)}>
                <span className="vh">Email about {o.title}: </span>
                {email}
              </a>
            </li>
          ) : null}
        </ul>
      ) : null}
    </article>
  );
}
