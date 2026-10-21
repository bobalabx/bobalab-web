#!/usr/bin/env node
/**
 * Cross-platform build wrapper (no cross-env dependency).
 *
 *   npm run build           → production static export (drafts excluded)
 *   npm run build:preview   → INCLUDE_DRAFTS=1 (drafts + preview ribbon)
 *
 * After `next build`: the D-05 redirect stubs; on Windows only,
 * scripts/fix-win-export.mjs (DECISIONS D-07; CI builds on Linux); then two
 * post-export steps on out/ (exported below for tests/unit/foundation):
 *   - pruneExport: drops pages that only exist because static export needs a
 *     param or a route file, and that render the not-found UI with no server-side
 *     404: out/kit/ (unless NEXT_PUBLIC_KIT=1) and every `_none` placeholder
 *     folder (src/lib/content/queries.ts EMPTY_PARAM). GitHub Pages then answers
 *     those URLs with 404.html and a real 404 status (verify ENG-03).
 *   - hoistCsp: moves the CSP <meta> to directly after <meta charSet>. Next puts
 *     <head> children from the layout after its hoisted fonts, stylesheets and
 *     scripts, and a <meta> policy only governs what comes after it (verify ENG-05).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Placeholder param for empty static routes (keep in sync with EMPTY_PARAM). */
export const EMPTY_PARAM = "_none";

/** Every directory (relative, "/"-separated) under `dir`, skipping out/_next. */
function dirs(dir, rel = "") {
  const out = [];
  for (const d of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const r = rel ? `${rel}/${d.name}` : d.name;
    if (r === "_next") continue;
    out.push(r, ...dirs(dir, r));
  }
  return out;
}

/**
 * Remove not-found shells from a static export. Returns the removed paths.
 * @param {string} outDir
 * @param {{ kit?: boolean }} [opts] kit: true keeps out/kit/ (NEXT_PUBLIC_KIT=1)
 */
export function pruneExport(outDir, { kit = false } = {}) {
  const removed = [];
  const targets = dirs(outDir).filter(
    (r) => (!kit && r === "kit") || r.split("/").pop() === EMPTY_PARAM,
  );
  for (const r of targets) {
    const abs = path.join(outDir, r);
    if (!fs.existsSync(abs)) continue; // inside an already removed folder
    fs.rmSync(abs, { recursive: true, force: true });
    removed.push(`${r}/`);
  }
  return removed;
}

const CHARSET = '<meta charSet="utf-8"/>';
const CSP_META = /<meta http-equiv="Content-Security-Policy" content="[^"]*"\s*\/?>/;

/** One page: the CSP <meta> right after <meta charSet>. Unchanged if either is missing. */
export function hoistCspInHtml(html) {
  const m = CSP_META.exec(html);
  const at = html.indexOf(CHARSET);
  if (!m || at < 0 || m.index < at) return html;
  const without = html.slice(0, m.index) + html.slice(m.index + m[0].length);
  const end = at + CHARSET.length;
  return without.slice(0, end) + m[0] + without.slice(end);
}

/** Every exported page except the CMS (public/admin ships its own head). Returns the count changed. */
export function hoistCsp(outDir) {
  let changed = 0;
  const pages = ["", ...dirs(outDir)]
    .filter((r) => r !== "admin" && !r.startsWith("admin/"))
    .flatMap((r) =>
      fs
        .readdirSync(path.join(outDir, r))
        .filter((f) => f.endsWith(".html"))
        .map((f) => path.join(outDir, r, f)),
    );
  for (const file of pages) {
    const html = fs.readFileSync(file, "utf8");
    const next = hoistCspInHtml(html);
    if (next !== html) {
      fs.writeFileSync(file, next);
      changed++;
    }
  }
  return changed;
}

function main() {
  const preview = process.argv.includes("--preview");
  const env = {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? "1",
  };
  if (preview) env.INCLUDE_DRAFTS = "1";
  else if (env.INCLUDE_DRAFTS === "1") {
    console.warn(
      "[build] INCLUDE_DRAFTS=1 is set in the environment: this production build will include drafts.",
    );
  }

  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  console.log(
    `[build] next build (${preview ? "preview: drafts included" : "production: drafts excluded"})`,
  );
  const r = spawnSync(process.execPath, [nextBin, "build"], { cwd: root, env, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);

  // D-05: static redirect stubs from site.yml → redirects[].
  const redirects = spawnSync(
    process.execPath,
    [path.join(root, "scripts", "content", "write-redirects.mjs")],
    { cwd: root, env, stdio: "inherit" },
  );
  if (redirects.status !== 0) process.exit(redirects.status ?? 1);

  const fixer = path.join(root, "scripts", "fix-win-export.mjs");
  if (process.platform === "win32") {
    if (fs.existsSync(fixer)) {
      const f = spawnSync(process.execPath, [fixer], { cwd: root, env, stdio: "inherit" });
      if (f.status !== 0) process.exit(f.status ?? 1);
    } else {
      console.warn(
        "[build] Windows: scripts/fix-win-export.mjs not present yet (WP8, D-07); out/ prefetch paths may be broken.",
      );
    }
  }

  const out = path.join(root, "out");
  const removed = pruneExport(out, { kit: env.NEXT_PUBLIC_KIT === "1" });
  if (removed.length) console.log(`[build] removed not-found shells: ${removed.join(", ")}`);
  console.log(`[build] CSP <meta> moved to the top of <head> in ${hoistCsp(out)} page(s)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
