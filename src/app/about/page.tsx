/**
 * /about/: About & contact (brief §D11). Mission (pages/home.yml), the lab's
 * own About text (pages/about.yml), and a fact sheet built from site.yml and
 * the PI's person record. ResearchOrganization JSON-LD (brief §G3).
 */
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { pageMetadata } from "@/lib/seo/metadata";
import { organizationLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/ui/JsonLd";
import { DraftBadge } from "@/components/ui/Badge";
import { DateText } from "@/components/ui/DateText";
import { Prose } from "@/components/ui/Prose";
import { PageHeader } from "@/components/pages/PageHeader";
import { LabFacts } from "@/components/pages/LabFacts";
import { aboutDescription } from "@/components/pages/aboutDescription";

const FALLBACK_TITLE = "About";

export function generateMetadata(): Metadata {
  const { pages, site, people } = getContent();
  // The <title> stays "About · BOBALAB"; the h1 uses the page's own title.
  return pageMetadata({
    title: FALLBACK_TITLE,
    description: aboutDescription({
      site,
      pages,
      hasPi: people.some((p) => p.role === "pi"),
    }),
    path: "/about/",
  });
}

export default function AboutPage() {
  const c = getContent();
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
        eyebrow="About & contact"
        title={about?.title || FALLBACK_TITLE}
        lead={about?.intro}
        meta={meta}
      />
      {mission ? (
        <section className="pg-mission" aria-labelledby="about-mission">
          <h2 id="about-mission" className="pg-mission__label">
            Mission
          </h2>
          <p className="pg-mission__text">{mission}</p>
          <DraftBadge show={Boolean(pages.home?.draft)} />
        </section>
      ) : null}
      <div className={about?.body?.trim() ? "pg-split" : "pg-narrow"}>
        {about?.body?.trim() ? <Prose source={about.body} /> : null}
        <aside className="pg-aside" aria-labelledby="about-facts">
          <LabFacts site={site} pi={pi} />
        </aside>
      </div>
    </div>
  );
}
