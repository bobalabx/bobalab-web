# Verify request content-1: EDITING.md asks for each member's own program wording and capitalisation

- Finding: VIS-06 / CON-04. The importer now writes `program` in display casing
  (`EECS`, `Applied Math/DS`, `IEOR`) without expanding any abbreviation
  (`scripts/import/lib.mjs` → `programLabel`). Whether "DS" means "Data Science",
  "ISF" or "Econ" should be spelled out, and how, is the member's choice
  (CONTENT-QUESTIONS E11, part of the H-11 consent review).
- File(s) (cms area): `docs/EDITING.md` §4 "Consent rules", the "Rules:" list.
- Proposed change (one bullet, after "Students who leave: …"):

```diff
 - Students who leave: set the **End** date (they move to Alumni automatically; the CMS will not save an End before the Start) and ask whether they want "Now at" shown.
+- **Program:** when a member consents to appear, ask how they want their program written, with their capitalisation (for example "EECS", "Applied Math & Data Science"). Do not repeat the degree the role already shows ("Master's student · IEOR", not "· IEOR MS"). Never leave it in lower case.
 - Never add anyone from old, hidden rosters on other sites. When in doubt, leave the person out and ask the PI.
```

- Optional (shared-foundation, `src/lib/content/validate.ts`): a warning
  `W_PROGRAM_CASE` when `program` is non-empty and equals its own lower case.
  Not needed for the current content (no lower-case program remains; checked by
  `tests/unit/wp7/content-wording.test.ts`), so it is left to that area's owner.
- Blocking? No.
- Test that proves it: none needed (docs only).

Status: Applied by the final verifier (2026-10-20) in docs/EDITING.md §4 (the optional W_PROGRAM_CASE warning was not added: no lower-case program remains and content-wording.test.ts guards it). Commit "verify(cms): …".
