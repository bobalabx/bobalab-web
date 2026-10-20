# JUDGE: Fig. 1 hero prototypes (a-calm, b-living, c-expressive)

Judged 2026-10-20 with Playwright 1.x Chromium (headless) using `proto/judge/judge.mjs`. The raw numbers are in `proto/judge/results.json`. Screenshots are in `proto/shots/{id}/`, and the side-by-side contact sheets are `proto/shots/sheet-*.png`.

Each prototype was captured in these states:
- desktop 1366x768, light and dark;
- hover on pearl 02 (150 ms and 1 s), and a 3 s hover crop;
- keyboard focus on pearl 03, reached with real Tab presses;
- mobile 390x844 (DSF 2), light, dark and full page;
- reduced motion, at rest and with hover;
- intro frames at 0/150/300/500/800 ms. These are deterministic: every `document.getAnimations()` is paused and seeked to t;
- idle crops at 1/3/5 s, plus 6 s of 100 ms float sampling;
- a view-transition morph after clicking pearl 01, frozen at 100/200/320 ms, then the destination page and Back.

axe-core ran on desktop light, desktop dark, mobile, and a direction page with the tags wcag2a/aa, 21a/aa, 22aa and best-practice.

## Measured facts

| | a-calm | b-living | c-expressive |
|---|---|---|---|
| axe violations (4 runs each) | 0 | 0 | 1 moderate `region` on `.ribbon`, which is prototype-only. Effectively 0 |
| Inline JS (raw / gz-9) | 6,723 / **2,396 B** | 6,248 / **2,663 B** | 7,195 / **3,020 B** |
| CSS (gz) | 6.0 KB | 7.0 KB | 6.4 KB |
| Whole page (gz) | 14.5 KB | 14.7 KB | 15.1 KB |
| Idle float, peak-to-peak (measured) | 0 (static) | 5.2 / 5.2 / 4.4 / 5.6 px | 3.5 / 3.0 / 3.4 / 2.9 px |
| Intro animations | 4 (`settle` 480 ms, 40 ms stagger) | 4 settle + 4 `bob` loops | 4 `sink` 780 ms (80 ms stagger) + 4 `halo-in` + 18 `seed-in`. Last frame ≈ 1.14 s |
| Morph | 420 ms group + blur; site header gets its own group | 420 ms + blur; no header group | 420 ms, no blur; hero halo and seeds bloom after arrival |
| Animations under reduced motion | 0 | 0 | 0 |
| Focus after the morph | h1 | h1 | h1 |
| Tabs to reach pearl 03 | 11 | 12 (Pause sits in the order first) | 11 |
| Horizontal scroll at 390 px | none | none | none |
| Fits in 1366x768 | No. The plate's Note is cut at the fold, and the plate bottom is below it | Labels yes. The footnote sits outside the plate, at y = 690–740 | **Yes.** The whole plate, key and Pause fit (plate bottom ≈ 697) |
| Page errors | 0 | 0 | 0 |

## Scores (1–5; "fulfils ask" is double weight, max 50)

| Criterion | a-calm | b-living | c-expressive |
|---|---|---|---|
| Originality / recognizability | 3 | 4 | **5** |
| Academic credibility (5 s test, Haas faculty) | **5** | 4 | 4 |
| Visual quality | 3 | 3 | **4** |
| Interaction clarity | 4 | 4 | 4 |
| Accessibility (incl. axe) | 5 | 5 | 4 |
| Mobile | 3 | 3 | 3 |
| Performance | 5 | 4 | 4 |
| Maintenance | **5** | 4 | 3 |
| Fulfils "unique and animated" (x2) | 2 (4) | 4 (8) | **5 (10)** |
| **Total** | **37** | **39** | **41** |

### a-calm: credible, but it is the brief rather than the owner's ask
- **Good:**
  - It reads most like a figure in a paper: mono "Fig. 1." and a methods **Note.** with a data date. A faculty member gets it in two seconds.
  - It has the best build hygiene: a generator, 45 interaction checks, axe 0, and 2.4 KB JS.
- **Ugly:**
  - **Above-the-fold failure.** The 2rem Fraunces "Research directions" h2, plus about 90 px of dead plate between the legend and the top seeds, pushes the Note and the plate bottom below 768 px (`01-desktop-light.png`).
  - **The seeds read as ears or a crown.** All 4–6 dots sit on the top arc with no ring to explain them. On 04 (6 seeds) the 6th dot dangles at 4 o'clock and looks like a mistake (`01b-figure-2x.png`).
  - Label centring includes the "→", so "Algorithmic Advice →" sits optically about 8 px left of the pearl axis.
  - "Haas School of Business, University of / California, Berkeley" breaks after "of", which is a bad rag.
  - The header wordmark and the hero wordmark are the same lockup about 100 px apart, which is redundant.
  - **Dark mode** pearls become murky grey-brown discs with a bright rim. The seeds are close to invisible (`#4F5261`-class hexes on `#1E1714`).
  - **Hover dim at .55** turns the three other pearls into foggy taupe discs that look "disabled", not "secondary" (`03b-hover-02-1s.png`).
