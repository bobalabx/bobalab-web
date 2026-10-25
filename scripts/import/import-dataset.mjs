#!/usr/bin/env node
/**
 * WP7 content importer: research dataset → content/** (re-runnable).
 *
 *   node scripts/import/import-dataset.mjs --dataset <path/to/content-dataset.json>          (dry run: summary only)
 *   node scripts/import/import-dataset.mjs --dataset <path> --write [--prune]                 (write content/)
 *   node scripts/import/import-dataset.mjs --dataset <path> --check                           (exit 1 if content/ differs)
 *
 * The dataset path can also come from the BOBALAB_DATASET environment variable.
 * The dataset stays OUTSIDE the repo (it mentions people who are not on the
 * public roster). Mapping rules: docs/CONTENT-MAPPING.md; binding decisions:
 * docs/DECISIONS.md D-03…D-06. Deviations from CONTENT-MAPPING are marked
 * "WP7 rule" below and listed in scripts/import/README.md.
 *
 * WARNING: --write overwrites every generated file. Once the lab edits content
 * in the CMS, do not re-run with --write without reviewing the diff first.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import {
  chooseQuestion,
  cleanDate,
  compact,
  enDashRanges,
  expandEventNames,
  fullNameFirst,
  humanDates,
  namePI,
  programLabel,
  frontMatterFile,
  newsSlug,
  presentationHasEvidence,
  publicationSlug,
  sentenceCount,
  singleYear,
  toHttps,
  toYaml,
  wordCount,
} from "./lib.mjs";
import {
  ABOUT,
  ACCESSIBILITY,
  DIRECTION_BODIES,
  DIRECTION_QUESTIONS,
  DRAFTED_ON,
  HOME,
  JOIN,
  PRIVACY,
} from "./copy.mjs";
import { loadHashes, scanText } from "./hidden-names.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHECKED_ON = "2026-10-20"; // date the dataset was built and checked

// ---------------------------------------------------------------------------
// CLI

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const opt = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const datasetPath = opt("--dataset") ?? process.env.BOBALAB_DATASET;
const outDir = path.resolve(ROOT, opt("--out") ?? "content");
const MODE = flag("--write") ? "write" : flag("--check") ? "check" : "dry-run";
const PRUNE = flag("--prune");

if (!datasetPath) {
  console.error(
    "usage: node scripts/import/import-dataset.mjs --dataset <content-dataset.json> [--write [--prune] | --check]\n" +
      "       (or set BOBALAB_DATASET). The dataset is kept outside the repo.",
  );
  process.exit(2);
}
const ds = JSON.parse(fs.readFileSync(path.resolve(datasetPath), "utf8"));

/** Public name forms of the PI (dataset settings, DOCUMENTED). */
const PI_NAME = ds.settings.piName; // "Park Sinchaisri": public copy (CON-08)
const PI_GIVEN = PI_NAME.split(/\s+/)[0]; // "Park"
const PI_CITATION = ds.settings.piCitationName; // "Wichinpong Park Sinchaisri": author lists (CON-07)
const PI_SLUG = ds.people.find((p) => p.role === "pi")?.slug;
/** Public copy: "the PI" → the PI's name. */
const publicCopy = (s) => (typeof s === "string" ? namePI(s, PI_NAME) : s);

// ---------------------------------------------------------------------------
// Report

const report = { notes: [], questions: [], unmapped: [] };
const note = (m) => report.notes.push(m);
const ask = (m) => report.questions.push(m);
const unmapped = (m) => report.unmapped.push(m);
const fail = (m) => {
  throw new Error(m);
};

/** files: relative path → text */
const files = new Map();
const put = (rel, text) => {
  if (files.has(rel)) fail(`duplicate output ${rel}`);
  files.set(rel, text);
};

const https = (url, where) => {
  const r = toHttps(url);
  if (r.reason) {
    unmapped(`${where}: dropped ${r.reason}`);
    ask(`${where}: a link was dropped (${r.reason}); supply an https link.`);
  }
  return r.url ?? undefined;
};

/** Known-error scrub (R2 §7.5): the PI site's find-and-replace bug. */
const scrub = (s) => (typeof s === "string" ? s.replace(/full-view/g, "US") : s);

// ---------------------------------------------------------------------------
// People (CONTENT-MAPPING §4; D-06)

const COLOR = {
  butterflyPea: "butterfly-pea",
  oolong: "oolong",
  lychee: "lychee",
  matcha: "matcha",
  jasmine: "jasmine",
  blackSesame: "black-sesame",
};

const collaborators = new Map(); // slug → dataset row
const personSlugs = new Set(); // imported people
const peopleOut = [];

