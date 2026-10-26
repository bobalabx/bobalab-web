/**
 * "Related" row on a news item (brief §D10): linked papers, people and
 * research directions in the track, each group shown only when content links
 * something. People appear only if listed (the loader drops unlisted people);
 * they link to a profile page only when one exists. The caller renders the
 * row's label (h2#news-related).
 */
import Link from "next/link";
import type { NewsView, PublicationView } from "@/lib/content/load";
import { PearlTagList } from "@/components/ui/PearlTag";
import { statusLine } from "@/components/ui/PublicationEntry";
import { typeWord } from "@/lib/publications/csl";
import { ROLE_LABELS } from "@/lib/content/people";
import "./news.css";

export function hasRelated(n: NewsView): boolean {
  return Boolean(n.publicationRefs.length || n.peopleRefs.length || n.directionRefs.length);
}

/**
 * "Management Science, 2026"; the year is left out when the venue already names
 * it. Without a venue, the type stands in ("Working paper, 2026"), so a bare
 * year never looks like a missing field.
 */
export function venueLine(p: {
  venue?: string | null;
  year?: number | null;
  type?: PublicationView["type"];
}): string {
  const venue = p.venue?.trim() ?? "";
  if (!p.year) return venue;
  if (!venue && p.type) return `${typeWord({ type: p.type })}, ${p.year}`;
  if (venue.includes(String(p.year))) return venue;
  return [venue, p.year].filter(Boolean).join(", ");
}

export function NewsRelated({ item }: { item: NewsView }) {
  if (!hasRelated(item)) return null;
  return (
    <div className="nw-related">
      {item.publicationRefs.length ? (
        <div className="nw-related__group nw-related__group--papers">
          <h3>{item.publicationRefs.length === 1 ? "Paper" : "Papers"}</h3>
          <ul className="nw-related__list">
            {item.publicationRefs.map((p) => {
              const venue = venueLine(p);
              const status = statusLine(p, p.type);
              return (
                <li key={p.slug}>
                  <Link href={`/publications/${p.slug}/`}>{p.title}</Link>
                  {venue ? (
                    <span className="nw-related__sub">
                      <cite>{venue}</cite>
                    </span>
                  ) : null}
                  {status ? <span className="nw-related__sub">{status}</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {item.peopleRefs.length ? (
        <div className="nw-related__group">
          <h3>People</h3>
          <ul className="nw-related__list">
            {item.peopleRefs.map((p) => {
              // Undergraduates: title or major only, or nothing (PI, 2026-10-26).
              const sub = p.isAlumni
                ? "Former lab member"
                : p.title || (p.role === "undergrad" ? p.program : ROLE_LABELS[p.role].one);
              return (
                <li key={p.slug}>
                  {p.hasProfile ? (
                    <Link href={`/people/${p.slug}/`}>{p.name}</Link>
                  ) : (
                    <span className="nw-related__name">{p.name}</span>
                  )}
                  {sub && <span className="nw-related__sub">{sub}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {item.directionRefs.length ? (
        <div className="nw-related__group">
          <h3>{item.directionRefs.length === 1 ? "Research direction" : "Research directions"}</h3>
          <PearlTagList items={item.directionRefs} label="Research directions" />
        </div>
      ) : null}
    </div>
  );
}
