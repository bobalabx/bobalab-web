# P0 "Control": mapping onto the live site (DIRECTION.md §5.0, RC-22)

P0 is a restyle of the existing components, not a new system. Every class name below is the live one unless the "Prototype class" column says otherwise. The rule is AUDIT-SYSTEM R5: **restyle, don't rename**. Tokens (`src/styles/tokens.css`), fonts (`src/fonts/*`) and the Fig. 1 slot geometry (`src/lib/figure/templates.ts`, `seeds.ts`) are unchanged, so `palette.test.ts`, `misc.test.ts`, the `kit.spec.ts` font budget and `preview.test.ts`'s `--paper` literals keep passing.

Test files are under `tests/`. "Breaks" means an assertion that encodes the chrome P0 removes; those assertions change on purpose, not by accident.

## Global

| Prototype component | Live component → classes it restyles | Tests that select on it | What changes for the tests |
|---|---|---|---|
| Tokens, light/dark | `src/styles/tokens.css` (all hexes verbatim) | `unit/foundation/palette.test.ts`, `unit/cms/preview.test.ts`, `e2e/a11y-sitewide.spec.ts` | None. One new role, `--pearl-edge` (dark = `--rule` `#8a7766`), replaces `--pearl-rim`/glow; `--dir-mark` aliases `--dir-deep`/`--dir-light`. Add both to the palette table if adopted |
| Header | `SiteHeader` → `.bl-header`, `.bl-header__brand`, `.bl-header__name`, `.bl-nav__link[aria-current]`; `PearlMark` → `.bl-pearlmark` | `e2e/foundation.spec.ts` (two-row phone header, sticky, VT z-order) | Markup identical. `PearlMark` loses the crescent `<path>` (gloss). Prototype nav lists the prototype's pages; the live five items stay |
| Footer | `SiteFooter` → `.bl-footer`, `.bl-footer__grid`, `.bl-footer__base` | `e2e/motion-and-colors.spec.ts` ("footer switch on every page") | `.bl-footer h2` becomes Inter 600 sentence case (no mono caps). "Site maintained by the lab." dropped |
| Reduce-motion control | `MotionToggle` → `.bl-switch` (`role="switch"`, `aria-checked`, pill track) | `e2e/kit.spec.ts:100–114`, `e2e/figure.spec.ts:169`, `e2e/motion-and-colors.spec.ts:227–253` | Becomes a text `<button aria-pressed>` per §5.0. Those tests query `getByRole("switch")` + `aria-checked` and must move to `getByRole("button", { name: /Reduce motion/ })` + `aria-pressed` (or the port keeps `role="switch"` on the text button, which is also valid). `.bl-switch__track`/`__thumb` are deleted |
| Pills | `Badge` → `.bl-badge` (+ `--strong`, `--accent`, `--solid`) | `unit/foundation/verify-fixes.test.tsx`, `e2e/{home,figure,news,pages,people,projects}.spec.ts`, `unit/cms/preview.test.ts` | Type and status badges render as plain text (`.bl-pub__kind`, "Completed" in the meta line); "Active" is never rendered. **Keep `.bl-badge--draft`** (drafts are an editorial state, D-03) but restyle it as dashed-underlined text; the `.bl-badge {}` block keeps `max-width: 100%` and no `nowrap`, so `verify-fixes.test.tsx` passes. Assertions that count `.bl-badge` per row break |
| Material buttons | `MaterialsRow` → `.bl-materials a` | `e2e/publications.spec.ts` | Same 2 px bordered buttons (AUDIT P6: the academic convention), icons removed. Selectors unchanged |
| Direction tags | `PearlTag` → `.bl-tag`, `.bl-dot`, `.bl-tags` | many | Unchanged |
| Link arrows | `Icon name="arrow-right"` in `hm-cta`, `.f1-arr`, `.dr-arrow-link`, `.dr-back__icon`, "All X →" links | `e2e/home.spec.ts:53` (`Explore our research`) | Icons removed everywhere; ≤ 1 "→" per page (P0 uses 0). The home CTA is replaced by the legend sentence `.hm-legend` (prototype class), so `home.spec.ts:53` is rewritten to target `.hm-legend a` |

## Home (`/`)

