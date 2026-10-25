# Redesign PAGES request 1: space before the Draft marker in compact project rows

> **Status: APPLIED (integration, 2026-10-24).** `DraftBadge … line` in `CompactProjectList.tsx`; unit test in `tests/unit/integration/redesign-requests.test.tsx`.

- File(s): `src/components/projects/CompactProjectList.tsx` (projects package; used on `/people/{slug}/`)
- Why: in preview builds a draft project's title runs into its marker with no space
  ("Foundation Models for Cancer RecognitionDraft · pending lab review"), MEASURED on
  `/people/park-sinchaisri/` at 1440 (`test-results/redesign-pages/people_park-sinchaisri-1440-light.png`).
  Production builds are unaffected (drafts are excluded).
- Blocking? No (preview only).
- Proposed change (put the marker on its own line, as `DraftBadge line` does elsewhere, VIS-15):

```diff
             <p className="pj-row__title">
               <Link href={`/projects/${p.slug}/`}>{p.title}</Link>
-              <DraftBadge show={p.draft} />
+              <DraftBadge show={p.draft} line />
             </p>
```

- Test that proves it: open `/people/park-sinchaisri/` on the dev server (preview) and check
  the "Foundation Models for Cancer Recognition" row; `tests/e2e/people.spec.ts` stays green.