for (const p of ds.people) {
  if (p.role === "collaborator") {
    collaborators.set(p.slug, p); // D-05: external coauthors are not people
    continue;
  }
  const where = `people/${p.slug}`;
  let role;
  let listed = true;
  let isAlumni = false;
  if (p.role === "pi") role = "pi";
  else if (p.role === "undergrad") role = "undergrad";
  else if (p.role === "ms") role = "masters";
  else if (p.role === "alumni" && p.group === "Others") {
    role = "affiliate";
    listed = false; // CONTENT-MAPPING §4.1: never rendered until the PI decides
    isAlumni = true;
    ask(
      `${where}: "Others" mentee imported with listed: false (D-05: no affiliate without consent). Count as BOBALAB alumni?`,
    );
  } else if (p.role === "alumni") {
    isAlumni = true;
    const aff = String(p.affiliation ?? "");
    if (/PhD/i.test(aff)) role = "phd";
    else if (/undergraduate\/master/i.test(aff)) {
      role = "undergrad";
      ask(
        `${where}: role set to undergrad; the PI site says "undergraduate/master's student". Undergrad or masters?`,
      );
    } else role = "undergrad";
  } else {
    unmapped(`${where}: unknown role ${p.role} (skipped)`);
    continue;
  }

  let end;
  if (isAlumni) {
    if (p.classYear != null) end = String(p.classYear);
    else if (Array.isArray(p.classYearCandidates) && p.classYearCandidates.length) {
      end = String(Math.min(...p.classYearCandidates));
      ask(
        `${where}: class year conflict ${p.classYearCandidates.join(" vs ")}; end set to the earliest (${end}).`,
      );
    }
  }

  const L = p.links ?? {};
  const links = compact({
    // WP5 request 1/2: the Haas faculty profile renders first on /about/ and the PI page.
    haas: https(L.haas, `${where} links.haas`),
    website: https(L.homepage ?? L.website ?? L.profile, `${where} links.website`),
    scholar: https(L.scholar, `${where} links.scholar`),
    linkedin: https(L.linkedin, `${where} links.linkedin`),
    orcid: https(L.orcid, `${where} links.orcid`),
    cv: https(L.cv, `${where} links.cv`),
  });

  // D-06: everyone except the PI is draft. The PI is published only if every
  // PI fact written here is verified (review.status === "verified"); no bio is
  // written (the PI writes it).
  const draft = role === "pi" ? p.review?.status !== "verified" : true;
  if (role === "pi" && !draft)
    note(
      `people/${p.slug}: PI imported with draft: false (name, title and links verified; no bio written).`,
    );

  const data = compact({
    name: p.name,
    role,
    title: role === "pi" ? p.title : undefined,
    // CON-04: the roster's lower-case tags in display casing; no word is expanded.
    program: programLabel(p.program, role),
    end,
    now_at: isAlumni ? (p.placement ?? undefined) : undefined,
    links,
    directions: [],
    photo_consent: false,
    email_public: false,
    now_at_public: false,
    listed,
    profile_page: role === "pi",
    draft,
  });
  peopleOut.push({ slug: p.slug, data });
  personSlugs.add(p.slug);
}
for (const { slug, data } of peopleOut) put(`people/${slug}.md`, frontMatterFile(data));

const collaboratorUrl = (slug, where) => {
  const c = collaborators.get(slug);
  if (!c) return undefined;
  return https(c.links?.homepage ?? c.links?.linkedin, `${where} (${c.name})`);
};
const cleanAffiliation = (a) =>
  a
    ? String(a)
        .replace(/\s*\([^)]*\)\s*/g, " ")
        .trim()
    : undefined;

// ---------------------------------------------------------------------------
// Publications (CONTENT-MAPPING §3)

/**
 * §3.2 status map. `status_source` is self-reported unless the entry says
 * `documented`: the four items whose state anyone can check on a public
 * posting (SSRN / arXiv), as CONTENT-MAPPING §3.2 says (WP3 request 4 item 2,
 * which reversed the earlier WP7 rule "every non-published item is self-reported").
 */
