/**
 * Home (DECISIONS D-14 "the boba cup", building on D-13; docs/simplify/JUDGE.md
 * §5 and R1–R19; prototype docs/simplify/prototypes/c). In order:
 *   first screen — statement (h1), who, why, two links, and the cup with the live
 *                  directions' pearls (src/components/cup);
 *   featured findings (only when content has them, R19);
 *   new papers beside news;
 *   people.
 * The footer is the layout's. The research timeline (Fig. 1) lives on /research/
 * (#map) now; the cup links to it once.
 */
import type { Metadata } from "next";
import { ViewTransition } from "react";
import { getContent } from "@/lib/content/load";
import { currentPeople, featuredFindings, homeHeroCopy, homePearls } from "@/lib/content/queries";
import { organizationLd } from "@/lib/seo/jsonld";
import { pageMetadata, SITE_TITLE_HOME } from "@/lib/seo/metadata";
import { PAGE_ENTER_EXIT } from "@/lib/vt";
import { JsonLd } from "@/components/ui/JsonLd";
import { BobaCup } from "@/components/cup/BobaCup";
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
  const lead = copy.who.lead;

  return (
    <ViewTransition enter={PAGE_ENTER_EXIT} exit={PAGE_ENTER_EXIT} default="none">
      <div className="bl-container hm">
        <JsonLd data={organizationLd(site)} />
        <HomeHero copy={copy} cup={<BobaCup pearls={homePearls(c)} />} />
        <FindingsSection findings={featuredFindings(c)} />
        <div className="hm-lately">
          <PapersSection
            items={recentPublications(c, 3)}
            total={c.countedPublications.length}
            inProgress={c.inProgress.length}
          />
          <NewsSection
            items={c.news.slice(0, 4)}
            total={c.news.length}
            since={c.news.at(-1)?.date}
          />
        </div>
        <PeopleSection
          people={currentPeople(c)}
          lead={lead ? `${lead.honorific ? `${lead.honorific} ` : ""}${lead.name}` : undefined}
          alumni={c.people.filter((p) => p.isAlumni).length}
          email={site.email}
        />
      </div>
    </ViewTransition>
  );
}
