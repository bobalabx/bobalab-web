/**
 * The home page's People section on its own, for the editor live preview's
 * "people" page ("People (home page)" in the content manager's page tabs). The
 * separate /people/ page is gone (owner, 2026-10-29): its list is the home
 * page's last section (#people, HomeView), and old /people/ links redirect
 * there. Drawing only that section puts the edited person, highlighted, at the
 * top of the live column instead of below the hero. No public route renders it.
 */
import type { Content } from "@/lib/content/load";
import { PeopleSection } from "@/components/home/HomeSections";
import { buildPeopleIndex } from "./model";

export function PeopleIndex({ content }: { content: Content }) {
  return (
    <div className="bl-container hm hm--people">
      <PeopleSection people={buildPeopleIndex(content)} site={content.site} />
    </div>
  );
}
