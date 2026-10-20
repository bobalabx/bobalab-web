# c-expressive: "Fig. 1, the Pearl Figure", expressive specimen

`index.html` is one self-contained file: HTML, CSS and inline JS. Fonts come from Google Fonts, which is allowed for this prototype only. Open it straight from disk (`file://` works). Add `?intro` to the URL to replay the first-visit intro. The intro otherwise plays once per tab session.

`src/` holds the generator: `node src/build.mjs` rebuilds `index.html` from `src/template.html` and `research/content-dataset.json`. It recomputes the counts and stops with an error if they drift from the values below.

Routes, all hash-based: `#/` home · `#/research/` research index · `#/research/{slug}/` direction page · anything else under `#/` is a stub page.

## Seed counts (computed from `content-dataset.json`, 20 Oct 2026)

**Rule (DECISIONS D-05).** A publication counts if it has at least one of:
- a DOI, SSRN, arXiv, PDF or publisher link;
- a conference presentation whose label is exactly `DOCUMENTED` (a primary source).

Presentations labelled "PI-reported only" do not count. A paper tagged with two directions counts in both.

| # | Direction | Swatch | Seeds = papers | Counted items | Projects |
|---|---|---|---|---|---|
| 01 | Algorithmic Advice | Butterfly pea | **4** | rl-tips-2026, precise-or-broad (PDF), strategic-advice-personal-ai, compliance-aware-rl (MSOM 2026 talk) | 5 |
| 02 | AI at Work | Lychee | **5** | making-chatgpt-work-2025, teachers-knapsack, strategic-advice-personal-ai, stale-misattributed-late, planning-vs-execution (MSOM 2026 talk) | 5 |
| 03 | Learning on the Job | Matcha | **4** | learning-on-the-go-2025, precise-or-broad, learning-to-gig, dispatching-to-develop | 4 |
| 04 | Platform Work | Oolong | **5** | gig-drivers-2023, learning-on-the-go-2025, multihoming-workers, learning-to-gig, dispatching-to-develop | 5 |

**Excluded items:**
- non-adoption-algorithmic-advice: its only link returns 404, and its CHI 2022 workshop is PI-reported only.
- act-ask-defer and genai-pricing-simulation: CV-only.
- learning-across-jobs and sequencing-incentives: BOC 2026, PI-reported only.
- fruits-of-labor: no public version.
- penn-dissertation-2021: its link is a repository handle, which the rule does not list.

**If PI-reported presentations counted,** the seeds would be 5 / 5 / 5 / 6.

The site shows 13 unique items in total, not 18, because papers tagged with two directions appear twice.

## Design intent

- **Credible first.** The left column says "Berkeley Haas research lab" before any pearl does:
  - the wordmark, with the pearl as the O;
  - the descriptor;
  - the affiliation in plain text;
  - a Fraunces mission line;
  - one brown-sugar call to action.
- **The figure is a real scientific plate:**
  - a figure label and caption;
  - a key ("● = 1 paper with a public version");
  - an "as of" date;
  - fine crop marks at the plate corners.
- **Labels are always visible and always read as links.** Each has an arrow and its count.
- **What makes it expressive.** The pearls are equal-size matte tapioca. Each sits on a soft, translucent halo in its direction colour, like syrup light. The motion uses the brief's tapioca idea, in this order:
  1. On load, the pearls sink in and settle with a small overshoot. Their halos then bloom and the seed dots spread out from the pearl.
  2. While idle, the pearls float very gently.
  3. On hover or focus:
     - the plate takes on that direction's colour;
     - the pearl lifts;
     - its seeds spread out and start a slow orbit;
     - the halo, the pearl and the seeds shift with the pointer at three depths.
  4. A click turns the pearl into the hero pearl of the direction page. The hero's halo and seeds then bloom again.
- **No boba-shop cues:**
  - no cups, straws, faces or bubble type;
  - no gloss on small dots;
  - the only highlight is ≤ 0.15 alpha, on pearls of 40 px or more.

The tokens (§C2–C3), type (§C4), DOM (§E1) and accessibility rules (§E6–E7) follow the brief.

## Motion parameters

All transform motion is gated with `@media (prefers-reduced-motion: no-preference){:root:not([data-motion=reduce]) …}`. Only `transform`, `translate`, `scale`, `rotate` and `opacity` animate. No filters are used.