const STATUS = {
  "precise-or-broad": {
    status: "major-revision",
    status_note: "at Manufacturing & Service Operations Management",
    as_of: "2026-04",
  },
  "markdown-pricing": {
    status: "major-revision",
    status_note: "(2nd round) at Manufacturing & Service Operations Management",
    as_of: CHECKED_ON,
  },
  "multihoming-workers": {
    status: "revise-resubmit",
    status_note: "at Operations Research",
    as_of: "2026-08",
  },
  "learning-to-gig": {
    status: "major-revision",
    status_note: "at Manufacturing & Service Operations Management",
    as_of: "2026-05",
  },
  "teachers-knapsack": { status: "working-paper", as_of: CHECKED_ON, source: "documented" },
  "strategic-advice-personal-ai": {
    status: "preprint",
    status_note: "v2",
    as_of: "2026-09",
    source: "documented",
  },
  "non-adoption-algorithmic-advice": { status: "working-paper", as_of: CHECKED_ON },
  "compliance-aware-rl": { status: "in-progress", as_of: CHECKED_ON },
  "planning-vs-execution": { status: "in-progress", as_of: CHECKED_ON },
  "sequencing-incentives": { status: "in-progress", as_of: CHECKED_ON },
  "learning-across-jobs": { status: "in-progress", as_of: CHECKED_ON },
  "experimentation-without-experiments": { status: "in-progress", as_of: CHECKED_ON },
  "fruits-of-labor": { status: "in-progress", as_of: CHECKED_ON },
  "cancer-recognition-foundation-models": { status: "in-progress", as_of: CHECKED_ON },
  "genai-pricing-simulation": {
    status: "submitted",
    status_note: "to Production and Operations Management",
    as_of: "2026-08",
  },
  "act-ask-defer": {
    status: "submitted",
    status_note: "to Production and Operations Management",
    as_of: "2026-08",
  },
  "dispatching-to-develop": { status: "working-paper", as_of: "2026-08", source: "documented" },
  "stale-misattributed-late": {
    status: "preprint",
    status_note: "v1",
    as_of: "2026-10",
    source: "documented",
  },
};

/**
 * Venue corrections (WP3 request 4 item 1; R2 §3 P4/P5, §1.2 DOCUMENTED): the
 * two PACM HCI papers carry "(CSCW 2025)" in the journal name in the dataset.
 * The journal is Proceedings of the ACM on HCI; CSCW 2025 in Bergen is where
 * they were presented (programme page below), so it becomes a presentation.
 */
const CSCW_2025 = {
  event: "CSCW 2025, Bergen",
  source: "https://cscw.acm.org/2025/index.php/program-overview-3/",
};
const VENUE_FIXES = {
  "learning-on-the-go-2025": {
    venue: "Proceedings of the ACM on Human-Computer Interaction",
    presentation: CSCW_2025,
  },
  "making-chatgpt-work-2025": {
    venue: "Proceedings of the ACM on Human-Computer Interaction",
    presentation: CSCW_2025,
  },
};
const SLUG_OVERRIDES = { "cancer-recognition-foundation-models": "cancer-recognition" };

const pubSlug = new Map(); // old → new
const pubRows = [];
for (const p of ds.publications) {
  const st = STATUS[p.slug];
  const published = !st;
  if (published && !/^(Published|Completed)/i.test(String(p.status ?? "")))
    fail(`publication ${p.slug}: status "${p.status}" has no mapping`);
  const slug = publicationSlug(p.slug, p.authors[0].name, p.year, st?.as_of, SLUG_OVERRIDES);
  pubSlug.set(p.slug, slug);
  pubRows.push({ p, st, slug, published });
}

