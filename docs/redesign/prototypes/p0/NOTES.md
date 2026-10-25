# P0 "Control": notes

The control arm of the redesign test (DIRECTION.md §5.4, RC-1). Same fonts, palette, spacing, header and Fig. 1 cluster as the live site. What changed is the chrome and copy that §1.1 causes 2, 3 and 6 describe, plus the motion clean-up. If P0 scores close to P1–P3 in the blind test, the font and palette migration is not justified.

## Files

- `index.html` home; `research.html` Learning on the Job (the morph target from its pearl); `research-algorithmic-advice.html`, `research-ai-at-work.html`, `research-platform-work.html` (so every pearl lands on a real page); `publications.html`; `project.html` (Dispatching for Worker Development); `paper.html` (Bastani, Bastani & Sinchaisri 2026); `marks.html`.
- `proto.css`, `proto.js`, `favicon.svg`, `img/ryan-jesubalan.jpg` (consented headshot, D-12).
- `MAPPING.md`: every component → live class names → tests.
- `shots/`: final captures. `{page}-{1440|390}-{light|dark}.png` (390 at DSF 2, full page); `intro-{0,150,400,800}ms-1440-light.png`; `hover-legend-loj-1440-light.png`; `hover-seed-1440-light.png`; `morph-200ms-1440-light.png`; `research-row-links-seed-1440-light.png`; `detail-filters-1440-light.png`; `index-1440-forced-colors.png`; `growth-n4x-1366-light.png`.
- Authoring sources (not part of the prototype; the HTML above is hand-checked static output): `../p0-src/build.mjs` writes the pages from the real `content/**` fields; `shoot.cjs`, `probe.cjs`, `interact.cjs`, `el.cjs`, `fc.cjs`, `n4.cjs` are the capture and audit scripts; `probe-report.json` is the full probe + axe output. Serve the folder over http (any static server) to see the morph; from `file://` the pearl click falls back to a plain navigation.

Query flags: `?theme=dark|light`, `?motion=reduce`, `?intro=1` (replay the arrival), `?n=2x|4x` (growth harness, SYNTHETIC copies, never in content).

## Intent

Change as little as possible and make each change one the audit can name. A judge comparing the live site with P0 should see the same lab, the same cream, the same Fraunces/Inter/Plex voice and the same pearls, minus: pills, rounded content boxes, tracked mono eyebrows, link arrows and icons, "A · B · C" strings, pipeline caveats, the plate box and crop marks, halos/glow/sheen, numerals in pearls, and every looping or decorative motion.

## Decisions

