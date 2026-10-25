/** Markdoc safety, fonts budget, SEO helpers, VT names, paths, wordmark, pre-paint script. */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { markdownToHtml, markdownToText } from "@/lib/content/markdoc";
import { serializeJsonLd, scholarlyArticleLd, organizationLd } from "@/lib/seo/jsonld";
import { scholarMeta } from "@/lib/seo/scholar";
import { clipDescription, pageMetadata } from "@/lib/seo/metadata";
import { pearlVtName, PAGE_ENTER_EXIT, TRANSITION, VT } from "@/lib/vt";
import { pagePath, withBasePath } from "@/lib/site/paths";
import { prePaintSource } from "@/lib/site/motion";
import { WORDMARK } from "@/components/brand/wordmark-geometry";
import { DEFAULT_SITE } from "@/lib/content/load";

const root = (p: string) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));

describe("Markdoc rendering (§G4 content safety)", () => {
  it("escapes raw HTML", () => {
    const html = markdownToHtml('Hello <script>alert(1)</script> <img src=x onerror="y">');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
  });
  it("does not link javascript: URLs", () => {
    expect(markdownToHtml("[x](javascript:alert(1))")).not.toContain('href="javascript');
  });
  it("demotes h1 to h2 and adds rel to external links", () => {
    const html = markdownToHtml("# Title\n\n[ext](https://example.org) [int](/research/)");
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain('<a href="https://example.org" rel="noopener noreferrer">ext</a>');
    expect(html).toContain('<a href="/research/">int</a>');
  });
  it("plain text extraction", () => {
    expect(markdownToText("**Bold** and _it_ & more")).toBe("Bold and it & more");
  });
});

