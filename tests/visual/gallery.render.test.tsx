/**
 * Writes one static HTML page per fixture set for the Fig. 1 gallery
 * (brief §E10.1; screenshots and the overlap check are in gallery.visual.ts).
 *
 * Each page is the real home page (src/app/page.tsx) rendered to static markup
 * with the site CSS and the real self-hosted fonts (inlined as data: URIs), so
 * the figure sits in the same hero columns as on the site at 1366 and 1024 px.
 * Extra pages:
 *   - home-production / home-preview: the real content/ folder with drafts
 *     excluded / included (production = the state a `npm run build` ships);
 *   - n4-dotplot: figure_mode "dotplot" (C10);
 *   - n7-long-labels / n8-long-labels: the narrowest templates with 28-character
 *     labels, which must wrap to two lines without touching another pearl.
 * No JS runs on these pages (it also stands in for the no-JS rendering).
 */
import fs from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, it } from "vitest";
import { buildContent, clearContentCache, loadRawContent } from "@/lib/content/load";
import { buildFigureModel } from "@/lib/figure/buildFigure";
import { PearlFigure } from "@/components/figure/PearlFigure";
import { HomeHero } from "@/components/home/HomeHero";
import HomePage from "@/app/page";

const ROOT = process.cwd();
const FIX = path.join(ROOT, "tests/fixtures/content");
const OUT = path.join(ROOT, "test-results/WP1/gallery");
const TODAY = "2026-10-20";
const CSS = [
  "src/styles/tokens.css",
  "src/styles/base.css",
  "src/styles/components.css",
  "src/styles/motion.css",
  "src/styles/forced-colors.css",
  "src/components/figure/figure.css",
  "src/components/home/home.css",
];
const FONTS: Array<[family: string, file: string, weight: string, cssVar: string]> = [
  ["BL Fraunces", "fraunces-latin-wght-normal.woff2", "100 900", "--font-fraunces"],
  ["BL Inter", "inter-latin-wght-normal.woff2", "100 900", "--font-inter"],
  ["BL Plex Mono", "ibm-plex-mono-latin-500-normal.woff2", "500", "--font-plex-mono"],
];

export const GALLERY_SETS = [
  "n0",
  "n1",
  "n2",
  "n3",
  "n4",
  "n6",
  "n7",
  "n8",
  "long-labels",
  "seeds-0-1-7-12-24",
] as const;

/** 28 characters each (the CMS maximum, brief §F3). */
const LONG_LABELS = [
  "Algorithms and Human Choices",
  "Experimentation & Inference!",
  "Microentrepreneurship in Ops",
  "Human–AI Decisions at Work 2",
  "Platform Labor and Its Rules",
  "Learning on the Job, Quickly",
  "Behavioral Pricing and Trust",
  "Cities, Mobility & Logistics",
];

const env = process.env;
const saved = {
  CONTENT_DIR: env.CONTENT_DIR,
  INCLUDE_DRAFTS: env.INCLUDE_DRAFTS,
  BUILD_DATE: env.BUILD_DATE,
};
afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  clearContentCache();
});

function fontCss(): string {
  const faces = FONTS.map(([family, file, weight]) => {
    const b64 = fs.readFileSync(path.join(ROOT, "src/fonts", file)).toString("base64");
    return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:${weight};font-style:normal;font-display:block}`;
  });
  const vars = FONTS.map(([family, , , v]) => `${v}:"${family}"`).join(";");
  return `${faces.join("\n")}\n:root{${vars}}`;
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><link rel="stylesheet" href="style.css"></head><body><main id="main" tabindex="-1">${body}</main></body></html>`;
}

/** The real home page for a content folder (env-driven, like `next dev`/`next build`). */
function renderHome(dir: string, preview: boolean): string {
  env.CONTENT_DIR = dir;
  env.INCLUDE_DRAFTS = preview ? "1" : "0";
  env.BUILD_DATE = `${TODAY}T12:00:00-07:00`; // noon in Berkeley, so "today" is TODAY
  clearContentCache();
  return renderToStaticMarkup(HomePage() as ReactElement);
}

/** Just the hero, with a hand-modified figure model (dot plot, long labels). */
function renderHero(set: string, edit: (m: ReturnType<typeof buildFigureModel>) => void): string {
  const c = buildContent(loadRawContent(path.join(FIX, set)), { preview: false, today: TODAY });
  const model = buildFigureModel({
    directions: c.directions,
    countedPublications: c.countedPublications,
    figureMode: c.site.figure_mode,
    today: c.today,
  });
  edit(model);
  return renderToStaticMarkup(
    <div className="hm">
      <HomeHero
        labName={c.site.name}
        longName={c.site.long_name}
        affiliation={c.site.affiliation_text}
        mission={c.pages.home?.mission}
        figure={<PearlFigure model={model} labName={c.site.name} />}
      />
    </div>,
  );
}

it("renders the fixture gallery", () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".html")) fs.rmSync(path.join(OUT, f));
  const css = CSS.map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
  fs.writeFileSync(path.join(OUT, "style.css"), `${fontCss()}\n${css}`);

  for (const set of GALLERY_SETS) {
    const html = renderHome(path.join(FIX, set), false);
    fs.writeFileSync(path.join(OUT, `${set}.html`), page(`Fig. 1 ${set}`, html));
  }
  fs.writeFileSync(
    path.join(OUT, "home-production.html"),
    page("Home, production content", renderHome(path.join(ROOT, "content"), false)),
  );
  fs.writeFileSync(
    path.join(OUT, "home-preview.html"),
    page("Home, preview content", renderHome(path.join(ROOT, "content"), true)),
  );
  fs.writeFileSync(
    path.join(OUT, "n4-dotplot.html"),
    page(
      "Fig. 1 n4 dot plot",
      renderHero("n4", (m) => {
        m.mode = "dotplot";
      }),
    ),
  );
  for (const set of ["n7", "n8"]) {
    fs.writeFileSync(
      path.join(OUT, `${set}-long-labels.html`),
      page(
        `Fig. 1 ${set} long labels`,
        renderHero(set, (m) => {
          m.items.forEach((it, i) => (it.label = LONG_LABELS[i] ?? it.label));
        }),
      ),
    );
  }
});
