# Redesign FOUNDATION request 3: CMS preview test expects the new paper tokens

> **Status: APPLIED (integration, 2026-10-24).** `tests/unit/cms/preview.test.ts` now expects `#ffffff` / `#101210`.

- File(s): `tests/unit/cms/preview.test.ts` (CMS package / WP6)
- Why: D-13 item 4 changes `--paper` from cream `#fcfaf6` / `#17110e` to white `#ffffff` /
  `#101210`. `public/admin/preview.css` is regenerated from `src/styles/tokens.css`, so the
  test that pins the old values fails (1 test).
- Blocking? No.
- Proposed change (lines 51–52):

```diff
-      "--paper: #fcfaf6",
-      "--paper: #17110e",
+      "--paper: #ffffff",
+      "--paper: #101210",
```

- Test that proves it: `npx vitest run tests/unit/cms/preview.test.ts`.
