/**
 * /people/ (brief §D9, DECISIONS D-06). Static; the filter chips are a small
 * client island and everything is visible without JavaScript.
 */
import type { Metadata } from "next";
import { ViewTransition } from "react";
import { getContent } from "@/lib/content/load";
import { pageMetadata } from "@/lib/seo/metadata";
import { PeopleIndex } from "@/components/people/PeopleIndex";
import { PAGE_ENTER_EXIT } from "@/lib/vt";

export function generateMetadata(): Metadata {
  const c = getContent();
  // One plain sentence, no generated list of role groups (copy sweep).
  const pi = c.people.find((p) => p.role === "pi" && !p.isAlumni);
  const alumni = c.people.some((p) => p.isAlumni);
  const who = pi
    ? `${pi.name} and the students and research assistants of ${c.site.name}`
    : `The students and research assistants of ${c.site.name}`;
  return pageMetadata({
    title: "People",
    description: `${who}${alumni ? ", plus former members of the lab" : ""}.`,
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
