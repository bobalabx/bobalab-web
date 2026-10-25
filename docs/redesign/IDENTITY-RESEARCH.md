# BOBALAB redesign: identity, typography, colour and "AI-tell" research

Research for the redesign that answers Prof. Park's feedback that the site "kinda looks like it is AI generated". This document covers what the "AI look" is, which parts of it the current site has, and concrete replacements for type, mark, colour and motion. It keeps what has to stay: academic credibility, the boba-pearl research figure (Fig. 1), Decap CMS, WCAG 2.2 AA and the test suite.

- **Scope:** research and writing only. Nothing in `src/`, `content/` or config was changed.
- **Date:** 2026-10-24. Live site checked: https://bobalabx.github.io/bobalab-web/ (branch `redesign`).
- **Labels:** **MEASURED** (I measured it or saw it in a screenshot), **DOCUMENTED** (a source URL says so), **HYPOTHESIS** (my judgement or proposal).
- **No third-party images** are in this repo. Other sites are described in my own words, with their URLs.

---

## 0. Summary and recommendation

1. **The current site matches the second wave of "AI design" defaults.** The first wave was Inter, purple gradients and three cards. Several 2025–26 sources describe a second wave that appears when someone asks an AI tool for "less AI". It is a cream or beige page, a high-contrast or soft display serif over a plain sans, a clay or brown accent, tracked mono or all-caps labels, pill badges, rounded hairline cards, soft radial glows, and arrows on every link (DOCUMENTED, §1.1).
   - BOBALAB has most of this cluster (MEASURED, §1.2).
   - Its alternate surface `#f4f0ea` and its Fig. 1 plate `#f7f1e8` are 0.26 and 0.46 ΔE_OK×100 from the "warm editorial" cream `#F4F1EA` that one source names. Below about 2, the difference is not visible. In practice the colours are the same.
   - The site's typography is Fraunces headings over Inter, with Plex Mono labels. On the publications page alone there are **54 pill-radius elements** and **98 mono text nodes** (MEASURED).
2. **Typography (§2).** I recommend **T3: Familjen Grotesk + Literata (+ an optional Martian Mono)**, 90.5 KiB without the mono and 100.6 KiB with it.
   - It is a grotesk with ink traps for the voice, plus a serif built for long reading on screens.
   - Familjen's figures are tabular by default (MEASURED), so data needs no mono, and the "mono eyebrow" tell disappears.
   - The alternatives are:
     - **T1 Journal:** STIX Two Text + Atkinson Hyperlegible Next/Mono, 88.8 KiB.
     - **T2 One family:** Archivo, using its width × weight axes, 103.4 KiB.
     - **T4 Recursive:** sans and mono from one file, 70.9 KiB.
3. **Pearl identity (§3).** I propose the **"Settle" grammar**.
   - **Glyphs:** pearls stack on a 4-row triangular lattice. A pearl may sit above the floor only if both pearls under it are present.
   - **How many:** the rule allows exactly **41 settled stacks** (MEASURED by enumeration).
   - **Directions:** each research direction gets one stack, and stacks are chosen for distinct silhouettes.
   - **Lab mark:** the union of the four founding directions' stacks, frozen as the lab mark.
   - **Smallest form:** a 3-pearl stack, ∴ (the "therefore" sign), used for the favicon, the header and anything under 24 px.
   - **Colour:** everything is a flat disc in one colour, with no gloss.
4. **Colour (§4).** I recommend **P3, "direction colours as true spot inks"**.
   - **Base:** a neutral ink-on-white with **no brand accent**. Links are ink and underlined.
   - **Spot inks:** four inks, **one hex per direction, valid unchanged in light and dark mode**. Each sits in the luminance band where the spot is ≥ 3:1 against white paper (as a graphic) and ink text on the spot is ≥ 4.5:1.
   - **Colour-blind separation:** the minimum ΔE across normal, protan, deutan and tritan simulation rises from **3.3 to 8.4** compared with the current four "deep" tones (MEASURED with the same metric).
   - **Fallbacks:** P1 (ink plus one butterfly-pea accent) is the conservative option. P2 (two-colour "ledger" print) is the bold one.
5. **Motion (§5).** Motion should explain relationships, not decorate.
   - **Settling** means *arrival*. Use a critically damped curve with no overshoot.
   - **Diffusion** means *belonging*: a spot colour spreads to related items, with radius proportional to √t.
   - **Steeping** means *state change*: an exponential approach.
   - **Buoyancy** means *affordance*: only interactive things lift.
   - **Remove** the idle float loop, pointer parallax, the ±14° stir, radial halos and sheen, and the overshoot in the intro. With no loop longer than 5 s, the Pause button can go too (WCAG 2.2.2).

---

## 1. The "AI-generated website" aesthetic in 2025–2026

### 1.1 What the sources say (DOCUMENTED)

| Source | Date | What it documents (paraphrased) |
|---|---|---|
| Anthropic, *Improving frontend design through Skills* — https://claude.com/blog/improving-frontend-design-through-skills | 2025-11-12 | Calls the cause **"distributional convergence"**: models sample the safe centre of web training data. Unguided output defaults to Inter, purple gradients and minimal motion. Its skill bans Inter, Roboto, Open Sans, Lato, Arial and system fonts, and notes that models still converge on Space Grotesk. It favours a dominant colour with sharp accents over timid, even palettes. For motion it prefers one orchestrated page load over scattered micro-interactions. |
| Capital & Compute, *How to Fix AI Slop in Web Design, Tell by Tell* — https://capitalandcompute.net/blog/fix-ai-slop-design/ | 2026-09-25 | Wave 1: Inter everywhere, indigo→purple gradients and gradient text, a centred hero with a pill badge and two buttons, three feature cards, large radii with one soft shadow, glass panels, fade-and-slide-up on every section, bounce easing, count-up stats. **Wave 2 ("what you get when you ask for less AI")** has five clusters: **warm editorial** (cream near `#F4F1EA`, a high-contrast serif display, a terracotta accent near `#D97757`, which the source identifies as the Claude interface palette); dark signal (near-black with one acid accent); broadsheet cosplay (hairlines, zero radius, dense columns); the SaaS card kit; and **template chrome** (tracked all-caps eyebrows over headings, "A · B · C" meta strings, **a monospace face for small labels**, **arrows on every link**). It also flags 01/02/03 numbering unless the items really are a sequence. |
| Impeccable, *Slop* catalogue (Paul Bakaus) — https://impeccable.style/slop | undated, live 2026-10 | It names these patterns, among others: a label above a heading; an italic serif display headline used as an "editorial" shortcut; an icon tile stacked above every heading; a badge above the headline; overused fonts (Inter, Geist); a **radial-gradient halo / soft spotlight** behind content; a **cream/beige palette used by reflex**; a side-tab or top accent border on a rounded card; identical card grids; tiny numbered section labels; a pulsing status dot; **bounce/elastic easing**; em-dash overuse. |
| prg.sh, *Why Your AI Keeps Building the Same Purple Gradient Website* — https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website | 2025-10-26 | Gives the training-data explanation, including Tailwind UI's `bg-indigo-500` default and Adam Wathan's August 2025 apology. Its tells: Inter or Roboto, indigo, a centred hero with a CTA, three icon boxes, rounded corners everywhere, subtle shadows. |
| CodeMySpec (John Davenport), *Why Vibe Coded Websites All Look the Same* — https://codemyspec.com/blog/vibe-coded-websites-look-the-same | 2026-07-26 | Same wave-1 list plus all-caps section labels and the fixed section order (hero → features → proof → pricing → FAQ). It notes that prompting page by page just swaps one default for another, **"cream, serif, terracotta"**. It cites Tuch et al. (2012, doi:10.1016/j.ijhcs.2012.06.003): conventional, low-complexity layouts are judged more attractive within 50 ms. So the fix is *authored* decisions, not novelty. |
| Laith0003 *ux-skill* wiki, *Anti-AI-slop ban list* — https://github.com/Laith0003/ux-skill/wiki/Anti-AI-slop-ban-list | 2026 | An AI-agent "skill" file. It bans Inter for display, and **recommends Fraunces** (or Source Serif, Space Grotesk, General Sans) as the "distinctive" display face. This is direct evidence of *why* Fraunces is now a second-wave default: anti-slop prompts tell agents to use it. |
| 925studios, *AI Slop Fonts and Gradients* — https://www.925studios.co/blog/ai-slop-design-tells | 2026 (page shows conflicting dates) | Inter, indigo→purple gradients, three rounded cards, gradient "Get Started", generic thin-line icons. |
| Wired, John Semley, *AI has come for serif fonts* — https://www.wired.com/story/ai-has-come-for-serif-fonts/ | 2026 | **Secondary only.** Wired blocked my fetch, so I relied on an aggregator summary (https://feedbagel.com/post/ai-has-come-for-serif-fonts). The summary says AI companies use serif typefaces to look "human", and critics call the trend "tasteslop". |

