/**
 * Home sections below the hero (DECISIONS D-14, D-15; JUDGE.md §5 "Below the
 * fold", R18, R19): "New papers" (3 ruled rows: title, authors, one meta line) beside
 * "News" (4 dated one-liners), then "People" (one sentence naming the team, no counts,
 * the routes to join, and the consented photos cropped round with first names).
 * Featured findings render only when content has them (R19). Each section
 * renders only what content provides (no placeholders); its way on is one
 * factual line at the foot of the list ("Publications: 17 papers, 8 in progress").
 */
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { AuthorView, NewsView, PublicationView } from "@/lib/content/load";
import type { FindingView } from "@/lib/content/queries";
import { ROLE_LABELS, ROLE_ORDER, type PublicPerson } from "@/lib/content/people";
import { typeWord } from "@/lib/publications/csl";
import { PearlTag } from "@/components/ui/PearlTag";
import { EvidenceLabel } from "@/components/ui/EvidenceLabel";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { DateText } from "@/components/ui/DateText";
import { Img } from "@/components/ui/Img";
import "./home.css";

function Section({
  id,
  title,
  more,
  children,
  className,
}: {
  id: string;
  title: string;
  /** The foot line: where the full list lives and what it holds. */
  more?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={["hm-sec", className].filter(Boolean).join(" ")} aria-labelledby={id}>
      <div className="bl-sec-h hm-sec-h">
        <h2 id={id}>{title}</h2>
      </div>
      {children}
      {more && (
        <p className="hm-more">
          <Link href={more.href}>{more.label}</Link>
        </p>
      )}
    </section>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Publications: 17 papers, 8 in progress". */
export function publicationsLine(papers: number, inProgress: number): string {
  return `Publications: ${plural(papers, "paper")}${inProgress ? `, ${inProgress} in progress` : ""}`;
}
/** "People: current members and alumni" (D-15: no people counts on the home page). */
export function peopleLine(alumni: number): string {
  return `People: current members${alumni ? " and alumni" : ""}`;
}
/** "News: 19 items since 2023". */
export function newsLine(total: number, since?: string): string {
  const y = since?.slice(0, 4);
  return `News: ${plural(total, "item")}${y && /^\d{4}$/.test(y) ? ` since ${y}` : ""}`;
}

/** "a, b and c" */
function and(parts: string[]): string {
  return parts.length < 2
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** "Journal article, Management Science, 2026": the paper's one meta line. */
export function paperMeta(p: Pick<PublicationView, "type" | "venue" | "year">): string {
  return [typeWord(p), p.venue, p.year].filter(Boolean).join(", ");
}

/**
 * Display first names for the photo row: the quoted or bracketed preferred name
 * when there is one ('Zixian "Amy" Li' → Amy), else the first word; a first name
 * shared by several people gets their last initial (Ryan C., Ryan J.).
 */
export function firstNames(
  people: Array<Pick<PublicPerson, "slug" | "name">>,
): Map<string, string> {
  const first = (name: string) =>
    /["“(]([^"”)]+)["”)]/.exec(name)?.[1]?.trim() ?? name.trim().split(/\s+/)[0]!;
  const last = (name: string) => name.trim().split(/\s+/).at(-1)!.charAt(0);
  const count = new Map<string, number>();
  for (const p of people) count.set(first(p.name), (count.get(first(p.name)) ?? 0) + 1);
  return new Map(
    people.map((p) => {
      const f = first(p.name);
      return [p.slug, (count.get(f) ?? 0) > 1 ? `${f} ${last(p.name)}.` : f];
    }),
  );
}

/** "Master’s student" → "master’s student"; a first word with more capitals ("PhD") stays. */
const lower = (label: string) =>
  /^[A-Z][a-z]*(?=[\s’'-]|$)/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;

/**
 * The team as words, by role in ROLE_ORDER, without numbers (D-15: no people
 * counts on the home page): "a master’s student and undergraduate RAs".
 */
export function teamWords(people: Array<Pick<PublicPerson, "role">>): string {
  return and(
    ROLE_ORDER.filter((r) => r !== "pi").flatMap((role) => {
      const n = people.filter((p) => p.role === role).length;
      if (!n) return [];
      const l = ROLE_LABELS[role];
      if (n > 1) return [lower(l.group)];
      const one = lower(l.one);
      return [`${/^[aeiou]/i.test(one) ? "an" : "a"} ${one}`];
    }),
  );
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

function Authors({ authors }: { authors: AuthorView[] }) {
  return (
    <>
      {authors.map((a, i) => (
        <Fragment key={`${a.name}-${i}`}>
          {i === 0
            ? ""
            : i === authors.length - 1
              ? authors.length > 2
                ? ", and "
                : " and "
              : ", "}
          {a.isLab ? <strong>{a.name}</strong> : a.name}
        </Fragment>
      ))}
    </>
  );
}

/** "New papers": title, authors (lab members in 600) and one meta line. */
export function PapersSection({
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
      title="New papers"
      className="hm-papers-sec"
      more={{ href: "/publications/", label: publicationsLine(total, inProgress) }}
    >
      <ol role="list" className="hm-papers">
        {items.map((p) => (
          <li key={p.slug}>
            <h3 className="hm-paper-t">
              <Link href={`/publications/${p.slug}/`}>{p.title}</Link>
            </h3>
            {p.authorList.length > 0 && (
              <p className="hm-paper-au">
                <Authors authors={p.authorList} />
              </p>
            )}
            <p className="hm-paper-meta">
              <span>{paperMeta(p)}</span>
              {p.directionRefs.map((d) => (
                <PearlTag key={d.slug} label={d.short_label} swatch={d.color} size="sm" />
              ))}
              {p.draft && <DraftBadge />}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** "News": dated one-liners. */
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
    <Section
      id="h-news"
      title="News"
      className="hm-news-sec"
      more={{ href: "/news/", label: newsLine(total, since) }}
    >
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
          </li>
        ))}
      </ol>
    </Section>
  );
}

/**
 * "People" (R18; D-15: no people counts): a sentence naming the team by role, the
 * routes to join, then the people with a consented photo, cropped round, with their
 * first names (alt = full name). Nobody without a photo is drawn (no initials discs).
 */
export function PeopleSection({
  people,
  lead,
  alumni = 0,
  email,
}: {
  people: PublicPerson[];
  /** "Prof. Park Sinchaisri" (homeWho), when the lab has a listed PI. */
  lead?: string;
  alumni?: number;
  email?: string;
}) {
  if (!people.length) return null;
  const faces = people.filter((p) => p.photo);
  const names = firstNames(faces);
  const team = teamWords(people);
  return (
    <Section
      id="h-people"
      title="People"
      className="hm-people-sec"
      more={{ href: "/people/", label: peopleLine(alumni) }}
    >
      <div className="hm-people-in">
        <div className="hm-people-txt">
          {(lead || team) && (
            <p className="hm-team">
              {lead && team
                ? `${lead} leads the lab with ${team}.`
                : lead
                  ? `${lead} leads the lab.`
                  : `The lab has ${team}.`}
              {alumni > 0 && " The people page also lists former members."}
            </p>
          )}
          <p className="hm-join">
            To work with the lab, see the notes for{" "}
            <Link href="/join/#students">Students & RAs</Link> and for{" "}
            <Link href="/join/#partners">Partners & data collaborators</Link>
            {email ? (
              <>
                , or email <a href={`mailto:${email}`}>{email}</a>.
              </>
            ) : (
              "."
            )}
          </p>
        </div>
        {faces.length > 0 && (
          <ul role="list" className="hm-faces">
            {faces.map((p) => (
              <li key={p.slug} className="hm-face">
                {/* Consent-gated by the loader (D-06): photo is present only with photo_consent. */}
                <Img
                  src={p.photo!}
                  alt={p.name}
                  width={160}
                  height={160}
                  sizes="72px"
                  className="hm-face-img"
                />
                <span className="hm-face-name" aria-hidden="true">
                  {names.get(p.slug)}
                </span>
                {p.draft && <DraftBadge />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
