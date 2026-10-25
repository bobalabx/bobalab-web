/**
 * Home (DECISIONS D-13; prototype docs/redesign/prototypes/p3/index.html, JUDGE
 * refinement 8). In order: statement (h1) → the lab's name in the label column and
 * the lede → Fig. 1 "Lines" → featured findings (only when content has them) →
 * recent publications (newest dated evidence first, see components/home/recent.ts)
 * → people → news. Every section renders only what content provides. The footer
 * is the layout's.
 */
import type { Metadata } from "next";
import { ViewTransition } from "react";
import { getContent } from "@/lib/content/load";
import { currentPeople, featuredFindings } from "@/lib/content/queries";
import { buildFigure } from "@/lib/figure/buildFigure";
import { organizationLd } from "@/lib/seo/jsonld";
import { pageMetadata, SITE_TITLE_HOME } from "@/lib/seo/metadata";
import { PAGE_ENTER_EXIT } from "@/lib/vt";
import { JsonLd } from "@/components/ui/JsonLd";
import { PearlFigure } from "@/components/figure/PearlFigure";
import { DirectionsComingSoon, HomeHero, HOME_STATEMENT } from "@/components/home/HomeHero";
import {
  FindingsSection,
  NewsSection,
  PeopleSection,
  PublicationsSection,
} from "@/components/home/HomeSections";
import { recentPublications } from "@/components/home/recent";

export function generateMetadata(): Metadata {
  const c = getContent();
  const meta = pageMetadata({
    title: SITE_TITLE_HOME,
    path: "/",
    description: c.pages.home?.mission,
  });
  return { ...meta, title: { absolute: SITE_TITLE_HOME } };
}

export default function HomePage() {
  const c = getContent();
  const { site } = c;
  const home = c.pages.home;
  const figure = buildFigure(c);
  const statement = home?.statement ?? HOME_STATEMENT;

  return (
    <ViewTransition enter={PAGE_ENTER_EXIT} exit={PAGE_ENTER_EXIT} default="none">
      <div className="bl-container hm">
        <JsonLd data={organizationLd(site)} />
        <HomeHero
          statement={statement}
          longName={site.long_name}
          affiliation={site.affiliation_text}
          mission={home?.mission}
          missionDraft={home?.draft}
          directions={figure.lanes.map((l) => ({ slug: l.slug, label: l.label, swatch: l.swatch }))}
        />
        {figure.state === "empty" ? <DirectionsComingSoon /> : <PearlFigure model={figure} />}
        <FindingsSection findings={featuredFindings(c)} />
        <PublicationsSection
          items={recentPublications(c, 3)}
          total={c.countedPublications.length}
          inProgress={c.inProgress.length}
        />
        <PeopleSection
          people={currentPeople(c)}
          alumni={c.people.filter((p) => p.isAlumni).length}
          email={site.email}
        />
        <NewsSection items={c.news.slice(0, 5)} total={c.news.length} since={c.news.at(-1)?.date} />
      </div>
    </ViewTransition>
  );
}
