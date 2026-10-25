# P3 "Lines": notes

Labels: **MEASURED** (I measured it or looked at a screenshot), **DOCUMENTED** (a file or source says so), **HYPOTHESIS** (my judgement). Built 2026-10-24 from `content/**` and DIRECTION.md §5.3 as revised by the critique. Nothing in the repo was edited.

## Intent

The lab is drawn in its own field's notation, but only where that notation is true.

- **Fig. 1** is an honest timeline of papers by direction. It has year bins, a "now" rule, and an in-progress zone. Each pearl marks a direction at today; it is not called a server.
- **The operations notation lives in the study-design plates.** They show the swimlanes of the virtual kitchen (chef, sous-chef, server), the chop → cook → plate precedence chain, and the Phase I → R → four arms of the experiment.
- **P3's extreme is density plus the plates.** Type is capped at 2.25rem. The figure is the largest object on every page that has one.

## Pages

| File | What it shows |
|---|---|
| `index.html` | Statement, lab name and lede on the timetable grid, Fig. 1, recent publications (3), news log (5) |
| `research.html` | Learning on the Job: header with counts, Figure 2 (the line with labelled paper links and stubs to the other lines), "Why it matters", Figure 3 (the Learning to Gig plate, draft), projects table, papers |
| `publications.html` | 16 entries by year with inline year headings; search plus type and direction toggles (`aria-pressed`, working); jump to year; 9 in progress; one provenance footnote. `?dir=` preselects a direction |
| `project.html` | Dispatching for Worker Development as a case study: facts row, Figure 1 (the project's two lines with dated events from the lab's news), the question, the Learning to Gig plate, team roster with direction matrix, papers |
| `paper.html` | Bastani, Bastani & Sinchaisri (2026): head, the paper's place on its line, 7 awards (disclosure), `in_brief`, the study-design plate with a 4-step step-through, APA and BibTeX |
| `marks.html` | Lockup, favicon at 16 and 32 px, one colour reversed, the mark at 48 and 96 px, lineup table against the six generic icons |
| `harness.js` | Prototype only: `?links=rings`, `?order=chain`, `?n=2x` / `?n=4x` (titles marked "SYNTHETIC –"), `?intro` |

## Key design moves

1. **The timetable grid runs through every page.**
   - It is an 18rem label column plus a track.
   - On the home page, the label column holds the lab's name and the track holds the lede. Lanes, section titles ("Why it matters", "Projects") and filter labels sit in the same column.
   - The result is one alignment system instead of a section template repeated about 11 times.
2. **Heavy rules frame figures, nothing else.**
   - 2 px ink rules open and close only Fig. 1, the plates and the full publications ledger. Everything else uses a 1 px ink or hairline rule.
   - MEASURED: at most 2 heavy rules in any 1440×900 viewport, scrolling every 150 px.
3. **Text is the legend (L6).**
   - The four direction names in the lede, the lane labels and the pearls all light their line. The other lines dim to 0.3, except the papers they share with the active line.
   - Hovering a dot names the paper in the line above the plate and highlights its ledger row.
   - Hovering a ledger row lights its dots in the figure.
4. **Colour encodes directions and nothing else.**
   - Links are ink with a rule-coloured underline.
   - Line colours appear only in the figures, the 16 px legend segments, the route indicators and the lane-label hover.
5. **One family, real range.** Archivo is set at three widths:
   - wdth 68 at weight 700 for headings and lane names (always 32 px or larger);
   - wdth 100 for text;
   - wdth 112 at weight 800 for the wordmark.
6. **The plates carry design facts only, and each states its source.**
   - The kitchen lanes are drawn empty: no schedule.
   - The 20 and 34 tick optima appear as dashed design parameters.
   - The two configurations are drawn as lane glyphs, one per round, with a dashed chef line for rounds without the chef.
   - Random assignment is marked "R", the standard notation of experimental design.

## Motion (owner requirement: alive, purposeful and finite)

