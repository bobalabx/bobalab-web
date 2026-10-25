# pearls-3: wording outside HOME that still says "cup" (no behaviour change)

**Status (integration, 2026-10-25):** APPLIED, keeping the session key `bobalab-cup-intro` and `data-cup-intro` as recommended (no privacy edit). Comments updated in `motion.ts`, `tokens.css`, `palette.ts`, `direction.css` (both notes), `research.spec.ts`, `figure.css`, `FigureIsland.tsx`, `figure.spec.ts`, `offorigin.spec.ts`, `research/page.tsx`; also the `homePearls` comment in `queries.ts` (the D-14 reveal model, now unused by the homepage). `docs/ARCHITECTURE.md` l.20, l.128, l.130 and §15 replaced with the proposed paragraph (plus the HomeSections and contrast sentences kept from the old §15).

- **From:** HOME (simplify, D-15), 2026-10-25. **To:** the owners named below. All of these are comment or doc edits. Nothing fails today.
- **Session key (kept on purpose):** the homepage pearls' settle-once intro reuses the D-14 mechanism unchanged:
  - the pre-paint script in `src/lib/site/motion.ts` sets `<html data-cup-intro>` and `sessionStorage["bobalab-cup-intro"]` on the first home view;
  - `PearlsIsland` does the same on a client navigation (`PEARLS_INTRO_KEY`, unit-tested equal to `CUP_INTRO_STORAGE_KEY`).

  As a result, the privacy text in `content/pages/privacy.yml` ("the pearls on the home page have already settled once in this session … `bobalab-cup-intro`") **stays accurate, and no privacy edit is needed.** A rename to `bobalab-pearls-intro` / `data-pearls-intro` is optional. It would touch:
  - `motion.ts` (`CUP_INTRO_STORAGE_KEY`, `prePaintSource`);
  - `privacy.yml`;
  - `tests/unit/foundation/misc.test.ts`;
  - `tests/e2e/kit.spec.ts` and `offorigin.spec.ts`;
  - `PearlsIsland.tsx`, `pearls.css`, `home.spec.ts` and `home.visual.ts`.

  Recommendation: keep the key. The name is internal and visitors only see it on the privacy page, where the sentence is already about "the pearls on the home page".

- **Comment / doc updates suggested:**
  - `src/lib/site/motion.ts` l.10, l.63–64: "the homepage cup's settle-once intro" → "the homepage pearls' settle-once intro (D-15; PearlsIsland)".
  - `src/styles/tokens.css` l.4, l.29–34: `--tea` is now the **flat panel behind the homepage pearl figure** (D-15), not a cup fill. It is still homepage-only and still never a page or band background. The contrast notes still hold: the panel carries ink and muted text, direction-coloured underlines and seeds, and never direction-coloured text.
  - `src/lib/content/palette.ts` l.22: the same note for the `tea` entry.
  - `src/components/direction/direction.css` l.881 and `tests/e2e/research.spec.ts` l.210: "--tea is the homepage cup's only" → "--tea is the homepage pearl panel's only".
  - `src/components/direction/direction.css` l.300–320 (`.dr-f2__pearl .f1-pearl { box-shadow: none }`): since D-15, DirectionPearl "hero" carries the homepage halo on purpose. `src/components/pearls/halo.css` outranks this rule with `.f1-dp.f1-dp--hero:not(.f1-dp--quiet) .f1-pearl`, so the morph lands on the same haloed pearl. The comment "no halo, orbit, seeds or numeral (D-13 item 6)" should read "no orbit, seeds or numeral; the halo comes from halo.css (D-15)". Orbit, seeds and numerals stay hidden.
  - `src/components/figure/figure.css` l.496, `FigureIsland.tsx` l.16, `tests/e2e/figure.spec.ts` l.10 and `tests/e2e/offorigin.spec.ts` l.11: "the homepage cup has its own key" → "the homepage pearls have their own key".
  - `src/app/research/page.tsx` l.3: "D-14 'the boba cup' moves Fig. 1 here" → "D-14 moves Fig. 1 here (the homepage figure is the D-15 pearl cluster)".
  - `docs/ARCHITECTURE.md`:
    - l.20 and l.128–130: the intro lines read "the homepage pearls (D-15)";
    - §15 "Homepage cup": replace with the paragraph below.

    > 15. **Homepage pearls (HOME, D-15).** `src/app/page.tsx` renders `HomeHero` (statement h1, who, why, two links) with `HomePearls` (`src/components/pearls/`) on the right (below the text on phones). `src/lib/pearls/` holds the original Fig. 1 slot templates for 2–8 directions (`templates.ts`), the seed fill order with the ±75° cap (`seeds.ts`), and the model (`model.ts`: `buildPearls`, `countsLine`). `HomePearls.tsx` (server) draws a flat `--tea` panel. It holds one `<nav aria-label="Research directions"><ol>` of real links, each with a matte tapioca body (`.pl-body`, the `pearl-{slug}` morph source, whose halo is a box-shadow shared with DirectionPearl "hero" via `halo.css`), a hairline orbit with one direction-coloured seed per counted paper, an underlined label and a muted count. Under the links sit the caption (one sentence, plus one hidden layer per direction with its `homeQuestion` and counts) and the quiet link to `/research/#map`. Figure mode starts at a 36em container; below that, and for 1 or more than 8 directions, the pearls form a compact 2-column grid. `PearlsIsland.tsx` (client, about 1 KB gz) swaps the caption on hover (80 ms intent) or focus, sets `.is-on` / `[data-active]` (lift ≤ 3 px and ≤ 1.05, halo ×1.45, seed bloom 10 %, the other pearls' orbit and seeds dimmed, never text), tints the header wordmark O through `<html data-pearl-on>` + `--pearl-o`, resets on Esc, and keeps the settle-once intro (`data-cup-intro`, see motion) alive on the figure for 1.6 s. There is no idle motion, parallax or Pause button.
- **Blocking?** No.