const pubDirections = new Map(); // new slug → directions
const pubDraft = new Map(); // new slug → draft
for (const { p, st, slug, published } of pubRows) {
  const where = `publications/${slug}`;
  let type = p.type;
  if (type === "other") type = p.slug === "penn-dissertation-2021" ? "dissertation" : "other";
  if (!["journal", "working-paper", "work-in-progress", "dissertation", "other"].includes(type))
    fail(`${where}: unmapped type ${p.type}`);

  const authors = p.authors.map((a) => {
    // CON-07: the PI is cited by the documented citation name on every paper,
    // whatever form the source listing used (arXiv lists "Park Sinchaisri").
    if (a.personSlug === PI_SLUG) return { name: PI_CITATION, person: a.personSlug };
    if (personSlugs.has(a.personSlug)) return { name: a.name, person: a.personSlug };
    if (!collaborators.has(a.personSlug))
      unmapped(`${where}: author ${a.name} has no people row (name only)`);
    return compact({ name: a.name, url: collaboratorUrl(a.personSlug, `${where} author url`) });
  });

  const D = p.dates ?? {};
  const date_online =
    type === "journal" ? cleanDate(D.online ?? D.published ?? D.onlineApprox) : undefined;

  const C = p.citation ?? {};
  const L = p.links ?? {};
  const links = {
    pdf: https(L.pdf, `${where} links.pdf`),
    ssrn: https(L.ssrn, `${where} links.ssrn`),
    arxiv: https(L.arxiv, `${where} links.arxiv`),
    publisher: https(L.publisher, `${where} links.publisher`),
    code: https(L.code, `${where} links.code`),
    slides: https(L.slides, `${where} links.slides`),
  };
  if (L.paper) {
    const covered =
      /^https?:\/\/(dx\.)?doi\.org\//i.test(L.paper) ||
      /ssrn\.com/i.test(L.paper) ||
      /arxiv\.org/i.test(L.paper);
    if (!covered) {
      if (links.publisher)
        unmapped(`${where}: links.paper ${L.paper} not imported (publisher set)`);
      else links.publisher = https(L.paper, `${where} links.paper`);
    }
  }
  for (const b of p.brokenLinks ?? []) {
    if (Object.values(links).includes(b.url)) fail(`${where}: broken link imported ${b.url}`);
    ask(
      `${where}: its only copy link is broken (${b.status}); supply a working PDF and the current venue.`,
    );
  }

  const fix = VENUE_FIXES[p.slug];
  // Presentation text: dates as the site writes them (WP3 request 4 item 4) and
  // conference names as the CV spells them out (CON-13). Formatting only.
  const presentations = (p.presentations ?? []).map((x) =>
    compact({
      event: expandEventNames(humanDates(x.event)),
      year: singleYear(x.event) ?? undefined,
      url: presentationHasEvidence(x.label) ? https(x.source, `${where} presentation`) : undefined,
    }),
  );
  for (const x of presentations)
    if (x.event.length > 200) fail(`${where}: presentation event > 200 chars: ${x.event}`);
  if (fix?.presentation)
    presentations.push(
      compact({
        event: fix.presentation.event,
        year: singleYear(fix.presentation.event) ?? undefined,
        url: https(fix.presentation.source, `${where} presentation`),
      }),
    );

  const press = [];
  for (const x of p.press ?? []) {
    if (x.note && /redirect|unverified|check before/i.test(x.note)) {
      unmapped(`${where}: press "${x.outlet}" skipped (${x.note})`);
      ask(`${where}: press link "${x.outlet}" was skipped because ${x.note}. Keep it?`);
      continue;
    }
    press.push(compact({ outlet: x.outlet, url: https(x.url, `${where} press`), date: x.date }));
  }

  const awards = (p.awards ?? []).map((a) => {
    let under_title;
    const m = /awarded under the title '([^']+)'/.exec(a.note ?? "");
    if (m) {
      const prefix = m[1].replace(/\.{3}$|…$/, "");
      const full = (p.priorTitles ?? []).find((t) => t.startsWith(prefix));
      under_title = full ? full.replace(/\s*\([^)]*\)\s*$/, "") : m[1];
    }
    // R2 §3/§7.3: awards won under an earlier title say so. The dataset's
    // priorTitles name the award records each title was used for, e.g.
    // "(…; 2021 INFORMS award records)" or "(…; 2022-2023 award records)".
    // Only DOCUMENTED awards are matched (PI-reported ones are not attributed).
    if (!under_title && !/PI-reported only/i.test(a.label ?? "")) {
      for (const t of p.priorTitles ?? []) {
        const paren = /\(([^)]*)\)\s*$/.exec(t)?.[1] ?? "";
        const informs = /(\d{4}) INFORMS award records/.exec(paren);
        const range = /(\d{4})-(\d{4}) award records/.exec(paren);
        const hit =
          (informs && Number(informs[1]) === a.year && /^INFORMS/.test(a.name)) ||
          (range && a.year >= Number(range[1]) && a.year <= Number(range[2]));
        if (hit) {
          under_title = t.replace(/\s*\([^)]*\)\s*$/, "");
          break;
        }
      }
    }
    const selfReported = /PI-reported only/i.test(a.label ?? "");
    if (selfReported) note(`${where}: award "${a.name}" (${a.year}) is PI-reported only (CV).`);
    return compact({
      name: a.name,
      year: a.year,
      under_title,
      source: selfReported ? "self-reported" : undefined,
    });
  });

  let in_brief;
  if (p.summaryInferred) {
    ask(
      `${where}: no in_brief (the drafted summary was inferred from the title). Write 1–3 plain sentences.`,
    );
  } else if (p.summary) {
    in_brief = publicCopy(scrub(p.summary)); // WP3 request 4 item 5: no "The PI's"
    if (in_brief.length > 400) fail(`${where}: in_brief > 400 chars`);
    if (sentenceCount(in_brief) > 3) note(`${where}: in_brief has more than 3 sentences`);
  }

  const draft = p.review?.status !== "verified";
  const directions = [...(p.directions ?? [])];
  pubDirections.set(slug, directions);
  pubDraft.set(slug, draft);

  const data = compact({
    title: scrub(p.title),
    authors,
    type,
    venue: fix?.venue ?? p.venue ?? undefined,
    year: p.year ?? undefined,
    date_online: date_online ?? undefined,
    volume: C.volume ?? undefined,
    issue: C.issue ?? undefined,
    pages: C.pages ?? undefined,
    doi: p.doi ?? undefined,
    status: published ? "published" : st.status,
    status_note: st?.status_note,
    status_source: published ? undefined : (st.source ?? "self-reported"),
    as_of: published ? undefined : st.as_of,
    links: compact(links),
    presentations,
    press,
    awards,
    directions,
    in_brief,
    featured: p.featured === true,
    draft,
  });
  put(`publications/${slug}.md`, frontMatterFile(data));
}

