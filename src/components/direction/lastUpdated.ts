/**
 * "Last updated {date}" for a direction page (§D5.11), server only.
 *
 * The date is the newest git commit that touched any content file the page is
 * built from (the direction itself, its projects and its papers). One `git log`
 * call per page, memoised. Without git (a tarball build) or with no history for
 * those files, it falls back to the site-wide date from build-info.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { todayInLab } from "@/lib/content/dates";
import { lastUpdated as siteLastUpdated } from "@/lib/site/build-info";

const memo = new Map<string, string>();

/** @param files content-relative paths (entry.file), e.g. "directions/ai-at-work.md" */
export function contentLastUpdated(contentDir: string, files: readonly string[]): string {
  const abs = [...new Set(files)].filter(Boolean).map((f) => path.join(contentDir, f));
  const key = abs.join("|");
  const hit = process.env.NODE_ENV !== "development" ? memo.get(key) : undefined;
  if (hit) return hit;
  let value = "";
  if (abs.length && !process.env.LAST_UPDATED) {
    try {
      const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...abs], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 5000,
      }).trim();
      if (iso) value = todayInLab(new Date(iso));
    } catch {
      // not a git checkout: fall back below
    }
  }
  if (!value) value = siteLastUpdated();
  memo.set(key, value);
  return value;
}
