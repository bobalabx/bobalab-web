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
  const v = process.env.NEXT_PUBLIC_SITE_URL || siteUrl || "https://bobalab-berkeley.github.io";
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

/** Clip a description to ~160 characters on a word boundary. */
export function clipDescription(text: string | undefined, max = 160): string | undefined {
  if (!text) return undefined;
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, t.lastIndexOf(" ", max - 1)).replace(/[,;:.\s]+$/, "") + "…";
}
