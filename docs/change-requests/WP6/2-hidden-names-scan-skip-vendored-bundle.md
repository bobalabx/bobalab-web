# WP6 request 2: skip the vendored Decap bundle in the hidden-names scan

- File(s): `tests/content/wp7-hidden-names.test.ts` (WP7 test in WP0's `tests/content/**`)
- Why: the scan reads every committable text file, now including the vendored `public/admin/decap-cms.js` (4.86 MB). MEASURED 2026-10-20: `scanText` on that one file takes **6.3 s**, so the test "no tracked or committable text file contains a hidden-only name" exceeds Vitest's default 5 s timeout (full run: 13.7 s, `Test timed out in 5000ms`). The bundle has **0 matches**, and it cannot change without failing WP6's SHA-256 pin (`tests/unit/cms/config.test.ts`, `cms/decap-cms.lock.json`: byte-identical to npm `decap-cms@3.17.1`), so scanning it adds nothing.
- Proposed change (either; the first is preferred):
  ```diff
  -const SKIP = /^(node_modules|\.next|out|test-results|playwright-report|coverage)\//;
  +const SKIP =
  +  /^(node_modules|\.next|out|test-results|playwright-report|coverage)\/|^public\/admin\/decap-cms\.js(\.LICENSE\.txt)?$/;
  ```
  or give the test a longer timeout: `it("no tracked … name", () => { … }, 60_000);`
- Blocking? no for WP6; yes for `npm run validate` (CI job `validate-content`) once WP6 is committed.
- Test that proves it: `npm run validate` passes; the scan's duration drops from ~13.7 s to ~7 s.

Status: Applied in integration commit "integration: apply change requests" (2026-10-20) (preferred option: skip regex).
