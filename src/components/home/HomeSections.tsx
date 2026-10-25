/**
 * Home sections after Fig. 1 (DECISIONS D-13; prototype p3/index.html, with P2's
 * people lattice, JUDGE refinement 8). Each renders only when content provides
 * something to show (no placeholders). Section heads are a plain h2 (P3); lists
 * are ruled ledgers. The way on is one line at the foot of the list that states
 * what the page holds ("Publications: 17 papers, 8 in progress", P2 `.more`), not
 * an "All N" link beside the heading (AUDIT: h2 + "All →" on every section).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { NewsView, PublicationView } from "@/lib/content/load";
import type { FindingView } from "@/lib/content/queries";
import type { PublicPerson } from "@/lib/content/people";
import { initials } from "@/lib/content/people";
import { roleLine } from "@/components/people/model";
import { PublicationEntry } from "@/components/ui/PublicationEntry";
import { PearlTag, PearlTagList } from "@/components/ui/PearlTag";
import { EvidenceLabel } from "@/components/ui/EvidenceLabel";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { DateText } from "@/components/ui/DateText";
import { Img } from "@/components/ui/Img";
import "./home.css";

function Section({
  id,
  title,
  more,
  note,
  children,
  className,
}: {
  id: string;
  title: string;
  /** The foot line: where the full list lives and what it holds. */
  more?: { href: string; label: string };
  /** A note between the list and the foot line. */
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={["hm-sec", className].filter(Boolean).join(" ")} aria-labelledby={id}>
      <div className="bl-sec-h hm-sec-h">
        <h2 id={id}>{title}</h2>
      </div>
      {children}
      {note}
      {more && (
        <p className="hm-more">
          <Link href={more.href}>{more.label}</Link>
        </p>
      )}
    </section>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Publications: 17 papers, 8 in progress" (the lane-label wording of Fig. 1). */
export function publicationsLine(papers: number, inProgress: number): string {
  return `Publications: ${plural(papers, "paper")}${inProgress ? `, ${inProgress} in progress` : ""}`;
}
/** "People: 25 members, 25 alumni". */
export function peopleLine(members: number, alumni: number): string {
  return `People: ${plural(members, "member")}${alumni ? `, ${alumni} alumni` : ""}`;
}
/** "News: 19 items since 2023". */
export function newsLine(total: number, since?: string): string {
  const y = since?.slice(0, 4);
  return `News: ${plural(total, "item")}${y && /^\d{4}$/.test(y) ? ` since ${y}` : ""}`;
}

// ---------------------------------------------------------------------------

export function FindingsSection({ findings }: { findings: FindingView[] }) {
  if (!findings.length) return null;
  return (
    <Section id="h-findings" title="What we’ve learned">
      <ul role="list" className="bl-ledger bl-ledger--closed hm-findings">
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

/** The newest papers; hovering or focusing a row lights its dots in Fig. 1. */
export function PublicationsSection({
  items,
  total,
  inProgress = 0,
}: {
  items: PublicationView[];
  /** Counted publications (D-05). */
  total: number;
  inProgress?: number;
}) {
  if (!items.length) return null;
  return (
    <Section
      id="h-pubs"
      title="Recent publications"
      more={{ href: "/publications/", label: publicationsLine(total, inProgress) }}
    >
      <ol role="list" className="hm-pubs">
        {items.map((p) => (
          <li key={p.slug} data-f1-row={p.slug}>
            <PublicationEntry pub={p} as="h3" showAwards={false} />
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** A news log: date, title, directions (P3 `.log`). */
export function NewsSection({
  items,
  total,
  since,
}: {
  items: NewsView[];
  total: number;
  /** Date of the oldest item ("YYYY-MM-DD"). */
  since?: string;
}) {
  if (!items.length) return null;
  return (
    <Section id="h-news" title="News" more={{ href: "/news/", label: newsLine(total, since) }}>
      <ol role="list" className="hm-log">
        {items.map((n) => (
          <li key={n.slug}>
            <DateText value={n.date} className="hm-log-date" />
            <p className="hm-log-title">
              <Link href={`/news/${n.slug}/`}>{n.title}</Link>
              {n.upcoming && (
                <>
                  {" "}
                  <Badge tone="accent">Upcoming</Badge>
                </>
              )}
              {n.draft && (
                <>
                  {" "}
                  <DraftBadge />
                </>
              )}
            </p>
            <PearlTagList items={n.directionRefs} linked={false} label={`Directions: ${n.title}`} />
          </li>
        ))}
      </ol>
    </Section>
  );
}

/**
 * The lab's own faces (P2 lattice; D-13 item 5): square photos, or a square
 * initials tile where there is no consented photo. Then the routes to join.
 */
export function PeopleSection({
  people,
  max = 16,
  alumni = 0,
  email,
}: {
  people: PublicPerson[];
  max?: number;
  alumni?: number;
  email?: string;
}) {
  if (!people.length) return null;
  const shown = people.slice(0, max);
  return (
    <Section
      id="h-people"
      title="People"
      more={{ href: "/people/", label: peopleLine(people.length, alumni) }}
      note={
        <p className="hm-join">
          To work with the lab, see the notes for <Link href="/join/#students">Students & RAs</Link>{" "}
          and for <Link href="/join/#partners">Partners & data collaborators</Link>
          {email ? (
            <>
              , or email <a href={`mailto:${email}`}>{email}</a>.
            </>
          ) : (
            "."
          )}
        </p>
      }
    >
      <ul role="list" className="hm-people">
        {shown.map((p) => (
          <li key={p.slug} className="hm-person">
            <div className="hm-ph">
              {p.photo ? (
                // Consent-gated by the loader (D-06): photo is present only with photo_consent.
                <Img
                  src={p.photo}
                  alt={p.photo_alt ?? ""}
                  width={240}
                  height={240}
                  sizes="(min-width: 64rem) 120px, 30vw"
                  className="hm-photo"
                />
              ) : (
                <span className="hm-ini" aria-hidden="true">
                  {initials(p.name)}
                </span>
              )}
            </div>
            <p className="hm-person-name">
              {p.hasProfile ? <Link href={`/people/${p.slug}/`}>{p.name}</Link> : p.name}
            </p>
            <p className="hm-person-role">{roleLine(p)}</p>
            {p.draft && <DraftBadge />}
          </li>
        ))}
      </ul>
    </Section>
  );
}
