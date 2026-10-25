/**
 * Content schema (brief §F3 + DECISIONS D-03…D-06).
 *
 * One zod schema per collection. Schemas are STRUCTURAL: they must hold for
 * every file, drafts included, because preview builds render drafts.
 * Publish-readiness rules (relations, counts, consent, launch gating, …) live
 * in ./validate.ts and run in `npm run validate`.
 *
 * Files: content/{directions,projects,publications,people,news,opportunities}/<slug>.md
 *        (YAML front matter + Markdown body), content/pages/<page>.yml, content/site.yml.
 * The slug is the file name; it is not a field.
 * docs/CONTENT-MAPPING.md maps the research dataset onto these fields.
 */
import { z } from "zod";
import { SWATCH_IDS } from "./palette";

// ---------------------------------------------------------------------------
// Shared field types

/** Absolute http(s) URL, or a site-relative path ("/uploads/…"). The validator
 *  rejects http:// (E_HTTP_URL); the schema accepts it so the error is specific.
 *  A protocol-relative "//host/x" (or "/\host", which browsers read the same way)
 *  is NOT a site path: withBasePath() and Markdoc leave it alone, so it would
 *  link (or redirect) off-site (verify ENG-06). */
export const urlField = z
  .string()
  .trim()
  .refine((v) => /^https?:\/\/[^\s]+$/i.test(v) || /^\/(?![/\\])[^\s]*$/.test(v), {
    message: "must be an https:// URL or a site path starting with /",
  });

/** External link only (no site paths). */
export const externalUrlField = z
  .string()
  .trim()
  .refine((v) => /^https?:\/\/[^\s]+$/i.test(v), { message: "must be an https:// URL" });

const asString = (v: unknown) => (typeof v === "number" ? String(v) : v);

/** 'YYYY-MM-DD' (YAML numbers are not dates; dates stay strings in YAML 1.2). */
export const isoDate = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "must be a date YYYY-MM-DD");

