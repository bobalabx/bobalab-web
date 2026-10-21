# BOBALAB website

Website of BOBALAB, the Berkeley Operations and Behavioral Analytics Lab (Haas School of Business, UC Berkeley). Static Next.js site, content in Markdown/YAML edited through Decap CMS, hosted on GitHub Pages.

- Spec: `docs/research/research-brief.md` · Decisions (binding): `docs/DECISIONS.md`
- How it fits together: `docs/ARCHITECTURE.md` · Dataset → schema: `docs/CONTENT-MAPPING.md` · JS baseline: `docs/PERF-BASELINE.md` · Verification results: `docs/TESTING-REPORT.md`
- Changing a file another package owns: `docs/change-requests/README.md`

## Requirements

Node **24.x** (`.nvmrc`; `engines` `>=24.15 <25`, `engine-strict`), npm 11. Dependencies are pinned exactly (`.npmrc save-exact`). Use `npm ci`; expect exactly three `ERESOLVE overriding peer dependency` warnings (ESLint 10 vs eslint-config-next). Do not use `--legacy-peer-deps`.

For browser tests: `npx playwright install chromium` (CI also installs webkit).

## Scripts

| Script                                                | What it does                                                                                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                         | `next dev` on port 3100. Includes drafts (preview ribbon). `CONTENT_DIR=tests/fixtures/content/n4 npm run dev` uses a fixture set. `NEXT_PUBLIC_KIT=1` enables `/kit/`. |
| `npm run build`                                       | Production static export to `out/` (drafts excluded), via `scripts/build.mjs`; on Windows it then runs `scripts/fix-win-export.mjs` if present (D-07).                  |
| `npm run build:preview`                               | Same with `INCLUDE_DRAFTS=1` (drafts + ribbon). Never deploy it.                                                                                                        |
| `npm run start` / `npm run serve:out`                 | Serve `out/` locally like GitHub Pages → `scripts/serve-out.mjs`                                                                                                        |
| `npm run lint` / `npm run typecheck`                  | ESLint 10 flat config / `tsc --noEmit`                                                                                                                                  |
| `npm run test`                                        | Vitest unit tests (`tests/unit/**`)                                                                                                                                     |
| `npm run validate`                                    | Content validation over `CONTENT_DIR` (default `./content`) + rule fixtures (`tests/content/**`); CI job `validate-content`                                             |
| `npm run e2e`                                         | Playwright (`tests/e2e/**`), `BASE_URL` default `http://localhost:3100`                                                                                                 |
| `npm run media` / `media:check`                       | `scripts/media/build-images.mjs` (WebP variants + manifest; `--check` for CI)                                                                                           |
| `npm run import:content`                              | One-off dataset importer (`-- --dataset <path> --write`) → `scripts/import/import-dataset.mjs`                                                                          |
| `npm run cms:local`                                   | Local no-account Decap demo → `scripts/cms/local.mjs`                                                                                                                   |
| `npm run cms:config` / `cms:check`                    | Regenerate / verify `public/admin/*` from `cms/source.mjs` and the shared schema, tokens and fonts                                                                      |
| `npm run cms:vendor` / `cms:vendor:check`             | Re-vendor / verify the Decap 3.17.1 bundle against the npm tarball                                                                                                      |
| `npm run perf`                                        | JS budget on `out/` → `scripts/perf/js-budget.mjs`                                                                                                                      |
| `npm run perf:assets` / `check:export` / `lighthouse` | Font/transfer/upload budgets, export contract check, Lighthouse on the key pages (`scripts/perf/*`, `docs/HANDOVER.md` §10)                                             |
| `npm run slugs:record`                                | Write `content/.published-slugs.json` (D-05 redirect check)                                                                                                             |
| `npm run brand:wordmark`                              | Regenerate the outlined wordmark (Python 3 + fontTools)                                                                                                                 |
| `npm run format` / `format:check`                     | Prettier                                                                                                                                                                |

## Content

Files live in `content/` (created by WP7). Every item has `draft`; production builds exclude drafts. See `docs/ARCHITECTURE.md` §3 for the schema, derived data and every validator rule.

## Licences

Fonts in `src/fonts/` and the outlined wordmark glyphs: SIL Open Font License 1.1 (`src/fonts/OFL.txt`).
