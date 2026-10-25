/**
 * Metadata helpers (brief §G3). Pages call `pageMetadata()` from
 * `generateMetadata` / `export const metadata`.
 */
import type { Metadata } from "next";

export const SITE_TITLE_HOME =
  "BOBALAB · Berkeley Operations and Behavioral Analytics Lab, Berkeley Haas";
export const TITLE_TEMPLATE = "%s · BOBALAB";
export const DEFAULT_DESCRIPTION =
  "BOBALAB, the Berkeley Operations and Behavioral Analytics Lab at the Haas School of Business, University of California, Berkeley.";
export const OG_IMAGE = {
  url: "/brand/og-default.png",
  width: 1200,
  height: 630,
  alt: "BOBALAB wordmark",
};

/**
 * RSS discovery on every page (brief §D10/§G3; WP5 request 6). Relative, so it
 * resolves against `metadataBase` (which carries the base path). Pages that set
 * `alternates` replace the layout's object, so pageMetadata() merges it too.
 */
export const FEED_ALTERNATE_TYPES = {
  "application/rss+xml": [{ url: "news/feed.xml", title: "BOBALAB news" }],
};

/** Canonical origin: NEXT_PUBLIC_SITE_URL → site.yml site_url → the planned GitHub Pages origin. */
export function siteOrigin(siteUrl?: string): string {
  const v = process.env.NEXT_PUBLIC_SITE_URL || siteUrl || "https://bobalabx.github.io";
  return v.replace(/\/+$/, "");
}

/** metadataBase must include the base path so relative canonicals resolve correctly. */
export function metadataBase(siteUrl?: string): URL {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return new URL(`${siteOrigin(siteUrl)}${base}/`);
}

export interface PageMetaInput {
  /** Page title without the " · BOBALAB" suffix. */
  title: string;
  description?: string;
  /** Site path with trailing slash, e.g. "/research/ai-at-work/". */
  path: string;
  /** Override the shared OG still (1200×630 PNG under /public). */
  image?: string;
  /** e.g. noindex for drafts or unlisted pages. */
  noindex?: boolean;
  type?: "website" | "article" | "profile";
  /** Extra <meta name=…> (e.g. Google Scholar citation_* from scholar.ts). */
  other?: Metadata["other"];
}

export function pageMetadata(input: PageMetaInput): Metadata {
  const description = input.description?.trim() || DEFAULT_DESCRIPTION;
  const url = input.path.replace(/^\/+/, "");
  const images = [input.image ? { url: input.image, width: 1200, height: 630 } : OG_IMAGE];
  return {
    title: input.title,
    description,
    alternates: { canonical: url || "./", types: FEED_ALTERNATE_TYPES },
    openGraph: {
      type: input.type ?? "website",
      siteName: "BOBALAB",
      title: input.title,
      description,
      url: url || "./",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: images.map((i) => i.url),
    },
    robots: input.noindex ? { index: false, follow: true } : undefined,
    other: input.other,
  };
}

/** A first sentence up to this long is kept whole rather than cut mid-phrase. */
const SENTENCE_MAX = 240;

/** Words whose full stop does not end a sentence ("Prof. Park", "Planning vs. Execution"). */
const ABBREVIATIONS = new Set([
  "prof",
  "dr",
  "mr",
  "mrs",
  "ms",
  "vs",
  "st",
  "jr",
  "sr",
  "inc",
  "no",
]);

/**
 * Split plain text into sentences at ". ", "! " or "? " followed by a capital,
 * except after an abbreviation, an initial ("Earl F. Cheit") or a dotted
 * abbreviation ("S.M. thesis", "Ph.D.").
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  const re = /[.!?]+["”’)]*(?=\s+["“(]?[A-Z])/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const word = /([\p{L}.]+)$/u.exec(text.slice(start, m.index))?.[1] ?? "";
    const bare = word.replace(/\.$/, "");
    if (
      m[0].startsWith(".") &&
      (ABBREVIATIONS.has(bare.toLowerCase()) || /^\p{L}$/u.test(bare) || bare.includes("."))
    )
      continue;
    const end = m.index + m[0].length;
    out.push(text.slice(start, end).trim());
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/**
 * A meta description from lab copy: as many whole sentences as fit in ~160
 * characters, so search snippets never end mid-word with "…" (copy sweep).
 * A first sentence that is longer is kept whole up to SENTENCE_MAX; only a
 * longer one is clipped on a word boundary.
 */
export function clipDescription(text: string | undefined, max = 160): string | undefined {
  if (!text) return undefined;
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const sentences = splitSentences(t);
  let out = "";
  for (const s of sentences) {
    const next = `${out}${out ? " " : ""}${s.trim()}`;
    if (next.length > max) break;
    out = next;
  }
  if (out) return out;
  const first = sentences[0]!.trim();
  if (first.length <= SENTENCE_MAX) return first;
  return t.slice(0, t.lastIndexOf(" ", max - 1)).replace(/[,;:.\s]+$/, "") + "…";
}

/**
 * The lab in a few words for meta descriptions: "BOBALAB, Park Sinchaisri’s lab
 * at Berkeley Haas" (the PI and the school from content, never hard-coded).
 */
export function labTagline(
  site: { name: string; affiliation_text: string },
  piName?: string,
): string {
  const at = schoolName(site);
  return piName ? `${site.name}, ${piName}’s lab at ${at}` : `${site.name} at ${at}`;
}

/** "Berkeley Haas" for the Haas School of Business (site.yml affiliation), else the affiliation. */
export function schoolName(site: { affiliation_text: string }): string {
  return /\bHaas\b/.test(site.affiliation_text) ? "Berkeley Haas" : site.affiliation_text;
}
