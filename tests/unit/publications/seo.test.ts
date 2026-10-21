/** Google Scholar citation_* meta, meta descriptions and ScholarlyArticle JSON-LD (WP3 acceptance #5). */
import { describe, expect, it } from "vitest";
import { scholarMeta } from "@/lib/seo/scholar";
import { serializeJsonLd } from "@/lib/seo/jsonld";
import { paperJsonLd } from "@/lib/publications/jsonld";
import {
  paperFallbackDescription,
  paperScholarMeta,
  wantsScholarMeta,
} from "@/lib/publications/seo";
import type { PublicationEntry } from "@/lib/content/schema";
import { hasContent, loadContent } from "./helpers";

describe.skipIf(!hasContent)("paper SEO from content", () => {
  const c = loadContent();
  const p = c.getPublication("bastani-2026-rl-tips")!;

  it("Scholar meta carries title, every author, date, journal, volume, issue, pages and DOI", () => {
    expect(scholarMeta(p)).toEqual({
      citation_title: p.title,
      citation_author: p.authors.map((a) => a.name),
      citation_publication_date: "2026",
      citation_journal_title: "Management Science",
      citation_volume: "72",
      citation_issue: "1",
      citation_firstpage: "733",
      citation_lastpage: "755",
      citation_doi: "10.1287/mnsc.2022.02455",
    });
  });

  it("ScholarlyArticle JSON-LD nests issue → volume → periodical and links lab authors", () => {
    const ld = paperJsonLd(p, c.site) as unknown as Record<string, unknown>;
    expect(ld["@type"]).toBe("ScholarlyArticle");
    expect(ld.headline).toBe(p.title);
    expect(ld.isPartOf).toEqual({
      "@type": "PublicationIssue",
      issueNumber: "1",
      isPartOf: {
        "@type": "PublicationVolume",
        volumeNumber: "72",
        isPartOf: { "@type": "Periodical", name: "Management Science" },
      },
    });
    expect(ld.pagination).toBe("733–755");
    const authors = ld.author as Array<{ name: string; url?: string }>;
    expect(authors.map((a) => a.name)).toEqual(p.authors.map((a) => a.name));
    const pi = authors.find((a) => a.name === "Wichinpong Park Sinchaisri")!;
    expect(pi.url).toMatch(/\/people\/park-sinchaisri\/$/);
    expect(ld.url).toMatch(/\/publications\/bastani-2026-rl-tips\/$/);
    expect(Object.values(ld).includes(undefined)).toBe(false);
  });

  it("serialises without a raw '<'", () => {
    for (const pub of c.countedPublications) {
      expect(serializeJsonLd(paperJsonLd(pub, c.site))).not.toContain("<");
    }
  });

  it("the lab-written 'In brief' is a description, never an abstract", () => {
    const ld = paperJsonLd(p, c.site) as unknown as Record<string, unknown>;
    expect(ld.abstract).toBeUndefined();
    expect(ld.description).toBe(p.in_brief);
  });
});

describe("paper SEO by publication type", () => {
  const base = {
    slug: "doe-2026-sample",
    title: "A Sample Paper",
    authors: [{ name: "Jane Q. Doe" }, { name: "Ana de la Cruz" }, { name: "Bo Li" }],
    links: {},
    status: "published",
  } as unknown as PublicationEntry;

  it("an SSRN working paper names SSRN as the institution, with the report number", () => {
    const meta = paperScholarMeta({
      ...base,
      type: "working-paper",
      status: "revise-resubmit",
      venue: "SSRN working paper 4502968",
      year: 2026,
    } as PublicationEntry);
    expect(meta.citation_technical_report_institution).toBe("SSRN");
    expect(meta.citation_technical_report_number).toBe("4502968");
  });

  it("a dissertation names the university, not the venue string", () => {
    const meta = paperScholarMeta({
      ...base,
      type: "dissertation",
      venue: "Ph.D. dissertation, University of Pennsylvania",
      year: 2021,
    } as PublicationEntry);
    expect(meta.citation_dissertation_institution).toBe("University of Pennsylvania");
  });

  it("an arXiv preprint gets no institution", () => {
    const meta = paperScholarMeta({
      ...base,
      type: "working-paper",
      status: "preprint",
      venue: "arXiv preprint",
      year: 2026,
      links: { arxiv: "https://arxiv.org/abs/2603.02055" },
    } as PublicationEntry);
    expect(meta.citation_technical_report_institution).toBeUndefined();
    expect(meta.citation_title).toBe("A Sample Paper");
  });

  it("Scholar tags only for papers with a public version", () => {
    expect(wantsScholarMeta({ counted: true, publicVersion: true })).toBe(true);
    // counted through a documented talk only: nothing for Scholar to read
    expect(wantsScholarMeta({ counted: true, publicVersion: false })).toBe(false);
    expect(wantsScholarMeta({ counted: false, publicVersion: false })).toBe(false);
  });

  it("the fallback description names the type, the authors and the venue", () => {
    expect(
      paperFallbackDescription({
        ...base,
        type: "work-in-progress",
        venue: "2026 INFORMS MSOM Conference (presentation)",
        year: 2026,
      } as PublicationEntry),
    ).toBe(
      "Work in progress by Jane Q. Doe, Ana de la Cruz, and Bo Li. 2026 INFORMS MSOM Conference (presentation).",
    );
    expect(
      paperFallbackDescription({
        ...base,
        authors: [{ name: "Jane Q. Doe" }],
        type: "working-paper",
      } as PublicationEntry),
    ).toBe("Working paper by Jane Q. Doe.");
  });
});

describe.skipIf(!hasContent)("paper JSON-LD venues from content", () => {
  const c = loadContent();
  it("a working-paper series and a thesis school are publishers, not containers", () => {
    for (const pub of c.countedPublications) {
      const ld = paperJsonLd(pub, c.site) as unknown as Record<string, unknown>;
      if (pub.type === "journal") {
        expect(ld.isPartOf, pub.slug).toBeDefined();
        expect(ld.publisher, pub.slug).toBeUndefined();
      } else {
        expect(ld.isPartOf, pub.slug).toBeUndefined();
      }
      if (pub.venue && /working paper/i.test(pub.venue)) {
        expect(ld.publisher, pub.slug).toEqual({ "@type": "Organization", name: "SSRN" });
      }
    }
  });
});
