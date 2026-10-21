# WP4 request 3: optional direction dot in FilterChips

- File(s): `src/components/ui/FilterChips.tsx` (WP0)
- Why: R3 §7.7 (the source of brief §D9) describes the People filters as "role chips plus direction (pearl) chips". WP4 uses the shared `FilterChips` for both facets; the direction chips currently show the label only (fine for meaning, WCAG 1.4.1), but they do not echo the direction colour the rest of the site uses (`PearlTag`). WP3's direction chips on /publications/ would benefit the same way.
- Proposed change (backwards compatible):

  ```tsx
  import type { SwatchId } from "@/lib/content/palette";

  export interface ChipOption {
    value: string;
    label: string;
    count?: number;
    /** Direction colour: renders the flat 10 px dot before the label (§C9). */
    swatch?: SwatchId;
  }
  …
  <button …>
    {o.swatch && <span className="bl-dot" data-swatch={o.swatch} aria-hidden="true" />}
    <span>{o.label}</span>
    …
  ```

  Pressed state: the dot sits on `--ink`; add `.bl-chip[aria-pressed="true"] .bl-dot { box-shadow: 0 0 0 1.5px var(--paper); }` so it stays visible.
- Blocking? No. When it lands, WP4 passes `swatch` in `src/components/people/PeopleIndex.tsx` (`directionOptions.map(({ value, label }) => …)` → add `swatch: d.color`; the model already knows the direction).
- Test that proves it: render test asserting `data-swatch` on the dot inside a direction chip, and `tests/e2e/people.spec.ts` axe passes with a pressed direction chip.
