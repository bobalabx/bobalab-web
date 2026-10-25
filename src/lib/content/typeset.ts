/**
 * Straight quotes to typographic ones, for display text only (change request
 * redesign/content-4a). Editors type straight quotes in the CMS; component strings
 * use typographic ones, and a page that mixes both reads as assembled text.
 *
 * Applied at render time only: Markdoc text nodes (inline `code` is its own node and
 * is never passed here) and the plain display fields the loader exposes. Never used
 * on stored content, on titles that feed APA/BibTeX, or on URLs, DOIs and slugs.
 */
const OPEN_BEFORE = "(^|[\\s(\\[{—–\\-/“‘])";

export function typeset(s: string): string {
  if (!s || !/['"]/.test(s)) return s;
  return (
    s
      // Apostrophe inside a word: lab's, don't, drivers'
      .replace(/(\p{L}|\p{N})'(?=\p{L}|\p{N})/gu, "$1’")
      // A text node that starts with "'s" follows inline markup (**Park**'s): apostrophe
      .replace(/^'(?=s\b)/u, "’")
      // Year elision: '26
      .replace(new RegExp(`${OPEN_BEFORE}'(?=\\d{2}\\b)`, "gu"), "$1’")
      // Opening single after a space, bracket or dash
      .replace(new RegExp(`${OPEN_BEFORE}'`, "gu"), "$1‘")
      // Anything left is a closing single or a plural possessive (drivers')
      .replace(/'/g, "’")
      // Opening double, then closing double
      .replace(new RegExp(`${OPEN_BEFORE}"`, "gu"), "$1“")
      .replace(/"/g, "”")
  );
}

/** `typeset` for an optional field. */
export function typesetOpt<T extends string | undefined | null>(s: T): T {
  return (typeof s === "string" ? typeset(s) : s) as T;
}
