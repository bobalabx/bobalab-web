/**
 * Paper-page metadata (brief §D8, §G3): Google Scholar citation_* tags and the
 * meta description. Builds on the shared scholarMeta() (src/lib/seo/scholar.ts)
 * and corrects the venue-derived fields with the same parsing the citations use
 * (./csl.ts), so Scholar sees an institution, not a venue string:
 *
 *   "SSRN working paper 4502968" → institution "SSRN", report number "4502968"
 *   "Ph.D. dissertation, University of Pennsylvania" → "University of Pennsylvania"
 *   "arXiv preprint" → no institution (arXiv is not one)
 *
 * Pure (no citation-js import); safe anywhere.
 */
import type { PublicationView } from "@/lib/content/load";
import { scholarMeta } from "@/lib/seo/scholar";
import { toCsl, typeWord, venueText } from "./csl";

type ScholarInput = Parameters<typeof scholarMeta>[0] &
  Pick<PublicationView, "slug" | "links" | "status">;

export function paperScholarMeta(p: ScholarInput): Record<string, string | string[]> {
  const meta = scholarMeta(p);
  delete meta.citation_dissertation_institution;
  delete meta.citation_technical_report_institution;
  const csl = toCsl(p);
  if (csl.type === "thesis" && csl.publisher) {
    meta.citation_dissertation_institution = csl.publisher;
  } else if (csl.type === "report" && csl.publisher) {
    meta.citation_technical_report_institution = csl.publisher;
    if (csl.number) meta.citation_technical_report_number = csl.number;
  }
  return meta;
}

/**
 * Scholar tags only describe a paper someone can read (Scholar's inclusion
 * rule: full text or abstract reachable). Pages for work known only from a
 * talk, or still in progress, carry none.
 */
export const wantsScholarMeta = (p: Pick<PublicationView, "counted" | "publicVersion">) =>
  p.counted && p.publicVersion;

/** "A, B, and C" (the same joining the author list uses). */
function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/**
 * Meta description when the lab has written no "In brief":
 * "Working paper by Haonan Deng and Wichinpong Park Sinchaisri. SSRN working paper 7151739, 2026."
 */
export function paperFallbackDescription(
  p: Pick<
    PublicationView,
    "type" | "authors" | "venue" | "year" | "volume" | "issue" | "pages" | "date_online"
  >,
): string {
  const who = joinNames(p.authors.map((a) => a.name));
  const head = `${typeWord(p)}${who ? ` by ${who}` : ""}.`;
  const venue = venueText(p);
  return venue ? `${head} ${venue}.` : head;
}
