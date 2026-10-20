# Architecture (WP0 foundation)

How the BOBALAB site is put together, and the contracts other packages build on. The design spec is `docs/research/research-brief.md`; binding decisions are in `docs/DECISIONS.md` (they win).

## 1. Shape

- **Next.js 16.4.2, App Router, `output: "export"`** → plain static HTML in `out/` for GitHub Pages. `trailingSlash: true`, `images.unoptimized`, `basePath` from `NEXT_PUBLIC_BASE_PATH`. No Cache Components, no Partial Prefetching, no Turbopack loader rules (H-13).
- **React 19.3.1**, TypeScript 6.0.3 (strict + `noUncheckedIndexedAccess`), Tailwind 4.3.3 through `@tailwindcss/postcss`.
- **Content** is Markdown/YAML in `content/` (Decap CMS writes it), read at build time by `src/lib/content/load.ts`. Pages are server components; client JS is limited to small islands.
- Every page works without JavaScript.

```
content/  ──read.ts──► RawContent ──validate.ts──► issues (npm run validate)
                           │
                           └──load.ts (draft filter, derived data)──► Content ──► pages (WP1–WP5)
```

## 2. Layout contract (`src/app/layout.tsx`, WP0)

- `<html lang="en" suppressHydrationWarning>` carries the font variables. `data-motion="reduce"` and `data-intro` are set pre-paint by `PrePaintScript` (inline `<head>` script).
- `<body>`: `SkipLink` → `PreviewRibbon` (preview builds only) → `SiteHeader` → **`<main id="main" tabIndex={-1}>{children}</main>`** → `SiteFooter` → `RouteFocus`.
- **Pages must not render their own `<main>`.** Each page renders exactly one `<h1 tabIndex={-1}>`; `RouteFocus` focuses it after client-side navigation (not on first load).
- Metadata: root `title.template` is `"%s · BOBALAB"`; pages call `pageMetadata({ title, description, path })` from `src/lib/seo/metadata.ts`. `metadataBase` = `NEXT_PUBLIC_SITE_URL` → `site.site_url` → `https://bobalab-berkeley.github.io`, plus the base path.
- CSP `<meta>` is emitted in production builds only (dev needs eval/websockets): `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`.

## 3. Content layer (`src/lib/content/**`)

