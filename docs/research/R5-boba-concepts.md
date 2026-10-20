# R5: Boba concepts, the signature interaction and the visual identity for BOBALAB

Task: R5 (creative direction and interaction engineering). Research date: 2026-10-20.
Evidence labels: **DOCUMENTED** means an official or primary source states it, with a URL. **CORROBORATED** means two or more independent sources agree. **HYPOTHESIS** means my own inference or design judgment. **UNKNOWN** means not established.
Copyright: every source below is paraphrased. No abstracts, bios or page copy are reproduced.
Privacy: no student names are used. The only lab content used here is the set of research areas and the member and alumni counts that Prof. Park's own site publishes.

---

## 0. Summary

**Recommendation (HYPOTHESIS, reasoned below):** build a hybrid called **"Fig. 1: the Pearl Cluster."** It has four parts:
- **Data:** the honest pearl cluster (concept D). Large pearls are research directions. Each small "seed" pearl is one real project or paper.
- **Framing:** the cluster is presented like a figure in a paper (new concept F). Labels sit outside the pearls on leader lines, numbered 01–08, with a caption that works as a legend.
- **Setting:** a quiet "milk-tea field" with a meniscus line. There is no drawn cup and no straw.
- **Motion:** a short settling animation on load, then stillness. Pointer movement only adds gentle buoyancy.

**Engineering approach:**
- **Layout at build time.** The layout is computed when the site is built, using `d3-hierarchy` packing and an offline `d3-force` relaxation. Both are deterministic. The client ships no layout code.
- **Pearls are real links.** Each pearl is an HTML `<a>` inside a numbered `<ol>` in a `<nav>`, styled with CSS gradients. It is not a canvas or an SVG filter.
- **Clicking a pearl.** The pearl morphs into the header of its direction page through React 19.3's stable `<ViewTransition>`. Next.js App Router supports this with no configuration.
- **Theme colour.** Each direction's colour travels into its page as CSS custom properties.
- **Client JS for animation:** about 3 KB gzipped of our own code (HYPOTHESIS estimate). No WebGL, no Lottie or Rive, no live gooey filters.

**Why this concept wins (HYPOTHESIS):**
- It scores highest on credibility, accessibility, performance and maintenance (scores in section 5).
- It is still clearly boba.
- It turns the boba pun into an argument: the lab studies behaviour with data, so its home page is an annotated data figure.

---

## 1. Inputs that constrain the design

