/**
 * Fig. 1 draft marking (DECISIONS D-03; verify finding VIS-03): when every
 * direction is a draft, the plate says so once in its foot ("applies to all N
 * directions") and no row or caption repeats the badge; per-row badges appear
 * only when drafts and reviewed directions are mixed. Also pins the D-05 key
 * wording (CON-10): dots count talk-only papers too.
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
  const items = m.items.map((it, i) => ({ ...it, draft: isDraft(i) }));
  return { ...m, items, draftCount: items.filter((it) => it.draft).length };
};

const render = (m: FigureModel) => renderToStaticMarkup(<PearlFigure model={m} labName="LAB" />);
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const BADGE = /bl-badge--draft/g;

describe("Fig. 1 draft badges", () => {
  const base = model("n4");

  it("all drafts: exactly one badge, in the foot summary", () => {
    const html = render(withDrafts(base, () => true));
    expect(count(html, BADGE)).toBe(1);
    expect(html).toMatch(/f1-foot-draft[\s\S]*applies to[\s\S]*all 4 directions/);
  });

  it("mixed: each draft row and its caption carry a badge, plus the summary", () => {
    const html = render(withDrafts(base, (i) => i === 0));
    // 1 row + 1 active caption + 1 foot summary.
    expect(count(html, BADGE)).toBe(3);
    expect(html).toContain("1 of 4 directions");
  });

  it("no drafts: no badge at all", () => {
    expect(count(render(withDrafts(base, () => false)), BADGE)).toBe(0);
  });

  it("the key says dots include papers with a documented talk (D-05)", () => {
    const html = render(withDrafts(base, () => false));
    expect(html).toContain("= 1 paper with a public version or a documented talk");
    expect(html).toContain("each dot is one paper with a public version or a documented talk");
  });
});
