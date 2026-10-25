/**
 * News item "Related" row helpers (brief §D10; D-13 item 7). The provenance
 * footnote is printed only when the row itself shows a status the lab reported
 * (awards are not shown on news items, so they never trigger it), and a venue
 * that already names the year does not get it twice ("2026 INFORMS MSOM
 * Conference (presentation), 2026").
 */
import { describe, expect, it } from "vitest";
import type { NewsView, PublicationView } from "@/lib/content/load";
import { showsReportedStatus, venueLine } from "@/components/news/NewsRelated";

type Pub = Pick<
  PublicationView,
  "status" | "status_source" | "status_note" | "as_of" | "type" | "awards"
>;
const pub = (p: Partial<Pub>): PublicationView =>
  ({
    status: "published",
    status_source: "self-reported",
    status_note: undefined,
    as_of: undefined,
    type: "journal-article",
    awards: [],
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
  });
});

describe("showsReportedStatus", () => {
  it("is false for a published paper, even with self-reported awards", () => {
    const awarded = pub({
      awards: [{ title: "Best Paper", year: 2021 }] as unknown as PublicationView["awards"],
    });
    expect(showsReportedStatus(news([awarded]))).toBe(false);
  });
  it("is true when a self-reported review status is printed", () => {
    const wip = pub({ status: "in-progress" as PublicationView["status"], as_of: "2026-10-20" });
    expect(showsReportedStatus(news([pub({}), wip]))).toBe(true);
  });
  it("is false when the status comes from a verified source", () => {
    const verified = pub({
      status: "in-progress" as PublicationView["status"],
      status_source: "documented" as PublicationView["status_source"],
    });
    expect(showsReportedStatus(news([verified]))).toBe(false);
  });
  it("is false with no related papers", () => {
    expect(showsReportedStatus(news([]))).toBe(false);
  });
});
