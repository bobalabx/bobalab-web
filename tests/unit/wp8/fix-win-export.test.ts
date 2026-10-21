/**
 * WP8 / DECISIONS D-07: scripts/fix-win-export.mjs on a synthetic out/.
 *
 * The fixture reproduces what `next build` writes on Windows (MEASURED in this
 * repo's out/ on 2026-10-20: `out/kit/__next.kit/__PAGE__.txt`). The expected
 * names are computed with Next's own `convertSegmentPathToStaticExportFilename`,
 * the function the client router uses to build the prefetch URL, so the test
 * proves the repaired files are exactly the ones the browser asks for.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { convertSegmentPathToStaticExportFilename } from "next/dist/shared/lib/segment-cache/segment-value-encoding.js";
import { fixWinExport } from "../../../scripts/fix-win-export.mjs";

const SCRIPT = fileURLToPath(new URL("../../../scripts/fix-win-export.mjs", import.meta.url));
const tmp: string[] = [];
afterEach(() => {
  for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function write(root: string, rel: string, body = rel) {
  const f = path.join(root, ...rel.split("/"));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body);
}

function list(root: string): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const d of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${d.name}` : d.name;
      if (d.isDirectory()) walk(r);
      else out.push(r);
    }
  };
  walk("");
  return out.sort();
}

/** What Next writes on Windows for a page's segment path (backslash → folder). */
function windowsName(segmentPath: string) {
  return convertSegmentPathToStaticExportFilename(
    segmentPath.replace(/\//g, "\\").replace(/^\\/, "/"),
  )
    .split("\\")
    .join("/");
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wp8-winexport-"));
  tmp.push(root);
  // Unaffected root-level files and assets.
  write(root, "index.html");
  write(root, "__next._tree.txt");
  write(root, "__next.__PAGE__.txt");
  write(root, "_next/static/chunks/a.js");
  write(root, "_next/static/__next.not-a-segment/keep.txt"); // inside _next: never touched
  // /kit/ page segment, written the Windows way.
  write(root, `kit/${windowsName("/kit/__PAGE__")}`, "kit page");
  write(root, "kit/__next._tree.txt");
  // A dynamic route two levels deep with a layout segment file next to the folder.
  write(root, `research/ai-at-work/${windowsName("/research/$d$direction/__PAGE__")}`, "direction");
  write(root, "research/ai-at-work/__next.research.txt", "layout");
  write(root, "research/ai-at-work/index.html");
  // Parallel-route style nesting (@slot) three levels deep.
  write(root, `news/${windowsName("/news/@modal/(.)x/__PAGE__")}`, "slot");
  return root;
}

describe("fix-win-export", () => {
  it("the fixture really is the Windows shape (nested __next.* folders)", () => {
    expect(windowsName("/kit/__PAGE__")).toBe("__next.kit/__PAGE__.txt");
  });

  it("moves nested segment files to the names the client requests", () => {
    const root = fixture();
    const r = fixWinExport(root);
    expect(r.scanned).toBe(true);
    expect(r.moved).toHaveLength(3);
    expect(r.removedDirs.sort()).toEqual(
      ["kit/__next.kit", "news/__next.news", "research/ai-at-work/__next.research"].sort(),
    );
    const files = list(root);
    for (const [dir, seg] of [
      ["kit", "/kit/__PAGE__"],
      ["research/ai-at-work", "/research/$d$direction/__PAGE__"],
      ["news", "/news/@modal/(.)x/__PAGE__"],
    ] as const) {
      expect(files).toContain(`${dir}/${convertSegmentPathToStaticExportFilename(seg)}`);
    }
    expect(fs.readFileSync(path.join(root, "kit", "__next.kit.__PAGE__.txt"), "utf8")).toBe(
      "kit page",
    );
    // Untouched: root files, the layout segment file, _next/.
    expect(files).toContain("__next._tree.txt");
    expect(files).toContain("research/ai-at-work/__next.research.txt");
    expect(files).toContain("_next/static/__next.not-a-segment/keep.txt");
    expect(
      files.some(
        (f) =>
          f
            .split("/")
            .slice(0, -1)
            .some((s) => s.startsWith("__next.")) && !f.startsWith("_next/"),
      ),
    ).toBe(false);
  });

  it("is idempotent and a no-op on a Linux-shaped export", () => {
    const root = fixture();
    fixWinExport(root);
    const before = list(root);
    const again = fixWinExport(root);
    expect(again.moved).toEqual([]);
    expect(list(root)).toEqual(before);
  });

  it("dry run reports without touching files", () => {
    const root = fixture();
    const before = list(root);
    const r = fixWinExport(root, { dryRun: true });
    expect(r.moved).toHaveLength(3);
    expect(list(root)).toEqual(before);
  });

  it("removes an identical duplicate; replaces a different (stale) flat file", () => {
    const root = fixture();
    write(root, "kit/__next.kit.__PAGE__.txt", "kit page"); // identical
    write(root, "research/ai-at-work/__next.research.$d$direction.__PAGE__.txt", "stale");
    const r = fixWinExport(root);
    expect(r.conflicts).toEqual(["research/ai-at-work/__next.research.$d$direction.__PAGE__.txt"]);
    expect(
      fs.readFileSync(
        path.join(root, "research/ai-at-work/__next.research.$d$direction.__PAGE__.txt"),
        "utf8",
      ),
    ).toBe("direction");
    expect(fs.existsSync(path.join(root, "kit", "__next.kit"))).toBe(false);
  });

  it.skipIf(process.platform === "win32")(
    "renames literal backslash file names (export copied to a POSIX file system)",
    () => {
      const root = fixture();
      fs.writeFileSync(path.join(root, "kit", "__next.kit\\extra.txt"), "x");
      fixWinExport(root);
      expect(fs.existsSync(path.join(root, "kit", "__next.kit.extra.txt"))).toBe(true);
    },
  );

  it("missing out/ is a safe no-op (CLI exits 0)", () => {
    const missing = path.join(os.tmpdir(), `wp8-missing-${process.pid}-${Date.now()}`);
    expect(fixWinExport(missing).scanned).toBe(false);
    const r = spawnSync(process.execPath, [SCRIPT, "--out", missing], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("nothing to do");
  });

  it("CLI repairs a fixture and reports the count", () => {
    const root = fixture();
    const r = spawnSync(process.execPath, [SCRIPT, "--out", root, "--quiet"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/repaired 3 segment file\(s\) in 3 folder\(s\)/);
  });
});
