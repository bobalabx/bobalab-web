/**
 * WP7 (brief §I WP7 #6 as amended by the critic; DECISIONS D-06):
 * no name that appears ONLY on the PI site's commented-out roster cards may
 * appear anywhere in the repo. The 12 names are stored as salted SHA-256
 * hashes (wp7-hidden-name-hashes.json), never as text. Failures report the
 * file and token offset only, so a failing run does not print the name.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  hashName,
  loadHashes,
  normalizeName,
  scanText,
} from "../../scripts/import/hidden-names.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TEXT_EXT =
  /\.(md|mdx|ya?ml|json|jsonc|txt|ts|tsx|js|mjs|cjs|css|html|svg|xml|csv|bib|py|toml|ini|sh)$/i;
// The vendored Decap bundle is pinned by SHA-256 to npm decap-cms@3.17.1 (WP6) and has
// 0 matches; scanning its 4.86 MB took 6.3 s and timed the test out (WP6 request 2).
const SKIP =
  /^(node_modules|\.next|out|test-results|playwright-report|coverage)\/|^public\/admin\/decap-cms\.js(\.LICENSE\.txt)?$/;

/** Tracked files plus untracked files that are not ignored (what a commit could include). */
function repoFiles(): string[] {
  try {
    const out = execFileSync(
      "git",
      ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
      {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    return out.split("\0").filter(Boolean);
  } catch {
    // No git: walk the tree.
    const acc: string[] = [];
    const walk = (rel: string) => {
      for (const d of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
        const r = rel ? `${rel}/${d.name}` : d.name;
        if (d.name === ".git" || SKIP.test(`${r}/`)) continue;
        if (d.isDirectory()) walk(r);
        else acc.push(r);
      }
    };
    walk("");
    return acc;
  }
}

describe("WP7: hidden-only roster names never enter the repo", () => {
  const h = loadHashes();

  it("hash file holds the 12 hidden-only cards and no plain names", () => {
    expect(h.count).toBe(12);
    expect(h.hashes.size).toBeGreaterThanOrEqual(12);
    for (const x of h.hashes) expect(x).toMatch(/^[0-9a-f]{64}$/);
  });

  it("scanner detects a hashed name in any order or case (self-test with a fictional name)", () => {
    const fake = {
      salt: h.salt,
      hashes: new Set([hashName(h.salt, normalizeName("Quinby Zorander"))]),
    };
    expect(scanText("Thanks to Quinby Zorander.", fake)).toHaveLength(1);
    expect(scanText("ZORANDER, Quinby (2024)", fake)).toHaveLength(1);
    expect(scanText("quinby-zorander.md", fake)).toHaveLength(1);
    expect(scanText("Quinby Smith and Ada Zorander", fake)).toHaveLength(0);
  });

  it("no tracked or committable text file contains a hidden-only name", () => {
    const files = repoFiles().filter((f) => TEXT_EXT.test(f) && !SKIP.test(f));
    expect(files.length).toBeGreaterThan(50);
    const offenders: string[] = [];
    for (const rel of files) {
      const abs = path.join(ROOT, rel);
      let text: string;
      try {
        text = fs.readFileSync(abs, "utf8");
      } catch {
        continue; // deleted in the working tree
      }
      const hits = scanText(`${rel}\n${text}`, h);
      if (hits.length)
        offenders.push(`${rel} (${hits.length} match(es) at token ${hits.join(", ")})`);
    }
    expect(offenders).toEqual([]);
  });
});
