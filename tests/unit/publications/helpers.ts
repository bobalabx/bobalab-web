/** Shared helpers for the WP3 unit tests. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildContent, loadRawContent } from "@/lib/content/load";
import type { PublicationEntry } from "@/lib/content/schema";

export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const CONTENT = path.join(ROOT, "content");
export const FIXTURES = path.join(ROOT, "tests/fixtures/content");
export const GOLDEN = fileURLToPath(new URL("./golden/", import.meta.url));
export const TODAY = "2026-10-20";

/** The five published journal papers (brief §I WP3 #3, R2 §3). */
export const PUBLISHED_PAPERS = [
  "allon-2023-gig-drivers",
  "bastani-2026-rl-tips",
  "jiang-2025-learning-on-the-go",
  "keppler-2025-making-chatgpt-work",
  "sinchaisri-2021-community-vibrancy",
] as const;

/** Raw publication entries from the real content folder (drafts included). */
export function contentPublications(): Map<string, PublicationEntry> {
  const raw = loadRawContent(CONTENT);
  return new Map(raw.entries.publications.map((p) => [p.slug, p]));
}

export const loadContent = (dir = CONTENT, preview = true) =>
  buildContent(loadRawContent(dir), { preview, today: TODAY });

export const hasContent = fs.existsSync(path.join(CONTENT, "publications"));

export function readGolden(name: string): string | null {
  const file = path.join(GOLDEN, name);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : null;
}

/** UPDATE_GOLDEN=1 rewrites golden files (review the diff before committing!). */
export function writeGoldenIfAsked(name: string, value: string): boolean {
  if (process.env.UPDATE_GOLDEN !== "1") return false;
  fs.mkdirSync(GOLDEN, { recursive: true });
  fs.writeFileSync(path.join(GOLDEN, name), value.endsWith("\n") ? value : `${value}\n`);
  return true;
}
