# WP5 request 5: Privacy and Accessibility statements need lab review before launch

- File(s): `content/pages/privacy.yml`, `content/pages/accessibility.yml` (WP7; lab decision)
- Why: both statements are `draft: true`, so a production build (D-03) publishes `/privacy/` and `/accessibility/` with only the heading and the contact panel (MEASURED: `tests/unit/feed/production-render.test.tsx`, screenshots `test-results/WP5/prod-privacy-*.png`, `prod-accessibility-*.png`). Brief §D2/§D12: a privacy statement is required for a berkeley.edu hostname (KB via R4 V28), and §G1 sets WCAG 2.2 AA as the stated target. The draft texts already cover everything the brief lists (no cookies/analytics, `localStorage` `bobalab-motion`, `sessionStorage` `bobalab-intro`, GitHub host logs, CMS token in the editor's browser; target, known limits, how to report).
- Proposed change: add both to `docs/CONTENT-QUESTIONS.md` as launch blockers for the PI ("approve and flip `draft: false`"), and consider adding `last_reviewed: YYYY-MM-DD` when they are approved (the pages show "Last reviewed …" when it is set).
- Blocking? no (the pages render honestly either way).
- Test that proves it: after the flip, `production-render.test.tsx` output contains the statement bodies; `tests/e2e/pages.spec.ts` "privacy statement: storage keys match the code" keeps the keys in sync with `src/lib/site/motion.ts`.
