/**
 * Project page `/projects/{slug}/` (brief §D6; redesign D-13 after P3
 * `project.html`): an editorial case study built only from real content.
 * Head: breadcrumb, condensed h1, the lab's summary, and a facts row (status,
 * directions, latest news; the team and papers have sections of their own).
 * Then Figure 1, the project line
 * (papers on the project's directions plus dated news), and the sections that
 * have content: overview, findings, papers, materials, team, funding, how to
 * cite, news, related projects. Empty sections are not rendered.
 * Static export: staticParams() + dynamicParams = false + notFound().
 * The body is the shared view (src/components/views/ProjectDetailView.tsx), which the
 * editor live preview renders too.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/content/load";
import { projectDetail, staticParams, staticSlugs } from "@/lib/content/queries";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { projectTitle } from "@/components/projects/model";
import { ProjectDetailView } from "@/components/views/ProjectDetailView";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticParams("slug", staticSlugs.projects(getContent()));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = getContent();
  const detail = projectDetail(c, slug);
  if (!detail) return { title: "Not found", robots: { index: false } };
  const p = detail.project;
  // "{Title} · BOBALAB", like every other page; "(project)" only when a paper
  // has the same title, so page titles stay unique (WCAG 2.4.2; verify A11Y-03).
  const title = `${projectTitle(p, c.publications)} · ${c.site.name}`;
  const meta = pageMetadata({
    title,
    // The lab's summary, then what the page is ("A BOBALAB project.") when it fits.
    description: p.summary
      ? clipDescription(`${p.summary.replace(/([^.!?])$/, "$1.")} A ${c.site.name} project.`)
      : undefined,
    path: `/projects/${p.slug}/`,
  });
  return { ...meta, title: { absolute: title } };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const c = getContent();
  const detail = projectDetail(c, slug);
  if (!detail) notFound();
  return <ProjectDetailView c={c} d={detail} />;
}
