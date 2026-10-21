/** WP4 view models (src/components/people/model.ts) over the fictional fixture sets. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { EMPTY_PARAM } from "@/lib/content/queries";
import { DEFAULT_SWATCH_ORDER } from "@/lib/content/palette";
import {
  avatarSwatch,
  buildPeopleIndex,
  buildPersonProfile,
  countLabel,
  personLinks,
  roleLine,
  tenureLine,
} from "@/components/people/model";

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const TODAY = "2026-10-20";
const load = (set: string, preview = false) =>
  buildContent(loadRawContent(path.join(FIX, set)), { preview, today: TODAY });

const slugsOf = (xs: Array<{ person: { slug: string } }>) => xs.map((x) => x.person.slug);

describe("buildPeopleIndex — order and grouping (§D9)", () => {
  const m = buildPeopleIndex(load("consent-edge-cases"));

  it("groups current people in the §D9 role order, skipping empty groups", () => {
    expect(m.groups.map((g) => g.role)).toEqual(["pi", "postdoc", "phd", "undergrad", "affiliate"]);
    expect(m.groups.map((g) => g.label)).toEqual([
      "Faculty Director",
      "Postdocs",
      "PhD students",
      "Undergraduate RAs",
      "Affiliates & collaborators",
    ]);
  });

  it("derives alumni from `end` and groups them by end year, newest first", () => {
    expect(m.alumni.map((y) => [y.year, slugsOf(y.items)])).toEqual([
      [2025, ["gray-alum"]],
      [2024, ["finley-alum"]],
    ]);
    // A future end date keeps the person current.
    expect(slugsOf(m.current)).toContain("harper-future");
    expect(slugsOf(m.alumniItems)).not.toContain("harper-future");
  });

  it("never includes unlisted people (D-06)", () => {
    expect(slugsOf(m.all)).not.toContain("emery-hidden");
  });

  it("excludes drafts in production and includes them in preview", () => {
    expect(slugsOf(m.all)).not.toContain("indigo-draft");
    const pv = buildPeopleIndex(load("consent-edge-cases", true));
    const predoc = pv.groups.find((g) => g.role === "predoc-staff");
    expect(predoc && slugsOf(predoc.items)).toEqual(["indigo-draft"]);
    expect(pv.groups.map((g) => g.role)).toEqual([
      "pi",
      "postdoc",
      "phd",
      "predoc-staff",
      "undergrad",
      "affiliate",
    ]);
  });

  it("sorts within a group by rank, then last name", async () => {
    const { comparePeople } = await import("@/lib/content/people");
    for (const g of m.groups) {
      const sorted = [...g.items].sort((a, b) => comparePeople(a.person, b.person));
      expect(slugsOf(g.items)).toEqual(slugsOf(sorted));
    }
  });

  it("builds role and direction chip options only from people present", () => {
    expect(m.roleOptions.map((o) => [o.value, o.count])).toEqual([
      ["pi", 1],
      ["postdoc", 1],
      ["phd", 1],
      ["masters", 1], // gray-alum (alumni) — emery-hidden is unlisted
      ["undergrad", 2],
      ["affiliate", 1],
    ]);
    expect(m.directionOptions.map((o) => [o.value, o.label, o.count])).toEqual([
      ["advice", "Fixture Advice", 1],
      ["platforms", "Fixture Platforms", 1],
    ]);
    expect(m.showFilters).toBe(true);
  });

  it("summarises the roster with singular/plural labels", () => {
    expect(m.summary).toEqual([
      { count: 1, label: "Faculty Director" },
      { count: 1, label: "Postdoctoral scholar" },
      { count: 1, label: "PhD student" },
      { count: 1, label: "Undergraduate RA" },
      { count: 1, label: "Affiliate" },
      { count: 2, label: "Alumni" },
    ]);
    expect(countLabel("undergrad", 8)).toBe("Undergraduate RAs");
  });

  it("hides the filter island when there is nothing to filter", () => {
    const one = buildPeopleIndex(load("n1"));
    expect(one.all.length).toBeGreaterThan(0);
    if (one.roleOptions.length < 2 && one.directionOptions.length === 0) {
      expect(one.showFilters).toBe(false);
    }
  });
});

describe("avatar colour", () => {
  it("is deterministic and drawn from the CVD-checked swatch set", () => {
    for (const slug of ["park-sinchaisri", "a-b", "jules-noprofile", "x"]) {
      const s = avatarSwatch(slug);
      expect(DEFAULT_SWATCH_ORDER).toContain(s);
      expect(avatarSwatch(slug)).toBe(s);
    }
  });
  it("spreads across the set", () => {
    const seen = new Set(Array.from({ length: 60 }, (_, i) => avatarSwatch(`person-${i}-name`)));
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });
  it("uses the person's first direction colour when they have one", () => {
    const m = buildPeopleIndex(load("consent-edge-cases"));
    const blair = m.all.find((i) => i.person.slug === "blair-sample")!;
    expect(blair.directions[0]?.slug).toBe("advice");
    expect(blair.swatch).toBe("butterfly-pea");
  });
});

describe("person helpers", () => {
  it("role line: title wins over the role label; program appended", () => {
    expect(roleLine({ role: "pi", title: "Professor of X", program: undefined })).toBe(
      "Professor of X",
    );
    expect(roleLine({ role: "undergrad", title: undefined, program: "econ" })).toBe(
      "Undergraduate RA · econ",
    );
    expect(roleLine({ role: "phd", title: undefined, program: undefined })).toBe("PhD student");
  });

  it("tenure line from start/end only", () => {
    expect(tenureLine({ start: "2023-08", end: undefined, isAlumni: false })).toBe(
      "Since Aug 2023",
    );
    expect(tenureLine({ start: "2022-01", end: "2024", isAlumni: true })).toBe("Jan 2022–2024");
    expect(tenureLine({ start: undefined, end: "2024", isAlumni: true })).toBe("Until 2024");
    expect(tenureLine({ start: undefined, end: undefined, isAlumni: false })).toBeNull();
  });

  it("links in a fixed order; email only when the loader kept it", () => {
    const links = personLinks({
      links: { cv: "/x.pdf", website: "https://a.example", scholar: "https://s.example" },
      email: "a@example.edu",
    });
    expect(links.map((l) => l.key)).toEqual(["website", "scholar", "cv", "email"]);
    expect(links.at(-1)?.href).toBe("mailto:a@example.edu");
    expect(personLinks({ links: {}, email: undefined })).toEqual([]);
  });

  it("consent gating reaches the model: devon's photo and email are gone, blair's stay", () => {
    const m = buildPeopleIndex(load("consent-edge-cases"));
    const by = (s: string) => m.all.find((i) => i.person.slug === s)!.person;
    expect(by("devon-placeholder").photo).toBeUndefined();
    expect(by("devon-placeholder").email).toBeUndefined();
    expect(by("blair-sample").photo).toBe("/brand/fixtures/portrait.webp");
    expect(by("blair-sample").email).toBe("blair@example.edu");
    expect(by("finley-alum").now_at).toBe("Fixture Company");
    expect(by("gray-alum").now_at).toBeUndefined();
  });
});

describe("buildPersonProfile (§D9 person page)", () => {
  const c = load("consent-edge-cases");

  it("exists only for listed people with a profile page (the PI always)", () => {
    expect(buildPersonProfile(c, "avery-example")).toBeDefined();
    expect(buildPersonProfile(c, "blair-sample")).toBeDefined();
    expect(buildPersonProfile(c, "jules-noprofile")).toBeUndefined();
    expect(buildPersonProfile(c, "emery-hidden")).toBeUndefined();
    expect(buildPersonProfile(c, "nobody-here")).toBeUndefined();
    expect(buildPersonProfile(c, EMPTY_PARAM)).toBeUndefined();
  });

  it("splits papers into counted publications and work in progress", () => {
    const m = buildPersonProfile(c, "avery-example")!;
    expect(m.publications.length).toBeGreaterThan(0);
    expect(m.publications.every((p) => p.counted)).toBe(true);
    expect(m.inProgress.map((p) => p.slug)).toEqual(["example-2020-fixture-paper-194"]);
    expect(m.projects.map((p) => p.slug).sort()).toEqual([
      "advice-project",
      "ai-work-project",
      "consent-project",
      "platforms-project",
    ]);
    expect(m.eyebrow).toBe("Faculty Director");
    expect(m.lead).toBe("Fixture Professor of Examples");
  });

  it("lists a member's papers via the author `person` slug", () => {
    const m = buildPersonProfile(c, "blair-sample")!;
    expect(m.publications.map((p) => p.slug)).toEqual(["example-2022-fixture-paper-196"]);
    expect(m.directions.map((d) => d.slug)).toEqual(["advice"]);
    expect(m.links.map((l) => l.key)).toEqual(["email"]);
  });
});
