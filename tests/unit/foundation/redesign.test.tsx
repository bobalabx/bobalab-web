/**
 * FOUNDATION redesign (DECISIONS D-13, "Lines"): the restyled primitives, the
 * brand marks, the motion rules and the new `plate_verified` field.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { Badge, DraftBadge, OpenToRAsBadge } from "@/components/ui/Badge";
import { Pearl } from "@/components/ui/Pearl";
import { PearlTag } from "@/components/ui/PearlTag";
import { MaterialsRow } from "@/components/ui/MaterialsRow";
import { EvidenceLabel } from "@/components/ui/EvidenceLabel";
import { Icon } from "@/components/ui/icons";
import { countsLine } from "@/components/ui/DirectionCard";
import { PublicationEntry, statusLine } from "@/components/ui/PublicationEntry";
import { Wordmark } from "@/components/brand/Wordmark";
import { PearlMark, SHOULDER, ShoulderMark } from "@/components/brand/PearlMark";
import { getContent } from "@/lib/content/load";
import { publicationSchema } from "@/lib/content/schema";
import { showStudyPlate } from "@/lib/content/queries";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const html = (el: ReactNode) => renderToStaticMarkup(<>{el}</>);
const content = () => getContent({ dir: path.join(ROOT, "content"), preview: true });

describe("plain-word meta (no pills, no dots)", () => {
  it("Badge, OpenToRAsBadge and DraftBadge render text only", () => {
    expect(html(<Badge>Working paper</Badge>)).toBe('<span class="bl-badge">Working paper</span>');
    expect(html(<Badge dot>Open</Badge>)).not.toContain("bl-badge__dot");
    expect(html(<OpenToRAsBadge />)).toBe(
      '<span class="bl-badge bl-badge--accent">Open to RAs</span>',
    );
    expect(html(<DraftBadge />)).toContain("Draft · pending lab review");
  });
  it("the .bl-badge rule draws no border, radius, padding or background", () => {
    const block = /\.bl-badge\s*\{([^}]*)\}/.exec(read("src/styles/components.css"))?.[1] ?? "";
    expect(block).toMatch(/border:\s*0/);
    expect(block).toMatch(/border-radius:\s*0/);
    expect(block).toMatch(/padding:\s*0/);
    expect(block).toMatch(/background:\s*none/);
  });
  it("EvidenceLabel has no glyph disc", () => {
    expect(html(<EvidenceLabel level="published" />)).not.toContain("glyph");
  });
  it("direction counts are plain words without an interpunct", () => {
    expect(countsLine({ counts: { projects: 1, papers: 4, inProgress: 0 } })).toBe(
      "1 project, 4 papers",
    );
  });
});

describe("pearls and direction marks", () => {
  it("a pearl is one flat element with no numeral (RC-7)", () => {
    const out = html(<Pearl size="row" swatch="matcha" index={2} />);
    expect(out).toBe(
      '<span class="bl-pearl bl-pearl--row" data-swatch="matcha" aria-hidden="true"></span>',
    );
    expect(out).not.toMatch(/0\d/);
  });
  it("the person placeholder is a square initials tile", () => {
    expect(html(<Pearl size="avatar" initials="PS" />)).toContain("bl-pearl--initials");
  });
  it("pearl CSS has no gradient, gloss, rim or shadow", () => {
    const css = read("src/styles/components.css");
    expect(css).not.toMatch(/gradient\(/);
    expect(css).not.toMatch(/box-shadow/);
    expect(css).not.toMatch(/bl-pearl--gloss/);
  });
  it("PearlTag is a line segment plus the name", () => {
    const out = html(<PearlTag label="Learning on the Job" swatch="matcha" href="/research/x/" />);
    expect(out).toContain('<span class="bl-dot" data-swatch="matcha" aria-hidden="true"></span>');
    expect(out).toContain("Learning on the Job");
    const dot = /\.bl-dot\s*\{([^}]*)\}/.exec(read("src/styles/components.css"))?.[1] ?? "";
    expect(dot).toMatch(/width:\s*16px/);
    expect(dot).toMatch(/height:\s*2px/);
    expect(dot).not.toMatch(/border-radius/);
  });
});

describe("links: plain text, no arrows", () => {
  it("MaterialsRow is text links whose names include the paper title", () => {
    const out = html(
      <MaterialsRow
        title="Learning on the Go"
        items={[
          { kind: "pdf", href: "https://x.example/a.pdf" },
          { kind: "doi", href: "https://doi.org/10.1/x" },
        ]}
      />,
    );
    expect(out).not.toContain("<svg");
    expect(out).toContain('PDF<span class="vh"> of Learning on the Go</span>');
    expect(out).toContain('DOI<span class="vh"> link for Learning on the Go</span>');
  });
  it("arrow icons inside links are hidden by CSS", () => {
    expect(html(<Icon name="arrow-right" />)).toContain("bl-icon--arrow-right");
    expect(read("src/styles/components.css")).toMatch(
      /a \.bl-icon--arrow-right,\s*a \.bl-icon--external,\s*a \.bl-icon--chevron \{\s*display: none;/,
    );
  });
});

describe("publication row and status (D-13 item 7; copy sweep)", () => {
  const all = () => [...content().countedPublications, ...content().inProgress];
  it("statusLine is a plain label: no 'as of' date, no 'reported by the lab'", () => {
    const p = {
      status: "major-revision",
      status_note: "at M&SOM",
      as_of: "2026-04",
      status_source: "self-reported",
    } as const;
    expect(statusLine(p)).toBe("Major revision at M&SOM");
    // After an "arXiv preprint" venue the version-only status is left out.
    expect(
      statusLine({ status: "preprint", status_note: "v2", venue: "arXiv preprint" }),
    ).toBeNull();
  });
  it("no row on the site prints a date stamp or provenance hedge", () => {
    for (const p of all()) {
      const out = html(<PublicationEntry pub={p} />);
      expect(out, p.slug).not.toMatch(/as of |reported by the lab/i);
    }
  });
  it("a row has main and meta columns, the in_brief line, and no inline hedge", () => {
    const pub = all().find((p) => p.in_brief && p.status_source === "self-reported")!;
    const out = html(<PublicationEntry pub={pub} />);
    expect(out).toMatch(/^<article class="bl-pub"/);
    expect(out).toContain('<div class="bl-pub__main">');
    expect(out).toContain('<div class="bl-pub__meta">');
    expect(out).toContain('<p class="bl-pub__brief">');
    expect(out).not.toContain("reported by the lab");
    expect(html(<PublicationEntry pub={pub} showBrief={false} />)).not.toContain("bl-pub__brief");
  });
});

describe("brand marks (D-13 item 2)", () => {
  it("the wordmark is one-colour outlined SVG: six letter paths and the pearl", () => {
    const out = html(<Wordmark />);
    expect(out.match(/<path /g)).toHaveLength(6);
    expect(out.match(/<circle /g)).toHaveLength(1);
    expect(out).toContain('fill="currentColor"');
    expect(out).toContain('aria-label="BOBALAB"');
    expect(html(<Wordmark title="" />)).toContain('aria-hidden="true"');
  });
  it("the pearl mark is a flat disc; the shoulder mark is four pearls on a rule", () => {
    expect(html(<PearlMark />).match(/<circle /g)).toHaveLength(1);
    const sh = html(<ShoulderMark title="BOBALAB" />);
    expect(sh.match(/<circle /g)).toHaveLength(4);
    expect(sh.match(/<rect /g)).toHaveLength(1);
  });
  it("icon.svg is the shoulder-on-floor favicon with a dark-mode fill", () => {
    const svg = read("src/app/icon.svg");
    expect(svg.match(/<circle /g)).toHaveLength(SHOULDER.pearls.length);
    for (const [cx, cy] of SHOULDER.pearls) expect(svg).toContain(`cx="${cx}" cy="${cy}"`);
    expect(svg).toMatch(/prefers-color-scheme:dark/);
  });
});

describe("motion (D-13 item 6)", () => {
  const motion = read("src/styles/motion.css");
  it("the settle curve is the critically damped linear() from IDENTITY-RESEARCH §5", () => {
    expect(motion).toMatch(/--ease-settle: linear\(\s*0,\s*0\.18,\s*0\.455,/);
    expect(motion).toMatch(
      /::view-transition-group\(\.pearl-morph\)\s*\{[^}]*var\(--ease-settle\)/,
    );
  });
  it("no idle float, buoyancy, stir, blur or infinite animation remains", () => {
    for (const css of [motion, read("src/styles/components.css"), read("src/styles/base.css")]) {
      expect(css).not.toMatch(/infinite/);
      expect(css).not.toMatch(/--float-|--lean-max|bl-via-blur|blur\(/);
    }
  });
  it("reduced motion zeroes transitions under both gates", () => {
    expect(motion).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition-duration: 0ms !important/,
    );
    expect(motion).toMatch(/:root\[data-motion="reduce"\] \*,[\s\S]*transition-duration: 0ms/);
  });
});

describe("study-design plates: plate_verified (D-13 item 8)", () => {
  const base = {
    title: "T",
    authors: [{ name: "A" }],
    type: "journal",
    status: "published",
  };
  it("defaults to false and accepts booleans only", () => {
    expect(publicationSchema.parse(base).plate_verified).toBe(false);
    expect(publicationSchema.parse({ ...base, plate_verified: true }).plate_verified).toBe(true);
    expect(publicationSchema.safeParse({ ...base, plate_verified: "yes" }).success).toBe(false);
  });
  it("a plate shows when verified, or in preview builds", () => {
    expect(showStudyPlate({ plate_verified: false }, false)).toBe(false);
    expect(showStudyPlate({ plate_verified: true }, false)).toBe(true);
    expect(showStudyPlate({ plate_verified: false }, true)).toBe(true);
  });
  it("the CMS offers the field with the agreed label", () => {
    const yml = read("public/admin/config.yml");
    expect(yml).toContain(
      "- label: Study-design figure checked by the authors\n        name: plate_verified\n        widget: boolean",
    );
  });
});
