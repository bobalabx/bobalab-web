/**
 * Provenance of a paper's awards and talks (CON-03, CONTENT-QUESTIONS D11).
 *
 * Statuses the lab reports itself are shown as "reported by the lab"
 * (brief §D7). Awards and talks known only from the PI's CV or site get the
 * same wording, so they do not look like ones an awarding body or a
 * programme page confirms.
 *
 * - Talks: a presentation's `url` is its independent evidence (schema
 *   comment on `presentations`; the importer sets it only for DOCUMENTED
 *   talks). No `url` means the lab's own report.
 * - Awards: an optional `source: "self-reported"` marks those (the importer
 *   sets it when the dataset label says "PI-reported only"; schema field
 *   `awards[].source`, docs/change-requests/verify/publications-1.md).
 */

export const SELF_REPORTED_WORDING = "reported by the lab";
/** The same wording opening a line of its own. */
export const SELF_REPORTED_LABEL = "Reported by the lab";

/** Optional provenance field on an award (same values as `status_source`). */
type AwardSource = { source?: "documented" | "self-reported" };

export function isSelfReportedAward(award: object): boolean {
  return (award as AwardSource).source === "self-reported";
}

export function isSelfReportedTalk(talk: { url?: string }): boolean {
  return !talk.url;
}
