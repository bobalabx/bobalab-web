/**
 * /people/{slug}/ (brief §D9 "Person page"). Only people with a profile page
 * (`profile_page: true`; the PI always) are generated; unlisted people never
 * are. Static export: staticParams() emits the EMPTY_PARAM placeholder when
 * there are no profiles, and anything unknown calls notFound().
 */
import type { Metadata } from "next";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/content/load";
import { markdownToText } from "@/lib/content/markdoc";
import { staticParams, staticSlugs } from "@/lib/content/queries";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { PersonProfile } from "@/components/people/PersonProfile";
import { buildPersonProfile } from "@/components/people/model";
import { PAGE_ENTER_EXIT } from "@/lib/vt";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticParams("slug", staticSlugs.people(getContent()));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = getContent();
  const m = buildPersonProfile(c, slug);
  if (!m) return { title: "Not found", robots: { index: false, follow: false } };
  const p = m.item.person;
  const bio = clipDescription(markdownToText(p.body));
  const role = m.lead ?? m.eyebrow;
  return pageMetadata({
    title: p.name,
    description: bio || `${p.name}, ${role}. ${c.site.name}, ${c.site.long_name}.`,
    path: `/people/${p.slug}/`,
    type: "profile",
  });
}

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;
  const c = getContent();
  const m = buildPersonProfile(c, slug);
  if (!m) notFound();
  return (
    <ViewTransition enter={PAGE_ENTER_EXIT} exit={PAGE_ENTER_EXIT} default="none">
      <PersonProfile content={c} model={m} />
    </ViewTransition>
  );
}
