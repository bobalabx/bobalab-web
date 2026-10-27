/**
 * Research index `/research/` (brief §D4; DECISIONS D-04 archived directions;
 * redesign D-13 in P3's grammar; D-14 moves Fig. 1 here; the homepage figure is the D-15 pearl cluster):
 *   1. condensed h1, the page's links in the label column, a one-line lede;
 *   2. the live directions as a ruled ledger (title, question, counts);
 *   3. <section id="map">, "How the directions connect": Fig. 1
 *      (PearlFigure, buildFigure) in a full-bleed --band band, open by default,
 *      with its one-sentence key, hover readout, keyboard support and morph
 *      (JUDGE.md "Where the timeline moves"; the homepage links here once);
 *   4. projects by status as one-line rows;
 *   5. archived directions under "Earlier and related research", each with its
 *      small multiple (DirectionStrip): they are not on the map.
 * View-transition names: the map's pearls are the ONLY elements on this page
 * named pearl-{slug} (the morph source into /research/{slug}/). The ledger's
 * segment glyphs and the archived strips never carry a name. The live ledger
 * no longer draws a DirectionStrip per row: the map below draws the same papers
 * on the same years (JUDGE.md: the strips duplicate the map); the component
 * stays for "Earlier and related research".
 * Copy that is not derived from content stays generic.
 * The body is the shared view (src/components/views/ResearchView.tsx), which
 * the editor live preview renders too.
 */
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { pageMetadata } from "@/lib/seo/metadata";
import { ResearchView } from "@/components/views/ResearchView";

export function generateMetadata(): Metadata {
  const { site } = getContent();
  return pageMetadata({
    title: "Research",
    description: `The questions ${site.name} works on, from algorithmic advice to gig work, and the projects behind them.`,
    path: "/research/",
  });
}

export default function ResearchPage() {
  return <ResearchView c={getContent()} />;
}
