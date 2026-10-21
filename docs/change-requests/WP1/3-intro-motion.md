# WP1 request 3: retire the generic `.pearl-group` settle intro; keep data-intro for 2 s

- File(s): src/styles/motion.css, src/lib/site/motion.ts (WP0)
- Why: D-02a replaces the brief's 480 ms "settle" with the judge's intro (sink 720 ms, 70 ms stagger, halo-in, seed-in; last frame ≈ 1.05 s at n = 4 and ≈ 1.5 s at n = 8 with 12 seeds). WP1 implements it in `src/components/figure/figure.css` on `.f1-group` (not `.pearl-group`), so:
  1. `:root[data-intro] … .pearl-group { animation: bl-settle … }` in motion.css is now unused. If any package ever uses the class `.pearl-group` it would get a second, conflicting intro. Remove that block (and `@keyframes bl-settle`, `--dur-intro`, `--stagger-intro` if nothing else uses them).
  2. `prePaintSource()` removes `<html data-intro>` after 1000 ms, which would cut the longer intro. WP1 works around it: the figure island copies the flag to the plate (`.f1-plate[data-intro]`) and clears it after 2 s, but if hydration is slower than 1 s (cold dev compile, slow phone) the tail is cut. Raise the timeout to 2000 ms.
- Proposed change:
  - motion.css: delete the `:root[data-intro]:not([data-motion="reduce"]) .pearl-group { … }` rule and `@keyframes bl-settle`.
  - motion.ts `prePaintSource`: `setTimeout(function(){d.removeAttribute("data-intro")},2000)`.
- Blocking? no (workaround in place).
- Test that proves it: `tests/e2e/figure.spec.ts` "intro plays on the first home view of a session only" still passes; intro frames in `test-results/WP1/intro-*.png` complete.
