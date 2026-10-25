# home-5: retire tests/unit/figure/home.test.tsx (its coverage moved to tests/unit/home/)

**Status (integration, 2026-10-25):** APPLIED: `tests/unit/figure/home.test.tsx` deleted (`git rm`). Its coverage is in `tests/unit/home/home.test.tsx` (research-2 item 1 maps every old test to its counterpart).

- **From:** HOME (simplify), 2026-10-25. **To:** the owner of `tests/unit/figure/**` (or the integrator).
- **Why:** `tests/unit/figure/home.test.tsx` tests the D-13 home components (`HomeHero` with `longName`/`affiliation`/`directions`, `splitFirst`, `PublicationsSection`, the square people lattice). D-14 replaced them. The file no longer type-checks:
  - `PublicationsSection` is now `PapersSection`;
  - `splitFirst` and the address block are gone;
  - `HomeHero` takes `{ copy, cup }`.

  Every assertion that still applies has moved, nothing dropped, to `tests/unit/home/home.test.tsx`, which HOME owns:
  - recent-publication ordering: real content, plus the synthetic set;
  - the foot-line wording;
  - "link after the list, never in the head";
  - "University of California" kept together.

  The new behaviour has new tests there and in `tests/unit/home/cup.test.tsx`: the hero, round consented faces, first names, the team sentence, the cup's geometry and markup.

- **Blocking?** `npx tsc --noEmit` and `npm test` fail until this is applied.
- **Proposed change:** delete `tests/unit/figure/home.test.tsx`.

```bash
git rm tests/unit/figure/home.test.tsx
```

- **Test that proves it:** `npx tsc --noEmit` is clean. `npx vitest run --config vitest.config.ts tests/unit/home` passes: 33 tests at the time of writing.
