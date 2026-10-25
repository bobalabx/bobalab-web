# Concept A, "Four Pearls": prototype notes

Standalone static prototype. HTML, CSS and a little vanilla JS, with no build step. The `tools/build.js` script only expands shared partials: the wordmark, the pearl SVG, the header and the footer.

- **Pages:** `index.html` (the homepage) and `research.html` (where the timeline now lives).
- **Run:** `python -m http.server 3217 --bind 127.0.0.1` in this folder, then open http://127.0.0.1:3217/. Over `file://` everything works except the cross-page pearl morph, because view transitions need an http origin.
- **Rebuild after editing `src/*.src.html`:** `node tools/build.js`.
- **Screenshots:** `shots/`. `compare-current-vs-A.png` puts the live site's first screen next to this concept.

Evidence labels: **MEASURED** means a script or screenshot checked it. **JUDGEMENT** means it is my opinion.

## 1. Concept

The first screen has three parts.

1. **One big headline,** which is the lab's own statement from `content/pages/home.yml`: "How people learn to work with algorithms".
2. **One plain sentence that says who, what and why:** "BOBALAB is Prof. Park Sinchaisri's research lab at UC Berkeley's Haas School of Business. We study how people learn, decide and work alongside algorithms and AI, from gig drivers to teachers, to improve how people and AI work together." Every clause is drawn from `about.yml`, `home.yml` (the mission) and the direction files.
3. **Four large tapioca pearls,** one per live research direction. They are stacked the way pearls settle at the bottom of a cup: three rest on a single ink rule (the "floor"), and one sits on their shoulders.
   - This pile is the lab's own favicon and ShoulderMark motif (`src/components/brand/PearlMark.tsx`, `SHOULDER`) blown up to hero scale. So the hero is the brand mark, and the brand mark is the research.
   - Each pearl has a plain name and a short gloss in everyday words, such as "AI at Work: How professionals really use AI".
   - Each pearl is tinted with the boba flavour its CMS swatch is already named after: butterfly pea, lychee, matcha and oolong. A footer line says so. That line is a small wink for people who read footers, and it is the only place the code names appear.

The material is a matte, slightly translucent tapioca:
- a deep tinted body with a very soft off-axis light;
- a faint translucent rim on the lower right;
- a fine grain from SVG `feTurbulence`.

There is no specular highlight, halo, numeral, drop shadow or gloss. DIRECTION.md §1 names all of these as AI tells, and the pearls avoid them.

## 2. Why it reduces cognitive load

**MEASURED** from the screenshots and the DOM:

| First screen at 1440×900 | Current site | Concept A |
|---|---|---|
| Visual encodings a stranger must decode | 7: coloured dot, open ring, black pearl, vertical link, lane line, the dashed "now" line plus the shaded zone, and the year axis | 1: a pearl is a research direction, and the pearl's label says so |
| Figure legend or caption needed | yes, 5 lines (Figure 1) | none |
| Marks in the figure | 17 dots, 8 rings, 4 pearls and 5 links (34 marks) | 4 pearls |
| Text blocks | H1, a 4-line descriptor, a mission paragraph with 4 inline legend links, 6 axis labels, 4 lane titles with counts, and a 5-line caption | H1, one sentence, 4 names with glosses, and one hint line |

**JUDGEMENT on the five-second test.** The first screen answers "who" twice: in the sentence, and in the wordmark next to the Haas and Berkeley names. It answers "what" twice: in the headline, and in the four pearl names with their glosses. It answers "why" in the sentence's purpose clause. None of this needs a hover, a scroll or a legend, and it holds at 390×844 as well (see `shots/home-390-light.png`).

## 3. Progressive disclosure: the interactions

Every motion uses transform and opacity only. Every motion ends: there are no loops. Reduced motion turns all of them off.

