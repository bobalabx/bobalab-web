/**
 * Publication → CSL-JSON and the human venue line (brief §D7–§D8).
 *
 * Pure functions (no citation-js import), so they are safe anywhere.
 * citation-js consumes `toCsl()` at build time in ./bibtex.ts and ./citation.ts.
 *
 * Every value comes from the content file; nothing is guessed. When a field
 * is missing it is left out of the CSL item.
 */
import type { PublicationEntry } from "@/lib/content/schema";
import { formatDate } from "@/lib/content/dates";
import { PUBLICATION_TYPE_LABELS } from "@/components/ui/labels";
import { asciiKey, splitName, type CslName } from "./names";

export type CitablePublication = Pick<
  PublicationEntry,
  | "slug"
  | "title"
  | "authors"
  | "type"
  | "venue"
  | "year"
  | "date_online"
  | "volume"
  | "issue"
  | "pages"
  | "doi"
  | "links"
>;

export interface CslItem {
  id: string;
  "citation-key": string;
  type: string;
  title: string;
  author: CslName[];
  issued?: { "date-parts": number[][] };
  "container-title"?: string;
  publisher?: string;
  genre?: string;
  number?: string;
  volume?: string;
  issue?: string;
  page?: string;
  DOI?: string;
  URL?: string;
  /** Becomes BibTeX `note` (required by @unpublished; the arXiv identifier on @misc). */
  note?: string;
}

/** The arXiv identifier ("2603.02055") from an arXiv link or an arXiv DOI. */
export function arxivId(p: Pick<PublicationEntry, "doi" | "links">): string | undefined {
  const fromLink = /arxiv\.org\/(?:abs|pdf)\/([^\s?#]+?)(?:v\d+)?(?:\.pdf)?\/?$/i.exec(
    p.links?.arxiv ?? "",
  )?.[1];
  const fromDoi = /^10\.48550\/arxiv\.(.+)$/i.exec(p.doi ?? "")?.[1];
  return fromLink ?? fromDoi;
}

/** "733-755" → "733–755" (en dash). Article numbers ("e0257530") pass through. */
export function pageRange(pages: string | undefined): string | undefined {
  if (!pages) return undefined;
  return pages.trim().replace(/\s*(?:--|-|–|—)\s*/g, "–");
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "from",
  "in",
  "is",
  "of",
  "on",
  "or",
  "the",
  "to",
  "via",
  "with",
]);

/**
 * Deterministic citation key: first author's family name + year + first
 * significant title word, ASCII only (e.g. "bastani2026improving").
 */
