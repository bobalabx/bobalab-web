/**
 * /people/ (brief §D9, DECISIONS D-06). Static; the filter chips are a small
 * client island and everything is visible without JavaScript.
 */
import type { Metadata } from "next";
import { ViewTransition } from "react";
import { getContent } from "@/lib/content/load";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { PeopleIndex } from "@/components/people/PeopleIndex";
import { buildPeopleIndex } from "@/components/people/model";
import { PAGE_ENTER_EXIT } from "@/lib/vt";

export function generateMetadata(): Metadata {
  const c = getContent();
  const m = buildPeopleIndex(c);
  // Category names (plural group labels), not the counted summary ("1 Master's student").
  // The PI is named by the sentence itself, so a lone role label never makes up the list.
  const groups = [
    ...m.groups.filter((g) => g.role !== "pi").map((g) => g.label),
    ...(m.alumniItems.length ? ["alumni"] : []),
  ];
  const who =
    groups.length > 1
      ? `${groups.slice(0, -1).join(", ")} and ${groups[groups.length - 1]}`
      : groups[0];
  const lab = `${c.site.name}, the ${c.site.long_name}`;
  return pageMetadata({
    title: "People",
    description: clipDescription(
      who
        ? `People of ${lab}: its principal investigator, ${who}.`
        : `People of ${lab} and its principal investigator.`,
    ),
    path: "/people/",
  });
}

export default function PeoplePage() {
  return (
    <ViewTransition enter={PAGE_ENTER_EXIT} exit={PAGE_ENTER_EXIT} default="none">
      <PeopleIndex content={getContent()} />
    </ViewTransition>
  );
}
