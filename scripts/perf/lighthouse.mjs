#!/usr/bin/env node
/**
 * Lighthouse 13.5.0 on the four key pages (brief §G2, §G5 "pre-launch";
 * WP8 acceptance #10). Mobile emulation (Lighthouse's default config).
 *
 *   npm run build && npm run serve:out          (in one terminal)
 *   node scripts/perf/lighthouse.mjs [--base http://127.0.0.1:4173] [--out test-results/WP8/lighthouse]
 *        [--direction <slug>] [--preview]
 *
 * Pages: home, a direction page (--direction <slug>, else the first one linked from
 * /research/; reported as missing when the build has none), /publications/
 * and /people/. --base may include a base path (http://host/website).
 * Writes <name>.report.html and <name>.report.json per page plus summary.md
 * (attach it to the integration PR), and exits 1 when a page is missing or a
 * score is below the §G2 budget:
 *   Performance ≥ 95 · Accessibility 100 · Best Practices ≥ 95 · SEO ≥ 95.
 * Run it on a PRODUCTION export. Preview builds (`npm run build:preview`)
 * disallow all crawling in robots.txt by design, which fails Lighthouse's
 * `is-crawlable` audit (SEO 66, MEASURED 2026-10-20); --preview skips that one
 * audit and says so in summary.md. Use it only while every direction is still
 * a draft, so the direction page exists only in a preview export.
 *
 * Chrome is Playwright's Chromium, launched with a remote-debugging port that
 * Lighthouse attaches to (chrome-launcher's own spawn fails in some Windows
 * sandboxes with "spawn UNKNOWN").
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const BUDGET = { performance: 95, accessibility: 100, "best-practices": 95, seo: 95 };

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1]
    : fallback;
};
const base = arg("--base", process.env.BASE_URL ?? "http://127.0.0.1:4173").replace(/\/+$/, "");
const outDir = path.resolve(arg("--out", path.join(ROOT, "test-results", "WP8", "lighthouse")));
const preview = process.argv.includes("--preview");

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

// The base URL may carry a base path (e.g. http://127.0.0.1:4173/website);
// links in the HTML then start with it.
const basePath = new URL(`${base}/`).pathname.replace(/\/+$/, "");
const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** First direction page linked from /research/, as a path below the base. */
async function firstDirection() {
  try {
    const html = await (await fetch(`${base}/research/`)).text();
    const m = new RegExp(`href="${reEscape(basePath)}(/research/[a-z0-9]+(?:-[a-z0-9]+)*/)"`).exec(
      html,
    );
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// --direction <slug> (or /research/<slug>/) picks the direction page
// explicitly. Prefer the bare slug: Git Bash rewrites arguments that start
// with "/" into Windows paths. A production export made before launch has no
// direction page at all (every direction is a draft, D-03): that page is then
// reported as missing and the run exits 1, because the brief asks for all
// four pages (QA-CHECKLIST §6).
function directionPath(v) {
  if (!v) return null;
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)) return `/research/${v}/`;
  const m = /\/research\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(v);
  return m ? `/research/${m[1]}/` : null;
}
const pages = [
  ["home", "/"],
  ["direction", directionPath(arg("--direction", null)) ?? (await firstDirection())],
  ["publications", "/publications/"],
  // No "/people/": the People list is the home page's #people section, audited with home (D-21).
];

fs.mkdirSync(outDir, { recursive: true });
const port = await freePort();
const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });
const rows = [];
let failed = false;
try {
  for (const [name, p] of pages) {
    if (!p) {
      failed = true;
      rows.push({
        name,
        url: `${base}/research/…/`,
        error:
          "no direction page is linked from /research/ (all directions are drafts in this build?); pass --direction /research/<slug>/ against an export that has one",
      });
      console.log(`[lighthouse] ${name}: no page to audit`);
      continue;
    }
    const url = `${base}${p}`;
    console.log(`[lighthouse] ${url}`);
    try {
      const result = await lighthouse(url, {
        port,
        output: ["html", "json"],
        logLevel: "error",
        onlyCategories: Object.keys(BUDGET),
        ...(preview ? { skipAudits: ["is-crawlable"] } : {}),
      });
      if (!result) throw new Error("no result");
      const [html, json] = result.report;
      fs.writeFileSync(path.join(outDir, `${name}.report.html`), html);
      fs.writeFileSync(path.join(outDir, `${name}.report.json`), json);
      const lhr = result.lhr;
      if (lhr.runtimeError)
        throw new Error(`${lhr.runtimeError.code}: ${lhr.runtimeError.message}`);
      const scores = Object.fromEntries(
        Object.keys(BUDGET).map((k) => [k, Math.round((lhr.categories[k]?.score ?? 0) * 100)]),
      );
      const misses = Object.entries(BUDGET).filter(([k, min]) => scores[k] < min);
      if (misses.length) failed = true;
      const metric = (id) => lhr.audits[id]?.displayValue ?? "–";
      rows.push({
        name,
        url,
        scores,
        misses,
        lcp: metric("largest-contentful-paint"),
        cls: metric("cumulative-layout-shift"),
        tbt: metric("total-blocking-time"),
      });
    } catch (e) {
      failed = true;
      rows.push({ name, url, error: String(e?.message ?? e).slice(0, 160) });
    }
  }
} finally {
  await browser.close();
}

const lines = [
  `# Lighthouse ${new Date().toISOString().slice(0, 10)} (mobile), ${base}`,
  "",
  "| Page | Perf | A11y | Best pr. | SEO | LCP | CLS | TBT | Budget |",
  "|---|---:|---:|---:|---:|---:|---:|---:|---|",
  ...rows.map((r) =>
    r.error
      ? `| ${r.name} | – | – | – | – | – | – | – | error: ${r.error.replace(/\|/g, "/")} |`
      : `| [${r.name}](${r.name}.report.html) | ${r.scores.performance} | ${r.scores.accessibility} | ${r.scores["best-practices"]} | ${r.scores.seo} | ${r.lcp} | ${r.cls} | ${r.tbt} | ${r.misses.length ? `below: ${r.misses.map(([k]) => k).join(", ")}` : "ok"} |`,
  ),
  "",
  "Budget (brief §G2): Performance ≥ 95, Accessibility 100, Best Practices ≥ 95, SEO ≥ 95.",
  ...(preview
    ? [
        "",
        "PREVIEW export (--preview): the `is-crawlable` audit was skipped because preview builds disallow crawling in robots.txt on purpose. Re-run on a production export once directions are published.",
      ]
    : []),
];
fs.writeFileSync(path.join(outDir, "summary.md"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(failed ? 1 : 0);
