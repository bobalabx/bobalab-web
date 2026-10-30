/**
 * WP2 (spec §2.5): page ids ↔ site paths for the editor preview, with and
 * without a base path, and the content file of an entry.
 */
import { describe, expect, it } from "vitest";
import {
  PREVIEW_PAGES,
  SLUG_PAGES,
  fileOf,
  isOwnPage,
  pathOf,
  sameTarget,
  targetFromPath,
} from "@/lib/preview/targets";
import type { PreviewTarget } from "@/lib/preview/protocol";

const TABLE: Array<[PreviewTarget, string]> = [
  [{ page: "home" }, "/"],
  [{ page: "research" }, "/research/"],
  [{ page: "direction", slug: "ai-at-work" }, "/research/ai-at-work/"],
  [{ page: "projects" }, "/projects/"],
  [{ page: "project", slug: "tips" }, "/projects/tips/"],
  [{ page: "publications" }, "/publications/"],
  [{ page: "publication", slug: "lee-2025-x" }, "/publications/lee-2025-x/"],
  [{ page: "person", slug: "isabelle-cho" }, "/people/isabelle-cho/"],
  [{ page: "news" }, "/news/"],
  [{ page: "news-item", slug: "2026-10-26-x" }, "/news/2026-10-26-x/"],
  [{ page: "join" }, "/join/"],
  [{ page: "about" }, "/about/"],
  [{ page: "accessibility" }, "/accessibility/"],
  [{ page: "privacy" }, "/privacy/"],
];

describe("targets", () => {
  it("covers all 15 pages", () => {
    // "people" is the home page's People section (below), not a page address of its own.
    expect([...TABLE.map(([t]) => t.page), "people"].sort()).toEqual([...PREVIEW_PAGES].sort());
    expect([...SLUG_PAGES].sort()).toEqual(
      ["direction", "news-item", "person", "project", "publication"].sort(),
    );
  });

  it.each(TABLE)("%o ↔ %s (round trip, with and without a base path)", (target, path) => {
    expect(pathOf(target)).toBe(path);
    expect(targetFromPath(path)).toEqual(target);
    expect(targetFromPath(`/bobalab-web${path}`, "/bobalab-web")).toEqual(target);
    expect(targetFromPath(`/bobalab-web${path}`, "/bobalab-web/")).toEqual(target);
    expect(targetFromPath(`${path}?q=1#top`)).toEqual(target);
  });

  it("people: the home page's People section; the old /people/ address still opens it (D-21)", () => {
    expect(pathOf({ page: "people" })).toBe("/#people");
    expect(targetFromPath("/people/")).toEqual({ page: "people" });
    expect(targetFromPath("/bobalab-web/people/", "/bobalab-web")).toEqual({ page: "people" });
  });

  it("accepts a path without its trailing slash and decodes it", () => {
    expect(targetFromPath("/research")).toEqual({ page: "research" });
    expect(targetFromPath("/people/isabelle-cho")).toEqual({
      page: "person",
      slug: "isabelle-cho",
    });
    expect(targetFromPath("/bobalab-web", "/bobalab-web")).toEqual({ page: "home" });
    expect(targetFromPath("/news/caf%C3%A9/")).toEqual({ page: "news-item", slug: "café" });
  });

  it("is null for files, other sections and paths outside the base path", () => {
    for (const p of [
      "/news/feed.xml",
      "/uploads/cv.pdf",
      "/admin/",
      "/editor-preview/",
      "/kit/",
      "/join/x/",
      "/about/team/",
      "/research/a/b/",
      "relative/path/",
      "/news/%E0%A4%A/",
    ])
      expect(targetFromPath(p), p).toBeNull();
    expect(targetFromPath("/research/", "/bobalab-web")).toBeNull();
    expect(targetFromPath("/other/research/", "/bobalab-web")).toBeNull();
  });

  it("names an entry's content file", () => {
    expect(fileOf({ collection: "news", slug: "2026-10-26-x" })).toBe("news/2026-10-26-x.md");
    expect(fileOf({ collection: "opportunities", slug: "ra" })).toBe("opportunities/ra.md");
    expect(fileOf({ collection: "pages", slug: "home" })).toBe("pages/home.yml");
    expect(fileOf({ collection: "settings", slug: "site" })).toBe("site.yml");
  });

  it("knows an entry's own page", () => {
    const news = { collection: "news", slug: "x" } as const;
    expect(isOwnPage(news, { page: "news-item", slug: "x" })).toBe(true);
    expect(isOwnPage(news, { page: "news-item", slug: "y" })).toBe(false);
    expect(isOwnPage(news, { page: "news" })).toBe(false);
    expect(isOwnPage({ collection: "people", slug: "a-b" }, { page: "person", slug: "a-b" })).toBe(
      true,
    );
    expect(isOwnPage({ collection: "opportunities", slug: "ra" }, { page: "join" })).toBe(false);
    expect(isOwnPage({ collection: "pages", slug: "home" }, { page: "about" })).toBe(true);
    expect(isOwnPage({ collection: "pages", slug: "join" }, { page: "home" })).toBe(false);
    expect(isOwnPage({ collection: "settings", slug: "site" }, { page: "people" })).toBe(true);
    expect(sameTarget({ page: "home" }, { page: "home", slug: "" })).toBe(true);
    expect(sameTarget({ page: "person", slug: "a" }, { page: "person", slug: "b" })).toBe(false);
    expect(sameTarget(null, { page: "home" })).toBe(false);
  });
});
