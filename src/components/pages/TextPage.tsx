/**
 * A statement page (Accessibility, Privacy; brief §D12) from content/pages/<name>.yml:
 * title, intro, Markdown body, last_reviewed. Only what content provides is
 * rendered. The body runs on the label-column grid (each h2 in the label
 * column). A contact row with the lab address (site.yml) is added unless the
 * body already links that address, so every statement has a contact.
 */
import type { SiteData, TextPageData } from "@/lib/content/schema";
import { DateText } from "@/components/ui/DateText";
import { DraftBadge } from "@/components/ui/Badge";
import { Prose } from "@/components/ui/Prose";
import { PageHeader } from "./PageHeader";
import { MailLink, linksEmail } from "./MailLink";
import "./pages.css";

export function TextPage({
  page,
  fallbackTitle,
  site,
  contactTitle,
  contactText,
  contactSubject,
}: {
  page: TextPageData | undefined;
  fallbackTitle: string;
  site: SiteData;
  /** Heading of the contact row, e.g. "Report a barrier". */
  contactTitle: string;
  /** One sentence above the address. */
  contactText: string;
  contactSubject: string;
}) {
  const showContact = !linksEmail(page?.body, site.email) && !linksEmail(page?.intro, site.email);
  const meta =
    page && (page.last_reviewed || page.draft) ? (
      <>
        {page.last_reviewed ? (
          <span>
            Last reviewed <DateText value={page.last_reviewed} />
          </span>
        ) : null}
        <DraftBadge show={page.draft} />
      </>
    ) : null;
  const body = page?.body?.trim() ? page.body : null;

  return (
    <div className="bl-container pg">
      <PageHeader title={page?.title || fallbackTitle} lead={page?.intro} meta={meta} metaFirst />
      {body ? (
        <div className="pg-doc">
          <Prose source={body} />
        </div>
      ) : null}
      {showContact ? (
        <section className="pg-row pg-row--doc" aria-labelledby="pg-contact">
          <div className="pg-row__label">
            <h2 id="pg-contact">{contactTitle}</h2>
          </div>
          <div className="pg-audience">
            <p>{contactText}</p>
            <MailLink email={site.email} subject={contactSubject} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
