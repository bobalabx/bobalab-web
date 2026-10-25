# Concept D: "People & pearls"

Standalone prototype: `index.html` (homepage), `research.html` (where the timeline now lives), `d.css`, `d.js`, `img/` (the 21 consented headshots copied from `public/uploads/people/`), `archivo-latin-wdth-normal.woff2`. `work/build.js` generates both HTML files from tables copied out of `content/**`. `work/shots.js` serves the folder on a random local port and takes the screenshots. Final screenshots are in `shots/`, including `current-site-home-1440.png` / `-390.png` as the baseline. Nothing in the repo was edited.

Labels: **MEASURED** means I saw it in a screenshot or computed it. **HYPOTHESIS** means it is my judgement.

## Concept

The homepage says one thing: *a lab of real people studying how people learn to work with algorithms.* The first screen has three parts:

1. **Statement + lede (who, why).** The h1 is the lab's existing statement (`site.yml`). The first sentence, in bold, names BOBALAB, UC Berkeley Haas and Professor Park Sinchaisri. The next sentence explains why it matters in plain words: apps and AI now hand out gig work, give advice and help with everyday tasks. The lede closes with the mission wording from `site.yml`.
2. **Four directions (what).** A plain list. Each row has a pearl in the direction colour, the direction's short label and a one-line plain-language summary taken from its `summary`.
3. **The lab as a pile of pearls (warmth).** All 25 current members appear as round "pearls" that have settled into a hexagonally packed bed with a ragged top, resting on a 2 px ink floor rule. It reads as boba pearls at the bottom of a cup without drawing a cup.
   - 21 discs are consented headshots.
   - Park (`photo_consent: false`) is the black tapioca pearl with "PS", the same flat disc as the wordmark's O. In dark mode it is a light-ink disc.
   - William Deng, Aaron Tu and Vinayak Sarkar have no photo and get light initials discs, like the initials squares on the live site.
   - The caption reads "The lab today: 25 people. Meet everyone".

## Why it reduces cognitive load (vs the live Fig. 1 hero)

- **No encoding to learn.** The live hero asks a newcomer to decode years, dots, links, rings, the "now" pearl, a grey zone and a 5-line caption (MEASURED: `shots/current-site-home-1440.png`). Here everything on the first screen is already familiar: a headline, a paragraph, a list and faces. Colour is used only as a marker that matches each direction to its row.
- **The five-second test passes at rest** (MEASURED at 1440×900 and 390×844):
  - *Who*: bold first sentence plus the faces.
  - *What*: four labelled rows in plain words.
  - *Why*: the second sentence of the lede.
  - On a phone, all four directions sit above the fold; the pile starts just below it.
- **Fewer homepage sections.** The homepage is: hero, 3 new papers, 4 news items, a two-column "Work with us", and the footer.
  - The 16-tile People grid is gone, because the pile does that job.
  - Fig. 1 is gone (moved, see below).
  - News drops the two items that repeat the new papers.

## How it keeps personality

- **Faces.** Real people are the warmest material the lab has, and nothing about them is generic. The photos keep their own varied backgrounds. I did not apply a duotone treatment.
- **The boba is structural, not decorative.** The pile has the same geometry as the favicon's "pearls on a floor" mark and the wordmark's pearl, so the brand idea grows out of the lab itself. There is no glossy orb, cup, straw, cream page or clay accent.
- **Small playful moments**, all finite, using only transform and opacity, and all switched off under `prefers-reduced-motion`:
  - The pearls drop and settle once, bottom row first, when the pile first scrolls into view. This takes about 1.2 s. MEASURED mid-frame: `shots/home-1440-settle-mid.png`.
  - Hovering the wordmark makes its pearl squash slightly.
  - A direction's pearl dips a little on hover.
- **Friendlier copy**: "Work with us", "The lab today", and "One finding:" in place of journal boilerplate.
- **Kept from the D-13 redesign:**
  - Archivo with a condensed h1, ink on white, and the four direction tones;
  - ruled ledgers with an 18rem label column below the fold;
  - publication entries with authors, venue and direction markers;
  - no cards, pills, mono eyebrows or arrow-links.

## Interactions (progressive disclosure)

