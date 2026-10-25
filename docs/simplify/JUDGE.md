# JUDGE: which homepage direction to build

This compares four homepage prototypes (A Four Pearls, B Questions first, C The beaker, D People & pearls) with the current homepage. The current homepage is the live redesign, D-13 "Lines".

**Evidence labels**
- **MEASURED** means it comes from `5s/elements.json` or from a screenshot I looked at.
- **TESTER** means it comes from the simulated 5-second test: 3 personas per design, with no context.
- **JUDGEMENT** is my opinion.

**What I looked at**
- Every sheet in `sheets/` and every image in `5s/`.
- The hover and tap shots, the dark-mode shots, the C motion frames and the research-page sketches in `proto/*/shots/`.
- All four NOTES.md files and REFS-SIMPLE.md §4–§6.
- The repo code paths listed in §7.

Nothing in the repo was edited.

---

## 0. Verdict

**I recommend building C's beaker as the hero, with specific elements taken from B, A and D (§5). B is the fallback.**

C is the only concept that meets all three of the owner's goals at once:
1. **Simple.** It has 96 words and 4 marks on the first screen, and its encoding is labelled in words (MEASURED).
2. **Unmistakably BOBALAB.** BOBA + LAB is drawn as one picture.
3. **Not childish and not template.** C had the best "looks template or AI" score (2.67) and the best memorability score (5.33) (TESTER).

Its weak points can all be fixed:
- Visitors can't tell the pearls are clickable.
- The research questions are long.
- The reveal opens on click only.
- The people strip is a contact sheet.

The fixes come from the other prototypes: B's copy and research page, D's "one finding", and A's morph and wordmark tint.

**Why B is the fallback.** B is the most comprehensible and the least risky: it has the best "why" and is the least childish. But it is the least memorable (4.0) and looks the most like a template (4.0). It fails goal 7 ("this is BOBALAB, not a journal"). If Prof. Park reads the beaker as cute, ship B's layout and keep C's reveal grammar on B's questions.

**I do not recommend A or D as the base:**
- **A.** The shaded spheres read as glossy orbs. This is the AI tell from DIRECTION §1, and a tester literally wrote "big glossy colored pearls". In dark mode they become candy-coloured balls. The pyramid also implies a hierarchy.
- **D.** It is the warmest design. But the hero depends on photos (4 of 25 are initials discs that "look unfinished"), and the PI appears as a black "PS" disc that reads as a missing photo. Lighting people up by direction exposes how thin the data behind it is: only 2 people light up for most directions, and the rest fade. On top of that, all 3 testers called its "why" generic.

---

## 1. Comparison table

Data is from the first screen at 1440×900 and 390×844 in light mode, MEASURED from `5s/elements.json` and the sheets.

| | Current (live) | A Four Pearls | B Questions first | C The beaker | D People & pearls |
|---|---|---|---|---|---|
| Words on first screen, desktop / mobile | 215 / 115 | 103 / 78 | 155 / 106 | **96** / 90 | 142 / 120 |
| Visual encodings / encodings that need a legend | 8 / 7 | 2 / 0 | 2 / 0 | 2 / 0 | 3 / 1 |
| Marks to decode, desktop | 46 | 4 | 4 | 4 | 29 (25 faces + 4 dots) |
| Clickable elements, desktop (tab stops) | 14 | 10 | 10 | 13 | 37 (13) |
| Legend or caption needed | 5-line Fig. 1 caption | no | no | no | no |
| H1 is the dominant element (REFS C5) | no (36 px, beside 32 px lane names) | yes | yes | yes, the largest | yes |
| Who / what / why answered by text alone | who partly: the PI is not named | yes | yes, and the why is the most concrete | yes | yes, but the why is generic |
| All four directions in the mobile first viewport (C12) | no (the first one is at about 690 px and the rest are below) | yes, as pearls | no, only one question shows | yes, beaker and labels | yes, as a list |
| Signature visual | dense "subway map" chart | 4 large shaded spheres in a pyramid | 4 small dots on a line, plus a pearl as the full stop | line-drawn lab beaker of tea with 4 labelled pearls | a pile of 25 round faces |
| Reveal on the first direction | hover lights the lane | hover: papers fly out as seeds, and the panel shows the question | hover or click: dot strip, count, summary, link | click: the pearl rises, then question, first read, explore link | click: question, one finding, count, explore; matching faces get rings |
| Full page height at 1440 | 3013 | 3502 | 2934 | **2047** | 2211 |
| Dark mode (looked) | fine | pearls turn candy-pastel | fine | strong: tea #211C17 | fine |
| AI tells (DIRECTION §1) | none | gradient and grain on the spheres reads as glossy orbs | none | none (flat discs, one stroke weight) | none |
| Fits D-13 tokens as they are | yes | no: radial gradients, feTurbulence | no: display size above 2.25 rem | no: display size above 2.25 rem, and one tea fill | yes |

