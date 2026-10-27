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
 * The body is the shared view (src/components/views/HomeView.tsx), which the
 * editor live preview renders too.
 */
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { pageMetadata, SITE_TITLE_HOME } from "@/lib/seo/metadata";
import { HomeView } from "@/components/views/HomeView";

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
  return <HomeView c={getContent()} />;
}
