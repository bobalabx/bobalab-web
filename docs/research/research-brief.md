# S2: BOBALAB website, research and design brief (the build follows this)

- Date: 2026-10-20. Prepared by the S2 synthesis task.
- **Inputs, read in full:** R3 (design references), R4 (CMS and hosting) with its *Verification*, R5 (boba concepts) with its *Critique*, R6 (frontend stack) with its *Verification*. R1 (content) was skimmed for themes; R2 (corroboration) was skimmed for the lab facts R1 cites.
- **Precedence:** where a Verification or Critique section conflicts with its report's main text, the Verification or Critique wins. §0.2 lists every place this brief overrides an input.
- **New checks made by S2 today:**
  - npm registry metadata for 13 packages.
  - Font file sizes from the jsDelivr data API. Raw copies are in `research/raw/s2/`.
  - Contrast and colour-vision computations. Scripts are in `scratchpad/bobalab/s2-tools/` (`tokens.py`, `sets.py`, `set6.py`).
  - Six public doc pages: Decap widgets and preview, GitHub Pages 404, WCAG 2.2, Core Web Vitals, MDN CSP, Markdoc.
  - The Next.js 16.4.2 docs bundled in the project's `node_modules`.
  - Nothing was installed or executed except `npm view`, `curl` of public JSON, and the S2 Python scripts.

**Labels.** Every factual claim carries one:
- **[D]** DOCUMENTED: an official or primary source says it.
- **[C]** CORROBORATED: two or more independent sources agree.
- **[H]** HYPOTHESIS: inference, design judgment or a parameter to tune.
- **[U]** UNKNOWN.

