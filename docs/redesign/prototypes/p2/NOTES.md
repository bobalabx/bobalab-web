# P2 "Settle": notes

Prototype of DIRECTION.md §5.2 as revised by the Critique (RC-2, RC-3, RC-4, RC-6, RC-8, RC-12, RC-13, RC-17, RC-19, RC-21). Static HTML + one CSS file + four small scripts. Content is the lab's own (`content/**`, Appendix A); nothing is invented. Labels: MEASURED, DOCUMENTED, HYPOTHESIS as in DIRECTION.md.

## How to view

Serve the folder over HTTP (cross-document view transitions need a real origin), e.g. `python -m http.server 8762` in this folder, then open `index.html`. The pages are plain files: `src/build.mjs` is only the generator that wrote them from `src/data.mjs` so that nav, footer, glyph sprite and ledger rows stay identical across pages. Viewing needs no build. Flags: `?theme=dark|light`, `?motion=reduce`, `?n=2x|4x` (growth harness), `?ground=spot` (research page), `?intro=1` (replay the Fig. 1 intro), `?dir=<slug>` (publications preset).

## Intent

One rule makes everything: pearls sink and settle, and a pearl rests above the floor only on two pearls below it. P2 uses that rule three ways and nowhere decoratively:

1. **Data.** Fig. 1 is four piles on one floor. Every pearl is one paper, dropped in year order into the lowest settled slot, leftmost first, so the oldest work is the sediment and the newest sits on top. Work in progress is an open ring floating above the pile, because it has not settled. A paper shared by two directions is a pearl in both piles, and hovering one rings its twin.
2. **Identity.** The direction glyphs (IDENTITY-RESEARCH §3.3 codes, unchanged) appear only as 18–24 px tags beside a label, and once at poster scale as the 240 px direction header, the one extreme. The favicon and header mark are a new four-pearl "shoulder" (three on the floor, one settled on the left shoulder: the defining detail of the frozen lab mark).
3. **Composition.** Everything rests: the lockup on the header rule, headings on 1 px ink rules, piles on a 2 px floor, the header glyph on the direction rule, arms of the experiment on their rules, the lab mark on the footer rule. Nothing floats except work in progress.

Colour is data only: four spot inks on piles, glyphs and diffusion underlines; text is always ink. Type never exceeds 2.25rem; scale belongs to the mark.

## Key decisions and deviations from the spec (with reasons)

