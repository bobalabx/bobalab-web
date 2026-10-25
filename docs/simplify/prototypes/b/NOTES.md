# Concept B: "Questions first"

Standalone prototype. Files: `index.html` (homepage), `research.html` (where the timeline went), `b.css`, `b.js`, `research.js`, `archivo-latin-wdth-normal.woff2` (copied from `src/fonts`), `photos/` (consented headshots copied from `public/uploads/people`). Nothing in the repo was edited.

To view: serve this folder over http (fonts are blocked on `file://`), e.g. `node work/serve.js <this folder> 3472`, then open http://127.0.0.1:3472/.

Screenshots are in `shots/`:
- `home-1440-{light,dark}.png`, `-full`, `-hover`
- `home-390-{light,dark}.png`, `-full`, `-tap`
- `research-1440-light.png`, `-full`
- `compare-current-vs-b.png` (current live redesign beside B)
- `current-home-*.png` (the current build at localhost:3100)

## Concept

The homepage says in plain words what the lab does and why, then asks the four research directions as four human questions. Each question has one small pearl, and the four pearls sit on a single ink line across the page. Personality comes from voice, type and rhythm, not decoration. Depth is one hover or tap away, and the full picture is one click away.

First screen, top to bottom:
1. **Who.** "BOBALAB is the Berkeley Operations and Behavioral Analytics Lab, Prof. Park Sinchaisri's research group at the Haas School of Business, UC Berkeley." This is `about.yml` intro, reworded.
2. **What.** A display statement: "We study how people learn to work with algorithms." The full stop is a pearl, the same disc as the wordmark's O. The source is `home.yml` `statement`.
3. **Why.** One lede that names concrete stakes: gig apps, algorithmic advice, AI beside teachers. It then says what the lab does about them (field data and experiments) and why: "so they serve the people who use them". This is `home.yml` `mission`, made concrete with facts from `content/directions`.
4. **Four questions we keep asking.** One plain question per live direction, threaded on one line by four pearls in the direction colours.

Below the fold, kept short:
- **Inside a study.** One feature in a direction-tint band: the virtual-kitchen experiment (Bastani, Bastani & Sinchaisri, *Management Science* 2026). It has the real study-design schematic (orders as chop→cook→plate pearls, Phase I → R → four arms) and a three-step "Step through".
- **New papers (3) | News (4).** Side by side.
- **The people.** One sentence, the URAP and email route, and 21 consented headshots cropped as circles (pearls) with first names.
- Footer.

## Why it reduces cognitive load (measured on the first screen)

| | Current (localhost:3100) | B |
|---|---|---|
| 1440×900: visible words | 255 | 155 |
| 1440×900: encoded marks to decode (dots, rings, pearls, links) | 41 + year axis + 70-word legend | 4 pearls, nothing to decode |
| 390×844: words / marks | 116 / 7 | 106 / 1 |

Method: `work/count.js`. The current-build word count includes the 13-word preview ribbon.

- **Nothing on the homepage needs a legend.** Colour only says "this is a different direction", and every pearl has its name next to it. The paper dots appear only on hover or tap, and always next to a sentence that spells them out ("4 papers, 2 in progress").
- **The questions do the explaining.** A stranger can answer "What would I learn here?" from the questions alone, without knowing the category names.
- **One feature instead of a directory.** There is one study, one figure and three papers. Lists, counts and relationships moved to subpages.
- **Fixed rhythm.** The first screen has four blocks on a four-column grid. The lede starts on column 3, which lines up with question 3. Fewer alignment lines for the eye to track.

## How it keeps the current site's strengths and brings back personality

**Kept:**
- Archivo as the only family, with the wdth/wght axes.
- The P3 colour tokens: ink on white, and the four tea swatches as the only colour.
- Underlined ink links, 1–2 px rules and no cards or pills.
- Publication list typography.
- The real study-design figure, with its "not data" caption.
- Consented photos only.

**Added:**
- A larger display size (`--t-hero`, up to 5 rem). The P3 scale stops at 2.25 rem. This is a deliberate token change.
- A second-person, conversational voice ("Four questions we keep asking", "Can one short tip make people better at a hard, multi-step job?").
- The pearl as punctuation in the statement.
- Pearls threaded on a line. This echoes the wordmark and the timeline, which is still on the Research page, so the homepage hints at it.
- A tea-tint band.
- Round headshots that read as a row of boba.

**Avoided** (DIRECTION.md §1): cream + brown, Fraunces/Inter, pills, rounded cards, mono eyebrows, arrows on links, glossy orbs and halos. The pearls are flat discs. Eyebrows are sentence case in Archivo.

## Interactions (progressive disclosure)

All motion is transform and opacity only, finite, and turned off under `prefers-reduced-motion`.

- **Load.** The four pearls and the h1's pearl full stop "settle" (drop and land with a small overshoot, 0.8–0.9 s, staggered). After that the entrance class is removed.
- **Question, desktop.**
  - Hover or keyboard focus reveals a panel under the question: the paper dots pop in one by one with the count, then the summary (`directions/*.md` `summary`), then "More on ...", which links to the direction page. It is absolutely positioned in space reserved below the line, so nothing shifts.
  - The other questions fade to `--muted` (contrast stays 7.5:1), and the active pearl bobs once.
  - A click pins the panel open. Escape closes it and returns focus.
