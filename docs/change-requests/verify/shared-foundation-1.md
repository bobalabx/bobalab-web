# Verify request shared-foundation-1: give own-line draft badges the standard step (VIS-15)

- File(s): src/app/not-found.tsx (area news-pages), src/components/direction/InProgressList.tsx
  (area research-projects)
- Why: finding VIS-15. A "Draft · pending lab review" badge that sits on its own line under
  text should not be almost flush with it. Measured on the dev server (1440 px, box to box):
  the 404 direction list gives 2 px (`span.pg-dirs__q` > badge, under the question), and the
  "In progress" list on a direction page gives 2 px (`.dr-wip__list li` is a grid with
  `gap: 2px`). Other stacked metadata on these pages uses 8–16 px.
- Shared-foundation side (done): `DraftBadge` now takes a `line` prop. It wraps the badge in
  `<span class="bl-draft-line">` (display block, `margin-top: var(--s-2)`), defined in
  src/styles/components.css. It is opt-in because a badge inside a flex or grid row that
  already has a `gap` must not get an extra margin.
- Proposed change:

```diff
--- a/src/app/not-found.tsx
+++ b/src/app/not-found.tsx
@@
-                    {d.draft ? (
-                      <span className="pg-dirs__q">
-                        <DraftBadge />
-                      </span>
-                    ) : null}
+                    <DraftBadge show={d.draft} line />
```

```diff
--- a/src/components/direction/InProgressList.tsx
+++ b/src/components/direction/InProgressList.tsx
@@
-              <DraftBadge show={p.draft} />
+              <DraftBadge show={p.draft} line />
```

(In the `.dr-wip__list li` grid the wrapper's 8 px margin adds to the 2 px gap: 10 px.)

- Blocking? no (preview builds only; production has no drafts).
- Test that proves it: on /nope/ and /research/algorithmic-advice/ in preview, every
  `.bl-draft-line` top is at least 8 px below the previous sibling's bottom.

Status: Applied by the final verifier (2026-10-20) in src/app/not-found.tsx and src/components/direction/InProgressList.tsx. Commits "verify(news-pages): …" and "verify(research-projects): …".
