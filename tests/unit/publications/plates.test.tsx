/**
 * Study-design plates (DECISIONS D-13 item 8; JUDGE.md §6 item 7):
 * a registry keyed by publication slug, shown only when the authors checked
 * the plate (`plate_verified`) or in a preview build; design facts only with a
 * source line; labels in HTML, strokes in SVG; P1 panel lettering; a finite
 * 4-step step-through that is inert at rest and without JavaScript.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PLATES, StudyPlate, hasPlate, plateFor } from "@/components/plates";
import { hasContent, loadContent } from "./helpers";

const BASTANI = "bastani-2026-rl-tips";
const pub = (plate_verified: boolean) => ({
  slug: BASTANI,
  plate_verified,
  directionRefs: [{ color: "butterfly-pea" }] as never,
});
const render = (verified: boolean, preview: boolean) =>
  renderToStaticMarkup(<StudyPlate pub={pub(verified)} preview={preview} />);

describe("plate registry", () => {
  it("registers the Bastani 2026 plate and keeps the Learning to Gig plate off", () => {
    expect(hasPlate(BASTANI)).toBe(true);
    expect(plateFor(BASTANI)?.steps).toHaveLength(4);
    // Unverified facts in the P3 draft (JUDGE.md §4): must not ship.
    expect(hasPlate("deng-2025-learning-to-gig")).toBe(false);
    expect(plateFor("toString")).toBeUndefined();
    for (const [slug, def] of Object.entries(PLATES)) {
      expect(def.slug).toBe(slug);
      expect(def.source).toMatch(/^Source: /);
    }
  });

  it.skipIf(!hasContent)("every registered plate belongs to a real publication", () => {
    const c = loadContent(undefined, true);
    for (const slug of Object.keys(PLATES)) expect(c.getPublication(slug), slug).toBeTruthy();
  });
});

describe("<StudyPlate> gate", () => {
  it("renders nothing for an unverified plate in a production build", () => {
    expect(render(false, false)).toBe("");
  });
  it("renders an unverified plate in preview, marked as a draft", () => {
    const html = render(false, true);
    expect(html).toContain('class="plate"');
    expect(html).toContain("Draft figure, pending author check");
  });
  it("renders a verified plate in production without the draft note", () => {
    const html = render(true, false);
    expect(html).toContain('class="plate"');
    expect(html).not.toContain("pending author check");
  });
  it("renders nothing for a paper without a registered plate", () => {
    const html = renderToStaticMarkup(
      <StudyPlate
        pub={{ slug: "deng-2025-learning-to-gig", plate_verified: true, directionRefs: [] }}
        preview
      />,
    );
    expect(html).toBe("");
  });
});

describe("Bastani plate content", () => {
  const html = render(true, false);

  it("is a numbered figure with a caption that says 'not data' and a source line", () => {
    expect(html).toMatch(
      /<figure class="plate" data-swatch="butterfly-pea" aria-labelledby="[^"]+-cap">/,
    );
    expect(html).toContain("<b>Figure 1.</b>");
    expect(html).toContain("not data");
    expect(html).toContain("No assignment schedule and no result is drawn.");
    expect(html).toContain("arXiv:2108.08454");
  });

  it("letters its panels a, b, c (P1) and keeps every label in HTML, not SVG text", () => {
    const letters = [...html.matchAll(/<span class="pl-l">([a-z])<\/span>/g)].map((m) => m[1]);
    expect(letters).toEqual(["a", "b", "c"]);
    expect(html).not.toMatch(/<text[\s>]/);
    for (const label of ["chop", "cook", "plate", "Order 4", "Chef", "Sous-chef", "Server", "R"]) {
      expect(html).toContain(`>${label}<`);
    }
  });

  it("draws the documented design facts only", () => {
    // 4 orders × 3 subtasks = 12 subtask pearls.
    expect(html.match(/class="pl-pe pl-sp"/g)).toHaveLength(12);
    // Normal 3 full rounds; disrupted 2 full + 4 without the chef (dotted top line).
    expect(html).toContain("3 full rounds");
    expect(html).toContain("2 full rounds, then 4 without the chef");
    expect(html.match(/<g data-k="3"><path class="pl-lane pl-lane--off"/g)).toHaveLength(4);
    // P1 panel (b): glyph length = optimal finish (20 vs 34 ticks at 1.8 units/tick).
    expect(html).toContain("20 ticks: optimal finish, fully staffed");
    expect(html).toContain("34 ticks: optimal finish without the chef");
    expect(html).toMatch(/d="M0 3h36"/);
    expect(html).toMatch(/d="M\d+(\.\d+)? 3h61\.2"/);
    // Phase I, R, four arms, each arm line in SVG (not a pseudo-element).
    const arms = [
      ...html.matchAll(/<li[^>]*><svg class="pl-armline"[\s\S]*?<span>([^<]+)<\/span><\/li>/g),
    ];
    expect(arms.map((m) => m[1])).toEqual([
      "No tip",
      "The algorithm’s tip",
      "The tip most chosen in Phase I",
      "A baseline tip",
    ]);
    expect(html).toContain("one if-then rule");
  });

  it("ships a finite step-through that is inert at rest and without JavaScript", () => {
    expect(html).toContain('<div class="pl" data-at="0">');
    // Buttons stay hidden until hydration (no-JS readers see the whole design).
    expect(html).toMatch(/<button[^>]*class="plate-btn plate-btn--step"[^>]*hidden=""/);
    expect(html).toMatch(/<button[^>]*class="plate-btn plate-btn--all"[^>]*hidden=""/);
    expect(html).toMatch(/<p class="plate-note" aria-live="polite"><\/p>/);
    for (const k of ["1", "2", "3", "4", "3o", "3x"]) expect(html).toContain(`data-k="${k}"`);
  });
});
