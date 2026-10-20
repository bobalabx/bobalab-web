/** A news item in a list (brief §D10): full date, type badge, title, summary, tags. */
import Link from "next/link";
import type { NewsView } from "@/lib/content/load";
import { DateText } from "./DateText";
import { Badge, DraftBadge } from "./Badge";
import { PearlTagList } from "./PearlTag";
import { NEWS_TYPE_LABELS } from "./labels";

export function NewsItem({
  item,
  as: H = "h3",
  showTags = true,
}: {
  item: NewsView;
  as?: "h2" | "h3" | "h4";
  showTags?: boolean;
}) {
  return (
    <article className="bl-news" aria-labelledby={`news-${item.slug}`}>
      <div className="bl-news__head">
        <DateText value={item.date} className="bl-news__date" />
        <Badge>{NEWS_TYPE_LABELS[item.type]}</Badge>
        {item.upcoming && (
          <Badge tone="accent" dot>
            Upcoming
          </Badge>
        )}
        <DraftBadge show={item.draft} />
      </div>
      <H className="bl-news__title" id={`news-${item.slug}`}>
        <Link href={`/news/${item.slug}/`}>{item.title}</Link>
      </H>
      {item.event_date && (
        <p className="t-sm t-muted">
          Event: <DateText value={item.event_date} />
          {item.location ? ` · ${item.location}` : ""}
        </p>
      )}
      {item.summary && <p>{item.summary}</p>}
      {showTags && <PearlTagList items={item.directionRefs} />}
    </article>
  );
}
