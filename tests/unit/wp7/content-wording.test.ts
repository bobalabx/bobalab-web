/**
 * Verify-phase content checks on the imported content/ (findings CON-01, CON-02,
 * CON-04/VIS-06, CON-07, CON-08, CON-09, CON-13, CNT-01, VIS-13). Each rule is
 * enforced by scripts/import (the source of every generated file); these tests
 * keep content/ and the importer from drifting apart again.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadRawContent } from "@/lib/content/load";

const dir = path.resolve(process.cwd(), "content");
const has = fs.existsSync(path.join(dir, "site.yml"));

describe.skipIf(!has)("content/ wording and status rules", () => {
  const raw = loadRawContent(dir);
  const E = raw.entries;
  const read = (rel: string) => fs.readFileSync(path.join(dir, rel), "utf8");

  it("CON-04/VIS-06: no program tag is all lower case or repeats the role's degree", () => {
    for (const p of E.people) {
      if (!p.program) continue;
      expect(p.program, p.slug).not.toBe(p.program.toLowerCase());
      if (p.role === "phd") expect(p.program, p.slug).not.toMatch(/\bPhD$/i);
      if (p.role === "masters") expect(p.program, p.slug).not.toMatch(/\bMS$/i);
    }
  });

  it("CON-07: the PI is cited by one name on every paper", () => {
    const names = new Set(
      E.publications.flatMap((p) =>
        p.authors.filter((a) => a.person === "park-sinchaisri").map((a) => a.name),
      ),
    );
    expect([...names]).toEqual(["Wichinpong Park Sinchaisri"]);
  });

  // D-10 (owner decision 2026-10-20): the importer publishes every entry, which
  // supersedes the CON-02 hold. The rule applies again if PUBLISH_ALL is turned off.
  const publishAll = /^const PUBLISH_ALL = true;$/m.test(
    fs.readFileSync(path.resolve(process.cwd(), "scripts/import/import-dataset.mjs"), "utf8"),
  );
  it.skipIf(publishAll)(
    "CON-02: publication news stating a PI-reported journal decision is held as draft",
    () => {
      for (const n of E.news) {
        if (n.type !== "publication") continue;
        const pubs = n.publications.map((s) => E.publications.find((p) => p.slug === s));
        if (pubs.length && pubs.every((p) => p?.draft))
          expect(n.draft, `${n.slug} is about draft papers only`).toBe(true);
      }
      for (const s of [
        "2026-05-11-learning-to-gig-revision",
        "2026-04-16-precise-or-broad-revision",
      ])
        expect(E.news.find((n) => n.slug === s)?.draft, s).toBe(true);
    },
  );

  it("CON-08/CON-09 (copy sweep): news names the PI in full, without 'Prof.', and with no provenance hedge", () => {
    for (const n of E.news) {
      const first = /\bPark\b(?! Sinchaisri)/.exec(`${n.title} ${n.summary ?? ""}`);
      if (first) expect(`${n.title} ${n.summary}`, n.slug).toContain("Park Sinchaisri");
      // "was announced to present" read as a pipeline hedge; a dated post speaks as of its date.
      expect(n.summary ?? "", n.slug).not.toMatch(
        /was announced|Prof\. Sinchaisri|received a major revision from/,
      );
    }
    expect(E.news.find((n) => n.slug === "2024-11-13-tuck-seminar")?.summary).toMatch(
      /^Park Sinchaisri will present /,
    );
    expect(E.news.find((n) => n.slug === "2026-05-08-msom-three-papers")?.event_date).toBe(
      "2026-07-14",
    );
  });

  it("CON-08: no generated file calls the PI 'the PI'", () => {
    for (const sub of ["directions", "publications", "news", "opportunities", "pages", "projects"])
      for (const f of fs.readdirSync(path.join(dir, sub)))
        expect(read(`${sub}/${f}`), `${sub}/${f}`).not.toMatch(/\b[Tt]he PI\b/);
  });

  it("CON-13 and WP3 request 4: presentation text has no ISO dates or CV-expanded abbreviations", () => {
    for (const p of E.publications)
      for (const x of p.presentations) {
        expect(x.event, p.slug).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
        expect(x.event, p.slug).not.toMatch(/\b(BOC|BDRM|RMP)\b|\(CMU\)/);
      }
  });

  it("CNT-01: site.yml carries its flags in editors_note, not in YAML comments", () => {
    expect(read("site.yml")).not.toMatch(/^\s*#/m);
    expect(String(raw.site?.editors_note ?? "")).toMatch(/FLAGGED: the long name/);
    expect(String(raw.site?.editors_note ?? "")).toMatch(/FLAGGED: the email/);
  });

  it("VIS-13: archived direction bodies do not open with 'Archived direction'", () => {
    for (const d of E.directions.filter((x) => x.status === "archived"))
      expect(d.body.trim(), d.slug).not.toMatch(/^Archived/i);
  });
});

/**
 * CON-01: the importer is idempotent with content/. The dataset stays outside
 * the repo (it names people who are not on the public roster), so this runs only
 * where BOBALAB_DATASET points at it.
 */
const dataset = process.env.BOBALAB_DATASET;
describe.skipIf(!dataset || !fs.existsSync(dataset))("importer --check", () => {
  it("content/ matches a fresh import (exit 0)", () => {
    const out = execFileSync(
      process.execPath,
      ["scripts/import/import-dataset.mjs", "--dataset", dataset!, "--check"],
      { encoding: "utf8" },
    );
    expect(out).toContain("--check: content/ matches the import");
  }, 60_000);
});