| Prototype component | Live component → classes | Tests | Change |
|---|---|---|---|
| Hero | `HomeHero` → `.hm-hero`, `.hm-id`, `.hm-ident`, `.hm-h1`, `.hm-wm`, `.hm-desc`, `.hm-aff`, `.hm-mission` | `e2e/home.spec.ts` (wordmark left edge = header edge; wordmark/mission top lines within 12 px; plate bottom ≤ 768 at 1366×768) | Layout and grid identical (5fr / 7fr at ≥ 78em, figure bleeds ≤ 8rem). `.hm-cta` removed; `.hm-legend` (new class) holds the four direction links and is hidden below 46em. The plate bottom moves *up* (no plate padding, no h2), so the fold assertion has more slack |
| Fig. 1 plate | `PearlFigure` → `.f1`, `.f1-plate`, `.f1-list`, `.f1-item[data-slug][data-swatch]`, `.f1-link`, `.f1-group`, `.f1-pearl`, `.f1-orbit`, `.f1-ring`, `.f1-seeds`, `.f1-seed`, `.f1-label`, `.f1-lt`, `.f1-count` | `e2e/figure.spec.ts` (33 selector lines), `e2e/home.spec.ts`, `e2e/foundation.spec.ts`, `e2e/a11y-sitewide.spec.ts`, `visual/home.visual.ts` | Same tree and slot geometry. Removed: `.f1-plate` background, border, radius and `::after` crop marks; `.f1-halo`; `.f1-pearl::before` sheen and `::after` glow; `.f1-idx` numerals; `.f1-arr`; `.f1-pause`; `.f1-h` (now visually hidden). Seeds gain `data-p="{paper slug}"` and are ordered oldest → newest along the arc. **Breaks on purpose:** `figure.spec.ts:65` (numerals), the halo opacity check (`:334`), the Pause tests (`:90`, `:148`, `:195`, `home.spec.ts:136`), and `[data-live]` waits (`figure.spec.ts:18`, `foundation.spec.ts:53`), which should wait for the island's new marker instead |
| Caption | `.f1-cap`, `.f1-cap-layer[data-cap]`, `.f1-cap-t`, `.f1-cap-fig`, `.f1-cap-b` | `e2e/figure.spec.ts` | Moved *under* the figure (`<figcaption>` after the list). New layer `data-cap="seed"` for paper names. Live caption swap timings unchanged |
| Key | `.f1-foot`, `.f1-key`, `.f1-key-dot` | — | Text changes ("= 1 paper; order within a year is not meaningful. Counts as of …"); no "or a documented talk" (see NOTES) |
| Morph | `<ViewTransition name="pearl-{slug}" share="pearl-morph">` in `parts.tsx`; `src/styles/motion.css` | `e2e/figure.spec.ts:70–276`, `e2e/research.spec.ts:252–270`, `e2e/foundation.spec.ts:68`, `e2e/motion-and-colors.spec.ts` | The prototype uses one name, `pearl`, set on the clicked pearl only, with `document.startViewTransition` around a fetched-page swap. **In the port keep the live `pearl-{slug}` names and React `<ViewTransition>`**; only drop the 3 px `bl-via-blur` and land on the settle curve. Tests keep passing |
| Recent publications | `HomeSections` → `.hm-sec`, `.hm-sec-head`, `.hm-list`, `.hm-rows`, `.bl-pub` | `e2e/home.spec.ts` | `.hm-more` ("All publications →") removed from the head; a plain "All publications" link (`.hm-sec-foot`, new) closes the list |
| News | `.bl-news`, `.bl-news__date`, `.bl-news__title` | `e2e/news.spec.ts` | Date in Inter tabular (not mono), no type pill; dated-log grid at ≥ 48rem |
| People strip, "Work with us", meniscus | `.hm-people`, `.hm-work`, `.hm-meniscus` | `e2e/home.spec.ts` (`.hm-people` last-row border) | Not mocked in P0 (task asked for one or two home sections). If kept: `.hm-work` loses its box (§5.4 item 2) |

## Direction page (`/research/{slug}/`)

