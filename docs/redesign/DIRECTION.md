# DIRECTION: redesign direction for BOBALAB ("less AI-generated, still credible")

- **Date:** 2026-10-24. **Live site:** https://bobalabx.github.io/bobalab-web/ (branch `redesign`).
- **Prompt:** Prof. Park: "the design kinda looks like it is AI generated". The owner wants the site cooler and less AI-looking. It must keep academic credibility, the boba-pearl research figure (Fig. 1), Decap CMS, WCAG 2.2 AA and the test suite.
- **Inputs read in full:**
  - `docs/redesign/AUDIT.md` (visual audit)
  - `docs/redesign/AUDIT-SYSTEM.md` (design-system audit)
  - `docs/redesign/IDENTITY-RESEARCH.md` (type, mark, colour, motion)
  - the two reference studies `REFS-LABS.md` and `REFS-EDITORIAL.md`. They live in the session scratchpad outside the repo, because their screenshots are of other sites.
  - `docs/DECISIONS.md`, `docs/design/JUDGE.md`, and `docs/research/research-brief.md` §C
- **Screenshots I looked at for this synthesis:**
  - BOBALAB's own site: `before/home-fold-1440-light.jpg`, `fig1-rest-1440-dark.jpg`, `detail-direction-cards.jpg`, `detail-pub-entry.jpg`, `audit-system-cards-projects-1366.jpg`, `home-fold-390-light.jpg`, `direction-fold-1440-light.jpg`.
  - Identity boards `b2-p3.png`, `b2-top.png`, `glyphs.png`, and the type specimens `type.png`, `t1-read-2x.png`, `t3-read-2x.png`.
  - Reference shots `_contact-sheet.png`, `fay-ccc-6.png`, `stedelijk-0.png`, `inkandswitch-zoom-areas.png`.
- **New evidence produced for this document** (scratchpad only, not in the repo):
  - a sketch of concept D rendered with the lab's real publication data: `…/scratchpad/redesign/sketch-d/d2-1440.png`, first version `d-1440.png`, `d-390.png`;
  - a palette search and contrast check: `…/scratchpad/redesign/tools/direction_contrast.py`, `tone_search2.py`, `tone_eval.py`.
- **Labels:** **MEASURED** (I measured it, computed it, or saw it in a screenshot), **DOCUMENTED** (a cited file or URL says so), **HYPOTHESIS** (my judgement).
- **Copyright:** no other site's code, images or text are in this repo. References are described in my own words, with their URL.

---

## 0. Summary for the decision-maker

**Why it reads as AI-made** (§1). Fig. 1 is original. Everything around it is the "warm editorial" kit that AI tools produce once you ask them for "less AI":
- cream page plus clay accent;
- Fraunces + Inter + Plex Mono;
- tracked mono eyebrows;
- 10 px hairline cards;
- 162 outlined pills;
- an arrow on every link;
- one section template repeated about 11 times.

The copy adds machine-voiced hedges ("reported by the lab" ×15). The figure's own visual language stops at the home page.

**What to keep:**
- Fig. 1's data encoding and caption convention;
- the pearl → direction morph;
- the direction colour *system*;
- citation rigour;
- the question-style ledes;
- real headshots;
- all the accessibility machinery.

**The four concepts** (§3):
- **A, Living Research Atlas:** the figure becomes a map of how the directions connect.
- **B, Research Notebook / Editorial Laboratory:** journal conventions, used for real.
- **C, Visual Identity System:** the "Settle" pearl-stack grammar, plus spot inks.
- **D, Service Lines** (my own): the lab drawn the way operations researchers draw systems. Papers are served jobs, work in progress waits in a queue, and shared papers are routed between lines.

A MEASURED fact supports A and D. The lab's shared papers form a chain, AI at Work – Algorithmic Advice – Learning on the Job – Platform Work. No generator could invent that structure.

**Prototype these three** (§5):

| Prototype | Lineage | One-line bet |
|---|---|---|
| **P1 "Notebook"** | B, plus A's paper-level seeds and links | Credibility first. A white journal page in STIX Two + Atkinson, flat ink pearls, ledgers, no boxes. |
| **P2 "Settle"** | C, with guardrails, plus B's ledgers | An identity first. A pearl-stack grammar generates every mark, with Familjen Grotesk + Literata and spot inks used only as data. |
| **P3 "Service Lines"** | D, plus A's relationships | The research first. Fig. 1 becomes a real chart of the lab's output in operations notation, set in Archivo's width axis. |

> **[Critique] Superseded in part.** The independent critique at the end of this document changes the build list:
> - **P0 Control** (the cleanup only, on the current kit), **P1 Notebook**, **P2 Settle** and **P3 Lines** (formerly "Service Lines");
> - a study-design plate and a paper-page mock are now required in every prototype.
>
> See "Critique" C.6–C.7. §5 is updated in place, with every change marked [RC-n].

**A is not prototyped on its own.** Its two best ideas are folded into P1 and P3: every seed is a paper you can focus, and shared papers are drawn as links. Its standalone form, a free-form node map, mostly fixes the home page and risks the "AI knowledge-graph" look (§3A, §4).

**Owner decisions these prototypes will force** (§6):
- leaving the brief's palette and fonts, which touches tests `palette.test.ts`, `misc.test.ts` and `kit.spec.ts`;
- retiring the idle float, parallax and Pause button of D-02/D-02a in favour of finite, explanatory motion;
- P3's font budget, which is 3.4 KiB over;
- lane order computed from shared papers rather than `direction_order`.

---

## 1. Diagnosis

### 1.1 Root causes of the "AI-generated" impression (ranked by how much they drive the read)

The ranking is HYPOTHESIS, based on reach (how many pages and pixels each cause touches) and on how directly third-party "AI tell" catalogues name it. The evidence for each cause is MEASURED or DOCUMENTED as marked.

| # | Root cause | Evidence | Why it matters |
|---|---|---|---|
| 1 | **The global kit is the documented "second-wave" AI default.** Cream + clay + serif display over Inter + mono labels | MEASURED: page `#FCFAF6`, alt `#F4F0EA` and plate `#F7F1E8` are ΔE_OK×100 2.73 / 0.26 / 0.46 from the named tell `#F4F1EA` (IDENTITY-RESEARCH §1.2; recomputed here). The accent `#8A4515` is clay family. Inter sets 91.1% of characters, Fraunces 4.2%, Plex Mono 4.7% (AUDIT-SYSTEM §4.1). DOCUMENTED: the "warm editorial" + "template chrome" clusters (capitalandcompute.net/blog/fix-ai-slop-design/). An anti-slop agent ban list *recommends* Fraunces (github.com/Laith0003/ux-skill/wiki/Anti-AI-slop-ban-list), so it is now what agents pick | It is on every page and is the first thing seen. The brief chose each piece for good reasons, but the sum is the "expected answer" (distributional convergence; claude.com/blog/improving-frontend-design-through-skills) |
| 2 | **Template chrome on every item.** Pills, tracked mono eyebrows, arrows, "A · B · C" meta strings | MEASURED: 162 bordered pills on 12 pages, 114 of them `.bl-badge`. 47 on /publications/ alone (AUDIT-SYSTEM §2). "Active" on 15 of 17 projects carries no information (AUDIT P1). 16 "text + →" links in source. Eyebrows such as "JUMP TO YEAR", "DIRECTION 01" and "ERROR 404 ·" (AUDIT T2). I saw `detail-pub-entry.jpg`: each paper has a pill, a mono year, a brown link, a colour dot and 2–3 boxed icon buttons, five kinds of styling per row | These are the most recognisable "component library" marks. The catalogues name each one (capitalandcompute, impeccable.style/slop) |
| 3 | **The bordered rounded box is the container.** | MEASURED: 21 classes draw 10 px hairline boxes, and 65 render. White boxes cover 35.8% of Projects and 32.4% of People. 8 of 17 project cards have no body (AUDIT C4; I saw `audit-system-cards-projects-1366.jpg`: a 3-up grid of identical white boxes, many with about 120 px of nothing). The direction cards have a coloured top stripe (`detail-direction-cards.jpg`) | Empty, identical boxes read as a scaffold waiting for generated text. The coloured top border is a named tell |
| 4 | **No extremes. Uniform scale, rhythm and template.** | MEASURED: 87.4% of text is in Inter 14/17/20 px, 50.7% at 14 px alone. Steps run ×1.08–1.44. The h1 is 52 px Fraunces 600 at x = 107 on 10 of 12 pages. 11 separate section-head implementations draw one pattern (h2 left, "All →" right, hairline, list). There are 11 auto-fill card grids, every card has `--s-5` padding, and every section has the same gap (AUDIT-SYSTEM §3, §4.3, §6, §10) | The authored references push one parameter hard: scale (Stedelijk), density (Distill), one size (Order: one size across 391 text nodes) (REFS-EDITORIAL §4.1). BOBALAB pushes none |
| 5 | **The signature is local, and rendered in the "AI orb" idiom.** | MEASURED: Fig. 1 appears on 1 of 14 templates. It sits in the screenshot slot of a SaaS split hero (`home-fold-1440-light.jpg`: identity left, a rounded cream plate with crop marks right). The pearls have a radial halo, a bottom glow and a sheen. In dark mode they are lit lenses with peach rims (`fig1-rest-1440-dark.jpg`, which I saw). /research/ uses cards with a glossy 56 px numbered pearl as an "icon tile" (`detail-direction-cards.jpg`) | The original idea is boxed like a widget. Halo, gloss and the icon tile are named tells (impeccable.style/slop). The rest of the site never speaks the figure's language (AUDIT L6) |
| 6 | **Machine-voiced copy.** | MEASURED: "reported by the lab" ×15 on /publications/; "Status not confirmed" ×4 on /join/; "This direction collects / gathers…"; "listed by title only"; the name three times above the fold; "Explore our research" (AUDIT W1–W4, L3, L4). I saw `direction-fold-1440-light.jpg`: "Why it matters" over text that opens "This direction gathers the lab's work…" | Careful, hedged text that talks about itself is the most "LLM wrote this" feature (AUDIT §3.5) |
| 7 | **No lab-made evidence on the page.** | MEASURED: 0 research images on 7 templates. The PI is the only person without a face ("PS" disc). Fig. 1 is a diagram *of the lab*, not of a finding (AUDIT I1, I2) | Real lab sites are full of their own artefacts. Generated ones are full of boxes (REFS-LABS P1, P3) |
| 8 | **Decorative motion idioms.** | MEASURED/DOCUMENTED: an idle float loop (±2.5 px, 7–11 s), pointer parallax, a ±14° stir and an overshoot intro (−28 → +4 → −1 → 0 px). The loop forces a Pause button (D-02, D-02a; IDENTITY-RESEARCH §1.2) | Bounce easing and ambient loops are named tells. Less weight than #1–#7, because motion is brief and gated |

**Removing causes 2, 3 and 6 alone** probably removes about half the AI read, as AUDIT §5 also hypothesises. They are cheap (S–M effort) and are prerequisites for every concept below. **Causes 1, 4 and 5 need a direction**, which is the subject of this document.

### 1.2 Keep (non-negotiable inputs to every concept)

1. **Fig. 1 as a real figure.** Keep:
   - one pearl per direction, one dot per paper with a public version;
   - the "Fig." caption with an honest key and an "as of" date;
   - the ordered list of direction links underneath (brief §E1).

   The rendering may change; the encoding may only become *more* data-true.
2. **The morph** from pearl to direction header (AUDIT M3, "the site's best moment").
3. **The direction colour system as a system**: the CMS enum and the validator's confusable-pair warning. The *hexes* may change (§5 proposes a better-separated set).
4. **Citation rigour.** Keep APA + BibTeX, DOIs, award lines and review status, but move the provenance to one footnote.
5. **Question ledes** on directions (AUDIT W6).
6. **The 21 consented headshots** (D-12).
7. ~~**The index numerals *inside* the figure** (01–04). Remove them everywhere else.~~ **[Critique RC-7] Withdrawn.** Remove them everywhere, including inside the pearls. They number content that has no sequence, which is a named tell, and in a dark disc they read as a notification badge.
8. **The accessibility machinery:**
   - the reduced-motion gate;
   - the footer "Reduce motion" toggle;
   - no-JS fallbacks;
   - 44 px targets;
   - `button[aria-pressed]` filters, which e2e tests rely on;
   - the year-grouped publications with jump and filter functions.
