# WP4 request 1: one shared, deterministic avatar colour for pearl-initial avatars

- File(s): `src/lib/content/people.ts` (WP0), `src/components/ui/PersonCard.tsx` (WP0); follow-up for WP1 in `src/components/home/HomeSections.tsx` (home People strip).
- Why: brief §D9 / WP4 task: "pearl-initial avatar (deterministic colour from the swatch set) when no consented photo". Today `PersonCard` and the home People strip colour the pearl only from the person's first direction (`directions[0]?.color`). Almost nobody has directions yet (CONTENT-MAPPING §4.2: `directions: []`), so those avatars get no swatch at all, while the People page (WP4) gives every person a stable swatch. The same person would then look different on home and on /people/.
- Proposed change:
  1. Move WP4's helper into `src/lib/content/people.ts` (it is pure and already unit-tested in `tests/unit/people-page/model.test.ts`, "avatar colour"):

     ```ts
     import { DEFAULT_SWATCH_ORDER, type SwatchId } from "./palette";

     /** First direction's colour, else a stable FNV-1a hash of the slug over the CVD-checked set (§C3). */
     export function avatarSwatch(
       slug: string,
       directions: ReadonlyArray<{ color: SwatchId }> = [],
     ): SwatchId {
       const own = directions[0]?.color;
       if (own) return own;
       let h = 0x811c9dc5;
       for (let i = 0; i < slug.length; i++) {
         h ^= slug.charCodeAt(i);
         h = Math.imul(h, 0x01000193) >>> 0;
       }
       return DEFAULT_SWATCH_ORDER[h % DEFAULT_SWATCH_ORDER.length]!;
     }
     ```

  2. `PersonCard.tsx`: `swatch={avatarSwatch(person.slug, directions)}` instead of `swatch={directions[0]?.color}`.
  3. WP1 `HomeSections.tsx`: `swatchOf={(p) => avatarSwatch(p.slug, directionsOf(c, p.directions))}`.
  4. WP4 then re-exports/imports it from `@/lib/content/people` and deletes its local copy in `src/components/people/model.ts` (one-line change; WP4's tests keep passing).
- Optional, same request: WP4 shows the swatch as a soft halo, because the pearl's own swatch glow is very faint on the dark pearl body:
  `.bl-pearl.pp-avatar { box-shadow: 0 0 0 4px color-mix(in srgb, var(--dir-dot) 32%, transparent); }` (in `src/components/people/people.css`). If WP0 wants this for every avatar, add a `bl-pearl--halo` modifier to `components.css` with the same rule.
- Blocking? No. WP4 computes the colour locally (`src/components/people/model.ts → avatarSwatch`).
- Test that proves it: `tests/unit/people-page/model.test.ts` "avatar colour" (deterministic, in `DEFAULT_SWATCH_ORDER`, spreads over ≥ 4 swatches, uses the direction colour when present).

Status: Applied in integration commit "integration: apply change requests" (2026-10-20): `avatarSwatch()` lives in src/lib/content/people.ts; PersonCard and the home People strip use it; WP4's model re-exports it. The optional halo modifier is rejected for WP0 — only the People page uses it, so it stays in people.css.
