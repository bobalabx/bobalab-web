/**
 * /privacy/: privacy statement (brief §D12; required for a berkeley.edu
 * hostname) from content/pages/privacy.yml.
 * The body is the shared view (src/components/views/TextPageView.tsx), which
 * the editor live preview renders too.
 */
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { TEXT_PAGES, TextPageView } from "@/components/views/TextPageView";

export function generateMetadata(): Metadata {
  const { pages, site } = getContent();
  const page = pages.privacy;
  return pageMetadata({
    title: page?.title || TEXT_PAGES.privacy.fallbackTitle,
    description: clipDescription(page?.intro) ?? `Privacy and the ${site.name} website.`,
    path: "/privacy/",
  });
}

export default function PrivacyPage() {
  return <TextPageView c={getContent()} name="privacy" />;
}