1. **Kept exactly:** tokens (hex for hex, light and dark, all eight swatch rows used here), the font files (the same 36,620 + 48,256 + 14,888 bytes = 97.4 KiB the live budget counts), the spacing scale, the header lockup, the 5-column t4 slot template with its nudges, `D = clamp(5rem, 14cqi, 6.5rem)`, orbit radius 0.64 D, seed size, the ±75° arc and the clock-slot fill order, the 46em figure/list switch, the 5fr/7fr hero with the figure bleeding ≤ 8rem into the margin, the direction band and its 14rem label column.
2. **Pills → text.** Paper type is the first line of each row ("Working paper, 2026"). "Active" is never printed; "Completed" appears only on the one completed project. Filters are `<button aria-pressed>` text toggles: pressed = ink, 600, 2 px ink underline; unpressed = muted with a 1 px `--rule` underline (4.31:1, so the control boundary still passes 1.4.11). The material buttons (PDF, arXiv, DOI) keep their 2 px-radius outline because AUDIT P6 calls them the academic convention; only their icons go.
3. **Boxes → ledgers.** Projects, related projects, the direction rail, work in progress and the citation block are rows with hairlines. One rule per section: lists inside a `.dr-section` start on the section's rule rather than drawing a second one 30 px below it (the "two kinds of frame" that AUDIT-SYSTEM §1 measured).
4. **Copy.** No "reported by the lab", "listed by title only", "This direction collects/gathers", "Explore our research", "All X →". One provenance footnote on /publications/. "Why it matters" opens with the direction's `summary` field. Breadcrumbs name the direction instead of "Research / 03". Status reads as a sentence ("4 projects, 4 papers and 1 in progress. Shares papers with Platform Work (3) and Algorithmic Advice (1).").
5. **Flat pearls.** One fill, `--pearl`. In dark mode a 1 px `--rule` edge (`--pearl-edge`, 4.37:1 on the night page) replaces the rim, halo and bottom glow. The header pearl and the wordmark's pearl-O lose the crescent highlight too, for consistency.
6. **Fig. 1 became slightly more data-true** (allowed by keep-list #1): each seed is now a specific paper, placed oldest → newest left to right along the existing arc, and the caption says order within a year is not meaningful. The home statement's CTA slot carries the four direction names as a sentence that doubles as the figure's legend.
7. **Lab members in weight 600** in author lists, no dot. `in_brief` appears as a 2-line muted line in every ledger row that has one; rows without one show nothing.

## Motion (owner requirement: alive, purposeful, finite)

All transform/opacity, all inside `@media (prefers-reduced-motion: no-preference) { :root:not([data-motion="reduce"]) … }`, nothing with `iteration-count: infinite`, so there is no Pause button.

| Moment | What it explains | Spec |
|---|---|---|
| Arrival (once per session, `shots/intro-*`) | The directions settle, then each paper leaves its pearl for its place on the ring, oldest first | Pearls `translateY(-12px → 0)` on the critically damped `linear()` settle curve, 600 ms, 60 ms stagger, opaque from frame 0 (the live −28/+4/−1 bounce is gone). Seeds grow out from the pearl centre, 420 ms, 300 ms + 60 ms·i + 45 ms·k. Ring and caption fade. Last frame ≈ 1.2 s |
| Text ↔ figure (`hover-legend-loj`) | A direction name and its pearl are the same thing | Hovering or focusing a name in the legend sentence, a pearl label or a pearl: that pearl lifts 3 px / 1.05, its papers move out to r × 1.10, other directions' papers dim to .45 (pearls stay at full strength), the caption swaps to the direction's summary and counts, and the matching legend link underlines in the direction colour |
| Seed names its paper (`hover-seed`) | A dot is a paper, and a shared paper lives in two directions | Pointer only (RC-18). The seed and its twin in the other direction scale 1.6 and take the deep tone; the caption names the paper, type, year, "Also in …" and the first sentence of its `in_brief` |
| Pearl → direction page (`morph-200ms`) | This pearl *is* that page | `document.startViewTransition` around a fetched swap of the direction page; `view-transition-name: pearl` is set on the clicked pearl only and on the direction hero pearl only, so each state has exactly one element with the name. 420 ms `cubic-bezier(.2,0,0,1)`; on landing the papers spread back out (`[data-bloom]`) |
| Paper row ↔ direction pearl (`research-row-links-seed`) | Each listed paper is one of the dots in the header | Hover or keyboard focus on a paper row lights its dot and names it under the status line; hovering a dot does the same |
| Study-design step-through (paper page) | How the experiment is built | Reader-triggered button, four finite steps: orders arrive (12 pearls settle), each splits chop → cook → plate (arrows extend), the chef leaves (disrupted configuration, 34 ticks), Phase II's four arms appear. No autoplay; reduced motion hides the button and shows the whole plate |
| Filters | The list now reflects the choice | Newly shown rows "steep" in (opacity, exponential `linear()`, 240 ms) |

Reduced motion (OS or footer toggle): no transforms, no intro, caption swaps instantly, the morph is an ordinary navigation, the plate is static.

## Deviations from the spec, and why

1. **The paper page has a study-design plate.** §5.4 says P0 should include the paper mock *without* a plate, so the plate's contribution can be read off P1–P3. The task for this build requires the plate on `paper.html` and a step-through motion on a research or paper page, so it is included, drawn in the current kit (Inter labels, hairlines, flat pea pearls, 2 px pea caption rule) and labelled Fig. 2. To recover the strict control, delete the `<section … aria-labelledby="design-h">` block; nothing else depends on it.
2. **Seed hover, paper-row linking and the legend sentence are new interactions**, against "do not add anything new". They add no new visual element (the legend replaces the CTA in the same slot), and the motion requirement asks for text ↔ figure linking.
3. **One view-transition name (`pearl`)** instead of the live per-slug names and React `<ViewTransition>`. That is a static-prototype simplification; MAPPING.md says to keep the live names in the port.
4. **Nav** lists Research, Publications, Projects and Marks (the pages that exist) instead of the live Research / Publications / People / News / Join, so no link is dead.
5. **Counts** follow DIRECTION Appendix A (AA 4, AI 4, LOJ 4, PW 6). Lee 2025 (*Non-Adoption of "Optimal" Algorithmic Advice*) is counted as a paper there although its content file has no link or DOI, only a 2022 workshop talk; under the §5.0 counting rule it would be "in progress". The key therefore says "= 1 paper" without "or a documented talk". Its title is unlinked.
6. **Paper titles** link to `paper.html` for Bastani 2026 and to the first public link (publisher, SSRN, arXiv or PDF) for the rest, because only one paper page exists.
7. **The project page's "question"** rewrites the first sentence of *Learning to Gig*'s `in_brief` ("Asks how a platform should offer jobs …") as a question, with a source line. That is a light edit of lab text and needs PI approval before it ships.
8. **Shunan Jiang** is shown as "PhD student, IEOR; lab member until 2025" (`end: "2025"` in content); the live site prints "Alumni · PhD student". The collaborator Xinpeng Qu (`consent: false`) is not listed on the team, only as a paper author.
9. **Overflow (RC-19):** P0 keeps the live rule, at most 12 dots per pearl with the number in the count. `?n=4x` shows it (`growth-n4x-1366-light.png`): Platform Work reads "24 papers" with 12 dots, and the plate bottom stays at y = 663 at 1366×768. The rule hides papers at 2x and beyond; that is the control's honest weakness.

## Measurements

**AI-tell probe (§5.0)**, all 9 pages at 1440×900 light (`probe-report.json`):

| Probe | Result |
|---|---|
| Pills | 0 (the orbit ring is a pearl part and is excluded like pearls) |
| Boxes > 60 px with radius > 2 | 0 |
| Uppercase tracked > 0.02em | 0 |
| Monospace outside code/pre/.doi/.bibtex | Exempt for P0. 6 nodes on home (header name, "Fig. 1", four "N papers" counts), 1 elsewhere (header name) |
| "→" | 0 on every page |
| Other arrow glyphs incl. CSS `content` | 0 |
| Text nodes with ≥ 2 "·" | 0 |
| Gradients / non-focus box-shadow | 0 |
| Infinite animations | 0 |
| Cream test | Exempt for P0 (the cream is kept on purpose) |
| Text above 3.25rem outside Fig. 1 | 0 (h1 tops out at 3.25rem) |
| Letter-spacing < −0.015em or line-height < 1 | 0 |
| ≥ 2 px rules in one viewport | ≤ 1 (the caption's 2 px left rule on home) |
| Count numerals ≥ 2rem | 0 (the four year headings on /publications/ are years, not counts) |
| `^0[1-9]$` | 0 |
| Small discs that are not paper/direction marks | 0 |

**axe-core 4.14.0** (wcag2a, 2aa, 21a, 21aa, 22aa), every page at 1440 and 390, light and dark: **0 violations** (36 runs). One `scrollable-region-focusable` on the mark sheet's lineup table was fixed by making the scroller a focusable labelled region.

**Contrast** (WCAG 2.x, computed): light ink/paper 16.93, muted/paper 7.57, muted on footer/note `#f4f0ea` 6.96, accent link/paper 6.85, accent on matcha band 5.86, muted on the bands 6.23–6.49, `--rule` control boundary 4.31 (4.49 on white inputs), pea plate pearls 7.27. Dark: ink 15.95, muted 9.02, accent 8.63 (8.32 on the footer), muted on bands 7.47–7.57, rule 4.37, pearl edge 4.37, focus ring (accent) 8.63. Seeds at rest stay decorative (light 1.94:1, as live); every paper they stand for is a link in the ledger, and the hovered seed takes the deep tone (5.22:1 on the matcha band).

**Sizes:** `proto.js` 9,435 B raw / **3,606 B gz** total (budget 8 KB); the figure part (Fig. 1 linking, growth harness, morph) ≈ **1,704 B gz** (budget 2.5 KB); inline pre-paint script 284 B gz. `proto.css` 10.6 KB gz. Fonts 97.4 KiB, unchanged.

**Responsive:** no horizontal scroll at 390 or 320 on any page (scrollWidth checked). At 390 the figure is in the live list mode and starts inside the first screen; on /publications/ the first title sits at y ≈ 530 (AUDIT L7 asks ≤ 600). At 1366×768 the Fig. 1 caption bottom is at y ≈ 663.

## Known weaknesses

- **It still looks like the kit.** That is the point of a control, but by eye the cream, Fraunces mission and mono header name still carry the "warm editorial" read. The cleanup makes the pages calmer and more academic; it does not make them distinctive.
- **The mark fails the lineup** (marks.html): the flat 16 px pearl is a full stop, and the centre of the radio icon. P0 adds no mark by design.
- Pearls without halos are four identical brown discs at rest; direction colour now lives only in the muted seeds and the labels' hover underline. In dark mode the brown pearls on the brown page are low-key.
- The paper-row ↔ header-pearl link on direction pages only pays off while the header is on screen; on a laptop the paper list starts below it.
- Seed hover is pointer-only and seeds have ~20 px targets (the information is also in the ledger, RC-18).
- The hero still says the lab's name three times above the fold (header, wordmark, mission). The mission is CMS text and was left verbatim.
- The plate's wide layout is an SVG with hand-placed text; long labels were checked at 1440 and 390, but translated or edited text would need re-layout.
- The morph uses a fetch-and-swap in the prototype; from `file://` it falls back to a plain page load.
- Not mocked: People, News, Join, About, 404. Forced colours were checked by eye on the home hero only.
