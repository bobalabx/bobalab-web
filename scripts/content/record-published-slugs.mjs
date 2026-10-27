#!/usr/bin/env node
/**
 * Record the slugs that have a public page in a production build into
 * <CONTENT_DIR>/.published-slugs.json (DECISIONS D-05, best effort).
 * The validator then requires a site.yml redirect when one of them disappears.
 *
 *   npm run slugs:record          (run on main after a deploy; commit the file)
 *
 * Plain .mjs (no TypeScript) so it can run anywhere; it mirrors
 * hasLivePage() in src/lib/content/links.ts (validate.ts re-exports it).
 * tests/unit/content-rules/published-slugs-parity.test.ts checks that both
 * give the same slugs. W_PUBLISHED_HIDDEN and E_REDIRECT_MISSING read this file.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

const dir = path.resolve(process.cwd(), process.env.CONTENT_DIR || "content");
const COLLECTIONS = ["directions", "projects", "publications", "people", "news"];
const FM = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---/;

const out = {};
for (const c of COLLECTIONS) {
  const folder = path.join(dir, c);
  if (!fs.existsSync(folder)) continue;
  const slugs = [];
  for (const f of fs
    .readdirSync(folder)
    .filter((x) => x.endsWith(".md"))
    .sort()) {
    const m = FM.exec(fs.readFileSync(path.join(folder, f), "utf8"));
    if (!m) continue;
    let data;
    try {
      data = parse(m[1]) ?? {};
    } catch {
      continue;
    }
    if (data.draft === true) continue;
    if (
      c === "people" &&
      !(data.listed === true && (data.role === "pi" || data.profile_page === true))
    )
      continue;
    slugs.push(f.replace(/\.md$/, ""));
  }
  out[c] = slugs;
}
const file = path.join(dir, ".published-slugs.json");
fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
console.log(
  `wrote ${path.relative(process.cwd(), file)}:`,
  Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])),
);
