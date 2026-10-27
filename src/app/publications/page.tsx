/**
 * /publications/ (brief §D7, DECISIONS D-05; redesign D-13, prototype
 * docs/redesign/prototypes/p3/publications.html).
 *
 * Server-rendered: the full list of counted publications as one ruled ledger
 * grouped by year (the year rail sits in the label column), with year jump
 * links. A client island inside <Suspense> adds search, type / direction /
 * member toggles and a year range with the state in the URL; its fallback is
 * the same full list, which is what the static export ships in the HTML. Work
 * in progress sits in a collapsed section below and is never mixed into the
 * main list. One provenance footnote replaces the per-row hedges (D-13 item 7).
 * The body is the shared view (src/components/views/PublicationsView.tsx), which the
 * editor live preview renders too.
 */
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { labTagline, pageMetadata } from "@/lib/seo/metadata";
import { PublicationsView } from "@/components/views/PublicationsView";

export function generateMetadata(): Metadata {
  const { site, people } = getContent();
  const pi = people.find((p) => p.role === "pi" && !p.isAlumni);
  return pageMetadata({
    title: "Publications",
    description: `Papers and working papers from ${labTagline(site, pi?.name)}.`,
    path: "/publications/",
  });
}

export default function PublicationsPage() {
  return <PublicationsView c={getContent()} />;
}
