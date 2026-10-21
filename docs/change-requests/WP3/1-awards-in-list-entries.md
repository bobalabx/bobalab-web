# WP3 request 1: awards in list entries: wrap, and read as a quiet list

- File(s): `src/styles/components.css` (WP0). Same root cause as WP2 request 1 and WP1 request 4.
- Why:
  - `PublicationEntry` renders each award as a `.bl-badge` (`white-space: nowrap`). On `/publications/` at 390×844 the page scrolled sideways by 211 px (MEASURED with the shared dev server before the workaround; WCAG 1.4.10).
  - Beyond the overflow: the Management Science paper has seven awards, so the entry showed seven outlined pills, most followed by an "(as …)" note. In a list of 17 papers that reads as noise and pushes the materials row far down (brief §0.1 "credible first").
- Proposed change (replaces the `.bl-pub__awards` rule in the "Publication entry" block; supersedes WP2 request 1 for awards only):

  ```css
  .bl-pub {
    grid-template-columns: minmax(0, 1fr);
  }
  .bl-pub__awards {
    display: grid;
    gap: var(--s-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .bl-pub__awards > li {
    position: relative;
    min-width: 0;
    padding-left: 1.15rem;
    font-size: var(--fs-sm);
    line-height: var(--lh-sm);
  }
  .bl-pub__awards > li::before {
    content: "";
    position: absolute;
    left: 0.1rem;
    top: 0.4em;
    width: 0.55rem;
    height: 0.55rem;
    box-sizing: border-box;
    border: 1.5px solid var(--accent);
    border-radius: 50%;
  }
  .bl-pub__awards .bl-badge {
    display: inline;
    min-height: 0;
    padding: 0;
    border: 0;
    background: none;
    font-size: inherit;
    line-height: inherit;
    font-weight: 500;
    color: var(--ink);
    white-space: normal;
  }
  ```

  (Cleaner still: render `<span className="bl-pub__award">` instead of `<Badge tone="strong">` in `PublicationEntry.tsx` and style that span; the CSS above gives the same result without touching the component.)

- Blocking? No. WP3 applies exactly this, scoped to `.pubs-list` (index, work-in-progress list and the paper page's "Related papers"), in `src/components/publications/publications.css`. Remove that block once this lands.
- Test that proves it: `tests/e2e/publications.spec.ts` "no horizontal scroll at 320 px" and the 390 px screenshots in `test-results/WP3/index-390-*.png`.
