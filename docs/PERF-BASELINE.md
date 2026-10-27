# Performance baseline (WP0)

Measured 2026-10-20 by WP0 on Windows 11 (Node 24.19.0, Next 16.4.2 Turbopack, `npm run build` → `out/`), with no `content/` folder yet. MEASURED.

## Baseline B (client JS, gzip -9)

**B = 139,144 bytes gz (135.9 KiB)** — the JavaScript an otherwise empty route (`out/404.html`, same as `out/_not-found/index.html`) loads.

How it was counted (the rule `scripts/perf/js-budget.mjs` (WP8) should reuse):

- every `<script src>` in the HTML file, de-duplicated;
- **excluding `<script noModule>`** (the 39,520 B gz legacy-polyfill chunk, which modern browsers do not download);
- each file gzip-compressed at level 9; inline scripts are reported separately (they are part of the HTML transfer).

| Chunk (hashed name will change)           |    gz bytes | Contents                                                                            |
| ----------------------------------------- | ----------: | ----------------------------------------------------------------------------------- |
| `2gvu8dyrhibpa.js`                        |      71,736 | react-dom                                                                           |
| `1-fibdkr3wypg.js`                        |      45,205 | Next App Router runtime                                                             |
| `2bzlqb104tejm.js`                        |       9,002 | Next router helpers                                                                 |
| `2wvmnzxi_p5qn.js`                        |       7,226 | Next segment roots + root-layout client islands (SiteNav, MotionToggle, RouteFocus) |
| `turbopack-3-ry682tkyiqk.js`              |       3,942 | Turbopack runtime                                                                   |
| `1ckvzn7sfprko.js`                        |       2,033 | Next head / default error-page helpers                                              |
| **Total (B)**                             | **139,144** |                                                                                     |
| `0cz1d0mv5g_q7.js` (`noModule`, excluded) |      39,520 | legacy polyfills                                                                    |

Other routes at the same time:

| Route                                  | Script gz (excl. noModule) | Inline script gz | HTML gz |
| -------------------------------------- | -------------------------: | ---------------: | ------: |
| `/404.html`                            |                    139,144 |            5,681 |   7,388 |
| `/` (scaffold page, WP1 replaces it)   |                    144,776 |            6,490 |   8,367 |
| `/kit/` (production build → not-found) |                    131,918 |            5,740 |   6,275 |

## Budgets derived from B (brief §G2)

| Route             | Budget                                               |
| ----------------- | ---------------------------------------------------- |
| Home `/`          | ≤ B + 8 KB = **147,336 B gz** (figure island ≤ 4 KB) |
| `/publications/`  | ≤ B + 30 KB = **169,864 B gz**                       |
| Every other route | ≤ B + 10 KB = **149,384 B gz**                       |

## Fonts

Preloaded: Fraunces wght 36,620 B + Inter wght 48,256 B + Plex Mono 500 14,888 B = **99,764 B = 97.4 KiB** (≤ 100 KiB). Checked by `tests/unit/foundation/misc.test.ts` and `tests/e2e/kit.spec.ts`.

## Caveats

- B was measured on a **Windows** build. CI builds on Linux (D-07); WP8 should re-measure B there and update this file if it differs by more than ~1 KB.
- B includes the root-layout client islands, because every route ships them.
- Hashes change on every build; the numbers are what matters.

## Editor v2 (2026-10-26, DECISIONS D-17/D-18)

Measured with `scripts/perf/js-budget.mjs` on a production export (base path `/bobalab-web`, Windows) of the editor-v2 working tree, compared with the export of `main` 14c739c. MEASURED.

| Route                                  | `main` 14c739c |    editor v2 | Budget                                                  |
| -------------------------------------- | -------------: | -----------: | ------------------------------------------------------- |
| `/editor-preview/` (not a public page) |            n/a | 286,780 B gz | B + 180 KiB = 323,464 B gz (own line in `npm run perf`) |
| `/publications/`                       |   148,259 B gz | 148,560 B gz | B + 30 KB = 169,864 B gz                                |
| every other route (80)                 |      identical |    identical | unchanged                                               |

- **`/publications/` +301 B gz.** The editor's live column runs `PublicationsView` and `PublicationDetailView` in the browser, so Turbopack exports the publications island's helper modules by id instead of inlining them (the island chunk grows from 27,302 to 28,074 bytes raw). The design spike's own budget files show the same 148,259 → 148,560; the spec's "0 bytes changed on every public page" misread them. Default: accept (D-17, owner to confirm).
- `/editor-preview/` loads the site's views, zod (in jitless mode, so the site CSP needs no `eval`) and the validator. It is noindex, out of the sitemap and disallowed in `robots.txt`.
- Global CSS and every other HTML, RSC payload, sitemap and feed are identical to `main` once build ids are blanked (`robots.txt` gains the Disallow line).
