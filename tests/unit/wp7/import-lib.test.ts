/** WP7: importer helpers (scripts/import/lib.mjs; docs/CONTENT-MAPPING.md). */
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  chooseQuestion,
  cleanDate,
  enDashRanges,
  expandEventNames,
  frontMatterFile,
  fullNameFirst,
  humanDates,
  namePI,
  newsSlug,
  presentationHasEvidence,
  programLabel,
  publicationSlug,
  singleYear,
  toHttps,
  wordCount,
} from "../../../scripts/import/lib.mjs";
import {
  ABOUT,
  ACCESSIBILITY,
  DIRECTION_BODIES,
  DIRECTION_QUESTIONS,
  HOME,
  JOIN,
  PRIVACY,
} from "../../../scripts/import/copy.mjs";
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

describe("display wording helpers (verify CON-01/04/08/13)", () => {
  it("writes ISO dates in running text the way the site writes dates", () => {
    expect(humanDates("2026 INFORMS MSOM Conference, HBS Boston, session TD10, 2026-07-14")).toBe(
      "2026 INFORMS MSOM Conference, HBS Boston, session TD10, Jul 14, 2026",
    );
    expect(humanDates("Yokohama, 2025-04-26")).toBe("Yokohama, Apr 26, 2025");
    expect(humanDates("BOC 2026")).toBe("BOC 2026");
  });
  it("en-dashes number ranges only", () => {
    expect(enDashRanges("About 9-11 hours; July 13-14; K-12; 192-series")).toBe(
      "About 9–11 hours; July 13–14; K-12; 192-series",
    );
  });
  it("spells out conference abbreviations as the CV does", () => {
    expect(expandEventNames("BOC 2026")).toBe("Behavioral Operations Conference 2026");
    expect(expandEventNames("2026 INFORMS RMP Conference")).toBe(
      "2026 INFORMS Revenue Management & Pricing Conference",
    );
    expect(expandEventNames("2022 INFORMS RMP spotlight")).toBe(
      "2022 INFORMS Revenue Management & Pricing Conference (spotlight)",
    );
    expect(expandEventNames("INSEAD, Michigan, BDRM, YinzOR (CMU)")).toBe(
      "INSEAD, University of Michigan, Behavioral Decision Research in Management Conference, YinzOR at Carnegie Mellon University",
    );
    expect(expandEventNames("University of Michigan")).toBe("University of Michigan");
  });
  it("cases program tags without adding words, dropping a degree the role states", () => {
    expect(programLabel("ieor ms", "masters")).toBe("IEOR");
    expect(programLabel("IEOR PhD", "phd")).toBe("IEOR");
    expect(programLabel("ieor ms", "undergrad")).toBe("IEOR MS");
    expect(programLabel("eecs", "undergrad")).toBe("EECS");
    expect(programLabel("applied math/ds", "undergrad")).toBe("Applied Math/DS");
    expect(programLabel("ds/applied math", "undergrad")).toBe("DS/Applied Math");
    expect(programLabel("econ", "undergrad")).toBe("Econ");
    expect(programLabel("isf", "undergrad")).toBe("ISF");
    expect(programLabel("phd", "phd")).toBe("PhD");
    expect(programLabel(null, "undergrad")).toBeUndefined();
  });
  it("names the PI instead of 'the PI', and by full name on first mention", () => {
    expect(namePI("The PI's master's thesis", "Park Sinchaisri")).toBe(
      "Park Sinchaisri's master's thesis",
    );
    expect(namePI("with the PI as instructor of record", "Park Sinchaisri")).toBe(
      "with Park Sinchaisri as instructor of record",
    );
    expect(fullNameFirst("Shunan Jiang and Park's study", "Park", "Park Sinchaisri")).toBe(
      "Shunan Jiang and Park Sinchaisri's study",
    );
    expect(fullNameFirst("Park Sinchaisri and Park", "Park", "Park Sinchaisri")).toBe(
      "Park Sinchaisri and Park",
    );
    expect(fullNameFirst("Prof. Sinchaisri received", "Park", "Park Sinchaisri")).toBe(
      "Prof. Sinchaisri received",
    );
  });
});

describe("drafted pages copy (verify CON-08/14, VIS-13)", () => {
  const all = [
    ...Object.values(DIRECTION_BODIES),
    ...[ABOUT, JOIN, ACCESSIBILITY, PRIVACY].flatMap((p) =>
      Object.values(p).filter((v): v is string => typeof v === "string"),
    ),
  ] as string[];
  it("never calls the PI 'the PI' and uses American spelling", () => {
    for (const t of all) {
      expect(t).not.toMatch(/\b[Tt]he PI\b/);
      expect(t).not.toMatch(/\b[Cc]olour/);
    }
  });
  it("archived direction bodies do not repeat the template's 'Archived' notice", () => {
    for (const s of ["pricing-experimentation", "cities-communities"])
      expect(DIRECTION_BODIES[s as keyof typeof DIRECTION_BODIES]).not.toMatch(/archived/i);
  });
  it("About names the OITM unit once; Join claims no journalist or industry work", () => {
    expect(ABOUT.body.match(/Operations (and|&) Information Technology Management/g)).toHaveLength(
      1,
    );
    expect(JOIN.intro).not.toMatch(/journalist|industry/i);
    expect(JOIN.students).not.toMatch(/Fall 20\d\d/);
  });
});
