/** Name splitting, citation keys, CSL mapping and the venue line (brief §D8). */
import { describe, expect, it } from "vitest";
import { splitName } from "@/lib/publications/names";
import {
  arxivId,
  citationKey,
  pageRange,
  referenceUrl,
  toCsl,
  venueLine,
  venueText,
} from "@/lib/publications/csl";
import type { PublicationEntry } from "@/lib/content/schema";
import { contentPublications, hasContent } from "./helpers";

describe("splitName", () => {
  it.each([
    ["Wichinpong Park Sinchaisri", { family: "Sinchaisri", given: "Wichinpong Park" }],
    ["Maxime C. Cohen", { family: "Cohen", given: "Maxime C." }],
    // A parenthesised nickname is display-only: APA "Zheng, Y.", BibTeX "Zheng, Yanchong".
    ["Yanchong (Karen) Zheng", { family: "Zheng", given: "Yanchong" }],
    ["(Karen)", { family: "(Karen)" }],
    ["Plato", { family: "Plato" }],
    ["Sinchaisri, Wichinpong Park", { family: "Sinchaisri", given: "Wichinpong Park" }],
    [
      "Ludwig van Beethoven",
      { family: "Beethoven", given: "Ludwig", "non-dropping-particle": "van" },
    ],
    ["Martin Luther King Jr.", { family: "King", given: "Martin Luther", suffix: "Jr." }],
  ])("%s", (name, expected) => {
    expect(splitName(name)).toEqual(expected);
  });
});

describe("citationKey", () => {
  it("family + year + first significant title word, ASCII", () => {
    expect(
      citationKey({
        authors: [{ name: "Hamsa Bastani" }],
        year: 2026,
        title: "Improving Human Sequential Decision Making with Reinforcement Learning",
      }),
    ).toBe("bastani2026improving");
    expect(
      citationKey({ authors: [{ name: "Zoë Müller" }], year: undefined, title: "The Art of X" }),
    ).toBe("mullerndart");
  });
});

describe("pageRange", () => {
  it("uses an en dash and keeps article numbers", () => {
    expect(pageRange("733-755")).toBe("733–755");
    expect(pageRange("1376--1393")).toBe("1376–1393");
    expect(pageRange("e0257530")).toBe("e0257530");
    expect(pageRange(undefined)).toBeUndefined();
  });
});

describe("venueLine", () => {
  const ms = {
    type: "journal",
    venue: "Management Science",
    year: 2026,
    volume: "72",
    issue: "1",
    pages: "733-755",
    date_online: "2025-05-22",
  } as const;

  it("matches brief §D8 exactly for the Management Science paper", () => {
    expect(venueText(ms)).toBe("Management Science 2026, 72(1):733–755; online May 22, 2025");
    expect(venueLine(ms)).toEqual({
      venue: "Management Science",
      detail: "2026, 72(1):733–755",
      online: "online May 22, 2025",
    });
  });
  it("omits what content does not provide", () => {
    expect(venueText({ ...ms, date_online: undefined })).toBe(
      "Management Science 2026, 72(1):733–755",
    );
    expect(venueText({ ...ms, issue: undefined, pages: undefined, date_online: undefined })).toBe(
      "Management Science 2026, 72",
    );
    expect(
      venueText({ type: "working-paper", venue: "SSRN working paper 4502968", year: 2026 }),
    ).toBe("SSRN working paper 4502968, 2026");
    expect(venueText({ type: "working-paper", year: 2026 })).toBe("2026");
    expect(venueText({ type: "work-in-progress" })).toBe("");
  });
  it("does not repeat a year the venue already names", () => {
    expect(
      venueText({
        type: "work-in-progress",
        venue: "2026 INFORMS MSOM Conference (presentation)",
        year: 2026,
      }),
    ).toBe("2026 INFORMS MSOM Conference (presentation)");
    // …but a different year is still added.
    expect(venueText({ type: "working-paper", venue: "Presented at EC 2025", year: 2026 })).toBe(
      "Presented at EC 2025, 2026",
    );
  });
});

describe("arxivId", () => {
  it("reads the identifier from an arXiv link or an arXiv DOI", () => {
    expect(arxivId({ links: { arxiv: "https://arxiv.org/abs/2603.02055" } })).toBe("2603.02055");
    expect(arxivId({ links: { arxiv: "https://arxiv.org/abs/2108.08454v5" } })).toBe("2108.08454");
    expect(arxivId({ links: { arxiv: "https://arxiv.org/pdf/2108.08454.pdf" } })).toBe(
      "2108.08454",
    );
    expect(arxivId({ doi: "10.48550/arXiv.2610.10265", links: {} })).toBe("2610.10265");
    expect(arxivId({ doi: "10.1287/mnsc.2022.02455", links: {} })).toBeUndefined();
  });
});

describe("toCsl", () => {
  const base = {
    slug: "x-2020-y",
    title: "T",
    authors: [{ name: "A B" }],
    links: {},
    status: "published",
  } as unknown as PublicationEntry;

  it("journal articles carry container, volume, issue, pages and DOI, but no URL", () => {
    const csl = toCsl({
      ...base,
      type: "journal",
      venue: "J",
      year: 2020,
      volume: "1",
      issue: "2",
      pages: "3–4",
      doi: "10.1/x",
      links: { pdf: "https://example.org/x.pdf" },
    });
    expect(csl).toMatchObject({
      type: "article-journal",
      "container-title": "J",
      volume: "1",
      issue: "2",
      page: "3-4",
      DOI: "10.1/x",
      issued: { "date-parts": [[2020]] },
    });
    expect(csl.URL).toBeUndefined();
  });
  it("without a DOI the best public link becomes the URL", () => {
    expect(
      referenceUrl({ links: { pdf: "https://p.org/a.pdf", ssrn: "https://ssrn.com/x" } }),
    ).toBe("https://ssrn.com/x");
    expect(referenceUrl({ links: { pdf: "/uploads/a.pdf" } })).toBeUndefined();
  });
});

describe.skipIf(!hasContent)("content", () => {
  it("every publication in content maps to CSL without throwing", () => {
    for (const p of contentPublications().values()) {
      const csl = toCsl(p);
      expect(csl.title).toBe(p.title);
      expect(csl.author).toHaveLength(p.authors.length);
    }
  });
});
