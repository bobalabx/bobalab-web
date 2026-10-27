/**
 * Research direction page `/research/{direction}/` (brief §D5, §E5; redesign
 * D-13 after P3 `research.html`): label-column header, condensed h1 and the
 * guiding question; Figure 1 (the direction's papers on
 * its line, ending in its pearl, the morph target); Why it matters; projects
 * as a ruled table; papers as a ruled ledger; people; More directions.
 * Static export: generateStaticParams via staticParams() (never []),
 * dynamicParams = false, notFound() for unknown slugs and the placeholder.
 * The body is the shared view (src/components/views/DirectionPageView.tsx),
 * which the editor live preview renders too.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/content/load";
import { directionDetail, staticParams, staticSlugs } from "@/lib/content/queries";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { DirectionPageView } from "@/components/views/DirectionPageView";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticParams("direction", staticSlugs.directions(getContent()));
}

type Props = { params: Promise<{ direction: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { direction } = await params;
  const c = getContent();
  const detail = directionDetail(c, direction);
  if (!detail) return { title: "Not found", robots: { index: false } };
  const d = detail.direction;
  // "{Direction} · BOBALAB", like every other page (§E5); the lab name comes
  // from site.yml, never hard-coded.
  const title = `${d.title} · ${c.site.name}`;
  const meta = pageMetadata({
    title,
    description: clipDescription(d.summary ?? d.question),
    path: `/research/${d.slug}/`,
  });
  return { ...meta, title: { absolute: title } };
}

export default async function DirectionPage({ params }: Props) {
  const { direction } = await params;
  const c = getContent();
  const detail = directionDetail(c, direction);
  if (!detail) notFound();
  return <DirectionPageView c={c} detail={detail} />;
}