| File            | Role                                                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts`     | zod schemas (brief §F3 + D-03…D-06). Structural only; strict objects (unknown keys fail). Exports enums, `COLLECTION_ROUTES`, `SLUG_PATTERNS`, types.          |
| `read.ts`       | Disk → virtual files → parsed entries (`parseContentFiles` is pure, used by tests). YAML 1.2 core schema: dates stay strings.                                  |
| `load.ts`       | `getContent()` (memoised except in `next dev`), `isPreview()`, `buildContent()`. Throws `ContentError` on YAML/schema errors so a broken file fails the build. |
| `validate.ts`   | Publish-readiness rules; every code below.                                                                                                                     |
| `relations.ts`  | Relation map; D-05 counting (`hasPublicVersion`, `countsAsPublication`); `isLabWork`.                                                                          |
| `directions.ts` | D-04 ordering from `site.direction_order`.                                                                                                                     |
| `people.ts`     | Alumni derivation, consent gating (`toPublicPerson`), role order/labels, grouping.                                                                             |
| `dates.ts`      | Formatting ("Oct 20, 2026") without locale/TZ dependence; "today" in America/Los_Angeles; `BUILD_DATE` env pins it.                                            |
| `markdoc.ts`    | Markdown → React/HTML; raw HTML escaped, h1 demoted, external `rel`.                                                                                           |
| `palette.ts`    | Colour tokens + swatches + WCAG maths (mirror of `tokens.css`, unit-tested).                                                                                   |

### Modes (D-03)

| Command                                      | Drafts                               | Ribbon |
| -------------------------------------------- | ------------------------------------ | ------ |
| `npm run dev` (NODE_ENV=development)         | included (unless `INCLUDE_DRAFTS=0`) | yes    |
| `npm run build:preview` (`INCLUDE_DRAFTS=1`) | included                             | yes    |
| `npm run build`                              | **excluded**                         | no     |

Draft items render `<DraftBadge>` ("Draft · pending lab review"); components do this automatically from `item.draft`.

### Derived data (all computed at build)

- **Directions**: `content.directions` = live (non-archived) directions in `site.direction_order`; missing ones appended (sorted by slug). `index` 1…N. `counts.papers` (D-05 counted publications), `counts.projects` (non-archived), `counts.inProgress`; `openToRAs` = an open/rolling `students` opportunity lists the direction. Archived → `content.archivedDirections` (index null), page still exists.
- **Publications**: `counted` = DOI / SSRN / arXiv / PDF / publisher link, or a presentation with an evidence `url`. `content.countedPublications` (lists, seeds) vs `content.inProgress`. `labWork` = a non-PI lab person is an author. `authorList[].person` only for **listed** people.
- **People**: `content.people` = listed people only, consent-gated (`photo`, `email`, `now_at` removed unless the flag is true), `isAlumni` from `end` (a `YYYY` end is current through Dec 31), `hasProfile` (PI always). Unlisted people are never returned by `getPerson()`.
- **Projects**: `visibleCollaborators` (consent) / `visiblePartners` (public); `primaryDirection` = first direction.
- **News**: newest first; `upcoming` = `event_date` ≥ build date.

### Validator rule codes (`npm run validate`)

Errors fail CI (`validate-content`); warnings print. Each code has a fixture test in `tests/content/rules.test.ts`, and a meta-test fails if a new code lacks one.

| Code                                       | Sev.                 | Rule                                                                                                                                               |
| ------------------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| E_PARSE                                    | error                | Invalid YAML / missing front matter / bad JSON                                                                                                     |
| E_SCHEMA                                   | error                | zod field constraint (lengths, enums, DOI pattern, dates, `end ≥ start`, unknown keys such as a per-file `order`)                                  |
| E_SITE_MISSING                             | error                | `content/site.yml` missing                                                                                                                         |
| E_SLUG                                     | error                | Slug pattern per collection (D-05)                                                                                                                 |
| E_NEWS_SLUG_DATE                           | error                | News slug date ≠ `date`                                                                                                                            |
| E_RELATION                                 | error                | Reference to a slug that does not exist                                                                                                            |
| W_DRAFT_REFERENCE                          | warn                 | Published item references a draft                                                                                                                  |
| W_UNLISTED_REFERENCED                      | warn                 | Reference to a `listed: false` person                                                                                                              |
| E_DUP_DOI / E_DUP_TITLE                    | error                | Duplicate DOI / normalised title                                                                                                                   |
| E_AS_OF_MISSING                            | error                | Non-published status without `as_of`                                                                                                               |
| E_STATUS_SOURCE_MISSING                    | error                | Non-published status without `status_source`                                                                                                       |
| E_YEAR_MISSING                             | error                | Counted publication without `year`                                                                                                                 |
| E_DIRECTIONS_EMPTY / W_DIRECTIONS_EMPTY    | error / warn (draft) | Paper (not WIP) or project without a direction                                                                                                     |
| E_HTTP_URL                                 | error                | Any `http://` URL                                                                                                                                  |
| E_ALT_MISSING                              | error                | Image without alt (figure, hero, teaser, news image, person photo)                                                                                 |
| W_CONSENT_PHOTO / _EMAIL / _NOW_AT         | warn                 | Value set but consent flag false (it will not render)                                                                                              |
| E_DIR_COUNT_ZERO / W_DIR_COUNT_ZERO        | error / warn         | 0 live non-draft directions; error only when `site.launched: true` (D-03)                                                                          |
| E_DIR_COUNT_MAX                            | error                | More than 8 live directions                                                                                                                        |
| W_DIR_COUNT_HIGH                           | warn                 | 7–8 directions (consider `figure_mode: dotplot`)                                                                                                   |
| E_DIR_ORDER_DUP / E_DIR_ORDER_UNKNOWN      | error                | `direction_order` duplicate / slug without a file (D-04)                                                                                           |
| W_DIR_ORDER_MISSING / W_DIR_ORDER_ARCHIVED | warn                 | Live direction not listed (appended) / archived one listed (ignored)                                                                               |
| W_COLOR_DUP / W_COLOR_CONFUSABLE           | warn                 | Shared colour / CVD-confusable pair (§C3)                                                                                                          |
| W_ARCHIVED_NO_DATE                         | warn                 | Archived direction without `archived_on`                                                                                                           |
| W_BODY_LENGTH                              | warn                 | Non-draft direction body outside 80–150 words                                                                                                      |
| W_OPP_NO_ROUTE / W_OPP_CLOSED_PAST         | warn                 | Opportunity with no route / open but past `closes_on`                                                                                              |
| W_NON_LATIN1                               | warn                 | Characters outside the loaded latin font subset                                                                                                    |
| E_REDIRECT_MISSING                         | error                | A slug in `content/.published-slugs.json` disappeared without a `site.redirects` entry (D-05, best effort; `npm run slugs:record` writes the file) |
| E_REDIRECT_CONFLICT / E_REDIRECT_DUP       | error                | Redirect from a live page / duplicate `from`                                                                                                       |
| W_UNKNOWN_FILE                             | warn                 | File outside every collection                                                                                                                      |

