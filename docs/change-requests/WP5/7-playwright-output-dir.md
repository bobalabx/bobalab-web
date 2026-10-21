# WP5 request 7: parallel Playwright runs delete each other's artifacts

- File(s): `playwright.config.ts` (WP0)
- Why: MEASURED 2026-10-20. Playwright empties `outputDir` (`test-results/e2e`) at the start of every run. With several packages running specs at once against the shared dev server, one run deleted another's trace files mid-test, which failed otherwise-passing tests with `ENOENT … .playwright-artifacts-N/traces/…`. WP5 now runs with `--output=test-results/WP5/pw-output`.
- Proposed change:
  ```diff
  -  outputDir: "test-results/e2e",
  +  // E2E_OUTPUT lets parallel package runs keep separate artifact folders.
  +  outputDir: process.env.E2E_OUTPUT || "test-results/e2e",
  ```
  and a line in `docs/ARCHITECTURE.md` §6: "When several packages run Playwright at once, pass `--output=test-results/<WP>/pw-output` (or set `E2E_OUTPUT`)."
- Blocking? no (the CLI flag works today).
- Test that proves it: two concurrent `npx playwright test` runs with different `E2E_OUTPUT` values both pass.
