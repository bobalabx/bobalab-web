/** Filters ↔ URL (brief §D2, §D7; WP3 acceptance #2). */
import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  applyFilters,
  facetCounts,
  groupDocsByYear,
  hasFilterPanel,
  parseFilters,
  serializeFilters,
  toggleValue,
  visibleFacetKeys,
  yearAnchor,
  type Facets,
  type FilterState,
} from "@/lib/publications/filters";
import type { PubDoc } from "@/lib/publications/search";

const doc = (slug: string, o: Partial<PubDoc> = {}): PubDoc => ({
  slug,
  title: slug,
  authors: "",
  type: "journal",
  directions: [],
  directionLabels: "",
  members: [],
  ...o,
});

const DOCS: PubDoc[] = [
  doc("a", { year: 2026, type: "journal", directions: ["ai"], members: ["pi", "stu"] }),
  doc("b", { year: 2025, type: "working-paper", directions: ["ai", "gig"], members: ["pi"] }),
  doc("c", { year: 2023, type: "journal", directions: ["gig"], members: ["pi"] }),
  doc("d", { year: 2021, type: "dissertation", directions: [], members: ["pi"] }),
  doc("e", { type: "other", directions: ["gig"], members: [] }),
];

describe("parseFilters / serializeFilters", () => {
  it("parses every key, comma lists and repeated keys", () => {
    expect(
      parseFilters(
        "?direction=ai,gig&type=journal&type=working-paper&year=2021-2025&member=stu&q=gig+work",
      ),
    ).toEqual({
      q: "gig work",
      direction: ["ai", "gig"],
      type: ["journal", "working-paper"],
      member: ["stu"],
      yearFrom: 2021,
      yearTo: 2025,
    });
  });

  it("accepts single years, open ranges and swaps reversed ranges", () => {
    expect(parseFilters("year=2025")).toMatchObject({ yearFrom: 2025, yearTo: 2025 });
    expect(parseFilters("year=2021-")).toMatchObject({ yearFrom: 2021 });
    expect(parseFilters("year=2021-").yearTo).toBeUndefined();
    expect(parseFilters("year=-2023")).toMatchObject({ yearTo: 2023 });
    expect(parseFilters("year=-2023").yearFrom).toBeUndefined();
    expect(parseFilters("year=2025-2021")).toMatchObject({ yearFrom: 2021, yearTo: 2025 });
    expect(parseFilters("year=soon")).toEqual(EMPTY_FILTERS);
  });

  it("drops unknown facet values when the options are known, and duplicates", () => {
    const facets = {
      direction: [{ value: "ai", label: "AI" }],
      type: [{ value: "journal", label: "Journal" }],
      member: [],
    };
    expect(parseFilters("direction=ai,nope,ai&type=book&member=x", facets)).toEqual({
      ...EMPTY_FILTERS,
      direction: ["ai"],
    });
  });

  it("serialises in the brief's key order and round-trips", () => {
    const s: FilterState = {
      q: "learning & tips",
      direction: ["platform-work", "ai-at-work"],
      type: ["journal"],
      member: ["haonan-william-deng"],
      yearFrom: 2021,
      yearTo: 2025,
    };
    const qs = serializeFilters(s);
    expect(qs).toBe(
      "direction=platform-work,ai-at-work&type=journal&year=2021-2025&member=haonan-william-deng&q=learning+%26+tips",
    );
    expect(parseFilters(qs)).toEqual(s);
    expect(serializeFilters(parseFilters(qs))).toBe(qs);
  });

  it("writes a single year as one value and nothing for an empty state", () => {
    expect(serializeFilters({ ...EMPTY_FILTERS, yearFrom: 2025, yearTo: 2025 })).toBe("year=2025");
    expect(serializeFilters({ ...EMPTY_FILTERS, yearTo: 2023 })).toBe("year=-2023");
    expect(serializeFilters(EMPTY_FILTERS)).toBe("");
    expect(serializeFilters({ ...EMPTY_FILTERS, q: "   " })).toBe("");
  });

  it("the direction page's 'See all' link parses (brief §D5.6)", () => {
    expect(parseFilters("?direction=platform-work").direction).toEqual(["platform-work"]);
  });

  it("caps the query length", () => {
    expect(parseFilters(`q=${"x".repeat(500)}`).q).toHaveLength(200);
  });
});

