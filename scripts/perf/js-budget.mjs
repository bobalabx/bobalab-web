#!/usr/bin/env node
/**
 * Client-JS budget per exported page (brief §G2; WP8). `npm run perf`.
 *
 *   node scripts/perf/js-budget.mjs [outDir=out] [--baseline <bytes>] [--json]
 *        [--base-path /prefix] [--measure-baseline]
 *
 * For every out/**\/*.html (except the CMS under out/admin/), sum the gzip -9
 * size of every script the HTML makes the browser download:
 *   - each `<script src>`, de-duplicated, EXCLUDING `<script nomodule>` (the
 *     legacy-polyfill chunk modern browsers skip; docs/PERF-BASELINE.md);
 *   - each `<link rel="preload|modulepreload" as="script" href>` not already
 *     counted (Next preloads chunks it also loads with <script>).
 * Inline scripts are reported separately: they are part of the HTML transfer.
 * Chunks loaded later by client code (dynamic import) are not counted.
 *
 * Budgets, with baseline B from docs/PERF-BASELINE.md ("**B = 139,144 bytes gz**"),
 * KB = 1024 bytes:
 *   /               ≤ B + 8 KB
 *   /publications/  ≤ B + 30 KB
 *   any other page  ≤ B + 10 KB
 * and one named budget for a page that is not part of the public site, reported
 * on its own line:
 *   /editor-preview/  ≤ B + 180 KB  (the content manager's live preview: every
 *                     page view, the content pipeline and the validator run in
 *                     the browser; noindex, never linked, not in the sitemap)
 * B can be overridden with --baseline or PERF_BASELINE_B (bytes).
 *
 * Exit: 0 all within budget · 1 a page is over budget or references a missing /
 * off-origin script · 2 usage error (no out/, no pages, no baseline).
 * --measure-baseline also prints the JS of out/404.html (an otherwise empty
 * route, how B was defined) and warns when it differs from B by more than 1 KB.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const KB = 1024;
export const EXTRA = {
  home: 8 * KB,
  publications: 30 * KB,
  other: 10 * KB,
  "editor-preview": 180 * KB,
};
/** Routes with a named budget of their own (not public pages). */
export const NAMED = { "/editor-preview/": "editor-preview" };

/** Parse baseline B (bytes) from docs/PERF-BASELINE.md. */
export function parseBaseline(markdown) {
  const m = /\*\*B\s*=\s*([\d,]+)\s*bytes/i.exec(markdown);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

/** Site route for an HTML file path relative to out/ ("research/x/index.html" → "/research/x/"). */
export function routeOf(rel) {
  const r = rel.split(path.sep).join("/");
  if (r === "index.html") return "/";
  if (r.endsWith("/index.html")) return `/${r.slice(0, -"index.html".length)}`;
  return `/${r}`;
}

/** Budget class and limit (bytes) for a route. */
export function budgetFor(route, baseline) {
  const kind =
    NAMED[route] ??
    (route === "/" ? "home" : route === "/publications/" ? "publications" : "other");
  return { kind, limit: baseline + EXTRA[kind] };
}

const attr = (attrs, name) => {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i").exec(
    attrs,
  );
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null;
};
const hasAttr = (attrs, name) => new RegExp(`(?:^|\\s)${name}(?:\\s*=|\\s|$)`, "i").test(attrs);
const decodeEntities = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");

/**
 * Scripts an HTML document makes the browser fetch.
 * @returns {{ external: string[], skipped: string[], inline: string[] }}
 */