| Element | At rest | Hover (mouse) / focus (keyboard) | Click / tap / Enter |
|---|---|---|---|
| Direction row (`<button aria-expanded>`) | pearl, name, one plain line, "+" | Name underlined in the direction colour; pearl dips. People on that direction's **current projects** get a ring in the direction colour; others fade to 55%. The caption names them. | Opens inline, one row at a time: the direction's research **question** (in its colour), **one finding** from a published paper with a citation link, a count line ("4 papers, 1 in progress. With …") and **Explore {direction}** (one click deeper). The rings stay on while it is open. |
| Person pearl (`<button>`, roving tabindex: one Tab stop, then Arrow/Home/End) | face | Lifts 4 px; caption shows "Name, role." | Same as hover (touch). |
| "All our research, and how the four directions connect" | link | | Research page |
| research.html "Show the timeline" (`aria-expanded`) | collapsed | | Reveals Fig. 1. Pointing at a dot dims everything else and names the paper in a live line below. |

- **Touch.** A tap reveals everything that hover reveals (MEASURED: `home-390-open.png`, `home-390-pile-tap.png`). Nothing exists only on hover.
- **Desktop layout stays put.** On desktop the pile's floor is seated, by measurement, on the bottom of the closed directions list. While a row opens the pile stays where it is, so the lit faces stay in view next to the open detail (`home-1440-open.png`).

## What moved off the homepage, and where

- **Fig. 1 research timeline** (years, dots, cross-direction links, now-pearls, rings, legend caption) moves to `research.html` → "Explore: the papers over time". It sits behind a "Show the timeline" button, below the four directions. The figure is redrawn from the live figure's own data (14 dated papers and 7 in-progress items, read from the DOM at localhost:3100). In production, the existing `<PearlFigure>` component would move there unchanged.
- **Long direction text** (summary, question, counts) moves to the Research page list. The homepage shows only the plain one-liner until a row is opened.
- **Archived directions** (Pricing & Experiments, Cities) move to a short "Earlier work" ledger on the Research page.
- **People grid with roles** moves to the People page. On the homepage, names and roles are one hover or tap away.

## Content honesty and limits

- **Linking people to directions.** Every person file has `directions: []`. The "who works on this" link comes only from `content/projects/*.md` → `team`, so each direction lights just 2–3 current members:
  - Algorithmic Advice: William Deng and Park.
  - AI at Work: William Deng and Park.
  - Learning on the Job: Ryan Jesubalan, William Deng and Park.
  - Platform Work: William Deng and Park.

  The caption says this precisely: "… work on its current projects". If the lab fills `directions` on people records (the CMS field already exists), this effect gets richer with no code change.
- **Findings.** The "One finding" texts are close paraphrases of each paper's `in_brief`: Bastani 2026, Keppler 2025, Jiang 2025 and Allon 2023, all published. They need the same PI sign-off as other copy (D-13 item 7).
- **Placeholder links.** Links to Publications, People, News, About and similar are `#` placeholders in this prototype.

## Accessibility (MEASURED)

- **Contrast**, computed against the background:

  | Text | Light (on #fff) | Dark (on #101210) |
  |---|---|---|
  | Direction tones | 5.11–8.48 | 6.85–11.67 |
  | Muted text | 7.54 | 8.12 |
  | Initials discs | 6.77 | 7.04 |
  | "PS" on the black pearl | 18.56 | 15.5 (on the light pearl) |

- **Focus:** a visible 2 px ink outline. The person pearls get a ring.
- **No horizontal overflow** at 390 px, with every row open.
- **Target size:** standalone links are at least 24 px tall.
- **Images:** headshots use `alt=""` because each button's `aria-label` already gives the name and role. The pile is a labelled list.
- **No-JS:** all text and links render without JS. The detail panels need JS (`hidden`), as does the live site's figure.

## Risks

1. **Faces date quickly.** The pile depends on keeping photos and consent current. It is driven by `people/*.md` (current members with `photo_consent`), so the CMS keeps it up to date. But a lab with few consented photos would look sparse.
2. **The PI has no photo.** The black "PS" pearl is a deliberate brand move. It could still read as "missing photo". A consented portrait of Park would make the hero stronger (HYPOTHESIS).
3. **Lighting implies the others don't do research.** Fading non-team members could suggest that the undergraduate RAs work on nothing, because RA assignments are not recorded in the content. I mitigated this with soft fading and precise caption wording. Alternative: rings only, no fading.
4. **Pyramid reading.** An earlier version put Park alone at the apex of a triangle, which read as a hierarchy or a billiard rack (MEASURED, early screenshot). The bed shape fixes this, but any reshuffle should avoid a single disc on top.
5. **Hero length on desktop.** The hero fills 1440×900 almost exactly. A longer lede or a fifth direction would push the floor below the fold.
6. **Less "research-forward" than Fig. 1.** A visitor sees *who* before *what was published*. The research depth is one click away on the Research page, but anyone who valued the timeline as the lab's signature will notice it is gone from the homepage.
