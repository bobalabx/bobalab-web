# WP2 request 1: let award badges wrap (horizontal scroll at 390 px)

- File(s): src/styles/components.css (WP0)
- Why: `PublicationEntry` renders each award as a `.bl-badge`, which has `white-space: nowrap`. Real award names are long (e.g. "INFORMS Behavioral Operations Management Best Working Paper, First Place, 2021"), so at 390 px the badge is wider than the viewport and the page scrolls sideways by about 200 px (WCAG 1.4.10 Reflow). MEASURED on `/research/algorithmic-advice/` with the shared dev server: `scrollWidth - clientWidth` = 211 px at 390×844. Any page that lists that paper (publications, people, home "Recent publications") has the same problem.
- Proposed change (append to the "Publication entry" block):

  ```css
  .bl-pub__awards .bl-badge {
    white-space: normal;
    max-width: 100%;
    height: auto;
    text-align: left;
  }
  ```

- Blocking? No. WP2 overrides it locally in `src/components/direction/direction.css` (`.dr-pubs .bl-pub__awards …`); the local rules can be removed once this lands.
- Test that proves it: `tests/e2e/research.spec.ts` "visual QA and axe … 390" and "no horizontal scroll at 320 px" assert zero horizontal overflow on every direction page.

**Update (WP2 review, 2026-10-20): superseded by `docs/change-requests/WP3/1-awards-in-list-entries.md`.** Same root cause, but WP3's version also turns awards into a quiet ruled list instead of seven outlined pills, which is what `/publications/` shows today. Two different renderings of the same paper on `/publications/` and `/research/{direction}/` looked inconsistent, so WP2's local workaround now mirrors WP3's rules exactly (scoped to `.dr-pubs`, used on direction and project pages). Please apply WP3 request 1 globally (plus WP1 request 4's `.bl-pub { grid-template-columns: minmax(0, 1fr) }`) and drop this one; WP2, WP3, WP4 and WP1 can then delete their local award rules.

Status: Rejected — superseded by WP3 request 1, which was applied globally in integration commit "integration: apply change requests" (2026-10-20); the WP2 local award rules in direction.css are removed.
