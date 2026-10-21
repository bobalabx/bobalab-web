/** CON-03: awards and talks known only from the PI's CV read "reported by the lab". */
import { describe, expect, it } from "vitest";
import { isSelfReportedAward, isSelfReportedTalk } from "@/lib/publications/provenance";
import { hasContent, loadContent } from "./helpers";

describe("provenance helpers", () => {
  it("a talk without an evidence link is the lab's own report", () => {
    expect(isSelfReportedTalk({ url: undefined })).toBe(true);
    expect(isSelfReportedTalk({ url: "https://example.org/programme" })).toBe(false);
  });

  it("an award is self-reported only when it says so", () => {
    expect(isSelfReportedAward({ name: "X", year: 2022 })).toBe(false);
    expect(isSelfReportedAward({ name: "X", year: 2022, source: "documented" })).toBe(false);
    expect(isSelfReportedAward({ name: "X", year: 2022, source: "self-reported" })).toBe(true);
  });
});

describe.skipIf(!hasContent)("provenance in content", () => {
  const c = loadContent();

  it("the CHI 2022 TRAIT talk (R2 §4 WP7: not verified) has no evidence link", () => {
    const p = c.getPublication("lee-2025-non-adoption-algorithmic-advice");
    const talk = p?.presentations.find((t) => /CHI 2022/.test(t.event));
    expect(talk).toBeDefined();
    expect(isSelfReportedTalk(talk!)).toBe(true);
  });
});
