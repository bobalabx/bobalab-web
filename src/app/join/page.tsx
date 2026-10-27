/**
 * /join/: Join / work with us (brief §D11, DECISIONS D-05). Three audiences:
 * students & RAs, partners & data collaborators, press, each a label-column
 * row. Text comes from content/pages/join.yml; positions, routes and
 * open/closed status come only from content/opportunities, shown as a ruled
 * ledger. A status is shown only when the lab has set one (no "as of" dates,
 * no "not confirmed" rows or legend; copy sweep). One contact address
 * (site.yml → email) as a mailto: link. Nothing is invented: no deadlines or
 * positions that content does not list.
 * The body is the shared view (src/components/views/JoinView.tsx), which the
 * editor live preview renders too.
 */
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { pageMetadata } from "@/lib/seo/metadata";
import { JoinView } from "@/components/views/JoinView";

export function generateMetadata(): Metadata {
  const { site } = getContent();
  // Says what the page is for (the intro only gives the address).
  return pageMetadata({
    title: "Join the lab",
    description: `How to join ${site.name} as a student or research assistant, or work with us as a collaborator.`,
    path: "/join/",
  });
}

export default function JoinPage() {
  return <JoinView c={getContent()} />;
}
