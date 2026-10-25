# AUDIT-SYSTEM: why the BOBALAB design system reads as generic

Audit date 2026-10-24. Scope: `src/styles/*.css`, `src/components/**`, `src/app/**`, plus the live site https://bobalabx.github.io/bobalab-web/ at 1366×900, light mode, reduced motion. Research only: nothing in `src/`, `content/` or config was changed.

**Labels.** MEASURED = counted in the source or the rendered DOM, or seen in a screenshot. DOCUMENTED = stated in a repo document or a URL. HYPOTHESIS = my judgement.

**Method.**
- **Static pass:** PostCSS walked all 16 stylesheets (6,221 lines, 3,336 declarations) and tallied radius, type, colour variables, spacing, borders, shadows and motion.
- **Rendered pass:** Playwright opened 12 live pages (home, research, `ai-at-work`, projects, `learning-to-gig` project, publications, `deng-2025-learning-to-gig` paper, people, Park's profile, news, join, about). For each page it recorded every visible element's computed radius, border, background, font family, size and weight (counted by text characters), every `h2`, and the icons.
- **Annotated screenshots:** a red outline marks each rounded box wider than 120 px; a blue outline marks each bordered pill. **Both colours are my annotation, not the site's.** The shots are in `docs/redesign/before/audit-system-cards-{home,research,direction,projects,people,publications}-1366.jpg`. The scripts are kept outside the repo, in the session scratchpad (`redesign/tools/css-audit.js`, `dom-audit.js`, `layout-audit.js`).

Background (DOCUMENTED, `docs/research/research-brief.md` §C, `docs/DECISIONS.md`, `docs/design/JUDGE.md`):
- The token set came from brief §C1–C9. It has 3 radii, a flat elevation where "cards use a 1 px hairline border on surface", a Fraunces/Inter/Plex Mono trio, 8 tea swatches, and motion tokens.
- The judge and D-02a spent nearly all of their design effort on Fig. 1. The rest of the site got the brief's defaults as written.

---

## 0. Summary

The generic look does **not** come from shadows, gradients or stock imagery. The site has none of those. It comes from five structural defaults, each applied the same way on every page:

1. **The "bordered rounded box" is the main container.**
   - 21 CSS classes draw a 10 px-radius box with a 1 px border. On 6 of them the border is a hairline.
   - 65 such boxes render on the 12 pages. People has 25, Projects 17, Research 6. Of the 65, 52 come from just two classes: `.bl-card` and `.pp-card`.
   - The boxes are white (`--surface: #fff`) on cream (`--paper`). White boxes cover **35.8% of Projects, 32.4% of People and 22.8% of Join** by area. (MEASURED)
2. **Every list item starts with an outlined pill.**
   - 162 bordered pills render on 12 pages. 114 of them are `.bl-badge`: "Journal article", "Working paper", "Active", "Publication" and so on.
   - The site mixes three shape languages: 10 px boxes, 2 px buttons and full pills. (MEASURED)
3. **The serif is a garnish.**
   - Fraunces sets 4.2% of all rendered characters and Inter sets 91.1%.
   - Three Inter sizes (14, 17 and 20 px) carry **87.4%** of all text. 14 px alone carries **50.7%**.
   - Fraunces only ever appears at weight 600 (or 560/580 on the mission line). It never appears in italic, light weight or text sizes. (MEASURED)
4. **Colour is three inks.**
   - `--ink`, `--ink-muted` and `--accent` colour **99.3%** of rendered characters.
   - The 8-swatch tea palette appears almost only as 8–10 px dots. The one large coloured surface outside Fig. 1 is the direction-page band. (MEASURED)
5. **One page template and one section template are reimplemented about 11 times each.**
   - On 10 of 12 pages the `h1` sits at x = 107 px, 117–198 px from the top, at 52 px Fraunces 600, followed by a 20 px Inter lead.
   - Sections are stacked `h2` + hairline + grid or list, built from the "responsive card grid" snippet `repeat(auto-fill, minmax(min(100%, N rem), 1fr))` (11 instances, N = 15–20). (MEASURED)

**Highest-leverage changes** (§11):
- `--r-md` and `--r-pill`;
- `--surface`, plus the `.bl-card`/`.pp-card` border recipe;
- the `.bl-badge` treatment;
- the `h1`–`h3` rules in `base.css` (where the serif is used), together with `--fs-sm`;
- the two shared section-head patterns.

These are about 8 tokens and rules. Together they decide most of what a visitor sees outside Fig. 1.

**Highest-risk changes** (§12):
- colour hexes, which are tested to the exact hex in `palette.test.ts` and against axe colour contrast;
- fonts, which have 2.6 KiB of headroom in the 100 KiB budget;
- home hero geometry (`home.spec.ts` fold assertions);
- renaming component classes, which about 250 test lines select on.

---

## 1. Border radius

### 1.1 Tokens and declarations (MEASURED, source)
| Value | Declarations | Files | Used for |
|---|---|---|---|
| `var(--r-md)` = 10px | 27 | 10 | Every card or panel, the Fig. 1 plate, `pre`, images |
| `50%` | 19 | 5 | Pearls, dots, avatars, switch thumb |
| `var(--r-xs)` = 2px | 13 | 7 | Focus ring, CTA, materials buttons, inputs, selects, copy button, nav link, skip link |
| `var(--r-pill)` = 9999px | 11 | 6 | Badges, chips, year/jump links, disclosure summaries, switch track |
| `0 var(--r-xs) var(--r-xs) 0` | 1 | 1 | `.pub-status` (left-ruled callout) |

That is 4 tokens plus 50% across 71 declarations. The token discipline is good. The problem is the *choice* of values: 10 px card + 2 px button + full pill is the stock pairing of current component kits. Brief §C5 chose it ("r-md 10px cards, plate; r-pill chips, badges"; DOCUMENTED). (HYPOTHESIS: this mix is the single most "template" signal on the page.)

### 1.2 Rendered (MEASURED, 12 pages, 710 rounded elements)
- 290 circles (pearls, dots, avatars) = 40.8%
- 172 pills = 24.2%
- 167 at 2px = 23.5%
- 65 at 10px = 9.2%
- 16 at 50px = 2.3% (Fig. 1 and hero orbit rings)

### 1.3 Who draws a bordered, rounded box (MEASURED, source)

**21 classes** draw a 10 px box with a 1 px border:
- `.bl-card`, `.pp-card`, `.pg-panel`, `.pg-opp`, `.dr-work`, `.dr-rail__link`, `.dr-archived` (dashed), `.hm-soon`, `.hm-work`, `.hm-finding`, `.nw-upcoming`, `.nw-event`, `.nw-pager a`, `.pubs-panel`, `.pubs-empty` (dashed), `.pub-cite`, `.f1-plate`, `.prose pre`;
- the image frames `.dr-figure__img`, `.pj-hero__img` and `.pub-teaser__img`.

**2 more** draw the same box without a border, on `--paper-alt`: `.dr-wip` and `.dr-figure__shows`.

**At least 16 components render one:** `DirectionCard`, `ProjectCard`, `PeopleCard`, `OpportunityCard`, `LabFacts`, `TextPage`, `NewsRelated`, `join/page`, `WorkWithUs`, `DirectionRail`, `InProgressList`, `KeyFigure`, `HomeHero` (soon), `HomeSections` (finding, work), `UpcomingTalks`, `NewsPager`, `news/[slug]`, `PublicationsExplorer`, `CitationBlock`, `FigureIsland`/`PearlFigure`.

**Rendered on the 12 audited pages:** 65 boxes, not counting the Fig. 1 orbit rings.

| Class | Rendered | Where |
|---|---|---|
| `.bl-card` | 27 | Projects 17, Research 6, Project 3, Paper 1 |
| `.pp-card` | 25 | People |
| `.pg-opp` | 5 | Join |
| `.dr-rail__link` | 3 | Direction |
| `.f1-plate`, `.hm-work`, `.dr-wip`, `.pg-panel`, `.pub-section` (cite) | 1 each | Home, Home, Direction, About, Paper |

What I saw:
- `audit-system-cards-projects-1366.jpg`: 17 identical white boxes in a 3-up grid. Each opens with an "Active" pill, then a Fraunces title, then dots.
- `audit-system-cards-people-1366.jpg`: 25 white boxes in a 3-up grid, each with a 64 px avatar.

These two pages look most like a generated dashboard. The publication and news lists, which use ruled rows, look the most "academic" (`audit-system-cards-publications-1366.jpg`).

---

## 2. Pills, chips and badges

| Class | Shape | Role | Rendered (12 pages) |
|---|---|---|---|
| `.bl-badge` (+ `--strong`, `--accent`, `--solid`, `--draft`) | pill, 1 px `--rule` border, 13 px Inter 500, muted | Publication type, project status, news type, "Archived" | **114** (Publications 25, Projects 19, News 19, Person 13, Direction 10, Home 8, Project 8, Paper 5, Join 5, Research 2) |
| `.bl-chip` | pill, 44 px tall, `--surface` | Filters (projects, publications, people) | 20 |
| `.bl-switch__track` | pill | Footer "Reduce motion" | 12 (once per page) |
| `.pubs-jump__link`, `.nw-years a`, `.pg-jump a` | pill | Year and section jump links | 6 + 4 + 3 |
| `.pubs-toggle`, `.pubs-clear`, `.pubs-wip__summary`, `.pp-alumni__summary`, `.pp-disclosure__summary` | pill | Disclosure and toggle buttons | 1–2 each |
| `.dr-methods li` | pill on `--paper-alt` | Methods list | (not on the audited direction) |

All figures are MEASURED. **11 pill classes** exist in the CSS. On Publications (`audit-system-cards-publications-1366.jpg`) the left rail is a wall of 20 pills: 6 jump-to-year, 14 filter chips. Every entry also opens with a type pill, for 47 pills on that one page.

(HYPOTHESIS) The outlined type pill in front of every title is the most repeated "UI kit" mark on the site. An academic list would normally carry the type as plain text in the metadata line (for example, "Working paper · 2026"), not as a control-like capsule.

---

## 3. Repeating section pattern ("heading + subtitle + grid + see-all")

### 3.1 Section heads (MEASURED, source)
**11 separate implementations** draw the same thing, a Fraunces 600 `h2` with optional count, aside or link, a hairline and a body:
- `hm-sec-head` (`HomeSections.Section`)
- `dr-section__head` (`direction/Section`, used by direction, project and kit)
- `rs-block__head` (research)
- `pj-group` (projects)
- `pp-group__head` (people)
- `nw-year__head` (news)
- `pubs-year__h` (publications)
- `pub-section__h` (paper)
- `pg-section` (join, about, 404)
- `pp-section` (profile)
- `kit-section`

In use they produce **two visual variants**:
- **stacked:** `h2` above a hairline, as on home, research, projects, people, publications and join;
- **left label column:** a `14rem` (`.dr-section`) or `9rem` (`.nw-year`) label beside the body, as on direction, project and news.

### 3.2 Rendered (MEASURED)
- There are **58 `h2`s on 12 pages**. Each is Fraunces 600 at 25 px (`--fs-xl`) or 36 px (`--fs-2xl`), except the 13 px mono eyebrows used as `h2` on Publications (filters), Paper (facts) and About.
- Home has 4 sections after the hero. **3 of them** (Recent publications, Latest news, People) are exactly `h2` left + "All … →" right + list/grid. The 4th, "Work with us", is a bordered box. "What we've learned" did not render: there are no featured findings.
- The "text + →" link (`Icon name="arrow-right"`) appears **16 times in source across 12 files**: hero CTA, "All publications", "All news", "Meet the lab", "All 17 projects", "Projects by direction", "See all N in Publications" (direction and profile), "All directions", "Work with us", the 404 page, and every Fig. 1 label.

### 3.3 Grids (MEASURED, source)
- **11** `repeat(auto-fill|auto-fit, minmax(min(100%, N rem), 1fr))` grids, with N = 15–20 rem: `.rs-grid`, `.pp-grid`, `.pp-alumni__list`, `.pj-team__members`, `.hm-findings`, `.hm-people`, `.hm-work-grid`, `.dr-people`, `.dr-rail__list`, `.pub-facts`, and kit.
- **7** fixed `repeat(2, …)` grids.
- **0** asymmetric content grids outside the home hero, the label column and the publications sidebar.

(HYPOTHESIS) The auto-fill card grid is the canonical generated-layout snippet. Repeated on every index, it gives each page the same rhythm: title, then equal tiles.

---

## 4. Type

### 4.1 Families (MEASURED, rendered characters across 12 pages, 49,129 characters)
| Family | Share of characters | Where (source) |
|---|---|---|
| Inter | **91.1%** | body, nav, every list title (pub, news and person titles are Inter 600 20 px), metadata, buttons, chips |
| IBM Plex Mono | 4.7% | `--font-data` (40 declarations, 8 files): dates, counts, index numerals, eyebrows (`.t-eyebrow`, footer `h2`s, "DIRECTION 01"), DOI |
| Fraunces | 4.2% | `--font-display` (only 8 declarations, 5 files): `h1`–`h3` in `base.css`, `.bl-card__title`, `.t-display` mission, avatar initials, Fig. 1 caption title |

### 4.2 Fonts and their limits
- (DOCUMENTED, brief §C4; `src/fonts/index.ts`) Fraunces ships as the **wght-only** file. SOFT, WONK and opsz are fixed at their defaults.
- (MEASURED) `base.css` sets `font-optical-sizing: auto` on headings. The file has no opsz axis, so the setting does nothing.
- (MEASURED) The wordmark is outlined SVG built from a different Fraunces instance (SOFT 100, opsz 144, wght 680; `wordmark-geometry.ts`). So the logo and the headings are not the same cut.
- (HYPOTHESIS) "Fraunces or another soft display serif + Inter + a mono for labels" is a very common generator default trio. With Inter at 91%, the page reads as an Inter site with serif titles.

### 4.3 Sizes (MEASURED)
**Tokens:** 8 steps (`--fs-mono` 13, `--fs-sm` 14, `--fs-base` 17, `--fs-lg` 20, `--fs-xl` 25, `--fs-2xl` 28–36, `--fs-3xl` 36–52, `--fs-display` 40–60).

**Source declarations:**

| Token | Declarations |
|---|---|
| `--fs-sm` | 68 |
| `--fs-mono` | 31 |
| `--fs-lg` | 29 |
| `--fs-base` | 18 |
| `--fs-xl` | 11 |
| `--fs-2xl` | 4 |
| `--fs-3xl` | 1 |
| `--fs-display` | 1 |

There are also **13 off-scale values**:
- 0.75rem ×4, 0.8125rem ×3 (badge, preview, nav), 0.9375rem ×3, 1rem ×2;
- 5 one-off `clamp()`s (home mission and wordmark, `.pg-head__title--long`, `.pg-mission`), plus `min(var(--fs-3xl), 10.4vw)` on the direction `h1`.

**Rendered share of characters:**

| Style | Share |
|---|---|
| Inter 14 px | 50.7% |
| Inter 17 px | 23.3% |
| Inter 20 px | 13.4% |
| Plex Mono 13 px | 4.2% |
| Inter 13 px | 2.7% |
| Fraunces 25 px | 2.2% |
| Inter 15 px | 0.9% |
| Fraunces 36 px | 0.9% |
| Fraunces 52 px | 0.4% |

**Steps from 13 to 52 px:** ×1.08, ×1.21, ×1.18, ×1.25, ×1.44, ×1.44. Five sizes sit between 13 and 17 px (13, 14, 15, 16, 17), so the small end of the scale is crowded and the page has little typographic contrast below the `h1`.

**`h1`:** 52 px Fraunces 600 on all 11 non-home pages. On home the `h1` is the wordmark lockup.

### 4.4 Weights (MEASURED)
- Inter: 400 53.7%, 500 18.7%, 600 18.7%.
- Fraunces: 600 3.6%, 560/580 0.6%.
- Source: `font-weight: 600` ×52 and `500` ×45. Italic appears only in `cite` (venue).

### 4.5 Case and tracking (MEASURED)
- `text-transform: uppercase` ×9: eyebrows, footer `h2`s, preview ribbon, news and publication labels.
- `--tracking-mono` ×27. Mono uppercase tracked eyebrows ("DIRECTION 01", "JUMP TO YEAR", "SEARCH AND FILTER", the footer column heads) appear on the projects, publications and about pages and in the footer of every page. (HYPOTHESIS) The tracked mono uppercase eyebrow is another stock generator signature.

---

## 5. Colour

### 5.1 Token use in source (MEASURED, `var()` references)
**Core neutrals and accent, about 403 references:**

| Token | References |
|---|---|
| `--ink-muted` | 92 |
| `--ink` | 88 |
| `--hairline` | 63 |
| `--accent` | 44 |
| `--surface` | 30 |
| `--rule` | 26 |
| `--accent-strong` | 19 |
| `--paper-alt` | 13 |
| `--paper` | 9 |
| `--plate` | 5 |
| `--on-accent` | 5 |
| `--focus-ring` | 5 |
| `--pearl` | 4 |

**Direction roles, about 33 references:** `--dir-deep` 10, `--dir-light` 7, `--dir-text` 7, `--dir-dot` 3, `--dir-tint` 3, `--dir-band` 3.

So about 92% of colour references are the neutral/accent set.

Other counts:
- **0 raw hex values** outside `tokens.css`.
- **11 `color-mix()`** calls, all on direction tones (halo, glow, avatar ring).

### 5.2 Rendered (MEASURED)
**Text colour by characters:**
- `--ink` `rgb(31,23,18)`: 63.9%
- `--ink-muted`: 27.1%
- `--accent` `#8a4515`: 8.3%
- everything else: 0.7%

**Backgrounds by element:**
- `#ffffff` (`--surface`) is the most common painted background: 195 of 475 elements.
- The direction deeps follow at 17–45 elements each. Nearly all of those are the 10 px tag dots and 8 px bullets.

**Coloured surface area** (non-paper, non-white boxes over 40×40 px, footer excluded):
- Home: 13.9% (the Fig. 1 plate)
- Direction: 14.0% (the lychee band, 359 px tall)
- Paper: 10.5% (cite box and facts)
- every other page: ≤ 2.4%

**Full-bleed bands:** the only one besides the footer is the direction `.dr-band`.

### 5.3 Reading
The palette was designed with care. Every swatch pair is contrast-tested (brief §C3: ink on tint ≥ 13.68:1). Even so, the site shows it only as dots, so 10 of 12 pages are cream + white + brown ink. (HYPOTHESIS) "Warm off-white + one brown/terracotta accent + white cards" is itself a common generated palette. The tea swatches, which are the lab's distinctive asset, are almost invisible outside Fig. 1 and the direction band.

---

## 6. Spacing (MEASURED)

**Coverage:**
- 763 spacing values in `padding`, `margin` and `gap`.
- 176 of them are `0`.
- Of the 587 non-zero values, **443 (75.5%) use `--s-*` tokens**. About 144 are ad hoc (`0.5rem`, `0.6rem`, `0.45em`, `2px`, `6px`, …), mostly on control padding.

**Token distribution:**

| Token | Uses |
|---|---|
| `--s-1` | 33 |
| `--s-2` | 79 |
| `--s-3` | 76 |
| `--s-4` | 80 |
| `--s-5` | 74 |
| `--s-6` | 39 |
| `--s-7` | 35 |
| `--s-8` | 15 |
| `--s-9` | 1 (footer `margin-top`) |

The four middle steps (8–24 px) take 70% of tokenised spacing.

**Section rhythm:**
- `.dr-section` and `.pg-section` use `--s-7` (48 px).
- `.hm-sections` uses `--s-8` (64 px gap), or `--s-7` on mobile.
- Card padding is `--s-5` (24 px) everywhere (`.bl-card`, `.pg-panel`, `.pg-opp`, `.hm-finding`, `.nw-upcoming`, `.dr-work`).

**Reading:** spacing is uniform to a fault. Every card has the same padding and every section the same gap, and nothing on the page is spaced unusually tightly or unusually loosely. (HYPOTHESIS) Even rhythm with no contrast is part of why the pages feel machine-assembled.

---

## 7. Borders, rules and shadows (MEASURED)

**Border declarations:**

| Declaration | Count |
|---|---|
| `border: 1px solid var(--hairline)` | 22 |
| `border-top: 1px solid var(--hairline)` | 16 |
| `border-bottom: 1px solid var(--hairline)` | 15 |
| `border: 1px solid var(--rule)` | 15 (controls, pills) |

**Hairline rules:** 33 selectors draw horizontal ones. Examples are `.bl-pub`, `.bl-news`, `.dr-section`, `.pg-section`, `.pp-group__head`, `.pj-head` and `.pub-head`. The result is a rule above every section *and* a box around every item, so most items get two kinds of frame.

**Accent rules:** only 4 coloured ones exist:
- `.bl-direction-card` `border-top: 4px var(--dir-deep)`;
- two `border-left` rules in `--dir-text` (caption, `dr-band`);
- `.pub-status` `border-left: 3px var(--accent)`.

**Shadows:**
- **0 elevation shadows.** The 5 `box-shadow` or `filter` declarations are all rings or the morph blur.
- The site follows brief §C5 "flat" exactly. The generic feel comes from outlines, not depth.

---

## 8. Icons (MEASURED)
- `src/components/ui/icons.tsx` defines 16 inline icons: 24×24, 1.5 px stroke, `currentColor`, matching brief §C7.
- **Uses in source:**

| Icon | Uses |
|---|---|
| `arrow-right` | 16 |
| `external` | 5 |
| `chevron` | 4 |
| `search` | 2 |
| `rss` | 2 |
| `mail` | 2 |
| `filter` | 2 |
| `close` | 1 |
| `calendar` | 1 |

- **Rendered per page:** 2 on Projects up to 41 on Publications, where most are `external` and `file-pdf` icons inside the bordered 2 px "materials" buttons (PDF, SSRN, DOI).
- (HYPOTHESIS) The icon set is not itself generic. The "icon + label in a bordered 2 px box" row under every paper (`.bl-materials`) adds a third box type to every list entry.

---

## 9. Motion (MEASURED)

**Tokens:** `motion.css` defines them (all used, all behind the motion-last gate):
- 8 durations (100–420 ms);
- 4 easings (`--ease-out`, `--ease-emph`, `--ease-settle`, `--ease-in`);
- limits (`--lift-max` 3px, `--scale-max` 1.06, float 3px over 7–11 s).

**Where the motion is:**
- **Fig. 1 and view transitions:** 23 transition/animation declarations in `figure.css` and 32 in `motion.css`. Keyframes: `f1-sink`, `f1-float`, `f1-halo-in`, `f1-seed-in`, `bl-page-in/out`, `bl-fade`, `bl-slide`, `bl-via-blur`.
- **Everything else:** just **5 transitions**:
  - the arrow nudge on `.dr-arrow-link .bl-icon` and on `.hm-cta .bl-icon`;
  - the `.dr-rail__link` border colour;
  - two disclosure chevrons.
- Cards, chips, badges, list rows and nav have no hover motion, only colour or underline changes.

**Reading:** the "alive" personality the owner asked for (D-02) stops at the hero. (HYPOTHESIS) Below the fold the site behaves like a static template, which makes the generic components more noticeable.

---

## 10. Page templates: how much they differ (MEASURED)

**Page headers.** There are **11 header implementations**: `pg-head`, `rs-head` (research and projects), `pubs-head`, `pp-head`, `pj-head`, `pub-head`, `pp-profile__head`, `DirectionHeader` / `dr-band`, `pg-404__head`, `kit-head`, `hm-hero`. They produce 3 visual variants:
1. **Plain left `h1`:** 9 pages. `h1` at x = 107 px, y = 117–198 px, 52 px Fraunces 600, then a 20 px lead, then optional mono meta.
2. **Tinted band with hero pearl:** direction pages only. `h1` at x = 379.
3. **Home hero:** wordmark + mission + Fig. 1.

The person profile shifts the `h1` to x = 251 for the avatar.

**Main left edges.** The dominant left edge is 107 px on 10 of 12 pages. The two-column templates add a second edge:
- 435 px for the publications list (sidebar layout) and the paper page;
- 283 px for the news year column;
- 379 px for the direction and project label column.

**Body.** It always runs in the same 72rem container, with the same footer (`--paper-alt`, 300 px, 4 columns) and the same sticky 69 px header.

**Reading.** Templates differ in their *data*, not in their *form*. Apart from the direction band, no page has a structure of its own:
- no full-bleed section;
- no change of measure;
- no oversized number or figure;
- no image-led layout.

Projects, People, Research and Join are all title, lead, rule, then a card grid. (HYPOTHESIS) This sameness is what Prof. Park is responding to.

---

## 11. Leverage points: few changes, whole-site effect

Ranked by reach per edit. Every reach number is MEASURED from §1–§10. Every claim about the effect is a HYPOTHESIS.

| # | Change point | Reach | What changing it does |
|---|---|---|---|
| L1 | **`--r-md`** (tokens.css, 27 declarations) | 21 box classes, 65 rendered boxes, plate, images | Set it to 0–2 px, or keep 10 px only for the Fig. 1 plate, and the "SaaS card" signal goes away at once. One token, no markup change. |
| L2 | **`.bl-card` + `.pp-card` recipe** (`border: 1px hairline; background: --surface; padding: --s-5`) | 52 of 65 rendered boxes; 32–36% of the area of Projects and People | Replace the box with ruled rows or an index-card or table layout (no border, a top rule, generous left column). The publication list already does this and is the best-looking list on the site. |
| L3 | **`--surface: #fff`** (30 references) | 195 painted elements; the white-on-cream look | Make surfaces the same as `--paper`, or use a tea `tint` for emphasis only. The contrast for ink on every tint is already computed (≥ 13.68:1, brief §C3). |
| L4 | **`.bl-badge`** (1 rule, Badge.tsx) | 114 rendered pills on 10 of 12 pages | Render the type as plain text, or as small-caps or italic metadata in the meta line, instead of an outlined capsule. Keep the dashed draft badge distinct. This kills the most repeated kit mark. |
| L5 | **`--r-pill` + `.bl-chip`** | 11 pill classes, 48 rendered non-badge pills | Square or underlined filters (like tabs or index letters) remove the third shape language. |
| L6 | **`h1`–`h3` in `base.css` + `--font-display`** | Every heading on every page (8 `--font-display` declarations) | Let the serif carry more: list titles (`.bl-pub__title`, `.bl-news__title`, `.bl-person__name` are Inter 600 now), italics, a lighter display weight, a true display cut. This shifts 91% Inter towards a bookish voice. A font swap is budget-bound (§12 R2). |
| L7 | **`--fs-sm` (68 declarations) and the 13–17 px cluster** | 50.7% of all characters are 14 px | A clearer two-size text system (for example 17/15 with mono at 13) plus a much larger display step gives contrast and hierarchy. |
| L8 | **Two section-head patterns** (`hm-sec-head`, `dr-section__head`) | 11 implementations, 58 `h2`s | Converge on one distinctive section device, for example the left label column already used on direction, project and news, with a numbered mono label. Apply it everywhere instead of the "h2 + See all →" header. |
| L9 | **`--dir-tint` / `--dir-band` as surfaces** | Used today only by `.dr-band` and the Fig. 1 halo | Section bands, index tabs or year markers in the direction tint give the tea palette the role a brand colour should have. Contrast is pre-validated. |
| L10 | **Auto-fill grid snippet** (11 instances) | All index pages | One editorial grid (asymmetric 12-column with a label column, or a dense table) instead of equal tiles. |

**Smallest set with the biggest effect (HYPOTHESIS):**
- L1 and L3: two token edits.
- L4: one rule plus `Badge.tsx`.
- L2: two rules plus the `PeopleCard`/`ProjectCard` markup, keeping the class names.
- L6: base `h1`–`h3` plus 3 title rules.

That is about 8 places, and it changes every page except Fig. 1.

---

## 12. What is risky: tests and accessibility

### R1. Colour hexes (high risk)
- `tests/unit/foundation/palette.test.ts` asserts every light and dark token in `tokens.css` to the **exact hex** against the brief tables and `src/lib/content/palette.ts`. It also recomputes every contrast pair:
  - focus ring ≥ 3:1 on every surface;
  - hairline is *expected* to be below 3:1, because it is decorative;
  - every swatch text pair passes AA.
- `tests/unit/direction/model.test.ts` recomputes the dark band blends against `tokens.css`.
- `tests/e2e/a11y-sitewide.spec.ts` runs axe on all pages, light and dark, at 1366 and 390, including `color-contrast`.
- `tests/e2e/motion-and-colors.spec.ts` runs forced colours: zero axe violations and a visible focus outline.
- `tests/unit/cms/preview.test.ts` requires `public/admin/preview.css` to contain `--paper: #fcfaf6` and `--paper: #17110e` literally.
- **Any palette change** must update `palette.ts`, the brief §C2 tables mirrored in the test, and the regenerated CMS preview, together.

### R2. Fonts (high risk)
- Preloaded fonts must stay ≤ 100 KiB. This is checked by `tests/e2e/kit.spec.ts` ("preloaded fonts total ≤ 100 KiB") and `scripts/perf/asset-budget.mjs` (`fontsBytes`).
- Current use is 36,620 + 48,256 + 14,888 bytes, about 97.4 KiB, so the headroom is **about 2.6 KiB** (DOCUMENTED, `src/fonts/index.ts`, brief §C4).
- Adding a fourth family, or the full Fraunces file (118.2 KiB), fails the budget. A swap must *replace* a file.
- `scripts/cms/build-config.mjs` copies `src/fonts/*` into the CMS admin, so a swap must re-run `npm run cms:config`.
- The wordmark is outlined geometry, so it does not change with the font. A new heading face would therefore no longer match the logo.

### R3. Home hero geometry (high risk)
`tests/e2e/home.spec.ts` asserts:
- the Fig. 1 plate bottom ≤ 768 at 1366×768;
- the plate top ≤ 380 (768-tall viewport) or ≤ 420 (otherwise);
- the wordmark's left edge equals the header's within 1 px;
- the wordmark and mission top lines are within 12 px;
- no horizontal scroll at 320 and 390;
- the last `.hm-people` row has `border-bottom: 0`.

Bigger headings, more spacing or a taller header in the hero will break these tests. `tests/e2e/figure.spec.ts` (33 class references) also asserts inactive-state opacities, focus `outlineStyle`, `view-transition-name`s and `--f1-mode`.

### R4. Header and reflow (medium risk)
- `tests/e2e/foundation.spec.ts` checks:
  - the header at 320, 360 and 390 px is one brand row plus one nav row (measured height), with no horizontal scroll;
  - WCAG 1.4.12 text spacing at 320;
  - view-transition z-order.
- `a11y-sitewide` checks reflow at 320 px on every page.
- `kit.spec.ts` checks 320 and 375.
- Larger nav type or a new header layout must keep 44 px targets and the two-row phone header.

### R5. Class names as test hooks (medium risk; restyle, do not rename)
About 250 test lines select on component classes:

| Spec | Class-selector lines |
|---|---|
| `people.spec.ts` | 36 |
| `figure.spec.ts` | 33 |
| `publications.spec.ts` | 32 |
| `news.spec.ts` | 30 |
| `research.spec.ts` | 27 |
| `projects.spec.ts` | 21 |
| `home.spec.ts` | 12 |
| `pages.spec.ts` | 10 |
| `foundation.spec.ts` | 4 |

Most frequent selectors:
- `.f1-plate` 22, `.f1-item` 10, `.f1-pearl` 9;
- `.pj-group` 7, `.bl-badge--draft` 7;
- `.pp-alum` 6, `.dr-band` 6;
- `.pubs-layout` 5, `.nw-related` 5, `.bl-pub` 5, `.bl-badge` 5.

Also used: `.pp-card` (count and names), `.pp-grid--lead` (bounding box), `.bl-card__title`, `.bl-news`, `.nw-year`, `.nw-upcoming`, `.dr-section`, `.pg-head__meta`, `.pg-opp`.

Turning `.pp-card` boxes into rows is safe **if the class and element stay**. Removing or renaming them breaks the counts.

### R6. Badge CSS asserted in source (low risk, easy to trip)
`tests/unit/foundation/verify-fixes.test.tsx` checks that:
- `DraftBadge` renders the exact markup `<span class="bl-badge bl-badge--draft">…`;
- the `.bl-badge { }` block in `components.css` has `max-width: 100%` and **no** `white-space: nowrap`;
- `.bl-draft-line` has `margin-top: var(--s-2)`.

A badge restyle (L4) must keep these declarations in that rule block, or the test must change on purpose.

### R7. CMS preview mirror (low risk, but it fails CI)
- `public/admin/preview.css` is generated from `tokens.css`, `base.css`, `prose.css` and `components.css` (`scripts/cms/build-config.mjs`, `STYLE_SOURCES`).
- `npm run cms:check` fails when it is stale.
- `preview.test.ts` requires `.bl-news`, `.bl-person`, `.bl-pub`, `.bl-badge--draft` and `.prose` to exist.

### R8. Motion (medium risk)
`motion-and-colors.spec.ts` asserts that under reduced motion or the toggle nothing loops or moves, and view transitions take ≤ 120 ms. It also asserts that anything that loops can be paused (WCAG 2.2.2). Any new hover or scroll motion outside Fig. 1 must sit inside the motion-last gate (`@media (prefers-reduced-motion: no-preference) { :root:not([data-motion="reduce"]) … }`). It must also respect D-02's limits: transform/opacity only, lift ≤ 3 px, scale ≤ 1.06.

### R9. Accessibility traps in the "less boxy" direction (HYPOTHESIS, based on WCAG)
- **Control boundaries.** Removing borders from *controls* (chips, inputs, selects, materials buttons) breaks WCAG 1.4.11 unless another ≥ 3:1 indicator replaces them. `--hairline` is 1.54:1, so it can never be a control boundary. Content cards can lose their borders safely; controls cannot.
- **Click target.** Whole-card click uses `.bl-card--link .bl-card__title a::after { inset: 0 }`. A row layout must keep a single link and the `:has(:focus-visible)` outline.
- **Target size.** Chips are 44 px tall (`min-height: 2.75rem`). Squarer filters must keep 24×24 minimum (2.5.8) and the existing 44 px.
- **Colour alone.** Tag colour must never carry meaning alone (1.4.1). Keep the label next to every dot or tint.

---

## 13. Appendix: raw numbers
- **CSS:** 16 files, 6,221 lines, 3,336 declarations. Tailwind is imported, but **0 Tailwind utilities** appear in 730 `className` attributes. All styling is hand-written prefixed BEM (`bl-` 129, `pp-` 85, `pub(s)-` 139, `dr-` 70, `pg-` 53, `pj-` 44, `hm-` 39, `nw-` 37, `rs-` 25 class uses), so a token change propagates cleanly.
- **Rendered elements per page:** 156 (About) to 1,018 (Publications).
- **Page heights at 1366:** 1,570 (About) to 5,990 px (Publications).
- **Line heights:** 18 distinct values (9 tokens; ad hoc 1, 1.15, 1.16, 1.2, 1.3 ×6, 1.35, 1.4 ×3, 1.55).
- **Letter spacing:** 8 distinct values.
- **Not measured:** dark mode and mobile layouts (the existing `before/*-dark.jpg` and `identity-home-mobile-390.png` cover them visually); hover and focus states beyond the source.
