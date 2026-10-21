# Testing report (verification phase)

Final verification of the BOBALAB website after the lens review (64 findings) and the area fixers, run on 2026-10-20 by the final verifier. Labels: **MEASURED** (run and observed here), **DOCUMENTED** (reported by an area fixer or a source, not re-run here), **UNKNOWN** (not tested).

Artifacts (git-ignored): `test-results/verify-final/` (Playwright JSON and output, Lighthouse reports, linkinator logs, screenshots) and the fixers' `test-results/verify-*/` folders.

## 1. Environment (MEASURED)

| Item                 | Version                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------- |
| OS                   | Windows 11 Home 10.0.26200                                                                |
| Node / npm           | 24.19.0 / 11.17.0                                                                         |
| Next / React         | 16.4.2 (Turbopack) / 19.3.1                                                               |
| TypeScript / Vitest  | 6.0.3 / 5.0.5                                                                             |
| Playwright           | 1.64.1: Chromium 156.0.8078.4 (build 1248), WebKit 27.2 (build 2370)                      |
| axe-core             | 4.14.0 (`@axe-core/playwright` 4.14.0); tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa |
| Lighthouse           | 13.5.0, mobile preset (`scripts/perf/lighthouse.mjs`)                                     |
| linkinator           | 8.1.0 (`linkinator.config.json`: local URLs only)                                         |
| Decap / decap-server | 3.17.1 (vendored) / 3.11.5                                                                |

How the exports were built: the shared `next dev` server on :3100 could not be stopped from this session, so both exports were built in an isolated copy of the tree (`scratchpad/bobalab/build-final`, `node_modules` as a junction, `turbopack.root` set in that copy only) with `GIT_DIR` pointing at the repository, so the git-derived "Last updated" dates are the real ones. The production export was then mirrored into `out/` (it passes `node scripts/perf/export-check.mjs out` there). Both were served with `scripts/serve-out.mjs` (GitHub Pages behaviour, gzip on): preview on :3291, production on :3292.

## 2. Gates (MEASURED)