/** 'YYYY-MM-DD' or a full ISO date-time ('2026-10-20T15:00', optional seconds/zone). */
export const isoDateOrDateTime = z
  .string()
  .regex(
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])([T ]([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/,
    "must be YYYY-MM-DD or an ISO date-time",
  );

/** 'YYYY' or 'YYYY-MM' (people start/end). Bare YAML years (numbers) are accepted. */
export const yearMonth = z.preprocess(
  asString,
  z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, "must be YYYY or YYYY-MM"),
);

/** 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD' (as_of, archived_on, date_online). */
export const partialDate = z.preprocess(
  asString,
  z
    .string()
    .regex(
      /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/,
      "must be YYYY, YYYY-MM or YYYY-MM-DD",
    ),
);

const nextYear = new Date().getFullYear() + 1;
export const yearField = z
  .number()
  .int()
  .min(1990, "year must be 1990 or later")
  .max(nextYear, `year must be ${nextYear} or earlier`);

export const slugRef = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be a kebab-case slug");

export const draftField = z.boolean().default(false);
export const bodyField = z.string().default("");

export const swatchField = z.enum(SWATCH_IDS);

/** Image object: `alt` is required whenever `image` is set (validator E_ALT_MISSING). */
export const imageObject = z.strictObject({
  image: urlField.optional(),
  alt: z.string().trim().max(300).optional(),
  caption: z.string().max(400).optional(),
});

export const evidenceLevel = z.enum(["published", "working-paper", "preliminary"]);

// ---------------------------------------------------------------------------
// directions

export const DIRECTION_STATUS = ["active", "emerging", "archived"] as const;

export const directionSchema = z.strictObject({
  title: z.string().trim().min(1).max(90),
  short_label: z
    .string()
    .trim()
    .min(1)
    .max(28)
    .regex(/^[^\r\n<>]+$/, "one line, no angle brackets"),
  question: z.string().trim().max(140).optional(),
  summary: z.string().trim().max(160).optional(),
  color: swatchField,
  active_since: yearField.optional(),
  status: z.enum(DIRECTION_STATUS).default("active"),
  archived_on: partialDate.optional(),
  open_to_collaborators: z.boolean().default(false),
  methods: z.array(z.string().trim().min(1).max(40)).max(6).default([]),
  findings: z
    .array(
      z.strictObject({
        text: z.string().trim().min(1).max(240),
        publication: slugRef.optional(),
        evidence: evidenceLevel,
      }),
    )
    .max(4)
    .default([]),
  figure: imageObject.extend({ what_this_shows: z.string().max(600).optional() }).optional(),
  draft: draftField,
  body: bodyField,
});

// ---------------------------------------------------------------------------
// projects

export const PROJECT_STATUS = ["active", "completed", "paused", "archived"] as const;
export const OUTPUT_TYPES = [
  "paper",
  "working-paper",
  "slides",
  "code",
  "data",
  "talk",
  "press",
  "other",
] as const;

export const projectSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().max(200).optional(),
    directions: z.array(slugRef).default([]),
    status: z.enum(PROJECT_STATUS),
    start_year: yearField.optional(),
    end_year: yearField.optional(),
    team: z.array(slugRef).default([]),
    collaborators: z
      .array(
        z.strictObject({
          name: z.string().trim().min(1),
          affiliation: z.string().trim().optional(),
          url: externalUrlField.optional(),
          consent: z.boolean().default(false),
        }),
      )
      .default([]),
    partners: z
      .array(
        z.strictObject({
          name: z.string().trim().min(1),
          url: externalUrlField.optional(),
          public: z.boolean().default(false),
        }),
      )
      .default([]),
    outputs: z
      .array(
        z.strictObject({
          type: z.enum(OUTPUT_TYPES),
          label: z.string().trim().min(1).max(80),
          url: urlField,
        }),
      )
      .default([]),
    publications: z.array(slugRef).default([]),
    funding: z
      .array(z.strictObject({ name: z.string().trim().min(1), url: externalUrlField.optional() }))
      .default([]),
    hero: imageObject.optional(),
    draft: draftField,
    body: bodyField,
  })
  .refine((p) => !p.start_year || !p.end_year || p.end_year >= p.start_year, {
    message: "end_year must be ≥ start_year",
    path: ["end_year"],
  });

// ---------------------------------------------------------------------------
// publications

export const PUBLICATION_TYPES = [
  "journal",
  "working-paper",
  "conference",
  "chapter",
  "dissertation",
  "work-in-progress",
  "other",
] as const;

export const PUBLICATION_STATUS = [
  "published",
  "forthcoming",
  "accepted",
  "major-revision",
  "revise-resubmit",
  "submitted",
  "working-paper",
  "preprint",
  "in-progress",
] as const;

export const DOI_PATTERN = /^10\.\d{4,9}\/\S+$/;

export const publicationLinks = z
  .strictObject({
    pdf: urlField.optional(),
    ssrn: externalUrlField.optional(),
    arxiv: externalUrlField.optional(),
    publisher: externalUrlField.optional(),
    code: externalUrlField.optional(),
    data: urlField.optional(),
    slides: urlField.optional(),
    video: externalUrlField.optional(),
  })
  .default({});

export const authorSchema = z.strictObject({
  name: z.string().trim().min(1),
  /** Slug of a lab person (PI, member, alumni). External coauthors have no `person` (D-05). */
  person: slugRef.optional(),
  /** Optional public page for an external coauthor. */
  url: externalUrlField.optional(),
});