// Known fixes (R2 §7.5) — asserted, so a dataset regression fails the import.
{
  const pub = (old) => files.get(`publications/${pubSlug.get(old)}.md`);
  for (const [k, v] of files)
    if (/full-view/.test(v)) fail(`${k}: contains "full-view" (should be "US")`);
  if (/theconversation|the74million/.test(pub("making-chatgpt-work-2025")))
    fail(
      "press for The Conversation / The 74 must sit on teachers-knapsack, not making-chatgpt-work",
    );
  if (
    !/theconversation/.test(pub("teachers-knapsack")) ||
    !/the74million/.test(pub("teachers-knapsack"))
  )
    fail("teachers-knapsack must carry The Conversation and The 74 press links");
  if (!/Best Student Paper/.test(pub("gig-drivers-2023")))
    fail('gig-drivers-2023: AOM 2019 award must read "Best Student Paper"');
  note(
    "Known fixes (R2 §7.5) verified: no 'full-view'; press on teachers-knapsack; AOM 'Best Student Paper'.",
  );
}

// ---------------------------------------------------------------------------
// Projects (CONTENT-MAPPING §5)

const COMPLETED_PROJECTS = new Set(["community-vibrancy", "learning-on-the-go"]);
for (const pr of ds.projects) {
  const where = `projects/${pr.slug}`;
  const pubs = new Set(
    (pr.publications ?? []).map(
      (s) => pubSlug.get(s) ?? fail(`${where}: unknown publication ${s}`),
    ),
  );
  for (const p of ds.publications)
    if ((p.projects ?? []).includes(pr.slug)) pubs.add(pubSlug.get(p.slug));

  const team = [];
  const collabs = [];
  for (const s of pr.people ?? []) {
    if (personSlugs.has(s)) team.push(s);
    else if (collaborators.has(s)) {
      const c = collaborators.get(s);
      collabs.push(
        compact({
          name: c.name,
          affiliation: cleanAffiliation(c.affiliation),
          url: collaboratorUrl(s, `${where} collaborator url`),
          consent: false,
        }),
      );
    } else unmapped(`${where}: person ${s} not found`);
  }

  const funding = [];
  let fundingPiReported = false;
  for (const p of ds.publications) {
    if (!(p.projects ?? []).includes(pr.slug)) continue;
    for (const f of p.funding ?? []) {
      const name = f.name.replace(/\((\d{4});[^)]*\)/, "($1)").trim();
      if (!funding.some((x) => x.name === name)) funding.push({ name });
      if (/PI-reported/i.test(f.label ?? "")) fundingPiReported = true;
    }
  }

  let summary;
  if (pr.summaryInferred)
    ask(`${where}: no summary (the drafted one was inferred from the title). Write ≤ 200 chars.`);
  else summary = pr.summary;
  if (summary && summary.length > 200) fail(`${where}: summary > 200 chars`);

  const draft = pr.review?.status !== "verified" || fundingPiReported;
  if (!pr.directions?.length)
    ask(`${where}: no research direction; assign one or keep it unlisted.`);

  const data = compact({
    title: pr.title,
    summary,
    directions: [...(pr.directions ?? [])],
    status: COMPLETED_PROJECTS.has(pr.slug) ? "completed" : "active",
    team,
    collaborators: collabs,
    publications: [...pubs].sort(),
    funding,
    draft,
  });
  put(`projects/${pr.slug}.md`, frontMatterFile(data));
}

// ---------------------------------------------------------------------------
// News (CONTENT-MAPPING §6)

/**
 * Talk dates and places (WP5 request 8 item 4), taken from each item's own
 * summary (flagged for confirmation in CONTENT-QUESTIONS F5). Multi-day events
 * use the day of the lab's talk where the programme gives it: all three MSOM
 * 2026 talks were on Jul 14 (sessions TB8/TD10, R2 §4; CON-09), CSCW 2025 on
 * Oct 20–21 (first day).
 */
