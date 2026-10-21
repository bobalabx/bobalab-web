/** WP4 filter semantics (src/components/people/filter.ts). */
import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTER,
  isFiltering,
  matches,
  statusText,
  toggle,
  type FilterMeta,
} from "@/components/people/filter";

const pi: FilterMeta = { role: "pi", directions: ["a"], alumni: false };
const phd: FilterMeta = { role: "phd", directions: ["a", "b"], alumni: false };
const ug: FilterMeta = { role: "undergrad", directions: [], alumni: false };
const alum: FilterMeta = { role: "phd", directions: ["b"], alumni: true };
const all = [pi, phd, ug, alum];

describe("matches", () => {
  it("everyone matches when nothing is selected", () => {
    expect(all.every((m) => matches(m, EMPTY_FILTER))).toBe(true);
    expect(isFiltering(EMPTY_FILTER)).toBe(false);
  });
  it("ORs within a facet and ANDs across facets", () => {
    const s = { roles: ["phd", "pi"], directions: ["b"] };
    expect(all.filter((m) => matches(m, s))).toEqual([phd, alum]);
    expect(all.filter((m) => matches(m, { roles: [], directions: ["a"] }))).toEqual([pi, phd]);
  });
  it("people without directions never match a direction filter", () => {
    expect(matches(ug, { roles: [], directions: ["a"] })).toBe(false);
  });
});

describe("toggle", () => {
  it("adds and removes values immutably", () => {
    const a = toggle(EMPTY_FILTER, "roles", "phd");
    expect(a).toEqual({ roles: ["phd"], directions: [] });
    expect(EMPTY_FILTER.roles).toEqual([]);
    expect(toggle(a, "roles", "phd")).toEqual(EMPTY_FILTER);
  });
});

describe("statusText", () => {
  it("is empty when not filtering", () => {
    expect(statusText(all, EMPTY_FILTER)).toBe("");
  });
  it("counts matches and mentions alumni", () => {
    expect(statusText(all, { roles: ["undergrad"], directions: [] })).toBe(
      "Showing 1 of 4 people.",
    );
    expect(statusText(all, { roles: ["phd"], directions: [] })).toBe(
      "Showing 2 of 4 people (1 in Alumni).",
    );
    expect(statusText(all, { roles: ["phd"], directions: ["b"] })).toBe(
      "Showing 2 of 4 people (1 in Alumni).",
    );
    expect(statusText([alum, ug], { roles: ["phd"], directions: [] })).toBe(
      "Showing 1 of 2 people (1 in Alumni).",
    );
    expect(statusText(all, { roles: ["postdoc"], directions: [] })).toBe(
      "No one matches these filters.",
    );
  });
});
