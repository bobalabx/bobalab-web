/**
 * Decap CMS configuration SOURCE (WP6). Edit this file, never public/admin/config.yml.
 *
 *   node scripts/cms/build-config.mjs           regenerate public/admin/{config.yml,index.html,preview.css,fonts/}
 *   node scripts/cms/build-config.mjs --check   fail if a generated file is out of date (CI-friendly)
 *   node scripts/cms/build-config.mjs --local   also write the git-ignored local demo files
 *
 * What lives here: the editor-facing side only (labels, hints, widget choices,
 * relation targets, list/sort/filter settings, the production backend). What a
 * field may contain (required, defaults, enum values, lengths, patterns) comes
 * from the zod schema in src/lib/content/schema.ts; the generator merges both
 * and fails if a field exists on one side only. tests/unit/cms/parity.test.ts
 * re-checks the generated config.yml against the schema in both directions.
 *
 * Field entries (keys are zod field names, in the order the editor shows them):
 *   label, hint                       shown in the editor
 *   widget                            override the derived widget (text, richtext, datetime, file, image, …)
 *   relation: "people"                slug fields (single or list) become relation widgets
 *   options: { value: label }         labels for every enum value (must match the schema exactly)
 *   fields: { … }                     object / list-of-object subfields
 *   keys: { key: {…} }                fixed keys offered for a record field (site.social)
 *   message                           custom validation message for the generated pattern
 *   any other key                     copied to the Decap field as is (collapsed, summary, …)
 */

// ---------------------------------------------------------------------------
// Production backend (brief §F4–F5, R4 §8 C5 with the verification fixes).
// PLACEHOLDERS (marked REPLACE-ME): the lab fills these in during hookup
// (docs/SETUP-PRODUCTION.md, WP8). Then run the generator and open a PR.

export const SITE_URL = "https://bobalabx.github.io/bobalab-web";

export const backend = {
  name: "github",
  repo: "bobalabx/bobalab-web",
  branch: "main",
  // The lab's OAuth bridge (forked sveltia-cms-auth Worker on Cloudflare).
  base_url: "https://bobalab-cms-auth.bobalabx-034.workers.dev",
  auth_endpoint: "auth",
  // Public repo: the token may only touch public repositories. Use "repo" if the repo goes private.
  auth_scope: "public_repo",
  // The repo allows squash merges only (R4 Verification, required change 2).
  squash_merges: true,
  cms_label_prefix: "decap/",
};

/** Origins the admin page may contact in production (CSP connect-src / img-src). */
export const csp = {
  connect: ["https://api.github.com"],
  img: ["https://avatars.githubusercontent.com"],
  // OAuth happens in a popup window on base_url, which CSP does not govern;
  // listed here so the page may also fetch from it if a future Decap needs to.
  oauth: [new URL(backend.base_url).origin],
  /** Local demo only (local.html): the decap-server proxy. */
  localConnect: ["http://localhost:8081", "http://127.0.0.1:8081"],
  /**
   * MEASURED 2026-10-20 (tests/e2e/cms-local.spec.ts, Chromium): decap-cms 3.17.1
   * validates its config with Ajv, which compiles validators with `new Function`.
   * Without 'unsafe-eval' the CMS stops with a CSP error before the login screen.
   */
  unsafeEval: true,
};

export const media = {
  media_folder: "public/uploads",
  public_folder: "/uploads",
  /** Upload limits (CI also rejects files over 10 MB and raster images over 2 MB). */
  imageMaxBytes: 2 * 1024 * 1024,
  fileMaxBytes: 10 * 1024 * 1024,
};

/**
 * Cross-field rules of the zod schema (object-level `.refine`) that Decap cannot
 * express. cms-hooks.js blocks a save that breaks one; the parity test fails if
 * the schema gains a refinement that has no entry here.
 */
export const orderRules = [
  { scope: "people", earlier: "start", later: "end", labels: ["Start", "End"] },
  {
    scope: "projects",
    earlier: "start_year",
    later: "end_year",
    labels: ["Start year", "End year"],
  },
];

/**
 * "Required when …" rules that the content validator (src/lib/content/validate.ts)
 * reports as ERRORS, so the required validate-content check would reject the
 * pull request, but that Decap cannot express (verification finding CMS-04).
 * cms-hooks.js blocks a save that breaks one, with the message below;
 * tests/unit/cms/hooks.test.ts runs the validator on the same cases, so the two
 * cannot drift apart silently. The generator checks every field path.
 *
 *   scope    folder collection, or "<file collection>/<file>"
 *   field    the field that must have a value (`min`: a list with at least that many items)
 *   when     every condition must hold: { field, notIn: [values] } or { field, in: [values] }
 *            (a missing value is in no list, so `draft` off = { field: "draft", notIn: [true] })
 *   anySet   …and at least one of these paths has a value ("*" = any list item)
 */
