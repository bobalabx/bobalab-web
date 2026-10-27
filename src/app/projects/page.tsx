/**
 * Projects index `/projects/` (brief §D6; redesign D-13): one ruled table per
 * primary direction on the label-column grid (the direction's line segment
 * and name in the label column, its projects as rows with papers, people and
 * status). Without JS everything shows; with JS the status toggles
 * (<button aria-pressed>, text style) filter the rows.
 * The body is the shared view (src/components/views/ProjectsView.tsx), which the
 * editor live preview renders too.
 */
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { pageMetadata } from "@/lib/seo/metadata";
import { ProjectsView } from "@/components/views/ProjectsView";

export function generateMetadata(): Metadata {
  const { site } = getContent();
  return pageMetadata({
    title: "Projects",
    description: `Current and past ${site.name} projects, from AI at work to gig platforms.`,
    path: "/projects/",
  });
}

export default function ProjectsPage() {
  return <ProjectsView c={getContent()} />;
}