export const publicationSchema = z.strictObject({
  title: z.string().trim().min(1).max(300),
  authors: z.array(authorSchema).min(1),
  type: z.enum(PUBLICATION_TYPES),
  venue: z.string().trim().optional(),
  year: yearField.optional(),
  date_online: partialDate.optional(),
  volume: z.preprocess(asString, z.string()).optional(),
  issue: z.preprocess(asString, z.string()).optional(),
  pages: z.preprocess(asString, z.string()).optional(),
  doi: z.string().trim().regex(DOI_PATTERN, "DOI must look like 10.xxxx/…").optional(),
  status: z.enum(PUBLICATION_STATUS),
  /** e.g. "at Manufacturing & Service Operations Management, 2nd round". */
  status_note: z.string().trim().max(200).optional(),
  status_source: z.enum(["documented", "self-reported"]).optional(),
  /** Required unless status is "published" (validator E_AS_OF_MISSING). */
  as_of: partialDate.optional(),
  links: publicationLinks,
  /**
   * Presentations. `url` = independent evidence (programme page, recording).
   * One with a `url` counts as a public version (D-05). PI-reported talks
   * without independent evidence are entered without `url` and do not count.
   */
  presentations: z
    .array(
      z.strictObject({
        event: z.string().trim().min(1).max(200),
        year: yearField.optional(),
        url: externalUrlField.optional(),
      }),
    )
    .default([]),
  press: z
    .array(
      z.strictObject({
        outlet: z.string().trim().min(1),
        url: externalUrlField,
        date: partialDate.optional(),
      }),
    )
    .default([]),
  awards: z
    .array(
      z.strictObject({
        name: z.string().trim().min(1),
        year: yearField,
        under_title: z.string().trim().optional(),
        /**
         * "self-reported": known only from the PI's CV or site, not from the
         * awarding body (CON-03, D11). Shown as "reported by the lab".
         */
        source: z.enum(["documented", "self-reported"]).optional(),
      }),
    )
    .default([]),
  directions: z.array(slugRef).default([]),
  in_brief: z.string().trim().max(400).optional(),
  teaser: imageObject.optional(),
  featured: z.boolean().default(false),
  bibtex_override: z.string().optional(),
  draft: draftField,
  body: bodyField,
});

// ---------------------------------------------------------------------------
// people

export const PERSON_ROLES = [
  "pi",
  "postdoc",
  "phd",
  "predoc-staff",
  "masters",
  "undergrad",
  "affiliate",
] as const;

export const personSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120),
    role: z.enum(PERSON_ROLES),
    /** Position title, e.g. the PI's faculty title. */
    title: z.string().trim().max(160).optional(),
    program: z.string().trim().max(120).optional(),
    start: yearMonth.optional(),
    end: yearMonth.optional(),
    rank: z.number().optional(),
    interests: z.array(z.string().trim().min(1).max(60)).max(3).default([]),
    directions: z.array(slugRef).default([]),
    photo: urlField.optional(),
    photo_alt: z.string().trim().max(300).optional(),
    photo_consent: z.boolean().default(false),
    links: z
      .strictObject({
        /** Faculty profile on haas.berkeley.edu (PI, affiliated faculty; WP5 request 1). */
        haas: externalUrlField.optional(),
        website: externalUrlField.optional(),
        scholar: externalUrlField.optional(),
        linkedin: externalUrlField.optional(),
        github: externalUrlField.optional(),
        orcid: externalUrlField.optional(),
        cv: urlField.optional(),
      })
      .default({}),
    email: z.email().optional(),
    email_public: z.boolean().default(false),
    now_at: z.string().trim().max(160).optional(),
    now_at_public: z.boolean().default(false),
    /** The person consented to appear on the site. false = never rendered or linked. */
    listed: z.boolean().default(false),
    profile_page: z.boolean().default(false),
    draft: draftField,
    body: bodyField,
  })
  .refine((p) => !p.start || !p.end || p.end >= p.start, {
    message: "end must be ≥ start",
    path: ["end"],
  });

// ---------------------------------------------------------------------------
// news

export const NEWS_TYPES = [
  "publication",
  "award",
  "talk",
  "media",
  "people",
  "grant",
  "lab-life",
] as const;