## 4. Design system

- **Tokens** `src/styles/tokens.css` (layer `base`): every §C2/§C3 hex, dark mode via `prefers-color-scheme` (no manual theme toggle). Direction colours via **`data-swatch="<id>"`** on any element, which sets `--dir-deep`, `--dir-tint`, `--dir-light`, `--dir-seed`, `--dir-band`, `--dir-dot`, `--dir-text` (mode-aware). Tailwind sees them through `@theme inline` (`bg-paper`, `text-ink`, `bg-dir-tint`, `font-display`, `text-mono`…).
- **Layers**: tokens/base → `@layer base`; prose + primitives → `@layer components` (Tailwind utilities can override); `motion.css` and `forced-colors.css` unlayered (always win).
- **Fonts** `src/fonts/index.ts` (next/font/local, 97.4 KiB preloaded): `--font-fraunces` (headings only, wght ≤ 620 for headings), `--font-inter` (text/UI), `--font-plex-mono` (indices, years, DOIs). Note: the latin subset has no `→` (U+2192); it renders from a fallback font. Prefer `<Icon name="arrow-right" />` for arrows in UI.
- **Motion** `src/styles/motion.css`: all §C6 tokens; every view-transition rule (§E5): `.pearl-morph` (420 ms, `--ease-emph`, 3 px mid blur), root page swap (150 ms out / 210 ms in after 150 ms), `.page-swap`, `.band-fade`, `.nav-forward` / `.nav-back` (60 px), anchored `site-header`, `::view-transition { pointer-events: none }`; the intro `bl-settle` keyframes for `.pearl-group` under `:root[data-intro]` with `--i` stagger; reduced motion (OS **or** `data-motion="reduce"`) → VT 0 s, root ≤ 120 ms opacity crossfade. Transform animations must sit in `@media (prefers-reduced-motion: no-preference) { :root:not([data-motion="reduce"]) … }`.
- **VT names** `src/lib/vt.ts`: `pearlVtName(slug)`, `VT.morph` etc., `TRANSITION.pearlOpen/…` for `<Link transitionTypes>`, `PAGE_ENTER_EXIT` for page-level `<ViewTransition enter exit>`. One mounted element per `pearl-{slug}` name; decorative pearls carry none.
- **Motion preference** `src/lib/site/motion.ts`: `setMotionPreference()`, `motionReduced()`, `subscribeMotion()` — WP1's Pause/Play button must use these (same storage key `bobalab-motion`, event `bobalab-motion-change`). Intro flag: `sessionStorage["bobalab-intro"]`.

## 5. Components (WP0-owned; import, do not edit — file a change request)