export const requiredRules = [
  {
    code: "E_AS_OF_MISSING",
    scope: "publications",
    field: "as_of",
    when: [{ field: "status", notIn: ["published"] }],
    message:
      "“As of” is needed when the status is not Published: when was the status last checked?",
  },
  {
    code: "E_STATUS_SOURCE_MISSING",
    scope: "publications",
    field: "status_source",
    when: [{ field: "status", notIn: ["published"] }],
    message:
      "“Status source” is needed when the status is not Published (documented or self-reported)",
  },
  {
    code: "E_YEAR_MISSING",
    scope: "publications",
    field: "year",
    anySet: [
      "doi",
      "links.pdf",
      "links.ssrn",
      "links.arxiv",
      "links.publisher",
      "presentations.*.url",
    ],
    message:
      "“Year” is needed once the paper has a public version (a DOI, a PDF, SSRN, arXiv or publisher link, or a presentation link)",
  },
  {
    code: "E_DIRECTIONS_EMPTY",
    scope: "publications",
    field: "directions",
    min: 1,
    when: [
      { field: "type", notIn: ["work-in-progress"] },
      { field: "draft", notIn: [true] },
    ],
    message:
      "choose at least one “Research direction” (not needed for work in progress, or while “Draft · pending lab review” is on)",
  },
  {
    code: "E_DIRECTIONS_EMPTY",
    scope: "projects",
    field: "directions",
    min: 1,
    when: [
      { field: "status", notIn: ["archived"] },
      { field: "draft", notIn: [true] },
    ],
    message:
      "choose at least one “Research direction”; the first is the project’s home direction (not needed for archived projects, or while “Draft · pending lab review” is on)",
  },
];

/** Lists whose items must be distinct (validator errors; cms-hooks.js blocks the save). */
export const uniqueRules = [
  {
    code: "E_DIR_ORDER_DUP",
    scope: "settings/site",
    field: "direction_order",
    label: "Direction order",
  },
];

// ---------------------------------------------------------------------------
// Shared field snippets

const RICHTEXT = {
  // Brief §F3: body fields use `richtext` (stores Markdown). MEASURED 2026-10-20:
  // in Decap 3.17.1 it marks every entry with a body as changed on open and, if
  // saved, rewrites list Markdown (- → *, tight → loose lists). "markdown" does
  // not, and stores the same content; switching is this one line (owner decision,
  // docs/change-requests/WP6/3-decision-richtext-vs-markdown.md).
  widget: "richtext",
  // No image or code-block components: images go in the structured image
  // fields (which require alt text), and code blocks would need CodeMirror
  // chunks that are not vendored.
  editor_components: [],
  buttons: [
    "bold",
    "italic",
    "link",
    "heading-two",
    "heading-three",
    "quote",
    "bulleted-list",
    "numbered-list",
  ],
};

const DRAFT = {
  label: "Draft · pending lab review",
  hint: "On: shown only in preview builds, with a “Draft · pending lab review” badge; the live site leaves it out. Turn it off once the lab has approved the text. This is separate from the CMS’s own Draft → In review → Ready board.",
};

const body = (hint, label = "Body") => ({ label, hint, ...RICHTEXT });

const imageField = (hint) => ({
  label: "Image",
  widget: "image",
  choose_url: false,
  hint:
    hint ?? "Upload a JPG, PNG, WebP or GIF (at most 2 MB). External image links are not allowed.",
  media_library: { config: { max_file_size: media.imageMaxBytes } },
});

// Labels of fields that are required only in some cases say so: Decap would
// otherwise label them "(optional)", and cms-a11y.js drops that suffix for
// labels that contain "(required" (verification finding CMS-09).
const ALT = {
  label: "Alt text (required with an image)",
  hint: "Required when an image is set. Say what the image shows and why it matters, in a sentence (≤ 300 characters). Do not start with “Image of”.",
};

const imageObject = (label, hint, extra = {}) => ({
  label,
  hint,
  widget: "object",
  collapsed: true,
  fields: {
    image: imageField(),
    alt: ALT,
    caption: {
      label: "Caption",
      widget: "text",
      hint: "Optional, shown under the image (≤ 400 characters).",
    },
    ...extra,
  },
});

const fileField = (label, hint) => ({
  label,
  widget: "file",
  // "Insert from URL" stores an external link instead of uploading (brief §F3 [Critic]).
  choose_url: true,
  hint:
    hint ??
    "Prefer a link to the publisher, SSRN or arXiv copy (use “Insert from URL”). Uploads: PDF only, at most 10 MB, and the PDF must be accessible (docs/EDITING.md, PDF checklist).",
  media_library: { config: { max_file_size: media.fileMaxBytes } },
});

