/**
 * Fig. 1 draft marking (DECISIONS D-03; verify finding VIS-03): when every
 * direction is a draft, the figcaption says so once ("applies to all N
 * directions") and no lane repeats the badge; per-lane badges appear only when
 * drafts and reviewed directions are mixed. Also pins the D-05 caption wording
 * (CON-10): dots count papers with a documented talk too.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { buildFigure, type FigureModel } from "@/lib/figure/buildFigure";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const { PearlFigure } = await import("@/components/figure/PearlFigure");

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const TODAY = "2026-10-20";
const model = (set: string): FigureModel =>
  buildFigure(buildContent(loadRawContent(path.join(FIX, set)), { preview: true, today: TODAY }));

const withDrafts = (m: FigureModel, isDraft: (i: number) => boolean): FigureModel => {
  const lanes = m.lanes.map((l, i) => ({ ...l, draft: isDraft(i) }));
  return { ...m, lanes, draftCount: lanes.filter((l) => l.draft).length };
};

const render = (m: FigureModel) => renderToStaticMarkup(<PearlFigure model={m} />);
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const BADGE = /bl-badge--draft/g;

describe("Fig. 1 draft badges", () => {
  const base = model("n4");

  it("all drafts: exactly one badge, in the caption's summary", () => {
    const html = render(withDrafts(base, () => true));
    expect(count(html, BADGE)).toBe(1);
    expect(html).toMatch(/f1-foot-draft[\s\S]*applies to[\s\S]*all 4 directions/);
  });

  it("mixed: each draft lane carries a badge, plus the summary", () => {
    const html = render(withDrafts(base, (i) => i === 0));
    expect(count(html, BADGE)).toBe(2);
    expect(html).toContain("1 of 4 directions");
  });

  it("no drafts: no badge at all", () => {
    expect(count(render(withDrafts(base, () => false)), BADGE)).toBe(0);
  });

  it("the caption says dots include papers with a documented talk (D-05)", () => {
    const html = render(withDrafts(base, () => false));
    expect(html).toContain("Each filled dot is a paper with a public version or a documented talk");
  });
});