const NEWS_EVENTS = {
  "2023-08-nasa-symposium": { event_date: "2023-09-22", location: "NASA Ames Research Center" },
  "2023-10-mit-ide-seminar": {
    event_date: "2023-11-15",
    location: "MIT Initiative on the Digital Economy",
  },
  "2023-12-stanford-seminar": {
    event_date: "2024-03-06",
    location: "Stanford Graduate School of Business",
  },
  "2025-10-cscw-bergen": { event_date: "2025-10-20", location: "CSCW 2025, Bergen, Norway" },
  "2026-05-msom-three-papers": { event_date: "2026-07-14", location: "Harvard Business School" },
};

/**
 * Summary rewordings that keep the facts and match the sources' tense (CON-09):
 * the only source for the Tuck talk is the PI site's forward-looking "I will be
 * presenting", so it is worded like its sibling items ("was announced to present").
 */
const reword = (slug, from, to) => (s) =>
  from.test(s)
    ? s.replace(from, to)
    : fail(`news ${slug}: rewording no longer matches the dataset`);
const NEWS_SUMMARY = {
  "2024-11-tuck-seminar": reword(
    "2024-11-tuck-seminar",
    /^Park presented\b/,
    "Park was announced to present",
  ),
};

const isPiReported = (label) => /PI-reported/i.test(label ?? "");

for (const n of ds.news) {
  const slug = newsSlug(n.slug, n.date);
  const where = `news/${slug}`;
  if (!["publication", "talk", "award", "grant"].includes(n.category))
    fail(`${where}: unmapped category ${n.category}`);
  const publications = (n.related ?? []).map(
    (s) => pubSlug.get(s) ?? fail(`${where}: unknown related ${s}`),
  );
  const directions = [...new Set(publications.flatMap((s) => pubDirections.get(s) ?? []))].sort();

  // Public wording: the PI by full name on first mention (CON-08), number ranges
  // with an en dash, and the item-specific rewordings above.
  const title = fullNameFirst(scrub(n.title), PI_GIVEN, PI_NAME);
  let summary = scrub(n.body);
  if (summary) {
    summary = NEWS_SUMMARY[n.slug]?.(summary) ?? summary;
    summary = enDashRanges(fullNameFirst(summary, PI_GIVEN, PI_NAME));
    if (summary.length > 280) fail(`${where}: summary > 280`);
  }

  // CON-02: a publication item reports the paper's status. It stays a draft
  // while every paper it is about is a draft, or when the status is only the
  // lab's own report (label "PI-reported": the journal decision is not
  // publicly verifiable, R2 §1.3/§7.4). Nothing is published until the lab flips it.
  let draft = n.review?.status !== "verified";
  if (
    !draft &&
    n.category === "publication" &&
    (isPiReported(n.review?.label) ||
      (publications.length > 0 && publications.every((s) => pubDraft.get(s))))
  ) {
    draft = true;
    const why = isPiReported(n.review?.label)
      ? "it states a journal decision that only the lab reports (not publicly verifiable)"
      : "every paper it is about is still a draft";
    note(`${where}: held as draft because ${why}.`);
    ask(
      `${where}: held as draft because ${why}. Publish it together with the paper, or reword it as the lab's own report with a date.`,
    );
  }

  const data = compact({
    date: n.date,
    type: n.category,
    title,
    ...(NEWS_EVENTS[n.slug] ?? {}),
    summary,
    directions,
    publications,
    draft,
  });
  put(`news/${slug}.md`, frontMatterFile(data));
}

// ---------------------------------------------------------------------------
// Opportunities (CONTENT-MAPPING §7)

const OPP = [
  {
    match: /URAP\)$/,
    slug: "urap",
    audience: "students",
    status: "closed",
    // Redesign CONTENT request 1: the same facts as the dataset route, in plain sentences.
    route: () =>
      "Apply through URAP to one of four tracks: mathematical modeling and theory; experimental systems and game building; research generalist and research operations; or data science, econometrics and algorithms. About 9–11 hours a week; remote work is possible.",
  },
  {
    match: /^Research assistants/,
    slug: "research-assistants",
    audience: "students",
    status: "unknown",
  },
  {
    match: /^Academic and industry/,
    slug: "collaborators",
    audience: "partners",
    status: "unknown",
  },
  { match: /^Course credit/, slug: "urap-course-credit", audience: "students", status: "unknown" },
  { match: /^PhD students/, slug: "phd-postdoc", audience: "phd-postdoc", status: "unknown" },
];
for (const o of ds.opportunities) {
  const m = OPP.find((x) => x.match.test(o.title));
  if (!m) {
    unmapped(`opportunity "${o.title}" has no mapping (skipped)`);
    continue;
  }
  const where = `opportunities/${m.slug}`;
  // Public wording: the PI by name (CON-08), en-dash number ranges.
  const route = o.route
    ? enDashRanges(publicCopy(m.route ? m.route(o.route) : o.route))
    : undefined;
  if (route && route.length > 300) fail(`${where}: route > 300`);
  if (!route) ask(`${where}: no route or statement exists; what should the site say?`);
  const data = compact({
    title: o.title,
    audience: m.audience,
    route,
    url: https(o.url, `${where} url`),
    apply_url: https(o.applyUrl, `${where} apply_url`),
    email: o.email ?? undefined,
    status: m.status,
    as_of: CHECKED_ON,
    directions: [],
    draft: o.review?.status !== "verified",
  });
  put(`opportunities/${m.slug}.md`, frontMatterFile(data));
}