---

## 2. Tester summary

Each design had 3 personas: faculty, undergraduate and data scientist. Scores run from 1 to 7.

| | Who correct | What correct (4 areas) | Why judged concrete | Complexity ↓ | Memorable ↑ | Credible ↑ | Looks template/AI ↓ | Childish ↓ | Warmth ↑ |
|---|---|---|---|---|---|---|---|---|---|
| Current | 3/3 lab; **0/3 named the PI** (1 said "couldn't tell who leads") | 3/3 | 0/3 ("general terms", "generic phrase") | **5.00** | 4.33 | 6.00 | 2.67 | 1.00 | **2.00** |
| A | 3/3, PI named | 3/3 | 0/3 ("broad", "fairly generic") | 2.00 | 5.00 | 6.00 | 3.00 | 2.00 | 4.00 |
| B | 3/3, PI named | 3/3 (one persona restated all four questions) | **3/3** concrete (assigns work, gives advice, teachers) | 2.00 | 4.00 | 6.00 | **4.00** | **1.00** | 3.67 |
| C | 3/3, PI named | 3/3 | 3/3 adequate (assigns gig work, advice, teachers); none called it generic | 2.00 | **5.33** | 6.00 | **2.67** | 2.00 | 4.33 |
| D | 3/3, PI named, "about 25 people" | 3/3 | 0/3 ("feels generic", "general goal") | 2.00 | 4.33 | 6.00 | 3.00 | 1.67 | **5.33** |

**What each design's testers remembered**
- **Current:** "a subway-map chart I didn't understand" (3/3).
- **A:** "four big coloured pearls in a pyramid". One said "glossy".
- **B:** the headline (3/3). Nobody remembered a visual.
- **C:** "a line-drawn boba cup with four coloured pearls, each labelled" (3/3). This is the only design where the visual and the research were remembered together.
- **D:** "honeycomb cluster of student headshots" (3/3). The memory is of faces, not research.

**Confusion each design's testers reported**
- **Current:** what the black circles, vertical links and uneven year axis mean. "Shares 1 paper with…" means nothing on mobile.
- **A:**
  - The pearls look decorative, and nothing says they can be clicked.
  - The hint sits far from the pearls.
  - There is an empty band at the bottom left.
  - The pyramid implies a ranking.
  - On mobile the subtitles are inconsistent.
- **B:**
  - Do the dots on the line mean anything, and can they be clicked?
  - Only one question shows above the fold on mobile.
  - The intro on mobile is long.
- **C:**
  - Visitors don't realise the pearls can be clicked (2/3).
  - The graduation ticks look odd (2/3), or the drawing reads as a beaker first (1/3).
  - "See how the four directions connect" is vague.
  - On mobile, "Menu" sits in the middle of the header.
- **D:**
  - The coloured dots mean nothing (3/3).
  - The initials discs (PS, WD, VS, AT) look unfinished (2/3).
  - The faces are not on the first mobile screen.
  - The intro is long.

**Reading the tester data**
- All four prototypes cut perceived complexity from 5 to 2.
- All four held credibility at 6.
- No concept raised a childishness alarm: the worst was 2/7.
- So the owner's main complaint is fixed by **any** of the four. The real choice is between memorability and warmth (C, D) and quiet clarity (B).

### Where the simulated test is unreliable (JUDGEMENT)

