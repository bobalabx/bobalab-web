/**
 * Writes one static HTML page per fixture set for the Fig. 1 "Lines" gallery
 * (screenshots and layout checks are in gallery.visual.ts), plus, since D-14,
 * one page per set with the real home page and its boba cup (`cup-<set>.html`,
 * 0–8 live directions; `cup-n5.html` is built from n6's first five).
 *
 * Each page is the real home page (src/app/page.tsx) rendered to static markup
 * with the site CSS and the real self-hosted Archivo (inlined as a data: URI), so
 * the figure sits in the real label-column grid at every width. No JS runs on
 * these pages, which also stands in for the no-JS rendering (the figure draws
 * without a script). Extra pages:
 *   - home-production / home-preview: the real content/ folder with drafts
 *     excluded / included;
 *   - n7-long-labels / n8-long-labels: 28-character labels (the CMS maximum),
 *     which wrap to two lines; lanes grow and links still join the dots;
 *   - growth-2x / growth-4x / growth-8x: the real papers repeated with
 *     "SYNTHETIC –" titles (test pages only), to exercise packed columns and the
 *     overflow rule (oldest bins merged and packed per lane).
 *   npx vitest run --config tests/visual/vitest.render.config.ts
 */
import fs from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, expect, it } from "vitest";
import {
  buildContent,
  clearContentCache,
  loadRawContent,
  type PublicationView,
} from "@/lib/content/load";
import { buildFigureModel, type FigureModel } from "@/lib/figure/buildFigure";
import { PearlFigure } from "@/components/figure/PearlFigure";
import { BobaCup } from "@/components/cup/BobaCup";
import { homePearls } from "@/lib/content/queries";
import HomePage from "@/app/page";

const ROOT = process.cwd();
const FIX = path.join(ROOT, "tests/fixtures/content");
const OUT = path.join(ROOT, "test-results/redesign-home/gallery");
const TODAY = "2026-10-20";
const CSS = [
  "src/styles/tokens.css",
  "src/styles/base.css",
  "src/styles/components.css",
  "src/styles/motion.css",
  "src/styles/forced-colors.css",
  "src/components/figure/figure.css",
  "src/components/home/home.css",
  "src/components/cup/cup.css",
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
  const b64 = fs
    .readFileSync(path.join(ROOT, "src/fonts/archivo-latin-wdth-normal.woff2"))
    .toString("base64");
  return (
    `@font-face{font-family:"BL Archivo";src:url(data:font/woff2;base64,${b64}) format("woff2");` +
    `font-weight:100 900;font-stretch:62% 125%;font-style:normal;font-display:block}\n` +
    `:root{--font-archivo:"BL Archivo"}`
  );
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

/** Just the figure, in the content column, from an edited model. */
function renderFigure(model: FigureModel): string {
  return renderToStaticMarkup(
    <div className="bl-container hm">
      <PearlFigure model={model} />
    </div>,
  );
}

const content = (dir: string) =>
  buildContent(loadRawContent(dir), { preview: false, today: TODAY });

/** The real papers repeated k times (titles marked SYNTHETIC; gallery pages only). */
function growth(k: number): FigureModel {
  const c = content(path.join(ROOT, "content"));
  const pubs: PublicationView[] = [];
  for (let i = 0; i < k; i++)
    for (const p of c.countedPublications)
      pubs.push({
        ...p,
        slug: i ? `${p.slug}-x${i}` : p.slug,
        title: i ? `SYNTHETIC – ${p.title}` : p.title,
      });
  const directions = c.directions.map((d) => ({
    ...d,
    counts: { ...d.counts, papers: pubs.filter((p) => p.directions.includes(d.slug)).length },
  }));
  return buildFigureModel({
    directions,
    countedPublications: pubs,
    inProgress: c.inProgress,
    today: c.today,
  });
}

it("renders the fixture gallery", () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".html")) fs.rmSync(path.join(OUT, f));
  const css = CSS.map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
  fs.writeFileSync(path.join(OUT, "style.css"), `${fontCss()}\n${css}`);

  for (const set of GALLERY_SETS) {
    // D-14: Fig. 1 left the home page (it is on /research/ now), so the fixture
    // figure is rendered on its own, and the real home page (the cup with that
    // set's live directions, JUDGE R17) gets its own page.
    const c = content(path.join(FIX, set));
    const m = buildFigureModel({
      directions: c.directions,
      countedPublications: c.countedPublications,
      inProgress: c.inProgress,
      today: c.today,
    });
    fs.writeFileSync(path.join(OUT, `${set}.html`), page(`Fig. 1 ${set}`, renderFigure(m)));
    const html = renderHome(path.join(FIX, set), false);
    fs.writeFileSync(path.join(OUT, `cup-${set}.html`), page(`Home cup ${set}`, html));
  }
  // Five live directions (no fixture has exactly five): the n6 set's first five.
  {
    const c = content(path.join(FIX, "n6"));
    fs.writeFileSync(
      path.join(OUT, "cup-n5.html"),
      page(
        "Home cup n5",
        renderToStaticMarkup(
          <div className="bl-container hm">
            <section className="hm-hero">
              <div className="hm-copy">
                <h1 className="hm-h1">Five directions</h1>
              </div>
              <div className="hm-cup">
                <BobaCup pearls={homePearls(c).slice(0, 5)} />
              </div>
            </section>
          </div>,
        ),
      ),
    );
  }
  fs.writeFileSync(
    path.join(OUT, "home-production.html"),
    page("Home, production content", renderHome(path.join(ROOT, "content"), false)),
  );
  fs.writeFileSync(
    path.join(OUT, "home-preview.html"),
    page("Home, preview content", renderHome(path.join(ROOT, "content"), true)),
  );
  for (const set of ["n7", "n8"]) {
    const c = content(path.join(FIX, set));
    const m = buildFigureModel({
      directions: c.directions,
      countedPublications: c.countedPublications,
      inProgress: c.inProgress,
      today: c.today,
    });
    m.lanes.forEach((l, i) => (l.label = LONG_LABELS[i] ?? l.label));
    fs.writeFileSync(
      path.join(OUT, `${set}-long-labels.html`),
      page(`Fig. 1 ${set} long labels`, renderFigure(m)),
    );
  }
  for (const k of [2, 4, 8]) {
    const m = growth(k);
    if (k === 8) expect(m.merged).toBeGreaterThan(0);
    fs.writeFileSync(
      path.join(OUT, `growth-${k}x.html`),
      page(`Fig. 1 growth ${k}x`, renderFigure(m)),
    );
  }
});
