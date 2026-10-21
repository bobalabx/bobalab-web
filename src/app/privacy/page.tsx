/** /privacy/: privacy statement (brief §D12; required for a berkeley.edu hostname) from content/pages/privacy.yml. */
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { TextPage } from "@/components/pages/TextPage";

const FALLBACK_TITLE = "Privacy";

export function generateMetadata(): Metadata {
  const { pages, site } = getContent();
  const page = pages.privacy;
  return pageMetadata({
    title: page?.title || FALLBACK_TITLE,
    description: clipDescription(page?.intro) ?? `Privacy and the ${site.name} website.`,
    path: "/privacy/",
  });
}

export default function PrivacyPage() {
  const { pages, site } = getContent();
  return (
    <TextPage
      page={pages.privacy}
      fallbackTitle={FALLBACK_TITLE}
      site={site}
      contactTitle="Questions"
      contactText="For questions about privacy on this site, email the lab."
      contactSubject={`${site.name} website: privacy question`}
    />
  );
}
