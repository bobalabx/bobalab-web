# WP1 request 6: move the "morph companion" view-transition rules into motion.css

- File(s): src/styles/motion.css (WP0); src/components/figure/figure.css (WP1, remove after)
- Why: every Fig. 1 pearl carries its `pearl-{slug}` name (any of them can be the morph source). On a pearl click, the OTHER pearls therefore become exit-only view-transition groups with the `.pearl-morph` class, so they inherited the 420 ms morph duration and stayed visible as pale discs over the destination page for ~270 ms after the page swap (MEASURED, Chromium, frozen frames `test-results/WP1/review/_morph-sheet.png` at 240 ms: ghost pearls over "Why it matters"). The same happens in reverse (enter-only pearls on the way back to home). WP1 fixed it inside `figure.css` because figure.css is loaded wherever a named pearl exists, but brief §I gives all view-transition rules to `motion.css`.
- Proposed change (motion.css, inside the no-preference gate; the existing reduced-motion `!important` rules still win):

  ```css
  @media (prefers-reduced-motion: no-preference) {
    :root:not([data-motion="reduce"])::view-transition-old(.pearl-morph):only-child {
      animation-duration: var(--dur-page-exit);
      animation-timing-function: var(--ease-in);
    }
    :root:not([data-motion="reduce"])::view-transition-new(.pearl-morph):only-child {
      animation-duration: var(--dur-page-enter);
      animation-delay: var(--dur-page-exit);
      animation-timing-function: var(--ease-out);
    }
  }
  ```

  Then delete the same block (comment "Morph companions") from `src/components/figure/figure.css`.

- Blocking? no (the rules already live in figure.css).
- Test that proves it: `tests/e2e/figure.spec.ts` "Enter opens the direction…" asserts every `::view-transition-old(pearl-<other>)` animation is ≤ 150 ms; "reduced motion: every view-transition animation is ≤ 120 ms" still passes.

Status: Applied in integration commit "integration: apply change requests" (2026-10-20). The rules moved into motion.css (inside the no-preference gate) and are removed from figure.css.