| Gate                            | Result                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`             | 0 errors                                                                                                                                   |
| `npm run lint`                  | 0 problems                                                                                                                                 |
| `npm run format:check`          | all files formatted                                                                                                                        |
| `npm run test`                  | 44 files, **671 passed, 3 skipped**; with `BOBALAB_DATASET` set (runs the importer `--check`): 672 passed, 2 skipped                       |
| `npm run validate`              | 4 files, **72 passed**; real content: 0 errors, 2 warnings (`W_DIR_COUNT_ZERO`: every direction is a draft; `W_OPP_NO_ROUTE`: phd-postdoc) |
| `npm run cms:check`             | generated admin files up to date                                                                                                           |
| Importer `--check`              | "content/ matches the import" (115 files): the importer is idempotent again (CON-01)                                                       |
| `scripts/cms/check-backend.mjs` | warning, exit 0: the CMS backend still has the `REPLACE-ME` placeholder and `launched: false` (becomes a deploy error at launch)           |

## 3. Builds and export invariants (MEASURED)

| Check                                                                                                     | Production (`npm run build`)                                                                             | Preview (`npm run build:preview`) |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Pages                                                                                                     | 33                                                                                                       | 82                                |
| Not-found shells pruned (ENG-03)                                                                          | `kit/`, `research/_none/`                                                                                | `kit/`                            |
| CSP `<meta>` hoisted directly after `<meta charSet>` (ENG-05)                                             | 33 pages                                                                                                 | 82 pages                          |
| `export-check` (404.html, admin/, sitemap, robots, no drafts or unlisted people, no shells, CSP position) | ok: 30 sitemap URLs; hidden items checked: 6 directions, 17 projects, 18 publications, 34 people, 8 news | n/a (drafts on purpose)           |
| HTTP status (served)                                                                                      | `/` 200, `/admin/` 200, `/kit/` 404, `/research/_none/` 404, `/nope/` 404, a draft news URL 404          | `/` 200                           |
| `robots.txt`                                                                                              | `Disallow: /admin/`, sitemap line                                                                        | preview disallows crawling        |
| RSS                                                                                                       | `out/news/feed.xml`, 11 items (8 draft news excluded, incl. the two PI-reported revisions, CON-02)       | 19 items                          |
| gzip                                                                                                      | `Content-Encoding: gzip` on HTML                                                                         | same                              |

## 4. End-to-end tests (MEASURED)

| Run                                                                                           | Chromium                            | WebKit                               |
| --------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------ |
| Preview export, every spec except `cms-local` (the CI configuration), final build             | **212 passed, 9 skipped, 0 failed** | **209 passed, 12 skipped, 0 failed** |
| Shared dev server, every spec including `cms-local` (before the VIS-10 rework below)          | 224 passed, 11 skipped              | not run                              |
| Dev server, figure + home + motion-and-colors + foundation + research after the VIS-10 rework | 55 passed                           | not run                              |

Skips: `kit.spec.ts` (9 per browser: the export has no kit page, by design); WebKit only (by design, Chromium-only checks): the reduced-motion view-transition timing test and the pearl-morph z-index test (view-transition pseudo-elements are read in Chromium), and Copy BibTeX (clipboard permissions differ by browser, brief §G5).

WebKit on Windows: Playwright's WebKit moves Tab focus only to buttons, never links (A11Y-01). `figure.spec.ts` and `motion-and-colors.spec.ts` now probe this, record an annotation, and focus the links by script; focus rings, caption swap and `is-on` are still asserted. The real Tab order is asserted in Chromium. Whether Linux WebKit (CI) reaches links by Tab is UNKNOWN; the probe handles both cases.

A run of the same specs against the **production** export is not a supported configuration: 23 failures and 14 timeouts, all from specs that expect draft content (0 live directions, 1 person, 1 opportunity). Production is covered instead by `export-check`, linkinator, Lighthouse and the production render unit tests; in that run `a11y-sitewide.spec.ts` passed on every production page.

## 5. Accessibility (MEASURED unless marked)

- **axe**: `a11y-sitewide.spec.ts` checked all 80 preview pages (6 directions, 18 projects, 25 publications, 1 person, 19 news, plus indexes and static pages) in light and dark, figure and list modes, in Chromium and WebKit: 0 violations. Page specs add axe in forced colours (research, publications, people, home with a direction active) and at 1366 and 390: 0 violations. CMS editor (`cms-local.spec.ts`): 0 violations at 1366 and 390, light and dark.
- **Keyboard**: skip link first and moves focus to main; figure Tab order 01→0N with caption swap and Esc reset (Chromium); RouteFocus moves focus to the h1 after client navigation (research, projects, news); CMS list handles reorder with Up/Down and announce the move (CMS-08, CMS-12); visible 2 px focus ring in the CMS form (A11Y-02).
- **Reduced motion**: no figure animation runs; every view-transition animation ≤ 120 ms (Chromium); Pause/Play writes the shared motion preference; hero re-bloom is motion-gated.
- **Forced colours**: zero axe violations; focus ring visible after Tab in Chromium and WebKit (WebKit through the script-focus fallback).
- **Reflow and text spacing**: no horizontal scroll at 320 px on every route group (WCAG 1.4.10); with WCAG 1.4.12 text spacing at 320 px, `/research/pricing-experimentation/`, `/` and `/people/` keep `scrollWidth` 320 (A11Y-04, A11Y-05). 200 % / 400 % browser zoom was not driven separately: 320 CSS px is the 400 % case at 1280 px.
- **No JavaScript**: home, figure links, research, projects, publications (full list, BibTeX `<pre>`), people (full list, work-in-progress `<details>`), news render fully.
- **Screen readers**: UNKNOWN (not tested; see §10).

## 6. Performance (MEASURED)

Lighthouse 13.5.0 mobile, three runs per export on the final builds. Budget (brief §G2): Performance ≥ 95, Accessibility 100, Best Practices ≥ 95, SEO ≥ 95; LCP ≤ 2.5 s (lab target ≤ 1.8 s); CLS ≤ 0.1.

| Page (export)                                       | Perf (3 runs) | A11y | BP  | SEO  | LCP (3 runs)      | CLS | TBT      |
| --------------------------------------------------- | ------------- | ---- | --- | ---- | ----------------- | --- | -------- |
| Home (production)                                   | 96 / 96 / 96  | 100  | 100 | 100  | 2.8 / 2.8 / 2.8 s | 0   | 10 ms    |
| Publications (production)                           | 97 / 97 / 97  | 100  | 100 | 100  | 2.6 / 2.6 / 2.6 s | 0   | 10–20 ms |
| People (production)                                 | 97 / 97 / 97  | 100  | 100 | 100  | 2.6 / 2.6 / 2.6 s | 0   | 10 ms    |
| Direction `/research/algorithmic-advice/` (preview) | 97 / 94 / 96  | 100  | 100 | 100* | 2.6 / 3.0 / 2.8 s | 0   | 10 ms    |
| Home (preview)                                      | 96 / 96 / 96  | 100  | 100 | 100* | 2.8 s ×3          | 0   | 10 ms    |
| Publications (preview)                              | 96 / 96 / 96  | 100  | 100 | 100* | 2.8 s ×3          | 0   | 20 ms    |
| People (preview)                                    | 97 / 97 / 97  | 100  | 100 | 100* | 2.6 s ×3          | 0   | 10 ms    |

\* Preview runs skip `is-crawlable` (preview robots disallow crawling on purpose). Production has no direction page while every direction is a draft. An earlier production run on the pre-rework build gave /people/ 94 / 3.0 s in 2 of 3 runs: run-to-run noise is about ±0.4 s LCP and ±2 Performance points.

**LCP misses the 2.5 s budget by 0.1–0.5 s on every key page (ENG-01, open).** The LCP element is text (a publication title or a paragraph), FCP 0.9–1.5 s. The figure-home fixer measured that dropping font preloads does not help (docs/change-requests/verify/figure-home-2.md, DOCUMENTED): Lantern keeps the three fonts (97.4 KiB) and ~139 KB gz of framework JS in the LCP graph either way. Font subsetting could not be built here (no woff2/brotli encoder for fontTools). Owner decision below.

Other budgets: JS (`npm run perf`) all 33 production and 82 preview pages within budget (baseline B 139,144 B gz; home 140,980 ≤ 147,336; /publications/ 149,102 ≤ 169,864; every other route ≤ 140,694 ≤ 149,384). Assets (`npm run perf:assets`): font preload 97.4 KiB ≤ 100 KiB, home transfer 263.9 KB ≤ 350 KB, 0 uploads, 0 `<img>` without size. CLS 0 on every run.

Links: linkinator, local URLs with fragments: production 118 checked, preview 228 checked, **0 broken** (external links are the weekly job).

## 7. CMS end-to-end flows (MEASURED, `cms-local.spec.ts` against the dev server + decap-server)

1. Admin CSP: Decap 3.17.1 needs `'unsafe-eval'`; the generated policy lets it start.
2. Create a news item in the CMS → file in `content/news/` → valid against the schema → in the production build's route list → deleted. (On `next dev`, a news file added after the route compiled returns 404 until restart: a dev-server limitation the cms fixer recorded as an annotation; production static params are checked.)
3. Rich-text body: opening an entry changes nothing; an edit does; undo does not.
4. New publication address checked before the first save (D-05); the long-first-author advice (CMS-11).
5. Phone widths: no sideways scrolling, account menu reachable.
6. On a scratch copy of `content/` (second decap-server): Direction order items show their address, reorder with the keyboard and can be removed (CMS-01, CMS-03, CMS-12); after a save, an address change opens the named entry and Publish writes that file (CMS-02); saves the validator would reject are refused (as_of, status_source, directions, year, duplicate colour; CMS-04, CMS-07); focus ring and conditional "(required …)" labels (A11Y-02, CMS-09); the CMS refuses to start inside a frame (CMS-13).
7. axe on the editor (§5).

Not tested: the GitHub backend (OAuth bridge, editorial-workflow PRs, Publish → deploy), see §10.

## 8. Content verification (MEASURED)

- Importer idempotent (`--check` clean); every integration content fix lives in `scripts/import/` (CON-01).
- Production shows 11 news items; the two PI-reported revision items are drafts until the papers are public (CON-02, CONTENT-QUESTIONS F6).
- Awards known only from the PI's CV carry `source: self-reported` (WISE 2022, POMS CBOM 2021, POMS CBOM 2020, MIT ORC 2017) and show "Reported by the lab" on the paper page and "· reported by the lab" in lists; talks without an evidence link say so (CON-03).
- Program labels in display casing, no invented expansions (CON-04/VIS-06); one citation name for the PI across all papers (CON-07); no "the PI" in public copy (CON-08); "Principal investigator" instead of "Faculty Director" (CON-05); no `parentOrganization` in JSON-LD (CON-06); Tuck wording and MSOM date corrected (CON-09); Fig. 1 and the "in progress" notes name both halves of D-05 (CON-10); the student first author appears on the live project's team (CON-11); Haas faculty profile link first on the PI page and card (CON-12/VIS-07).
- Hidden-roster names never enter the repo (`wp7-hidden-names.test.ts`).

## 9. Findings: final status

All 64 findings were triaged by the area fixers; the final verifier applied the 12 open change requests in `docs/change-requests/verify/` (each carries a Status line; figure-home-2 is declined as proposed) and re-verified the majors:

| Finding        | Verified how                                                                                                                                                                                                                                          | Status           |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| VIS-01         | `foundation.spec.ts` reads the view-transition group z-indexes during a real morph (Chromium pass)                                                                                                                                                    | fixed            |
| VIS-02         | Hero at 1440/390/320, light/dark: reads "BOBALAB" (screenshots in `test-results/verify-final/shots/`)                                                                                                                                                 | fixed            |
| CON-01         | Importer `--check` clean after `--write`                                                                                                                                                                                                              | fixed            |
| CON-02         | Both items `draft: true`; absent from production `out/news/` and the feed                                                                                                                                                                             | fixed            |
| CMS-01, CMS-02 | `cms-local.spec.ts` scratch-copy tests pass                                                                                                                                                                                                           | fixed            |
| ENG-01         | Lighthouse ×3 (§6)                                                                                                                                                                                                                                    | **open**         |
| VIS-10         | Reopened: the fix animated `filter`, which §G2 forbids ("only transform and opacity animate"). Reworked: the direction glow is now a `::after` layer that dims by opacity (light 0.3; dark keeps the body at .78); e2e asserts no `filter` transition | fixed (reworked) |

Minors were spot-checked on the exports (VIS-07/08 PI page 3,569 px with Haas link first, VIS-12 one "last updated" line, VIS-15 draft badges 8–10 px below their text, PUB-01 external author links, VIS-06 program labels, A11Y-04/05 text spacing).

## 10. Not tested (UNKNOWN)

- Linux and GitHub Actions: no workflow has run; the Linux JS baseline, Linux WebKit Tab behaviour and the `record-slugs` push/PR step are unverified.
- The GitHub OAuth bridge, Decap's editorial workflow (branch, PR, `validate-content`, Publish, deploy, revert).
- Real devices (iOS Safari, Android Chrome) and real browser zoom; only emulated viewports.
- Screen readers (VoiceOver, NVDA, JAWS), including the timing of the CMS drag announcements.
- Field performance (CrUX); Lighthouse is a lab simulation.
- Production direction pages (none are published yet).

## 11. Remaining issues

| Severity | Issue                                                                                                                                                         | Next step                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| major    | ENG-01: Lighthouse mobile LCP 2.6–3.0 s on every key page (budget 2.5 s, target 1.8 s); Performance 94 in some runs                                           | Owner decision: subset Inter/Fraunces with a woff2-capable toolchain, or record the miss in `docs/PERF-BASELINE.md` |
| minor    | CON-11 caveat: production cannot tell a draft person from an unlisted one, so an unlisted person who authors a project paper would be named (no current case) | Revisit if `listed: false` authors appear                                                                           |
| polish   | CON-16: archived directions show the import month as their archive date                                                                                       | Lab sets or clears `archived_on` (CONTENT-QUESTIONS C3)                                                             |
| polish   | ENG-08: 8 dev-only npm advisories (5 high, 3 low), no patched `braces` release; production deps clean                                                         | Re-check at the next eslint-config-next / decap-server bump                                                         |
| polish   | CMS-10: the first CMS save of a file reformats untouched YAML                                                                                                 | Documented in EDITING §12 and HANDOVER §14                                                                          |
| polish   | `next dev` serves 404 for a news file added after the route compiled (dev only; production unaffected)                                                        | Restart the dev server (EDITING §11)                                                                                |
| polish   | VIS-09: at 1024×768 the figure plate (629 px) is still cut by the fold; 1366×768 fits as specified                                                            | Optional                                                                                                            |
| polish   | List and explorer entries show external coauthors as plain text (paper pages link them, PUB-01)                                                               | Optional                                                                                                            |
| setup    | CMS backend `REPLACE-ME`; `check-backend.mjs` fails the deploy once `launched: true`                                                                          | SETUP-PRODUCTION §C5                                                                                                |

## 12. Decisions for the owner

1. **LCP budget (ENG-01)**: fund font subsetting or accept and document the 0.1–0.5 s lab miss.
2. **PI title (CON-05)**: "Principal investigator" is the neutral default; one line in `src/lib/content/people.ts` plus `npm run cms:config` changes it.
3. **Archive dates (CON-16, C3)** and the archive status of the two archived directions (H-1).
4. **PI-reported revision news (CON-02, F6)**: publish with the papers, or reword as the lab's dated report.
5. **Self-reported awards (D11)**: keep with the "Reported by the lab" label, or supply citable sources.
6. **Program wording (E11)**: each member confirms their program in the H-11 consent review.
7. **Wordmark spacing (VIS-02)**: LAB is now spaced optically instead of the brief C8's literal "+0.08em tracking".
