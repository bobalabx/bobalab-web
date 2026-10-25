/**
 * Home (DECISIONS D-15, building on D-14 and D-13; docs/simplify/JUDGE.md §5 and
 * R1–R19). In order:
 *   first screen — statement (h1), who, why, two links, and the pearl figure
 *                  with the live directions (src/components/pearls, D-15: the
 *                  original Fig. 1 pearl cluster, polished);
 *   featured findings (only when content has them, R19);
 *   new papers beside news;
 *   people.
 * The footer is the layout's. The research timeline (Fig. 1) lives on /research/
 * (#map) now; the pearl figure links to it once.
 */
import type { Metadata } from "next";
import { ViewTransition } from "react";
import { getContent } from "@/lib/content/load";
import { currentPeople, featuredFindings, homeHeroCopy } from "@/lib/content/queries";
import { buildPearls } from "@/lib/pearls/model";
import { organizationLd } from "@/lib/seo/jsonld";
import { pageMetadata, SITE_TITLE_HOME } from "@/lib/seo/metadata";
import { PAGE_ENTER_EXIT } from "@/lib/vt";
import { JsonLd } from "@/components/ui/JsonLd";
import { HomePearls } from "@/components/pearls/HomePearls";
import { HomeHero } from "@/components/home/HomeHero";
import {
  FindingsSection,
  NewsSection,
  PapersSection,
  PeopleSection,
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
  const copy = homeHeroCopy(c);

  return (
    <ViewTransition enter={PAGE_ENTER_EXIT} exit={PAGE_ENTER_EXIT} default="none">
      <div className="bl-container hm">
        <JsonLd data={organizationLd(site)} />
        <HomeHero copy={copy} figure={<HomePearls model={buildPearls(c.directions)} />} />
        <FindingsSection findings={featuredFindings(c)} />
        <div className="hm-lately">
          <PapersSection items={recentPublications(c, 3)} />
          <NewsSection items={c.news.slice(0, 4)} />
        </div>
        <PeopleSection people={currentPeople(c)} email={site.email} />
      </div>
    </ViewTransition>
  );
}
