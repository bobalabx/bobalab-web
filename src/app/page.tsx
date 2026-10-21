/**
 * Home (brief §D3, §E; DECISIONS D-02a). Sections in order:
 * hero (identity + Fig. 1) → What we've learned → Recent publications →
 * Latest news → People → Work with us. Footer is the layout's.
 * Every section renders only what content provides.
 */
import type { Metadata } from "next";
import { ViewTransition } from "react";
import { getContent } from "@/lib/content/load";
import { currentPeople, featuredFindings, openOpportunities } from "@/lib/content/queries";
import { buildFigure } from "@/lib/figure/buildFigure";
import { organizationLd } from "@/lib/seo/jsonld";
import { pageMetadata, SITE_TITLE_HOME } from "@/lib/seo/metadata";
import { PAGE_ENTER_EXIT } from "@/lib/vt";
import { JsonLd } from "@/components/ui/JsonLd";
import { PearlFigure } from "@/components/figure/PearlFigure";
import { DirectionsComingSoon, HomeHero } from "@/components/home/HomeHero";
import {
  FindingsSection,
  Meniscus,
  NewsSection,
  PeopleSection,
  PublicationsSection,
  WorkWithUsSection,
} from "@/components/home/HomeSections";

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
  const people = currentPeople(c);

  return (
    <ViewTransition enter={PAGE_ENTER_EXIT} exit={PAGE_ENTER_EXIT} default="none">
      <div className="hm">
        <JsonLd data={organizationLd(site)} />
        <HomeHero
          labName={site.name}
          longName={site.long_name}
          affiliation={site.affiliation_text}
          mission={home?.mission}
          missionDraft={home?.draft}
          solo={figure.state === "empty"}
          figure={
            figure.state === "empty" ? (
              <DirectionsComingSoon />
            ) : (
              <PearlFigure model={figure} labName={site.name} />
            )
          }
        />
        <div className="bl-container hm-sections">
          <Meniscus />
          <FindingsSection findings={featuredFindings(c)} />
          <PublicationsSection items={c.countedPublications.slice(0, 5)} />
          <NewsSection items={c.news.slice(0, 3)} />
          <PeopleSection
            people={people}
            swatchOf={(p) => (p.directions[0] ? c.getDirection(p.directions[0])?.color : undefined)}
          />
          <WorkWithUsSection opportunities={openOpportunities(c)} email={site.email} />
        </div>
      </div>
    </ViewTransition>
  );
}
