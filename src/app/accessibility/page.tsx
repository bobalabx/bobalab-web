/** /accessibility/: accessibility statement (brief §D12, §G1) from content/pages/accessibility.yml. */
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { TextPage } from "@/components/pages/TextPage";

const FALLBACK_TITLE = "Accessibility";

export function generateMetadata(): Metadata {
  const { pages, site } = getContent();
  const page = pages.accessibility;
  return pageMetadata({
    title: page?.title || FALLBACK_TITLE,
    description: clipDescription(page?.intro) ?? `Accessibility of the ${site.name} website.`,
    path: "/accessibility/",
  });
}

export default function AccessibilityPage() {
  const { pages, site } = getContent();
  return (
    <TextPage
      page={pages.accessibility}
      fallbackTitle={FALLBACK_TITLE}
      site={site}
      contactTitle="Report a barrier"
      contactText="If something on this site does not work for you, email the lab with the page address and a short description."
      contactSubject={`${site.name} website: accessibility barrier`}
    />
  );
}