describe("fonts (D-13 item 3: one family, ≤ 100 KiB)", () => {
  const files = ["archivo-latin-wdth-normal.woff2"];
  it("preloaded fonts total ≤ 100 KiB and carry the OFL", () => {
    const total = files.reduce((s, f) => s + fs.statSync(root(`src/fonts/${f}`)).size, 0);
    expect(total / 1024).toBeLessThanOrEqual(100);
    expect(fs.readFileSync(root("src/fonts/OFL.txt"), "utf8")).toContain("SIL Open Font License");
    expect(fs.readFileSync(root("src/fonts/OFL.txt"), "utf8")).toContain("Archivo Project Authors");
  });
  it("loader references exactly these files, with both variable axes", () => {
    const src = fs.readFileSync(root("src/fonts/index.ts"), "utf8");
    for (const f of files) expect(src).toContain(f);
    expect(src).toMatch(/weight: "100 900"/);
    expect(src).toMatch(/prop: "font-stretch", value: "62% 125%"/);
    expect(src.match(/localFont\(/g)).toHaveLength(1);
  });
  it("Fraunces, Inter and IBM Plex are gone from src/fonts and the styles", () => {
    const left = fs.readdirSync(root("src/fonts")).filter((f) => f.endsWith(".woff2"));
    expect(left).toEqual(files);
    for (const f of ["tokens.css", "base.css", "components.css", "prose.css"]) {
      const css = fs.readFileSync(root(`src/styles/${f}`), "utf8");
      expect(css, f).not.toMatch(/fraunces|--font-inter|plex/i);
    }
  });
  it("monospace is the system stack and only for code, DOI and BibTeX", () => {
    const base = fs.readFileSync(root("src/styles/base.css"), "utf8");
    expect(base).toMatch(/\.doi,\s*\.bibtex \{\s*font-family: var\(--font-mono\)/);
    const tokens = fs.readFileSync(root("src/styles/tokens.css"), "utf8");
    expect(tokens).toMatch(/--font-mono: ui-monospace/);
    expect(tokens).toMatch(/--font-data: var\(--font-sans\)/);
  });
});

describe("SEO helpers", () => {
  it("JSON-LD escapes '<'", () => {
    expect(serializeJsonLd({ a: "</script><x>" })).toBe('{"a":"\\u003c/script>\\u003cx>"}');
  });
  it("builds ScholarlyArticle and ResearchOrganization", () => {
    const art = scholarlyArticleLd(
      { title: "T", authors: [{ name: "A B" }], year: 2025, venue: "J", doi: "10.1/x" },
      "/publications/b-2025-t/",
      DEFAULT_SITE,
    );
    expect(art["@type"]).toBe("ScholarlyArticle");
    expect(JSON.stringify(art)).toContain("https://doi.org/10.1/x");
    expect(JSON.stringify(organizationLd(DEFAULT_SITE))).toContain(
      '"@type":"ResearchOrganization"',
    );
  });
  it("Scholar meta: one citation_author per author, pages split", () => {
    const m = scholarMeta({
      title: "T",
      authors: [{ name: "A" }, { name: "B" }],
      year: 2026,
      type: "journal",
      venue: "MS",
      pages: "733–755",
    });
    expect(m.citation_author).toEqual(["A", "B"]);
    expect(m.citation_firstpage).toBe("733");
    expect(m.citation_lastpage).toBe("755");
    expect(m.citation_publication_date).toBe("2026");
    expect(m.citation_journal_title).toBe("MS");
  });
  it("page metadata has a canonical and OG image; descriptions are clipped", () => {
    const md = pageMetadata({ title: "Research", path: "/research/" });
    expect(md.alternates?.canonical).toBe("research/");
    expect(clipDescription("word ".repeat(100))!.length).toBeLessThanOrEqual(161);
  });
});

describe("view-transition names", () => {
  it("are stable", () => {
    expect(pearlVtName("ai-at-work")).toBe("pearl-ai-at-work");
    expect(VT.morph).toBe("pearl-morph");
    expect(TRANSITION.pearlOpen).toBe("pearl-open");
    expect(PAGE_ENTER_EXIT.default).toBe("none");
  });
  it("motion.css styles every VT class", () => {
    const css = fs.readFileSync(root("src/styles/motion.css"), "utf8");
    for (const cls of Object.values(VT)) expect(css).toContain(`(.${cls})`);
    expect(css).toContain("::view-transition {\n  pointer-events: none;");
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/:root\[data-motion="reduce"\]::view-transition-group/);
  });
});

describe("paths", () => {
  it("adds trailing slashes to page paths only", () => {
    expect(pagePath("/research")).toBe("/research/");
    expect(pagePath("/publications?direction=x")).toBe("/publications/?direction=x");
    expect(pagePath("/news/feed.xml")).toBe("/news/feed.xml");
    expect(withBasePath("https://x.org/a")).toBe("https://x.org/a");
    expect(withBasePath("/uploads/a.webp")).toMatch(/\/uploads\/a\.webp$/);
  });
});

describe("pre-paint script", () => {
  it("applies the stored motion choice and sets data-intro once per session on home", () => {
    const src = prePaintSource("/site");
    expect(src).toContain('localStorage.getItem("bobalab-motion")');
    expect(src).toContain('sessionStorage.getItem("bobalab-intro")');
    expect(src).toContain('"/site"');
    expect(() => new Function(src)).not.toThrow();
  });
});

describe("wordmark geometry (D-13 item 2)", () => {
  it("is outlined Archivo condensed bold: B, the pearl, then B A L A B", () => {
    expect(WORDMARK.word).toBe("BOBALAB");
    expect(WORDMARK.axes).toEqual({ wdth: 68, wght: 700 });
    expect(WORDMARK.boba).toHaveLength(3);
    expect(WORDMARK.lab).toHaveLength(3);
    for (const d of [...WORDMARK.boba, ...WORDMARK.lab]) expect(d).toMatch(/^M[\d.]+ [\d.]+/);
  });
  it("the pearl is a disc of cap height (+ overshoot) sitting on the baseline", () => {
    const { pearl, cap, baseline } = WORDMARK;
    expect(pearl.r * 2).toBeGreaterThanOrEqual(cap);
    expect(pearl.r * 2).toBeLessThanOrEqual(cap * 1.05);
    expect(Math.abs(pearl.cy - (baseline - cap / 2))).toBeLessThanOrEqual(0.01);
  });
  // verify VIS-02 (the old mark read "BOBAL AB"): no gap between neighbours may read as a word space.
  it("reads as one word: every gap between neighbours is under a fifth of the cap height", () => {
    expect(WORDMARK.gaps).toHaveLength(6);
    for (const g of WORDMARK.gaps) {
      expect(g).toBeGreaterThan(0);
      expect(g).toBeLessThan(WORDMARK.cap / 5);
    }
    // The pearl is set into the word, not spaced off it.
    const mean = WORDMARK.gaps.reduce((a, b) => a + b, 0) / WORDMARK.gaps.length;
    expect(WORDMARK.gaps[0]! / mean).toBeLessThan(2);
    expect(WORDMARK.gaps[1]! / mean).toBeLessThan(2);
  });
});
