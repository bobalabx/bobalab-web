/**
 * Previous / next on a news item (brief §D10), two plain entries under a 1 px
 * ink rule. `previous` is the next older item, `next` the next newer one
 * (queries.newsDetail). Each link names its direction, the item title and its
 * full date.
 */
import Link from "next/link";
import type { NewsView } from "@/lib/content/load";
import { DateText } from "@/components/ui/DateText";
import { entryMark } from "@/lib/preview/mark";
import "./news.css";

function PagerLink({ item, dir }: { item: NewsView; dir: "Older" | "Newer" }) {
  return (
    <Link href={`/news/${item.slug}/`}>
      <span className="nw-pager__dir">{dir === "Older" ? "Older news" : "Newer news"}</span>
      <span className="nw-pager__title">{item.title}</span>
      <span className="nw-pager__date">
        <DateText value={item.date} />
      </span>
    </Link>
  );
}

export function NewsPager({
  previous,
  next,
}: {
  previous: NewsView | null;
  next: NewsView | null;
}) {
  if (!previous && !next) return null;
  return (
    <nav className="nw-pager" aria-label="More news">
      <ul>
        {previous ? (
          <li className="nw-pager__prev" {...entryMark("news", previous.slug)}>
            <PagerLink item={previous} dir="Older" />
          </li>
        ) : null}
        {next ? (
          <li className="nw-pager__next" {...entryMark("news", next.slug)}>
            <PagerLink item={next} dir="Newer" />
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
