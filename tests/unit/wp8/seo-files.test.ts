/**
 * WP8: sitemap.xml and robots.txt rules (brief §G3, WP8 acceptance #3).
 *
 * The expected URL set is derived independently of the loader: straight from
 * the front matter of each content set (draft flags, people's listed /
 * profile_page / role). The sitemap must equal that set in production AND in
 * preview mode (preview builds include drafts, the sitemap never does), and it
 * must never contain /admin/, /kit/, the `_none` placeholder, unlisted people
 * or people without a profile page.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import YAML from "yaml";
import { clearContentCache } from "@/lib/content/load";
// Next's own serialisers for metadata routes (what `next build` writes to out/).
import { resolveRouteData } from "next/dist/build/webpack/loaders/metadata/resolve-route-data.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const FIX = path.join(ROOT, "tests", "fixtures", "content");
const SETS = ["n0", "n1", "n4", "consent-edge-cases", "long-labels"].map((s) => path.join(FIX, s));
if (fs.existsSync(path.join(ROOT, "content", "site.yml"))) SETS.push(path.join(ROOT, "content"));

const ENV_KEYS = [
  "CONTENT_DIR",
  "INCLUDE_DRAFTS",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_BASE_PATH",
  "BUILD_DATE",
] as const;
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
const setEnv = (vars: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) => {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
};

beforeEach(() => {
  setEnv({ BUILD_DATE: "2026-10-20T12:00:00-07:00", NEXT_PUBLIC_SITE_URL: undefined });
  setEnv({ NEXT_PUBLIC_BASE_PATH: undefined });
  clearContentCache();
});
afterEach(() => clearContentCache());
afterAll(() => setEnv(saved));

const FM = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---/;
type Front = Record<string, unknown>;
function frontMatter(dir: string, collection: string): Array<{ slug: string; data: Front }> {
  const folder = path.join(dir, collection);
  if (!fs.existsSync(folder)) return [];
  return fs
    .readdirSync(folder)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const m = FM.exec(fs.readFileSync(path.join(folder, f), "utf8"));
      return { slug: f.replace(/\.md$/, ""), data: (m ? YAML.parse(m[1]!) : {}) ?? {} };
    });
}

const SECTION = [
  "/",
  "/research/",
  "/projects/",
  "/publications/",
  // No "/people/": the People list is the home page's #people section, and the old
  // address is a redirect stub (site.yml redirects, D-21).
  "/news/",
  "/join/",
  "/about/",
  "/accessibility/",
  "/privacy/",
];

/** Independent oracle: the paths that must be in the sitemap for a content set. */
function expectedPaths(dir: string): { include: Set<string>; exclude: Set<string> } {
  const include = new Set(SECTION);
  const exclude = new Set<string>();
  const route: Record<string, string> = {
    directions: "/research/",
    projects: "/projects/",
    publications: "/publications/",
    news: "/news/",
    people: "/people/",
  };
  for (const [collection, base] of Object.entries(route)) {
    for (const { slug, data } of frontMatter(dir, collection)) {
      const isPublic =
        data.draft !== true &&
        (collection !== "people" ||
          (data.listed === true && (data.role === "pi" || data.profile_page === true)));
      (isPublic ? include : exclude).add(`${base}${slug}/`);
    }
  }
  return { include, exclude };
}

async function loadRoutes() {
  vi.resetModules();
  const sitemap = (await import("@/app/sitemap")).default;
  const robots = (await import("@/app/robots")).default;
  return { sitemap, robots };
}

describe.each(SETS)("sitemap for %s", (dir) => {
  const site = YAML.parse(fs.readFileSync(path.join(dir, "site.yml"), "utf8")) ?? {};
  const origin = String(site.site_url ?? "https://bobalabx.github.io").replace(/\/+$/, "");

  it.each([
    ["production", "0"],
    ["preview", "1"],
  ])("%s: lists exactly the public pages", async (_mode, drafts) => {
    setEnv({ CONTENT_DIR: dir, INCLUDE_DRAFTS: drafts });
    const { sitemap } = await loadRoutes();
    const urls = sitemap().map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) {
      expect(u.startsWith(`${origin}/`), u).toBe(true);
      expect(u.endsWith("/"), `${u} needs a trailing slash`).toBe(true);
      expect(u).not.toMatch(/\/(admin|kit|editor-preview)\//);
      expect(u).not.toContain("_none");
    }
    const paths = new Set(urls.map((u) => u.slice(origin.length)));
    const { include, exclude } = expectedPaths(dir);
    expect([...paths].sort()).toEqual([...include].sort());
    for (const p of exclude) expect(paths.has(p), `${p} must not be listed`).toBe(false);
  });
});

