/**
 * WP1 (editor v2, spec §2.7): entry marks (src/lib/preview/mark.ts) never reach
 * the public site. entryMark() gives {"data-entry": "<collection>/<slug>"} only
 * when enableEntryMarks() has run AND `window` exists (the preview's browser
 * render); a server render never marks, even after enabling, because Next's
 * server shares module state between pages. In the browser, the root element of
 * every entry in a list, card, row or pearl carries its mark.
 * Each test loads fresh modules (the enabled flag is module state).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    transitionTypes,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    transitionTypes?: string[];
  }) => (
    <a href={href} data-transition={transitionTypes?.join(" ")} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const FIX = fileURLToPath(new URL("../../fixtures/content/", import.meta.url));
const REAL = fileURLToPath(new URL("../../../content/", import.meta.url));
const g = globalThis as { window?: unknown };

beforeEach(() => {
  vi.resetModules();
  delete g.window;
});
afterEach(() => {
  delete g.window;
});

/** Fresh modules: the mark flag, the views and React's server renderer, all from one graph. */
async function load() {
  const mark = await import("@/lib/preview/mark");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { buildContent } = await import("@/lib/content/build");
  const { loadRawContent } = await import("@/lib/content/load");
  const v = {
    ...(await import("@/components/views/HomeView")),
    ...(await import("@/components/views/ResearchView")),
    ...(await import("@/components/views/ProjectsView")),
    ...(await import("@/components/views/PublicationsView")),
    ...(await import("@/components/views/NewsListView")),
    ...(await import("@/components/views/JoinView")),
    ...(await import("@/components/views/AboutView")),
  };
  return { mark, renderToStaticMarkup, buildContent, loadRawContent, v };
}

type Loaded = Awaited<ReturnType<typeof load>>;
function renderAll(l: Loaded, dir: string, preview: boolean): Record<string, string> {
  const c = l.buildContent(l.loadRawContent(dir), { preview, today: "2026-10-20" });
  const { v } = l;
  const r = l.renderToStaticMarkup;
  return {
    home: r(<v.HomeView c={c} />),
    research: r(<v.ResearchView c={c} />),
    projects: r(<v.ProjectsView c={c} />),
    publications: r(<v.PublicationsView c={c} />),
    news: r(<v.NewsListView c={c} />),
    join: r(<v.JoinView c={c} />),
    about: r(<v.AboutView c={c} />),
  };
}
const marksIn = (html: string) => [...html.matchAll(/data-entry="([^"]+)"/g)].map((m) => m[1]!);

describe("entry marks", () => {
  it("are off by default, even in a browser", async () => {
    g.window = {};
    const { entryMark } = await import("@/lib/preview/mark");
    expect(entryMark("news", "2026-01-01-x")).toEqual({});
  });

  it("are on only after enableEntryMarks() AND with window defined", async () => {
    const { entryMark, enableEntryMarks } = await import("@/lib/preview/mark");
    enableEntryMarks();
    expect(entryMark("people", "isabelle-cho")).toEqual({}); // server: no window
    g.window = {};
    expect(entryMark("people", "isabelle-cho")).toEqual({ "data-entry": "people/isabelle-cho" });
    expect(entryMark("opportunities", "urap")).toEqual({ "data-entry": "opportunities/urap" });
  });

  it("a server render after enabling, with no window, has no data-entry (fixture and real content)", async () => {
    const l = await load();
    l.mark.enableEntryMarks();
    const dirs = [path.join(FIX, "n4"), path.join(FIX, "consent-edge-cases")];
    if (fs.existsSync(REAL)) dirs.push(REAL);
    for (const dir of dirs)
      for (const preview of [false, true])
        for (const [page, html] of Object.entries(renderAll(l, dir, preview)))
          expect(html.includes("data-entry"), `${dir} ${page}`).toBe(false);
  });

  it("in the preview's browser render, every entry on the list pages carries its mark", async () => {
    const l = await load();
    l.mark.enableEntryMarks();
    g.window = {};
    const dir = path.join(FIX, "n4");
    const c = l.buildContent(l.loadRawContent(dir), { preview: false, today: "2026-10-20" });
    const html = renderAll(l, dir, false);
    const set = (page: string, collection: string) =>
      new Set(
        marksIn(html[page]!)
          .filter((m) => m.startsWith(`${collection}/`))
          .map((m) => m.slice(collection.length + 1)),
      );
    const slugs = (xs: Array<{ slug: string }>) => new Set(xs.map((x) => x.slug));

    expect(set("research", "directions")).toEqual(
      slugs([...c.directions, ...c.archivedDirections]),
    );
    expect(set("home", "directions")).toEqual(slugs(c.directions)); // the pearls
    expect(set("home", "news").size).toBeGreaterThan(0);
    expect(set("home", "publications").size).toBeGreaterThan(0);
    expect(set("projects", "projects")).toEqual(slugs(c.projects));
    expect(set("publications", "publications")).toEqual(slugs(c.publications));
    expect(set("news", "news")).toEqual(slugs(c.news));
    expect(set("join", "opportunities")).toEqual(slugs(c.opportunities));
    // The People list is the home page's last section (2026-10-29): everyone listed, alumni too.
    expect(set("home", "people")).toEqual(slugs(c.people));
    // Every mark names a real entry of its collection.
    for (const m of Object.values(html).flatMap(marksIn))
      expect(m, m).toMatch(
        /^(news|publications|people|directions|projects|opportunities)\/[a-z0-9-]+$/,
      );
  });
});