| Path                | Components                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/site/`  | `SiteHeader` (+`SiteNav` client), `SiteFooter`, `SkipLink`, `RouteFocus` (client), `PrePaintScript`, `MotionToggle` (client), `PreviewRibbon`                                                                                                                                                                                                                                                                                                                |
| `components/brand/` | `Wordmark`, `WordmarkLockup` (outlined SVG), `PearlMark`; `wordmark-geometry.ts` is generated                                                                                                                                                                                                                                                                                                                                                                |
| `components/ui/`    | `Pearl` (sizes rail/row/card/avatar/hero, `index`, `initials`), `PearlTag`/`PearlTagList`, `Badge`/`DraftBadge`/`OpenToRAsBadge`, `EvidenceLabel`, `DateText`, `Prose`, `MaterialsRow` (+`materialsFromPublication`), `FilterChips` (client, controlled), `Img` (server; manifest), `Icon` (16 icons), `VisuallyHidden`, `JsonLd`, `PublicationEntry` (+`statusLine`), `NewsItem`, `PersonCard`, `ProjectCard`, `DirectionCard` (+`countsLine`), `labels.ts` |

Utility classes for page packages: `bl-container`, `bl-measure`, `bl-stack`, `t-display`, `t-lead`, `t-sm`, `t-muted`, `t-mono`, `t-eyebrow`, `vh`, `bl-cta` / `bl-cta--quiet`, `bl-card`, `bl-tags`.

The **figure** (Fig. 1) is WP1's (`components/figure/**`); it uses `Pearl`'s material tokens or its own `.pearl` classes (forced-colours rules for `.pearl`/`.seed` already exist).

### Media manifest (WP7 writes, `Img` reads)

`public/uploads/manifest.json`:

```json
{
  "version": 1,
  "images": {
    "/uploads/x.jpg": {
      "width": 1600,
      "height": 900,
      "variants": [
        { "width": 480, "src": "/uploads/x-480.webp" },
        { "width": 960, "src": "/uploads/x-960.webp" }
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

**Fixtures** (`tests/fixtures/content/<set>`, generated by `node tests/fixtures/build-fixtures.mjs`, all fictional): `n0` (0 live, 2 draft directions, `launched: false`), `n1 n2 n3 n4 n6 n7 n8`, `long-labels` (8/28-char and two-line labels, 90-char title), `seeds-0-1-7-12-24`, `consent-edge-cases` (listed/unlisted, consent flags, alumni by `end`, draft person, collaborator consent). Every set validates with 0 errors. Use: `CONTENT_DIR=tests/fixtures/content/n4 npm run dev`.

**Kit page** `/kit/`: every primitive; only with `NEXT_PUBLIC_KIT=1`, else `notFound()` (in a production export `out/kit/index.html` is the not-found page with `noindex`; WP8 should keep `/kit/` out of the sitemap).

## 7. Windows static export (D-07)

Observed on this machine (Windows 11, Next 16.4.2, 2026-10-20): `npm run build` succeeded; **no file names with backslashes** in `out/`; per-route segment files are written as nested folders (e.g. `out/kit/__next.kit/__PAGE__.txt`). Serving `out/` with a plain static server and navigating `/` → `/kit/` → `/` in Chromium produced **no 404s for existing routes** (only for routes other packages have not built yet). So issue #85374 did not reproduce for the routes that exist today; WP8 still owns `scripts/fix-win-export.mjs`, which `scripts/build.mjs` runs automatically on win32 when present.

## 8. Generated assets

- `npm run brand:wordmark` (Python 3 + fontTools) regenerates `src/components/brand/wordmark-geometry.ts` from the pinned OFL fonts: Fraunces full variable instanced at SOFT 100 / wght 680 / opsz 144 for **BOBA** (B, B, A outlined), Plex Mono 500 for **LAB** (+0.08 em, cap height matched), the O replaced by a pearl circle (cap height + 2% overshoot). WOFF2 decoding uses a decompress-only `brotli` shim that calls Node's zlib when the Python module is absent.
- `node scripts/brand/build-assets.mjs` (sharp) writes `src/app/apple-icon.png`, `public/brand/og-default.png` (placeholder OG; WP1 may replace with a Fig. 1 still) and `public/brand/fixtures/portrait.webp` (fixture-only placeholder).
- `src/app/icon.svg` is hand-written (pearl-O; rim in dark mode).