describe("sitemap details", () => {
  it("news items carry their date as lastmod; Next serialises valid XML", async () => {
    setEnv({ CONTENT_DIR: path.join(FIX, "consent-edge-cases"), INCLUDE_DRAFTS: "0" });
    const { sitemap } = await loadRoutes();
    const entries = sitemap();
    const news = entries.find((e) => e.url.endsWith("/news/2026-05-11-fixture-paper-accepted/"));
    expect(news?.lastModified).toBe("2026-05-11");
    const xml = resolveRouteData(entries, "sitemap");
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain("<loc>https://example.invalid/people/avery-example/</loc>");
    expect(xml).not.toContain("emery-hidden");
    expect(xml).not.toContain("indigo-draft");
    expect(xml).not.toContain("devon-placeholder");
  });

  it("n0 (only draft directions, launched: false) has no direction pages and no placeholder", async () => {
    setEnv({ CONTENT_DIR: path.join(FIX, "n0"), INCLUDE_DRAFTS: "0" });
    const { sitemap } = await loadRoutes();
    const urls = sitemap().map((e) => e.url);
    expect(urls.filter((u) => /\/research\/[^/]+\/$/.test(u))).toEqual([]);
    expect(urls.some((u) => u.includes("/publications/example-"))).toBe(false);
  });

  it("honours NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_BASE_PATH", async () => {
    setEnv({
      CONTENT_DIR: path.join(FIX, "n4"),
      INCLUDE_DRAFTS: "0",
      NEXT_PUBLIC_SITE_URL: "https://bobalab.haas.berkeley.edu/",
      NEXT_PUBLIC_BASE_PATH: "/website",
    });
    const { sitemap, robots } = await loadRoutes();
    const urls = sitemap().map((e) => e.url);
    expect(urls[0]).toBe("https://bobalab.haas.berkeley.edu/website/");
    expect(urls.every((u) => u.startsWith("https://bobalab.haas.berkeley.edu/website/"))).toBe(
      true,
    );
    const txt = resolveRouteData(robots(), "robots");
    expect(txt).toContain("Disallow: /website/admin/");
    expect(txt).toContain("Disallow: /website/editor-preview/");
    expect(txt).toContain("Sitemap: https://bobalab.haas.berkeley.edu/website/sitemap.xml");
  });
});

describe("robots.txt", () => {
  it("production: allows the site, disallows /admin/ and /editor-preview/, points to the sitemap", async () => {
    setEnv({ CONTENT_DIR: path.join(FIX, "n4"), INCLUDE_DRAFTS: "0" });
    const { robots } = await loadRoutes();
    const txt = resolveRouteData(robots(), "robots");
    expect(txt).toContain("User-Agent: *");
    expect(txt).toContain("Allow: /\n");
    expect(txt).toContain("Disallow: /admin/");
    // The editor's live preview page (WP2): noindex itself, never in the sitemap.
    expect(txt).toMatch(/^Disallow: \/editor-preview\/$/m);
    expect(txt).not.toMatch(/^Disallow: \/$/m);
    expect(txt).toContain("Sitemap: https://example.invalid/sitemap.xml");
  });

  it("preview builds disallow everything (they are never deployed)", async () => {
    setEnv({ CONTENT_DIR: path.join(FIX, "n4"), INCLUDE_DRAFTS: "1" });
    const { robots } = await loadRoutes();
    const txt = resolveRouteData(robots(), "robots");
    expect(txt).toMatch(/^Disallow: \/$/m);
    expect(txt).toContain("Disallow: /admin/");
    expect(txt).toContain("Disallow: /editor-preview/");
  });
});
