/**
 * /about/: About & contact (brief §D11). Mission (pages/home.yml), the lab's
 * own About text (pages/about.yml) on the label-column grid, and the contact
 * facts built from site.yml and the PI's person record.
 * ResearchOrganization JSON-LD (brief §G3).
 * The body is the shared view (src/components/views/AboutView.tsx), which the
 * editor live preview renders too.
 */
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { pageMetadata } from "@/lib/seo/metadata";
import { aboutDescription } from "@/components/pages/aboutDescription";
import { ABOUT_FALLBACK_TITLE, AboutView } from "@/components/views/AboutView";

export function generateMetadata(): Metadata {
  const { pages, site, people } = getContent();
  // The <title> stays "About · BOBALAB"; the h1 uses the page's own title.
  return pageMetadata({
    title: ABOUT_FALLBACK_TITLE,
    description: aboutDescription({
      site,
      pages,
      hasPi: people.some((p) => p.role === "pi"),
    }),
    path: "/about/",
  });
}

export default function AboutPage() {
  return <AboutView c={getContent()} />;
}
