/**
 * The shared fixture sets (tests/fixtures/content/<set>) used by every page
 * package must validate with zero errors; their expected warnings are pinned.
 */
import { describe, expect, it } from "vitest";
import { Files, errors } from "./helpers";

const EXPECTED_WARNINGS: Record<string, string[]> = {
  n0: ["W_DIR_COUNT_ZERO"],
  n1: [],
  n2: [],
  n3: [],
  n4: [],
  n6: [],
  n7: ["W_DIR_COUNT_HIGH", "W_COLOR_CONFUSABLE"],
  n8: ["W_DIR_COUNT_HIGH", "W_COLOR_CONFUSABLE"],
  "long-labels": [],
  "seeds-0-1-7-12-24": [],
  "consent-edge-cases": [
    "W_CONSENT_PHOTO",
    "W_CONSENT_EMAIL",
    "W_CONSENT_NOW_AT",
    "W_UNLISTED_REFERENCED",
    "W_DRAFT_REFERENCE",
  ],
};

describe("fixture sets", () => {
  for (const [set, expected] of Object.entries(EXPECTED_WARNINGS)) {
    it(`${set}: zero errors, expected warnings only`, () => {
      const issues = Files.of(set).validate();
      expect(errors(issues).map((i) => `${i.code} ${i.file}: ${i.message}`)).toEqual([]);
      const got = [...new Set(issues.map((i) => i.code))].sort();
      expect(got).toEqual([...new Set(expected)].sort());
    });
  }
});
