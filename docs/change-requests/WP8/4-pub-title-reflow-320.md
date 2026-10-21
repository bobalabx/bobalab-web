# WP8 request 4: paper titles overflow the column at 320 px (WCAG 1.4.10)

- File(s): `src/components/publications/publications.css` (WP3)
- Why: brief §G1 requires no horizontal scrolling at 320 CSS px (WCAG 1.4.10). MEASURED by the WP8 reviewer on the shared dev server, 2026-10-20, Chromium at 320×640: `/publications/jiang-2025-learning-on-the-go/` scrolls sideways (`scrollWidth 321 > 320`). Cause: `.pub-head` is a grid with `justify-items: start`, so each item is sized fit-content, whose floor is the min-content width. The longest word of the 36 px title ("Recommendation") is 305 px wide while the column is 288 px, so the title runs 17 px into the right gutter and past the screen edge. `overflow-wrap: break-word` (inherited from `body`) does not lower min-content, so it cannot help. Every other page linked from the section indexes (80 pages) passes at 320 px.
- Proposed change (verified by injecting it into the page: `scrollWidth` 320, title right edge 304 px, "Recom-mendation" hyphenated):
  ```diff
   .pub-title {
     margin-top: var(--s-1);
  +  hyphens: auto; /* <html lang="en"> → "Recom-mendation" instead of an overflow */
  +  overflow-wrap: anywhere; /* lowers min-content; fallback where no hyphenation point exists */
   }
  ```
  `grid-template-columns: minmax(0, 1fr)` on `.pub-head` alone does NOT fix it (measured: still 321) because of `justify-items: start`. The same pattern (a display-size heading inside a `justify-items: start` grid or a flex row) is worth a glance in the project, news and direction headers, although none of today's titles trigger it.
- Blocking? no (1.4 px of sideways scroll on one page today). WP8's new reflow test fails until it lands.
- Test that proves it: `A11Y_SAMPLE=1000 npx playwright test tests/e2e/a11y-sitewide.spec.ts -g "reflow" --project=chromium` on the dev server ("no horizontal scrolling at 320 CSS px on any page").
