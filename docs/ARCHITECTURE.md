# Architecture (WP0 foundation)

How the BOBALAB site is put together, and the contracts other packages build on. The design spec is `docs/research/research-brief.md`; binding decisions are in `docs/DECISIONS.md` (they win).

## 1. Shape

- **Next.js 16.4.2, App Router, `output: "export"`** → plain static HTML in `out/` for GitHub Pages. `trailingSlash: true`, `images.unoptimized`, `basePath` from `NEXT_PUBLIC_BASE_PATH`. No Cache Components, no Partial Prefetching, no Turbopack loader rules (H-13).
- **React 19.3.1**, TypeScript 6.0.3 (strict + `noUncheckedIndexedAccess`), Tailwind 4.3.3 through `@tailwindcss/postcss`.
- **Content** is Markdown/YAML in `content/` (Decap CMS writes it), read at build time by `src/lib/content/load.ts`. Pages are server components; client JS is limited to small islands.
- Every page works without JavaScript.

```
content/ ──read.ts (disk)──parse.ts (pure)──► RawContent ──validate.ts + links.ts──► issues (npm run validate)
                                                  │
                                                  └──build.ts (pure: draft filter, derived data)──► Content
                                                      (load.ts adds the disk read and the cache)        │
                                         src/components/views/* (one synchronous view per page) ◄───────┘
                                              │                                   │
                              routes in src/app/** (thin)       /editor-preview/ in the editor's live column (§10)
```

## 2. Layout contract (`src/app/layout.tsx`, WP0)

