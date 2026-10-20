/** Loader: draft modes (D-03), direction order (D-04), counting rule (D-05), consent (D-06). */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildContent,
  getContent,
  isPreview,
  loadRawContent,
  clearContentCache,
} from "@/lib/content/load";
import { countsAsPublication, hasPublicVersion } from "@/lib/content/relations";
import { parseContentFiles } from "@/lib/content/read";

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const TODAY = "2026-10-20";
const load = (set: string, preview: boolean) =>
  buildContent(loadRawContent(path.join(FIX, set)), { preview, today: TODAY });

afterEach(() => clearContentCache());

describe("isPreview (D-03)", () => {
  it.each([
    [{ NODE_ENV: "development" }, true],
    [{ NODE_ENV: "development", INCLUDE_DRAFTS: "0" }, false],
    [{ NODE_ENV: "production" }, false],
    [{ NODE_ENV: "production", INCLUDE_DRAFTS: "1" }, true],
    [{ NODE_ENV: "test" }, false],
  ])("%o → %s", (env, expected) => {
    expect(isPreview(env as unknown as NodeJS.ProcessEnv)).toBe(expected);
  });
});

describe("drafts", () => {
  it("production excludes drafts; preview includes them", () => {
    expect(load("n0", false).directions).toHaveLength(0);
    const prev = load("n0", true);
    expect(prev.directions.map((d) => d.slug)).toEqual(["advice", "platforms"]);
    expect(prev.directions.every((d) => d.draft)).toBe(true);
  });
  it("draft people are excluded from production and their references dropped", () => {
    const c = load("consent-edge-cases", false);
    expect(c.getPerson("indigo-draft")).toBeUndefined();
    expect(c.getProject("consent-project")!.teamRefs.map((p) => p.slug)).not.toContain(
      "indigo-draft",
    );
    expect(load("consent-edge-cases", true).getPerson("indigo-draft")).toBeDefined();
  });
});

describe("directions (D-04)", () => {
  it("orders by site.direction_order and numbers 01…0N", () => {
    const c = load("n4", false);
    expect(c.directions.map((d) => [d.index, d.slug])).toEqual([
      [1, "advice"],
      [2, "platforms"],
      [3, "ai-work"],
      [4, "learning"],
    ]);
  });
  it("appends directions missing from the order", () => {
    const raw = loadRawContent(path.join(FIX, "n4"));
    raw.site!.direction_order = ["learning"];
    const c = buildContent(raw, { preview: false, today: TODAY });
    expect(c.directions.map((d) => d.slug)).toEqual(["learning", "advice", "ai-work", "platforms"]);
  });
  it("keeps archived directions out of the live list", () => {
    const raw = loadRawContent(path.join(FIX, "n4"));
    raw.entries.directions.find((d) => d.slug === "advice")!.status = "archived";
    const c = buildContent(raw, { preview: false, today: TODAY });
    expect(c.directions.map((d) => d.slug)).not.toContain("advice");
    expect(c.archivedDirections.map((d) => [d.slug, d.index])).toEqual([["advice", null]]);
    expect(c.getDirection("advice")).toBeDefined();
  });
  it("counts papers by the D-05 rule, projects, in-progress, and Open to RAs", () => {
    const c = load("n4", false);
    const advice = c.getDirection("advice")!;
    // 3 journal papers + 1 major-revision paper (has DOI) count; the WIP item does not.
    expect(advice.counts).toEqual({ papers: 4, projects: 1, inProgress: 1 });
    expect(advice.openToRAs).toBe(true);
    expect(c.getDirection("platforms")!.openToRAs).toBe(false);
  });
  it("seed counts 0, 1, 7, 12, 24", () => {
    const c = load("seeds-0-1-7-12-24", false);
    expect(c.directions.map((d) => d.counts.papers)).toEqual([0, 1, 7, 12, 24]);
  });
});