- Nothing moves after 600 ms, so it does not answer the owner's ask.

### b-living: the right motion, the wrong pearl
- **Good:**
  - The hairline **orbit** is the best idea in the set. It turns the dots into a radial count, a dial, which reads as data rather than decoration.
  - The float is clearly perceptible (±2.6 px, desynchronised periods of 7.4–10.4 s), and it pauses off-screen and in hidden tabs.
  - The seed bloom (+13% ring and orbit) on hover is legible.
  - The caption with a coloured left rule is the most "journal" caption.
  - The header lockup (dot + mono BOBALAB) avoids the duplicate wordmark.
- **Ugly:**
  - **The pearl looks like a button or a camera lens.** The `.pearl::before` inset ring at `inset:4%` draws a second dark bezel inside the 1 px rim. At 2x it reads as a recessed knob, and on the 160 px hero it is worse (`b-living/01b-figure-2x.png`, `09b-destination.png`).
  - **"Pause motion" pill in the plate's top-right** has the same visual weight as the caption title. Its "II" glyph is hairline-thin and sits low.
  - The **centred nav** floats between the logo and the "Preview · drafts" pill, so it aligns to nothing.
  - The **footnote is outside the plate**, so the figure has no bottom anchor and the plate ends in empty space below 04.
  - **Mobile list rows show both "→" in the label and a "›" chevron**, which is a double affordance (`05b-mobile-390-full.png`).
  - The descriptor "Berkeley Operations and / Behavioral Analytics Lab" breaks in two in a 22rem column.
  - Dark mode keeps the bevel and adds a rim, so it looks like a muddy lens (`02-desktop-dark.png`).
  - Dim at .55 has the same "disabled grey" problem as a-calm.

### c-expressive: the only one that feels designed for the owner, but it overplays the sugar
- **Good:**
  - The **halo** gives each direction a colour identity at rest without tinting the pearl. In dark mode it is what makes the pearls separate from the ground at all (`c-expressive/02-desktop-dark.png`). It is the most recognisable frame of the three.
  - The **intro tells a story.** Pearls sink with an overshoot, halos bloom, and seeds spread from the centre (`sheet-intro.png`, row 3). It is the only intro that is memorable.
  - The **destination hero re-blooms**, so the morph has a payoff (`09b-destination.png`).
  - The plate fits fully in 1366x768.
  - The bottom key "● = 1 paper with a public version · counts as of 20 Oct 2026" is the most honest legend.
- **Ugly:**
  - **Plate wash on hover** at 58% turns the whole plate lychee-pink (02) or matcha-green (03). That is the "sweet café" signal the brief warns about (`03b-hover-02-1s.png`, `04-focus-03.png`).
  - **The orbit rotation (9 s per turn) carries seeds down to 5–6 o'clock**, where one seed touches the "AI at Work" label (`03c-hover-02-3s-figure.png`). The seeds also stay rotated after leave, so the figure looks "broken" on the second visit.
  - **The active pearl's seeds look washed out** against the matching wash. Pink on pink loses the count, which is the point of the seeds.
  - **The pearl highlight** (`::before` 30%x19%, alpha .15, at 17%/13%) reads as a smudge or fingerprint, not a sheen. It is too blurry and too far inside the edge.
  - Caption **line 3, "Hover or focus a pearl… · select it to open"**, is UI instruction in wide mono. It makes the plate look like an app.
  - The "Research directions" label is a 13 px mono eyebrow floating *outside* the plate. Its crop marks also sit outside, offset 8 px from the plate corner, which reads as a misregistered double frame.
  - **The wordmark "BOBA LAB" has a word-space, and LAB is about 0.8 of cap height**, so it reads as two different logos stuck together.
  - **The 04 halo (`#E3C26E` at 46%) is visibly the strongest** of the four. The 01 halo is the weakest. The halos are not perceptually balanced.
  - **"Pause motion" appears on mobile list mode**, where nothing moves.
  - **Dark hover:** dimmed pearls become hollow rings, because the rim does not fade with the body.

### Shared problems (all three)
- **Mobile: the owner's "animated" ask is lost.** All three fall back to a static list at 390 px, and the figure starts at y ≈ 600–710 CSS px, so a phone visitor sees no pearl motion at all.
- **The opacity-fade intro passes through grey.** A dark pearl at 40% opacity over the cream plate reads as grey-taupe (see 150 ms and 300 ms in `sheet-intro.png`).

