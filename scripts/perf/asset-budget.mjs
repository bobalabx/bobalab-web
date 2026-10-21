#!/usr/bin/env node
/**
 * Font, transfer and upload budgets (brief §G2, §F3 "Media"; WP8).
 * The JS budget is scripts/perf/js-budget.mjs.
 *
 *   node scripts/perf/asset-budget.mjs uploads [public/uploads]   (CI: validate-content)
 *   node scripts/perf/asset-budget.mjs out [out] [--content content]   (CI: budgets)
 *   node scripts/perf/asset-budget.mjs                             (both, default paths)
 *
 * uploads (the files editors add through the CMS):
 *   - only jpg/jpeg/png/webp/gif/pdf (generated files live in public/media/): an SVG,
 *     HTML or XML upload would run on the same origin as /admin/, where Decap
 *     keeps the editor's GitHub token;
 *   - every file ≤ 10 MB; raster images ≤ 2 MB.
 * out (the exported site):
 *   - fonts preloaded by any page ≤ 100 KiB (raw woff2 bytes);
 *   - home transfer ≤ 350 KB: index.html (gz) + its scripts (gz, no nomodule)
 *     + stylesheets (gz) + preloaded fonts + eager images;
 *   - headshots: each WebP variant of a consented, listed person photo ≤ 40 KB;
 *   - every <img> in every page has explicit width and height attributes
 *     (no layout shift; §G2 "explicit width and height everywhere").
 * KB = 1024 bytes. Exit 0 pass · 1 a budget failed · 2 usage error.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { scriptsOf } from "./js-budget.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const KB = 1024;
export const LIMITS = {
  uploadBytes: 10 * KB * KB,
  rasterBytes: 2 * KB * KB,
  fontsBytes: 100 * KB,
  homeTransferBytes: 350 * KB,
  headshotBytes: 40 * KB,
};
export const UPLOAD_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"]);
const RASTER = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function walk(dir, rel = "") {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const d of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) out.push(...walk(dir, r));
    else out.push(r);
  }
  return out.sort();
}

/** Upload policy over a folder (default public/uploads). Returns error strings. */
export function checkUploads(dir) {
  const errors = [];
  for (const rel of walk(dir)) {
    const name = path.posix.basename(rel);
    const ext = path.extname(name).toLowerCase();
    if (rel === "manifest.json" || name === ".gitkeep") continue;
    const size = fs.statSync(path.join(dir, rel)).size;
    if (!UPLOAD_EXTENSIONS.has(ext)) {
      errors.push(
        `uploads/${rel}: file type "${ext || name}" is not allowed (jpg, png, webp, gif, pdf only)`,
      );
      continue;
    }
    if (size > LIMITS.uploadBytes) {
      errors.push(`uploads/${rel}: ${(size / KB / KB).toFixed(1)} MB is over the 10 MB limit`);
    } else if (RASTER.has(ext) && size > LIMITS.rasterBytes) {
      errors.push(
        `uploads/${rel}: ${(size / KB / KB).toFixed(1)} MB is over the 2 MB limit for images (resize it to at most 2000 px wide)`,
      );
    }
  }
  return errors;
}

const attr = (attrs, name) => {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i").exec(
    attrs,
  );
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null;
};

/** href/src values of tags matching a predicate on their attributes. */
function tagUrls(html, tag, pick) {
  const out = [];
  const re = new RegExp(`<${tag}\\b([^>]*)>`, "gi");
  let m;
  while ((m = re.exec(html))) {
    const v = pick(m[1] ?? "");
    if (v) out.push(v.replace(/&amp;/g, "&"));
  }
  return [...new Set(out)];
}

export const preloadedFonts = (html) =>
  tagUrls(html, "link", (a) =>
    /\bpreload\b/i.test(attr(a, "rel") ?? "") && (attr(a, "as") ?? "").toLowerCase() === "font"
      ? attr(a, "href")
      : null,
  );
