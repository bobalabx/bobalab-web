# Verify cms request 2: deploy gate for the CMS sign-in, and three doc notes

- Findings: CMS-05 (REPLACE-ME can go live; the placeholder test blocked SETUP §5), CMS-13
  (no frame-ancestors on GitHub Pages), CMS-10 (first CMS save reformats untouched YAML).
- Files (ci-docs): `.github/workflows/deploy.yml`, `docs/SETUP-PRODUCTION.md`, `docs/HANDOVER.md`
- Already done in the cms area:
  - `tests/unit/cms/config.test.ts` no longer requires the placeholder: it requires an https
    origin without a path, so SETUP §5 no longer turns the `test` job red.
  - New `scripts/cms/check-backend.mjs [config.yml] [--site content/site.yml]`: when the backend
    still contains `REPLACE-ME` it prints a warning (exit 0) while `site.yml` has
    `launched: false` and an error (exit 1) once `launched: true`; in GitHub Actions it also
    emits a `::warning::` / `::error::` annotation. Unit-tested in `tests/unit/cms/config.test.ts`.
  - `public/admin/cms-start.js` refuses to start Decap inside a frame and shows a link to open
    `/admin/` on its own (unit test `tests/unit/cms/start.test.ts`, e2e "inside a frame …").
  - `docs/EDITING.md` §12 tells reviewers about formatting-only lines in a file's first CMS save.

## Proposed change 1: `.github/workflows/deploy.yml` (job `build`, after the export contract)

```diff
       - name: Export contract (404.html, admin/, sitemap, robots, no drafts or unlisted people)
         run: node scripts/perf/export-check.mjs out
         env:
           NEXT_PUBLIC_BASE_PATH: ${{ steps.site.outputs.base_path }}
+      - name: CMS sign-in configured (REPLACE-ME is an error once site.yml launched is true)
+        run: node scripts/cms/check-backend.mjs out/admin/config.yml --site content/site.yml
       - uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0
```

(Optionally the same step in `ci.yml` after its export check, so a PR that sets
`launched: true` without the Worker fails before merge.)

## Proposed change 2: `docs/SETUP-PRODUCTION.md` §5, end of the "Run `npm run cms:config` …" paragraph

```diff
-   Run `npm run cms:config` (`node scripts/cms/build-config.mjs`), commit both files, and let CI pass. `auth_scope: public_repo` stays for a public repo; use `repo` only if the repo goes private (R4 §8 C5). The `/admin/` CSP allows the bridge origin derived from `base_url`.
+   Run `npm run cms:config` (`node scripts/cms/build-config.mjs`), commit both files, and let CI pass (`tests/unit/cms/config.test.ts` accepts any https origin for `base_url`). `auth_scope: public_repo` stays for a public repo; use `repo` only if the repo goes private (R4 §8 C5). The `/admin/` CSP allows the bridge origin derived from `base_url`. Until this step is done, every deploy warns "the CMS sign-in cannot work yet" (`scripts/cms/check-backend.mjs`); once `site.yml` has `launched: true` that check fails the deploy, so the live `/admin/` never shows a login that cannot work.
```

And under the CSP / security notes (or §G4 equivalent), one sentence:

```diff
+GitHub Pages cannot send `X-Frame-Options` or a `frame-ancestors` header, and browsers ignore `frame-ancestors` in the `<meta>` CSP of `/admin/`. Instead, `public/admin/cms-start.js` does not start the content manager inside a frame (it shows a link to open it on its own), which covers clickjacking of the editor.
```

## Proposed change 3: `docs/HANDOVER.md`

§14 Known limits, replace the clickjacking line:

```diff
-- `/admin/` cannot get clickjacking protection on GitHub Pages (`frame-ancestors` needs a header; brief §G4).
+- `/admin/` cannot get header-based clickjacking protection on GitHub Pages (`frame-ancestors` needs a header; brief §G4). `cms-start.js` therefore refuses to run inside a frame (a script guard; it does not protect against a browser with scripts off, where the CMS does not run anyway).
+- The first CMS save of a content file re-writes it in Decap's YAML style (lines folded at 80 characters, date quotes dropped, keys in the editor's order, empty `social: {}` removed), so that pull request shows formatting-only lines next to the real change. Later saves of the same file show only the edit. Review with "Hide whitespace" off and read the changed values, or ask for the formatting to be split out.
```

§7 Bumping Decap CMS, step 3, add after "try an edit":

```diff
-3. `npm run test` (the CMS parity and vendoring tests), then `npm run cms:local` and try an edit.
+3. `npm run test` (the CMS parity and vendoring tests), then `npx playwright test tests/e2e/cms-local.spec.ts` (it re-measures the Decap work-arounds in `public/admin/cms-widgets.js` and `cms-start.js`: list item removal, keyboard reordering, the stale-editor reload), then `npm run cms:local` and try an edit.
```

- Blocking? Change 1 matters at launch: without it `/admin/` can go live with a dead login.
  Changes 2–3 are documentation.
- Test that proves it: `node scripts/cms/check-backend.mjs public/admin/config.yml` prints the
  warning and exits 0 today; with a site.yml copy that has `launched: true` it exits 1 (the unit
  test does exactly this). `tests/unit/wp8/workflows.test.ts` may need the new step name if it
  pins the step list.

Status: Applied by the final verifier (2026-10-20): change 1 in deploy.yml and also in ci.yml (after the export contract); change 2 in docs/SETUP-PRODUCTION.md §C step 5; change 3 in docs/HANDOVER.md §7 and §14. Commit "verify(ci-docs): …".
