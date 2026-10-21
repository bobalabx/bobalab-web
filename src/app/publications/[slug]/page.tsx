/**
 * /publications/{slug}/ (brief §D8).
 *
 * Title, authors (lab members highlighted), venue line, the lab's own status
 * claim with "as of", tags, materials, "In brief" (only when content has it),
 * awards (with the title they were given under), presentations, citations
 * (APA + copyable BibTeX from citation-js), related projects / papers / news.
 * Google Scholar citation_* meta and ScholarlyArticle JSON-LD for papers that
 * count under D-05.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { publicationDetail, staticParams, staticSlugs } from "@/lib/content/queries";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { paperJsonLd } from "@/lib/publications/jsonld";
import {
  paperFallbackDescription,
  paperScholarMeta,
  wantsScholarMeta,
} from "@/lib/publications/seo";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/icons";
import { Img } from "@/components/ui/Img";
import { JsonLd } from "@/components/ui/JsonLd";
import { MaterialsRow, materialsFromPublication } from "@/components/ui/MaterialsRow";
import { NewsItem } from "@/components/ui/NewsItem";
import { PearlTagList } from "@/components/ui/PearlTag";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { Prose } from "@/components/ui/Prose";
import { PublicationEntry } from "@/components/ui/PublicationEntry";
import { PUBLICATION_TYPE_LABELS } from "@/components/ui/labels";
import { AuthorList, StatusNote, VenueLineText } from "@/components/publications/PaperParts";
import { CitationBlock } from "@/components/publications/CitationBlock";
import "@/components/publications/publications.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticParams("slug", staticSlugs.publications(getContent()));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = publicationDetail(getContent(), slug);
  if (!d) return { title: "Not found", robots: { index: false, follow: false } };
  const p = d.publication;
  return pageMetadata({
    title: p.title,
    description: clipDescription(p.in_brief) ?? clipDescription(paperFallbackDescription(p)),
    path: `/publications/${p.slug}/`,
    type: "article",
    other: wantsScholarMeta(p) ? paperScholarMeta(p) : undefined,
  });
}

export default async function PublicationPage({ params }: Props) {
  const { slug } = await params;
  const c = getContent();
  const d = publicationDetail(c, slug);
  if (!d) notFound();
  const p = d.publication;

  const materials = materialsFromPublication(p);
  const hasVenue = Boolean(p.venue || p.year);
  const teaser = p.teaser?.image && p.teaser.alt ? p.teaser : undefined;
  const hasMain = Boolean(
    teaser || p.in_brief || p.awards.length || p.presentations.length || p.body.trim(),
  );

  const details = (
    <>
      {materials.length > 0 && (
        <div className="pub-fact">
          <h2 className="pub-fact__h">Materials</h2>
          <MaterialsRow title={p.title} items={materials} />
        </div>
      )}
      {p.doi && (
        <div className="pub-fact">
          <h2 className="pub-fact__h">DOI</h2>
          <p className="pub-doi">
            <a href={`https://doi.org/${p.doi}`} rel="noopener noreferrer">
              {p.doi}
            </a>
          </p>
        </div>
      )}
      {p.directionRefs.length > 0 && (
        <div className="pub-fact">
          <h2 className="pub-fact__h">Research directions</h2>
          <PearlTagList items={p.directionRefs} />
        </div>
      )}
    </>
  );
  const hasDetails = materials.length > 0 || Boolean(p.doi) || p.directionRefs.length > 0;

  return (
    <article className="bl-container pub" aria-labelledby="pub-title">
      {p.counted && <JsonLd data={paperJsonLd(p, c.site)} />}

      <header className="pub-head">
        <div className="pub-eyebrow">
          <Link href="/publications/" className="pub-eyebrow__link">
            Publications
          </Link>
          <span aria-hidden="true" className="pub-eyebrow__sep">
            /
          </span>
          <span>{PUBLICATION_TYPE_LABELS[p.type]}</span>
          {/* D-05: not in the main list. The type already says so for work in progress. */}
          {!p.counted && p.type !== "work-in-progress" && <Badge tone="accent">In progress</Badge>}
          <DraftBadge show={p.draft} />
        </div>
        <h1 id="pub-title" tabIndex={-1} className="pub-title">
          {p.title}
        </h1>
        <p className="pub-authors">
          <AuthorList authors={p.authorList} />
        </p>
        {hasVenue && (
          <p className="pub-venue">
            <VenueLineText pub={p} />
          </p>
        )}
        <StatusNote pub={p} />
      </header>

      <div className={hasDetails ? "pub-layout pub-layout--split" : "pub-layout"}>
        {hasDetails && (
          <aside className="pub-facts" aria-label="Paper details">
            {details}
          </aside>
        )}
        <div className="pub-content">
          {hasMain && (
            <div className="pub-main">
              {teaser && (
                <figure className="pub-teaser">
                  <Img src={teaser.image!} alt={teaser.alt!} className="pub-teaser__img" />
                  {teaser.caption && (
                    <figcaption className="t-sm t-muted">{teaser.caption}</figcaption>
                  )}
                </figure>
              )}
              {p.in_brief && (
                <section className="pub-section" aria-labelledby="brief-h">
                  <h2 id="brief-h" className="pub-section__h">
                    In brief
                  </h2>
                  <p className="pub-brief">{p.in_brief}</p>
                </section>
              )}
              {p.awards.length > 0 && (
                <section className="pub-section" aria-labelledby="awards-h">
                  <h2 id="awards-h" className="pub-section__h">
                    Awards
                  </h2>
                  <ul className="pub-awards" role="list">
                    {[...p.awards]
                      .sort((a, b) => b.year - a.year)
                      .map((a) => (
                        <li key={`${a.name}-${a.year}`} className="pub-award">
                          <span className="pub-award__year">{a.year}</span>
                          <span className="pub-award__body">
                            <span className="pub-award__name">{a.name}</span>
                            {a.under_title && (
                              <span className="pub-award__under">
                                Awarded under the earlier title &ldquo;{a.under_title}&rdquo;
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                  </ul>
                </section>
              )}
              {p.presentations.length > 0 && (
                <section className="pub-section" aria-labelledby="talks-h">
                  <h2 id="talks-h" className="pub-section__h">
                    Presentations
                  </h2>
                  <ul className="pub-talks" role="list">
                    {p.presentations.map((t, i) => (
                      <li key={`${t.event}-${i}`}>
                        {t.url ? (
                          <a href={t.url} rel="noopener noreferrer">
                            {t.event}
                          </a>
                        ) : (
                          t.event
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {p.body.trim() && (
                <section className="pub-section" aria-labelledby="notes-h">
                  <h2 id="notes-h" className="pub-section__h">
                    Notes
                  </h2>
                  <Prose source={p.body} />
                </section>
              )}
            </div>
          )}

          {p.publicVersion && <CitationBlock pub={p} />}

          {d.projects.length > 0 && (
            <section className="pub-section pub-related" aria-labelledby="projects-h">
              <h2 id="projects-h" className="pub-section__h">
                {d.projects.length === 1 ? "Project" : "Projects"}
              </h2>
              <ul className="pub-cards" role="list">
                {d.projects.map((pr) => (
                  <li key={pr.slug}>
                    <ProjectCard project={pr} as="h3" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {d.related.length > 0 && (
            <section className="pub-section pub-related" aria-labelledby="related-h">
              <h2 id="related-h" className="pub-section__h">
                Related papers
              </h2>
              <ul className="pubs-list" role="list">
                {d.related.map((r) => (
                  <li key={r.slug}>
                    <PublicationEntry pub={r} as="h3" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {d.news.length > 0 && (
            <section className="pub-section pub-related" aria-labelledby="news-h">
              <h2 id="news-h" className="pub-section__h">
                In the news
              </h2>
              <ul className="pubs-list" role="list">
                {d.news.map((n) => (
                  <li key={n.slug}>
                    <NewsItem item={n} as="h3" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <p className="pub-back">
        <Link href="/publications/" className="bl-cta bl-cta--quiet">
          All publications
          <Icon name="arrow-right" />
        </Link>
      </p>
    </article>
  );
}
