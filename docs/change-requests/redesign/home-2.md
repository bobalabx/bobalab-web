# Redesign HOME request 2: retire `figure_mode`, fix the validator hint, document Fig. 1 "Lines"

> **Status: APPLIED (integration, 2026-10-24), with the fallback.** The CMS generator requires every schema field, so `figure_mode` is `widget: "hidden"` (a new `hidden` branch in `scripts/cms/lib/decap-config.mjs`), not removed. Validator wording changed (`tests/content/rules.test.ts` case renamed); `tests/unit/cms/config.test.ts` asserts the hidden widget. ARCHITECTURE §9 item 11 added.

- File(s): `src/lib/content/validate.ts`, `cms/source.mjs` (FOUNDATION / CMS), `docs/ARCHITECTURE.md` §9 (FOUNDATION).
- Why: D-13 replaces the cluster Fig. 1 with P3's "Lines". The new figure has one layout and
  handles growth itself (packed columns, then the overflow rule: oldest year bins merged and
  packed per lane, then strips), so `site.figure_mode` (`cluster | dotplot`) no longer does
  anything, and the validator's W_DIR_COUNT_HIGH hint points editors at it. Keep the schema
  field (old `site.yml` files must still parse); hide it from editors.
- Blocking? No. Nothing reads `figure_mode` any more (`buildFigure` ignores it).
- Proposed change:

```diff
--- a/src/lib/content/validate.ts
+++ b/src/lib/content/validate.ts
     warn(
       "W_DIR_COUNT_HIGH",
-      `${n} directions: consider the dot-plot fallback (figure_mode: dotplot) and rerun the five-second test`,
+      `${n} directions: Fig. 1 gets tall (one lane per direction); consider grouping directions and rerun the five-second test`,
       "site.yml",
       "direction_order",
     );
```

```diff
--- a/cms/source.mjs
+++ b/cms/source.mjs
-          figure_mode: {
-            label: "Fig. 1 layout",
-            options: {
-              cluster: "Cluster (default)",
-              dotplot: "Dot plot (better for 7–8 directions)",
-            },
-          },
```

(If the CMS generator requires every schema field to be listed, use `widget: "hidden"` instead.)

`docs/ARCHITECTURE.md` §9, new item after 10:

```md
11. **Home and Fig. 1 (HOME package).** `src/lib/figure/buildFigure.ts` builds the "Lines" model
    (lanes in `direction_order`, one dot per counted paper with a year, links and gaps for shared
    papers, rings for work in progress); `src/lib/figure/geometry.ts` holds the layout formulas
    that `figure.css` evaluates in CSS (no drawing script) and writes the data-dependent container
    queries (packed below a 28 px pitch, strips where even 12 px does not fit, strips below 48rem).
    Overflow rule: columns per paper; else merge the oldest years into one bin packed per lane;
    else pack every year; else merge packed years. `FigureIsland` (≈1.1 KB gz) only adds linked
    highlighting and the live caption. `DirectionPearl` keeps its props; `hero` = 96 px and
    `rail` = 24 px flat pearls, archived = a quiet open disc.
```

- Test that proves it: `npx vitest run tests/unit/content` (validator wording, if pinned) and
  `npx vitest run tests/unit/cms`.
