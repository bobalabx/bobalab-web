# Concept C: "The beaker"

A standalone static prototype (HTML, CSS and vanilla JS; no build step). Nothing in the repo was edited.

- **Pages:** `index.html` (homepage) and `research.html` (where the timeline went).
- **Code:** `c.css`, `c.js` (the beaker), `research.css`, `map.js` (the research map).
- **Assets:** `fonts/` (Archivo woff2 + OFL, copied from `src/fonts/`), `img/` (the 21 consented photos from `public/media/people/`), `favicon.svg` (copied from `src/app/icon.svg`).
- **Screenshots:** in `shots/`.
- **Preview:** any static server rooted at this folder. I used `node …/c-tools/serve.js` on 127.0.0.1:3931. Opening the files over `file://` also works.
- **Labels:** MEASURED = I computed it or saw it in a screenshot. HYPOTHESIS = my judgement.

## 1. Concept

**The idea.** BOBALAB is a lab and boba is a drink, so the home figure is a **lab beaker of milk tea**. It is drawn as a fine-line, museum-style cross-section: the beaker wall and a flared rim, graduation ticks, a wide boba straw cut on the slant, and a tea surface with a meniscus. The lab's four research directions are four tapioca pearls resting on the floor of the beaker.

**How the labels work.**
- Each pearl sends one thin line, in its direction's colour, straight up and then out through the glass wall to a plain-text label. This is the way exhibition drawings label a specimen.
- That line also plays a second role: it is the path the pearl travels when it rises.

**How a pearl reveals a direction.** Choose a pearl (click, tap, Enter or Space):
- It **rises** (buoyancy) to the surface.
- The line follows it, and a surface leader draws out to the right.
- The direction's full name appears, then its **research question** in large type, then one paper to read first and a link: "Explore ‹direction›" with its paper count.
- The other pearls and lines step back.
- Choosing the pearl again, or pressing Escape, lets it sink back.

**What the first screen holds.** One headline, two sentences, two links, and the drawing with four words-labels. There is no legend, no year axis, no dots and no rings.

## 2. Five-second test (first screen only, no scrolling, no interaction)

MEASURED from `shots/home-1440-light.png` and `shots/home-390-light.png`. All of the following are above the fold at both 1440×900 and 390×844.

| Question | Answered by |
|---|---|
| **What** | The h1 "How people learn to work with algorithms" (from `content/pages/home.yml`), plus the four direction labels in plain words. |
| **Who** | "BOBALAB is a research lab at UC Berkeley's Haas School of Business, led by Prof. Park Sinchaisri." |
| **Why it matters** | "Algorithms now assign gig work, give advice and help teachers plan lessons. Using field data and experiments, we study how people learn and decide alongside them, so that work with AI goes better for people." |

The why-copy is paraphrased from the mission and the direction texts. **It needs PI sign-off.** Every example in it comes from `content/directions/*.md`.

**Element count on the first screen:** about 8 things to parse. They are the wordmark, the nav, the h1, the who-line, the why-line, the beaker with its four labels, the hint, and two links. The current home (`shots/current-live-1440-light.png`) needs about 30. It has a 4-lane × 14-dot chart, a year axis, 5 cross-links, 4 "now" pearls, 7 open rings, and a 5-sentence legend that is needed to read it.

## 3. Why it reduces cognitive load (HYPOTHESIS, argued)

- **One encoding instead of six.** A pearl is a direction. That is the whole key. Colour still only encodes direction, as in D-13, and the same small pearl dot reappears beside every paper in "New papers". The colour therefore teaches itself, with no legend.
- **Labels are words next to the thing.** There is no lookup. The leader lines are the familiar "callout" convention from textbooks and museum panels.
- **One affordance, one verb.** "Pick a pearl." Hovering lifts a pearl slightly to signal that it can be picked. Picking is the only action, and it reveals exactly one thing: a question in plain words.
- **Depth is opt-in and one click away.** The panel gives the question, one paper and "Explore ‹direction›". Research has the full directions list, and the map sits behind a disclosure.
- **The page is shorter.** The homepage is hero → Lately (3 papers and 4 news items, side by side) → People (one strip of photos and two sentences) → footer. It drops the 25-tile people grid, the five-row news log with direction tags, and the legend-dependent figure. MEASURED full page: 2047 px tall at 1440 wide; the current page is 3042 px.

## 4. How it keeps personality (HYPOTHESIS)

