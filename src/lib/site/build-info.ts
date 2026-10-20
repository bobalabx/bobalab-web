/**
 * Build-time facts: the "Last updated" date shown in the footer.
 * Order: LAST_UPDATED env (CI may pass the HEAD commit date) → git HEAD
 * commit date → build date. Always 'YYYY-MM-DD' in America/Los_Angeles.
 */
import { execFileSync } from "node:child_process";
import { todayInLab } from "@/lib/content/dates";

let cached: string | undefined;

export function lastUpdated(): string {
  if (cached) return cached;
  const env = process.env.LAST_UPDATED;
  if (env && /^\d{4}-\d{2}-\d{2}/.test(env)) return (cached = todayInLab(new Date(env)));
  try {
    const iso = execFileSync("git", ["log", "-1", "--format=%cI"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
    if (iso) return (cached = todayInLab(new Date(iso)));
  } catch {
    // not a git checkout (e.g. a tarball build) — fall through
  }
  return (cached = todayInLab());
}
