/**
 * A project page body (/projects/{slug}/), shared by the static route and the
 * editor live preview (src/app/editor-preview). Synchronous and pure:
 * everything comes from Content and the project's ProjectDetail
 * (queries.projectDetail). The page's structure is described in
 * src/app/projects/[slug]/page.tsx.
 */
import Link from "next/link";
import type { Content } from "@/lib/content/build";
import { showStudyPlate, type ProjectDetail } from "@/lib/content/queries";
import { researchProjectLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/ui/JsonLd";
import { Prose } from "@/components/ui/Prose";
import { Img } from "@/components/ui/Img";
import { Badge, DraftBadge } from "@/components/ui/Badge";
import { DateText } from "@/components/ui/DateText";
import { PearlTagList } from "@/components/ui/PearlTag";
import { MaterialsRow } from "@/components/ui/MaterialsRow";
import { PublicationEntry } from "@/components/ui/PublicationEntry";
import { NewsItem } from "@/components/ui/NewsItem";
import { Section } from "@/components/direction/Section";
import { FindingList } from "@/components/direction/FindingList";
import { InProgressList } from "@/components/direction/InProgressList";
import { Breadcrumb } from "@/components/projects/Breadcrumb";
import { TeamList, hasTeam } from "@/components/projects/TeamList";
import { ProjectLine } from "@/components/projects/ProjectLine";
import { ProjectLedger } from "@/components/projects/ProjectLedger";
import {
  PROJECT_STATUS_LABELS,
  canonicalPaper,
  latestNews,
  outputsToMaterials,
  projectBreadcrumb,
  projectFindings,
  projectLineModel,
  projectYears,
} from "@/components/projects/model";
import { StudyPlate, hasPlate } from "@/components/plates";
import "@/components/direction/direction.css";
import "@/components/projects/projects.css";

export function ProjectDetailView({ c, d: detail }: { c: Content; d: ProjectDetail }) {
  const p = detail.project;
  const path = `/projects/${p.slug}/`;
  const years = projectYears(p);
  const counted = p.publicationRefs.filter((x) => x.counted);
  const wip = p.publicationRefs.filter((x) => !x.counted);
  const outputs = outputsToMaterials(p.outputs);
  const findings = projectFindings(c, p);
  const cite = canonicalPaper(p);
  const line = projectLineModel(p, detail.news);
  const latest = latestNews(detail.news);
  const plated = counted.filter((x) => hasPlate(x.slug) && showStudyPlate(x, c.preview));
  let fig = line ? 2 : 1;

  return (
    <article
      className="pj-page bl-container"
      data-swatch={p.primaryDirection?.color}
      aria-labelledby="pj-title"
    >
      <JsonLd data={researchProjectLd(p, path, c.site)} />
      <header className="pj-head">
        <Breadcrumb crumbs={projectBreadcrumb(p)} />
        <h1 id="pj-title" tabIndex={-1} className="pj-title">
          {p.title}
        </h1>
        {p.summary && <p className="t-lead pj-summary">{p.summary}</p>}
        <DraftBadge show={p.draft} line />
        <dl className="pj-facts">
          <div>
            <dt>Status</dt>
            <dd>
              <Badge tone={p.status === "active" ? "strong" : "neutral"}>
                {PROJECT_STATUS_LABELS[p.status]}
              </Badge>
              {years ? `, ${years.charAt(0).toLowerCase()}${years.slice(1)}` : null}
            </dd>
          </div>
          {p.directionRefs.length > 0 && (
            <div>
              <dt>{p.directionRefs.length === 1 ? "Direction" : "Directions"}</dt>
              <dd>
                <PearlTagList items={p.directionRefs} label={`Research directions: ${p.title}`} />
              </dd>
            </div>
          )}
          {latest && (
            <div>
              <dt>Latest</dt>
              <dd>
                <Link href={`/news/${latest.slug}/`}>{latest.title}</Link>,{" "}
                <DateText value={latest.date} long />
              </dd>
            </div>
          )}
        </dl>
      </header>

      {line && <ProjectLine model={line} />}

      {p.hero?.image && p.hero.alt && (
        <figure className="pj-hero">
          <Img src={p.hero.image} alt={p.hero.alt} loading="eager" className="pj-hero__img" />
          {p.hero.caption && <figcaption className="pj-hero__cap">{p.hero.caption}</figcaption>}
        </figure>
      )}

      {plated.map((x) => (
        <StudyPlate key={x.slug} pub={x} preview={c.preview} figure={fig++} />
      ))}

      {p.body.trim() && (
        <Section id="overview" title="Overview">
          <Prose source={p.body} className="dr-prose" />
        </Section>
      )}

      {findings.length > 0 && (
        <Section id="findings" title="Findings">
          <FindingList findings={findings} />
        </Section>
      )}

      {(counted.length > 0 || wip.length > 0) && (
        // Titled for what it holds: "In progress" when no paper counts yet.
        <Section id="outputs" title={counted.length > 0 ? "Papers" : "In progress"}>
          {counted.length > 0 && (
            <div className="dr-pubs">
              {counted.map((x) => (
                <PublicationEntry key={x.slug} pub={x} as="h3" />
              ))}
            </div>
          )}
          <InProgressList
            items={wip}
            headingId={counted.length > 0 ? "pj-in-progress" : "outputs"}
            heading={counted.length > 0}
          />
        </Section>
      )}

      {outputs.length > 0 && (
        <Section id="materials" title="Materials">
          <MaterialsRow title={p.title} items={outputs} />
        </Section>
      )}

      {hasTeam(p) && (
        <Section id="team" title="Team">
          <TeamList project={p} />
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
            Please cite <Link href={`/publications/${cite.slug}/`}>{cite.title}</Link>
            {cite.venue ? (
              <>
                {" "}
                (<cite>{cite.venue}</cite>
                {cite.year ? `, ${cite.year}` : ""})
              </>
            ) : cite.year ? (
              ` (${cite.year})`
            ) : null}
            .
          </p>
        </Section>
      )}

      {detail.news.length > 0 && (
        <Section id="news" title="News">
          <div className="pj-news">
            {detail.news.map((n) => (
              <NewsItem key={n.slug} item={n} as="h3" showTags={false} />
            ))}
          </div>
        </Section>
      )}

      {detail.related.length > 0 && (
        <Section id="related" title="Related projects">
          <ProjectLedger
            projects={detail.related}
            currentSlug={p.primaryDirection?.slug}
            label={`Projects related to ${p.title}`}
          />
        </Section>
      )}
    </article>
  );
}
