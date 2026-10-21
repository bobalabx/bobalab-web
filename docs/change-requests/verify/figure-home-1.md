# Verify request figure-home-1: "In progress" notes name the full D-05 rule (public version or documented talk)

- File(s): src/components/direction/InProgressList.tsx (area research-projects),
  src/components/people/PersonProfile.tsx (area people)
- Why: finding CON-10. DECISIONS D-05 counts a paper when it has a public version
  **or a documented conference presentation** (`countsAsPublication` in
  src/lib/content/relations.ts). Two counted papers, `sinchaisri-2026-compliance-aware-rl`
  and `snyder-2026-planning-vs-execution`, have no public copy and only a documented
  MSOM 2026 talk. Fig. 1 now says "one paper with a public version or a documented
  talk" (fixed in PearlFigure.tsx by figure-home). /publications/ already says "no
  public version or documented presentation" (WorkInProgress.tsx). These two notes
  still describe only half the rule, so a reader can't see why a talk-only paper
  is listed as a paper and not as "In progress".
- Proposed change (wording only, no facts change):

```diff
--- a/src/components/direction/InProgressList.tsx
+++ b/src/components/direction/InProgressList.tsx
@@
 /**
- * "In progress" (DECISIONS D-05): work without a public version is listed by
- * title only, with its self-reported status and "as of" date. It never counts
- * toward paper totals or seeds.
+ * "In progress" (DECISIONS D-05): work without a public version or a documented
+ * talk is listed by title only, with its self-reported status and "as of" date.
+ * It never counts toward paper totals or seeds.
  */
@@
       <p className="t-sm t-muted dr-wip__note">
-        Listed by title only until a public version exists.
+        Listed by title only until a public version or a documented talk exists.
       </p>
```

```diff
--- a/src/components/people/PersonProfile.tsx
+++ b/src/components/people/PersonProfile.tsx
@@
-            <p className="pp-section__note">Papers in progress, without a public version yet.</p>
+            <p className="pp-section__note">
+              Papers in progress, without a public version or a documented talk yet.
+            </p>
```

- Blocking? no.
- Test that proves it: `rg -n "public version" src/components` shows every user-facing
  note naming both halves of the rule. No existing test asserts the old strings (checked
  with `rg "without a public version yet|until a public version exists" tests`).

Status: Applied by the final verifier (2026-10-20), verbatim, in InProgressList.tsx (note and doc comment) and PersonProfile.tsx. Commits "verify(research-projects): …" and "verify(people): …".
