/**
 * /publications/{slug}/ (brief §D8; redesign D-13, prototype
 * docs/redesign/prototypes/p3/paper.html).
 *
 * Head: crumb, condensed title, authors (lab members linked to their pages,
 * external coauthors to their web page), venue line, materials and the DOI;
 * beside it a facts list (type, review status with "as of" and its source,
 * directions with the paper's place on each line, awards). Then the lab's "In
 * brief", the study-design plate (registry keyed by slug; only when
 * `plate_verified` or in preview), awards, presentations and notes as ruled
 * ledgers in the label-column grid, the citation (APA + copyable BibTeX from
 * citation-js), and related projects / papers / news.
 * Google Scholar citation_* meta and ScholarlyArticle JSON-LD for papers that
 * count under D-05.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { publicationDetail, staticParams, staticSlugs } from "@/lib/content/queries";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { typeWord } from "@/lib/publications/csl";
import { yearAnchor } from "@/lib/publications/filters";
import { paperJsonLd } from "@/lib/publications/jsonld";
import {
  SELF_REPORTED_WORDING,
  isSelfReportedAward,
  isSelfReportedTalk,
} from "@/lib/publications/provenance";
import {
  paperFallbackDescription,
  paperScholarMeta,
  wantsScholarMeta,
} from "@/lib/publications/seo";
import { DraftBadge } from "@/components/ui/Badge";
import { Img } from "@/components/ui/Img";
import { JsonLd } from "@/components/ui/JsonLd";
import { MaterialsRow, materialsFromPublication } from "@/components/ui/MaterialsRow";
import { NewsItem } from "@/components/ui/NewsItem";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { Prose } from "@/components/ui/Prose";
import {
  AuthorList,
  StatusDetail,
  VenueLineText,
  reviewStatus,
} from "@/components/publications/PaperParts";
import { CitationBlock } from "@/components/publications/CitationBlock";
import { DirectionLine } from "@/components/publications/DirectionLine";
import { PublicationRow } from "@/components/publications/PublicationRow";
import { StudyPlate } from "@/components/plates";
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

/** "7 awards, 2021 to 2023". */
function awardSpan(years: number[]): string {
  const lo = Math.min(...years);
  const hi = Math.max(...years);
  const n = years.length;
  return `${n} ${n === 1 ? "award" : "awards"}, ${lo === hi ? lo : `${lo} to ${hi}`}`;
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
  const live = new Set(c.directions.map((x) => x.slug));
  // Each live direction's counted papers, oldest first (the paper's place on its line).
  const lineOf = (dir: string) =>
    c.countedPublications
      .filter((x) => x.directions.includes(dir))
      .map((x) => x.slug)
      .reverse();
  const awards = [...p.awards].sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));
  const selfAwards = awards.some(isSelfReportedAward);
  const talksSelf = p.presentations.filter(isSelfReportedTalk).length;
  const talksMixed = talksSelf > 0 && talksSelf < p.presentations.length;
  const typeLabel = typeWord(p);
  // D-05: not in the main list. The type already says so for work in progress.
  const notCounted = !p.counted && p.type !== "work-in-progress";

  return (
    <article className="bl-container pub" aria-labelledby="pub-title">
      {p.counted && <JsonLd data={paperJsonLd(p, c.site)} />}

      <header className="pub-head">
        <div className="pub-head__main">
          <p className="pub-crumb">
            <Link href="/publications/">Publications</Link>
            {p.counted && p.year ? (
              <>
                , <Link href={`/publications/#${yearAnchor(p.year)}`}>{p.year}</Link>
              </>
            ) : null}
            <DraftBadge show={p.draft} />
          </p>
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
          {(materials.length > 0 || p.doi) && (
            <div className="pub-links">
              <MaterialsRow title={p.title} items={materials} />
              {p.doi && (
                <span className="pub-doi doi">
                  <span className="vh">DOI </span>
                  {p.doi}
                </span>
              )}
            </div>
          )}
        </div>

        <dl className="pub-side" aria-label="Paper details">
          <div className="pub-side__row">
            <dt>Type</dt>
            <dd className="pub-type">
              {typeLabel}
              {notCounted && (
                <span className="pub-type__wip">In progress: no public version yet.</span>
              )}
            </dd>
          </div>
          {reviewStatus(p) && (
            <div className="pub-side__row">
              <dt>Status</dt>
              <dd className="pub-status">
                <StatusDetail pub={p} />
              </dd>
            </div>
          )}
          {p.directionRefs.length > 0 && (
            <div className="pub-side__row">
              <dt>{p.directionRefs.length === 1 ? "Direction" : "Directions"}</dt>
              {p.directionRefs.map((dir) => (
                <dd key={dir.slug} className="pub-dir" data-swatch={dir.color}>
                  <Link href={`/research/${dir.slug}/`}>{dir.short_label}</Link>
                  {p.counted && live.has(dir.slug) && (
                    <DirectionLine
                      label={dir.short_label}
                      swatch={dir.color}
                      slugs={lineOf(dir.slug)}
                      current={p.slug}
                    />
                  )}
                </dd>
              ))}
            </div>
          )}
          {awards.length > 0 && (
            <div className="pub-side__row">
              <dt>Awards</dt>
              <dd>
                <a href="#awards-h">{awardSpan(awards.map((a) => a.year))}</a>
              </dd>
            </div>
          )}
        </dl>
      </header>

      {p.in_brief && (
        <section className="pub-brief-sec" aria-labelledby="brief-h">
          <h2 id="brief-h" className="vh">
            In brief
          </h2>
          <p className="pub-brief">{p.in_brief}</p>
        </section>
      )}

      {teaser && (
        <figure className="pub-teaser">
          <Img src={teaser.image!} alt={teaser.alt!} className="pub-teaser__img" />
          {teaser.caption && <figcaption className="pub-teaser__cap">{teaser.caption}</figcaption>}
        </figure>
      )}

      <StudyPlate pub={p} preview={c.preview} />

      {awards.length > 0 && (
        <section className="pub-sec" aria-labelledby="awards-h">
          <h2 id="awards-h" className="pub-sec__h">
            Awards
          </h2>
          <div className="pub-sec__body">
            <ul className="pub-awards" role="list">
              {awards.map((a) => (
                <li key={`${a.name}-${a.year}`} className="pub-award">
                  <span className="pub-award__year">{a.year}</span>
                  <span className="pub-award__body">
                    <span className="pub-award__head">
                      <span className="pub-award__name">{a.name}</span>
                      {isSelfReportedAward(a) && (
                        <span className="pub-award__src">
                          <span aria-hidden="true">&dagger;</span>
                          <span className="vh">, {SELF_REPORTED_WORDING}</span>
                        </span>
                      )}
                    </span>
                    {a.under_title && (
                      <span className="pub-award__under">
                        Under its earlier title &ldquo;{a.under_title}&rdquo;
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {selfAwards && (
              <p className="pub-fn" aria-hidden="true">
                &dagger; Reported by the lab.
              </p>
            )}
          </div>
        </section>
      )}

      {p.presentations.length > 0 && (
        <section className="pub-sec" aria-labelledby="talks-h">
          <h2 id="talks-h" className="pub-sec__h">
            Presentations
          </h2>
          <div className="pub-sec__body">
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
                  {talksMixed && isSelfReportedTalk(t) && (
                    <span className="pub-award__src">
                      <span aria-hidden="true">&dagger;</span>
                      <span className="vh">, {SELF_REPORTED_WORDING}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {/* All of them: one plain line. Some: the awards' dagger convention. */}
            {talksSelf > 0 &&
              (talksMixed ? (
                <p className="pub-fn pub-talks__src" aria-hidden="true">
                  &dagger; Reported by the lab.
                </p>
              ) : (
                <p className="pub-fn pub-talks__src">Reported by the lab.</p>
              ))}
          </div>
        </section>
      )}

      {p.body.trim() && (
        <section className="pub-sec" aria-labelledby="notes-h">
          <h2 id="notes-h" className="pub-sec__h">
            Notes
          </h2>
          <div className="pub-sec__body pub-notes">
            <Prose source={p.body} />
          </div>
        </section>
      )}

      {p.publicVersion && <CitationBlock pub={p} />}

      {d.projects.length > 0 && (
        <section className="pub-sec" aria-labelledby="projects-h">
          <h2 id="projects-h" className="pub-sec__h">
            {d.projects.length === 1 ? "Project" : "Projects"}
          </h2>
          <ul className="pub-sec__body pub-ledger" role="list">
            {d.projects.map((pr) => (
              <li key={pr.slug}>
                <ProjectCard project={pr} as="h3" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.related.length > 0 && (
        <section className="pub-sec" aria-labelledby="related-h">
          <h2 id="related-h" className="pub-sec__h">
            Related papers
          </h2>
          <ul className="pub-sec__body pub-ledger pubs-list" role="list">
            {d.related.map((r) => (
              <li key={r.slug}>
                <PublicationRow pub={r} as="h3" showYear showBrief={false} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.news.length > 0 && (
        <section className="pub-sec" aria-labelledby="news-h">
          <h2 id="news-h" className="pub-sec__h">
            In the news
          </h2>
          <ul className="pub-sec__body pub-ledger" role="list">
            {d.news.map((n) => (
              <li key={n.slug}>
                <NewsItem item={n} as="h3" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
