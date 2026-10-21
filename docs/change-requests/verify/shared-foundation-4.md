# Verify request shared-foundation-4: export-check guards for the pruned shells and the CSP position (ENG-03, ENG-05)

- File(s): scripts/perf/export-check.mjs, docs/ARCHITECTURE.md §2 (area ci-docs)
- Why:
  - ENG-03: the production export shipped `out/kit/index.html` and
    `out/research/_none/index.html` as HTTP 200 blank `__next_error__` shells (soft
    404s, no content without JS). `scripts/build.mjs` now runs `pruneExport()` after
    `next build` and the Windows fix. It deletes `out/kit/` (unless `NEXT_PUBLIC_KIT=1`)
    and every `out/**/_none/` folder, so GitHub Pages and serve-out answer with 404.html
    and status 404. MEASURED on an isolated production build served on :3277: `/kit/`
    404, `/research/_none/` 404, `/nope/` 404, `/` 200; `export-check` ok.
    `src/app/kit/page.tsx` metadata now says "Page not found" when the kit is off.
  - ENG-05: `scripts/build.mjs` now runs `hoistCsp()`. It moves the CSP `<meta>` to
    directly after `<meta charSet="utf-8"/>` in every exported page except /admin/,
    so the policy covers the hoisted font preloads, stylesheets and scripts. MEASURED:
    33 pages rewritten. After hydration and a client-side navigation there are no
    console errors or hydration warnings, and there is still exactly one CSP meta.
- Proposed change (export-check; keeps the guarantees from regressing):

```diff
--- a/scripts/perf/export-check.mjs
+++ b/scripts/perf/export-check.mjs
@@ (in the main checks, next to the sitemap checks)
+  // ENG-03: not-found shells must not ship (scripts/build.mjs pruneExport).
+  for (const { rel, dir } of files) {
+    if (dir && (rel === "kit" || rel.split("/").pop() === "_none"))
+      problems.push(`out/${rel}/ is a not-found shell served with status 200 (run npm run build)`);
+  }
+  // ENG-05: the CSP <meta> must directly follow <meta charSet> (scripts/build.mjs hoistCsp).
+  for (const { rel, dir } of files) {
+    if (dir || !rel.endsWith(".html") || rel.startsWith("admin/")) continue;
+    const html = fs.readFileSync(path.join(out, rel), "utf8");
+    if (html.includes('http-equiv="Content-Security-Policy"') &&
+        !html.includes('<meta charSet="utf-8"/><meta http-equiv="Content-Security-Policy"'))
+      problems.push(`${rel}: CSP <meta> is not the first tag after <meta charSet>`);
+  }
```

(Adapt the variable names, e.g. `files`/`problems`/`out`, to the script's own walk
and error list.) In docs/ARCHITECTURE.md §2 add: "The build moves the CSP `<meta>`
to directly after `<meta charset>` (`hoistCsp` in scripts/build.mjs), because Next
emits layout `<head>` children after its hoisted resources and a meta policy only
governs what follows it. `script-src 'unsafe-inline'` remains (Next's no-nonce static
output), so the policy mainly blocks off-origin loads."

- Blocking? no.
- Test that proves it: `npm run build && npm run check:export` passes, and fails when
  `out/kit/index.html` is restored by hand or the CSP meta is moved back.
  tests/unit/foundation/verify-fixes.test.tsx already covers `pruneExport` and
  `hoistCspInHtml`.

Status: Applied by the final verifier (2026-10-20) in scripts/perf/export-check.mjs (both guards, plus the header comment) and docs/ARCHITECTURE.md §2. Commit "verify(ci-docs): …".
