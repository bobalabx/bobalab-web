# WP1 request 1: header uses the small dot + mono lockup (one large wordmark per screen)

- File(s): src/components/site/SiteHeader.tsx, src/styles/components.css (WP0)
- Why: DECISIONS D-02a / docs/design/JUDGE.md visual-fix 11: "Use the dot + mono lockup in the site header, so there is one large wordmark per screen." On home the header wordmark (1.6rem) and the hero h1 wordmark (≈4rem) sit about 100 px apart (MEASURED: `test-results/WP1/home-desktop-light.png`). On a 390 px phone the full wordmark also pushes the nav onto a second row, so the header is ≈ 120 CSS px tall and the first Fig. 1 pearl lands at y ≈ 735 of 844 (`test-results/WP1/home-mobile-dark.png`); a one-row header would give the pearls ≈ 80 px more room (JUDGE.md "Mobile").
- Proposed change:

  ```tsx
  // SiteHeader.tsx
  import { PearlMark } from "@/components/brand/PearlMark";
  …
  <Link href="/" className="bl-header__brand" aria-label="BOBALAB home">
    <PearlMark size="1.25rem" />
    <span className="bl-header__name" aria-hidden="true">BOBALAB</span>
  </Link>
  ```

  ```css
  /* components.css, after .bl-header__brand */
  .bl-header__brand { gap: 0.5rem; }
  .bl-header__name {
    font-family: var(--font-data);
    font-weight: 500;
    font-size: 0.9375rem;
    letter-spacing: 0.08em;
  }
  ```
- Blocking? no (home renders; only the duplicate-wordmark look and mobile fold remain).
- Test that proves it: `npx playwright test -c tests/visual/playwright.visual.config.ts home` — one wordmark SVG visible above the fold on `/`; at 390×844 the header is one row and `.f1-item:first-child .f1-pearl` top < 700.
