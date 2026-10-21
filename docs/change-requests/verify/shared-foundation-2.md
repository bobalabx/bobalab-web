# Verify request shared-foundation-2: "Principal investigator", not "Faculty Director" (CON-05)

- File(s): tests/unit/people-page/model.test.ts, src/app/people/page.tsx (area people);
  comments/test titles in tests/unit/people-page/render.test.tsx, tests/e2e/people.spec.ts,
  src/components/people/{model.ts,PeopleIndex.tsx,PersonProfile.tsx} (wording only).
- Why: finding CON-05. No source (PI site, Haas profile, URAP listings) gives Prof.
  Sinchaisri the title "Faculty Director". R2 §5 / Q8 leave the lab's framing open. The
  site's own About heading and /about/ meta already say "Principal investigator".
  Shared-foundation changed the label in `src/lib/content/people.ts`:
  `ROLE_LABELS.pi = { one: "Principal investigator", group: "Principal investigator" }`
  and regenerated `public/admin/cms-data.js` (`npm run cms:config`). Revisit when the PI
  chooses a title (one-line change there plus `npm run cms:config`).
- Effect right now: 3 assertions in tests/unit/people-page/model.test.ts still expect
  the old label and fail (lines 34, 97, 247).
- Proposed change:

```diff
--- a/tests/unit/people-page/model.test.ts
+++ b/tests/unit/people-page/model.test.ts
@@
-      "Faculty Director",
+      "Principal investigator",
@@
-      { count: 1, label: "Faculty Director" },
+      { count: 1, label: "Principal investigator" },
@@
-    expect(m.eyebrow).toBe("Faculty Director");
+    expect(m.eyebrow).toBe("Principal investigator");
```

People meta description: in production the only group is the PI, so the sentence is
"People of BOBALAB, the Berkeley Operations and Behavioral Analytics Lab: Principal
investigator." A lone role label should not make up the whole list:

```diff
--- a/src/app/people/page.tsx
+++ b/src/app/people/page.tsx
@@
-  const groups = [...m.groups.map((g) => g.label), ...(m.alumniItems.length ? ["alumni"] : [])];
+  const groups = [
+    ...m.groups.filter((g) => g.role !== "pi").map((g) => g.label),
+    ...(m.alumniItems.length ? ["alumni"] : []),
+  ];
@@
-    description: clipDescription(who ? `People of ${lab}: ${who}.` : `People of ${lab}.`),
+    description: clipDescription(
+      who
+        ? `People of ${lab}: its principal investigator, ${who}.`
+        : `People of ${lab} and its principal investigator.`,
+    ),
```

(Optionally use the PI's name from `m.groups[0]` instead of the generic phrase.) Also
replace "Faculty Director" with "principal investigator" in the comments and test titles
listed above.

- Blocking? no, but people-page unit tests fail until the test patch lands.
- Test that proves it: `npx vitest run tests/unit/people-page` passes; /people/ and
  /about/ show "Principal investigator"; `grep -rn "Faculty Director" src public/admin`
  finds nothing.

Status: Applied by the final verifier (2026-10-20): the three test assertions, the /people/ meta description (PI group filtered out of the list, "its principal investigator" in the sentence) and the comment/test-title wording. `grep -rn "Faculty Director" src public/admin tests` finds only the explanatory comment in src/lib/content/people.ts. Commit "verify(people): …".
