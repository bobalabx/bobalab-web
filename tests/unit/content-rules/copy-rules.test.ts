/**
 * copyRuleIssues (src/lib/content/copy-rules.ts; editor v2, spec §2.12.6c): the
 * D-14 homepage copy rules of tests/content/simplify-copy.test.ts as validator
 * issues (E_HOME_QUESTION, E_HOME_WHY_LONG, E_HERO_LONG), so the editor's site
 * check refuses the same copy the deploy would. Parity: on every fixture set, the
 * real content and each failing variant, copyRuleIssues is empty exactly when the
 * old test's assertions hold.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseContentFiles, readContentFiles, type RawContent } from "@/lib/content/read";
import { buildContent, type Content } from "@/lib/content/build";
import { homeHeroCopy } from "@/lib/content/queries";
import { copyRuleIssues } from "@/lib/content/copy-rules";
import { Files } from "../../content/helpers";

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const REAL = fileURLToPath(new URL("../../../content/", import.meta.url));
const words = (s = "") => s.split(/\s+/).filter(Boolean).length;
const W = (n: number, w = "word") => Array.from({ length: n }, () => w).join(" ");

/** The old simplify-copy.test.ts assertions, verbatim, as a yes/no oracle. */
function oldTestPasses(raw: RawContent, c: Content): boolean {
  for (const d of raw.entries.directions) {
    if (!d.home_question) continue;
    if (!/\?$/.test(d.home_question)) return false;
    if (d.home_question.split("?").length - 1 !== 1) return false;
    if (d.question && !(d.home_question.length < d.question.length)) return false;
  }
  const h = homeHeroCopy(c);
  if (c.pages.home?.why && !(words(c.pages.home.why) <= 40)) return false;
  if (!(words(h.statement) + words(h.who.text) + words(h.why) <= 60)) return false;
  return true;
}
const run = (f: Files) => {
  const raw = parseContentFiles(f.files);
  return { raw, c: buildContent(raw, { preview: true }) };
};
const issues = (f: Files) => {
  const { raw, c } = run(f);
  return copyRuleIssues(raw, c);
};

const DIR = "directions/advice.md";
const VARIANTS: Array<[string, string, (f: Files) => void]> = [
  [
    "E_HOME_QUESTION",
    "no question mark",
    (f) => f.edit(DIR, (d) => void (d.home_question = "What next")),
  ],
  [
    "E_HOME_QUESTION",
    "two questions",
    (f) => f.edit(DIR, (d) => void (d.home_question = "Why? How?")),
  ],
  [
    "E_HOME_QUESTION",
    "not shorter than the guiding question",
    (f) =>
      f.edit(DIR, (d) => {
        d.question = "Short one?";
        d.home_question = "Longer one, sadly?";
      }),
  ],
  [
    "E_HOME_WHY_LONG",
    "a 41-word why line",
    (f) => f.edit("pages/home.yml", (d) => void (d.why = W(41))),
  ],
  [
    "E_HERO_LONG",
    "a long statement with a long why line",
    (f) =>
      f.edit("pages/home.yml", (d) => {
        d.statement = W(12);
        d.why = W(40);
      }),
  ],
  [
    "E_HERO_LONG",
    "a long mission standing in for the why line",
    (f) => f.edit("pages/home.yml", (d) => void (d.mission = W(50, "ok"))),
  ],
];

describe("copyRuleIssues: the D-14 homepage copy rules", () => {
  it("n4 passes", () => {
    expect(issues(Files.of("n4"))).toEqual([]);
  });

  it.each(VARIANTS)("%s: %s", (code, _name, make) => {
    const f = Files.of("n4");
    make(f);
    const got = issues(f);
    expect(got.map((i) => i.code)).toContain(code);
    expect(got.every((i) => i.severity === "error")).toBe(true);
    const i = got.find((x) => x.code === code)!;
    if (code === "E_HOME_QUESTION") expect([i.file, i.field]).toEqual([DIR, "home_question"]);
    else expect(i.file).toBe("pages/home.yml");
    expect(i.message).not.toMatch(/undefined|NaN/);
  });

  it("names the field to shorten for the hero: why, else the mission, else the statement", () => {
    const f = Files.of("n4").edit("pages/home.yml", (d) => {
      d.statement = W(12);
      d.why = W(40);
    });
    expect(issues(f).find((i) => i.code === "E_HERO_LONG")?.field).toBe("why");
    const g = Files.of("n4").edit("pages/home.yml", (d) => void (d.mission = W(50, "ok")));
    expect(issues(g).find((i) => i.code === "E_HERO_LONG")?.field).toBe("mission");
  });

  it("the limits are the old test's: 40 words of why and 60 for the hero pass", () => {
    const f = Files.of("n4").edit("pages/home.yml", (d) => void (d.why = W(40)));
    const { raw, c } = run(f);
    const hero = words(homeHeroCopy(c).who.text) + 40;
    expect(copyRuleIssues(raw, c).map((i) => i.code)).toEqual(hero > 60 ? ["E_HERO_LONG"] : []);
  });

  it("parity with the old test on every fixture set, the real content and every variant", () => {
    const sets = fs
      .readdirSync(FIX)
      .filter((d) => fs.existsSync(path.join(FIX, d, "site.yml")))
      .map((d) => new Files(readContentFiles(path.join(FIX, d))));
    if (fs.existsSync(REAL)) sets.push(new Files(readContentFiles(REAL)));
    for (const [, , make] of VARIANTS) {
      const f = Files.of("n4");
      make(f);
      sets.push(f);
    }
    let failing = 0;
    for (const f of sets) {
      const { raw, c } = run(f);
      const pass = oldTestPasses(raw, c);
      expect(copyRuleIssues(raw, c).length === 0).toBe(pass);
      if (!pass) failing++;
    }
    expect(failing).toBe(VARIANTS.length);
  });
});
