/**
 * BibTeX + formatted citations from citation-js (WP3 acceptance #3).
 *
 * Golden files in ./golden/ hold the expected output for the five published
 * papers. They were generated once with UPDATE_GOLDEN=1 and then checked by
 * hand against the content files. A second, independent check parses each
 * golden .bib and compares every field value with the content file, so a
 * golden file can never silently drift from the content.
 *
 *   npx vitest run --config vitest.config.ts tests/unit/publications
 *   UPDATE_GOLDEN=1 npx vitest run --config vitest.config.ts tests/unit/publications/bibtex.test.ts
 */
import { describe, expect, it } from "vitest";
import { bibtexFor, normaliseBibtex } from "@/lib/publications/bibtex";
import { formatCitation, formatCitationText, htmlToSegments } from "@/lib/publications/citation";
import { splitName } from "@/lib/publications/names";
import { pageRange } from "@/lib/publications/csl";
import type { PublicationEntry } from "@/lib/content/schema";
import {
  PUBLISHED_PAPERS,
  contentPublications,
  hasContent,
  readGolden,
  writeGoldenIfAsked,
} from "./helpers";

/** Parse a single BibTeX entry into { type, key, fields } with TeX markup removed. */
function parseBib(src: string) {
  const head = /^@(\w+)\{([^,]+),/.exec(src.trim());
  if (!head) throw new Error("not a BibTeX entry");
  const fields: Record<string, string> = {};
  for (const m of src.matchAll(/^\s+([a-z]+)\s*=\s*\{(.*)\},?\s*$/gm)) {
    fields[m[1]!] = m[2]!;
  }
  return { type: head[1]!, key: head[2]!, fields };
}
const deTeX = (v: string) =>
  v
    .replace(/\\([&%$#_{}])/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/--/g, "-");

const bibName = (full: string) => {
  const n = splitName(full);
  return `${n["non-dropping-particle"] ? `${n["non-dropping-particle"]} ` : ""}${n.family}${n.given ? `, ${n.given}` : ""}`;
};

describe.skipIf(!hasContent)("golden BibTeX for the five published papers", () => {
  const pubs = contentPublications();

  it("the five papers exist in content and are published journal articles", () => {
    for (const slug of PUBLISHED_PAPERS) {
      const p = pubs.get(slug);
      expect(p, slug).toBeDefined();
      expect(p!.status).toBe("published");
      expect(p!.type).toBe("journal");
    }
  });

  for (const slug of PUBLISHED_PAPERS) {
    describe(slug, () => {
      const p = pubs.get(slug) as PublicationEntry;

      it("BibTeX matches the golden file", () => {
        const bib = bibtexFor(p);
        if (writeGoldenIfAsked(`${slug}.bib`, bib)) return;
        expect(bib + "\n").toBe(readGolden(`${slug}.bib`));
      });

      it("every golden BibTeX value matches the content file exactly", () => {
        const golden = readGolden(`${slug}.bib`);
        expect(golden, `golden/${slug}.bib missing`).not.toBeNull();
        const { type, fields } = parseBib(golden!);
        expect(type).toBe("article");
        expect(deTeX(fields.title!)).toBe(p.title);
        expect(fields.author).toBe(p.authors.map((a) => bibName(a.name)).join(" and "));
        expect(deTeX(fields.journal!)).toBe(p.venue);
        expect(fields.year).toBe(String(p.year));
        expect(fields.volume).toBe(p.volume);
        expect(fields.number).toBe(p.issue);
        expect(deTeX(fields.pages!)).toBe(p.pages);
        expect(fields.doi).toBe(p.doi);
        // A DOI is enough; no duplicate URL field.
        expect(fields.url).toBeUndefined();
        expect(fields.howpublished).toBeUndefined();
        // ASCII only (TeX escapes), so it pastes into any .bib file.
        expect(/^[\x00-\x7f]*$/.test(golden!)).toBe(true);
      });

      it("APA citation matches the golden file and carries the content values", () => {
        const text = formatCitationText(p);
        if (writeGoldenIfAsked(`${slug}.apa.txt`, text)) return;
        expect(text + "\n").toBe(readGolden(`${slug}.apa.txt`));
        expect(text).toContain(`(${p.year}).`);
        expect(text).toContain(p.title);
        expect(text).toContain(p.venue!);
        expect(text).toContain(`${p.volume}(${p.issue})`);
        expect(text).toContain(pageRange(p.pages)!);
        expect(text).toContain(`https://doi.org/${p.doi}`);
        // The venue and volume are italic in APA.
        const italic = formatCitation(p)
          .filter((s) => s.italic)
          .map((s) => s.text);
        expect(italic).toContain(p.venue);
        expect(italic).toContain(p.volume);
      });
    });
  }

  it("the Management Science paper's key fields match brief §D8 (2026, 72(1):733–755)", () => {
    const { fields } = parseBib(readGolden("bastani-2026-rl-tips.bib")!);
    expect([fields.journal, fields.year, fields.volume, fields.number, fields.pages]).toEqual([
      "Management Science",
      "2026",
      "72",
      "1",
      "733--755",
    ]);
  });
});

describe("other publication types", () => {
  const base = {
    slug: "doe-2026-sample",
    title: "A Sample Paper",
    authors: [{ name: "Jane Q. Doe" }, { name: "Ana de la Cruz" }],
    links: {},
  } as unknown as PublicationEntry;

  it("bibtex_override wins", () => {
    const p = { ...base, type: "journal", status: "published", bibtex_override: "@misc{x,\n}\n" };
    expect(bibtexFor(p as PublicationEntry)).toBe("@misc{x,\n}");
  });

  it("an SSRN working paper becomes @techreport with the institution and number", () => {
    const p = {
      ...base,
      type: "working-paper",
      status: "under-revision",
      venue: "SSRN working paper 4502968",
      year: 2026,
      doi: "10.2139/ssrn.4502968",
    } as PublicationEntry;
    const bib = bibtexFor(p);
    expect(bib).toMatch(/^@techreport\{doe2026sample,/);
    expect(bib).toMatch(/institution\s+= \{SSRN\}/);
    expect(bib).toMatch(/number\s+= \{4502968\}/);
    expect(bib).toMatch(/author\s+= \{Doe, Jane Q\. and de la Cruz, Ana\}/);
    expect(formatCitationText(p)).toContain("(Working Paper No. 4502968). SSRN.");
  });

  it("a dissertation becomes @phdthesis with the school", () => {
    const p = {
      ...base,
      type: "dissertation",
      status: "published",
      venue: "Ph.D. dissertation, University of Pennsylvania",
      year: 2021,
      links: { publisher: "https://repository.upenn.edu/edissertations/4013" },
    } as PublicationEntry;
    const bib = bibtexFor(p);
    expect(bib).toMatch(/^@phdthesis\{/);
    expect(bib).toMatch(/school\s+= \{University of Pennsylvania\}/);
    expect(bib).toMatch(/url\s+= \{https:\/\/repository\.upenn\.edu\/edissertations\/4013\}/);
    expect(bib).not.toMatch(/howpublished/);
  });

  it("a master's thesis (type other) becomes @mastersthesis", () => {
    const p = {
      ...base,
      type: "other",
      status: "published",
      venue: "S.M. thesis, Massachusetts Institute of Technology",
      year: 2016,
    } as PublicationEntry;
    expect(bibtexFor(p)).toMatch(/^@mastersthesis\{/);
  });

  it("an arXiv preprint becomes @misc with the DOI", () => {
    const p = {
      ...base,
      type: "working-paper",
      status: "in-progress",
      venue: "arXiv preprint",
      year: 2026,
      doi: "10.48550/arXiv.2603.02055",
      links: { arxiv: "https://arxiv.org/abs/2603.02055" },
    } as PublicationEntry;
    const bib = bibtexFor(p);
    expect(bib).toMatch(/^@misc\{/);
    expect(bib).toMatch(/doi\s+= \{10\.48550\/arXiv\.2603\.02055\}/);
    // BibTeX styles ignore `publisher` on @misc; the note keeps the arXiv id in the reference.
    expect(bib).toMatch(/note\s+= \{arXiv preprint arXiv:2603\.02055\}/);
    // The APA reference is unchanged by the note.
    expect(formatCitationText(p)).toMatch(
      /\. arXiv\. https:\/\/doi\.org\/10\.48550\/arXiv\.2603\.02055$/,
    );
  });

  it("a working paper without a series becomes @unpublished with the required note", () => {
    const p = {
      ...base,
      type: "working-paper",
      status: "under-revision",
      year: 2026,
      links: { pdf: "https://example.org/paper.pdf" },
    } as PublicationEntry;
    const bib = bibtexFor(p);
    expect(bib).toMatch(/^@unpublished\{/);
    expect(bib).toMatch(/note\s+= \{Working paper\}/);
    // …and not a second time as `type` (biblatex would print both).
    expect(bib).not.toMatch(/^\s+type\s+=/m);
    expect(formatCitationText(p)).toContain("[Working paper]");
  });

  it("a parenthesised nickname stays out of the citation form", () => {
    const p = {
      ...base,
      authors: [{ name: "Rim Hariss" }, { name: "Yanchong (Karen) Zheng" }],
      type: "working-paper",
      status: "under-revision",
      venue: "SSRN working paper 3634129",
      year: 2020,
      doi: "10.2139/ssrn.3634129",
    } as PublicationEntry;
    expect(bibtexFor(p)).toMatch(/author\s+= \{Hariss, Rim and Zheng, Yanchong\}/);
    expect(formatCitationText(p)).toMatch(/^Hariss, R\., & Zheng, Y\. \(2020\)\./);
  });

  it("non-ASCII names are TeX-escaped", () => {
    const p = {
      ...base,
      authors: [{ name: "Zoë Müller" }],
      type: "journal",
      status: "published",
      venue: "Journal",
      year: 2024,
    } as PublicationEntry;
    const bib = bibtexFor(p);
    expect(/^[\x00-\x7f]*$/.test(bib)).toBe(true);
    // citation-js writes the accent as {\" u} (valid TeX for ü).
    expect(bib).toMatch(/author\s+= \{M\{\\" ?u\}ller, Zo\{\\" ?e\}\}/);
  });
});

describe("helpers", () => {
  it("normaliseBibtex orders fields and keeps values", () => {
    const raw = "@article{k,\n\tyear = {2020},\n\ttitle = {T},\n\tauthor = {A, B},\n}";
    expect(normaliseBibtex(raw)).toBe(
      "@article{k,\n  title  = {T},\n  author = {A, B},\n  year   = {2020}\n}",
    );
  });
  it("normaliseBibtex drops a howpublished that only repeats the (escaped) url", () => {
    const raw =
      "@misc{k,\n\turl = {https://x.org/a?b=1&c=2},\n\thowpublished = {https://x.org/a?b=1\\&c=2},\n}";
    expect(normaliseBibtex(raw)).toBe("@misc{k,\n  url = {https://x.org/a?b=1&c=2}\n}");
  });
  it("normaliseBibtex drops an @unpublished type that repeats the note, and only there", () => {
    const raw =
      "@unpublished{k,\n\ttitle = {T},\n\ttype = {Working paper},\n\tnote = {Working paper},\n}";
    expect(normaliseBibtex(raw)).toBe(
      "@unpublished{k,\n  title = {T},\n  note  = {Working paper}\n}",
    );
    const report = "@techreport{k,\n\ttype = {Working paper},\n\tnote = {Working paper},\n}";
    expect(normaliseBibtex(report)).toContain("type = {Working paper}");
  });
  it("normaliseBibtex leaves unexpected shapes untouched", () => {
    expect(normaliseBibtex("@string{x = {y}}")).toBe("@string{x = {y}}");
  });
  it("htmlToSegments keeps italics and decodes entities only", () => {
    expect(
      htmlToSegments(
        '<div class="csl-bib-body"><div class="csl-entry">A &#38; B. <i>J</i>, <i>1</i>(2). <b>x</b></div></div>',
      ),
    ).toEqual([
      { text: "A & B. " },
      { text: "J", italic: true },
      { text: ", " },
      { text: "1", italic: true },
      { text: "(2). x" },
    ]);
  });
});