// ---------------------------------------------------------------------------
// Directions (CONTENT-MAPPING §2 + D-04; WP7 rules for question/body)

const CORE_ORDER = ["algorithmic-advice", "ai-at-work", "learning-on-the-job", "platform-work"];
for (const d of ds.directions) {
  const where = `directions/${d.slug}`;
  const color = COLOR[d.suggestedColor] ?? fail(`${where}: unknown colour ${d.suggestedColor}`);
  const archived = d.tier !== "core";
  const qcfg = DIRECTION_QUESTIONS[d.slug] ?? {};
  const q = chooseQuestion(d.questions ?? [], d.inferredQuestionIdx ?? [], qcfg);
  if (!q) ask(`${where}: no guiding question qualifies (all inferred or too long).`);
  for (const i of d.inferredQuestionIdx ?? [])
    ask(
      `${where}: dropped inferred question #${i + 1} ("${d.questions[i]}"). Keep, reword or drop?`,
    );
  if (q?.shortened)
    note(`${where}: question is an own-words shortening of dataset question #${q.index + 1}.`);
  const body = (DIRECTION_BODIES[d.slug] ?? fail(`${where}: no drafted body`)).trim();
  const wc = wordCount(body);
  if (wc < 80 || wc > 150) fail(`${where}: body has ${wc} words (need 80–150)`);
  if (d.oneLiner && d.oneLiner.length > 160) fail(`${where}: summary > 160`);

  const data = compact({
    title: d.title,
    short_label: d.shortTitle,
    question: q?.text,
    summary: d.oneLiner,
    color,
    status: archived ? "archived" : "active",
    archived_on: archived ? "2026-10" : undefined,
    findings: [],
    draft: true,
  });
  put(`directions/${d.slug}.md`, frontMatterFile(data, body));
}
for (const s of CORE_ORDER)
  if (!ds.directions.some((d) => d.slug === s && d.tier === "core"))
    fail(`core direction ${s} missing`);

// ---------------------------------------------------------------------------
// site.yml and pages (CONTENT-MAPPING §1; WP7 drafts in copy.mjs)

const S = ds.settings;
const siteData = {
  name: S.shortName,
  long_name: S.labName,
  affiliation_text: "Haas School of Business, University of California, Berkeley",
  email: S.email,
  address: "2220 Piedmont Avenue, Berkeley, CA 94720",
  social: {},
  figure_mode: "cluster",
  // CNT-01: the flags live in this field (shown in the CMS and kept on save),
  // not in YAML comments, which the first CMS save of Settings deletes.
  editors_note:
    `Imported from the research dataset on ${DRAFTED_ON} (WP7). Everything marked draft is pending lab review; open items are listed in docs/CONTENT-QUESTIONS.md.\n\n` +
    `FLAGGED: the long name is the H-12 default (option A), pending the PI (CONTENT-QUESTIONS A1).\n` +
    `FLAGGED: the email ${S.email} is printed on the PI site but not confirmed as a monitored mailbox (CONTENT-QUESTIONS A2).\n\n` +
    `Direction order lists the live directions only; archived directions are left out (DECISIONS D-04).\n`,
  launched: false,
  direction_order: CORE_ORDER,
  redirects: [],
};
put("site.yml", toYaml(siteData));

const pageFile = (name, data) =>
  put(
    `pages/${name}.yml`,
    toYaml(
      Object.fromEntries(
        Object.entries(data).map(([k, v]) => [
          k,
          typeof v === "string" ? v.trim() + (v.includes("\n") ? "\n" : "") : v,
        ]),
      ),
    ),
  );
pageFile("home", HOME);
pageFile("about", ABOUT);
pageFile("join", JOIN);
pageFile("accessibility", ACCESSIBILITY);
pageFile("privacy", PRIVACY);

