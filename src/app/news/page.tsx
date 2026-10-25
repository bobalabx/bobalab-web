/**
 * /news/ (brief §D10, R3 §7.8) as an editorial log on the label-column grid:
 * "Upcoming talks" first (computed from event_date ≥ build date in
 * America/Los_Angeles), then every item newest first under inline year
 * headings. Each row has its full date ("Oct 20, 2026") and its type as a
 * plain word in the label column, then the title, summary and directions.
 */
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { groupByYear, newsYear, upcomingNews } from "@/lib/content/queries";
import { pageMetadata } from "@/lib/seo/metadata";
import { NewsItem } from "@/components/ui/NewsItem";
import { PageHeader } from "@/components/pages/PageHeader";
import { UpcomingTalks } from "@/components/news/UpcomingTalks";
import { FeedLink, withFeedAlternate } from "@/components/news/FeedLink";
import "@/components/news/news.css";

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

const yearAnchor = (year: number | null) => `year-${year ?? "undated"}`;

export default function NewsPage() {
  const c = getContent();
  const upcoming = upcomingNews(c);
  const years = groupByYear(c.news, newsYear);
  const total = c.news.length;

  return (
    <div className="bl-container pg nw-page">
      <PageHeader title="News" lead="New papers, talks and awards from the lab." />

      <div className="pg-fset nw-tools">
        {years.length > 1 ? (
          <>
            <span className="pg-fset__label" aria-hidden="true">
              Year
            </span>
            <nav className="nw-years" aria-label="News by year">
              <ul>
                {years.map((g) => (
                  <li key={g.year ?? "undated"}>
                    <a href={`#${yearAnchor(g.year)}`}>{g.year ?? "Undated"}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        ) : null}
        <span className="pg-fset__label" aria-hidden="true">
          Follow
        </span>
        <p>
          <FeedLink siteName={c.site.name} />
        </p>
      </div>

      <UpcomingTalks items={upcoming} />

      {total === 0 ? <p className="nw-empty pg-track">There is no news yet.</p> : null}

      {years.length ? (
        <div className="nw-log">
          {years.map((g) => {
            const id = yearAnchor(g.year);
            return (
              <section key={id} className="nw-year" aria-labelledby={id}>
                <div className="nw-year__head">
                  <h2 id={id} className="t-year">
                    {g.year ?? "Undated"}
                  </h2>
                </div>
                <ol className="nw-list">
                  {g.items.map((n) => (
                    <li key={n.slug}>
                      <NewsItem item={n} as="h3" />
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
