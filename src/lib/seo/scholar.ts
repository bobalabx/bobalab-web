/**
 * Google Scholar inclusion meta tags for paper pages (brief §G3).
 * Pass the result as `other` to pageMetadata().
 * citation_pdf_url is emitted only for a PDF hosted on this site (same directory
 * rule + rights) — pass `localPdfUrl` explicitly when that is true.
 *
 * Institution tags (`citation_dissertation_institution`,
 * `citation_technical_report_institution` / `_number`) are the caller's job:
 * `venue` holds text such as "SSRN working paper 4502968", not an institution
 * name, so this generic base does not emit them. Paper pages use
 * `paperScholarMeta()` in src/lib/publications/seo.ts, which derives them from
 * the citation parser (WP3 request 5).
 */
import type { PublicationEntry } from "@/lib/content/schema";

export function scholarMeta(
  p: Pick<
    PublicationEntry,
    | "title"
    | "authors"
    | "year"
    | "date_online"
    | "venue"
    | "type"
    | "volume"
    | "issue"
    | "pages"
    | "doi"
  >,
  opts: { localPdfUrl?: string } = {},
): Record<string, string | string[]> {
  const meta: Record<string, string | string[]> = {
    citation_title: p.title,
    citation_author: p.authors.map((a) => a.name),
  };
  const date =
    p.date_online && p.year && p.date_online.startsWith(String(p.year))
      ? p.date_online
      : p.year
        ? String(p.year)
        : p.date_online;
  if (date) meta.citation_publication_date = date.replace(/-/g, "/");
  if (p.venue) {
    if (p.type === "journal") meta.citation_journal_title = p.venue;
    else if (p.type === "conference") meta.citation_conference_title = p.venue;
  }
  if (p.volume) meta.citation_volume = p.volume;
  if (p.issue) meta.citation_issue = p.issue;
  if (p.pages) {
    const [first, last] = p.pages.split(/[-–]/);
    if (first) meta.citation_firstpage = first.trim();
    if (last) meta.citation_lastpage = last.trim();
  }
  if (p.doi) meta.citation_doi = p.doi;
  if (opts.localPdfUrl) meta.citation_pdf_url = opts.localPdfUrl;
  return meta;
}