export const newsSchema = z.strictObject({
  date: isoDateOrDateTime,
  type: z.enum(NEWS_TYPES),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(280).optional(),
  event_date: isoDateOrDateTime.optional(),
  location: z.string().trim().max(160).optional(),
  people: z.array(slugRef).default([]),
  directions: z.array(slugRef).default([]),
  publications: z.array(slugRef).default([]),
  link: z.strictObject({ label: z.string().trim().min(1), url: urlField }).optional(),
  image: imageObject.optional(),
  draft: draftField,
  body: bodyField,
});

// ---------------------------------------------------------------------------
// opportunities (D-05)

export const OPPORTUNITY_AUDIENCES = ["students", "partners", "phd-postdoc", "press"] as const;
export const OPPORTUNITY_STATUS = ["open", "closed", "rolling", "unknown"] as const;

export const opportunitySchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  audience: z.enum(OPPORTUNITY_AUDIENCES),
  route: z.string().trim().max(300).optional(),
  url: externalUrlField.optional(),
  apply_url: externalUrlField.optional(),
  email: z.email().optional(),
  status: z.enum(OPPORTUNITY_STATUS),
  as_of: partialDate.optional(),
  closes_on: isoDate.optional(),
  directions: z.array(slugRef).default([]),
  draft: draftField,
  body: bodyField,
});

// ---------------------------------------------------------------------------
// pages (file collection: content/pages/<name>.yml)

export const homePageSchema = z.strictObject({
  mission: z.string().trim().max(240).optional(),
  featured_findings: z
    .array(
      z.strictObject({
        text: z.string().trim().min(1).max(240),
        publication: slugRef.optional(),
        direction: slugRef.optional(),
        evidence: evidenceLevel,
      }),
    )
    .max(3)
    .default([]),
  draft: draftField,
});

export const joinPageSchema = z.strictObject({
  intro: z.string().optional(),
  students: z.string().optional(),
  partners: z.string().optional(),
  press: z.string().optional(),
  data_statement: z.string().optional(),
  draft: draftField,
});

export const textPageSchema = z.strictObject({
  title: z.string().trim().max(120).optional(),
  intro: z.string().optional(),
  body: z.string().default(""),
  last_reviewed: isoDate.optional(),
  draft: draftField,
});

export const PAGE_SCHEMAS = {
  home: homePageSchema,
  join: joinPageSchema,
  about: textPageSchema,
  accessibility: textPageSchema,
  privacy: textPageSchema,
} as const;
export type PageName = keyof typeof PAGE_SCHEMAS;

// ---------------------------------------------------------------------------
// site (content/site.yml) — single file, no draft flag

export const siteSchema = z.strictObject({
  name: z.string().trim().min(1).default("BOBALAB"),
  long_name: z.string().trim().min(1),
  affiliation_text: z.string().trim().min(1),
  email: z.email(),
  address: z.string().trim().min(1),
  /** Canonical origin, e.g. https://bobalab-berkeley.github.io (metadataBase). */
  site_url: externalUrlField.optional(),
  social: z.record(z.string(), externalUrlField).default({}),
  maintainers: z.string().trim().optional(),
  figure_mode: z.enum(["cluster", "dotplot"]).default("cluster"),
  editors_note: z.string().optional(),
  /** D-03: false until launch. While false, "0 directions" is a warning. */
  launched: z.boolean().default(false),
  /** D-04: editorial order of live directions (slugs). */
  direction_order: z.array(slugRef).default([]),
  /** Tools for lab members (e.g. the lab scheduler), linked from the footer and /people/. */
  member_links: z
    .array(
      z.strictObject({
        label: z.string().trim().min(1).max(40),
        url: externalUrlField,
        description: z.string().trim().max(140).optional(),
      }),
    )
    .default([]),
  /** D-05: static meta-refresh stubs. `from` is a site path ending in "/". */
  redirects: z
    .array(
      z.strictObject({
        from: z
          .string()
          .regex(/^\/([a-z0-9-]+\/)+$/, 'must be a site path like "/research/old-slug/"'),
        to: urlField,
      }),
    )
    .default([]),
});

