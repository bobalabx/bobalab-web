/**
 * RSS 2.0 feed for /news/feed.xml (brief §D10, §G3, §G5 "RSS XML").
 *
 * Pure: takes the loaded Content and returns the XML string, so the route
 * handler stays tiny and tests/unit/feed can check the output without Next.
 *
 * - Required channel elements: title, link, description (RSS 2.0 spec).
 * - Every item has title, link, guid (permalink), pubDate (RFC 822) and description.
 * - Absolute URLs come from site.site_url / NEXT_PUBLIC_SITE_URL plus the base path,
 *   including site-relative links and images inside item HTML (absolutizeHtml).
 * - Date-only values are dated at 12:00 in the lab's time zone, so the calendar
 *   day matches the site in every reader time zone between UTC-12 and UTC+11.
 * - Preview builds include drafts (D-03); their titles are prefixed "[Draft]".
 */
import type { Content, NewsView } from "@/lib/content/load";
import { absoluteUrl } from "@/lib/seo/jsonld";
import { markdownToHtml } from "@/lib/content/markdoc";
import { buildDate, formatDate, LAB_TIME_ZONE } from "@/lib/content/dates";
import { NEWS_TYPE_LABELS } from "@/components/ui/labels";

export const FEED_PATH = "/news/feed.xml";
export const FEED_MAX_ITEMS = 50;

// ---------------------------------------------------------------------------
// XML helpers

/** Drop code points that XML 1.0 forbids (C0 controls except tab/LF/CR, U+FFFE/FFFF, lone surrogates). */
export function stripInvalidXmlChars(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    const ok =
      c === 0x9 ||
      c === 0xa ||
      c === 0xd ||
      (c >= 0x20 && c <= 0xd7ff) ||
      (c >= 0xe000 && c <= 0xfffd) ||
      (c >= 0x10000 && c <= 0x10ffff);
    if (ok) out += ch;
  }
  return out;
}

/**
 * Escape text for an XML element or attribute value. The apostrophe uses a
 * numeric reference (&#39;): readers that treat <description> as HTML 4 do
 * not know &apos;.
 */
export function xmlEscape(s: string): string {
  return stripInvalidXmlChars(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Feed readers resolve relative links against the feed, not the page, so
 * site-relative href/src values ("/publications/x/", "/uploads/y.webp") in
 * item HTML become absolute URLs (origin + base path). Other values (external
 * URLs, "#anchors", "mailto:", protocol-relative "//host") are left alone.
 */
export function absolutizeHtml(html: string, siteUrl?: string): string {
  // absoluteUrl() adds the base path; do not add it twice if the HTML already has it.
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const strip = (p: string) =>
    base && (p === base || p.startsWith(`${base}/`)) ? p.slice(base.length) || "/" : p;
  return html.replace(
    /(\s(?:href|src)=")(\/(?!\/)[^"]*)"/g,
    (_m, attr: string, p: string) => `${attr}${absoluteUrl(strip(p), siteUrl)}"`,
  );
}

/** Wrap HTML in CDATA; a literal "]]>" inside is split across two sections. */
export function cdata(s: string): string {
  return `<![CDATA[${stripInvalidXmlChars(s).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

// ---------------------------------------------------------------------------
// Dates

/** UTC offset of the lab's time zone at an instant, in minutes (e.g. -420 for PDT). */
function labOffsetMinutes(at: Date): number {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: LAB_TIME_ZONE, timeZoneName: "longOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(name);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** A wall-clock time in America/Los_Angeles → the UTC instant. */
function fromLabWallClock(y: number, mo: number, d: number, h: number, mi: number, s: number) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let t = guess - labOffsetMinutes(new Date(guess)) * 60_000;
  // Re-check once near DST switches.
  t = guess - labOffsetMinutes(new Date(t)) * 60_000;
  return new Date(t);
}

const DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Content date ('YYYY-MM-DD' or ISO date-time) → instant.
 * Date only → 12:00 lab time; date-time without zone → lab wall clock; with zone → as given.
 */
export function contentDateToInstant(value: string): Date | null {
  const m = DATE_TIME.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, zone] = m;
  if (h === undefined) return fromLabWallClock(+y!, +mo!, +d!, 12, 0, 0);
  if (zone) {
    const z = zone === "Z" ? "Z" : zone.replace(/^([+-]\d{2})(\d{2})$/, "$1:$2");
    const t = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s ?? "00"}${z}`);
    return Number.isNaN(t.getTime()) ? null : t;
  }
  return fromLabWallClock(+y!, +mo!, +d!, +h!, +mi!, +(s ?? 0));
}

/** RFC 822 date as used by RSS 2.0, e.g. "Tue, 20 Oct 2026 19:00:00 GMT". */
export function rfc822(date: Date): string {
  return date.toUTCString();
}

// ---------------------------------------------------------------------------
// Feed

export interface FeedOptions {
  /** Instant used for lastBuildDate (defaults to the build date; BUILD_DATE pins it). */
  now?: Date;
  limit?: number;
}

function itemDescription(n: NewsView): string {
  const parts: string[] = [];
  if (n.summary) parts.push(n.summary);
  if (n.event_date) {
    const when = formatDate(n.event_date);
    parts.push(`Event: ${when}${n.location ? `, ${n.location}` : ""}.`);
  }
  return parts.join(" ");
}

function renderItem(n: NewsView, c: Content): string {
  const url = absoluteUrl(`/news/${n.slug}/`, c.site.site_url);
  const pub = contentDateToInstant(n.date);
  const title = `${c.preview && n.draft ? "[Draft] " : ""}${n.title}`;
  const lines = [
    "    <item>",
    `      <title>${xmlEscape(title)}</title>`,
    `      <link>${xmlEscape(url)}</link>`,
    `      <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
    pub ? `      <pubDate>${rfc822(pub)}</pubDate>` : null,
    `      <category>${xmlEscape(NEWS_TYPE_LABELS[n.type])}</category>`,
    ...n.directionRefs.map((d) => `      <category>${xmlEscape(d.title)}</category>`),
    `      <description>${xmlEscape(itemDescription(n) || n.title)}</description>`,
    n.body.trim()
      ? `      <content:encoded>${cdata(absolutizeHtml(markdownToHtml(n.body), c.site.site_url))}</content:encoded>`
      : null,
    "    </item>",
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}

/** The whole feed document (UTF-8, RSS 2.0 with the atom:link self reference). */
export function buildRssFeed(c: Content, opts: FeedOptions = {}): string {
  const { site } = c;
  const now = opts.now ?? buildDate();
  const items = c.news.slice(0, opts.limit ?? FEED_MAX_ITEMS);
  const newsUrl = absoluteUrl("/news/", site.site_url);
  const selfUrl = absoluteUrl(FEED_PATH, site.site_url);
  const description = `News from ${site.name}, the ${site.long_name} at the ${site.affiliation_text}.`;
  const newest = items[0] ? contentDateToInstant(items[0].date) : null;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    "  <channel>",
    `    <title>${xmlEscape(`${site.name} news`)}</title>`,
    `    <link>${xmlEscape(newsUrl)}</link>`,
    `    <description>${xmlEscape(description)}</description>`,
    "    <language>en-us</language>",
    newest ? `    <pubDate>${rfc822(newest)}</pubDate>` : null,
    `    <lastBuildDate>${rfc822(now)}</lastBuildDate>`,
    `    <atom:link href="${xmlEscape(selfUrl)}" rel="self" type="application/rss+xml"/>`,
    ...items.map((n) => renderItem(n, c)),
    "  </channel>",
    "</rss>",
    "",
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}
