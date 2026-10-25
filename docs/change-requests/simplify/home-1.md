# home-1: pre-paint gate for the cup's settle-once intro

**Status (integration, 2026-10-25):** APPLIED together with research-1 Patch 1 and the home-6 amendment. `src/lib/site/motion.ts` exports `CUP_INTRO_STORAGE_KEY = "bobalab-cup-intro"`; the pre-paint script keeps only the cup branch (Fig. 1's `data-intro` branch is removed per research-1), so `once()` was inlined. Kit test added to `tests/e2e/kit.spec.ts`; unit test in `tests/unit/foundation/misc.test.ts` pins the key, the attribute and the `load` anchor.

- **From:** HOME (simplify), 2026-10-25. **To:** the owner of `src/lib/site/motion.ts` (and `tests/e2e/kit.spec.ts` for the test).
- **Why:** D-14 and JUDGE R11 call for a settle-once intro per session, behind its own sessionStorage key (not the figure's `bobalab-intro`).
  - The cup island (`src/components/cup/CupIsland.tsx`) already plays the intro when home is reached by client-side navigation. In that case it mounts before paint.
  - On a full page load, the pearls are painted before hydration. If the island started the intro then, the pearls would visibly jump, so on that path it only marks the session.
  - The pre-paint script is the only place that can start the intro on a full load without a jump. The policy allows only two `dangerouslySetInnerHTML` uses (§G4), so the cup cannot add its own inline script.
- **Blocking?** No. Without this change, the intro plays only on client navigation to home.
- **Proposed change** (`src/lib/site/motion.ts`). The key value must stay `"bobalab-cup-intro"`, the same as `CUP_INTRO_KEY` in `CupIsland.tsx`.

```diff
 export const INTRO_STORAGE_KEY = "bobalab-intro";
+/** D-14: the homepage cup's settle-once intro (CupIsland CUP_INTRO_KEY). */
+export const CUP_INTRO_STORAGE_KEY = "bobalab-cup-intro";
@@
- * 2. on the first home view of the browser session, set <html data-intro>
- *    (removed after 2 s) so the Fig. 1 intro plays once (D-02a, WP1 request 3).
+ * 2. on the first home view of the browser session, set <html data-intro>
+ *    (removed after 2 s) so the Fig. 1 intro plays once (D-02a, WP1 request 3);
+ * 3. on the first home view of the session, set <html data-cup-intro> (removed
+ *    after 1.2 s) so the cup's pearls settle once from the first frame (D-14, R11).
  */
 export function prePaintSource(basePath: string): string {
   const b = JSON.stringify(basePath.replace(/\/+$/, ""));
+  const once = (key: string, attr: string, ms: number) =>
+    `if(!s.getItem(${JSON.stringify(key)})){s.setItem(${JSON.stringify(key)},"1");` +
+    `d.setAttribute("${attr}","");setTimeout(function(){d.removeAttribute("${attr}")},${ms})}`;
   return (
     `(function(){var d=document.documentElement;` +
     `try{if(localStorage.getItem(${JSON.stringify(MOTION_STORAGE_KEY)})==="reduce")d.setAttribute("data-motion","reduce")}catch(e){}` +
-    `try{var b=${b},p=location.pathname;` +
-    `if((p===b+"/"||p===b+"/index.html"||p===b)&&!sessionStorage.getItem(${JSON.stringify(INTRO_STORAGE_KEY)})){` +
-    `sessionStorage.setItem(${JSON.stringify(INTRO_STORAGE_KEY)},"1");d.setAttribute("data-intro","");` +
-    `setTimeout(function(){d.removeAttribute("data-intro")},2000)}}catch(e){}})();`
+    `try{var b=${b},p=location.pathname,s=sessionStorage;` +
+    `if(p===b+"/"||p===b+"/index.html"||p===b){` +
+    once(INTRO_STORAGE_KEY, "data-intro", 2000) +
+    once(CUP_INTRO_STORAGE_KEY, "data-cup-intro", 1200) +
+    `}}catch(e){}})();`
   );
 }
```

If the research package has already moved the figure's `data-intro` gate to `/research/`, keep its version of that half and add only the `CUP_INTRO_STORAGE_KEY` line under the home-path test.

- **Tests:**
  - `tests/e2e/home.spec.ts` › "a full page load: the intro, if any, starts before the pearls are painted" already accepts this change. It records the moment `data-cup-intro` is set, and that moment must come before any `.cup-pearl` exists.
  - Add to `tests/e2e/kit.spec.ts`, next to "data-intro is set on the first home view only":

```ts
test("data-cup-intro is set pre-paint on the first home view only", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-cup-intro"))).toBe(
    true,
  );
  await page.waitForTimeout(1300);
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-cup-intro"))).toBe(
    false,
  );
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-cup-intro"))).toBe(
    false,
  );
});
```

- **Also:** see home-2 (privacy page) and home-3 (off-origin storage allow-list). The new key must be documented wherever `bobalab-intro` is.