Things I could **not** confirm:
- No primary source names **Fraunces** specifically as an AI tell. The ban-list evidence above is indirect.
- No designer critique that names Lovable or v0 specifically turned up in my searches. I treat their output as part of the general "shadcn/Tailwind default" cluster that prg.sh and CodeMySpec describe.
- Bento grids and gradient orbs appear mostly in wave-1 lists and galleries. Neither applies to BOBALAB.

### 1.2 Audit: which tells BOBALAB has (MEASURED)

**Evidence.** Playwright 1.x Chromium, 1366×768 light and dark, 390×844, reduced motion. The screenshots are in `docs/redesign/before/identity-*.png`. Element counts come from `getComputedStyle` over every element: border-radius values, and the first font family of each element that has text.

| Tell (source) | BOBALAB evidence | Verdict |
|---|---|---|
| Cream / warm-editorial paper (C&C wave 2; Impeccable "cream/beige") | `--paper-alt #f4f0ea` and `--plate #f7f1e8` are ΔE_OK×100 **0.26** and **0.46** from the named `#F4F1EA`, which is below visibility. The page `#fcfaf6` is 2.73 from it. The Fig. 1 plate is the largest coloured area above the fold (`identity-home-light-1366.png`). | **Applies, strongly** |
| Soft / high-contrast display serif over a plain sans (C&C; Impeccable; Wired) | Fraunces 600 h1/h2, plus a 2-line Fraunces mission statement at display size. Body, nav and buttons are all Inter. Home: Inter 149 text nodes, Fraunces 9. | **Applies** |
| "The Inter look" (Anthropic; prg.sh; Impeccable) | Inter is every body, UI and card-title face. On publications it accounts for 325 text nodes. | **Applies** |
| Clay / brown accent (C&C) | Light accent `#8a4515` (OKLCH hue 51°) and dark accent `#e0a46b`. Same family as `#D97757` (hue 39°) but darker: ΔE 20.6 in light and 10.8 in dark. The filled brown CTA "Explore our research →" sits under the serif mission line. | **Partly** (same family, not the same colour) |
| Mono for small labels / tracked caps eyebrows (C&C "template chrome"; Impeccable "label above heading") | "JUMP TO YEAR" and "SEARCH AND FILTER" on publications are h2s in Plex Mono 13 px, tracking 0.78 px, all caps. Also "Fig. 1", "4 papers", years and counts. Plex Mono text nodes: home 33, publications **98**. | **Applies** |
| Pill badges and pill filters (C&C wave 1 badge; Impeccable badge) | Elements with `border-radius: 9999px`: home 9, publications **54**, people 6. "Journal article" / "Working paper" badges, year chips, direction filters, the "Filters" button. | **Applies** |
| Rounded hairline card with an accent stripe (Impeccable "side-tab / border accent on rounded element"; C&C card kit) | `/research/` direction cards: 10 px radius, hairline border, 3 px coloured top border. People PI card: 10 px radius. Count of 10px radius on people: 25. | **Applies** |
| Icon tile above every heading (Impeccable) | `/research/` cards put a glossy 56 px pearl with "01" above each h3 (`identity-research-light-1366.png`). | **Applies** |
| Radial halo / soft spotlight; gloss (Impeccable) | Each Fig. 1 pearl has a radial colour halo, a bottom glow and a satin sheen ellipse (`identity-fig1-2x.png`). In dark mode the pearls read as lit lenses (`identity-home-dark-1366.png`). | **Applies** |
| Numbered markers without a sequence (C&C; Impeccable) | Pearls "01–04", from an editorial order with no real sequence. | **Partly** |
| Arrows on every link (C&C) | "Explore our research →", "All publications →", "All news →", "Meet the lab →", "Students & RAs →", every Fig. 1 label "… →". | **Applies** |
| Bounce / elastic easing (Impeccable; C&C) | The intro keyframes overshoot (`translateY -28 → +4 px → -1 px → 0`, `src/components/figure/figure.css` `f1-sink`). | **Applies** (motion) |
| Ambient looping motion (Impeccable pulsing / marquee family) | Idle float loop of ±2.5 px, 7–11 s periods (D-02). It needs a Pause button. | **Applies** |
| Template section order (CodeMySpec) | Hero → recent publications → news → people → "Work with us" box → 4-column footer. | **Partly.** This is also the normal academic-lab order, so it is defensible. |
| Print cosplay (C&C "broadsheet") | Crop marks on the plate corners and "Fig. 1" captioning. Fig. 1 *is* a real figure, so the caption is honest. The crop marks are decoration. | **Partly** (keep the caption, drop the crop marks) |
| Purple gradients, gradient text, bento grid, glassmorphism, emoji icons, centred hero with badge, count-up stats | None found. | **Does not apply** |

**HYPOTHESIS: why it still reads as AI even though no single element is "wrong".**
- Each choice is the *expected* answer to a brief like "warm, academic, boba, accessible". There is a cream like milk tea, a soft serif, a brown like tapioca, mono for "data", and pills for tags.
- Expected answers, stacked together, are exactly what "distributional convergence" describes.
- The fix is not to swap each default for the next popular one (Instrument Serif, Geist and Space Grotesk are already flagged). It is to make **two or three authored, reasoned decisions that only this lab would make**:
  - a mark grammar from the pearl metaphor;
  - colour that *encodes* directions;
  - type picked for what researchers actually read.

### 1.3 Faces to avoid in the redesign

Each is DOCUMENTED as an AI default unless marked [H]:
- Inter, Roboto, Open Sans, Lato, Arial and system-ui as the *voice* (Anthropic).
- Geist (Impeccable).
- Space Grotesk (Anthropic).
- Instrument Serif (Impeccable, via search summary).
- Fraunces, which ban lists recommend to agents (ux-skill wiki).
- [H] DM Sans, Manrope and Bricolage Grotesque. These are frequent in template galleries I saw while searching, but no source names them as tells.

---

## 2. Typography: four systems

### 2.1 Method