export function citationKey(p: Pick<PublicationEntry, "authors" | "year" | "title">): string {
  const first = p.authors[0] ? splitName(p.authors[0].name) : { family: "anon" };
  const family = asciiKey(first.family) || "anon";
  const word =
    p.title
      .split(/[\s\-–—:;,.!?"'“”‘’()]+/)
      .map(asciiKey)
      .find((w) => w && !STOPWORDS.has(w)) ?? "";
  return `${family}${p.year ?? "nd"}${word}`;
}

/** Split a thesis venue ("Ph.D. dissertation, University of Pennsylvania"). */
function thesisParts(venue: string | undefined): { label?: string; school?: string } {
  if (!venue) return {};
  const m = /^(.*?\b(?:thesis|dissertation))\s*,\s*(.+)$/i.exec(venue);
  if (m) return { label: m[1]!.trim(), school: m[2]!.trim() };
  return { school: venue };
}

/** "SSRN working paper 4502968" → { publisher: "SSRN", number: "4502968" }. */
function workingPaperParts(venue: string | undefined): { publisher?: string; number?: string } {
  if (!venue) return {};
  const m = /^(.+?)\s+working\s+paper(?:\s+(?:no\.?\s*)?([\w.\-/]+))?$/i.exec(venue.trim());
  if (m) return { publisher: m[1]!.trim(), number: m[2] };
  return { publisher: venue.trim() };
}

const isMasters = (label: string | undefined) =>
  !!label && /\b(s\.?\s?m\.?|m\.?\s?s\.?c?\.?|m\.?\s?a\.?|master'?s?)\b/i.test(label);

/**
 * The type word shown for a publication. The schema has no "thesis" type, so a
 * master's thesis is entered as `other` with a thesis venue ("S.M. thesis,
 * Massachusetts Institute of Technology"); the citation already treats it as a
 * thesis (toCsl below), and the page says "Thesis" rather than "Other".
 */
export function typeWord(p: Pick<PublicationEntry, "type" | "venue">): string {
  if (p.type === "other" && thesisParts(p.venue).label) return "Thesis";
  return PUBLICATION_TYPE_LABELS[p.type];
}

/** The best non-DOI link for a reference (publisher page → SSRN → arXiv → PDF). */
export function referenceUrl(p: Pick<PublicationEntry, "doi" | "links">): string | undefined {
  if (p.doi) return undefined;
  const l = p.links ?? {};
  const url = l.publisher ?? l.ssrn ?? l.arxiv ?? l.pdf;
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

/**
 * CSL-JSON for one publication. Type mapping:
 * journal → article-journal; conference → paper-conference; chapter → chapter;
 * dissertation → thesis ("PhD thesis", BibTeX @phdthesis); other + a thesis
 * venue → thesis (master's when the label says so); working-paper with a
 * "<X> working paper <n>" venue → report; arXiv/preprint → document (@misc);
 * anything else → manuscript.
 */
export function toCsl(p: CitablePublication): CslItem {
  const key = citationKey(p);
  const item: CslItem = {
    id: key,
    "citation-key": key,
    type: "manuscript",
    title: p.title,
    author: p.authors.map((a) => splitName(a.name)),
  };
  if (p.year) item.issued = { "date-parts": [[p.year]] };
  const venue = p.venue?.trim();
  // The venue says it is a preprint ("arXiv preprint"), or the DOI is arXiv's.
  // The status never does: a preprint is Work in progress like any working paper.
  const preprint = /\b(?:arxiv|preprint)\b/i.test(venue ?? "") || /^10\.48550\//.test(p.doi ?? "");

  switch (p.type) {
    case "journal":
      item.type = "article-journal";
      if (venue) item["container-title"] = venue;
      break;
    case "conference":
      item.type = "paper-conference";
      if (venue) item["container-title"] = venue;
      break;
    case "chapter":
      item.type = "chapter";
      if (venue) item["container-title"] = venue;
      break;
    case "dissertation": {
      const t = thesisParts(venue);
      item.type = "thesis";
      item.genre = "PhD thesis";
      if (t.school) item.publisher = t.school;
      break;
    }
    case "other": {
      const t = thesisParts(venue);
      if (t.label) {
        item.type = "thesis";
        item.genre = isMasters(t.label) ? "Master's thesis" : "PhD thesis";
        if (t.school) item.publisher = t.school;
      } else {
        item.type = "document";
        if (venue) item.publisher = venue;
      }
      break;
    }
    case "working-paper":
    case "work-in-progress": {
      if (preprint) {
        item.type = "document";
        item.publisher = /\barxiv\b/i.test(venue ?? "") || p.links?.arxiv ? "arXiv" : venue;
        if (!item.publisher) delete item.publisher;
        // BibTeX styles ignore `publisher` on @misc; the note keeps "arXiv:<id>" in the reference.
        const id = arxivId(p);
        if (id) item.note = `arXiv preprint arXiv:${id}`;
      } else if (venue && /working\s+paper/i.test(venue)) {
        const w = workingPaperParts(venue);
        item.type = "report";
        item.genre = "Working paper";
        if (w.publisher) item.publisher = w.publisher;
        if (w.number) item.number = w.number;
      } else {
        item.type = "manuscript";
        item.genre = p.type === "working-paper" ? "Working paper" : "Work in progress";
        // @unpublished requires `note` in BibTeX; bibtex.ts drops the duplicate `type`.
        item.note = item.genre;
        if (venue) item.publisher = venue;
      }
      break;
    }
  }

  if (p.volume) item.volume = p.volume;
  if (p.issue) item.issue = p.issue;
  if (p.pages) item.page = p.pages.trim().replace(/\s*(?:--|–|—)\s*/g, "-");
  if (p.doi) item.DOI = p.doi;
  const url = referenceUrl(p);
  if (url) item.URL = url;
  return item;
}

// ---------------------------------------------------------------------------
// Venue line (brief §D8): "Management Science 2026, 72(1):733–755; online May 22, 2025"

export interface VenueLine {
  /** The journal / venue name (rendered in <cite>). */
  venue?: string;
  /** What follows the venue: "2026, 72(1):733–755" or ", 2026". */
  detail?: string;
  /** "online May 22, 2025" (journals with a date_online). */
  online?: string;
}

export function venueLine(
  p: Pick<
    PublicationEntry,
    "type" | "venue" | "year" | "volume" | "issue" | "pages" | "date_online"
  >,
): VenueLine {
  const venue = p.venue?.trim() || undefined;
  const pages = pageRange(p.pages);
  const isSerial = p.type === "journal" || p.type === "conference" || p.type === "chapter";
  const line: VenueLine = { venue };

  if (isSerial) {
    let detail = p.year ? String(p.year) : "";
    if (p.volume) {
      detail += `${detail ? ", " : ""}${p.volume}${p.issue ? `(${p.issue})` : ""}`;
      if (pages) detail += `:${pages}`;
    } else if (pages) {
      detail += `${detail ? ", " : ""}${pages}`;
    }
    if (detail) line.detail = detail;
    if (p.date_online) line.online = `online ${formatDate(p.date_online)}`;
  } else if (p.year && !(venue && new RegExp(`\\b${p.year}\\b`).test(venue))) {
    // "2026 INFORMS MSOM Conference (presentation)" already names its year.
    line.detail = venue ? `, ${p.year}` : String(p.year);
  }
  return line;
}

/** Plain-text venue line (meta descriptions, tests). */
export function venueText(p: Parameters<typeof venueLine>[0]): string {
  const v = venueLine(p);
  const isSerial = p.type === "journal" || p.type === "conference" || p.type === "chapter";
  const head = [v.venue, v.detail].filter(Boolean).join(isSerial ? " " : "");
  return [head, v.online].filter(Boolean).join("; ");
}