const HTTPS = (label, hint) => ({ label, hint: hint ?? "A full address starting with https://" });

const directionsRel = (hint, label = "Research directions") => ({
  label,
  relation: "directions",
  hint: hint ?? "The directions (pearls) this belongs to.",
});
const peopleRel = (label, hint) => ({ label, relation: "people", hint });
const publicationsRel = (label, hint) => ({ label, relation: "publications", hint });

const EVIDENCE = {
  label: "Evidence",
  options: {
    published: "Published (peer reviewed)",
    "working-paper": "Working paper",
    preliminary: "Preliminary",
  },
  hint: "How strong the support is. Shown next to the finding.",
};

const PARTIAL_DATE_HINT = "YYYY, YYYY-MM or YYYY-MM-DD, e.g. 2026-10.";

// ---------------------------------------------------------------------------
// Relation targets (value stored = the entry's slug, i.e. its file name).

export const relations = {
  directions: {
    collection: "directions",
    search_fields: ["title", "short_label"],
    display_fields: ["short_label"],
  },
  people: {
    collection: "people",
    search_fields: ["name"],
    display_fields: ["name"],
    // People who have not agreed to appear (listed: false) are never linked (D-06).
    filters: [{ field: "listed", values: [true] }],
  },
  publications: {
    collection: "publications",
    search_fields: ["title"],
    display_fields: ["title", "year"],
  },
};

// ---------------------------------------------------------------------------
// Folder collections (content/<name>/<slug>.md, YAML front matter + Markdown body)

