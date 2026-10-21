/**
 * One opportunity on /join/ (DECISIONS D-05): title, status with its "as of"
 * date, closing date (only when content gives one), route, links and body.
 * Nothing is inferred: an unknown status says so, and "Apply" appears only
 * while the opportunity is open.
 */
import type { OpportunityView } from "@/lib/content/load";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { DateText } from "@/components/ui/DateText";
import { Icon } from "@/components/ui/icons";
import { Prose } from "@/components/ui/Prose";
import { mailtoHref } from "./MailLink";
import "./pages.css";

/**
 * Label in front of `route` (how to take part). A bare route such as "Email
 * the lab" reads like a stray line without it. UI wording only, no lab facts.
 */
const ROUTE_LABELS: Record<OpportunityView["audience"], string> = {
  students: "How to join",
  "phd-postdoc": "How to join",
  partners: "Next step",
  press: "Next step",
};

export function statusLabel(o: Pick<OpportunityView, "status" | "isOpen">): string {
  if (o.isOpen) return o.status === "rolling" ? "Open, rolling" : "Open";
  if (o.status === "unknown") return "Status not confirmed";
  return "Closed";
}

/** Open first, then closed (a known status), then unconfirmed; published before drafts; then title. */
export function compareOpportunities(a: OpportunityView, b: OpportunityView): number {
  const rank = (o: OpportunityView) => (o.isOpen ? 0 : o.status === "unknown" ? 2 : 1);
  return rank(a) - rank(b) || Number(a.draft) - Number(b.draft) || a.title.localeCompare(b.title);
}

export function OpportunityStatus({ o }: { o: OpportunityView }) {
  const pastClose = (o.status === "open" || o.status === "rolling") && !o.isOpen && o.closes_on;
  return (
    <p className="pg-opp__status">
      <Badge tone={o.isOpen ? "accent" : "neutral"} dot={o.isOpen}>
        {statusLabel(o)}
      </Badge>
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
      {o.as_of ? (
        <span>
          as of <DateText value={o.as_of} />
        </span>
      ) : null}
      <DraftBadge show={o.draft} />
    </p>
  );
}

export function OpportunityCard({
  o,
  headingLevel: H = "h3",
}: {
  o: OpportunityView;
  headingLevel?: "h3" | "h4";
}) {
  const id = `opp-${o.slug}`;
  return (
    <article className="pg-opp" aria-labelledby={id}>
      <H className="pg-opp__title" id={id}>
        {o.title}
      </H>
      <OpportunityStatus o={o} />
      {o.route ? (
        <p className="pg-opp__route">
          <span className="pg-opp__label">{ROUTE_LABELS[o.audience]}:</span>{" "}
          <span className="pg-opp__route-text">{o.route}</span>
        </p>
      ) : null}
      {o.body?.trim() ? <Prose source={o.body} /> : null}
      {o.url || (o.isOpen && o.apply_url) || o.email ? (
        <ul className="pg-links" aria-label={`Links for ${o.title}`}>
          {o.isOpen && o.apply_url ? (
            <li>
              <a href={o.apply_url} rel="noopener noreferrer">
                Apply<span className="vh"> for {o.title}</span>
                <Icon name="external" />
              </a>
            </li>
          ) : null}
          {o.url ? (
            <li>
              <a href={o.url} rel="noopener noreferrer">
                More information<span className="vh"> about {o.title}</span>
                <Icon name="external" />
              </a>
            </li>
          ) : null}
          {o.email ? (
            <li>
              <a href={mailtoHref(o.email, o.title)}>
                <span className="vh">Email about {o.title}: </span>
                {o.email}
              </a>
            </li>
          ) : null}
        </ul>
      ) : null}
    </article>
  );
}
