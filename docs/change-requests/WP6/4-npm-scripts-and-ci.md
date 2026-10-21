# WP6 request 4: npm scripts for the CMS generator, and CI hooks

- File(s): `package.json` (WP0); `.github/workflows/ci.yml` and `docs/SETUP-PRODUCTION.md` (WP8)
- Why: maintainers regenerate `public/admin/*` from `cms/source.mjs` and re-verify the vendored Decap bundle; raw `node scripts/cms/…` commands are easy to forget. `cms:local` already exists and points at `scripts/cms/local.mjs`.
- Proposed change:
  1. `package.json` → `"scripts"`:
     ```json
     "cms:config": "node scripts/cms/build-config.mjs",
     "cms:check": "node scripts/cms/build-config.mjs --check",
     "cms:vendor": "node scripts/cms/vendor-decap.mjs",
     "cms:vendor:check": "node scripts/cms/vendor-decap.mjs --check"
     ```
  2. CI (`unit` job): nothing to add for parity and freshness; `tests/unit/cms/**` already fails when `config.yml` is stale or drifts from the zod schema. Optionally run the network check weekly: `CMS_VENDOR_CHECK=1 npx vitest run --config vitest.config.ts tests/unit/cms` (or `npm run cms:vendor:check`).
  3. CI (`e2e` job): `tests/e2e/cms-local.spec.ts` needs a `next dev` server that serves `public/` (it writes `public/admin/local.html`, `content/news/…-cms-smoke-test-delete-me.md` and `content/publications/…-cms-smoke-test-publication-w.md` temporarily, and starts `decap-server` on port 8081). Against a static export it skips itself (`/admin/local.html` → 404). Run it only in a dev-server job, with one worker for that file (the spec is `serial`), and not in parallel with other specs that list news or publications.
  4. `docs/SETUP-PRODUCTION.md`: at hookup, edit `cms/source.mjs` (`backend.base_url` = the Worker origin, `backend.repo`, `SITE_URL`), run `npm run cms:config`, commit. The `/admin/` CSP needs `'unsafe-eval'` (MEASURED: Decap's Ajv config validation) and allows `api.github.com`, the Worker origin and GitHub avatars; GitHub Pages cannot send `frame-ancestors`.
  5. **Regenerate after shared-file changes (integrator).** `public/admin/{config.yml,preview.css,cms-data.js,logo.svg,fonts/*}` are generated from `src/lib/content/{schema,people,palette,dates}.ts`, `src/components/ui/labels.ts`, `src/styles/{tokens,base,prose,components}.css`, `src/fonts/*` and `src/components/brand/wordmark-geometry.ts` as well as `cms/`. After merging a change to any of those, run `npm run cms:config` (or `node scripts/cms/build-config.mjs`) and commit the result; until then `tests/unit/cms/config.test.ts` ("generated admin files are up to date") fails, by design.
- Blocking? no.
- Test that proves it: `npm run cms:check` exits 0; `npm run cms:vendor:check` prints `CHECK OK`.

Status: Applied in integration commit "integration: apply change requests" (2026-10-20): the four `cms:*` scripts; SETUP-PRODUCTION names `npm run cms:config`; admin files regenerated after the shared-file changes (item 5). Items 2–3 needed no change (CI already runs the CMS unit tests; cms-local.spec.ts stays out of the export e2e job).
