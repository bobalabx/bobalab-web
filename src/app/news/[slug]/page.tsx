/**
 * /news/{yyyy-mm-dd-slug}/ (brief §D10): date, type, title, summary, event
 * details, image, body, external link, related papers/people/directions,
 * previous/next, NewsArticle JSON-LD (§G3). Label-column grid: the date and
 * type sit in the label column beside the headline; "Related" is a row.
 *
 * Static export: generateStaticParams via staticParams() (never an empty
 * array; "_none" is the placeholder) with dynamicParams = false, and
 * notFound() whenever newsDetail() returns undefined.
 * The body is the shared view (src/components/views/NewsArticleView.tsx), which the
 * editor live preview renders too.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/content/load";
import { newsDetail, staticParams, staticSlugs } from "@/lib/content/queries";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { NewsArticleView } from "@/components/views/NewsArticleView";
import { withFeedAlternate } from "@/components/news/FeedLink";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return staticParams("slug", staticSlugs.news(getContent()));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getContent();
  const d = newsDetail(c, slug);
  if (!d) return { title: "Page not found", robots: { index: false, follow: true } };
  const { item } = d;
  return withFeedAlternate(
    pageMetadata({
      title: item.title,
      description: clipDescription(item.summary),
      path: `/news/${item.slug}/`,
      type: "article",
    }),
    c.site.name,
  );
}

export default async function NewsItemPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const c = getContent();
  const d = newsDetail(c, slug);
  if (!d) notFound();
  return <NewsArticleView c={c} d={d} />;
}