- `<html lang="en" suppressHydrationWarning>` carries the font variables. `data-motion="reduce"` and (first home view of the session; the homepage pearls, D-15) `data-cup-intro` are set pre-paint by `PrePaintScript` (inline `<head>` script).
- `<body>`: `SkipLink` → `PreviewRibbon` (preview builds only) → `SiteHeader` → **`<main id="main" tabIndex={-1}>{children}</main>`** → `SiteFooter` → `RouteFocus`.
- **Pages must not render their own `<main>`.** Each page renders exactly one `<h1 tabIndex={-1}>`; `RouteFocus` focuses it after client-side navigation (not on first load).
- Metadata: root `title.template` is `"%s · BOBALAB"`; pages call `pageMetadata({ title, description, path })` from `src/lib/seo/metadata.ts`. `metadataBase` = `NEXT_PUBLIC_SITE_URL` → `site.site_url` → `https://bobalab-berkeley.github.io`, plus the base path.
- CSP `<meta>` is emitted in production builds only (dev needs eval/websockets): `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`.
- The build moves the CSP `<meta>` to directly after `<meta charset>` (`hoistCsp` in scripts/build.mjs), because Next emits layout `<head>` children after its hoisted resources and a meta policy only governs what follows it; `scripts/perf/export-check.mjs` fails if it is not there. `script-src 'unsafe-inline'` remains (Next's no-nonce static output), so the policy mainly blocks off-origin loads. The build also deletes `out/kit/` (unless `NEXT_PUBLIC_KIT=1`) and every `out/**/_none/` placeholder, which would otherwise ship as blank not-found shells with status 200 (`pruneExport`).

## 3. Content layer (`src/lib/content/**`)

| File            | Role                                                                                                                                                                                                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts`     | zod schemas (brief §F3 + D-03…D-06). Structural only; strict objects (unknown keys fail). Exports enums, `COLLECTION_ROUTES`, `SLUG_PATTERNS`, types.                                                                                                                                                                         |
| `read.ts`       | Disk → virtual files (`readContentFiles`, `contentDir`); re-exports `parse.ts`.                                                                                                                                                                                                                                               |
| `parse.ts`      | Pure (no `fs`; safe in the browser): `parseContentFiles` (virtual files → parsed entries), `splitFrontMatter`, and `parseFileData(path, text)`, the data before the schema (the shape Decap loads into its form). YAML 1.2 core schema: dates stay strings.                                                                   |
| `load.ts`       | `getContent()` (memoised except in `next dev`), `isPreview()`; re-exports `build.ts`.                                                                                                                                                                                                                                         |
| `build.ts`      | Pure: `buildContent(raw, {preview, today?})` → `Content` and every `*View` type. Throws `ContentError` on YAML/schema errors so a broken file fails the build. The editor's live column runs it in the browser (§10).                                                                                                         |
| `validate.ts`   | Content rules (what the deploy and the editor's site check refuse); every code below. `validateContent(raw, {today?, origins?})`; re-exports `hasLivePage`.                                                                                                                                                                   |
| `links.ts`      | `hasLivePage` (which entries have a page on the live site) and `hiddenLinkIssues` (E_LINK_HIDDEN), called from `validateContent`.                                                                                                                                                                                             |
| `copy-rules.ts` | `copyRuleIssues(raw, content)`: the home-copy rules (E_HOME_QUESTION, E_HOME_WHY_LONG, E_HERO_LONG). `tests/content/simplify-copy.test.ts` asserts it returns nothing for the real content; the editor's site check runs it too.                                                                                              |
| `relations.ts`  | Relation map; D-05 counting (`hasPublicVersion`, `countsAsPublication`); `isLabWork`.                                                                                                                                                                                                                                         |
| `directions.ts` | D-04 ordering from `site.direction_order`.                                                                                                                                                                                                                                                                                    |
| `people.ts`     | Alumni derivation, consent gating (`toPublicPerson`), role order/labels, grouping.                                                                                                                                                                                                                                            |
| `dates.ts`      | Formatting ("Oct 20, 2026") without locale/TZ dependence; "today" in America/Los_Angeles; `BUILD_DATE` env pins it.                                                                                                                                                                                                           |
| `markdoc.ts`    | Markdown → React/HTML; raw HTML escaped, h1 demoted, external `rel`.                                                                                                                                                                                                                                                          |
| `palette.ts`    | Colour tokens + swatches + WCAG maths (mirror of `tokens.css`, unit-tested).                                                                                                                                                                                                                                                  |
| `queries.ts`    | Page-level queries over `Content`: `directionDetail`, `projectDetail`, `publicationDetail`, `personDetail`, `newsDetail` (prev/next), `featuredFindings`/`resolveFindings`, `currentPeople`, `openOpportunities`, `upcomingNews`, `groupByYear`, `directionsOf`, and `staticParams`/`staticSlugs` for `generateStaticParams`. |

### Dynamic routes: never return `[]` from `generateStaticParams` (MEASURED)

With `output: "export"`, Next 16.4.2 **fails the build** when `generateStaticParams()` returns an empty array ("at least one route must be generated"; probed 2026-10-20). The production build currently has **0 non-draft directions** (D-03/D-04), so `/research/[direction]/` would break `npm run build`. Every dynamic route must therefore use:

```ts
export const dynamicParams = false;
export function generateStaticParams() {
  return staticParams("direction", staticSlugs.directions(getContent()));
}
// page: const d = directionDetail(getContent(), slug); if (!d) notFound();
```

`staticParams` emits the placeholder `EMPTY_PARAM` (`"_none"`, never a valid content slug) when the list is empty; the `*Detail` queries return `undefined` for it, so the page calls `notFound()` and the export writes a noindex not-found page at e.g. `out/research/_none/`. WP8: keep `_none` paths out of the sitemap and the link check.

### Redirect stubs (D-05)

`scripts/content/write-redirects.mjs` runs inside `npm run build` / `build:preview` after `next build`: for each `site.yml → redirects[] {from, to}` it writes `out/<from>/index.html` (meta refresh, `rel=canonical`, `noindex`, plain link), base-path aware, never overwriting an exported page. `next dev` has no stubs, so `next.config.ts` gives it the same list as dev-only `redirects()` (307, read from site.yml at start; absent from builds). `content/.published-slugs.json` is **not** updated by the build (a build should not modify tracked content); run `npm run slugs:record` when publishing.

### Modes (D-03)

| Command                                      | Drafts                               | Ribbon |
| -------------------------------------------- | ------------------------------------ | ------ |
| `npm run dev` (NODE_ENV=development)         | included (unless `INCLUDE_DRAFTS=0`) | yes    |
| `npm run build:preview` (`INCLUDE_DRAFTS=1`) | included                             | yes    |
| `npm run build`                              | **excluded**                         | no     |

Draft items render `<DraftBadge>` ("Not visible on the live site"); components do this automatically from `item.draft`. The editor shows `draft` the other way round, as **Visible on the website: Yes / No** (Yes = `draft: false`), with the `visible` widget of `public/admin/cms-widgets.js` (D-21); the stored field, the build and the validator are unchanged.

### Derived data (all computed at build)

- **Directions**: `content.directions` = live (non-archived) directions in `site.direction_order`; missing ones appended (sorted by slug). `index` 1…N. `counts.papers` (D-05 counted publications), `counts.projects` (non-archived), `counts.inProgress`; `openToRAs` = an open/rolling `students` opportunity lists the direction. Archived → `content.archivedDirections` (index null), page still exists.
- **Publications**: `counted` = DOI / SSRN / arXiv / PDF / publisher link, or a presentation with an evidence `url`. `content.countedPublications` (lists, seeds) vs `content.inProgress`. `labWork` = a non-PI lab person is an author. `authorList[].person` only for **listed** people.
- **People**: `content.people` = listed people only, consent-gated (`photo`, `email`, `now_at` removed unless the flag is true), `isAlumni` from `end` (a `YYYY` end is current through Dec 31), `hasProfile` (PI always). Unlisted people are never returned by `getPerson()`.
- **Projects**: `visibleCollaborators` (consent) / `visiblePartners` (public); `primaryDirection` = first direction.
- **News**: newest first; `upcoming` = `event_date` ≥ build date.

### Validator rule codes (`npm run validate`)

Errors fail CI (`validate-content`); warnings print. Each code has a fixture test in `tests/content/rules.test.ts`, and a meta-test fails if a new code lacks one.

| Code                                       | Sev.                 | Rule                                                                                                                                                                                                                                        |
| ------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E_PARSE                                    | error                | Invalid YAML / missing front matter / bad JSON                                                                                                                                                                                              |
| E_SCHEMA                                   | error                | zod field constraint (lengths, enums, DOI pattern, dates, `end ≥ start`, unknown keys such as a per-file `order`)                                                                                                                           |
| E_SITE_MISSING                             | error                | `content/site.yml` missing                                                                                                                                                                                                                  |
| E_SLUG                                     | error                | Slug pattern per collection (D-05)                                                                                                                                                                                                          |
| E_NEWS_SLUG_DATE                           | error                | News slug date ≠ `date`                                                                                                                                                                                                                     |
| E_RELATION                                 | error                | Reference to a slug that does not exist                                                                                                                                                                                                     |
| W_DRAFT_REFERENCE                          | warn                 | Published item references a draft                                                                                                                                                                                                           |
| W_UNLISTED_REFERENCED                      | warn                 | Reference to a `listed: false` person                                                                                                                                                                                                       |
| E_DUP_DOI / E_DUP_TITLE                    | error                | Duplicate DOI / normalised title                                                                                                                                                                                                            |
| E_AS_OF_MISSING                            | error                | Non-published status without `as_of`                                                                                                                                                                                                        |
| E_STATUS_SOURCE_MISSING                    | error                | Non-published status without `status_source`                                                                                                                                                                                                |
| E_YEAR_MISSING                             | error                | Counted publication without `year`                                                                                                                                                                                                          |
| E_DIRECTIONS_EMPTY / W_DIRECTIONS_EMPTY    | error / warn (draft) | Paper (not WIP) or project without a direction                                                                                                                                                                                              |
| E_HTTP_URL                                 | error                | Any `http://` URL                                                                                                                                                                                                                           |
| E_ALT_MISSING                              | error                | Image without alt (figure, hero, teaser, news image, person photo)                                                                                                                                                                          |
| W_CONSENT_PHOTO / _EMAIL / _NOW_AT         | warn                 | Value set but consent flag false (it will not render; an uploaded photo file is still published)                                                                                                                                            |
| E_DIR_COUNT_ZERO / W_DIR_COUNT_ZERO        | error / warn         | 0 live non-draft directions; error only when `site.launched: true` (D-03)                                                                                                                                                                   |
| E_DIR_COUNT_MAX                            | error                | More than 8 live directions                                                                                                                                                                                                                 |
| W_DIR_COUNT_HIGH                           | warn                 | 7–8 directions (consider `figure_mode: dotplot`)                                                                                                                                                                                            |
| E_DIR_ORDER_DUP / E_DIR_ORDER_UNKNOWN      | error                | `direction_order` duplicate / slug without a file (D-04)                                                                                                                                                                                    |
| W_DIR_ORDER_MISSING / W_DIR_ORDER_ARCHIVED | warn                 | Live direction not listed (appended) / archived one listed (ignored)                                                                                                                                                                        |
| E_COLOR_DUP / W_COLOR_DUP                  | error / warn         | Two live directions share a colour; error only when `site.launched: true` (§C3)                                                                                                                                                             |
| W_COLOR_CONFUSABLE                         | warn                 | CVD-confusable pair (§C3)                                                                                                                                                                                                                   |
| W_ARCHIVED_NO_DATE                         | warn                 | Archived direction without `archived_on`                                                                                                                                                                                                    |
| W_BODY_LENGTH                              | warn                 | Non-draft direction body outside 80–150 words                                                                                                                                                                                               |
| W_OPP_NO_ROUTE / W_OPP_CLOSED_PAST         | warn                 | Opportunity with no route / open but past `closes_on`                                                                                                                                                                                       |
| W_NON_LATIN1                               | warn                 | Characters outside the loaded latin font subset                                                                                                                                                                                             |
| E_REDIRECT_MISSING                         | error                | A slug in `content/.published-slugs.json` whose entry is **gone**, without a `site.redirects` entry (D-05, best effort; `npm run slugs:record` writes the file)                                                                             |
| W_PUBLISHED_HIDDEN                         | warn                 | A slug in `content/.published-slugs.json` whose entry still exists but has no live page now (Draft on, Listed or Profile page off): visitors get "Page not found" (D-05 amendment, filed on the entry's own file)                           |
| E_LINK_HIDDEN                              | error                | A publicly rendered entry (or `site.yml`, except `redirects[].from`) links to a page that is not on the live site: root-relative `/{seg}/{slug}` or an absolute URL on the site's own origins (`links.ts`; export-check stays the backstop) |
| E_REDIRECT_CONFLICT / E_REDIRECT_DUP       | error                | Redirect from a live page / duplicate `from`                                                                                                                                                                                                |
| W_UNKNOWN_FILE                             | warn                 | File outside every collection                                                                                                                                                                                                               |

The copy rules (E_HOME_QUESTION, E_HOME_WHY_LONG, E_HERO_LONG) are not part of `npm run validate`'s rule list: `copyRuleIssues` runs in `tests/content/simplify-copy.test.ts` and in the editor's site check (§10).

## 4. Design system ("Lines", D-13; §9 records the redesign)

- **Tokens** `src/styles/tokens.css` (layer `base`), mirrored in `src/lib/content/palette.ts` (unit-tested):
  - core: `--paper` `--band` `--ink` `--muted` `--rule` `--hairline` (P3 values, light and dark via `prefers-color-scheme`; no manual theme toggle). There is **no brand accent**: links are ink with a `--rule` underline (2 px ink on hover).
  - legacy names (`--surface`, `--paper-alt`, `--plate`, `--ink-muted`, `--accent`, `--accent-strong`, `--pearl`, `--fs-*`, `--font-display/-text/-data`, `--r-*`, `--tracking-mono`) stay as **aliases of the new values**, so pages render in the new system while page packages migrate. New code uses the new names.
  - direction colours via **`data-swatch="<id>"`**, which sets `--dir` (the mode-aware line colour: deep in light mode, light in dark mode) plus `--dir-deep`, `--dir-light`, `--dir-tint`, `--dir-seed`, `--dir-band`, `--dir-dot`, `--dir-text`. Colour encodes directions and nothing else.
  - type scale: `--t-meta` 0.875rem, `--t-body` 1.0625rem, `--t-title` 1.25rem, `--t-h2` 1.625rem, `--t-lane` 2rem, `--t-head` 2.25rem (2rem below 40rem). Widths: `--wdth-cond` 68% (h1, figure lane labels and year headings only, always at 2rem or more), `--wdth-text` 100%.
  - layout: `--content-max` 80rem; `--lab`, the label column (100%, then 12.5rem from 48rem, 18rem from 64rem); `--sec-gap` 88 px (64 px on phones); `--rule-heavy` 2 px (figures and plates only); `--header-h` 0 (the header is not sticky).
  - Tailwind sees them through `@theme inline` (`bg-paper`, `text-ink`, `text-muted`, `bg-band`, `font-sans`, `font-mono` …).
- **Layers**: tokens/base → `@layer base`; prose + primitives → `@layer components` (Tailwind utilities can override); `motion.css` and `forced-colors.css` unlayered (always win).
- **Fonts** `src/fonts/index.ts` (next/font/local): **one file**, `archivo-latin-wdth-normal.woff2` (wdth 62–125 × wght 100–900, latin; 88.0 KiB preloaded), variable `--font-archivo`, declared with `font-stretch: 62% 125%`. Body wdth 100 / 400; h2–h4 600; condensed 68 / 700 for the h1, lane labels and year headings (`.t-display`, `.t-cond`, `.t-year`). DOI and BibTeX use the system `--font-mono` stack (`code`, `pre`, `.doi`, `.bibtex`); nothing else is monospace (`--font-data` resolves to Archivo with tabular figures). The latin subset has no `→`; links carry no arrows anyway.
- **Layout primitives** (`base.css`): `.bl-container`; `.bl-grid` with `__label`, `__track`, `__full` (the label-column grid every page uses); `.bl-ledger` (+ `--major` 2 px, `--closed`); `.bl-sec` (section rhythm); `.bl-sec-h`; `.bl-seg` (16 × 2 px direction segment); `.t-lead`, `.t-sm`/`.t-meta`, `.t-muted`, `.t-num`. `.t-mono` and `.t-eyebrow` keep their names but render plain Archivo meta (no mono, no caps, no tracking).
- **Motion** `src/styles/motion.css`: tokens `--ease-settle` (the critically damped `linear(…)` of IDENTITY-RESEARCH §5), `--ease-steep`, `--ease-diffuse` and durations; every view-transition rule: `.pearl-morph` (420 ms on the settle curve, no blur, z-index 10), root page swap (opacity only: 150 ms out, 210 ms in after 150 ms), `.page-swap`, `.band-fade`, `.nav-forward` / `.nav-back` (60 px slide landing on the settle curve), anchored `site-header`, `::view-transition { pointer-events: none }`, morph companions (WP1 request 6); opt-in `.bl-steep` (filter results) and `.bl-settle` (6 px arrival). Fig. 1's arrival (D-14) is plate-scoped: `FigureIsland` sets `.f1-plate[data-intro="wait"]` while the map is below the fold and `"play"` when its top clears the bottom 30 % of the viewport, once per session (`sessionStorage["bobalab-intro"]`), never on a figure already painted; a figure already on screen at mount is counted as seen. The homepage pearls' settle-once intro (D-15) is `<html data-cup-intro>` (name kept from D-14), set pre-paint on the first home view of the session and removed 1.2 s after `load` (change requests home-1, home-6). Reduced motion (OS **or** `data-motion="reduce"`) → VT 0 s, root ≤ 120 ms opacity crossfade, every transition 0 ms. Transform animations must sit in `@media (prefers-reduced-motion: no-preference) { :root:not([data-motion="reduce"]) … }`. Nothing loops, so no Pause control is needed.
- **VT names** `src/lib/vt.ts`: `pearlVtName(slug)`, `VT.morph` etc., `TRANSITION.pearlOpen/…` for `<Link transitionTypes>`, `PAGE_ENTER_EXIT` for page-level `<ViewTransition enter exit>`. One mounted element per `pearl-{slug}` name; decorative pearls carry none.
- **Motion preference** `src/lib/site/motion.ts`: `setMotionPreference()`, `motionReduced()`, `subscribeMotion()` (storage key `bobalab-motion`, event `bobalab-motion-change`); the footer switch uses them. Intro flags: `sessionStorage["bobalab-intro"]` (Fig. 1 on /research/#map, set by FigureIsland) and `"bobalab-cup-intro"` (the homepage pearls, D-15; name kept from D-14; set by the pre-paint script or PearlsIsland).

## 5. Components (WP0-owned; import, do not edit — file a change request)

| Path                | Components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/site/`  | `SiteHeader` (+`SiteNav` client), `SiteFooter`, `SkipLink`, `RouteFocus` (client), `PrePaintScript`, `MotionToggle` (client), `PreviewRibbon`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `components/brand/` | `Wordmark`, `WordmarkLockup` (outlined one-colour SVG: Archivo condensed bold, the first O is the pearl), `PearlMark` (flat disc), `ShoulderMark` + `SHOULDER` (favicon motif: four pearls resting on a rule); `wordmark-geometry.ts` is generated                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `components/ui/`    | `Pearl` (flat ink disc; rail 24, row 34, card 48, avatar 64, hero 96 px; `initials` → square tile; `index` ignored), `PearlTag`/`PearlTagList` (segment + name), `Badge`/`DraftBadge`/`OpenToRAsBadge` (plain words), `EvidenceLabel`, `DateText`, `Prose`, `MaterialsRow` (+`materialsFromPublication`; plain text links), `FilterChips` (client, controlled; text toggles), `Img` (server; manifest), `Icon` (16 icons, for controls), `VisuallyHidden`, `JsonLd`, `PublicationEntry` (ruled row; +`statusLine`, `needsProvenanceNote`), `NewsItem` (log row), `PersonCard` (row, square photo), `ProjectCard` and `DirectionCard` (+`countsLine`) (ruled rows), `labels.ts` |

**Class names:** do not build class names with a leading space inside a template literal (`` `a${x ? " b" : ""}` ``); `prettier-plugin-tailwindcss` trims it (WP4 request 2). Use whole strings or `[a, x && b].filter(Boolean).join(" ")`.

Utility classes for page packages: `bl-container`, `bl-grid` (+`__label`, `__track`, `__full`), `bl-ledger` (+`--major`, `--closed`), `bl-sec`, `bl-sec-h`, `bl-seg`, `bl-measure`, `bl-stack`, `t-display`, `t-cond`, `t-year`, `t-lead`, `t-sm`/`t-meta`, `t-muted`, `t-num`, `vh`, `bl-tags`, `bl-steep`, `bl-settle`. Kept for compatibility but restyled: `bl-cta` / `bl-cta--quiet` (an underlined ink text link, 44 px tall, no box), `bl-card` (a ruled row, no box), `t-mono`, `t-eyebrow` (plain meta). Arrow, external and chevron icons inside links are hidden by CSS.

The **figure** (Fig. 1) is the figure package's (`components/figure/**`); it uses the flat `--pearl` token or its own `.pearl` classes (forced-colours rules for `.pearl`/`.seed` already exist).

**Study-design plates** (D-13 item 8): `publications.plate_verified: boolean` (default false; CMS label "Study-design figure checked by the authors"). Render a paper's plate only when `showStudyPlate(pub, isPreview())` (`src/lib/content/queries.ts`) is true, that is when the authors checked it or in a preview build.

### Media manifest (WP7 writes, `Img` reads)

`public/media/manifest.json` (generated files live in `public/media/`, outside the CMS media folder `public/uploads/`, so editors only ever see their own uploads; WP6 request 6):

```json
{
  "version": 1,
  "images": {
    "/uploads/x.jpg": {
      "width": 1600,
      "height": 900,
      "variants": [
        { "width": 480, "src": "/media/x-480.webp" },
        { "width": 960, "src": "/media/x-960.webp" }
      ]
    }
  }
}
```

## 6. Testing

| Command            | What                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test`     | Vitest unit tests `tests/unit/**` (WP0: `tests/unit/foundation/**` — tokens/contrast, dates, people, loader, Markdoc, SEO, VT, fonts)                                  |
| `npm run validate` | `tests/content/**`: CONTENT_DIR validation (skipped with a notice while `content/` does not exist), rule fixtures, fixture-set checks                                  |
| `npm run e2e`      | Playwright `tests/e2e/**` against `BASE_URL` (default shared dev server `http://localhost:3100`). WP0's `kit.spec.ts` needs a server started with `NEXT_PUBLIC_KIT=1`. |

When several packages run Playwright at once, pass `--output=test-results/<WP>/pw-output` (or set `E2E_OUTPUT`) so one run does not empty another's artifact folder (WP5 request 7).

**WebKit keyboard tests on Windows.** Playwright's WebKit on Windows moves Tab focus only between buttons, never to links; Alt+Tab does the same (MEASURED 2026-10-20, Playwright 1.64.1, WebKit 2370; Chromium on the same page tabs through every link). This is the test browser, not the site. Specs that walk focus with the keyboard first probe a blank page for the key that reaches links (`Tab`, or `Alt+Tab` as on macOS WebKit). When neither does, they focus the same elements by script and still check the focus ring, the caption and the state; the Tab order itself is then covered by Chromium. `tests/e2e/motion-and-colors.spec.ts` does this. WebKit in Playwright 1.64 also emulates `forced-colors: active`, so the forced-colours test runs in both browsers.

**Fixtures** (`tests/fixtures/content/<set>`, generated by `node tests/fixtures/build-fixtures.mjs`, all fictional): `n0` (0 live, 2 draft directions, `launched: false`), `n1 n2 n3 n4 n6 n7 n8`, `long-labels` (8/28-char and two-line labels, 90-char title), `seeds-0-1-7-12-24`, `consent-edge-cases` (listed/unlisted, consent flags, alumni by `end`, draft person, collaborator consent). Every set validates with 0 errors. Use: `CONTENT_DIR=tests/fixtures/content/n4 npm run dev`.

**Kit page** `/kit/`: every primitive; only with `NEXT_PUBLIC_KIT=1`, else `notFound()` (in a production export `out/kit/index.html` is the not-found page with `noindex`; WP8 should keep `/kit/` out of the sitemap).

## 7. Windows static export (D-07)

Observed on Windows 11 with Next 16.4.2 (2026-10-20): the export writes each nested page's segment files into a folder (`out/kit/__next.kit/__PAGE__.txt`) instead of the dotted name the client requests (`out/kit/__next.kit.__PAGE__.txt`), so prefetches 404 and navigations fall back to the full `index.txt` (MEASURED by WP8; Next #85374). `scripts/fix-win-export.mjs` (run by `scripts/build.mjs` on win32) moves every file in an `out/**/__next.*/` folder to `<folder>.<sub>.<file>` and removes the folder; it is idempotent and a no-op on Linux exports (`tests/unit/wp8/fix-win-export.test.ts`). CI deploys build on ubuntu-latest regardless. `scripts/perf/export-check.mjs` fails a build that still has such folders.

## 8. Generated assets

- `npm run brand:wordmark` (Python 3 + fontTools) regenerates `src/components/brand/wordmark-geometry.ts` from `src/fonts/archivo-latin-wdth-normal.woff2` instanced at wdth 68 / wght 700: B, the pearl (a disc of cap height plus 1.5% overshoot in the first O's slot, widened by the disc's extra width), then B A L A B, placed by advance widths plus GPOS pair kerning. It also records the ink gaps between neighbours (unit-tested: none reads as a word space). WOFF2 decoding uses a decompress-only `brotli` shim that calls Node's zlib when the Python module is absent.
- `node scripts/brand/build-assets.mjs` (sharp) writes `src/app/apple-icon.png` (the shoulder-on-floor mark on white), `public/brand/og-default.png` (the outlined wordmark over a 2 px ink rule on white) and `public/brand/fixtures/portrait.webp` (fixture-only placeholder).
- `src/app/icon.svg` is hand-written: P2's "shoulder on floor" (three pearls on a rule, one settled on the left shoulder), ink, light ink in dark mode. Same geometry as `SHOULDER` in `components/brand/PearlMark.tsx`.

## 9. Redesign 2026-10 (FOUNDATION record, D-13)

What the FOUNDATION package changed, and where it deviates from D-13 or from the P3 prototype (`docs/redesign/prototypes/p3/`):

1. **Tokens.** P3 core tokens and the DIRECTION §5.0 tones for the four live swatches (butterfly-pea `#2B4FA8`/`#8EA4F7`, lychee `#A12C5A`/`#F590AE`, matcha `#4C7A1E`/`#A8DA84`, oolong `#6B4500`/`#C4943A`). Every contrast pair is recomputed in `tests/unit/foundation/palette.test.ts`.
   - _Deviation:_ D-13 gives tones for the four live directions only. Jasmine, Black sesame, Taro and Thai tea keep their earlier deep/light tones; their tints and faint marks are recomputed against the new papers. The confusable-pair list was recomputed (ΔE_OK×100 below 5 under normal vision or Machado protan/deutan/tritan, deep or light tone) and now lists 9 pairs; none joins two of the four live directions. The fixture sets `n6` and `seeds-0-1-7-12-24`, which use Jasmine, therefore expect `W_COLOR_CONFUSABLE`.
   - _Deviation:_ the legacy token names stay as aliases (§4), so no page renders half-migrated cream while page packages move to the new names.
   - The dark-mode pearl is light ink (`#E7EAE5`), as in P3; a black pearl would vanish on the dark paper. JUDGE item 9 (does the 96 px Fig. 2 pearl read as lit?) is the direction package's check.
2. **Fonts.** One Archivo file (90,104 B = 88.0 KiB) through next/font/local. The Fraunces, Inter and Plex Mono files and packages are removed; `@fontsource-variable/archivo@5.3.0` is the only font devDependency (source of the file and of `OFL.txt`).
3. **Type and layout.** h2 is wdth 100 / 600 at 1.625rem (D-13: at most 2rem; P3's condensed 2rem h2 is not used). The label column is 18rem from 64rem. _Deviation from the D-13 shorthand "stacked below":_ P3's intermediate 12.5rem column from 48rem is kept, as in the prototype; the grid stacks below 48rem.
4. **Header.** The outlined wordmark (D-13) replaces P3's live-text wordmark (wdth 112 / 800); five nav items (D-13 item 1); a 1 px ink rule inside the content column; **not sticky** (P3), so `--header-h` is 0.
5. **Footer.** P3 layout: label column (wordmark and long name), Visit, Site, Lab members (`member_links`, then the Reduce motion switch), and a base line (Last updated, maintainers). "Site issue? Email us" became "Report a site issue". With no member links the fourth column is headed "Display".
   - The Reduce motion control stays `role="switch"` with `aria-checked` (tests and assistive technology rely on it) instead of P3's `aria-pressed` button. It is styled as P3's text toggle, with a visible on/off word.
6. **Primitives.** Restyled, not renamed: `.bl-badge` (plain words), `.bl-card` (ruled row), `.bl-chip` (text toggle; the label is underlined, the count is not), `.bl-materials` (text links), `.bl-dot` (now a 16 × 2 px segment, not a disc: discs mean papers and pearls only, RC-8), `.bl-pearl` (flat disc; initials become a square tile), `.bl-cta` (underlined text link).
   - `PublicationEntry` follows P3's ledger row with JUDGE item 6: no 24 px route indicator; the direction names carry the line segment. It shows `in_brief`, clamped to 2 lines, by default (`showBrief={false}` omits it).
   - _D-13 item 7, shared part:_ `statusLine()` no longer appends "reported by the lab" (opt in with `{ provenance: true }`), and list rows no longer repeat the self-reported award wording. `needsProvenanceNote(pubs)` tells a page to print its one footnote. **Page packages must add that footnote** (wording pending PI sign-off). The publications, direction, project, news-item and person pages print it (item 13); `tests/e2e/publications.spec.ts` asserts the footnote, not the inline wording.
7. **Favicon and marks.** `icon.svg` and `apple-icon.png` show P2's shoulder on floor (D-13 item 2). The 3-person blind lineup is still the owner's to run. The default OG image is the new wordmark over a rule.
8. **Motion.** As in §4. The D-02 float, buoyancy and Pause tokens are gone (`--float-*`, `--lean-max`, `--lift-max`, `--scale-max`); the morph lands on the settle curve without the 3 px blur (IDENTITY-RESEARCH §5).
9. **Schema and CMS.** `plate_verified` is added (zod default false; CMS boolean). `public/admin/*` was regenerated with a patched copy of `scripts/cms/build-config.mjs` (font list, logo colours). FOUNDATION does not own that script, so the patch was change request `docs/change-requests/redesign/foundation-1.md` (applied at integration; `npm run cms:check` is the gate). A retired schema field can be kept parseable but out of the editor with `widget: "hidden"` in `cms/source.mjs` (used for `site.figure_mode`).
10. **Kit.** `/kit/` shows every restyled primitive inside the label-column grid. The shared dev server does not set `NEXT_PUBLIC_KIT`, so FOUNDATION rendered the kit to static HTML and ran the kit spec against that copy.
11. **Home and Fig. 1 (HOME package).** `src/lib/figure/buildFigure.ts` builds the "Lines" model
    (lanes in `direction_order`, one dot per counted paper with a year, links and gaps for shared
    papers, rings for work in progress); `src/lib/figure/geometry.ts` holds the layout formulas
    that `figure.css` evaluates in CSS (no drawing script) and writes the data-dependent container
    queries (packed below a 28 px pitch, strips where even 12 px does not fit, strips below 48rem).
    Overflow rule: columns per paper; else merge the oldest years into one bin packed per lane;
    else pack every year; else merge packed years. `FigureIsland` (≈1.1 KB gz) only adds linked
    highlighting and the live caption. `DirectionPearl` keeps its props; `hero` = 96 px and
    `rail` = 24 px flat pearls, archived = a quiet open disc. The `.f1-dp` wrapper, `.f1-pearl`
    disc and `data-slug` are a contract: Figure 2 on direction pages sizes and paints the pearl
    from `direction.css` (change request research-1). `site.figure_mode` no longer does anything
    (hidden in the CMS). The h1 statement is `content/pages/home.yml` `statement` (≤ 80
    characters), falling back to `HOME_STATEMENT`; wording pending PI sign-off.
    D-14 (simplify): Fig. 1 left the homepage. `/research/` renders it in
    `<section id="map" aria-labelledby="map-h">` ("Explore: how the N directions connect") in a
    full-bleed `--band` band after the directions ledger, via `<PearlFigure model={buildFigure(c)} heading={…} />`.
    - Layout: the heading sits in the label column with a one-sentence key beside it (from 64rem;
      stacked above the key below that). The key's clauses follow the data and the same container
      queries as the marks. The caption is short, and its "Point at…" hint is hidden on
      `(hover: none)` screens.
    - Size: the map is a section, not the hero, so `.f1--map` steps the lane names down to
      `--t-lane: 1.375rem` (still condensed) and the lanes to `--f1-lane-h: 4.5rem`. The band's h2
      stays its largest text.
    - Colour: inside the band the figure's ground is `--band` and the zone after "now" is
      `--paper` (`--f1-ground`, `--f1-zone`).
    - Arrival: it plays once per session, when the plate's top clears the bottom 30 % of the
      viewport. A plate that is on screen when the island mounts is drawn at rest and counts as
      seen, so a later Back to the page never blanks it to replay it.
    - View-transition names on /research: only the map's lane pearls carry `pearl-{slug}`.
    - Ledger: it has no pearls. The live rows no longer draw a `DirectionStrip`, because the map
      draws the same papers; their counts column is 16rem from 80rem, so the counts sit on one
      line. "Earlier and related research" keeps its strips, because archived directions are not
      on the map.
12. **Study-design plates (PUBLICATIONS).** `src/components/plates/`: `registry.tsx` maps a
    publication slug to `{ steps, caption, source, Body }`; pages render
    `<StudyPlate pub={p} preview={c.preview} figure={n} />` from `@/components/plates`, which
    returns nothing unless a plate is registered AND `showStudyPlate(p, preview)` holds
    (`plate_verified: true`, or a preview build, where it is marked "Draft figure, pending author
    check"). Only `bastani-2026-rl-tips` is registered; `deng-2025-learning-to-gig` is deliberately
    absent (unverified facts, JUDGE.md §4). Labels are HTML, strokes SVG; the 4-step step-through
    (`PlateStepper`, client) is hidden under reduced motion and without JS, where every step shows.
13. **Provenance footnote (PUBLICATIONS, D-13 item 7).** `/publications/` prints one footnote
    ("Review statuses are as reported by the lab, dated by when each was last checked.") when a
    shown status is self-reported; rows carry "…, as of Mon YYYY". The paper page states its one
    status as "As of Month YYYY, as reported by the lab."; self-reported awards get a dagger and a
    single "† Reported by the lab." note. Wording pending PI sign-off (D-13 item 7).
14. **Typographic quotes (integration, change request content-4a).** `src/lib/content/typeset.ts`
    turns straight quotes into typographic ones at render time only: Markdoc text nodes (code
    spans are separate nodes and stay as typed) and the plain display fields the loader exposes
    (including news and project titles). Stored content, publication titles (they feed APA and
    BibTeX), URLs, DOIs and slugs are never converted.
15. **Homepage pearls (HOME, D-15).** `src/app/page.tsx` renders `HomeHero` (statement h1 at
    `--t-display`, the who line from `homeWho(c)`, the why line from `pages/home.why` falling
    back to `mission`, two links) with `HomePearls` (`src/components/pearls/`) on the right (below
    the text on phones), then `HomeSections` (new papers beside news, then people; no counts).
    `src/lib/pearls/` holds the original Fig. 1 slot templates for 2–8 directions
    (`templates.ts`), the seed fill order with the ±75° cap (`seeds.ts`), and the model
    (`model.ts`: `buildPearls`, `countsLine`). `HomePearls.tsx` (server) draws a flat `--tea`
    panel. It holds one `<nav aria-label="Research directions"><ol>` of real links, each with a
    matte tapioca body (`.pl-body`, the `pearl-{slug}` morph source, whose halo is a box-shadow
    shared with DirectionPearl "hero" via `halo.css`), a hairline orbit with one
    direction-coloured seed per counted paper, an underlined label and a muted count. Under the
    links sit the caption (one sentence, plus one hidden layer per direction with its
    `homeQuestion` and counts) and the quiet link to `/research/#map`. Figure mode starts at a
    36em container; below that, and for 1 or more than 8 directions, the pearls form a compact
    2-column grid. `PearlsIsland.tsx` (client, about 1 KB gz) swaps the caption on hover (80 ms
    intent) or focus, sets `.is-on` / `[data-active]` (lift ≤ 3 px and ≤ 1.05, halo ×1.45, seed
    bloom 10 %, the other pearls' orbit and seeds dimmed, never text), tints the header wordmark
    O through `<html data-pearl-on>` + `--pearl-o`, resets on Esc, and keeps the settle-once
    intro (`data-cup-intro`, see Motion) alive on the figure for 1.6 s. There is no idle motion,
    parallax or Pause button. Matcha text never sits on `--tea` (4.37:1); direction-coloured
    text sits on white. (`homePearls(c)` in `queries.ts` is the D-14 cup's reveal model, unused
    since D-15.)

Known gaps: Archivo has no italic file, so `<cite>` and `<em>` render a synthesised oblique (P3 sets venues upright).

## 10. Content editor v2 (D-17 to D-19)

The content manager at `/admin/` is Decap CMS 3.17.1 (vendored) plus our plain-JS scripts. Editors' saves are direct commits to `main` ("Save goes live"). The design spec is `cmsdesign/final/spec.md` in the build session's scratchpad; the decisions are DECISIONS D-17 to D-19; the editor guide is `docs/EDITING.md`.

**Admin scripts** (`public/admin/`, loaded by `cms/admin.html` in this order; each is an IIFE that sets one `window.Bobalab*` global; unit-tested in Node with fakes in `tests/unit/cms/`):

| #   | File                                             | Global           | Role                                                                                                                                                                                                     |
| --- | ------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `cms-data.js` (generated)                        | `BOBALAB_CMS`    | Labels, rules, repo, branch, deploy workflow, media limits (from `scripts/perf/asset-budget.mjs`), hidden-name hashes, `features.previewCheckBlocksSave`, collections, `auth` (the sign-in Worker, D-20) |
| 2–4 | `decap-cms.js`, `cms-widgets.js`, `cms-hooks.js` | `CMS`, …         | Decap; widget fixes and the `visible` switch (D-21); the original preSave checks (unchanged)                                                                                                             |
| 5   | `cms-locale.js`                                  | `BobalabLocale`  | "Save" wording, registered before init                                                                                                                                                                   |
| 6   | `cms-a11y.js`                                    |                  | Accessibility patches for Decap's UI; frame title "Live preview and history"                                                                                                                             |
| 7   | `cms-ui.js` + `cms-ui.css`                       | `BobalabUi`      | Native `<dialog>` confirm and info, toasts, live regions, times in the viewer's time zone                                                                                                                |
| 8   | `cms-github.js`                                  | `BobalabGitHub`  | GET-only GitHub REST client: the token from Decap's `decap-cms-user`, ETag cache, rate limits, plain-English errors, no request before sign-in                                                           |
| 9   | `cms-history.js`                                 | `BobalabHistory` | Versions, file text at a version (sessionStorage cache), tree counts, commit-message parsing, field diffs with masking, Recent changes                                                                   |
| 10  | `cms-deploy.js`                                  | `BobalabDeploy`  | Deploy tracking from the `deploy` job of `deploy.yml`, culprit attribution, site state                                                                                                                   |
| 11  | `cms-access.js`                                  | `BobalabAccess`  | Who can edit (D-20): collaborators and invitations, invite / cancel / remove, the memory-only `repo` token from the sign-in Worker's popup; the only script that writes to GitHub (six fixed requests)   |
| 12  | `cms-dock.js`                                    | `BobalabDock`    | Status box, "Saved" toast with Undo, banner, Recent changes sheet                                                                                                                                        |
| 13  | `cms-live.js` + `live.css`                       | `BobalabLive`    | One preview template for all 12 entry types: the live bar, the base loader, the bridge to `/editor-preview/`, History, Restore, Undo, `mergeLatest`                                                      |
| 14  | `cms-guards.js`                                  | `BobalabGuards`  | Upload type and size rules; the hidden-name check (a port of `scripts/import/hidden-names.mjs`)                                                                                                          |
| 15  | `cms-save.js`                                    | `BobalabSave`    | One-click Save with a latch, Ctrl/Cmd+S, the preSave checks (uploads, names, conflict, site check), the "Not saved" band, the note next to Save, baselines, postSave → dock                              |
| 16  | `cms-layout.js`                                  | `BobalabLayout`  | Live column forced on, [Show it], hidden Media page and media Delete, skip link, the phone Edit / Preview switch                                                                                         |
| 17  | `cms-start.js`                                   |                  | `CMS.init()` last; never inside a frame                                                                                                                                                                  |

**The live column** (D-18). Decap's preview pane holds the live bar and a nested `<iframe src="../editor-preview/">`. The parent loads the saved content with Decap's `getCollection` (two collections at a time, checked against git tree counts) and posts it; the frame renders `buildContent(raw, {preview: false})` with the shared views. Messages follow `src/lib/preview/protocol.ts` (`bobalab:*`, `v: 1`, same origin only):

- parent → preview: `mode`, `loading`, `base`, `overlay` (the form's data, debounced 120 ms), `overlay-clear`, `assets` (unsaved uploads as data URLs), `navigate`, `find`, `parse`, `check`;
- preview → parent: `ready`, `rendered` (with the live problems), `navigated`, `parsed`, `checked`, `key` (Ctrl/Cmd+S).

Preview modules (`src/lib/preview/`, all `fs`-free): `targets.ts` (page ids ↔ paths), `base.ts` (`rawFromBase`, the same shape `parseContentFiles` gives), `overlay.ts` (lenient overlay with placeholders for rendering, strict for the check), `check.ts` (the site check: errors with the change minus errors without it, in any file), `mark.ts` (browser-only `data-entry` marks) and `assets.ts` (unsaved upload overrides for `Img`).

**The site check** (§3.6e of the spec): `validateContent` (with E_LINK_HIDDEN) plus `copyRuleIssues`, on the saved site with all drafts, with and without the edited entry's exact preSave data; only new errors block, keyed by code, file, field and message. Unavailable (base not loaded or incomplete, or more than 4 s) means the save goes through with a note.

**Tests:** unit `tests/unit/cms/*.test.ts` and `tests/unit/preview/*.test.ts`; browser `tests/e2e/cms-save.spec.ts`, `cms-live.spec.ts`, `cms-access.spec.ts`, `cms-local.spec.ts` (each runs its own decap-server on a scratch copy of `content/`, so no test saves into the checkout) and `editor-preview.spec.ts` (also on the static export).
