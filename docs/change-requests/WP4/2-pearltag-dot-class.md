# WP4 request 2: PearlTag small dot class is concatenated without a space

- File(s): `src/components/ui/PearlTag.tsx` (WP0)
- Why: the dot's class is built as

  ```tsx
  className={`bl-dot${size === "sm" ? "bl-dot--sm" : ""}`}
  ```

  so `size="sm"` renders `class="bl-dotbl-dot--sm"`: neither `.bl-dot` nor `.bl-dot--sm` applies and the dot disappears (the tag then shows text only). The default `md` size is unaffected.
  Root cause (MEASURED by WP4 on 2026-10-20): `prettier-plugin-tailwindcss` trims the leading space inside class-name template literals. WP4 wrote `` `pp-card${lead ? " pp-card--lead" : ""}` ``; `npx prettier --write` turned it into `"pp-card--lead"` (no space). The same thing probably happened here. Every package that formats with Prettier is exposed to this.

- Proposed change:

  ```tsx
  className={size === "sm" ? "bl-dot bl-dot--sm" : "bl-dot"}
  ```

  and, as a guard for all packages, a line in `docs/ARCHITECTURE.md` §5: "Do not build class names with a leading space inside a template literal (`` `a${x ? " b" : ""}` ``); prettier-plugin-tailwindcss trims it. Use whole strings or `[a, x && b].filter(Boolean).join(" ")`."

- Blocking? No. WP4 only uses the default size.
- Test that proves it: a render test like WP4's `tests/unit/people-page/render.test.tsx` → "gives the Faculty Director the wide lead card (well-formed class names)", which asserts no `pp-…pp-` run-on classes; for PearlTag: `renderToStaticMarkup(<PearlTag label="x" swatch="matcha" size="sm" />)` contains `class="bl-dot bl-dot--sm"`.

Status: Applied in integration commit "integration: apply change requests" (2026-10-20), with the class-name guard in ARCHITECTURE §5.
