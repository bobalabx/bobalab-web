/**
 * Home sections after the hero (brief §D3.2–§D3.6), each rendered only when
 * content provides something to show (no placeholders).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { NewsView, OpportunityView, PublicationView } from "@/lib/content/load";
import type { FindingView } from "@/lib/content/queries";
import type { PublicPerson } from "@/lib/content/people";
import { ROLE_LABELS, initials } from "@/lib/content/people";
import type { SwatchId } from "@/lib/content/palette";
import { PublicationEntry } from "@/components/ui/PublicationEntry";
import { NewsItem } from "@/components/ui/NewsItem";
import { PearlTag } from "@/components/ui/PearlTag";
import { EvidenceLabel } from "@/components/ui/EvidenceLabel";
import { DraftBadge } from "@/components/ui/Badge";
import { Pearl } from "@/components/ui/Pearl";
import { Img } from "@/components/ui/Img";
import { Icon } from "@/components/ui/icons";
import { isExternalUrl } from "@/lib/site/paths";
import "./home.css";

function Section({
  id,
  title,
  more,
  children,
}: {
  id: string;
  title: string;
  more?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="hm-sec" aria-labelledby={id}>
      <div className="hm-sec-head">
        <h2 id={id}>{title}</h2>
        {more && (
          <Link href={more.href} className="hm-more">
            {more.label}
            <Icon name="arrow-right" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Meniscus rule (§C9): a hairline whose ends lift 4 px. Once, home only. */
export function Meniscus() {
  return (
    <svg className="hm-meniscus" viewBox="0 0 400 8" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 1.5C40 6.5 80 6.5 200 6.5S360 6.5 400 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------

export function FindingsSection({ findings }: { findings: FindingView[] }) {
  if (!findings.length) return null;
  return (
    <Section id="h-findings" title="What we’ve learned">
      <ul role="list" className="hm-list hm-findings">
        {findings.map((f, i) => (
          <li key={i} className="hm-finding">
            <p className="hm-finding-text">{f.text}</p>
            <div className="hm-finding-meta">
              {f.direction && (
                <PearlTag
                  label={f.direction.short_label}
                  swatch={f.direction.color}
                  href={`/research/${f.direction.slug}/`}
                />
              )}
              <EvidenceLabel level={f.evidence} />
              {f.publication && (
                <Link href={`/publications/${f.publication.slug}/`}>
                  Read the paper<span className="vh">: {f.publication.title}</span>
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function PublicationsSection({ items }: { items: PublicationView[] }) {
  if (!items.length) return null;
  return (
    <Section
      id="h-pubs"
      title="Recent publications"
      more={{ href: "/publications/", label: "All publications" }}
    >
      <ol role="list" className="hm-list hm-rows">
        {items.map((p) => (
          <li key={p.slug}>
            <PublicationEntry pub={p} as="h3" showAwards={false} />
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function NewsSection({ items }: { items: NewsView[] }) {
  if (!items.length) return null;
  return (
    <Section id="h-news" title="Latest news" more={{ href: "/news/", label: "All news" }}>
      <ol role="list" className="hm-list hm-rows">
        {items.map((n) => (
          <li key={n.slug}>
            <NewsItem item={n} as="h3" />
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function PeopleSection({
  people,
  swatchOf,
  max = 12,
}: {
  people: PublicPerson[];
  swatchOf: (p: PublicPerson) => SwatchId | undefined;
  max?: number;
}) {
  if (!people.length) return null;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <Section id="h-people" title="People" more={{ href: "/people/", label: "Meet the lab" }}>
      <ul role="list" className="hm-list hm-people">
        {shown.map((p) => (
          <li key={p.slug} className="hm-person">
            {p.photo ? (
              // Consent-gated by the loader (D-06): photo is present only with photo_consent.
              <Img
                src={p.photo}
                alt={p.photo_alt ?? ""}
                width={44}
                height={44}
                className="hm-person-photo"
              />
            ) : (
              <Pearl size="row" initials={initials(p.name)} swatch={swatchOf(p)} />
            )}
            <p className="hm-person-name">
              {p.hasProfile ? <Link href={`/people/${p.slug}/`}>{p.name}</Link> : p.name}
            </p>
            <p className="hm-person-role">{p.title || ROLE_LABELS[p.role].one}</p>
            <DraftBadge show={p.draft} />
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <p className="hm-people-more">
          and {rest} more {rest === 1 ? "member" : "members"} on the{" "}
          <Link href="/people/">People page</Link>.
        </p>
      )}
    </Section>
  );
}

const AUDIENCE_HEADINGS: Record<OpportunityView["audience"], string> = {
  students: "Students & RAs",
  partners: "Partners & data collaborators",
  "phd-postdoc": "PhD students & postdocs",
  press: "Press",
};
const AUDIENCE_ORDER: OpportunityView["audience"][] = [
  "students",
  "partners",
  "phd-postdoc",
  "press",
];

function OpportunityLink({ o }: { o: OpportunityView }) {
  const href = o.apply_url ?? o.url;
  return (
    <li>
      {href ? (
        <a href={href} rel={isExternalUrl(href) ? "noopener noreferrer" : undefined}>
          {o.title}
        </a>
      ) : o.email ? (
        <a href={`mailto:${o.email}`}>{o.title}</a>
      ) : (
        <span>{o.title}</span>
      )}
      {o.route && <span className="t-sm t-muted"> · {o.route}</span>} <DraftBadge show={o.draft} />
    </li>
  );
}

/**
 * The two routes of brief §D3.6. They point at the sections of /join/ (WP5:
 * #students, #partners), which always exist; they claim no opening. Open or
 * rolling opportunities from content are listed above them when there are any.
 */
const WORK_ROUTES = [
  { href: "/join/#students", label: "Students & RAs" },
  { href: "/join/#partners", label: "Partners & data collaborators" },
] as const;

export function WorkWithUsSection({
  opportunities,
  email,
}: {
  opportunities: OpportunityView[];
  email?: string;
}) {
  const groups = AUDIENCE_ORDER.map((a) => ({
    audience: a,
    items: opportunities.filter((o) => o.audience === a),
  })).filter((g) => g.items.length);
  return (
    <section className="hm-sec hm-work" aria-labelledby="h-work">
      <h2 id="h-work">Work with us</h2>
      {groups.length > 0 && (
        <div className="hm-work-grid">
          {groups.map((g) => (
            <div key={g.audience} className="hm-work-group">
              <h3>{AUDIENCE_HEADINGS[g.audience]}</h3>
              <ul role="list">
                {g.items.map((o) => (
                  <OpportunityLink key={o.slug} o={o} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <ul role="list" className="hm-work-routes">
        {WORK_ROUTES.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="bl-cta bl-cta--quiet">
              {r.label}
              <Icon name="arrow-right" />
            </Link>
          </li>
        ))}
      </ul>
      {email && (
        <p className="hm-work-contact">
          Or email the lab at <a href={`mailto:${email}`}>{email}</a>
        </p>
      )}
    </section>
  );
}
