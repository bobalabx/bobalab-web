/**
 * "Work with us on this" (§D5.9). Rendered only when the direction is flagged
 * open_to_collaborators or an open/rolling opportunity lists it. Every fact
 * (status, dates, routes, email) comes from content.
 */
import Link from "next/link";
import type { OpportunityView } from "@/lib/content/load";
import { DateText } from "@/components/ui/DateText";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/icons";

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
      {openToCollaborators && (
        <p className="dr-work__lead">This direction is open to collaborators.</p>
      )}
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
                <Badge tone="accent" dot>
                  {STATUS[o.status]}
                </Badge>
                {o.as_of && (
                  <span className="t-sm t-muted">
                    as of <DateText value={o.as_of} />
                  </span>
                )}
                {o.closes_on && (
                  <span className="t-sm t-muted">
                    closes <DateText value={o.closes_on} />
                  </span>
                )}
                <DraftBadge show={o.draft} />
              </p>
              {o.route && <p className="t-sm">{o.route}</p>}
            </li>
          ))}
        </ul>
      )}
      <ul className="dr-work__links" role="list">
        <li>
          <Link href="/join/" className="bl-cta bl-cta--quiet">
            <span>
              Ways to work with the lab<span className="vh"> on {directionTitle}</span>
            </span>
            <Icon name="arrow-right" />
          </Link>
        </li>
        <li>
          <a href={`mailto:${email}`} className="dr-work__email">
            <Icon name="mail" />
            <span>{email}</span>
          </a>
        </li>
      </ul>
    </div>
  );
}
