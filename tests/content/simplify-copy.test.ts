/**
 * `npm run validate`: D-14 homepage copy in CONTENT_DIR (default ./content).
 * The schema caps the lengths; these checks keep the copy in the shape the
 * homepage cup was designed for (docs/simplify/JUDGE.md R1, R7). Both fields
 * are optional (the page falls back to `question` and `mission`).
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { contentDir } from "@/lib/content/read";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { homeHeroCopy } from "@/lib/content/queries";

const dir = contentDir();
const words = (s = "") => s.split(/\s+/).filter(Boolean).length;

describe(`D-14 homepage copy: ${dir}`, () => {
  if (!fs.existsSync(dir)) {
    it.skip("no content directory", () => {});
    return;
  }
  const raw = loadRawContent(dir);
  const c = buildContent(raw, { preview: true });

  it("each short homepage question is one question, shorter than the guiding question", () => {
    for (const d of raw.entries.directions) {
      if (!d.home_question) continue;
      expect(d.home_question, d.slug).toMatch(/\?$/);
      expect(d.home_question.split("?").length - 1, d.slug).toBe(1);
      if (d.question) expect(d.home_question.length, d.slug).toBeLessThan(d.question.length);
    }
  });

  it("the why line is about 30 words, and the hero stays within 60 words (R1)", () => {
    const h = homeHeroCopy(c);
    if (c.pages.home?.why) expect(words(c.pages.home.why)).toBeLessThanOrEqual(40);
    expect(words(h.statement) + words(h.who.text) + words(h.why)).toBeLessThanOrEqual(60);
  });
});