| Spec | What P2 does | Why |
|---|---|---|
| Fig. 1 floor width w = 6 for all piles, overflow to 8 at > 21 (§5.2, RC-13/RC-19) | w = the smallest triangle that holds the largest pile, the same for every pile (currently 3; ?n=2x gives 5, ?n=4x gives 7). Pitch shrinks to fit the column only when needed | MEASURED from the data: with w = 6 and at most 6 papers, every pile is a single flat row, i.e. a dot tally, and nothing ever settles. The smallest common triangle keeps one scale for all piles (the spec's reason for w = 6) and makes the settling visible now. The 4x capture shows it holding 24 papers as a real pile |
| Pitch u = 22 px desktop, 14 px mobile | 52 px desktop, 34 px mobile | With w = 3 the piles are small; 52 px keeps the plate within the 1366×768 fold (caption bottom MEASURED at y = 663) and spot area at 2.3 % of the viewport |
| Ring gap: unspecified | rings sit 0.55u above the tallest possible pile row | reads as "about to settle" without a void |
| W3 lockup uses ∴; ∴ allowed only there (RC-2) | ∴ retired everywhere; the shoulder (`10/111`) is used in the lockup and, with a floor bar, as the favicon | MEASURED lineup proxy (normalised cross-correlation of rasterised shapes vs the critique's six generic icons): ∴ 0.94 with "group" (reproduces the known failure); shoulder on floor ≤ 0.33; shoulder 0.39; "b" letterform 0.27 (fallback). One small mark across lockup and favicon is a stronger identity than two |
| Glyph viewBox exactly 0 0 4 3.5981 | viewBox height cropped by 0.08u (centres unchanged) so floor pearls touch the rule; the 240 px header glyph also crops the empty fourth lattice column so it sits flush right | "Everything rests" has to be literal at 240 px, where a 4.8 px gap under the floor reads as floating |
| Ledger row with a 6rem year column | inline year headings over a 1 px rule; [main / 15rem side] rows | RC-4 reserves the year rail for P1 |
| Statement at 3rem on mobile | 1.625rem on mobile, 2.25rem desktop | RC-3 cap; 3rem pushed Fig. 1 below 844 px |
| Fig. 1 intro: 280 ms per pearl, 25 ms stagger, opacity 1 from frame 0 | 440 ms per pearl on the settle curve, staggered by **year bin** (150 ms per bin, 36 ms within a bin), each pearl fades in over its first 10 % so unsettled papers are not visible before they drop; rings fade in last; ends at about 1.3 s | Opacity 1 from frame 0 would show every pearl hovering before it drops, which hides the accumulation the intro exists to show |
| Research page 2/4 split with the glyph in cols 4–6 | text cols 1–4, glyph cols 5–6, flush right | avoids the glyph colliding with the 2-line question |
| Recent publications + one extra home section allowed | Home has Fig. 1, recent publications and a People lattice of real squares | headshots are lab-made evidence (keep-list #6) |
| Direction links in Fig. 1 | Only Learning on the Job has a direction mock, so its pile links to `research.html` (with the morph); the other three link to the publications list filtered to that direction | no dead links in a prototype |
| OG card (RC-12) | on `marks.html`, paper white, glyph resting on the bottom margin, kicker "New preprint, AI at Work" | as specified |
| Dark `--alt` `#1B1A18` | `#1B1B1A` | MEASURED: `#1B1A18` has OKLCH chroma 0.0041 at hue 85°, which fails the cream probe (> 0.004). Ink on it 14.50, muted 7.82, rule 3.94 |
| Reversed specimens on ink `#15130F` | on `--rev` `#161615` (light) / `#EDEDEB` (dark) | the warm ink fails the cream probe as a surface (chroma 0.0085, hue 85°). Paper on `#161615` 18.11; night on `#EDEDEB` 16.09 |

## Motion (owner requirement)

All finite, transform / opacity / clip-path only, all inside `@media (prefers-reduced-motion: no-preference) { :root:not([data-motion="reduce"]) … }` or skipped in JS when reduced. No loops; no Pause button needed; footer "Reduce motion" toggle persists in `localStorage` (try/catch).

1. **Arrival (Fig. 1):** papers settle into their piles year by year, all four piles together, once per session (`sessionStorage`). Frames at 0 / 150 / 400 / 800 / 1300 ms in `shots/state-intro-*.png`.
2. **Linked highlighting:** hovering or focusing any direction mark (statement legend tag, pile, any glyph tag in a ledger) sets one page state: the other piles fall to 35 %, every tag of that direction diffuses a 2 px spot underline (`clip-path` circle on a √t curve), and the caption swaps to the direction's question. Hovering a pearl names the paper (title, type, year, "Also in …", first sentence of `in_brief`) and rings its twin in the other pile. On the direction page, Figure 2's key rows and pearls light each other on hover and focus.
3. **Pearl → page morph:** cross-document view transition (`@view-transition { navigation: auto }`), one shared name `glyph-loj` on exactly one element per page: the 24 px Learning on the Job tag under its pile, and the 240 px header glyph. The old snapshot is hidden and the sharp new glyph grows along the settle curve (460 ms); the root cross-fades in 140 ms; the header stays put. Skipped via `pageswap` / `pagereveal` when reduced. A same-document `document.startViewTransition` fallback (fetch + body swap) is included for browsers without cross-document support. Frames: `shots/state-morph-*.png`.
4. **Explanatory, reader-driven:** the study-design plate on `paper.html` has a "Step through the design" button with four finite steps (orders arrive; each splits into chop, cook, plate; the chef leaves and four understaffed rounds appear; Phase II's four arms settle onto their rules), with an `aria-live` step line. No autoplay; the whole plate is shown by default and with JS off. Figure 2 on the direction page settles once when first scrolled into view. Filter changes on publications "steep" results in (opacity, 240 ms).
5. **Affordance:** only nav links, filter toggles and buttons lift 2 px on hover/focus ("buoyancy").

## Measurements (MEASURED, Playwright Chromium, 2026-10-24)

- **AI-tell probe (§5.0), all six pages:** pills 0, rounded boxes 0, tracked caps 0, mono 0, "→" 0, other arrows 0, interpunct strings 0, gradients/shadows 0, infinite animations 0, cream surfaces 0, text > 2.25rem 0, tracking < −0.015em or leading < 1.0: 0, count numerals ≥ 2rem 0, `0n` numerals 0, small non-data discs 0. Heavy (≥ 2 px) rules per 1440×900 viewport: max 2 (research), 1 (home). Script: `tools/probe.cjs`.
- **axe-core 4.14.0 (wcag2a/aa, 21a/aa, 22aa):** 0 violations on all six pages in light and dark.
- **Spot area** (pixel count of the four spot hexes, first viewport): max 2.31 % (home 390), 2.30 % (home 1440); limit 10 %.
- **Layout:** no horizontal scroll at 390 or 320 on any page (tables on the mark sheet scroll inside labelled regions). Home 1366×768: piles bottom y = 584, caption bottom y = 663 (limit 768). Home 390: Fig. 1 starts at y = 536 (limit 844). Publications 390: first title at y = 436 (limit 600).
- **Contrast (WCAG 2):** light ink/paper 18.55, ink/alt 17.45, muted/paper 7.64, muted/alt 7.18, rule/paper 3.66; dark ink/paper 15.86, ink/alt 14.50, muted/paper 8.55, muted/alt 7.82, rule/paper 4.31. Spots as graphics on paper 3.15–3.96 (light), 4.77–5.99 (dark). `?ground=spot` ink on matcha 4.69. Spots are never text.
- **JS (gzip -9, unminified source):** `site.js` 1.3 KB, `fig.js` (Fig. 1) 2.34 KB (budget 2.5), `fig2.js` 0.95 KB, `pubs.js` 1.21 KB, `plate.js` 0.94 KB. Per page: home 3.65 KB, research 2.26 KB, publications 2.52 KB, paper 2.25 KB; all five together 6.7 KB (budget 8). CSS 7.5 KB gz.
- **Fonts:** Familjen Grotesk wght 18.5 KiB + Literata wght 51.3 KiB + Literata 400 italic 20.7 KiB = 90.5 KiB, from pinned jsDelivr Fontsource 5.3.0. No mono.
- **Console errors:** none across the state captures.

## Screenshots (`shots/`)

Every page at 1440×900 and 390×844 (DSF 2), light and dark: first screen with motion on (`{page}-{w}-{scheme}.png`) and the full page with reduced motion (`…-full.png`). States: intro frames, pile hover, legend hover, pearl/twin hover, keyboard focus, morph frames, Figure 2 hover, plate steps 1–4, `?n=4x` at 1366 and 390, publications filtered and searched, forced colours, grayscale, fonts blocked.

## Known issues and weaknesses

- **The lineup test is a proxy.** The favicon was chosen by rasterised-shape correlation against the six generic icons, not by the required blind three-person test. Run it before adopting.
- **Three of four piles currently look the same** (4 papers each, a three-pearl floor with one on the shoulder). That is the data, and it happens to be the favicon's silhouette; it will change as papers arrive, but today the figure says less than P3's timeline about *when*. Year order is only recoverable by hovering.
- **Learning on the Job's glyph (`0/10/110/1110`) is a symmetric six-pearl triangle**, the same silhouette as Platform Work's six-paper pile in Fig. 1. The glyph is a 24 px tag under a different pile and the piles are 52 px, so they are not read as one thing, but at a glance the shapes rhyme. The glyph set (IDENTITY-RESEARCH §3.3) was left unchanged; reassigning it is an owner decision.
- **Spot inks remain the "startup" risk** flagged by the critique: at 52 px the pea and lychee discs are bright. They stay under 2.4 % of any viewport and only appear as data, but a Haas faculty five-second test is still needed.
- **The project schematic is a draft** built only from `in_brief` (the SSRN page was not reachable in the critique); it says so and labels stack heights as illustrative. The Bastani plate uses only the design facts in Critique C.3 and draws no schedule and no result, but both need PI sign-off (`pi_verified`).
- **The paper page's `in_brief` states a result** ("the tips raised performance"). It is the lab's own summary and sits outside the plate; the plate itself has none.
- **The same-document view-transition fallback is untested** (Chromium supports the cross-document path, which is what the captures show).
- **Unminified JS.** Sizes above are gzip of readable source; a production minifier would cut them further.
- **Photos** are the seven consented headshots copied into `img/people/`; the PI, Shunan Jiang and William Deng use initials squares (no consented photo).
- The reversed-specimen and dark `--alt` tokens differ slightly from the spec table (see deviations) to pass the cream probe.

## Files

`index.html`, `research.html`, `publications.html`, `project.html`, `paper.html`, `marks.html`, `p2.css`, `site.js`, `fig.js`, `fig2.js`, `pubs.js`, `plate.js`, `favicon.svg`, `img/people/*.jpg`, `src/` (generator + data), `tools/` (screenshots, probe, lineup measurement, morph frames), `shots/`, `MAPPING.md`, this file.