| Prototype component | Live component → classes | Tests | Change |
|---|---|---|---|
| Band | `DirectionHeader` → `.dr-band`, `.dr-band__inner`, `.dr-band__top`, `.dr-crumbs`, `.dr-hero`, `.dr-hero__pearl`, `.dr-hero__text`, `.dr-title`, `.dr-question`, `.dr-status` | `e2e/research.spec.ts` (27 lines; `:222` already expects 0 `.f1-idx`) | Same band and grid. `.dr-status` becomes a sentence ("4 projects, 4 papers and 1 in progress. Shares papers with …") in Inter, not a mono "·" string. `.dr-back` ("← All directions") removed; the breadcrumb does the job. New `.dr-seedtag` line names the paper of a hovered dot |
| Hero pearl | `DirectionPearl` → `.f1-dp.f1-dp--hero` (`[data-bloom]`) | `e2e/research.spec.ts`, `e2e/figure.spec.ts` | Flat; seeds carry `data-p` and light when their paper row is hovered or focused |
| Sections | `Section` → `.dr-section`, `.dr-section__head`, `.dr-section__title`, `.dr-section__body`, `.dr-prose` | `e2e/research.spec.ts`, `e2e/projects.spec.ts` | One rule per section: the first row of a list inside a section loses its own top rule |
| Why it matters | `.dr-prose` (direction body) | `unit/direction/*` | Opens with the `summary` field as `.dr-lede`; "This direction collects / gathers …" and "listed by title only" sentences are cut (content edit, PI sign-off) |
| Papers | `.dr-pubs` + `PublicationEntry` | `e2e/research.spec.ts` | As the ledger row below |
| In progress | `InProgressList` → `.dr-wip`, `.dr-wip__list`, `.dr-wip__title`, `.dr-wip__note` | `e2e/research.spec.ts` | `.dr-wip` loses its `--paper-alt` rounded box; `.dr-wip__status` pill removed |
| Projects | `DirectionProjects` → `.dr-projects`, `.dr-project`, `.dr-project__title`, `.dr-project__summary` | `e2e/research.spec.ts`, `e2e/projects.spec.ts` | Ledger rows with right-aligned "2 papers, 3 people"; "Completed" only when true; no-summary projects are one line. `.dr-project__dot` removed |
| Other directions | `DirectionRail` → `.dr-rail__list`, `.dr-rail__link`, `.dr-rail__title`, `.dr-rail__count`, `.f1-dp--rail` | `e2e/research.spec.ts` | `.dr-rail__link` loses the 10 px box; count adds "N shared with …" |
| People (new on this page) | reuses `.pj-team__members` / `.pj-member` from the project page | `e2e/projects.spec.ts` | Optional; derived from `projects/*.team` |

## Publications (`/publications/`)

| Prototype component | Live component → classes | Tests | Change |
|---|---|---|---|
| Layout | `PublicationsExplorer` → `.pubs`, `.pubs-layout`, `.pubs-aside`, `.pubs-filters`, `.pubs-search`, `.pubs-input`, `.pubs-label`, `.pubs-results`, `.pubs-groups`, `.pubs-year`, `.pubs-year__head`, `.pubs-year__h`, `.pubs-year__count`, `.pubs-list` | `e2e/publications.spec.ts` (32 lines), `unit/publications/static-list.test.tsx` | Same structure. The "JUMP TO YEAR" / "SEARCH AND FILTER" mono h2s become sentence-case labels |
| Filters | `FilterChips` → `.bl-chip[aria-pressed]` | `e2e/publications.spec.ts`, `e2e/people.spec.ts`, `e2e/projects.spec.ts`, `unit/people-page/render.test.tsx` | **Semantics kept** (`<button aria-pressed>`, 44 px row pitch on touch via the list). Pill border and fill removed: pressed = ink + 2 px ink underline, unpressed = muted + 1 px `--rule` underline (4.31:1, the 1.4.11 boundary). Count moves out of mono (`.bl-chip__n`, Inter tabular) |
| Year jump | `.pubs-jump`, `.pubs-jump__link` | — | Plain underlined years, not pills |
| Mobile disclosure | `.pubs-toggle` | `unit/publications/static-list.test.tsx` | Text button "Search and filter" with `aria-expanded`; first title at y ≈ 530 at 390×844 |
| Ledger row | `PublicationEntry` → `.bl-pub`, `.bl-pub__title`, `.bl-pub__authors`, `.bl-pub__author--lab`, `.bl-pub__venue`, `.bl-tags`, `.bl-materials` | `e2e/publications.spec.ts`, `e2e/people.spec.ts`, `unit/cms/preview.test.ts`, `unit/wp8/change-requests.test.tsx` | Type badge → `.bl-pub__kind` text ("Working paper, 2026"). `.bl-pub__status` folds into the venue line without "as of … · reported by the lab". `in_brief` added as `.bl-pub__brief` (2-line clamp). Award count joins the venue line. **Breaks on purpose:** `publications.spec.ts:254–300` ("reported by the lab" inline) and `unit/publications/provenance.test.ts`; replace with one footnote `.pubs-foot` |
| Work in progress | `WorkInProgress` → `.pubs-wip`, `.pubs-wip__details`, `.pubs-wip__summary` | `e2e/publications.spec.ts` | Shown open as a plain list; the pill `<summary>` is gone |

