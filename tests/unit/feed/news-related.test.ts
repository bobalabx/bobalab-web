/**
 * News item "Related" row helpers (brief §D10; D-13 item 7). The provenance
 * footnote is printed only when the row itself shows a status the lab reported
 * (awards are not shown on news items, so they never trigger it), and a venue
 * that already names the year does not get it twice ("2026 INFORMS MSOM
 * Conference (presentation), 2026").
 */
import { describe, expect, it } from "vitest";
import type { NewsView, PublicationView } from "@/lib/content/load";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NewsRelated, venueLine } from "@/components/news/NewsRelated";

type Pub = Pick<
  PublicationView,
  "status" | "status_source" | "status_note" | "as_of" | "type" | "awards" | "venue"
>;
const pub = (p: Partial<Pub>): PublicationView =>
  ({
    status: "published",
    status_source: "self-reported",
    status_note: undefined,
    as_of: undefined,
    type: "journal-article",
    awards: [],
    slug: "x",
    title: "X",
    ...p,
  }) as unknown as PublicationView;
const news = (refs: PublicationView[]): NewsView =>
  ({ publicationRefs: refs, peopleRefs: [], directionRefs: [] }) as unknown as NewsView;

describe("venueLine", () => {
  it("joins venue and year", () => {
    expect(venueLine({ venue: "Management Science", year: 2026 })).toBe("Management Science, 2026");
  });
  it("leaves the year out when the venue already names it", () => {
    expect(venueLine({ venue: "2026 INFORMS MSOM Conference (presentation)", year: 2026 })).toBe(
      "2026 INFORMS MSOM Conference (presentation)",
    );
  });
  it("handles a missing venue or year", () => {
    expect(venueLine({ year: 2025 })).toBe("2025");
    expect(venueLine({ venue: "arXiv preprint" })).toBe("arXiv preprint");
    expect(venueLine({})).toBe("");
    // With the type known, a missing venue is named by the type, never a bare year.
    expect(venueLine({ year: 2026, type: "working-paper" })).toBe("Working paper, 2026");
  });
});

describe("related papers: status as a plain label (copy sweep)", () => {
  const render = (refs: PublicationView[]) =>
    renderToStaticMarkup(createElement(NewsRelated, { item: news(refs) }));
  it("prints a review status with no 'as of' date and no provenance note", () => {
    const rr = pub({
      status: "major-revision" as PublicationView["status"],
      status_note: "at Manufacturing & Service Operations Management",
      as_of: "2026-05",
    });
    const out = render([rr]);
    expect(out).toContain("Major revision at Manufacturing &amp; Service Operations Management");
    expect(out).not.toMatch(/as of|reported by the lab/i);
  });
  it("leaves out a version-only status after an arXiv preprint venue", () => {
    const pre = pub({
      status: "preprint" as PublicationView["status"],
      status_note: "v2",
      venue: "arXiv preprint",
      as_of: "2026-09",
      status_source: "documented" as PublicationView["status_source"],
    });
    const out = render([pre]);
    expect(out).toContain("<cite>arXiv preprint</cite>");
    expect(out).not.toMatch(/Preprint v2|as of/);
  });
  it("prints nothing for a published paper or a bare in-progress status", () => {
    const wip = pub({
      status: "in-progress" as PublicationView["status"],
      type: "work-in-progress" as PublicationView["type"],
    });
    expect(render([pub({}), wip])).not.toContain('class="nw-related__sub">Published');
    expect(render([wip])).not.toContain("In progress");
  });
});