- **At rest:** four pearls with their names. One quiet hint line explains the interaction. It reads "Point at one…" on devices that can hover and "Tap one…" on touch devices.
- **Hover with a mouse, or keyboard focus:**
  - The chosen pearl lifts slightly. The other three fade back to a milky tint, and their names turn muted (the text stays at AA).
  - The pearl's papers fly out as small **seeds** along an arc of free space beside it, one seed per paper. Filled seeds are papers; open seeds are work in progress.
  - The reading panel, which sits beside the pile on desktop and under it on mobile, shows the direction's research question, the seeds again with "4 papers, 2 in progress" written next to them, and an "Explore …" link. The open-versus-filled encoding is explained by the words right beside it, so no legend is needed.
  - The O in the header wordmark tints to the chosen flavour.
- **Pointing at a seed** names that paper and its year in the panel.
- **Touch:** the first tap shows what hover shows. A second tap on the same pearl, or the panel link, goes deeper. A tap outside closes the reveal, and so does Esc.
- **Click:** a cross-document View Transition morphs the clicked pearl into that direction's pearl on the research page (`shots/morph-1440-mid.png` and `morph-1440-end.png`). In production this would land on `/research/[direction]/`. The current site already has a pearl-to-direction morph, which AUDIT M3 called "the site's best moment", so this keeps it. Browsers without view transitions simply navigate.
- **First visit:** the pearls settle into the cup once, in about 0.7 s. The bottom row lands first, then the top pearl. The sessionStorage flag is read inside try/catch, and the settle is skipped under reduced motion.
- **Accessibility:**
  - Pearls are real `<a>` links, and each one's question and counts are attached with `aria-describedby`.
  - A visible focus ring is drawn around the focused pearl.
  - Hit targets are at least the size of the pearl.
  - Keyboard order: skip link, wordmark, nav, then the pearls in reading order.
  - Without JS the pearls are plain links and the hint line is hidden.
  - Under forced colours the pearls become CanvasText.

**Functional checks:** `tools/func.js` (**MEASURED**, 0 page errors):
- the first tap reveals and the second tap navigates to `research.html#learning-on-the-job`;
- a tap outside closes the reveal;
- the tab order is as listed above, focus reveals, Esc closes and Enter navigates;
- reduced motion means no settle;
- with no JS, the 4 links work;
- the timeline toggle draws 26 dots, and hovering a shared dot names the paper and both directions.

There is no horizontal page scroll at 390 or 1440 on either page.

## 4. Contrast

`tools/contrast.js` checks WCAG 2.2 AA. **MEASURED:** 29 of 29 pass.

- **Text:** the lowest ratio is matcha #4c7a1e on white, at 5.11:1, used for the direction name in the panel. Muted text on the band colour is 6.77:1.
- **Pearls as graphics, at least 3:1 against the page:**
  - The light-mode pearl edges are at least 13:1.
  - In dark mode the pearls are lighter tapioca tints. The edge colours were raised until they pass: the lowest is lychee, at 3.25:1.
  - Seeds use the token deep/light direction colours.

## 5. What moved off the homepage, and where

| Was on the homepage | Now |
|---|---|
| Fig. 1, the research timeline: years, dots, cross-direction links, black pearls, open rings and the legend | `research.html` § "Explore how the work connects". It is behind a "Show the timeline" button (`aria-expanded`), or open directly at `research.html?timeline`. The timeline was redrawn from the same data, in the same encoding, with a hover readout and a legend. Nothing was deleted. Its "now" pearls are now flavour-tinted tapioca instead of black discs, so they match the home pile. |
| The mission paragraph with four inline legend links, and the 4-line institutional descriptor | Folded into one sentence. The full lab name stays in the footer. |
| The "shares N papers with…" relationships | The timeline links and the hover readout on /research. On the homepage, shared papers simply appear as seeds of both pearls. |
| Three paper entries with abstracts, link rows and a direction column | "New papers": title, authors, venue and year, plus a small flavour-dot direction tag. No abstracts. |
| 16 people tiles (two of them "PS" and "WD" placeholders) | "The people": one sentence that credits the PI with his title, then 14 round consented headshots (the pearl proportion) with names. The full directory moves to /people. The placeholder tiles are gone from the homepage. |
| 5 news rows with direction tags | "Lately": 3 dated rows with no tags. |
| (new) | **"Inside a study":** one real research figure, the virtual-kitchen study design from Bastani, Bastani & Sinchaisri (2026), redrawn as a small diagram. Its subtasks are pearls, so the motif carries on. The caption says it is redrawn from the paper's description and not from data. |
| (new) | **"Work with us":** one warm line about URAP plus the lab email, from `join.yml`. |

