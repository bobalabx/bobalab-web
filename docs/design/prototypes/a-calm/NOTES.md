# Prototype A: "Calm specimen" (the control)

This is brief §E ("Fig. 1: the Pearl Figure") implemented as written. It has the intro settle, hover/focus lift with the other groups dimmed, the live caption, and the pearl-to-header morph. Nothing else moves: no idle motion, no pointer buoyancy, no seed bloom.

- **Page:** `index.html` is one file with inline CSS and JS. It needs network access only for fonts (jsDelivr).
- **Generator:** `_build/build.mjs` reads `research/content-dataset.json`, computes the counts and writes `index.html`. Edit the generator, not the HTML.
- **Rebuild:** `node _build/build.mjs`. It prints sizes, counts and the lowest contrast ratios.
- **Tests:** these use headless Chrome over raw CDP and need no npm installs.
  - `node _build/interact.mjs`: 45 checks.
  - `node _build/shots.mjs`: screenshots.
  - `node _build/nojs.mjs`
  - `node _build/frames.mjs [mobile]`: frames of the morph, paused at fixed times.
  - All output goes to `_build/shots/`.

## Content and counts

**Rule (from the task).** A publication counts as a seed dot if it has any of the following:
- a DOI;
- a `paper`, `publisher`, `ssrn`, `arxiv` or `pdf` link;
- a *documented* conference presentation. This means a `presentations[]` label of DOCUMENTED or CORROBORATED that is **not** "PI-reported only".

A paper tagged to two directions counts in both.

| # | Direction (swatch) | Seeds | Counted | Excluded | Projects | "since" |
|---|---|---|---|---|---|---|
| 01 | Algorithmic Advice (Butterfly pea) | **4** | rl-tips-2026, precise-or-broad, strategic-advice-personal-ai, compliance-aware-rl (MSOM 2026 program) | non-adoption (talk is PI-reported only), act-ask-defer (no public version) | 5 | 2021 (arXiv 2108.08454) |
| 02 | AI at Work (Lychee) | **5** | making-chatgpt-work-2025, teachers-knapsack, strategic-advice-personal-ai, planning-vs-execution (MSOM 2026 program), stale-misattributed-late | genai-pricing-simulation, act-ask-defer | 5 | 2024 (SSRN first posted 2024-09) |
| 03 | Learning on the Job (Matcha) | **4** | learning-on-the-go-2025, precise-or-broad, learning-to-gig, dispatching-to-develop | learning-across-jobs (BOC 2026 is PI-reported only) | 4 | 2025 |
| 04 | Platform Work (Oolong) | **6** | gig-drivers-2023, learning-on-the-go-2025, multihoming-workers, learning-to-gig, dispatching-to-develop, penn-dissertation-2021 | sequencing-incentives (PI-reported talk), fruits-of-labor | 5 | 2021 (dissertation) |

- **Unique counted papers:** 14. The seeds sum to 19 because 5 papers sit in two directions. The figure note says so.
- **Lenient variant:** if PI-reported-only talks also count, the seeds are 5 / 5 / 5 / 7.
- **Penn dissertation:** it is counted because it is a dataset publication with a public repository link. Without it, Platform Work has 5 seeds and its "since" becomes 2023.
- **"since YYYY":** this is my stand-in for the CMS `active_since` field, which does not exist yet. It is the earliest public-version year among the counted papers, taken from the arXiv ID's yymm, SSRN `firstPosted`, online or published dates, documented talk years, or `year`. It is a proxy only; the PI should set the real value.
- **Text drafts:** I wrote the summaries, guiding questions and "In brief" text in my own words from the dataset's oneLiners and questions, using only questions not marked as inferred. The mission ("Improving how people and AI work together, for the future of work.") paraphrases the lab line. All of this is draft copy.

## Design intent

