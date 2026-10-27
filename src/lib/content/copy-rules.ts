/**
 * D-14 homepage copy rules (docs/simplify/JUDGE.md R1, R7), shared by the
 * deploy's content check (tests/content/simplify-copy.test.ts, `npm run
 * validate`) and the editor's site check, so both refuse the same copy. The
 * schema caps the lengths; these rules keep the copy in the shape the homepage
 * was designed for. Both fields are optional (the page falls back to `question`
 * and `mission`).
 *
 * Pure (no file system). Pass the Content built from the same RawContent in
 * preview mode (`buildContent(raw, { preview: true })`), as the deploy's check does.
 */
import type { Content } from "./build";
import type { Issue, RawContent } from "./parse";
import { homeHeroCopy } from "./queries";

/** The why line's limit, in words (about 30 words; R1). */
export const HOME_WHY_MAX_WORDS = 40;
/** The hero's limit, in words: statement + who line + why (R1). */
export const HERO_MAX_WORDS = 60;

const words = (s = "") => s.split(/\s+/).filter(Boolean).length;

export function copyRuleIssues(raw: RawContent, content: Content): Issue[] {
  const issues: Issue[] = [];
  const err = (code: string, message: string, file: string, field: string) =>
    issues.push({ severity: "error", code, message, file, field });

  // Each short homepage question is one question, shorter than the guiding question.
  for (const d of raw.entries.directions) {
    const q = d.home_question;
    if (!q) continue;
    if (!/\?$/.test(q))
      err(
        "E_HOME_QUESTION",
        "the short homepage question must end with “?”",
        d.file,
        "home_question",
      );
    if (q.split("?").length - 1 !== 1)
      err(
        "E_HOME_QUESTION",
        "the short homepage question must be one question (exactly one “?”)",
        d.file,
        "home_question",
      );
    if (d.question && q.length >= d.question.length)
      err(
        "E_HOME_QUESTION",
        `the short homepage question (${q.length} characters) must be shorter than the guiding question (${d.question.length})`,
        d.file,
        "home_question",
      );
  }

  // The why line is about 30 words, and the hero stays within 60 words (R1).
  const h = homeHeroCopy(content);
  const why = content.pages.home?.why;
  if (why && words(why) > HOME_WHY_MAX_WORDS)
    err(
      "E_HOME_WHY_LONG",
      `the why line has ${words(why)} words; keep it to ${HOME_WHY_MAX_WORDS} or fewer`,
      "pages/home.yml",
      "why",
    );
  const hero = words(h.statement) + words(h.who.text) + words(h.why);
  if (hero > HERO_MAX_WORDS)
    err(
      "E_HERO_LONG",
      `the homepage's first screen has ${hero} words (statement, the “who” line and the why line); keep it to ${HERO_MAX_WORDS} or fewer`,
      "pages/home.yml",
      // The longest part, usually: the why line, or the mission standing in for it.
      h.why ? (h.whyIsMission ? "mission" : "why") : "statement",
    );
  return issues;
}
