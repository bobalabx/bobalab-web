/**
 * Home sections below the hero (DECISIONS D-14, D-15; JUDGE.md §5 "Below the
 * fold", R18, R19): "New papers" (3 ruled rows: title, authors, one meta line) beside
 * "News" (4 dated one-liners), then "People": everything the separate People
 * page showed until the owner moved it here (2026-10-29), at #people. Featured
 * findings render only when content has them (R19). Each section renders only
 * what content provides (no placeholders); its way on is one plain line at the
 * foot of the list ("All publications", no stats; People: the way to join).
 */
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { AuthorView, NewsView, PublicationView } from "@/lib/content/load";
import type { FindingView } from "@/lib/content/queries";
import type { SiteData } from "@/lib/content/schema";
import { typeWord } from "@/lib/publications/csl";
import { PearlTag } from "@/components/ui/PearlTag";
import { EvidenceLabel } from "@/components/ui/EvidenceLabel";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { DateText } from "@/components/ui/DateText";
import { PeopleDirectory } from "@/components/people/PeopleDirectory";
import type { PeopleIndexModel } from "@/components/people/model";
import { PEOPLE_ANCHOR } from "@/components/people/anchor";
import { entryMark } from "@/lib/preview/mark";
import "./home.css";

function Section({
  id,
  anchor,
  title,
  more,
  children,
  className,
}: {
  id: string;
  /** The section's own id, when other pages link to it (`/#people`). */
  anchor?: string;
  title: string;
  /** The foot line: where the full list lives. */
  more?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={anchor}
      className={["hm-sec", className].filter(Boolean).join(" ")}
      aria-labelledby={id}
    >
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
 * "People" (owner, 2026-10-29: the People page moved onto the home page): the
 * PI with affiliation and links, then Graduate students, Undergraduate RAs (lab
 * managers first) and any other group, then Alumni collapsed by year
 * (PeopleDirectory). The foot carries the way to join and, when Settings has
 * them, the links for lab members (also in the site footer). No sentence about
 * the team and no counts (owner, copy sweep). Nothing renders when no one is
 * listed.
 */
export function PeopleSection({
  people,
  site,
}: {
  people: PeopleIndexModel;
  site: Pick<SiteData, "email" | "affiliation_text" | "member_links">;
}) {
  if (!people.all.length) return null;
  const { email, member_links: memberLinks } = site;
  return (
    <Section id="h-people" anchor={PEOPLE_ANCHOR} title="People" className="hm-people-sec">
      <PeopleDirectory model={people} affiliation={site.affiliation_text} />
      <div className="hm-people-foot">
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
        {/* Internal tools for lab members (Settings → Links for lab members), e.g. the lab scheduler. */}
        {memberLinks.length > 0 ? (
          <p className="hm-members">
            For lab members:{" "}
            {memberLinks.map((l, i) => (
              <Fragment key={l.url}>
                {i > 0 ? ", " : null}
                <a href={l.url} rel="noopener noreferrer">
                  {l.label}
                </a>
              </Fragment>
            ))}
          </p>
        ) : null}
      </div>
    </Section>
  );
}