All motion uses transform or opacity only, nothing loops, and everything sits inside `@media (prefers-reduced-motion: no-preference) { :root:not([data-motion="reduce"]) … }`. Reduced motion also forces every transition to 0 ms.

| Moment | What it explains | Evidence |
|---|---|---|
| **Fig. 1 arrival**, once per session | The now line grows (360 ms). Year bins arrive left to right: dots `scale(.6 → 1)` plus opacity, with a 30 ms stagger and a 60 ms beat between years. Each lane line extends from its first paper to now (`scaleX`, linear). Shared links grow after their column. The pearls settle −6 px on the critically damped curve, at full opacity from frame 0. In-progress rings fade in last | Frames `shots/intro-{0,150,400,800,1200}ms.png`. 41 animations, last end at 1280 ms, 0 infinite (MEASURED) |
| **Linked highlighting** | A lane, lede name or pearl lights its line and its shared papers; a dot or ledger row lights one paper and its twin | `shots/hover-lane-loj.png`, `hover-lede-ai.png`, `hover-dot-blaettchen.png`, `hover-row-dispatching.png`, `focus-lane-pw.png` |
| **Pearl → direction page morph** | `document.startViewTransition`: fetch `research.html`, swap the body, `pushState`. Exactly one `pearl-learning-on-the-job` per page and viewport: the 34 px home pearl becomes the 96 px Figure 2 pearl (on mobile, the 24 px strip pearl becomes the 64 px header pearl). 420 ms `cubic-bezier(.2,0,0,1)`; the root crossfade is 160 ms. Figure 2 then draws its line, stubs and labels with a 60 ms stagger | `shots/morph-200ms.png`, `morph-landed.png`. The view-transition pseudo-elements for `pearl-learning-on-the-job` were captured (MEASURED) |
| **Plate step-through**, reader-triggered | 1: orders arrive, each as one pearl. 2: they split into chop → cook → plate and the arrows grow. 3: the chef leaves (dashed lane; the understaffed rounds and the 34-tick mark appear). 4: the four Phase II arms grow from R. Steps are announced in an `aria-live` note. "Show all steps" restores everything | `shots/plate-step1-mid.png`, `plate-step{1..4}.png` |
| Filter changes | Results steep in (opacity, 240 ms) | — |

**Removed:** idle float, parallax, stir, halos, gloss, the overshoot and the Pause button. Nothing loops, so WCAG 2.2.2 needs no Pause.

## Deviations from the spec, and why

1. **Lane order is `direction_order`** (Algorithmic Advice, AI at Work, Learning on the Job, Platform Work), as the task requires.
   - The Precise or Broad? link then crosses the AI at Work line. That line gets a paper-coloured gap where the link passes over it, and the caption says "passing over any line between them".
   - The validator's chain order is shown at `?order=chain`, with its own caption: "Lines are in the order the site validator suggests…".
