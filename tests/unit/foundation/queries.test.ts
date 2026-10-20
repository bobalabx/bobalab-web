/** Page-level queries (src/lib/content/queries.ts) over the fixture sets. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildContent, loadRawContent } from "@/lib/content/load";
import {
  EMPTY_PARAM,
  currentPeople,
  directionDetail,
  groupByYear,
  newsDetail,
  personDetail,
  projectDetail,
  publicationDetail,
  resolveFindings,
  staticParams,
  staticSlugs,
  upcomingNews,
} from "@/lib/content/queries";

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const TODAY = "2026-10-20";
const load = (set: string, preview = false) =>
  buildContent(loadRawContent(path.join(FIX, set)), { preview, today: TODAY });

describe("staticParams (static export needs ≥ 1 param)", () => {
  it("falls back to the placeholder when a collection is empty", () => {
    const c = load("n0");
    expect(staticSlugs.directions(c)).toEqual([]);
    expect(staticParams("direction", staticSlugs.directions(c))).toEqual([
      { direction: EMPTY_PARAM },
    ]);
  });
  it("maps slugs otherwise; the placeholder is not a valid content slug", () => {
    expect(staticParams("slug", ["a", "b"])).toEqual([{ slug: "a" }, { slug: "b" }]);
    expect(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(EMPTY_PARAM)).toBe(false);
  });
  it("people slugs are only profile pages", () => {
    const c = load("consent-edge-cases");
    expect(staticSlugs.people(c)).toContain("avery-example");
    expect(staticSlugs.people(c)).not.toContain("jules-noprofile");
    expect(staticSlugs.people(c)).not.toContain("emery-hidden");
  });
});

describe("directionDetail", () => {
  const c = load("consent-edge-cases");
  it("returns undefined for unknown slugs and the placeholder", () => {
    expect(directionDetail(c, "nope")).toBeUndefined();
    expect(directionDetail(c, EMPTY_PARAM)).toBeUndefined();
  });
  it("lists counted papers, projects and siblings consistently with the counts", () => {
    const d = directionDetail(c, "advice")!;
    expect(d.publications.length).toBe(d.direction.counts.papers);
    expect(d.projects.length).toBe(d.direction.counts.projects);
    expect(d.inProgress.length).toBe(d.direction.counts.inProgress);
    expect(d.publications.every((p) => p.counted && p.directions.includes("advice"))).toBe(true);
    expect(d.siblings.map((s) => s.slug)).not.toContain("advice");
    expect(d.previous).toBeNull();
    expect(d.next?.slug).toBe("platforms");
  });
});

describe("other details", () => {
  const c = load("consent-edge-cases");
  it("publicationDetail finds the projects that list a paper", () => {
    const p = publicationDetail(c, "example-2023-fixture-paper-189")!;
    expect(p.projects.map((x) => x.slug)).toContain("advice-project");
    expect(p.related.map((x) => x.slug)).not.toContain("example-2023-fixture-paper-189");
    expect(p.related.length).toBeLessThanOrEqual(3);
  });
  it("projectDetail relates projects that share a direction", () => {
    const p = projectDetail(c, "advice-project")!;
    expect(p.related.map((x) => x.slug)).toContain("consent-project");
    expect(p.related.map((x) => x.slug)).not.toContain("advice-project");
  });
  it("personDetail only for listed people with a profile page", () => {
    expect(personDetail(c, "avery-example")?.publications.length).toBeGreaterThan(0);
    expect(personDetail(c, "emery-hidden")).toBeUndefined();
    expect(personDetail(c, "jules-noprofile")).toBeUndefined();
  });
  it("newsDetail previous = older, next = newer", () => {
    const newest = c.news[0]!;
    const d = newsDetail(c, newest.slug)!;
    expect(d.next).toBeNull();
    expect(d.previous?.slug).toBe(c.news[1]?.slug);
  });
  it("upcomingNews and currentPeople", () => {
    expect(upcomingNews(c).map((n) => n.slug)).toEqual(["2026-10-01-fixture-upcoming-talk"]);
    expect(currentPeople(c).every((p) => !p.isAlumni)).toBe(true);
    expect(currentPeople(c)[0]?.role).toBe("pi");
  });
  it("resolveFindings keeps the text and drops unknown references", () => {
    const f = resolveFindings(c, [
      { text: "A", evidence: "published", publication: "example-2023-fixture-paper-189" },
      { text: "B", evidence: "preliminary", publication: "missing-2020-x", direction: "advice" },
    ]);
    expect(f[0]!.publication?.slug).toBe("example-2023-fixture-paper-189");
    expect(f[1]!.publication).toBeUndefined();
    expect(f[1]!.direction?.slug).toBe("advice");
  });
  it("groupByYear sorts newest first with undated last", () => {
    const g = groupByYear([{ y: 2020 }, { y: null }, { y: 2024 }, { y: 2020 }], (x) => x.y);
    expect(g.map((x) => [x.year, x.items.length])).toEqual([
      [2024, 1],
      [2020, 2],
      [null, 1],
    ]);
  });
});
