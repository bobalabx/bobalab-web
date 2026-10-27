/**
 * The statement pages (/accessibility/, /privacy/), shared by the static routes
 * and the editor live preview (src/app/editor-preview). Synchronous and pure:
 * everything comes from Content (content/pages/<name>.yml and site.yml).
 */
import type { Content } from "@/lib/content/build";
import type { SiteData } from "@/lib/content/schema";
import { TextPage } from "@/components/pages/TextPage";

export type TextPageName = "accessibility" | "privacy";

/** Per page: the title when the file has none, and the contact row. */
export const TEXT_PAGES: Record<
  TextPageName,
  {
    fallbackTitle: string;
    contactTitle: string;
    contactText: string;
    contactSubject: (site: SiteData) => string;
  }
> = {
  accessibility: {
    fallbackTitle: "Accessibility",
    contactTitle: "Report a barrier",
    contactText:
      "If something on this site does not work for you, email the lab with the page address and a short description.",
    contactSubject: (site) => `${site.name} website: accessibility barrier`,
  },
  privacy: {
    fallbackTitle: "Privacy",
    contactTitle: "Questions",
    contactText: "For questions about privacy on this site, email the lab.",
    contactSubject: (site) => `${site.name} website: privacy question`,
  },
};

export function TextPageView({ c, name }: { c: Content; name: TextPageName }) {
  const t = TEXT_PAGES[name];
  return (
    <TextPage
      page={c.pages[name]}
      fallbackTitle={t.fallbackTitle}
      site={c.site}
      contactTitle={t.contactTitle}
      contactText={t.contactText}
      contactSubject={t.contactSubject(c.site)}
    />
  );
}
