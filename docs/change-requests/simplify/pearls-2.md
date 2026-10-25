# pearls-2: the motion sampler picks a homepage pearl again (the cup branch is skipped silently)

**Status (integration, 2026-10-25):** APPLIED as written (`tests/e2e/motion-and-colors.spec.ts`). The optional people-page item is APPLIED too, in a stronger form: `tests/unit/people-page/render.test.tsx` now checks every fixture (n1, consent-edge-cases public and preview) for no `.pp-summary` line other than the empty state.

- **From:** HOME (simplify, D-15), 2026-10-25. **To:** the owner of `tests/e2e/motion-and-colors.spec.ts`.
- **Why:** the motion test samples the homepage pick and the morph inside `if (await page.locator(".cup-stage").count()) { … }`. D-15 removed the cup, so that branch no longer runs. The test still passes, but it has stopped sampling the homepage pick and morph. This is a silent loss of coverage, not a failure (MEASURED 2026-10-25: the test passes).
- **Blocking?** No.
- **Proposed change** (hover a pearl, then follow its link: the pearl-{slug} morph):

```diff
-    // D-14: pick a cup pearl (it rises), then "Explore …" (client navigation with
-    // the pearl morph). Wait for the island first: before hydration the cup's
-    // labels are links that hydration replaces with buttons.
+    // D-15: hover a homepage pearl (lift, halo, seed bloom), then follow its link
+    // (client navigation with the pearl-{slug} morph). Wait for the island first.
     await page.goto("/");
@@
-    if (await page.locator(".cup-stage").count()) {
-      await page.waitForSelector(".cup-stage[data-js]");
-      const item = page.locator(".cup-item").first();
-      await sample("pearl pick", () => item.locator(".cup-lab").click());
-      await sample("explore morph", () => item.locator(".cup-panel a[href^='/research/']").click());
-    }
+    await page.waitForSelector(".pl[data-js]");
+    const item = page.locator(".pl-item").first();
+    await sample("pearl hover", () => item.locator(".pl-body").hover());
+    await sample("pearl morph", () => item.locator("a.pl-link").click());
```

- **Optional, same file:** the people-page unit test `tests/unit/people-page/render.test.tsx` ("omits the summary line when it would only repeat the single group heading") still expects `.pp-summary` whenever there are 2 or more groups. It passes today only because its fixture (`n1`) has a single group. Since D-15 there is no summary line at any group count; only the empty state "No one is listed yet." keeps the class. Suggested assertion: `expect(html).not.toMatch(/class="pp-summary">\d/)` for every fixture.