put(
  "README.md",
  `# content/

Site content (Decap CMS writes here; the build reads it). First generated on ${DRAFTED_ON} by
\`scripts/import/import-dataset.mjs\` from the research dataset (kept outside the repo).
Mapping rules: \`docs/CONTENT-MAPPING.md\`. Open questions for the PI: \`docs/CONTENT-QUESTIONS.md\`.

Everything with \`draft: true\` is excluded from production builds (DECISIONS D-03).
`,
);

// ---------------------------------------------------------------------------
// Safety: hidden-only roster names must never be written (D-06).

{
  const h = loadHashes();
  for (const [rel, text] of files) {
    const hits = scanText(text, h);
    if (hits.length)
      fail(`${rel}: contains ${hits.length} hidden-only roster name window(s); refusing to write`);
  }
}

// Public copy never calls the PI "the PI" (CON-08; WP3 request 4 item 5).
for (const [rel, text] of files)
  if (rel !== "site.yml" && rel !== "README.md" && /\b[Tt]he PI\b/.test(text))
    fail(`${rel}: public copy says "the PI"; name ${PI_NAME} instead`);

// ---------------------------------------------------------------------------
// Owner decision 2026-10-20 (DECISIONS D-10): publish every imported entry.
// The per-entry draft logic above is kept so the review reasons stay visible in
// the notes. Consent flags (listed, photo_consent, email_public, now_at_public)
// are separate from draft and still apply.
// Exception: a project with no research direction stays a draft (E_DIRECTIONS_EMPTY);
// assigning one would invent a lab fact. The lab tags it in the CMS, then publishes it.
const PUBLISH_ALL = true;
if (PUBLISH_ALL)
  for (const [rel, text] of files) {
    if (rel.startsWith("projects/") && /^directions: \[\]$/m.test(text)) {
      note(`${rel}: kept as draft under D-10 (no research direction to place it under).`);
      continue;
    }
    files.set(rel, text.replace(/^draft: true$/m, "draft: false"));
  }

// ---------------------------------------------------------------------------
// Format with the repo's Prettier config (so format:check stays clean), then diff/write.

for (const [rel, text] of files) {
  const filepath = path.join(outDir, rel);
  const cfg = (await prettier.resolveConfig(filepath)) ?? {};
  files.set(rel, await prettier.format(text, { ...cfg, filepath }));
}

const COLLECTION_DIRS = [
  "directions",
  "projects",
  "publications",
  "people",
  "news",
  "opportunities",
  "pages",
];
const existing = [];
for (const c of COLLECTION_DIRS) {
  const d = path.join(outDir, c);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) existing.push(`${c}/${f}`);
}
const extra = existing.filter((r) => !files.has(r));
const changed = [];
const created = [];
const same = [];
for (const [rel, text] of files) {
  const abs = path.join(outDir, rel);
  if (!fs.existsSync(abs)) created.push(rel);
  else if (fs.readFileSync(abs, "utf8") !== text) changed.push(rel);
  else same.push(rel);
}

const counts = {};
for (const rel of files.keys()) {
  const [c, f] = rel.split("/");
  if (!f) continue;
  const key = c;
  counts[key] ??= { total: 0, draft: 0, published: 0 };
  counts[key].total++;
  const isDraft = /^draft: true$/m.test(files.get(rel));
  counts[key][isDraft ? "draft" : "published"]++;
}

console.log(`[import] mode=${MODE} out=${path.relative(ROOT, outDir) || "."}`);
console.log(
  `[import] files: ${files.size} (new ${created.length}, changed ${changed.length}, unchanged ${same.length}, extra ${extra.length})`,
);
console.table(counts);
if (flag("--verbose") || MODE !== "check") {
  console.log(`\n[import] notes (${report.notes.length}):\n- ` + report.notes.join("\n- "));
  console.log(
    `\n[import] not mapped / dropped (${report.unmapped.length}):\n- ` +
      report.unmapped.join("\n- "),
  );
  console.log(
    `\n[import] questions for the PI (${report.questions.length}):\n- ` +
      report.questions.join("\n- "),
  );
}
if (extra.length)
  console.log(`\n[import] files in content/ not produced by this import:\n- ${extra.join("\n- ")}`);

if (MODE === "check") {
  if (created.length || changed.length) {
    console.error(
      `[import] --check: content/ differs from the import (${[...created, ...changed].join(", ")})`,
    );
    process.exit(1);
  }
  console.log("[import] --check: content/ matches the import");
} else if (MODE === "write") {
  for (const rel of [...created, ...changed]) {
    const abs = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, files.get(rel));
  }
  if (PRUNE)
    for (const rel of extra) {
      fs.rmSync(path.join(outDir, rel));
      console.log(`[import] pruned ${rel}`);
    }
  console.log(`[import] wrote ${created.length + changed.length} file(s)`);
} else {
  console.log("\n[import] dry run: nothing written (use --write)");
}