| Moment | Values |
|---|---|
| Intro (first view per tab session) | Pearl group: `translateY(-34px → +4px @58% → -1.5px @80% → 0)`, opacity 0→1 by 20%, 780 ms, stagger 80 ms. Easing per segment: `cubic-bezier(.3,.5,.45,1)` then `(.45,0,.55,1)`. Halo: opacity plus scale .55→1, 700 ms `--ease-settle`, delay i·80 + 260 ms. Seeds: scale 0→1 from the pearl centre, 420 ms, delay i·80 + 380 + k·30 ms. Last frame at n = 4 is about 1.14 s. Labels are visible from the first paint. |
| Idle float | `translate: 0 ±2px`, alternating ease-in-out, 7.4 / 9.6 / 8.3 / 10.8 s, negative delays so the pearls never move in step. Paused off-screen (IntersectionObserver) and in hidden tabs. Pause button in the plate. |
| Hover intent / focus | 80 ms delay for a pointer, none for focus. Resets 300 ms after leave or blur. Esc resets. |
| Active pearl | `translateY(-3px)` plus `scale:1.06`, 200 ms in and 160 ms out, `--ease-out`. Press: `scale:.98`, 100 ms. |
| Other directions | Pearl and seeds fade to opacity .55, halo to .3, over 200 ms. Text never dims. |
| Halo (active) | Opacity .8→1, `scale:1.1`, 400 ms. |
| Seed bloom | Ring radius .64D → .73D (+14%), 300 ms `--ease-out`, 20 ms stagger. |
| Seed orbit | WAAPI `rotate` 0→360°, **9 s per turn**, linear. Playback rate eases 0→1 on enter and 1→0 on leave, about 1 s each way. Seeds stay where they stop. |
| Pointer parallax | Pointer position normalised to −1…1 over the plate. Halo −3 px, pearl +3 px, seeds +6 px. Exponential smoothing with τ = 160 ms. The rAF loop runs only while values settle. Fine pointers only, figure mode only. |
| Plate wash | A 34rem radial wash at the pearl's centre plus a flat base. Light mode: the direction's tint and light tones mixed (62/38), at 58% alpha. Dark mode: the light tone at 13%. Opacity in 550 ms, out 350 ms. |
| Live caption | Old text out over 120 ms `--ease-in`; new text in over 180 ms `--ease-out`, after 60 ms, `translateY(4px→0)`. Every caption sits stacked in one grid cell, so the height never changes. |
| Morph | Group 420 ms `--ease-emph`. Old root 150 ms (opacity plus 8 px sink). New root 210 ms after 150 ms. On arrival the hero halo blooms (700 ms, delay 260 ms) and the hero seeds bloom (460 ms, delay 380 + k·35 ms). |
| Reduced motion or "Pause motion" | None of the above runs. Hover or focus shows a 2 px outline plus an underline. Navigation is a 120 ms opacity crossfade with no view-transition names. The Pause button is hidden when the OS asks for reduced motion. |

## View-transition names

At most one element carries `pearl-{slug}` at any moment:
- the source pearl gets the name just before `document.startViewTransition()`;
- the update callback removes it and gives the name to the destination pearl;
- `finished` clears the name.

The morph is used only when both pearls are inside the viewport. Supported pairs:
- home pearl ↔ direction hero;
- research card → hero;
- "More directions" rail → hero.

Browser back and forward also morph, because routing runs on `hashchange`.

## JS size (node zlib, gzip level 9, unminified)

| Part | Raw | Gzipped |
|---|---|---|
| Head pre-paint script (motion preference, intro flag) | 319 B | 219 B |
| Main script, total | 6,874 B | 2,920 B |
| — figure part (caption, wash, orbit, parallax, pause) | — | ≈ 2.0 KB |
| — hash router + View Transitions | — | ≈ 1.1 KB |
| **All JS** | — | **3,020 B** |

The total is within the 6 KB budget for this variant. The figure part alone also meets DECISIONS D-02's 4 KB limit. For reference, the CSS is about 6.4 KB gzipped and the whole file about 15 KB gzipped.

## What differs from the brief

1. **Hero layout.**
   - The brief's 5/12 + 7/12 split inside 72rem never gives the figure column the 46em it needs for figure mode.
   - The hero therefore uses 84rem with `minmax(0,5fr) minmax(min(46rem,64%),7fr)`, two columns from 78em.
   - The figure section sets `font-size:1rem`, so the container `em` is 16 px (the body is 17 px). The threshold is therefore 736 px at default text size.
