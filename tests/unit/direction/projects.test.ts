/** WP2 project helpers (src/components/projects/model.ts) over a small in-memory content set. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { parseContentFiles, type VirtualFile } from "@/lib/content/read";
import {
  canonicalPaper,
  compareProjects,
  dayMonth,
  groupProjectsByPrimaryDirection,
  latestNews,
  paperYears,
  papersByType,
  papersFact,
  projectLineModel,
  groupProjectsByStatus,
  outputsToMaterials,
  projectBreadcrumb,
  projectFindings,
  projectTeamRows,
  projectYears,
  statusesPresent,
} from "@/components/projects/model";
import { projectPapersCell } from "@/components/projects/ProjectLedger";
import { showsReportedStatus, wipStatus } from "@/components/direction/InProgressList";

const md = (front: string, body = "") => `---\n${front.trim()}\n---\n${body}\n`;

const FILES: VirtualFile[] = [
  {
    path: "site.yml",
    text: `name: BOBALAB
long_name: Fixture Lab
affiliation_text: Fixture School
email: lab@example.edu
address: 1 Fixture Way
launched: false
direction_order: [beta, alpha]
`,
  },
  {
    path: "directions/alpha.md",
    text: md(`
title: Alpha direction
short_label: Alpha
color: butterfly-pea
findings:
  - text: Alpha finding citing paper one.
    publication: doe-2024-paper-one
    evidence: published
  - text: Alpha finding without a paper.
    evidence: preliminary
`),
  },
  {
    path: "directions/beta.md",
    text: md(`
title: Beta direction
short_label: Beta
color: oolong
findings:
  - text: Beta finding citing paper one too.
    publication: doe-2024-paper-one
    evidence: working-paper
`),
  },
  {
    path: "directions/zeta.md",
    text: md(`
title: Zeta direction
short_label: Zeta
color: jasmine
status: archived
archived_on: "2026-10"
`),
  },
  {
    path: "publications/doe-2024-paper-one.md",
    text: md(`
title: Paper one
authors: [{ name: A. Doe }]
type: journal
venue: Fixture Journal
year: 2024
doi: 10.5555/one
status: published
directions: [alpha]
`),
  },
  {
    path: "publications/doe-2025-paper-two.md",
    text: md(`
title: Paper two
authors: [{ name: A. Doe }]
type: working-paper
year: 2025
links: { ssrn: "https://ssrn.example/2" }
status: working-paper
status_source: documented
as_of: "2025-05"
directions: [alpha]
`),
  },
  {
    path: "publications/doe-2026-paper-three.md",
    text: md(`
title: Paper three
authors: [{ name: A. Doe }]
type: work-in-progress
status: in-progress
status_source: self-reported
as_of: "2026-10"
directions: [alpha]
`),
  },
  {
    path: "projects/p-active.md",
    text: md(`
title: Active alpha project
directions: [alpha]
status: active
start_year: 2020
publications: [doe-2024-paper-one, doe-2025-paper-two, doe-2026-paper-three]
outputs:
  - { type: code, label: Replication code, url: "https://code.example/x" }
  - { type: talk, label: Conference talk, url: "https://talk.example/x" }
  - { type: paper, label: Journal version, url: "https://doi.org/10.5555/one" }
`),
  },
  {
    path: "projects/p-done.md",
    text: md(`
title: Completed beta-first project
directions: [beta, alpha]
status: completed
start_year: 2018
end_year: 2021
`),
  },
  {
    path: "projects/p-orphan.md",
    text: md(`
title: Orphan project
status: active
`),
  },
  {
    path: "projects/p-zeta.md",
    text: md(`
title: Zeta project
directions: [zeta]
status: paused
start_year: 2019
`),
  },
  {
    path: "projects/p-alpha-old.md",
    text: md(`
title: Older alpha project
directions: [alpha]
status: completed
start_year: 2015
end_year: 2015
`),
  },
];

const c = buildContent(parseContentFiles(FILES), { preview: false, today: "2026-10-20" });
const proj = (s: string) => c.getProject(s)!;

describe("in-memory fixture is valid", () => {
  it("loads every entry", () => {
    expect(c.directions.map((d) => d.slug)).toEqual(["beta", "alpha"]);
    expect(c.archivedDirections.map((d) => d.slug)).toEqual(["zeta"]);
    expect(c.projects).toHaveLength(5);
  });
});

describe("/projects/ grouping by primary direction (§D6)", () => {
  const groups = groupProjectsByPrimaryDirection(c);
  it("orders groups: live (editorial order), archived, then no direction", () => {
    expect(groups.map((g) => g.direction?.slug ?? null)).toEqual(["beta", "alpha", "zeta", null]);
  });
  it("puts every project exactly once, under its FIRST direction", () => {
    const all = groups.flatMap((g) => g.projects.map((p) => p.slug));
    expect(all.sort()).toEqual(c.projects.map((p) => p.slug).sort());
    expect(groups[0]!.projects.map((p) => p.slug)).toEqual(["p-done"]);
    expect(groups.find((g) => g.direction === null)!.projects.map((p) => p.slug)).toEqual([
      "p-orphan",
    ]);
  });
  it("sorts inside a group: active first, then newest start year", () => {
    expect(groups[1]!.projects.map((p) => p.slug)).toEqual(["p-active", "p-alpha-old"]);
  });
  it("drops empty groups (fixture n0 has none at all in production)", () => {
    const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
    const n0 = buildContent(loadRawContent(path.join(FIX, "n0")), { preview: false });
    expect(groupProjectsByPrimaryDirection(n0)).toEqual([]);
  });
});

describe("/research/ grouping by status (§D4)", () => {
  it("Active, Paused, Completed in that order; archived projects left out", () => {
    const g = groupProjectsByStatus(c.projects);
    expect(g.map((x) => x.label)).toEqual(["Active", "Paused", "Completed"]);
    expect(g[0]!.projects.map((p) => p.slug)).toEqual(["p-active", "p-orphan"]);
    expect(statusesPresent(c.projects)).toEqual(["active", "paused", "completed"]);
  });
  it("compareProjects is a total order (stable on title)", () => {
    const sorted = [...c.projects].sort(compareProjects).map((p) => p.slug);
    expect(sorted).toEqual(["p-active", "p-orphan", "p-zeta", "p-done", "p-alpha-old"]);
  });
});

describe("years", () => {
  it("formats ranges, 'Since' for running work and single years", () => {
    expect(projectYears(proj("p-done"))).toBe("2018–2021");
    expect(projectYears(proj("p-active"))).toBe("Since 2020");
    expect(projectYears(proj("p-zeta"))).toBe("Since 2019");
    expect(projectYears(proj("p-alpha-old"))).toBe("2015");
    expect(projectYears(proj("p-orphan"))).toBeNull();
  });
});

describe("breadcrumb (§D6.1, WP2 #6)", () => {
  it("Research › primary direction › project", () => {
    expect(projectBreadcrumb(proj("p-done"))).toEqual([
      { label: "Research", href: "/research/" },
      { label: "Beta", href: "/research/beta/" },
      { label: "Completed beta-first project" },
    ]);
  });
  it("falls back to Projects when the project has no direction", () => {
    expect(projectBreadcrumb(proj("p-orphan"))[1]).toEqual({
      label: "Projects",
      href: "/projects/",
    });
  });
});

describe("outputs → materials row (§D6.7)", () => {
  it("maps types to material kinds and keeps the editor's label", () => {
    expect(outputsToMaterials(proj("p-active").outputs)).toEqual([
      { kind: "code", href: "https://code.example/x", label: "Replication code" },
      { kind: "video", href: "https://talk.example/x", label: "Conference talk" },
      { kind: "publisher", href: "https://doi.org/10.5555/one", label: "Journal version" },
    ]);
  });
});

describe("key findings (§D6.5) and how to cite (§D6.10)", () => {
  it("collects direction findings that cite one of the project's papers, once each", () => {
    const f = projectFindings(c, proj("p-active"));
    expect(f.map((x) => x.text)).toEqual([
      "Beta finding citing paper one too.",
      "Alpha finding citing paper one.",
    ]);
    expect(f.every((x) => x.publication?.slug === "doe-2024-paper-one")).toBe(true);
    expect(projectFindings(c, proj("p-done"))).toEqual([]);
  });
  it("cites the newest published, counted paper; none → hidden", () => {
    expect(canonicalPaper(proj("p-active"))?.slug).toBe("doe-2024-paper-one");
    expect(canonicalPaper(proj("p-done"))).toBeUndefined();
  });
  it("splits counted papers from work in progress (D-05)", () => {
    const p = proj("p-active");
    expect(p.publicationRefs.filter((x) => x.counted).map((x) => x.slug)).toEqual([
      "doe-2024-paper-one",
      "doe-2025-paper-two",
    ]);
    expect(p.publicationRefs.filter((x) => !x.counted).map((x) => x.slug)).toEqual([
      "doe-2026-paper-three",
    ]);
  });
});

describe("team rows (§D6.6, D-06; verify CON-11)", () => {
  const TEAM_FILES: VirtualFile[] = [
    FILES[0]!,
    FILES[1]!,
    {
      path: "people/pat-pi.md",
      text: md(`
name: Pat Pi
role: pi
title: Fixture Professor
listed: true
profile_page: true
draft: false
`),
    },
    {
      path: "people/sam-student.md",
      text: md(`
name: Sam Student
role: phd
listed: true
profile_page: false
draft: true
`),
    },
    {
      path: "people/nova-nopaper.md",
      text: md(`
name: Nova Nopaper
role: masters
listed: true
profile_page: false
draft: true
`),
    },
    {
      path: "publications/student-2025-paper.md",
      text: md(`
title: Student paper
authors:
  - { name: Sam Student, person: sam-student }
  - { name: Pat Pi, person: pat-pi }
type: journal
venue: Fixture Journal
year: 2025
doi: 10.5555/student
status: published
directions: [alpha]
`),
    },
    {
      path: "projects/p-team.md",
      text: md(`
title: Team project
directions: [alpha]
status: completed
team: [sam-student, pat-pi, nova-nopaper]
publications: [student-2025-paper]
`),
    },
  ];
  const build = (preview: boolean) =>
    buildContent(parseContentFiles(TEAM_FILES), { preview, today: "2026-10-20" });

  it("production: a draft member who authors the project's paper is named as plain text, in team order", () => {
    const rows = projectTeamRows(build(false).getProject("p-team")!);
    expect(rows).toEqual([
      { kind: "name", slug: "sam-student", name: "Sam Student" },
      expect.objectContaining({
        kind: "member",
        person: expect.objectContaining({ slug: "pat-pi" }),
      }),
    ]);
  });
  it("production: a draft member who authors no paper here stays hidden (nothing from the person record)", () => {
    const rows = projectTeamRows(build(false).getProject("p-team")!);
    expect(JSON.stringify(rows)).not.toContain("Nova");
    // The plain row carries the name only: no role, avatar or profile data.
    expect(Object.keys(rows[0]!).sort()).toEqual(["kind", "name", "slug"]);
  });
  it("preview: draft members are full rows (with their draft badge in the page)", () => {
    const rows = projectTeamRows(build(true).getProject("p-team")!);
    expect(rows.map((r) => r.kind)).toEqual(["member", "member", "member"]);
  });
});

describe("project page facts (redesign D-13; P3 dl.facts)", () => {
  it("names counted papers by type and year, then work in progress", () => {
    expect(papersFact(proj("p-active"))).toBe(
      "1 journal article and 1 working paper, 2024 and 2025; 1 in progress",
    );
    expect(papersFact(proj("p-done"))).toBeNull();
  });
  it("pluralises type words and joins years without a serial comma", () => {
    expect(papersByType([{ type: "working-paper" }, { type: "working-paper" }])).toBe(
      "2 working papers",
    );
    expect(papersByType([])).toBeNull();
    expect(paperYears([{ year: 2026 }, { year: 2021 }, { year: 2023 }, { year: undefined }])).toBe(
      "2021, 2023 and 2026",
    );
  });
  it("projects table cells: papers first, else work in progress, else nothing", () => {
    expect(projectPapersCell(proj("p-active"))).toBe("2 papers");
    expect(projectPapersCell(proj("p-done"))).toBeNull();
    expect(projectPapersCell({ publicationRefs: [{ counted: false }] } as never)).toBe(
      "1 in progress",
    );
  });
  it("latest news is the newest by date; day and month without the year", () => {
    expect(latestNews([{ date: "2026-05-11" }, { date: "2026-08-04" }])?.date).toBe("2026-08-04");
    expect(latestNews([])).toBeNull();
    expect(dayMonth("2026-05-11")).toBe("11 May");
    expect(dayMonth("2026-08")).toBe("August");
  });
});

describe("project line (P3 project.html Figure 1)", () => {
  it("bins counted, dated papers by year on the project's lanes; WIP is left out", () => {
    const m = projectLineModel(proj("p-active"), [])!;
    expect(m.lanes.map((l) => l.slug)).toEqual(["alpha"]);
    expect(m.years.map((y) => y.year)).toEqual([2024, 2025]);
    expect(m.years.flatMap((y) => y.events.map((e) => e.key))).toEqual([
      "doe-2024-paper-one",
      "doe-2025-paper-two",
    ]);
    expect(m.papers).toBe(2);
  });
  it("puts year-only papers first inside a year, then news in date order, each in its own column", () => {
    const m = projectLineModel(proj("p-active"), [
      { slug: "n-late", date: "2025-09-01", title: "Later" },
      { slug: "n-early", date: "2025-02-01", title: "Earlier" },
    ])!;
    const y2025 = m.years.find((y) => y.year === 2025)!;
    expect(y2025.events.map((e) => e.key)).toEqual(["doe-2025-paper-two", "n-early", "n-late"]);
    const note = y2025.events[1]!;
    expect(note.kind === "news" && note.day).toBe("1 February");
    expect(note.kind === "news" && note.href).toBe("/news/n-early/");
  });
  it("dates a paper by the same-year news item about it, which joins the paper's column (P3 'posted on SSRN')", () => {
    const m = projectLineModel(proj("p-active"), [
      { slug: "n-may", date: "2025-05-11", title: "Other news" },
      {
        slug: "n-posted",
        date: "2025-08-04",
        title: "Paper two posted",
        publications: ["doe-2025-paper-two"],
      },
      // About paper one, but from another year: stays a separate note.
      {
        slug: "n-old",
        date: "2025-03-01",
        title: "Revision",
        publications: ["doe-2024-paper-one"],
      },
    ])!;
    const y2025 = m.years.find((y) => y.year === 2025)!;
    // Left to right is earlier to later: the paper now sits after the May note.
    expect(y2025.events.map((e) => e.key)).toEqual(["n-old", "n-may", "doe-2025-paper-two"]);
    const paper = y2025.events[2]!;
    expect(paper.kind === "paper" && paper.date).toBe("2025-08-04");
    expect(paper.kind === "paper" && paper.note?.key).toBe("n-posted");
    expect(paper.kind === "paper" && paper.note?.day).toBe("4 August");
    // The attached note is not drawn twice.
    expect(m.years.flatMap((y) => y.events.map((e) => e.key))).not.toContain("n-posted");
    expect(m.news).toBe(3);
  });
  it("uses an in-year date_online for the paper's place", () => {
    const pub = { ...proj("p-active").publicationRefs[1]!, date_online: "2025-12" };
    const m = projectLineModel(
      { directionRefs: proj("p-active").directionRefs, publicationRefs: [pub] },
      [{ slug: "n", date: "2025-06-01", title: "News" }],
    )!;
    expect(m.years[0]!.events.map((e) => e.key)).toEqual(["n", "doe-2025-paper-two"]);
  });
  it("draws a paper on every project lane it belongs to (the ink tick joins them)", () => {
    const pub = { ...proj("p-active").publicationRefs[0]!, directions: ["beta", "alpha"] };
    const m = projectLineModel(
      { directionRefs: proj("p-done").directionRefs, publicationRefs: [pub] },
      [{ slug: "n", date: "2024-03-01", title: "News" }],
    )!;
    const e = m.years[0]!.events[0]!;
    expect(e.kind === "paper" && e.lanes).toEqual([0, 1]);
  });
  it("is not drawn without a dated paper or with a single event", () => {
    expect(projectLineModel(proj("p-done"), [])).toBeNull();
    const one = {
      ...proj("p-active"),
      publicationRefs: proj("p-active").publicationRefs.slice(0, 1),
    };
    expect(projectLineModel(one, [])).toBeNull();
    expect(projectLineModel(proj("p-orphan"), [])).toBeNull();
  });
});

describe("in-progress rows (D-13 item 7: no repeated hedges)", () => {
  const wip = proj("p-active").publicationRefs.find((x) => !x.counted)!;
  it("a bare in-progress status is not repeated under the 'In progress' heading", () => {
    expect(wip.status).toBe("in-progress");
    expect(wipStatus(wip)).toBeNull();
    // …so the page needs no provenance footnote for it.
    expect(showsReportedStatus([wip])).toBe(false);
  });
  it("a status that adds something stays, and then the footnote is needed", () => {
    const submitted = { ...wip, status: "submitted" as const, status_note: "to Fixture Review" };
    expect(wipStatus(submitted)).toMatch(/^Submitted to Fixture Review/);
    expect(showsReportedStatus([submitted])).toBe(true);
  });
});
