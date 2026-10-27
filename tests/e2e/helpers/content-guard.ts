/**
 * Content guard for end-to-end tests that save through the CMS (editor v2, WP5;
 * spec §9 "Content safety"). Shared by cms-save.spec.ts (WP5), cms-live.spec.ts
 * (WP4) and cms-local.spec.ts (WP6); the other packages use it read-only.
 *
 * guardFiles() takes a byte snapshot of named files (a missing file is recorded
 * as missing) before a test touches them; restore() writes those bytes back (and
 * deletes a file that did not exist), and assertUnchanged() fails, naming each
 * file, if any of them still differs. guardFolder() records which files of one
 * folder exist, so files a test created there (only those matching `created`,
 * never anybody else's) can be removed and reported.
 *
 * Never use `git checkout` for this: other work in the same tree would be lost.
 *
 *   const guard = guardFiles(["content/site.yml"]);
 *   test.afterAll(() => {
 *     guard.restore();
 *     guard.assertUnchanged();
 *   });
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

export interface ContentGuard {
  /** The guarded files, relative to the root, as given. */
  readonly files: string[];
  /** Files whose bytes (or existence) differ from the snapshot now. */
  changed(): string[];
  /** Write every snapshot back (delete files that did not exist); returns the files it fixed. */
  restore(): string[];
  /** Throw, naming the files, if any differs from its snapshot. */
  assertUnchanged(): void;
}

interface Snap {
  rel: string;
  abs: string;
  bytes: Buffer | null;
}

function read(abs: string): Buffer | null {
  try {
    return fs.readFileSync(abs);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

function same(a: Buffer | null, b: Buffer | null) {
  return a === null || b === null ? a === b : a.equals(b);
}

/** Snapshot the bytes of `files` (paths relative to `root`, default the repository). */
export function guardFiles(files: string[], opts: { root?: string } = {}): ContentGuard {
  const root = opts.root ?? REPO_ROOT;
  const snaps: Snap[] = files.map((rel) => {
    const abs = path.resolve(root, rel);
    if (!abs.startsWith(path.resolve(root) + path.sep))
      throw new Error(`content guard: ${rel} is outside ${root}`);
    return { rel, abs, bytes: read(abs) };
  });
  const changed = () => snaps.filter((s) => !same(read(s.abs), s.bytes)).map((s) => s.rel);
  return {
    files: [...files],
    changed,
    restore() {
      const fixed: string[] = [];
      for (const s of snaps) {
        if (same(read(s.abs), s.bytes)) continue;
        if (s.bytes === null) fs.rmSync(s.abs, { force: true });
        else {
          fs.mkdirSync(path.dirname(s.abs), { recursive: true });
          fs.writeFileSync(s.abs, s.bytes);
        }
        fixed.push(s.rel);
      }
      return fixed;
    },
    assertUnchanged() {
      const c = changed();
      if (c.length)
        throw new Error(
          `content guard: these files are not byte-identical to before the test:\n  ${c.join("\n  ")}`,
        );
    },
  };
}

export interface FolderGuard {
  /** Files (relative to the folder) that are new since the snapshot and match `created`. */
  added(): string[];
  /** Delete those files; returns them. */
  removeAdded(): string[];
  /** Throw if any matching file was added and is still there. */
  assertNoneAdded(): void;
}

/**
 * Record which files exist in `folder` (relative to `root`); files the test
 * creates there that match `created` (e.g. its smoke-entry prefix) can then be
 * removed. Files that do not match are never touched.
 */
export function guardFolder(
  folder: string,
  created: RegExp,
  opts: { root?: string } = {},
): FolderGuard {
  const dir = path.resolve(opts.root ?? REPO_ROOT, folder);
  const list = () => (fs.existsSync(dir) ? fs.readdirSync(dir) : []);
  const before = new Set(list());
  const added = () => list().filter((f) => !before.has(f) && created.test(f));
  return {
    added,
    removeAdded() {
      const a = added();
      for (const f of a) fs.rmSync(path.join(dir, f), { force: true, recursive: true });
      return a;
    },
    assertNoneAdded() {
      const a = added();
      if (a.length)
        throw new Error(
          `content guard: the test left new files in ${folder}:\n  ${a.join("\n  ")}`,
        );
    },
  };
}
