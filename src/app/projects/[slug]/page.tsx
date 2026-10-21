/**
 * Project page `/projects/{slug}/` (brief §D6; WP2). Static export:
 * staticParams() + dynamicParams = false + notFound().
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/content/load";
import { projectDetail, staticParams, staticSlugs } from "@/lib/content/queries";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { researchProjectLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/ui/JsonLd";
import { Prose } from "@/components/ui/Prose";
import { Img } from "@/components/ui/Img";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { PearlTagList } from "@/components/ui/PearlTag";
import { MaterialsRow } from "@/components/ui/MaterialsRow";
import { PublicationEntry } from "@/components/ui/PublicationEntry";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { NewsItem } from "@/components/ui/NewsItem";
import { Section } from "@/components/direction/Section";
import { FindingList } from "@/components/direction/FindingList";
import { InProgressList } from "@/components/direction/InProgressList";
import { Breadcrumb } from "@/components/projects/Breadcrumb";
import { TeamList, hasTeam } from "@/components/projects/TeamList";
import {
  PROJECT_STATUS_LABELS,
  canonicalPaper,
  outputsToMaterials,
  projectBreadcrumb,
  projectFindings,
  projectYears,
} from "@/components/projects/model";
import "@/components/direction/direction.css";
import "@/components/projects/projects.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticParams("slug", staticSlugs.projects(getContent()));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const detail = projectDetail(getContent(), slug);
  if (!detail) return { title: "Not found", robots: { index: false } };
  const p = detail.project;
  return pageMetadata({
    title: p.title,
    description: clipDescription(p.summary),
    path: `/projects/${p.slug}/`,
  });
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const c = getContent();
  const detail = projectDetail(c, slug);
  if (!detail) notFound();
  const p = detail.project;
  const path = `/projects/${p.slug}/`;
  const years = projectYears(p);
  const counted = p.publicationRefs.filter((x) => x.counted);
  const wip = p.publicationRefs.filter((x) => !x.counted);
  const outputs = outputsToMaterials(p.outputs);
  const findings = projectFindings(c, p);
  const cite = canonicalPaper(p);

  return (
    <article className="pj-page" data-swatch={p.primaryDirection?.color} aria-labelledby="pj-title">
      <JsonLd data={researchProjectLd(p, path, c.site)} />
      <header className="pj-head">
        <div className="bl-container pj-head__inner">
          <Breadcrumb crumbs={projectBreadcrumb(p)} />
          <p className="t-eyebrow pj-head__eyebrow">
            {p.primaryDirection && <span className="bl-dot" aria-hidden="true" />}
            <span>Project</span>
          </p>
          <h1 id="pj-title" tabIndex={-1} className="pj-title">
            {p.title}
          </h1>
          {p.summary && <p className="t-lead pj-summary">{p.summary}</p>}
          <div className="pj-facts">
            <Badge tone={p.status === "active" ? "strong" : "neutral"}>
              {PROJECT_STATUS_LABELS[p.status]}
            </Badge>
            {years && <span className="t-mono">{years}</span>}
            <DraftBadge show={p.draft} />
          </div>
          <PearlTagList items={p.directionRefs} />
        </div>
      </header>

      <div className="bl-container dr-body">
        {p.hero?.image && p.hero.alt && (
          <figure className="pj-hero">
            <Img src={p.hero.image} alt={p.hero.alt} loading="eager" className="pj-hero__img" />
            {p.hero.caption && (
              <figcaption className="dr-figure__caption">{p.hero.caption}</figcaption>
            )}
          </figure>
        )}

        {p.body.trim() && (
          <Section id="overview" title="Overview">
            <Prose source={p.body} className="dr-prose" />
          </Section>
        )}

        {findings.length > 0 && (
          <Section id="findings" title="Key findings">
            <FindingList findings={findings} />
          </Section>
        )}

        {hasTeam(p) && (
          <Section id="team" title="Team">
            <TeamList project={p} />
          </Section>
        )}

        {(outputs.length > 0 || counted.length > 0 || wip.length > 0) && (
          <Section id="outputs" title="Outputs">
            {outputs.length > 0 && (
              <div className="pj-materials">
                <h3 className="pj-subtitle" id="pj-materials-h">
                  Materials
                </h3>
                <MaterialsRow title={p.title} items={outputs} />
              </div>
            )}
            {counted.length > 0 && (
              <div className="dr-pubs">
                <h3 className="pj-subtitle" id="pj-papers-h">
                  Papers
                </h3>
                {counted.map((x) => (
                  <PublicationEntry key={x.slug} pub={x} as="h4" showTags={false} />
                ))}
              </div>
            )}
            <InProgressList items={wip} headingId="pj-in-progress" />
          </Section>
        )}

        {p.funding.length > 0 && (
          <Section id="funding" title="Funding">
            <ul className="pj-funding" role="list">
              {p.funding.map((f) => (
                <li key={f.name}>
                  {f.url ? (
                    <a href={f.url} rel="noopener noreferrer">
                      {f.name}
                    </a>
                  ) : (
                    f.name
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {cite && (
          <Section id="cite" title="How to cite">
            <p className="bl-measure">
              To cite this project, please cite{" "}
              <Link href={`/publications/${cite.slug}/`}>{cite.title}</Link>
              {cite.venue ? (
                <>
                  {" "}
                  (<cite>{cite.venue}</cite>
                  {cite.year ? `, ${cite.year}` : ""})
                </>
              ) : cite.year ? (
                ` (${cite.year})`
              ) : null}
              . The paper page has the full citation.
            </p>
          </Section>
        )}

        {detail.news.length > 0 && (
          <Section id="news" title="In the news">
            <div className="pj-news">
              {detail.news.map((n) => (
                <NewsItem key={n.slug} item={n} as="h3" showTags={false} />
              ))}
            </div>
          </Section>
        )}

        {detail.related.length > 0 && (
          <Section id="related" title="Related projects">
            <ul className="rs-grid rs-grid--projects" role="list">
              {detail.related.map((r) => (
                <li key={r.slug}>
                  <ProjectCard project={r} as="h3" />
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </article>
  );
}
