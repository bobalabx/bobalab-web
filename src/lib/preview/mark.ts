/**
 * Entry marks for the editor live preview (src/app/editor-preview): the root
 * element of every component that renders ONE entry inside a list, card, row or
 * pearl spreads `{...entryMark(collection, slug)}`, so the preview can find and
 * highlight the entry being edited ("Find my entry").
 *
 * Marks never reach the public site. entryMark() returns {} unless BOTH
 *   - enableEntryMarks() has run (the preview calls it inside a useEffect on
 *     mount; never call it at module top, which would run during the static
 *     prerender), and
 *   - typeof window !== "undefined" (a server render never marks, even after
 *     enabling, because Next's server shares module state between pages).
 * Only server components carry marks: a mark in a client island would add this
 * module to the public pages' JavaScript.
 */

export type MarkCollection =
  "news" | "publications" | "people" | "directions" | "projects" | "opportunities";

let enabled = false;

/** Turn marks on. Call it only in a browser effect (EditorPreview's mount effect). */
export function enableEntryMarks(): void {
  enabled = true;
}

/** `{"data-entry": "<collection>/<slug>"}` in the preview's browser render, else {}. */
export function entryMark(c: MarkCollection, slug: string): { "data-entry"?: string } {
  if (!enabled || typeof window === "undefined") return {};
  return { "data-entry": `${c}/${slug}` };
}