- **Question, phone.** It becomes an accordion: tap to open one (the others close), with a chevron.
- **Semantics.**
  - Each question is a `<button aria-expanded aria-controls>`.
  - The revealed link is a real link, and Tab reaches it from the button.
  - Hidden panels use `visibility:hidden`, so they are not focusable until shown.
- **Study figure.** A "Step through" button walks three steps: orders arrive → each order splits into subtasks → tips, randomisation, four groups. The step note is `aria-live`. At rest the whole design shows.
- **Wordmark.** The O-pearl lifts on hover or focus.
- **Research page timeline.**
  - Hover, focus or tap a dot or ring to name the paper in a live caption. The other marks dim.
  - Every mark has a 12–13 px hit circle that is focusable (`role=button` with an `aria-label`).
  - On phones the figure scrolls sideways inside its frame. The page never scrolls sideways.

Tested in `work/test.js` with Playwright, all PASS:
- Tab reaches the questions, and focus reveals the panel.
- Enter → `aria-expanded=true`. Tab goes into the link. Escape closes the panel.
- Step-through cycles.
- Touch taps reveal and close.
- No horizontal scroll at 1440 or 390.
- Timeline hover and focus.
- Reduced motion → no animation.

## Contrast (WCAG 2.2 AA, computed)

**Light:**
- ink on paper: 18.6
- muted on paper: 7.5
- muted on the pea-tint band: 6.7
- pea / lychee / matcha / oolong on paper: 7.5 / 7.0 / 5.1 / 8.5
- figure blue on its band: 6.7

**Dark:**
- ink: 15.5
- muted: 8.1
- muted on the band: 7.0
- light swatches: 6.8–11.7

Rules (3.7 light, 4.7 dark) are non-text.

Inline links in sentences fall under the WCAG 2.5.8 inline exception. Footer list links were padded so that each is at least 24 px tall.

## What moved off the homepage, and where

| Was on the homepage | Now |
|---|---|
| Fig. 1 timeline: years, dots, cross-direction links, black pearls, open rings, legend | **Research page → "Explore: how the four lines grew, and where they meet"**: the same encoding, with a one-sentence inline key and a live caption (`research.html`, `research.js`; data from the live Fig. 1) |
| Per-direction counts and "Shares N papers with ..." | The counts appear only in the question reveal. The "shares" relationships are in the timeline and on the direction pages. |
| Lede listing four colour-coded direction links | Replaced by the four questions |
| Long affiliation block | One "who" sentence |
| 16 large people tiles | 21 small circular faces plus one sentence. Full roles stay on /people. |
| 5 news items | 4 |

**Research page:**
- The four directions in full: short question, `summary`, the content `question` as "For example:", and three recent papers each.
- Then the timeline.
- Then "Earlier research", which covers the two archived directions.

## Content and CMS implications (no invented facts; flagged copy)

- **New copy needing lab approval:**
  - The four short questions.
  - The homepage lede.
  - "Four questions we keep asking".
  - "Inside a study".
  - The feature headline "Can one short tip make people better at a hard, multi-step job?".

  Each is a paraphrase of `content/directions/*.md` (`question`, `summary`) or of the paper's `in_brief`.
- **Suggested CMS additions:**
  - an optional `home_question` on each direction (short, at most about 90 characters);
  - `home.yml`: `lede`, and `feature: <publication slug>`.

  Everything else uses existing fields.
- **Data used:**
  - The counts (4/2, 5/2, 4/1, 6/2; 17 papers; 25 members and 25 alumni) are read from the current build on 24 Oct 2026.
  - The faces are the 21 people with `photo_consent: true`. The PI has no consented photo, so he is named and linked in text.
- **The study figure** comes from `BastaniPlate`. On the current site it is marked "Draft figure, pending author check" (`plate_verified` false). It must not ship on the public homepage until it is verified, and the fallback is the feature without the figure.

## Risks

- **Hover reveal needs reserved space on desktop** (about 150 px under the questions). At rest this reads as generous whitespace, but a full-page screenshot shows a gap. Alternative: show the dot strip and count at rest, at a small cost in load.
- **Hover discoverability.** Nothing says "hover me". The only cues are the pointer cursor and the colour underline that grows under a question. Two things mitigate this: the questions make sense without the reveal, and the Research link in the nav leads to the same depth.
- **The questions need upkeep.** If a direction changes, someone has to rewrite its question. That is why a CMS field is needed rather than hard-coded copy.
- **The text-led approach is less "visual" than a pearl-figure hero.** The memorable element is small: the threaded pearls and the pearl full stop. Someone who wants a big signature graphic may find B too quiet.
- **Display type above the token scale** breaks the "nothing above 2.25rem" rule in `tokens.css` and its tests, so it needs an owner decision.
- **The study band uses a direction tint** (`--dir-tint` pea). If the featured study changes direction, the band colour changes with it.
- **Prototype limits.** Links to the publication, people and news pages point at the live GitHub Pages paths. News items link to /news/, not to each item. The research-page timeline at phone width is a horizontal-scroll sketch and has not been polished.