## Project page (`/projects/{slug}/`)

| Prototype component | Live component → classes | Tests | Change |
|---|---|---|---|
| Head | `.pj-page`, `.pj-crumbs`, `.pj-head`, `.pj-title`, `.pj-summary`, `.pj-facts` | `e2e/projects.spec.ts` | `.pj-head__eyebrow` ("● PROJECT") removed; "Active" badge removed; `.pj-facts` becomes a four-column `<dl>` |
| The question | new `.pj-quote` | — | Uses the linked paper's `in_brief` (adapted to a question, with a source line). Port as an optional field or derive only when the PI approves the wording |
| Team | `TeamList` → `.pj-team`, `.pj-team__members`, `.pj-member`, `.pj-member__name`, `.pj-member__text`; initials via `.bl-pearl` | `e2e/projects.spec.ts` | `.bl-pearl` initials disc is flat (no gloss); same markup |
| Papers / Related projects | `.dr-pubs`, `.bl-pub`; `.rs-grid--projects` + `ProjectCard` (`.bl-card`) | `e2e/projects.spec.ts`, `e2e/research.spec.ts`, `unit/people-page/render.test.tsx` | Related projects become `.dr-project` rows instead of `.bl-card` boxes. Tests counting `.bl-card` / `.bl-card__title` on this page must count `.dr-project__title` |
| Timeline | `.pj-news` + `.bl-news` | `e2e/news.spec.ts` | A dated log built from the project's news items and paper year |

## Paper page (`/publications/{slug}/`)

| Prototype component | Live component → classes | Tests | Change |
|---|---|---|---|
| Head | `.pub-head`, `.pub-title`, `.pub-authors`, `.pub-venue` | `e2e/publications.spec.ts` | `.pub-eyebrow` (mono breadcrumb) → plain breadcrumb |
| Facts rail | `.pub-facts`, `.pub-fact`, `.pub-fact__h`, `.pub-doi` | `e2e/publications.spec.ts` | Mono caps headings → Inter 600 sentence case; DOI stays mono (`.doi`) |
| In brief | `.pub-brief` | — | Unchanged |
| Study-design plate | new `.plate`, `.plate-svg`, `.plate-cap` | — | Requested for every prototype by the task; §5.4 says P0 has none. Render only from the optional `figure` object with `pi_verified: true` (DIRECTION §5.0a) |
| Awards | `.pub-awards`, `.pub-award*` | `e2e/publications.spec.ts` | Collapsed into a `<details>` "7 awards, 2021 to 2023"; the ring `::before` disc is removed (RC-8) |
| Cite | `CitationBlock` → `.pub-cite`, `.pub-cite__label`, `.pub-cite__text`, `.pub-bib`, `.pub-bib__bar`, `.pub-bib__pre`, `.pub-copy` | `e2e/publications.spec.ts` | `.pub-cite` box removed; `pre` keeps a 2 px radius; Copy button is outlined, not accent-filled |
| Related | `.pub-related`, `.pub-cards` (`.bl-card`) | `e2e/publications.spec.ts` | Ledger rows |

## Not mocked in P0

People, News index, Join, About and the 404 template. The same rules apply: `.pp-card` boxes become rows **without renaming the class** (people.spec counts them), `.pg-opp` loses "Status not confirmed", `.pg-panel` ("At a glance") is deleted.
