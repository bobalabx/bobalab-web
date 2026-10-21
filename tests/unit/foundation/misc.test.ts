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

describe("fonts (§C4 budget ≤ 100 KiB)", () => {
  const files = [
    "fraunces-latin-wght-normal.woff2",
    "inter-latin-wght-normal.woff2",
    "ibm-plex-mono-latin-500-normal.woff2",
  ];
  it("preloaded fonts total ≤ 100 KiB and carry the OFL", () => {
    const total = files.reduce((s, f) => s + fs.statSync(root(`src/fonts/${f}`)).size, 0);
    expect(total / 1024).toBeLessThanOrEqual(100);
    expect(fs.readFileSync(root("src/fonts/OFL.txt"), "utf8")).toContain("SIL Open Font License");
  });
  it("loader references exactly these files", () => {
    const src = fs.readFileSync(root("src/fonts/index.ts"), "utf8");
    for (const f of files) expect(src).toContain(f);
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

describe("wordmark geometry", () => {
  it("is outlined: 3 BOBA glyph paths (B, B, A) + pearl + 3 LAB paths", () => {
    expect(WORDMARK.boba).toHaveLength(3);
    expect(WORDMARK.lab).toHaveLength(3);
    expect(WORDMARK.pearl.r).toBeGreaterThan(40);
    expect(WORDMARK.axes).toMatchObject({ wght: 680, opsz: 144, SOFT: 100 });
  });

  // verify VIS-02: the mark read "BOBAL AB" (A->L ink 1 unit, L->A 23 units).
  it("reads as one word: the A->L join is never tighter than a gap inside LAB", () => {
    const { boba, join, lab, minClear } = WORDMARK.spacing;
    const rhythm = boba.reduce((a, b) => a + b, 0) / boba.length;
    for (const g of lab) expect(join).toBeGreaterThanOrEqual(g - 0.01);
    // ...and not a word space: within 1.35x of the BOBA rhythm.
    expect(join / rhythm).toBeLessThan(1.35);
    for (const g of lab) expect(g / rhythm).toBeGreaterThan(0.9);
    // No two LAB neighbours touch (the mono L's long foot vs the A's leg).
    expect(minClear).toBeGreaterThanOrEqual(5);
    // Raw ink: the BOBA A -> LAB L bounding-box gap is at least every LAB one.
    const xs = (d: string) =>
      [...d.matchAll(/([MLQCHV])([^MLQCHVZ]*)/g)].flatMap(([, op = "", args = ""]) => {
        const n = args.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
        if (op === "V") return [];
        return op === "H" ? n : n.filter((_, i) => i % 2 === 0);
      });
    const box = (d: string) => ({ left: Math.min(...xs(d)), right: Math.max(...xs(d)) });
    const [a, l, a2, b] = [WORDMARK.boba[2], ...WORDMARK.lab].map(box);
    if (!a || !l || !a2 || !b) throw new Error("wordmark glyphs missing");
    const joinInk = l.left - a.right;
    expect(joinInk).toBeGreaterThanOrEqual(a2.left - l.right);
    expect(joinInk).toBeGreaterThanOrEqual(b.left - a2.right);
  });
});
