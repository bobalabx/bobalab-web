/**
 * "Upcoming talks" on /news/ (brief §D10): items whose event_date is on or
 * after the build date in America/Los_Angeles, soonest first. Computed by the
 * loader (NewsView.upcoming) and queries.upcomingNews(); nothing is typed by hand.
 * The same ruled log as the news list: the event date in the label column,
 * then the title, the type as a plain word and the place. Renders nothing
 * when there are none.
 */
import Link from "next/link";
import type { NewsView } from "@/lib/content/load";
import { DateText } from "@/components/ui/DateText";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { NEWS_TYPE_LABELS } from "@/components/ui/labels";
import { entryMark } from "@/lib/preview/mark";
import "./news.css";

export function UpcomingTalks({ items }: { items: NewsView[] }) {
  if (!items.length) return null;
  return (
    <section className="nw-upcoming" aria-labelledby="news-upcoming">
      <div className="nw-year__head">
        <h2 id="news-upcoming">Upcoming talks</h2>
      </div>
      <ol className="nw-upcoming__list">
        {items.map((n) => (
          <li key={n.slug} className="nw-upcoming__item" {...entryMark("news", n.slug)}>
            <p className="nw-upcoming__when">
              <DateText value={n.event_date} />
            </p>
            <div>
              <h3 className="nw-upcoming__title">
                <Link href={`/news/${n.slug}/`}>{n.title}</Link>
              </h3>
              <p className="nw-upcoming__meta">
                <Badge>{NEWS_TYPE_LABELS[n.type]}</Badge>
                {n.location ? <span>{n.location}</span> : null}
                <DraftBadge show={n.draft} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