describe("applyFilters", () => {
  const run = (qs: string, hits: Set<string> | null = null) =>
    applyFilters(DOCS, parseFilters(qs), hits).map((d) => d.slug);

  it("no filters → everything", () => {
    expect(run("")).toEqual(["a", "b", "c", "d", "e"]);
  });
  it("OR within a facet, AND across facets", () => {
    expect(run("direction=ai,gig")).toEqual(["a", "b", "c", "e"]);
    expect(run("direction=gig&type=journal")).toEqual(["c"]);
    expect(run("member=stu")).toEqual(["a"]);
  });
  it("year ranges are inclusive and exclude undated items", () => {
    expect(run("year=2023-2025")).toEqual(["b", "c"]);
    expect(run("year=2025-")).toEqual(["a", "b"]);
    expect(run("year=-2021")).toEqual(["d"]);
  });
  it("search hits intersect with the facets", () => {
    expect(run("type=journal", new Set(["a", "b"]))).toEqual(["a"]);
    expect(run("", new Set())).toEqual([]);
  });
});

describe("facetCounts", () => {
  it("counts each option against the other active filters", () => {
    const s = parseFilters("direction=gig&type=journal");
    const dir = facetCounts(DOCS, s, null, "direction");
    // type=journal applies; direction is ignored for its own counts
    expect(Object.fromEntries(dir)).toEqual({ ai: 1, gig: 1 });
    const type = facetCounts(DOCS, s, null, "type");
    expect(Object.fromEntries(type)).toEqual({ "working-paper": 1, journal: 1, other: 1 });
  });
});

describe("helpers", () => {
  it("toggleValue adds and removes", () => {
    const on = toggleValue(EMPTY_FILTERS, "type", "journal");
    expect(on.type).toEqual(["journal"]);
    expect(toggleValue(on, "type", "journal").type).toEqual([]);
  });
  it("activeFilterCount counts values, the year range and the query", () => {
    expect(activeFilterCount(parseFilters("direction=a,b&year=2020&q=x"))).toBe(4);
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });
  it("groupDocsByYear: newest first, undated last", () => {
    expect(groupDocsByYear(DOCS).map((g) => g.year)).toEqual([2026, 2025, 2023, 2021, null]);
    expect(yearAnchor(2026)).toBe("y2026");
    expect(yearAnchor(null)).toBe("y-undated");
  });
});

describe("which facets the island offers", () => {
  const facets: Facets = {
    direction: [],
    type: [
      { value: "journal", label: "Journal article" },
      { value: "working-paper", label: "Working paper" },
    ],
    member: [{ value: "pi", label: "The PI" }],
    years: [2026],
  };
  it("a facet with one option is hidden: it filters nothing", () => {
    expect(visibleFacetKeys(facets)).toEqual(["type"]);
    expect(visibleFacetKeys(facets, EMPTY_FILTERS)).toEqual(["type"]);
  });
  it("…unless a link selected it (a person page's ?member=), so the filter stays visible", () => {
    expect(visibleFacetKeys(facets, parseFilters("member=pi", facets))).toEqual(["type", "member"]);
  });
  it("hasFilterPanel: chips or a year range", () => {
    expect(hasFilterPanel(facets)).toBe(true);
    expect(hasFilterPanel({ ...facets, type: facets.type.slice(0, 1) })).toBe(false);
    expect(hasFilterPanel({ ...facets, type: [], years: [2026, 2025] })).toBe(true);
  });
});
