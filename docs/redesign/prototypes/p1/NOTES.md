# P1 "Notebook": notes

**What it is.** A static prototype of DIRECTION.md §5.1 as revised by the Critique: journal conventions used for real, a margin rail, a numbered figure on every page, flat ink pearls whose seeds are papers, ledgers instead of boxes, and a masthead list of people with square photos. Six pages share one header and footer: `index.html`, `research.html` (Learning on the Job), `publications.html`, `project.html` (Dispatching for Worker Development), `paper.html` (Bastani, Bastani & Sinchaisri 2026, with the study-design plate), `marks.html`.

Open it through a local server so the view-transition navigation can fetch pages: `python -m http.server 8611` in this folder, then http://127.0.0.1:8611/. Opened as `file://` everything still works, but navigation is a normal page load (no morph).

`tools/build.mjs` writes the six HTML files from `tools/data.mjs` (real content copied from `content/**`). It is only an authoring convenience: the HTML files are the deliverable and there is no build step to run them.

## Intent

The site should read like the lab's working record. The one structural device that is P1's alone is the **margin rail** (section labels, year numerals, figure captions). The one extreme is the **numbered-figure system**: every page carries a figure with a 2 px rule above it and a sentence caption, and figures are the only places with heavy rules. Type does the rest quietly: STIX Two Text (a face made for scientific publishing) for titles and prose, Atkinson Hyperlegible Next for metadata and UI, Atkinson Mono only in the BibTeX and DOI.

## Key moves