export const collections = [
  {
    name: "news",
    label: "News",
    label_singular: "News item",
    description:
      "Lab news, newest first. The file name starts with the date (yyyy-mm-dd-…) and is set when you first save, so fill in the date before saving.",
    folder: "content/news",
    slug: "{{fields.date | date('YYYY-MM-DD')}}-{{slug | truncate(60)}}",
    identifier_field: "title",
    summary:
      "{{fields.date | date('YYYY-MM-DD')}} · {{title}}{{fields.draft | ternary(' · draft', '')}}",
    sortable_fields: [{ field: "date", default_sort: "desc" }, "title"],
    view_filters: [
      { label: "Drafts", field: "draft", pattern: true },
      { label: "Talks and events", field: "type", pattern: "talk" },
    ],
    view_groups: [{ label: "Year", field: "date", pattern: "\\d{4}" }],
    fields: {
      date: {
        label: "Date",
        widget: "datetime",
        format: "YYYY-MM-DD",
        date_format: "YYYY-MM-DD",
        time_format: false,
        default: "{{now}}",
        hint: "The day of the news (shown in full on the site). Also used in the file name.",
      },
      type: {
        label: "Type",
        options: {
          publication: "Publication",
          award: "Award",
          talk: "Talk or event",
          media: "Media coverage",
          people: "People",
          grant: "Grant",
          "lab-life": "Lab life",
        },
      },
      title: { label: "Title", hint: "≤ 160 characters." },
      summary: {
        label: "Summary",
        widget: "text",
        hint: "One or two sentences shown in lists and feeds (≤ 280 characters).",
      },
      event_date: {
        label: "Event date",
        widget: "datetime",
        format: "YYYY-MM-DDTHH:mm",
        date_format: "YYYY-MM-DD",
        time_format: "HH:mm",
        hint: "Talks and events only. Items with a future event date are shown as “Upcoming”.",
      },
      location: {
        label: "Location",
        hint: "Talks and events only, e.g. “INFORMS Annual Meeting, Atlanta”.",
      },
      people: peopleRel(
        "People",
        "Lab members this is about. Only people who agreed to be listed can be chosen.",
      ),
      directions: directionsRel(),
      publications: publicationsRel("Publications", "Papers this item is about."),
      link: {
        label: "Link",
        widget: "object",
        collapsed: true,
        hint: "Optional link to the event page, article or announcement.",
        fields: {
          label: { label: "Link text", hint: "Say where it goes, e.g. “Conference programme”." },
          url: { label: "Address", hint: "https://… or a site path such as /publications/…/" },
        },
      },
      image: imageObject("Image", "Optional picture for the news page."),
      draft: DRAFT,
      body: body("Optional longer text for the news page."),
    },
  },
  {
    name: "publications",
    label: "Publications",
    label_singular: "Publication",
    description:
      "Papers, working papers and work in progress. The file name is made from the first author, the year and the title when you first save. Papers count toward a direction only when they have a public version (DOI, SSRN, arXiv, PDF, publisher link) or a documented presentation.",
    folder: "content/publications",
    // D-05 wants {first-author-lastname}-{year}-{short-title}, ≤ 60 characters.
    // Decap templates cannot take a last name, so the first author's full name is
    // used ({{year}} is the year the entry is created). The title part is cut at
    // 28 characters so a 26-character name (the PI's) still fits in 60;
    // cms-hooks.js blocks the first save when a longer name would not.
    slug: "{{fields.authors.0.name}}-{{year}}-{{slug | truncate(28)}}",
    identifier_field: "title",
    summary:
      "{{fields.year | default('in progress')}} · {{title}}{{fields.draft | ternary(' · draft', '')}}",
    sortable_fields: [{ field: "year", default_sort: "desc" }, "title"],
    view_filters: [
      { label: "Drafts", field: "draft", pattern: true },
      { label: "Featured", field: "featured", pattern: true },
      { label: "Work in progress", field: "type", pattern: "work-in-progress" },
    ],
    view_groups: [{ label: "Year", field: "year", pattern: "\\d{4}" }],
    fields: {
      title: { label: "Title", hint: "As in the paper (≤ 300 characters)." },
      authors: {
        label: "Authors",
        hint: "In the paper’s order. Link lab members to their person entry; external coauthors get a name (and optionally a web page) only, never a person entry.",
        summary: "{{fields.name}}",
        fields: {
          name: { label: "Name", hint: "As printed on the paper." },
          person: peopleRel(
            "Lab person",
            "Only for the PI, lab members and alumni who are listed.",
          ),
          url: HTTPS("Web page", "Optional, for external coauthors (https://…)."),
        },
      },
      type: {
        label: "Type",
        options: {
          journal: "Journal article",
          "working-paper": "Working paper",
          conference: "Conference paper",
          chapter: "Book chapter",
          dissertation: "Dissertation",
          "work-in-progress": "Work in progress",
          other: "Other",
        },
      },
      venue: { label: "Venue", hint: "Journal or conference, e.g. Management Science." },
      year: {
        label: "Year (required with a public version)",
        hint: "Publication year (1990 to next year). Needed once the paper has a DOI, PDF, SSRN, arXiv or publisher link, or a presentation link. Leave empty for work in progress.",
      },
      date_online: {
        label: "Online date",
        hint: `Journals only: first online. ${PARTIAL_DATE_HINT}`,
      },
      volume: { label: "Volume" },
      issue: { label: "Issue" },
      pages: { label: "Pages", hint: "e.g. 123–145 or an article number." },
      doi: {
        label: "DOI",
        hint: "Only the DOI itself, e.g. 10.1287/mnsc.2023.01234 (no https://doi.org/).",
        message: "A DOI starts with 10. followed by a slash, e.g. 10.1287/mnsc.2023.01234.",
      },
      status: {
        label: "Status",
        options: {
          published: "Published",
          forthcoming: "Forthcoming",
          accepted: "Accepted",
          "major-revision": "Major revision",
          "revise-resubmit": "Revise and resubmit",
          submitted: "Submitted",
          "working-paper": "Working paper",
          preprint: "Preprint",
          "in-progress": "In progress",
        },
        hint: "Anything other than Published also needs “As of” and “Status source”.",
      },
      status_note: {
        label: "Status note",
        hint: "e.g. “at Manufacturing & Service Operations Management, 2nd round”.",
      },
      status_source: {
        label: "Status source (required unless Published)",
        options: {
          documented: "Documented (a public record shows it)",
          "self-reported": "Self-reported (the lab or a CV says so)",
        },
        hint: "Self-reported statuses are labelled “reported by the lab” on the site.",
      },
      as_of: {
        label: "As of (required unless Published)",
        hint: `When the status was last checked. ${PARTIAL_DATE_HINT}`,
      },
      links: {
        label: "Links and materials",
        widget: "object",
        collapsed: true,
        fields: {
          pdf: fileField("PDF"),
          ssrn: HTTPS("SSRN"),
          arxiv: HTTPS("arXiv"),
          publisher: HTTPS("Publisher page"),
          code: HTTPS("Code"),
          data: { label: "Data", hint: "https://… or a site path." },
          slides: fileField(
            "Slides",
            "Link (“Insert from URL”) or upload a PDF of the slides (at most 10 MB, accessible PDF).",
          ),
          video: HTTPS("Video"),
        },
      },
      presentations: {
        label: "Presentations",
        hint: "Conference talks. Add a link to a programme page or recording only when one exists; a talk with such a link counts as a public version.",
        summary: "{{fields.event}}",
        fields: {
          event: { label: "Event" },
          year: { label: "Year" },
          url: HTTPS("Evidence link", "Programme page or recording (https://…)."),
        },
      },
      press: {
        label: "Press",
        summary: "{{fields.outlet}}",
        fields: {
          outlet: { label: "Outlet" },
          url: HTTPS("Article link"),
          date: { label: "Date", hint: PARTIAL_DATE_HINT },
        },
      },
      awards: {
        label: "Awards",
        summary: "{{fields.name}} ({{fields.year}})",
        fields: {
          name: { label: "Award" },
          year: { label: "Year" },
          under_title: {
            label: "Awarded under the title",
            hint: "Only if the paper had a different title then.",
          },
          source: {
            label: "Source",
            options: {
              documented: "Documented (the awarding body lists it)",
              "self-reported": "Self-reported (only the lab or a CV says so)",
            },
            hint: "Self-reported awards are labelled “reported by the lab” on the paper page.",
          },
        },
      },
      directions: directionsRel(
        "At least one, except for work in progress and while “Draft · pending lab review” is on.",
        "Research directions (required except for work in progress)",
      ),
      in_brief: {
        label: "In brief",
        widget: "text",
        hint: "The lab’s own plain-language summary, at most 3 sentences (≤ 400 characters). Never paste the abstract.",
      },
      teaser: imageObject("Teaser image", "Optional figure from the paper (with permission)."),
      featured: { label: "Featured", hint: "Show on the home page." },
      plate_verified: {
        label: "Study-design figure checked by the authors",
        hint: "Turn on only after the authors have checked the paper's study-design figure. Until then the figure shows only in preview builds.",
      },
      bibtex_override: {
        label: "BibTeX override",
        widget: "text",
        hint: "Leave empty: BibTeX is generated. Use only if the generated entry is wrong.",
      },
      draft: DRAFT,
      body: body("Optional notes for the paper page."),
    },
  },
  {
    name: "people",
    label: "People",
    label_singular: "Person",
    description:
      "The PI, lab members and alumni. External coauthors are not people. Nobody appears on the site unless “Listed” is on, and photos, email and “now at” need their own consent switches.",
    folder: "content/people",
    slug: "{{slug}}",
    identifier_field: "name",
    summary:
      "{{name}}{{fields.listed | ternary('', ' · not listed')}}{{fields.draft | ternary(' · draft', '')}}",
    sortable_fields: ["name", "role", "end"],
    view_filters: [
      { label: "Drafts", field: "draft", pattern: true },
      { label: "Not listed", field: "listed", pattern: false },
    ],
    view_groups: [{ label: "Role", field: "role" }],
    fields: {
      name: {
        label: "Name",
        hint: "As the person wants it shown. The file name (first-last) is made from it.",
      },
      role: {
        label: "Role",
        options: {
          pi: "Principal investigator",
          postdoc: "Postdoc",
          phd: "PhD student",
          "predoc-staff": "Pre-doc or staff",
          masters: "Master’s student",
          undergrad: "Undergraduate",
          affiliate: "Affiliate (only with written consent)",
        },
      },
      title: { label: "Position title", hint: "e.g. the PI’s faculty title." },
      program: { label: "Program", hint: "As the member wishes, e.g. “EECS & Data Science”." },
      start: { label: "Start", hint: "YYYY or YYYY-MM." },
      end: {
        label: "End",
        hint: "YYYY or YYYY-MM. After this date the person is listed under Alumni.",
      },
      rank: { label: "Sort rank", hint: "Optional; lower numbers sort first within a group." },
      interests: {
        label: "Interests",
        label_singular: "interest",
        hint: "Up to 3 short phrases.",
        summary: "{{fields.interest}}",
        field: { label: "Interest" },
      },
      directions: directionsRel(),
      photo: imageField(
        "Upload only after the person has agreed in writing: uploaded files are public as soon as they are published, even while “Photo consent” is off, so the CMS does not save a photo without that consent. Square headshot, JPG or WebP, at most 2 MB.",
      ),
      photo_alt: {
        label: "Photo alt text (required with a photo)",
        hint: "Required when a photo is set, e.g. “Portrait of Jane Doe”.",
      },
      photo_consent: {
        label: "Photo consent",
        hint: "On only after the person agreed in writing that their photo may be shown.",
      },
      links: {
        label: "Links",
        widget: "object",
        collapsed: true,
        fields: {
          haas: HTTPS(
            "Haas faculty profile",
            "https://haas.berkeley.edu/faculty/… (faculty only).",
          ),
          website: HTTPS("Website"),
          scholar: HTTPS("Google Scholar"),
          linkedin: HTTPS("LinkedIn"),
          github: HTTPS("GitHub"),
          orcid: HTTPS("ORCID"),
          cv: fileField("CV", "Link to a CV or upload an accessible PDF (at most 10 MB)."),
        },
      },
      email: { label: "Email", hint: "Shown only when “Email public” is on." },
      email_public: {
        label: "Email public",
        hint: "On only if the person wants their email on the site.",
      },
      now_at: {
        label: "Now at",
        hint: "Alumni: where they went next. Shown only when “Now at public” is on.",
      },
      now_at_public: { label: "Now at public", hint: "On only with the person’s consent." },
      listed: {
        label: "Listed (consented to appear)",
        hint: "Off: the person is never shown or linked anywhere on the site, even in preview.",
      },
      profile_page: {
        label: "Profile page",
        hint: "Give this person their own page (the PI always has one).",
      },
      draft: DRAFT,
      body: body("Short bio, at most 150 words, written or approved by the person.", "Bio"),
    },
  },
  {
    name: "directions",
    label: "Research directions",
    label_singular: "Research direction",
    description:
      "The pearls of Fig. 1. Their order is set in Settings → Site → Direction order, not here. Archive a direction instead of deleting it.",
    folder: "content/directions",
    slug: "{{fields.short_label}}",
    identifier_field: "title",
    summary: "{{short_label}} · {{status}}{{fields.draft | ternary(' · draft', '')}}",
    sortable_fields: ["title", "status"],
    view_filters: [
      { label: "Archived", field: "status", pattern: "archived" },
      { label: "Drafts", field: "draft", pattern: true },
    ],
    fields: {
      title: { label: "Title", hint: "≤ 90 characters." },
      short_label: {
        label: "Short label",
        hint: "The pearl’s label in Fig. 1: one line, ≤ 28 characters. Also the file name.",
        message: "One line, at most 28 characters, without < or >.",
      },
      question: { label: "Guiding question", widget: "text", hint: "≤ 140 characters." },
      summary: { label: "Summary", widget: "text", hint: "One sentence, ≤ 160 characters." },
      color: {
        label: "Colour",
        hint: "Each direction needs its own colour. Butterfly pea/Taro and Oolong/Thai tea look alike to many colour-blind readers, so avoid those pairs (docs/EDITING.md).",
        options: {
          "butterfly-pea": "Butterfly pea (blue)",
          oolong: "Oolong (amber)",
          lychee: "Lychee (rose)",
          matcha: "Matcha (green)",
          jasmine: "Jasmine (teal)",
          "black-sesame": "Black sesame (charcoal)",
          taro: "Taro (violet, reserve)",
          "thai-tea": "Thai tea (orange, reserve)",
        },
      },
      active_since: { label: "Active since", hint: "Year." },
      status: {
        label: "Status",
        options: {
          active: "Active",
          emerging: "Emerging",
          archived: "Archived (off Fig. 1, page kept)",
        },
        hint: "Archive instead of deleting: the page stays with a dated “Archived” note.",
      },
      archived_on: { label: "Archived on", hint: `Set when archiving. ${PARTIAL_DATE_HINT}` },
      open_to_collaborators: { label: "Open to collaborators" },
      methods: {
        label: "Methods",
        label_singular: "method",
        hint: "Up to 6 short method names (≤ 40 characters each).",
        summary: "{{fields.method}}",
        field: { label: "Method" },
      },
      findings: {
        label: "Key findings",
        hint: "Up to 4. Plain-language findings, each tied to a paper where possible.",
        summary: "{{fields.text | truncate(60)}}",
        fields: {
          text: { label: "Finding", widget: "text", hint: "≤ 240 characters." },
          publication: publicationsRel("Paper"),
          evidence: EVIDENCE,
        },
      },
      figure: imageObject("Figure", "Optional figure for the direction page.", {
        what_this_shows: {
          label: "What this shows",
          widget: "text",
          hint: "Optional plain-language reading of the figure (≤ 600 characters).",
        },
      }),
      draft: DRAFT,
      body: body("80–150 words introducing the direction."),
    },
  },
  {
    name: "projects",
    label: "Projects",
    label_singular: "Project",
    description: "Research projects. The first direction listed is the project’s home direction.",
    folder: "content/projects",
    slug: "{{slug | truncate(50)}}",
    identifier_field: "title",
    summary: "{{title}} · {{status}}{{fields.draft | ternary(' · draft', '')}}",
    sortable_fields: ["title", "status", "start_year"],
    view_filters: [
      { label: "Active", field: "status", pattern: "active" },
      { label: "Drafts", field: "draft", pattern: true },
    ],
    fields: {
      title: { label: "Title", hint: "≤ 120 characters." },
      summary: { label: "Summary", widget: "text", hint: "≤ 200 characters." },
      directions: directionsRel(
        "At least one unless the project is archived or “Draft · pending lab review” is on; the first is the primary direction (breadcrumb).",
        "Research directions (required unless archived)",
      ),
      status: {
        label: "Status",
        options: {
          active: "Active",
          completed: "Completed",
          paused: "Paused",
          archived: "Archived",
        },
      },
      start_year: { label: "Start year" },
      end_year: { label: "End year", hint: "Not before the start year." },
      team: peopleRel("Team", "Lab members (listed people only)."),
      collaborators: {
        label: "Collaborators",
        hint: "External collaborators. Shown only when “Consent” is on.",
        summary: "{{fields.name}}{{fields.consent | ternary('', ' · not shown')}}",
        fields: {
          name: { label: "Name" },
          affiliation: { label: "Affiliation" },
          url: HTTPS("Web page"),
          consent: { label: "Consent to be shown" },
        },
      },
      partners: {
        label: "Partners",
        hint: "Organisations. Shown only when “Public” is on.",
        summary: "{{fields.name}}",
        fields: {
          name: { label: "Name" },
          url: HTTPS("Web page"),
          public: { label: "Public", hint: "On only if the partnership may be named." },
        },
      },
      outputs: {
        label: "Outputs",
        summary: "{{fields.type}}: {{fields.label}}",
        fields: {
          type: {
            label: "Type",
            options: {
              paper: "Paper",
              "working-paper": "Working paper",
              slides: "Slides",
              code: "Code",
              data: "Data",
              talk: "Talk",
              press: "Press",
              other: "Other",
            },
          },
          label: { label: "Label", hint: "≤ 80 characters." },
          url: { label: "Address", hint: "https://… or a site path." },
        },
      },
      publications: publicationsRel("Publications"),
      funding: {
        label: "Funding",
        summary: "{{fields.name}}",
        fields: { name: { label: "Funder or grant" }, url: HTTPS("Web page") },
      },
      hero: imageObject("Hero image", "Optional image for the project page."),
      draft: DRAFT,
      body: body("The project page text."),
    },
  },
  {
    name: "opportunities",
    label: "Opportunities",
    label_singular: "Opportunity",
    description:
      "Ways to work with the lab. The “Open to RAs” badge and the home “Work with us” block come from open or rolling student opportunities. Never mark one open without a dated source.",
    folder: "content/opportunities",
    slug: "{{slug | truncate(50)}}",
    identifier_field: "title",
    summary: "{{title}} · {{status}}{{fields.draft | ternary(' · draft', '')}}",
    sortable_fields: ["title", "status"],
    view_filters: [{ label: "Drafts", field: "draft", pattern: true }],
    fields: {
      title: { label: "Title" },
      audience: {
        label: "Audience",
        options: {
          students: "Students and RAs",
          partners: "Research partners",
          "phd-postdoc": "PhD students and postdocs",
          press: "Press",
        },
      },
      route: {
        label: "How to apply",
        widget: "text",
        hint: "The route in a sentence or two (≤ 300 characters).",
      },
      url: HTTPS("Information page"),
      apply_url: HTTPS("Application form"),
      email: { label: "Contact email" },
      status: {
        label: "Status",
        options: {
          open: "Open",
          closed: "Closed",
          rolling: "Rolling",
          unknown: "Unknown",
        },
      },
      as_of: { label: "As of", hint: `When the status was checked. ${PARTIAL_DATE_HINT}` },
      closes_on: {
        label: "Closes on",
        widget: "datetime",
        format: "YYYY-MM-DD",
        date_format: "YYYY-MM-DD",
        time_format: false,
      },
      directions: directionsRel("Directions this opportunity is for (drives “Open to RAs”)."),
      draft: DRAFT,
      body: body("Optional details."),
    },
  },
];

