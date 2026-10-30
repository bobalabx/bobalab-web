#!/usr/bin/env node
/**
 * Generates the fixture content sets in tests/fixtures/content/<set>/ (WP0).
 * Every value is FICTIONAL placeholder data for layout and rule testing;
 * none of it describes the real lab. DOIs use the 10.5555 test prefix.
 *
 *   node tests/fixtures/build-fixtures.mjs     (rewrites all sets)
 *
 * Sets: n0 n1 n2 n3 n4 n6 n7 n8 long-labels seeds-0-1-7-12-24 consent-edge-cases
 * Each set validates with zero errors (tests/content/fixtures.test.ts).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "content");

const SWATCHES = [
  "butterfly-pea",
  "oolong",
  "lychee",
  "matcha",
  "jasmine",
  "black-sesame",
  "taro",
  "thai-tea",
];
const LABELS = [
  "Fixture Advice",
  "Fixture Platforms",
  "Fixture AI at Work",
  "Fixture Learning",
  "Fixture Pricing",
  "Fixture Cities",
  "Fixture Logistics",
  "Fixture Health Ops",
];
const SLUGS = [
  "advice",
  "platforms",
  "ai-work",
  "learning",
  "pricing",
  "cities",
  "logistics",
  "health-ops",
];

const BODY =
  "This is placeholder text for a fixture research direction. It exists so that page templates can be built and tested before the lab writes real copy. " +
  "It describes no actual research, paper or person. The paragraph is long enough to fall inside the recommended range of eighty to one hundred and fifty words, " +
  "which keeps the content validator quiet about body length. Designers can use it to judge line length, rhythm and spacing in the direction page template. " +
  "Editors will replace every fixture with real, lab-approved text before anything is published on the public site.";

const MISSION =
  "Fixture mission sentence used to test the home page layout; it is not the lab's mission.";

function fm(data, body = "") {
  const clean = JSON.parse(JSON.stringify(data)); // drop undefined
  return `---\n${stringify(clean, { lineWidth: 0 }).trimEnd()}\n---\n${body ? `\n${body}\n` : ""}`;
}

function write(set, rel, text) {
  const file = path.join(OUT, set, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function site(set, extra = {}) {
  write(
    set,
    "site.yml",
    stringify({
      name: "BOBALAB",
      long_name: "Berkeley Operations and Behavioral Analytics Lab",
      affiliation_text: "Haas School of Business, University of California, Berkeley",
      email: "fixture-lab@example.edu",
      address: "100 Fixture Way, Example City, CA 00000",
      site_url: "https://example.invalid",
      maintainers: "the fixture maintainers",
      figure_mode: "cluster",
      launched: true,
      direction_order: [],
      redirects: [],
      ...extra,
    }),
  );
}

function pages(set) {
  write(
    set,
    "pages/home.yml",
    stringify({
      mission: MISSION,
      featured_findings: [],
      draft: false,
    }),
  );
  write(
    set,
    "pages/join.yml",
    stringify({
      intro: "Fixture introduction for the Join page.",
      students: "Fixture text for students and research assistants.",
      partners: "Fixture text for partners and data collaborators.",
      press: "Fixture text for press enquiries.",
      draft: false,
    }),
  );
  for (const name of ["about", "accessibility", "privacy"]) {
    write(
      set,
      `pages/${name}.yml`,
      stringify({
        title: `Fixture ${name} page`,
        body: `Fixture body for the ${name} page.`,
        draft: false,
      }),
    );
  }
}

function pi(set) {
  write(
    set,
    "people/avery-example.md",
    fm(
      {
        name: "Avery Example",
        role: "pi",
        title: "Fixture Professor of Examples",
        start: "2021-07",
        interests: ["fixture topic one", "fixture topic two"],
        links: { website: "https://example.org/avery" },
        listed: true,
        profile_page: true,
        draft: false,
      },
      "Fixture biography for the principal investigator. Not a real person.",
    ),
  );
}

function direction(set, i, opts = {}) {
  const slug = opts.slug ?? SLUGS[i];
  write(
    set,
    `directions/${slug}.md`,
    fm(
      {
        title: opts.title ?? `${LABELS[i]} research direction`,
        short_label: opts.label ?? LABELS[i],
        question: "What would a fixture direction ask if it were real?",
        summary: "One-sentence fixture summary used by the live caption and cards.",
        color: opts.color ?? SWATCHES[i],
        active_since: 2021 + (i % 4),
        status: opts.status ?? "active",
        archived_on: opts.archived_on,
        open_to_collaborators: i === 0,
        methods: ["Field experiments", "Fixture modelling"],
        findings: [],
        draft: opts.draft ?? false,
      },
      BODY,
    ),
  );
  return slug;
}

let paperSeq = 0;
function paper(set, dirSlugs, opts = {}) {
  paperSeq += 1;
  const n = paperSeq;
  const year = opts.year ?? 2018 + (n % 8);
  const slug = `example-${year}-fixture-paper-${n}`;
  const published = opts.status === undefined || opts.status === "published";
  write(
    set,
    `publications/${slug}.md`,
    fm({
      title: opts.title ?? `Fixture paper number ${n} on an imaginary question`,
      authors: opts.authors ?? [
        { name: "Avery Example", person: "avery-example" },
        { name: "Casey External", url: "https://example.org/casey" },
      ],
      type: opts.type ?? (published ? "journal" : "working-paper"),
      venue: opts.venue ?? (published ? "Journal of Fixtures" : undefined),
      year: opts.noYear ? undefined : year,
      doi: opts.noPublic ? undefined : `10.5555/fixture.${set}.${n}`,
      status: opts.status ?? "published",
      status_note: opts.status_note,
      status_source: published ? undefined : "self-reported",
      as_of: published ? undefined : "2026-09",
      links: opts.noPublic ? {} : { pdf: `https://example.org/papers/fixture-${n}.pdf` },
      presentations: opts.presentations ?? [],
      directions: dirSlugs,
      in_brief: "Fixture plain-language summary written for layout testing.",
      featured: Boolean(opts.featured),
      draft: opts.draft ?? false,
    }),
  );
  return slug;
}

function project(set, slug, dirSlugs, opts = {}) {
  write(
    set,
    `projects/${slug}.md`,
    fm(
      {
        title: opts.title ?? `Fixture project ${slug}`,
        summary: "Fixture project summary for cards and lists.",
        directions: dirSlugs,
        status: opts.status ?? "active",
        start_year: 2022,
        team: opts.team ?? ["avery-example"],
        collaborators: opts.collaborators ?? [],
        partners: opts.partners ?? [],
        publications: opts.publications ?? [],
        draft: opts.draft ?? false,
      },
      "Fixture project overview.",
    ),
  );
}

function news(set, date, slug, opts = {}) {
  write(
    set,
    `news/${date}-${slug}.md`,
    fm(
      {
        date,
        type: opts.type ?? "publication",
        title: opts.title ?? `Fixture news item ${slug}`,
        summary: "Fixture news summary.",
        event_date: opts.event_date,
        location: opts.location,
        directions: opts.directions ?? [],
        publications: opts.publications ?? [],
        people: opts.people ?? [],
        draft: false,
      },
      "Fixture news body.",
    ),
  );
}

function opportunities(set, dirSlugs) {
  write(
    set,
    "opportunities/research-assistants.md",
    fm(
      {
        title: "Fixture research assistant positions",
        audience: "students",
        route: "Fixture application route",
        url: "https://example.org/apply",
        status: "open",
        as_of: "2026-10",
        directions: dirSlugs.slice(0, 1),
        draft: false,
      },
      "Fixture description of the opportunity.",
    ),
  );
  write(
    set,
    "opportunities/partners.md",
    fm({
      title: "Fixture partnerships",
      audience: "partners",
      email: "fixture-lab@example.edu",
      status: "rolling",
      as_of: "2026-10",
      directions: [],
      draft: false,
    }),
  );
}

function baseSet(set, n, paperCounts, extra = {}) {
  site(set, extra.site);
  pages(set);
  pi(set);
  const slugs = [];
  for (let i = 0; i < n; i++) slugs.push(direction(set, i, extra.dir?.(i) ?? {}));
  write(
    set,
    "site.yml",
    fs
      .readFileSync(path.join(OUT, set, "site.yml"), "utf8")
      .replace("direction_order: []", stringify({ direction_order: slugs }).trimEnd()),
  );
  slugs.forEach((s, i) => {
    const pubs = [];
    for (let k = 0; k < (paperCounts[i] ?? 0); k++) pubs.push(paper(set, [s]));
    project(set, `${s}-project`, [s], { publications: pubs.slice(0, 2) });
  });
  if (n > 0) {
    paper(set, [slugs[0]], {
      type: "work-in-progress",
      status: "in-progress",
      noPublic: true,
      noYear: true,
      title: "Fixture work in progress without a public version",
    });
    if (!extra.exactSeeds)
      paper(set, slugs.slice(0, 2), {
        status: "under-revision",
        status_note: "at Fixture Science",
        type: "working-paper",
      });
  }
  news(set, "2026-05-11", "fixture-paper-accepted", { directions: slugs.slice(0, 1) });
  news(set, "2026-03-02", "fixture-talk", {
    type: "talk",
    event_date: "2026-03-20",
    location: "Fixture Hall",
  });
  news(set, "2026-10-01", "fixture-upcoming-talk", {
    type: "talk",
    event_date: "2099-01-15",
    location: "Future Fixture Hall",
  });
  opportunities(set, slugs);
  return slugs;
}

// ---------------------------------------------------------------------------
fs.rmSync(OUT, { recursive: true, force: true });

// n0: no live directions, not launched (D-03 warning, not error); two drafts for preview.
{
  const set = "n0";
  site(set, { launched: false });
  pages(set);
  pi(set);
  const a = direction(set, 0, { draft: true });
  const b = direction(set, 1, { draft: true });
  write(
    set,
    "site.yml",
    fs
      .readFileSync(path.join(OUT, set, "site.yml"), "utf8")
      .replace("direction_order: []", stringify({ direction_order: [a, b] }).trimEnd()),
  );
  paper(set, [a], { draft: true });
  news(set, "2026-05-11", "fixture-placeholder");
}

const COUNTS = [3, 5, 2, 7, 4, 1, 6, 2];
for (const n of [1, 2, 3, 4, 6, 7, 8]) baseSet(`n${n}`, n, COUNTS);

// long-labels: 8-char, 28-char and two-line labels; 90-char title.
baseSet("long-labels", 4, [2, 3, 1, 2], {
  dir: (i) =>
    [
      { label: "Learning" },
      {
        label: "Algorithms and Human Choices",
        title:
          "Algorithms and human choices in repeated operational decisions under uncertainty and delay",
      },
      { label: "Experimentation & Inference" },
      { label: "Microentrepreneurship Ops" },
    ][i],
});

// seeds: 0, 1, 7, 12 and 24 counted papers.
baseSet("seeds-0-1-7-12-24", 5, [0, 1, 7, 12, 24], { exactSeeds: true });

// consent-edge-cases (D-06): listed/unlisted, photo/email/now_at consent, alumni from end dates, drafts.
{
  const set = "consent-edge-cases";
  const slugs = baseSet(set, 3, [2, 2, 1]);
  const person = (slug, data, body = "Fixture person.") =>
    write(
      set,
      `people/${slug}.md`,
      fm({ listed: true, profile_page: false, draft: false, ...data }, body),
    );
  person("blair-sample", {
    name: "Blair Sample",
    role: "phd",
    program: "Fixture PhD program",
    start: "2023-08",
    photo: "/brand/fixtures/portrait.webp",
    photo_alt: "Fixture portrait placeholder",
    photo_consent: true,
    email: "blair@example.edu",
    email_public: true,
    profile_page: true,
    directions: [slugs[0]],
    interests: ["fixtures", "placeholders", "layout"],
  });
  person("devon-placeholder", {
    name: "Devon Placeholder",
    role: "undergrad",
    program: "Fixture major",
    start: "2025-01",
    photo: "/brand/fixtures/portrait.webp",
    photo_alt: "Fixture portrait placeholder",
    photo_consent: false,
    email: "devon@example.edu",
    email_public: false,
    directions: [slugs[1]],
  });
  person("emery-hidden", {
    name: "Emery Hidden",
    role: "masters",
    start: "2024-09",
    listed: false,
  });
  person("finley-alum", {
    name: "Finley Alum",
    role: "undergrad",
    start: "2022-01",
    end: "2024",
    now_at: "Fixture Company",
    now_at_public: true,
  });
  person("gray-alum", {
    name: "Gray Alum",
    role: "masters",
    start: "2023-01",
    end: "2025-06",
    now_at: "Fixture University",
    now_at_public: false,
  });
  person("harper-future", {
    name: "Harper Future",
    role: "postdoc",
    start: "2025-09",
    end: "2099",
  });
  person("indigo-draft", {
    name: "Indigo Draft",
    role: "predoc-staff",
    start: "2026-01",
    draft: true,
  });
  person("jules-noprofile", {
    name: "Jules Noprofile",
    role: "affiliate",
    start: "2024-01",
    profile_page: false,
  });
  paper(set, [slugs[0]], {
    title: "Fixture paper coauthored by an unlisted member",
    authors: [
      { name: "Avery Example", person: "avery-example" },
      { name: "Emery Hidden", person: "emery-hidden" },
      { name: "Blair Sample", person: "blair-sample" },
    ],
  });
  project(set, "consent-project", [slugs[0]], {
    team: ["avery-example", "blair-sample", "indigo-draft", "emery-hidden"],
    collaborators: [
      { name: "Kai Consented", affiliation: "Fixture Institute", consent: true },
      { name: "Lee Notconsented", affiliation: "Fixture College", consent: false },
    ],
    partners: [
      { name: "Fixture Public Partner", public: true },
      { name: "Fixture Private Partner", public: false },
    ],
  });
}

const sets = fs.readdirSync(OUT).sort();
console.log(`fixture sets written to ${path.relative(process.cwd(), OUT)}: ${sets.join(", ")}`);