1. **Not a real 5-second exposure.** The testers were models reading a static screenshot with no time limit, so they read small grey text a real visitor would skip. Real comprehension of the current site, and of D's long lede, is probably *worse* than reported. C and A, with fewer words, benefit less from the extra reading time.
2. **Static images can't test affordance or motion.** "Not obviously clickable" (A, C) and "do the dots do anything" (B, D) are real findings. But nobody experienced the settle, the rise or the hover reveal, so interaction quality is untested. Users might not discover the reveal, or might be delighted by it; these results can't say which.
3. **The ratings don't discriminate much.** Credibility is 6 for all 15 ratings, and complexity is 2 for all 12 prototype ratings. The real signal is in the free text and in memorability and warmth, which differ by only about 1 point. With n = 3 personas from the same model, the errors are correlated, so differences under about 1 point are noise.
4. **The prototypes are compared with a polished build.** The current site has real data density and production polish, and the prototypes are sketches. That favours the current site on credibility and probably penalises nothing else.
5. **Personas can't stand in for the most important reader.** That reader is Prof. Park, whose test is "impressive and not cute". Only a PI glance can settle the beaker's cute risk (C NOTES §8.1).
6. **Copy drives the "why" scores.** B's and C's better "why" comes from rewritten copy, not layout, so it carries over to any layout. D's generic score comes from reusing `home.yml` mission wording.

---

## 3. Strengths and weaknesses

### Current (D-13 "Lines")
**Strengths:**
- Typography, ruled publication and news lists, honest data and no AI tells.
- The pearl-to-direction morph (AUDIT M3: "the site's best moment").

**Weaknesses:**
- 8 encodings and a 70–80-word legend on the first screen.
- The H1 is not dominant.
- The PI is not named.
- The research directions start below the fold on mobile.
- Warmth is 2.0: it reads as a journal figure.

### A, "Four Pearls"
**Strengths:**
- The biggest, simplest object: 4 pearls with words beside them.
- Seeds (paper dots) fly out on hover, which is a nice reveal.
- The O in the wordmark tints to the chosen flavour (cheap delight).
- The cross-document morph into the direction pearl is kept.
- The research page is clean: a direction ledger, then an "Explore how the work connects" timeline, then earlier research.

**Weaknesses:**
- The gradient and grain shading reads as 3D glossy spheres or billiard balls (TESTER: "glossy"). It violates D-13's flat decision and DIRECTION §1.
- In dark mode the pearls turn pastel and candy-like.
- The pyramid implies Algorithmic Advice is the top direction.
- There is a dead empty band at the bottom left.
- The hint is far from the pearls.
- The page is the longest of all (3502 px), because the homepage still has a feature figure, papers, people and news.
- The "Inside a study" figure (the virtual-kitchen design) is a redraw of `BastaniPlate`, which is `plate_verified: false`. It must not go on the public homepage.

### B, "Questions first"
**Strengths:**
- The clearest copy: the who line, then the statement with a pearl full stop, then a "why" with concrete stakes.
- The four human questions are the warmest *text* of any concept.
- Lowest childishness (1.0).
- The reveal is real `<button aria-expanded>` that works by hover, focus or click, with an accordion on phones.
- **The best research page:** directions with short question, summary and three papers, then a grey "Explore: how the four lines grew, and where they meet" band with a one-sentence inline key above the timeline.

**Weaknesses:**
- Least memorable (4.0) and most template-like (4.0). The signature is four small dots, which testers read as a progress bar.
- On mobile only one question is above the fold.
- The reveal needs about 150 px of empty space reserved under the questions.
- The display size breaks the 2.25 rem token cap.
- The "Inside a study" band uses the unverified `BastaniPlate` (same problem as A).

### C, "The beaker"
**Strengths:**
- The name becomes the picture: BOBA + LAB.
- One stroke weight, flat matte pearls, specimen-style leader lines to word labels. Exhibition-drawing grammar, not tea-shop grammar.
- The fewest words (96) and the shortest page (2047 px), with every direction above the fold on both devices.
- The rise interaction is physical (buoyancy) and its own metaphor. The panel answers question → first read → explore → count. It is one click deep (REFS principle 3).
- The no-JS fallback is an `<ol>`.
- axe reports 0 violations, and dark mode is the strongest of the set.
- The homepage keeps D-13's ledgers for papers and news.