- **A research figure first.** The figure is a flat milk-tea plate with a 1 px hairline frame, faint registration ticks in the corners, a mono "Fig. 1." legend at the top-left inset, and a methods-style **Note.** at the bottom. The note gives the counting rule and "Data as of Oct 20, 2026". This is the signal that should read as credible to Haas faculty within 5 seconds: it looks like a figure in a paper, not a product graphic.
- **Pearls are calm specimens.**
  - All pearls are the same size (D = clamp(5rem, 14cqi, 7.5rem), which is 104 px at 1366).
  - The body is a matte tapioca brown (the brief's radial gradient). The direction colour shows only as a 45% "deep" glow at the bottom.
  - Each pearl has one diffuse sheen at 10 o'clock, peak alpha 0.14.
  - The index numeral is in Plex Mono.
  - The seeds are flat tinted dots on the 12-slot ring, filled from 12 o'clock outward, so they read as a crown of tally marks.
  - The four pearls sit in the t4 slot template with the organic nudges and a −0.25D row overlap, which makes a loose zig-zag cluster.
- **Text never moves or dims.** Labels are Inter 600 with an accent "→", and counts are muted mono.
- **Identity column.**
  - The wordmark is BOBA in Fraunces SOFT 100 / 680, a matte pearl-O, then LAB in Plex Mono +0.08em.
  - Below it come the descriptor (Inter 500, +.04em, muted), a hairline, the affiliation as plain text, the mission in Fraunces 580 at display size, and a brown-sugar primary button.
  - No Berkeley or Haas colours or marks are used.
- **Nothing café-like.** There are no cups, straws, faces or bubble fonts, and no gloss below 32 px. The only boba vocabulary is the pearl-O and the single "meniscus" hairline under the hero, both allowed by §C9.

## Motion parameters (all from brief §C6/§E3/§E5)

| Moment | What moves | Values |
|---|---|---|
| Intro: first home view per session (sessionStorage flag set by a pre-paint script; `data-intro` removed after 1 s) | `.pearl-group` only: translateY −14 → +2 → 0 px, opacity 0 → 1. Labels are visible from first paint | 480 ms `cubic-bezier(.22,1,.36,1)`, 40 ms stagger, fill `backwards`, 600 ms total at n = 4 |
| Hover (only under `(hover:hover)`, after an 80 ms intent delay) or keyboard focus (no delay) | Active pearl: `translateY(-3px) scale(1.06)`. Other groups' pearls and seeds go to opacity .55 | In 200 ms, out 160 ms, `cubic-bezier(.2,.8,.2,1)` |
| Live caption | Swaps to "{index} {label}", the summary, and "N projects · N papers · since YYYY". Height is reserved, so nothing shifts | 180 ms opacity + translateY 4 → 0. Returns to the legend 300 ms after leave or blur. Esc resets |
| Press (only under `(hover:none)`) | scale(.98) | 100 ms |
| Morph (pearl → direction header) | `::view-transition-group(pearl-{slug})` and image-pair blur keyframe (30% → 3 px) | 420 ms `cubic-bezier(.2,0,0,1)` |
| Page swap | Old root: opacity + translateY 0 → 8 px. New root: enters after it | Old 150 ms `cubic-bezier(.4,0,1,1)`. New 210 ms ease-out after a 150 ms delay |
| Rail (direction → direction) | Root slides 60 px (forward or back by index); the rail pearl morphs into the header pearl | Same timings |
| Reduced motion (media query or the footer "Reduce motion" toggle, `data-motion="reduce"`) | No intro, lift or press. A 2 px outline plus label underline instead. Dimming is kept | VT is a 120 ms opacity crossfade with no pearl names |

Limits hold: scale ≤ 1.06, lift ≤ 3 px, no loops, and nothing runs longer than 0.6 s.

## What differs from the brief, and why

1. **Brief inconsistency: the figure would be in list mode on desktop.**
   - §C5 sets the hero split at 5/12 + 7/12 of a 72rem content width, so the figure column is about 41em. §E2 switches to figure mode only at a container ≥ 46em.
   - The figure therefore never reaches figure mode beside the identity column.
   - **Fix used here:**
     - The wrapper is 80rem, which gives 76rem of content.
     - Two columns appear only at viewport ≥ 78rem, with a fixed 46.5rem figure column. The identity column gets about 392–424 px.
     - From 48rem to 78rem the hero stacks: the identity block becomes two columns (wordmark block | mission + CTA) and the figure spans the full width below it.
     - Below 48rem everything stacks.
   - At 1366×768 the caption, all four pearls and the labels are above the fold. At 1024×768 the plate starts at y ≈ 465, so the first row of pearls is visible.
2. **What "em" means for the 46em query.**
   - Body text is 17 px (`--fs-base`), so `46em` in a container query evaluated to 782 px.
   - I set `.hero-figure { font-size: 1rem }`, which makes 46em = 736 px as intended.
   - The brief should state this basis.
3. **"Tablet: caption collapses to the legend" (§E6).**
   - Measured on the container, this rule would also remove the live caption on desktop, because the desktop figure container is about 46.5rem, below 64rem.
   - I implemented it on the **viewport** instead: below 64rem the caption stays as the legend.
4. **Morph styling uses per-slug names, not `view-transition-class`.**
   - The CSS uses `::view-transition-group(pearl-algorithmic-advice), …`, generated from the slugs.
   - This works in Chrome 111+ and Safari 18.0+. The brief's `.pearl-morph` class selector needs Chrome 125+ and Safari 18.2+.
   - In React, `share="pearl-morph"` is still fine.
5. **Names are assigned only to the active pair, at transition time.**
   - This mirrors React's `default="none"`, so the other three pearls go with the root.
   - The site header gets `view-transition-name: site-header` only when both the old and new scroll positions are 0. Otherwise it would slide in from above.
6. **Hash router instead of `next/link`.**
   - Routes are `#/research/{slug}`, plus stub pages for the nav items.
   - The browser Back button morphs here because a `hashchange` is handled in-page. **This is not evidence for Next.js**, where Back is [U].
   - Returning home restores the home scroll position before the new snapshot is taken, so the reverse morph also works on mobile. The brief says it is not guaranteed there.
7. **Focus and announcements.**
   - After every client navigation, focus goes to `h1[tabindex=-1]` with `preventScroll`, as the brief's RouteFocus does. On home that h1 is the wordmark h1.
   - A polite live region announces the new title. It imitates Next's announcer; I did not check Next's politeness level.
8. **Fonts.**
   - The page loads the exact fontsource 5.3.0 latin files the brief budgets (Fraunces wght-only, Inter wght, Plex Mono 500), measured at 97.4 KiB.
   - It also loads the Fraunces **SOFT** file (61 KiB) as a stand-in for the outlined-SVG wordmark, which is why the measured transfer is 160 KiB.
   - The wordmark is live text plus a CSS pearl-O, not outlined SVG. The `opsz 144` axis is not in the SOFT file, so it is not applied.
9. **Highlights.**
   - The pearl sheen and the pearl-O highlight are diffuse, elongated soft highlights at 10 o'clock, at alpha 0.14 and 0.24.
   - They are not hard crescents: a masked crescent read as a dished or recessed disc.
10. **Dark-mode pearl gradient** (my own choice; the brief gives only light-mode stops): `#4A372A / #3A2C22 / #2A1F18`, plus the mandatory `#A47E62` 1 px rim.
11. **Mission size.** The `--fs-display` clamp keeps its 2.5–3.75rem bounds, but its middle term uses `cqi` of the mission's own column instead of `vw`. With `vw` it would be 60 px in a 424 px column, about 7 lines.
12. **Additions to the figure:**
    - the methods **Note.** at the bottom of the plate;
    - corner ticks;
    - a list-mode legend variant ("Each row is a direction, with its number of papers."), because dots are hidden in list mode;
    - the meniscus hairline under the hero.
13. **Focus indicator.** In figure mode it is a 2 px ring on the pearl plus the label underline. In list mode it is a ring around the whole row.
14. **Direction page (a stand-in, not the full §D5 template):**
    - a tint header band with the hero pearl (120–160 px) as the morph target;
    - "Research / 0N", the h1, the guiding question and the stats line;
    - "In brief", papers with a public version (linking to the DOI, SSRN or arXiv), projects with flat dot bullets, and the 40 px "More directions" rail;
    - section h2s at `--fs-xl`, not `--fs-2xl`.
15. **Prototype-only controls in the footer:**
    - Theme (Auto / Light / Dark, `data-theme`; also `?theme=dark`);
    - "Replay intro".
    - The site-level "Reduce motion" toggle follows §D1/§E7.
16. **No JavaScript.** The pearls are real links. The `:target` CSS shows the matching direction page, and the caption stays as the legend.

## JS size (node zlib, gzip level 9, inline scripts of the built page)

| Part | Raw | gz |
|---|---|---|
| Pre-paint (intro flag, motion, theme) | 577 B | 321 B |
| Fig. 1 caption + lift/dim state | 1,682 B | **710 B** |
| Hash router + View Transition morph | 2,629 B | 1,145 B |
| Footer toggles (motion, prototype theme, replay) | 1,451 B | 548 B |
| **All inline JS** | 6,722 B | **2,396 B** |
| Figure-related only (pre-paint + caption + router) | — | 2,061 B |

- Everything is within the §E10 budget of ≤ 4 KB gz.
- The brief's "about 0.5 KB" estimate for the caption is about 40% low. The intent delay, Esc handling and hover-versus-focus logic make it 0.71 KB gz.
- **Whole page:** 68.1 KB raw, 14.5 KB gz. CSS is 6.0 KB gz.

## Verification done (headless Chrome 155, CDP)

- **`interact.mjs`: 45/45 checks pass.** They cover:
  - the intro: runs once, no attribute left after 1 s, no replay on return or reload;
  - the 80 ms hover intent;
  - lift matrix `(1.06 … −3)`;
  - other groups at .55 while text stays at 1;
  - the 300 ms caption hold;
  - keyboard Tab order 01 → 04;
  - the focus caption, Esc reset and pearl focus ring;
  - morph animation names and durations for open, close, rail and browser Back;
  - unique title, h1 focus, names cleaned up after the transition, and the announcer;
  - accessible names ("Algorithmic Advice 4 papers" …) and descriptions;
  - the stable figure name and the list role;
  - no label overlapping another pearl at 1366, 1280, 1024, 800 and 1920;
  - text zoom 150% and 200% (default font set to 24 and 32 px): list mode at 200%, no overlap, no horizontal scroll;
  - reduced motion through both the media query and the toggle (no intro, no lift, 2 px outline, a 120 ms crossfade with no pearl group);
  - direct load of a direction route.
- **axe-core 4.10.2** (wcag2a/aa, 21aa, 22aa): 0 violations on home light, home dark, home list mode at 375 px, and a direction page.
- **`nojs.mjs`:** the skip link works; with scripts disabled, clicking a pearl shows the direction page.
- **Screenshots:** 320–1920 px, light and dark, and emulated forced colours. At 320 px there is no horizontal scroll.
- **Contrast:** every new text pair I introduced is ≥ 5.6:1. The lowest is the accent on the Lychee tint at 5.63.

## Known issues and limits

- **Browser coverage.** Tested only in Chromium. Safari (WebKit morph, `text-wrap: balance`) and Firefox were not tested. Forced colours were emulated, not checked under a real Windows contrast theme.
- **Fonts load from jsDelivr.** Before they arrive, Georgia and system fonts show. The intro can play while fonts swap, which makes labels reflow. With no network the SOFT wordmark is lost.
- **The "→" glyph** (U+2192) is not in the latin subset of Inter or Fraunces, so it renders from a fallback font. Production should load it from a subset or use the §C7 arrow SVG.
- **Empty space under the legend.** The reserved caption height (88 px) leaves about 60 px of empty plate under the legend at rest. This is intended: it stops the pearls shifting under the cursor.
- **Dimmed pearls** at .55 look slightly foggy and grey on the plate. That is the brief's value; consider .65.
- **768 px (iPad portrait)** gives a 45em container, so it shows list mode.
- **Mobile above the fold.** On mobile the mission runs to 5 lines at 40 px, and the figure starts below the fold.
- **Templates.** Only template t4 (n = 4) exists. The t2–t3 and t5–t8 templates and the dot-plot fallback are not built.
- **Lychee header tint.** The pink header band (`#F5DFE5`) is the brief's colour. It may read as sweet, so watch it in the five-second test.
- **Data caveats.** These are inherited from the dataset:
  - The groupings are a HYPOTHESIS.
  - Several counted items have inferred summaries.
  - Dispatching to Develop is not on the PI site.
  - Most items are marked `isLabWork: false`.
  - The counts change with PI decision H-3.
- **Browser storage.** `localStorage` holds the motion choice and the prototype theme. `sessionStorage` holds the intro flag. This matches §D12 plus one prototype-only key.
