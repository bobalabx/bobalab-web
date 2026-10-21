# WP2 request 3: let DirectionPearl draw an archived (unindexed) pearl

- File(s): src/components/figure/DirectionPearl.tsx, src/components/figure/parts.tsx (WP1)
- Why: archived directions (D-04) keep a page but have no index (`DirectionView.index === null`) and no Fig. 1 pearl, so the header must show a quiet pearl with no numeral, no seeds and no view-transition name. The contract requires `index: number`. WP2 currently composes the archived pearl from WP1 internals in `src/components/direction/DirectionHeader.tsx`:

  ```tsx
  <span className="f1-dp f1-dp--hero" data-swatch={d.color} aria-hidden="true">
    <Halo />
    <span className="pearl f1-pearl" />
  </span>
  ```

  That depends on WP1's class names (`f1-dp`, `f1-dp--hero`, `f1-pearl`) and on `Halo` from `parts.tsx`, so a rename in figure.css would silently break the archived header.

- Proposed change: accept `index: number | null` in `DirectionPearlProps`; when it is `null`, render the halo and the pearl body without the numeral (`PearlBody` skips `.f1-idx`), never wrap it in a `<ViewTransition>`, and ignore `seedCount`. WP2 then replaces the block above with `<DirectionPearl slug={d.slug} index={null} swatch={d.color} seedCount={0} size="hero" />`.
- Blocking? No (workaround in place; the archived page passes axe and the visual check).
- Test that proves it: `tests/e2e/research.spec.ts` "archived direction …" asserts the band has one `.f1-dp--hero` and no `.f1-idx`.
