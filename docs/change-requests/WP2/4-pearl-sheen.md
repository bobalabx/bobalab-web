# WP2 request 4: one pearl material: WP0 `Pearl` should use WP1's satin sheen

- File(s): src/styles/components.css (WP0), "Pearl" block (`.bl-pearl--gloss::before`)
- Why: the site now draws pearls two ways. WP1's `DirectionPearl` (home Fig. 1, direction hero, sibling rail) uses the judge's satin sheen: one soft radial ellipse (DECISIONS D-02a, `docs/design/JUDGE.md` "Pearl body"). WP0's `Pearl` (direction cards on `/research/`, people avatars, project team avatars) draws a stroked crescent (`border-top` + `border-left` arc). At 40–64 px that arc reads as a thin "C" scratched on the pearl, not as gloss, and a visitor who clicks a direction card on `/research/` lands on a hero pearl with a different material. MEASURED visually on the shared dev server, 1366×768, light and dark (WP2 review screenshots).
- Proposed change (replace the `.bl-pearl--gloss::before` rule; values copied from `src/components/figure/figure.css` `.f1-pearl::before` and `--f1-sheen`):

  ```css
  .bl-pearl--gloss::before {
    content: "";
    position: absolute;
    left: 13%;
    top: 15%;
    width: 34%;
    height: 14%;
    border-radius: 50%;
    rotate: -35deg;
    background: radial-gradient(closest-side, var(--pearl-sheen), transparent);
    pointer-events: none;
  }
  ```

  with `--pearl-sheen: rgb(255 248 238 / 0.16)` (light) and `rgb(255 248 238 / 0.1)` (dark) in `tokens.css`. Optionally WP1 can then read `--f1-sheen` from `--pearl-sheen` so there is one token. `forced-colors.css` already hides the `::before`.

- Blocking? No. WP2 overrides it locally for the direction cards only (`.rs-grid--dirs .bl-pearl--gloss::before` in `src/components/direction/direction.css`); remove that block once this lands.
- Test that proves it: on `/research/`, the computed `background-image` of `.bl-direction-card .bl-pearl::before` is a radial gradient and `border-top-width` is `0px`; visual check that card pearls and `/research/{slug}/` hero pearls carry the same sheen.

Status: Applied in integration commit "integration: apply change requests" (2026-10-20). `--pearl-sheen` in tokens.css (light 0.16 / dark 0.1); `.bl-pearl--gloss::before` is the radial sheen; figure.css `--f1-sheen` now reads `--pearl-sheen` (one token); the WP2 local override is removed.
