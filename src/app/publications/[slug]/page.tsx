/**
 * /publications/{slug}/ (brief §D8; redesign D-13, prototype
 * docs/redesign/prototypes/p3/paper.html).
 *
 * Head: crumb, condensed title, authors (lab members linked to their pages,
 * external coauthors to their web page), venue line, materials and the DOI;
 * beside it a facts list (type, review status, directions with the paper's
 * place on each line). Then the lab's "In
 * brief", the study-design plate (registry keyed by slug; only when
 * `plate_verified` or in preview), awards, presentations and notes as ruled
 * ledgers in the label-column grid, the citation (APA + copyable BibTeX from
 * citation-js), and related projects / papers / news.
 * Google Scholar citation_* meta and ScholarlyArticle JSON-LD for papers that
 * count under D-05.
 * The body is the shared view (src/components/views/PublicationDetailView.tsx), which the
 * editor live preview renders too.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { publicationDetail, staticParams, staticSlugs } from "@/lib/content/queries";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import {
  paperFallbackDescription,
  paperScholarMeta,
  wantsScholarMeta,
} from "@/lib/publications/seo";
import { CitationBlock } from "@/components/publications/CitationBlock";
import { PublicationDetailView } from "@/components/views/PublicationDetailView";

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
    description:
      clipDescription(p.in_brief) ??
      clipDescription(paperFallbackDescription(p, d.projects.find((x) => x.summary)?.summary)),
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
  // The citation box (citation-js) stays out of the shared view; it renders
  // exactly where and when it always did: papers with a public version.
  return (
    <PublicationDetailView
      c={c}
      d={d}
      citation={p.publicVersion ? <CitationBlock pub={p} /> : undefined}
    />
  );
}
