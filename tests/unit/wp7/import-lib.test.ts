/** WP7: importer helpers (scripts/import/lib.mjs; docs/CONTENT-MAPPING.md). */
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  chooseQuestion,
  cleanDate,
  frontMatterFile,
  newsSlug,
  presentationHasEvidence,
  publicationSlug,
  singleYear,
  toHttps,
  wordCount,
} from "../../../scripts/import/lib.mjs";
import { DIRECTION_BODIES, DIRECTION_QUESTIONS, HOME } from "../../../scripts/import/copy.mjs";
import { SLUG_PATTERNS } from "@/lib/content/schema";

describe("publication slugs (D-05, CONTENT-MAPPING §3.3)", () => {
  const cases: Array<[string, string, number | null, string | undefined, string]> = [
    [
      "community-vibrancy-2021",
      "Wichinpong Park Sinchaisri",
      2021,
      undefined,
      "sinchaisri-2021-community-vibrancy",
    ],
    ["rl-tips-2026", "Hamsa Bastani", 2026, undefined, "bastani-2026-rl-tips"],
    ["markdown-pricing", "Rim Hariss", 2020, "2026-10-20", "hariss-2020-markdown-pricing"],
    [
      "precise-or-broad",
      "Philippe Blaettchen",
      2026,
      "2026-04",
      "blaettchen-2026-precise-or-broad",
    ],
    [
      "sequencing-incentives",
      "Wichinpong Park Sinchaisri",
      null,
      "2026-10-20",
      "sinchaisri-2026-sequencing-incentives",
    ],
    ["act-ask-defer", "Haonan Deng", null, "2026-08", "deng-2026-act-ask-defer"],
    [
      "mit-sm-thesis-2016",
      "Wichinpong Park Sinchaisri",
      2016,
      undefined,
      "sinchaisri-2016-mit-sm-thesis",
    ],
  ];
  it.each(cases)("%s → %s", (old, author, year, asOf, expected) => {
    const s = publicationSlug(old, author, year, asOf);
    expect(s).toBe(expected);
    expect(s).toMatch(SLUG_PATTERNS.publications.re);
  });
  it("applies the cancer-recognition shortening", () => {
    expect(
      publicationSlug(
        "cancer-recognition-foundation-models",
        "W P Sinchaisri",
        null,
        "2026-10-20",
        {
          "cancer-recognition-foundation-models": "cancer-recognition",
        },
      ),
    ).toBe("sinchaisri-2026-cancer-recognition");
  });
  it("news slug takes the full date", () => {
    expect(newsSlug("2026-05-learning-to-gig-revision", "2026-05-11")).toBe(
      "2026-05-11-learning-to-gig-revision",
    );
  });
});

describe("field rules", () => {
  it("upgrades http only on hosts known to serve https", () => {
    expect(toHttps("http://www.linkedin.com/in/x").url).toBe("https://www.linkedin.com/in/x");
    expect(toHttps("http://hdl.handle.net/1721.1/1").url).toBe("https://hdl.handle.net/1721.1/1");
    expect(toHttps("http://unknown.example/x")).toMatchObject({ url: null });
    expect(toHttps("https://a.b/c").url).toBe("https://a.b/c");
  });
  it("strips date notes", () => {
    expect(cleanDate("2023-03 (Crossref record created 2023-03-02)")).toBe("2023-03");
    expect(cleanDate("2025-05-22")).toBe("2025-05-22");
  });
  it("presentation year and evidence", () => {
    expect(singleYear("CHI 2025 Workshop, Yokohama, 2025-04-26")).toBe(2025);
    expect(singleYear("2023 MSOM SIG; 2022 INFORMS RMP")).toBeNull();
    expect(presentationHasEvidence("DOCUMENTED")).toBe(true);
    expect(presentationHasEvidence("DOCUMENTED (PI-reported only)")).toBe(false);
  });
  it("front matter keeps date-like strings as strings", () => {
    const text = frontMatterFile({ end: "2025", as_of: "2026-10", date: "2026-10-20", year: 2026 });
    const fm = parse(text.split("---")[1]!);
    expect(fm).toEqual({ end: "2025", as_of: "2026-10", date: "2026-10-20", year: 2026 });
    expect(text).toContain('end: "2025"');
  });
});

describe("direction questions and draft copy", () => {
  const qs = ["a".repeat(150), "Short question?", "Inferred?"];
  it("skips inferred and over-long questions", () => {
    expect(chooseQuestion(qs, [2])?.index).toBe(1);
    expect(chooseQuestion(["x".repeat(141)], [])).toBeNull();
    expect(chooseQuestion(qs, [1, 2])).toBeNull();
  });
  it("refuses an override based on an inferred question", () => {
    expect(() => chooseQuestion(qs, [0], { override: { basedOn: 0, text: "Q?" } })).toThrow();
  });
  it("every override fits 140 chars; every body is 80–150 words; mission ≤ 240", () => {
    for (const cfg of Object.values(DIRECTION_QUESTIONS) as Array<{ override?: { text: string } }>)
      if (cfg.override) expect(cfg.override.text.length).toBeLessThanOrEqual(140);
    for (const body of Object.values(DIRECTION_BODIES) as string[]) {
      const wc = wordCount(body);
      expect(wc).toBeGreaterThanOrEqual(80);
      expect(wc).toBeLessThanOrEqual(150);
    }
    expect(HOME.mission.length).toBeLessThanOrEqual(240);
  });
  it("direction bodies make no results claims (no finding verbs)", () => {
    const claim =
      /\b(find|finds|found|show|shows|showed|reveal|reveals|demonstrate|demonstrates|raise[sd]?|improve[sd]?|increase[sd]?|reduce[sd]?)\b/i;
    for (const [slug, body] of Object.entries(DIRECTION_BODIES) as Array<[string, string]>)
      expect(claim.test(body), `${slug} body uses a findings verb`).toBe(false);
  });
});