- **The pun carries the identity.** Boba in a lab beaker is the lab's name drawn as a picture, and it is original to BOBALAB. Even a heavily stylised boba cup from a tea shop would never have graduation ticks.
- **Playful, but restrained.**
  - The pearls settle once on first load, then the labels fade in.
  - The chosen pearl rises with three small bubbles.
  - The wordmark's pearl-O lifts a little on hover.
  - All of this is finite and uses transform and opacity only. There are no loops, no floating and no gloss.
- **One warm tone, used only inside the drawing.** The tea is #F4ECE2 in light mode and #211C17 in dark mode. The page stays white on ink per D-13, so this does not bring back the cream-and-brown kit.
- **The direction colours are named after tea flavours** (butterfly pea, lychee, matcha, oolong), so the pearls really are flavours. Worth a footnote on About.
- **Friendlier copy** ("Pick a pearl to see the question behind it", "The people", "A first read").
- **Real faces in one strip.** The news list keeps "Park Sinchaisri wins a second Cheit Teaching Award".

### What it keeps from D-13

- Archivo only: condensed for the h1 and lane names, normal width elsewhere.
- The same tokens.
- Ink-underlined links and ruled ledgers for papers and news.
- No cards, pills, eyebrows, glossy orbs or arrow-on-every-link.
- The B●BALAB wordmark, rebuilt as inline SVG from `wordmark-geometry.ts`.
- The favicon.

## 5. Interactions

| Input | Result |
|---|---|
| Hover a pearl or its label (mouse) | The pearl lifts about 6 px and the label gets an underline in its direction colour. Hover deliberately does **not** open the panel: the path from a low label up to the panel's link crosses the other labels, so hover-to-open would keep switching the selection. |
| Click or tap a pearl or its label | The pearl rises, the panel opens, and the button gets `aria-expanded="true"`. Clicking the same one again closes it. |
| Keyboard | Tab reaches the four labels (they are real `<button>`s; the focus ring is drawn on the label and the pearl lifts). Enter or Space opens a direction. The panel is placed in the DOM right after its button, so the **next Tab lands on "Explore ‹direction›"**. Escape closes the panel and returns focus. MEASURED: 10 Tabs from page load to the first pearl, after skip link, wordmark and nav. |
| Touch (390 wide) | A tap reveals what a click reveals, and the panel scrolls into view if it is below the fold. The pearl's hit area is padded to about 48 px and the label buttons are 28 px tall (WCAG 2.5.8: 24 px or more). MEASURED: pearl 27 px, label 137×28 px. |
| Reduced motion | No intro and no bubbles, and transitions are instant. MEASURED: 0 running animations at load and after a click. |
| No JS | The beaker is drawn from an ordinary `<ol>` of directions (name link, question, first read). Without JS that list shows instead. |
| Research map | Hover or focus a dot or ring to name the paper in a live readout; the other lanes dim. `#map` (the homepage link) opens the disclosure. |

### Responsive behaviour

| Width | Layout |
|---|---|
| 1200 px and up | Text column on the left, beaker stage on the right. The panel sits between the tea surface and the label stack. `fit()` drops "A first read", and then shrinks the question, if the panel would collide with the labels. MEASURED at 1200×800 (`shots/home-1200-pearl-risen-compact.png`). |
| 768–1199 px | Two columns, using the squat geometry; the panel sits below the beaker (`home-1024…`, `home-768…`). |
| Under 768 px | Stacked; the squat beaker sits on the first screen. |

## 6. What moved off the homepage, and where

