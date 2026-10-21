# Verify cms request 1: validator wording for unconsented photos; duplicate colours after launch

- Findings: CMS-06 (photo uploaded without consent is still deployed), CMS-07 (a duplicate
  colour can go live because it is only a warning).
- File (shared-foundation): `src/lib/content/validate.ts`
- Already done in the cms area: the photo hint in `cms/source.mjs` says uploads are public even
  while "Photo consent" is off; `public/admin/cms-hooks.js` refuses to save a person with a photo
  while `photo_consent` is off, and refuses a live direction whose colour another live direction
  uses (the direction preview lists the colours in use). `docs/EDITING.md` §4 and §6 say so.
  These two validator changes make CI agree with the editor for files changed outside the CMS
  (hand edits, imports).

## Proposed change 1 (CMS-06): say that the file is still published

```diff
   for (const p of E.people) {
     if (p.photo && !p.photo_consent)
       warn(
         "W_CONSENT_PHOTO",
-        "photo is set but photo_consent is false; the photo will not be shown",
+        "photo is set but photo_consent is false: no page shows it, but the uploaded file is still published at its /uploads/ address; remove the photo (and the file) until the person agrees in writing",
         p.file,
         "photo_consent",
       );
```

## Proposed change 2 (CMS-07): two live directions with one colour is an error once launched

```diff
   for (const [color, slugs] of byColour) {
-    if (slugs.length > 1)
-      warn(
-        "W_COLOR_DUP",
-        `colour ${color} is used by ${slugs.join(", ")}`,
-        `directions/${slugs[1]}.md`,
-        "color",
-      );
+    if (slugs.length > 1) {
+      // Each pearl needs its own colour (EDITING §6); the CMS already refuses it.
+      if (site?.launched)
+        err(
+          "E_COLOR_DUP",
+          `colour ${color} is used by ${slugs.join(", ")} (site.launched is true)`,
+          `directions/${slugs[1]}.md`,
+          "color",
+        );
+      else
+        warn(
+          "W_COLOR_DUP",
+          `colour ${color} is used by ${slugs.join(", ")} (becomes an error once site.launched is true)`,
+          `directions/${slugs[1]}.md`,
+          "color",
+        );
+    }
   }
```

(Same pattern as `E_DIR_COUNT_ZERO` / `W_DIR_COUNT_ZERO` just above it.)

- Blocking? No. Today's content has six distinct colours and no person with a photo.
- Test that proves it: in `tests/content/`, a fixture edit that gives two live directions one
  colour yields `W_COLOR_DUP` with `launched: false` and `E_COLOR_DUP` with `launched: true`
  (the `n4` fixture has `launched: true`); the `W_CONSENT_PHOTO` message test (if any) gets the
  new wording. `npm run validate` and `npm run test` stay green.

Status: Applied by the final verifier (2026-10-20) in src/lib/content/validate.ts, verbatim. tests/content/rules.test.ts now has E_COLOR_DUP (n4, launched: true) and W_COLOR_DUP (launched: false) cases; docs/ARCHITECTURE.md rule table and cms/README.md updated. Commit "verify(shared-foundation): …".
