#!/usr/bin/env node
/**
 * DECISIONS D-05: static redirect stubs for renamed or removed pages.
 * GitHub Pages and `output: "export"` cannot redirect, so for every
 * `site.yml → redirects[] {from, to}` this writes `out/<from>/index.html`:
 * a tiny noindex page with <meta http-equiv="refresh">, rel=canonical and a
 * plain link (works without JS). Runs after `next build` (scripts/build.mjs).
 *
 *   node scripts/content/write-redirects.mjs [--out out] [--content content]
 *
 * Never overwrites a page that Next exported (the validator already rejects a
 * redirect from a live page: E_REDIRECT_CONFLICT); such a redirect is skipped
 * with a warning.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

/** Absolute target URL for `to` (site path → base path + site_url origin). */
export function targetUrl(to, { basePath = "", siteUrl = "" } = {}) {
  if (/^https?:\/\//i.test(to)) return { href: to, canonical: to };
  const href = `${basePath}${to}`;
  const origin = siteUrl ? siteUrl.replace(/\/+$/, "") : "";
  return { href, canonical: origin ? `${origin}${href}` : href };
}

export function stubHtml(to, opts) {
  const { href, canonical } = targetUrl(to, opts);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Moved</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(canonical)}">
<meta http-equiv="refresh" content="0; url=${esc(href)}">
</head>
<body>
<p>This page has moved to <a href="${esc(href)}">${esc(href)}</a>.</p>
</body>
</html>
`;
}

export function writeRedirects({
  outDir = path.join(root, "out"),
  contentDir = process.env.CONTENT_DIR
    ? path.resolve(root, process.env.CONTENT_DIR)
    : path.join(root, "content"),
  basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  log = console,
} = {}) {
  const siteFile = path.join(contentDir, "site.yml");
  if (!fs.existsSync(siteFile) || !fs.existsSync(outDir)) return { written: 0, skipped: 0 };
  const site = YAML.parse(fs.readFileSync(siteFile, "utf8")) ?? {};
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || site.site_url || "";
  let written = 0;
  let skipped = 0;
  for (const r of site.redirects ?? []) {
    if (!r?.from || !r?.to || !/^\/([a-z0-9-]+\/)+$/.test(r.from)) {
      log.warn(`[redirects] skipped invalid entry ${JSON.stringify(r)}`);
      skipped++;
      continue;
    }
    const file = path.join(outDir, ...r.from.split("/").filter(Boolean), "index.html");
    if (fs.existsSync(file)) {
      log.warn(`[redirects] ${r.from} is a live page; redirect skipped`);
      skipped++;
      continue;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, stubHtml(r.to, { basePath, siteUrl }));
    written++;
  }
  if (written || skipped) log.log(`[redirects] ${written} stub(s) written, ${skipped} skipped`);
  return { written, skipped };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = arg("--out");
  const content = arg("--content");
  writeRedirects({
    ...(out ? { outDir: path.resolve(out) } : {}),
    ...(content ? { contentDir: path.resolve(content) } : {}),
  });
}
