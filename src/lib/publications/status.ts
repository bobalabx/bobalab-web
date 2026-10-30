/**
 * The review status in words (owner decision 2026-10-29: four statuses, see
 * PUBLICATION_STATUS in src/lib/content/schema.ts). One place for the rules,
 * so the ledger rows, the in-progress lists, news and the paper page agree:
 *
 *   "Under revision at Operations Research"  status + its note
 *   "Under review at Production and …"       an old "to …" note reads "at …"
 *   "Work in progress, v2"                   a note that does not continue
 *                                            the sentence follows a comma
 *   (nothing)                                Published; and Work in progress
 *                                            on a working paper or a work in
 *                                            progress, which only repeats the
 *                                            type word ("Working paper")
 *
 * No "as of" date and no provenance note (copy sweep, docs/CONTENT-QUESTIONS.md).
 * Pure; safe anywhere.
 */
import type { PublicationEntry, PublicationType } from "@/lib/content/schema";
import { PUBLICATION_STATUS_LABELS } from "@/components/ui/labels";

export type StatusFields = Pick<PublicationEntry, "status" | "status_note"> & {
  /** Without the type, a bare Work in progress is always stated. */
  type?: PublicationType;
  venue?: string;
};

/** A note that carries on the sentence: "at Management Science", "(second round)". */
const CONTINUES = /^(?:(?:at|to|in|with|for|from|by|on|under|after|since)\s|\()/;

/** "Under revision at Operations Research"; "Work in progress, v2". */
export function statusPhrase(p: Pick<StatusFields, "status" | "status_note">): string {
  const label = PUBLICATION_STATUS_LABELS[p.status];
  let note = p.status_note?.trim();
  if (!note) return label;
  // A paper is under review "at" a journal; "to …" is left from the old "Submitted to …".
  if (p.status === "under-review" || p.status === "under-revision")
    note = note.replace(/^to\s+/, "at ");
  return CONTINUES.test(note) ? `${label} ${note}` : `${label}, ${note}`;
}

/** Work in progress on a working paper or a work in progress says only what the type says. */
function repeatsType(p: StatusFields): boolean {
  return (
    p.status === "in-progress" && (p.type === "working-paper" || p.type === "work-in-progress")
  );
}

/**
 * The status worth stating on the paper page, or null: never for a published
 * paper, nor for a bare Work in progress that repeats the type word.
 */
export function reviewStatus(p: StatusFields): string | null {
  if (p.status === "published") return null;
  if (!p.status_note?.trim() && repeatsType(p)) return null;
  return statusPhrase(p);
}

/**
 * The status in a list row (publications ledger, direction and project lists,
 * news): as on the paper page, but after an "arXiv preprint" venue a note
 * that is only the version ("v2") is left out (the paper page still gives it).
 */
export function rowStatus(p: StatusFields): string | null {
  if (
    p.status === "in-progress" &&
    /^v\d+$/i.test(p.status_note?.trim() ?? "") &&
    /\b(?:preprint|arxiv)\b/i.test(p.venue ?? "")
  )
    return null;
  return reviewStatus(p);
}