## Recommendation: hybrid "c-halo × b-orbit"

Build **c-expressive's structure, intro and halo**, with **b-living's orbit hairline, float amplitude and caption rule**, and **a-calm's methods Note and build hygiene** (generator, interaction tests). Cut c's plate wash and continuous orbit rotation. Replace the rotation with a bounded "stir" that cannot reach the labels.

### Exact parameters for WP1

**Pearl body.** D = `clamp(5rem, 14cqi, 6.5rem)`, which is 104 px at 1366.
- Body: the brief's matte radial gradient, plus the direction glow `radial-gradient(circle at 50% 88%, deep@45%, transparent 62%)`. Use deep@30% in dark mode, with the light tone, not deep.
- Rim: 1 px `--pearl-rim` in **dark mode only** (`#A47E62` at 60%, not 100%).
- **No inset bevel** (drop b's `::before` ring).
- **Sheen:** a single ellipse, 34% x 14% of D, centred at (30%, 22%), rotated -35°. Fill `radial-gradient(closest-side, rgb(255 248 238/.16), transparent)`; in dark mode use .10. This is narrower and nearer the edge than c's, so it reads as satin, not a smudge.
- Index numeral: Plex Mono 500, 0.13D (13–14 px), `#F4ECE2`, letter-spacing .04em.

**Halo** (from c, rebalanced).
- Size 1.55D in figure mode.
- `radial-gradient(closest-side, color-mix(light X%) 55%, color-mix(light X*.3) 80%, transparent)`.
- Per-direction alpha **X**, set so the four look equal in weight:
  - light mode: 01 `#A9C0F2` 44%, 02 `#F0A5BC` 34%, 03 `#A9CF8F` 38%, 04 `#E3C26E` 30%;
  - dark mode: 26% for all four.
- Rest opacity .8. Active: opacity 1, scale 1.08, 400 ms `cubic-bezier(.2,.8,.2,1)`. Inactive: .35.

**Seeds and orbit** (from b).
- Orbit ring: radius 0.64D, 1 px `--hairline`, opacity .7.
- Seeds: `max(6px, .11D)` flat dots. Clock fill order 12, 1, 11, 2, 10, 3.
- **Cap the arc at ±75°.** With 6 or more seeds, distribute evenly within -75°..+75° instead of reaching 3/9 o'clock, so no seed dangles.
- Bloom on hover or focus: ring and orbit scale to 1.12, 320 ms ease-out, 20 ms per-seed stagger.

**Stir** (replaces c's 9 s orbit).
- While active, the seed group rotates 0 → +14° → -14° → 0, `ease-in-out`, 2.4 s, infinite alternate.
- On leave it returns to 0° in 400 ms.
- The maximum seed angle is 75 + 14 = 89°, so the seeds stay above the pearl equator and clear the labels.
- Transform only.

**Idle float** (b's amplitude, c's periods).
- `translate: 0 ±2.5px`, ease-in-out, alternate.
- Periods 7.4 / 9.6 / 8.3 / 10.8 s, delays -1.2 / -4.1 / -2.7 / -6.0 s.
- Pause in hidden tabs (`visibilitychange`), via IntersectionObserver when off-screen, and through the global Reduce-motion toggle.

**Pointer parallax** (c, reduced). Fine pointer only. Halo -2 px, pearl +2 px, seeds +4 px. τ = 160 ms, and the rAF loop runs only while values settle.

**Intro** (c, de-greyed). Once per session, labels visible from first paint.
- Group: `translateY(-28px → +4px @58% → -1px @80% → 0)`, 720 ms, stagger 70 ms.
- **Opacity 0 → 1 completes within the first 120 ms**, so no grey phase.
- Halo-in: scale .55 → 1 plus opacity, 640 ms, delay i·70 + 220 ms.
- Seed-in: scale 0 → 1 from the pearl centre, 380 ms, delay i·70 + 340 + k·30 ms.
- Last frame is at about 1.05 s.

**Hover and focus.**
- Lift `translateY(-3px) scale(1.05)`: 200 ms in, 160 ms out.
- 80 ms pointer intent. Esc resets. Caption reverts 300 ms after leave.
- **Inactive groups:** pearl .78, seeds .45, halo .35, orbit .4.
- In dark mode, apply the opacity to the whole `.pearl-group` so the rim fades with the body (no hollow rings).
- **No plate wash.** If the owner wants a colour response, use a 2 px left rule in the direction's deep colour on the caption (b), and at most a 12% `tint` flat wash with a 400 ms fade.

**Caption** (b's rule, c's content).
- Rest: "Fig. 1" (mono, muted) + "Research directions of BOBALAB." (Inter 600) / "Each pearl is a direction; each dot is one paper with a public version."
- **Drop the "Hover or focus…" line.**
- Active: "0N Label" / summary / "N projects · N papers". Reserve the height. Swap: out 100 ms, then in 180 ms after a 60 ms delay, translateY 4 → 0.

**Morph.**
- Group 420 ms `cubic-bezier(.2,0,0,1)`. Old root 150 ms ease-in (opacity plus 8 px). New root 210 ms after a 150 ms delay.
- The site header is its own static group (a).
- On arrival, the hero halo blooms (640 ms, delay 240 ms) and the seeds re-spread (420 ms, delay 340 + k·35 ms).
- Keep the 3 px blur at 40% only if it measures under 2 ms per frame; otherwise drop it, as c did.

**Mobile (≤ 48rem). New work, needed to meet the owner's ask.**
- Keep list mode, but give each 44 px row pearl its halo (1.5D) and the **one-shot intro** (the same sink/halo/seed sequence, 70 ms stagger).
- No idle float in list mode, and no Pause button there.
- Move the figure above the mission CTA on mobile, or cut the mission to 3 lines at 32 px, so that the pearls are inside the first 844 px.

**Reduced motion.** As in all three: nothing moves. Use a 2 px outline plus underline, and a 120 ms crossfade on navigation.

**Budget.** The figure JS must be ≤ 2.5 KB gz. Without the wash and the WAAPI orbit, c's 2.0 KB figure part should fall to about 1.8 KB.

### Concrete visual fixes (checklist)
1. Remove b's `.pearl::before` inset bezel ring. Use the single-ellipse sheen spec above.
2. Remove c's plate wash, or cap it at a 12% flat tint. It must never cover the seeds' contrast.
3. Replace the continuous seed orbit with the bounded ±14° stir, and reset on leave.
4. Cap seed placement at ±75° from 12 o'clock, so no seed sits beside a pearl's equator or near a label.
5. Balance the halo alpha per direction (values above). 04 ochre is currently the loudest.
6. Change the inactive dim from a uniform .55 to pearl .78 / seeds .45 / halo .35, applied at group level in dark mode.
7. Make the intro opacity reach 1 by 120 ms, to remove the grey ghost pearls.
8. Delete caption line 3 ("Hover or focus a pearl…").
9. **Frame.**
   - Put "Research directions" as a real h2 inside the plate header row, at Fraunces 600 `--fs-xl`, left-aligned to the caption x.
   - Put the crop marks *on* the plate corners (inset 8 px), not outside them.
10. Keep the key, the date and the counting rule *inside* the plate as one bottom row. Put "Pause motion" on that row, right-aligned, as a 28 px-high text button with a 1.5 px-stroke icon. Never put it in the top-right.
11. **Wordmark:** remove the space ("BOBALAB"). Set LAB at cap height, matching a/b. Use the dot + mono lockup in the site header, so there is one large wordmark per screen.
12. Centre each label on the pearl axis by the text width *excluding* the arrow (hang the "→" outside the centring box).
13. Mobile list rows have one affordance only: "→" after the label, with no chevron (b), and no Pause button (c).
14. Fix the affiliation rag: `text-wrap: balance` and a non-breaking space in "University of California".
15. Dark-mode seed hexes need ≥ 3:1 against the plate as non-text graphics. The current `--seed-d` (`#4F5261` on about `#201915`) is roughly 2:1. Lighten them about 30% L.
16. Put `role="note"` or a landmark around any prototype ribbon, or remove the ribbon in production (axe `region`).
17. The direction hero should use the orbit ring too (b). Right-align "← All directions" with the h1 column, not at the far page edge (c).

## Most representative shots
- Rest, light: `shots/c-expressive/01-desktop-light.png`, `shots/b-living/01-desktop-light.png`, `shots/a-calm/01-desktop-light.png`.
- Pearl detail at 2x: `shots/{a-calm,b-living,c-expressive}/01b-figure-2x.png`. These show the b bezel, the a crown and the c smudge sheen.
- Dark: `shots/c-expressive/02-desktop-dark.png` (the halo carries dark mode) and `shots/a-calm/02-desktop-dark.png` (murky).
- Hover problems: `shots/c-expressive/03c-hover-02-3s-figure.png` (pink wash, seed touching the label), `shots/a-calm/03b-hover-02-1s.png` (grey dim).
- Focus: `shots/b-living/04-focus-03.png`.
- Intro comparison: `shots/sheet-intro.png`. Morph comparison: `shots/sheet-morph.png`. Reduced motion and dark hover: `shots/sheet-reduced.png`.
- Destination: `shots/c-expressive/09b-destination.png`, `shots/b-living/09b-destination.png`.
- Mobile: `shots/{id}/05b-mobile-390-full.png`.
