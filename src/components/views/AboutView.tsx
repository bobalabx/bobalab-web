/**
 * The About page body (/about/), shared by the static route and the editor live
 * preview (src/app/editor-preview). Synchronous and pure: everything comes from
 * Content. Mission (pages/home.yml), the lab's own About text (pages/about.yml)
 * and the contact facts from site.yml and the PI's person record.
 */
import type { Content } from "@/lib/content/build";
import { organizationLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/ui/JsonLd";
import { DraftBadge } from "@/components/ui/Badge";
import { DateText } from "@/components/ui/DateText";
import { Prose } from "@/components/ui/Prose";
import { PageHeader } from "@/components/pages/PageHeader";
import { LabFacts } from "@/components/pages/LabFacts";

/** The page title when pages/about.yml has none (the <title> always uses it). */
export const ABOUT_FALLBACK_TITLE = "About";

export function AboutView({ c }: { c: Content }) {
  const { site, pages } = c;
  const about = pages.about;
  const mission = pages.home?.mission?.trim();
  const pi = c.people.find((p) => p.role === "pi");
  const meta =
    about && (about.last_reviewed || about.draft) ? (
      <>
        {about.last_reviewed ? (
          <span>
            Last reviewed <DateText value={about.last_reviewed} />
          </span>
        ) : null}
        <DraftBadge show={about.draft} />
      </>
    ) : null;

  return (
    <div className="bl-container pg">
      <JsonLd data={organizationLd(site)} />
      <PageHeader
        title={about?.title || ABOUT_FALLBACK_TITLE}
        lead={about?.intro}
        meta={meta}
        metaFirst
      />
      {mission ? (
        <section className="pg-row pg-row--doc pg-mission" aria-labelledby="about-mission">
          <div className="pg-row__label">
            <h2 id="about-mission">Mission</h2>
          </div>
          <div>
            <p className="pg-mission__text">{mission}</p>
            <DraftBadge show={Boolean(pages.home?.draft)} line />
          </div>
        </section>
      ) : null}
      {about?.body?.trim() ? (
        <div className="pg-doc">
          <Prose source={about.body} />
        </div>
      ) : null}
      <section className="pg-row pg-row--doc" aria-labelledby="about-facts">
        <div className="pg-row__label">
          <h2 id="about-facts">Contact</h2>
        </div>
        <LabFacts site={site} pi={pi} />
      </section>
    </div>
  );
}
