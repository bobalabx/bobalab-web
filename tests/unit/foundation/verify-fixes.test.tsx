/**
 * Shared-foundation fixes from the verification phase (one block per finding id).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DraftBadge } from "@/components/ui/Badge";
import { organizationLd } from "@/lib/seo/jsonld";
import { ROLE_LABELS } from "@/lib/content/people";
import { urlField } from "@/lib/content/schema";
import { EMPTY_PARAM as QUERIES_EMPTY_PARAM } from "@/lib/content/queries";
import { DEFAULT_SITE } from "@/lib/content/load";
import { EMPTY_PARAM, hoistCspInHtml, pruneExport } from "../../../scripts/build.mjs";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const css = (f: string) => fs.readFileSync(path.join(ROOT, "src/styles", f), "utf8");

describe("VIS-01: the travelling pearl paints above the page-swap groups", () => {
  it("lifts ::view-transition-group(.pearl-morph) above page groups and below the header", () => {
    const motion = css("motion.css");
    const pearl = /::view-transition-group\(\.pearl-morph\)\s*\{([^}]*)\}/.exec(motion)?.[1] ?? "";
    const header = /::view-transition-group\(site-header\)\s*\{([^}]*)\}/.exec(motion)?.[1] ?? "";
    const z = (block: string) => Number(/z-index:\s*(\d+)/.exec(block)?.[1] ?? NaN);
    expect(z(pearl)).toBeGreaterThan(0);
    expect(z(header)).toBeGreaterThan(z(pearl));
  });
});

describe("VIS-15 / A11Y-05: draft badges", () => {
  it("DraftBadge `line` sets the badge on its own spaced line", () => {
    expect(renderToStaticMarkup(<DraftBadge line />)).toBe(
      '<span class="bl-draft-line"><span class="bl-badge bl-badge--draft">Draft · pending lab review</span></span>',
    );
    expect(renderToStaticMarkup(<DraftBadge />)).toMatch(
      /^<span class="bl-badge bl-badge--draft">/,
    );
    expect(renderToStaticMarkup(<DraftBadge show={false} line />)).toBe("");
  });
  it("badges may wrap (no nowrap) so they never push a narrow page sideways", () => {
    const block = /\.bl-badge\s*\{([^}]*)\}/.exec(css("components.css"))?.[1] ?? "";
    expect(block).not.toMatch(/white-space:\s*nowrap/);
    expect(block).toMatch(/max-width:\s*100%/);
    expect(css("components.css")).toMatch(/\.bl-draft-line\s*\{[^}]*margin-top:\s*var\(--s-2\)/);
  });
});

describe("CON-05: no unsourced lab title for the PI", () => {
  it("labels the PI role 'Principal investigator'", () => {
    expect(ROLE_LABELS.pi).toEqual({
      one: "Principal investigator",
      group: "Principal investigator",
    });
  });
});

describe("CON-06: no claim that BOBALAB is an official Haas unit", () => {
  it("organizationLd has no parentOrganization", () => {
    const ld = organizationLd(DEFAULT_SITE) as unknown as Record<string, unknown>;
    expect(ld["@type"]).toBe("ResearchOrganization");
    expect(ld).not.toHaveProperty("parentOrganization");
    expect(JSON.stringify(ld)).not.toMatch(/EducationalOrganization|CollegeOrUniversity/);
  });
});

describe("ENG-06: urlField rejects protocol-relative URLs", () => {
  it.each(["/uploads/a.pdf", "/research/", "https://example.org/x"])("accepts %s", (v) => {
    expect(urlField.safeParse(v).success).toBe(true);
  });
  it.each(["//evil.example/x", "/\\evil.example/x", "///x"])("rejects %s", (v) => {
    expect(urlField.safeParse(v).success).toBe(false);
  });
});

describe("ENG-03: the export drops not-found shells", () => {
  const make = () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "bl-prune-"));
    const put = (rel: string) => {
      fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
      fs.writeFileSync(path.join(out, rel), "x");
    };
    for (const rel of [
      "index.html",
      "kit/index.html",
      "kit/__next._tree.txt",
      "research/index.html",
      "research/_none/index.html",
      "research/_none/__next._full.txt",
      "news/_none/index.txt",
      "_next/static/_none/keep.js",
      "people/park-sinchaisri/index.html",
    ])
      put(rel);
    return out;
  };
  it("keeps EMPTY_PARAM in sync with src/lib/content/queries.ts", () => {
    expect(EMPTY_PARAM).toBe(QUERIES_EMPTY_PARAM);
  });
  it("removes out/kit/ and every _none folder, never _next or real pages", () => {
    const out = make();
    expect(pruneExport(out).sort()).toEqual(["kit/", "news/_none/", "research/_none/"]);
    expect(fs.existsSync(path.join(out, "kit"))).toBe(false);
    expect(fs.existsSync(path.join(out, "research/_none"))).toBe(false);
    expect(fs.existsSync(path.join(out, "research/index.html"))).toBe(true);
    expect(fs.existsSync(path.join(out, "people/park-sinchaisri/index.html"))).toBe(true);
    expect(fs.existsSync(path.join(out, "_next/static/_none/keep.js"))).toBe(true);
    fs.rmSync(out, { recursive: true, force: true });
  });
  it("keeps the kit when NEXT_PUBLIC_KIT=1", () => {
    const out = make();
    expect(pruneExport(out, { kit: true })).not.toContain("kit/");
    expect(fs.existsSync(path.join(out, "kit/index.html"))).toBe(true);
    fs.rmSync(out, { recursive: true, force: true });
  });
});

describe("ENG-05: the CSP <meta> comes before every hoisted resource", () => {
  const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src &#x27;self&#x27;"/>`;
  const page = `<!DOCTYPE html><html><head><meta charSet="utf-8"/><meta name="viewport" content="x"/><link rel="stylesheet" href="/a.css"/><script src="/a.js" async=""></script>${CSP}<meta name="theme-color" content="#fff"/></head><body></body></html>`;
  it("moves it to directly after <meta charSet>", () => {
    const out = hoistCspInHtml(page);
    expect(
      out.startsWith(
        `<!DOCTYPE html><html><head><meta charSet="utf-8"/>${CSP}<meta name="viewport"`,
      ),
    ).toBe(true);
    expect(out.split("Content-Security-Policy")).toHaveLength(2);
    expect(out.length).toBe(page.length);
  });
  it("is idempotent and leaves pages without a CSP or charset alone", () => {
    const once = hoistCspInHtml(page);
    expect(hoistCspInHtml(once)).toBe(once);
    const noCsp = page.replace(CSP, "");
    expect(hoistCspInHtml(noCsp)).toBe(noCsp);
    const noCharset = page.replace('<meta charSet="utf-8"/>', "");
    expect(hoistCspInHtml(noCharset)).toBe(noCharset);
  });
});