2. **Each lane line starts at its own first paper**, not at the first column. This is more data-true: it shows that three directions begin in 2025.
3. **Headings are at most 2.25rem.** The §5.3 `--t-head` of up to 4.25rem conflicts with the RC-3 probe, and the probe wins. The question dek on the direction page is 2rem at wdth 87.
4. **The header rule is 1 px, not 2 px** (RC-4 budget: the figure's two rules already fill it). The home ledger and the secondary tables open with 1 px ink.
5. **Inline year headings** in the ledger instead of a year column (C.1 #3: the big-year rail belongs to P1).
6. **Figure 2 labels sit opposite their stub** instead of strictly alternating, so a stub never crosses a label.
7. **Figure numbers on the paper page.** The plate is "Figure 1", because "Figure 3" on a standalone page has no Figures 1 and 2.
   - The Learning to Gig plate appears on the direction page (Figure 3) and on the project page (Figure 2). A plate belongs to the paper, so it shows wherever the paper does.
8. **The Learning to Gig plate is drawn from `in_brief` only.** SSRN 5387320 returned HTTP 403 to my fetch again.
   - It shows: offer, accept or decline, experience, unknown rates, and three approaches tested on delivery-platform data.
   - It is labelled "Draft schematic, pending author check". The three workers are drawn for illustration, and the caption says so.
9. **The home header has no descriptor.** The hero's label column already names the lab, and the name was otherwise said three times (AUDIT L3).
10. **Only the Learning on the Job direction page exists.**
    - The other lane labels and lede names link to `publications.html?dir=…`, which preselects that direction.
    - Ledger titles link to `paper.html` for Bastani et al. and to the first public version for the other papers.
11. **Mobile figure.** The live caption line is hidden on touch, because pointer-only names do not work there. The caption swaps to a mobile wording that explains the strips.
12. **The experiment line in the plate is a drawn stroke** (a pseudo-element), not a CSS border, so the rule probe does not count it as a heavy rule. Disclosed here because it is a diagram line, not a section rule.

## Overflow rule (RC-19), shown at `?n=4x`

| Viewport | What happens | Evidence |
|---|---|---|
| Desktop | When columns would fall below 28 px, papers pack inside their year bin at a 12–16 px pitch with 10 px dots, links switch to twin rings, and the in-progress zone narrows to 140 px. At 1366 px this holds to about 63 papers. Beyond that, the rule is to merge the oldest bins ("2021–2023"); this is **not implemented** | `shots/v-4x-1366.png` |
| Mobile | The strips wrap | `shots/v-4x-390.png` |

## Measurements

**Fonts:** one file, `@fontsource-variable/archivo@5.3.0` `archivo-latin-wdth-normal.woff2`, 90,104 B = **88.0 KiB** (MEASURED, HTTP Content-Length). No italic. DOI and BibTeX use the system mono stack.

**JS (gzip -9, unminified source; no build step):**

| File | Size | Budget | Ships? |
|---|---|---|---|
| `fig.js` | **2,447 B** (6,087 B raw) | ≤ 2.5 KB | yes |
| `site.js` | 1,870 B | — | yes |
| `harness.js` | 597 B | — | prototype only, never ships |
| inline head script | 194 B | — | yes |
| **Shippable total** | **≈ 4.5 KB** | ≤ 8 KB | — |

**CSS:** 8.75 KB gz.

**AI-tell DOM probe** (§5.0, all 6 pages at 1440 light; script `…/proto/p3-tools/probe.js`). All MEASURED:

| Probe | Result |
|---|---|
| Pills, rounded boxes, tracked caps, mono outside `code`/`pre`/`.doi`/`.bibtex`, ≥ 2 "·" in one text node, gradients and shadows, infinite animations | **0** |
| "→" | **0** per page |
| Other arrow glyphs | **0** |
| Cream surfaces | **0**. The probe flags oolong `#6B4500` (hue about 70°) on 6–14 px data marks. They are marks, not surfaces, so the probe counts fills of 1,600 px² or more |
| Text above 2.25rem outside Fig. 1 | **0** |
| Tracking below −0.015em, or leading below 1.0 | **0** |
| Numerals ≥ 2rem that are counts | **0** |
| `^0[1-9]$` | **0** |
| Condensed width below 2rem | **0** |
| Heavy rules per viewport | max **2** |
| Discs ≤ 12 px | only paper marks (`.f2-tw` twin dots, `.onl i` on the paper page) and direction marks (roster matrix) |
| Fonts | Archivo only, plus `ui-monospace` in BibTeX and the DOI |

**axe-core** (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa):
- **0 violations** on all 24 runs: 6 pages × light and dark × 1440 and 390 (MEASURED).
- Fixed along the way: the scrollable lineup table needed `tabindex` and a region label.

**Contrast** (WCAG 2.x, computed with `p3-tools/contrast.py`):

| Token | Light (paper / band) | Dark (paper / band) |
|---|---|---|
| ink | 18.56 / 16.68 | 15.50 / 14.31 |
| muted | 7.54 / 6.77 | 8.12 / 7.49 |
| rule (control boundaries) | 3.69 / 3.32 | 4.69 / 4.33 |
| pea | 7.54 | 7.89 |
| lychee | 6.95 | 8.50 |
| matcha | 5.11 / 4.59 | 11.67 |
| oolong | 8.48 | 6.85 |
| hairline (decorative only) | 1.39 | 1.40 |

**Layout checks** (all MEASURED):

| Check | Result | Requirement |
|---|---|---|
| Fig. 1 plate bottom at 1366×768 | 759.7 px | ≤ 768 |
| Horizontal scroll at 320 px | none on all pages | none |
| Fig. 1 top at 390×844 | 518 px | within 844 |
| First publication title at 390 | 417 px | ≤ 600 |

**Variants captured:**
- rings, `shots/v-rings-1440.png`;
- suggested order, `v-chain-1440.png`;
- forced colours, `v-forced-1440.png`;
- fonts blocked, `v-nofonts-1440.png`;
- no JS, `v-nojs-1440.png`: the lane list with counts and "Shares …" sentences, plus a one-line note;
- reduced motion, `v-reduced-paper.png`.

## Known issues and weaknesses

1. **Data question.**
   - Appendix A counts Lee 2025 (*Non-Adoption of "Optimal" Algorithmic Advice*) as an Algorithmic Advice paper, but `content/publications/lee-2025-…md` has no link and no DOI.
   - So the caption's "each filled dot is a paper" holds, but "with a public version" would not. I dropped "with a public version" from the caption rather than drop the paper.
   - The counting rule and the snapshot disagree. The lab should resolve this.
2. **The lineup test has not been run with people.**
   - My reading (HYPOTHESIS): mark A, the wide b on its rule, does not pair with any of the six generic icons. Mark C, four lines, reads as a text-align or menu icon and fails.
3. **Forced colours.** SVG dots keep their inline line colours (`style="fill:…"` wins over the `forced-colors` rule). Directions stay identifiable by lane position and text label, but colour is not fully system-mapped.
4. **Small text in plates on narrow screens.** Plate SVG text scales with the viewBox. At 390 it is about 14 px; at 320 it drops to about 11 px. A port should move the plate labels into HTML.
5. **Live caption height.** At rest the line above the plate reserves 3 lines, so the gap above the year row looks generous. This is the price of no layout shift; an earlier version flickered because the caption reflowed under the pointer.
6. **The route indicator is small** (24 px) and its lane hairlines are decorative (1.39:1). The text meta column carries the direction names, so nothing depends on it.
7. **Morph back navigation reloads the page** (`popstate` → reload). Opening the link in a new tab, or with modifier keys, is a normal navigation.
8. **Dark mode pearls are light ink discs.** They are flat, with no glow, but at 96 px a light disc on near-black can read as "lit" (HYPOTHESIS; compare AUDIT I4).
9. **Fonts load from jsDelivr** (prototype rule). Production must self-host.
10. **Figure 2, the project line and the plates use fixed pixel geometry** tuned for these data (4 papers, 2 bins). A real component needs the same packing rule as Fig. 1.
11. **The display line "How people learn to work with algorithms"** paraphrases the mission and needs PI confirmation (§5.3).

## Tools (scratchpad, not deliverables)

Everything lives in `…/scratchpad/redesign/proto/p3-tools/`:

| File | What it does |
|---|---|
| `data.js` + `gen.js` | Generates the six HTML pages from the content snapshot |
| `shoot.js` | Screenshots |
| `motion.js` | Intro frames, hover, morph, plate steps, fold and 320 px checks |
| `variants.js` | Captures the rings, chain, 4x, forced-colours, no-fonts, no-JS and reduced-motion variants |
| `probe.js` | §5.0 probe plus axe |
| `contrast.py` | Contrast ratios |
| `glyph.py` | Outlines the favicon from Archivo |

Serve with `python -m http.server 8733` in `p3/`. The morph fetches pages, so `file://` will not work for it.
