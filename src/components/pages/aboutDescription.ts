/**
 * Meta description for /about/ (brief §G3). The lab's own About intro wins
 * when it is published; otherwise the fallback names only the sections the
 * page actually renders, so a production build with the About and Home copy
 * still in draft does not promise a mission it does not show.
 */
import type { PagesData, SiteData } from "@/lib/content/schema";
import { clipDescription } from "@/lib/seo/metadata";

/** Search engines show about 160 characters (matches clipDescription). */
const MAX = 160;

function listOf(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function aboutDescription({
  site,
  pages,
  hasPi,
}: {
  site: SiteData;
  pages: PagesData;
  hasPi: boolean;
}): string {
  const intro = clipDescription(pages.about?.intro);
  if (intro) return intro;
  // Mirrors what AboutPage renders: the mission block (pages/home.yml) only
  // when it has text, the PI row only when a PI record is visible, and the
  // fact sheet's contact details (address and email, both required in
  // site.yml) always.
  const parts = [
    ...(pages.home?.mission?.trim() ? ["mission"] : []),
    ...(hasPi ? ["principal investigator"] : []),
    "contact",
  ];
  const list = `${listOf(parts)}.`;
  // Prefer the full lab name; drop it rather than clip the list mid-word, so
  // the description never cuts off the sections it names.
  const full = `${site.name} (${site.long_name}), ${site.affiliation_text}: ${list}`;
  if (full.length <= MAX) return full;
  return clipDescription(`${site.name}, ${site.affiliation_text}: ${list}`, MAX) ?? site.name;
}