## 6. How it keeps personality without the AI kit

- **Kept:**
  - the current type system (Archivo, condensed only at display sizes);
  - ink on white;
  - no cards and no pills: lists are rules and hairlines, and the one tinted block is the join band;
  - links are plain underlines with no arrows, and there are no mono eyebrows;
  - real faces;
  - a real study figure.
- **Added warmth:**
  - the pile itself, which reads as tapioca at the bottom of a cup and doubles as the lab's mark;
  - the flavour tints, which are the CMS swatch names made literal;
  - friendlier copy: "from gig drivers to teachers", "Lately", "Work with us";
  - the wordmark O borrowing the flavour you point at;
  - a one-time settle on arrival.

  None of these is a cream page, a clay accent, Fraunces or Inter, a rounded card, a glossy orb or a halo.

## 7. Risks and open questions

1. **Toy or professional (JUDGEMENT).**
   - In light mode the dark, matte pearls read as tapioca.
   - In dark mode they have to be lighter to reach 3:1, and they drift toward "coloured balls". A designer should tune the dark tints, or flatten the dark-mode light further.
   - The faded "milky" state of the other pearls on hover reads as milk tea to me. Some reviewers may find it washed out.
2. **The gradient and the grain are decoration.** P3 deliberately went flat (D-13). If Prof. Park prefers the flat ink pearl of the current wordmark, the same layout works with flat discs: delete the rim and grain circles in `pearl()`.
3. **The pile has a hierarchy that the content does not.** Algorithmic Advice sits on top only because it is first in `direction_order`. Visitors may read "top" as "main". One alternative is a single row on the floor, which loses the motif. Another is to let `direction_order` choose the top pearl and say nothing about it.
4. **The geometry assumes exactly 4 live directions.** The site has had 6 directions, 2 of them now archived. Three pearls (a row) and five (3 + 2) need defined fallbacks, the way the current figure has `figureState`.
5. **Seeds stay subtle.** They are small, and on a phone they are about 7 px. They are decorative there, because the counts and titles are also given as text. Do not make anything depend on tapping a single seed.
6. **The lede is about 6 lines on a phone.** Shortening it to two sentences of about 25 words would help the five-second test on mobile.
7. **The touch "first tap reveals" pattern** is a known convention, but some visitors will expect the first tap to navigate. The panel's "Explore …" link and the hint line soften this.
8. **The view-transition morph only works when the pearl's wrapper element carries the name.** Putting the name on the `<svg>` itself aborted the transition in Chromium 156 ("invalid state"). A morph run that took 0 ms after a cold load was skipped once in five runs. In both cases the navigation itself still succeeds.
9. **Counts and paper lists are hard-coded** in `home.js` and `research.js`, taken from the current home Fig. 1 DOM and `content/**`. In the real build they would come from `buildFigureModel` and the direction counts, so they cannot drift.
10. **Not built:** the direction page itself (the morph target) and the people, publications and news pages. Those keep the current redesign's templates.

## 8. Files

- `index.html`, `research.html`: the built pages. Edit `src/*.src.html` instead.
- `site.css`: tokens taken from `src/styles/tokens.css`, plus the flavour tints, header, footer and the shared pearl.
- `home.css` and `home.js`: the pile, seeds, reading panel, settle and morph source.
- `research.css` and `research.js`: the direction list, the morph target and the optional timeline.
- `fonts/archivo-latin-wdth-normal.woff2`: copied from `src/fonts`.
- `img/*.webp`: 14 consented headshots, copied from `public/media/people`.
- `tools/`:
  - `build.js`;
  - `shot.js`, which takes a screenshot of a page, viewport, colour scheme and interaction;
  - `func.js`, the interaction checks;
  - `contrast.js`;
  - `morph.js`;
  - `compare.html`.
- `shots/`: the final screenshots, including `current-home-*.png` for comparison.
