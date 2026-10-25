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
import { clipDescription, pageMetadata, schoolName } from "@/lib/seo/metadata";
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
  // Without a bio, one plain sentence: "Park Sinchaisri is an Assistant Professor
  // of … at Berkeley Haas and leads BOBALAB." / "… is a PhD student in BOBALAB, …".
  const at = schoolName(c.site);
  const role = (m.lead ?? m.eyebrow).trim();
  const article = /^[aeiou]/i.test(role) ? "an" : "a";
  const lowered =
    /^[A-Z][a-z]*(?=[\s’'-]|$)/.test(role) && p.role !== "pi"
      ? role.charAt(0).toLowerCase() + role.slice(1)
      : role;
  const fallback =
    p.role === "pi"
      ? `${p.name} is ${article} ${role} at ${at} and leads ${c.site.name}.`
      : `${p.name} is ${article} ${lowered} in ${c.site.name} at ${at}.`;
  return pageMetadata({
    title: p.name,
    description: bio || fallback,
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