- **Licence, weights, styles and axes:** Fontsource API `https://api.fontsource.org/v1/fonts/{id}` and `/v1/variable/{id}`, cross-checked against Google Fonts `METADATA.pb` on GitHub (`google/fonts/ofl/*`). DOCUMENTED.
- **Sizes:** I downloaded the actual **latin-subset woff2** files from jsDelivr, `https://cdn.jsdelivr.net/fontsource/fonts/{id}[:vf]@latest/latin-{axis|weight}-{style}.woff2`, and measured their byte length (KiB = 1024 B). MEASURED. The method matches the brief: Fraunces wght 35.8, Inter wght 47.1 and Plex Mono 500 at 14.5 reproduce brief §C4 exactly.
- **Fontsource per-axis files** (`latin-wdth-*`, `latin-opsz-*`, `latin-mono-*`) carry **wght plus that axis**. MEASURED: Archivo's `wdth` file and Recursive's `mono` file both rendered heavy weights and changed width/monospacing in Chromium (see the specimens).
- **Numeral features:** probed in Chromium by comparing advance widths with and without `tnum` / `pnum`. MEASURED. The probe is width-based, so it would miss features that change shape but not advance width.
  - Familjen Grotesk, STIX Two Text and Recursive: **tabular by default**, `pnum` available.
  - Archivo, Literata, Atkinson Next and Inter: proportional by default, `tnum` available.
  - None of the tested files changed width with `smcp`/`c2sc` (no true small caps detected).
- **Specimens:** set with BOBALAB's own content (wordmark, mission, a real publication entry, a caption) and screenshotted at 1× and 2×. These are working files, kept outside the repo in the session scratchpad: `…/scratchpad/redesign/specimens/type*.png`.
- **All faces below are SIL OFL-1.1** (DOCUMENTED: Fontsource `license` field and Google Fonts metadata).

### 2.2 Candidate data (MEASURED sizes, latin woff2, KiB)

| Family (designer) | Axes / weights | wght VF normal | wght VF italic | other VF file | static 400 / 500 / 400i |
|---|---|---|---|---|---|
| Familjen Grotesk (Familjen STHLM) | wght 400–700, ital | 18.5 | 20.0 | — | 11.4 / 11.8 / 12.2 |
| Literata (TypeTogether) | opsz 7–72, wght 200–900, ital | 51.3 | 52.5 | opsz 107.5 | 19.9 / 21.2 / 20.7 |
| Martian Mono (Roman Shamin, Evil Martians) | wdth 75–112.5, wght 100–800 | 23.0 | — | wdth 37.6 | 10.1 / 10.4 / — |
| STIX Two Text (Tiro Typeworks for STI Pub) | wght 400–700, ital | 27.9 | 30.3 | — | 16.4 / 16.8 / 17.8 |
| Atkinson Hyperlegible Next (Braille Institute, Applied Design Works) | wght 200–800, ital | 33.2 | 36.8 | — | 11.8 / 12.3 / 13.8 |
| Atkinson Hyperlegible Mono (same) | wght 200–800, ital | 17.3 | 18.6 | — | 9.8 / 9.9 / 10.6 |
| Archivo (Omnibus-Type) | wdth 62–125, wght 100–900, ital | 34.1 | 38.2 | wdth 88.0 | 14.4 / 14.3 / 15.4 |
| Recursive (Arrow Type, Stephen Nixon) | wght 300–1000, MONO, CASL, CRSV, slnt | 54.6 | (slnt 105.0) | mono 70.9 · full 297.8 | 23.0 |
| Schibsted Grotesk (Bakken & Bæck) | wght 400–900, ital | 45.7 | 49.1 | — | 23.8 / 24.6 / 24.9 |
| Source Serif 4 (Frank Grießhammer) | opsz 8–60, wght 200–900, ital | 49.7 | 50.4 | opsz 119.5 | 19.6 / 21.0 / 19.6 |
| Newsreader (Production Type) | opsz, wght 200–800, ital | 56.7 | 63.0 | opsz 128.9 | 22.0 / 23.1 / 23.8 |
| Libre Franklin (Impallari) | wght 100–900, ital | 28.6 | 32.1 | — | 15.5 / 15.5 / 16.9 |
| Spline Sans Mono (Sorkin, Velimirović) | wght 300–700, ital | 35.6 | 37.4 | — | 12.6 / 12.5 / 13.4 |
| Sometype Mono | wght 400–700, ital | 16.3 | 17.3 | — | 9.5 / 9.8 / 10.1 |
| *Current:* Fraunces / Inter / Plex Mono | — | 35.8 / 47.1 / — | — | — | Plex Mono 500: 14.5 |

### 2.3 The four systems

#### T1 — "Journal" (STIX Two Text + Atkinson Hyperlegible Next + Atkinson Hyperlegible Mono) · 88.8 KiB

| Face | File | KiB | Used for |
|---|---|---|---|
| STIX Two Text | wght VF normal | 27.9 | h1–h3, the mission line, abstracts, prose, bios |
| STIX Two Text Italic | static 400 italic | 17.8 | journal and venue names, emphasis |
| Atkinson Hyperlegible Next | wght VF normal | 33.2 | navigation, buttons, labels, publication titles in lists, captions, the wordmark (800, −0.02em) |
| Atkinson Hyperlegible Mono | static 500 | 9.9 | DOIs, BibTeX, counts |

**Rationale.**
- STIX Two exists *for* scientific and technical publishing. DOCUMENTED: its Google Fonts description says it serves authors and publishers in scientific, medical and technical fields. Setting the lab's own figure and abstracts in the face of the journals honestly continues the "Fig. 1" conceit.
- Atkinson Hyperlegible was drawn by the Braille Institute for low-vision readers (DOCUMENTED designer credit). Its deliberately differentiated letterforms give the UI an authored voice, with an accessibility reason behind it that the lab can state.

**Seen** (MEASURED, specimen):
- Very "paper-like". The STIX headings read like a journal masthead, not a template.
- Body text at 17 px looks Times-like, so it needs 18–19 px and 1.55 leading.
- Risk: the serif-plus-sans pairing with a serif headline is still close to the "editorial" cluster. The difference is that STIX is a *text* face with no display flourish, unlike Fraunces' soft wedges.

#### T2 — "One family with range" (Archivo, width × weight) · 103.4 KiB

| Face | File | KiB | Used for |
|---|---|---|---|
| Archivo | wdth+wght VF (`latin-wdth-normal`) | 88.0 | everything. Display at wdth 75–80 / wght 700 (condensed, poster-like); the wordmark at wdth 112–125 / wght 800 (expanded); text at wdth 100 / wght 400; labels and data at wdth 125 / wght 500 with `tnum` instead of a mono |
| Archivo Italic | static 400 italic | 15.4 | venue names |

**Rationale.**
- One late-19th-century American grotesque (DOCUMENTED: Omnibus-Type description), with hierarchy built from *width*, not from a second family.
- This answers the brief's question directly: "does ONE family with real range beat three?"
- It removes the "three fonts = template" pattern at a stroke, and the condensed headlines give a print-poster presence.

**Seen** (MEASURED, specimen):
- The condensed headline and expanded wordmark make a strong, coherent voice.
- Long abstracts in Archivo text are serviceable but drier than a serif.
- The data line in wide Archivo with `tnum` replaces the mono convincingly.

**Cost:** the largest file, and no serif for long reading.

#### T3 — "Grotesk + reading serif" (Familjen Grotesk + Literata, optional Martian Mono) · 90.5 KiB (100.6 KiB with mono) — **recommended**

