/**
 * Build-time content loader (server only; reads the file system).
 *
 *   import { getContent, isPreview } from "@/lib/content/load";
 *   const c = getContent();          // memoised per process
 *
 * Draft handling (DECISIONS D-03):
 *   - preview (drafts INCLUDED): NODE_ENV === "development" (unless INCLUDE_DRAFTS === "0"),
 *     or INCLUDE_DRAFTS === "1" (npm run build:preview);
 *   - otherwise drafts are excluded (npm run build).
 * CONTENT_DIR (default ./content) selects the content folder, e.g.
 *   CONTENT_DIR=tests/fixtures/content/n4 npm run dev
 *
 * Structural problems (YAML/schema) throw, so a broken file fails the build.
 * Publish-readiness rules live in ./validate.ts (npm run validate).
 */
import { contentDir, parseContentFiles, readContentFiles, type RawContent } from "./read";
import { todayInLab } from "./dates";
import { buildContent, type BuildOptions, type Content } from "./build";

// The pure pipeline (views, Content, buildContent, DEFAULT_SITE, ContentError) lives
// in ./build.ts, so the browser can run it too; this module adds the file system.
export * from "./build";

// ---------------------------------------------------------------------------
// Modes

export function isPreview(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.INCLUDE_DRAFTS === "1") return true;
  if (env.INCLUDE_DRAFTS === "0") return false;
  return env.NODE_ENV === "development";
}

// ---------------------------------------------------------------------------
// Entry point

const cache = new Map<string, Content>();

export function loadRawContent(dir: string = contentDir()): RawContent {
  return parseContentFiles(readContentFiles(dir));
}

export function getContent(opts: Partial<BuildOptions> = {}): Content {
  const dir = opts.dir ?? contentDir();
  const preview = opts.preview ?? isPreview();
  const today = opts.today ?? todayInLab();
  // No memo in `next dev`, so CMS edits show up on reload (cms:local demo).
  const memo = process.env.NODE_ENV !== "development";
  const key = `${dir}|${preview}|${today}`;
  const hit = memo ? cache.get(key) : undefined;
  if (hit) return hit;
  const content = buildContent(loadRawContent(dir), { preview, today, dir });
  if (memo) cache.set(key, content);
  return content;
}

/** For tests. */
export function clearContentCache(): void {
  cache.clear();
}
