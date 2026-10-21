# Verify request shared-foundation-3: CMS url pattern must reject "//host" too (ENG-06)

- File(s): scripts/cms/lib/decap-config.mjs (area cms), then `npm run cms:config`
  (regenerates public/admin/config.yml and the local config).
- Why: finding ENG-06. `urlField` in src/lib/content/schema.ts accepted
  `//evil.example/x` as a "site path". withBasePath() and Markdoc's siteRelative()
  leave `//…` unchanged, and the redirect writer uses it as the meta-refresh target and
  link, so an internal-looking link could go off-site. Shared-foundation fixed the zod
  schema: the site-path branch is now `/^\/(?![/\\])[^\s]*$/` (it also rejects `/\host`,
  which browsers treat like `//host`). E_SCHEMA fixtures were added in
  tests/content/rules.test.ts. The editor-side mirror `URL_OR_PATH_RE` still accepts both,
  so an editor gets no inline error and only learns from CI.
- Proposed change:

```diff
--- a/scripts/cms/lib/decap-config.mjs
+++ b/scripts/cms/lib/decap-config.mjs
@@
-/** zod urlField: an https URL or a site path starting with "/". */
-export const URL_OR_PATH_RE = "^(?:https://\\S+|/\\S*)$";
+/** zod urlField: an https URL or a site path starting with "/" (not "//host" or "/\host"). */
+export const URL_OR_PATH_RE = "^(?:https://\\S+|/(?![/\\\\])\\S*)$";
```

Then `npm run cms:config`, and add a case to tests/unit/cms (for example
`new RegExp(URL_OR_PATH_RE).test("//evil.example/x") === false`, while `/uploads/a.pdf`
and `https://x.test/` still pass).

- Blocking? no. The validator (CI) already rejects these values.
- Test that proves it: `npm run cms:check` is clean and the new unit case passes.

Status: Applied by the final verifier (2026-10-20) in scripts/cms/lib/decap-config.mjs; `npm run cms:config` regenerated the admin files; new unit cases in tests/unit/cms/config.test.ts. Commit "verify(cms): …".
