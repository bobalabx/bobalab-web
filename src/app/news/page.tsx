/**
 * /news/ (brief §D10, R3 §7.8) as an editorial log on the label-column grid:
 * "Upcoming talks" first (computed from event_date ≥ build date in
 * America/Los_Angeles), then every item newest first under inline year
 * headings. Each row has its full date ("Oct 20, 2026") and its type as a
 * plain word in the label column, then the title, summary and directions.
 * The body is the shared view (src/components/views/NewsListView.tsx), which the
 * editor live preview renders too.
 */
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { pageMetadata } from "@/lib/seo/metadata";
import { NewsListView } from "@/components/views/NewsListView";
import { withFeedAlternate } from "@/components/news/FeedLink";

export function generateMetadata(): Metadata {
  const { site } = getContent();
  return withFeedAlternate(
    pageMetadata({
      title: "News",
      description: `New papers, talks and awards from ${site.name}.`,
      path: "/news/",
    }),
    site.name,
  );
}

export default function NewsPage() {
  return <NewsListView c={getContent()} />;
}