**Weaknesses:**
- Visitors can't tell the pearls are clickable: labels are not underlined at rest, and the hint is small and grey.
- The pearls are small (about 46 px at 1440) relative to a tall beaker, so the signature element is visually under-weighted. There is a lot of empty tea at rest.
- The content `question` it uses is long and study-specific: "What kinds of help do teachers ask ChatGPT for…"
- Hover does not open the reveal, by design.
- On mobile, "Menu" sits in the middle of the header (a bug), and the CTAs fall below the beaker.
- The people strip is 21 square-cropped faces (one is round) with no names. It reads as a contact sheet.
- "See how the four directions connect" is vague.
- There is a real cute risk, which needs a PI glance.

### D, "People & pearls"
**Strengths:**
- The warmest design (5.33). Real people are the least generic material a lab has.
- The "One finding" line in the reveal, with a citation, is the best "why it matters" device in the set.
- The direction list is honest and easy to scan.
- All four directions sit above the fold on mobile.
- The roving tabindex on the pile is good accessibility work.

**Weaknesses:**
- The hero is about people rather than research.
- The "why" is generic (0/3 testers found it concrete).
- 4 of 25 discs are initials, and the PI is a black "PS" that reads as a missing photo.
- When a direction opens, only William Deng and Park light up and 23 faces fade. That implies the undergraduates do nothing (D NOTES risk 3). Every `people/*.md` has `directions: []`.
- The hero depends on photo consent and dates quickly.
- The colour dots carry no meaning (3/3 testers).
- 37 clickable elements, and 29 marks on the first screen.

---

## 4. Applying "don't assume the most sophisticated is the most usable"

C looks like the most "designed" concept, so I checked it hardest against the simpler ones:
- **Comprehension without the drawing.** Cover the beaker and C's first screen still answers who, what and why in 3 sentences (C12/C6 pass). The beaker adds memorability, not meaning. This is REFS finding 2: the sentence does the 5-second work, and the visual does the memorability work.
- **Encodings.** There is still exactly one: pearl = direction, with its name written next to it. There are no years, counts, links or states at rest. The beaker, straw and ticks are a *depiction*, not an encoding: nothing is mapped to them. That is why testers described it ("a boba cup") instead of asking what it meant.
- **Where it really is weaker.** Clickability. B and D use familiar controls (questions, + rows) that people know how to use. C needs an affordance fix (§6, R2–R4). Without that fix, B is more usable.

---

## 5. Recommendation: the hybrid, element by element

**Base: C's composition.** The H1 sits on the left, followed by the who line, the why line and a link row. The beaker is on the right on desktop, and stacked below the text on phones using C's squat geometry.

