# Redesign RESEARCH request 1: keep DirectionPearl's class contract stable (figure package)

> **Status: ACCEPTED, no code change (integration, 2026-10-24).** `.f1-dp` (with `data-slug`) and `.f1-pearl` are unchanged in `DirectionPearl.tsx` / `parts.tsx`, and the contract is now written down in ARCHITECTURE §9 item 11. The optional `fit="fill"` prop is not added: the scoped overrides in `direction.css` work and the research specs cover them.

- File(s): `src/components/figure/DirectionPearl.tsx`, `src/components/figure/parts.tsx`,
  `src/components/figure/figure.css` (figure package; not owned by RESEARCH)
- Why: Figure 2 on every live direction page mounts the one `DirectionPearl` with
  `vtName = pearl-{slug}` (the morph target), as D-13 item 2 requires. Its size and colour
  depend on where Figure 2 is drawn, so `src/components/direction/direction.css` sizes and
  paints it from outside:
  - wide (Figure 2 drawn as lines, ≥ 64rem): 96 px on the line at "now";
  - phone or list layout: 64 px beside the h1, so the morph lands inside the first screen;
  - dark mode (JUDGE item 9): `--muted` fill with a 1 px `--ink` edge instead of the light-ink
    disc, because a 96 px light disc on near-black reads as "lit".

  The selectors it relies on are `.f1-dp` (wrapper, sized to 100 % of `.dr-f2__pearl`),
  `.f1-pearl` (the disc; `background`, `border` and `box-shadow` overridden; the dark-mode edge is a 1 px border, not an inset shadow, because the AI-tell probe counts every box-shadow) and, defensively,
  `.f1-halo`, `.f1-orbit`, `.f1-idx` (hidden).

- Request: keep the `.f1-dp` wrapper and `.f1-pearl` disc class names (and `data-slug` on the
  wrapper, which `tests/e2e/research.spec.ts` and `tests/unit/direction/routes.test.tsx` read),
  and keep the disc sized by its wrapper (`width/height: var(--D)` or 100 %). If the figure
  package prefers to own the dark-mode pearl, an optional prop would let RESEARCH drop its
  override:

```diff
 export interface DirectionPearlProps {
   …
   size: "hero" | "rail";
+  /** "fill": the disc fills its positioned wrapper (the caller sets the size). */
+  fit?: "fill";
 }
```

- Workaround used: the scoped overrides in `direction.css` (section "The DirectionPearl drawn as
  P3's flat disc" and the JUDGE item 9 block at the end of the file).
- Blocking? No.
- Test that proves it: `npx playwright test tests/e2e/research.spec.ts -g "Figure 2 geometry"`
  (pearl is 96 px on the line at 1440, beside the h1 at 390) and the figure spec's morph tests.