| Face | File | KiB | Used for |
|---|---|---|---|
| Familjen Grotesk | wght VF normal (400–700) | 18.5 | wordmark (700, −0.02em), h1–h3 (600, −0.02em), the mission line, nav, buttons, labels, publication titles, all counts, years and figure numbers (tabular by default) |
| Literata | wght VF normal (opsz fixed at the file default) | 51.3 | abstracts, prose pages (About, Join, project bodies), people bios, news bodies, author lists |
| Literata Italic | static 400 italic | 20.7 | venues, emphasis |
| *(optional)* Martian Mono | static 400 | 10.1 | DOIs, BibTeX blocks and code only. **Never for labels** |

**Rationale.**
- **Familjen Grotesk:** large ink traps, closed apertures and a sturdy, slightly compressed uppercase (DOCUMENTED, Google Fonts description). At display size the ink traps are visible and give the lab a recognisable voice without becoming quirky. At 14–15 px they read as crisp.
- **Literata:** built as a reading face for Google Play Books and redrawn as a variable family for digital text (DOCUMENTED). It is a serif chosen for *reading*, not for display, which reverses the current site (display serif, plain sans body).
- **No mono labels:** Familjen's figures are tabular by default (MEASURED), so counts and years line up without a mono.

**Seen** (MEASURED, specimen and identity board):
- The mission line in Familjen 600 at 32 px reads as confident and contemporary, and not like the cream-serif template.
- The publication entry (grotesk title, Literata authors, Literata italic venue) reads like a well-set CV or journal TOC.

**Fallbacks and caveats:**
- Literata's opsz file (107.5 KiB) is over budget. Use the wght file, which fixes opsz at its default [U: the exact default value is not verified]. Set headings in Familjen, so Literata never needs display sizes.
- Familjen only goes to 700. Headings must get emphasis from size and tracking, not 800–900.

#### T4 — "Recursive" (Sans Linear + Mono Linear from one variable file) · 70.9 KiB

| Face | File | KiB | Used for |
|---|---|---|---|
| Recursive | `latin-mono-normal` (wght 300–1000 + MONO) | 70.9 | `MONO 0, CASL 0` for everything textual; `MONO 1` for data and DOIs. Weight 900 for the wordmark |

**Rationale.** One file gives both the proportional and the monospaced voice, so data and prose are visibly *the same family*. This suits an analytics lab.

**Seen** (MEASURED, specimen):
- Coherent, technical, slightly "developer tool".
- There is **no italic** in this file: slant needs the 105 KiB `slnt` file. Venue names would have to be set upright and muted, which breaks the academic convention.
- It is the least "academic" of the four.

Use T4 only if the lab wants a computational rather than scholarly tone.

#### Rejected after specimen

- **Schibsted Grotesk + Source Serif 4 + Spline Sans Mono.** Good, but 127.5 KiB with italics, so over budget.
- **Libre Franklin + Newsreader + Sometype Mono.** Newsreader at 17 px measured visibly small for its x-height. Franklin plus a news serif reads as "newspaper cosplay" (C&C broadsheet cluster). [H]

### 2.4 Answer: one family or three? (HYPOTHESIS, from the specimens)

- **Two families with distinct jobs beat three.** The third family (a mono for labels) is the most template-like element on the current site.
- **One family (T2) is the bolder choice** and fully viable. It loses the reading serif that a publications-heavy site benefits from.
- **T3** keeps a serif *where people read* and puts the lab's voice in the grotesk.

**Type rules for any system:**
- No all-caps tracked eyebrows.
- No label above a heading that repeats it.
- Arrows only on links that leave the current context (external links, or "all publications").
- Numbers in the voice face, using tabular figures.

---

## 3. Pearl identity system: the "Settle" grammar

### 3.1 Principle (HYPOTHESIS; precedent DOCUMENTED)

**The precedent.** Pentagram (Michael Bierut, Aron Fay; 2014) built the MIT Media Lab identity from **one shared grid** (Richard The's 7×7 grid from the lab's 25th anniversary). The lab monogram and **glyphs for all 23 research groups** are subsets of that grid, so each group's mark is unique and visibly related. Helvetica supports it. DOCUMENTED: https://www.pentagram.com/work/mit-media-lab/story, https://www.designboom.com/design/the-new-mit-media-lab-identity-by-pentagram/, https://www.dezeen.com/?p=579622.