The text after the colon is a source key from §J, or an input reference such as "R4 V19" (row V19 of R4's verification table, which carries the primary URL) or "R5 C5.1" (critique item). Design decisions in this brief are [H] unless marked otherwise.

**Copyright and privacy.** Everything is paraphrased. No abstracts or bios are reproduced. No student is named here; roster facts are counts only.

---

## 0. Summary

| Layer | Decision |
|---|---|
| **Concept** | **"Fig. 1: the Pearl Figure."** The home hero is an annotated research figure on a flat plate. Equal-size matte tapioca pearls (one per research direction) carry an index number. Small flat dots around each pearl stand for that direction's public papers. Each pearl plus its label is a real link in one ordered list. Clicking a pearl morphs it into the header of the direction page through React `<ViewTransition>`. This is R5's hybrid with **all** critique fixes (R5 C9). A quieter "pearl dot plot" (R5 C10) is the documented fallback if a five-second test fails. |
| **Framework** | **Next.js 16.4.2** App Router, `output: 'export'` (static HTML), React 19.3.1, TypeScript 6.0.3, Tailwind CSS 4.3.3 via `@tailwindcss/postcss`, no animation library. |
| **CMS** | **Decap CMS 3.17.1**: a vendored static bundle at `/admin`, editorial workflow, Git-based, content in Markdown and YAML in the repo. **Runner-up: Keystatic** (GitHub mode), which needs a Node host at about $20/month. **Drop-in alternative UI: Sveltia CMS**, which reads the same config. |
| **Hosting** | **GitHub Pages**, from a lab-owned GitHub org, deployed by GitHub Actions on `ubuntu-latest`. GitHub OAuth for editors goes through a forked `sveltia-cms-auth` Cloudflare Worker on the free tier. |
| **Domain** | Launch on `bobalab-berkeley.github.io`. In parallel, apply through the Haas Security Contact for `bobalab.haas.berkeley.edu` (or `bobalab.berkeley.edu`). `bobalab.org` is an option only after its ownership is confirmed. |
| **Launch blockers (lab decisions, §H)** | (1) The list of directions and their short labels. (2) Roster and photo consent. (3) Which papers count as lab work. (4) The review gate. (5) Domain route. |

### 0.1 Design principles (apply to every package)

1. **Credible first, boba second.** The site must read as a Berkeley Haas research lab within 3 s; the pearls are wit, not costume [H; R5 C2].
2. **One semantic structure.** Every playful object is also the real navigation, never a second copy of it [H; R3 pattern 4; R5 C9.1].
3. **Static HTML first.** Every page works without JavaScript. JavaScript only enhances [H; R3 §5, BAIR and Senseable as counter-examples].
4. **Data-driven freshness.** Dates appear everywhere. Alumni, "upcoming" and counts are derived from data, never typed by hand [H; R3 patterns 11 and 13].
5. **Motion is finite and optional.** No loops, every motion is ≤ 0.8 s on load, and motion is fully removable [D rule: W-222; H for values].

### 0.2 Where this brief overrides its inputs

| Topic | Input says | Brief decides | Why |
|---|---|---|---|
| Server shape | R6 §0 recommends shape A (a Node host) because it assumed Keystatic | Static export (R6 shape B), because Decap is static | The CMS choice belongs to R4. Its verified pick needs no server [D: R4 V1–V6, V19] |
| Rich text | R6 §6: Markdoc via Keystatic | Decap writes **Markdown** through the `richtext` widget (beta since 3.12.0; `markdown` is deprecated). The site renders it with `@markdoc/markdoc` 0.5.10, a CommonMark superset | [D: DECAP-RT, DECAP-MD, MARKDOC]. That Markdoc escapes raw HTML is [H]; WP0 must unit-test it |
| Animation library | R6 recommends `motion` 14.4.0 | **Not used in v1**. React `<ViewTransition>` plus CSS does everything | `layoutId` across App Router pages is unreliable [D: NEXT-49279 via R5 §2.3]. The critique cut buoyancy [R5 C6] |
| Figure layout | R5 §6.3: d3 pack plus force at build | **Fixed slot templates** (CSS grid) for n = 2–8. No d3 | Packing reshuffles on every edit and mixes units [H: R5 C4.1, C4.3] |
| Hero setting | R5 §6.1: milk-tea field, meniscus, gravity | Flat plate. The milk-tea tone appears only inside the plate and direction headers | It reads as a drink diagram [H: R5 C1.1, C1.4] |
| Pearl sizes | Radius scaled ±15% by activity; `weightOverride` | All direction pearls the same size. Counts appear in text | Small size differences invite ranking [H: R5 C1.5] |
| Seeds | Glossy mini-pearls, one per project | **Flat tinted dots, one per public paper**, capped at 12 visible | Avoids the eyes and frogspawn texture and trypophobia risk; papers are public [H: R5 C1.2–1.3; R5 open question 2] |
| Labels | Gutter callouts with leader lines and a px sweep | Labels sit directly under each pearl inside the grid cell. No leader lines | Fixes the 1.43:1 leader lines and the label overflow [D computed: R5 C5.1; H] |
| Hover preview | A floating card | A fixed live caption at the top of the plate | Avoids WCAG 1.4.13 pop-up issues, never covers content, stays above the fold [H: R5 §6.7, C2.4] |
| Link accent | R3 §7.11: Berkeley Blue `#002676`; **[Critic] also R4 §6, which lists Berkeley Blue and California Gold accents under "May"** | The lab's own brown-sugar `#8A4515`. No Berkeley or Haas colours (decision H-9) | Avoids implying official marks [H: R5 §1.7; campus guidance discourages unit logos, D: UCB-BRAND]. R4 §6 says only that the colours are *allowed*, so the brief's choice does not break any rule |
| Display type | R5 §8.1: Fraunces SOFT 100, weight 680 | Fraunces **wght-only** file (sober) for headings. SOFT 100 only in the outlined wordmark | Too café-like, and the full Fraunces file is 118 KiB [D: FONTS; H: R5 C1.4, C6.2] |
| Next config | Scaffold has `cacheComponents: true`, `partialPrefetching: true`, `@tailwindcss/turbopack` | Remove all three. Use `@tailwindcss/postcss` | Partial Prefetching requires Cache Components [D: N-PP]. Cache Components with static export: support not stated [U: R6 §3.2]. The PostCSS route is the documented Tailwind route [D: R6 V13] |
| React patch | R6 §0: 19.3.1 fixes the RSC advisory | The fix arrives through **next ≥ 16.4.1**. 19.3.1 is hygiene only | [D: R6 Verification #4] |
| Sensitivity math | R4 §2: Keystatic ~83 | Decap 79, Sveltia 84, Keystatic 76 | [D arithmetic: R4 V32] |

---

## A. Competitive research summary (from R3; snapshot 2026-10-20)

**What the field looks like.**
- Even elite lab sites are visually conservative. They fail on structure:
  - undated news (Stanford HCI);
  - giant unfiltered publication lists with hand-typed citation errors (Stanford, HBS LISH, PAIR);
  - research shown as bare link lists (MIT CSAIL HCI);
  - pages that are blank without JavaScript (BAIR, Senseable) [D: R3 §2, §3].
- Business-school labs in the behavioural-operations field sit inside the school's web template and show research as topics, not findings (UT Dallas CLBOE, Wharton BCFG) [D: R3 §2.9–2.11].
- On the Haas site, "research labs" means two shared experiment facilities [D: HAAS-LABS via R3 S30].
- BOBALAB has no official Haas or university lab page. Its only official Berkeley mentions are four Fall 2026 URAP listings [D: R2 §5].
- **A well-structured, dated, filterable, accessible site would already lead its peer set** [H: R3 §0].

**Patterns adopted**

| Pattern | Seen at | Used in BOBALAB as |
|---|---|---|
| One master glyph with a variant per research unit | MIT Media Lab 2014 identity [C: R3 S11] | Pearl with an index number and direction colour, reused as a tag everywhere |
| Area icons as tags on every work item | Ink & Switch [D: R3 S17] | Small pearl tag plus text label on every paper, project, news item and person |
| Area page: problem → definition → findings → projects → siblings | Ink & Switch [D: R3 S18] | Direction page template (§D5) |
| Playful object directly above a plain index | Ink & Switch "Tenfold" [D: R3 S17] | The figure *is* the index: one `<ol>` of links |
| Single-paper page: teaser, materials row, copyable BibTeX | UW IDL [D: R3 S29] | Publication detail (§D8) |
| Filter state in the URL, with counts on chips | MIT Media Lab [D: R3 S6] | `/publications/?direction=…&type=…` |
| Accessible filter chips (real buttons, one scrolling row on mobile) | MIT CSAIL HCI [D: R3 S5] | Publications, people, news filters |
| Start and end dates drive alumni status | Senseable City Lab data model [D: R3 S24] | `people.start` and `people.end`; alumni derived at build |
| Member self-service profile editing | BAIR [D strings, H workflow: R3 S12] | Editors update their own person file via the CMS, behind the review gate |
| Date badges on events; breadcrumbs and area pills on projects | CMU HCII [D: R3 S13–S15] | News and talk dates; project breadcrumbs |
| Plain-language findings, RSS, "last updated" footer | BCFG, Ink & Switch, MIT HCI, UTD [D: R3 §4 #15] | "What we've learned", RSS feed, automatic last-updated stamp |

**Anti-patterns avoided** (each seen on a reference site) [D: R3 §5]:
- no carousels or auto-rotating text (PAIR, BCFG);
- never disable zoom (Media Lab);
- no client-only rendering (BAIR, Senseable);
- always set `lang`, charset, `alt` and a single `h1` (Stanford; MIT HCI's 66 `h1` elements);
- no generic link text such as "Read the Article" (BCFG);
- no tab sprawl or keyword clouds (Media Lab);
- no huge unfiltered people pages (BCFG);
- no stale "current" labels (UTD);
- no unpinned or legacy dependencies (LISH `@latest`, Stanford jQuery 1.3.2);
- no school template drowning the lab (UTD's ~330 links).

---

## B. Concept evaluation and choice

### B1. Evaluation table (8 criteria, 1–5, 5 = best; all scores [H])

Rows A–G are R5's own scores; the critique left them unchanged. The hybrid rows use the critique's revised scores (R5 C11).

| Concept | Originality | Credibility | Visual quality | Interaction clarity | Accessibility | Mobile | Performance | Maintenance | **Total /40** |
|---|---|---|---|---|---|---|---|---|---|
| A. Pearl Menu (the original idea, literal) | 2 | 3 | 3 | 5 | 5 | 4 | 5 | 5 | 32 |
| B. Cup cross-section, straw as navigation | 4 | 2 | 4 | 2 | 3 | 3 | 4 | 2 | 24 |
| C. Drifting constellation | 3 | 3 | 4 | 3 | 2 | 2 | 3 | 4 | 24 |
| D. Data-honest pearl cluster | 4 | 5 | 4 | 4 | 4 | 3 | 5 | 4 | 33 |
| E. "The Pour" (scroll-told) | 4 | 3 | 5 | 3 | 3 | 4 | 3 | 3 | 28 |
| F. "Fig. 1" annotated specimen | 5 | 5 | 4 | 4 | 4 | 3 | 5 | 4 | 34 |
| G. Liquid realism (WebGL) | 4 | 2 | 5 | 3 | 2 | 2 | 1 | 2 | 21 |
| R5 hybrid D+F, **as specified** | 5 | 4 | 4 | 3 | 3 | 3 | 4 | 3 | 29 |
| **R5 hybrid with critique fixes (CHOSEN)** | 5 | 5 | 4 | 4 | 5 | 4 | 5 | 4 | **36** |
| C10 "pearl dot plot" (FALLBACK) | 3 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 36 |

Supporting evidence behind the low scores:
- **G:** three.js is 184.9 KB gz and R3F 57.7 KB gz [D: R5 §2.10, bundlephobia].
- **B and G:** a cup with a straw, or photoreal boba, reads as beverage advertising [H].
- **C:** endless drift needs a pause control under WCAG 2.2.2 [D: W-222], and decorative drift carries no meaning [H: R5 P7].

### B2. Choice and reasoning

**Chosen: the R5 hybrid with every critique fix, named "Fig. 1: the Pearl Figure"** [H].
1. It ties with C10 at 36 and beats C10 on originality. It keeps the lab member's founding idea (click a pearl to open a direction), and the pearl becomes a reusable identity system (patterns 1–2 in §A). C10 is a chart, not a signature object [H: R5 C10–C11].
2. Credibility comes from the framing:
   - a figure number;
   - a caption that doubles as a legend;
   - real counts;
   - a flat plate;
   - sober type.

   The flat plate and sober type are the critique's fixes for the café look [H: R5 C1].
3. It is cheap and robust:
   - Server-rendered CSS pearls.
   - About 0.5 KB of client JS for the caption swap plus a short pre-paint script.
   - No layout code on the client.
   - Stable on content edits thanks to slot templates [H: R5 C6, C4].
4. **Gate:** before the polish work, a five-second test with 5 people from outside the lab (faculty or PhD students). Success means at least 4 of 5 name two directions **and** identify the labels as links. If it fails, or the lab confirms 7–8 directions, switch to C10. Both use the same `<ol>` DOM, so the switch is cheap [H: R5 C2, C10].

### B3. Critique fixes and where this brief applies them

| Critique item | Fix | Where |
|---|---|---|
| C1.1 drink diagram; C1.4 café palette | Flat `--plate` with a 1 px frame; no field, meniscus or gravity; milk-tea tone only in the plate and direction headers; near-neutral page background | §C2, §E2 |
| C1.2 glossy, toy-like pearls | Matte body; no specular highlight below 32 px; highlight alpha ≤ 0.25; no contact shadow | §C9, §E2 |
| C1.3 cluster texture | Seeds are flat, low-contrast tint dots (≈1.8–2.4:1), at most 12 visible plus a "+n" count in the label | §C3, §E2 |
| C1.5 size implies rank | Equal pearls; `weightOverride` removed | §E2 |
| C2.1 no link affordance | A persistent "→" after every label, the count, and underline on hover and focus | §E1 |
| C2.3 intro delays labels | Labels are visible at first paint; the intro moves pearl groups only, ≤ 760 ms, first visit per session | §E3 |
| C2.4 caption below the fold | Caption at the top of the plate | §E1 |
| C3 fit with business-school audience | Heading "Research directions", real counts, C10 fallback | §B2, §E9 |
| C4.1 layout reshuffles on edits | Fixed slot templates; adding a paper fills the next seed slot and moves nothing else | §E2 |
| C4.2–4.3 labels overflow, mixed units | Labels flow in grid cells under each pearl; list mode via an `em`-based container query | §E2, §E6 |
| C4.4 sparse at n = 2–3 | A row template for n ≤ 3 | §E2 |
| C5.1 leader-line contrast | No leader lines; index number on each pearl (14.51:1) | §C2, §E1 |
| C5.2 dimmed text fails | Dim graphics only (pearls and seeds to 0.55); labels stay at full opacity | §E3 |
| C5.4 forced-colours mode | Dedicated forced-colours CSS | §E7 |
| C5.5 Safari drops list semantics | `role="list"` on the styled `<ol>` | §E1 |
| C5.6 dark rim | Rim `#A47E62` at 100% (5.11:1 on night) | §C2 |
| C5.7 "01Label" accessible name | Numeral `aria-hidden`; stable figure `aria-label` | §E1 |
| C5.9 confusable colours | A CVD-checked assignment order; Taro and Thai tea held in reserve | §C3 |
| C5.10 focus after navigation | Unique `<title>`; focus moves to `<h1 tabIndex={-1}>` on client navigation | §E5, WP0 |
| C6.2 fonts outweigh JS | Fonts ≤ 100 KiB (computed 97.4 KiB) | §C4 |
| C6.3 intro replays or flashes | Pre-paint inline script sets `data-intro` once per session [D pattern: N-FLASH] | §E3 |
| C6.5 buoyancy | Cut from v1 | §E3 |
| C7 VT coverage | Class-based morph styling needs Chrome/Edge 125+, Safari 18.2+, Firefox 144+, Samsung 27+ (≈90.1%) [D: CIU-VTC]; others simply navigate | §E5 |
| C7 browser back | Morph on browser back is [U]; test it, never promise it | §E5 |
| C7 duplicate VT names | One DOM; decorative copies carry no `name` | §E1 |

---

## C. Design system

### C1. Tokens overview

All tokens live as CSS custom properties in `src/styles/tokens.css` and are mapped into Tailwind v4 with `@theme inline` [D: R6 §3.4, §4]. Light and dark switch on `prefers-color-scheme`; there is no manual theme toggle in v1 [H].

### C2. Core palette with computed contrast (WCAG 2.x relative luminance) [D computed: CALC; hexes H]

Thresholds: 4.5:1 for body text; 3:1 for large text and for UI or graphical boundaries (WCAG 1.4.3 and 1.4.11).

**Light mode**

| Token | Hex | Role | Key ratios |
|---|---|---|---|
| `--paper` | `#FCFAF6` | Page background (near-neutral warm white) | ink 16.93 · ink-muted 7.57 · accent 6.85 · rule 4.31 |
| `--surface` | `#FFFFFF` | Cards, inputs, menus | ink 17.65 · ink-muted 7.90 · accent 7.14 · rule 4.49 |
| `--paper-alt` | `#F4F0EA` | Alternate home sections | ink 15.55 · ink-muted 6.96 · accent 6.29 · rule 3.96 |
| `--plate` | `#F7F1E8` | Fig. 1 plate and direction header base (the only milk-tea surface) | ink 15.72 · ink-muted 7.03 · accent 6.36 · rule 4.00 |
| `--ink` | `#1F1712` | Text, focus ring | see above |
| `--ink-muted` | `#5C4F45` | Secondary text, metadata | ≥ 6.96 on every light surface |
| `--accent` | `#8A4515` | Links (always underlined in prose), primary button fill | button label `--paper` on accent: 6.85 |
| `--accent-strong` | `#6B3410` | Hover and active state | 9.48 on paper · white on it 9.89 |
| `--rule` | `#857463` | UI boundaries: inputs, chip outlines, table rules | ≥ 3.96 (passes 3:1) |
| `--hairline` | `#D8CAB6` | **Decorative only**: dividers, plate frame | 1.54 on paper; never a UI boundary |
| `--pearl` | `#2B1D15` | Pearl body (graphic) | 15.62 on paper · 14.51 on plate |
| `--pearl-index` | `#F7F1E8` | Index numeral on a pearl | 14.51 on pearl |

**Dark mode**

| Token | Hex | Key ratios |
|---|---|---|
| `--paper` | `#17110E` | ink 15.95 · muted 9.02 · accent 8.63 · rule 4.37 |
| `--surface` | `#221A15` | ink 14.60 · muted 8.26 · accent 7.90 · rule 4.00 |
| `--plate` | `#1E1713` | ink 15.08 · muted 8.53 · accent 8.16 · rule 4.14 |
| `--ink` | `#F3ECE2` | — |
| `--ink-muted` | `#BFB2A5` | — |
| `--accent` | `#E0A46B` | Also the focus ring in dark mode; button label `#17110E` on it: 8.63 |
| `--rule` | `#8A7766` | ≥ 4.00 |
| `--pearl` | `#3A2C22` | Body alone is 1.39:1 on night, so the rim is **mandatory** [D computed: R5 §7.2] |
| `--pearl-rim` | `#A47E62` at **100%** | 5.11 night · 4.68 surface · 4.83 plate |
| `--pearl-index` | `#F3ECE2` | 11.45 on the dark pearl body |
| `--paper-alt` *(critic)* | `#1C1511` | S2's own value in `s2-tools/tokens.py`, which this table had omitted. ink 15.37 · muted 8.69 · accent 8.32 · rule 4.22 [D computed: critic-tools/critic_colors.py] |
| `--accent-strong` *(critic proposal)* | `#EDBD8F` | Hover and active state in dark mode: 10.93 on paper · 10.01 on surface · paper-coloured label on it 10.93 [hex H; ratios D computed] |
| `--hairline` *(critic proposal)* | `#3D3129` | **Decorative only**: 1.49 on paper; never a UI boundary [hex H; ratio D computed] |

**Focus ring.**
- Light: 2 px solid `--ink`, 3 px offset.
- Dark: 2 px solid `--accent`.
- Both are ≥ 3:1 against adjacent colours [D computed].

### C3. Direction swatches (CMS enum, 8 swatches × 3 tones) [hexes from R5 §7.3; ratios D computed: CALC]

- **deep:** text and accents.
- **tint:** light-mode header band.
- **light:** dark-mode accent.
- **Seed (light mode):** deep at 40% over `--plate`.
- **Seed (dark mode):** light at 35% over the dark plate.
- **Dark header:** light at 10% over night.

| Swatch | deep / tint / light | deep on paper | deep on plate | ink on tint | deep on tint | light on night | seed L (vs plate) | seed D (vs dark plate) | dark header · ink on it |
|---|---|---|---|---|---|---|---|---|---|
| Butterfly pea | `#2F519B` / `#DFE6F5` / `#A9C0F2` | 7.27 | 6.75 | 14.10 | 6.05 | 10.25 | `#A7B1C9` 1.91 | `#4F5261` 2.28 | `#262325` · 13.27 |
| Oolong | `#7A5913` / `#F1E8CC` / `#E3C26E` | 6.17 | 5.73 | 14.42 | 5.25 | 10.87 | `#C5B493` 1.81 | `#635333` 2.37 | `#2B2318` · 13.20 |
| Lychee | `#993452` / `#F5DFE5` / `#F0A5BC` | 6.79 | 6.30 | 13.93 | 5.58 | 9.63 | `#D1A5AC` 1.93 | `#68494E` 2.23 | `#2D201F` · 13.38 |
| Matcha | `#3E6A2F` / `#E3ECD8` / `#A9CF8F` | 6.09 | 5.65 | 14.51 | 5.22 | 10.69 | `#ADBB9E` 1.80 | `#4F573E` 2.33 | `#26241B` · 13.26 |
| Jasmine | `#1E6660` / `#D8EBE8` / `#8FD3C9` | 6.45 | 5.99 | 14.26 | 5.43 | 10.98 | `#A0B9B2` 1.86 | `#465953` 2.37 | `#232421` · 13.31 |
| Black sesame | `#45413C` / `#E6E2DC` / `#CFC8C0` | 9.71 | 9.02 | 13.68 | 7.85 | 11.29 | `#B0ABA3` 2.03 | `#5C5550` 2.42 | `#292320` · 13.21 |
| Taro (reserve) | `#5E4391` / `#ECE5F4` / `#C6B3EB` | 7.50 | 6.96 | 14.36 | 6.36 | 9.84 | `#BAABC5` 1.92 | `#594E5F` 2.26 | `#282124` · 13.43 |
| Thai tea (reserve) | `#A0461C` / `#F7E3D3` / `#F2A57A` | 5.95 | 5.52 | 14.19 | 4.98 | 9.30 | `#D4AD96` 1.83 | `#684937` 2.19 | `#2D2019` · 13.44 |

- **All text pairs pass AA** [D computed].
- **Seeds are decorative** (counts are always given in text), so their low contrast (1.8–2.4:1) is intended [H: R5 C1].
- **Colour-vision safety** [D computed with the Machado 2009 simulation and CIE76 ΔE: CALC/set6.py; the model is an approximation]:
  - Default assignment order: **Butterfly pea → Oolong → Lychee → Matcha → Jasmine → Black sesame**.
  - Minimum pairwise ΔE across normal, deutan, protan and tritan vision:
    - 2 colours: 49.1
    - 3 colours: 30.9
    - 4 colours: 11.8
    - 5 colours: 9.8
    - 6 colours: 9.3
  - **Taro vs Butterfly pea (ΔE 3.2 protan) and Thai tea vs Oolong (3.3 deutan)** are the confusable pairs, plus Matcha vs Thai tea (6.4) [D computed; matches R5 C5.9]. Taro and Thai tea are therefore reserve swatches. The validator **warns** when a confusable pair is used together. It does not fail, because numbers and labels always carry the meaning (WCAG 1.4.1) [H].
- **Suggested mapping** if the PI confirms the R1 directions (decision H-1):
  - Gig & Platform Work → Oolong
  - Human–AI Decisions → Butterfly pea
  - Generative AI at Work → Lychee
  - Behavioral Pricing → Matcha

  [H]
- **[Critic] Mapping for S1's taxonomy.** The newer evidence-based taxonomy is in `content-audit.md` §7 and `content-dataset.json`. If the PI adopts it, use:
  - Algorithmic Advice → Butterfly pea
  - Platform Work → Oolong
  - AI at Work → Lychee
  - Learning on the Job → Matcha
  - optional Pricing & Experiments → Jasmine
  - legacy Cities → Black sesame

  Minimum ΔE is 11.8 for the 4 core pearls, 9.8 for 5 and 9.3 for 6 [D computed: critic-tools/critic_colors.py]. S1 originally suggested Taro and Thai tea, which gave a minimum ΔE of 3.2; that mapping has been corrected in both files [H].
- **Kept out on purpose:** Haas Blue `#003057` and California Gold `#FDB515` [D hexes: HAAS-BRAND via R5 §1.7; exclusion is H].

### C4. Typography (all SIL OFL-1.1) [license D: NPM; sizes D: FONTS, latin subset, normal style, KiB]

| Role | Family and file | Size | Use |
|---|---|---|---|
| Display / headings (h1–h3, home mission) | **Fraunces** variable, wght-only file (`fraunces-latin-wght-normal.woff2`), weights 560–620. Never above 620 for headings [H: R5 C1 fix] | 35.8 KiB | Headings only, never body text |
| Text / UI | **Inter** variable, wght-only (`inter-latin-wght-normal.woff2`), 400 / 500 / 600 | 47.1 KiB | Body, navigation, labels |
| Data / indices | **IBM Plex Mono** 500 (`ibm-plex-mono-latin-500-normal.woff2`) | 14.5 KiB | Index numerals, years, DOIs, counts |
| **Total preloaded** | | **97.4 KiB** (≤ 100 KiB budget, R5 C6) | |
| Alternative B (sober; decision H-8) | Newsreader wght 56.7 + Public Sans wght 26.2 + Plex Mono 14.5 | 97.4 KiB | Same budget |

For comparison, the full Fraunces file (all axes) is 118.2 KiB, and the "soft" file is 61.0 KiB [D: FONTS].

Notes:
- The Fraunces wght-only file fixes the SOFT, WONK and opsz axes at their defaults. The default values are [U]; WP0 verifies the headings look non-"soft".
- Inter is also a Haas typeface [D: HAAS-BRAND], a harmless nod.

**Loading.**
- Copy the woff2 files plus `OFL.txt` from the pinned `@fontsource*` packages into `src/fonts/`.
- Load them with `next/font/local` (self-hosted, build-time, no third-party requests [D: R6 §3.4]), `display: 'swap'` and automatic fallback metrics [H].
- Latin-ext files load only if the content validator detects non-Latin-1 characters [H].

**Type scale** (root 16 px; `rem` minimums so text zoom always grows text) [H]

| Token | Size | Line height | Face / weight | Use |
|---|---|---|---|---|
| `--fs-mono` | 0.8125rem (13 px), tracking .06em | 1.4 | Plex Mono 500 | Index numerals, years, DOIs |
| `--fs-sm` | 0.875rem (14 px) | 1.45 | Inter 400/500 | Metadata, captions, badges |
| `--fs-base` | 1.0625rem (17 px) | 1.6 | Inter 400 | Body; prose max 66ch |
| `--fs-lg` | 1.25rem | 1.45 | Inter 500 | Lead, h4 |
| `--fs-xl` | 1.5625rem | 1.3 | Fraunces 600 | h3 |
| `--fs-2xl` | clamp(1.75rem, 1.35rem + 1.6vw, 2.25rem) | 1.2 | Fraunces 600 | h2 |
| `--fs-3xl` | clamp(2.25rem, 1.6rem + 2.6vw, 3.25rem) | 1.1 | Fraunces 600 | h1 |
| `--fs-display` | clamp(2.5rem, 1.7rem + 3.4vw, 3.75rem) | 1.05 | Fraunces 580 | Home mission line |

### C5. Spacing, layout, radius, elevation [H]

- **Spacing** (4 px base):
  - `--s-1` 0.25rem
  - `--s-2` 0.5rem
  - `--s-3` 0.75rem
  - `--s-4` 1rem
  - `--s-5` 1.5rem
  - `--s-6` 2rem
  - `--s-7` 3rem
  - `--s-8` 4rem
  - `--s-9` 6rem
- **Layout:**
  - Side gutter: 16 px below 640 px, 24 px to 1024 px, 32 px above.
  - Content max width 72rem; prose 66ch.
  - Home hero grid at ≥ 64rem: 5/12 identity, 7/12 figure.
  - No horizontal scroll at 320 px (WCAG 1.4.10).
- **Radius:**
  - `--r-xs` 2px (inputs, buttons)
  - `--r-md` 10px (cards, plate)
  - `--r-pill` 9999px (chips, badges)
  - pearls 50%
- **Elevation:** flat. Cards use a 1 px `--hairline` border on `--surface`. No drop shadows except the focus ring.

### C6. Motion tokens [H; patterns D: N-VT, W-222, R5 §6.8]

| Token | Value | Use |
|---|---|---|
| `--dur-press` | 100ms | `:active` press (`scale(.98)`) |
| `--dur-fast` | 160ms | Hover-out, colour changes |
| `--dur-base` | 200ms | Hover-in lift |
| `--dur-caption` | 180ms | Live caption swap (opacity plus `translateY(4px→0)`) |
| `--dur-page-exit` | 150ms | Old page out (from the Next guide) |
| `--dur-page-enter` | 210ms after 150ms delay | New page in (from the Next guide) |
| `--dur-morph` | 420ms | Pearl → header morph (the Next guide uses 400 ms [D: N-VT]) |
| `--dur-intro` / `--stagger-intro` | 480ms / 40ms | First-visit settle; n = 8 totals 760 ms |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | Hover, caption |
| `--ease-emph` | `cubic-bezier(.2,0,0,1)` | Morph |
| `--ease-settle` | `cubic-bezier(.22,1,.36,1)` | Intro (keyframes −14 px → +2 px → 0) |
| `--ease-in` | `cubic-bezier(.4,0,1,1)` | Exits |
| Limits | scale ≤ 1.06, lift ≤ 3 px; no loops; nothing runs longer than 5 s | WCAG 2.2.2 [D: W-222] |

**Motion-last CSS.** Every transform animation sits inside:

```css
@media (prefers-reduced-motion: no-preference) { :root:not([data-motion="reduce"]) … }
```

This follows the web.dev pattern [D: via R5 §2.7].

### C7. Iconography [H]

- About 16 hand-drawn inline SVG icons:
  - arrow-right, external, copy, check, file-pdf, code, database, slides, video, mail, rss, chevron, filter, search, close, calendar.
- 24×24 viewBox, 1.5 px stroke, `currentColor`, `aria-hidden="true"`.
- An icon is never the only label. No icon font and no icon library dependency.

### C8. Wordmark direction (typographic only) [H; constraints D: UCB-BRAND, HAAS-BRAND via R4 §6, R5 §1.6–1.7]

- **Primary, "pearl-O":**
  - **BOBA** in Fraunces (wordmark only: SOFT 100, wght 680, opsz 144) followed by **LAB** in Plex Mono Medium, +0.08em tracking, cap heights matched.
  - The **O** is a **matte** tapioca pearl at cap height plus about 2% overshoot, in `--ink`.
  - One crescent highlight at 10 o'clock, milk at **≤ 25%** opacity, dropped below 24 px [H: R5 C1.2].
- **Delivered as outlined inline SVG** with `role="img"` and `<title>BOBALAB</title>`. It never waits for fonts.
- **Descriptor lockup:** "Berkeley Operations and Behavioral Analytics Lab", Inter 500, +.04em, `--ink-muted`.
- **Favicon:** the pearl-O alone (`src/app/icon.svg`).
- **Alternate:** "BOBA·LAB", where the interpunct is the pearl. It is quieter.
- **Never use:**
  - the Berkeley or Haas logos, the seal, the Cal script or the bear;
  - the Haas wordmark as a base;
  - the Haas Blue and Gold pairing.

  [D rules: R4 §6]
- **Affiliation** appears as plain text: "Haas School of Business, University of California, Berkeley" [D advice: HAAS-BRAND via R4 §6].
- Campus guidance discourages unit-specific logos [D: UCB-BRAND], so the lab asks Haas MarCom (decision H-10).
- An existing BOBALAB logo appears on `scheduler.bobalab.org`; it was not viewed and its owner is [U] (R1 §2, R2 §5).

### C9. Boba motif rules [H; from R5 §6.14 as amended by C1]

| Place | Motif | Rule |
|---|---|---|
| Home Fig. 1 | Direction pearls plus flat seed dots | The only cluster of pearls on the site |
| Direction page header | One hero pearl (120–160 px), the morph target | Only here and in the sibling rail (40 px) |
| Tags (papers, projects, news, people) | 10 px **flat** dot in the deep tone plus a text label | Never colour alone; no gloss |
| Project list bullets on direction pages | 8–10 px flat dots | Always beside text |
| Section divider | "Meniscus rule": a hairline whose ends lift 4 px | At most one per page, home only |
| Loading state | None needed (static pages) | — |
| 404 page | The only pun ("This page got stuck in the straw") | Once, nowhere else |
| OG image | A prerendered still of Fig. 1, 1200×630 | No cup |
| Never | Cups, straws, faces, gloss below 32 px, bouncing, pastel neon, "tea-rrific" puns, bubble fonts, sounds | — |

---

## D. Information architecture and page templates

### D1. Navigation

- **Header:** wordmark (link to Home) · Research · Publications · People · News · Join. That is five items, which keeps one line at 375 px [H: R3 §7.1].
- **Footer:**
  - affiliation text and address;
  - lab email;
  - About & contact, Accessibility, Privacy, RSS;
  - "Site issue?" mailto (consistent help, WCAG 3.2.6 [D: WCAG22]);
  - maintainers line and "Last updated {date}";
  - a "Reduce motion" toggle (decision H-14).
- Boba vocabulary appears only in microcopy and the 404 page, never in navigation [H: R3 §7.1].

### D2. URL scheme (`trailingSlash: true`; all segments lower-case kebab-case)

| Path | Page | Notes |
|---|---|---|
| `/` | Home | §D3 |
| `/research/` | Research index | Direction cards plus all projects |
| `/research/{direction}/` | Research direction | `generateStaticParams`, `dynamicParams = false` [D required for export: N-EXP; R4 V11] |
| `/projects/` · `/projects/{slug}/` | Projects index and detail | Breadcrumb uses the primary direction |
| `/publications/` | Publications index | Filters in the query string: `?direction=&type=&year=&member=&q=` (client-side) |
| `/publications/{slug}/` | Paper | Slug is `{first-author-lastname}-{year}-{short-title}` |
| `/people/` · `/people/{slug}/` | People and person | Detail pages only when `profile_page: true` (the PI always has one) |
| `/news/` · `/news/{yyyy-mm-dd-slug}/` | News and item | |
| `/news/feed.xml` | RSS 2.0 | GET route handler with `dynamic = 'force-static'` [D: N-EXP] |
| `/join/` | Join / work with us | Students & RAs · partners · press |
| `/about/` | About & contact | Mission, PI, affiliation, address, email |
| `/accessibility/` · `/privacy/` | Statements | A privacy statement is required for a berkeley.edu hostname [D: KB via R4 V28] |
| `/404.html` | Not found | Export emits `out/404.html` [D: N-EXP local]; GitHub Pages serves a root `404.html` [D: GH-404] |
| `/sitemap.xml` · `/robots.txt` | SEO | `force-static` [H: R6 §3.5] |
| `/admin/` | Decap CMS | Static, `noindex`, not linked from the site, disallowed in robots.txt |

**Base path.** If the repo is named `bobalab-berkeley.github.io`, the site serves at the root [D: R4 V22]. The build still honours `NEXT_PUBLIC_BASE_PATH` for a project-site fallback [H].

### D3. Home, sections in order

1. **Hero.**
   - `<h1>`: the wordmark SVG plus the descriptor "Berkeley Operations and Behavioral Analytics Lab".
   - The affiliation line as text.
   - A one-sentence mission (PI-approved).
   - A primary link "Explore our research →" to `/research/`.
   - On the right (or below on narrow screens): `<h2>Research directions</h2>` plus Fig. 1 (§E).
2. **What we've learned.** 2–3 featured findings. Each has:
   - a plain-language sentence written by the lab;
   - a direction tag;
   - an evidence label (Published / Working paper / Preliminary);
   - a link to the paper.

   Source of the pattern [H: R3 §7.3].
3. **Recent publications.** 5 entries with type badges, a materials row and tags, then "All publications →".
4. **Latest news.** The 3 most recent items, each with a full date, then "All news →".
5. **People strip.** The PI plus consenting current members, using a photo or a pearl-initial avatar, then "Meet the lab →".
6. **Work with us.** Two calls to action ("Students & RAs", "Partners & data collaborators") plus the email.
7. **Footer** (§D1).

The figure *is* the direction list, so there is no duplicate "direction cards" section on home [H: R5 C9.1].

### D4. Research index `/research/`

- h1 "Research" and a 2–3 sentence intro.
- **Direction cards** in editorial order. Each card shows:
  - pearl and index;
  - title;
  - guiding question;
  - "N projects · N papers";
  - an "Open to RAs" badge if the flag is on.
- **Projects** grouped by status (Active, Completed), each with direction tags.
- A link to Publications.

### D5. Research direction `/research/{direction}/` [H: R3 §7.4 plus R5 §6.9]

1. **Header band** in `--dir-tint` (dark mode: the dark header band) containing:
   - breadcrumb "Research / 02";
   - the **hero pearl** (the morph target, `pearl-{slug}`);
   - `<h1 tabIndex={-1}>` with the full title;
   - the guiding question;
   - the status line "Active since YYYY · N projects · N papers", computed.
2. **Why it matters:** body, 80–150 words.
3. **What we've found:** 2–4 findings, each with an evidence label and a paper link.
4. **Key figure** (optional): image, caption, and a "What this shows" text summary.
5. **Projects:** cards with seed-dot bullets.
6. **Publications:** auto-filtered, newest first. "See all in Publications →" links to `/publications/?direction={slug}`.
7. **People:** members tagged with this direction.
8. **Methods & data:** at most 6 tags.
9. **Work with us on this:** only when `open_to_collaborators` is on.
10. **More directions rail:** 40 px pearls with index and label (each carries its own `pearl-{slug}` name).
11. "Last updated {date}".

### D6. Projects `/projects/` and `/projects/{slug}/` [H: R3 §7.5]

**Index:** grouped by primary direction, with status chips (Active / Completed). The client-side chip filter is optional; without JS everything shows.

**Detail:**
1. Breadcrumb: Research › {Direction} › {Project}.
2. h1, a one-sentence summary, direction tags, status, years.
3. Hero figure with alt text and caption (no autoplay).
4. Overview (≤ 250 words).
5. Key findings with evidence labels.
6. Team: lab members linked; external collaborators named only with `consent: true`; partners only if `public: true`.
7. Materials row: Paper · Working paper · Slides · Code · Data · Talk · Press.
8. Funding.
9. Related projects.
10. "How to cite", when a canonical paper exists.

### D7. Publications index `/publications/` [H: R3 §7.6; D: R2 §7]

- **Without JS:** the server renders the **full list** grouped by year, with year jump links.
- **With JS:**
  - A client island in a `<Suspense>` boundary (required for `useSearchParams` in a prerendered page [D: N-USP]) adds:
    - a labelled search box (MiniSearch);
    - chips for Direction, Type (Journal · Working paper · Conference/Proceedings · Chapter · Dissertation · Other) and Lab member;
    - a year range.
  - The filter state lives in the URL.
  - The result count is announced through `aria-live="polite"`.
  - The `<Suspense>` fallback is the full static list [H].
- **Entry anatomy:**
  - title (links to the paper page);
  - authors, with lab members highlighted and linked;
  - *venue*, year, status;
  - awards;
  - direction tags;
  - materials row (PDF · SSRN · arXiv · DOI · Code · Data · Slides · Video · Press).

  Every materials link's accessible name includes the paper title.
- **Statuses** ("Major revision at M&SOM") are SELF-REPORTED. Show them as the lab's own claim with an "as of {date}" [D: R2 §1.3, §7.4].

### D8. Paper `/publications/{slug}/`

- Title, authors, venue and year (for example, the *Management Science* paper shows "2026, 72(1):733–755; online May 22, 2025" [D: R2 §1.1]), status, tags.
- Optional teaser figure.
- **"In brief":** 2–3 sentences written by the lab. Never paste publisher abstracts [H: copyright].
- Materials row.
- **Copyable BibTeX:** a `<pre>` plus a Copy button with "Copied" announced through `aria-live`.
- Related papers and projects.
- Google Scholar `citation_*` meta [D requirements: SCHOLAR] and `ScholarlyArticle` JSON-LD [D type: SCHEMA].

### D9. People `/people/` and `/people/{slug}/` [H: R3 §7.7]

- **Order:**
  1. PI (Faculty Director)
  2. Postdocs
  3. PhD students
  4. Pre-docs & research staff
  5. Master's students
  6. Undergraduate RAs
  7. Affiliates & collaborators
  8. **Alumni**, in a collapsed `<details>` grouped by end year, with "now at" only if the person opts in.
- **Sorting:** role → `rank` → last name.
- **Filters:** role chips and direction chips (real buttons; one scrolling row on mobile).
- **Card:**
  - photo only if `photo_consent: true`, otherwise a pearl-initial avatar;
  - name, role, program as the member chooses;
  - at most 3 interests, direction tags;
  - links (site, Scholar, LinkedIn, GitHub);
  - email only if `email_public: true`.
- **Person page** (opt-in; always for the PI): bio (≤ 150 words), directions, papers, projects, news, links. `ProfilePage` plus `Person` JSON-LD for the PI.

### D10. News `/news/` and `/news/{slug}/`

- **Types** (badge with text): Publication · Award · Talk/Event · Media · People · Grant · Lab life.
- **Index:**
  - an "Upcoming talks" block computed from `event_date ≥ build date`;
  - then reverse-chronological items with year headings and type chips;
  - every item shows its full date as "Oct 20, 2026" [H: R3 §7.8].
- **Detail:** date, type, title, body, related people, papers and directions, an external link, previous/next.
- RSS at `/news/feed.xml`.

### D11. Join `/join/` and About `/about/`

**Join** has three audiences:
- **Students & RAs:**
  - the URAP route and the four track types the lab advertises [D: URAP via R2 §5];
  - an open/closed status with an "as of" date;
  - what to send.
- **Partners & data collaborators:** collaboration types and a data-handling statement written by the PI.
- **Press.**
- One contact email throughout: `bobalab@berkeley.edu` (SELF-REPORTED [D: R2 §5]), as a real `mailto:` link. The PI site shows it as plain text [D: R1 §2].

**About:**
- mission;
- PI summary with links to the Haas profile [D: HAAS-P];
- affiliation text;
- mailing address 2220 Piedmont Avenue, Berkeley, CA 94720 [D: CV via R1 §1].

### D12. Accessibility, Privacy, 404

- **Accessibility:** the conformance target (WCAG 2.2 AA), known limits, and how to report a barrier.
- **Privacy:**
  - no cookies;
  - no analytics;
  - host logs as described by GitHub [H];
  - the CMS stores a GitHub token only in the editor's browser [H: R4 §3.1];
  - **[Critic]** the visitor's browser stores two things locally, and neither is sent anywhere [H]. The statement must say so:
    - the "Reduce motion" choice, in `localStorage` (§E7);
    - a once-per-session intro flag, in `sessionStorage` (§E3).
- **404:** the one joke, a link home, and the direction list.

---

## E. Signature interaction spec: "Fig. 1: the Pearl Figure"

### E1. DOM (one tree for every breakpoint) [H; React and Next APIs D: R-VT, N-VT, N-LINK]

```tsx
<section className="hero-figure" aria-labelledby="dirs-h">          {/* container-type: inline-size; container-name: hero */}
  <h2 id="dirs-h">Research directions</h2>
  <figure aria-label="Fig. 1, research directions of BOBALAB" data-n={n} data-template={`t${n}`}>
    <figcaption className="fig-caption" aria-live="off">{/* legend by default; active summary on hover/focus */}</figcaption>
    <nav aria-label="Research directions">
      <ol role="list">                                                    {/* role restores list semantics in Safari [C: WK-LIST; R5 C5.5] */}
        <li data-slot={i} style={dirVars(d.color)}>                       {/* --dir-deep/tint/light/seed */}
          <Link href={`/research/${d.slug}/`} transitionTypes={['pearl-open']} aria-describedby={`d-${d.slug}`}>
            <span className="pearl-group" aria-hidden="true">
              <ViewTransition name={`pearl-${d.slug}`} share="pearl-morph" default="none">
                <span className="pearl"><span className="idx">{pad2(i)}</span></span>
              </ViewTransition>
              <span className="seeds">{/* ≤12 <i className="seed" data-k={k}/> */}</span>
            </span>
            <span className="label">{d.shortLabel}<span aria-hidden="true">&nbsp;→</span></span>
            <span className="count">{d.paperCount} papers</span>
          </Link>
          <p id={`d-${d.slug}`} hidden>{d.summary}</p>
        </li>
      </ol>
    </nav>
  </figure>
</section>
```

**Accessible names.**
- Link name = label plus count, for example "Gig & Platform Work 7 papers". The numeral and arrow are hidden.
- Description = summary.
- The figure's name is stable [H: R5 C5.7, C5.11].

**Rules.**
- **Exactly one** element per `pearl-{slug}` name is mounted at a time. A duplicate is a React dev error [D: R-VT via R5 C7].
- Tags and other decorative pearls never carry a name.
- The caption (`aria-live="off"`) carries no announcement. Descriptions come through `aria-describedby`.

### E2. Layout algorithm: fixed slot templates (deterministic, stable on edits) [H]

**Mode switch.**
- Figure mode when `@container hero (width >= 46em)`, otherwise list mode (§E6).
- Because the query uses `em`, large default fonts or text zoom fall back to list mode instead of overlapping [H: R5 C4; verify in Chrome, Safari and Firefox].

**Grid.**
- The plate is a CSS grid. Each slot spans 2 columns.
- Rows after the first overlap upward by `margin-top: calc(var(--D) * -0.25)`, so the figure reads as a cluster rather than a table.
- DOM order = slot order = index number (01…0N), row-major. Focus order therefore matches the numbers and the visual order.
- Labels sit in the cell **under** their pearl and wrap freely. There is no truncation or ellipsis; the cell grows instead. The CMS limit of 28 characters keeps labels to about 2 lines at default size [H].

| n | Grid columns | Slot placement (row, starting column) | Pearl diameter `--D` |
|---|---|---|---|
| 2 | 4 | (1,1) (1,3) | clamp(5rem, 14cqi, 7.5rem) |
| 3 | 6 | (1,1) (1,3) (1,5) | same |
| 4 | 5 | (1,1) (1,3) / (2,2) (2,4) | same |
| 5 | 6 | (1,1) (1,3) (1,5) / (2,2) (2,4) | clamp(4.5rem, 11cqi, 6.5rem) |
| 6 | 7 | (1,1) (1,3) (1,5) / (2,2) (2,4) (2,6) | same |
| 7 | 8 | (1,1) (1,3) (1,5) (1,7) / (2,2) (2,4) (2,6) | clamp(4rem, 9cqi, 5.5rem) |
| 8 | 6 | (1,1) (1,3) (1,5) / (2,2) (2,4) / (3,1) (3,3) (3,5) | same |

- n ≤ 3 is the "row" template (concept A with Fig. 1 framing) [H: R5 C4.4].
- **Organic nudge** per slot index i = 1…8, applied with `translate` only (never changing the flow):
  - dx = [0, .06, −.04, .03, −.06, .05, −.02, .04] × D
  - dy = [0, .08, −.05, .10, −.07, .04, .09, −.03] × D

  These are constants, so the layout is identical on every build.
- **Seeds** (flat dots, one per public paper tagged to the direction; a paper with two directions appears in both):
  - 12 fixed ring slots at radius `0.5D + 0.14D`, seed size `max(6px, 0.12D)`.
  - Fill order by clock position: 12, 1, 11, 2, 10, 3, 9, 4, 8, 5, 7, 6.
  - Adding a paper fills the next slot and **moves nothing else**.
  - Above 12 papers, no more dots appear; the label count carries the real number (for example "14 papers").
  - The label's top margin clears the ring.
- **Pearl material:**
  - `radial-gradient(circle at 46% 40%, #3A281D 0, #2B1D15 52%, #1A110C 100%)`, plus a bottom glow of `--dir-deep` at 45% alpha (decorative).
  - No contact shadow; matte.
  - The specular `::before` exists only when D ≥ 32 px, at alpha ≤ 0.25.
  - The index numeral `--pearl-index` is centred in the pearl, Plex Mono 500, `--fs-mono`.
  - Dark mode adds the mandatory 1 px `--pearl-rim` at 100%.

  The recipe is from R5 §6.5, amended by C1.2 and C5.6.
- **Hit area:** the whole link (pearl plus label plus count) is the target, ≥ 44×44 px [D floor 24×24: W-258 via R5 §2.8].

### E3. Motion (all inside the motion-last gate, §C6)

| Moment | What moves | Values |
|---|---|---|
| **Intro** (first home view per browser session) | `.pearl-group` wrappers only: `translateY(-14px→+2px→0)` and opacity 0→1. Labels and seeds inside a group are not separately animated; labels are visible from first paint | 480 ms `--ease-settle`, 40 ms stagger, total ≤ 760 ms at n = 8 [H: R5 C2.3, C6.4]. A pre-paint inline `<script>` in `<head>` sets `<html data-intro>` only when `sessionStorage` has no flag, then sets the flag. The attribute is removed after 1 s, so a client-side return to home never replays [D pattern: N-FLASH; H] |
| Hover (fine pointer, `(hover: hover)`, 80 ms intent delay) or keyboard focus (no delay) | The active pearl: `scale(1.06) translateY(-3px)`. Other groups' **pearls and seeds** fade to opacity .55; **text never dims** [H: R5 C5.2] | in 200 ms / out 160 ms, `--ease-out` |
| Live caption | Swaps to "{index} {shortLabel}", the one-sentence summary, and "N projects · N papers · since YYYY" | 180 ms; returns to the legend 300 ms after pointer leave or blur; Esc resets |
| Press (touch) | `scale(.98)` | 100 ms |
| Pointer buoyancy, idle bobbing, seed fan-out | **None in v1** | [H: R5 C6.5] |

### E4. Hover/focus "card" = the live caption

- **Default legend:** "Fig. 1. Research directions of BOBALAB. Each pearl is a direction; small dots are its papers."
- **Active state:** the content listed in E3.
- **Why a caption instead of a floating card:**
  - it never overlaps or obscures anything, so the WCAG 1.4.13 conditions on dismissible, hoverable and persistent pop-ups do not arise [D: W-1413 via R5 §2.8];
  - it works for any n and any label length;
  - it reads as a real figure caption [H: R5 §6.7].
- **Placement:** inside the plate, at the top-left inset, so it stays above the fold at 1366×768 [H: R5 C2.4].
- **Implementation:** about 0.5 KB of client JS that sets `data-active` on `pointerenter`/`focusin`. Without JS the legend simply stays [H].

### E5. Click transition (pearl → direction page)

- **Navigation:** `next/link` with `transitionTypes={['pearl-open']}` (the prop exists since v16.2.0 [D: N-LINK]). The named pair `pearl-{slug}` morphs into the direction page's hero pearl.
- **Morph:** `::view-transition-group(.pearl-morph)`, 420 ms `--ease-emph`, with a 3 px blur mid-keyframe as in the Next guide [D: N-VT].
- **Page swap:**
  - old root: opacity plus `translateY(0→8px)`, 150 ms `--ease-in`;
  - new root: enters over 210 ms after 150 ms;
  - the background crossfades to the direction tint.
- `::view-transition { pointer-events: none }` [D: N-VT].
- **On arrival:**
  - the page `<title>` is unique ("{Direction}, BOBALAB research");
  - a site-wide `RouteFocus` client component moves focus to `main h1[tabindex="-1"]` on every client navigation, but not on first load [H: R5 C5.10]. Next's announcer reads the title [D: R5 C5.10, local `app-router-announcer.js`].
- **Preconditions for the morph:**
  - The destination must render in the same commit, so direction pages are statically generated and prefetched [D: N-VT via R5 §2.2].
  - Both sides must be in the viewport [D: R-VT].
  - When either is false, the content simply enters; that is acceptable.
- **Support:**
  - Morph styling needs `view-transition-class`: Chrome/Edge 125+, Safari 18.2+, Firefox 144+, Samsung 27+, ≈ 90.1% [D: CIU-VTC].
  - Elsewhere navigation is instant [D: N-VT].
- **Reverse and siblings:**
  - The header's "All directions" link uses `transitionTypes={['pearl-close']}` (reverse morph on desktop, where the hero is in view [H]).
  - The sibling rail uses `nav-forward` / `nav-back` with a 60 px slide [D timings: N-VT; H use].
  - **Browser back:** the morph is [U]. The React docs say popstate skips animation, the Next guide says the named morph applies, and the installed router still uses popstate [D: R5 C7]. Test it; never promise it.
- **Windows caveat:** static-export builds on Windows produce broken prefetch file names (open issue) [D: N-85374, R6 V23]. Morph tests run against the **Linux-built** `out/` in CI, or against `next dev` locally.

### E6. Mobile and narrow containers (container < 46em)

- The **same `<ol>`** renders as full-width rows:
  - a 44 px pearl with its numeral;
  - shortLabel (Inter 600, 17 px);
  - "N papers" (muted);
  - a chevron.

  Row min-height is 64 px and the whole row is the link.
- The row pearl is the morph source. The forward morph works; the **reverse morph is not guaranteed** on mobile because the row is below the fold after the scroll reset [D: R5 C7].
- The optional decorative compact cluster above the list (≤ 200 px tall) is `aria-hidden`, has **no** VT names and no interaction [H].
- No hover effects under `(hover: none)`. `touch-action` stays at its default, and zoom is never blocked [D: MDN via R5 §2.8].
- **Tablet, 46em to 64rem container:** figure mode with labels; the caption collapses to the legend only [H].

### E7. Reduced motion, forced colours, no JS, no View Transitions

- **`prefers-reduced-motion: reduce`, or the footer toggle (`<html data-motion="reduce">`, set by the same pre-paint script from `localStorage`):**
  - no intro, no lift or scale;
  - hover and focus become a 2 px outline plus the label underline;
  - VT durations are 0, or a ≤ 120 ms opacity-only crossfade;
  - the press scale is off.

  React does not disable view transitions on its own; CSS must [D: R-VT via R5 §2.2].
- **Forced colours:**

  ```css
  @media (forced-colors: active){
    .pearl{border:2px solid CanvasText}
    .seed{background:CanvasText}
    a:focus-visible .pearl{outline:2px solid Highlight;outline-offset:3px}
  }
  ```

  Gradients and box-shadows are removed in forced-colours mode [D: MDN-FC via R5 C5.4].
- **No JS:** server-rendered pearls and links work, the caption shows the legend, and navigation is ordinary.
- **No VT support:** navigation is instant.

### E8. Accessible list alternative

The figure **is** an ordered list of real links inside a labelled `<nav>`, so there is no hidden duplicate to keep in sync [H: R5 §6.12, C9.1]. Two more routes exist:
- the header link "Research" → `/research/`, with full direction cards;
- the list rendering itself under zoom, narrow width or a Reader mode.

### E9. Behaviour by number of directions

| n (non-draft directions) | Behaviour |
|---|---|
| 0 | The home hero shows mission plus "Research directions coming soon". The validator **errors** on `main` (launch blocker) |
| 1 | List mode only (a single card); the figure is suppressed |
| 2–3 | Row template |
| 4–6 | Cluster templates t4–t6 (recommended range) |
| 7–8 | Templates t7 and t8 with smaller `--D`. The validator **warns** "consider the dot-plot fallback"; rerun the five-second test |
| > 8 | The validator **errors** with "Group directions (max 8)" |

**Fallback "pearl dot plot" (C10)** [H: R5 C10]:
- Same `<ol>`. Each row = big pearl (morph source) + label + count + flat dots for papers placed on a shared year axis.
- The axis hides in list mode.
- It needs a year on every paper and PI approval to expose per-year output.
- Switched by `site.figure_mode: cluster | dotplot`.

### E10. Acceptance tests for the interaction

1. Visual snapshots at 1366×768 and 1024×768, in light and dark, for:
   - n = 2, 3, 4, 6, 8;
   - labels of 8, 28 and 2-line length;
   - seed counts 0, 1, 7, 12 and 24.

   No label box may overlap another pearl at text zoom 100% and 200% [H: R5 §6.13].
2. Adding one paper to a fixture changes only that group's seed count in the snapshot diff.
3. Keyboard: Tab order is 01→0N; focus updates the caption; Enter navigates; focus lands on the destination `h1`.
4. axe (`wcag2a/aa`, `wcag21aa`, `wcag22aa`) reports zero violations in figure mode, list mode and forced colours [D tags: R6 §10.3].
5. With `reducedMotion: 'reduce'` emulated, no computed animation runs longer than 0 ms on `.pearl-group`, and the VT duration is ≤ 120 ms.
6. On a second home visit in the same session, `data-intro` is absent.
7. The morph plays in Chromium and WebKit against the Linux-built `out/` (assert the `::view-transition` pseudo exists during navigation). It degrades without errors when VT is unsupported.
8. The figure's own client JS is ≤ 4 KB gz [H: R5 §6.13].

---

## F. Architecture

### F1. Stack and exact versions (npm registry, 2026-10-20)

| Package | Version | Role | Label / source |
|---|---|---|---|
| node / npm | 24.x LTS (local 24.19.0; newest 24.22.0) / 11.17.0 | Runtime. `engines: ">=24.15 <25"` | [D: R6 V24] |
| next | **16.4.2** (2026-10-15) | Framework. **Security floor: never deploy below 16.4.1** | [D: NPM; R6 V1–V2, V4] |
| react, react-dom | 19.3.1 | Hygiene bump; the App Router runs Next's vendored React canary | [D: R6 V3–V4] |
| typescript | **6.0.3** (not 7) | typescript-eslint 8.72.0 requires `<6.1.0` | [D: R6 V9–V10] |
| @types/node · @types/react · @types/react-dom | 24.19.2 · 19.3.0 · 19.3.0 | | [D: R6 §1] |
| tailwindcss · @tailwindcss/postcss · postcss | 4.3.3 · 4.3.3 · 8.5.31 | Styling. Remove `@tailwindcss/turbopack` | [D: R6 V13] |
| @markdoc/markdoc | 0.5.10 | Renders Markdown bodies (CommonMark superset) | [D: NPM, MARKDOC] |
| yaml · zod | 2.9.1 (ISC) · 4.6.7 (MIT) | Front matter and YAML parsing; content schema validation | [D: NPM, checked by S2]. Compatibility with TS 6 is [H]; WP0 confirms it with a lockfile check |
| minisearch | 7.2.0 | Publication free-text search | [D: R6 §1] |
| @citation-js/core · plugin-bibtex · plugin-csl | 0.9.0 | BibTeX and formatted citations at build time only | [D: R6 §1] |
| schema-dts | 2.1.0 | JSON-LD types | [D: R6 §1] |
| sharp (dev) | 0.35.5 | Pre-generates WebP image variants | [D: NPM; Next 16.4.2 resolves ^0.35.5, R6 V2] |
| decap-cms (vendored dist only) | **3.17.1** (2026-10-14) | CMS UI bundle in `public/admin/` | [D: R4 V1] |
| decap-server (dev) | 3.11.5 | Local no-account demo proxy | [D: R4 V1–V2] |
| @fontsource-variable/fraunces · @fontsource-variable/inter · @fontsource/ibm-plex-mono (dev; file source) | 5.3.0 each, OFL-1.1 | Fonts | [D: NPM, FONTS] |
| eslint · eslint-config-next · eslint-config-prettier | 10.13.0 · 16.4.2 · 10.1.8 | Lint. Expect exactly 3 ERESOLVE peer warnings; **do not** use `--legacy-peer-deps` | [D: R6 V12] |
| prettier · prettier-plugin-tailwindcss | 3.9.10 · 0.8.1 | Formatting | [D: R6 §1] |
| vitest · vite | 5.0.5 · 8.3.4 | Unit tests (`node` environment) | [D: R6 V15] |
| @playwright/test · @axe-core/playwright | 1.64.1 · 4.14.0 | End-to-end and accessibility tests | [D: R6 V17–V18] |
| linkinator · lighthouse | 8.1.0 · 13.5.0 | Internal link check; performance audit | [D: R6 §1] |
| lycheeverse/lychee-action | v2.9.0 | Weekly external link check | [D: R6 §1] |
| sveltia-cms-auth (forked into the org at a pinned commit) | — | OAuth bridge Worker; Decap-compatible | [D: R4 V6] |
| **Not used** | `motion`, d3, Keystatic, Sanity, `@tailwindcss/turbopack`, `@tailwindcss/typography` | — | §0.2 |

**Config** (`next.config.ts`) [D options: N-EXP; H for the values]:
- `output: 'export'`
- `trailingSlash: true`
- `images: { unoptimized: true }`
- `basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? ''`
- no `cacheComponents`, no `partialPrefetching`, no `turbopack.rules`

Telemetry is disabled with `NEXT_TELEMETRY_DISABLED=1` in CI [D: R6 §3.1].

**Trade-off recorded.** Next 16.4 says Cache Components becomes the default in Next 17 [D: R6 V6]. Turning it off now defers a migration (decision H-13).

**Agents must read the bundled docs** in `node_modules/next/dist/docs/` before coding. The project's `AGENTS.md` says this version differs from training data [D: local `AGENTS.md`].

### F2. CMS choice

**Primary: Decap CMS 3.17.1** (weighted score 82/100) [scores H; facts D: R4 §2, V1–V6]:
- It is static, so it lives at `/admin` on GitHub Pages with no server.
- Its editorial workflow keeps every unpublished change on a `cms/<collection>/<slug>` branch with a PR; publishing merges it [D: DECAP-EW via R4 §3.1].
- It is mature: 100+ contributors, the top one with about 20% of commits, and frequent releases [D: R4 V1, V31].
- Its local no-account demo runs through `npx decap-server` [D: R4 V2].
- Content is plain files, so ownership transfers by moving the repo [D: R4 §1].

**Runner-up: Keystatic in GitHub mode** (73):
- Better UI, an org-owned GitHub App, and least privilege.
- But it **needs a Node host** [D: R4 V15], so it means Vercel Pro (about $20/seat/month [D: R4 V26]) or an unverified Workers setup.
- Its packages are 0.x, and an issue with blank admin pages on Next 16 is open [D: R6 V21].

**Drop-in alternative: Sveltia CMS** (81):
- Same config and content files, nicer UI.
- A single maintainer [D: R4 V8]; its editorial workflow is new (2026-09-10).
- Whether it supports Decap's `richtext` widget is [U]. If the lab swaps, change `richtext` to `markdown`, which stores identical content.
- With weights favouring UX it scores 84 vs Decap's 79 [D arithmetic: R4 V32]. Revisit in 6 months (decision H-7).

**Excluded:**
- Sanity, Pages CMS and plain github.com editing fail the local no-account gate [D: R4 V18, §1].
- TinaCMS needs a paid plan for 12+ editors and editorial workflow [D: R4 V17].
- Payload needs a database [D: R4 §3.8].

### F3. Content model (files in `content/`; Decap folder collections in `format: frontmatter`; relations store slugs)

Common to every collection: `draft` (boolean, default false; the production build excludes drafts; `INCLUDE_DRAFTS=1` shows them locally) [H: R4 §1].

**Widgets.** Decap offers boolean, datetime, file, hidden, image, list, number, object, relation, select, string, text, richtext (beta) and markdown (deprecated). Every field has `required` (default true) and `pattern` options [D: DECAP-W]. Body fields use `richtext`, which stores Markdown [D: DECAP-RT].

| Collection (folder) | Fields: widget · constraints | Relations / derived |
|---|---|---|
| **directions** (`content/directions/*.md`) | `title` string ≤ 90 · `short_label` string ≤ 28 (pattern) · `question` string ≤ 140 · `summary` text ≤ 160 · `color` select (8 swatches) · `order` number 1–8 unique · `active_since` number · `status` select active/emerging · `open_to_collaborators` boolean · `methods` list ≤ 6 · `findings` list of {`text` ≤ 240, `publication` relation, `evidence` select published/working-paper/preliminary} · `figure` object {image, `alt` required, caption, `what_this_shows`} · `body` richtext (80–150 words) | Counts, projects, papers and people are derived at build |
| **projects** (`content/projects/*.md`) | `title` · `summary` ≤ 200 · `directions` relation multiple, min 1 (first = primary) · `status` select active/completed/paused · `start_year` · `end_year` optional · `team` relation→people multiple · `collaborators` list {name, affiliation, `consent` boolean, required true to show} · `partners` list {name, `public` boolean} · `outputs` list {type select, label, url https} · `publications` relation multiple · `hero` {image, alt, caption} · `body` richtext | Breadcrumb from the primary direction |
| **publications** (`content/publications/*.md`) | `title` · `authors` list of {`name` string, `person` relation optional} · `type` select journal/working-paper/conference/chapter/dissertation/other · `venue` · `year` number (1990–next year) · `date_online` optional · `volume`/`issue`/`pages` · `doi` pattern `^10\.\d{4,9}/\S+$` · `status` select published/forthcoming/accepted/major-revision/revise-resubmit/submitted/working-paper · `status_note` · `status_source` select documented/self-reported · `as_of` date (required unless published) · `links` object {pdf, ssrn, arxiv, publisher, code, data, slides, video} · `press` list {outlet, url, date} · `awards` list {name, year, `under_title` optional} · `directions` relation multiple, min 1 · `in_brief` text ≤ 400 (lab-written) · `teaser` {image, alt} · `featured` boolean · `bibtex_override` text optional · `body` (optional notes) | BibTeX, citation, `lab_work` (any author linked to a member) and per-direction seed counts are derived [H: R2 §7.7] |
| **people** (`content/people/*.md`) | `name` · `role` select pi/postdoc/phd/predoc-staff/masters/undergrad/affiliate · `program` string (as the member wishes) · `start` date (YYYY-MM) · `end` date optional (≥ start) · `rank` number · `interests` list ≤ 3 · `directions` relation multiple · `photo` image + `photo_alt` + **`photo_consent` boolean** · `links` {website, scholar, linkedin, github} · `email` + **`email_public` boolean** · `now_at` + **`now_at_public` boolean** · **`listed` boolean** (member consented to appear) · `profile_page` boolean · `body` (bio ≤ 150 words) | current vs alumni = `end` < build date [H: R3 pattern 11] |
| **news** (`content/news/{yyyy-mm-dd-slug}.md`) | `date` datetime required · `type` select · `title` · `summary` ≤ 280 · `event_date`/`location` (talks) · `people` / `directions` / `publications` relations multiple · `link` {label, url} · `image` {image, alt} · `body` richtext optional | "Upcoming" = `event_date` ≥ build date |
| **pages** (file collection, `content/pages/*.yml`) | `home` {mission, featured_findings list {text, publication, direction, evidence}} · `join` {students, partners, press, `recruiting` boolean, `recruiting_as_of` date, urap_url} · `about` · `accessibility` · `privacy` | — |
| **site** (file, `content/site.yml`) | `name` "BOBALAB" · `long_name` · `affiliation_text` · `email` · `address` · `social` · `maintainers` text · `figure_mode` select cluster/dotplot · `editors_note` | `last_updated` = commit date of HEAD in CI [H] |

**Media.**
- `media_folder: public/uploads`, `public_folder: /uploads`.
- Git LFS is unsupported [D: R4 V3].
- CI rejects files over **10 MB** and raster images over 2 MB [H thresholds; GitHub's browser upload cap is 25 MiB, D: R4 §3.7].
- **[Critic] PDF field.**
  - Make `publications.links.pdf` (and `slides`) a Decap `file` widget. It uploads a file or, through "Insert from URL" (`choose_url`, default true), stores an external link [D: DECAP-FILE].
  - Prefer linking to publisher, SSRN or arXiv copies over re-hosting them (content-audit §4).
- **[Critic] Upload type allowlist.**
  - CI should accept only `jpg`/`jpeg`/`png`/`webp`/`gif`/`pdf` under `public/uploads/` and reject `svg`, `html` and `xml` [H].
  - Reason: an uploaded file runs on the same origin as `/admin/`, where Decap keeps the editor's GitHub token in browser storage.
- `scripts/media/build-images.mjs` (sharp) writes 480 and 960 px WebP variants plus a manifest. The `<Img>` component reads the manifest and emits `srcset`, `width` and `height` [H: R6 §3.3].

**Validation** (`npm run validate`, the **required check** `validate-content`):
- zod schemas for every collection;
- relations resolve, so renamed slugs fail the build [H: R4 risk 6];
- no duplicate DOIs or titles;
- URLs use https;
- `alt` is required whenever an image is set;
- a photo or email renders only with its consent flag;
- 0 directions → error; more than 8 → error; 7–8 → warning;
- unique colours; confusable pairs → warning;
- non-published papers need `as_of`;
- a `person` with `listed: false` is never rendered or linked;
- news needs a date;
- character coverage outside Latin-1 → warning.

It runs as a Vitest suite over `CONTENT_DIR`, which avoids the uncertainty of running TypeScript with node directly [H].

### F4. Draft → preview → publish → live

1. **Sign in.** The editor opens `/admin/` and signs in with GitHub through the OAuth Worker (`base_url`; scope `public_repo` for a public repo) [D: R4 V4, V6].
2. **Save.** Saving creates a draft: branch `cms/<collection>/<slug>` plus a PR [D: DECAP-EW].
3. **Preview.**
   - The in-CMS preview pane is an iframe. Customise it with `registerPreviewStyle` (site tokens and prose CSS built to a stable `public/admin/preview.css`) and `registerPreviewTemplate` (React components via the global `h`/`createClass`) [D: DECAP-CUST].
   - GitHub Pages does not build PR branches, so drafts are never deployed anywhere [H: R4 §4].
   - Full-site previews would need Cloudflare Pages with an Access policy [D: R4 V25], an optional upgrade.
4. **Review.** Drafts move In review → Ready. CI runs `validate-content` on the PR. With the review gate (decision H-6), a maintainer approves on github.com.
5. **Publish.**
   - Clicking **Publish** merges the PR. The repo allows squash merges only and `backend.squash_merges: true` is set (method alignment, R4 V33).
   - **Publish fails while checks are still running**, so editors wait for the green check [D: R4 Verification, required change 3].
6. **Deploy.**
   - A push to `main` triggers `deploy.yml` on `ubuntu-latest`: `npm ci` → validate → media → `next build` → `upload-pages-artifact` → `deploy-pages`.
   - A weekly scheduled rebuild refreshes date-derived states (alumni, upcoming) [H].
   - **[Critic] Caveats on the schedule.**
     - GitHub automatically disables scheduled workflows in a public repo after 60 days with no repository activity [D: GH-SCHED]. A quiet summer would therefore freeze "Upcoming" and alumni states.
     - Scheduled runs can be delayed at busy times, such as the start of every hour, and may be dropped [D: GH-SCHED].
     - So schedule at an off-peak minute, document re-enabling the workflow in `HANDOVER.md`, and see the open gap on revalidation.
     - Static export has **no ISR, Draft Mode or redirects** [D: N-EXP unsupported list]. "Revalidation" therefore always means a full rebuild.
   - Time from Publish to live is [U]; measure it at hookup.
7. **Rollback.** Use **Revert** on the merged PR, which creates a new PR [D: R4 §3.1].

**Local no-account demo (builder and agents).**
- `npm run cms:local` starts `decap-server` plus `next dev`.
- Decap runs with `local_backend: true` in **simple** mode, because the editorial workflow is not supported by the proxy [D: R4 V2]. A generated, git-ignored `config.local.yml` is used [H].
- Demo path: edit → file written → page updates → `npm run build` → the change appears in `out/`.

### F5. Hosting, domain, ownership

**Org and repo.**
- A lab-owned GitHub org: `bobalab-berkeley` was free on 2026-10-20; `bobalab` is taken by an unrelated user [D: R4 V30].
- Two owners (PI plus one) [D: GitHub guidance via R4 §8 A2].
- Public repo `bobalab-berkeley.github.io`.
- Teams `web-editors` (Write) and `web-maintainers` (Maintain) [H: R4 §8 B2].

**Ruleset `protect-main`.**
- Require a PR and the status check `validate-content`.
- Block force pushes and deletions.
- **Bypass "for pull requests only"** for org admins; otherwise Decap's force-merge fallback could push straight to `main` [D: R4 V33].
- Rulesets are free on public repos [D: R4 V21].

**Pages and limits.**
- Pages source: GitHub Actions.
- Limits: 1 GB site, 100 GB/month soft bandwidth [D: R4 V20].

**OAuth Worker.**
- An org-owned OAuth App plus the forked `sveltia-cms-auth` on the Cloudflare free tier.
- `ALLOWED_DOMAINS` restricts origins [D: R4 V6, V23].

**Domain.**
- Launch at `https://bobalab-berkeley.github.io/` [D: R4 V22].
- The PI asks the Haas departmental Security Contact to register `bobalab.haas.berkeley.edu` in Socreg as offsite-hosted. This needs a Resource Proprietor (the PI), a privacy statement, no third-party ads or analytics, and Siteimprove scanning [D: KB via R4 V28].
- Off-campus DNS records are an exception reviewed by committee [D: DNS via R4 V29].
- Whether GitHub Pages is approved for P1 data is [U].
- `bobalab.org` currently fronts the lab scheduler; its controller is [U] [D: R4 §5.2]. Using it needs Office of Communications and Public Affairs approval [D: R4 V29].

**Ownership and turnover** [D methods: R4 §9]:

| Asset | Owner of record | Second admin |
|---|---|---|
| Org, repo, OAuth App | PI | Co-owner |
| Cloudflare account | Lab email (bobalab@) | PI plus one |
| Domain | Campus DNS / Socreg record | Haas Security Contact |
| Secrets | PI's password manager | Co-owner |

`docs/HANDOVER.md` covers:
- the owners list;
- where each secret lives;
- how to bump Decap (one file);
- the Node version;
- how to revert;
- how to add and remove editors each term;
- yearly secret rotation;
- campus contacts;
- why not Vercel Hobby or Netlify Free (Hobby is non-commercial personal use only, and non-owner commits do not deploy [D: R4 V26]; Netlify Free pauses sites when credits run out [D: R4 V27]).

---

## G. Quality plan

### G1. Accessibility: WCAG 2.2 AA

The conformance target is **WCAG 2.2 Level AA**. WCAG 2.2 adds 2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7 and 3.3.8 at A/AA, and removes 4.1.1 [D: WCAG22].

| Area | Requirement and how it is met |
|---|---|
| Structure | `lang="en"`, one `h1` per page, landmarks (header, nav, main, footer), a skip link, unique `<title>` |
| 1.1.1 Non-text content | `alt` required by the CMS. Decorative pearls and icons are `aria-hidden` |
| 1.3.1 Info and relationships | Real lists (`role="list"` where styled), tables for tabular data, `<details>` for alumni |
| 1.4.1 Use of colour | Colour always paired with a number or label |
| 1.4.3 / 1.4.11 Contrast | Token pairs in §C2–C3 are computed. A unit test recomputes them, so CI fails if a token changes below threshold |
| 1.4.4 / 1.4.10 / 1.4.12 Resize, reflow, spacing | rem-based sizes; container queries in `em`; no horizontal scroll at 320 px; never set `maximum-scale` or `user-scalable=no` [D anti-pattern: R3 §5] |
| 1.4.13 Content on hover | No pop-ups; the live caption never covers content |
| 2.1.1 Keyboard | Everything is reachable; filter chips are `<button aria-pressed>` |
| 2.2.2 Pause, stop, hide | No motion longer than 5 s; nothing loops [D: W-222] |
| 2.3.3 (AAA, aimed for) | Reduced-motion support plus the footer toggle |
| 2.4.3 / 2.4.7 Focus order and visibility | DOM order = visual order; 2 px ring with 3 px offset |
| **2.4.11 Focus Not Obscured** | Sticky header plus `scroll-padding-top` equal to the header height |
| **2.5.7 Dragging** | No drag interactions |
| **2.5.8 Target size** | ≥ 24×24 floor; the design uses ≥ 44 px for pearls, chips and rows [D floor: W-258] |
| **3.2.6 Consistent help** | Contact link in the same footer position on every page |
| 3.3.7 / 3.3.8 | No public forms. CMS sign-in is GitHub's own page, outside our control [H] |
| 4.1.2 / 4.1.3 Name, role, value; status messages | `aria-live` for filter result counts and "Copied" |
| Forced colours | §E7 CSS; tested with Playwright `forcedColors: 'active'` emulation [H] |
| Focus after client navigation | `RouteFocus` → `h1` (§E5) |

**Manual test matrix** (pre-launch, documented in `docs/QA-CHECKLIST.md`):
- keyboard only;
- VoiceOver on macOS Safari and iOS Safari;
- NVDA with Firefox and Chrome;
- 200% and 400% zoom;
- Windows contrast themes;
- OS reduced motion;
- one real mid-range Android phone and one older iPhone.

Automated testing cannot catch everything [D: R6 §10.3]. **Siteimprove** scanning is required for a berkeley.edu hostname [D: KB via R4 V28].

### G2. Performance budgets [thresholds D: CWV; values H]

| Metric | Budget |
|---|---|
| LCP | ≤ 2.5 s at p75, the "good" threshold [D: CWV]. Lab target ≤ 1.8 s on Lighthouse mobile. The LCP element is text (the hero heading); there is no raster hero image |
| CLS | ≤ 0.1 [D: CWV]; target ≤ 0.02 on home (server-rendered figure in normal flow; `next/font` fallback metrics) |
| INP | ≤ 200 ms [D: CWV] |
| Lighthouse (mobile) | Performance ≥ 95, Accessibility 100, Best Practices ≥ 95, SEO ≥ 95 on home, a direction page, publications and people [H: R5 §6.13] |
| Fonts | ≤ 100 KiB preloaded (computed 97.4 KiB) |
| Client JS (gz) | WP0 measures framework baseline **B** (an empty route) into `docs/PERF-BASELINE.md`. Then: home ≤ B + 8 KB (figure island ≤ 4 KB); `/publications/` ≤ B + 30 KB (MiniSearch plus filters); every other route ≤ B + 10 KB. Enforced by `scripts/perf/js-budget.mjs`, which sums the gz size of every script referenced by each `out/**/*.html` |
| Home transfer | ≤ 350 KB including fonts |
| Images | Headshots ≤ 40 KB each (WebP, 2 widths); explicit `width` and `height` everywhere |
| Animation | Only `transform` and `opacity` animate [D: web.dev via R5 §2.5]; no SVG filters [D: R5 §2.4]; no rAF loops |

### G3. SEO and metadata

- **Metadata API:**
  - `metadataBase` (required when URL fields are relative [D: R6 §3.5]);
  - `title.template` "%s · BOBALAB";
  - home title "BOBALAB · Berkeley Operations and Behavioral Analytics Lab, Berkeley Haas", which separates the lab from bubble-tea shops named "Boba Lab" [D collision: R2 §5];
  - descriptions from content, a canonical URL per page;
  - Open Graph and Twitter cards with static 1200×630 PNGs. Static images are used instead of `next/og` to avoid a spike [H: R6 §3.5].
- **`sitemap.ts` and `robots.ts`:**
  - `force-static`; one root sitemap;
  - nested sitemaps are buggy under export [D: R6 §3.5, issue #98126];
  - exclude `/admin/`, drafts and unlisted people;
  - robots disallows `/admin/`.
- **JSON-LD** (native `<script type="application/ld+json">`, `<` escaped as `\u003c`, typed with schema-dts [D: R6 §9]):
  - `ResearchOrganization` (a schema.org type marked new and pending [D: SCHEMA]) with `parentOrganization` for Haas/UC Berkeley, on home and About;
  - `ResearchProject` on direction and project pages;
  - `ScholarlyArticle` on paper pages;
  - `Person` plus `ProfilePage` for the PI;
  - `NewsArticle` on news items [H].
  - Google has no ScholarlyArticle or Person rich result, so this markup is for semantics, not snippets [D: R6 §9].
- **Google Scholar tags** on paper pages: `citation_title`, one `citation_author` per author, `citation_publication_date` [D: SCHOLAR]. `citation_pdf_url` only if the PDF sits in the same directory and the lab has the rights [D: SCHOLAR].
- **RSS** at `/news/feed.xml`.
- **Link-in.** Ask Haas to list BOBALAB on its research-labs page and link from the PI's Haas profile [H: R4 §4].

### G4. Security

- **Dependencies:**
  - exact pins (`.npmrc` `save-exact=true`, `engine-strict=true`), `npm ci` in CI;
  - next ≥ 16.4.1 floor [D: R6 V2, V4];
  - Dependabot alerts on;
  - GitHub Actions pinned by commit SHA [H].
- **CMS:**
  - Decap bundle vendored (no CDN) with a recorded SHA-256;
  - `auth_scope: public_repo`;
  - the OAuth secret lives only in the Worker; the org's third-party OAuth access is restricted;
  - 2FA for every member;
  - leavers removed each term [D options: R4 §8, V4].
- **Ruleset:** PR plus `validate-content` required, admin bypass for PRs only [D: R4 V33].
- **CSP via `<meta>`** (GitHub Pages cannot set response headers [H]):
  - public pages: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`. Next's no-nonce pattern needs `'unsafe-inline'` for static pages [D: N-CSP];
  - `/admin/`: a minimal policy allowing `api.github.com`, the Worker origin and GitHub avatars, determined by testing [U whether Decap needs `'unsafe-eval'`].
  - `frame-ancestors` cannot be set via `<meta>` [D: MDN-FA], so clickjacking protection for `/admin/` is limited. If the lab wants it, move hosting to Cloudflare Pages with `_headers` [H].
- **Content safety:**
  - Markdown is rendered by Markdoc with raw HTML escaped (unit test);
  - no `dangerouslySetInnerHTML` except JSON-LD and the pre-paint script;
  - external links get `rel="noopener noreferrer"`.
- **Privacy:**
  - no cookies, analytics or third-party requests (Playwright asserts zero off-origin requests) [D campus rule: KB via R4 V28];
  - consent flags gate photos, emails and "now at";
  - **never migrate the 25 commented-out roster cards** in the PI site's source [D existence: R1 §3b]. **[Critic]** This means the hidden cards' data (photos, links, years). People who also appear visibly may still be migrated from the *visible* entries, subject to H-11;
  - drafts in a public repo are publicly readable on github.com, so no embargoed or personal data goes into drafts [H: R4 risk 3].

### G5. Tests and CI

| Job (stable name) | What | Tool |
|---|---|---|
| `validate-content` (required) | Schemas, relations, consent, limits (§F3) | vitest 5.0.5 |
| `lint-typecheck` | ESLint 10 flat config; `tsc --noEmit` (strict plus `noUncheckedIndexedAccess`) | eslint, typescript 6.0.3 [D: R6 §10] |
| `unit` | Slot templates; seed fill; palette contrast; BibTeX golden files for the 5 published papers (R2 §3 citations); search index; filters ↔ URL; alumni derivation; JSON-LD builders; Markdoc HTML escaping; RSS XML | vitest |
| `build` | `next build` on **ubuntu-latest** (Windows export bug [D: N-85374]); assert `out/404.html`, `out/admin/index.html`, and no draft slugs in `out/` | next |
| `e2e` | Navigation; figure (§E10); filters; BibTeX copy (Chromium only; clipboard support differs by browser [D: R6 §8]); no-JS rendering (`javaScriptEnabled: false`); reduced motion; forced colours; zero off-origin requests | Playwright 1.64.1 (Chromium and WebKit) |
| `a11y` | axe with `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` on every template, both colour schemes, figure and list modes | @axe-core/playwright 4.14.0 |
| `links` | Internal links in `out/` | linkinator 8.1.0 |
| `budgets` | JS, font and image budgets (§G2) | `scripts/perf/*` |
| weekly | External links (DOIs, venues); scheduled rebuild | lychee-action v2.9.0 |
| pre-launch (manual) | Lighthouse 13.5.0 on the four key pages; the §G1 manual matrix; the five-second test (§B2) | — |

---

## H. Decisions the lab must make

| # | Decision needed | Option A | Option B | Recommendation |
|---|---|---|---|---|
| H-1 | **Which research directions (pearls), with short labels ≤ 28 characters?** The lab's own tags are only "human-ai" and "future of work" [D: R1 §7]; R1 proposes 3–4 [H] | 3–4 directions: Gig & Platform Work; Human–AI Decisions; Generative AI at Work; optionally Behavioral Pricing | 2 directions matching the existing tags (row template) | **A**, confirmed and worded by the PI. Treat Cities & Communities as PI history, not a pearl [H: R1 §7]. **[Critic]** S1 later reconciled R1 and R2 into a different 4-pearl set: Algorithmic Advice · AI at Work · Learning on the Job · Platform Work, plus optional Pricing & Experiments (content-audit §7; `content-dataset.json` `directions[]`). It covers all five current URAP questions. Present **S1's set** to the PI as option A and R1's set as an alternative [H] |
| H-2 | What do the small seed dots count? | Public papers and working papers per direction | Projects per direction | **A**: papers are public and countable; projects may include unannounced work [H: R5 Q2] |
| H-3 | Which papers count as BOBALAB work? Most PI papers have external coauthors; 4 items have lab-member coauthors [D: R1 §7]. **[Critic]** S1 counts 6, adding Dispatching to Develop and Stale/Misattributed/Late. Treating their author "Haonan Deng" as the lab member is a strong HYPOTHESIS (content-audit §2 #18) | List all of the PI's research since joining Berkeley, plus earlier papers that feed a direction, with a "lab-coauthored" marker | Only lab-coauthored papers | **A**, labelled honestly; PhD- and MIT-era items at the PI's discretion [H] |
| H-4 | Domain path | `bobalab-berkeley.github.io` now, plus apply for `bobalab.haas.berkeley.edu` via Socreg | Use `bobalab.org` (needs ownership confirmed, plus OCPA approval [D: R4 V29]) | **A**; keep `bobalab.org` for the scheduler or redirect it later [H: R4 §5.2] |
| H-5 | Repo visibility | Public repo on GitHub Free (Pages and rulesets free [D: R4 V19, V21]) | Private repo with free GitHub Team via GitHub Education (Pages on Team [D: R4 V19, V21]) | **A**, with the rule "no embargoed or personal data in drafts" |
| H-6 | Review gate before publishing | 1 required approval from `web-maintainers` on github.com, after which the editor clicks Publish | No required approval; rely on validation and Revert | **A** for the first term (credibility), then revisit. Note that Publish fails until approved [D: R4 V10, required change 3] |
| H-7 | CMS UI | Decap 3.17.1 | Sveltia (same files, nicer UI, single maintainer) | **A** now; re-evaluate Sveltia in 6 months [D facts: R4 V8, V32] |
| H-8 | Typeface pairing | Fraunces (wght-only) + Inter + Plex Mono | Newsreader + Public Sans + Plex Mono | **A** (both 97.4 KiB); B if the PI finds Fraunces too playful [D sizes: FONTS] |
| H-9 | Link and accent colour | Lab brown-sugar `#8A4515` | Berkeley Blue `#002676` [D hex: R3 S31] | **A**: keeps the lab mark visually separate from university marks [H] |
| H-10 | Brand mark and affiliation | New typographic pearl-O wordmark; affiliation as plain text; ask Haas MarCom (brand@haas.berkeley.edu [D: R4 §6]) | Reuse the scheduler's existing logo (not viewed; owner [U]) and/or request an official lockup | **A** pending a MarCom reply [D campus discouragement: UCB-BRAND] |
| H-11 | Roster and photo consent | Launch with the PI plus members who confirm (`listed`, `photo_consent`); the roster worksheet stays **outside** the public repo | Mirror the PI site's visible roster as is | **A**. Resolve the 3 people shown as both current and alumni, the name typo, and the year conflicts first [D issues: R1 §3d, §9] |
| H-12 | Canonical lab name | "Berkeley Operations and Behavioral Analytics Lab" | "Berkeley Operations & Behavioral Analytics" | **A**: used in the PI's About text and by the scheduler [D: R1 §2]; confirm use of "Berkeley" with the dean's office or area chair [H: R4 §6] |
| H-13 | Next.js Cache Components | Off (static export) | On (needs a Node host; becomes the default in Next 17 [D: R6 V6]) | **A**; revisit at Next 17 |
| H-14 | Motion controls | OS setting plus a footer "Reduce motion" toggle | OS setting only | **A**: cheap, and the toggle is an example technique for WCAG 2.3.3 [D: R5 §2.7] |
| H-15 | Analytics | None at launch | A privacy-preserving, self-hosted counter later | **A**: campus rules bar analytics that pass personal data to third parties [D: R4 V28] |
| H-16 | Hero figure if the five-second test fails or n ≥ 7 | Switch to the C10 pearl dot plot (`figure_mode: dotplot`) | Keep the cluster and add more explanatory text | **A**; the dot plot exposes per-year output, so the PI must approve it [H: R5 C10] |
| H-17 | Where the working tree lives | Move the checkout (with `node_modules`, `.next`) out of OneDrive, e.g. `C:\dev\bobalab-website`. The gitdir is already outside OneDrive at `C:/Users/jiami/src/bobalab-website.git` [D: local `.git` file] | Keep it in OneDrive and accept the sync risk | **A** [D OneDrive limits and the Turbopack cache: R6 §14, V25] |
| H-18 | Contact and visibility | One email, `bobalab@berkeley.edu`, as a link; no region gating on the lab site | Mirror the PI site's region-based "lite" view [D: R1 header note] | **A** [H] |

---

## I. Build plan

**Sequence.** WP0 (foundation) runs alone. Then **WP1–WP8 run in parallel**. WP8 runs the final integration suite.

**Ownership rules.**
- **No file is edited by more than one package.**
- A package that needs a change in a file it does not own writes a request to `docs/change-requests/WP<n>/<k>.md` (its own directory). The WP0 owner applies it after the parallel phase, or during it.
- New npm dependencies may be added **only** through WP0's `package.json`. All dependencies in §F1 are installed in WP0.
- Every page package tests against **fixtures** (`CONTENT_DIR=tests/fixtures/content/<set>`), so it never waits for real content.

### WP0: Foundation and design system (first, alone)

**Owns**
- **Root config:** `package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.gitattributes`, `vitest.config.ts`, `vitest.content.config.ts`, `playwright.config.ts`, `README.md`.
- **App shell:** `src/app/layout.tsx`, `src/app/globals.css`, `src/app/icon.svg`, `src/app/apple-icon.png`; delete `src/app/favicon.ico`; `src/app/kit/page.tsx` (component kit, rendered only when `NEXT_PUBLIC_KIT=1`, otherwise `notFound()`).
- **Styles and fonts:** `src/styles/**` (`tokens.css`, `base.css`, `prose.css`, `motion.css` including all view-transition rules from §E, `forced-colors.css`); `src/fonts/**` (woff2 plus OFL.txt).
- **Components:**
  - `src/components/site/**`: SiteHeader, SiteFooter, SkipLink, RouteFocus, PrePaintScript, MotionToggle.
  - `src/components/brand/**`: Wordmark SVG, PearlMark.
  - `src/components/ui/**`: Pearl, PearlTag, Badge, EvidenceLabel, DateText, Prose (Markdoc), MaterialsRow, FilterChips, Img, icons, VisuallyHidden, JsonLd, PublicationEntry, NewsItem, PersonCard, ProjectCard, DirectionCard.
- **Libraries:** `src/lib/content/**` (schema.ts, load.ts, relations.ts, markdoc.ts, dates.ts, people.ts, palette.ts), `src/lib/seo/**` (metadata.ts, jsonld.ts, scholar.ts), `src/lib/vt.ts`.
- **Assets and tests:** `public/brand/**` (OG still); `tests/fixtures/content/**` (sets n0, n1, n2, n3, n4, n6, n7, n8, long-labels, seeds-0-1-7-12-24, consent-edge-cases); `tests/content/**`; `tests/unit/foundation/**`.
- **Docs:** `docs/ARCHITECTURE.md`, `docs/PERF-BASELINE.md`, `docs/change-requests/README.md`.

**Inputs:** §C, §F1–F3, §E1 (names), §E7, §G4 CSP, R6 §12–13, the bundled Next docs.

**Acceptance criteria**
1. `npm ci` installs exactly the §F1 pins, with only the 3 known ESLint-10 ERESOLVE warnings.
2. `next.config.ts` matches §F1: export, trailingSlash, unoptimized images, basePath env; none of cacheComponents, partialPrefetching or turbopack rules.
3. `typecheck`, `lint`, `test` and `validate` pass. `npm run build` on Linux (CI or WSL) emits `out/` with `404.html`.
4. Every token in §C2–C3 exists with its exact hex. A unit test recomputes every listed contrast pair and fails below threshold.
5. Preloaded fonts total ≤ 100 KiB. Zero off-origin requests on the kit page.
6. The kit page renders every primitive in light, dark and forced colours with zero axe violations. The skip link works. `RouteFocus` focuses `h1` after a client navigation.
7. The validator implements every rule in §F3 and has a fixture test for each error and warning.
8. npm script names are defined for other packages' files:
   - `media` → `scripts/media/build-images.mjs`
   - `cms:local` → `scripts/cms/local.mjs`
   - `serve:out` → `scripts/serve-out.mjs`
   - `perf` → `scripts/perf/js-budget.mjs`
9. `docs/PERF-BASELINE.md` records baseline B.

### WP1: Fig. 1 and the home page

**Owns:** `src/app/page.tsx`, `src/components/figure/**`, `src/components/home/**`, `src/lib/figure/**` (templates.ts, buildFigure.ts, seeds.ts), `tests/unit/figure/**`, `tests/e2e/home.spec.ts`, `tests/e2e/figure.spec.ts`, `tests/visual/**`. Deletes `public/{file,globe,next,vercel,window}.svg`.

**Inputs:** §E (whole), §D3, the WP0 kit, fixtures.

**Acceptance**
1. Ship a **static-hero milestone** first (no motion) so the lab can run the five-second test (§B2).
2. Everything in §E10.
3. Home sections in the §D3 order, each with an empty state.
4. Home JS ≤ B + 8 KB gz.
5. `figure_mode: dotplot` renders the C10 variant from the same `<ol>`.

### WP2: Research directions and projects

**Owns:** `src/app/research/**`, `src/app/projects/**`, `src/components/direction/**`, `src/components/projects/**`, `tests/unit/direction/**`, `tests/e2e/research.spec.ts`, `tests/e2e/projects.spec.ts`.

**Inputs:** §D4–D6, §E5 (morph target and rail), WP0 `vt.ts`, palette vars.

**Acceptance**
1. `generateStaticParams` with `dynamicParams = false`.
2. The hero pearl carries `pearl-{slug}`, and only one element per name is mounted.
3. The header band uses the swatch tokens; the dark band is computed.
4. Counts are derived.
5. "See all" preserves `?direction=`.
6. Breadcrumbs work.
7. `ResearchProject` JSON-LD.
8. The sibling rail transitions (`nav-forward`, `nav-back`) work.
9. No-JS rendering works.
10. Zero axe violations.
11. Focus lands on `h1` after a pearl click.

### WP3: Publications

**Owns:** `src/app/publications/**`, `src/components/publications/**`, `src/lib/publications/**` (bibtex.ts, citation.ts, search.ts, filters.ts), `tests/unit/publications/**`, `tests/e2e/publications.spec.ts`.

**Inputs:** §D7–D8, R2 §3 and §7 (verified citations and status rules), R3 §7.6.

**Acceptance**
1. The full list is in the HTML without JS.
2. The filter island sits inside `<Suspense>`, its state round-trips through the URL, and the count is announced.
3. BibTeX and citations come from citation-js at build time and match golden files for the 5 published papers.
4. Statuses show "as of" and the self-reported wording.
5. Scholar meta and `ScholarlyArticle` JSON-LD on detail pages.
6. Copy announces "Copied", with a `<pre>` fallback.
7. Every materials link's accessible name includes the title.
8. `/publications/` JS ≤ B + 30 KB gz.

### WP4: People

**Owns:** `src/app/people/**`, `src/components/people/**`, `tests/e2e/people.spec.ts`, `tests/unit/people-page/**`.

**Inputs:** §D9, WP0 `lib/content/people.ts` (alumni derivation), consent fields.

**Acceptance**
1. Group order and sorting follow §D9.
2. Alumni derive from `end` and sit in a collapsed `<details>` by year.
3. Photo, email and now_at render only with their consent flags. `listed: false` people never appear and are never linked (fixture test).
4. Profile pages exist only for `profile_page: true`. PI `ProfilePage` JSON-LD.
5. Filter chips are accessible buttons.
6. A pearl-initial avatar replaces missing photos.

### WP5: News, static pages, 404 and feed

**Owns:** `src/app/news/**` (including `feed.xml/route.ts`), `src/app/join/**`, `src/app/about/**`, `src/app/accessibility/**`, `src/app/privacy/**`, `src/app/not-found.tsx`, `src/components/news/**`, `src/components/pages/**`, `tests/unit/feed/**`, `tests/e2e/news.spec.ts`, `tests/e2e/pages.spec.ts`.

**Inputs:** §D10–D12, R3 §7.8.

**Acceptance**
1. Every item shows a full date. "Upcoming" is computed against the build date.
2. RSS is well-formed XML with the required channel and item elements (unit test).
3. `out/404.html` contains the only pun plus links.
4. The Join page reads recruiting status and as-of date from content, and email links are `mailto:`.
5. Privacy and Accessibility statements exist with a contact.
6. `NewsArticle` JSON-LD.

### WP6: CMS (Decap) and editor experience

**Owns:** `public/admin/**` (index.html, `decap-cms.js` 3.17.1 plus `decap-cms.js.sha256`, config.yml, preview.css, preview-templates.js), `cms/**` (config source), `scripts/cms/**` (vendor-decap.mjs using `npm pack` without install, build-config.mjs, local.mjs), `docs/EDITING.md`, `tests/unit/cms/**`, `tests/e2e/cms-local.spec.ts`.

**Inputs:** §F2–F4, R4 §7–8 plus its Verification required changes 1–3, WP0 zod schema.

**Acceptance**
1. The vendored bundle's SHA-256 matches the npm 3.17.1 tarball's `dist/decap-cms.js`.
2. A **parity test**: every field and constraint in the zod schema exists in `config.yml`, and vice versa.
3. The production config has `publish_mode: editorial_workflow`, `auth_scope: public_repo`, `squash_merges: true`, a placeholder `base_url`, `media_folder: public/uploads`, and `richtext` body fields.
4. `npm run cms:local` demo, automated in Playwright:
   1. create a news item in the browser;
   2. the file appears in the fixture content directory;
   3. the page shows it;
   4. the build includes it.
5. `/admin/` has `noindex` and a tested minimal CSP.
6. Preview templates exist for news, person and publication.
7. `EDITING.md` covers:
   - sign-in;
   - drafts and review;
   - waiting for the green check before Publish;
   - consent rules;
   - image alt text;
   - Revert;
   - a per-term checklist.

### WP7: Content migration and media pipeline

**Owns:** `content/**`, `public/uploads/**`, `scripts/media/**`, `scripts/import/**`, `docs/CONTENT-QUESTIONS.md`.

**Inputs:** R1 (+ JSON), R2 §3 and §7, decisions H-1, H-2, H-3, H-11, H-12. **[Critic]** The primary input is **`research/content-dataset.json`** together with **`research/content-audit.md`**: S1's reconciled, Crossref-checked dataset, which supersedes R1/R2 wherever they differ.
- The dataset uses its own camelCase shape, not the §F3 schema.
- So WP7 needs an explicit field mapping (see the open gaps at the end of this brief).
- WP7 must honour `review.status`, `inferredQuestionIdx` and `summaryInferred`.

**Acceptance**
1. All content passes `validate`.
2. Published citations match R2 §3; for example, the *Management Science* paper shows 2026, 72(1), online May 2025 [D: R2 §1.1].
3. Every working paper has `status_source: self-reported` and `as_of`.
4. `in_brief` texts are newly written, ≤ 3 sentences, with no copied abstracts.
5. Directions are seeded with `draft: true` until the PI confirms H-1.
6. People: only the PI is committed until H-11 is decided. Any roster worksheet lives outside the repo. A grep test proves that no name from the hidden roster cards appears anywhere in the repo.
   - **[Critic]** 9 of the 25 hidden cards duplicate *visible* alumni, and 4 match CV-listed advisees (content-audit §2 #12). Testing all 25 names would therefore fail as soon as visible alumni are added.
   - Test only the names that appear nowhere else, the 12 "hidden-only" cards.
   - Store them as salted SHA-256 hashes, never as plain text, so the test can run in CI without publishing the names [H].
7. Known fixes from R2 §7.5 are applied:
   - "full-view" → "US";
   - the press link moved to the correct paper;
   - AOM 2019 "Best Student Paper".
8. `docs/CONTENT-QUESTIONS.md` lists every open item from R1 §9–10 and R2 §9.
9. The media script outputs WebP 480 and 960 plus a manifest. No upload exceeds 10 MB.

### WP8: SEO files, CI/CD, quality gates and handover

**Owns:** `.github/**` (workflows `ci.yml`, `deploy.yml`, `links-weekly.yml`; `dependabot.yml`; `CODEOWNERS`), `src/app/sitemap.ts`, `src/app/robots.ts`, `scripts/perf/**`, `scripts/serve-out.mjs`, `linkinator.config.json`, `tests/e2e/a11y-sitewide.spec.ts`, `tests/e2e/no-js.spec.ts`, `tests/e2e/motion-and-colors.spec.ts`, `tests/e2e/offorigin.spec.ts`, `docs/HANDOVER.md`, `docs/SETUP-PRODUCTION.md`, `docs/QA-CHECKLIST.md`.

**Inputs:** §G (whole), §F4–F5, R4 §8–9 plus its Verification, R6 §10 and §14.

**Acceptance**
1. CI on PRs runs the §G5 jobs with exactly those names; `validate-content` is suitable as the ruleset's required check.
2. Deploy runs on push to `main` and on a weekly schedule, on `ubuntu-latest`, with actions pinned by SHA.
3. The sitemap and robots rules from §G3 hold (tested).
4. The budget scripts fail when they should, proven on a fixture.
5. Site-wide axe passes in both schemes, figure and list modes.
6. Zero off-origin requests.
7. `SETUP-PRODUCTION.md` reproduces R4 §8 with the verification fixes:
   - bypass for PRs only;
   - merge method aligned with `squash_merges`;
   - Publish waits for checks.
8. `HANDOVER.md` covers R4 §9.
9. `QA-CHECKLIST.md` holds the §G1 manual matrix and the five-second test protocol.
10. **Final integration:** a full suite run on the merged tree, with a Lighthouse report for the 4 key pages attached to the PR.

**File-ownership check.**
- Shared root files belong only to WP0.
- `src/app/*` route folders are partitioned:
  - `/` → WP1;
  - `research`, `projects` → WP2;
  - `publications` → WP3;
  - `people` → WP4;
  - `news`, `join`, `about`, `accessibility`, `privacy`, `not-found` → WP5;
  - `sitemap`, `robots` → WP8;
  - `kit` → WP0.
- Every test file is named per package.
- `public/` is split three ways: `brand` (WP0), `admin` (WP6), `uploads` (WP7).
- The only deletion of scaffold files is `public/*.svg`, by WP1.

---

## J. Sources

All accessed 2026-10-20.

**Inputs** (in `scratchpad/bobalab/research/`): R1 `R1-content-park.md`; R2 `R2-content-corroborate.md`; R3 `R3-design-references.md`; R4 `R4-cms-hosting.md` (Vn = Verification rows); R5 `R5-boba-concepts.md` (Cn = Critique items); R6 `R6-frontend-stack.md` (V#n = Verification rows).

| Key | Source |
|---|---|
| NPM | https://registry.npmjs.org/{yaml, zod, sharp, decap-cms, decap-server, @fontsource-variable/fraunces, @fontsource-variable/inter, @fontsource/ibm-plex-mono, @fontsource-variable/newsreader, @fontsource-variable/public-sans, @markdoc/markdoc, next, react} (via `npm view`); other versions via R6 §1 and R4 V1 |
| FONTS | https://data.jsdelivr.com/v1/packages/npm/{@fontsource-variable/fraunces, @fontsource-variable/inter, @fontsource/ibm-plex-mono, @fontsource-variable/newsreader, @fontsource-variable/public-sans}@5.3.0?structure=flat (copies in `research/raw/s2/`; sizes in KiB) |
| CALC | `scratchpad/bobalab/s2-tools/tokens.py`, `sets.py`, `set6.py`: WCAG 2.x relative luminance; Machado, Oliveira & Fernandes 2009 CVD matrices at severity 1.0; CIE76 ΔE |
| N-EXP | https://nextjs.org/docs/app/guides/static-exports (local: `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`, unsupported-features list and `out/404.html`) |
| N-VT | https://nextjs.org/docs/app/guides/view-transitions (local `view-transitions.md`: Chromium 125+ note, `share`/`default`, 3 px blur, `pointer-events: none`, reduced-motion block) |
| N-LINK | local `01-app/03-api-reference/02-components/link.md` (`transitionTypes`, added v16.2.0) |
| N-USP | local `03-api-reference/04-functions/use-search-params.md` (Suspense required for static pages) |
| N-CSP | local `02-guides/content-security-policy.md` ("Without Nonces"; nonces need dynamic rendering) |
| N-FLASH | local `02-guides/preventing-flash-before-hydration.md` |
| N-PP / N-CC | local `05-config/01-next-config-js/partialPrefetching.md` (requires cacheComponents); `cacheComponents.md` |
| N-85374 | https://github.com/vercel/next.js/issues/85374 (via R6 V23) |
| NEXT-49279 | https://github.com/vercel/next.js/issues/49279 (via R5 §2.3) |
| R-VT | https://react.dev/reference/react/ViewTransition ; https://react.dev/blog/2026/09/09/react-19-3 (via R5 §2.2, C7) |
| CIU-VTC | https://caniuse.com/mdn-css_properties_view-transition-class (via R5 C7) |
| DECAP-W | https://decapcms.org/docs/widgets/ |
| DECAP-RT / DECAP-MD | https://decapcms.org/docs/widgets/richtext/ ; https://decapcms.org/docs/widgets/markdown/ |
| DECAP-CUST | https://decapcms.org/docs/customization/ |
| DECAP-EW | https://decapcms.org/docs/editorial-workflows/ (via R4 §3.1) |
| MARKDOC | https://markdoc.dev/docs/syntax |
| GH-404 | https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site |
| WCAG22 | https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ |
| W-222 / W-258 / W-1413 | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html ; …/target-size-minimum.html ; …/content-on-hover-or-focus.html (via R5 §2.7–2.8) |
| CWV | https://web.dev/articles/vitals |
| MDN-FA | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors |
| MDN-FC | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors (via R5 C5.4) |
| WK-LIST | https://bugs.webkit.org/show_bug.cgi?id=170179 ; https://cssence.com/2022/safari-role-list-a11y/ (via R5 C5.5) |
| SCHOLAR | https://scholar.google.com/intl/en/scholar/inclusion.html (via R6 §9) |
| SCHEMA | https://schema.org/ScholarlyArticle ; https://schema.org/ResearchProject ; https://schema.org/ResearchOrganization (via R6 §9) |
| KB | https://berkeley.service-now.com/kb_view.do?sysparm_article=KB0015380 (via R4 V28) |
| DNS | https://oercs.berkeley.edu/policies/campus-policy-library/domain-name-system-dns-service-policy-and-resources (via R4 V29) |
| UCB-BRAND | https://brand.berkeley.edu/visual-identity/logos ; https://brand.berkeley.edu/visual-identity/signature-system/ ; https://brand.berkeley.edu/visual-identity/colors/ (via R4 §6, R5 §1.6) |
| HAAS-BRAND | https://haas.berkeley.edu/brand-hub/visual-identity/ (via R4 §6, R5 §1.7) |
| HAAS-P / HAAS-LABS | https://haas.berkeley.edu/faculty/park-sinchaisri/ ; https://haas.berkeley.edu/faculty-research/research-labs (via R1, R3 S30) |
| URAP | https://urapprojects.berkeley.edu/list.php?faculty_id=F-1753 (via R2 §5) |
| PARK | https://parksinchaisri.github.io/ (via R1) |
| GH-SCHED *(critic)* | https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows (`schedule`: public-repo schedules disabled after 60 days without activity; delays at the start of every hour) |
| GH-SELF *(critic)* | https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/approving-a-pull-request-with-required-reviews ("Pull request authors cannot approve their own pull requests.") |
| DECAP-LIST / DECAP-FILE / DECAP-CFG *(critic)* | https://decapcms.org/docs/widgets/list/ (`allow_reorder`) ; https://decapcms.org/docs/widgets/file/ (`choose_url`, per-field `media_folder` beta) ; https://decapcms.org/docs/configuration-options/ (`sortable_fields`/`view_filters`/`view_groups` only; no drag reordering of folder entries, no redirects) |
| UCB-DAP *(critic)* | https://dap.berkeley.edu/ada-title-ii-updates/title-ii-ada-what-does-it-mean-us (updated 2026-07-22: WCAG 2.1 AA by 2027-04-26; PDFs and other documents in scope; archive exception needs a dedicated archive area) |

---

## Critic fixes

Completeness critic, 2026-10-20. Every in-place edit is marked **[Critic]** or *(critic)*. Scripts are in `scratchpad/bobalab/critic-tools/`.

**Edits to this file**
1. **§C2 dark-mode table.** Added three tokens. Before this, WP0 acceptance #4 ("every token … with its exact hex") could not be met for them in dark mode.
   - `--paper-alt` `#1C1511`: S2's own value from `tokens.py`.
   - `--accent-strong` `#EDBD8F`: a proposal.
   - `--hairline` `#3D3129`: a proposal.
   - Their ratios were computed by `critic_colors.py`.
2. **§C3.** Added the colour mapping for S1's taxonomy. S1's original colours used both reserve swatches, giving a minimum ΔE of 3.2; the new mapping reaches 11.8.
3. **§0.2.** Recorded that R4 §6 also suggested Berkeley Blue and Gold accents, and that the brief overrides it.
4. **§D12 Privacy.** Added the visitor-side `localStorage` (motion choice) and `sessionStorage` (intro flag).
5. **§F3 Media.** Specified the PDF field widget (Decap `file` with "Insert from URL") and an upload extension allowlist that excludes SVG, HTML and XML.
6. **§F4 step 6.** Added GitHub's documented behaviour: a public repo's schedules are disabled after 60 days without activity, and runs are delayed at the top of the hour. Also noted that static export has no ISR, Draft Mode or redirects.
7. **§G4.** Clarified that "never migrate hidden cards" refers to the hidden cards' data, not to people who are also listed visibly.
8. **§H H-1 and H-3.** H-1 now points to S1's reconciled taxonomy. H-3 now notes that S1 counts 6 lab-coauthored items, not 4.
9. **§I WP7.** Inputs now name `content-dataset.json` and `content-audit.md` as primary. Acceptance #6 now restricts the hidden-name grep test to the 12 hidden-only names, stored as salted hashes.
10. **§J.** Added source keys GH-SCHED, GH-SELF, DECAP-LIST/FILE/CFG and UCB-DAP.

**Edits to other files**
- `content-audit.md`: corrected the §7 colour column and appended its own "Critic fixes" section.
- `content-dataset.json`, through the idempotent `apply_critic_fixes.py`:
  - remapped `suggestedColor`;
  - added `inferredQuestionIdx`, `summaryInferred` and `meta.criticFixes`.
- The pre-edit copy is `critic-tools/content-dataset.pre-critic.json`.

## Critic: open gaps (summary; full list returned to the orchestrator)

| Sev. | Gap | Suggested resolution |
|---|---|---|
| blocker | **Dataset ↔ §F3 schema mismatch.** The dataset uses camelCase, and several fields have no clean mapping:<br>- roles `alumni`/`ms`/`collaborator`;<br>- `classYear` but no `start`/`end`;<br>- `questions[]` (4 of them over 140 characters) versus one `question`;<br>- free-text `status`, no `as_of`;<br>- `type: work-in-progress`;<br>- `oneLiner`→`summary`;<br>- no `order`, `active_since`, `findings` or `listed`;<br>- slugs differ from the §D2 patterns. | WP0 and WP7 agree a written mapping table (`docs/CONTENT-MAPPING.md`) before the parallel phase. Extend the enums or add an importer that converts the dataset and leaves unknown fields empty or `draft`. |
| blocker | **§E9 vs WP7.** Zero non-draft directions is a validator *error*, yet WP7 seeds every direction as `draft: true`. CI therefore fails on `main` and WP7 acceptance #1 cannot pass. | Raise the n = 0 error only when `site.launched: true`, or only in the deploy job; warn before that. |
| blocker (lab) | **H-1 taxonomy.** The brief (R1's set) and S1's set differ. | The PI chooses. Present S1's set as option A. |
| important | **No staging environment.** The original brief asked for staging vs production. Drafts are never deployed, and the in-CMS preview is a hand-written approximation. | Add a decision H-19. Either Cloudflare Pages previews of `cms/**` branches behind an Access policy (R4 V25), or production-only plus PR screenshots. Decide before WP8. |
| important | **Reordering pearls deadlocks.** Each direction file is its own PR, and the "unique `order`" rule fails both halves of a swap. Colours behave the same way. | Move the order to `site.yml` → `direction_order`: a list of relation items, which the list widget can reorder [D: DECAP-LIST]. Make colour uniqueness a warning. |
| important | **Opportunities model missing.** The brief has one `recruiting` boolean; the dataset has 5 items, each with its own status. The "Open to RAs" flag is undefined. | Add an `opportunities` collection with audience, route, url, status, `as_of` and `closes_on`. Derive the badge from it. |
| important | **Archive, deletion and slug renames.** No archived state exists for directions. Deleting a published entry under a protected `main` is [U]. Static export plus GitHub Pages cannot redirect, so renamed slugs become 404s. | Add `status: archived` (off Fig. 1, page kept, "Past directions"). Prefer archiving to deleting. Generate meta-refresh stubs from a `redirects` list. |
| important | **Revalidation.** Date-based states (Upcoming, alumni) go stale, and the weekly schedule can be silently disabled [D: GH-SCHED]. | Run a daily off-peak schedule plus an external `workflow_dispatch` trigger [H]. Show event dates explicitly. |
| important | **External coauthors are modelled as `people`** (20 records). Listing them would imply lab affiliation. | Import them as author names with an external link only. Never list them on the People page without consent. |
| important | **WIP items (7) and preprints.** Unclear whether they count as publications or seeds. | Count only items with a public version. Show WIP under projects. |
| important | **Launch copy missing:** mission, featured findings, direction bodies and findings, and real text for inferred summaries. | PI writes it; templates need empty states. |
| important | **Contact and ownership.** `bobalab@berkeley.edu` is unverified, yet it is used as the Cloudflare account owner. The second org owner is unnamed. | Confirm the list's owners before launch, and name the co-owner. |
| important | **Policy items to settle before the public launch:**<br>- region gating (H-18);<br>- Use-of-Name sign-off for "Berkeley" (R4's claim that github.io needs "no approvals" has no source);<br>- public repo vs private drafts (H-5). | Make these explicit PI decisions, not defaults. |
| important | **Uploaded PDFs and slides** must meet WCAG 2.1 AA by 2027-04-26 [D: UCB-DAP]. The archive exception needs a dedicated archive area. | Prefer links to external copies. Add an accessibility checklist for uploads. Put any archive under a labelled archive section. |
| important | **Alumni.** The consent default for alumni already public on the PI site is undecided. End dates are missing (Kawamura's year is unresolved). Whether "Others" mentees count is open. | The PI sets the policy in H-11, and WP7 maps `classYear`→`end` year. |
| minor | Several smaller items:<br>- self-approval bottleneck [D: GH-SELF];<br>- Decap admin accessibility [U];<br>- time zones for "Upcoming" and date-only values;<br>- feed and sitemap files under `trailingSlash`;<br>- per-person edit rights not possible;<br>- Revert needs github.com;<br>- missing raw copies for award pages;<br>- one flat media folder. | See the orchestrator list. |