| Take | From | Exactly what |
|---|---|---|
| Hero object | **C** | The fine-line beaker: wall, flared rim, slanted wide straw, tea surface with meniscus, a flat tea fill (#F4ECE2 light, #211C17 dark). Four flat matte pearls on the floor, leader lines in the direction colour going out through the wall to word labels. The pearls settle once on first visit. |
| Reveal mechanics | **C** | Choosing a pearl makes it rise along its leader line, with 2–3 small bubbles, and the others step back. The panel sits in the empty tea space on desktop and below the beaker on phones. Esc or choosing again sinks it. Real `<button aria-expanded>` for each label, and the panel follows its button in the DOM. |
| Hover behaviour | **B + C** | Hover or focus lifts the pearl and underlines its label (C). It does **not** open the panel, because C's reason holds: the path to the panel's link crosses the other labels. Click, tap, Enter and Space open it, the same for every input. |
| Who line | **C/A** | "BOBALAB is a research lab at UC Berkeley's Haas School of Business, led by Prof. Park Sinchaisri." This names the PI. The current site doesn't, and 1 of 3 testers noticed. |
| Why line | **B** | Concrete stakes plus purpose, at most about 30 words. For example: "Apps now assign gig work, algorithms hand out advice and AI sits beside teachers. With field data and experiments we study how people learn and decide alongside them, so these systems serve the people who use them." It needs PI sign-off. |
| Pearl label sub-line on desktop (optional) | **A** | A plain gloss under each label, such as "How professionals really use AI". Leave it out if the label stack gets crowded at 1200 px. |
| Question in the reveal | **B** | B's short human questions, for example "When should an algorithm give exact advice, and when a rule of thumb?" They come from a new optional direction field (`home_question`, at most about 90 characters), falling back to `question`. |
| Evidence in the reveal | **D** | "One finding:" plus a citation link when the direction's existing `findings[]` field is filled (it is in the schema and empty today). Otherwise C's "A first read: ‹newest published paper›". Show one or the other, never both. |
| Way out of the reveal | **C** | "Explore ‹short label›" plus a "4 papers, 2 in progress" meta line. **Plus A's morph:** the risen pearl carries the existing direction-pearl `view-transition-name`, so clicking Explore morphs it into `/research/[direction]/`. |
| Wordmark | **A** | The O in the header B●BALAB tints to the open direction's colour and returns to ink on close. Respect reduced motion; this is a colour change, not motion. |
| Below the fold | **C** | "New papers" (3 ruled rows: title, authors, one meta line with direction dots, no abstracts) beside "News" (4 dated one-liners). Then "The people". Then the footer. No feature figure on the homepage. |
| People | **B** (not C, not D) | One sentence, then the URAP and email route, then the 21 consented headshots cropped **round**, with first names, settled in rows on a floor rule. The pearl motif comes back, people stay people, and nothing is lit up or faded by direction. Members without consent are counted in the sentence, not shown as initials discs. |
| Research page | **B** (layout) + **A** (ledger look) | Intro → "Directions" ledger (pearl, title, short question, summary, three papers, counts) → **"Explore: how the four directions connect"** band holding the current `PearlFigure` → "Earlier research" (archived directions). |
| Flavour footnote | **A/C** | One line in the footer or About: "Our four pearls are butterfly pea, lychee, matcha and oolong." |
| Explicitly NOT taken | | A's shaded spheres, A's pyramid, seeds and grain. B's and A's "Inside a study" homepage band (`BastaniPlate` is unverified). D's face pile in the hero, and its lighting by direction. C's mobile "Menu" button (keep the current inline nav). C's square contact-sheet strip. |

### Where the timeline moves

- **Page and section:** `/research/`, in a new section `<section id="map" aria-labelledby="map-h">` titled **"Explore: how the four directions connect"**.
- **Position:** after the live-directions ledger, before projects and "Earlier and related research".
- **Presentation:** in a full-bleed tint band (B's grey `--band`), introduced by one sentence: "Every paper the lab has made public, by year, one line per direction. A vertical link joins a paper shared by two directions; open rings are work in progress." That is B's inline key, so the 5-line Fig. 1 caption can shrink.
- **Component:** the existing `<PearlFigure model={buildFigure(c)} />`, unchanged. Its hover, keyboard and morph behaviour and `figure.css` all move with it.
- **Open by default, no disclosure button (JUDGEMENT).** It is already on a secondary page, below the fold, behind a labelled "Explore" band, which makes it optional by scrolling. A "Show the timeline" button would add a click, a JS dependency for no-JS users, and more test surface, and would protect no one who chose to visit /research.
- **Owner preference for collapsed.** If the owner prefers it collapsed, use `<details open>` progressive enhancement (closed only with JS; `#map` in the URL forces it open), as A and C did.
- **Homepage link:** once, quietly, under the beaker. Use "See every paper on one timeline" → `/research/#map`. This replaces C's vague "See how the four directions connect".
- **Research-ledger strips:** the per-direction `DirectionStrip` small multiples in the ledger then duplicate the map. I recommend dropping them from the ledger rows (B's research page has none) and keeping the component for the direction pages. This needs an owner decision; it is not required.

---

## 6. Refinement list for implementation

**Comprehension and affordance**
- **R1. Hero copy budget.** At most about 60 words on the first screen at 1440, and about 50 words above the beaker at 390 (REFS C4). Who line plus why line come to about 50 words at most. The PI signs off on every new sentence.
- **R2. Make the labels look clickable at rest.** Give them the site's thin ink underline in the direction colour (link grammar already used site-wide), with a trailing "+" glyph *or* the underline, not both. This is the main tester complaint for C.
- **R3. Move the hint up and make it active.** "Pick a pearl to see the question behind it." It goes directly under the label stack, in body colour rather than muted. On touch devices, use "Tap a pearl…".
- **R4. Make the pearls bigger.** About 56 px at 1440 and about 36 px at 390, with the hit area padded to 48 px or more. Widen the beaker so the four pearls fill most of the floor. Shorten the straw and the empty headspace so the signature isn't three-quarters empty glass.
- **R5. Calm the ticks.** Keep three graduation ticks, at most a hairline in `--rule`, on the far wall. They are what make it a lab beaker and not a shop cup, but two testers stumbled on them.
- **R6. Equal visual weight for the links.** Exactly one primary link in the link row ("Explore the research") and one secondary ("Read the papers"), placed above the beaker on mobile (testers missed them below it).

**Reveal**
- **R7. Content of the reveal: at most three items.** Short question → one finding *or* first read → "Explore ‹label›" with counts. Enforce `home_question` at 90 characters or fewer in the schema. C's `fit()` collapse at 1200 px should then rarely trigger.
- **R8. Only one pearl up at a time.** Choosing another pearl sinks the first. Esc sinks the open pearl and returns focus to its button. A click outside the beaker closes it on touch. Never require hover.
- **R9. Morph.** Put the `view-transition-name` on the risen pearl's wrapper element, not the `<svg>`; A found that the name on the `<svg>` itself aborts in Chromium. Reuse the existing direction-pearl naming from `DirectionPearl.tsx`/`PearlFigure`. Respect the existing "VT animations ≤ 120 ms under reduced motion" test.
- **R10. Wordmark tint.** Apply A's tint of the O in the wordmark while a pearl is up. It returns to ink on close, and forced colours use CanvasText.

**Motion**
- **R11. Settle once per session.** At most 0.9 s, transform and opacity only, behind the same sessionStorage gate (inside try/catch) as the current figure intro. Rise and sink take about 350 ms each. Bubbles are 2–3 and finite. Reduced motion means everything is instant (the existing figure.spec patterns apply).

**Tokens and the D-13 grammar**
- **R12. Add `--t-display`.** About 5–5.5 rem desktop and 2.5–2.75 rem mobile, for the home H1 only. It needs an owner decision, because `tokens.css` and its tests say "nothing above 2.25rem". The H1 must be at least 2× the next level (REFS C5).
- **R13. Add `--tea` and `--tea-dark` tokens**, used only as the beaker fill. The page stays white on ink (D-13), so this does not bring back the cream-and-brown kit. The AI-tell probe still passes: flat fill, no gradient or shadow.
- **R14. Flat discs only.** No gradient, grain, rim light or specular highlight on the pearls, in either theme. Contrast is at least 3:1 for pearls and lines on the tea, and AA for all text (C measured 4.4–7.3 light and 6.2–10.5 dark).

**Mobile, accessibility and resilience**
- **R15. Mobile.** Keep the current inline five-item nav, not C's "Menu" button. Order: H1 → who → why → links → beaker → hint, with the beaker and labels inside the 844 px first viewport. The panel opens below the beaker and scrolls into view only if it is off-screen.
- **R16. No-JS and SSR.** Render the beaker SVG and an `<ol>` of directions on the server. Each label is a link to `/research/[slug]/` until JS upgrades it to a button. The page must stay readable with JS off (the `no-js.spec` patterns).
- **R17. Direction count.** Define the geometry for 3, 4 and 5 live directions (the way `figureState` does), plus the "directions coming soon" empty state, because the site has had 6 directions.

**Homepage sections and research page**
- **R18. People.** Round crops, first names visible, alt = full name. The sentence counts everyone, including people without consented photos. Link to /people for roles. Drop the 8-across lattice test, and add a test that only `photo_consent: true` people render.
- **R19. Featured findings.** Keep the existing `FindingsSection`; it renders only when `home.featured_findings` is filled. That is where an authentic research figure belongs on the homepage once a plate is `plate_verified: true`. Do not use `BastaniPlate` before then.
- **R20. Research page band.** Add B's one-sentence inline key, `id="map"` for deep links, and the figure's existing hover readout. The mobile timeline scrolls sideways inside its own labelled region, and the page itself never scrolls sideways.

---

## 7. Implementation effort and risk in the Next.js codebase

**Effort: medium, about 2–3 focused days including tests (JUDGEMENT).** No content is lost, and no new data pipeline is needed: everything comes from `getContent()` and `buildFigure()`.

**Homepage**
- **`src/app/page.tsx`:** replace `<HomeHero>` + `<PearlFigure>` with a new `<HomeBeaker>`. Keep `FindingsSection`, `PublicationsSection` (in the compact meta-line variant) and `NewsSection` (4 items, beside papers). Restyle `PeopleSection`.
- **`src/components/home/`:**
  - New `BobaBeaker.tsx`: server SVG plus the `<ol>`, driven by `figure.lanes` (slug, label, swatch, counts) and direction `question`/`home_question`/`findings`.
  - A client island, `BeakerIsland.tsx`, of about 150–200 lines, for rise, sink, focus and Esc. C's `c.js` is a direct reference.
  - `home.css` additions.
  - `HomeHero.tsx` shrinks to the copy block.
- **`src/components/figure/`:** reused as is on /research. `DirectionPearl.tsx` naming is reused for the morph.

**Content and schema**
- **`src/lib/content/schema.ts`:** optional `home_question` (max 90) on directions. `findings[]` and `home.featured_findings` already exist. Optionally add `home.why` with a fallback to `mission`, or edit `mission` after sign-off; mission is also the meta description.

**Research page**
- **`src/app/research/page.tsx`:** add the `#map` section with `PearlFigure`. Optionally drop `DirectionStrip` from the ledger rows.

**Tests**
- **`tests/e2e/home.spec.ts`** (416 lines) needs the most rewriting:
  - the section order;
  - "lede: one linked word per direction";
  - "lanes fit the first screen at 1366×768";
  - the people lattice of 8 across.

  Keep the AI-tell probe, no horizontal scroll, no-JS, zero off-origin and axe tests, pointed at the new hero.

  Add tests for:
  - the four labelled pearls being in the first viewport at 390 and 1440;
  - Enter/Space opening the panel with `aria-expanded`;
  - Tab reaching "Explore";
  - Esc sinking the pearl and restoring focus;
  - touch tap;
  - reduced motion leaving 0 running animations.
- **`tests/e2e/figure.spec.ts`** (447 lines): mostly a `page.goto("/")` → `/research/` change, plus scrolling to `#map`. The DOM contract, keyboard, linked highlighting, intro, morph and forced-colours tests carry over. The "intro plays once per session" gate must not collide with the beaker's settle gate, so give them different keys.
- **Other specs:** `research.spec.ts` (new section, and the strips if removed); `motion-and-colors.spec.ts` and `kit.spec.ts` (new tokens).

**Risks**

| Risk | Likelihood | Mitigation |
|---|---|---|
| PI reads the beaker as cute or tea-shop | medium | R4/R5/R14 restraint. Show Prof. Park the preview before polishing. Ready fallback: ink-black pearls that take their colour only when they rise (C NOTES §8.1). Last resort: B's layout. |
| Visitors never discover the reveal | medium | The page is complete without it (§4). R2/R3 affordance. Every label is also a real link without JS. Measure with a real 5-person hallway test, not simulated personas. |
| New copy (why line, short questions, findings) not approved | high in the short term | Ship with fallbacks to the existing `mission` and `question` fields. Findings render only when filled. Flag the copy as draft in the PR. |
| Token cap change (`--t-display`) contested | low–medium | It is a single, scoped token with a documented decision entry (new D-14). Without it, the H1 at 2.25 rem loses dominance and REFS C5 fails. |
| Panel collides at 1200–1300 px or with long questions | medium | The 90-character `home_question` cap, C's `fit()`, and a 1200 px screenshot test. |
| View-transition morph flakiness | low | Name on the wrapper (R9). Navigation always succeeds without it. |
| figure.spec regressions after the move | low | Mostly a URL change. Run the full suite before the preview. |
| Timeline loses visibility it had as the hero | accepted | That is the owner's request. It stays one click away from the homepage and is labelled as exploration. |
| Direction count changes (3 or 5 live) | low | R17 geometry fallbacks plus a test with a fixture of 3 and of 5 directions. |
