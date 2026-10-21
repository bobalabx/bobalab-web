# WP8 request 3: npm script names for the quality-gate scripts

- File(s): `package.json` (WP0)
- Why: WP8 added gate scripts besides `perf` (`scripts/perf/js-budget.mjs`): the export contract check, the font/transfer/upload budgets and the Lighthouse run (brief §G2, §G5, WP8 #4 and #10). CI calls them with `node …` directly, but maintainers look for them under `npm run` (`docs/HANDOVER.md` §10, `docs/QA-CHECKLIST.md` §6).
- Proposed change (scripts block):
  ```diff
     "perf": "node scripts/perf/js-budget.mjs",
  +  "perf:assets": "node scripts/perf/asset-budget.mjs",
  +  "check:export": "node scripts/perf/export-check.mjs",
  +  "lighthouse": "node scripts/perf/lighthouse.mjs",
  ```
  Running the e2e suite against an export needs two env vars (`E2E_STATIC=1 BASE_URL=http://127.0.0.1:4173 npx playwright test`); without a cross-env dependency that stays a documented command (HANDOVER §10), not a script.
- Blocking? no.
- Test that proves it: `npm run perf:assets`, `npm run check:export` and `npm run lighthouse` behave like the `node` commands.
