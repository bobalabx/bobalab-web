/**
 * /news/{yyyy-mm-dd-slug}/ (brief §D10): date, type, title, summary, event
 * details, image, body, external link, related papers/people/directions,
 * previous/next, NewsArticle JSON-LD (§G3). Label-column grid: the date and
 * type sit in the label column beside the headline; "Related" is a row.
 *
 * Static export: generateStaticParams via staticParams() (never an empty
 * array; "_none" is the placeholder) with dynamicParams = false, and
 * notFound() whenever newsDetail() returns undefined.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/content/load";
import { newsDetail, newsYear, staticParams, staticSlugs } from "@/lib/content/queries";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { absoluteUrl, newsArticleLd } from "@/lib/seo/jsonld";
import { isExternalUrl, withBasePath } from "@/lib/site/paths";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { DateText } from "@/components/ui/DateText";
import { Img } from "@/components/ui/Img";
import { JsonLd } from "@/components/ui/JsonLd";
import { Prose } from "@/components/ui/Prose";
import { NEWS_TYPE_LABELS } from "@/components/ui/labels";
import { PageHeader } from "@/components/pages/PageHeader";
import { NewsRelated, hasRelated } from "@/components/news/NewsRelated";
import { NewsPager } from "@/components/news/NewsPager";
import { withFeedAlternate } from "@/components/news/FeedLink";
import "@/components/news/news.css";

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
  const { item, previous, next } = d;
  const path = `/news/${item.slug}/`;
  const year = newsYear(item);
  const link = item.link;
  const linkExternal = link ? isExternalUrl(link.url) : false;
  const related = hasRelated(item);
  const hasDetail = Boolean(
    item.event_date || item.location || item.image?.image || item.body.trim() || link,
  );
  // NewsArticle (brief §G3). The shared builder only references the lab by
  // @id, which is defined on Home/About, not on this page; name the lab here
  // so the node stands on its own (author and publisher are the lab).
  const lab = {
    "@type": "ResearchOrganization" as const,
    "@id": absoluteUrl("/#organization", c.site.site_url),
    name: c.site.name,
    url: absoluteUrl("/", c.site.site_url),
  };
  const articleLd = {
    ...newsArticleLd(item, path, c.site),
    mainEntityOfPage: absoluteUrl(path, c.site.site_url),
    inLanguage: "en",
    author: lab,
    publisher: lab,
    ...(item.image?.image ? { image: absoluteUrl(item.image.image, c.site.site_url) } : {}),
  };

  return (
    <div className="bl-container pg nw-item">
      <JsonLd data={articleLd} />
      <nav className="nw-crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/news/">News</Link>
          </li>
          <li>
            <Link href={`/news/#year-${year}`}>{year}</Link>
          </li>
        </ol>
      </nav>
      <article aria-labelledby="news-title" className="nw-article">
        <PageHeader
          titleId="news-title"
          title={item.title}
          lead={item.summary}
          wide
          metaFirst
          meta={
            <>
              <DateText value={item.date} className="nw-detail__date" />
              <Badge>{NEWS_TYPE_LABELS[item.type]}</Badge>
              {item.upcoming ? <Badge tone="strong">Upcoming</Badge> : null}
              <DraftBadge show={item.draft} />
            </>
          }
        />
        {hasDetail ? (
          <div className="nw-detail pg-track">
            {item.event_date || item.location ? (
              <dl className="nw-event">
                {item.event_date ? (
                  <div>
                    <dt>Event date</dt>
                    <dd>
                      <DateText value={item.event_date} />
                    </dd>
                  </div>
                ) : null}
                {item.location ? (
                  <div>
                    <dt>Where</dt>
                    <dd>{item.location}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
            {item.image?.image ? (
              <figure className="nw-figure">
                <Img src={item.image.image} alt={item.image.alt ?? ""} loading="eager" />
                {item.image.caption ? <figcaption>{item.image.caption}</figcaption> : null}
              </figure>
            ) : null}
            {item.body.trim() ? <Prose source={item.body} /> : null}
            {link ? (
              <p className="nw-detail__actions">
                <a
                  className="bl-cta bl-cta--quiet"
                  href={linkExternal ? link.url : withBasePath(link.url)}
                  rel={linkExternal ? "noopener noreferrer" : undefined}
                >
                  {link.label}
                </a>
              </p>
            ) : null}
          </div>
        ) : null}
        {related ? (
          <aside className="pg-row nw-article__aside" aria-labelledby="news-related">
            <div className="pg-row__label">
              <h2 id="news-related">Related</h2>
            </div>
            <div>
              <NewsRelated item={item} />
            </div>
          </aside>
        ) : null}
      </article>

      <NewsPager previous={previous} next={next} />
    </div>
  );
}
