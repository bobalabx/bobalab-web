/**
 * The publications ledger row (D-13 item 5 and 7; P3 `.row`): title link,
 * authors, venue plus the dated status (no per-row "reported by the lab"),
 * the in-brief line, and the meta column (type word, direction segments,
 * awards count, plain materials links with the title in their names).
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicationRow } from "@/components/publications/PublicationRow";
import {
  AuthorList,
  isSelfReportedStatus,
  reviewStatus,
  statusText,
} from "@/components/publications/PaperParts";
import { hasContent, loadContent } from "./helpers";

describe("reviewStatus", () => {
  const base = { status_source: "self-reported" as const, as_of: "2026-10-20" };
  it("says nothing that only repeats the type word", () => {
    expect(reviewStatus({ ...base, type: "working-paper", status: "working-paper" })).toBeNull();
    expect(reviewStatus({ ...base, type: "work-in-progress", status: "in-progress" })).toBeNull();
    expect(reviewStatus({ ...base, type: "journal", status: "published" })).toBeNull();
    // Not marked as the lab's own claim either (no footnote needed for it).
    expect(isSelfReportedStatus({ ...base, type: "work-in-progress", status: "in-progress" })).toBe(
      false,
    );
  });
  it("keeps a status that adds something", () => {
    expect(reviewStatus({ ...base, type: "working-paper", status: "submitted" })).toBe("Submitted");
    expect(
      reviewStatus({
        ...base,
        type: "work-in-progress",
        status: "in-progress",
        status_note: "with a field partner",
      }),
    ).toBe("In progress with a field partner");
    expect(reviewStatus({ ...base, type: "working-paper", status: "in-progress" })).toBe(
      "In progress",
    );
  });
});

describe.skipIf(!hasContent)("PublicationRow", () => {
  const c = loadContent(undefined, true);

  it("keeps the shared row classes and the paper-page link", () => {
    for (const p of c.countedPublications) {
      const html = renderToStaticMarkup(<PublicationRow pub={p} />);
      expect(html).toContain(`<article class="bl-pub pubs-row" aria-labelledby="pub-${p.slug}">`);
      // next/link drops the trailing slash outside the app router (trailingSlash is a build setting).
      expect(html).toMatch(new RegExp(`href="/publications/${p.slug}/?"`));
      expect(html).not.toContain("reported by the lab");
      // No arrows, no icons.
      expect(html).not.toMatch(/→|bl-icon/);
      // One link per row in the main column (the title): names are plain text,
      // lab members in 600 (P3 `.au .lab`); the paper page links them.
      expect(html).not.toContain('href="/people/');
      for (const a of p.authorList.filter((x) => x.isLab && x.person)) {
        expect(html).toContain(`<strong class="bl-pub__author--lab">${a.name}</strong>`);
      }
    }
  });

  it("links lab members with a profile on the paper page only", () => {
    const p = c.countedPublications.find((x) =>
      x.authorList.some((a) => a.isLab && a.person?.hasProfile),
    )!;
    const lab = p.authorList.find((a) => a.isLab && a.person?.hasProfile)!;
    const page = renderToStaticMarkup(<AuthorList authors={p.authorList} />);
    expect(page).toMatch(new RegExp(`href="/people/${lab.person!.slug}/?"`));
    const row = renderToStaticMarkup(<AuthorList authors={p.authorList} variant="row" />);
    expect(row).not.toContain("href=");
  });

  it("dates a review status on the row and keeps the lab's claim for the footnote", () => {
    const p = c.countedPublications.find(
      (x) => x.status === "major-revision" && x.status_source === "self-reported" && x.as_of,
    );
    expect(p).toBeTruthy();
    const html = renderToStaticMarkup(<PublicationRow pub={p!} />);
    expect(html).toMatch(
      /<span class="bl-pub__status">Major revision [^<]*, as of [A-Z][a-z]{2} \d{4}<\/span>/,
    );
    expect(isSelfReportedStatus(p!)).toBe(true);
  });

  it("does not repeat 'preprint' after an arXiv preprint venue", () => {
    const p = c.countedPublications.find(
      (x) => x.status === "preprint" && /preprint/i.test(x.venue ?? ""),
    );
    if (!p) return;
    expect(statusText(p)).toMatch(/^v\d+(, as of .+)?$/);
  });

  it("shows awards as one count linking to the paper's award list", () => {
    const p = c.countedPublications.find((x) => x.awards.length > 1)!;
    const html = renderToStaticMarkup(<PublicationRow pub={p} />);
    expect(html).toMatch(new RegExp(`href="/publications/${p.slug}/?#awards-h"`));
    expect(html).toContain(
      `${p.awards.length} awards<span class="vh"> for ${p.title.replace(/&/g, "&amp;")}</span>`,
    );
  });

  it("prefixes each direction with its line segment and states the type in words", () => {
    const p = c.countedPublications.find((x) => x.directionRefs.length > 1)!;
    const html = renderToStaticMarkup(<PublicationRow pub={p} showYear />);
    for (const d of p.directionRefs) {
      expect(html).toContain(
        `<span class="bl-seg" data-swatch="${d.color}" aria-hidden="true"></span>`,
      );
    }
    expect(html).toMatch(
      /<span class="bl-badge">[A-Z][a-z]+( [a-z]+)*<\/span><span class="t-num">, \d{4}<\/span>/,
    );
  });
});
