#!/usr/bin/env node
/**
 * Repair App Router prefetch/segment files in a static export built on
 * Windows (DECISIONS D-07, Next issue #85374; WP8).
 *
 * What goes wrong (MEASURED on this machine with Next 16.4.2, 2026-10-20, and
 * read in node_modules/next/dist/export/index.js):
 *   - the exporter collects each page's segment files with `path.relative`,
 *     which yields backslashes on Windows (e.g. `kit\__PAGE__.segment.rsc`);
 *   - `convertSegmentPathToStaticExportFilename` only turns "/" into ".", so
 *     the name becomes `__next.kit\__PAGE__.txt`;
 *   - `path.join` on Windows treats that backslash as a separator, so the file
 *     is written as a FOLDER `out/kit/__next.kit/` containing `__PAGE__.txt`;
 *   - the client router requests `/kit/__next.kit.__PAGE__.txt` (dots, the
 *     same function applied to "/kit/__PAGE__"), gets a 404, and the prefetch
 *     or soft navigation falls back to a slower full load.
 * Root-level files such as `__next._tree.txt` or `__next.__PAGE__.txt` have
 * no nested part and are unaffected.
 *
 * The repair, for every folder in out/ (outside out/_next/) whose name starts
 * with `__next.`: move each file inside it to the parent folder under the name
 * `<folder>.<sub>.<…>.<file>` (the Linux name), then delete the emptied folders.
 * A file name that contains a literal backslash (possible only if such an
 * export is copied to a POSIX file system) is renamed the same way.
 * Idempotent and a safe no-op on a Linux export or when out/ is missing.
 *
 *   node scripts/fix-win-export.mjs [--out out] [--dry-run] [--quiet]
 *
 * scripts/build.mjs runs it automatically after `next build` on win32. CI
 * deploys build on ubuntu-latest and never needs it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PREFIX = "__next.";

/** Every file under `dir`, as path segments relative to it. */
function filesUnder(dir, rel = []) {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (d.isDirectory()) out.push(...filesUnder(path.join(dir, d.name), [...rel, d.name]));
    else out.push([...rel, d.name]);
  }
  return out;
}

function sameContent(a, b) {
  const sa = fs.statSync(a);
  const sb = fs.statSync(b);
  return sa.size === sb.size && fs.readFileSync(a).equals(fs.readFileSync(b));
}

/**
 * @param {string} outDir
 * @param {{ dryRun?: boolean, log?: (msg: string) => void }} [opts]
 * @returns {{ moved: Array<{ from: string, to: string }>, removedDirs: string[], conflicts: string[], scanned: boolean }}
 */
export function fixWinExport(outDir, { dryRun = false, log = () => {} } = {}) {
  const result = { moved: [], removedDirs: [], conflicts: [], scanned: false };
  const root = path.resolve(outDir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return result;
  result.scanned = true;
  const relOut = (p) => path.relative(root, p).split(path.sep).join("/");

  const move = (from, to) => {
    if (fs.existsSync(to)) {
      if (sameContent(from, to)) {
        log(`duplicate ${relOut(from)} (identical to ${relOut(to)}), removed`);
        if (!dryRun) fs.rmSync(from);
        result.moved.push({ from: relOut(from), to: relOut(to) });
        return;
      }
      // The nested copy is the one this build wrote; a different flat file is stale.
      result.conflicts.push(relOut(to));
      log(`replacing stale ${relOut(to)} with ${relOut(from)}`);
    }
    if (!dryRun) fs.renameSync(from, to);
    result.moved.push({ from: relOut(from), to: relOut(to) });
  };

  const walk = (dir) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, d.name);
      if (dir === root && d.name === "_next") continue; // hashed assets only
      if (d.isDirectory() && d.name.startsWith(PREFIX)) {
        for (const parts of filesUnder(abs)) {
          move(path.join(abs, ...parts), path.join(dir, [d.name, ...parts].join(".")));
        }
        if (!dryRun) fs.rmSync(abs, { recursive: true, force: true });
        result.removedDirs.push(relOut(abs));
        continue;
      }
      if (d.isDirectory()) {
        walk(abs);
        continue;
      }
      if (d.name.startsWith(PREFIX) && d.name.includes("\\")) {
        move(abs, path.join(dir, d.name.replace(/\\/g, ".")));
      }
    }
  };
  walk(root);
  return result;
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1]
    : fallback;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outDir = path.resolve(arg("--out", path.join(ROOT, "out")));
  const dryRun = process.argv.includes("--dry-run");
  const quiet = process.argv.includes("--quiet");
  const r = fixWinExport(outDir, { dryRun, log: quiet ? () => {} : (m) => console.log(`  ${m}`) });
  const tag = "[fix-win-export]";
  if (!r.scanned) {
    console.log(`${tag} ${outDir} not found; nothing to do.`);
  } else if (!r.moved.length) {
    console.log(`${tag} no Windows-style segment folders in out/; nothing to do.`);
  } else {
    if (!quiet) for (const m of r.moved.slice(0, 20)) console.log(`  ${m.from} → ${m.to}`);
    if (!quiet && r.moved.length > 20) console.log(`  … and ${r.moved.length - 20} more`);
    console.log(
      `${tag} ${dryRun ? "would repair" : "repaired"} ${r.moved.length} segment file(s) in ` +
        `${r.removedDirs.length} folder(s)${r.conflicts.length ? `, ${r.conflicts.length} stale file(s) replaced` : ""}.`,
    );
  }
}
