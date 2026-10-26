/**
 * The homepage pearl figure (DECISIONS D-15): the model over fixtures and the
 * real content, the server markup (real links in an <ol>, one caption layer per
 * direction, the quiet map link, no numerals, no Pause), the shared intro key,
 * the CSS polish rules (flat tea panel, no gloss, no loops, no overshoot, lift
 * ≤ 3 px and ≤ 1.05) and the client JS budget (≤ 2.5 KB gz).
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildContent, loadRawContent } from "@/lib/content/load";
import { CUP_INTRO_STORAGE_KEY } from "@/lib/site/motion";
import {
  buildPearls,
  countsLine,
  papersLine,
  pearlsState,
  PEARLS_LEGEND,
  type PearlsModel,
} from "@/lib/pearls/model";
import { seedCount } from "@/lib/pearls/seeds";
import { MAX_FIGURE_N, MIN_FIGURE_N, TEMPLATES } from "@/lib/pearls/templates";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    className?: string;
    "aria-describedby"?: string;
  }) => (
    <a href={href} className={className} aria-describedby={rest["aria-describedby"]}>
      {children}
    </a>
  ),
}));

const { HomePearls, edgeOf, mapLinkText } = await import("@/components/pearls/HomePearls");
const { PEARLS_INTRO_KEY } = await import("@/components/pearls/PearlsIsland");

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const FIX = path.join(ROOT, "tests/fixtures/content");
const TODAY = "2026-10-25";
const load = (dir: string) => buildContent(loadRawContent(dir), { preview: false, today: TODAY });
const real = () => load(path.join(ROOT, "content"));
const render = (m: PearlsModel) => renderToStaticMarkup(<HomePearls model={m} />);
/** A stylesheet without its comments. */
const css = (f: string) =>
  fs
    .readFileSync(path.join(ROOT, "src/components/pearls", f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");

describe("model", () => {
  it("maps n to the state: 0 empty, 1 grid, 2–8 cluster, more than 8 grid", () => {
    expect(pearlsState(0)).toBe("empty");
    expect(pearlsState(1)).toBe("grid");
    for (let n = 2; n <= 8; n++) expect(pearlsState(n)).toBe("cluster");
    expect(pearlsState(9)).toBe("grid");
  });

  it("over the fixtures: the template for 2–8, none otherwise; one slot per pearl", () => {
    for (const set of ["n0", "n1", "n2", "n3", "n4", "n6", "n7", "n8"]) {
      const c = load(path.join(FIX, set));
      const m = buildPearls(c.directions);
      expect(m.n, set).toBe(c.directions.length);
      if (m.state === "cluster") {
        expect(m.template?.slots).toHaveLength(m.n);
        expect(m.items.every((it) => it.slot)).toBe(true);
      } else {
        expect(m.template).toBeNull();
        expect(m.items.every((it) => it.slot === null)).toBe(true);
      }
    }
  });

  it("over the real content: links, counts, seeds and the homeQuestion caption", () => {
    const c = real();
    const m = buildPearls(c.directions);
    expect(m.items.map((it) => it.slug)).toEqual(c.directions.map((d) => d.slug));
    for (const [i, it] of m.items.entries()) {
      const d = c.directions[i]!;
      expect(it.href).toBe(`/research/${d.slug}/`);
      expect(it.papers).toBe(d.counts.papers);
      expect(it.inProgress).toBe(d.counts.inProgress);
      expect(it.seeds).toHaveLength(seedCount(d.counts.papers));
      expect(it.question).toBe(d.homeQuestion ?? d.summary);
    }
  });

  it("counts wording", () => {
    expect(countsLine({ papers: 4, inProgress: 2 })).toBe("4 papers, 2 in progress");
    expect(countsLine({ papers: 1, inProgress: 0 })).toBe("1 paper");
    expect(papersLine(0)).toBe("0 papers");
    expect(PEARLS_LEGEND).toBe(
      "Each pearl is a research direction; each small dot is one of its papers.",
    );
    expect(mapLinkText(4)).toBe("See how the four directions connect");
    expect(mapLinkText(1)).toBe("See every paper on one timeline");
  });
});

describe("markup", () => {
  const c = real();
  const m = buildPearls(c.directions);
  const html = render(m);

  it("one labelled nav with an <ol> of real direction links, in editorial order", () => {
    expect(html.match(/<nav aria-label="Research directions">/g)).toHaveLength(1);
    expect(html).toContain('<ol role="list" class="pl-list">');
    const hrefs = [...html.matchAll(/<a href="(\/research\/[^"]+)" class="pl-link"/g)].map(
      (x) => x[1],
    );
    expect(hrefs).toEqual(m.items.map((it) => it.href));
    for (const it of m.items) {
      expect(html).toContain(`<span class="pl-label">${it.label.replace(/&/g, "&amp;")}</span>`);
      expect(html).toContain(`<span class="pl-count">${papersLine(it.papers)}</span>`);
    }
    expect(html).not.toContain("<button");
    expect(html).not.toMatch(/Pause|Play motion/);
  });

  it("no numerals on the pearls; the graphics are hidden from assistive tech", () => {
    expect(html).not.toMatch(/>0\d</);
    expect(html.match(/class="pl-g" aria-hidden="true"/g)).toHaveLength(m.n);
    expect(html.match(/class="pl-body"/g)).toHaveLength(m.n);
    const seeds = m.items.reduce((s, it) => s + it.seeds.length, 0);
    expect(html.match(/class="pl-seed"/g) ?? []).toHaveLength(seeds);
  });

  it("the caption: the plain sentence, then one hidden layer per direction that describes its link", () => {
    expect(html).toContain(`data-cap="legend">${PEARLS_LEGEND}</span>`);
    for (const it of m.items) {
      expect(html).toContain(`aria-describedby="pl-q-${it.slug}"`);
      const layer = new RegExp(
        `<span id="pl-q-${it.slug}" class="pl-cap-l" data-cap="${it.slug}" data-swatch="[a-z-]+" aria-hidden="true">(.*?)</span></span>`,
      ).exec(html);
      expect(layer, it.slug).not.toBeNull();
      expect(layer![1]).toContain(countsLine(it));
    }
  });

  it("every template has a slot hugging each side, so the figure lines up with the caption", () => {
    for (let n = MIN_FIGURE_N; n <= MAX_FIGURE_N; n++) {
      const t = TEMPLATES[n]!;
      const edges = t.slots.map((s) => edgeOf(s.col, t.columns));
      expect(edges, `n=${n}`).toContain("start");
      expect(edges, `n=${n}`).toContain("end");
    }
    expect(html).toContain('data-edge="start"');
    expect(html).toContain('data-edge="end"');
  });

  it("the quiet link to the timeline under the panel", () => {
    expect(html).toContain(
      `<p class="pl-more"><a href="/research/#map">${mapLinkText(m.n)}</a></p>`,
    );
  });

  it("no live direction: one sentence, no figure", () => {
    const empty = render(buildPearls(load(path.join(FIX, "n0")).directions));
    expect(empty).toContain("Research directions are coming soon.");
    expect(empty).not.toContain("<nav");
  });
});

describe("intro key", () => {
  it("is the documented session key (privacy page) that the pre-paint script sets", () => {
    expect(PEARLS_INTRO_KEY).toBe(CUP_INTRO_STORAGE_KEY);
    const privacy = fs.readFileSync(path.join(ROOT, "content/pages/privacy.yml"), "utf8");
    expect(privacy).toContain(`\`${PEARLS_INTRO_KEY}\``);
    expect(PEARLS_INTRO_KEY).not.toBe("bobalab-intro"); // the research map's own key
  });
});

describe("CSS polish rules (D-15)", () => {
  const p = css("pearls.css");
  const h = css("halo.css");
  const rule = (src: string, sel: string) =>
    new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`).exec(
      src,
    )?.[2] ?? "";

  it("a flat tea panel: no border, radius or crop marks", () => {
    const pl = rule(p, ".pl");
    expect(pl).toContain("background: var(--tea)");
    expect(pl).not.toMatch(/border|radius/);
    expect(p).not.toMatch(/\.pl::(after|before)/);
  });

  it("matte bodies: no sheen pseudo-element, no numerals, no specular stop", () => {
    expect(p).not.toMatch(/pl-body::(before|after)/);
    expect(p).not.toMatch(/pl-idx|sheen|gloss/);
  });

  it("no idle loop, no overshoot; lift ≤ 3 px and scale ≤ 1.05", () => {
    expect(`${p}\n${h}`).not.toMatch(/infinite|alternate/);
    expect(p).toContain("transform: translateY(-3px) scale(1.05);");
    const settle = /@keyframes pl-settle \{([\s\S]*?)\n\}/.exec(p)![1]!;
    const ys = [...settle.matchAll(/translate: 0 (-?\d+)px|translate: 0 0/g)].map((x) =>
      Number(x[1] ?? 0),
    );
    expect(ys).toEqual([-18, 0]); // straight down to rest, never past it
  });

  it("all motion sits inside the reduced-motion gate", () => {
    const gate = p.indexOf("@media (prefers-reduced-motion: no-preference)");
    expect(gate).toBeGreaterThan(0);
    const before = p.slice(0, gate);
    expect(before).not.toMatch(/transition|animation/);
  });

  it("the halo is shared with DirectionPearl hero (same strengths, outranks direction.css)", () => {
    expect(h).toMatch(/:is\(\.pl-item, \.f1-dp--hero\)\[data-swatch="lychee"\]/);
    expect(h).toContain(".f1-dp.f1-dp--hero:not(.f1-dp--quiet) .f1-pearl {");
    const dp = fs.readFileSync(path.join(ROOT, "src/components/figure/DirectionPearl.tsx"), "utf8");
    expect(dp).toContain('import "@/components/pearls/halo.css";');
  });
});

describe("client JS budget", () => {
  it("the island is ≤ 2.5 KB gz (minified, React excluded)", async () => {
    const { transformSync, minifySync } = await import("rolldown/experimental");
    const src = fs.readFileSync(path.join(ROOT, "src/components/pearls/PearlsIsland.tsx"), "utf8");
    const js = transformSync("PearlsIsland.tsx", src, { jsx: { runtime: "automatic" } }).code;
    const min = minifySync("PearlsIsland.js", js).code;
    expect(zlib.gzipSync(min, { level: 9 }).length).toBeLessThanOrEqual(2500);
  });
});
