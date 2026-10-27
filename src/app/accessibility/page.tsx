/**
 * /accessibility/: accessibility statement (brief §D12, §G1) from
 * content/pages/accessibility.yml.
 * The body is the shared view (src/components/views/TextPageView.tsx), which
 * the editor live preview renders too.
 */
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { TEXT_PAGES, TextPageView } from "@/components/views/TextPageView";

export function generateMetadata(): Metadata {
  const { pages, site } = getContent();
  const page = pages.accessibility;
  return pageMetadata({
    title: page?.title || TEXT_PAGES.accessibility.fallbackTitle,
    description: clipDescription(page?.intro) ?? `Accessibility of the ${site.name} website.`,
    path: "/accessibility/",
  });
}

export default function AccessibilityPage() {
  return <TextPageView c={getContent()} name="accessibility" />;
}
