/**
 * "Related" panel on a news item (brief §D10): linked papers, people and
 * research directions, each group shown only when content links something.
 * People appear only if listed (the loader drops unlisted people); they link
 * to a profile page only when one exists.
 */
import Link from "next/link";
import type { NewsView } from "@/lib/content/load";
import { PearlTagList } from "@/components/ui/PearlTag";
import { statusLine } from "@/components/ui/PublicationEntry";
import { ROLE_LABELS } from "@/lib/content/people";
import "@/components/pages/pages.css";
import "./news.css";

export function hasRelated(n: NewsView): boolean {
  return Boolean(n.publicationRefs.length || n.peopleRefs.length || n.directionRefs.length);
}

export function NewsRelated({ item }: { item: NewsView }) {
  if (!hasRelated(item)) return null;
  return (
    <div className="pg-panel nw-related">
      <h2 id="news-related" className="pg-panel__title">
        Related
      </h2>
      {item.publicationRefs.length ? (
        <div className="nw-related__group">
          <h3>{item.publicationRefs.length === 1 ? "Paper" : "Papers"}</h3>
          <ul className="nw-related__list">
            {item.publicationRefs.map((p) => {
              const venue = [p.venue, p.year].filter(Boolean).join(", ");
              const status = statusLine(p, p.type);
              return (
                <li key={p.slug}>
                  <Link href={`/publications/${p.slug}/`}>{p.title}</Link>
                  {venue || status ? (
                    <span className="nw-related__sub">
                      {venue ? <cite>{venue}</cite> : null}
                      {venue && status ? " · " : null}
                      {status}
                    </span>
                  ) : null}
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
            {item.peopleRefs.map((p) => (
              <li key={p.slug}>
                {p.hasProfile ? <Link href={`/people/${p.slug}/`}>{p.name}</Link> : p.name}
                <span className="nw-related__sub">
                  {p.isAlumni ? "Alumni" : p.title || ROLE_LABELS[p.role].one}
                </span>
              </li>
            ))}
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
