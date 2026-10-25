# home-3: off-origin spec allows the cup's documented session key

**Status (integration, 2026-10-25):** APPLIED as written (`tests/e2e/offorigin.spec.ts`).

- **From:** HOME (simplify), 2026-10-25. **To:** the owner of `tests/e2e/offorigin.spec.ts`.
- **Why:** the test "zero off-origin requests, no cookies, only the documented storage keys" now fails on `/` with `sessionStorage bobalab-cup-intro` (MEASURED 2026-10-25 against the dev server). That key is the cup's settle-once flag (D-14, R11). Home-2 documents it on the privacy page.
- **Blocking?** No, apart from this one red test.
- **Proposed change:**

```diff
- *   - no cookies; browser storage holds only the two documented keys
- *     (localStorage "bobalab-motion", sessionStorage "bobalab-intro");
+ *   - no cookies; browser storage holds only the documented keys
+ *     (localStorage "bobalab-motion"; sessionStorage "bobalab-intro" and the
+ *     homepage cup's "bobalab-cup-intro", privacy page);
@@
-const ALLOWED_SESSION = new Set(["bobalab-intro"]);
+const ALLOWED_SESSION = new Set(["bobalab-intro", "bobalab-cup-intro"]);
```

- **Test that proves it:** `npx playwright test tests/e2e/offorigin.spec.ts` passes on `/`.