- **Fig. 1 as a plate, caption in the notes column.** Four flat ink pearls in the existing zig-zag cluster; each dot on a pearl's ring is one public paper, placed in year-bin order with the oldest at the left; a ringed dot is shared by two directions. At >= 64rem the caption sits in the notes column (cols 10–12) beside the figure rather than under it: the plate then fits the 1366x768 fold (plate bottom measured at y = 750) and the live caption swaps right next to what it describes.
- **Text is the legend.** The four direction names in the home sentence are links with a seed dot; hovering or focusing one lights its pearl (its seeds spread to r x 1.10, other directions' seeds dim to .45, pearls never grey out) and the caption becomes that direction's question and its shared papers. Hovering a seed names the paper (title, type, year, "Also in ...", first sentence of `in_brief`) and draws the line to its twin. Hovering or focusing a ledger entry lights its seed(s) on every figure on the page, and a margin mark appears beside the entry. The same linking runs on the direction page (entry <-> rail pearl <-> Figure 2) and the publications page (entry <-> year-histogram dot).
- **Paper-level focus where it is safe (RC-18).** Home seeds are `aria-hidden` and pointer-only; keyboard users get the same information from the pearl links' descriptions and from the ledger. Paper-level focus is on Figure 2 of the direction page, where every paper is an ordinary link in tab order. No arrow-key model anywhere.
- **The study-design plate** (paper page, Figure 1): three panels (a) one round: 12 subtask pearls in the direction's ink, chop -> cook -> plate precedence, three empty worker lanes (no schedule); (b) the normal and disrupted configurations, line length = optimal finish (20 / 34 ticks); (c) Phase I -> Phase II with four arms. Design facts only, from DIRECTION.md C.3; source line under the caption; no results.
- **The mark: "the ruled b".** The 2 px rule that opens every figure, set over a STIX Two Bold "b" (outlined from the font, not typed). No circles, so it cannot be confused with the six generic icons of the lineup; pixel-tuned at 16 px (stroke-emboldened, stem snapped). Shown in `marks.html` at 16/32/48 px, as an 8x raster of the real 16 px tab icon, one colour, reversed, in the four direction inks, and in the lineup table. The blind three-person lineup test has **not** been run.
- **Members as a masthead list** (RC-9): PI first with a 160 px initials square (no photo exists), then a two-column list with 64 px square photos, then alumni with years flush right.

## Motion (owner requirement: alive, purposeful, finite)

All motion is transform/opacity only, has no loops, sits inside `@media (prefers-reduced-motion: no-preference) { :root:not([data-motion="reduce"]) ... }`, and the footer "Reduce motion" button (`aria-pressed`) switches it off.

1. **Arrival of Fig. 1** (once per session; `?intro=1` forces it): pearls settle from -12 px on the critically damped curve, opacity 1 from frame 0, 60 ms stagger; the hairline orbits fade in; then every paper emerges from its pearl and travels to its place on the ring **in global chronological order** (the 2021 dissertation first, the 2026 preprints last), so the lab's output visibly accumulates. Last frame at about 1.2 s. Frames: `shots/motion-intro-{0,150,400,800,1200}ms.png`.
2. **Linked highlighting** between text and figure, as above. Frames: `motion-hover-legend-loj.png`, `motion-hover-pearl-aa.png`, `motion-hover-seed.png`, `motion-hover-entry-lights-seeds.png`, `motion-focus-pearl-pw.png`.
3. **Pearl -> direction morph.** Clicking the Learning on the Job pearl (or any link between pages) runs `document.startViewTransition` around a fetch-and-swap of the next page; the pearl carries `view-transition-name: pearl-learning-on-the-job` on exactly one element per page (home pearl, direction rail pearl). 420 ms `cubic-bezier(.2,0,0,1)`; after landing the four seeds re-spread from the pearl. Back/forward morph the other way. `@view-transition { navigation: auto }` is also declared as the cross-document fallback. Under reduced motion the name is removed and only a 120 ms crossfade remains. Frames: `motion-morph-120ms.png`, `-240ms.png`, `-respread.png`, `-landed.png`.
4. **Explanatory motion on content pages.** (a) Direction Figure 2 assembles once when scrolled into view: each year's axis draws, papers drop onto it in order, leaders and labels follow (`motion-fig2-*.png`). (b) The plate's reader-triggered "Step through the design" button: orders arrive as one pearl each; each splits into chop/cook/plate and the precedence arrows draw; in the disrupted configuration the chef's line goes dotted and the understaffed rounds stretch from 20 to 34 ticks; the Phase II arms branch off. No autoplay; the button is hidden under reduced motion, where all steps show at once (`motion-plate-step*.png`).
5. Small state motion: caption swap (out 100 ms, in 180 ms with a 4 px rise), filter results steep in (opacity only).

Removed: idle float, parallax, stir, halos, gloss, overshoot, Pause button. The optional `?float=1` comparison flag from §5.1 was **not** built (it would add an infinite loop, which this brief forbids).

## Measurements

- **AI-tell probe** (`tools/probe.cjs`, all §5.0 rows, every page at 1440 light, 1440 dark, 390 light): **0 failures**. Pills 0, rounded boxes 0, tracked caps 0, mono outside DOI/BibTeX 0, "→" 0, other arrows 0, interpunct strings 0, gradients/non-focus shadows 0, infinite animations 0, cream surfaces 0, text over 3.25rem 0, tracking/leading violations 0, hero-metric numerals 0, "01–04" 0, non-data small discs 0. Heavy (>= 2 px) rules: max 1 in any 900 px window on every page.
- **axe-core** (wcag2a/aa, 21aa, 22aa) on the same 18 page/viewport/theme combinations: **0 violations**.
- **Contrast** (`tools/contrast.py`, WCAG 2.x). Light: ink 17.43, muted 7.49, rule 3.71, link underline 8.06, direction inks 7.54 / 6.95 / 5.11 / 8.48 on paper; muted 6.86 on `--margin`. Dark: ink 15.42, muted 8.41, rule 4.77, link 8.24, direction inks 7.86 / 8.47 / 11.63 / 6.83. Link text is ink; the blue is only the underline (link vs ink 2.16, so links are always underlined).
- **JS** (`p1.js`, unminified, with comments): **5.46 KB gz** (4.76 KB gz with comments stripped); figure code alone 2.43 KB gz; inline head script 0.29 KB gz. Total 5.75 KB gz, inside the 8 KB budget; figure inside 2.5 KB.
- **Fonts:** 88.8 KiB (STIX wght 27.9, STIX italic 17.8, Atkinson Next wght 33.2, Atkinson Mono 500 9.9), from pinned jsDelivr Fontsource 5.3.0.
- **Fold:** 1366x768 Fig. 1 plate bottom y = 750. 390x844: Fig. 1 list starts at about y = 500; on publications the first paper title is at about y = 520.
- No horizontal scroll at 390 on any page; screenshots of all pages at 1440x900 and 390x844 (DSF 2), light and dark, are in `shots/` (`*-fold.png` = first screen). Extra captures: `x-n4x-1366.png` / `x-n4x-390.png` (growth harness), `x-fonts-blocked.png`, `x-forced-colors.png`.

## Deviations from the spec, and why

- **Separate pages, so figure numbers restart per page** (journal convention): home Fig. 1; direction page Fig. 1 (the rail pearl, a detail of the home figure) and Fig. 2 (papers by year, as specified); the plate is Fig. 1 on the paper page (spec: "Figure 3", numbered for the old one-page mock); project and publications pages each have a Fig. 1; the mark sheet uses Figures 1–4.
- **Fig. 1 caption in the notes column** at >= 64rem instead of under the plate (reason above). Below 64rem it falls under the plate as specified.
- **Section rules are 1 px ink; only figures open with 2 px.** The spec's 2 px rule on every section would put three or more heavy rules in one viewport on short sections (RC-4 limit is 2). Making figures the only heavy rules also strengthens P1's numbered-figure extreme.
- **Overflow orbit outside, not inside.** RC-19 says papers older than three years move to a second orbit at r = 0.50D, which is the pearl's own edge (seeds would sit on the ink). The second orbit is at r = 0.82D, dashed. At `?n=4x` Platform Work's outer orbit is dense (24 papers): a third rule (older still -> r = 1.0D) is not implemented.
- **Seed spacing** uses a 24 degree pitch (wider than seed + gap) until the +-75 degree cap forces it tighter, so small counts read as a dial rather than a clump.
- **Only one direction page exists**, so the three other pearls and statement links go to `publications.html?dir=...` (the ledger, pre-filtered); only Learning on the Job morphs.
- **Titles in ledgers** link to the paper page for Bastani 2026 and to the paper's first public link otherwise (no other paper pages are mocked).
- **Lee 2025** has no public link or DOI in `content/`, yet Appendix A counts it as a paper (Algorithmic Advice = 4). P1 follows Appendix A; the counting rule in §5.0 would make it "in progress". Flag for the PI.
- **Paper header** adds "in the January 2026 issue", taken from the 2025-05-22 news item.
- **Project page** "The problem" opens with a question rephrased from the paper's own `in_brief`; the paragraph under it is the `in_brief` verbatim. Collaborators with `consent: false` are not listed (they appear only as authors).
- **Dark-mode pearls** use the spec's `--pearl` light ink (#E6E9EF): flat discs, no rim or glow. They are bright on the night ground; a mid-grey pearl is the obvious alternative if the owner finds them too loud.

## Known issues

- The fetch-and-swap navigation is a prototype stand-in for Next's `transitionTypes`; it replaces `<body>` and re-runs `init()`. Scroll position on Back is not restored (it scrolls to top or to the hash).
- Hover-only seed captions are pointer-only by design (RC-18); touch devices get the pearl link and the ledger, not seed names.
- The 16 px mark has not had the blind three-person lineup test; the sheet shows the lineup, not a result.
- The study-design plate is drawn from the facts recorded in DIRECTION.md C.3 (arXiv v5), not checked against the paper by me, and needs `pi_verified` before any live use.
- `?n=2x/4x` affects the home, direction and project figures only (not the ledger or the year histogram), and shifts synthetic copies back by 4 years per copy so the overflow rule is exercised.
- Fonts load from jsDelivr in the prototype; with fonts blocked the fallbacks are Georgia and Arial (`shots/x-fonts-blocked.png`): the page holds up because the figure, not the face, carries it.
