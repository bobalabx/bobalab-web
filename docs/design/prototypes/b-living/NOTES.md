# b-living: "Living Specimen" prototype of Fig. 1 (brief §E + DECISIONS D-02)

Single file: `index.html` (HTML + CSS + inline JS; fonts from Google Fonts, prototype only).
Open it directly, or serve the folder (`python -I -m http.server` in `proto/`) and visit `/b-living/index.html`.
Add `?intro` to replay the first-visit settle (it normally plays once per browser session).
Deep links work: `#/research/{slug}/`. Without JS, the same links work through CSS `:target`.

## 1. Seed counts (computed, not typed)

Script: `tools/seed-counts.js` (run: `node tools/seed-counts.js ../../research/content-dataset.json`).

The rule follows D-05. A publication tagged to the direction counts if it has a public version (DOI, SSRN, arXiv, PDF or publisher link) or a conference presentation that an independent programme documents (label exactly `DOCUMENTED`). Talks that only the PI's own pages report do not count. Theses and dissertations (`type: other`) do not count, because the audit files them as PI-page material.

| # | Direction (swatch) | Seeds | Counted publications | Not counted | Projects |
|---|---|---|---|---|---|
| 01 | Algorithmic Advice (Butterfly pea) | **4** | rl-tips-2026, precise-or-broad, strategic-advice-personal-ai, compliance-aware-rl (MSOM 2026 programme) | non-adoption (only link is a 404; the talk is PI-reported), act-ask-defer (CV only) | 5 |
| 02 | AI at Work (Lychee) | **5** | making-chatgpt-work-2025, teachers-knapsack, strategic-advice-personal-ai, planning-vs-execution (MSOM 2026 programme), stale-misattributed-late | genai-pricing-simulation, act-ask-defer | 5 |
| 03 | Learning on the Job (Matcha) | **4** | learning-on-the-go-2025, precise-or-broad, learning-to-gig, dispatching-to-develop | learning-across-jobs (BOC 2026 talk is PI-reported) | 4 |
| 04 | Platform Work (Oolong) | **5** | gig-drivers-2023, learning-on-the-go-2025, multihoming-workers, learning-to-gig, dispatching-to-develop | sequencing-incentives (PI-reported talk), fruits-of-labor, penn-dissertation-2021 | 5 |

- That makes 18 seeds and **13 unique papers**. Five papers sit in two directions; the figure note says so.
- **Sensitivity.** If PI-reported talks counted, the seeds would be 5 / 5 / 5 / 6. If the dissertation counted, Platform Work would be 6. The PI must decide (this is lab decision H-3).
- **Caption summaries.** Each one is my own short draft, based on the dataset's `oneLiner` and its non-inferred questions. Guiding questions use only question indexes that are not listed in `inferredQuestionIdx`. The "Why it matters" paragraphs are my own drafts too. No author names appear anywhere, so no student is named.

## 2. Design intent

**The idea.** A journal figure that is quietly alive. The plate reads first as an annotated research figure:
- "Fig. 1" set in mono;
- a caption inset with a rule;
- numbered specimens;
- hairline orbits;
- registration ticks at the corners;
- a footnote that states the counting rule.

Only after that does the eye notice that the pearls are tapioca and that they breathe. The boba idea is carried by the matte pearls and the name, and nothing else. There are no cups, straws, faces or gloss, and no bubble fonts. The milk-tea tone appears only on the plate and the direction bands.

**Credibility in 5 seconds.** The left column states who the lab is, in this order:
1. the wordmark;
2. the descriptor;
3. the affiliation, as plain text;
4. a Fraunces mission line;
5. a primary CTA.

The figure has a visible h2. Each pearl has a label with a persistent "→" and a mono count. Labels are visible from first paint.

