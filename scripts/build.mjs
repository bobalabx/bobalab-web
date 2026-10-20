#!/usr/bin/env node
/**
 * Cross-platform build wrapper (no cross-env dependency).
 *
 *   npm run build           → production static export (drafts excluded)
 *   npm run build:preview   → INCLUDE_DRAFTS=1 (drafts + preview ribbon)
 *
 * After `next build`, on Windows only, runs scripts/fix-win-export.mjs if it
 * exists (DECISIONS D-07; that script is owned by WP8). CI builds on Linux.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const preview = process.argv.includes("--preview");
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? "1" };
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
  if (existsSync(fixer)) {
    const f = spawnSync(process.execPath, [fixer], { cwd: root, env, stdio: "inherit" });
    if (f.status !== 0) process.exit(f.status ?? 1);
  } else {
    console.warn(
      "[build] Windows: scripts/fix-win-export.mjs not present yet (WP8, D-07); out/ prefetch paths may be broken.",
    );
  }
}