| Was on the home page | Now |
|---|---|
| Fig. 1 timeline (years, dots, cross-links, now pearls, rings, legend) | **Research → "How the four directions connect"**, behind an "Open the map" disclosure, with the full encoding and caption. `research.html#map` opens it, and the homepage hint links there. The code is a simplified rewrite of the P3 figure using the same data (14 dots and 8 rings, matching the live site's counts). |
| Lede sentence listing the four directions as coloured links | The four pearls and labels. |
| Recent publications (3 rows with full right-hand metadata) | "New papers": 3 ruled rows with title, authors and one meta line (status, venue, year, pearl dots). Links: "All 17 papers and 8 in progress". |
| News log (5 rows with direction tags) | 4 one-line items beside the papers, with "All news". |
| People grid (25 tiles with names and roles; initials tiles where there is no photo) | One strip of the 21 consented photos (alt text = name) and one sentence about who is in the lab. The full directory stays on People. |
| Direction detail (question, summary, papers) | The question and one paper appear in the beaker panel. Question, summary, three key papers and counts appear on Research. Everything else stays on the direction pages. |
| Archived directions | One line at the foot of Research. |

## 7. Accessibility (MEASURED)

**axe-core** (wcag2a/aa, 21a/aa, 22aa, best-practice) reports 0 violations on:
- the home page: 1440 light, 1440 dark with a pearl open, 390 light with a pearl open;
- Research with the map open: 1440 light and 390 dark.

**Contrast ratios:**

| Pair | Light | Dark |
|---|---|---|
| Ink on paper | 18.6 | 15.5 |
| Muted on paper | 7.5 | 8.1 |
| Direction-coloured titles on paper | 5.1–8.5 | 6.9–11.7 |
| Pearls and leader lines on tea | 4.4–7.3 | 6.2–10.5 |
| Dimmed pearls on tea (80% mix) | 3.1–4.5 | 4.4–7.2 |

All of these meet AA, and every non-text element is at least 3:1.

**Other checks:**
- Every control is a real `<a>` or `<button>`, and focus is visible.
- There is no horizontal page scroll at 390 px. The map scrolls sideways inside its own labelled region.
- Forced-colours fallback: pearls and lines use CanvasText.

## 8. Risks and open questions

1. **Cute risk.** A cup of boba can tip into a shop logo.
   - Mitigations: one stroke weight, no shading or gloss, the beaker's graduation ticks, flat matte pearls, and annotation typography.
   - A PI glance is the real test. If it still reads as cute, the fallback is ink-black pearls (true tapioca) that take on their colour only when they rise.
2. **The coloured pearls at rest can read as a chart legend.** Mitigations: the leader lines go to words, and there is no axis. HYPOTHESIS: acceptable, and better than the timeline.
3. **The question copy is study-specific.** For example, AI at Work's "What kinds of help do teachers ask ChatGPT for…" is narrower than the direction as a whole. The content model's `question` field is used verbatim; the lab may want broader questions for the home page.
4. **The panel squeezes on 1200–1300 px widths.** `fit()` handles it by dropping the "first read" line. If questions get longer in the CMS, more will collapse. A character budget on `question` (about 140) would be safer.
5. **Hover does not open the panel.** This is a deliberate trade-off (see §5); the brief asked for hover to reveal more. Hover gives the lift and underline cue, and the click/tap/Enter reveal is the same for every input.
6. **Unconfirmed lab facts.**
   - The "why" sentence and "working with co-authors at other universities" are my paraphrase of content. They need PI review.
   - The counts (17 papers, 8 in progress, 4/5/4/6, a master's student and 23 undergraduates) match the live site and `content/people`.
7. **Implementation cost in the Next.js app.** It would be a new home `Hero` island of about 170 lines of JS. Data comes from `content/directions` (`question`, `short_label`, `title`, colour) and the existing counts. The "first read" needs a new optional `featured_paper` on directions, or the newest published paper by rule. The map can reuse the existing `PearlFigure` on `/research` almost unchanged. The current figure code does not need to be rewritten.
8. **Map on phones.** It scrolls sideways and the lane names scroll with it. A narrow layout (sticky names, or a vertical version) is future work.

## 9. Screenshots (`shots/`)

| Group | Files |
|---|---|
| Home 1440 | `home-1440-light.png`, `home-1440-light-pearl-risen.png`, `home-1440-dark.png`, `home-1440-dark-pearl-risen.png`, `home-1440-light-full.png`, `home-1440-dark-full.png` |
| Home other widths | `home-1200-pearl-risen-compact.png`, `home-1024-pearl-risen.png`, `home-768-light.png` |
| Home 390 | `home-390-light.png`, `home-390-dark.png`, `home-390-light-full.png`, `home-390-dark-full.png`, `home-390-tap-revealed.png`, `home-390-menu-open.png` |
| Motion | `motion-1-intro-250ms.png` (pearls settling before labels), `motion-2-hover-lift.png`, `motion-3-rise-350ms.png` (mid-rise, with bubbles) |
| Keyboard | `a11y-keyboard-focus.png` |
| Research | `research-1440-light.png`, `research-1440-light-full.png` (map closed), `research-1440-map-open-light.png` (hovering a shared paper), `research-1440-map-open-dark.png`, `research-390-light.png` |
| Comparison | `current-live-1440-light.png`, `current-live-390-light.png` (localhost:3100, the current redesign) |