9. **Restraint:** no shadows, gradients, glass, stock or AI imagery, fake metrics or emoji (AUDIT C6).
10. **Fixed constraints:**
    - static export;
    - Decap CMS;
    - the `content/**` model, which is unchanged in every concept (optional fields only);
    - the class names that about 250 test lines select on (AUDIT-SYSTEM R5: restyle, don't rename).

---

## 2. Reference lessons: principles adopted (not forms)

Each principle names the reference it was learned from and the original BOBALAB move it licenses. The reference shots are in the scratchpad (`refs/labs/`, `refs/editorial/`) and never enter the repo.

| # | Principle | Learned from (URL; what was seen) | BOBALAB move (original) |
|---|---|---|---|
| L1 | **The lab's own evidence is the hero.** One real result, drawn simply, beats any decoration | Opportunity Insights (https://opportunityinsights.org/): the mission is set over the lab's headline chart. Distill (https://distill.pub/): every index row carries a diagram from the paper. OWID (https://ourworldindata.org/): thumbnails are charts in one house grammar (REFS-LABS §2.2–2.5) | Fig. 1 must show real structure (papers, years, shared work, work in progress), not a diagram of categories. P3 makes it a chart. P1/P2 add a "featured finding" slot for later |
| L2 | **One primitive, many uses.** The mark is a diagram, and it generates tags, masks, headers and illustrations | Fay Design for MIT CCC (https://fay.design/work/center-for-constructive-communication/): one circle-dot-radius glyph is the logo, the photo mask, a cropped background giant and the diagrams of conversation (I saw `fay-ccc-6.png`: four tiles built from the one glyph). Pentagram for MIT Media Lab (https://www.pentagram.com/work/mit-media-lab/story): one grid makes the lab mark and 23 group glyphs | The pearl, orbit, seed and settled stack are BOBALAB's only graphic vocabulary. No icon library is used for meaning (all concepts; P2 most strongly) |
| L3 | **One extreme commitment, not ten moderate ones** | Stedelijk (https://www.stedelijk.nl/en): huge uppercase rows between heavy rules (I saw `stedelijk-0.png`). Design Intelligence Lab (https://designintelligence.mit.edu/): one 60 px light sentence plus a photo grid. Order (https://order.design/): one size across 391 text nodes | Each prototype owns one extreme: P1 *typographic hierarchy* (a display:body ratio of about 4.4 at 1440, against 2.6 today); P2 *the mark at poster scale* (a 240 px glyph on the direction header); P3 *density* (a full-width chart plus a ledger) |
| L4 | **Show the structure.** Ledgers, rails and tables instead of cards | Distill's date/type column; DensityDesign's label rail (https://densitydesign.org/); e-flux's weight-only TOC (https://www.e-flux.com/journal/); Media Lab's publications table | No content card anywhere. Lists are ledgers with a left rail for year/type. Section labels move into a rail on long pages |
| L5 | **Honest metadata as voice.** Format, date, counts, status: plain and exact | Dynamicland (https://dynamicland.org/): every item states format and length. Media Lab's superscript counts; OWID's counts and freshness | The type word replaces the pill. Counts are derived ("4 papers, 2 in progress"). One provenance footnote replaces 15 inline hedges |
| L6 | **Text is the legend. Motion is reader-driven and explains** | Ciechanowski (https://ciechanow.ski/): prose words are coloured like the controls they name, and nothing moves until touched. The Pudding (https://pudding.cool/): a live statistic beside a control. Stamen (https://stamen.com/): the index is a sentence, and hovering a phrase swaps the figure | Direction names in the home statement are links that light their pearl or line. Hovering a seed names the paper. Intros are finite and tell the figure's story. No ambient loops |
| L7 | **A human trace beats template smoothness, but it must be the field's own** | Ink & Switch (https://www.inkandswitch.com/): four hand-drawn area glyphs built from one kit and reused as tags (I saw `inkandswitch-zoom-areas.png`). Giorgia Lupi / Pentagram (https://www.pentagram.com/work/giorgia-lupi-data-humanism-at-gallerie-d-italia): data drawn as human trace | BOBALAB's "hand" is operations notation (queues, servers, decision nodes, learning curves) and real lab artefacts (a whiteboard scan, a marked-up figure), not imitated ink splatter or fake handwriting |
| L8 | **Unify mixed imagery with one treatment** | Santa Fe Institute (https://www.santafe.edu/): very different images tinted into one duotone family. Felton (https://feltron.com/): circular photo crops as data nodes | Headshots as circles at pearl proportion (P1), squares on the lattice (P2) or roster discs (P3). The PI placeholder belongs to the same system as the photos |
| L9 | **Few sizes, big jumps** | REFS-EDITORIAL §4.1 (MEASURED): e-flux 3 sizes, Feltron 3, Pudding 5; Stedelijk's largest text is 4.7× its median. BOBALAB has 8–9 sizes in ×1.08–1.44 steps | Each prototype has 5–6 sizes with at least one jump of ×2.5 or more |

**Rejected on purpose:**
- black site-wide grounds (Media Lab, Fay's case-study page, Order): the "dark signal" cluster;
- carousels and tickers (Media Lab, SFI, HAI): they break the brief;
- HAI's pill CTAs and rounded colour fields: the SaaS idiom;
- misregistration glitches (metaLAB): to Haas faculty they read as bugs;
- lowercase condensed titles and sticker icons (The Pudding);
- the Media Lab square grid: derivative;
- any imitation of another lab's hand marks.

---

## 3. Four concepts

All four share the §1.2 keep-list, the copy clean-up (cause 6) and the chrome removal (cause 2). They differ in *what the site is about visually*.

> **A finding that grounds A and D (MEASURED from `content/publications/*.md`).** Five public papers belong to two directions:
> - Blaettchen 2026: Algorithmic Advice + Learning on the Job;
> - Liu 2026: AI at Work + Algorithmic Advice;
> - Deng 2025, Jiang 2025 and Deng 2026: Learning on the Job + Platform Work.
>
> (A sixth, Deng 2026 *Act, Ask, or Defer?*, joins AI at Work + Algorithmic Advice but has no public version yet.) The directions therefore form a **chain**: AI at Work – Algorithmic Advice – Learning on the Job – Platform Work. Learning on the Job and Platform Work are the most tightly coupled, with 3 shared papers. This is real, lab-specific structure that the current site never shows.

### Concept A: "Living Research Atlas"

| Facet | Specification |
|---|---|
| **Philosophy** | The lab is a territory. Fig. 1 grows into a map that shows the directions (pearls), their papers (seeds) and how they connect (shared papers and shared people). Every page is a zoom level of the same map: the home page is the whole territory, a direction page is one region with its neighbours cropped at the edges, and a paper is a single point with its location shown |
| **Typography** | A cartographic contrast: **Source Serif 4** (`@fontsource-variable/source-serif-4`, wght file 49.7 KiB + 400 italic 19.6 KiB) for names and prose, with italics used for place-like labels (direction names on the map, as atlases italicise regions). **Hanken Grotesk** (wght 33.9 KiB) for UI and metadata. Total 103.2 KiB (over budget) |
| **Palette** | A "survey sheet": paper `#FAFBFC`, map ground `#EEF2F6`, ink `#18202B`, muted `#4F5A68` (6.77:1 on paper), contour hairlines `#D5DCE5` (decorative, 1.33). Direction tones from the new deep set (§5 tokens) |
| **Grid / composition** | A full-bleed atlas plate (100 vw, about 70 vh) with no frame, then a "gazetteer", a dense index of everything on the map, in a 12-column grid |
| **Pearl language** | Flat ink pearls placed along the chain (AI → AA → LOJ → PW, left to right or along a gentle arc). **Threads** between pearls are 1 px per shared paper, so LOJ–PW is a 3-line bundle. **Bridge seeds** sit *on* the threads. Each pearl's own seeds sit on concentric **year contours** (tree-ring-like orbits: inner = older, outer = newer) |
| **Fig. 1** | The whole atlas. Seeds are focusable papers, and hovering a thread names the shared papers. Optional year scrub (`<input type="range">`) |
| **Research page** | The atlas zoomed on one pearl. Neighbouring pearls are cropped at the viewport edge with their threads running in. Paper short titles are labelled directly on the seeds |
| **Publications / projects** | A gazetteer ledger. Each row has a 4-dot "locator" (which pearls it belongs to) and a map reference. A project is a named cluster of seeds, drawn as a hairline hull on its direction page |
| **People** | People as small markers placed near the directions their projects belong to (from `projects/*.team`), with a list below |
| **Motion** | Threads draw on first visit. Zoom transitions between levels (view transitions), and seeds bloom on arrival. Hover reveals labels |
| **Mobile** | The chain becomes a vertical sequence of 4 pearls with the threads as vertical bundles. This is natural because the chain is linear |
| **Accessibility risks** | High: 2-D focus order; overlapping labels; small seed targets; meaning carried by position; pan/zoom traps; the map needs a full list alternative (the gazetteer is that alternative) |
| **Effort** | L: label placement, a zoom system, the mobile layout, and editorial stability when papers are added (positions must not jump) |
| **Why it would not look AI-made** | Its geometry is derived from the lab's real co-membership data, so no generator would produce that shape. **But** (HYPOTHESIS) nodes and edges on a map are also the stock "AI knowledge graph" image (glowing nodes, network lines), so it must stay flat, ink-only and labelled to avoid trading one tell for another. It also mainly upgrades the home page, while causes 1–4 live everywhere else |

### Concept B: "Research Notebook / Editorial Laboratory"

| Facet | Specification |
|---|---|
| **Philosophy** | The site is the lab's working record. Scholarly publishing conventions are used *for real*: numbered figures that encode data, captions, a byline grid, a table of contents, dated notes. Warmth comes from traces of process (a "From the notebook" scan, marginal dated notes), not from cream and serif ornament |
| **Typography** | IDENTITY-RESEARCH **T1** (MEASURED specimen, `t1-read-2x.png`, which I saw):<br>• **STIX Two Text**, a face made for scientific and technical publishing (DOCUMENTED), sets titles, headings and prose. Its STIX headings read like a journal masthead, not a template.<br>• **Atkinson Hyperlegible Next**, drawn for low-vision readers (DOCUMENTED), sets UI and metadata.<br>• **Atkinson Hyperlegible Mono 500** is used only for DOIs and BibTeX.<br>Total 88.8 KiB |
| **Palette** | White paper, blue-black "fountain pen" ink. **One accent:** butterfly-pea blue for links, whose hover/visited state is violet. The tea turns violet in acid: a quiet "control → treatment" joke for an experiments lab (IDENTITY-RESEARCH P1). Direction tones only in the figure and as small markers |
| **Grid / composition** | 12 columns with a **margin rail** (cols 1–3: years, figure numbers, section labels), a text column (cols 4–10, 64ch), and notes (cols 11–12: dates, awards, "as of"). Sections start with a 2 px ink rule, never a box |
| **Pearl language** | Flat ink discs, with no halo, sheen or rim. The hairline orbit and seeds are kept from D-02a (the "dial"). A seed shared with another direction gets a 1.5 px ink ring |
| **Fig. 1** | An unboxed journal plate: 2 px ink rule above, 1 px rule below, caption under it ("Figure 1." in bold plus a real sentence). The current cluster geometry is kept, with seeds as focusable papers. The home statement *is* the legend: the four direction names are links prefixed with their seed dot |
| **Research page** | An article layout: h1, the question as an italic dek, a byline grid (Projects / Papers / In progress / Shares papers with), a label rail for "Why it matters / Projects / Papers", "Figure 2" (the direction's papers by year, labelled directly), and an optional notebook figure |
| **Publications / projects** | **Publications:** a TOC grouped by year, with a big year numeral in the rail, title in STIX 600, Atkinson authors, venue in italic, and a plain text line of links. **Projects:** "case files" as rows; a project with no summary is a compact one-line row (no empty box) |
| **People** | A masthead: the PI large, members as photo circles at pearl proportion, alumni as a two-column text list with years flush right |
| **Motion** | Minimal and explanatory: a critically damped settle intro (no overshoot), seed bloom and caption swap on hover, focus that names a paper, and the morph. Nothing loops |
| **Mobile** | The rail collapses to inline labels. Fig. 1 becomes list mode with flat 44 px pearls on small orbits |
| **Accessibility risks** | STIX at small sizes needs at least 18 px body; links are blue vs ink at 2.16:1, so they must stay underlined; notebook scans need real alt text; long captions |
| **Effort** | M. Token, font and component CSS; markup mostly unchanged |
| **Why it would not look AI-made** | It uses conventions *with content*: figure numbers on real figures, a byline grid on real metadata, a TOC of real papers. It uses a scientific publishing face, not the trendy display serif. The structure is visible. **Risk:** the "broadsheet cosplay" cluster (capitalandcompute). Guard: no column rules, drop caps, datelines, ornament or paper textures |

### Concept C: "BOBALAB Visual Identity System" (generative pearl marks)

| Facet | Specification |
|---|---|
| **Philosophy** | The lab is an identity built from one physical rule: **pearls sink and settle**. A pearl may rest above the floor only on two pearls below it. The rule generates the lab mark, the four direction glyphs, the favicon (∴, "therefore"), the dividers, the poster grid and the OG cards (IDENTITY-RESEARCH §3, DOCUMENTED there with the exact geometry) |
| **Typography** | IDENTITY-RESEARCH **T3**: **Familjen Grotesk** (ink traps, tabular figures by default, MEASURED) for the voice, plus **Literata** (a reading serif) for prose, authors and venues. No mono. 90.5 KiB |
| **Palette** | Neutral ink on white with **no brand accent**. Four **spot inks**, one hex per direction valid in both modes (pea `#4B8EFE`, lychee `#EC6094`, matcha `#249163`, oolong `#C06C08`). Minimum CVD ΔE is 8.41 (MEASURED, recomputed here; the current set is 3.30). Spots are never text |
| **Grid / composition** | An 8 px lattice unit. Every glyph and heading "rests" on a rule (the system's one compositional signature). Asymmetric 2/4 splits on a 6-column grid |
| **Pearl language** | Flat discs in one colour, with no gloss or stroke; never rotated, mirrored or floating. Lab mark `0/10/111/1111`. Direction glyphs AA `0/00/000/1111`, AI `0/00/101/1111`, LOJ `0/10/110/1110`, PW `0/00/001/1011` (IDENTITY-RESEARCH §3.3) |
| **Fig. 1** | "The lab mark, taken apart." The four direction glyphs stand in spot ink on one common floor rule. Below each is a tally of its papers (filled) and work in progress (open). The intro starts from the assembled lab mark and separates it into the four glyphs, so the motion explains that the mark *is* the directions |
| **Research page** | The direction glyph at about 240 px in spot ink, resting on the header's bottom rule, with the h1 beside it. Three large numerals (papers / in progress / projects) with small labels |
| **Publications / projects** | Ledger rows with 18 px glyph tags (a shape cue plus colour plus label, an accessibility gain over a hue-only dot) |
| **People** | A square photo grid on the lattice, with glyph tags for each person's directions |
| **Motion** | IDENTITY-RESEARCH §5: **settling** (critically damped), **diffusion** (√t spread of a spot to related items), **steeping** (exponential state change), **buoyancy** (only interactive things lift) |
| **Mobile** | Glyph tags hold up at 18 px (MEASURED, board v2). The figure becomes a 2×2 grid of glyph + tally |
| **Accessibility risks** | Spots on the alt surface fail for pea and lychee (2.99 / 2.96 on `#F8F8F6`), so glyphs are allowed only on white. Spots are never text. The glyph is never the only label |
| **Effort** | M–L: an SVG generator, a CMS `glyph` enum and validator, OG and slide templates |
| **Why it would not look AI-made** | A written rule that only this lab owns, with a story (settling; ∴ = "therefore"), produces everything. **Risk, MEASURED by looking at `board/b2-p3.png`:** bright pea and lychee chips filled behind white labels, with a bold grotesk and a filled ink CTA, read close to a 2023 product-startup UI. My HYPOTHESIS is that the system is safe only with spot area at or below about 10% of a viewport, with no filled spot chips, and with Literata carrying most of the text |

### Concept D (original): "Service Lines". The lab drawn as an operations system

| Facet | Specification |
|---|---|
| **Philosophy** | BOBALAB studies dispatch, queues, workers who learn on the job, and advice given and declined. So draw the lab in *its field's own notation*:<br>• each direction is a **service line**;<br>• each paper with a public version is a **job that has been served**, placed in order of year;<br>• **work in progress waits in the line's queue** (open rings past the "now" line);<br>• a paper shared by two directions is **routed through both lines** (a vertical link);<br>• the **pearl is the server** at the now line, where waiting work becomes public.<br>The figure is a real, honest chart of the lab's output, with a story an operations researcher recognises in seconds |
| **Typography** | A timetable voice from one family with range: **Archivo**, width axis 62–125 × weight (IDENTITY-RESEARCH T2; MEASURED here in the sketch). Condensed (wdth 68, wght 700) for line labels, year numerals and display; wdth 100 for text; wide (112) for the wordmark. Archivo 400 italic for venues. 103.4 KiB |
| **Palette** | White paper, green-black ink `#111410`, no accent. Colour only on the lines, using a new text-safe deep set whose minimum CVD ΔE is 8.18 (current set: 3.30). The line *position* also carries the identity, so colour is redundant by design |
| **Grid / composition** | A timetable grid: a fixed label column (18rem) plus a track; heavy 2 px ink rules open and close each table; dense ledger rows below. One big chart, then density (REFS-EDITORIAL §4.1) |
| **Pearl language** | Ink discs as **servers** on the now line (34 px on home, 96 px on direction pages). Paper dots are 14 px in the line colour. Work in progress is shown as 14 px open rings. 1 px ink connectors for shared papers. No gloss, no halo |
| **Fig. 1** | Four lanes; one column per public paper in chronological order (so shared papers align vertically); year labels above; the now line; queues to the right. **Sketch MEASURED** (`sketch-d/d2-1440.png`, which I saw): it reads as a published figure. The 3 LOJ–PW links and the AA–LOJ and AI–AA links are legible at a glance. A linear year axis was rejected after the first sketch (`d-1440.png`): 2021–2024 was empty, the links slanted, and numbered black pearls looked like notification badges |
| **Research page** | The direction's line enlarged across the page as its hero, with each dot labelled by its paper's short title. Shared papers show a stub of the other line with its name. The 96 px server pearl is the morph target. Queue rings are labelled with WIP titles |
| **Publications / projects** | **Publications:** a ledger (year numeral | title, authors, venue | route indicator | type, directions, links). The **route indicator** is a tiny 4-lane mark showing which lines the paper runs through. **Projects:** "jobs" rows (title + summary | route | papers | people | status only if completed) |
| **People** | A "crew" roster by role (PI, graduate, undergraduate) with photo discs. For people on project teams, a 4-column line matrix (the dot is filled where they work) |
| **Motion** | The chart builds in the order of service: the now line draws, columns appear left to right, links draw, servers settle, queues slide in. About 1.2 s once per session. Hovering a line dims the others *except* papers shared with it, so motion reveals relationships. No loops |
| **Mobile** | The lanes transpose into four stacked blocks. Each has the line label and a wrapping strip of dots in year order, with the queue at the end. Shared papers are said in words ("also in Platform Work") instead of links |
| **Accessibility risks** | A chart needs a table equivalent (the ledger is that equivalent); 14 px dots need 24 px hit areas; hover-only information must also be on focus; colour plus position (redundant, good). Condensed type below 16 px is hard to read, so condensed is only for ≥ 2rem |
| **Effort** | M. One SVG generator over existing fields (`year`, `type`, `directions`, links). No new CMS fields |
| **Why it would not look AI-made** | A generator does not draw queueing diagrams of a lab's own output. The chart is specific, data-true and on-topic. The type is a timetable voice, not the editorial trio. **Risks:** it could read as a transit map (guard: straight horizontal lines only, no rounded corners, no station ticks) or as a Gantt/dashboard tool (guard: no gridlines, toolbars or tooltip cards with shadows) |

---

## 4. Evaluation

Ratings are relative judgements (HYPOTHESIS) on a three-step scale: **●●●** strong, **●●○** adequate, **●○○** weak. The reasoning follows the table. The current site is included as the baseline.

| Criterion | Current | A Atlas | B Notebook | C Identity | D Service Lines |
|---|---|---|---|---|---|
| Originality | ●○○ figure only | ●●● | ●●○ | ●●● | ●●● |
| Distinctiveness (recognisable from one screen) | ●○○ | ●●● on home, ●○○ elsewhere | ●●○ | ●●● | ●●● |
| Academic credibility (5-second test, Haas faculty) | ●●○ | ●●○ | ●●● | ●●○ | ●●● |
| Sophistication | ●●○ | ●●○ | ●●● | ●●○ | ●●● |
| Character / warmth | ●●○ ("café") | ●●○ | ●●○ | ●●● | ●●○ |
| Interaction clarity | ●●● | ●○○ | ●●● | ●●○ | ●●○ |
| Accessibility | ●●● | ●○○ | ●●● | ●●○ | ●●○ |
| Responsiveness | ●●○ | ●○○ | ●●● | ●●● | ●●○ |
| Effort (●●● = least) | — | ●○○ L | ●●● M− | ●●○ M–L | ●●○ M |
| Maintainability (editor adds a paper) | ●●● | ●○○ | ●●● | ●●○ | ●●● |

**Reasoning:**
- **A Atlas.**
  - The most "on-brief" evolution of Fig. 1, and the relationships are real. But the free-form map is expensive (layout stability, label collisions, 2-D focus), and its mobile form is a different figure.
  - It leaves the other 13 templates to be solved separately.
  - Node-and-edge imagery is itself a stock "AI" picture.
  - **Its ideas are better than its form**, so they are absorbed into P1 (paper-level seeds, twin links) and P3 (routing links).
- **B Notebook.**
  - The safest credibility gain, and the cheapest because it is mostly tokens and CSS. STIX is literally the face of scientific publishing.
  - The risk is that a sober page reads as merely "clean". It needs the figure, the rail and the real artefacts to carry character. Warmth is ●●○ because it gives up the boba sweetness for pen and paper.
- **C Identity.**
  - The strongest *brand*. The ∴ story and the settling rule give the lab marks it can use on posters and slides, beyond the website.
  - Credibility is ●●○ because the spot inks plus a bold grotesk drift towards startup (MEASURED by eye on `b2-p3.png`).
  - Interaction clarity is ●●○ because glyph meanings must be learned. The label always carries the meaning, so this is a learning cost, not a failure.
- **D Service Lines.**
  - The most specific to *this* lab, because the notation is the lab's field. The figure is a real chart, so it passes a faculty five-second test better than pearls with halos do.
  - Interaction clarity is ●●○ because lanes, rings and links need a caption to decode. The caption is honest and short (sketch).
  - Accessibility and responsiveness are ●●○: the chart transposes on mobile, and the ledger is the table alternative.
  - Maintenance is ●●● because it is fully derived from existing fields.
- **Evaluation risk:** these ratings come from one reviewer. The judge should repeat the five-second test with two or three Haas faculty, as REFS-EDITORIAL §6 recommends.

**Selection.** Prototype **P1 (B-led)**, **P2 (C-led)** and **P3 (D-led)**:
- They differ on the axes that matter: voice (serif journal / grotesk identity / condensed timetable), what Fig. 1 *is* (dial / mark / chart), and where colour lives (accent link / spot glyphs / lines).
- Each is buildable as a static page in a few days.
- A's ideas live inside P1 and P3.

---

## 5. Prototype specifications

> **[Critique]** This section has been revised after the independent critique at the end of the document. Each change carries its required-change number **[RC-n]**, and C.6 lists them all. The build list is now **P0 Control** (§5.4, new), **P1 Notebook**, **P2 Settle** and **P3 Lines**.

### 5.0 Shared contract (applies to P0, P1, P2 and P3 [RC-1])

**Deliverable**
- One standalone static page per prototype:
  - suggested location `docs/redesign/prototypes/{p0-control,p1-notebook,p2-settle,p3-lines}/index.html` **[RC-1, RC-14]**;
  - optionally `proto.css` and `proto.js` beside it;
  - no framework and no build step.
- **[RC-22]** A `MAPPING.md` beside each prototype, with one row per component: prototype component → the existing component and class names it would restyle → the test files that select on them (AUDIT-SYSTEM R5).
- **[RC-21] Figure JS at most 2.5 KB gz** (the D-02a/JUDGE budget; the earlier 4 KB figure here contradicted it). **Total JS at most 8 KB gz.**

**Page structure**
- One scrolling page with **six** "page mocks" in this order **[RC-17]**:
  1. home (header, hero, Fig. 1, and a short "recent publications" block of 3 entries);
  2. **research direction** (`/research/learning-on-the-job/`; chosen because it shares papers with two other directions);
  3. **publications list** (8 entries in 3 year groups, with filter row);
  4. **projects** (4 entries, including one with no summary);
  5. **people** (PI + 9 members + 3 alumni);
  6. **[RC-17] paper page** `/publications/bastani-2026-rl-tips/`:
     - title, authors, venue and status;
     - the `in_brief` paragraph;
     - **the study-design plate** (§5.0a) in the prototype's own grammar;
     - the awards line ("7 awards", expandable);
     - APA + BibTeX;
     - then the footer.
- Each mock starts with `<hr>` and a one-line mock label (e.g. "Mock · /publications/") in the concept's own meta style, with `role="note"`.
- Only the home mock has the h1. The other mocks use h2 page titles, styled like an h1, plus `aria-label` on their `<section>`.

**Fonts**
- Self-hosted in production; **for prototypes only**, load from pinned jsDelivr npm URLs: `https://cdn.jsdelivr.net/npm/{package}@5.3.0/files/{file}`.
- All packages are at 5.3.0, published 2026-07-19 (MEASURED, `npm view`).
- Use `font-display: swap` and a metric-close fallback (`Georgia` for serifs, `Arial` for sans).

**Data**
- Inline `<script type="application/json" id="lab-data">` with the snapshot in **Appendix A**.
- Use real content only. No lorem ipsum, invented findings or invented quotes.
- **Counting rule** for the prototypes: a *paper* has a public link or DOI and `type ≠ work-in-progress`. Everything else in a direction is *in progress*.
- With this rule, AA = 4, AI = 4, LOJ = 4, PW = 6. The live site shows AI = 5 because it also counts a documented talk (D-05). The prototypes show "as of 24 October 2026" and are not expected to match the live count.
- **[RC-17]** Add each paper's `in_brief` (from `content/publications/*.md`) to the snapshot. Ledger rows show it as one muted `--t-body` line under the venue, clamped to 2 lines with the full text on the paper page. Papers without `in_brief` show nothing; never generate one.
- **[RC-15] Year bins.** Wherever papers are placed in order (P1 seeds, P3 columns, P2 piles):
  - group them by `year`;
  - within a year, order by `date_online` where present, otherwise by slug;
  - if any bin uses the slug fallback, the caption says "Order within a year is not meaningful."
- **[RC-19] Growth harness.**
  - `?n=2x` and `?n=4x` duplicate the papers in the snapshot, with titles prefixed "SYNTHETIC –".
  - The harness exists only in the prototype, never in `content/`, and is never captured as a hero shot.
  - Each prototype states its overflow rule and shows it working at 4x.

**No-JS**
- The direction list (4 links with counts), every publication, project and person are in the HTML.
- JS may draw the figure SVG from the JSON, but the page must make sense with JS off.

**Photos**
- Use the consented files `../../../../public/uploads/people/{slug}.jpg` (D-12).
- No photo exists for the PI or for William Deng: use each concept's placeholder.

**Copy rules**
- Delete every pipeline caveat ("reported by the lab", "listed by title only", "Status not confirmed").
- Put one provenance footnote at the end of the publications mock: "Review status and dates are as reported by the lab, October 2026."
- No "Explore our research"; no "Meet the lab"; no "All X →" header bars.
- Section titles are plain nouns, or a two-line couplet where specified.
- **[RC-8]** Lab members in author lists are set in weight 600 (the CV convention), **not** marked with a dot. Discs mean papers and directions only.
- **[RC-14]** Visible copy never uses metaphor vocabulary ("crew", "jobs", "served", "queue", "server"). The words are People, Projects, Papers and In progress.

**Themes and motion modes**
- Light and dark via `prefers-color-scheme`, plus a `data-theme="light|dark"` override on `<html>` for screenshots.
- Reduced motion via `prefers-reduced-motion` *and* `html[data-motion="reduce"]`. Wrap all transform animations in `@media (prefers-reduced-motion: no-preference) { :root:not([data-motion="reduce"]) … }`.
- A footer text button "Reduce motion" toggles `data-motion` (`aria-pressed`).

**Viewports the judge will capture:**
- 1440×900;
- 1366×768 (fold: the Fig. 1 plate bottom must be at y ≤ 768);
- 390×844 at DSF 2;
- 320×640 (no horizontal scroll);
- dark mode;
- reduced motion;
- intro frames at 0/150/400/800 ms;
- hover and focus states on Fig. 1;
- **[RC-20]** forced colours (`forcedColors: 'active'`), and a grayscale capture (CSS `filter: grayscale(1)` on `html`, screenshot only);
- **[RC-11]** fonts blocked (route `cdn.jsdelivr.net` to abort), so the fallback faces show;
- **[RC-19]** `?n=4x` at 1366 and 390;
- **[RC-2]** the mark sheet (§5.0a).

**Accessibility gates**
- axe-core: 0 violations (wcag2a/aa, 21aa, 22aa).
- Visible 2 px focus ring.
- Targets at least 24×24, and 44 px for primary controls.
- Every graphic either has text equivalents next to it or is `aria-hidden` with an equivalent.
- Filters are `<button aria-pressed>`.
- **[RC-18] No custom arrow-key models.**
  - On the home figure, paper dots are `aria-hidden` and pointer-only (hover names the paper). Pearls and lane labels are ordinary links in DOM order.
  - Dot-level focus exists only on direction Figure 2, where each dot is an ordinary labelled `<a>` in tab order.
- **[RC-20]** In forced colours, every direction stays identifiable by position, shape and text label.

**AI-tell budget**, verified by a DOM probe like AUDIT-SYSTEM's. Each count must be **0** unless stated:

| Probe | Limit |
|---|---|
| Bordered elements with radius ≥ half their height (pills) | 0 |
| Bordered or filled boxes > 60 px tall with radius > 2 px | 0 (pearls, photos and the focus ring are excluded) |
| `text-transform: uppercase` with `letter-spacing` > 0.02em | 0 |
| Monospace text outside `code`, `pre`, `.doi`, `.bibtex` | 0 |
| "→" glyphs | ≤ 1 per **page** **[RC-5]** |
| **[RC-5]** "↗", "↘", "›" or other arrow glyphs, including CSS `content` | 0 (the link text says where a link goes) |
| Text nodes with ≥ 2 "·" separators | 0 |
| `radial-gradient`, `linear-gradient` or non-focus `box-shadow` in computed styles | 0 |
| Animations with `iteration-count: infinite` | 0 |
| Surfaces with OKLCH hue 40–100° **and** chroma > 0.004 (the "cream" test) | 0 |
| **[RC-3]** Text larger than the prototype's statement cap (P1 3.25rem; P2/P3 2.25rem), excluding Fig. 1 and the P2 direction glyph | 0 |
| **[RC-3]** `letter-spacing` < −0.015em, or `line-height` < 1.0, on any text | 0 |
| **[RC-4]** Borders or rules ≥ 2 px visible in one 1440×900 viewport | ≤ 2 |
| **[RC-6]** Numerals ≥ 2rem that are counts (hero metrics) | 0 |
| **[RC-7]** Text matching `^0[1-9]$` (index numerals) | 0 |
| **[RC-8]** Discs (radius 50%, ≤ 12 px) that are not paper or direction marks | 0 |

**Fonts that may not appear:**
- Fraunces, Inter, IBM Plex (any), Geist, Space Grotesk, Instrument Serif/Sans, DM Sans, Manrope, Bricolage Grotesque (IDENTITY-RESEARCH §1.3);
- system-ui as the voice.

**Surface hue rule.** ΔE alone does not separate surfaces. Every near-white is within about 4 ΔE_OK of the cream tell `#F4F1EA`, pure white included (4.26, MEASURED). The current page `#FCFAF6` is 2.73 away, yet reads warm because of its hue (85°) and chroma (0.0057). So the rule above uses hue and chroma.

**New direction tones (P1 and P3)** (MEASURED with `tone_eval.py`: Machado 2009 CVD, ΔE_OK×100):

| Direction (enum) | Deep: light-mode text + marks | Light: dark-mode text + marks |
|---|---|---|
| butterfly-pea (Algorithmic Advice) | `#2B4FA8` | `#8EA4F7` |
| lychee (AI at Work) | `#A12C5A` | `#F590AE` |
| matcha (Learning on the Job) | `#4C7A1E` | `#A8DA84` |
| oolong (Platform Work) | `#6B4500` | `#C4943A` |
| **Minimum CVD ΔE** (all four, normal/protan/deutan/tritan) | **8.18** (current deeps 3.30) | **8.19** (current lights 3.41) |

The names and hue families are unchanged, so the CMS enum stays. Contrast on each prototype's surfaces is given in its token table.

### 5.0a [RC-2, RC-17] Shared additions: mark sheet and study-design plate

**Mark sheet [RC-2].** Each prototype adds a `marks.html` showing:
- the header lockup;
- the favicon at 16 and 32 px;
- one colour, reversed;
- the mark at 48 px.

**Lineup test.** The 16 px favicon is placed in a row with the six generic icons from `…/scratchpad/redesign/critique/lineup.html`: record/radio, the three-circle "group" icon, share, git commit, loading dots, and orbit. It passes if 3 people, shown the row blind, do not pair it with a generic icon.
- MEASURED failures so far: P2's ∴ (identical to the "group" icon) and P3's pearl-on-a-line (identical to the git-commit node).
- A letterform favicon in the prototype's face is acceptable.
- A pearl-letter substitution (the retired pearl-O) is not.

**Study-design plate [RC-17].** Each prototype draws **the same** plate, for Bastani, Bastani & Sinchaisri (2026), *Management Science* 72(1), so the judge compares grammars on identical content. It appears on the paper mock, as **Figure 3** in P1 and as the plate in P2 and P3.

Content: only the design facts DOCUMENTED in the critique C.3 table, read from https://arxiv.org/html/2108.08454v5:
- 3 workers (chef, sous-chef, server);
- burger orders of 3 subtasks in fixed order (chop → cook → plate);
- 4 orders per round;
- time in ticks; worker speed revealed only after assignment;
- optimal finish 20 ticks fully staffed, 34 understaffed;
- a "normal" configuration (3 full rounds) and a "disrupted" one (2 full + 4 understaffed rounds);
- Phase I with no tips (trace data) → Phase II, randomised into 4 arms (no tip; the algorithm's tip; the tip most chosen in Phase I; a baseline tip);
- a tip is one if-then rule.

**Draw:**
- the 12 subtasks as 12 pearls (4 orders × 3), in the direction's tone;
- the precedence chain chop → cook → plate;
- the 3 worker floors or lanes;
- the Phase I → II flow with its 4 arms.

**Never draw:**
- an assignment schedule, because one the builder invents would be read as the optimal policy;
- any result: no performance, compliance or effect sizes.

**Caption:** "Figure 3. Study design of Bastani, Bastani & Sinchaisri (2026). Redrawn as a schematic from the paper's description; not data."

**Motion (optional):** a reader-triggered "Step through the design" `<button>`. It runs 4 finite steps: orders arrive, they split into subtasks, the chef leaves (disrupted configuration), and the Phase II arms appear. There is no autoplay, and reduced motion shows all steps at once.

**Copyright:** redraw from the text. Do not trace the published figures.

**Live-site rule (for later adoption):** plates are an optional `figure` object on a publication (`image`, `alt`, `caption`, `source`, `pi_verified`). The validator renders a plate only when `pi_verified: true`.

---

### 5.1 P1 "Notebook" (concept B, plus A's paper-level seeds)

**Pages / sections** (per §5.0):
1. **Home:**
   - the header;
   - the statement, which doubles as the legend;
   - Fig. 1 as an unboxed plate with its caption;
   - "Recent publications" as 3 TOC entries.
2. **Direction (Learning on the Job):**
   - the article header with a byline grid;
   - label-rail sections "Why it matters" (use the direction `summary` field as the opening sentence, not "This direction collects…");
   - "Figure 2" (this direction's papers by year, with direct labels);
   - "Projects" (2 rows);
   - "Papers" (4 TOC entries).
3. **Publications:** filters, then year groups 2026 / 2025 / 2023, then the footnote.
4. **Projects:** 4 case-file rows (`learning-to-gig`, `learning-on-the-go`, `gig-driver-behavior`, `learning-across-jobs`, which has no summary).
5. **People:** the masthead.

**Fonts** (88.8 KiB):

| Role | Package → file | KiB |
|---|---|---|
| Titles, headings, prose, captions' "Figure n." | `@fontsource-variable/stix-two-text` → `stix-two-text-latin-wght-normal.woff2` (wght 400–700) | 27.9 |
| Venues, question dek, emphasis | `@fontsource/stix-two-text` → `stix-two-text-latin-400-italic.woff2` | 17.8 |
| UI, nav, metadata, caption text, filters | `@fontsource-variable/atkinson-hyperlegible-next` → `atkinson-hyperlegible-next-latin-wght-normal.woff2` (200–800) | 33.2 |
| DOI and BibTeX only (**[RC-7]** no longer used for pearl indices, which are removed) | `@fontsource/atkinson-hyperlegible-mono` → `atkinson-hyperlegible-mono-latin-500-normal.woff2` | 9.9 |

**Colour tokens** (MEASURED contrast, WCAG 2.x):

| Token | Light | Ratio on `--paper` / `--margin` | Dark | Ratio on `--paper` / `--margin` |
|---|---|---|---|---|
| `--paper` | `#FFFFFF` | — | `#0F1218` | — |
| `--margin` (BibTeX/code block and the 404 only; never a card) | `#F3F5F8` (OKLCH 0.969 / 0.0045 / 258°, cool) | — | `#161A21` | — |
| `--ink` (text, pearl, focus ring) | `#161A22` | 17.43 / 15.96 | `#E6E9EF` | 15.42 / 14.34 |
| `--muted` | `#4E5563` | 7.49 / 6.86 | `#A7AEBB` | 8.41 / 7.82 |
| `--link` (always underlined) | `#2440C4` | 8.06 / 7.38 | `#94A7FF` | 8.24 / 7.67 |
| ~~`--link-treated` (hover + visited: "acidified pea")~~ **[RC-10] dropped**: blue links that turn violet are the browser's default pair and read as unstyled | ~~`#6B2FA3`~~ | — | ~~`#C9A3F2`~~ | — |
| `--rule` (control boundaries, ≥ 3:1) | `#7D8594` | 3.71 / 3.40 | `#788191` | 4.77 / 4.44 |
| `--hairline` (decorative only: orbit, row dividers) | `#DCE1E8` | 1.31 | `#2A303A` | 1.41 |
| `--pearl` / `--pearl-index` | `#161A22` / `#FFFFFF` (17.43) | 17.43 on paper | `#E6E9EF` / `#0F1218` (15.42) | 15.42 on night |
| `--dir-*` (seeds, markers, direction-name text allowed) | §5.0 deeps: 7.54 / 6.95 / 5.11 / 8.48 on paper; 6.90 / 6.36 / 4.68 / 7.76 on margin | | §5.0 lights: 7.86 / 8.47 / 11.63 / 6.83 on night | |

**Notes on the tokens:**
- **[RC-10]** Link *text* is `--ink`. The link is marked by a 1 px underline in `--link` (`text-decoration-color`), offset 0.18em, which thickens to 2 px on hover and focus. Visited links do not change colour. `--link` is never a text colour.
- List titles are links identified by position and weight; they underline on hover and focus.
- Paper on a link-filled button would be 8.06, but **P1 has no filled buttons**.

**Type scale** (root 16 px; 6 sizes):

| Token | Size / line-height | Face | Use |
|---|---|---|---|
| `--t-meta` | 0.9375rem / 1.45 | Atkinson 400 (500 for labels, 600 for rail labels) | metadata, captions, nav, filters, authors |
| `--t-body` | 1.125rem / 1.6, measure 64ch | STIX 400 | prose, summaries, venue (italic) |
| `--t-title` | 1.375rem / 1.25 | STIX 600 | list titles, h3, person names in the masthead, question dek (italic 400) |
| `--t-head` | clamp(2rem, 1.25rem + 2.4vw, 3.25rem) / 1.08, −0.005em | STIX 600 | h1/h2 page and section titles |
| `--t-display` | **[RC-3]** clamp(2.25rem, 1.4rem + 2.2vw, 3.25rem) / 1.08 (was up to 5rem) | STIX 500 | home statement; year numerals in the rail at a fixed 3rem (STIX figures are tabular by default) |
| `--t-mono` | 0.875rem / 1.5 | Atkinson Mono 500 | DOI, BibTeX |

**[RC-3]** The display:body ratio at 1440 is about 2.9 (52/18), against 2.6 today. The 4.4 ratio was the "oversized serif hero" tell.

**P1's extreme is the numbered-figure system, not headline size [RC-3, RC-17]:**
- every mock carries at least one numbered figure (Fig. 1 home; Fig. 2 direction; Fig. 3 study-design plate on the paper page);
- each figure has a rule above and a caption below, and the caption is a sentence;
- the margin rail is the one structural device that is P1's alone (RC-4).

**Grid:**
- Container max 78rem.
- Side gutter 16 px below 40rem, 24 px to 64rem, 32 px above.
- 12 columns, gap 24 px (32 px ≥ 64rem).
- **Rail** = cols 1–3; **text** = cols 4–10; **notes** = cols 11–12, ≥ 80rem only (otherwise notes fall below the text).
- Sections are separated by a full-container **2 px `--ink` rule** with 64 px above and 24 px below. Rows within a section use 1 px `--hairline`.
- No element has `border-radius` except pearls, seeds and photos (50%).

**Key components:**
- **Header:**
  - The wordmark "BOBALAB" is STIX 700 at 1.375rem, letter-spacing 0.01em, with no pearl-O. Beneath it, "Berkeley Operations and Behavioral Analytics Lab" in Atkinson 500 at 0.9375rem, muted.
  - **[RC-2]** P1 had no mark. It must propose one in `marks.html` that passes the lineup test (§5.0a). A plain flat disc and the orbit "dial" are known failures at 16 px (MEASURED: they read as a full stop and as a radio button).
  - Nav is Atkinson 500 at 1rem. The current page gets a 2 px ink underline.
  - The header has a 1 px hairline bottom.
- **Home statement (= legend):**
  - Line 1, set in `--t-display` across cols 1–9: "We study how people learn, decide and work alongside algorithms and AI."
  - Line 2, set in `--t-body`, cols 1–8: "Our research runs along four directions: ● Algorithmic Advice, ● AI at Work, ● Learning on the Job and ● Platform Work."
  - Each "● name" is an underlined link with an 8 px seed dot in `--dir-*`. Hover or focus activates the matching pearl in Fig. 1.
  - Affiliation, "Haas School of Business, University of California, Berkeley", sits once in `--t-meta`. `text-wrap: balance`, and a no-break space inside "University of California".
- **Fig. 1 plate:**
  - Unboxed, cols 1–12, 2 px ink rule above, 1 px `--rule` below.
  - Plate height at most 420 px at 1366 wide, and the whole plate must fit in 1366×768.
  - **Caption under the plate**, cols 1–8:
    - "**Figure 1.** Research directions of the lab. Each pearl is a direction; each dot on its ring is one paper with a public version. A ringed dot is a paper shared by two directions."
    - Then a notes line in `--t-meta` muted: "Counts as of 24 October 2026."
  - **Live caption swap:**
    - On direction hover or focus, the caption becomes "**Algorithmic Advice.** 4 papers, 2 in progress. (**[RC-7]** no "01") When should advice name the exact next move…" (one sentence, truncated at the question mark).
    - On seed **hover** (pointer only, **[RC-18]**), it becomes "**Precise or Broad? The Reward-Learning Frontier in Algorithmic Advice Design.** Working paper, 2026. Also in Learning on the Job." followed by the paper's `in_brief` first sentence **[RC-17]**.
    - Reserve the caption height.
- **TOC entry (publications, recent publications, direction papers):**
  - Rail: the year numeral, once per group.
  - Text column:
    - title (`--t-title`, link);
    - authors (`--t-meta`; **[RC-8]** lab members in weight 600, with no dot);
    - venue in STIX italic `--t-body`, plus status in roman ("Major revision at *Manufacturing & Service Operations Management*");
    - **[RC-17]** the `in_brief` line, muted `--t-body`, at most 2 lines;
    - a line with the type word ("Working paper") followed by text links "PDF  SSRN  DOI", separated by 1em, with padding for 24 px targets. **[RC-5]** There is no trailing "↗".
  - Notes column: direction seed dots with names; awards as "7 awards" (italic `--t-meta`, links to the paper page).
- **Filters:**
  - A text row "Show: All  Journal articles  Working papers" plus four direction toggles (seed dot + name), each a `<button aria-pressed>`.
  - Pressed = ink text + 2 px ink underline. Unpressed = muted text + 1 px `--rule` underline, which gives the 3:1 boundary.
  - Min height 44 px.
- **Direction byline grid:** 4 columns of label (`--t-meta` 600, sentence case) over value (`--t-body`): Projects **4** | Papers **4** | In progress **1** | Shares papers with **Platform Work (3), Algorithmic Advice (1)**. Render real columns, not a middot string. Counts are derived by membership: `precise-or-broad` belongs to both Algorithmic Advice and Learning on the Job, so Learning on the Job has 4 projects.
- **Figure 2 (direction):**
  - A 1-row dot strip on a 1 px ink axis from 2025 to 2026, **[RC-15]** grouped into year bins with a gap between them. Each paper is a 10 px `--dir-matcha` dot labelled with its short title (`--t-meta`, max 28ch), alternating above and below. **[RC-18]** Each label is an ordinary link in tab order.
  - Caption "**Figure 2.** Papers in Learning on the Job by year."
- **Case-file project row:**
  - Rail: the direction seed dots.
  - Text: title (`--t-title`) and summary (`--t-body`, muted).
  - Notes: "2 papers, 3 people". "Completed" appears only on completed projects.
  - A project with no summary is a single line: title plus notes.
- **People masthead:**
  - PI: **[RC-8, RC-9]** a 160 px `--margin` square with "PS" in STIX 600 2.5rem, `--ink` (replaced by the consented photo when it exists). Name in `--t-head`; title "Assistant Professor of Operations and Information Technology Management" in `--t-body`.
  - **[RC-9] Members** are a masthead **list**, not an avatar grid:
    - two columns at ≥ 64rem, one below;
    - each row has a 64 px **square** photo (radius 0), then the name in STIX 600 `--t-body`, then the role and program in `--t-meta` muted;
    - rows are separated by hairlines.

    (The earlier spec of photo circles, 6 per row, was the stock template team grid.)
  - William Deng and Shunan Jiang have no photo: use a 64 px `--margin` square with initials in STIX 600. **[RC-8]** No pearl, because discs are reserved for papers and directions.
  - Alumni: a two-column list, name left, year flush right, tabular.
- **Footer:**
  - Three plain columns: lab address + email / site links / "Lab members: Lab scheduler" (**[RC-5]** no "↗").
  - "Reduce motion" text toggle.
  - "Last updated 24 October 2026".
  - No mono headings.

**Pearl rules:**
- Pearl body: a flat `--pearl` disc, D = clamp(5rem, 12cqi, 7rem), with **no halo, glow, sheen, rim or inset**.
- ~~Index numeral inside~~ **[RC-7] No numeral inside the pearl.** The order is editorial, and a numeral in a dark disc reads as a notification badge. The pearl is blank; its name is the label under it.
- Orbit: 1 px `--hairline` circle, r = 0.64D.
- Seeds: max(7 px, 0.11D) flat `--dir-*` dots on the orbit, filled in clock order 12, 1, 11, 2, 10, 3. **The arc is capped at ±75° from 12 o'clock** (JUDGE fix 4). **[RC-15]** The seeds are placed in year-bin order, oldest at the left end of the arc.
- **[RC-19] Overflow rule.** When the arc pitch would fall below seed size + 2 px (MEASURED from this geometry: about 10 seeds on the 44 px mobile pearl, about 15 on the desktop pearl), papers older than 3 years move to a second orbit at r = 0.50D, drawn as a dashed hairline. The `?n=4x` capture must show this.
- A shared seed gets a 1.5 px `--ink` ring at r + 2 px on *both* pearls.
- Geometry: the current cluster layout (`figure_mode: cluster`, D-02a) is kept.
- Mobile list mode: 44 px pearl, orbit, seeds; name and counts at the right; rows separated by hairline.
- Direction-page rail pearl: 160 px with the same rules. It is the morph target.

**Motion parameters** (all inside the motion gate; nothing loops; **no Pause button**):

| Moment | Spec |
|---|---|
| Intro (once per session) | Pearls `translateY(−12px → 0)` on the settle curve `linear(0, 0.180, 0.455, 0.671, 0.812, 0.896, 0.944, 0.971, 0.985, 0.992, 0.996, 0.998, 0.999, 1)` (critically damped, no overshoot), 600 ms, 60 ms stagger. **Opacity is 1 from frame 0** (no grey ghost). Seeds `scale(0 → 1)` from the pearl centre, 320 ms `cubic-bezier(.2,.8,.2,1)`, delay 300 ms + k·30 ms. Last frame at about 1.1 s |
| Pearl hover/focus | 80 ms intent. The active pearl's seeds move to r × 1.10 over 240 ms ease-out. The other groups' **seeds** go to opacity .45; their **pearls stay at 1** (no "disabled grey"). Caption out 100 ms, then in 180 ms after 60 ms, `translateY(4px → 0)` |
| Seed hover (**[RC-18]** pointer only; the arrow-key / roving `tabindex` model is removed) | A 1 px ink line between twin seeds draws via `stroke-dashoffset`, 240 ms. Keyboard users get the same information from the pearl's caption ("Shares papers with …") and the list |
| Text ↔ figure | Hovering or focusing a direction name in the statement triggers the pearl-hover state |
| Morph | Clicking a pearl scrolls to the direction mock. A FLIP animation of a clone pearl into the 160 px rail pearl, 420 ms `cubic-bezier(.2,0,0,1)`, landing on the settle curve. Seeds re-spread 320 ms after landing |
| Reduced | No transforms. Caption swap is instant. The morph is replaced by a 120 ms crossfade |
| Optional comparison flag | `?float=1` adds D-02's idle float (±2.5 px, 7.4/9.6/8.3/10.8 s) **with** the Pause control, so the owner can compare with and without (D-02 conflict, §6) |

**Mobile (390):**
- Header: wordmark row plus nav row, 44 px nav targets.
- Statement in `--t-display` (resolves to 40 px), then the four-name legend.
- Fig. 1 in list mode starts within the first 844 px.
- Rail labels become an inline `--t-meta` 600 label above their section. Year numerals become inline 2rem STIX 500 before their group.
- On publications, the filters collapse into one "Filter" disclosure button (text, underlined, `aria-expanded`). **The first publication title must sit at y ≤ 600** (AUDIT L7).

**Forbidden moves (P1):**
- any warm surface (cream test); any rounded or bordered box; any pill; any filled button;
- mono outside DOI, BibTeX and the pearl index;
- uppercase tracked labels; "01–04" anywhere, inside Fig. 1 included **[RC-7]**;
- halos, gloss or gradients on pearls;
- an italic serif *display* headline (italics only for venues and the question dek);
- **broadsheet cosplay:** no column rules, drop caps, uppercase datelines, ornaments, blackletter or "Vol./No." mastheads;
- **notebook cosplay:** no lined or grid paper backgrounds, tape, paper clips, handwriting fonts, or "sketchy" SVG filters;
- the pea accent as a fill or background anywhere (it is a link colour only);
- more than one "→" per viewport;
- the "h2 + All X →" bar;
- Fraunces, Inter, Plex;
- **[RC-3]** a statement above 3.25rem;
- **[RC-7]** any numeral inside a pearl;
- **[RC-9]** a circular avatar grid;
- **[RC-10]** blue link text, or a visited-colour swap.

---

### 5.2 P2 "Settle" (concept C, with guardrails, plus B's ledgers)

**Pages / sections** as in §5.0, with these specifics:
- **Home:**
  - header with the W3 lockup (∴ + BOBALAB);
  - display statement (**[RC-3]** ≤ 2.25rem);
  - ~~Fig. 1 "the lab mark, taken apart"~~ **[RC-13] Fig. 1 "settled piles"** (spec below);
  - 3 recent publications as ledger rows.
- **Direction:**
  - glyph header (240 px glyph resting on the rule; this is P2's one extreme);
  - ~~three large numerals~~ **[RC-6]** one sentence in `--t-title`: "4 papers, 1 in progress, 4 projects." (derived);
  - the "Why it matters" summary in Literata;
  - project and paper ledgers.
- **Publications**, **Projects** and **People** use the components below.
- **Footer:** the W1 lab mark (stack + name) at 2× size, resting on the footer's top rule.

**Fonts** (90.5 KiB):

| Role | Package → file | KiB |
|---|---|---|
| Voice: wordmark, h1–h3, statement, nav, list titles, numerals, labels, DOIs | `@fontsource-variable/familjen-grotesk` → `familjen-grotesk-latin-wght-normal.woff2` (400–700) | 18.5 |
| Reading: prose, authors, summaries, question | `@fontsource-variable/literata` → `literata-latin-wght-normal.woff2` (200–900) | 51.3 |
| Venues, question dek | `@fontsource/literata` → `literata-latin-400-italic.woff2` | 20.7 |

No mono at all. The BibTeX block is set in Familjen 400 at 0.875rem with `white-space: pre-wrap` and tabular figures.

**Colour tokens** (IDENTITY-RESEARCH P3; ratios re-verified with `direction_contrast.py`):

| Token | Light | Key ratios | Dark | Key ratios |
|---|---|---|---|---|
| `--paper` | `#FFFFFF` | — | `#121110` | — |
| `--alt` (BibTeX block only; **never under a glyph**) | `#F8F8F6` | — | `#1B1A18` | — |
| `--ink` (text, links underlined, focus ring, ∴ mark) | `#15130F` | 18.55 on paper, 17.45 on alt | `#EEEBE6` | 15.86 / 14.63 |
| `--muted` | `#57534D` | 7.64 / 7.18 | `#B3AEA6` | 8.55 / 7.89 |
| `--rule` (controls) | `#8A857D` | 3.66 / 3.45 | `#7E786F` | 4.31 / 3.98 |
| `--hairline` (decorative) | `#DCD9D3` | 1.41 | `#34312D` | 1.46 |
| `--spot-pea` (graphic only) | `#4B8EFE` | 3.18 on paper (≥ 3, graphic); ink on spot 5.83 | same hex | 5.93 on night; night on spot 5.93 |
| `--spot-lychee` | `#EC6094` | 3.15; ink on spot 5.89 | same | 5.99 / 5.99 |
| `--spot-matcha` | `#249163` | 3.96; ink on spot 4.69 | same | 4.77 / 4.77 |
| `--spot-oolong` | `#C06C08` | 3.90; ink on spot 4.76 | same | 4.84 / 4.84 |

Minimum CVD ΔE across the four spots: 8.41 (MEASURED).

**Spot rules:**
- Spots are **never text** and never sit on `--alt`. Pea and lychee drop to 2.99 / 2.96 there.
- **Spot area is at most 10% of any 1440×900 or 390×844 viewport.** The judge measures it with a pixel count over the screenshot. The direction-header glyph is the only exception and may reach 15%.

**Type scale** (6 sizes):

| Token | Size / line-height | Face | Use |
|---|---|---|---|
| `--t-meta` | 0.875rem / 1.45 | Familjen 500 (tabular by default) | metadata, tags, nav (1rem 500), filters |
| `--t-body` | 1.0625rem / 1.65, measure 66ch | Literata 400 | prose, authors (muted), summaries, venue (italic) |
| `--t-title` | 1.25rem / 1.3, −0.01em | Familjen 600 | list titles, h3, person names |
| `--t-head` | **[RC-3]** clamp(1.75rem, 1.3rem + 1.4vw, 2.25rem) / 1.1, −0.01em | Familjen 600 | h1/h2 (no direction numerals, **[RC-6]**) |
| `--t-display` | **[RC-3]** = `--t-head` at Familjen 700 (was up to 7.5rem at −0.035em: the "oversized hero" and "crushed tracking" tells) | Familjen 700 | home statement |
| `--t-question` | 1.5rem / 1.35 | Literata 400 italic | direction question dek, home "featured" line |

Familjen tops out at 700, so emphasis comes from size and tracking, never from 800–900. **[RC-3]** In P2, scale belongs to the **mark**: the 240 px direction glyph and the Fig. 1 piles. Type stays at or below 2.25rem.

**Grid:**
- Lattice unit u = 8 px; all vertical spacing is a multiple of u.
- Container max 80rem. 6 columns at ≥ 64rem (gap 32 px), 2 at 40–64rem, 1 below. Gutters 16/24/32.
- **Composition signature: everything rests.** Headings sit 8 px above a 1 px ink rule. Glyph floors sit on a rule (2 px ink for Fig. 1 and headers). Nothing floats mid-field.
- Asymmetric splits: statement cols 1–4 with the figure cols 1–6 below it, or 2/4 on direction headers.
- No radius anywhere except discs.

**Key components:**
- **W3 header lockup.**
  - The mark: ∴ at cap height, three discs with r = 3.25 on the 16-grid at (4.25, 11.75), (11.75, 11.75), (8, 5.25), scaled, in `--ink`.
  - Gap 0.4 cap height, then "BOBALAB" in Familjen 700, −0.02em, 1.375rem.
  - Descriptor below at `--t-meta`.
  - Delivered as inline SVG + text.
  - **[RC-2]** ∴ is allowed **only inside this lockup**, beside the wordmark. As a standalone 16 px favicon it fails the lineup test (MEASURED: near-identical to the generic three-circle "group" icon). `marks.html` must offer at least 3 favicon candidates and run the lineup test on them.
- **W1 lab mark:** `0/10/111/1111` (8 pearls), floor resting on the type baseline, mark height 1.5 × cap height. Footer only.
- **Glyph tag:**
  - An 18 px-wide glyph (pitch 4.5 px, d = 0.80u below 47 px) in the direction spot, then the label in `--t-meta` ink.
  - Several tags sit inline with 12 px gaps.
  - The glyph is `aria-hidden`; the label is the text.
- **Settle glyph generator:** implement IDENTITY-RESEARCH §3.2 `settleGlyph(code, …)` exactly:
  - R = 4;
  - centres `cx = i + r/2 + 0.5`, `cy = H − 0.5 − r·√3/2`, H = 3.5981;
  - d = 0.84u (0.86u at ≥ 48 px);
  - throw on unsettled pearls.
- **Direction header:**
  - The glyph `0/10/110/1110` (Learning on the Job) at u = 60 px (240 px wide) in `--spot-matcha`, resting on the header's bottom 2 px ink rule, cols 4–6.
  - The h1 in `--t-head` and the question in `--t-question`, cols 1–4.
  - ~~Below, three numerals~~ **[RC-6]** Below, one derived sentence in `--t-title`: "4 papers, 1 in progress, 4 projects."
  - **[RC-12] OG card template** (if shown on the paper mock): paper-white ground, the direction glyph resting on the bottom margin, the title in Familjen 600, and the kicker "New working paper, AI at Work" in Familjen 500. No mono, no "02", no interpunct, no dark ground.
- **Ledger row (publications):**
  - Columns: [year 6rem, `--t-title` tabular, once per group | main | tags 14rem].
  - Main: title (`--t-title`, link), authors (`--t-body` muted; **[RC-8]** lab members in Literata 600, with no disc), venue in Literata italic plus status roman, **[RC-17]** the `in_brief` line, then a links line "PDF  SSRN  DOI" (`--t-meta`, underlined, 24 px targets).
  - Tags column: the type word ("Working paper"), then glyph tags.
- **Filters:** text toggles. Pressed = ink + 2 px ink underline. Unpressed = muted + 1 px `--rule` underline. Direction filters carry their 18 px glyph. Each is a `<button aria-pressed>`, min height 44 px.
- **Project row:** glyph tags | title + Literata summary | "2 papers, 3 people" | "Completed" only when true. No-summary projects are one line.
- **People:**
  - A square photo grid (radius 0) of 120 px desktop / 96 px mobile, 6 / 3 per row, 16 px gaps, with name (`--t-title` at 1rem) and role (`--t-meta` muted) beneath.
  - The PI first and larger (2 × 2 cells), with a placeholder square in `--alt` holding "PS" in Familjen 700 2rem. **[RC-2]** The ∴ is removed from the placeholder: it appears only in the header lockup.
  - Glyph tags under names only for people on project teams.
- **Optional section divider:** a single lattice row of 7 pearls, d = 6 px, ink at 100%, resting on the next section's rule. At most one per page.

**[RC-13] Fig. 1 "settled piles"** (replaces "the lab mark, taken apart").

Why it changed (MEASURED from the glyph codes): the glyphs have 4 / 6 / 6 / 4 pearls (AA / AI / LOJ / PW), while the papers number 4 / 4 / 4 / 6. Glyph discs drawn directly above a tally of paper discs will be counted as papers, which breaks keep-list #1. In this figure **every pearl is a paper**.

- **Plate:** cols 1–6, height at most 380 px at 1366. A common floor: a 2 px ink rule across the plate. Four piles in `direction_order`.
- **Piles:**
  - Each pile is built on the Settle lattice with **floor width w = 6 for every direction** (one scale, so piles are comparable), pitch u = 22 px, d = 0.84u.
  - Papers drop in year-bin order (RC-15) into the lowest settled slot, leftmost first (IDENTITY-RESEARCH §3.6 rule).
  - Filled discs in the direction's spot ink are papers with a public version.
  - **Work in progress** is drawn as open rings (1.5 px spot stroke) *above* the pile, not resting: "not yet settled". It is the only floating element in P2, and it floats because it is unsettled.
  - Each pile's `<li>` holds the link to its direction.
- **Under the floor**, per direction:
  - a 24 px direction glyph tag plus the name in `--t-title`;
  - the count in words, "4 papers, 2 in progress" (`--t-meta` muted).
- **The direction glyph appears only as that label tag** in the figure. Its pearls are never shown at the size of data pearls next to data.
- **Caption** (`--t-meta`, under the plate): "**Figure 1.** Papers in each research direction, settled in order of year: each filled pearl is a paper with a public version; open rings above are work in progress. As of 24 October 2026."
- **Live caption** on hover/focus of a direction: its name and its question. Hovering a pearl (pointer only, RC-18) names the paper.
- **[RC-19] Overflow:** when any pile exceeds 21 (the w = 6 triangle), w becomes 8 for **all** piles at once.
- **Mobile:** a 2×2 grid; pitch u = 14 px; the floor rule per row.

**Pearl rules (P2):**
- Settle grammar only.
- Flat single-colour discs: `currentColor`, a spot, or reversed paper.
- **No gradient, sheen, rim, stroke, shadow or rotation.** Glyphs are never mirrored and never float.
- Below 24 px, only ∴ or a direction glyph beside its label.
- The pearl-O letter substitution is retired.
- Logos never change with counts. Only tallies change.

**Motion parameters:**

| Moment | Spec |
|---|---|
| Intro (once per session): **[RC-13]** "settling" | Pearls drop in year order into their piles: each disc `translateY(−16px → 0)` on the settle curve (§5.1), 280 ms, 25 ms stagger across all piles in year order, so the lab's output visibly accumulates over time. WIP rings fade to their floating positions last (opacity 0 → 1 within 120 ms, no translate). Last frame at about 1.3 s |
| Pile hover/focus | Other piles → opacity .35. The active pile and the label's 2 px underline **diffuse** in: `clip-path: circle(0 → 150% at left)` on the curve `linear(0, 0.316, 0.447, 0.548, 0.632, 0.707, 0.775, 0.837, 0.894, 0.949, 1)`, 400 ms |
| Tag hover anywhere | All tags of the same direction on the page diffuse a 2 px spot underline, 320 ms (belonging) |
| Filter change | Results **steep** to full opacity on `linear(0, 0.336, 0.561, 0.712, 0.813, 0.881, 0.926, 0.957, 0.977, 0.991, 1)`, 240 ms; no slide |
| Buoyancy | Only links and buttons: −2 px on hover/focus, +1 px on `:active`, 160 ms `cubic-bezier(.2,.8,.2,1)` |
| Morph | Fig. 1 label glyph tag (24 px) → 240 px header glyph, FLIP 420 ms, landing on the settle curve **[RC-13]** |
| Reduced | No transforms or clip animations; state changes are instant |

**Mobile (390):**
- The W3 lockup plus nav row.
- The statement at 3rem.
- Fig. 1 in a 2×2 grid within the first 844 px.
- On the direction header, the glyph at u = 30 px (120 px) floats right of the h1, still resting on the rule.
- Ledger tags drop under the main text.
- The people grid has 3 columns.

**Forbidden moves (P2):**
- **filled spot chips or buttons** (the exact failure seen in `b2-p3.png`), and ink-filled CTA buttons;
- spot text; spots on `--alt`; spot area over 10% of a viewport;
- any glyph without a text label at less than 48 px;
- rotated, mirrored, floating or animated-looping glyphs;
- ∴ as scattered decoration (once in the header, once per OG card);
- gradients, halos, sheens; rounded corners; pills;
- mono; tracked caps; "01–04" numbering;
- Space Grotesk-style geometric "tech" headings (Familjen at most 700, no all-caps headlines);
- emoji or boba illustrations (cups, straws);
- **[RC-13]** non-data pearls drawn at data-pearl size next to counts;
- **[RC-6]** hero-metric numerals;
- **[RC-3]** type above 2.25rem, or tracking below −0.015em;
- **[RC-2]** ∴ as a standalone favicon;
- **[RC-12]** dark-ground OG cards;
- publishing the glyph "Reading" mnemonics (they are post-hoc).

**[RC-1, Critique C.5] Optional variant `?ground=spot`.** The direction header (only) takes its spot ink as a full-bleed ground, with ink text: pea 5.83, lychee 5.89, matcha 4.69, oolong 4.76 (MEASURED above). This tests the one axis no prototype covers, since all are on white. The judge captures it beside the default. It is never default, and the 10% spot-area rule is waived only for this flag.

---

### 5.3 P3 "Lines" (concept D, plus A's relationships; **[RC-14]** renamed from "Service Lines")

**[RC-14] What changed and why.**
- The server/queue framing is dropped. In the sketch, served papers sit to the *left* of the "server" and the queue to its *right* while time runs left to right, so the jobs flow backwards through the server. An operations audience will catch that.
- Fig. 1 is now honestly **a timeline of papers by direction**, with a "now" rule and an in-progress zone. The pearl marks the direction at today.
- P3's operations notation moves to where it is true: the **study-design plates** (§5.0a). They are the centrepiece of the paper mock, and of the direction mock as a second plate (below). They are P3's extreme, together with density.

**Pages / sections** as in §5.0, with these specifics:
- **Home:**
  - header;
  - **[RC-3]** a one-line statement at ≤ 2.25rem (condensed wdth 68 is allowed at this size) plus a lede in Archivo text width. The two-column 5fr/7fr hero is dropped, so the figure leads;
  - **Fig. 1 lines**;
  - 3 recent publications as ledger rows.
- **Direction:**
  - h1;
  - the question in a light condensed size;
  - "Figure 2", the enlarged line with direct labels;
  - **[RC-17] "Figure 3"**: a study-design plate for *Learning to Gig* (Deng, Jiang, Qu & Sinchaisri 2025). It shows the platform offering jobs (pearls) to workers, with accept or decline, and experience accumulating per worker.
    - It is built **from the paper's model section**, not from the `in_brief` paraphrase, which is all this critique could verify (SSRN returned 403).
    - It carries the visible note "Draft schematic, pending author check".
  - project rows;
  - paper ledger.
- **Publications:** ledger with route indicators.
- **Projects:** projects table **[RC-14]** (was "jobs table").
- **People:** roster **[RC-14]** (was "crew roster"; the section title is "People").
- **Paper page [RC-17]:** the Bastani et al. plate in swimlane grammar: 3 worker lanes (chef, sous-chef, server), and one order's chop → cook → plate precedence drawn as linked pearls *without* a schedule. "Optimal: 20 ticks (full staff) / 34 ticks (understaffed)" appears as labelled design parameters, then the Phase I → II flow with its 4 arms.

**Sketch reference:** `…/scratchpad/redesign/sketch-d/d2-1440.png`. The coder should match its composition, **except** for the changes marked [RC-14], [RC-15] and [RC-3] (no server or queue labels, year bins, no 104 px hero). Fix the caption wording (solid links, not dotted).

**Fonts** (**[RC-21]** 88.0 KiB: the italic is dropped so that the judged prototype is shippable within the 100 KiB budget):

| Role | Package → file | KiB |
|---|---|---|
| Everything (text wdth 100; condensed display wdth 68 at wght 700; wordmark wdth 112 at wght 800) | `@fontsource-variable/archivo` → `archivo-latin-wdth-normal.woff2` (wdth 62–125 × wght 100–900; MEASURED to render both axes) | 88.0 |
| ~~Venues, question dek~~ **[RC-21] dropped.** Venues are upright `--muted`; the question dek is wdth 87 / wght 400 upright | ~~`archivo-latin-400-italic.woff2`~~ | ~~15.4~~ |

`@font-face` must declare `font-stretch: 62% 125%` and `font-weight: 100 900`. Use `font-variant-numeric: tabular-nums` on years and counts.

**Colour tokens** (MEASURED):

| Token | Light | Ratio on `--paper` / `--band` | Dark | Ratio on `--paper` / `--band` |
|---|---|---|---|---|
| `--paper` | `#FFFFFF` | — | `#101210` | — |
| `--band` (in-progress zone **[RC-14]**, active-row highlight; neutral, chroma 0.0028) | `#F2F3F1` | — | `#181B18` | — |
| `--ink` (text, rules, direction pearls **[RC-14]**, links underlined, focus) | `#111410` | 18.56 / 16.68 | `#E7EAE5` | 15.50 / 14.31 |
| `--muted` | `#50564F` | 7.54 / 6.77 | `#A6ACA4` | 8.12 / 7.49 |
| `--rule` (controls) | `#80877F` | 3.69 / 3.32 | `#7A8178` | 4.69 / 4.33 |
| `--hairline` (year ticks, row dividers; decorative) | `#D9DCD6` | 1.39 | `#2B302B` | 1.40 |
| `--line-pea` (Algorithmic Advice) | `#2B4FA8` | 7.54 / 6.77 | `#8EA4F7` | 7.89 / 7.28 |
| `--line-lychee` (AI at Work) | `#A12C5A` | 6.95 / 6.24 | `#F590AE` | 8.50 / 7.84 |
| `--line-matcha` (Learning on the Job) | `#4C7A1E` | 5.11 / 4.59 | `#A8DA84` | 11.67 / 10.78 |
| `--line-oolong` (Platform Work) | `#6B4500` | 8.48 / 7.62 | `#C4943A` | 6.85 / 6.32 |

**Notes on the tokens:**
- Line colours may be used as text (all ≥ 4.5 on both surfaces), but they are used only for direction names in the lane labels' hover state and in the route indicator.
- The direction pearl **[RC-14]** is `--ink`: 18.56 on paper in light mode, 15.50 in dark.

**Type scale** (6 sizes):

| Token | Size / line-height | Archivo settings | Use |
|---|---|---|---|
| `--t-meta` | 0.875rem / 1.45 | wdth 100, wght 400 (500 for labels), tabular | metadata, year ticks, route text, nav (1rem 500) |
| `--t-body` | 1.0625rem / 1.6, measure 68ch | wdth 100, wght 400 | prose, authors (muted), summaries, venue (italic file) |
| `--t-title` | 1.25rem / 1.3 | wdth 100, wght 600 | list titles, h3, names |
| `--t-lane` | 2rem / 1.0 | wdth 68, wght 700 | Fig. 1 lane labels, ledger year numerals (2.5rem allowed for years) |
| `--t-head` | clamp(2.5rem, 1.6rem + 3.2vw, 4.25rem) / 0.98, −0.01em | wdth 68, wght 700 | h1/h2. The direction question uses `--t-lane` at wdth 87, wght 400 |
| `--t-display` | **[RC-3]** 2.25rem / 1.05, 0 (was up to 6.5rem at 0.92 leading: the "heavy condensed display hero") | wdth 68, wght 700 | home statement (one line at ≥ 64rem) |

Condensed widths (wdth < 90) are used **only at ≥ 2rem**.

**Grid:**
- Container max 84rem (the figure needs width; JUDGE layout note). Gutters 16/24/32.
- **Timetable grid:** label column `18rem` + track `1fr`.
- Every table (Fig. 1, ledgers, roster) opens and closes with a **2 px `--ink` rule**. Rows use 1 px `--hairline`.
- ~~The home hero is a two-column 5fr / 7fr~~ **[RC-3]** The home hero is one column: the statement line, then the lede (max 68ch). The figure is the largest object on the page.
- **[RC-4]** 2 px rules only at the open and close of tables. At most 2 visible per viewport; in-between sections are separated by space.
- Ledger columns: [year 7.5rem | main 1fr | route 4.5rem | meta 17.5rem]. At 64rem or less: [year 4rem | main] with route + meta below the main text.

**Key components:**
- **Wordmark:** "BOBALAB" in Archivo wdth 112, wght 800, −0.01em, 1.375rem. Beneath it on the home page only, the descriptor in `--t-meta`. Header bottom: 2 px ink rule.
- **Home hero:**
  - Display line "How people learn to work with algorithms" in `--t-display` (**[RC-3]** at 2.25rem, one line).
  - Lede in `--t-body` at 1.1875rem: "Berkeley Operations and Behavioral Analytics Lab, Haas School of Business, UC Berkeley. We study how people learn, decide and work alongside algorithms and AI, with field data from gig platforms and controlled experiments."
  - The display wording must be confirmed by the PI. It paraphrases the existing mission.
- **Route indicator:** a 24×24 px SVG with 4 horizontal 1 px `--hairline` lines at y = 3, 9, 15, 21 (the lane order). Filled 6 px dots in the line colour on each lane the paper belongs to, joined by a 1 px ink vertical. `aria-hidden`; the meta column says the names in text.
- **Ledger row:**
  - year numeral (`--t-lane`, once per group);
  - main: title `--t-title` link; authors `--t-body` muted (**[RC-8]** lab members in weight 600, no disc); venue upright muted (**[RC-21]**) plus status; **[RC-17]** the `in_brief` line;
  - route indicator;
  - meta: the type word, direction names, and links "PDF  SSRN  DOI" (24 px targets).
- **Project row** (**[RC-14]** was "Jobs row"):
  - title + summary | route | "2 papers" | "3 people" | "Completed" only when true;
  - right-aligned tabular numbers;
  - no-summary projects are one line.
- **Roster (people)** (**[RC-14]** was "Crew roster"):
  - Groups "Principal investigator", "Graduate researchers", "Undergraduate researchers", "Alumni", each opening with an h3 over a 1 px hairline (**[RC-4]**: only the roster as a whole opens and closes with a 2 px rule).
  - PI row: an 88 px ink disc with "PS" in wdth 100 / 700, 1.75rem, paper colour. ~~(it is the "server")~~ **[RC-14]** The disc is a photo placeholder only; it is replaced by the consented photo. Name in `--t-head`, title in `--t-body`.
  - Graduate rows: a 56 px photo or initials disc | name | role · program | a 4-cell **line matrix** (16 px cells, filled 8 px dot in the line colour where the person's projects run, otherwise an empty 1 px `--hairline` ring). Matrix header: the direction short labels in `--t-meta` 500.
  - Undergraduates: a tight grid of 64 px photo discs, 6 per row desktop / 4 mobile, name beneath in `--t-meta`. **No matrix**: they have no project-team data, and empty matrices would recreate the "empty card" tell.
  - Alumni: name … year, flush right, tabular.
- **Filters:** a column-header row; text toggles with `aria-pressed`. Pressed = ink + 3 px ink underline; unpressed = muted + 1 px `--rule` underline. Direction toggles are prefixed by a 16 px line segment in the line colour. Min height 44 px.

**Fig. 1 "service lines" (exact):**
- **Structure:**
  - `<figure>` containing `<ol class="lines">` (one `<li>` per direction, with the lane label as the link to the direction and counts in text), plus an `aria-hidden` SVG overlay drawn from the JSON.
  - ~~Paper dots are separate focusable `<a>` elements~~ **[RC-18]** On the home figure, paper dots are `aria-hidden` and pointer-only. Lane labels are the links. The ledger below carries every paper as a link.
- **Lane order: the chain order AI at Work → Algorithmic Advice → Learning on the Job → Platform Work.** With it, every link joins adjacent lanes (MEASURED from the data).
  - **[RC-14]** The low-crossing order is a **validator suggestion** (a warning listing the suggested order). `content/site.yml` → `direction_order` stays authoritative, so a CMS edit never silently reorders the home page.
  - The prototype hard-codes the chain order with a caption note. This replaces §6 item 4 option (a).
- **Columns:**
  - one per public paper, in **[RC-15] year bins**: a 16 px gap between bins, and the year label spanning its bin (`--t-meta` 600, tabular, with a 1 px hairline bracket);
  - within a bin, order by `date_online`, otherwise by slug, and the caption notes when the order is not meaningful;
  - column width `clamp(28px, 3.4cqi, 48px)`; track starts at x = 18rem;
  - no full-height year gridlines (they read as a dashboard grid).
  - **[RC-19] Overflow:** when the columns would drop below 28 px (computed: about 31 papers at 1366), papers inside each year bin pack at a 16 px pitch and shared links switch to twin rings (RC-16).
- **Lanes:**
  - height 86 px (desktop), 2 px ink rule above the first and below the last, 1 px `--hairline` between;
  - lane line: 1 px in the line colour from the first column to the now line;
  - label: short label in `--t-lane`, then "4 papers, 2 in progress" in `--t-meta` muted below it. No interpunct.
- **Paper dots:** 14 px filled line colour, with a 24×24 px hit area. A shared paper sits in the same column on both lanes, joined by a 1 px solid `--ink` vertical.
  - **[RC-16] Variant `?links=rings`:** no vertical connector. A shared paper gets a 1.5 px ink ring on both lanes.
  - The judge captures both variants beside a git-graph reference (the reference lives in scratchpad `refs/` only) and records which one reads as "developer tool".
- **Now line:** 1.5 px `--ink`, dashed 4/4, at the last column + 20 px. Label "now" above it, plus "in progress" over the in-progress zone (`--t-meta` muted). The zone is a `--band` rectangle from the now line to the plate's right edge.
- ~~Server pearl~~ **[RC-14] Direction pearl at now:** a flat `--ink` disc, D = 34 px, centred on the now line in each lane. It marks the direction today; it is not called a server anywhere. **No numeral inside** (MEASURED in `d-1440.png`: numerals made it read as a notification badge).
- ~~Queue~~ **In progress [RC-14]:** WIP items as 14 px open rings (1.75 px stroke, line colour), pitch 22 px, starting 40 px right of the now line. Pointer hover names them **[RC-18]**. Their order carries no meaning (alphabetical), and the caption says so, so it is not read as a publication schedule.
- **Caption** (under the plate, `--t-meta`, max 90ch) **[RC-14, RC-15]**: "**Figure 1.** Papers in the lab's four research directions, by year. Each filled dot is a paper with a public version; a vertical link joins a paper that belongs to two directions, and the directions are ordered so that these links join neighbours. Open rings after the 'now' line are work in progress, in no particular order. As of 24 October 2026."
- **Fit:** the plate is at most 430 px tall at 1366 wide, so the header + hero + plate fit in 768 px. **[RC-3]** With the one-line 2.25rem statement this has about 120 px to spare.

**Figure 2 (direction page, Learning on the Job):**
- The single lane across the full container: dots 18 px, the direction pearl 96 px (the morph target; **[RC-14]** not "server").
- Each dot is labelled with its paper's short title (`--t-meta`, max 26ch), alternating above and below, with a 1 px leader to the dot. **[RC-18]** Each label is an ordinary `<a>` in tab order.
- Shared papers show a 120 px stub of the other line (1 px in its colour) going up or down from the dot, ending in that direction's short label as a link ("Platform Work").
- In progress **[RC-14]**: the "Learning Across Jobs" ring with its label.
- Caption "**Figure 2.** Learning on the Job, paper by paper."

**Motion parameters:**

| Moment | Spec |
|---|---|
| Intro (once per session), "year by year" **[RC-14]** | Now line `scaleY(0 → 1)` from the top, 360 ms `cubic-bezier(.2,.8,.2,1)`. Year bins appear left to right: each bin's dots `scale(.6 → 1)` + opacity 0 → 1 over 200 ms, 30 ms stagger per column. Each shared link draws (`stroke-dashoffset`) for 160 ms after its column. Direction pearls `translateY(−6px → 0)` on the settle curve for 400 ms, **opacity 1 from frame 0**. In-progress rings fade in (opacity only, 200 ms, no slide: they are not "arriving in a queue"). Last frame at about 1.2 s |
| Lane hover/focus | Other lanes' lines and dots → opacity .3, **except** dots of papers shared with the active lane and their links, which stay at 1. That is how the motion reveals relationships. 200 ms ease-out. The caption line above the plate swaps to the direction's question (out 100 / in 180 ms) |
| Dot hover (**[RC-18]** pointer only; the arrow-key model is removed) | Dot `scale(1.25)`, 160 ms. Its twin and its link highlight. Caption: "Title. Working paper, 2025. Also in Platform Work." plus the first sentence of `in_brief` **[RC-17]** |
| Morph | Direction pearl (34 px) → direction hero pearl (96 px), FLIP 420 ms `cubic-bezier(.2,0,0,1)`. After landing, the Figure 2 labels fade in, 30 ms stagger |
| Plate step-through **[RC-17]** | Optional, reader-triggered `<button>` (§5.0a). It runs finite steps with no autoplay, and reduced motion shows all steps |
| Reduced | Everything static. Hover dimming applies instantly (opacity only) |

**Mobile (390):**
- Header: wordmark row, then nav row.
- Display line at 2rem (**[RC-3]**, at most 2 lines), then the lede.
- Fig. 1 **transposes**: four stacked blocks separated by 1 px hairlines, inside 2 px ink rules top and bottom. Each block has:
  - the lane label in `--t-lane`;
  - a counts line;
  - a strip with a 1 px line in the line colour; dots at 14 px with a fixed 22 px pitch, wrapping (no shared columns); a year label at each year change;
  - the direction pearl at the end of the strip (24 px), then the in-progress rings **[RC-14]**.
- Shared papers are announced as text under the strip ("Shares 3 papers with Platform Work"), not as links.
- The figure must start within 844 px.
- Ledgers stack: year inline (2rem), then main, then route + meta.

**Forbidden moves (P3):**
- **transit-map clichés:** no rounded line corners, diagonal 45° segments, station tick marks or white-filled "interchange" circles;
- **dashboard clichés:** no gridlines inside lanes, axis boxes, tooltip cards with borders or shadows, toolbars, zoom controls, or count-up numbers;
- numbers inside pearls; a linear time axis (it empties 2021–2024; MEASURED, `d-1440.png`); zebra lane fills (they read as a spreadsheet);
- any card or rounded box; pills; mono; tracked caps;
- condensed widths below 2rem; an all-caps display;
- a dark full-bleed "departures board" band (the "dark signal" tell);
- the pea or any other line colour as a background fill;
- more than one "→" per viewport;
- invented throughput metrics: only real counts, never "papers per year" rates or projections;
- **[RC-14]** queueing vocabulary or notation on the *lab's own output*. Servers, queues and jobs appear only in study-design plates where the paper's model has them;
- **[RC-3]** a hero above 2.25rem; a two-column hero;
- **[RC-15]** full-height year gridlines;
- **[RC-17]** any plate element that depicts a result, a schedule or a curve not stated in the paper.

---

### 5.4 [RC-1] P0 "Control" (new): the shared cleanup only, on the current kit

**Purpose.** This is the control arm. Without it, a judge cannot tell whether P1–P3 score better because of their concepts or because of the cleanup they all share. That cleanup removes causes 2, 3 and 6, which §1.1 hypothesises are about half of the AI read. P0 measures that half directly. If P0 closes most of the gap, the font and palette migration (§6 item 1, which touches tests) is not justified.

**Keep exactly as live:**
- tokens: Fraunces / Inter / Plex Mono, the cream `--paper`, the clay accent;
- spacing scale;
- header;
- the Fig. 1 cluster geometry and positions.

P0 is **exempt** from the font ban, the cream test and the mono probe in §5.0. It must pass every other AI-tell probe.

**Change:**
1. Remove all pills and badges. The type word ("Working paper") becomes plain `--fs-sm` text (AUDIT-SYSTEM §2).
2. Remove all bordered or rounded content boxes. Lists are ledgers with hairline rows, and projects without a summary are one line (AUDIT C4).
3. Remove the tracked-mono eyebrows, the "All X →" bars, "→" on links, and the "A · B · C" meta strings.
4. Apply the copy fixes: remove the pipeline caveats; one provenance footnote; no "Explore our research"; the direction "Why it matters" opens with the `summary` sentence.
5. **Flatten the pearls.** Remove the halo, bottom glow, sheen and dark-mode rim, and remove the numerals (RC-7). Dark mode keeps the pearl separate from the ground with a 1 px `--rule` outline instead of the glow.
6. Remove the idle float, parallax and stir, and with them the Pause button. Keep the intro without overshoot, plus the morph.
7. Lab members in weight 600 (RC-8). Show `in_brief` in ledgers (RC-17).
8. Remove the plate box and its crop marks: Fig. 1 sits on the page with its caption underneath.

**Do not add** anything new: no new mark, plate or layout. P0 includes the paper mock *without* a plate, so the plate's contribution can also be read off P1–P3 against P0.

**Effort:** S (CSS and copy over the current structure; mocks as in §5.0).

---

## 6. Decisions and risks to record before prototyping

> **[Critique]** Changes to this section:
> - **Item 2:** P3 is now judged at 88.0 KiB, without the italic (RC-21).
> - **Item 4:** replaced by RC-14. `direction_order` stays authoritative, and the validator suggests the low-crossing order.
> - **New item 9:** study-design plates need PI sign-off (`pi_verified`) before they appear on the live site (RC-17).
> - **New item 10:** if P0 performs within noise of the best concept in the blind test, adopt P0's cleanup first and defer the font and palette migration.

1. **Palette and fonts leave the brief §C.**
   - All three prototypes change hexes, which are pinned by `tests/unit/foundation/palette.test.ts` and the CMS preview test, and fonts, pinned by `misc.test.ts` and checked by `kit.spec.ts` against the ≤ 100 KiB budget.
   - Prototypes are standalone, so nothing breaks now. Adopting one means updating `palette.ts`, the brief's §C2/§C3 tables and `preview.css` together (AUDIT-SYSTEM R1–R2, R7).
2. **Font budget.** P1 is 88.8 KiB and P2 90.5 KiB, both inside the budget. **P3 is 103.4 KiB.** The owner either relaxes the budget to 105 KiB or accepts upright muted venues; dropping the italic gives 88.0 KiB.
3. **Motion (D-02 / D-02a).**
   - All prototypes drop the idle float, pointer parallax, the ±14° stir, halos and the overshoot. With no loops, no in-plate Pause button is needed (WCAG 2.2.2). The footer "Reduce motion" stays.
   - The owner's explicit "unique and animated" ask is answered with finite, explanatory motion: the intro story, relationship reveals, and the morph.
   - P1 carries a `?float=1` flag so the owner can compare.
   - Adopting any prototype needs a new DECISIONS entry that supersedes D-02 items 2–3.
4. **Lane order (P3).** The chain order is data-derived, while `direction_order` is editorial (D-04). Options:
   - (a) data order on the figure only;
   - (b) the editor's order everywhere, accepting crossing links.

   The prototype shows (a).
5. **New direction tones (P1, P3).** The proposed deep and light sets raise minimum CVD ΔE from about 3.3 to about 8.2 at the same hue families. Adopting them changes the brief §C3 values and the validator's confusable-pair table.
6. **The C mark is a unit-specific logo**, which campus guidance discourages. Haas MarCom approval is still required before posters (brief H-10; IDENTITY-RESEARCH §7.6).
7. **Content prerequisites, independent of the concept:**
   - PI sign-off on removing the pipeline caveats (AUDIT #2);
   - one consented PI photo (AUDIT I2);
   - a confirmed home display line.

   Prototypes use placeholders for the photo and a paraphrase for the display line.
8. **Judge method.** Re-run JUDGE.md-style captures and the §5.0 AI-tell probes, plus a five-second credibility test with 2–3 Haas faculty. One person's eye (mine) produced every judgement of "reads as" in this document.

---

## Appendix A: data snapshot for the prototypes (from `content/**`, 2026-10-24)

The fields are copied from the lab's own CMS content. Lab members are marked `*`. Prototype coders paste this as `#lab-data` and render from it.

```json
{
  "as_of": "2026-10-24",
  "directions": [
    {"slug":"ai-at-work","short":"AI at Work","title":"Generative & Agentic AI at Work","color":"lychee",
     "question":"What kinds of help do teachers ask ChatGPT for on their own real tasks, and do their conversations stick to one kind?"},
    {"slug":"algorithmic-advice","short":"Algorithmic Advice","title":"Algorithmic Advice & Human Decisions","color":"butterfly-pea",
     "question":"When should advice name the exact next move, and when should it give a broader rule people can carry into new situations?"},
    {"slug":"learning-on-the-job","short":"Learning on the Job","title":"Learning on the Job with Algorithms","color":"matcha",
     "question":"Do gig workers get faster and more reliable with experience, and do they lean on or drift away from the app's recommendations as they learn?",
     "summary":"How workers build skill alongside app recommendations, and how platforms can assign work so people improve instead of only covering today's demand."},
    {"slug":"platform-work","short":"Platform Work","title":"Gig & Platform Work Design","color":"oolong",
     "question":"What drives a ride-hail driver's choice to log on and log off: the pay rate, an earnings target, or the momentum of a long shift?"}
  ],
  "site_direction_order": ["algorithmic-advice","ai-at-work","learning-on-the-job","platform-work"],
  "papers": [
    {"slug":"sinchaisri-2021-penn-dissertation","year":2021,"type":"dissertation","dirs":["platform-work"],"short":"Managing the Gig Economy"},
    {"slug":"allon-2023-gig-drivers","year":2023,"type":"journal","dirs":["platform-work"],"short":"Drivers of Gig Economy Workers"},
    {"slug":"deng-2025-learning-to-gig","year":2025,"type":"working-paper","dirs":["learning-on-the-job","platform-work"],"short":"Learning to Gig"},
    {"slug":"jiang-2025-learning-on-the-go","year":2025,"type":"journal","dirs":["learning-on-the-job","platform-work"],"short":"Learning on the Go"},
    {"slug":"keppler-2025-making-chatgpt-work","year":2025,"type":"journal","dirs":["ai-at-work"],"short":"Making ChatGPT Work for Me"},
    {"slug":"lee-2025-non-adoption-algorithmic-advice","year":2025,"type":"working-paper","dirs":["algorithmic-advice"],"short":"Non-Adoption of Optimal Advice"},
    {"slug":"allon-2026-multihoming-workers","year":2026,"type":"working-paper","dirs":["platform-work"],"short":"Managing Multihoming Workers"},
    {"slug":"bastani-2026-rl-tips","year":2026,"type":"journal","dirs":["algorithmic-advice"],"short":"Improving Sequential Decisions with RL"},
    {"slug":"blaettchen-2026-precise-or-broad","year":2026,"type":"working-paper","dirs":["algorithmic-advice","learning-on-the-job"],"short":"Precise or Broad?"},
    {"slug":"deng-2026-dispatching-to-develop","year":2026,"type":"working-paper","dirs":["learning-on-the-job","platform-work"],"short":"Dispatching to Develop"},
    {"slug":"deng-2026-stale-misattributed-late","year":2026,"type":"working-paper","dirs":["ai-at-work"],"short":"Stale, Misattributed, or Late"},
    {"slug":"keppler-2026-teachers-knapsack","year":2026,"type":"working-paper","dirs":["ai-at-work"],"short":"The Teacher's Knapsack"},
    {"slug":"liu-2026-strategic-advice-personal-ai","year":2026,"type":"working-paper","dirs":["ai-at-work","algorithmic-advice"],"short":"Strategic Advice and Personal AI"}
  ],
  "in_progress": [
    {"slug":"deng-2026-act-ask-defer","dirs":["ai-at-work","algorithmic-advice"],"title":"Act, Ask, or Defer? Authority Design for Agentic AI Service Workflows"},
    {"slug":"snyder-2026-planning-vs-execution","dirs":["ai-at-work"],"title":"Planning vs. Execution: How AI Changes Task Portfolio Choice"},
    {"slug":"chen-2026-genai-pricing-simulation","dirs":["ai-at-work"],"title":"Mechanism-Guided Generative AI Simulation for Pricing Operations"},
    {"slug":"sinchaisri-2026-compliance-aware-rl","dirs":["algorithmic-advice"],"title":"Managing Human Agents with Compliance-Aware Reinforcement Learning"},
    {"slug":"sinchaisri-2026-learning-across-jobs","dirs":["learning-on-the-job"],"title":"Learning Across Jobs"},
    {"slug":"sinchaisri-2026-fruits-of-labor","dirs":["platform-work"],"title":"Fruits of Labor: Staffing Fluid Teams in a Fragmented Market"},
    {"slug":"sinchaisri-2026-sequencing-incentives","dirs":["platform-work"],"title":"Designing and Sequencing Incentives for Platform Workers"}
  ],
  "list_entries": [
    {"slug":"bastani-2026-rl-tips","title":"Improving Human Sequential Decision Making with Reinforcement Learning","authors":"Hamsa Bastani, Osbert Bastani, Wichinpong Park Sinchaisri*","venue":"Management Science","year":2026,"type":"Journal article","status":"Published","links":["PDF","arXiv","Publisher","DOI"],"awards":7},
    {"slug":"blaettchen-2026-precise-or-broad","title":"Precise or Broad? The Reward-Learning Frontier in Algorithmic Advice Design","authors":"Philippe Blaettchen, Wichinpong Park Sinchaisri*","venue":null,"year":2026,"type":"Working paper","status":"Major revision at Manufacturing & Service Operations Management","links":["PDF"]},
    {"slug":"liu-2026-strategic-advice-personal-ai","title":"Strategic Advice in the Age of Personal AI","authors":"Yueyang Liu, Wichinpong Park Sinchaisri*","venue":"arXiv preprint","year":2026,"type":"Working paper","status":"Preprint, v2","links":["arXiv","DOI"]},
    {"slug":"deng-2025-learning-to-gig","title":"Learning to Gig: Workforce Development under Worker Agency","authors":"Haonan Deng*, Shunan Jiang*, Xinpeng Qu, Wichinpong Park Sinchaisri*","venue":"SSRN working paper 5387320","year":2025,"type":"Working paper","status":"Major revision at Manufacturing & Service Operations Management","links":["SSRN","DOI"]},
    {"slug":"jiang-2025-learning-on-the-go","title":"Learning on the Go: Understanding How Gig Economy Workers Learn with Recommendation Algorithms","authors":"Shunan Jiang*, Wichinpong Park Sinchaisri*","venue":"Proceedings of the ACM on Human-Computer Interaction","year":2025,"type":"Journal article","status":"Published","links":["PDF","SSRN","Publisher","DOI"]},
    {"slug":"keppler-2025-making-chatgpt-work","title":"Making ChatGPT Work for Me","authors":"Samantha Keppler, Wichinpong Park Sinchaisri*, Clare Snyder","venue":"Proceedings of the ACM on Human-Computer Interaction","year":2025,"type":"Journal article","status":"Published","links":["PDF","SSRN","Publisher","DOI"]},
    {"slug":"allon-2023-gig-drivers","title":"The Impact of Behavioral and Economic Drivers on Gig Economy Workers","authors":"Gad Allon, Maxime C. Cohen, Wichinpong Park Sinchaisri*","venue":"Manufacturing & Service Operations Management","year":2023,"type":"Journal article","status":"Published","links":["PDF","SSRN","Publisher","DOI"],"awards":4},
    {"slug":"snyder-2026-planning-vs-execution","title":"Planning vs. Execution: How AI Changes Task Portfolio Choice","authors":"Clare Snyder, Samantha Keppler, Wichinpong Park Sinchaisri*","venue":"2026 INFORMS MSOM Conference (presentation)","year":2026,"type":"Work in progress","status":"In progress","links":[]}
  ],
  "projects": [
    {"slug":"learning-to-gig","title":"Dispatching for Worker Development","summary":"Algorithms for offering jobs to gig workers who can decline and who learn at different, unknown rates, so that platforms build skill as well as fill orders.","dirs":["learning-on-the-job","platform-work"],"status":"active","team":["haonan-william-deng","shunan-jiang","park-sinchaisri"],"papers":2},
    {"slug":"learning-on-the-go","title":"How Gig Workers Learn","summary":"Large-scale delivery data on how couriers improve with experience and how their reliance on app recommendations changes as they do.","dirs":["learning-on-the-job","platform-work"],"status":"completed","team":["shunan-jiang","park-sinchaisri"],"papers":1},
    {"slug":"gig-driver-behavior","title":"Ride-Hail Driver Behavior & Pay Design","summary":"What drives ride-hail drivers' work decisions, and which pay and bonus designs work when drivers can switch between competing apps.","dirs":["platform-work"],"status":"active","team":["park-sinchaisri"],"papers":3},
    {"slug":"learning-across-jobs","title":"Learning Across Jobs","summary":null,"dirs":["learning-on-the-job"],"status":"active","team":["ryan-jesubalan","park-sinchaisri"],"papers":1}
  ],
  "people": {
    "pi": {"slug":"park-sinchaisri","name":"Park Sinchaisri","title":"Assistant Professor of Operations and Information Technology Management","photo":false,"initials":"PS"},
    "graduate": [
      {"slug":"shunan-jiang","name":"Shunan Jiang","role":"PhD student","program":"IEOR","photo":false,"dirs":["learning-on-the-job","platform-work"]},
      {"slug":"haonan-william-deng","name":"William Deng","role":"Master's student","program":"IEOR","photo":false,"dirs":["learning-on-the-job","platform-work"]}
    ],
    "undergraduate": [
      {"slug":"ryan-jesubalan","name":"Ryan Jesubalan","program":"Applied Math/DS","photo":true},
      {"slug":"clinton-nguyen","name":"Clinton Nguyen","program":"Statistics","photo":true},
      {"slug":"alex-chen","name":"Alex Hanyu Chen","photo":true},
      {"slug":"andrew-li","name":"Andrew Li","photo":true},
      {"slug":"brian-hwang","name":"Brian Seong Hyun Hwang","photo":true},
      {"slug":"chloe-xiao","name":"Chloe Xiao","photo":true},
      {"slug":"felicia-ye","name":"Felicia Ye","photo":true}
    ],
    "alumni": [{"name":"Austin Zhu","end":"2025"},{"name":"Brandon Chin","end":"2025"},{"name":"Chelsea Kawamura","end":"2025"}]
  }
}
```

The short titles are abbreviations for figure labels only; lists always use the full title. Shunan Jiang and William Deng have no consented photo, so they get each concept's initials placeholder.

## Appendix B: reproducibility

All of these files are in the session scratchpad, not in the repo: `C:/Users/jiami/AppData/Local/Temp/claude/C--Users-jiami-OneDrive-Desktop-Claude/25396689-b301-43ec-ba70-d96c5414cf98/scratchpad/redesign/`.

| File | What it does |
|---|---|
| `tools/direction_contrast.py` | WCAG 2.x contrast, OKLab ΔE and OKLCH for all four concept palettes, plus Machado 2009 CVD minimum ΔE |
| `tools/deep_search.py`, `tools/tone_search2.py`, `tools/tone_eval.py` | Constrained random search and hand evaluation of the new deep and light direction tones (constraints: ≥ 5:1 on white and ≥ 4.5:1 on the alt surfaces, or ≥ 7:1 on night) |
| `tools/shot-sketch.js` | Playwright screenshot helper (args: file, out, width, height, scheme) |
| `sketch-d/d.html` → `d-1440.png`, `d-390.png` | First concept D sketch (linear axis, rejected) |
| `sketch-d/d2.html` → `d2-1440.png` | Revised sketch (ordinal columns, accepted) |

**Sources:** as cited inline, and in AUDIT.md §7, AUDIT-SYSTEM.md, IDENTITY-RESEARCH.md (Sources), REFS-LABS.md §5 and REFS-EDITORIAL.md §7.

---

## Critique

**Independent review, 2026-10-24.** The reviewer took two roles: an identity creative director, and a Haas operations faculty member who would be one of the people taking the five-second test. Everything above was read in full, along with AUDIT.md, AUDIT-SYSTEM.md, IDENTITY-RESEARCH.md §0–§3, DECISIONS.md, JUDGE.md and brief §C.

**Screenshots I looked at:**
- `before/home-fold-1440-light.jpg`;
- `…/scratchpad/redesign/sketch-d/d2-1440.png`;
- `…/scratchpad/redesign/board/b2-p3.png` and `b2-top.png`;
- a new **mark lineup test** made for this critique: `…/scratchpad/redesign/critique/lineup.html` → `lineup.png`. It renders each prototype's mark next to six generic UI icons at 16 px, at 32 px, reversed, and blurred.

**Sources fetched for this critique:**
- impeccable.style/slop;
- capitalandcompute.net/blog/fix-ai-slop-design/;
- mintlify.wiki/pbakaus/impeccable/concepts/anti-patterns;
- madegooddesigns.com/?p=3200 ("Font Trends 2026", a commercial blog, so opinion);
- the arXiv HTML of Bastani, Bastani & Sinchaisri (https://arxiv.org/html/2108.08454v5).

Labels are as above.

**Changes made to §5 because of this critique** are marked **[RC-n]** inline. RC-n means "required change n", listed in C.6.

### C.0 Verdict

The diagnosis in §1 is right, and the cheap fixes (causes 2, 3 and 6) are right. The three prototypes then make three errors.

1. **They swap one set of defaults for the next set.** Each type system matches a 2026 trend-list entry (HYPOTHESIS that this reads as "chosen by a tool"; the trend entries are DOCUMENTED below):
   - STIX at 80 px is the "bold serif, oversized hero" entry;
   - Archivo condensed 700 is "heavy industrial display";
   - Familjen at 120 px with −0.035em is "crushed tracking" plus "oversized hero headline".

   All three also share the same "white page, ink, zero radius, 2 px rules, year rail" skeleton. That skeleton is the documented **broadsheet cosplay** cluster: hairline rules, zero border radius and dense columns are the *next* default after a tool is told to avoid cream and cards.
2. **None of them puts any research on the page.** Every figure, including P3's "service lines", charts the lab's *bibliography* (counts, years, which direction a paper belongs to). None shows a study design, a model or a method. To a faculty reader, a chart of a lab's CV is a vanity graphic, not evidence. L1 ("the lab's own evidence is the hero") is stated and then deferred to "a featured finding slot for later".
3. **The pearl does not survive as an identity off the home page or at small sizes** (MEASURED, C.2). P2's Fig. 1 also breaks the keep-list rule that the encoding may only become *more* data-true (C.3).

These are fixable. The required changes (C.6) keep the three routes, add a cheap **control** prototype so the result can be interpreted, and make a **real study-design plate** a shared requirement. That plate is where "cooler" can come from honestly.

### C.1 Would each concept still look AI-generated or template-made?

The 2025–26 clichés the spec reaches for are listed below, by name. Each "tell" is DOCUMENTED by the cited catalogue. Whether *this* use triggers it is HYPOTHESIS unless marked MEASURED.

| # | Move in the spec | Where | Why it is a cliché now | Required change |
|---|---|---|---|---|
| 1 | **Swapping Inter for another fashionable grotesk** (Familjen Grotesk with ink traps; Archivo with a width axis) | P2 type, P3 type | The ban-list approach only moves the median to the next font down the list. Even this document's own §1 cites an anti-slop list that *recommends* Fraunces, which is how the current site got Fraunces. "Geometric sans with subtle quirks" and "variable fonts with unusual axes" are both 2026 trend entries (madegooddesigns) | The face is not where the distinctiveness comes from. Judge each prototype with its type swapped for a neutral fallback as well (RC-11). If it then reads generic, the face was doing all the work |
| 2 | **Oversized hero headline**: STIX 500 at 80 px (P1); Familjen 700 at 120 px, −0.035em (P2); Archivo condensed 700 at 104 px (P3) | §5.1, §5.2, §5.3 home | "Oversized hero headline" and "crushed letter spacing" are named tells (impeccable.style/slop). Big serif heroes and heavy condensed display are 2026 trend entries. **All three prototypes have one**, so L3's "one extreme each" collapses into "everyone has a giant headline" | Only the prototype whose extreme is typography (P1) may use a large statement, and it is capped at 3.25rem. P2 and P3 cap their statement at 2.25rem and let the mark (P2) or the figure (P3) be the extreme. Tracking is never below −0.015em (RC-3) |
| 3 | **Broadsheet skeleton everywhere**: zero radius as a stance, 2 px ink rules opening every section or table, hairline rows, a big year numeral in a left rail, a right-hand meta column | P1, P2 and P3 all | capitalandcompute names "broadsheet cosplay" (hairline rules, zero radius, dense columns) as a second-wave default. P1's guard bans drop caps and mastheads but keeps the core of the cluster | At most 2 heavy rules per 1440×900 viewport (probe). The year rail with big numerals is **P1 only**; P2 and P3 use inline year headings. P2 separates with "resting" baselines, P3 only at table edges (RC-4) |
| 4 | **"↗" on every external link** (the §5.0 budget replaces "→" with a CSS "↗") | §5.0 | The north-east arrow is the 2024–26 successor to the "→ on every link" tell. On the publications mock it would appear about 30 times | **No arrow glyphs** on links. "PDF", "SSRN" and "DOI" already say where they go. One "→" is allowed per page for a real next step (RC-5) |
| 5 | **Hero metric row**: three large numerals "4 papers / 1 in progress / 4 projects" | P2 direction header | "Hero metric layout" is a named anti-pattern (impeccable). Single-digit numbers at 64 px look like vanity statistics | Use a sentence in `--t-title`: "4 papers, 1 in progress, 4 projects." (RC-6) |
| 6 | **Numbered markers on content that is not a sequence**: "01–04" inside the pearls, kept by keep-list #7 | P1 Fig. 1 | "01 / 02 / 03 markers on non-sequential content" is named (capitalandcompute). The order is editorial (D-04). A number inside a dark disc reads as a notification badge, which DIRECTION itself MEASURED in `d-1440.png` | Remove the numerals from the pearls in every prototype. Keep-list #7 is withdrawn, so P1 has no mono exception left (RC-7) |
| 7 | **The dot as a universal marker** | P1, P2, P3 | One small disc carries five meanings: a paper (seed), a direction (legend), a lab member (5 px dot before names), a route-indicator lane, and a tally. When everything is a dot, the pearl means nothing. It also drifts towards the "pulsing status dot" family | The disc is reserved for **papers and directions**. Lab members are set in weight 600, which is the CV convention. P3's route indicator stays, because it is a paper-level mark (RC-8) |
| 8 | **Uniform circular avatar grid** (6 per row) | P1 people, P3 undergraduates | It is the stock "team" section of every template. "Circles at pearl proportion" is a rationalisation, because the photos are not pearls | P1: a masthead *list* with 64 px square photos inline. P2: a square grid (as specified). P3: round discs, the only circles (RC-9) |
| 9 | **Blue underlined links that turn violet when visited** ("acidified pea") | P1 | On white with STIX (close to Times), this is the browser's default link pair. It will read as *unstyled*, not authored. The tea-chemistry joke is invisible to every reader | Links are set in ink with a 1 px `--link` underline (decoration colour only), and the underline is 2 px on hover. No colour change for visited links. `--link-treated` is dropped (RC-10) |
| 10 | **"Crew", "jobs", "service", "server", "queue" as visible copy** | P3 | A cute register in the startup voice, and technically wrong (C.3). Faculty will read it as a gimmick | Visible copy uses "People", "Projects", "Papers", "In progress". The metaphor stays in the drawing and nowhere else (RC-14) |
| 11 | **The OG card in the P2 board** (`b2-top.png`, MEASURED by eye): a near-black ground, a bold grotesk, a pink spot glyph, and a mono kicker "New working paper · 02 AI at Work" | P2 | The kicker breaks P2's own bans (mono, the interpunct string, "02"). The whole card is the "dark signal" cluster | Redo it on paper white, with the kicker in Familjen 500 and no number (RC-12) |

**What the spec gets right, and what not to undo:**
- no grain, no marquee, no bento, no cursor-follower, no glass, no gradients;
- no ambient loops, no bounce easing;
- the "text is the legend" link between the statement and the figure;
- the copy rules;
- the provenance footnote.

None of the prototypes contains the loudest 2025–26 moves, and that should stay so.

### C.2 Is the pearl identity recognisable with animation off, at 16 px, and in one colour?

**MEASURED (`critique/lineup.png`):**

| Candidate | At 16 px it is indistinguishable from… | Verdict |
|---|---|---|
| P1 flat ink pearl. **P1 has no mark spec at all**: STIX wordmark, no pearl-O, no favicon | a full stop, or a bullet | No identity |
| P1 "dial" (pearl + orbit + 3 seeds) | a radio button, or a generic orbit/atom icon | Reads as a UI control |
| **P2 ∴ favicon** | the generic "group/people" three-circle icon. At 16 and 32 px the two are near pixel-identical | **Fails.** IDENTITY-RESEARCH §3.4 already concedes that ∴ is "a generic shape" |
| P2 lab mark `0/10/111/1111` | a grey smudge at 16 px; a cannonball pile at 32 px | Usable only at 48 px or more |
| P3 server pearl on a line | a git-commit node (a circle on a line) | **Fails.** It also primes the "git graph" reading of Fig. 1 (C.3) |
| Test: a pearl resting on a floor rule | the closest to ownable of the set, but still a generic "ball on ground" | Worth testing, not proven |

**One colour:** every candidate is a single flat fill, so all of them survive one-colour printing (MEASURED, reversed row). That part of the spec is sound.

**With animation off:**
- **P1:** Fig. 1 is four black discs with hairline rings. It reads as a diagram, not as boba, and nothing else on the site carries the pearl.
- **P2:** the system is recognisable at 48 px and above (the glyphs and the "resting" composition).
- **P3:** this is the most recognisable *figure* at rest. It is not recognisable as *boba*.

**Conclusion (HYPOTHESIS).** A disc-based mark cannot be ownable at 16 px: the shape vocabulary of UI icons already owns circles. The identity should be claimed where it can win:
- at **48 px and above**, through a *composition rule* (P2's "pearls rest on a rule" is the best one in the document);
- through **data marks** that use the same disc consistently.

At 16 px a favicon has to be **tested against a lineup**, not asserted (RC-2). A letterform-based favicon (for example a "b" in the prototype's face, with no pearl substitution) is an acceptable outcome. A three-dot glyph that is identical to a stock icon is not.

### C.3 Real research, or decoration pretending to be research?

**What the concepts actually encode (MEASURED from the specs):** `year`, `type`, `directions`, public-link presence and a WIP count. That is bibliographic metadata only.
- No prototype shows a study design, a model, an experimental flow or a dataset description.
- The content model already holds plain-language summaries in **`in_brief`**: 13 of 25 publications have one (MEASURED, `content/publications/*.md`). No prototype shows them; the ledgers show title, authors and venue only.

**Encoding errors that a faculty reader would catch:**

1. **P2's Fig. 1 breaks keep-list #1 (MEASURED from the glyph codes).** The direction glyphs have 4 / 6 / 6 / 4 pearls (AA / AI / LOJ / PW), but the papers are 4 / 4 / 4 / 6. A glyph of discs sits directly above a tally of discs that *do* count papers. A reader will count the glyph's pearls as papers and get three of the four directions wrong. AA matches only by coincidence, which makes the error more convincing.
   - **Fix (RC-13):** in P2's Fig. 1, every pearl is a paper. Papers **settle into a pile** under the lattice rule:
     - in year order;
     - filled = public version;
     - open rings *above* the pile = work in progress, "not yet settled".

     This is the metaphor made true. The direction glyph appears only as the 24 px label tag. The "lab mark taken apart" intro is cut.
2. **P3's queueing notation runs backwards (MEASURED by looking at `d2-1440.png`).** In the field's own diagrams, arrivals enter a queue, the queue feeds the server, and departures leave it. The sketch puts served papers to the *left* of the server and the queue to its *right*, while time runs left to right. Jobs therefore flow right-to-left through a server, against the time axis.
   - This is the audience that draws queues for a living, so this metaphor will be checked.
   - Also, nothing is "served": a paper is not processed by the direction.
   - **Fix (RC-14):** drop the server/queue claim. The figure is honestly *a timeline of papers by direction*:
     - a "now" rule;
     - an "in progress" zone;
     - the pearl as the direction's marker at today.

     The operations notation moves to where it is true: the study-design plates.
3. **Order within a year is alphabetical by slug and looks like time order** (P3 §5.3 "ordered by year then slug"; P1 seed clock order). With ordinal columns, a reader takes left-to-right as chronology.
   - **Fix (RC-15):** papers are grouped into **year bins** with a visible gap between bins and the year label spanning the bin. Within a bin, order by `date_online` where it exists, otherwise by slug. The caption says "order within a year is not meaningful" whenever any bin uses the slug fallback.
4. **P3 resembles a git branch graph** (HYPOTHESIS, supported by the lineup row: the server-on-line glyph *is* the commit-node glyph). The figure has horizontal lanes, dots, and vertical connectors between lanes, which is a staple of developer tools and so a stock "tech" picture.
   - **Fix (RC-16):** build a `?links=rings` variant. Shared papers get a matching 1.5 px ink ring on both lanes, with no connector. The judge compares both against a git-graph reference kept in the scratchpad `refs/` only.

**Where truthful explanatory graphics can carry the identity.** The lab's own papers describe concrete designs. Redrawn as schematics in each prototype's grammar, they use the pearl *as a unit of the study*, so the metaphor is earned. Rules for these plates:
- Each one is a **schematic of the design**, never of results.
- Each one carries a source line ("Redrawn from the study design described in …; schematic, not data").
- No plate is published on the live site without the PI's sign-off (RC-17).
- Redraw from the paper's *text*. Never trace a published figure, because publisher copyright covers the figure even though the PI is a coauthor.

| Direction | Paper (public) | Design facts available | Plate in the house grammar |
|---|---|---|---|
| Algorithmic Advice | Bastani, Bastani & Sinchaisri 2026, *Management Science* 72(1) | **DOCUMENTED** (arXiv HTML v5): <br>• players manage three virtual workers (chef, sous-chef, server); <br>• each burger order is three subtasks in fixed order, chop → cook → plate; <br>• four orders per round; time is in ticks; <br>• a worker's speed varies by task and is revealed only after assignment; <br>• optimal finish is 20 ticks fully staffed and 34 understaffed (the chef leaves); <br>• a "normal" configuration (3 full rounds) and a "disrupted" one (2 full rounds + 4 understaffed); <br>• Phase I has no tips (trace data); <br>• Phase II randomises four arms: no tip, the algorithm's tip, the tip most chosen in Phase I, and a baseline tip; <br>• a tip is a single if-then rule | **12 pearls = 12 subtasks** (4 orders × chop/cook/plate) beside 3 worker floors, plus the Phase I → II flow with four arms. The 20 / 34 tick optima appear as labelled design parameters. **Do not draw a schedule**: one invented by the builder would be read as the optimal policy |
| Algorithmic Advice / Learning on the Job | Blaettchen & Sinchaisri 2026 (working paper) | DOCUMENTED only as `in_brief`: EV-charging route experiments compare an exact action with a broader rule of thumb; advice is visible, then removed in similar settings | A two-phase design strip: "with advice" → "advice removed", two arms. Details must come from the PDF |
| Learning on the Job | Deng, Jiang, Qu & Sinchaisri 2025 (SSRN 5387320) | `in_brief`: the platform offers jobs; workers may decline; workers improve at different, unknown rates; a benchmark plus learning algorithms; tested on delivery-platform data. The SSRN abstract page returned HTTP 403 to my fetch, so I could not verify the model beyond `in_brief` | Pearls (jobs) offered to workers with accept or decline branches. Experience accumulates as a settled stack under each worker. **The model must be read from the paper's model section before drawing.** In the prototype it is labelled "draft schematic, pending author check" |
| Platform Work | Allon, Cohen & Sinchaisri 2023, *MSOM* | `in_brief`: ride-hail drivers' start/stop decisions depend on pay, an earnings goal ("income targeting") and shift momentum ("inertia") | One shift drawn as a timeline with log-on and log-off decision points, and the three named factors as labelled inputs. No curves |
| AI at Work | Keppler, Sinchaisri & Snyder 2025, *PACM HCI* (CSCW) | `in_brief`: 24 K-12 teachers; requests sorted into a handful of ways of asking for help; most conversations stay within one | The category names must be taken from the paper. Each conversation is a strip of pearls in one category colour. **Distributions only if the paper reports them** |

This is the honest answer to "cooler" (HYPOTHESIS). A reader-triggered, finite step-through can be built from **documented** design facts only, with no invented schedule or results. For example, 12 subtask pearls dropping into chop → cook → plate order, then the chef leaving the kitchen. That is more memorable than any typeface, and no generator will produce it, because it comes from this lab's experiment.

### C.4 Accessibility, performance and maintenance risks

| Risk | Evidence | Required change |
|---|---|---|
| **Custom 2-D keyboard models** (P1: roving `tabindex`, Arrow keys and Esc inside a pearl; P3: ←/→ along a lane, ↑/↓ to a twin) | HYPOTHESIS based on WAI-ARIA practice: arrow keys conflict with screen-reader browse mode unless the widget declares a composite role, and these models are where student maintainers break things. Every paper is already a link in the ledger below the figure | On the **home** figure, dots are `aria-hidden` and pointer-only (hover names the paper). Pearls and lane labels are plain links in DOM order. Dot-level focus exists only on direction **Figure 2**, where each dot is a normal labelled `<a>` in tab order. No arrow-key model (RC-18) |
| **The figures do not scale** | MEASURED (computed from the spec geometry): <br>• **P1:** in mobile list mode the 44 px pearl's ±75° arc (r = 28 px, 74 px of arc) holds at most about 10 seeds of 7 px before they touch, and fewer with ringed shared seeds. Platform Work already has 6. <br>• **P3:** at 1366 px the track left for columns is about 890 px, so at the 28 px minimum column width it overflows at about 31 papers. The four directions have 13 now, and 7 were added in 2026 alone. **Both break within about 2–3 years** (HYPOTHESIS on the publication rate) | Each prototype ships a **growth harness** (`?n=2x`, `?n=4x`). It duplicates the snapshot with titles visibly marked "SYNTHETIC", lives in the prototype only, and is never in `content/`. Each prototype states its overflow rule (RC-19). <br>• P1: a second, inner orbit for papers older than 3 years. <br>• P2: a fixed floor width of 6 for **all** directions (one scale, comparable piles), widening to 8 for all at the same time. <br>• P3: year bins pack at a 16 px pitch once the columns would drop below 28 px |
| **Forced colours / Windows High Contrast** | Not in the capture list. Direction colours are stripped in forced colours, so P2's coloured glyphs and P3's line colours collapse to one system colour | Add a forced-colours capture. Lanes, piles and seeds must stay distinguishable by position, shape and labels (RC-20) |
| **Figure JS budget contradiction** | §5.0 allows 4 KB gz for the figure. D-02a/JUDGE set ≤ 2.5 KB gz | Use **2.5 KB gz** for the figure and 8 KB in total. Exceeding it is an owner decision, not a silent change (RC-21) |
| **P3 font budget** | 103.4 KiB against the 100 KiB budget, deferred to §6 | The judged P3 ships **without** the Archivo italic (88.0 KiB), with venues upright in muted. The prototype that is judged must be one that could ship (RC-21) |
| **Port cost and test hooks** | AUDIT-SYSTEM R5: about 250 test lines select on class names. The prototypes invent new markup, so the winner could not be ported cheaply | Each prototype includes a `MAPPING.md` table: prototype component → existing component and class name → tests affected. "Restyle, don't rename" is checked before judging (RC-22) |
| **CMS load on student editors** | P2: a 41-code `glyph` enum that editors pick from. Plates: hand-made SVG per paper | P2's glyph is assigned by the maintainer, not chosen by editors: the CMS field is hidden behind a "design" collection. Plates are an optional `figure` object on publications (image, alt, caption, `source`, `pi_verified: boolean`). The validator refuses to render a plate unless `pi_verified` is true. Optional fields only, so the content model is unchanged (RC-17) |
| **Lane order changing silently** (P3) | Crossing-minimised order is recomputed at build time, so a CMS edit can reorder the home figure without anyone choosing it | The validator *suggests* the low-crossing order as a warning, and `direction_order` stays authoritative. The prototype shows the chain order with a note (RC-14). This replaces §6 item 4 option (a) |

### C.5 Are the prototypes truly different philosophies?

**Partly. They are three skins on one wireframe** (MEASURED by comparing §5.1–§5.3):

| Shared by P1, P2 and P3 | Differs |
|---|---|
| Pure white page with near-black ink; zero radius; 2 px ink rules plus hairline rows; the same ledger row (year \| title, authors, venue \| meta, links); lab-member dot; "Completed only when true"; one-line rows for projects without a summary; the same five mocks and copy; circular or square photo grids | Typeface; what Fig. 1 *is* (dial / glyph / lanes); where colour lives (link / spot glyph / line) |

This matters for the judge. If all three score better than the current site, the result cannot say whether the gain came from the shared cleanup or from the concept. That is a failed experimental design: there is **no control arm**.

**Required (RC-1).**
- **Add P0 "Control".** Apply only the shared cleanup to the *current* kit:
  - current fonts, palette and Fig. 1 geometry;
  - remove pills, boxes, tracked-mono eyebrows and link arrows;
  - apply the copy fixes;
  - flatten the pearls (no halo or gloss);
  - use ledger lists.

  It costs S and isolates causes 2, 3 and 6 from causes 1, 4 and 5. If P0 closes most of the gap, the expensive font and palette change is not justified.
- **Push the routes further apart** (RC-4, RC-9, RC-13, RC-14). Each route gets one structural device of its own:
  - **P1** keeps the margin rail and the numbered-figure system (every mock has a numbered figure);
  - **P2** owns "everything rests on a rule", the settled-pile figure and the square photo lattice;
  - **P3** owns tables opened and closed by heavy rules, inline years, and the swimlane grammar applied to study designs (its extreme is the method plates).

  The ledger internals may stay similar, because correct academic metadata converges for good reasons.
- **The one axis nobody tests is ground colour.** All three are on white. HYPOTHESIS: white plus ink plus one accent is itself becoming the default after cream. As an optional flag, `?ground=` in P2 tries the direction's spot ink as the full-bleed ground of the **direction header only**, with ink text (5.83 on pea, MEASURED in §5.2). The flag is judged by eye against the "startup" failure seen in `b2-p3.png`. It is not part of the default build.

### C.6 Required changes (applied in §5, marked [RC-n])

| RC | Change | Applies to |
|---|---|---|
| RC-1 | Add **P0 "Control"** (§5.4). The judge runs a blind five-second test on the current site, P0, P1, P2 and P3 | all |
| RC-2 | Every prototype ships a **mark sheet**: header lockup, favicon at 16/32 px, one colour, reversed. It passes the lineup test: in a blind 3-person check, the mark must not be confused with any of 6 generic icons. ∴ fails as a favicon; P1 and P3 must create a mark | P1, P2, P3 |
| RC-3 | **Hero type caps.** Statement ≤ 3.25rem in P1, ≤ 2.25rem in P2/P3; tracking ≥ −0.015em; leading ≥ 1.0 | P1, P2, P3 |
| RC-4 | At most 2 heavy (≥ 2 px) rules per viewport. The big year-numeral rail is P1 only | P2, P3 |
| RC-5 | No "↗" and no arrow glyphs on links; at most 1 "→" per page | all |
| RC-6 | No hero-metric numerals; counts go in sentences | P2 |
| RC-7 | No "01–04" anywhere, including inside pearls. No mono outside DOI and BibTeX | P1 (P2 and P3 already comply) |
| RC-8 | Discs only for papers and directions. Lab members in weight 600 | all |
| RC-9 | Circle avatar grids only in P3. P1 uses a masthead list with 64 px square photos | P1 |
| RC-10 | P1 links in ink with a `--link` underline; no visited colour swap | P1 |
| RC-11 | The judge also captures each prototype with its fonts blocked (fallback fonts), to see how much of the result the face carries | judge |
| RC-12 | Redo P2's OG card on paper white, with no mono, number or interpunct | P2 |
| RC-13 | P2 Fig. 1 becomes **settled piles**: one pearl per paper, WIP open above. Glyphs appear only as label tags | P2 |
| RC-14 | P3 becomes "Lines": no server, queue, crew or jobs language; the pearl marks "now"; `direction_order` stays authoritative; the method plate is the direction mock's centrepiece | P3 |
| RC-15 | Year bins with a visible gap; within-year order by `date_online`, otherwise slug, with a caption note | P1 seeds, P3 |
| RC-16 | `?links=rings` variant, compared against a git-graph reference | P3 |
| RC-17 | Add a **sixth mock: the paper page** `/publications/bastani-2026-rl-tips/` with its `in_brief`, a **study-design plate** in the prototype's grammar, and the citation block. Ledgers show `in_brief` as one muted line where it exists. Plates are schematic only, with a source line and PI sign-off before the live site | all |
| RC-18 | No arrow-key models. Home dots are pointer-only and `aria-hidden`; Figure 2 dots are plain links | P1, P3 |
| RC-19 | Growth harness `?n=2x` / `?n=4x` (SYNTHETIC labels, prototype only) and a stated overflow rule | all |
| RC-20 | Add forced-colours and grayscale captures | judge |
| RC-21 | Figure JS ≤ 2.5 KB gz; P3 ships without the italic (88.0 KiB) | all; P3 |
| RC-22 | `MAPPING.md` per prototype: component → existing class names → tests | all |

### C.7 Final list of prototypes to build

| # | Prototype | Bet | Effort |
|---|---|---|---|
| **P0** | **Control**: the cleanup only, on the current kit (§5.4) | Measures how much of the "AI look" is chrome and copy rather than palette and type | S |
| **P1** | **Notebook** (revised) | Credibility first. Journal conventions, the margin rail, and numbered figures on every page, including the study-design plate | M |
| **P2** | **Settle** (revised) | Identity first. "Everything rests"; settled-pile Fig. 1 where every pearl is a paper; the glyph is a tag only; the mark passes the lineup | M–L |
| **P3** | **Lines** (revised from "Service Lines") | Research first. An honest timeline figure, with operations notation used where it is true: the study-design plates are the hero of the direction and paper mocks | M |

Concept A stays folded in, as in §4.

**Judge protocol.** A blind five-second test with 3–5 Haas faculty or PhD students, in randomised order, covering the current site, P0, P1, P2 and P3. For each, ask:
- "made by a template or an AI tool?" on a 1–7 scale;
- "a credible research lab?" on a 1–7 scale;
- "name one thing you remember" (free text, scored for whether it mentions lab-specific content).

Prof. Park rates last, so the client's view does not anchor the others.
