# WP1 request 2: wordmark reads "BOBALAB", not "BOBA LAB"

- File(s): scripts/brand/build-wordmark.py → src/components/brand/wordmark-geometry.ts (WP0)
- Why: docs/design/JUDGE.md visual-fix 11: "Wordmark: remove the space ("BOBALAB"). Set LAB at cap height." The generated wordmark still shows a visible gap between "A" and "L" (Plex Mono advance + 0.08 em tracking on the first L), so the hero h1 reads as two words (`test-results/WP1/home-desktop-light.png`, hero and header).
- Proposed change: in the generator, place the first LAB glyph at the end of the last "A" advance minus the Plex Mono left side bearing of "L" (no extra tracking before the first glyph; keep +0.08 em between L-A-B), confirm LAB cap height = BOBA cap height, then `npm run brand:wordmark`.
- Blocking? no.
- Test that proves it: visual check of the hero h1 at 1366×768; the A→L gap should be ≤ the L→A gap.