**What BOBALAB borrows** is only the *principle*: a shared generative rule produces the lab mark and the direction marks. The rule here is original and comes from the boba metaphor.
- Tapioca pearls **sink and settle** at the bottom of the cup into a close-packed pile.
- A pearl can rest above the floor only if **both** pearls beneath it are there.
- That physical constraint is the grammar. For an operations lab it is also a **stack** (queues and stacks are the field's core objects).
- The three-pearl stack is the mathematical sign **∴, "therefore"**: the conclusion that evidence supports.

### 3.2 Geometry (exact; a coder can build the SVGs from this)

- **Lattice.** Triangular close packing with **R = 4 rows**. Row `r = 0` is the floor, and row `r` has `R − r` positions `i = 0 … R − r − 1`, so there are **10 positions**.
- **Pitch.** `u` is the centre-to-centre distance and the unit of the system.
- **Centres** (in units of `u`, origin at the top-left of the viewBox):
  - `cx(r,i) = i + r/2 + 0.5`
  - `cy(r) = H − 0.5 − r·(√3/2)`, where **`H = 1 + (R−1)·√3/2 = 3.5981`** for R = 4 (and `1.8660` for R = 2)
  - **viewBox:** `0 0 4 3.5981` (R = 4) and `0 0 2 1.8660` (R = 2)
- **Pearl.** A flat disc of diameter `d = 0.84u`, so `r = 0.42`, with a gap of `0.16u`.
  - At ≥ 48 px rendered width, `d = 0.86u` is allowed.
  - Below 24 px, use the ∴ form (§3.5).
- **Fill.** One colour: `currentColor`, the direction spot ink, or reversed paper. **No gradient, sheen, rim, shadow or stroke.** This is the explicit fix for the halo/gloss tell.
- **Stability rule.** A position `(r,i)` with `r ≥ 1` may be filled only if `(r−1,i)` and `(r−1,i+1)` are both filled.
- **Count.** The 4-row frame allows exactly **41 settled stacks**. By number of pearls: 1:4, 2:6, 3:7, 4:7, 5:5, 6:5, 7:3, 8:2, 9:1, 10:1 (MEASURED by exhaustive enumeration; script in §6).
- **Code notation.** Rows are written top to bottom, separated by `/`, with `1` = pearl and positions left to right. Example: `0/10/111/1111` = empty top row; row 2 has a pearl at i=0; row 1 is full; the floor is full.
- **Composition rule ("pearls always rest").** A glyph's floor row always sits on something: a baseline, a rule, the bottom margin or the edge of the format. Glyphs never float mid-field, and are never rotated or mirrored. This is the single compositional signature of the system.

Reference implementation, to be written in the repo by the build team (pseudo-code, not copied from anywhere):

```js
// code like "0/10/111/1111" (top row first). Returns an SVG string.
function settleGlyph(code, { R = 4, d = 0.84, fill = 'currentColor', title } = {}) {
  const H = 1 + (R - 1) * Math.sqrt(3) / 2;
  const rows = code.split('/');                       // rows[0] = top
  const circles = [];
  rows.forEach((row, k) => {
    const r = R - 1 - k;                              // r = 0 is the floor
    [...row].forEach((ch, i) => {
      if (ch !== '1') return;
      if (r > 0 && !(rows[k + 1][i] === '1' && rows[k + 1][i + 1] === '1')) throw new Error('unsettled pearl');
      circles.push(`<circle cx="${i + r / 2 + 0.5}" cy="${(H - 0.5 - r * Math.sqrt(3) / 2).toFixed(4)}" r="${d / 2}"/>`);
    });
  });
  return `<svg viewBox="0 0 ${R} ${H.toFixed(4)}" fill="${fill}" ${title ? 'role="img"' : 'aria-hidden="true"'}>${title ? `<title>${title}</title>` : ''}${circles.join('')}</svg>`;
}
```

### 3.3 Assigning glyphs to directions (HYPOTHESIS; legibility MEASURED)

I rendered all 41 stacks at 56 px, and a shortlist at 48 / 24 / 18 / 16 / 12 px in light and dark. The working sheet is `…/scratchpad/redesign/glyphs/glyphs.png`; the identity boards are `…/board/board*.png`.

- **First attempt.** Four glyphs that were all "pyramids on a full floor" (`010/1111`, `101/1111`, `111/1111`, `011/0111`). They were **hard to tell apart at 18 px**: all little humps (MEASURED, board v1).
- **Second set.** Chosen for **silhouette contrast**: a flat line, a two-peak, a tower and a gapped stack. These **were distinguishable at 18 px in tags** (MEASURED, board v2, `b2-p3.png`).

| Slot (direction_order) | Direction (current content) | Glyph code | Pearls | Silhouette | Reading |
|---|---|---|---|---|---|
| 01 | Algorithmic Advice | `0/00/000/1111` | 4 | flat line | a queue: advice arriving in order |
| 02 | AI at Work | `0/00/101/1111` | 6 | two peaks | two agents, human and AI, side by side |
| 03 | Learning on the Job | `0/10/110/1110` | 6 | tower leaning left | accumulation, building up |
| 04 | Platform Work | `0/00/001/1011` | 4 | gap, then a small stack | a matching market with a missing match |
| reserve 05 | (e.g. Pricing & Experiments) | `0/00/010/1111` | 5 | centred hump | — |
| reserve 06 | (e.g. Cities & Communities) | `0/00/100/1101` | 4 | stack, gap, single | — |
| reserve 07 | — | `0/00/011/0111` | 5 | right-heavy pile | — |
| reserve 08 | — | `0/00/111/1111` | 7 | trapezoid | — |

The "Reading" column is a mnemonic only. **The meaning is carried by the label**, and glyphs are never the only identifier (WCAG 1.4.1).

**CMS rule** (for the build team):
- Add an optional `glyph` enum to directions, with the 41 codes.
- The validator rejects two live directions with the same glyph, and warns when two live glyphs are mirror images.
- Default: assign by `direction_order` from the table above. Never re-derive automatically when the order changes, because a lab's marks must not shuffle when an editor reorders a list.

### 3.4 Lab mark and wordmark (HYPOTHESIS; rendering MEASURED)

**Lab mark = the union of the four founding directions, frozen.**
- `1111 ∪ 101/1111 ∪ 10/110/1110 ∪ 001/1011` = **`0/10/111/1111`**: 8 pearls with one pearl settled on the left shoulder.
- It is a valid settled stack. It reads as a pile that has just come to rest, not as a billiards rack.
- The full 10-pearl triangle was tried first. At 120 px it read as a bowling or billiards rack (MEASURED, board v1), so it was rejected.
- The mark is **frozen** (2026). New directions do not change it, exactly as a founding date does not change.

**Wordmark directions** (rendered in T3 Familjen Grotesk 700; any chosen system's display face works):

- **W1 — Stack + name (primary, ≥ 120 px wide).**
  - The lab mark sits to the left of "BOBALAB". Its **floor row bottoms sit on the type baseline**, and the mark height is 1.5 × cap height.
  - The gap between mark and name is 1 u. The name is set at −0.02em tracking, as one word.
  - No letter is replaced by a pearl. That retires the current pearl-O, which is a cute substitution trope and a dependence on a display serif.
- **W2 — Name + ∴ terminal.** "BOBALAB∴", where the 3-pearl stack replaces a full stop: the lab's conclusion. It is playful but quiet. Use it for slide footers and email signatures.
- **W3 — Header lockup (≤ 120 px).**
  - ∴ at cap height, gap 0.4 cap height, then the name.
  - The descriptor "Berkeley Operations and Behavioral Analytics Lab" runs below, in the text face at 500.
  - Self-critique (MEASURED by eye): three circles alone are a generic shape. W3 is acceptable only because the larger system around it makes ∴ the "smallest member" of a family. It is not a standalone logo.
- **Delivery:** all marks ship as outlined inline SVG with `role="img"` and `<title>BOBALAB</title>`, as the brief already requires (§C8). The UC Berkeley and Haas exclusions in brief §C8 still apply.

### 3.5 Small sizes, one colour, favicon

| Rendered width | Form | Rule |
|---|---|---|
| ≥ 48 px | full glyph or lab mark, d = 0.84–0.86u | — |
| 24–47 px | full glyph, d = 0.80u | there must be ≥ 1 device px between pearls |
| 16–23 px | **direction glyphs only beside their text label** (tags); lab = ∴ | in tags the glyph is 18 px wide (pitch 4.5 px) |
| ≤ 16 px | **∴ only** | favicon |

**Favicon 16×16** (pixel-tuned): three circles with `r = 3.25` at **(4.25, 11.75), (11.75, 11.75), (8, 5.25)**.
- The geometry is an equilateral triangle with side 7.5, which leaves 1 px gaps (MEASURED, rendered at 16/32/48 px).
- In `src/app/icon.svg`, ink on transparent, plus a `prefers-color-scheme: dark` fill of the light ink.
- `apple-icon`: ∴ in paper on an ink square, 180 px.

**One colour:**
- Every mark is a single flat fill, so it survives a rubber stamp, laser engraving, a one-colour riso, fax and embroidery.
- Reversed (paper on ink) needs no adjustment because there are no strokes or highlights.

### 3.6 Applications (HYPOTHESIS)

- **Tags and lists** (replaces today's 10 px coloured dot):
  - An 18 px direction glyph in the direction's spot ink (P3), or in ink (P1/P2), followed by the label.
  - This gives a **shape cue as well as colour**, a real accessibility gain over a dot that differs only by hue.
- **Direction page header:**
  - The direction glyph at 160–240 px in spot ink, its floor sitting on the header's bottom rule, with the h1 beside it.
  - The Fig. 1 pearl → header morph remains: the pearl lands *on the glyph's position*.
- **Fig. 1 (kept):**
  - It stays the lab's research figure: one pearl per direction, seeds = papers.
  - Identity changes that help it:
    - flat pearls with no sheen;
    - the radial halo replaced by a flat 1.5 px ring in the direction's spot ink at radius 0.64D (the existing orbit);
    - the "01–04" numerals inside pearls replaced by the 18 px direction glyph in the label row.
  - **Optional, for the owner:** seeds could *settle* below each pearl as a small stack instead of sitting on the orbit. That is more on-metaphor, but it is a bigger change to an already judged figure (D-02a), so it is not recommended without a new prototype round.
- **Posters (A0/A1 or 24×36 in):**
  - Layout grid = the lattice: pitch `u = width / 12`, and type baselines on lattice rows.
  - One direction glyph at 4–6 u in its spot ink, resting on the bottom margin. Title in the display face at 1 u cap height.
  - A lab-wide poster overprints the four direction glyphs at the same origin with `mix-blend-mode: multiply` (print: overprint), producing the lab mark in the overlap.
- **Slides (16:9):**
  - **Title:** lab mark W1 bottom-left, resting on the bottom margin.
  - **Section dividers:** the direction glyph in spot ink at half the slide height.
  - **Content slides:** ∴ at 24 px bottom-left, plus the slide number in tabular figures. No pearls anywhere else.
- **Social / OG (1200×630; 1080×1350):**
  - Ink ground, title in the display face, the direction glyph at about 25% width resting on the bottom-right margin.
  - Kicker "New working paper · 02 AI at Work" in the voice face, not mono.
  - MEASURED: the board mock reads clearly at thumbnail size.
  - The current OG plan (a still of Fig. 1) can stay for the home page. Paper and news OG images use this template.
- **Data-driven variant (posters only):**
  - "Year in pearls": each publication of the year is one pearl, dropped in date order onto a 12-wide floor with the same stability rule. Each lands in the lowest settled slot, leftmost first.
  - It is deterministic, generated, and unique each year. It is never used as a logo, because logos must not change with counts.

### 3.7 Other grammars considered (HYPOTHESIS)

- **Queue / straw.** A vertical tube of 5 slots, each a pearl or empty: 31 codes. Readable as a barcode, but it loses the settling metaphor, and at 16 px a 5-slot column is 3 px per pearl. Rejected.
- **Steeping rings.** Concentric rings whose count or weight encodes a direction. Reads as a target or "AI orb", which is a tell. Rejected.
- **Hex flower** (7 positions: centre plus 6). Closest to the Media Lab principle, but arbitrary for pearls (pearls don't arrange in flowers). Rejected for meaning, not for legibility.

---

## 4. Colour

### 4.1 Method

- **WCAG 2.x contrast:** relative luminance as in WCAG, computed from the hex values. Thresholds: 4.5:1 for text, 3:1 for large text and non-text UI or graphics (SC 1.4.3, 1.4.11).
- **Colour-vision deficiency:** Machado, Oliveira & Fernandes (2009) matrices, severity 1.0, applied in linear RGB. ΔE is Euclidean OKLab × 100. About 2 is a just-noticeable difference, and differences under about 5 are hard to tell apart in small marks [H threshold].
  - This metric is **not** the CIE76 metric used in brief §C3, so compare only within this document. The current four deep tones re-measured with *this* metric give a minimum of 3.34.
- **Every number below was computed** (script `palettes.py`, §6). None are estimated.

### 4.2 The current palette (MEASURED)

- **Contrast passes everywhere.** In light mode, ink is 16.93 on paper, ink-muted 7.57 and accent 6.85. In dark mode, ink is 15.95, muted 9.02 and accent 8.63.
- **The problem is identity, not accessibility:**
  - The plate and alt surfaces are the "warm editorial" cream (ΔE 0.26–0.46 from `#F4F1EA`; OKLCH of `#f4f0ea` is L 0.957 C 0.009 H 78°, against the tell's L 0.959 C 0.010 H 87°).
  - The brown accent belongs to the clay family.
  - The direction colours are muted mid-darks (`deep`), so they read as "tasteful café", and they are weak under CVD: minimum ΔE **3.34**, matcha vs oolong under deuteranopia.
  - Seeds are 1.8–2.4:1 by design (decorative).

### 4.3 P1 — Ink on paper, one confident accent: "butterfly pea" (conservative)

**Idea.**
- No tint on the page at all: white paper, a near-black warm ink, and **one** saturated accent.
- The accent is butterfly-pea blue. Its "treated" state, used for hover and visited links, is violet: butterfly-pea tea turns from blue to violet when acid is added, a natural pH indicator.
- So the one accent has a **control and a treatment state**, a quiet in-joke for an experiments lab.
- Flat colour only. No gradients.

**Light**

| text \ bg | paper `#ffffff` | paper-alt `#f3f3f1` |
|---|---|---|
| ink `#15130f` | 18.55 | 16.70 |
| ink-muted `#57534d` | 7.64 | 6.87 |
| pea (links) `#2440c4` | 8.06 | 7.25 |
| pea-treated (visited/hover) `#6b2fa3` | 8.20 | 7.38 |
| *(non-text)* rule `#8a857d` | 3.66 | 3.30 |
| *(decorative)* hairline `#dcd9d3` | 1.41 | 1.27 |

- Button: white on pea **8.06**, white on treated **8.20**.
- Ink on a pea wash `#e3e8fb`: **15.20**.

**Dark**

| text \ bg | paper `#121110` | surface `#1b1a18` | paper-alt `#181715` |
|---|---|---|---|
| ink `#eeebe6` | 15.86 | 14.63 | 15.07 |
| ink-muted `#b3aea6` | 8.55 | 7.89 | 8.12 |
| pea `#94a7ff` | 8.29 | 7.64 | 7.87 |
| pea-treated `#c9a3f2` | 8.99 | 8.28 | 8.53 |
| *(non-text)* rule `#7e786f` | 4.31 | 3.98 | 4.10 |
| *(decorative)* hairline `#34312d` | 1.46 | 1.34 | 1.38 |

- Button: night on pea **8.29**.
- Ink on a pea wash `#1d2140`: **13.14**.

**Notes:**
- Pea vs body ink is only **2.30:1**, so links **must stay underlined**, as they already are (SC 1.4.1).
- The focus ring is a 2 px ink ring (≥ 3:1 against everything here), with pea as an inner 1 px ring in dark mode [H].
- Direction colours in P1: use the P3 spots (§4.5) for glyphs only, or ink-only glyphs.
- **Risk** [H]: a blue accent on white is the most "default web" choice. It is saved from being generic only by the violet treated state and by the type system.

### 4.4 P2 — Two-colour "ledger" print (bold)

**Idea.**
- Printed as if on a two-ink press: a green-black ink plus **one** spot green, on a faint green stock like ledger or engineering paper.
- The point is *operations*: columnar pads, schedules, ledgers.
- All tints are **screens** of the spot (15 / 40 %), not new hues.
- **Directions are distinguished by glyph shape alone, not by hue.** That is the purest two-colour discipline, and it removes per-direction colour from Fig. 1, so the pearls become ink with spot-green orbits. This is a deliberate, owner-level trade-off.

**Light**

| text \ bg | stock `#eef3ec` | sheet `#ffffff` | spot screen 15 % `#d1e1d4` |
|---|---|---|---|
| ink `#141a16` | 15.70 | 17.66 | 12.98 |
| ink-70 `#555b56` | 6.19 | 6.96 | 5.11 |
| spot-text (links) `#246140` | 6.53 | 7.35 | 5.40 |
| *(non-text)* spot `#2f7a4f` | 4.65 | 5.23 | 3.84 |
| *(non-text)* rule `#7f8a83` | 3.18 | 3.58 | 2.63 ✗ (never draw rules on screens) |
| *(decorative)* ledger grid `#c9d6cc` | 1.34 | 1.50 | 1.10 |

- White on a spot-text fill (button): **7.35**.
- Ink on a 40 % screen `#a9d4b6`: **10.75**.

**Dark**

| text \ bg | stock `#121613` | sheet `#1a1f1b` |
|---|---|---|
| ink `#e9eee9` | 15.54 | 14.23 |
| ink-70 `#a8ada9` | 8.01 | 7.34 |
| spot-text `#7fcf9d` | 9.84 | 9.01 |
| *(non-text)* spot `#5fb582` | 7.32 | 6.70 |
| *(non-text)* rule `#6f7a73` | 4.09 | 3.75 |
| *(decorative)* grid `#28322b` | 1.38 | 1.26 |

- Night on a spot button: **9.84**.

**Notes:**
- Spot-text vs ink is **2.40:1**, so links stay underlined.
- The stock is as light as the cream tell (ΔE 0.86 to `#F4F1EA`; any near-white is close in ΔE). Its **hue is 137° (green) against the tell's 87° (yellow)**. The distinction is hue, which is visible in the board render, but it is subtle on poorly calibrated screens [H].
- **Risk** [H]: green plus black can read as "finance" or "spreadsheet" (MEASURED by eye on the board: the green button reads a little "Excel").

### 4.5 P3 — Direction colours as true spot inks (recommended)

**Idea.**
- The page is neutral ink-on-white with **no brand accent**. Links are ink and underlined, and the primary button is ink.
- Colour appears only where it **means something**: one spot ink per research direction.
- Spots are used as **fills and marks**: glyphs, Fig. 1 orbits, direction header bands, tag glyphs, poster fields. **Text on a spot is always dark ink**, in both modes.
- **Each spot is one hex in light and dark mode.** That is possible because every spot was chosen inside the luminance band 0.21 ≤ Y ≤ 0.30, where all four of these hold at once:
  - ink on the spot is ≥ 4.5;
  - the spot on white is ≥ 3 (as a graphic);
  - the spot on night is ≥ 4.5;
  - night text on the spot is ≥ 4.5.
- The four core spots were picked by a search over OKLCH within that band, maximising the minimum CVD ΔE.
- This makes the colour story **systematic rather than decorative**, which is the reverse of the AI cluster: there colour is ambient mood, here it is data.

**Neutral base** (identical to P1's neutrals):

| pair | ratio |
|---|---|
| ink `#15130f` on paper `#ffffff` | 18.55 |
| ink-muted `#57534d` on paper / on paper-alt `#f8f8f6` | 7.64 / 7.18 |
| *(non-text)* rule `#8a857d` on paper / paper-alt | 3.66 / 3.45 |
| dark: ink `#eeebe6` on night `#121110` / night-surface `#1b1a18` | 15.86 / 14.63 |
| dark: ink-muted `#b3aea6` on night / night-surface | 8.55 / 7.89 |
| dark: *(non-text)* rule `#7e786f` on night / night-surface | 4.31 / 3.98 |
| ink button: paper `#ffffff` on ink `#15130f` | 18.55 |

**Spot inks**

| spot | hex | OKLCH (L C H) | ink on spot (text) | spot on paper `#fff` (graphic) | spot on paper-alt `#f8f8f6` | spot on night `#121110` | spot on night-surface | night on spot (text) |
|---|---|---|---|---|---|---|---|---|
| **butterfly-pea** (01) | `#4b8efe` | 0.66 0.180 260 | **5.83** | 3.18 | 2.99 ✗ | 5.93 | 5.47 | **5.93** |
| **lychee** (02) | `#ec6094` | 0.68 0.179 0 | **5.89** | 3.15 | 2.96 ✗ | 5.99 | 5.52 | **5.99** |
| **matcha** (03) | `#249163` | 0.58 0.120 160 | **4.69** | 3.96 | 3.72 | 4.77 | 4.39 | **4.77** |
| **oolong** (04) | `#c06c08` | 0.61 0.141 60 | **4.76** | 3.90 | 3.66 | 4.84 | 4.46 | **4.84** |
| jasmine (reserve) | `#2a9f9a` | 0.64 0.100 191 | 5.76 | 3.22 | 3.03 | 5.86 | 5.40 | 5.86 |
| taro (reserve) | `#9b6bce` | 0.62 0.151 305 | 4.76 | 3.90 | 3.67 | 4.84 | 4.46 | 4.84 |
| thai tea (reserve) | `#db703b` | 0.66 0.150 45 | 5.65 | 3.28 | 3.09 | 5.74 | 5.29 | 5.74 |
| black sesame (reserve) | `#8b8886` | 0.63 0.005 56 | 5.27 | 3.52 | 3.31 | 5.36 | 4.94 | 5.36 |

**Rules that follow from the numbers:**
- **Spots are never text on light paper** (3.15–3.96 < 4.5). On night `#121110` all four would pass as text (4.77–5.99), but on night-surface matcha (4.39) and oolong (4.46) fall just short. **For simplicity, spots are never text in either mode.**
- **Glyphs on paper-alt:** butterfly-pea and lychee drop to 2.99 / 2.96 on `#f8f8f6`. Meaningful glyphs therefore sit on white only, or the alt surface stays glyph-free.
- **Spot bands with text** (direction header band, active filter): ink text in light mode, night text in dark mode, ≥ 4.69 everywhere.
- **Colour-vision separation** (minimum ΔE_OK×100 across normal, protan, deutan and tritan):

  | Set | Min ΔE | Worst pair |
  |---|---|---|
  | core 4 | **8.42** | matcha vs oolong, protan |
  | current deep core 4 | 3.34 | same metric |
  | core 4 + taro | 7.62 | — |
  | core 4 + black sesame | 4.44 | — |
  | core 4 + jasmine | 4.19 | pea vs jasmine, tritan |
  | core 4 + thai tea | 3.55 | lychee vs thai tea, tritan |

  Reserve order is therefore **taro → black sesame → jasmine → thai tea**, with the validator warning as today. Shape (the glyph) and label always carry the meaning anyway.
- **Risk** [H]: pea `#4b8efe` and lychee `#ec6094` are bright. In large fields (posters, OG cards) they read as confident print inks (MEASURED by eye on the board). On the site they must stay in small areas, at most about 10 % of any viewport, or the page turns "candy".
- The neutral base carries the academic credibility. Fig. 1 is the only place where all four spots appear together.

### 4.6 Recommendation

**P3 with T3 and the Settle grammar.** All three decisions reinforce one idea: **a direction is a glyph plus a spot ink, and everything else is ink on paper.**
- If the owner finds P3 too bright, keep the system and swap the spots for P1's single pea as the only colour (glyph shape then carries direction).
- P2 is the "art-directed" option if the lab wants a print-shop personality.

---

## 5. Motion from the metaphor

### 5.1 Principles (HYPOTHESIS; the curves are computed)

Each motion must **explain a relationship** (arrival, belonging, state, affordance). If it does not, it is removed. All motion stays inside the existing motion-last gate (`prefers-reduced-motion: no-preference` and not `[data-motion="reduce"]`), and is transform, opacity or clip-path only.

| Principle | Meaning it carries | Where | Curve (exact) | Duration |
|---|---|---|---|---|
| **Settling** (a pearl sinking to rest) | *Arrival*: something new has landed | First-visit Fig. 1 intro. A new item on a direction page since the last visit (optional). The pearl → header morph landing. | **Critically damped, no overshoot:** `p(t) = 1 − (1 + ωt)·e^(−ωt)`, ω = 9.23 (p(1) = 0.999). CSS: `linear(0, 0.180, 0.455, 0.671, 0.812, 0.896, 0.944, 0.971, 0.985, 0.992, 0.996, 0.998, 0.999)` | 560–640 ms. Stagger in *physical* order: floor pearls first, then upper rows, 60 ms |
| **Diffusion** (tea spreading in milk) | *Belonging*: these things are related | Hover or focus on a direction tag spreads its spot to the glyphs of all items of that direction on the page (publications, news). Fig. 1 hover spreads the spot to the caption rule. Entering a direction page spreads the band tint from the glyph outward. | Radius ∝ √t (diffusion): `clip-path: circle()` with `linear(0, 0.316, 0.447, 0.548, 0.632, 0.707, 0.775, 0.837, 0.894, 0.949, 1)` | 320–480 ms |
| **Steeping** (colour deepening over time) | *State change*: the content now reflects your choice | Filtering and search on publications: results reach full opacity on an exponential approach, with no slide. Theme or reduce-motion toggles. | `p(t) = (1 − e^(−4t)) / (1 − e^(−4))`: `linear(0, 0.336, 0.561, 0.712, 0.813, 0.881, 0.926, 0.957, 0.977, 0.991, 1)` | 200–280 ms |
| **Buoyancy** (what can be picked up floats) | *Affordance*: this can be clicked | Only interactive elements rise on hover or focus (−2 px) and sink on press (+1 px). Static content never moves. | the existing `--ease-out`, 160–200 ms | — |

**Consequences:**
- **Nothing animates on scroll** (no fade-up reveal; that is a wave-1 tell).
- **Nothing loops.** Because no animation runs longer than 5 s, WCAG 2.2.2 needs no Pause control. The in-plate "Pause motion" button (judged clumsy in JUDGE.md) can go. The footer "Reduce motion" toggle stays.

### 5.2 What to remove, mapped to D-02 / D-02a (HYPOTHESIS; the owner decides)

| Current item (DECISIONS.md) | Action | Why |
|---|---|---|
| D-02.2 idle float, ±2.5 px loops of 7–11 s | **Remove** | Ambient motion with no meaning. It forces a Pause button. Buoyancy should be a *response*, not a mood. |
| D-02.3 pointer buoyancy / parallax | **Remove** | Decorative, needs a rAF JS loop, and reads as a "tech demo". |
| D-02a "stir" ±14° while active | **Remove** | No meaning. |
| D-02a halo-in bloom + radial halos + sheen | **Remove**; replace with flat spot orbit rings | The halo/spotlight and gloss tells (§1.2). |
| D-02a intro `-28 → +4 → -1 → 0` overshoot | **Re-time** to the critically damped settle | Overshoot is the "bounce easing" tell. A pearl in tea doesn't bounce. |
| D-02.4 seed bloom on hover (+12 % ring) | **Replace** with diffusion of the spot along the caption rule and related tags | It currently says "this is hoverable". Diffusion says "these belong together". |
| D-02.5 pearl → header morph | **Keep**, using the settle curve for the landing; drop the 3 px blur | It explains navigation (this pearl *is* that page). |
| Page cross-fade 150/210 ms | **Keep**, simplified to a 120 ms crossfade with no translate, except for the morph | Neutral. |
| Meniscus divider | **Remove** | Decorative; one more boba pun. |

**Budget effect** [H]: removing the float, parallax and stir removes most of the figure's JS. The remaining motion is CSS plus a few lines for diffusion targeting.

---

## 6. Evidence and reproducibility

**Screenshots of BOBALAB's own live site** (MEASURED 2026-10-24) are in `docs/redesign/before/`:
- `identity-home-light-1366.png`, `identity-home-dark-1366.png`, `identity-home-full-1366.png`, `identity-home-mobile-390.png`;
- `identity-fig1-2x.png`, `identity-header-2x.png`;
- `identity-research-*`, `identity-publications-*`, `identity-people-*` (1366 viewport and full page).

**Working tools and renders** are in the session scratchpad (`C:/Users/jiami/AppData/Local/Temp/claude/C--Users-jiami-OneDrive-Desktop-Claude/25396689-b301-43ec-ba70-d96c5414cf98/scratchpad/redesign/`, not in the repo):

| File | What it does |
|---|---|
| `tools/identity-shots.js` | live-site screenshots plus computed-style counts (radii, fonts). Output: `tools/identity-measure.json` |
| `tools/fontdata.py` | Fontsource metadata plus jsDelivr latin woff2 byte sizes. Output: `tools/fonts.json`, `fonts2.json` |
| `tools/features.js` | `tnum` / `pnum` / `smcp` probe |
| `tools/specimen.py` → `specimens/type*.png` | type-system specimens with lab content |
| `tools/glyphs.py`, `tools/glyph-render.py` → `glyphs/glyphs.png` | enumeration of the 41 settled stacks and size tests |
| `tools/board.py`, `board2.py` → `board/board*.png`, `b2-*.png` | identity boards: P1/P2/P3 × light/dark, wordmarks, favicon, OG card |
| `tools/color.py`, `palettes.py`, `p3opt.py` | WCAG contrast, OKLCH, Machado CVD, spot-band search |

**Limits:**
- Specimens and boards were rendered in headless Chromium on Windows. Hinting on macOS/iOS will differ.
- I did not test the proposals with users. Recognition of the glyphs at 18 px was judged by me from renders, not measured with people.
- Literata's default opsz in the wght-only file was not verified [U].

---

## 7. Decisions for the owner / PI

1. **Type:** T3 (recommended), T1, T2 or T4.
2. **Colour:** P3 spots (recommended), P1 single accent, or P2 two-colour print.
3. **Mark:** adopt the Settle grammar, the frozen lab mark `0/10/111/1111` and ∴ as the favicon. Retire the pearl-O wordmark.
4. **Motion:** approve the removals in §5.2. This supersedes parts of D-02 / D-02a and needs a new DECISIONS entry.
5. **Fig. 1:** flat pearls with spot orbit rings and glyph labels (recommended), or keep the current rendering. Separately, decide whether to prototype "seeds settle below the pearl".
6. **Haas MarCom (brief H-10):** a lab glyph system is a unit-specific mark, so it still needs their OK before it appears on posters.

## Sources

**Design commentary:**
- https://claude.com/blog/improving-frontend-design-through-skills
- https://capitalandcompute.net/blog/fix-ai-slop-design/
- https://impeccable.style/slop
- https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website
- https://codemyspec.com/blog/vibe-coded-websites-look-the-same
- https://github.com/Laith0003/ux-skill/wiki/Anti-AI-slop-ban-list
- https://www.925studios.co/blog/ai-slop-design-tells
- https://www.wired.com/story/ai-has-come-for-serif-fonts/ (via https://feedbagel.com/post/ai-has-come-for-serif-fonts)
- Tuch et al. 2012, doi:10.1016/j.ijhcs.2012.06.003

**Identity precedent:**
- https://www.pentagram.com/work/mit-media-lab/story
- https://www.designboom.com/design/the-new-mit-media-lab-identity-by-pentagram/
- https://www.dezeen.com/?p=579622

**Fonts:**
- https://api.fontsource.org/v1/fonts/ (and `/v1/variable/`)
- https://cdn.jsdelivr.net/fontsource/fonts/
- https://github.com/google/fonts (`ofl/*/METADATA.pb`, `DESCRIPTION.en_us.html`)

**Accessibility and colour:**
- WCAG 2.2 SC 1.4.1, 1.4.3, 1.4.11, 2.2.2 — https://www.w3.org/TR/WCAG22/
- Machado, Oliveira & Fernandes 2009, "A Physiologically-based Model for Simulation of Color Vision Deficiency", IEEE TVCG 15(6)