const stylesheets = (html) =>
  tagUrls(html, "link", (a) =>
    /\bstylesheet\b/i.test(attr(a, "rel") ?? "") ? attr(a, "href") : null,
  );
const eagerImages = (html) => [
  ...tagUrls(html, "img", (a) =>
    (attr(a, "loading") ?? "").toLowerCase() === "lazy" ? null : attr(a, "src"),
  ),
  ...tagUrls(html, "link", (a) =>
    /\bpreload\b/i.test(attr(a, "rel") ?? "") && (attr(a, "as") ?? "").toLowerCase() === "image"
      ? attr(a, "href")
      : null,
  ),
];

function fileFor(outDir, url, basePath) {
  if (/^(https?:)?\/\//i.test(url) || /^data:/i.test(url)) return null;
  let p = url.split(/[?#]/)[0] ?? "";
  if (basePath && p.startsWith(`${basePath}/`)) p = p.slice(basePath.length);
  if (!p.startsWith("/")) return null;
  const f = path.resolve(outDir, `.${decodeURIComponent(p)}`);
  return f.startsWith(path.resolve(outDir) + path.sep) && fs.existsSync(f) ? f : null;
}
const gz = (buf) => zlib.gzipSync(buf, { level: 9 }).length;

/** Budgets over the exported site. Returns { errors, notes }. */
export function checkOut(outDir, { contentDir = path.join(ROOT, "content"), basePath = "" } = {}) {
  const errors = [];
  const notes = [];
  const pages = walk(outDir).filter(
    (r) => r.endsWith(".html") && !r.startsWith("admin/") && !r.startsWith("_next/"),
  );

  // Fonts preloaded per page.
  let worstFonts = 0;
  for (const rel of pages) {
    const html = fs.readFileSync(path.join(outDir, rel), "utf8");
    let total = 0;
    for (const u of preloadedFonts(html)) {
      const f = fileFor(outDir, u, basePath);
      if (!f) errors.push(`${rel}: preloaded font ${u} is missing from out/`);
      else total += fs.statSync(f).size;
    }
    worstFonts = Math.max(worstFonts, total);
    if (total > LIMITS.fontsBytes) {
      errors.push(`${rel}: preloads ${(total / KB).toFixed(1)} KiB of fonts (limit 100 KiB)`);
    }
  }
  notes.push(
    `largest font preload on any page: ${(worstFonts / KB).toFixed(1)} KiB (limit 100 KiB)`,
  );

  // Explicit image dimensions everywhere (§G2).
  let images = 0;
  for (const rel of pages) {
    const html = fs.readFileSync(path.join(outDir, rel), "utf8");
    for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
      images++;
      const a = m[1] ?? "";
      const missing = ["width", "height"].filter((n) => !/^\d+(\.\d+)?$/.test(attr(a, n) ?? ""));
      if (missing.length) {
        const src = attr(a, "src") ?? "(no src)";
        errors.push(`${rel}: <img src="${src}"> has no numeric ${missing.join(" or ")}`);
      }
    }
  }
  notes.push(`${images} <img> tag(s) checked for explicit width and height`);

  // Home transfer.
  const home = path.join(outDir, "index.html");
  if (fs.existsSync(home)) {
    const html = fs.readFileSync(home);
    const text = html.toString("utf8");
    let total = gz(html);
    const parts = { html: total, scripts: 0, styles: 0, fonts: 0, images: 0 };
    for (const u of scriptsOf(text).external) {
      const f = fileFor(outDir, u, basePath);
      if (f) parts.scripts += gz(fs.readFileSync(f));
    }
    for (const u of stylesheets(text)) {
      const f = fileFor(outDir, u, basePath);
      if (f) parts.styles += gz(fs.readFileSync(f));
    }
    for (const u of preloadedFonts(text)) {
      const f = fileFor(outDir, u, basePath);
      if (f) parts.fonts += fs.statSync(f).size;
    }
    for (const u of eagerImages(text)) {
      const f = fileFor(outDir, u, basePath);
      if (f) parts.images += fs.statSync(f).size;
    }
    total = parts.html + parts.scripts + parts.styles + parts.fonts + parts.images;
    const line = Object.entries(parts)
      .map(([k, v]) => `${k} ${(v / KB).toFixed(1)}`)
      .join(" + ");
    notes.push(`home transfer ${(total / KB).toFixed(1)} KB = ${line} (limit 350 KB)`);
    if (total > LIMITS.homeTransferBytes) {
      errors.push(
        `index.html: home transfer ${(total / KB).toFixed(1)} KB is over 350 KB (${line})`,
      );
    }
  } else {
    errors.push("index.html missing from out/");
  }

  // Headshots: variants of consented photos of listed, non-draft people.
  const manifestFile = path.join(outDir, "media", "manifest.json");
  const manifest = fs.existsSync(manifestFile)
    ? JSON.parse(fs.readFileSync(manifestFile, "utf8"))
    : { images: {} };
  const peopleDir = path.join(contentDir, "people");
  const FM = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---/;
  let headshots = 0;
  for (const f of fs.existsSync(peopleDir)
    ? fs.readdirSync(peopleDir).filter((x) => x.endsWith(".md"))
    : []) {
    const m = FM.exec(fs.readFileSync(path.join(peopleDir, f), "utf8"));
    let d = {};
    try {
      d = (m ? YAML.parse(m[1]) : {}) ?? {};
    } catch {
      continue; // the validator reports YAML errors
    }
    if (!d.photo || d.photo_consent !== true || d.listed !== true || d.draft === true) continue;
    const entry = manifest.images?.[d.photo];
    for (const v of entry?.variants ?? []) {
      const file = fileFor(outDir, v.src, basePath);
      if (!file) continue;
      headshots++;
      const size = fs.statSync(file).size;
      if (size > LIMITS.headshotBytes) {
        errors.push(
          `${v.src} (photo of ${f.replace(/\.md$/, "")}): ${(size / KB).toFixed(1)} KB is over the 40 KB headshot budget`,
        );
      }
    }
  }
  notes.push(`${headshots} headshot variant(s) checked (limit 40 KB each)`);
  return { errors, notes };
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : undefined;
}

export function main(
  argv = process.argv.slice(2),
  { log = console.log, error = console.error } = {},
) {
  const [mode, dirArg] = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--content");
  const modes = mode === "uploads" || mode === "out" ? [mode] : ["uploads", "out"];
  const errors = [];
  for (const m of modes) {
    if (m === "uploads") {
      const dir = path.resolve(
        mode === "uploads" && dirArg ? dirArg : path.join(ROOT, "public", "uploads"),
      );
      const e = checkUploads(dir);
      log(
        `[asset-budget] uploads: ${walk(dir).length} file(s) in ${path.relative(process.cwd(), dir) || dir}, ${e.length} problem(s)`,
      );
      errors.push(...e);
    } else {
      const dir = path.resolve(mode === "out" && dirArg ? dirArg : path.join(ROOT, "out"));
      if (!fs.existsSync(path.join(dir, "index.html"))) {
        error(`[asset-budget] ${dir}/index.html not found. Run \`npm run build\` first.`);
        return 2;
      }
      const contentDir = path.resolve(
        arg(argv, "--content") ?? process.env.CONTENT_DIR ?? path.join(ROOT, "content"),
      );
      const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
      const r = checkOut(dir, { contentDir, basePath });
      for (const n of r.notes) log(`[asset-budget] ${n}`);
      errors.push(...r.errors);
    }
  }
  for (const e of errors) error(`  FAIL ${e}`);
  log(
    errors.length
      ? `[asset-budget] ${errors.length} problem(s).`
      : "[asset-budget] all budgets met.",
  );
  return errors.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
