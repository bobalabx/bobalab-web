/**
 * Content validator (brief §F3 "Validation" + DECISIONS D-03, D-04, D-05).
 * Runs over ALL content (drafts included) and returns issues. `npm run validate`
 * fails on any error; warnings are printed. Every rule code below has a fixture
 * test in tests/content/rules.test.ts. Codes are listed in docs/ARCHITECTURE.md.
 * Pure (no file system): the editor's site check runs it in the browser too.
 * Links to hidden pages (E_LINK_HIDDEN) are found by ./links.ts.
 */
import { CONFUSABLE_PAIRS } from "./palette";
import { orderDirections } from "./directions";
import { countsAsPublication, relationsOf } from "./relations";
import type { Issue, RawContent } from "./parse";
import { isOnOrAfter, todayInLab } from "./dates";
import { hasLivePage, hiddenLinkIssues } from "./links";
import { siteOrigin } from "@/lib/seo/metadata";
import {
  COLLECTIONS,
  COLLECTION_ROUTES,
  SLUG_PATTERNS,
  type CollectionName,
  type EntryMap,
} from "./schema";

export { hasLivePage };

export interface ValidateOptions {
  /** 'YYYY-MM-DD' in the lab time zone; defaults to today. */
  today?: string;
  /**
   * The site's own origins, for E_LINK_HIDDEN: an absolute link on one of them is
   * a link into the site. Defaults to ownOrigins(site.site_url).
   */
  origins?: string[];
}

/** The site's own origins: the candidates siteOrigin() picks from (env, site_url, the production origin). */
export function ownOrigins(siteUrl?: string): string[] {
  const all = [siteOrigin(siteUrl), siteOrigin(), siteUrl];
  return [...new Set(all.filter((o): o is string => Boolean(o)))];
}

export const MAX_DIRECTIONS = 8;

/**
 * Characters covered by the self-hosted "latin" font subsets (fontsource
 * unicode-range). Anything else falls back to a system font → warning.
 */
const LATIN_SUBSET: Array<[number, number]> = [
  [0x0000, 0x00ff],
  [0x0131, 0x0131],
  [0x0152, 0x0153],
  [0x02bb, 0x02bc],
  [0x02c6, 0x02c6],
  [0x02da, 0x02da],
  [0x02dc, 0x02dc],
  [0x0304, 0x0304],
  [0x0308, 0x0308],
  [0x0329, 0x0329],
  [0x2000, 0x206f],
  [0x20ac, 0x20ac],
  [0x2122, 0x2122],
  [0x2191, 0x2191],
  [0x2193, 0x2193],
  [0x2212, 0x2212],
  [0x2215, 0x2215],
  [0xfeff, 0xfeff],
  [0xfffd, 0xfffd],
];
export function inLatinSubset(cp: number): boolean {
  return LATIN_SUBSET.some(([a, b]) => cp >= a && cp <= b);
}

