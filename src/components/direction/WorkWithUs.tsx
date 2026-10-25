/**
 * "Work with us on this" (§D5.9). Rendered only when the direction is flagged
 * open_to_collaborators or an open/rolling opportunity lists it. Every fact
 * (status, dates, routes, email) comes from content. Plain ruled rows and
 * plain links (D-13: no pills, no arrows, no button-shaped links).
 */
import Link from "next/link";
import type { OpportunityView } from "@/lib/content/load";
import { DateText } from "@/components/ui/DateText";
import { Badge, DraftBadge } from "@/components/ui/Badge";

const STATUS: Record<OpportunityView["status"], string> = {
  open: "Open",
  rolling: "Rolling",
  closed: "Closed",
  unknown: "Status unknown",
};

export function WorkWithUs({
  directionTitle,
  openToCollaborators,
  opportunities,
  email,
}: {
  directionTitle: string;
  openToCollaborators: boolean;
  opportunities: OpportunityView[];
  email: string;
}) {
  return (
    <div className="dr-work">
      {openToCollaborators && <p className="dr-work__lead">Open to collaborators.</p>}
      {opportunities.length > 0 && (
        <ul className="dr-work__list" role="list">
          {opportunities.map((o) => (
            <li key={o.slug} className="dr-work__item">
              <p className="dr-work__item-title">
                {o.apply_url || o.url ? (
                  <a href={o.apply_url ?? o.url} rel="noopener noreferrer">
                    {o.title}
                  </a>
                ) : (
                  o.title
                )}
              </p>
              <p className="dr-work__meta">
                <Badge tone="strong">{STATUS[o.status]}</Badge>
                {o.as_of && (
                  <span>
                    {", as of "}
                    <DateText value={o.as_of} />
                  </span>
                )}
                {o.closes_on && (
                  <span>
                    {", closes "}
                    <DateText value={o.closes_on} />
                  </span>
                )}
                <DraftBadge show={o.draft} />
              </p>
              {o.route && <p className="dr-work__route">{o.route}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="dr-work__links">
        <Link href="/join/">
          Ways to work with the lab<span className="vh"> on {directionTitle}</span>
        </Link>
        {", or write to "}
        <a href={`mailto:${email}`}>{email}</a>.
      </p>
    </div>
  );
}