2. **Live caption.** It runs whenever the figure is in figure mode. §E6 says 46em–64rem should show the legend only, but then the live caption would never appear beside the identity column.
3. **Motion beyond §E3 "none in v1".** Idle float, buoyancy-style parallax, seed bloom and orbit, plate wash and halo follow DECISIONS D-02 and this variant's brief. The intro (about 1.14 s) is longer than §C6's 760 ms. Labels are never delayed.
4. **No 3 px blur keyframe in the morph** (§E5), because motion is limited to transform and opacity.
5. **Halo.** The halo is new. Pearl highlight alpha is 0.15, below the brief's ≤ 0.25. Seeds use the precomputed §C3 seed hexes.
6. **List-mode wording.**
   - The legend drops "each small dot…", because seeds are hidden in list mode.
   - The hover hint is hidden in list mode and without JS.
   - The key becomes "counts as of 20 Oct 2026".
7. **Hit areas in figure mode.** Cells overlap (seed ring plus the −.25D row overlap), so only the pearl, label and count take pointer events. The focus ring is drawn on the pearl (2 px, 5 px offset), not on the cell, so it never crosses a neighbour's label.
8. **Fonts and wordmark.**
   - The full Google Fonts Fraunces (opsz, wght and SOFT axes) is used instead of the wght-only file.
   - The wordmark is live type with a CSS pearl-O, not outlined SVG.
   - The O's crescent is a soft inset rim light.
9. **Routing and focus.**
   - Hash routes plus `hashchange` stand in for Next routes and React `<ViewTransition>`.
   - Without JS, `:target` and `:has()` show the direction pages.
   - Focus goes to the destination `h1[tabindex=-1]`. Returning home focuses the pearl link you came from, not the h1.
10. **No "since YYYY" in the caption.** The dataset's print-year convention would make Algorithmic Advice read "since 2026" (the tips paper is dated 2026 by its print issue).
11. **Content shown on the prototype's direction pages:**
    - Inferred questions (`inferredQuestionIdx`) are left out.
    - Author lists are omitted for privacy (no student names).
    - Self-reported review statuses are omitted.

## Known issues and open points

- **Viewports.**
  - 1024×768 (stacked): only the first pearl row is above the fold.
  - 768 px tablet portrait: list mode, since the container is 45em.
  - 1280×720: the plate's bottom row ends at y ≈ 715.
- **Intro and fonts.** The intro starts before the webfonts finish loading, so labels can reflow during it. Production preloads self-hosted fonts.
- **Seed ring with ≤ 5 seeds.** The brief's clock fill order (12, 1, 11, 2, 10…) puts every seed in the top arc, which reads a little like a crown. Spacing them evenly would look calmer, but adding a paper would then move the existing seeds.
- **Dark mode.** Dimmed pearls read as hollow rings, because the rim stays opaque while the body fades.
- **Orbit leaves seeds rotated** until reload or Pause. This is intentional: the seeds drift.
- **Breadcrumb numeral.** The "02" in the direction-page breadcrumb is real text and is read aloud. Figure numerals are `aria-hidden`.
- **Browser features needed for full motion:**
  - CSS nesting, `color-mix`, container queries, individual transform properties;
  - `view-transition-class` (Chrome 125+, Safari 18.2+, Firefox 144+);
  - `:has` for the no-JS routing.

  Without nesting, the motion rules drop out quietly and the page stays static.
- **Shared storage keys.** `localStorage['bobalab:motion']` and `sessionStorage['bobalab:intro']` are shared with any other prototype served from the same origin.
- **Header and stub pages.** Header nav items other than Research open a stub page.
- **What was verified.** Headless Chrome 155 via CDP:
  - 1366/1920/1280/1200/1024/768/375/320 px;
  - light and dark;
  - forced-colors emulation;
  - reduced-motion emulation;
  - no-JS;
  - 200% root text (switches to list mode, no horizontal scroll at 320 px);
  - hit-testing of every label, count and pearl;
  - keyboard focus, Esc and Pause;
  - accessibility-tree names and descriptions;
  - morph pseudo-elements in both directions, from the rail and research cards, and on history back.

  Contrast of text over the strongest plate wash: ink-muted ≥ 5.7:1 in light mode and ≥ 5.87:1 in dark.
- **What was not tested:** Safari, Firefox, real screen readers, real Windows High Contrast, and axe (nothing was downloaded).
