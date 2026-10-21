/**
 * ScholarlyArticle JSON-LD for a paper page (brief §D8, §G3). Extends the
 * shared builder in src/lib/seo/jsonld.ts with what content provides:
 * volume/issue nesting, pagination, lab-member author pages, alternate
 * versions (sameAs) and research directions (about).
 *
 * The venue is read the way the citations read it (./csl.ts): a journal,
 * conference or book becomes `isPartOf`; a working-paper series, thesis school
 * or preprint server becomes the `publisher`. The lab-written "In brief" is a
 * `description`, not an `abstract` (brief §D8: publisher abstracts are never
 * reproduced, so nothing on the page is the abstract).
 */
import type {
  CreativeWork,
  Periodical,
  PublicationIssue,
  PublicationVolume,
  ScholarlyArticle,
  WithContext,
} from "schema-dts";
import type { PublicationView } from "@/lib/content/load";
import type { SiteData } from "@/lib/content/schema";
import { absoluteUrl, scholarlyArticleLd } from "@/lib/seo/jsonld";
import { pageRange, toCsl } from "./csl";

export function paperJsonLd(p: PublicationView, site: SiteData): WithContext<ScholarlyArticle> {
  const path = `/publications/${p.slug}/`;
  const base = scholarlyArticleLd(p, path, site) as unknown as Record<string, unknown>;
  const csl = toCsl(p);
  const container = csl["container-title"];

  let isPartOf: Periodical | PublicationVolume | PublicationIssue | CreativeWork | undefined;
  if (container && p.type === "journal") {
    const periodical: Periodical = { "@type": "Periodical", name: container };
    const volume: PublicationVolume | undefined = p.volume
      ? { "@type": "PublicationVolume", volumeNumber: p.volume, isPartOf: periodical }
      : undefined;
    isPartOf = p.issue
      ? { "@type": "PublicationIssue", issueNumber: p.issue, isPartOf: volume ?? periodical }
      : (volume ?? periodical);
  } else if (container) {
    isPartOf = { "@type": "CreativeWork", name: container };
  }
  // Series / school / preprint server (not for talks: a manuscript's venue is where it was presented).
  const publisher =
    csl.publisher && csl.type !== "manuscript"
      ? { "@type": "Organization", name: csl.publisher }
      : undefined;

  const pages = pageRange(p.pages);
  const [pageStart, pageEnd] = pages?.includes("–") ? pages.split("–") : [undefined, undefined];
  const sameAs = [
    p.doi ? `https://doi.org/${p.doi}` : undefined,
    p.links?.publisher,
    p.links?.ssrn,
    p.links?.arxiv,
  ].filter((u, i, a): u is string => !!u && /^https:/.test(u) && a.indexOf(u) === i);

  const ld: Record<string, unknown> = {
    ...base,
    author: p.authorList.map((a) => ({
      "@type": "Person",
      name: a.name,
      ...(a.person?.hasProfile
        ? { url: absoluteUrl(`/people/${a.person.slug}/`, site.site_url) }
        : a.url
          ? { url: a.url }
          : {}),
    })),
    isPartOf,
    publisher,
    abstract: undefined,
    description: p.in_brief,
    ...(pages ? { pagination: pages } : {}),
    ...(pageStart && pageEnd ? { pageStart, pageEnd } : {}),
    sameAs: sameAs.length > 1 ? sameAs : sameAs[0],
    about: p.directionRefs.length
      ? p.directionRefs.map((d) => ({ "@type": "Thing", name: d.title }))
      : undefined,
  };
  // Drop undefined keys so the serialised JSON stays clean.
  for (const k of Object.keys(ld)) if (ld[k] === undefined) delete ld[k];
  return ld as unknown as WithContext<ScholarlyArticle>;
}
