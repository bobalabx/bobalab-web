/**
 * Home sections below the hero (DECISIONS D-14, D-15; JUDGE.md §5 "Below the
 * fold", R18, R19): "New papers" (3 ruled rows: title, authors, one meta line) beside
 * "News" (4 dated one-liners), then "People" (the way to join and the consented
 * photos cropped round with first names; no team sentence and no counts, copy
 * sweep). Featured findings render only when content has them (R19). Each section
 * renders only what content provides (no placeholders); its way on is one plain
 * link at the foot of the list ("All publications", no stats).
 */
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { AuthorView, NewsView, PublicationView } from "@/lib/content/load";
import type { FindingView } from "@/lib/content/queries";
import type { PublicPerson } from "@/lib/content/people";
import { typeWord } from "@/lib/publications/csl";
import { PearlTag } from "@/components/ui/PearlTag";
import { EvidenceLabel } from "@/components/ui/EvidenceLabel";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { DateText } from "@/components/ui/DateText";
import { Img } from "@/components/ui/Img";
import { entryMark } from "@/lib/preview/mark";
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
  /** The foot line: where the full list lives. */
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

/** The foot links: plain words, no stats (copy sweep). */
export const PUBLICATIONS_LINK = "All publications";
export const NEWS_LINK = "All news";
export const PEOPLE_LINK = "Meet the lab";

/**
 * The paper's one meta line: "Journal article, Management Science, 2026". When
 * the venue already says what the paper is ("arXiv preprint", "SSRN working
 * paper 7151739") it stands for the type, and an SSRN number is left out:
 * "arXiv preprint, 2026", "SSRN working paper, 2026".
 */
export function paperMeta(p: Pick<PublicationView, "type" | "venue" | "year">): string {
  const venue = p.venue?.replace(/^(SSRN working paper)\s+\d+$/i, "$1");
  const type = typeWord(p);
  const typeInVenue = venue && /preprint|working paper|thesis|dissertation/i.test(venue);
  return [typeInVenue ? null : type, venue, p.year].filter(Boolean).join(", ");
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
export function PapersSection({ items }: { items: PublicationView[] }) {
  if (!items.length) return null;
  return (
    <Section
      id="h-pubs"
      title="New papers"
      className="hm-papers-sec"
      more={{ href: "/publications/", label: PUBLICATIONS_LINK }}
    >
      <ol role="list" className="hm-papers">
        {items.map((p) => (
          <li key={p.slug} {...entryMark("publications", p.slug)}>
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
export function NewsSection({ items }: { items: NewsView[] }) {
  if (!items.length) return null;
  return (
    <Section
      id="h-news"
      title="News"
      className="hm-news-sec"
      more={{ href: "/news/", label: NEWS_LINK }}
    >
      <ol role="list" className="hm-log">
        {items.map((n) => (
          <li key={n.slug} {...entryMark("news", n.slug)}>
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
 * "People" (R18; D-15): the way to join, then the people with a consented photo,
 * cropped round, with their first names (alt = full name). Nobody without a photo
 * is drawn (no initials discs). No sentence about the team or former members
 * (owner, copy sweep): the photos and "Meet the lab" carry that.
 */
export function PeopleSection({ people, email }: { people: PublicPerson[]; email?: string }) {
  if (!people.length) return null;
  const faces = people.filter((p) => p.photo);
  const names = firstNames(faces);
  return (
    <Section
      id="h-people"
      title="People"
      className="hm-people-sec"
      more={{ href: "/people/", label: PEOPLE_LINK }}
    >
      <div className="hm-people-in">
        <div className="hm-people-txt">
          <p className="hm-join">
            Want to join or work with us? See <Link href="/join/">Join the lab</Link>
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
              <li key={p.slug} className="hm-face" {...entryMark("people", p.slug)}>
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
