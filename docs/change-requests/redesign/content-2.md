# Redesign CONTENT request 2: three pipeline hedges are component strings, not content

> **Status: CLOSED, superseded (confirmed at integration, 2026-10-24).** Nothing to apply.

> **Status (2026-10-24, later the same day): superseded, nothing to apply.** A re-check on the shared dev server found that the owning packages have already removed all three hedges. `/join/` shows a dash per unknown status (with "Status not confirmed" kept for screen readers only) and one footnote. Direction pages have no "Listed by title only" note. `/publications/` and the direction pages carry one footnote: "Review statuses are as reported by the lab, dated by when each was last checked." The wording is now waiting for the PI's sign-off as rows R-C1 to R-C3 in `docs/CONTENT-QUESTIONS.md`. The proposal below is kept as a record.

- File(s), with the owning package:
  - `src/components/pages/OpportunityCard.tsx` (join/pages package)
  - `src/components/direction/InProgressList.tsx` (direction package)
  - `src/app/publications/page.tsx` (publications package)
- Why: D-13 item 7 and AUDIT W1/W2. After CONTENT's copy pass, the remaining machine-voiced
  hedges on the affected routes come from code, not from `content/**` (MEASURED on the shared
  dev server, 2026-10-24):
  - "Status not confirmed" appears 4 times on `/join/` (every opportunity with `status: unknown`).
  - "Listed by title only until a public version or a documented talk exists." appears once on
    each live direction page and on `/research/pricing-experimentation/`.
  - The `/publications/` lede still says "Review statuses marked 'reported by the lab' are the
    lab's own account, dated as of the last check."
    CONTENT cannot change these strings, and it must not change the facts behind them (the
    opportunity statuses stay `unknown` until the PI answers CONTENT-QUESTIONS G1 to G4).
- Workaround used: none. The content files say nothing about status. Their prose no longer
  repeats these hedges, so the strings below are the only places left.
- Blocking? No. If the owning packages have already removed these strings, close this request.
- Wording: the proposals below are recorded for the PI in `docs/CONTENT-QUESTIONS.md`
  § "Redesign copy changes: PI to approve" (rows R-C1 to R-C3), because D-13 item 7 needs PI
  sign-off on the wording.
- Test that proves it: on `/join/`, `/research/*/` and `/publications/` the server HTML contains
  no "Status not confirmed", "Listed by title only" or "marked “reported by the lab”"; the
  owners' own specs (`tests/e2e/join*.spec.ts`, `direction*.spec.ts`, `publications.spec.ts`)
  are updated to assert the new wording.

## Proposed changes

1. `src/components/pages/OpportunityCard.tsx`. An unknown status says what a visitor can do
   instead of what the pipeline does not know. This is still honest: it claims neither open nor closed.

```diff
-/** The status in words; "Status not confirmed" for an unknown status. */
+/** The status in words; for an unknown status, what the visitor can do instead. */
 export function statusLabel(o: Pick<OpportunityView, "status" | "isOpen">): string {
   if (o.isOpen) return o.status === "rolling" ? "Open, rolling" : "Open";
-  if (o.status === "unknown") return "Status not confirmed";
+  if (o.status === "unknown") return "Email to ask";
   return "Closed";
 }
```

AUDIT §5 item 2 also suggests hiding an unknown-status opportunity that has no route, url,
apply_url or email. Today only `phd-postdoc` matches, and the validator already warns about
it (`W_OPP_NO_ROUTE`). That decision belongs to the join package and the PI (CONTENT-QUESTIONS G4).

2. `src/components/direction/InProgressList.tsx`. Drop the note, or replace it with the
   page's single provenance footnote:

```diff
-      <p className="t-sm t-muted dr-wip__note">
-        Listed by title only until a public version or a documented talk exists.
-      </p>
```

3. `src/app/publications/page.tsx`. Move the provenance from the lede to one footnote at the
   end of the list. The wording is from DIRECTION.md §5.0, with the build month:

```diff
             Newest first, grouped by year.
-            {hasSelfReported &&
-              " Review statuses marked “reported by the lab” are the lab’s own account, dated as of the last check."}
```

and, after the year groups, when `needsProvenanceNote(pubs)` is true:

```tsx
<p className="pubs-foot t-sm t-muted">
  Review status and dates are as reported by the lab, <DateText value={c.today} month />.
</p>
```

(`DateText`'s month-only form may differ; use whatever the publications package already uses
for "October 2026".)
