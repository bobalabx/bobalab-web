# Redesign PUBLICATIONS request 1: document the plates API and the provenance footnote in ARCHITECTURE §9

> **Status: APPLIED (integration, 2026-10-24)** as ARCHITECTURE §9 items 12 and 13 (item 11 is HOME's), and item 6's stale note is updated.

- File(s): `docs/ARCHITECTURE.md` (not owned by PUBLICATIONS)
- Why: D-13 item 8 asks for study-design plates as "a code component per paper (registry keyed
  by publication slug)". PUBLICATIONS built it in `src/components/plates/`. Other page packages
  (direction, project) that show a paper's plate should use the same entry point, and the
  integrator should know that §9 item 6's note "tests/e2e/publications.spec.ts still expects the
  inline wording" is resolved.
- Workaround used: none needed; the code is in place. This is documentation only.
- Blocking? No.
- Test that proves it: `npx vitest run tests/unit/publications/plates.test.tsx` (registry, gate,
  Learning to Gig off); `npx playwright test tests/e2e/publications.spec.ts -g plate`.
- Proposed change (exact patch, appended to §9 after item 10):

```diff
--- a/docs/ARCHITECTURE.md
+++ b/docs/ARCHITECTURE.md
@@ §9
 10. **Kit.** …
+11. **Study-design plates (PUBLICATIONS).** `src/components/plates/`: `registry.tsx` maps a
+    publication slug to `{ steps, caption, source, Body }`; pages render
+    `<StudyPlate pub={p} preview={c.preview} figure={n} />` from `@/components/plates`, which
+    returns nothing unless a plate is registered AND `showStudyPlate(p, preview)` holds
+    (`plate_verified: true`, or a preview build, where it is marked "Draft figure, pending author
+    check"). Only `bastani-2026-rl-tips` is registered; `deng-2025-learning-to-gig` is deliberately
+    absent (unverified facts, JUDGE.md §4). Labels are HTML, strokes SVG; the 4-step step-through
+    (`PlateStepper`, client) is hidden under reduced motion and without JS, where every step shows.
+12. **Provenance footnote (PUBLICATIONS, D-13 item 7).** `/publications/` prints one footnote
+    ("Review statuses are as reported by the lab, dated by when each was last checked.") when a
+    shown status is self-reported; rows carry "…, as of Mon YYYY". The paper page states its one
+    status as "As of Month YYYY, as reported by the lab."; self-reported awards get a dagger and a
+    single "† Reported by the lab." note. Wording pending PI sign-off (D-13 item 7).
```
