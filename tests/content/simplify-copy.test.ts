/**
 * `npm run validate`: D-14 homepage copy in CONTENT_DIR (default ./content).
 * The schema caps the lengths; these checks keep the copy in the shape the
 * homepage cup was designed for (docs/simplify/JUDGE.md R1, R7). Both fields
 * are optional (the page falls back to `question` and `mission`).
 * The rules live in src/lib/content/copy-rules.ts, so the editor's site check
 * refuses the same copy before Save (E_HOME_QUESTION, E_HOME_WHY_LONG, E_HERO_LONG).
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { contentDir } from "@/lib/content/read";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { copyRuleIssues } from "@/lib/content/copy-rules";
import { formatIssue } from "@/lib/content/validate";

const dir = contentDir();

describe(`D-14 homepage copy: ${dir}`, () => {
  if (!fs.existsSync(dir)) {
    it.skip("no content directory", () => {});
    return;
  }

  it("each short homepage question is one question, shorter than the guiding question; the why line is about 30 words, and the hero stays within 60 words (R1)", () => {
    const raw = loadRawContent(dir);
    const c = buildContent(raw, { preview: true });
    expect(copyRuleIssues(raw, c).map(formatIssue)).toEqual([]);
  });
});