**Pearls.**
- All pearls are the same size and use the brief's matte radial body.
- The bottom glow is the direction's deep tone at 45% (in dark mode, the light tone at 26%).
- The sheen is a crescent at 10 o'clock, drawn as an inset light: alpha .22 in light mode, .10 in dark mode.
- Dark mode adds the mandatory 1 px `#A47E62` rim.
- The index numeral is Plex Mono, and it is `aria-hidden`.

**Seeds.**
- Flat dots in the brief's precomputed seed hexes.
- 12 fixed ring slots at radius 0.64D, filled in clock order 12, 1, 11, 2, …
- Size `max(6px, .12D)`.
- They sit on a decorative hairline **orbit** (new). The orbit makes the dots read as a radial count rather than as "ears" or frogspawn.

**Wordmark.** Built typographically for the prototype:
- "B", then a pearl-O at about cap height (with a ≤ .24-alpha crescent), then "BA" in Fraunces SOFT 100 / 680 / opsz 144;
- then "LAB" in Plex Mono 500 with +.08em tracking.

**Direction page (fake, hash route).**
- Tinted band (dark mode: the brief's dark header tones).
- Crumbs "← All directions · Research / 0N".
- A hero pearl (120–160 px) with its seed ring, which is the morph target.
- A draft badge, h1 (`tabindex=-1`), guiding question, and "N projects · N papers".
- "Why it matters" and the counted papers, with flat-dot bullets and type badges. Self-reported review statuses carry an "as of" date.
- A "More directions" rail of 40 px pearls, and "Last updated".

## 3. Motion parameters (all inside `prefers-reduced-motion: no-preference` and `:root:not([data-motion="reduce"])`)

| Moment | What moves | Values |
|---|---|---|
| Intro settle (first home view per session; `sessionStorage` key `bobalab-intro`; `html[data-intro]` is removed at 1 s) | `.pearl-group` only; labels are static from first paint | translateY −14 px → +2 px (72%) → 0, opacity 0 → 1, 480 ms `cubic-bezier(.22,1,.36,1)`, 40 ms stagger (600 ms total at n = 4) |
| Idle float (figure mode, needs JS so the pause control always exists) | 4 `.float` wrappers, transform only, `ease-in-out` keyframes −A → +A → −A | 01: 8.6 s, A 2.6 px, phase −2.1 s · 02: 10.4 s, 3.0 px, −6.4 s · 03: 7.4 s, 2.2 px, −0.9 s · 04: 9.4 s, 2.8 px, −4.3 s. MEASURED: sampled offsets stay within ±3 px and are out of phase |
| Pausing | `animation-play-state: paused`, which freezes in place with no snap | When the figure is off-screen (IntersectionObserver → `.fig[data-offscreen]`), when the document is hidden (`visibilitychange` → `html[data-hidden]`), or when the Pause/Play button or the footer "Reduce motion" toggle is set (same `localStorage` key `bobalab-motion`, `html[data-motion="reduce"]`). MEASURED in Chrome |
| Pointer buoyancy (`(hover: hover) and (pointer: fine)`, `pointerType === "mouse"`, figure mode) | `.buoy` wrapper, via the `translate` property | One rAF per `pointermove`; no loop otherwise. Lean toward the pointer = 4 px × k² × min(1, d/24 px), where k = max(0, 1 − d / (2.2 × group width)). The CSS transition `translate 900ms cubic-bezier(.2,.8,.2,1)` does the easing. Geometry is cached on `pointerenter`; everything resets on `pointerleave` |
| Hover (80 ms intent) or focus (immediate) | Active pearl | translateY(−3 px) scale(1.06), 200 ms in / 160 ms out `cubic-bezier(.2,.8,.2,1)`. The other groups (pearl, seeds, orbit) go to opacity .55 over 200 ms linear; text never dims. The label gets a 2 px underline in the direction's ink |
| Seed bloom | That direction's seeds and orbit | Ring radius × 1.13 (+13%), transform 320 ms ease-out, `transition-delay: k × 20 ms` both out and back. The orbit scales 1.13 in step |
| Live caption | Stacked caption layers (no layout shift) | Out 90 ms; in 180 ms ease-out after a 70 ms delay, opacity + translateY(4 px → 0). Returns to the legend (or to the focused direction) 300 ms after leave or blur; Esc resets |
| Press | Pearl | scale(.98), 100 ms |
| Morph pearl → header | `view-transition-name: pearl-{slug}` + `view-transition-class: pearl-morph`, assigned only to the clicked pearl and its destination | Group 420 ms `cubic-bezier(.2,0,0,1)`; image pair blurs 3 px at 40%. Old root: 150 ms ease-in to opacity 0 + 8 px down (8 px up for the `pearl-close` type). New root: 210 ms after 150 ms. The site header is its own static group, so it never blinks |
| Arrival | Header seeds | From 0.82 × ring at opacity 0, 360 ms ease-out, delay 220 ms + k × 20 ms |
| Reduced (OS setting or toggle) | Nothing moves | No intro, float, buoyancy, bloom, lift or press. Hover and focus become a 2 px outline plus underline. View transition = 120 ms root crossfade with no names. The Pause button is hidden under the OS setting |

## 4. Where this differs from the brief

1. **Hero grid.**
   - In §C5, a 7/12 column inside 72rem is at most about 42rem wide, so the §E2 rule `@container (width >= 46em)` could never reach figure mode on desktop.
   - The prototype instead uses:
     - from 75rem up: side by side, `minmax(min(19rem,100%),1fr) minmax(min(46rem,100%),2fr)`;
     - from 48 to 75rem: a two-column masthead above a full-width figure;
     - below 48rem: one column.
   - Result: figure mode at 1366 and 1024 px (MEASURED); list mode at ≤ 768 px and at 200% default text size.
2. **Container font size is pinned to 1rem.**
   - `em` in a container query resolves against the container's own font size, and body text is 17 px.
   - So 46em would have been 782 px. Pinned, it is 736 px, and it still scales with text zoom.
3. **Mission line size.**
   - `clamp(2rem, 1.2rem + 1.6vw, 2.75rem)` instead of `--fs-display`.
   - The identity column is only about 22rem wide.
4. **Caption meta.**
   - It reads "N projects · N papers", without "since YYYY".
   - The dataset has no start year per direction, and paper years mislead: the tips paper is "2026" by print year.
5. **Hit area (a bug in the brief).**
   - Row 2 overlaps row 1 by .25D, so the whole-cell link boxes overlap.
   - MEASURED: before the fix, clicking "4 papers" under 01 opened 03.
   - Pointer targets are now limited to the pearl, label and count (`pointer-events`). They are still one link, and there are no overlaps (hit-tested).
   - The brief should adopt this.
6. **List mode** shows only the legend in the caption, so it never reserves space for summaries. The idle float and the Pause button exist in figure mode only, because nothing moves in list mode.
7. **Pause/Play is the same preference as the footer toggle** (D-02).
   - It freezes the float in place rather than snapping it.
   - Because it is the global preference, it also turns off lift, bloom, buoyancy and morph.
8. **D-02 additions.** These override the brief's "none in v1": float, buoyancy, bloom, the orbit ring, and the header seed arrival.
9. **View-transition names** are assigned only to the clicked pair, at runtime. This prototype has no React; one name is visible at a time.
   - The rail uses the same pearl morph (rail pearl → header) instead of the brief's `nav-forward`/`nav-back` slide.
   - Browser back and forward also morph (popstate).
10. **Focus on return home** goes to the originating pearl link, and its caption shows. On arrival at a direction page, focus goes to `h1[tabindex=-1]` as specified.
11. **Pearl sheen** is an inset box-shadow crescent rather than a radial `::before` blob. The first try looked glossy.
12. **Fonts** come from Google Fonts and include the full variable Fraunces (needed for SOFT in the wordmark). The build must self-host the wght-only files per §C4.
13. **Prototype-only parts:**
    - the hash router and `:target` no-JS routing;
    - header links People/News/Join point to the footer;
    - only template t4 (n = 4) exists.

## 5. JS size (node `zlib.gzipSync`, level 9; `tools/measure.js`)

| Block | Raw | gzip |
|---|---|---|
| Pre-paint (head: motion preference + intro flag) | 545 B | 337 B |
| Fig. 1 enhancement (caption, pause/IO/visibility, buoyancy, toggles) | 3,311 B | 1,523 B |
| **Figure total (production candidate)** | 3,856 B | **1,728 B** (D-02 limit 4 KB) |
| Prototype router + view-transition morph (stands in for next/link + `<ViewTransition>`) | 2,390 B | 1,187 B |
| All inline JS | 6,246 B | 2,662 B |
| Whole page | 60,780 B | 14,674 B |

## 6. How it was checked (MEASURED, Chrome 155 headless through `tools/cdp.mjs`; screenshots in `../b-living-shots/`)

**Layout and modes.**
- Figure mode at 1366×680 and 1024×768; list mode at 375 and 320 px.
- No horizontal scroll at 320, 375, or 1366 with 32 px default text.
- 200% default text size switches to list mode.
- Dark mode, forced colours (emulated) and reduced motion were all captured.
- Under reduced motion there are no animations, including when the intro is forced, and the Pause button is hidden.

**Motion controls.**
- Pause and Play: paused ↔ running, and the label and footer `aria-pressed` stay in sync.
- Scrolling the figure off-screen pauses the float; scrolling back resumes it.

**Navigation and keyboard.**
- Tab order: skip link → home → site nav → CTA → Pause → 01–04.
- Focus swaps the caption, and Esc resets it.
- Enter opens the direction page: the h1 is focused and the title is "{Title}, BOBALAB research".
- Back and forward work, as do the rail morph, the deep link, and no-JS `:target`.
- Morph frames were captured mid-flight.

**Accessibility tree** (CDP):
- Links read "Algorithmic Advice 4 papers" and so on, each with its summary as the description.
- The figure is named "Fig. 1, research directions of BOBALAB".
- The nav is named "Research directions"; the h1 is "BOBALAB, Berkeley Operations and Behavioral Analytics Lab".
- Numerals and arrows are hidden.
- No page errors were logged.

## 7. Known issues

- **Untested browsers.** Safari and Firefox were not tested.
  - `view-transition-class` and `:active-view-transition-type` need Chrome 125+ (Safari 18.2+ / Firefox 144+ for classes).
  - In older browsers with view transitions, the morph falls back to the default 250 ms crossfade with no blur. Without view transitions, navigation is instant.
- **View transitions can stall.** If the tab is not producing frames (a hidden preview pane, or once in headless Chrome during history traversal), the update callback is delayed until a frame. A normal visible tab is fine.
- **Dimmed groups look grey.** At .55 opacity on the plate they read as taupe. Consider .6–.65, or dimming the seeds only.
- **Fold.** At 1366×768 with browser chrome (about 657 px inner height), the plate's bottom edge sits about 15 px below the fold, but every label is visible. At 1024×768 (stacked), the second row of labels is below the fold.
- **Wordmark.** "LAB" is at .952em to match cap heights by eye; it was not measured. The real wordmark should be outlined SVG (§C8).
- **Forced colours** were checked only through Chrome emulation, not real Windows contrast themes.
- **Duplicate text in the DOM.** Caption summaries exist twice, as the stacked caption layers and as the hidden `aria-describedby` paragraphs. A production build could clone the text into one caption node instead (+≈0.2 KB JS).
- **Tool files in the deliverable.** `tools/` holds the dataset counter, the CDP harness and its step files (`s*.json`), and the size meter; these are not part of the page.
