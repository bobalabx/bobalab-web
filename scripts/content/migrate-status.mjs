#!/usr/bin/env node
/**
 * Moves publication statuses to the four the lab uses (owner decision,
 * 2026-10-29; `PUBLICATION_STATUS` in src/lib/content/schema.ts):
 *
 *   in-progress, working-paper, preprint  → in-progress     Work in progress
 *   submitted                             → under-review    Under review
 *   major-revision, revise-resubmit       → under-revision  Under revision
 *   published, accepted, forthcoming      → published       Published
 *
 * Working papers and preprints keep their links, so they stay listed as papers
 * (D-05 counts public versions, not statuses). Only the `status:` line of a
 * publication's front matter changes; every other byte stays as it was (line
 * endings included), so a second run changes nothing.
 *
 *   node scripts/content/migrate-status.mjs            content/ and tests/fixtures/content/
 *   node scripts/content/migrate-status.mjs --check    list what would change, exit 1 if anything would
 *   node scripts/content/migrate-status.mjs [--check] <folder>...
 *
 * A folder is searched for `publications/*.md` at any depth. A status that is
 * neither an old nor a new value is reported and left alone (exit 1).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const NEW_STATUS = ["in-progress", "under-review", "under-revision", "published"];

/** Old value → new value (new values map to themselves). */
export const STATUS_MAP = {
  "in-progress": "in-progress",
  "working-paper": "in-progress",
  preprint: "in-progress",
  submitted: "under-review",
  "under-review": "under-review",
  "major-revision": "under-revision",
  "revise-resubmit": "under-revision",
  "under-revision": "under-revision",
  published: "published",
  accepted: "published",
  forthcoming: "published",
};

const FRONT = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
/** A top-level `status:` line, its value optionally quoted and followed by a comment. */
const STATUS_LINE = /^status:([ \t]*)(["']?)([^"'\s#]*)\2([ \t]*(?:#.*)?)$/m;

/**
 * The migrated text of one publication file.
 * @returns {{ text: string, from?: string, to?: string, unknown?: string }}
 *   `from`/`to` when the status changes, `unknown` for a value this script does not know.
 */
export function migrateText(text) {
  const front = FRONT.exec(text);
  if (!front) return { text };
  const block = front[1];
  const line = STATUS_LINE.exec(block.replace(/\r$/gm, ""));
  if (!line) return { text };
  const from = line[3];
  const to = STATUS_MAP[from];
  if (!to) return { text, unknown: from };
  if (to === from) return { text };
  // Rewrite only the value inside the front matter, keeping spacing, quotes and comment.
  const start = front.index + front[0].indexOf(block);
  const at = start + block.search(/^status:/m);
  const end = text.indexOf("\n", at) === -1 ? text.length : text.indexOf("\n", at);
  const old = text.slice(at, end);
  const cr = old.endsWith("\r") ? "\r" : "";
  const next = `status:${line[1]}${line[2]}${to}${line[2]}${line[4]}${cr}`;
  return { text: text.slice(0, at) + next + text.slice(end), from, to };
}

/** Every `publications/*.md` under `dir`. */
export function publicationFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== "node_modules" && !e.name.startsWith(".")) walk(p);
      } else if (e.name.endsWith(".md") && path.basename(d) === "publications") out.push(p);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out.sort();
}

/**
 * Migrate (or, with `check`, only inspect) every publication under `dirs`.
 * @returns {{ changed: {file: string, from: string, to: string}[], unknown: {file: string, value: string}[] }}
 */
export function migrateStatus({
  dirs = [path.join(root, "content"), path.join(root, "tests", "fixtures", "content")],
  check = false,
} = {}) {
  const changed = [];
  const unknown = [];
  for (const file of dirs.flatMap(publicationFiles)) {
    const text = fs.readFileSync(file, "utf8");
    const r = migrateText(text);
    if (r.unknown !== undefined) unknown.push({ file, value: r.unknown });
    if (!r.from) continue;
    changed.push({ file, from: r.from, to: r.to });
    if (!check) fs.writeFileSync(file, r.text);
  }
  return { changed, unknown };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const dirs = args.filter((a) => !a.startsWith("--")).map((a) => path.resolve(a));
  const { changed, unknown } = migrateStatus({ check, ...(dirs.length ? { dirs } : {}) });
  const rel = (f) => path.relative(root, f).split(path.sep).join("/");
  for (const c of changed)
    console.log(`${check ? "needs" : "migrated"} ${rel(c.file)}: ${c.from} → ${c.to}`);
  for (const u of unknown)
    console.error(
      `unknown status "${u.value}" in ${rel(u.file)} (use one of ${NEW_STATUS.join(", ")})`,
    );
  console.log(
    `[migrate-status] ${changed.length} file(s) ${check ? "still need migrating" : "migrated"}${unknown.length ? `, ${unknown.length} unknown` : ""}`,
  );
  process.exitCode = unknown.length || (check && changed.length) ? 1 : 0;
}
