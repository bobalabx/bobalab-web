/**
 * /news/feed.xml: RSS 2.0, prerendered at build time (static export requires
 * `force-static` on route handlers; only GET is supported). Content and XML
 * live in src/components/news/rss.ts (unit-tested in tests/unit/feed).
 */
import { getContent } from "@/lib/content/load";
import { buildRssFeed } from "@/components/news/rss";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(buildRssFeed(getContent()), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
