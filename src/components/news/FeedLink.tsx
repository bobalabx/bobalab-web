/**
 * Link to the RSS feed, plus the <link rel="alternate"> metadata for news pages.
 * The feed is a static file, so the plain <a> carries the base path itself.
 * Plain underlined text (no icon, D-13 item 5).
 */
import type { Metadata } from "next";
import { withBasePath } from "@/lib/site/paths";
import { FEED_PATH } from "./rss";
import "./news.css";

export function FeedLink({ siteName }: { siteName: string }) {
  return (
    <a className="nw-feed" href={withBasePath(FEED_PATH)} type="application/rss+xml">
      RSS feed<span className="vh"> of {siteName} news</span>
    </a>
  );
}

/**
 * Adds the feed as an alternate to page metadata. The path is relative so it
 * resolves against metadataBase, which already includes the base path.
 */
export function withFeedAlternate(meta: Metadata, siteName: string): Metadata {
  return {
    ...meta,
    alternates: {
      ...meta.alternates,
      types: {
        "application/rss+xml": [{ url: FEED_PATH.replace(/^\/+/, ""), title: `${siteName} news` }],
      },
    },
  };
}
