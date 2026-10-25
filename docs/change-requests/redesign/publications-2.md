# Redesign PUBLICATIONS request 2: same type word and status rule in the shared publication row

> **Status: APPLIED (integration, 2026-10-24).** Exact patch; `PUBLICATION_TYPE_LABELS` dropped from the import. Tested in `tests/unit/integration/redesign-requests.test.tsx`.

- File(s): `src/components/ui/PublicationEntry.tsx` (not owned by PUBLICATIONS; used on the home
  page, person pages, direction and project pages).
- Why: the PUBLICATIONS review (adversarial pass) changed two copy rules in the publications
  package, and the shared row should say the same thing about the same paper on other pages:
  1. **Type word.** The schema has no "thesis" type, so the MIT S.M. thesis
     (`sinchaisri-2016-mit-sm-thesis`) is entered as `type: other` with the venue "S.M. thesis,
     Massachusetts Institute of Technology". The citation code already treats it as a thesis
     (`toCsl`), but rows said "Other", which reads like a CMS dump. `/publications/` and the paper
     page now say "Thesis" through the new `typeWord(p)` in `src/lib/publications/csl.ts`.
     `PublicationEntry` (e.g. on `/people/park-sinchaisri/`) still prints "Other".
  2. **Status that repeats the type.** A bare "In progress" status on a work-in-progress item
     only repeats the type word ("Work in progress … In progress, as of Oct 20, 2026"), like
     the bare "Working paper" status that `statusLine` already drops. The publications package now
     drops it (`reviewStatus` in `src/components/publications/PaperParts.tsx`).
- Workaround used: none needed in PUBLICATIONS (its own row and paper page use the new rules).
- Blocking? No. Cosmetic consistency across pages.
- Test that proves it: `npx vitest run tests/unit/publications` (`typeWord` in csl.test.ts,
  `reviewStatus` in row.test.tsx); after the patch, any existing PublicationEntry unit test plus
  a render of the S.M. thesis showing `<span class="bl-badge">Thesis</span>`.
- Proposed change (exact patch):

```diff
--- a/src/components/ui/PublicationEntry.tsx
+++ b/src/components/ui/PublicationEntry.tsx
@@ imports
-import { pageRange } from "@/lib/publications/csl";
+import { pageRange, typeWord } from "@/lib/publications/csl";
@@ export function statusLine(
   if (p.status === "published") return null;
   if (p.status === "working-paper" && type === "working-paper" && !p.status_note) return null;
+  if (p.status === "in-progress" && type === "work-in-progress" && !p.status_note) return null;
@@ meta
-            {showType && <Badge>{PUBLICATION_TYPE_LABELS[pub.type]}</Badge>}
+            {showType && <Badge>{typeWord(pub)}</Badge>}
```

(If `PUBLICATION_TYPE_LABELS` has no other use in the file afterwards, drop it from the import.)
