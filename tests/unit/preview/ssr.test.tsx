/**
 * WP2 (spec §2.1, §2.7): the preview page never leaks into the public site.
 *   - Importing the EditorPreview module turns no entry marks on (it enables
 *     them in a mount effect, never at module top), so a server render of a
 *     marked component afterwards has no data-entry, even if `window` exists.
 *   - The page's prerender is the shell only: the loading note and the hidden
 *     standalone notice, no view, no mark, no content.
 *   - Its metadata is noindex, nofollow.
 */
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => {
    // next/link's own props are not HTML attributes.
    const attrs: Record<string, unknown> = { ...rest };
    delete attrs.transitionTypes;
    delete attrs.prefetch;
    return (
      <a href={href} {...attrs}>
        {children}
      </a>
    );
  },
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/editor-preview/",
  useSearchParams: () => new URLSearchParams(),
}));

const g = globalThis as { window?: unknown };
const CONTENT = path.resolve(__dirname, "../../../content");

beforeEach(() => {
  vi.resetModules();
  delete g.window;
});
afterEach(() => {
  delete g.window;
});

async function load() {
  const page = await import("@/app/editor-preview/page");
  const mark = await import("@/lib/preview/mark");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { buildContent } = await import("@/lib/content/build");
  const { loadRawContent } = await import("@/lib/content/load");
  const { HomeView } = await import("@/components/views/HomeView");
  const { NewsListView } = await import("@/components/views/NewsListView");
  const { PeopleIndex } = await import("@/components/people/PeopleIndex");
  const c = buildContent(loadRawContent(CONTENT), { preview: false, today: "2026-10-26" });
  return { page, mark, renderToStaticMarkup, c, HomeView, NewsListView, PeopleIndex };
}

describe("/editor-preview/ on the server", () => {
  it("importing it turns no marks on: a marked server render has no data-entry", async () => {
    const l = await load();
    const html = [
      l.renderToStaticMarkup(<l.HomeView c={l.c} />),
      l.renderToStaticMarkup(<l.NewsListView c={l.c} />),
      l.renderToStaticMarkup(<l.PeopleIndex content={l.c} />),
    ].join("");
    expect(html.length).toBeGreaterThan(1000);
    expect(html).not.toContain("data-entry");
    // Not even with a window: enabling happens only in the page's mount effect.
    g.window = {};
    expect(l.mark.entryMark("news", "x")).toEqual({});
    expect(l.renderToStaticMarkup(<l.NewsListView c={l.c} />)).not.toContain("data-entry");
  });

  it("prerenders only the shell", async () => {
    const l = await load();
    const html = l.renderToStaticMarkup(<l.page.default />);
    expect(html).toContain('<div class="ep-root">');
    expect(html).toContain("Loading the site…");
    expect(html).toMatch(
      /<p class="ep-standalone" hidden="">This page shows the content manager’s live preview\. Open it from the content manager\.<\/p>/,
    );
    expect(html).not.toMatch(/data-entry|<h1|<footer|ep-page/);
    for (const p of l.c.people) expect(html).not.toContain(p.name);
    expect(html.length).toBeLessThan(1000);
  });

  it("is noindex, nofollow, titled “Preview”", async () => {
    const { metadata } = await import("@/app/editor-preview/page");
    expect(metadata).toEqual({ title: "Preview", robots: { index: false, follow: false } });
  });

  it("switches zod to jitless in the browser only (no CSP-reported `new Function` probe)", async () => {
    const { z } = await import("zod");
    try {
      await import("@/app/editor-preview/page");
      expect(z.config().jitless).toBeFalsy(); // the server prerender keeps zod as it is
      vi.resetModules();
      g.window = {};
      await import("@/app/editor-preview/zod-jitless");
      expect(z.config().jitless).toBe(true);
    } finally {
      z.config({ jitless: false });
    }
  });
});

describe("/editor-preview/ module order", () => {
  it("imports the zod switch before anything that builds a schema", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../../src/app/editor-preview/EditorPreview.tsx"),
      "utf8",
    );
    const imports = [...src.matchAll(/^import\s[^;]*?["']([^"']+)["'];/gms)].map((m) => m[1]);
    expect(imports[0]).toBe("./zod-jitless");
  });
});