| # | Fact | Label / source |
|---|---|---|
| 1.1 | BOBALAB stands for Berkeley Operations and Behavioral Analytics Lab, the research group of Prof. Park Sinchaisri. His site's lab section names two areas: human-AI interfaces for operations management, and the future of work. | DOCUMENTED: https://parksinchaisri.github.io (BOBALAB section) |
| 1.2 | His personal research areas are broader: future of work and gig work, human-AI interfaces, dynamic pricing and quality perception, and urban analytics. The site also has an "Other works" group. | DOCUMENTED: https://parksinchaisri.github.io ; https://haas.berkeley.edu/faculty/park-sinchaisri/ |
| 1.3 | The site lists 12 current members and 25 alumni entries. No lab logo or boba imagery exists today. | DOCUMENTED: https://parksinchaisri.github.io (counts only) |
| 1.4 | The sibling task R1 (`R1-content-park.json`) proposes 6 candidate pearls. Their name lengths run from 19 characters ("Gig & Platform Work") to 54 characters ("Human-AI Decision Making (Designing Advice People Use)"). Item counts per theme, counting multi-theme items under each of their themes: 7, 7, 6, 3, 3, 2, plus 3 "other". **6 of 24 items belong to two or more themes.** | HYPOTHESIS (R1's grouping), built on DOCUMENTED items |
| 1.5 | Design consequences. (a) The site may launch with anywhere from 2 to 6 directions. (b) Counts are lopsided, about 3.5x between the largest and smallest. (c) Labels can be long. (d) Projects can belong to several directions. The design must cope with all four. | HYPOTHESIS |
| 1.6 | Campus brand policy. UC Berkeley says its logo must never be recreated or retyped. It says units should use the official signature-system lockups, made centrally, rather than invent logos, and that not every program should have a branded logo. | DOCUMENTED: https://brand.berkeley.edu/visual-identity/logos ; https://brand.berkeley.edu/visual-identity/signature-system/ |
| 1.7 | Haas brand policy. No sub-logos may be made from the Haas wordmark. The logo is restricted on websites, and groups that need a logo request a lockup from Haas MarCom (and the lockups are for merchandise). Haas colours: Haas Blue #003057, California Gold #FDB515. Haas typefaces: Larken, Barlow and Inter. | DOCUMENTED: https://haas.berkeley.edu/brand-hub/visual-identity/ |

Consequence: the BOBALAB wordmark must be purely typographic. It must not use the Berkeley or Haas logos, the seal, the Cal script, the bear, or the Haas Blue and California Gold pairing. Affiliation should appear as plain text (HYPOTHESIS). Sharing Inter with Haas is a harmless nod (HYPOTHESIS).

---

## 2. Feasibility research (Oct 2026)

### 2.1 View Transitions API: browser support

| Variant | Support (caniuse, fetched 2026-10-20) | Label |
|---|---|---|
| **Same-document** (`document.startViewTransition`). Next.js App Router uses this kind. | Chrome/Edge 111+, Safari and iOS Safari 18.0+, Firefox 144+, Samsung Internet 23+. About 92.9% of global usage. | DOCUMENTED: https://caniuse.com/view-transitions |
| Same-document became Baseline Newly available when Firefox 144 shipped (Oct 2025). The release included `view-transition-class`, `match-element` and `:active-view-transition`. | | DOCUMENTED: https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available |
| **Cross-document** (multi-page sites, `@view-transition`) | Chrome/Edge 126+, Safari 18.2+. Firefox 144+ is marked partial, without detail. Samsung Internet up to 30: no. About 86.8% full plus 2.0% partial. | DOCUMENTED: https://caniuse.com/cross-document-view-transitions |
| Cross-document view transitions are an Interop 2026 focus area, as are scroll-driven animations (published 2026-02-12). | | DOCUMENTED: https://web.dev/blog/interop-2026 |

Implication (HYPOTHESIS): with Next.js App Router, page changes are same-document, so the pearl morph will work in every current engine. Unsupported browsers simply navigate without animation.

### 2.2 Next.js App Router and React `<ViewTransition>`

- **React 19.3 (2026-09-09)** made `<ViewTransition>` stable. It animates only updates marked as Transitions: `startTransition`, a Suspense reveal, or `useDeferredValue`. It supports enter, exit, update and share animations, plus `addTransitionType`. DOCUMENTED: https://react.dev/blog/2026/09/09/react-19-3
- **React reference caveats** (DOCUMENTED: https://react.dev/reference/react/ViewTransition):
  - A named pair morphs only when one side unmounts and the other mounts in the same Transition.
  - **No pair forms if either side is outside the viewport.**
  - Only one mounted element may hold a given name at a time.
  - Back navigations driven by `popstate` skip animation unless the router uses the Navigation API.
  - React does **not** turn off animations for reduced-motion users. You are told to handle that in CSS.
- **Next.js guide** (lastUpdated 2026-10-15). DOCUMENTED: https://nextjs.org/docs/app/guides/view-transitions
  - View transitions work in the App Router with no configuration. Route navigations count as transitions.
  - `<Link transitionTypes={[...]}>` tags the direction of a navigation.
  - Unsupported browsers navigate normally.
  - **The shared morph plays only if the destination renders in the same commit**, which is the case for prefetched or cached pages. If the destination suspends first, the content just enters.
  - Browser back and forward carry no transition type, so only the named morph applies.
  - The `::view-transition` overlay swallows clicks unless you set `pointer-events: none`.
  - Safari may behave differently.
  - The guide's example timings: exit 150 ms, enter 210 ms after a 150 ms delay, move 400 ms, slide offset 60 px.
- The old `experimental.viewTransition` config page now returns 404. HYPOTHESIS: the flag has been retired.
- Current versions on npm (2026-10-20): `next` 16.4.2, published 2026-10-15; `react` 19.3.1. DOCUMENTED: https://registry.npmjs.org/next , https://registry.npmjs.org/react

### 2.3 Motion for React `layoutId` across routes

- **Not reliable across App Router pages.** Issue vercel/next.js #49279 ("App router issue with Framer Motion shared layout animations") is still open. A Vercel maintainer wrote (Dec 2024) that `layoutId` cannot move an element between App Router pages, and that Next.js would align with View Transitions instead (Jan 2025). DOCUMENTED: https://github.com/vercel/next.js/issues/49279
- Motion's documentation (fetched 2026-10-20) gives these sizes, without saying how they are compressed:
  - the `motion` component: about 43 kb
  - `m` with `LazyMotion`: about 5 kb
  - `domAnimation`: about 24 kb more (no layout animations)
  - **`domMax`, needed for layout animations: about 38 kb more**
  - the `useAnimate` mini build: about 3.3 kb

  DOCUMENTED: https://motion.dev/docs/react-reduce-bundle-size
- With `MotionConfig reducedMotion="user"`, Motion turns off transform and layout animations but keeps opacity and colour animations. DOCUMENTED: https://motion.dev/docs/react-accessibility

Implication (HYPOTHESIS): use React `<ViewTransition>` for the pearl-to-page morph. Motion is unnecessary. If it is used at all, it should only animate things within a single page.

### 2.4 Cost of SVG `feGaussianBlur` / `feColorMatrix` ("gooey") filters

- Chromium's design document says SVG filters applied to SVG content run on the CPU, while animated CSS filters use the GPU only while they are animating. The document is undated and refers to old milestones, so it may be stale. DOCUMENTED: https://www.chromium.org/developers/design-documents/image-filters/
- **WebKit, and therefore Safari:** bug 263848 says "SVG animation is slow, as GPU is not used for filters." It was opened 2023-10-29 and was still NEW on 2026-01-12. A WebKit engineer says in the thread that WebKit lacks GPU acceleration for SVG filters while Chrome has it. DOCUMENTED: https://bugs.webkit.org/show_bug.cgi?id=263848
- Firefox 132 moved most SVG filter primitives, including feGaussianBlur and feColorMatrix, onto WebRender's GPU path. DOCUMENTED: https://www.firefox.com/en-US/firefox/132.0/releasenotes/
- Authors of the gooey technique:
  - Lucas Bebber warns the filter is resource-intensive over large areas. Commenters report jank on phones and on Firefox for Android (anecdotal). DOCUMENTED: https://css-tricks.com/gooey-effect/
  - Nadieh Bremer calls her interactive gooey examples heavy on the CPU. She notes the filter must be applied to a whole group rather than to single circles, and that it **shrinks or erases small circles, which distorts data**. DOCUMENTED: https://www.visualcinnamon.com/2016/06/fun-data-visualizations-svg-gooey-effect/
- **Implication (CORROBORATED by the sources above plus HYPOTHESIS):** continuous gooey animation is a poor fit for an iPhone-heavy academic audience and for honest sizing. Do not use a live gooey filter on the home page. If a "merge" effect is ever wanted, limit it to a short transition over a small area, or fake it with prerendered shapes.

### 2.5 Animating only compositor properties

- Restrict animation to `transform` and `opacity`. Avoid properties that trigger layout or paint. Use `will-change` sparingly and only right before a change. DOCUMENTED: https://web.dev/articles/animations-guide
- Chrome hardware-accelerates opacity, filter and transform by default, and has accelerated SVG animations since Chromium 89 (page last updated 2021-02-22). DOCUMENTED: https://developer.chrome.com/blog/hardware-accelerated-animations
- Implication (HYPOTHESIS): make pearls HTML elements and move them only with `transform` and `opacity`. Gradients, shadows and highlights are painted once and never animated. A highlight "moves" by translating a separate pseudo-element layer.

### 2.6 Pausing animation loops offscreen or in hidden tabs

- Most browsers pause `requestAnimationFrame` in background tabs and hidden iframes. Use the callback timestamp so speed does not depend on refresh rate (60, 120 or 144 Hz). DOCUMENTED: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- Page Visibility API pattern: cancel the loop on `visibilitychange` when the page is hidden and restart it when visible. Background timers are throttled anyway. DOCUMENTED: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- IntersectionObserver lists "deciding whether or not to perform tasks or animation processes" as a use case, and avoids polling with `getBoundingClientRect`. DOCUMENTED: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- For WebGL, React Three Fiber's `frameloop="demand"` plus `invalidate()` renders only when something changes. Its docs also cover draw-call budgets and `PerformanceMonitor` or adaptive DPR. DOCUMENTED: https://r3f.docs.pmnd.rs/advanced/scaling-performance

### 2.7 Patterns for `prefers-reduced-motion`

- The media query has two values, `reduce` and `no-preference`, and maps to OS settings on Windows, macOS, iOS and Android. MDN's example swaps a scale animation for an opacity-only dissolve and names scaling or panning large objects as vestibular triggers. DOCUMENTED: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- web.dev recommends a "motion-last" approach:
  - put motion inside `@media (prefers-reduced-motion: no-preference)`
  - listen for changes with `matchMedia`
  - keep essential motion such as normal scrolling
  - don't break code that depends on `animationend`

  DOCUMENTED: https://web.dev/articles/prefers-reduced-motion
- **WCAG 2.2.2 Pause, Stop, Hide (Level A):** motion that starts automatically, lasts more than 5 s and runs alongside other content needs a pause, stop or hide control unless it is essential. Decorative motion is not exempt. DOCUMENTED: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- **WCAG 2.3.3 Animation from Interactions (Level AAA):** motion triggered by interaction must be possible to turn off. Respecting `prefers-reduced-motion` is a sufficient technique. DOCUMENTED: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- `prefers-reduced-transparency` works in Chrome and Edge 118+ only, not in Safari or Firefox, so it cannot be relied on. DOCUMENTED: https://caniuse.com/mdn-css_at-rules_media_prefers-reduced-transparency

### 2.8 Touch handling

- `@media (hover: hover)` checks whether the primary input can hover. Many phones fake hover on a long tap, so gate hover previews with it. DOCUMENTED: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover
- `touch-action: none` can block pinch-zoom and hurt low-vision users. Keep the default (`auto` or `manipulation`) because no custom gestures are needed. DOCUMENTED: https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- **WCAG 2.5.8 Target Size (Minimum), Level AA:** targets at least 24x24 CSS px, or spaced so that 24 px circles around them do not overlap. DOCUMENTED: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- **WCAG 1.4.13 Content on Hover or Focus (AA):** hover or focus pop-ups must be dismissible (Esc), hoverable and persistent. DOCUMENTED: https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html

### 2.9 Layout libraries: determinism and size

- **d3-hierarchy v3.1.2** made `d3.pack` and `packEnclose` "fully deterministic." `packSiblings` uses Wang et al.'s front-chain algorithm. DOCUMENTED: https://github.com/d3/d3-hierarchy/releases ; https://d3js.org/d3-hierarchy/pack
- **d3-force:** `randomSource` defaults to a fixed-seed LCG, and nodes without positions start in a deterministic phyllotaxis. `stop()` plus `tick(300)` produces a static layout. Defaults: alphaDecay ≈ 0.0228, velocityDecay 0.4. `forceCollide` takes a radius accessor, a strength from 0 to 1 and an iteration count. DOCUMENTED: https://d3js.org/d3-force/simulation ; https://d3js.org/d3-force/collide
- Implication (HYPOTHESIS): compute the layout on the server or at build time and get identical positions on every build. This avoids layout shift, needs no client layout JS, and produces stable snapshots for visual-regression tests.

### 2.10 Bundle sizes of candidate libraries

Minified plus gzip, from the bundlephobia API (`/api/size`, fetched 2026-10-20). DOCUMENTED: https://bundlephobia.com/package/<name>

| Package (version) | gzip | Note |
|---|---|---|
| d3-force 3.0.0 | 5.7 KB | |
| d3-hierarchy 3.1.2 | 5.7 KB | |
| motion 14.4.0 (whole package) | 55.9 KB | Tree-shaken sizes in 2.3 |
| gsap 3.15.0 core | 27.4 KB | |
| three 0.186.1 | 184.9 KB | Tree-shakes poorly (HYPOTHESIS) |
| @react-three/fiber 9.8.2 | 57.7 KB | On top of three |
| ogl 1.0.11 | 34.2 KB | Minimal WebGL alternative |
| lottie-web 5.13.0 | 76.8 KB | |
| @lottiefiles/dotlottie-web 0.81.0 | 33.1 KB JS | Plus a WASM file of UNKNOWN size |
| @rive-app/canvas 2.45.0 | 69.2 KB JS | Rive's own table, which includes the WASM (brotli -9, Jan 2026): canvas-lite 222 KB, canvas 567 KB, webgl2 648 KB. DOCUMENTED: https://rive.app/docs/runtimes/runtime-sizes.md |

---

## 3. Precedents: what they teach (8 real works; studied, not copied)

| # | Work | What it does (paraphrased) | Lesson for BOBALAB | Label |
|---|---|---|---|---|
| P1 | **NYT, "Four Ways to Slice Obama's 2013 Budget Proposal"** (Shan Carter et al., 2012, built with D3) | Budget items are bubbles sized by dollars and coloured by change. The same bubbles split and regroup across four views. A critic noted that tiny bubbles are hard to read. | **Object constancy.** The pearl you click should visibly become the page you land on. **Don't encode small differences by area**: clamp the smallest sizes. | CORROBORATED (FlowingData post and Santa Clara University data-viz blog, via search results; NYT archive not fetchable): https://flowingdata.com/2012/02/15/slicing-obamas-2013-budget-proposal-four-ways/ |
| P2 | **D3 "Zoomable circle packing"** (Observable example) | Clicking a parent circle zooms into its children and clicking the background zooms out. Only the top level is labelled at first. | **Progressive disclosure.** The home page labels directions only. Projects are named on the direction page. | DOCUMENTED (notebook, via search summary; direct fetch was rate-limited): https://observablehq.com/@d3/zoomable-circle-packing |
| P3 | **Shirley Wu, "An Interactive Visualization of Every Line in Hamilton"** (The Pudding, 2017) | Lines are dots coloured by character, and runs of lines are grouped because single dots were messy. A force-layout intro bursts the dots apart and regroups them. The first SVG version had about 1,700 paths and lagged, so it moved to Canvas. She also reports that the mobile version was painful to build. | **Use colour for one dimension only.** Group tiny marks. SVG and DOM handle tens of marks fine but struggle with thousands. Our 8 to 60 pearls are well within the DOM budget. | DOCUMENTED (author's write-up): https://www.datasketch.es/project/an-interactive-visualization-of-every-line-in-hamilton |
| P4 | **Nadieh Bremer, "Fun data visualizations with the SVG gooey effect"** (Visual Cinnamon, 2016) | City circles fly out of one blob, then merge into country blobs. The goo is switched on only when merging is the point. | **Liquid merging should mean something**, such as clustering, and be switched off when people need to read exact values. It is CPU-heavy and shrinks small circles. | DOCUMENTED: https://www.visualcinnamon.com/2016/06/fun-data-visualizations-svg-gooey-effect/ |
| P5 | **Gapminder Tools bubble chart** | Bubbles stand for countries, with size for population and colour for region. Time animates only when the viewer presses play, and speed can be changed. | **The viewer controls the motion**, and the encoding is explained in a legend. This maps onto WCAG 2.2.2 and onto our caption-as-legend. | CORROBORATED (Gapminder plus teaching guides): https://www.gapminder.org/tools/ ; https://www2.hawkeslearning.com/Statistics/gapminder.html |
| P6 | **Harvard Growth Lab, Atlas of Economic Complexity: "Product Space"** | A research lab's flagship tool draws products as coloured nodes. Colour marks a community. Node size is scaled non-linearly purely for layout, and node coordinates are precomputed. | **A lab can own a circle-network identity and stay credible.** Precompute positions, and **say in the caption** that pearl size is clamped. | DOCUMENTED: https://atlas.hks.harvard.edu/ (Growth Lab's research and visualization tool); https://michelecoscia.com/?p=223 (an Atlas co-author documents the encoding) |
| P7 | **Nathan Yau, "A Day in the Life of Americans"** (FlowingData, 2015) | 1,000 simulated people appear as dots that move between activity clusters through the day, driven by American Time Use Survey transition probabilities. | **Ambient motion should carry meaning or not exist.** Endless decorative drift is the weakest kind of motion. | CORROBORATED (FlowingData plus Luerzer's Archive, via search): https://flowingdata.com/2015/12/15/a-day-in-the-life-of-americans/ |
| P8 | **Neal Agarwal, "The Deep Sea"** (neal.fun) | Native scrolling takes you from the surface down to the Challenger Deep, with creatures and wrecks placed at their real depths. | **Scroll-as-depth works** without hijacking scroll, but it needs a lot of content to justify the length. A lab with 3 to 8 directions is too thin for it (relevant to the "pour" concept). | CORROBORATED (My Modern Met, Laughing Squid, Creative Bloq): https://neal.fun/deep-sea/ |

---

## 4. Concepts (7 explored)

Each concept has the same required fields. "JS weight" is the estimated gzipped client JavaScript beyond the Next.js and React baseline (HYPOTHESIS unless it cites section 2.10).

### Concept A: "Pearl Menu" (the lab member's original idea, taken literally)

- **Description:** N dark pearls in a row or grid on the hero. Clicking one opens that direction's page.
- **Mapping:** one pearl per direction, all the same size. Colour is a subtle tint on each pearl.
- **Flow:** hover or focus lifts the pearl (scale 1.05) and shows its label. Clicking navigates, with an optional shared morph into the page header.
- **Colour carry-over:** the tint becomes the accent on the page.
- **Mobile/touch:** a vertical list of pearls with labels, which works well.
- **Reduced motion / static:** trivial, since the pearls are just links.
- **Keyboard / screen reader:** an `<ol>` of links, so naturally fine.
- **Technique:** HTML and CSS. **JS:** 0 to 2 KB.
- **Childish or ad risk:** medium. A row of glossy black balls reads like a boba-shop menu or a toy.
- **Maintenance:** excellent with 3 to 8 items. Long labels wrap under the pearls.
- **Verdict:** a good baseline and a good fallback. On its own it has little identity and no idea behind it.

### Concept B: "Cup Cross-Section" with the straw as navigation

- **Description:** a large cut-away cup of milk tea with pearls resting at the bottom. The straw is a vertical scroll or progress indicator, or a pointer that "sips" the hovered pearl.
- **Mapping:** pearls are directions. Layers of the drink (foam, tea, syrup) could be site sections.
- **Flow:** hover a pearl and the straw tip moves to it. Clicking "sips" the pearl up the straw, then the page opens.
- **Colour carry-over:** the tea changes colour toward the direction's hue as the transition plays.
- **Mobile:** the cup's tall shape suits a portrait screen. But 6 to 8 pearls with long labels inside a narrow cup get cramped, so labels must sit outside the cup.
- **Reduced motion:** a static cup illustration with labelled pearls. The sip becomes a crossfade.
- **Keyboard / screen reader:** a hidden or visible list is needed. The straw metaphor means nothing to screen-reader users.
- **Technique:** SVG illustration plus CSS transforms. Animating the straw path or liquid level would need SMIL or JS, and liquid wobble tempts you into SVG filters, which are slow (2.4).
- **JS:** 5 to 35 KB (custom code, or Motion's `m` plus `domAnimation`).
- **Childish or ad risk:** **high.** A cup plus straw is literally a bubble-tea advertisement. Credibility suffers.
- **Maintenance:** poor. The cup's capacity is fixed, so 8 pearls with long labels need art-directed rework, and the illustration needs a designer to update.
- **Verdict:** recognisable but too literal. Keep one idea from it: **pearls rest at the bottom of a milk-tea field.**

### Concept C: "Drifting Constellation"

- **Description:** pearls float freely across the hero with slow Perlin-noise drift and are pushed by the pointer, like pearls suspended in tea.
- **Mapping:** pearls are directions. Optional faint links between related directions.
- **Flow:** the pointer nears a pearl, which slows, grows and shows its label. Clicking morphs the pearl into the page.
- **Colour carry-over:** as in A.
- **Mobile:** drift without a pointer looks aimless, and tapping moving targets is error-prone.
- **Reduced motion:** freeze the drift. But WCAG 2.2.2 still requires a pause control for anyone who sees the drift (2.7).
- **Keyboard / screen reader:** a list is required. Keyboard focus on a moving target needs freezing logic.
- **Technique:** a continuous rAF loop, using d3-force (5.7 KB) or custom physics, on DOM or Canvas 2D. It must pause offscreen and in hidden tabs (2.6). It costs battery all the time.
- **JS:** 6 to 10 KB.
- **Childish or ad risk:** medium. It looks like screensavers and generic "creative agency" heroes.
- **Maintenance:** good. Physics handles 3 to 8 pearls, but long labels collide while moving.
- **Verdict:** pretty but meaningless (lesson P7). It also fails interaction clarity and accessibility. Keep only an **interaction-triggered** buoyancy.

### Concept D: "Data-Honest Pearl Cluster"

- **Description:** a packed cluster in which each direction is a large pearl surrounded by small seed pearls, **one per real project or paper**. The cluster can be counted and audited.
- **Mapping:**
  - Large-pearl radius: roughly the square root of the item count, clamped (section 6.3).
  - Small pearls: exactly one per project, from the CMS.
  - Projects in several directions: the seed sits in its primary direction's group, and a faint thread to the secondary group is an option for v2.
- **Flow:**
  - Hover or focus a direction pearl and its seeds fan out 4 px. A caption shows "n projects · m papers".
  - Clicking morphs the pearl into the page header. The seeds become the project list's bullets in v2.
- **Colour carry-over:** each group carries the direction's colour as a glow inside its pearls.
- **Mobile:** a smaller decorative cluster plus a list (6.10).
- **Reduced motion:** the cluster is static, which is natural here.
- **Keyboard / screen reader:** direction pearls are links in an `<ol>`. Seeds are `aria-hidden`, with their counts given in text.
- **Technique:** d3-hierarchy packing plus d3-force relaxation at build time, positioned HTML elements, CSS.
- **JS:** 0 KB for layout, plus about 2 to 3 KB for interaction.
- **Childish or ad risk:** low to medium. A cluster reads as a figure, not a product shot.
- **Maintenance:** very good. The layout regenerates from CMS data, and seeds grow as projects are added.
- **Verdict:** strong. It needs framing so the cluster reads as intentional and labelled rather than a pile.

### Concept E: "The Pour" (scroll-told)

- **Description:** scrolling the home page pours a drink. Each layer that settles reveals one direction as a band with a pearl, title and summary. The cup fills as you read.
- **Mapping:** each layer is a direction. Layer colour comes from the direction's colour. Pearls sink into each band.
- **Flow:** scroll reveals each band. Clicking a band or its pearl opens the page. A progress rail shows the cup's level.
- **Colour carry-over:** the band colour becomes the page's header band, so continuity is natural.
- **Mobile:** good, because native vertical scroll is the interaction (P8).
- **Reduced motion:** the bands are already on the page and just appear, with no pour or parallax. WCAG 2.3.3 notes scroll-linked parallax is a common trigger.
- **Keyboard / screen reader:** the bands are just sections with headings and links, which is fine.
- **Technique:** CSS scroll-driven animations (`animation-timeline: scroll()`) need no JS. Support: Chrome/Edge 115+, Safari and iOS 26+, Firefox desktop only in 161, Firefox Android not supported. DOCUMENTED: https://caniuse.com/mdn-css_properties_animation-timeline_scroll . Firefox would need a fallback such as IntersectionObserver (about 2 KB) or GSAP ScrollTrigger (27 KB core plus the plugin, plugin size UNKNOWN).
- **JS:** 0 to 30 KB.
- **Childish or ad risk:** medium. A pouring drink is beverage-ad language. It can be made abstract.
- **Maintenance:** medium. Each band is art-directed, and 8 bands make a very long home page. Directions sit below the fold, and only one is visible at a time.
- **Verdict:** beautiful storytelling, but it buries the overview, which is the most important thing a lab home page provides. Keep the idea of **layered bands** for the direction pages (and the "About" story) rather than the home page.

### Concept F (new): "Fig. 1, the Annotated Specimen"

- **Description:** the pearls are shown as a scientific figure. There is a light plate background, leader-line callouts numbered 01–0N in a monospace face, and a caption that reads like a figure caption and doubles as a legend, e.g. "Fig. 1. Research directions of BOBALAB. Each large pearl is a direction; each small pearl is one project."
- **Mapping:** as in D, or as in A if the data is thin.
- **Flow:**
  - Hover or focus a pearl and its leader line darkens and extends.
  - The caption panel under the figure swaps to that direction's one-sentence summary and counts.
  - Clicking morphs the pearl into the page header.
- **Colour carry-over:** the callout number and leader line use the direction's deep colour, and so does the page.
- **Mobile:** the callouts collapse to numbers on the pearls, and the caption becomes a list (6.10).
- **Reduced motion:** static by design.
- **Keyboard / screen reader:** an `<ol>` of links, read in callout order. The caption is the link's description.
- **Technique:** HTML, CSS and inline SVG for the leader lines, with no filters. **JS:** about 1 to 3 KB.
- **Childish or ad risk:** **low.** It uses the visual language of a paper, and the boba becomes wit rather than costume.
- **Maintenance:** good. Labels live outside the pearls, so long names don't distort pearls. Callout collision is solved by a deterministic 1-D sweep (6.5).
- **Verdict:** this is the credibility layer the other concepts lack.

### Concept G: "Liquid Realism" (WebGL)

- **Description:** a photoreal glass of milk tea rendered with three.js or React Three Fiber. Pearls are translucent with refraction and subsurface scattering, the liquid surface ripples under the pointer, and metaballs merge.
- **Mapping:** pearls are directions, with 3D depth.
- **Flow:** hover makes a pearl rise toward the camera. Clicking zooms the camera into it, then crossfades to the page.
- **Colour carry-over:** the shader tints the liquid.
- **Mobile:** heavy for GPUs and batteries. An adaptive-quality fallback is required.
- **Reduced motion:** a static rendered image is needed, plus a list.
- **Keyboard / screen reader:** the canvas is opaque to assistive technology, so a full parallel DOM list is needed.
- **Technique:** three.js (185 KB gz) plus R3F (58 KB) plus shaders, or OGL (34 KB) plus custom shaders. It needs `frameloop="demand"`, visibility pausing and a `PerformanceMonitor` (2.6, 2.10).
- **JS:** 60 to 260 KB.
- **Childish or ad risk:** **high.** Photoreal boba is literally beverage marketing.
- **Maintenance:** poor. Shader and 3D work can't be maintained by lab members.
- **Verdict:** rejected for the home page. At most a single **pre-rendered** still image could be used for an OG image.

---

## 5. Scores

Scores run 1–5, where 5 is best. For performance, 5 means lightest. All scores are HYPOTHESIS: my structured judgment using the evidence in sections 2–3.

| Concept | Originality / recognisability | Academic credibility | Visual quality potential | Interaction clarity | Accessibility | Mobile | Load / runtime perf | Long-term maintenance | **Total /40** |
|---|---|---|---|---|---|---|---|---|---|
| A Pearl Menu (original) | 2 | 3 | 3 | 5 | 5 | 4 | 5 | 5 | **32** |
| B Cup + Straw | 4 | 2 | 4 | 2 | 3 | 3 | 4 | 2 | **24** |
| C Drifting Constellation | 3 | 3 | 4 | 3 | 2 | 2 | 3 | 4 | **24** |
| D Data-Honest Cluster | 4 | 5 | 4 | 4 | 4 | 3 | 5 | 4 | **33** |
| E The Pour (scroll) | 4 | 3 | 5 | 3 | 3 | 4 | 3 | 3 | **28** |
| F Fig. 1 Annotated Specimen | 5 | 5 | 4 | 4 | 4 | 3 | 5 | 4 | **34** |
| G Liquid Realism (WebGL) | 4 | 2 | 5 | 3 | 2 | 2 | 1 | 2 | **21** |
| **Recommended hybrid (D+F, plus B's resting pearls and C's buoyancy)** | **5** | **5** | **5** | **5** | **5** | **4** | **5** | **4** | **38** |

Why the hybrid beats D and F on their own (HYPOTHESIS):
- F's caption-as-legend and numbered callouts fix D's main weakness, which is "what am I looking at?"
- D's real counts give F's figure honest content.
- The resting-in-milk-tea field (from B) and interaction-only buoyancy (from C) supply the boba warmth without a cup, a straw or perpetual motion.

---

## 6. Recommended primary concept: "Fig. 1: the Pearl Cluster" (engineering spec)

All parameters below are HYPOTHESIS design decisions unless they cite section 2. Tune them in prototype.

### 6.1 Composition (desktop, viewport 1024 px or wider)

```
┌───────────────────────────────────────────────────────────────────────┐
│  BOBA LAB wordmark                       Research  People  Pubs  Join │
│                                                                       │
│  Berkeley Operations &       ┌──── milk-tea field ────────────────┐   │
│  Behavioral Analytics Lab    │ ~~~~~~~ meniscus line ~~~~~~~~~~~~ │   │
│                              │ 01 ─────╮                          │   │
│  One-sentence mission        │          ●  ∘∘     ╭──── 03        │   │
│  (Fraunces 40–56px)          │   02 ───●●∘   ●∘∘──╯               │   │
│                              │        ∘∘● ∘∘●∘   ╭── 04           │   │
│  [Read our research →]       │          ∘ ●●∘ ∘──╯                │   │
│                              └────────────────────────────────────┘   │
│                              Fig. 1 — caption / legend panel (live)   │
└───────────────────────────────────────────────────────────────────────┘
```

- **Grid.** Left 5/12: identity and mission. Right 7/12: the figure.
- **Figure box.** `aspect-ratio: 4/3`, max-height 72vh.
- **Milk-tea field.** A vertical gradient from milk `#F7F1E8` at the top to milk tea `#E9DAC4` at the bottom. A 1 px meniscus line in `#D8CAB6` sits 8% from the top, its ends curving up 4 px.
- **Grain.** A static 128x128 noise PNG at 3% opacity. It is prerendered, not a live `feTurbulence`.
- **Gravity.** Pearls "rest" toward the bottom because the build-time layout adds a weak downward force. That is the only physics the viewer sees.

### 6.2 Data model in the CMS, with validation

```
Direction { slug, shortLabel (≤ 28 chars, required), title (≤ 90), summary (≤ 160 chars),
            color: enum["taro","matcha","thaiTea","butterflyPea","lychee","oolong","sesame","jasmine"],
            order: int, weightOverride?: number }
Project   { slug, title, directions: Direction[] (first = primary), status, year, papers[] }
```

- **shortLabel vs title.** R1's longest candidate, "Human-AI Decision Making (Designing Advice People Use)", is 54 characters. It becomes shortLabel "Human–AI Decisions" plus the full title on its page.
- **Build-time checks:**
  - 2 to 8 directions. Fewer than 2 or more than 8 fails the build with a friendly message: "group directions or use list mode".
  - Colours are unique.
  - shortLabel length is within the limit.
  - Every direction has at least one project. If one has none, it gets a single seed and the caption says "new direction".
  - All contrast pairs in section 7 pass. They are computed from the swatch enum, so editors **cannot** choose a failing colour.
- **Design note.** The task asks for 3–8 directions, but the lab's own blurb lists only 2 areas (1.1). The layout must therefore also be tested at n = 2.

### 6.3 Layout algorithm (runs on the server or at build; output is JSON)

1. **Sizes, in abstract units with R0 = 1.**
   - Item count per direction: `w_d = max(1, primaryProjectCount_d)`, unless the editor sets `weightOverride`.
   - Direction radius: `R_d = clamp(0.85, 1.15, 1 + 0.15 * z_d)`, where `z_d` maps `sqrt(w_d)` onto the range -1 to +1 across directions.
   - This is deliberately **not** strictly proportional. Directions get visual parity, and the honest count comes from the seeds (lessons P1 and P6). The caption discloses it: "pearl size lightly reflects activity; small pearls = projects."
2. **Seeds.**
   - One seed per project, radius `r_s = 0.24`.
   - Above 18 seeds in a group, use `r_s * sqrt(18/n)`, with a floor of 0.14. The caption always states the exact count.
   - A multi-direction project appears only in its primary group in v1.
3. **Group packing.** For each direction, run `d3.packSiblings([big, ...seeds])`. The big pearl is placed first, so the seeds wrap around it. Then `g.R = packEnclose(...).r + 0.12` (padding).
4. **Cluster packing.** `d3.packSiblings(groups)` in editorial order, which is deterministic with d3-hierarchy 3.1.2 or later (2.9).
5. **Settling relaxation, offline.** Run d3-force on groups, using the default fixed-seed RNG (2.9):
   - `forceCollide(g => g.R + 0.10).strength(1).iterations(3)`
   - `forceX(0).strength(0.04)`
   - `forceY(+0.35 * clusterR).strength(0.025)` to pull groups gently downward, "resting in the cup"
   - then `.stop().tick(300)`
6. **Fit.** Compute the cluster's bounding box. Scale it uniformly so it fits the figure box minus the label gutters (22% each side on desktop). Store `x`, `y` and `d` (diameter) as **percentages** of the figure box. Store each seed's offset relative to its parent too, so one group can be animated as a unit.
7. **Output.** `layout.json` keyed by breakpoint: `figure-desktop` (4:3), `figure-tablet` (1:1). Mobile uses no figure positions. The build regenerates it whenever CMS content changes, via ISR or webhook-triggered revalidation (HYPOTHESIS: decided in the stack report).

The server needs about 11 KB gz of d3 modules (2.10). **The client ships 0 KB of layout code.**

### 6.4 DOM and rendering

```tsx
<figure className="pearl-figure" aria-labelledby="fig1-cap">
  <nav aria-label="Research directions">
    <ol>
      {groups.map(g => (
        <li key={g.slug} style={{ "--x": g.x, "--y": g.y, "--d": g.d, ...g.colorVars }} data-slug={g.slug}>
          <Link href={`/research/${g.slug}`} transitionTypes={["pearl-open"]}
                aria-describedby={`desc-${g.slug}`}>
            <ViewTransition name={`pearl-${g.slug}`} share="pearl-morph" default="none">
              <span className="pearl" aria-hidden="true" />
            </ViewTransition>
            <span className="callout"><span className="idx">{g.idx}</span>{g.shortLabel}</span>
          </Link>
          <span className="seeds" aria-hidden="true">{/* n small .pearl.seed spans */}</span>
          <p id={`desc-${g.slug}`} hidden>{g.summary} {g.projects} projects, {g.papers} papers.</p>
        </li>
      ))}
    </ol>
  </nav>
  <svg className="leaders" aria-hidden="true">{/* one <path> per callout, precomputed */}</svg>
  <figcaption id="fig1-cap" aria-live="off">{/* legend by default; active summary on hover/focus */}</figcaption>
</figure>
```

- **Pearls are HTML spans inside real links.** The links are focusable, work with no JS, and move with composited transforms (2.5). Positioning: `position:absolute; left:calc(var(--x)*1%); top:calc(var(--y)*1%); width:calc(var(--d)*1%); translate:-50% -50%`.
- **The link covers both the pearl and its callout label**, so the label is clickable too.
- **Hit area.** Each pearl's hit area is at least 44 px even when the pearl looks smaller, via an `::after` ring. Seeds are not interactive, which satisfies WCAG 2.5.8 (2.8).

### 6.5 Pearl material: translucent tapioca without kitsch

The reference is real tapioca: a dark brown core, slightly translucent warm edges, one soft specular highlight, a satin sheen and no outline (HYPOTHESIS, observational). Every layer is painted once and nothing is animated except `transform` and `opacity`.

```css
.pearl {
  aspect-ratio: 1; border-radius: 50%; position: relative;
  background:
    radial-gradient(circle at 50% 80%, var(--dir-glow) 0, transparent 58%),     /* syrup glow (direction color, ~45% alpha) */
    radial-gradient(circle at 46% 40%, #3A281D 0, #2B1D15 52%, #1A110C 100%);   /* tapioca body */
  box-shadow:
    inset 0 -0.08em 0.16em rgb(0 0 0 / .35),        /* lower core shading */
    inset 0 0 0 1px rgb(255 255 255 / .05),          /* barely-there rim */
    0 0.35em 0.6em -0.3em rgb(31 23 18 / .35);       /* contact shadow on the milk */
}
.pearl::before {                                      /* specular: own layer so it can move via transform */
  content:""; position:absolute; inset:14% 46% 54% 18%; border-radius:50%;
  background: radial-gradient(closest-side, rgb(255 255 255 / .55), rgb(255 255 255 / 0));
  transition: transform 200ms cubic-bezier(.2,.8,.2,1);
}
.pearl.seed { /* same recipe, glow at 30% alpha, no contact shadow */ }
```

- **Dark mode:**
  - Body `#3A2C22` to `#4A372A`.
  - Add a 1 px rim `#A47E62` at 70% alpha. The body alone has only about 1.4:1 contrast against night `#17110E`. The rim gives about 5.1:1, which keeps the pearl's outline visible (section 7).
- **Avoid:** cartoon outlines, faces or eyes, a pure-white specular blob, rainbow pastels, bouncing, straws, "slurp" sounds.

### 6.6 Callout labels and leader lines (deterministic)

1. **Side.** For each direction pearl, take the angle θ from the cluster centroid to the pearl centre. The callout goes on the **right** if cos θ ≥ 0, otherwise the left.
2. **Initial position.** `y_label = y_pearl`, and `x_label` is the bounding-box edge plus 24 px, in the side gutter.
3. **Collision sweep, per side.**
   - Sort labels by y.
   - Push each down so `y_i ≥ y_{i-1} + h_{i-1} + 12px`.
   - If the last label overflows the bottom, shift the whole stack up.
   - Label height comes from 2 lines × 1.25 lh at the label font size, a deterministic approximation. Labels are capped at 22ch width and 2 lines.
4. **Leader line.** It starts on the pearl's edge at angle θ, runs radially out to the cluster's bounding circle plus 8 px, then horizontally to the label.
   - Stroke: 1 px, `var(--line)` normally and `var(--dir-deep)` when active.
   - It ends in a 3 px dot. The path is stored with the layout JSON.
5. **Label typography.**
   - The index ("01") is IBM Plex Mono 12 px, letter-spacing .06em, in `--dir-deep`.
   - The label is Inter 600 at 15–17 px in `--ink`.
   - With 7 or more directions, both sides are used. With 4 or fewer, all labels can sit on one side if that reads better (an editorial toggle).
6. **Container narrower than 720 px:** callouts hide and the numbered list (6.10) takes over.

### 6.7 Hover/focus preview: a "live caption" instead of floating cards

- **Default caption (the legend):** "Fig. 1 — Research directions of BOBALAB. Large pearls are directions; small pearls are individual projects. Pearl size is lightly scaled by activity."
- **On hover** (pointer with `(hover: hover)`, after an 80 ms intent delay) **or keyboard focus** (no delay), the caption swaps to the active direction:
  - index and shortLabel, as a heading
  - the one-sentence summary
  - "6 projects · 9 papers · 2026 – present"
  - "Open →" (decorative, since the pearl is the link)
- The swap animates with opacity 0→1 and `translateY(4px→0)`, 180 ms, `cubic-bezier(.2,.8,.2,1)`.
- **Why a fixed caption rather than floating cards (HYPOTHESIS):**
  - It never collides or overlaps, whether there are 3 or 8 pearls or long labels.
  - It never covers content, which avoids the WCAG 1.4.13 issues of dismissible, hoverable and persistent pop-ups (2.8).
  - It looks like a real figure caption.
- When the pointer leaves the figure, the caption returns to the legend after 300 ms.
- Implementation: about 0.5 KB of JS that sets `data-active` from `pointerenter`/`focusin`. Without JS the legend just stays.

### 6.8 Motion parameters

| Moment | What moves | Values | Gate |
|---|---|---|---|
| **Intro settle** (first view per session) | Each group: `translateY(-14px)→0`, opacity 0→1, with keyframes 0% −14 px, 72% +2 px, 100% 0 | 700 ms, `cubic-bezier(.22,1,.36,1)`, 70 ms stagger in editorial order. Seeds start 40 ms after their parent. Callouts fade in (opacity) 180 ms after their pearl lands. **Total ≤ 1.6 s with 8 groups, and nothing loops**, so no WCAG 2.2.2 control is needed (2.7). | `no-preference` only |
| **Hover/focus: active pearl** | `scale(1.06) translateY(-3px)`. Specular `::before` `translate(6%, 4%)` | 200 ms, `cubic-bezier(.2,.8,.2,1)`. Out: 160 ms ease-out | Scale and lift only under `no-preference`. Under `reduce`, use a 2 px ink outline plus a colour change |
| Hover/focus: its seeds | Each seed `translate` radially outward by 4 px | 260 ms, same easing, 15 ms stagger | `no-preference` |
| Hover/focus: other groups | opacity 1 → .55 | 200 ms linear | Both modes (opacity is not a vestibular trigger) |
| Leader line (active) | Stroke colour to `--dir-deep`, 1 px→1.5 px | 160 ms. A line-width change is a cheap repaint on a tiny path | Both |
| **Pointer buoyancy** (fine pointer only) | Each big pearl's group shifts toward the pointer: `k = clamp(1 - dist/220px, 0, 1)`, `offset = k² · 6px`. Neighbours within 140 px move 2 px **away** ("displaced milk") | A spring with stiffness 170, damping 26, mass 1 in one tiny rAF loop that **sleeps** once all `abs(v) < .01` and `abs(Δ) < .1` px. The loop also pauses on `visibilitychange` and when IntersectionObserver reports the figure offscreen (2.6). Uses timestamp deltas. | `(hover:hover) and (pointer:fine)` and `no-preference` |
| **Click → direction page** (shared morph) | The pearl group grows into the 120–160 px hero pearl on the page | `::view-transition-group(.pearl-morph)` 480 ms, `cubic-bezier(.2,0,0,1)`. Image-pair keyframe: a soft 2 px blur at 30% to hide interpolation artefacts (Next guide pattern, 2.2) | `no-preference`. Under `reduce`: 0 ms, or a 120 ms opacity-only crossfade |
| Click: page swap | Old root: opacity 1→0 plus `translateY(0→8px)` (other pearls "sink") over 150 ms ease-in. New root: opacity 0→1 over 210 ms ease-out after a 150 ms delay. Background crossfades from milk to the direction's tint | Timings from the Next guide (2.2) | As above |
| Back to home (`nav-back` link) | The reverse morph. The pearl returns to its exact layout slot because positions are deterministic | 420 ms | As above. Browser back: the named morph only (2.2) |

Also set `::view-transition { pointer-events: none; }` (2.2).

### 6.9 Carrying the theme colour into the direction page

- **Scoping.** `app/research/[slug]/page.tsx` wraps content in `<div data-dir style={{'--dir-deep','--dir-tint','--dir-light','--dir-glow'}}>`. The values are precomputed at build from the swatch enum (section 7), not taken from free-form CMS hex values.
- **Page anatomy:**
  - A header band in `--dir-tint`, in light mode.
  - The hero pearl (the morph target), 120–160 px, at the start of the title row.
  - Title in Fraunces. Breadcrumb "Research / 02".
  - Links and active-tab underlines in `--dir-deep`.
  - **Project list bullets are 10 px seed pearls.** v2 option: give each seed a `ViewTransition name` so home-page seeds fly into the bullets, with at most 24 names. Only one element per name may be mounted at a time (2.2).
- **Sibling navigation.** A "More directions" rail of 40 px pearls at the bottom. Moving between siblings uses `transitionTypes={['nav-forward']}` or `['nav-back']` with a 60 px slide (2.2). The header stays fixed by its own `viewTransitionName`.
- **Dark mode.** Accents use `--dir-light` on night `#17110E`. The header band is night plus a 6% tint overlay. The project pages for that direction inherit the same variables.
- **Prefetching.** For the morph to play, the direction page must be ready in the same commit. Make direction pages **statically generated and prefetched**. If a page suspends, the morph silently becomes a plain enter (2.2).

### 6.10 Mobile and touch (container narrower than 720 px)

- **Hero:** wordmark, one-line mission, then a **compact decorative cluster**. It uses the same layout JSON at 1:1, at most 240 px tall, is `aria-hidden`, has no callouts and no interaction.
- **Directions list.** Below the hero, under the heading "Research directions", an `<ol>` of full-width rows:
  - each row: a 44 px pearl, an index (Plex Mono), shortLabel (Inter 600, 17 px), "6 projects" (muted) and a chevron
  - row min-height 64 px, so the whole row is the target (≥ 24 px per WCAG 2.5.8, ≥ 44 px comfortable)
- **Pressed state:** `scale(.98)` on `:active` for 100 ms. The **row's pearl** is the morph source, so the same transition plays.
- **Tablet, 720–1023 px:** the figure shows numbers only, placed beside the pearls, and the list sits next to or below it. The numbers connect the two.
- **Touch rules.** No hover cards under `(hover: none)`. No pointer buoyancy. Leave `touch-action` at its default and don't block zoom (2.8).

### 6.11 Reduced motion, no JS, no View Transitions

- **Reduced motion (`reduce`):**
  - No intro, buoyancy or seed fan-out.
  - Hover and focus become an outline plus a colour change.
  - View-transition durations are 0, or a ≤120 ms opacity crossfade.
  - All motion CSS sits inside `@media (prefers-reduced-motion: no-preference)`, the motion-last approach. A JS `matchMedia` listener stops the buoyancy loop live (2.7).
- **No JS:** server-rendered pearls and links work. Captions show the legend. Navigation is ordinary.
- **No View Transition support:** navigation is instant (2.1, 2.2).
- **Optional "Calm mode" toggle** in the footer, stored per viewer. It forces the reduced styles for anyone who wants them without changing OS settings. WCAG 2.3.3 mentions a site-level control as an example (2.7).

### 6.12 Keyboard and screen reader

- There is one navigation landmark, "Research directions", containing an **ordered list of real links**. The figure is the list; it is not a picture with a hidden duplicate.
- **DOM order is the callout number order** (01→0N). Editors set the order, and the layout places 01 first in the reading flow, so the visible numbers match focus order.
- **Accessible names.** Link name = shortLabel. Description (`aria-describedby`) = summary plus counts. Pearls, seeds and leader lines are `aria-hidden`.
- **Focus ring.** 2 px solid `--ink` (`#1F1712`) with a 3 px offset that follows the pearl's border-radius. On the night background the ring is `#E0A46B` (8.6:1). The callout text also gets an underline.
- **Esc** returns the caption to the legend. Not strictly required, since the caption never obscures anything, but kind.
- A **"Skip figure"** link is not needed: the list is short and is itself the navigation.

### 6.13 Performance budget and runtime hygiene

- **Client JS for the signature interaction:** at most 4 KB gz (caption swap plus spring loop). No animation library. React's `<ViewTransition>` is part of React.
- **First paint:** the pearls are server-rendered CSS, so there is **no LCP or CLS penalty**. The figure's `aspect-ratio` reserves space.
- **No live SVG filters** (`feGaussianBlur`/`feColorMatrix`) anywhere in the always-visible UI. Safari has no GPU path for them (2.4).
- **No continuous loop.** The rAF loop exists only while a spring is settling (2.6).
- **Test budget (HYPOTHESIS):**
  - a mid-range Android (e.g. Moto G-class) and an older iPhone should both hold 60 fps during hover and buoyancy
  - Lighthouse mobile performance ≥ 95 on the home page
  - Playwright visual snapshots for n = 2, 3, 4, 6, 8 directions; labels of 8, 28 and 54 characters (the last truncated to shortLabel); seeds of 0, 1, 7 and 24

### 6.14 Where boba motifs appear elsewhere (sparingly)

| Place | Motif | Restraint rule |
|---|---|---|
| Wordmark and favicon | The pearl-O (section 8) | One pearl, one highlight |
| Section dividers | The **meniscus rule**: a hairline whose ends curve up 4 px | At most one per section |
| List bullets (projects, news) | 8–10 px seed pearls in the direction colour | Always next to text, never the only signal |
| Publication tags | A small coloured pearl plus a text label | Colour is never the only carrier (WCAG 1.4.1) |
| Loading state (Suspense fallback) | Three seeds settling once (600 ms) | Static text under `reduce` |
| People page | No pearl gloss on photos. Circular crops are fine | Keep portraits honest |
| 404 page | The **only** joke: "This page got stuck in the straw" | Once, and nowhere else |
| OG / social image | A prerendered still of Fig. 1 at 1200x630 | No 3D cup |
| Never | Cups, straws, kawaii faces, "tea-rrific" puns, bubble fonts, neon pastels | |

---

## 7. Palette (hex) with WCAG 2.x contrast ratios

Ratios were computed with the WCAG relative-luminance formula by `tools/contrast.py` in this research folder, on 2026-10-20.
- **DOCUMENTED (computed):** the ratios themselves.
- **HYPOTHESIS:** the colour choices and their names.
- Thresholds: 4.5:1 for body text (AA), 3:1 for large text and UI or graphical objects, 7:1 for AAA.

### 7.1 Core, light mode

| Token | Hex | Use |
|---|---|---|
| `--milk` (page bg) | `#F7F1E8` | Background |
| `--card` | `#FFFCF7` | Raised surfaces |
| `--oat` | `#EFE6D8` | Sunken or alternate sections |
| `--milktea` | `#E9DAC4` | Bottom of the hero gradient |
| `--ink` (tapioca) | `#1F1712` | Text, focus ring |
| `--steeped` (muted) | `#5C4F45` | Secondary text |
| `--brown-sugar` | `#8A4515` | Links, primary buttons |
| `--line` | `#D8CAB6` | **Decorative hairlines only** (1.43:1, never for text or UI boundaries) |
| `--pearl` | `#2B1D15` | Pearl body |

| Text / foreground on background | Ratio | Level |
|---|---|---|
| ink on milk | 15.72 | AAA |
| ink on card | 17.25 | AAA |
| ink on oat | 14.27 | AAA |
| ink on milktea | 12.85 | AAA |
| steeped on milk | 7.03 | AAA |
| steeped on card | 7.72 | AAA |
| steeped on oat | 6.39 | AA |
| steeped on milktea | 5.75 | AA |
| brown-sugar on milk | 6.36 | AA |
| brown-sugar on card | 6.97 | AA |
| brown-sugar on oat | 5.77 | AA |
| brown-sugar on milktea | 5.20 | AA |
| milk on ink (dark button) | 15.72 | AAA |
| milk on brown-sugar (primary button) | 6.36 | AA |
| pearl body vs milk (graphic) | 14.51 | ≥3:1 OK |
| pearl body vs milktea (graphic) | 11.86 | ≥3:1 OK |
| focus ring ink vs milk | 15.72 | ≥3:1 OK |

### 7.2 Core, dark mode

| Token | Hex |
|---|---|
| `--night` (bg) | `#17110E` |
| `--night-surface` | `#221A15` |
| `--milk-text` | `#F3ECE2` |
| `--muted-dark` | `#BFB2A5` |
| `--brown-sugar-light` (links, focus) | `#E0A46B` |
| `--pearl-rim` | `#A47E62` |

| Pair | Ratio | Level |
|---|---|---|
| milk-text on night | 15.95 | AAA |
| milk-text on night-surface | 14.60 | AAA |
| muted-dark on night | 9.02 | AAA |
| muted-dark on night-surface | 8.26 | AAA |
| brown-sugar-light on night | 8.63 | AAA |
| brown-sugar-light on night-surface | 7.90 | AAA |
| pearl-rim vs night (graphic boundary) | 5.11 | ≥3:1 OK |
| pearl body `#3A2C22` vs night | 1.39 | **Fails alone**, so the rim is mandatory |

### 7.3 Direction colours (8 "tea menu" swatches; the CMS enum)

- Each swatch has three tones:
  - **deep**: text and accents on milk, and milk text on a deep header
  - **tint**: header band behind ink text
  - **light**: dark-mode accent, and night text on a light chip
- Mapping to directions is the editors' choice. Suggested (HYPOTHESIS): future of work / gig → Thai tea, human–AI → Butterfly pea, GenAI at work → Taro, worker learning → Jasmine, pricing → Oolong, cities → Matcha, other → Sesame. Lychee is spare.

| Swatch | deep | tint | light (dark mode) | deep on milk | milk on deep | ink on tint | deep on tint | steeped on tint | light on night | light on night-surface | night on light |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Taro | `#5E4391` | `#ECE5F4` | `#C6B3EB` | 6.96 | 6.96 | 14.36 | 6.36 | 6.42 | 9.84 | 9.01 | 9.84 |
| Matcha | `#3E6A2F` | `#E3ECD8` | `#A9CF8F` | 5.65 | 5.65 | 14.51 | 5.22 | 6.49 | 10.69 | 9.79 | 10.69 |
| Thai tea | `#A0461C` | `#F7E3D3` | `#F2A57A` | 5.52 | 5.52 | 14.19 | 4.98 | 6.35 | 9.30 | 8.51 | 9.30 |
| Butterfly pea | `#2F519B` | `#DFE6F5` | `#A9C0F2` | 6.75 | 6.75 | 14.10 | 6.05 | 6.31 | 10.25 | 9.38 | 10.25 |
| Lychee | `#993452` | `#F5DFE5` | `#F0A5BC` | 6.30 | 6.30 | 13.93 | 5.58 | 6.23 | 9.63 | 8.82 | 9.63 |
| Oolong | `#7A5913` | `#F1E8CC` | `#E3C26E` | 5.73 | 5.73 | 14.42 | 5.25 | 6.45 | 10.87 | 9.95 | 10.87 |
| Black sesame | `#45413C` | `#E6E2DC` | `#CFC8C0` | 9.02 | 9.02 | 13.68 | 7.85 | 6.12 | 11.29 | 10.33 | 11.29 |
| Jasmine (teal) | `#1E6660` | `#D8EBE8` | `#8FD3C9` | 5.99 | 5.99 | 14.26 | 5.43 | 6.38 | 10.98 | 10.05 | 10.98 |

- All listed text pairs pass AA (≥4.5:1). Most dark-mode pairs pass AAA.
- The pearl glow `--dir-glow` is the deep colour at about 45% alpha **inside** the pearl. It is decorative, so no contrast requirement applies.
- **Colour-vision caution (HYPOTHESIS):** Thai tea, Lychee and Oolong may be confusable under deuteranopia. Numbers and labels always accompany colour, so meaning never depends on hue. Run a CVD simulation before launch.
- **Keep away from Berkeley and Haas brand colours.** Haas Blue `#003057` and California Gold `#FDB515` (1.7) are deliberately absent, so nothing implies an official mark.

---

## 8. Type and wordmark

### 8.1 Type pairing (all SIL OFL 1.1, available from Google Fonts and Fontsource)

| Role | Family | Why | License / axes (DOCUMENTED) |
|---|---|---|---|
| Display: headlines, wordmark "BOBA" | **Fraunces** (variable) | A soft, old-style "wonky" serif. Its **SOFT** axis rounds the terminals, a tapioca softness without a "bubble font". Optical sizes let headlines look crafted and small text stay sober. Headlines: opsz 72–144, wght 560–680, SOFT 50–100, WONK 0. Never used for body text. | OFL-1.1. Axes: opsz 9–144, wght 100–900, SOFT 0–100, WONK 0–1, ital. https://api.fontsource.org/v1/fonts/fraunces , https://api.fontsource.org/v1/variable/fraunces , https://github.com/undercasetype/Fraunces |
| Text and UI | **Inter** (variable) | A neutral, highly legible sans. Haas already lists it as a tertiary typeface (1.7), so pages sit naturally beside Haas pages without using any mark. | OFL-1.1. Axes: opsz 14–32, wght 100–900, ital. https://api.fontsource.org/v1/fonts/inter |
| Data and indices: callout numbers, years, DOIs, "LAB" | **IBM Plex Mono** | Signals "analytics". Its tabular digits suit counts and years. | OFL-1.1, static weights 100–700. https://api.fontsource.org/v1/fonts/ibm-plex-mono |
| Alternative B (more sober) | Newsreader (variable) + Public Sans (variable) | If Fraunces SOFT feels too playful to the PI. | Both OFL-1.1. https://api.fontsource.org/v1/fonts/newsreader , https://api.fontsource.org/v1/fonts/public-sans |

- **Loading (HYPOTHESIS):**
  - Self-host with `next/font` or Fontsource, subset to `latin` and `latin-ext`.
  - Load Fraunces once, as one variable file with only the axes you use.
  - **Ship the wordmark as inline SVG outlines** so it never waits for fonts.
- Fraunces variable file size is **UNKNOWN**. Measure it and fall back to two static instances if it exceeds about 60 KB.

### 8.2 "BOBALAB" wordmark idea (typographic only; no UC or Haas marks)

**Primary, "pearl-O":**
- **BOBA** in Fraunces (opsz 144, wght 680, SOFT 100, WONK 0), immediately followed by **LAB** in IBM Plex Mono Medium, tracked +0.08em.
- The mono part is optically scaled so its cap height matches.
- The **O** of BOBA is a solid **tapioca pearl**:
  - a circle exactly as tall as the cap height, plus about 2% overshoot, in `--ink`
  - one soft crescent highlight at 10 o'clock, milk at 35% opacity
  - the highlight is dropped below 24 px
- The meaning: soft humanist serif (behavioural) next to mono (analytics), which mirrors the lab's name.
- **Descriptor lockup:** "Berkeley Operations & Behavioral Analytics Lab" below, in Inter 500, letter-spaced .04em, `--steeped`, left-aligned.
- **Favicon / avatar:** the pearl-O alone, or "B" plus the pearl.
- **Monochrome:** pure ink, with the highlight knocked out as a milk crescent.

**Alternate, "BOBA·LAB":** the interpunct between the words is the pearl (the same circle at x-height). It is quieter and suits a PI who wants less play.

**Rules:**
- No Berkeley or Haas logos, seal, Cal script, bear, Sather Stripe, or Haas Blue and Gold pairing.
- Affiliation goes in the footer as **plain text**: "Haas School of Business, University of California, Berkeley".
- If the lab later wants an official affiliation lockup, the documented route is a request to Haas MarCom or the campus signature system. Haas notes that its program lockups are meant for merchandise (1.6, 1.7).

---

## 9. Risks and mitigations (HYPOTHESIS)

| Risk | Mitigation |
|---|---|
| Looks like a boba-shop ad | No cups or straws. Muted "tea menu" palette. A figure caption with real counts. Fraunces only for headlines. Puns limited to the 404 page. |
| Looks childish | No bouncing, faces or pastels. A single settle on load, then stillness. Pearl material reads as satin and translucent, not toy plastic. |
| Uneven direction counts make some directions look unimportant | Clamp radius to ±15%. Honesty carried by the seed count. The caption discloses the scaling. |
| Long names | The shortLabel/title split is enforced in the CMS. Callouts are capped at 2 lines and 22ch. |
| Only 2 directions at launch | The layout is tested at n = 2. In "list mode" the cluster still looks intentional with 2 groups plus their seeds. |
| A project in several directions | v1: primary group only, with secondary directions shown as tags on the project page. v2: faint "threads" between groups. |
| Safari quirks with view transitions | Prefer opacity and transform keyframes. Test on iOS 18 and 26. Navigation still works if the transition fails (2.2). |
| The morph doesn't play because the page wasn't prefetched | Statically generate direction pages and prefetch links. An enter animation is the acceptable fallback. |

---

## 10. Open questions for the owner

1. How many directions at launch? The lab blurb says 2; Park's site says 4; R1 proposes 6. Can the PI confirm the set and the short labels?
2. Should seeds be **projects** or **papers**? Papers are countable and public. Projects may include unannounced work, so confirm with the PI what may be shown.
3. Is Fraunces SOFT acceptable to the PI, or should the site use the sober alternative B?
4. Does the lab want an official Haas affiliation lockup, or is plain-text affiliation enough?
5. Should "Calm mode" be a visible footer toggle or rely on the OS setting alone?
6. Confirm the stack (Next.js App Router with static generation). The interaction spec assumes same-document view transitions.

---

## 11. Sources

All accessed 2026-10-20.

**Lab and content**
- https://parksinchaisri.github.io
- https://haas.berkeley.edu/faculty/park-sinchaisri/
- https://reslife.berkeley.edu/academics/resident-faculty-program/resident-faculty-directory/park-sinchaisri/
- Sibling task output: `R1-content-park.json` (themes and counts; grouping is HYPOTHESIS)

**Brand**
- https://brand.berkeley.edu/visual-identity/logos
- https://brand.berkeley.edu/visual-identity/signature-system/
- https://haas.berkeley.edu/brand-hub/visual-identity/

**View transitions, React and Next.js**
- https://caniuse.com/view-transitions
- https://caniuse.com/cross-document-view-transitions
- https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available
- https://web.dev/blog/interop-2026
- https://react.dev/blog/2026/09/09/react-19-3
- https://react.dev/reference/react/ViewTransition
- https://nextjs.org/docs/app/guides/view-transitions
- https://github.com/vercel/next.js/issues/49279
- https://registry.npmjs.org/next
- https://registry.npmjs.org/react

**Motion**
- https://motion.dev/docs/react-reduce-bundle-size
- https://motion.dev/docs/react-accessibility
- https://motion.dev/docs/react-layout-animations

**Filters and compositing**
- https://www.chromium.org/developers/design-documents/image-filters/
- https://bugs.webkit.org/show_bug.cgi?id=263848
- https://www.firefox.com/en-US/firefox/132.0/releasenotes/
- https://css-tricks.com/gooey-effect/
- https://www.visualcinnamon.com/2016/06/fun-data-visualizations-svg-gooey-effect/
- https://web.dev/articles/animations-guide
- https://developer.chrome.com/blog/hardware-accelerated-animations

**Animation loops and accessibility**
- https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- https://web.dev/articles/prefers-reduced-motion
- https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover
- https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- https://caniuse.com/mdn-css_at-rules_media_prefers-reduced-transparency
- https://caniuse.com/mdn-css_properties_animation-timeline_scroll
- https://caniuse.com/css-has (via search)

**Layout libraries**
- https://d3js.org/d3-hierarchy/pack
- https://github.com/d3/d3-hierarchy/releases
- https://d3js.org/d3-force/simulation
- https://d3js.org/d3-force/collide

**Bundle and runtime sizes**
- https://bundlephobia.com/api/size?package=… (d3-force, d3-hierarchy, three, @react-three/fiber, lottie-web, @lottiefiles/dotlottie-web, @rive-app/canvas, motion, framer-motion, gsap, ogl)
- https://rive.app/docs/runtimes/runtime-sizes.md
- https://r3f.docs.pmnd.rs/advanced/scaling-performance

**Fonts**
- https://api.fontsource.org/v1/fonts/{fraunces,inter,ibm-plex-mono,newsreader,public-sans,instrument-serif}
- https://api.fontsource.org/v1/variable/{fraunces,inter}
- https://github.com/undercasetype/Fraunces

**Precedents**
- https://flowingdata.com/2012/02/15/slicing-obamas-2013-budget-proposal-four-ways/
- https://observablehq.com/@d3/zoomable-circle-packing
- https://www.datasketch.es/project/an-interactive-visualization-of-every-line-in-hamilton
- https://www.gapminder.org/tools/
- https://www2.hawkeslearning.com/Statistics/gapminder.html
- https://atlas.hks.harvard.edu/
- https://michelecoscia.com/?p=223
- https://flowingdata.com/2015/12/15/a-day-in-the-life-of-americans/
- https://neal.fun/deep-sea/
- https://mymodernmet.com/the-deep-sea
- https://laughingsquid.com/the-deep-sea/
- https://www.creativebloq.com/news/deep-sea-visualisation

**Access notes**
- These URLs could not be fetched directly: the NYT archive interactive (blocked by the fetch tool), the Observable notebook (HTTP 429), FlowingData (HTTP 403) and neal.fun (HTTP 403). Their claims rest on search-result summaries and the secondary sources listed, and are labelled to match.

---

## Critique (adversarial)

Reviewers: a skeptical senior design critic and a performance/accessibility engineer, working together. Review date: 2026-10-20. The original text above is unchanged.
Evidence labels follow the same scheme as the report: **DOCUMENTED** (primary source, with URL or local file), **CORROBORATED** (two or more independent sources), **HYPOTHESIS** (our inference or judgment), **UNKNOWN**.
Method:
- We re-read every technical claim against its source.
- For Next.js we read the **installed** `next@16.4.2` package in `C:/Users/jiami/OneDrive/Desktop/Claude/bobalab-website/node_modules/next/` (its bundled docs and client source). That is the exact version the project uses.
- We recomputed contrast with an independent script. We also simulated colour-vision deficiency and measured font file sizes. The scripts are in `scratchpad/bobalab/critique-tools/` (`cr2.py`, `cr3.py`, `cvd.py`). Raw font metadata is in `research/raw/critique-r5/`.

### C0. Verdict

**HOLDS WITH CHANGES.** The core architecture is right, and better than every alternative in section 4:
- real links in an ordered list
- server-rendered CSS pearls
- no WebGL and no live SVG filters
- React `<ViewTransition>` for the morph
- an annotated figure instead of a cup

But the spec as written has these problems:
- **Accessibility.** It fails several WCAG checks the report says it passes: leader lines, dimmed labels, forced-colours mode and Safari list semantics.
- **Label layout.** The build-time label layout does not survive real browsers: unit mismatch, user font size and narrow gutters.
- **Layout stability.** Positions reshuffle whenever content changes.
- **Ad look.** It keeps two cues that push it toward a drink ad: the milk-tea field with a meniscus, and glossy specular pearls.
- **Two wrong technical claims:** View Transitions coverage, and the browser-back morph.
- **Inflated scores.** The 38/40 hybrid score is self-awarded and higher than either parent on every axis, including performance and accessibility, even though the hybrid is more complex than both. Revised scores are in C11.

---

### C1. Design critic: childish, kitschy or a boba-shop ad?

| # | Finding | Label |
|---|---|---|
| 1.1 | **The figure contradicts itself.** "Fig. 1" says *scientific plate*. The milk-tea gradient, the meniscus line and the "gravity" that makes pearls rest at the bottom say *cross-section of a drink*. Together they read as a bubble-tea diagram without the cup, which is the ad look the report wants to avoid. Drink-anatomy diagrams with labelled callouts already exist as a genre in boba marketing and student infographics (examples: a CUNY student "Bubble Tea Anatomy" slide, https://openlab.citytech.cuny.edu/comd3601-informationdesignoer/files/2020/04/Bubble_Tea_2.pdf ; a TMU visual-culture post analysing a bubble-tea component diagram, https://visualculture.blog.torontomu.ca/?p=4247). | HYPOTHESIS (genre resemblance); the examples are DOCUMENTED |
| 1.2 | **The material spec (6.5) is glossy, not satin.** A white specular at 55% alpha on a near-black sphere, plus a contact shadow, is the standard rendering of toy balls and emoji. At seed size (7–12 px) the highlight becomes a single white dot. A cluster of those reads as **eyes, frogspawn or caviar**. The wordmark already drops the highlight below 24 px, but the seeds do not. | HYPOTHESIS |
| 1.3 | **Cluster texture.** A tight cluster of many small, high-contrast dark discs around larger ones is the kind of image that a minority of viewers find aversive ("trypophobia"). In Cole & Wilkins's work, aversive cluster images showed high contrast energy at mid spatial frequencies; one survey in that paper put prevalence at about 16% (via secondary coverage). The finding is about holes and blobs in general, not this design. The risk rises with seed count, which is exactly what the "honest" encoding grows over time. | DOCUMENTED (study existence and findings, via summaries): Cole & Wilkins 2013, *Psychological Science* 24(10), doi:10.1177/0956797613484937 ; https://repository.essex.ac.uk/7734/ . Applying it to this design is HYPOTHESIS |
| 1.4 | **The palette reads as a café, not a lab.** Every surface is milk, oat, milk tea or brown sugar, and the type is Fraunces SOFT 100 at weight 680. That is a warm bakery or DTC-beverage look before any pearl appears. The name is already a pun, and the visual system repeats it on every surface. Pun once and it's wit; pun everywhere and it's a costume. | HYPOTHESIS |
| 1.5 | **The size encoding invites a ranking.** Radius moves ±15%, which is up to **1.83x in area** ((1.15/0.85)²). That is too small to read as data but large enough to read as "this direction matters less". Directions are often led by different students. With `weightOverride`, editors can also inflate a direction, which defeats the "data-honest" claim. The report's own lesson from P1 is not to encode small differences by area. | HYPOTHESIS (arithmetic is exact) |
| 1.6 | What works and should be kept: real counts, "Fig. 1" framing with a real caption, numbered entries, the restraint rules in 6.14, the 404-only joke, and the ban on cups, straws and faces. | HYPOTHESIS |

**Fixes:**
- **Drop the field, the meniscus and the gravity from the hero figure.** Use a flat plate (`--card` with a 1 px frame), like a journal figure. The pearls alone carry the boba idea. If wanted, keep the meniscus rule only as a section divider.
- **Big pearls:** matte. No specular `::before` below 32 px. Highlight alpha at 0.25 or less.
- **Seeds:** do not render them as tapioca. Make them flat dots in the direction's **tint or light tone** (low contrast against the plate, no highlight, no shadow). Cap them at 12 visible, with a "+n" text count beyond that. This one change addresses 1.2, 1.3, the dark-mode visibility problem (C5.6) and the weak hue cue (C5.8).
- **All direction pearls the same size.** Remove `weightOverride` and the radius formula, and give counts in text. This drops a caption sentence and an editor-facing control.
- **Make the sober type pairing the default:** Newsreader + Public Sans, or Fraunces at SOFT 0–30 and weight ≤ 600. Keep SOFT 100 for the wordmark only.
- **Make the café palette local:** milk tea only inside the figure plate and direction headers. The page background should be a near-neutral warm white.

---

### C2. The 3-second test (a visiting faculty member)

Goal: within 3 s the visitor knows (a) this is a Berkeley Haas research lab, (b) roughly what it studies, and (c) where to click for more.
- (a) is carried by the left column, which is fine.
- (b) is carried only by the callout labels.
- (c) is not signalled at all, as the problems below show.

| # | Problem | Label |
|---|---|---|
| 2.1 | **No visible link affordance.** Labels are Inter 600 ink text with no underline, arrow or button shape. Underline and lift appear only on hover or focus. A large illustration-like figure in the hero is commonly read as decoration, so visitors will go to the header "Research" link instead. That still works, but then the signature interaction has failed. | HYPOTHESIS |
| 2.2 | **Two encodings to decode:** big versus small pearls, and size meaning "activity". Both need the caption. Nobody reads a caption in 3 s. | HYPOTHESIS |
| 2.3 | **The intro delays the labels.** Settling takes up to 1.6 s with 8 groups, and labels fade in 180 ms after their pearl lands, so the last label appears at about 1.8 s. That spends more than half the 3-second window before the most important text is visible. | HYPOTHESIS (from the timings in 6.8) |
| 2.4 | **The hover caption is probably below the fold on a common laptop.** At 1366x768 the inner viewport is about 650–680 px. Header (~72 px) plus a 4:3 figure about 406 px tall (see C4.2) plus margins puts the live caption at about y = 560–640 px. Hover changes may happen off-screen. | HYPOTHESIS (layout arithmetic; R5 gives no margins, so 32 px gutters and a 32 px gap were assumed) |
| 2.5 | **The dark cluster pulls the eye first.** It is the highest-contrast mass on the page and has no headline, so it may be fixated before the H1. | HYPOTHESIS |

**Fixes:**
- Put a visible heading above the figure ("Research directions").
- Give each label a persistent link affordance: a "→" after the label, plus underline on hover and focus. Show the count next to the label (e.g. "Gig & Platform Work · 7 papers").
- **Show labels from first paint.** Animate only the pearls, keep the intro ≤ 800 ms, and make it first-visit only (C6.3).
- Put the caption **inside the plate** (top-left, like a figure inset) or beside the figure, not below it.
- **Validate with a five-second test** before building the polish layer. Show the static hero to 5 people outside the lab (faculty or PhD students). Ask what the lab studies and what they would click. Success means at least 4 of 5 name two directions and identify the labels as links.

---

### C3. Does it fit an operations / behavioural-science lab at a business school?

- **Partly.** A numbered, captioned figure with real counts suits an analytics lab, and the report's argument about this is sound (HYPOTHESIS).
- But the plate-and-specimen look, with leader lines to an object, comes from natural-history and anatomy plates. It is not the native visual language of operations or behavioural analytics, which is dot plots, distributions, queues and flows (HYPOTHESIS).
- The business-school audience (faculty recruiters, MBA and PhD applicants, industry partners) mainly needs to know what the lab works on, who is in it and what it has published. A figure that charts real output answers that better than a specimen does.
- For that reason, C10 offers an alternative figure that is an actual chart. Use it if the five-second test fails, or if the PI wants something more sober.

---

### C4. Scaling: 2–3 vs 8 directions, long labels, content edits

| # | Finding | Label |
|---|---|---|
| 4.1 | **The layout reshuffles on every content edit.** `packSiblings` is sensitive to order and size, and group radius depends on seed count. Adding one paper to one direction can move **every** group and every callout. The result is deterministic but **not stable**: the home page's look changes whenever an editor adds a paper, visitors lose their spatial memory, and every Playwright snapshot breaks on every edit. | HYPOTHESIS (follows from d3 front-chain packing; determinism itself is DOCUMENTED: https://github.com/d3/d3-hierarchy/releases , https://d3js.org/d3-force/simulation ) |
| 4.2 | **Long labels do not fit the gutters.** At a 1024 px viewport the 7/12 figure column is about 541 px wide, so 22% gutters are about **119 px**. A 22ch cap in Inter 600 at 16 px is roughly 190–215 px. The gutter holds only about 13–15 characters per line: "Human–AI Decisions" (18 characters) wraps to 2 lines, and a 28-character shortLabel needs 2–3. Three-line labels break the sweep's fixed 2-line height and the labels overlap. | HYPOTHESIS (arithmetic; measure the real Inter metrics) |
| 4.3 | **Mixed units make the label layout unreliable in the browser.** Pearls and leader paths are stored as **percentages** or in a scaled SVG viewBox. Labels are **fixed px** text placed by a build-time px sweep. Between 1024 and 1440 px the pearls and lines scale but the text does not, so line ends drift off their labels. The sweep also cannot know: the user's default font size, 200% text-only zoom (WCAG 1.4.4), fallback-font metrics before the webfont loads, or translated text. "Deterministic" holds at build time only. | HYPOTHESIS |
| 4.4 | **n = 2 or 3 looks sparse.** Two or three groups in a 4:3 plate is not a cluster. It reads as a molecule or as two blobs. The report says it is "tested at n = 2", but no composition for that case is specified. | HYPOTHESIS |
| 4.5 | **n = 8 at full seed counts** means up to 8 + 8×24 = 200 dark discs in about 300 px. That is the worst case for C1.3 and for the paint and layer cost in C6. | HYPOTHESIS |

**Fixes:**
- **Fixed slot templates.** Hand-design anchor positions once for each n from 2 to 8, store them as constants, and check them in visual review. Seeds fill a fixed phyllotaxis ring around their anchor, capped with "+n".
  - Adding a paper adds one dot in the next ring slot and **moves nothing else**.
  - d3 is still useful offline for drafting the templates. It is no longer needed in the build.
- **Direct labels instead of gutters and sweeps.** Each label sits right next to its pearl, in a reserved label box in the template. Leader lines become optional decoration for containers 1200 px or wider.
- **Put the index number on each big pearl as well**, in Plex Mono, milk on pearl (about 14:1). Label-to-pearl association then never depends on a hairline.
- **Switch to list mode by text size, not just width.** Use an `em`-based container query, e.g. `@container (width < 46em)`. Container-query `em` resolves against the container's font size, so users with large default fonts or text zoom automatically get the list layout instead of overlapping labels (HYPOTHESIS; verify in Chrome, Safari and Firefox).
- At n ≤ 3, use a horizontal "row" template, which is concept A with Fig. 1 framing. Do not force a cluster.

---

### C5. Accessibility: keyboard, screen reader, forced colours, contrast

| # | Finding | Label |
|---|---|---|
| 5.1 | **Leader lines fail non-text contrast.** At rest they use `--line` `#D8CAB6`: **1.43:1 on milk and 1.17:1 on milk tea** (computed). Under WCAG 1.4.11, graphics needed to understand the content need 3:1. On desktop the line is the only thing tying a gutter label to its pearl, because numbers appear on callouts but not on pearls. The report's own palette table says `--line` must never be used for UI. | Ratios DOCUMENTED (computed). Rule: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html . Applying it to leader lines is HYPOTHESIS (the Understanding doc does not mention leader lines; by analogy with chart lines) |
| 5.2 | **Dimming other groups to 0.55 makes their labels fail text contrast.** Ink at 55% gives **3.82:1 on milk and 3.57:1 on milk tea**. Index numerals in `--dir-deep` at 55% give **2.15–2.82:1**. Labels at 15–17 px are not "large text", so 4.5:1 applies. They are visible, readable text, not disabled controls. | DOCUMENTED (computed); whether 1.4.3 applies to blended opacity is HYPOTHESIS, though the usual practice and axe both test the blended colour |
| 5.3 | **Index numerals are 12 px mono on the gradient.** Deep colours on milk tea give Thai tea **4.51**, Matcha 4.62 and Oolong 4.68. Thai tea passes by 0.01. Add the 3% grain and it can fail at points. R5 never computed deep on milk tea. | DOCUMENTED (computed) |
| 5.4 | **Forced-colours mode (Windows contrast themes) makes the pearls disappear.** The pearls are only gradient `background-image` plus `box-shadow`, and forced-colours mode sets non-URL background images and box-shadows to `none`. Every pearl and seed vanishes. The labels still work, but the figure is empty. Leader-line SVG strokes are also forced. | DOCUMENTED: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors |
| 5.5 | **Safari drops list semantics** from `<ol>` and `<ul>` styled with `list-style: none`, so VoiceOver does not announce "list, 6 items". The report's "ordered list of real links" relies on that announcement. | CORROBORATED: https://bugs.webkit.org/show_bug.cgi?id=170179 ; https://cssence.com/2022/safari-role-list-a11y/ ; a Dec 2025 iOS report: https://bugs.webkit.org/show_bug.cgi?id=304137 |
| 5.6 | **Dark-mode rim contrast is overstated.** 6.5 specifies the rim `#A47E62` **at 70% alpha** and says it gives about 5.1:1. Composited over night, 70% gives `#7A5D49` = **3.11:1**. 5.11:1 is the rim at 100%. It still passes 3:1, but only just. Seeds share the 1.39:1 body, and dark mode never specifies the plate, field, leader-line or seed colours. | DOCUMENTED (computed) |
| 5.7 | **The link's accessible name runs the number into the label:** "01Human–AI Decisions", with no space. The `<ol>` already numbers the items, so screen readers hear the number twice and the digits run into the word. | HYPOTHESIS (from the DOM in 6.4) |
| 5.8 | **The direction colour barely shows on the pearl.** The deep tone at 45% over the pearl body is only 1.22–1.49:1 in luminance (ΔE 22–29; Sesame ΔE 7.9, nearly invisible). The colour "carry-over" that the morph story depends on is mostly a label-colour effect. | DOCUMENTED (computed) |
| 5.9 | **Colour-vision caution names the wrong pairs.** Simulation (Machado 2009, full severity, CIE76 ΔE) finds the worst pairs are **Taro vs Butterfly pea** (ΔE 17 in normal vision, **3.2 protan, 7.7 deutan**), **Thai tea vs Oolong** (**3.3 deutan**) and **Matcha vs Thai tea** (6.4 protan). Lychee is not among the worst. The deep tones are also nearly equal in luminance (pairwise 1.01–1.14:1), so hue is the only cue. | DOCUMENTED (computed, `critique-tools/cvd.py`); the simulation model is an approximation |
| 5.10 | **Focus after navigation is not handled.** Next 16.4.2's scroll handler says in a source comment that it leaves focus untouched (`layout-router.js`). The App Router announcer reads out `document.title` (or the first `h1`) after navigation (`app-router-announcer.js`). Focus falls to `<body>` once the clicked link unmounts. The report does not mention unique titles or focus. | DOCUMENTED (local `node_modules/next/dist/client/components/layout-router.js` and `app-router-announcer.js`, v16.4.2) |
| 5.11 | **The figure's name changes on hover.** `<figure aria-labelledby="fig1-cap">` takes its name from a caption that swaps on hover, so the figure's accessible name changes as the pointer moves. That is harmless but odd. A stable name is better. | HYPOTHESIS |

**Fixes:**
- **Leader lines** (if kept): use `#857463`, which gives 4.00:1 on milk, 4.39:1 on card and 3.27:1 on milk tea. Better, put the index number on each pearl (C4) so the lines become decorative. Dark mode: `#8A7766` gives 4.37:1 on night and 4.00:1 on night-surface.
- **Dim graphics only.** Fade non-active pearls and seeds, not text. If text must recede, use opacity ≥ 0.7: ink at 0.7 gives 6.20:1 on milk and 5.55:1 on milk tea. Index numerals stay at full opacity.
- **Index numerals:** 13–14 px, on the flat plate (C1). On milk tea, swap Thai tea, Matcha and Oolong numerals to `--ink`.
- **Forced colours:**
  ```css
  @media (forced-colors: active) {
    .pearl { border: 2px solid CanvasText; }
    .pearl.seed { background: CanvasText; border: 0; }
    .leaders path { stroke: CanvasText; }
    a:focus-visible .pearl { outline: 2px solid Highlight; outline-offset: 3px; }
  }
  ```
  System colour keywords are used as written in forced-colours mode (MDN, above).
- **List semantics:** add `role="list"` to the styled `<ol>`, and accept the validator's redundancy warning.
- **Accessible name:** mark the "01" numeral `aria-hidden="true"`, or insert a real space. Give the figure a stable `aria-label="Fig. 1, research directions of BOBALAB"`.
- **Rim:** at 100% (5.11:1 on night, 4.68:1 on night-surface). Specify dark-mode tokens for plate, seeds and lines before build.
- **Focus after navigation:** every direction page sets a unique `<title>` through metadata, so the announcer reads it. On arrival, move focus to the page `<h1 tabIndex={-1}>` in a client effect. Test with VoiceOver and NVDA.
- **Colours:** never place Taro next to Butterfly pea, or Thai tea next to Oolong, in a template. Consider a 6-swatch palette with deliberate lightness steps rather than 8 equal-luminance hues.

---

### C6. Performance on a midrange Android phone, and prefers-reduced-motion

| # | Finding | Label |
|---|---|---|
| 6.1 | **The device test in 6.13 tests nothing on phones.** "60 fps during hover and buoyancy on a Moto G-class phone" cannot happen: touch devices get no hover and no buoyancy (6.10). What a phone actually runs is the intro, the tap-to-morph view transition (root snapshot, crossfade and named morph) and the font load. | HYPOTHESIS |
| 6.2 | **Fonts outweigh the 3 KB of animation JS by about 60x.** The axes 8.1 specifies for Fraunces (opsz 72–144 **and** SOFT, plus wght) need Fontsource's **"full" Latin file: 121 KB** (woff2, normal style), which is double the report's own 60 KB cap. The "soft" file is 62 KB (HYPOTHESIS: wght + SOFT, inferred from the file name), and wght-only is 36.6 KB. Inter "opsz" is 72.9 KB against 48.3 KB for wght-only. IBM Plex Mono comes on top. A Lighthouse mobile score ≥ 95 is at risk from fonts, not motion. | DOCUMENTED (file sizes, `@fontsource-variable/fraunces@5.3.0`, `@fontsource-variable/inter@5.3.0` via https://data.jsdelivr.com/v1/packages/npm/@fontsource-variable/fraunces@5.3.0?structure=flat ) |
| 6.3 | **The intro replays and can flash.** "First view per session" needs a stored flag, and the spec does not say how it is read. (a) In pure CSS the settle replays **every time home mounts**, including after a client-side return from a direction page. It then fights the reverse morph, because the pearl lands and every group drops in again. (b) If JS decides after hydration, the server-rendered pearls paint and then jump. The installed Next docs describe the fix: an inline script that sets a class before first paint. | DOCUMENTED (pattern): local `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`. The conflict itself is HYPOTHESIS |
| 6.4 | **Too many separate animations.** Up to 8 groups × 24 seeds, each with its own stagger, means up to ~200 independently animated elements, each likely promoted to its own compositor layer while it animates. | HYPOTHESIS |
| 6.5 | **Pointer buoyancy is decoration the report argues against.** By its own lesson P7, ambient motion should carry meaning or not exist. Buoyancy also adds the page's only rAF loop and moves targets under the pointer. | HYPOTHESIS |
| 6.6 | Reduced-motion handling is otherwise sound: motion-last CSS, VT durations set to 0, and no loops (DOCUMENTED patterns: https://web.dev/articles/prefers-reduced-motion ; the installed Next guide's reduced-motion block). Two gaps: (a) the mobile `:active` `scale(.98)` and the loading "three seeds settling" are not listed under `reduce`; (b) a Calm-mode toggle stored per viewer needs the same pre-paint script as 6.3, or it flashes motion for one frame. | HYPOTHESIS |

**Fixes:**
- **Device test:** on a real midrange Android and an older iPhone, and with Chrome at 4x CPU throttle, test (1) LCP and CLS with fonts, (2) tap-to-first-frame of the morph and INP of the tap, and (3) the intro.
- **Font budget ≤ 100 KB in total:**
  - Fraunces wght-only (36.6 KB) or a static headline instance, with the wordmark as SVG as already planned
  - Inter wght-only (48.3 KB)
  - Plex Mono, one weight, subset to digits and capitals
- **Intro:** animate the 8 **group wrappers** only, with the seeds static inside them. Gate it with a pre-paint class (`<html data-intro>`) that is set only on the first visit in a session and is removed before any client navigation back to home.
- **Cut pointer buoyancy from v1.** That keeps the client JS at about 0.5 KB, just the caption swap.

---

### C7. Technical claims checked against sources

| Claim in R5 | Status | Evidence |
|---|---|---|
| Same-document VT: Chrome/Edge 111+, Safari/iOS 18.0+, Firefox 144+, Samsung 23+, about 92.9% | **Confirmed** for the bare API | https://caniuse.com/view-transitions (fetched 2026-10-20) |
| "The pearl morph will work in every current engine" (2.1) | **Corrected.** React's integration uses transition types and `view-transition-class` (the installed Next guide says Chromium 125+). `view-transition-class` support: Chrome/Edge 125+, **Safari/iOS 18.2+**, Firefox 144+, **Samsung Internet 27+**, about **90.1%**. On Safari 18.0–18.1 and Samsung 23–26 the class-based morph styling will not apply. Navigation still works. | https://caniuse.com/mdn-css_properties_view-transition-class ; local `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` |
| React 19.3 made `<ViewTransition>` stable; it activates only on Transitions, Suspense and `useDeferredValue` | **Confirmed** | https://react.dev/blog/2026/09/09/react-19-3 |
| React caveats: pairs need both sides in the viewport; one mounted name; popstate back skips animation; React ignores reduced motion | **Confirmed.** The reference also says mounting two of the same name is a dev error. | https://react.dev/reference/react/ViewTransition |
| "Browser back: the named morph only" (6.8, 2.2) | **Unresolved conflict, treat as UNKNOWN.** The Next guide says the morph still applies on browser back. The React reference says legacy popstate navigations skip animation unless the router uses the Navigation API. Installed Next 16.4.2 still listens to `popstate`, and its source carries a "Use Navigation API if available" TODO. Test it before promising it. | React reference (above); local `node_modules/next/dist/client/components/app-router.js` (v16.4.2) |
| Reverse morph "returns to its exact layout slot" (6.8) | **Desktop only.** On mobile the source is a list row below the hero. A link back to `/` scrolls to the top (Next scrolls when the page top is out of view), so the row is outside the viewport, no pair forms, and the content just enters. | React viewport caveat; local `layout-router.js` scroll handler; local `docs/.../link.md` (`scroll` prop) |
| Duplicate names are impossible in this design | **Risk the report did not flag.** If desktop figure and mobile list are rendered as **two** DOM trees switched by CSS, both pearls mount with `pearl-${slug}`, which is a React dev error. The responsive layout must be **one `<ol>` restyled by container queries**, and the decorative mobile cluster must have no `name`. | React reference (above) |
| Next guide timings: 150 ms exit, 210 ms enter after 150 ms, 400 ms move, 60 px slide; `::view-transition { pointer-events: none }` | **Confirmed.** Two details: the guide's morph blur is **3 px** (R5 says 2 px; harmless), and named participants are still skipped by hit-testing during the transition. | local `view-transitions.md` |
| Next 16.4.2 / React 19.3.x | **Confirmed.** The project has `next@16.4.2` and `react@19.3.0` installed (R5 cites 19.3.1 as latest on npm). | local `bobalab-website/package.json` |
| WebKit bug 263848 still NEW, last changed 2026-01-12; WebKit lacks GPU for SVG filters | **Confirmed.** The thread is about SVG filters only; it says nothing about CSS `filter: blur()`. | https://bugs.webkit.org/show_bug.cgi?id=263848 |
| d3-hierarchy 3.1.2 makes pack and packEnclose deterministic; d3-force has a fixed-seed LCG, phyllotaxis start, alphaDecay ≈ 0.0228, velocityDecay 0.4, and `tick(n)` emits no events | **Confirmed.** Applying this to `packSiblings` is an inference, since it uses packEnclose internally. | https://github.com/d3/d3-hierarchy/releases ; https://d3js.org/d3-force/simulation |
| WCAG 2.2.2: motion that stops within 5 s needs no pause control | **Confirmed** | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html |
| Contrast tables in section 7 | **Confirmed.** All 18 pairs we re-checked reproduce to two decimals (independent script, 0.04045 sRGB threshold). **Except** the dark-mode rim claim, which is wrong (C5.6). | `critique-tools/cr2.py` |
| Fraunces variable size UNKNOWN | **Now measured.** See C6.2. | jsDelivr data API (above) |
| "Accessibility 5/5" for the hybrid | **Refuted as specified.** See C5.1–5.5 and 5.10. | above |

---

### C8. Contrast pairs the report did not compute

| Pair | Ratio | Needed | Result |
|---|---|---|---|
| `--line` leader line on milk / on milk tea | 1.43 / 1.17 | 3.0 (if needed to link label and pearl) | **Fail** |
| `#857463` (proposed leader) on milk / card / milk tea | 4.00 / 4.39 / 3.27 | 3.0 | Pass |
| ink at 0.55 (dimmed label) on milk / milk tea | 3.82 / 3.57 | 4.5 | **Fail** |
| ink at 0.70 on milk / milk tea | 6.20 / 5.55 | 4.5 | Pass |
| deep at 0.55 (dimmed index) on milk or milk tea, all 8 swatches | 2.15–2.82 | 4.5 | **Fail** |
| Thai tea / Matcha / Oolong deep on milk tea (12 px index) | 4.51 / 4.62 / 4.68 | 4.5 | Marginal pass |
| rim `#A47E62` at 70% over night (as specified) | 3.11 | 3.0 | Marginal pass (R5 says 5.1) |
| rim at 100% over night / night-surface | 5.11 / 4.68 | 3.0 | Pass |
| dark pearl body `#3A2C22` on night-surface | 1.27 | 3.0 | Fails without rim |
| `#8A7766` (proposed dark leader) on night / night-surface | 4.37 / 4.00 | 3.0 | Pass |

---

### C9. Required changes (in priority order)

1. **One DOM, one name.** A single `<ol role="list">` of links is restyled by container queries into figure mode and list mode. Each direction has exactly one `<ViewTransition name>`. The decorative mobile cluster is unnamed and `aria-hidden`.
2. **Fixed slot templates** for n = 2 to 8, with equal-size direction pearls and capped seed rings ("+n"). Remove `weightOverride` and the radius formula. Adding content never moves a direction (C4.1).
3. **Direct labels, plus an index number on each pearl.** Leader lines become optional decoration (≥ 1200 px, `#857463`). Switch to list mode through an `em` container query, so large text falls back cleanly (C4.2, C4.3, C5.1).
4. **Accessibility fixes from C5:**
   - dim graphics, not text (or opacity ≥ 0.7)
   - forced-colours CSS
   - `role="list"`
   - `aria-hidden` on the numeral
   - a stable figure name
   - a unique `<title>` and focus on the `<h1>` after navigation
   - dark-mode tokens fully specified, with the rim at 100%
5. **Look and identity (C1):**
   - flat figure plate; no field, meniscus or gravity in the hero
   - matte pearls; seeds as flat tint dots
   - sober type by default
   - café palette only inside the figure and direction headers
6. **Clarity (C2):**
   - a heading over the figure
   - persistent "→" and counts on the labels
   - labels visible at first paint
   - caption inside or beside the plate
   - a five-second test with 5 outsiders before the polish work
7. **Motion and performance (C6):**
   - cut pointer buoyancy
   - animate group wrappers only
   - pre-paint gating for the intro and Calm mode
   - total fonts ≤ 100 KB
   - a real-device test of the morph, LCP and INP
8. **Correct the claims in 2.1, 6.5, 6.8 and 7.3** as in C7 and C5.6/5.9: about 90% effective VT coverage; browser-back morph UNKNOWN; reverse morph desktop-only; rim 3.1:1; and the confusable colour pairs.

---

### C10. Alternative if the five-second test fails, or n ≥ 7: "Fig. 1 as a pearl dot plot"

A quieter, chart-native version of the same idea (HYPOTHESIS):
- **Rows are directions.** Each row is one full-width link in the same `<ol>`. The row starts with the direction's big pearl, which is the morph source, then the label (wraps freely in a left column) and the count.
- **Small pearls are public papers and working papers, placed by year** on a shared x-axis (for example 2019 to 2026). Seeds are flat tint dots. A paper in two directions appears in both rows, which is honest and needs no "threads".
- **Caption:** for example, "Fig. 1. Papers by research direction and year."
- **Mobile:** the year axis drops away and the row keeps pearl, label and count. It is the same DOM.

Why it scores well:
- Business-school faculty read a dot plot in under 3 s.
- It handles 2 to 8 directions with no relayout. Long labels wrap. Edits only add dots.
- There are no leader lines, no packed cluster texture and no ranking by area.
- The morph and colour carry-over work exactly as in R5.

Costs:
- It is less of a signature object.
- It exposes per-year output and gaps, which the PI must approve.
- It needs a year for every item. R1's items carry years: verify.

Keep it as the documented fallback rather than the default.

---

### C11. Revised scores (HYPOTHESIS; same 8 axes, 5 = best)

| Variant | Orig. | Cred. | Visual | Clarity | A11y | Mobile | Perf | Maint. | Total /40 |
|---|---|---|---|---|---|---|---|---|---|
| R5 hybrid **as specified** | 5 | 4 | 4 | 3 | 3 | 3 | 4 | 3 | **29** |
| R5 hybrid **with C9 changes** | 5 | 5 | 4 | 4 | 5 | 4 | 5 | 4 | **36** |
| C10 pearl dot plot | 3 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | **36** |

Why the "as specified" row drops:
- **Credibility:** the drink cross-section and glossy pearls.
- **Clarity:** no link affordance, two encodings, the intro delay.
- **Accessibility:** C5.1–5.5.
- **Mobile:** the reverse morph is lost, the device test is vacuous, and fonts are heavy.
- **Performance:** the 121 KB display font.
- **Maintenance:** reshuffling on edits, and the label sweep.

The R5 concept with the C9 changes stays the recommendation because it keeps the lab member's "click a pearl" idea and a distinctive identity. C10 is the safe fallback.

---

### C12. Sources added by this critique (accessed 2026-10-20)

- https://caniuse.com/mdn-css_properties_view-transition-class
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors
- https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- https://bugs.webkit.org/show_bug.cgi?id=170179 ; https://bugs.webkit.org/show_bug.cgi?id=304137 ; https://cssence.com/2022/safari-role-list-a11y/
- https://data.jsdelivr.com/v1/packages/npm/@fontsource-variable/fraunces@5.3.0?structure=flat ; https://data.jsdelivr.com/v1/packages/npm/@fontsource-variable/inter@5.3.0?structure=flat
- Cole & Wilkins (2013), "Fear of holes", *Psychological Science* 24(10), doi:10.1177/0956797613484937 ; https://repository.essex.ac.uk/7734/ (abstract and coverage only)
- https://openlab.citytech.cuny.edu/comd3601-informationdesignoer/files/2020/04/Bubble_Tea_2.pdf ; https://visualculture.blog.torontomu.ca/?p=4247 (examples of the drink-anatomy diagram genre)
- Re-checked: https://caniuse.com/view-transitions ; https://react.dev/reference/react/ViewTransition ; https://react.dev/blog/2026/09/09/react-19-3 ; https://bugs.webkit.org/show_bug.cgi?id=263848 ; https://github.com/d3/d3-hierarchy/releases ; https://d3js.org/d3-force/simulation ; https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- Local, installed `next@16.4.2` (public npm package): `dist/docs/01-app/02-guides/view-transitions.md`, `.../preventing-flash-before-hydration.md`, `dist/docs/01-app/03-api-reference/02-components/link.md`, `dist/client/components/app-router.js`, `layout-router.js`, `app-router-announcer.js`; and `next/dist/compiled/react-dom` (popstate handling)