// ---------------------------------------------------------------------------
// File collections

const textPage = (label, file, hint) => ({
  name: file,
  label,
  file: `content/pages/${file}.yml`,
  schema: `pages/${file}`,
  description: hint,
  fields: {
    title: { label: "Page title" },
    intro: { label: "Introduction", widget: "text", hint: "One short paragraph under the title." },
    body: body("The page text."),
    last_reviewed: {
      label: "Last reviewed",
      widget: "datetime",
      format: "YYYY-MM-DD",
      date_format: "YYYY-MM-DD",
      time_format: false,
      hint: "Update whenever you review the page.",
    },
    draft: DRAFT,
  },
});

export const fileCollections = [
  {
    name: "pages",
    label: "Pages",
    description: "Fixed pages and the home page texts.",
    files: [
      {
        name: "home",
        label: "Home page",
        file: "content/pages/home.yml",
        schema: "pages/home",
        fields: {
          statement: {
            label: "Statement (page heading)",
            hint: "The large first line of the home page, ≤ 80 characters. Leave empty for the default.",
          },
          mission: {
            label: "Mission",
            widget: "text",
            hint: "One or two sentences beside the lab name, before the research directions (≤ 240 characters).",
          },
          featured_findings: {
            label: "Featured findings",
            hint: "Up to 3, each tied to a paper and/or a direction.",
            summary: "{{fields.text | truncate(60)}}",
            fields: {
              text: { label: "Finding", widget: "text", hint: "≤ 240 characters." },
              publication: publicationsRel("Paper"),
              direction: { label: "Direction", relation: "directions" },
              evidence: EVIDENCE,
            },
          },
          draft: DRAFT,
        },
      },
      {
        name: "join",
        label: "Join the lab",
        file: "content/pages/join.yml",
        schema: "pages/join",
        fields: {
          intro: body("Opening paragraph.", "Introduction"),
          students: body(
            "For students and RAs: how to join, time commitment, current status with a date.",
            "Students",
          ),
          partners: body("For academic and industry partners.", "Partners"),
          press: body("For journalists.", "Press"),
          data_statement: body("How the lab handles research data.", "Data statement"),
          draft: DRAFT,
        },
      },
      textPage("About", "about"),
      textPage(
        "Accessibility statement",
        "accessibility",
        "Keep a contact for accessibility problems on this page.",
      ),
      textPage(
        "Privacy statement",
        "privacy",
        "Required for a berkeley.edu hostname; keep it current.",
      ),
    ],
  },
  {
    name: "settings",
    label: "Settings",
    description: "Site-wide settings. Changes affect every page.",
    preview: false,
    files: [
      {
        name: "site",
        label: "Site",
        file: "content/site.yml",
        schema: "site",
        fields: {
          name: { label: "Short name" },
          long_name: { label: "Full lab name" },
          affiliation_text: { label: "Affiliation (plain text)" },
          email: { label: "Lab email" },
          address: { label: "Postal address" },
          site_url: HTTPS(
            "Site address",
            "Canonical origin without the path, e.g. https://bobalabx.github.io",
          ),
          social: {
            label: "Social links",
            widget: "object",
            collapsed: true,
            keys: {
              bluesky: HTTPS("Bluesky"),
              x: HTTPS("X"),
              linkedin: HTTPS("LinkedIn"),
              github: HTTPS("GitHub"),
              youtube: HTTPS("YouTube"),
              mastodon: HTTPS("Mastodon"),
            },
          },
          maintainers: {
            label: "Maintainers",
            widget: "text",
            hint: "Who maintains the site (shown in the footer).",
          },
          // Retired by D-13 (Fig. 1 "Lines" has one layout); kept so old site.yml files parse.
          figure_mode: { label: "Fig. 1 layout (retired)", widget: "hidden" },
          editors_note: {
            label: "Editors’ note",
            widget: "text",
            hint: "Internal note for editors; not shown on the site.",
          },
          launched: {
            label: "Launched",
            hint: "Off until the public launch. While off, having no published directions is only a warning.",
          },
          direction_order: {
            label: "Direction order",
            label_singular: "direction",
            hint: "The order of the pearls in Fig. 1. Each item shows the direction’s address (e.g. ai-at-work). Drag an item by its handle, or focus the handle and use Space, the arrow keys and Space again. Each live direction once; remove archived directions (×). An item that opens as an empty choice is an archived direction: remove it.",
            // The collapsed items show the stored address (Decap: summary of a single-field list).
            summary: "{{fields.direction}}",
            field: {
              label: "Direction",
              relation: "directions",
              filters: [{ field: "status", values: ["active", "emerging"] }],
            },
          },
          member_links: {
            label: "Links for lab members",
            label_singular: "link",
            hint: "Internal tools for lab members, such as the lab scheduler. They appear in the site footer and at the top of the People page.",
            summary: "{{fields.label}}",
            fields: {
              label: {
                label: "Link text",
                hint: "Short, e.g. Lab scheduler (40 characters at most).",
              },
              url: { label: "Address", hint: "A full address starting with https://." },
              description: {
                label: "Description (optional)",
                hint: "One short line, e.g. Weekly lab meeting scheduling (sign in with Google).",
              },
            },
          },
          redirects: {
            label: "Redirects",
            hint: "When a published page’s address changes or a page is removed, send the old address somewhere useful.",
            summary: "{{fields.from}} → {{fields.to}}",
            fields: {
              from: {
                label: "Old address",
                hint: "A site path such as /research/old-slug/ (with slashes).",
                message:
                  "A site path in lower case with a slash at both ends, e.g. /research/old-slug/.",
              },
              to: {
                label: "New address",
                hint: "A site path such as /research/new-slug/ or https://…",
              },
            },
          },
        },
      },
    ],
  },
];
