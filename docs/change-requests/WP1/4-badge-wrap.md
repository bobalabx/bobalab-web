# WP1 request 4: long badges must wrap (same issue as WP2 request 1)

- File(s): src/styles/components.css (WP0)
- Why: home "Recent publications" lists a paper with long award badges (`.bl-badge`, `white-space: nowrap`), which made `/` scroll sideways by 211 px at 390 px and 281 px at 320 px (MEASURED, WCAG 1.4.10). The `.bl-pub` grid also lacks `minmax(0, 1fr)`, so its column grows to the badge's min-content width.
- Proposed change: apply WP2 request 1, plus `.bl-pub, .bl-news { grid-template-columns: minmax(0, 1fr); }`.
- Blocking? no. Workaround in `src/components/home/home.css` (scoped to `.hm-sec`); remove it once this lands.
- Test that proves it: `tests/e2e/home.spec.ts` "no horizontal scroll at 390/320 px" passes without the home.css work-around.