export function scriptsOf(html) {
  const external = [];
  const skipped = [];
  const inline = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] ?? "";
    const src = attr(attrs, "src");
    if (src !== null) {
      if (hasAttr(attrs, "nomodule")) skipped.push(decodeEntities(src));
      else external.push(decodeEntities(src));
    } else if ((m[2] ?? "").trim()) {
      const type = (attr(attrs, "type") ?? "").toLowerCase();
      // JSON-LD and other data blocks are not scripts.
      if (!type || type === "module" || type.includes("javascript")) inline.push(m[2]);
    }
  }
  const linkRe = /<link\b([^>]*)>/gi;
  while ((m = linkRe.exec(html))) {
    const attrs = m[1] ?? "";
    const rel = (attr(attrs, "rel") ?? "").toLowerCase().split(/\s+/);
    const as = (attr(attrs, "as") ?? "").toLowerCase();
    const href = attr(attrs, "href");
    if (!href) continue;
    if (rel.includes("modulepreload") || (rel.includes("preload") && as === "script")) {
      external.push(decodeEntities(href));
    }
  }
  return { external: [...new Set(external)], skipped: [...new Set(skipped)], inline };
}

/** @returns {string[]} */
function htmlFiles(dir, rel = "") {
  /** @type {string[]} */
  const out = [];
  for (const d of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? path.join(rel, d.name) : d.name;
    if (d.isDirectory()) {
      if (!rel && (d.name === "_next" || d.name === "admin")) continue;
      out.push(...htmlFiles(dir, r));
    } else if (d.name.endsWith(".html")) out.push(r);
  }
  return out.sort();
}

const gzCache = new Map();
export function gzipSize(file) {
  if (!gzCache.has(file)) {
    gzCache.set(file, zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length);
  }
  return gzCache.get(file);
}

