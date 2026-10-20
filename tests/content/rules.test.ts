/**
 * One fixture test per validator error and warning (brief WP0 acceptance #7).
 * Each case starts from the valid fixture set "n4" (zero errors, zero warnings)
 * and applies one in-memory edit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Files, codes, errors } from "./helpers";

const P = "publications/";
const firstPub = (f: Files) => f.paths(P).find((p) => p.includes("fixture-paper"))!;
const DIR = "directions/advice.md";

type Case = { code: string; name: string; make: (f: Files) => void; severity: "error" | "warning" };
const CASES: Case[] = [
  {
    code: "E_PARSE",
    severity: "error",
    name: "invalid YAML in front matter",
    make: (f) => f.set("directions/broken.md", "---\ntitle: [unclosed\n---\n"),
  },
  {
    code: "E_PARSE",
    severity: "error",
    name: "Markdown file without front matter",
    make: (f) => f.set("news/2026-01-01-no-front-matter.md", "Just text\n"),
  },
  {
    code: "E_SCHEMA",
    severity: "error",
    name: "short_label longer than 28 characters",
    make: (f) => f.edit(DIR, (d) => void (d.short_label = "A label that is far too long!")),
  },
  {
    code: "E_SCHEMA",
    severity: "error",
    name: "news without a date",
    make: (f) => f.edit("news/2026-05-11-fixture-paper-accepted.md", (d) => void delete d.date),
  },
  {
    code: "E_SCHEMA",
    severity: "error",
    name: "malformed DOI",
    make: (f) => f.edit(firstPub(f), (d) => void (d.doi = "doi:10.1/x")),
  },
  {
    code: "E_SCHEMA",
    severity: "error",
    name: "per-file direction order is no longer allowed (D-04)",
    make: (f) => f.edit(DIR, (d) => void (d.order = 1)),
  },
  {
    code: "E_SCHEMA",
    severity: "error",
    name: "person end before start",
    make: (f) => f.edit("people/avery-example.md", (d) => void (d.end = "2020")),
  },
  {
    code: "E_SITE_MISSING",
    severity: "error",
    name: "site.yml removed",
    make: (f) => f.remove("site.yml"),
  },
  {
    code: "E_SLUG",
    severity: "error",
    name: "publication slug without the {lastname}-{year}-{title} pattern",
    make: (f) =>
      f.copy(firstPub(f), "publications/fixture-paper.md", (d) => {
        d.title = "Another title";
        d.doi = "10.5555/other.1";
      }),
  },
  {
    code: "E_SLUG",
    severity: "error",
    name: "people slug that is not {first}-{last}",
    make: (f) => f.copy("people/avery-example.md", "people/avery.md", (d) => void (d.role = "phd")),
  },
  {
    code: "E_NEWS_SLUG_DATE",
    severity: "error",
    name: "news slug date differs from its date field",
    make: (f) =>
      f.copy("news/2026-05-11-fixture-paper-accepted.md", "news/2026-05-12-fixture-copy.md"),
  },
  {
    code: "E_RELATION",
    severity: "error",
    name: "publication tagged with a direction that does not exist",
    make: (f) => f.edit(firstPub(f), (d) => void (d.directions = ["nope"])),
  },
  {
    code: "E_RELATION",
    severity: "error",
    name: "author linked to an unknown person",
    make: (f) =>
      f.edit(
        firstPub(f),
        (d) => void ((d.authors as Array<Record<string, unknown>>)[0]!.person = "nobody-here"),
      ),
  },
  {
    code: "E_RELATION",
    severity: "error",
    name: "home featured finding points to an unknown publication",
    make: (f) =>
      f.edit(
        "pages/home.yml",
        (d) =>
          void (d.featured_findings = [
            { text: "x", publication: "missing-2020-paper", evidence: "published" },
          ]),
      ),
  },
  {
    code: "W_DRAFT_REFERENCE",
    severity: "warning",
    name: "published item references a draft direction",
    make: (f) => f.edit(DIR, (d) => void (d.draft = true)),
  },
  {
    code: "E_DUP_DOI",
    severity: "error",
    name: "two publications share a DOI",
    make: (f) =>
      f.copy(
        firstPub(f),
        "publications/copy-2020-duplicate-doi.md",
        (d) => void (d.title = "A different title"),
      ),
  },
  {
    code: "E_DUP_TITLE",
    severity: "error",
    name: "two publications share a title",
    make: (f) =>
      f.copy(
        firstPub(f),
        "publications/copy-2020-duplicate-title.md",
        (d) => void (d.doi = "10.5555/unique.9"),
      ),
  },
  {
    code: "E_AS_OF_MISSING",
    severity: "error",
    name: "non-published status without as_of",
    make: (f) =>
      f.edit(firstPub(f), (d) => {
        d.status = "submitted";
        d.status_source = "self-reported";
      }),
  },
  {
    code: "E_STATUS_SOURCE_MISSING",
    severity: "error",
    name: "non-published status without status_source",
    make: (f) =>
      f.edit(firstPub(f), (d) => {
        d.status = "submitted";
        d.as_of = "2026-09";
      }),
  },
  {
    code: "E_YEAR_MISSING",
    severity: "error",
    name: "counted publication without a year",
    make: (f) => f.edit(firstPub(f), (d) => void delete d.year),
  },
  {
    code: "E_DIRECTIONS_EMPTY",
    severity: "error",
    name: "published paper with no direction",
    make: (f) => f.edit(firstPub(f), (d) => void (d.directions = [])),
  },
  {
    code: "E_DIRECTIONS_EMPTY",
    severity: "error",
    name: "published project with no direction",
    make: (f) => f.edit("projects/advice-project.md", (d) => void (d.directions = [])),
  },
  {
    code: "W_DIRECTIONS_EMPTY",
    severity: "warning",
    name: "draft paper with no direction",
    make: (f) =>
      f.edit(firstPub(f), (d) => {
        d.directions = [];
        d.draft = true;
      }),
  },
  {
    code: "E_HTTP_URL",
    severity: "error",
    name: "http:// link",
    make: (f) => f.edit(firstPub(f), (d) => void (d.links = { pdf: "http://example.org/a.pdf" })),
  },
  {
    code: "E_ALT_MISSING",
    severity: "error",
    name: "project hero image without alt",
    make: (f) =>
      f.edit("projects/advice-project.md", (d) => void (d.hero = { image: "/uploads/x.webp" })),
  },
  {
    code: "E_ALT_MISSING",
    severity: "error",
    name: "person photo without photo_alt",
    make: (f) =>
      f.edit("people/avery-example.md", (d) => {
        d.photo = "/uploads/p.webp";
        d.photo_consent = true;
      }),
  },
  {
    code: "W_CONSENT_PHOTO",
    severity: "warning",
    name: "photo without photo_consent",
    make: (f) =>
      f.edit("people/avery-example.md", (d) => {
        d.photo = "/uploads/p.webp";
        d.photo_alt = "Portrait";
      }),
  },
  {
    code: "W_CONSENT_EMAIL",
    severity: "warning",
    name: "email without email_public",
    make: (f) => f.edit("people/avery-example.md", (d) => void (d.email = "a@example.edu")),
  },
  {
    code: "W_CONSENT_NOW_AT",
    severity: "warning",
    name: "now_at without now_at_public",
    make: (f) => f.edit("people/avery-example.md", (d) => void (d.now_at = "Elsewhere")),
  },
  {
    code: "W_UNLISTED_REFERENCED",
    severity: "warning",
    name: "author linked to a person with listed: false",
    make: (f) =>
      f
        .copy("people/avery-example.md", "people/quinn-unlisted.md", (d) => {
          d.name = "Quinn Unlisted";
          d.role = "phd";
          d.listed = false;
        })
        .edit(
          firstPub(f),
          (d) =>
            void (d.authors as unknown[]).push({
              name: "Quinn Unlisted",
              person: "quinn-unlisted",
            }),
        ),
  },
  {
    code: "E_DIR_COUNT_ZERO",
    severity: "error",
    name: "0 non-draft directions after launch (D-03)",
    make: (f) => {
      for (const p of f.paths("directions/")) f.edit(p, (d) => void (d.draft = true));
    },
  },
  {
    code: "W_DIR_COUNT_ZERO",
    severity: "warning",
    name: "0 non-draft directions before launch is only a warning (D-03)",
    make: (f) => {
      for (const p of f.paths("directions/")) f.edit(p, (d) => void (d.draft = true));
      f.edit("site.yml", (d) => void (d.launched = false));
    },
  },
  {
    code: "E_DIR_COUNT_MAX",
    severity: "error",
    name: "more than 8 live directions",
    make: (f) => {
      for (let i = 0; i < 5; i++)
        f.copy(DIR, `directions/extra-${i}.md`, (d) => void (d.color = "black-sesame"));
    },
  },
  {
    code: "W_DIR_COUNT_HIGH",
    severity: "warning",
    name: "7 live directions suggests the dot-plot fallback",
    make: (f) => {
      const colors = ["jasmine", "black-sesame", "taro"];
      for (let i = 0; i < 3; i++)
        f.copy(DIR, `directions/extra-${i}.md`, (d) => void (d.color = colors[i]));
    },
  },
  {
    code: "E_DIR_ORDER_DUP",
    severity: "error",
    name: "direction listed twice in direction_order",
    make: (f) => f.edit("site.yml", (d) => void (d.direction_order as string[]).push("advice")),
  },
  {
    code: "E_DIR_ORDER_UNKNOWN",
    severity: "error",
    name: "direction_order lists a slug with no file",
    make: (f) => f.edit("site.yml", (d) => void (d.direction_order as string[]).push("ghost")),
  },
  {
    code: "W_DIR_ORDER_MISSING",
    severity: "warning",
    name: "live direction missing from direction_order is appended (D-04)",
    make: (f) =>
      f.edit(
        "site.yml",
        (d) => void (d.direction_order = (d.direction_order as string[]).slice(1)),
      ),
  },
  {
    code: "W_DIR_ORDER_ARCHIVED",
    severity: "warning",
    name: "archived direction left in direction_order",
    make: (f) =>
      f.edit(DIR, (d) => {
        d.status = "archived";
        d.archived_on = "2026-01";
      }),
  },
  {
    code: "W_COLOR_DUP",
    severity: "warning",
    name: "two live directions share a colour",
    make: (f) => f.edit("directions/learning.md", (d) => void (d.color = "butterfly-pea")),
  },
  {
    code: "W_COLOR_CONFUSABLE",
    severity: "warning",
    name: "Taro used together with Butterfly pea",
    make: (f) => f.edit("directions/learning.md", (d) => void (d.color = "taro")),
  },
  {
    code: "W_ARCHIVED_NO_DATE",
    severity: "warning",
    name: "archived direction without archived_on",
    make: (f) => f.edit(DIR, (d) => void (d.status = "archived")),
  },
  {
    code: "W_BODY_LENGTH",
    severity: "warning",
    name: "direction body outside 80–150 words",
    make: (f) => f.set(DIR, f.get(DIR).text.replace(/\n---\n[\s\S]*$/, "\n---\n\nToo short.\n")),
  },
  {
    code: "W_OPP_NO_ROUTE",
    severity: "warning",
    name: "opportunity with no way to act on it",
    make: (f) => f.edit("opportunities/partners.md", (d) => void delete d.email),
  },
  {
    code: "W_OPP_CLOSED_PAST",
    severity: "warning",
    name: "open opportunity whose closes_on has passed",
    make: (f) =>
      f.edit("opportunities/research-assistants.md", (d) => void (d.closes_on = "2026-01-31")),
  },
  {
    code: "W_NON_LATIN1",
    severity: "warning",
    name: "characters outside the latin font subset",
    make: (f) => f.edit(firstPub(f), (d) => void (d.title = "Fixture paper with Ω and 中文")),
  },
  {
    code: "E_REDIRECT_MISSING",
    severity: "error",
    name: "a published slug disappeared without a redirect (D-05)",
    make: (f) =>
      f.set(
        ".published-slugs.json",
        JSON.stringify({ directions: ["advice", "retired-direction"] }),
      ),
  },
  {
    code: "E_REDIRECT_CONFLICT",
    severity: "error",
    name: "redirect from a live page",
    make: (f) =>
      f.edit(
        "site.yml",
        (d) => void (d.redirects = [{ from: "/research/advice/", to: "/research/" }]),
      ),
  },
  {
    code: "E_REDIRECT_DUP",
    severity: "error",
    name: "redirect listed twice",
    make: (f) =>
      f.edit(
        "site.yml",
        (d) =>
          void (d.redirects = [
            { from: "/research/old/", to: "/research/" },
            { from: "/research/old/", to: "/research/advice/" },
          ]),
      ),
  },
  {
    code: "W_UNKNOWN_FILE",
    severity: "warning",
    name: "file outside any collection",
    make: (f) => f.set("misc/notes.md", "---\na: 1\n---\n"),
  },
];

describe("baseline fixture n4", () => {
  it("validates with zero errors and zero warnings", () => {
    const issues = Files.of("n4").validate();
    expect(issues.map((i) => `${i.code} ${i.file}: ${i.message}`)).toEqual([]);
  });
});

describe("validator rules (one fixture per error/warning)", () => {
  for (const c of CASES) {
    it(`${c.code}: ${c.name}`, () => {
      const f = Files.of("n4");
      c.make(f);
      const issues = f.validate();
      const hit = issues.filter((i) => i.code === c.code);
      expect(
        hit.length,
        `expected ${c.code}; got ${codes(issues).join(", ") || "nothing"}`,
      ).toBeGreaterThan(0);
      expect(hit.every((i) => i.severity === c.severity)).toBe(true);
    });
  }

  it("a redirect satisfies a disappeared published slug", () => {
    const f = Files.of("n4");
    f.set(".published-slugs.json", JSON.stringify({ directions: ["advice", "retired-direction"] }));
    f.edit(
      "site.yml",
      (d) => void (d.redirects = [{ from: "/research/retired-direction/", to: "/research/" }]),
    );
    expect(errors(f.validate())).toEqual([]);
  });

  it("a draft direction in direction_order is not 'unknown' (production order skips it)", () => {
    const f = Files.of("n4");
    f.edit(DIR, (d) => void (d.draft = true));
    expect(codes(f.validate())).not.toContain("E_DIR_ORDER_UNKNOWN");
  });

  it("every rule code in the validator has a fixture test here", () => {
    const root = fileURLToPath(new URL("../..", import.meta.url));
    const src = ["src/lib/content/validate.ts", "src/lib/content/read.ts"]
      .map((p) => fs.readFileSync(path.join(root, p), "utf8"))
      .join("\n");
    const used = new Set([...src.matchAll(/"([EW]_[A-Z0-9_]+)"/g)].map((m) => m[1]!));
    const tested = new Set(CASES.map((c) => c.code));
    const untested = [...used].filter((c) => !tested.has(c));
    expect(untested).toEqual([]);
  });
});