describe("publication counting rule (D-05)", () => {
  it("public version = DOI, SSRN, arXiv, PDF or publisher link", () => {
    expect(hasPublicVersion({ doi: "10.1/x", links: {} })).toBe(true);
    expect(hasPublicVersion({ links: { ssrn: "https://ssrn.com/x" } })).toBe(true);
    expect(hasPublicVersion({ links: { code: "https://github.com/x" } })).toBe(false);
  });
  it("a documented presentation (with a source URL) also counts", () => {
    expect(
      countsAsPublication({
        links: {},
        presentations: [{ event: "Conf", url: "https://conf.example" }],
      }),
    ).toBe(true);
    expect(countsAsPublication({ links: {}, presentations: [{ event: "Conf" }] })).toBe(false);
  });
  it("splits counted vs in-progress lists", () => {
    const c = load("n4", false);
    expect(c.inProgress.map((p) => p.type)).toEqual(["work-in-progress"]);
    expect(c.countedPublications.every((p) => p.counted)).toBe(true);
  });
});

describe("people and authors (D-06)", () => {
  const c = load("consent-edge-cases", false);
  it("unlisted people are never rendered or linked", () => {
    expect(c.people.map((p) => p.slug)).not.toContain("emery-hidden");
    expect(c.getPerson("emery-hidden")).toBeUndefined();
    const pub = c.publications.find((p) => p.title.includes("unlisted member"))!;
    const emery = pub.authorList.find((a) => a.name === "Emery Hidden")!;
    expect(emery.person).toBeUndefined();
    expect(emery.isLab).toBe(false);
    const blair = pub.authorList.find((a) => a.name === "Blair Sample")!;
    expect(blair.isLab).toBe(true);
  });
  it("lab_work is true when a non-PI lab person is an author", () => {
    const pub = c.publications.find((p) => p.title.includes("unlisted member"))!;
    expect(pub.labWork).toBe(true);
    const piOnly = c.publications.find((p) => p.authorList.length === 2)!;
    expect(piOnly.labWork).toBe(false);
  });
  it("consent flags gate photo / email / now_at", () => {
    expect(c.getPerson("blair-sample")!.photo).toBeDefined();
    expect(c.getPerson("blair-sample")!.email).toBe("blair@example.edu");
    expect(c.getPerson("devon-placeholder")!.photo).toBeUndefined();
    expect(c.getPerson("devon-placeholder")!.email).toBeUndefined();
    expect(c.getPerson("finley-alum")!.now_at).toBe("Fixture Company");
    expect(c.getPerson("gray-alum")!.now_at).toBeUndefined();
  });
  it("alumni derive from end dates", () => {
    expect(c.getPerson("finley-alum")!.isAlumni).toBe(true);
    expect(c.getPerson("gray-alum")!.isAlumni).toBe(true);
    expect(c.getPerson("harper-future")!.isAlumni).toBe(false);
  });
  it("project collaborators need consent; partners need public", () => {
    const p = c.getProject("consent-project")!;
    expect(p.visibleCollaborators.map((x) => x.name)).toEqual(["Kai Consented"]);
    expect(p.visiblePartners.map((x) => x.name)).toEqual(["Fixture Public Partner"]);
  });
});

describe("news", () => {
  it("is newest first and computes upcoming against the build date", () => {
    const c = load("n4", false);
    expect(c.news.map((n) => n.date)).toEqual(["2026-10-01", "2026-05-11", "2026-03-02"]);
    expect(c.news.filter((n) => n.upcoming).map((n) => n.slug)).toEqual([
      "2026-10-01-fixture-upcoming-talk",
    ]);
  });
});

describe("getContent", () => {
  it("reads CONTENT_DIR and memoises outside development", () => {
    const a = getContent({ dir: path.join(FIX, "n2"), preview: false, today: TODAY });
    const b = getContent({ dir: path.join(FIX, "n2"), preview: false, today: TODAY });
    expect(a).toBe(b);
    expect(a.directions).toHaveLength(2);
  });
  it("throws a ContentError on structural problems", () => {
    const raw = parseContentFiles([{ path: "directions/x.md", text: "---\ntitle: 1\n---\n" }]);
    expect(() => buildContent(raw, { preview: true })).toThrow(/structural error/);
  });
  it("falls back to default site values when content is absent", () => {
    const c = buildContent(parseContentFiles([]), { preview: false });
    expect(c.site.email).toBe("bobalab@berkeley.edu");
    expect(c.directions).toEqual([]);
  });
});