const normTitle = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function wordCount(s: string): number {
  return s
    .replace(/[#*_>`[\]()-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Walk every string value of an object, yielding [dotted path, value]. */
function* strings(obj: unknown, prefix = ""): Generator<[string, string]> {
  if (typeof obj === "string") {
    yield [prefix, obj];
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++)
      yield* strings(obj[i], prefix ? `${prefix}.${i}` : String(i));
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (k === "slug" || k === "file") continue;
      yield* strings(v, prefix ? `${prefix}.${k}` : k);
    }
  }
}

type AnyEntry = EntryMap[CollectionName];

export function validateContent(raw: RawContent, opts: ValidateOptions = {}): Issue[] {
  const today = opts.today ?? todayInLab();
  const issues: Issue[] = [...raw.issues];
  const err = (code: string, message: string, file?: string, field?: string) =>
    issues.push({ severity: "error", code, message, file, field });
  const warn = (code: string, message: string, file?: string, field?: string) =>
    issues.push({ severity: "warning", code, message, file, field });

  const E = raw.entries;
  const index = Object.fromEntries(
    COLLECTIONS.map((c) => [
      c,
      new Map<string, AnyEntry>((E[c] as AnyEntry[]).map((e) => [e.slug, e])),
    ]),
  ) as Record<CollectionName, Map<string, AnyEntry>>;

  // --- site.yml ------------------------------------------------------------
  const anyContent = COLLECTIONS.some((c) => E[c].length > 0) || Object.keys(raw.pages).length > 0;
  const siteFailed = raw.issues.some((i) => i.file === "site.yml");
  if (!raw.site && !siteFailed && anyContent) {
    err("E_SITE_MISSING", "content/site.yml is missing", "site.yml");
  }
  const site = raw.site;

  // --- slugs ---------------------------------------------------------------
  for (const c of COLLECTIONS) {
    const pat = SLUG_PATTERNS[c];
    for (const e of E[c] as AnyEntry[]) {
      if (!pat.re.test(e.slug) || e.slug.length > pat.max) {
        err("E_SLUG", `slug "${e.slug}" must match ${pat.hint} (≤ ${pat.max} chars)`, e.file);
      }
    }
  }
  for (const n of E.news) {
    const prefix = n.slug.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(prefix) && prefix !== n.date.slice(0, 10)) {
      err(
        "E_NEWS_SLUG_DATE",
        `slug date ${prefix} differs from date ${n.date.slice(0, 10)}`,
        n.file,
        "date",
      );
    }
  }

  // --- relations -----------------------------------------------------------
  for (const c of COLLECTIONS) {
    for (const e of E[c] as AnyEntry[]) {
      for (const ref of relationsOf(c, e as never)) {
        const target = index[ref.target].get(ref.slug);
        if (!target) {
          err(
            "E_RELATION",
            `${ref.field} → ${ref.target}/${ref.slug} does not exist`,
            e.file,
            ref.field,
          );
          continue;
        }
        if (!e.draft && target.draft) {
          warn(
            "W_DRAFT_REFERENCE",
            `${ref.field} → ${ref.target}/${ref.slug} is a draft; it will be hidden or unlinked in production`,
            e.file,
            ref.field,
          );
        }
        if (ref.target === "people" && (target as EntryMap["people"]).listed === false) {
          warn(
            "W_UNLISTED_REFERENCED",
            `${ref.field} → people/${ref.slug} has listed: false; the name is shown without a link or profile`,
            e.file,
            ref.field,
          );
        }
      }
    }
  }
  if (raw.pages.home) {
    raw.pages.home.featured_findings.forEach((f, i) => {
      if (f.publication && !index.publications.has(f.publication))
        err(
          "E_RELATION",
          `featured_findings.${i}.publication → publications/${f.publication} does not exist`,
          "pages/home.yml",
        );
      if (f.direction && !index.directions.has(f.direction))
        err(
          "E_RELATION",
          `featured_findings.${i}.direction → directions/${f.direction} does not exist`,
          "pages/home.yml",
        );
    });
  }

  // --- https URLs ------------------------------------------------------------
  const checkHttp = (obj: unknown, file: string) => {
    for (const [field, v] of strings(obj)) {
      if (/^http:\/\//i.test(v.trim())) err("E_HTTP_URL", `URL must use https: ${v}`, file, field);
    }
  };
  for (const c of COLLECTIONS)
    for (const e of E[c] as AnyEntry[]) checkHttp({ ...e, body: undefined }, e.file);
  if (site) checkHttp(site, "site.yml");

  // --- images need alt -------------------------------------------------------
  const needAlt = (
    img: { image?: string; alt?: string } | undefined,
    file: string,
    field: string,
  ) => {
    if (img?.image && !img.alt?.trim())
      err("E_ALT_MISSING", `${field}.image is set but ${field}.alt is empty`, file, `${field}.alt`);
  };
  for (const d of E.directions) needAlt(d.figure, d.file, "figure");
  for (const p of E.projects) needAlt(p.hero, p.file, "hero");
  for (const p of E.publications) needAlt(p.teaser, p.file, "teaser");
  for (const n of E.news) needAlt(n.image, n.file, "image");
  for (const p of E.people) {
    if (p.photo && !p.photo_alt?.trim())
      err("E_ALT_MISSING", "photo is set but photo_alt is empty", p.file, "photo_alt");
  }

  // --- consent (rendering is gated; warn so editors know why it is hidden) ---
  for (const p of E.people) {
    if (p.photo && !p.photo_consent)
      warn(
        "W_CONSENT_PHOTO",
        "photo is set but photo_consent is false: no page shows it, but the uploaded file is still published at its /uploads/ address; remove the photo (and the file) until the person agrees in writing",
        p.file,
        "photo_consent",
      );
    if (p.email && !p.email_public)
      warn(
        "W_CONSENT_EMAIL",
        "email is set but email_public is false; the email will not be shown",
        p.file,
        "email_public",
      );
    if (p.now_at && !p.now_at_public)
      warn(
        "W_CONSENT_NOW_AT",
        "now_at is set but now_at_public is false; it will not be shown",
        p.file,
        "now_at_public",
      );
  }

  // --- publications ------------------------------------------------------------
  const dois = new Map<string, string>();
  const titles = new Map<string, string>();
  for (const p of E.publications) {
    if (p.doi) {
      const k = p.doi.toLowerCase();
      const prev = dois.get(k);
      if (prev) err("E_DUP_DOI", `DOI ${p.doi} is also used by ${prev}`, p.file, "doi");
      else dois.set(k, p.file);
    }
    const t = normTitle(p.title);
    const prevT = titles.get(t);
    if (prevT) err("E_DUP_TITLE", `title duplicates ${prevT}`, p.file, "title");
    else titles.set(t, p.file);

    // Work in progress, Under review and Under revision are dated and sourced.
    if (p.status !== "published") {
      if (!p.as_of)
        err("E_AS_OF_MISSING", `status "${p.status}" needs an as_of date`, p.file, "as_of");
      if (!p.status_source)
        err(
          "E_STATUS_SOURCE_MISSING",
          `status "${p.status}" needs status_source (documented | self-reported)`,
          p.file,
          "status_source",
        );
    }
    if (countsAsPublication(p) && p.year === undefined) {
      err("E_YEAR_MISSING", "a publication with a public version needs a year", p.file, "year");
    }
    if (p.directions.length === 0 && p.type !== "work-in-progress") {
      if (p.draft)
        warn(
          "W_DIRECTIONS_EMPTY",
          "no directions (draft; required before publishing)",
          p.file,
          "directions",
        );
      else
        err(
          "E_DIRECTIONS_EMPTY",
          "a published item needs at least one direction",
          p.file,
          "directions",
        );
    }
  }
  for (const p of E.projects) {
    if (p.directions.length === 0 && p.status !== "archived") {
      if (p.draft)
        warn(
          "W_DIRECTIONS_EMPTY",
          "no directions (draft; required before publishing)",
          p.file,
          "directions",
        );
      else
        err(
          "E_DIRECTIONS_EMPTY",
          "a published project needs at least one direction (first = primary)",
          p.file,
          "directions",
        );
    }
  }

  // --- directions: count, order, colours (D-03, D-04, §E9) -----------------------
  const prodLive = E.directions.filter((d) => !d.draft && d.status !== "archived");
  const n = prodLive.length;
  if (n === 0) {
    if (site?.launched)
      err(
        "E_DIR_COUNT_ZERO",
        "0 non-draft directions after launch (site.launched is true)",
        "site.yml",
        "launched",
      );
    else
      warn(
        "W_DIR_COUNT_ZERO",
        "0 non-draft directions; the home page shows 'Research directions coming soon' (becomes an error once site.launched is true)",
        "site.yml",
        "launched",
      );
  } else if (n > MAX_DIRECTIONS) {
    err(
      "E_DIR_COUNT_MAX",
      `Group directions (max ${MAX_DIRECTIONS}); found ${n}`,
      "site.yml",
      "direction_order",
    );
  } else if (n >= 7) {
    warn(
      "W_DIR_COUNT_HIGH",
      `${n} directions: Fig. 1 gets tall (one lane per direction); consider grouping directions and rerun the five-second test`,
      "site.yml",
      "direction_order",
    );
  }

  const order = orderDirections(
    E.directions,
    site?.direction_order ?? [],
    E.directions.map((d) => d.slug),
  );
  for (const s of order.duplicates)
    err(
      "E_DIR_ORDER_DUP",
      `direction_order lists "${s}" more than once`,
      "site.yml",
      "direction_order",
    );
  for (const s of order.unknown)
    err(
      "E_DIR_ORDER_UNKNOWN",
      `direction_order lists "${s}", which has no file in directions/`,
      "site.yml",
      "direction_order",
    );
  for (const s of order.missing)
    warn(
      "W_DIR_ORDER_MISSING",
      `direction "${s}" is not in direction_order; it is appended at the end`,
      "site.yml",
      "direction_order",
    );
  for (const s of order.listedArchived)
    warn(
      "W_DIR_ORDER_ARCHIVED",
      `direction_order lists archived direction "${s}"; it is ignored`,
      "site.yml",
      "direction_order",
    );

  const colourSet = order.live; // live in preview (drafts included)
  const byColour = new Map<string, string[]>();
  for (const d of colourSet) byColour.set(d.color, [...(byColour.get(d.color) ?? []), d.slug]);
  for (const [color, slugs] of byColour) {
    if (slugs.length > 1) {
      // Each pearl needs its own colour (EDITING §6); the CMS already refuses it.
      if (site?.launched)
        err(
          "E_COLOR_DUP",
          `colour ${color} is used by ${slugs.join(", ")} (site.launched is true)`,
          `directions/${slugs[1]}.md`,
          "color",
        );
      else
        warn(
          "W_COLOR_DUP",
          `colour ${color} is used by ${slugs.join(", ")} (becomes an error once site.launched is true)`,
          `directions/${slugs[1]}.md`,
          "color",
        );
    }
  }
  for (const [a, b, why] of CONFUSABLE_PAIRS) {
    if (byColour.has(a) && byColour.has(b))
      warn(
        "W_COLOR_CONFUSABLE",
        `${a} and ${b} are confusable for colour-blind viewers (${why}); numbers and labels still carry the meaning`,
        `directions/${byColour.get(a)![0]}.md`,
        "color",
      );
  }
  for (const d of E.directions) {
    if (d.status === "archived" && !d.archived_on)
      warn(
        "W_ARCHIVED_NO_DATE",
        "archived direction needs archived_on for its dated 'Archived' note",
        d.file,
        "archived_on",
      );
    if (!d.draft && d.status !== "archived") {
      const wc = wordCount(d.body);
      if (wc < 80 || wc > 150)
        warn("W_BODY_LENGTH", `body has ${wc} words; aim for 80–150`, d.file, "body");
    }
  }

  // --- opportunities -------------------------------------------------------------
  for (const o of E.opportunities) {
    if (!o.url && !o.apply_url && !o.email && !o.route)
      warn(
        "W_OPP_NO_ROUTE",
        "no route, url, apply_url or email: visitors cannot act on it",
        o.file,
      );
    if (
      (o.status === "open" || o.status === "rolling") &&
      o.closes_on &&
      !isOnOrAfter(o.closes_on, today)
    )
      warn(
        "W_OPP_CLOSED_PAST",
        `status is ${o.status} but closes_on ${o.closes_on} has passed; it is treated as closed`,
        o.file,
        "closes_on",
      );
  }

  // --- character coverage --------------------------------------------------------
  for (const f of raw.files) {
    if (f.path.endsWith(".json")) continue;
    const bad = new Set<string>();
    for (const ch of f.text) {
      const cp = ch.codePointAt(0)!;
      if (!inLatinSubset(cp)) bad.add(ch);
    }
    if (bad.size)
      warn(
        "W_NON_LATIN1",
        `characters outside the loaded latin font subset fall back to system fonts: ${[...bad]
          .slice(0, 12)
          .map((c) => `${c} U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`)
          .join(", ")}`,
        f.path,
      );
  }

  // --- redirects (D-05) ------------------------------------------------------------
  const redirects = site?.redirects ?? [];
  const froms = new Set<string>();
  const livePaths = new Set<string>();
  for (const c of COLLECTIONS) {
    const route = COLLECTION_ROUTES[c];
    if (!route) continue;
    for (const e of E[c] as AnyEntry[]) if (hasLivePage(c, e)) livePaths.add(route(e.slug));
  }
  for (const r of redirects) {
    if (froms.has(r.from))
      err("E_REDIRECT_DUP", `redirect from ${r.from} is listed twice`, "site.yml", "redirects");
    froms.add(r.from);
    if (livePaths.has(r.from))
      err(
        "E_REDIRECT_CONFLICT",
        `redirect from ${r.from} would replace a live page`,
        "site.yml",
        "redirects",
      );
  }
  // A published page whose entry is GONE needs a redirect (E_REDIRECT_MISSING).
  // One whose entry still exists but is hidden (Draft on, Listed off, no profile
  // page) needs none: the entry can come back, and hiding is the lab's privacy
  // action, so it is a warning on the entry itself (D-05 amendment).
  if (raw.publishedSlugs) {
    for (const c of COLLECTIONS) {
      const route = COLLECTION_ROUTES[c];
      if (!route) continue;
      for (const slug of raw.publishedSlugs[c] ?? []) {
        const e = index[c].get(slug);
        if (e && hasLivePage(c, e)) continue;
        const from = route(slug);
        if (froms.has(from)) continue;
        if (e) {
          const p = c === "people" ? (e as EntryMap["people"]) : null;
          warn(
            "W_PUBLISHED_HIDDEN",
            `${from} was on the live site and is now hidden; visitors get “Page not found” there.`,
            e.file,
            e.draft ? "draft" : p && !p.listed ? "listed" : p ? "profile_page" : undefined,
          );
          continue;
        }
        err(
          "E_REDIRECT_MISSING",
          `${from} was published but no longer exists; add site.redirects {from: "${from}", to: …} (or restore it)`,
          "site.yml",
          "redirects",
        );
      }
    }
  }

  // --- links to pages that are not on the live site (export-check's rule) -----------
  issues.push(...hiddenLinkIssues(raw, { origins: opts.origins ?? ownOrigins(site?.site_url) }));

  return issues;
}

export function summarize(issues: Issue[]): { errors: Issue[]; warnings: Issue[] } {
  return {
    errors: issues.filter((i) => i.severity === "error"),
    warnings: issues.filter((i) => i.severity === "warning"),
  };
}

export function formatIssue(i: Issue): string {
  const where = [i.file, i.field].filter(Boolean).join(" › ");
  return `${i.severity === "error" ? "ERROR" : "warn "} ${i.code.padEnd(24)} ${where ? where + ": " : ""}${i.message}`;
}
