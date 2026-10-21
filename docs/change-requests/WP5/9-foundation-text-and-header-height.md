# WP5 request 9: three small foundation fixes found in the WP5 review

- File(s): `src/lib/content/markdoc.ts`, `src/styles/tokens.css` (WP0)
- Why (MEASURED on http://localhost:3100, 2026-10-20):
  1. **`markdownToText()` puts a space before punctuation that follows a link or other inline element.** It replaces every tag with a space, so `[x@y.edu](mailto:x@y.edu).` becomes `x@y.edu .`. The `/join/` meta description read "…One address reaches the lab: bobalab@berkeley.edu ." (WP5 now tidies it locally in `src/app/join/page.tsx`); other pages that build descriptions from Markdown have the same problem.
  2. **`--header-h` (4rem = 64 px) is 5 px shorter than the sticky site header** (`.bl-header` measures 69 px at 1366 px). `html { scroll-padding-top: calc(var(--header-h) + var(--s-4)) }` therefore leaves 11 px, not 16 px, between the header and an anchor target or a focused element (WCAG 2.4.11 still passes), and sticky elements placed at `top: var(--header-h)` sit 5 px under the header.
  3. **Site-relative links in Markdown are not base-path aware.** The Markdoc `link` node in `markdoc.ts` emits `href="/publications/"` as written, so with `NEXT_PUBLIC_BASE_PATH` set (the project-site fallback, brief §D2 "Base path") every internal link inside `Prose` (About, Join, statements, news bodies) points outside the site. The RSS feed already makes them absolute (WP5 `absolutizeHtml`).
- Proposed change:
  ```diff
  // src/lib/content/markdoc.ts, markdownToText
  -    .replace(/<[^>]+>/g, " ")
  +    // Block tags separate words; inline tags (a, strong, em, code…) do not.
  +    .replace(/<\/?(?:p|li|ul|ol|h[1-6]|blockquote|pre|tr|td|th|table|br|hr)\b[^>]*>/gi, " ")
  +    .replace(/<[^>]+>/g, "")
  ```
  ```diff
  // src/styles/tokens.css
  -  --header-h: 4rem;
  +  --header-h: 4.3125rem; /* matches .bl-header (69 px incl. border) */
  ```
  (or make `.bl-header` exactly `height: var(--header-h)` with `box-sizing: border-box`).
  ```diff
  // src/lib/content/markdoc.ts, link transform
  -        const attrs: Record<string, string> = { href };
  +        const attrs: Record<string, string> = { href: isExternal(href) ? href : withBasePath(href) };
  ```
  (`withBasePath` from `src/lib/site/paths.ts` leaves `mailto:`, `#…` and absolute URLs alone.)
- Blocking? no. WP5 works around 1 in its own file; 3 only matters with a base path.
- Test that proves it: a unit test `markdownToText("Email [a@b.c](mailto:a@b.c).") === "Email a@b.c."`; in Playwright, `.bl-header` height equals the computed `--header-h` at ≥ 48rem.