// ---------------------------------------------------------------------------
// Collections

export const COLLECTION_SCHEMAS = {
  directions: directionSchema,
  projects: projectSchema,
  publications: publicationSchema,
  people: personSchema,
  news: newsSchema,
  opportunities: opportunitySchema,
} as const;
export type CollectionName = keyof typeof COLLECTION_SCHEMAS;
export const COLLECTIONS = Object.keys(COLLECTION_SCHEMAS) as CollectionName[];

/** Public URL pattern per collection (used for redirects and links). */
export const COLLECTION_ROUTES: Record<CollectionName, ((slug: string) => string) | null> = {
  directions: (s) => `/research/${s}/`,
  projects: (s) => `/projects/${s}/`,
  publications: (s) => `/publications/${s}/`,
  people: (s) => `/people/${s}/`,
  news: (s) => `/news/${s}/`,
  opportunities: null,
};

/** Slug patterns per collection (D-05). */
export const SLUG_PATTERNS: Record<CollectionName, { re: RegExp; hint: string; max: number }> = {
  directions: { re: /^[a-z0-9]+(-[a-z0-9]+)*$/, hint: "kebab-case", max: 60 },
  projects: { re: /^[a-z0-9]+(-[a-z0-9]+)*$/, hint: "kebab-case", max: 60 },
  publications: {
    re: /^[a-z]+(-[a-z]+)*-(19|20)\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/,
    hint: "{first-author-lastname}-{year}-{short-title}",
    max: 60,
  },
  people: { re: /^[a-z]+(-[a-z]+)+$/, hint: "{first}-{last}", max: 60 },
  news: {
    re: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-[a-z0-9]+(-[a-z0-9]+)*$/,
    hint: "yyyy-mm-dd-{slug}",
    max: 80,
  },
  opportunities: { re: /^[a-z0-9]+(-[a-z0-9]+)*$/, hint: "kebab-case", max: 60 },
};

// ---------------------------------------------------------------------------
// Types

type WithSlug<T> = T & { slug: string; file: string };
export type DirectionData = z.output<typeof directionSchema>;
export type ProjectData = z.output<typeof projectSchema>;
export type PublicationData = z.output<typeof publicationSchema>;
export type PersonData = z.output<typeof personSchema>;
export type NewsData = z.output<typeof newsSchema>;
export type OpportunityData = z.output<typeof opportunitySchema>;
export type SiteData = z.output<typeof siteSchema>;
export type HomePageData = z.output<typeof homePageSchema>;
export type JoinPageData = z.output<typeof joinPageSchema>;
export type TextPageData = z.output<typeof textPageSchema>;

export type DirectionEntry = WithSlug<DirectionData>;
export type ProjectEntry = WithSlug<ProjectData>;
export type PublicationEntry = WithSlug<PublicationData>;
export type PersonEntry = WithSlug<PersonData>;
export type NewsEntry = WithSlug<NewsData>;
export type OpportunityEntry = WithSlug<OpportunityData>;

export interface EntryMap {
  directions: DirectionEntry;
  projects: ProjectEntry;
  publications: PublicationEntry;
  people: PersonEntry;
  news: NewsEntry;
  opportunities: OpportunityEntry;
}

export interface PagesData {
  home?: HomePageData;
  join?: JoinPageData;
  about?: TextPageData;
  accessibility?: TextPageData;
  privacy?: TextPageData;
}

export type PublicationType = (typeof PUBLICATION_TYPES)[number];
export type PublicationStatus = (typeof PUBLICATION_STATUS)[number];
export type PersonRole = (typeof PERSON_ROLES)[number];
export type NewsType = (typeof NEWS_TYPES)[number];
export type EvidenceLevel = z.output<typeof evidenceLevel>;
