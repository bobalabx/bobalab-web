/**
 * The news article page body (/news/{slug}/), shared by the static route and the
 * editor live preview (src/app/editor-preview). Synchronous and pure: everything
 * comes from Content and the item's NewsDetail (queries.newsDetail).
 */
import Link from "next/link";
import type { Content } from "@/lib/content/build";
import { newsYear, type NewsDetail } from "@/lib/content/queries";
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
import "@/components/news/news.css";

export function NewsArticleView({ c, d }: { c: Content; d: NewsDetail }) {
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
