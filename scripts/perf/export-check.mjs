#!/usr/bin/env node
/**
 * Contract checks on a PRODUCTION static export (brief §G5 "build" job; WP8).
 *
 *   node scripts/perf/export-check.mjs [out] [--content content]
 *
 * Fails (exit 1) when:
 *   - out/index.html, out/404.html, out/admin/index.html, out/sitemap.xml or
 *     out/robots.txt is missing;
 *   - a draft item (any collection), an unlisted person or a person without a
 *     profile page has a page in out/, or its URL appears in ANY exported text
 *     file: a link in a page, the RSC payloads (`*.txt`) the client router
 *     fetches, JSON-LD, the RSS feed, a search index, or the sitemap
 *     (D-03, D-06; brief §G5 "no draft slugs in out/");
 *   - the sitemap lists /admin/, /kit/ or a `_none` placeholder page, or a URL
 *     whose page is missing from out/ or is a `noindex` not-found page (GitHub
 *     Pages would serve such a "soft 404" with status 200);
 *   - robots.txt does not disallow /admin/;
 *   - out/kit/ or any `_none` folder under out/ ships (blank not-found shells that
 *     GitHub Pages would serve with status 200; ENG-03);
 *   - a page's CSP <meta> does not directly follow <meta charSet> (ENG-05);
 *   - out/ still has Windows-style segment folders (`__next.*` folders or file
 *     names with a backslash; D-07 — scripts/fix-win-export.mjs repairs them).
 * Exit 2: out/ missing. Run it on `npm run build` output, not build:preview
 * (preview builds include drafts on purpose).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ROUTES = {
  directions: "research",
  projects: "projects",
  publications: "publications",
  people: "people",
  news: "news",
};
const FM = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---/;
/** Exported files that can carry a page URL (HTML, RSC payloads, feeds, JSON). */
const TEXT_EXT = /\.(html|txt|xml|json|rss|webmanifest)$/i;
/** Next's not-found pages (and any page marked noindex). */
const NOINDEX = /<meta\s+name="robots"\s+content="[^"]*\bnoindex\b/i;
const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function walk(dir, rel = "") {
  const out = [];
  for (const d of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${d.name}` : d.name;
    out.push({ rel: r, dir: d.isDirectory() });
    if (d.isDirectory() && r !== "_next") out.push(...walk(dir, r));
  }
  return out;
}

/** Slugs that must not be public in production, per collection. */
export function hiddenSlugs(contentDir) {
  /** @type {Record<string, string[]>} */
  const hidden = {};
  for (const [collection] of Object.entries(ROUTES)) {
    const folder = path.join(contentDir, collection);
    hidden[collection] = [];
    if (!fs.existsSync(folder)) continue;
    for (const f of fs.readdirSync(folder).filter((x) => x.endsWith(".md"))) {
      const m = FM.exec(fs.readFileSync(path.join(folder, f), "utf8"));
      let d = {};
      try {
        d = (m ? YAML.parse(m[1]) : {}) ?? {};
      } catch {
        continue; // the validator reports YAML errors
      }
      const slug = f.replace(/\.md$/, "");
      const isHidden =
        d.draft === true ||
        (collection === "people" &&
          (d.listed !== true || !(d.role === "pi" || d.profile_page === true)));
      if (isHidden) hidden[collection].push(slug);
    }
  }
  return hidden;
}

export function checkExport(
  outDir,
  { contentDir = path.join(ROOT, "content"), basePath = "" } = {},
) {
  const errors = [];
  const must = ["index.html", "404.html", "admin/index.html", "sitemap.xml", "robots.txt"];
  for (const f of must) if (!fs.existsSync(path.join(outDir, f))) errors.push(`missing out/${f}`);

  const entries = walk(outDir);
  for (const e of entries) {
    const name = e.rel.split("/").pop() ?? "";
    if (e.dir && name.startsWith("__next.")) {
      errors.push(`Windows-style segment folder out/${e.rel}/ (run scripts/fix-win-export.mjs)`);
    } else if (!e.dir && name.includes("\\")) {
      errors.push(`file name with a backslash: out/${e.rel}`);
    }
  }

  const sitemap = fs.existsSync(path.join(outDir, "sitemap.xml"))
    ? fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf8")
    : "";
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? "");
  const origins = new Set();
  for (const loc of locs) {
    if (/\/(admin|kit)\//.test(loc) || loc.includes("/_none/")) {
      errors.push(`sitemap lists ${loc}`);
      continue;
    }
    // Every listed URL must be a real page of this export.
    let p;
    try {
      const u = new URL(loc);
      origins.add(u.origin);
      p = decodeURIComponent(u.pathname);
    } catch {
      errors.push(`sitemap has an invalid URL: ${loc}`);
      continue;
    }
    if (basePath) {
      if (!p.startsWith(`${basePath}/`)) {
        errors.push(`sitemap URL is outside the base path ${basePath}: ${loc}`);
        continue;
      }
      p = p.slice(basePath.length);
    }
    const rel = p.endsWith("/") ? `${p.slice(1)}index.html` : p.slice(1);
    const file = path.join(outDir, ...rel.split("/"));
    if (!fs.existsSync(file)) {
      errors.push(`sitemap lists ${loc} but out/${rel} does not exist`);
    } else if (rel.endsWith(".html") && NOINDEX.test(fs.readFileSync(file, "utf8"))) {
      errors.push(`sitemap lists ${loc} but out/${rel} is a noindex (not-found) page`);
    }
  }
  const robots = fs.existsSync(path.join(outDir, "robots.txt"))
    ? fs.readFileSync(path.join(outDir, "robots.txt"), "utf8")
    : "";
  if (robots && !new RegExp(`^Disallow: ${basePath}/admin/\\s*$`, "m").test(robots)) {
    errors.push("robots.txt does not disallow /admin/");
  }

  // ENG-03: not-found shells must not ship (scripts/build.mjs pruneExport); GitHub
  // Pages would serve them with status 200.
  for (const e of entries) {
    if (e.dir && (e.rel === "kit" || e.rel.split("/").pop() === "_none"))
      errors.push(`out/${e.rel}/ is a not-found shell served with status 200 (run npm run build)`);
  }
  // ENG-05: a <meta> CSP only governs what follows it, so it must directly follow
  // <meta charSet> (scripts/build.mjs hoistCsp). /admin/ ships its own head.
  for (const e of entries) {
    if (e.dir || !e.rel.endsWith(".html") || e.rel.startsWith("admin/")) continue;
    const html = fs.readFileSync(path.join(outDir, e.rel), "utf8");
    if (
      html.includes('http-equiv="Content-Security-Policy"') &&
      !html.includes('<meta charSet="utf-8"/><meta http-equiv="Content-Security-Policy"')
    )
      errors.push(`out/${e.rel}: CSP <meta> is not the first tag after <meta charSet>`);
  }

  const hidden = hiddenSlugs(contentDir);
  const pages = entries.filter(
    (e) => !e.dir && e.rel.endsWith(".html") && !e.rel.startsWith("admin/"),
  );
  // Every exported text file outside _next/ (hashed JS/CSS) and admin/ (Decap).
  const textByFile = new Map(
    entries
      .filter(
        (e) =>
          !e.dir &&
          TEXT_EXT.test(e.rel) &&
          !e.rel.startsWith("admin/") &&
          e.rel !== "sitemap.xml" && // checked separately, with its own message
          e.rel !== "robots.txt",
      )
      .map((e) => [e.rel, fs.readFileSync(path.join(outDir, e.rel), "utf8")]),
  );
  // A URL counts when it is root-relative (after a quote, "(", "=", ">" or
  // whitespace) or absolute on the site's own origin (from the sitemap), so an
  // external profile such as https://other.edu/people/<slug>/ never matches.
  const before = [`["'(=>\\s,]`, ...[...origins].map(reEscape)].join("|");
  for (const [collection, slugs] of Object.entries(hidden)) {
    const seg = ROUTES[collection];
    for (const slug of slugs) {
      const pagePath = `${seg}/${slug}/index.html`;
      if (fs.existsSync(path.join(outDir, pagePath))) {
        errors.push(`${collection}/${slug} is not public but out/${pagePath} exists`);
      }
      const href = `${basePath}/${seg}/${slug}/`;
      const urlRe = new RegExp(`(?:${before})${reEscape(href)}`);
      for (const [file, text] of textByFile) {
        if (urlRe.test(text)) {
          errors.push(
            `${collection}/${slug} is not public but out/${file} ${file.endsWith(".html") ? "links to it" : "mentions its URL"}`,
          );
        }
      }
      if (locs.some((l) => l.endsWith(href)))
        errors.push(`${collection}/${slug} is in the sitemap`);
    }
  }
  const counts = Object.fromEntries(Object.entries(hidden).map(([k, v]) => [k, v.length]));
  return { errors, pages: pages.length, sitemapUrls: locs.length, hidden: counts };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const ci = argv.indexOf("--content");
  const contentDir = path.resolve(
    ci >= 0 && argv[ci + 1]
      ? argv[ci + 1]
      : (process.env.CONTENT_DIR ?? path.join(ROOT, "content")),
  );
  const outDir = path.resolve(
    argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--content") ??
      path.join(ROOT, "out"),
  );
  if (!fs.existsSync(outDir)) {
    console.error(`[export-check] ${outDir} not found. Run \`npm run build\` first.`);
    process.exit(2);
  }
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
  const r = checkExport(outDir, { contentDir, basePath });
  console.log(
    `[export-check] ${r.pages} page(s), ${r.sitemapUrls} sitemap URL(s); non-public items checked: ${JSON.stringify(r.hidden)}`,
  );
  for (const e of r.errors) console.error(`  FAIL ${e}`);
  console.log(
    r.errors.length ? `[export-check] ${r.errors.length} problem(s).` : "[export-check] ok.",
  );
  process.exit(r.errors.length ? 1 : 0);
}
