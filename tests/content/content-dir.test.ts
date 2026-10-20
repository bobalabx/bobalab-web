/**
 * `npm run validate` → validates CONTENT_DIR (default ./content).
 * Errors fail the run; warnings are printed. If ./content does not exist yet
 * (before WP7 imports content) the check is skipped with a notice; an
 * explicitly set CONTENT_DIR that does not exist is an error.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { contentDir } from "@/lib/content/read";
import { loadRawContent } from "@/lib/content/load";
import { formatIssue, summarize, validateContent } from "@/lib/content/validate";

const dir = contentDir();
const exists = fs.existsSync(dir);
const explicit = Boolean(process.env.CONTENT_DIR);

describe(`content: ${dir}`, () => {
  if (!exists && !explicit) {
    it.skip("content/ does not exist yet (WP7 creates it) — nothing to validate", () => {});
    return;
  }

  it("CONTENT_DIR exists", () => {
    expect(exists, `CONTENT_DIR not found: ${dir}`).toBe(true);
  });

  it("has no validation errors", () => {
    const issues = validateContent(loadRawContent(dir));
    const { errors, warnings } = summarize(issues);
    if (warnings.length)
      console.warn(`${warnings.length} warning(s):\n` + warnings.map(formatIssue).join("\n"));
    expect(errors.map(formatIssue)).toEqual([]);
  });
});
