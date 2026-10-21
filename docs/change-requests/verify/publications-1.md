# Verify publications request 1: award provenance field (`source`) in the schema and list entries

- Finding: CON-03 (CONTENT-QUESTIONS D11). Awards known only from the PI's CV
  (R2 §6: UNKNOWN on every awarding-body page; dataset label
  "DOCUMENTED (PI-reported only)") look the same as INFORMS/AOM awards.
- File(s) (shared-foundation): `src/lib/content/schema.ts`, `src/components/ui/PublicationEntry.tsx`
- Depends on / pairs with: `publications-2.md` (content + importer), `publications-3.md` (CMS field).
- Why: brief §D7 shows self-reported claims as "reported by the lab". Statuses
  already do (`status_source`). Awards need the same optional field, with the same values.
- Already done in the publications area (no further change needed there):
  `src/lib/publications/provenance.ts` exports `isSelfReportedAward(award)`,
  which reads `award.source === "self-reported"`. The paper page
  (`src/app/publications/[slug]/page.tsx`) already adds a muted
  "Reported by the lab" line under such an award (`.pub-award__src`). Until
  this schema change lands, no award has the field, and every award renders as before.
  Talks are handled already: no `url` means no evidence, so the page notes
  "reported by the lab".

## Proposed change

### `src/lib/content/schema.ts` (awards in `publicationSchema`)

```diff
   awards: z
     .array(
       z.strictObject({
         name: z.string().trim().min(1),
         year: yearField,
         under_title: z.string().trim().optional(),
+        /**
+         * "self-reported": known only from the PI's CV or site, not from the
+         * awarding body (CON-03, D11). Shown as "reported by the lab".
+         */
+        source: z.enum(["documented", "self-reported"]).optional(),
       }),
     )
     .default([]),
```

### `src/components/ui/PublicationEntry.tsx` (list entries, line ~123)

The list shows at most two award badges. Add the wording after a self-reported one:

```diff
+import { SELF_REPORTED_WORDING, isSelfReportedAward } from "@/lib/publications/provenance";
 …
             <li key={`${a.name}-${a.year}`}>
               <Badge tone="strong">
                 {a.name}, {a.year}
               </Badge>
               {a.under_title && (
                 <span className="t-sm t-muted"> (as &ldquo;{a.under_title}&rdquo;)</span>
               )}
+              {isSelfReportedAward(a) && (
+                <span className="t-sm t-muted"> · {SELF_REPORTED_WORDING}</span>
+              )}
             </li>
```

(Alternatively, in `PublicationEntry`, list documented awards before self-reported
ones, so the two badges are documented when possible. That is optional and changes order only.)

- Blocking? No. Without it, the paper page shows awards as before. The talks note already ships.
- Test that proves it: `tests/unit/publications/provenance.test.ts` (helper);
  after content request 2, add to `tests/e2e/publications.spec.ts`:
  on `/publications/bastani-2026-rl-tips/`, the WISE 2022 and POMS CBOM 2021
  awards have a `.pub-award__src` "Reported by the lab", and the INFORMS
  awards do not. `npm run typecheck` and `npm run test` stay green.

Status: Applied by the final verifier (2026-10-20): `awards[].source` in src/lib/content/schema.ts, the list wording in PublicationEntry.tsx (no reordering), provenance.ts comment updated; new e2e "awards known only from the PI's CV …" in tests/e2e/publications.spec.ts. Commit "verify(publications): …".
