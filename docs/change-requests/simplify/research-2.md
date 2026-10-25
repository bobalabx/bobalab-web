# research-2: review follow-ups (stale home unit test, docs for the map's step-down and "seen at rest")

**Status (integration, 2026-10-25):** Item 1 APPLIED (file deleted, see home-5). Item 2 APPLIED to `docs/ARCHITECTURE.md` (item 11 paragraph and the §4 Motion bullet wording). Item 3 is a record; no action.

**From:** RESEARCH adversarial review (simplify), 2026-10-25.
**To:** the integrator; HOME for item 1.
**Amends:** `research-1.md` Patch 3 (ARCHITECTURE wording). Patches 1, 2 and 4 of research-1 stand.

## 1. `tests/unit/figure/home.test.tsx` is superseded and now fails (blocks `tsc` and the unit run)

HOME replaced `PublicationsSection` with `PapersSection`, removed `splitFirst`, and changed `HomeHero`'s props. The old D-13 file therefore fails:

- `npx tsc --noEmit`: 3 errors, all in this file (lines 37, 39 and 156).
- `npx vitest run`: 2 failures, "section foot lines › the link sits after the list…" and "hero address block › keeps University of California together…".

HOME's `tests/unit/home/home.test.tsx` says in its header that it carries this file's coverage over. Each old test has a new counterpart, and all 33 HOME tests pass:

| Old test (`tests/unit/figure/home.test.tsx`)               | Its counterpart (`tests/unit/home/home.test.tsx`)                                 |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| recent publications: newest dated evidence first…          | new papers: newest dated evidence first…                                          |
| recent publications: orders by the evidence…               | new papers: orders by the evidence…                                               |
| section foot lines: wording                                | section foot lines: wording                                                       |
| section foot lines: the link sits after the list…          | section foot lines: the link sits after the list…; news is 4 one-liners           |
| hero address block: University of California kept together | hero: one h1, the who line from content (University of California kept together)… |

**Request:** delete `tests/unit/figure/home.test.tsx` when committing HOME's package, or have HOME confirm that its file covers the same ground first. I did not delete it myself: the file sits under my glob, but it tests HOME's components.

## 2. Docs: replace research-1 Patch 3's "Redesign 2026-10, item 11" text

Replace the paragraph proposed in research-1 Patch 3 with this one. It adds the review changes: the label step-down, the stacked head, the hint on touch screens, the arrival line, and "seen at rest".

```
    D-14 (simplify): Fig. 1 left the homepage. `/research/` renders it in `<section id="map"
    aria-labelledby="map-h">` ("Explore: how the N directions connect") in a full-bleed `--band`
    band after the directions ledger, via `<PearlFigure model={buildFigure(c)} heading={…} />`.
    - Layout: the heading sits in the label column with a one-sentence key beside it (from 64rem;
      stacked above the key below that). The key's clauses follow the data and the same container
      queries as the marks. The caption is short, and its "Point at…" hint is hidden on
      `(hover: none)` screens.
    - Size: the map is a section, not the hero, so `.f1--map` steps the lane names down to
      `--t-lane: 1.375rem` (still condensed) and the lanes to `--f1-lane-h: 4.5rem`. The band's h2
      stays its largest text.
    - Colour: inside the band the figure's ground is `--band` and the zone after "now" is
      `--paper` (`--f1-ground`, `--f1-zone`).
    - Arrival: it plays once per session, when the plate's top clears the bottom 30 % of the
      viewport. A plate that is on screen when the island mounts is drawn at rest and counts as
      seen, so a later Back to the page never blanks it to replay it.
    - View-transition names on /research: only the map's lane pearls carry `pearl-{slug}`.
    - Ledger: it has no pearls. The live rows no longer draw a `DirectionStrip`, because the map
      draws the same papers; their counts column is 16rem from 80rem, so the counts sit on one
      line. "Earlier and related research" keeps its strips, because archived directions are not
      on the map.
```

Also, in research-1 Patch 3's §4 Motion bullet, change "when it scrolls into view" to "when its top clears the bottom 30 % of the viewport". After that, add "; a figure already on screen at mount is counted as seen".

## 3. What research-1 Patch 1 changes in practice (for the record; no action)

Even with the pre-paint home branch removed, the homepage link "See every paper on one timeline" (`/research/#map`, a client navigation) lands with the plate already in view when the island mounts. The figure is therefore drawn at rest and marked seen; no arrival plays (MEASURED at 1440 and 390, 2026-10-25).

The arrival plays only for a visitor who reaches `/research/` and scrolls down to the map. That is the case Patch 1 still unblocks after a homepage visit.

This is deliberate. Playing the arrival on that link would mean blanking a figure that has already been painted, since passive effects run after the first paint of a transition.
