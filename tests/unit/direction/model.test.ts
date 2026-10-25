/** Direction helpers (src/components/direction/model.ts) over the fixture sets (redesign D-13). */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { TRANSITION } from "@/lib/vt";
import {
  countsSentence,
  directionPeople,
  listJoin,
  plural,
  publicationsHref,
  railTransition,
  workWithUs,
} from "@/components/direction/model";

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const load = (set: string, preview = false) =>
  buildContent(loadRawContent(path.join(FIX, set)), { preview, today: "2026-10-20" });

const counts = (projects: number, papers: number, inProgress = 0) => ({
  projects,
  papers,
  inProgress,
});

describe("direction counts label (computed; a data label, not a sentence)", () => {
  it("names papers, work in progress only when there is some, then projects", () => {
    expect(countsSentence(counts(4, 4, 1))).toBe("4 papers · 1 in progress · 4 projects");
    expect(countsSentence(counts(1, 1))).toBe("1 paper · 1 project");
    expect(countsSentence(counts(0, 0))).toBe("0 papers · 0 projects");
    expect(countsSentence(counts(5, 4, 2))).not.toMatch(/ and |,/);
  });
  it("lists without a serial comma", () => {
    expect(listJoin([])).toBe("");
    expect(listJoin(["a"])).toBe("a");
    expect(listJoin(["a", "b"])).toBe("a and b");
    expect(listJoin(["a", "b", "c"])).toBe("a, b and c");
  });
  it("matches the loader's derived counts on a fixture", () => {
    const c = load("n4");
    for (const d of c.directions) {
      const line = countsSentence(d.counts);
      expect(line).toContain(plural(d.counts.projects, "project"));
      expect(line).toContain(plural(d.counts.papers, "paper"));
      const tagged = c.countedPublications.filter((p) => p.directions.includes(d.slug));
      expect(d.counts.papers).toBe(tagged.length);
    }
  });
});

describe("direction people (derived from project teams)", () => {
  it("unites the listed team members of the direction's projects, current before alumni, once each", () => {
    const c = load("n4");
    for (const d of c.directions) {
      const projects = c.projects.filter((p) => p.directions.includes(d.slug));
      const people = directionPeople(c, d, projects);
      const expected = new Set([
        ...projects.flatMap((p) => p.teamRefs.map((m) => m.slug)),
        ...c.people.filter((p) => p.directions.includes(d.slug)).map((p) => p.slug),
      ]);
      expect(new Set(people.map((p) => p.slug))).toEqual(expected);
      expect(people.length).toBe(expected.size);
      const alumniAt = people.findIndex((p) => p.isAlumni);
      if (alumniAt >= 0) expect(people.slice(alumniAt).every((p) => p.isAlumni)).toBe(true);
    }
  });
});

describe("'See all in Publications' keeps the direction filter (WP2 #5)", () => {
  it("builds /publications/?direction={slug} with a trailing-slash path", () => {
    expect(publicationsHref("ai-at-work")).toBe("/publications/?direction=ai-at-work");
    expect(publicationsHref("a b")).toBe("/publications/?direction=a%20b");
  });
});

describe("More directions transition types (§E5)", () => {
  it("higher index → nav-forward, lower → nav-back, archived → forward", () => {
    expect(railTransition({ index: 2 }, { index: 3 })).toBe(TRANSITION.navForward);
    expect(railTransition({ index: 3 }, { index: 1 })).toBe(TRANSITION.navBack);
    expect(railTransition({ index: null }, { index: 1 })).toBe(TRANSITION.navForward);
  });
});

describe("Work with us (§D5.9)", () => {
  it("shows for open_to_collaborators, or for an open opportunity tagged with the direction", () => {
    const c = load("n4");
    for (const d of c.directions) {
      const w = workWithUs(c, d);
      const opps = c.opportunities.filter((o) => o.isOpen && o.directions.includes(d.slug));
      expect(w.show).toBe(d.open_to_collaborators || opps.length > 0);
      expect(w.opportunities.map((o) => o.slug)).toEqual(opps.map((o) => o.slug));
    }
  });
  it("is hidden when neither holds", () => {
    const w = workWithUs({ opportunities: [] } as never, {
      slug: "x",
      open_to_collaborators: false,
    });
    expect(w.show).toBe(false);
  });
});
