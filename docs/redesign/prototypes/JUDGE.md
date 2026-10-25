# JUDGE: BOBALAB redesign prototypes P0–P3 vs the live site

- **Date:** 2026-10-24.
- **Inputs read:**
  - `docs/redesign/DIRECTION.md` (§1, §5.0–§5.4, Critique C.0–C.7);
  - `docs/redesign/AUDIT.md`;
  - every prototype's `NOTES.md` and `MAPPING.md`;
  - `content/publications/deng-2025-learning-to-gig.md` and `content/news/*`, to check facts.
- **Compared:** the live site (https://bobalabx.github.io/bobalab-web/), P0 Control, P1 Notebook, P2 Settle, P3 Lines.
- **How I captured:** my own Playwright harness in `judge/`. It is independent of the builders' scripts, and the builders' own numbers were not reused.
- **Labels:** **MEASURED** (I measured it or looked at it in a capture), **DOCUMENTED** (a file says so), **HYPOTHESIS** (my judgement).
- **Caveat:** every "reads as" verdict below comes from one judge playing two roles. The C.7 blind five-second test with 3–5 Haas faculty or PhD students has **not** been run. It should be run before any money is spent on the port (see §6).

---

## 0. Verdict

**Implement P3 "Lines" as the base.** It is a hybrid with three named borrowings (§5):
- P2's favicon candidate and its home people lattice;
- P1's panel lettering and the "line length = optimal finish" encoding on the plate;
- P0's port tactics: restyle, don't rename, and keep the live React `<ViewTransition>` names.

**Why P3 wins.** Of the five, it is the one design where the thing you remember is the lab's own data. Fig. 1 is an honest timeline of 13 papers. It shows the real chain of shared papers and work in progress past a "now" rule, and it reads as a published figure in under five seconds (MEASURED by eye: `judge/shots/p3/home-1440-light-fold.jpg`). The study-design plate is the most rigorous of the four. The mobile transposition is the best, and the motion explains something: the lab's output builds year by year, a direction lights its line plus only the papers it shares, and the pearl becomes the direction's Figure 2, which then draws.

**What P0 shows** (the control did its job). Removing pills, boxes, arrows, eyebrows and the machine-voiced copy makes the site calmer and more academic. It does **not** make it distinctive: the cream + Fraunces + mono-name kit still reads as the "warm editorial" default. So the cleanup is necessary but not sufficient, and the font and palette migration is justified (DIRECTION §6 item 10). This judgement comes from one person and should be confirmed by the blind test.

**Runner-up: P1.** It is the most "credible lab" at first glance, but the least memorable. Its Fig. 1 is four large black discs with 7 px seeds, which carry almost no information.

**Last: P2.** It has the strongest *brand system*. But on screen, bright spot-ink balls in piles over a bold grotesk read as a 2023 product or infographic page. Three of its four piles are identical today. Its 240 px direction glyph shows 6 pearls next to the sentence "4 papers", which is the RC-13 miscount the critique warned about.

---

## 1. Contact sheets (current | P0 | P1 | P2 | P3)

All sheets are in `judge/sheets/`; the raw captures are in `judge/shots/{current,p0,p1,p2,p3}/`.

| Page type / state | Desktop 1440×900 (light + dark) | Mobile 390×844 DSF 2 (light + dark) | Full page |
|---|---|---|---|
| Home | [home-1440](judge/sheets/home-1440.png) | [home-390](judge/sheets/home-390.png) | [1440](judge/sheets/home-full-1440-light.png) · [390](judge/sheets/home-full-390-light.png) |
| Direction (Learning on the Job) | [direction-1440](judge/sheets/direction-1440.png) | [direction-390](judge/sheets/direction-390.png) | [1440](judge/sheets/direction-full-1440-light.png) · [390](judge/sheets/direction-full-390-light.png) |
| Publications | [publications-1440](judge/sheets/publications-1440.png) | [publications-390](judge/sheets/publications-390.png) | [1440](judge/sheets/publications-full-1440-light.png) · [390](judge/sheets/publications-full-390-light.png) |
| Project (Dispatching for Worker Development) | [project-1440](judge/sheets/project-1440.png) | [project-390](judge/sheets/project-390.png) | [1440](judge/sheets/project-full-1440-light.png) · [390](judge/sheets/project-full-390-light.png) |
| Paper (bastani-2026-rl-tips) | [paper-1440](judge/sheets/paper-1440.png) | [paper-390](judge/sheets/paper-390.png) | [1440](judge/sheets/paper-full-1440-light.png) · [390](judge/sheets/paper-full-390-light.png) |

| State | Sheet |
|---|---|
| Fig. 1 arrival at 0 / 150 / 400 / 800 / 1200 ms (animations frozen in-page at *t* after the first animation starts) | [motion-intro](judge/sheets/motion-intro.png) |
| Fig. 1 at rest, hovering a direction name, hovering a paper dot, keyboard focus on the Learning on the Job link | [states-fig1](judge/sheets/states-fig1.png) |
| Morph to Learning on the Job at 200 ms, and after landing | [morph](judge/sheets/morph.png) |
| Forced colours (light, dark, paper page) and grayscale | [forced-gray](judge/sheets/forced-gray.png) |
| Fonts blocked (RC-11) | [fonts-blocked](judge/sheets/fonts-blocked.png) |
| 1366×768 fold and the `?n=4x` growth harness | [fold-1366-growth](judge/sheets/fold-1366-growth.png) · [growth-390](judge/sheets/growth-390.png) |
| Reduced motion and no-JS | [reduced-nojs](judge/sheets/reduced-nojs.png) |
| 320×640 | [w320](judge/sheets/w320.png) |
| Study-design plate at rest; step-through end and mid frames | [plate-rest](judge/sheets/plate-rest.png) · [plate-steps](judge/sheets/plate-steps.png) · [plate-steps-mid](judge/sheets/plate-steps-mid.png) |
| marks.html | [marks-1440](judge/sheets/marks-1440.png) |
| 16 px favicon lineup (×8, nearest neighbour) | [lineup-16px-x8](judge/lineup/lineup-16px-x8.png) |

---

## 2. What I saw: the two lenses

### 2a. Independent studio creative director

**Current (live).**
- The figure is the only original thing on the page, and it sits boxed in a cream SaaS-hero plate.
- Around it: mono-caps eyebrows, 47 pills on /publications/ alone, numbered glossy pearls ("01"–"04" read as notification badges), and an idle float with a Pause button.
- Every AUDIT tell is visible in the captures.

**P0 Control.**
- Visibly calmer: no pills, no boxes, and the pearls are flat.
- But the fold is still cream, a Fraunces mission statement, and "BOBALAB" in tracked Plex Mono in the header. The pearls are four identical brown discs, and the seeds are washed-out pastels.
- It looks like the same template after a tidy, not like a different lab.
- The arrival leaves the caption invisible until about 1 s (800 ms frame: ghost text).
- P0 also breaks its own control rule by including a study-design plate, which the builder flagged.

**P1 Notebook.**
- STIX Two + Atkinson on white with a margin rail is handsome and serious. The publications page, with a big year numeral in the rail and a small "Figure 1, papers by year" dot histogram, is the best ledger of the four.
- But Fig. 1 is four **72 px black discs** that dominate the fold. The papers are tiny seeds on hairline orbits. With animation off it reads as four black holes or bowling balls, not as research. In dark mode they become four glowing white discs (`judge/shots/p1/home-1440-dark-fold.jpg`), which is close to the "lit lens" look AUDIT I4 criticised.
- Defect (MEASURED): on the direction page the 160 px rail pearl's orbit cuts through the "Figure 1." caption text (`judge/shots/p1/direction-1440-light-fold.jpg`).
- Risk: the whole look sits in the critique's "broadsheet cosplay" cluster (white page, rules, year rail).

**P2 Settle.**
- The most *ownable system*: the shoulder mark, the direction glyphs and the "everything rests on a rule" idea, which marks.html documents well (lab mark, OG card on paper white, glyph table).
- On the actual pages, though, the hero figure is four piles of 44 px saturated blue, pink, green and orange balls, with open rings floating above. That is the "bright spot discs + bold grotesk" startup read the critique saw on `b2-p3.png`. The 2.3 % spot-area cap is respected (builder MEASURED), but the discs are what you see first.
- Three of the four piles are the same 3+1 triangle, so the figure says almost nothing about *when* or *how the directions relate* (order is only recoverable by hovering).
- Direction header: a 240 px six-pearl green triangle beside "4 papers, 1 in progress, 4 projects." (`judge/shots/p2/direction-1440-light-fold.jpg`). A reader will count six pearls. The copy also slips: "This direction asks how people build skill…" is the AUDIT W-class self-describing sentence.
- In fairness, P2 has the best *arrival*: piles accumulate year by year from an empty floor, with Platform Work's 2021 paper landing first.

**P3 Lines.**
- The only design where the figure is unmistakably *this lab's data*.
- Four lanes, year bins (2021 · 2023 · 2025 · 2026), lines that start at each direction's first paper, vertical links for the five shared papers, a dashed "now", and open in-progress rings in a grey zone. I checked every dot against Appendix A: all 13 papers are placed correctly (MEASURED, §4).
- The Archivo condensed lane labels give a timetable voice that matches the chart. Fig. 2 on the direction page (labelled paper links, stubs to "Also in Platform Work") is the best secondary page of the set.
- Weaknesses:
  - The condensed 700 headings are on the critique's "heavy industrial display" trend list.
  - The 24 px route indicator in ledger rows is near-invisible (hairlines at 1.39:1) and reads as a hamburger icon.
  - The live-caption line reserves three lines, so there is a dead band above the figure.
  - The black "now" pearls are the only boba reference. It is a lab figure, not a boba identity.

### 2b. Berkeley Haas faculty member, 5 seconds

| | Template or AI-made? | Credible lab? | What I'd remember |
|---|---|---|---|
| Current | "Looks like every AI startup landing page this year" (cream, pills, orange button "Explore our research →") | Yes, but the boxed pearls look like a widget | "The boba balls" |
| P0 | Less so; still a template feel | Yes | "Brown balls" |
| P1 | No, it looks like a journal | **Most**: STIX reads as a Management Science page | "Four black circles", nothing about the research |
| P2 | Partly: colourful ball stacks read as an ed-tech or infographic page | Weakest | "Coloured ball pyramids" (memorable, but not *of* anything) |
| P3 | **No**: it is a chart of their papers over time | **Yes**: the chart and the Bastani plate read like a paper's figure 1 | "Their four research lines and how papers link them; the virtual-kitchen experiment" |

All of these are HYPOTHESIS. They need the C.7 blind test.

---

## 3. Measurements (all MEASURED with `judge/probe.cjs`, `judge/states.cjs` and `judge/capture.cjs`)

### 3.1 §5.0 AI-tell DOM probe

The probe ran on every page at 1440×900, light. The table is in `judge/probe-*.json`.

| Probe (limit) | Current | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|
| Pills (0) | 6–47 per page | 0 | 0 | 0 | 0 |
| Rounded boxes > 60 px (0) | 0–4 | 0 | 0 | 0 | 0 |
| Tracked caps (0) | 4–9 | 0 | 0 | 0 | 0 |
| Mono outside DOI/BibTeX (0) | 10–98 nodes | 1–6 (exempt: header name, Fig. 1 counts) | 0 | 0 | 0 |
| "→" (≤ 1 per page) / other arrows (0) | 0 / 0 in text (arrows are SVG icons, which the probe cannot see) | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| ≥ 2 "·" in a text node (0) | 1–13 | 0 | 0 | 0 | 0 |
| Gradients / shadows (0) | home 21 / 4 | 0 | 0 | 0 | 0 |
| Infinite animations (0) | 4 (float loop) | 0 | 0 | 0 | 0 |
| Cream surfaces (0) | 5–8 | 6–16 (exempt) | 0 | 0 | 0 |
| Text above the cap, outside Fig. 1 | — | 0 (max 52 px) | 0 (max 52 px) | 0 (max 36 px) | 0 (max 36 px) |
| Tracking < −0.015em or leading < 1.0 (0) | 0 | 0 | 0 | 2 borderline (wordmark at exactly −0.015em / 1.0) | 0 |
| Heavy rules per 900 px window (≤ 2) | 0–2 | 0 | 1 | Raw 3 on home, 2 after review (the extra hit is a hidden `::after` diffusion underline) | Raw up to 7 on plate pages, **2 after review** (the extras are plate diagram strokes drawn as pseudo-elements; see note) |
| Hero-count numerals / `0n` (0) | 0 / 4–5 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Small discs that are not paper/direction marks (0) | many | 0 after review (seeds, direction dots) | 0 after review (histogram and direction dots) | 0 | 0 (twin dots, roster matrix) |

**Note on P3's plate strokes.** P3 draws the experiment's arm lines with CSS pseudo-elements, and its NOTES admit this keeps them out of the rule probe. They are diagram lines, so the budget is met in spirit. The port should draw them in SVG.

### 3.2 Fonts used (characters set, top faces)

| Target | Faces | Loaded weight |
|---|---|---|
| Current | Inter 91 %, Plex Mono, Fraunces | 97.4 KiB |
| P0 | Inter, Fraunces, Plex Mono | 97.4 KiB |
| P1 | STIX Two Text, Atkinson Next, plus Atkinson Mono on the paper page | 61–89 KiB |
| P2 | Familjen Grotesk, Literata | 90.4 KiB |
| P3 | Archivo only, plus `ui-monospace` for BibTeX | 88.0 KiB |

No prototype uses a banned face (P0 is exempt).

### 3.3 Accessibility, layout, JS and the 16 px mark

**axe-core** (wcag2a, 2aa, 21a, 21aa, 22aa):
- **0 violations** on every page, at 1440 and 390, in light and dark, for all five targets: 20 runs for current and 24 for each prototype.
- The live site also passes. Accessibility is not a differentiator, except for the forced-colours details below.

**Forced colours.**
- P2's piles all become system black, but stay identifiable by position and label.
- P3's lines keep inline colours. This is a known issue: `style="fill:…"` beats the forced-colours rule.
- P1 and P0 are fine.
- All four keep labels ([forced-gray](judge/sheets/forced-gray.png)).

**Fonts blocked (RC-11)** ([fonts-blocked](judge/sheets/fonts-blocked.png)).
- P1 on Georgia still reads as a journal.
- P3 on Arial loses its timetable voice, and lane labels wrap ("Learning on the / Job"). The figure still carries the page.
- P2 on Arial turns generic.
- So the face is doing real work in P2 and P3, and less in P1.

**Layout.**
- 320 px: no horizontal scroll on any page of any target.
- Fig. 1 bottom at 1366×768: P0 663, P1 750, P2 663 (caption included). For P3 the plate bottom is about 760 (builder 759.7; matches the 2 px rule I found at about 760 at 1440), and the caption falls below the fold.
- `?n=4x`: P2 pushes its caption to 767 at 1366. P0 caps at 12 dots, which **hides papers**. P1's outer orbit gets dense. P3 packs within bins and holds.

**JS per page, gzip −9.**

| Target | Total per page | Figure code |
|---|---|---|
| Current | 161–169 KB (Next runtime) | — |
| P0 | 3.9 KB | — |
| P1 | 5.8 KB | 2.43 KB |
| P2 | 1.5–3.8 KB | 2.34 KB |
| P3 | 2.1–5.1 KB (home includes the prototype-only `harness.js`) | 2.45 KB |

The figure numbers are the builders' figure-only split, consistent with my per-file totals. Every prototype's figure JS is under 2.5 KB. The prototype totals are not comparable with Next; in the port only the figure island counts.

**16 px marks.** Normalised cross-correlation of the 16 px raster against the six generic lineup icons, best of ±1 px shifts ([lineup](judge/lineup/lineup-16px-x8.png)):

| Mark | Max NCC | Closest generic icon |
|---|---|---|
| Current disc | 0.58 | radio |
| P0 disc | 0.57 | group |
| **P1 ruled b** | **0.24** | orbit |
| **P2 shoulder on floor** | **0.32** | group |
| P3 b on floor | 0.49 | git commit |

By eye, P3's heavy "b" over a bar also looks like a text-editor "font colour / underline" toolbar button, an icon the lineup does not include. **No blind three-person test has been run for any mark.**

### 3.4 Motion (owner requirement: purposeful and delightful)

- **Current:** an overshoot intro, an idle float loop (4 infinite animations) and a Pause button.
- **P0:** settle, then seeds emerge; finite and correct, but it repeats the live idea.
- **P1:** papers emerge in global chronological order. That is correct, but at 7 px it is barely visible at 1440. Fig. 2 assembles on scroll, which is nice.
- **P2:** the best *arrival story*: an empty floor fills year by year.
  - Hover dims the other piles to 35 %.
  - My 200 ms morph frame already shows the 240 px glyph at full size, so the in-flight state was not caught. The builder's own frames are `p2/shots/state-morph-*`.
- **P3:** the best *explanatory* motion overall.
  - The now line draws, bins arrive left to right, and links grow after their column.
  - Hovering a direction dims the other lines to 0.3 *except the papers shared with it*, so the relationship is the reveal.
  - The morph carries the pearl into Fig. 2, which then draws. I caught it in flight at 200 ms ([morph](judge/sheets/morph.png)).

**Plate step-through.** All four run 4 finite steps from a `<button>` and show everything under reduced motion. Under reduced motion every target had 0 running animations 400 ms after load.

---

## 4. Facts and figures checked

- **Fig. 1 data** (MEASURED against Appendix A):
  - **P3:** every dot sits in the right lane and year bin, with links Liu (AA–AI), Blaettchen (AA–LOJ), and Deng 2025, Jiang 2025 and Deng 2026 (LOJ–PW). Lane order follows `direction_order` as RC-14 requires, and the Blaettchen link passes over AI at Work through a visible gap. The caption says so.
  - **P1 and P0:** seeds match the counts, with shared seeds ringed.
  - **P2:** piles match the counts (4/4/4/6) with WIP rings 2/3/1/2.
- **Study-design plate** (§5.0a / C.3). All four use only the documented facts:
  - 3 workers;
  - chop → cook → plate;
  - 4 orders, so 12 subtask pearls;
  - ticks, with speed revealed after assignment;
  - 20 and 34 ticks;
  - normal = 3 full rounds, disrupted = 2 full + 4 understaffed;
  - Phase I without tips → Phase II with 4 arms;
  - a tip is one if-then rule.

  **None draws a schedule or a result** (MEASURED, [plate-rest](judge/sheets/plate-rest.png)). P3 adds "From these logs the algorithm learns a tip". That is supported by the paper's own `in_brief` ("An algorithm learns from logs…"), so it is acceptable. P1's and P3's renderings are the clearest; P0 reuses discs for workers *and* rounds, which muddles the disc meaning.
- **Draft plates beyond the Bastani paper:**
  - P3's Learning to Gig plate (direction and project pages) states "Jobs are offered to workers one at a time" and "a declined job goes back to the platform". **Neither fact is in `in_brief`** (DOCUMENTED, `content/publications/deng-2025-learning-to-gig.md`). It is labelled "Draft schematic, pending author check", but it must not ship until the model section has been read.
  - P2's project schematic draws stack heights the caption calls "illustrative". That is honest, but it is still a non-data encoding: cut it or verify it.
- **Copy claims checked:**
  - P1's "in the January 2026 issue" is supported by `content/news/2025-05-22-rl-tips-mansci.md`.
  - P3's project timeline dates (11 May 2026, 4 Aug 2026) match `content/news`.
  - P0's project-page "question" rewrites `in_brief` and needs PI sign-off.
- **Shared data flag (all four):** Lee 2025 is counted as an Algorithmic Advice *paper* although its content file has no link or DOI. The PI should decide.
- **Completeness.** P0, P1 and P2 list only the 13 snapshot papers, which drops the real 2016, 2020 and 2021 (Community Vibrancy) entries that the live site shows. P3 lists 16. The port must keep every live entry.
- **Copy rules.** "This direction asks…" appears in P2 (`research.html`). "reported by the lab" appears exactly once per prototype, as the allowed provenance footnote. "Server" appears only as the kitchen role inside plates, which is allowed.

---

## 5. Scores (reasoned, three steps: ●●● strong, ●●○ adequate, ●○○ weak)

| Criterion | Current | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|
| Distinctiveness | ●○○ figure only | ●○○ | ●●○ | ●●● as a system | ●●● as a figure |
| Not-AI read | ●○○ | ●●○ (kit remains) | ●●○ (broadsheet risk) | ●○○ to ●●○ (spot balls + grotesk) | ●●● (condensed heads are the one tell) |
| Credibility (5 s) | ●●○ | ●●○ | ●●● | ●○○ | ●●● |
| Memorable *and* lab-specific | ●●○ | ●○○ | ●○○ | ●●○ (memorable, not specific) | ●●● |
| Composition | ●○○ | ●●○ | ●●○ (caption-overlap bug, huge discs) | ●●○ (lots of air; duplicated "why") | ●●● (one 18rem grid everywhere) |
| Typography | ●○○ | ●○○ | ●●● | ●●○ | ●●○ (trend risk; wraps on fallback) |
| Colour | ●○○ | ●●○ (exempt) | ●●○ (dark-mode white discs glare) | ●○○ | ●●● (colour = direction only) |
| Motion quality | ●○○ (loops, overshoot) | ●●○ | ●●○ | ●●● intro, ●●○ elsewhere | ●●● |
| Mobile | ●●○ | ●●○ | ●●○ (seeds crowd) | ●●○ | ●●● (transposed strips + "Shares N papers…") |
| Accessibility | ●●● | ●●● | ●●● | ●●○ (forced colours: all piles one colour) | ●●○ (inline fills in forced colours; 11 px plate text at 320) |
| Effort / risk of the port | — | ●●● S: tokens and fonts unchanged | ●●○ M: tokens, fonts, rail; Fig. 1 keeps the cluster geometry, so `figure.spec` largely survives | ●○○ M–L: lattice generator, glyph enum, spot palette, most figure tests rewritten | ●●○ M: new lane generator over existing fields; `figure.spec` (inactive opacity, Pause, idx, list mode) and `home.spec` wordmark assertions rewritten; palette, misc and kit tests updated |

---

## 6. Recommendation: P3 "Lines" as the base, with named borrowings

### Take from P3 (the core)

1. **Fig. 1 lanes.**
   - Year bins, lines that start at each direction's first paper, the dashed "now", the in-progress zone, links on desktop, and twin rings at overflow.
   - Order follows `direction_order`, with the gap where a link passes over a line; the validator only *suggests* the chain order.
   - Linked highlighting between lede ↔ lane ↔ dot ↔ ledger row.
   - The year-by-year arrival.
2. **The direction page:** a counts sentence in the label column, then Fig. 2 (the labelled line with stubs to other directions, every paper an `<a>`), then the projects table and the papers.
3. **The 18rem label-column grid** on every page. Heavy rules only around figures and plates.
4. **The Bastani study-design plate** (swimlanes, R for random assignment, 20/34 as design parameters) and its 4-step step-through.
5. **The publications ledger:** 16 entries, type and direction toggles, year jumps, one footnote.
6. **The mobile transposition** of Fig. 1.

### Borrow

- **From P1:**
  - panel lettering (a/b/c) on the plate;
  - P1's panel (b) encoding, where the length of each round's glyph *is* the optimal finish time. It is clearer than P3's separate tick axis;
  - P1's sentence-caption discipline.
- **From P2:**
  - the **shoulder-on-floor** favicon (four pearls resting on a rule) as candidate A. It is the only mark that is both pearl-based and low-NCC (0.32), and it rhymes with "pearls on a line";
  - P1's ruled b (0.24) as fallback B;
  - P2's home **People lattice** of real square headshots (lab-made evidence, keep-list #6). P3's home has no people.
- **From P0:** the port tactics in its MAPPING.md:
  - keep the live `pearl-{slug}` React `<ViewTransition>` names (no fetch-and-swap);
  - keep `.bl-badge`, `.bl-card`, `.pp-card` and `.bl-switch` as restyled elements so the selector-based tests hold;
  - ship the cleanup (pills, arrows, eyebrows, copy) **first** as phase 1. It is test-compatible and carries over unchanged.

### Refinement list for implementation (in order)

1. **Phase 1, cleanup on the live kit** (P0 changes): pills → type words; no boxes; no eyebrows or arrows; one provenance footnote; flat pearls; float, parallax and Pause removed; a DECISIONS entry superseding D-02 items 2–3. Needs PI sign-off on removing the caveats.
2. **Tokens and font.**
   - Adopt P3's paper/ink/muted/rule/hairline set and the §5.0 deep and light direction tones (minimum CVD ΔE 8.18).
   - Font: one Archivo wdth file (88.0 KiB), self-hosted.
   - **Restrict condensed wdth 68/700** to Fig. 1 and Fig. 2 lane labels, year headings and the h1. Section h2s use wdth 100 / 600 at ≤ 2rem, which takes the "heavy industrial" edge off.
   - Update `palette.test.ts`, `misc.test.ts`, `kit.spec.ts` and `preview.css` together.
3. **Fig. 1 generator** in `src/lib/figure/`.
   - Replaces the cluster templates for the lanes mode. Keep the `.f1-plate`, `.f1-list`, `.f1-item` and `.f1-link` classes, and keep `--f1-mode`.
   - Put the count *inside* the link's accessible name (`figure.spec` expects "… N papers").
   - Implement the stated but unbuilt overflow rule (merge the oldest bins, "2021–2023", past about 63 papers at 1366).
4. **Live caption.**
   - Remove the three-line reserved band above the plate. Swap the caption in the figcaption slot under the plate (fixed height), or reserve 2 lines at most.
   - `aria-live="off"`, as the test expects.
5. **Forced colours.** Move line and dot colours from inline `style` to classes with a `@media (forced-colors: active)` mapping; lanes stay identifiable by position and label.
6. **Route indicator.** Drop the 24 px route SVG in ledger rows (1.39:1 hairlines; it reads as a menu icon). Prefix direction names in the meta column with the 16 px line-colour segment already used on the filters.
7. **Plates.**
   - Port them as the optional `figure` object (`image`, `alt`, `caption`, `source`, `pi_verified`); render only when `pi_verified: true`.
   - Put labels in HTML rather than SVG text (P3's plate text drops to about 11 px at 320).
   - Draw the arm lines in SVG, not pseudo-elements.
   - The Bastani plate ships after PI sign-off.
   - **The Learning to Gig plate stays off** until it is drawn from the paper's model section: "one at a time" and "goes back to the platform" are unverified.
8. **Home.** Statement → lede → Fig. 1 → recent publications → P2's people lattice (square photos; initials squares for the PI, Shunan Jiang and William Deng) → news log. Keep the lab name stated once. The PI confirms the display line ("How people learn to work with algorithms").
9. **Dark mode.** Keep flat light-ink pearls, but check the 96 px Fig. 2 pearl against AUDIT I4's "lit" read. If it reads as lit, use `--muted` fill with a 1 px `--ink` edge.
10. **Mark.** Run the 3-person blind lineup on the shoulder-on-floor and the ruled b. Do **not** use P3's b-on-floor (NCC 0.49 with git commit; it also reads as a text-format toolbar icon). Haas MarCom note (H-10).
11. **Content.** Keep every live publication, including the 2016, 2020 and 2021 entries outside the four directions. The PI resolves Lee 2025's paper vs in-progress status.
12. **Tests.**
    - Rewrite `figure.spec` (inactive-opacity semantics: other *lines* dim to 0.3, pearls never dim; Pause and idx removed; list mode below 48rem) and the `home.spec` wordmark assertion.
    - Add `plate.spec` (4 finite steps; all steps visible under reduced motion; absent unless `pi_verified`).
    - Keep `a11y-sitewide` and the motion specs.
13. **Validate before the full port:** the C.7 blind five-second test with 3–5 Haas faculty, covering current, P0, P1, P2 and P3 in random order, with Prof. Park last. If P0 lands within noise of P3, stop after phase 1 (DIRECTION §6 item 10).

### Discard

- **P2:** spot-ink ball piles on the home page, the 240 px glyph header (its six pearls sit beside "4 papers"), the spot-ink palette as the primary colour, and the "This direction asks…" copy.
- **P1:** the 72 px black-disc Fig. 1 and the 160 px rail pearl.
- **P0:** the cream, Fraunces and Plex kit as a *direction* (keep it only as phase 1), and its dot cap that hides papers.
- **P3:** the route-indicator SVG, the b-on-floor favicon, the fetch-and-swap morph, the popstate reload, the pseudo-element plate strokes, and the Learning to Gig plate (for now).

### Weaknesses of the pick (stated plainly)

- **It gives up most of the boba.** The pearl survives only as the black "now" marker and the morph. Of the five, P3 is the least "cute" and the most "operations figure". If the owner's "cooler" means *playful*, P2 answers that better, at a credibility cost.
- **The condensed Archivo voice is a 2026 trend entry.** With fonts blocked, the lanes wrap and the timetable voice is gone. Distinctiveness here rests on the figure, not the face. That is the right place, but the type is not neutral.
- **Some readers will see a git branch graph.** The links variant (lanes + dots + vertical connectors) is close to one. The rings variant (`p3/shots/v-rings-1440.png`) reads less like a dev tool but hides the chain structure, which is the lab's most interesting fact. I keep links and accept the risk; the blind test should ask about it.
- **Density can look dry,** and every figure is fixed geometry tuned to today's 13 papers. Fig. 2, the project line and the plates need real packing rules in the port.
- **It is the most expensive of the credible options.** The port means a new figure generator and the largest rewrite of `figure.spec`. P1 would be cheaper because it keeps the cluster geometry.
- **One judge.** Nothing here replaces the C.7 blind test.

---

## 7. Reproduce

All of these live in `judge/`. Serve the prototypes with `node judge/serve.cjs` (ports 8801–8804), then for each target run:

```
NODE_PATH=…/bobalab-website/node_modules node judge/capture.cjs <current|p0|p1|p2|p3>
NODE_PATH=…/bobalab-website/node_modules node judge/states.cjs <target>
NODE_PATH=…/bobalab-website/node_modules node judge/probe.cjs <target>
node judge/extra.cjs
node judge/drafts.cjs
python -I judge/sheets.py judge
python -I judge/lineup/ncc.py judge/lineup
```

What each script does:
- `capture.cjs`: folds and full pages.
- `states.cjs`: intro frames, hover, focus, morph, forced colours, grayscale, fonts blocked, 1366, `?n=4x`, 320, no-JS, plate steps.
- `probe.cjs`: the §5.0 probe, axe and JS gz.
- `extra.cjs`: marks.html captures and the P2 pearl hover.
- `drafts.cjs`: the draft plates.
- `sheets.py`: builds the contact sheets.
- `lineup/ncc.py`: the 16 px similarity check.

The repo was not edited.
