/** MiniSearch index and the server-built search documents (brief §D7). */
import { describe, expect, it } from "vitest";
import {
  createIndex,
  foldTerm,
  searchSlugs,
  toPubDoc,
  type PubDoc,
} from "@/lib/publications/search";
import { buildIndexData } from "@/lib/publications/index-data";
import { FIXTURES, hasContent, loadContent } from "./helpers";
import path from "node:path";

const docs: PubDoc[] = [
  {
    slug: "a",
    title: "Learning on the Go",
    authors: "Shunan Jiang, Wichinpong Park Sinchaisri",
    venue: "Proceedings of the ACM on Human-Computer Interaction",
    year: 2025,
    type: "journal",
    directions: ["learning-on-the-job"],
    directionLabels: "Learning on the Job",
    members: ["park-sinchaisri"],
    text: "Couriers get faster with experience.",
  },
  {
    slug: "b",
    title: "Precise or Broad?",
    authors: "Philippe Blättchen, Wichinpong Park Sinchaisri",
    year: 2026,
    type: "working-paper",
    directions: ["algorithmic-advice"],
    directionLabels: "Algorithmic Advice",
    members: ["park-sinchaisri"],
  },
];

describe("search", () => {
  const index = createIndex(docs);
  const find = (q: string) => [...(searchSlugs(index, q) ?? [])].sort();

  it("blank query → null (no text filter)", () => {
    expect(searchSlugs(index, "   ")).toBeNull();
  });
  it("matches titles, authors, venues, years, direction labels and the In brief text", () => {
    expect(find("go")).toEqual(["a"]);
    expect(find("jiang")).toEqual(["a"]);
    expect(find("computer interaction")).toEqual(["a"]);
    expect(find("2026")).toEqual(["b"]);
    expect(find("algorithmic advice")).toEqual(["b"]);
    expect(find("couriers")).toEqual(["a"]);
    expect(find("sinchaisri")).toEqual(["a", "b"]);
  });
  it("prefix and typo tolerance; all words must match", () => {
    expect(find("prec")).toEqual(["b"]);
    expect(find("couriars")).toEqual(["a"]);
    expect(find("precise couriers")).toEqual([]);
  });
  it("folds diacritics both ways", () => {
    expect(foldTerm("Blättchen")).toBe("blattchen");
    expect(find("blattchen")).toEqual(["b"]);
    expect(find("Blättchen")).toEqual(["b"]);
  });
});

describe("toPubDoc / buildIndexData (fixtures)", () => {
  const c = loadContent(path.join(FIXTURES, "consent-edge-cases"));
  const { docs: built, facets } = buildIndexData(c, c.countedPublications);

  it("one document per counted publication, in list order", () => {
    expect(built.map((d) => d.slug)).toEqual(c.countedPublications.map((p) => p.slug));
  });
  it("members are only listed lab people", () => {
    const listed = new Set(c.people.map((p) => p.slug));
    expect(built.flatMap((d) => d.members).every((m) => listed.has(m))).toBe(true);
    for (const p of c.countedPublications) {
      const doc = toPubDoc(p);
      const unlinked = p.authors.filter((a) => a.person && !listed.has(a.person));
      for (const a of unlinked) expect(doc.members).not.toContain(a.person);
    }
  });
  it("facet options only list values that occur, years newest first", () => {
    const dirs = new Set(built.flatMap((d) => d.directions));
    expect(facets.direction.every((o) => dirs.has(o.value))).toBe(true);
    const types = new Set(built.map((d) => d.type));
    expect(facets.type.map((o) => o.value).every((t) => types.has(t as PubDoc["type"]))).toBe(true);
    expect([...facets.years]).toEqual([...facets.years].sort((a, b) => b - a));
  });
});

describe.skipIf(!hasContent)("real content", () => {
  it("work in progress never enters the searchable list (D-05)", () => {
    const c = loadContent();
    const { docs: built } = buildIndexData(c, c.countedPublications);
    const wip = new Set(c.inProgress.map((p) => p.slug));
    expect(built.some((d) => wip.has(d.slug))).toBe(false);
    expect(built.length + wip.size).toBe(c.publications.length);
  });
});
