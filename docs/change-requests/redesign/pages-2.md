# Redesign PAGES request 2: /join/ says the URAP tracks and hours twice

> **Status: APPLIED, alternative (trim the prose) (integration, 2026-10-24).** The route is also printed on its own (direction pages' "Work with us on this"), so "the four tracks above" would not always have a referent. `content/pages/join.yml` `students` (and the importer's `JOIN.students`) drop the track list and hours; the URAP row keeps them. Logged for the PI as R-21. The headshot note (`milosz-platek.jpg`) is media the lab must supply: NOT applied, listed as a remaining item.

- File(s): `content/opportunities/urap.md` (content; owned by CONTENT), or alternatively
  `content/pages/join.yml` (`students`).
- Why: D-13 item 7 / DIRECTION §1.1 cause 6 (machine-voiced, repeated copy). MEASURED on the
  shared dev server (preview, 1440 and 390, light and dark, 2026-10-24): on `/join/` the
  "Students & research assistants" row lists the four URAP tracks and "about 9–11 hours a week,
  remote work is possible" in the `join.yml` prose, and the first ledger row directly under it
  (`urap.md` `route`) repeats the same four tracks and the same hours sentence. The two copies
  sit about 300 px apart (`test-results/redesign-pages/review/after/join-1440-light.png`). Read
  by a Haas faculty member, that duplication is what assembled, generated text looks like.
  The PAGES package cannot fix it in code: both are content fields and the page renders each
  verbatim (the e2e test checks the route is shown verbatim).
- Blocking? No. Copy only; needs the same PI sign-off as the other copy changes
  (`docs/CONTENT-QUESTIONS.md`, "Redesign copy changes").
- Workaround used: none. (PAGES did stop repeating the lab address in each row, see
  `OpportunityCard` `labEmail`.)
- Proposed change (keep the full detail in the prose, where it reads as a sentence; the ledger
  row says only how to take part). Facts are unchanged; nothing is added.

```diff
--- a/content/opportunities/urap.md
+++ b/content/opportunities/urap.md
-route: "Apply through URAP to one of four tracks: mathematical modeling and theory; experimental systems and game building; research generalist and research operations; or data science, econometrics and algorithms. About 9–11 hours a week; remote work is possible."
+route: Apply through URAP to one of the four tracks above.
```

If the lab prefers the row to stand alone (the row also appears without the prose when
`join.yml` has no `students` text), trim the prose instead:

```diff
--- a/content/pages/join.yml
+++ b/content/pages/join.yml
 students: |
-  Undergraduates join through UC Berkeley's [Undergraduate Research Apprentice Program (URAP)](https://urapprojects.berkeley.edu/list.php?faculty_id=F-1753), in one of four tracks:
-
-  - Mathematical modeling and theory
-  - Experimental systems and game building
-  - Research generalist and research operations
-  - Data science, econometrics and algorithms
-
-  Apprentices work about 9–11 hours a week, and remote work is possible.
+  Undergraduates join through UC Berkeley's [Undergraduate Research Apprentice Program (URAP)](https://urapprojects.berkeley.edu/list.php?faculty_id=F-1753).
```

- Test that proves it: `tests/e2e/pages.spec.ts` stays green (it reads the route from content);
  on `/join/` the string "Data science, econometrics and algorithms" (case-insensitive) occurs
  once in `main`.

## Also noted (media, not code): one headshot is a circle on white

- File: `public/uploads/people/milosz-platek.jpg` (480×480). MEASURED: the corners are pure
  white (`#FFFFFF`) around a round crop, so on `/people/` it is the only round face in a list
  of square photos (D-13 item 5: square photos), and in dark mode it shows as a white square
  with a disc inside. Re-crop square from the original photo with the D-12 headshot tool
  (session scratchpad `headshot-tools/`), then `npm run media`. Only the lab can supply the
  original; nothing in code should mask it.
