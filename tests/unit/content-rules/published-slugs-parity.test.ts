/**
 * scripts/content/record-published-slugs.mjs (the deploy's record-slugs job)
 * writes content/.published-slugs.json, which W_PUBLISHED_HIDDEN and
 * E_REDIRECT_MISSING read. The script is plain .mjs and repeats the rule
 * "which entry has a page on the live site" of hasLivePage
 * (src/lib/content/links.ts); this test runs it on copies of the real content
 * and of fixtures with every visibility switch, and checks it lists exactly the
 * entries hasLivePage says have a live page.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { parseContentFiles, readContentFiles, type VirtualFile } from "@/lib/content/read";
import { hasLivePage } from "@/lib/content/links";
import { COLLECTION_ROUTES, type CollectionName } from "@/lib/content/schema";
import { Files } from "../../content/helpers";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const SCRIPT = path.join(ROOT, "scripts", "content", "record-published-slugs.mjs");
const REAL = path.join(ROOT, "content");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "published-slugs-"));
let n = 0;

afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

function write(files: VirtualFile[]): string {
  const dir = path.join(TMP, String(++n));
  for (const f of files) {
    const abs = path.join(dir, f.path);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, f.text);
  }
  return dir;
}

/** What the script records for a content folder. */
function recorded(dir: string): Record<string, string[]> {
  const r = spawnSync(process.execPath, [SCRIPT], {
    cwd: dir,
    env: { ...process.env, CONTENT_DIR: dir },
    encoding: "utf8",
  });
  expect(r.status, r.stderr).toBe(0);
  return JSON.parse(fs.readFileSync(path.join(dir, ".published-slugs.json"), "utf8"));
}

/** What hasLivePage says, for every collection with pages of its own. */
function expected(files: VirtualFile[]): Record<string, string[]> {
  const raw = parseContentFiles(files);
  const out: Record<string, string[]> = {};
  for (const c of Object.keys(COLLECTION_ROUTES) as CollectionName[]) {
    if (!COLLECTION_ROUTES[c]) continue;
    const list = raw.entries[c] as unknown as Array<{ slug: string }>;
    out[c] = list
      .filter((e) => hasLivePage(c, e as never))
      .map((e) => e.slug)
      .sort();
  }
  return out;
}

function same(files: VirtualFile[]) {
  const got = recorded(write(files));
  const want = expected(files);
  for (const c of Object.keys(want)) expect([...(got[c] ?? [])].sort(), c).toEqual(want[c]);
  expect(Object.keys(got).sort()).toEqual(Object.keys(want).sort());
  return got;
}

describe("record-published-slugs.mjs lists exactly the entries hasLivePage gives a live page", () => {
  it("on the real content", () => {
    const files = readContentFiles(REAL).filter((f) => f.path !== ".published-slugs.json");
    const got = same(files);
    expect(Object.values(got).flat().length).toBeGreaterThan(10);
  });

  it("with Draft on, Listed off, no profile page, a PI and a profile page", () => {
    const f = Files.of("n4")
      .edit("directions/advice.md", (d) => void (d.draft = true))
      .copy("people/avery-example.md", "people/casey-example.md", (d) => {
        d.name = "Casey Example";
        d.role = "phd";
        delete d.title;
        d.profile_page = false;
      })
      .copy("people/avery-example.md", "people/dana-example.md", (d) => {
        d.name = "Dana Example";
        d.role = "phd";
        delete d.title;
        d.profile_page = true;
      })
      .copy("people/avery-example.md", "people/eli-example.md", (d) => {
        d.name = "Eli Example";
        d.listed = false;
      })
      .copy("people/avery-example.md", "people/fay-example.md", (d) => {
        d.name = "Fay Example";
        d.draft = true;
      });
    const got = same(f.files);
    expect(got.people).toContain("dana-example");
    expect(got.people).not.toContain("casey-example");
    expect(got.people).not.toContain("eli-example");
    expect(got.people).not.toContain("fay-example");
    expect(got.directions).not.toContain("advice");
  });

  it("names links.ts as the rule it mirrors (validate.ts only re-exports it)", () => {
    expect(fs.readFileSync(SCRIPT, "utf8")).toContain("src/lib/content/links.ts");
  });
});
