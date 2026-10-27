/**
 * The Home page body (/), shared by the static route (src/app/page.tsx) and the
 * editor live preview (src/app/editor-preview). Synchronous and pure:
 * everything comes from Content.
 */
import { ViewTransition } from "react";
import type { Content } from "@/lib/content/build";
import { currentPeople, featuredFindings, homeHeroCopy } from "@/lib/content/queries";
import { buildPearls } from "@/lib/pearls/model";
import { organizationLd } from "@/lib/seo/jsonld";
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

export function HomeView({ c }: { c: Content }) {
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