/** Map a script URL from the HTML to a file in outDir, or an error string. */
function resolveScript(outDir, src, basePath) {
  if (/^(https?:)?\/\//i.test(src)) return { error: `off-origin script ${src}` };
  if (/^(data|blob):/i.test(src)) return { error: `non-file script ${src.slice(0, 40)}` };
  let p = src.split(/[?#]/)[0] ?? "";
  if (basePath && p.startsWith(`${basePath}/`)) p = p.slice(basePath.length);
  if (!p.startsWith("/")) return { error: `relative script URL ${src}` };
  let decoded;
  try {
    decoded = decodeURIComponent(p);
  } catch {
    return { error: `bad script URL ${src}` };
  }
  const file = path.resolve(outDir, `.${decoded}`);
  if (!file.startsWith(path.resolve(outDir) + path.sep))
    return { error: `script outside out/ ${src}` };
  if (!fs.existsSync(file)) return { error: `missing script ${src}` };
  return { file };
}

/** Measure one HTML file. */
export function measurePage(outDir, rel, { basePath = "" } = {}) {
  const html = fs.readFileSync(path.join(outDir, rel), "utf8");
  const { external, skipped, inline } = scriptsOf(html);
  let gz = 0;
  const errors = [];
  for (const src of external) {
    const r = resolveScript(outDir, src, basePath);
    if (r.error) errors.push(r.error);
    else gz += gzipSize(r.file);
  }
  const inlineGz = inline.length
    ? zlib.gzipSync(Buffer.from(inline.join("\n")), { level: 9 }).length
    : 0;
  return { scripts: external.length, skipped: skipped.length, gz, inlineGz, errors };
}

/**
 * Check every page. Returns rows plus failures (over budget or broken scripts).
 * @param {string} outDir
 * @param {{ baseline: number, basePath?: string }} opts
 */
export function checkBudgets(outDir, { baseline, basePath = "" }) {
  const rows = htmlFiles(outDir).map((rel) => {
    const route = routeOf(rel);
    const { kind, limit } = budgetFor(route, baseline);
    const m = measurePage(outDir, rel, { basePath });
    return {
      route,
      file: rel.split(path.sep).join("/"),
      kind,
      limit,
      ...m,
      ok: m.gz <= limit && !m.errors.length,
    };
  });
  return { rows, failures: rows.filter((r) => !r.ok) };
}

const fmt = (n) => n.toLocaleString("en-US");

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : undefined;
}

/** CLI entry; returns the exit code. */
export function main(
  argv = process.argv.slice(2),
  { log = console.log, error = console.error } = {},
) {
  const valueFlags = new Set(["--baseline", "--base-path", "--baseline-file"]);
  const positional = argv.filter((a, i) => !a.startsWith("--") && !valueFlags.has(argv[i - 1]));
  const outDir = path.resolve(positional[0] ?? path.join(ROOT, "out"));
  const json = argv.includes("--json");
  const basePath = (arg(argv, "--base-path") ?? process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(
    /\/+$/,
    "",
  );

  let baseline = Number(arg(argv, "--baseline") ?? process.env.PERF_BASELINE_B ?? NaN);
  const baselineFile = path.resolve(
    arg(argv, "--baseline-file") ?? path.join(ROOT, "docs", "PERF-BASELINE.md"),
  );
  if (!Number.isFinite(baseline)) {
    baseline = fs.existsSync(baselineFile)
      ? (parseBaseline(fs.readFileSync(baselineFile, "utf8")) ?? NaN)
      : NaN;
  }
  if (!Number.isFinite(baseline) || baseline <= 0) {
    error(`[js-budget] no baseline B: pass --baseline <bytes> or record it in ${baselineFile}`);
    return 2;
  }
  if (!fs.existsSync(outDir) || !fs.statSync(outDir).isDirectory()) {
    error(`[js-budget] ${outDir} not found. Run \`npm run build\` first.`);
    return 2;
  }
  const { rows, failures } = checkBudgets(outDir, { baseline, basePath });
  if (!rows.length) {
    error(`[js-budget] no HTML pages in ${outDir}.`);
    return 2;
  }

  let measured = null;
  if (argv.includes("--measure-baseline") && fs.existsSync(path.join(outDir, "404.html"))) {
    measured = measurePage(outDir, "404.html", { basePath }).gz;
  }

  if (json) {
    log(
      JSON.stringify(
        { baseline, measuredBaseline: measured, rows, failures: failures.length },
        null,
        2,
      ),
    );
  } else {
    log(
      `[js-budget] baseline B = ${fmt(baseline)} B gz; ${rows.length} page(s) in ${path.relative(process.cwd(), outDir) || outDir}`,
    );
    const w = Math.min(60, Math.max(...rows.map((r) => r.route.length)));
    const line = (r) => {
      const head = r.limit - r.gz;
      return (
        `${r.ok ? "  ok " : "  FAIL"} ${r.route.padEnd(w)} ${fmt(r.gz).padStart(9)} / ${fmt(r.limit).padStart(9)} (${head >= 0 ? "+" : ""}${fmt(head)}) ${r.kind}` +
        (r.errors.length ? `  ${r.errors.join("; ")}` : "")
      );
    };
    const named = new Set(Object.values(NAMED));
    const sorted = [...rows]
      .filter((r) => !named.has(r.kind))
      .sort((a, b) => Number(a.ok) - Number(b.ok) || b.gz - a.gz);
    for (const r of sorted) log(line(r));
    // Named budgets (pages outside the public site) get a line of their own.
    for (const r of rows.filter((x) => named.has(x.kind))) {
      log(`[js-budget] ${r.kind} (not a public page, budget B + ${EXTRA[r.kind] / KB} KB):`);
      log(line(r));
    }
    if (measured !== null) {
      const diff = measured - baseline;
      log(
        `[js-budget] measured empty-route JS (404.html) = ${fmt(measured)} B gz (${diff >= 0 ? "+" : ""}${fmt(diff)} vs B)`,
      );
      if (Math.abs(diff) > KB) {
        log(
          `::warning title=JS baseline drift::404.html ships ${fmt(measured)} B gz, B in docs/PERF-BASELINE.md is ${fmt(baseline)} B. Re-measure B on this platform and update PERF-BASELINE.md.`,
        );
      }
    }
    log(
      failures.length
        ? `[js-budget] ${failures.length} page(s) over budget or broken.`
        : `[js-budget] all ${rows.length} page(s) within budget.`,
    );
  }
  return failures.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
