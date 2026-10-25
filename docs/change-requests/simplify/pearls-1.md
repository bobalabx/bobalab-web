# pearls-1: foundation morph test starts from a homepage pearl (the cup is gone)

**Status (integration, 2026-10-25):** APPLIED as written (`tests/e2e/foundation.spec.ts`; `skipIntro` keeps `bobalab-cup-intro`).

- **From:** HOME (simplify, D-15), 2026-10-25. **To:** the owner of `tests/e2e/foundation.spec.ts`.
- **Why:** D-15 removed the boba cup from `src/`. "pearl morph: the travelling pearl paints above the page-swap groups, below the header" still waits for `.cup-stage[data-js]` on `/`, so it now fails (MEASURED 2026-10-25, Chromium, shared dev server; the only failure of the full Chromium run that this change caused).
  - The homepage morph source is now each pearl's body (`.pl-body`, inside `<ViewTransition name="pearl-{slug}">`). The pearl's own link (`.pl-link`) opens the direction; no "rise" step comes first.
  - The z-order assertion still applies unchanged. `tests/e2e/home.spec.ts` checks that exactly one `pearl-*` group runs, and that focus lands on the h1.
- **Blocking?** No. Only this one test is affected.
- **Proposed change:**

```diff
@@ test("pearl morph: …"
   await page.goto("/");
-  // D-14 (change request home-4): the homepage morph source is the risen cup pearl,
-  // whose wrapper carries pearl-{slug} only while it is up.
-  await page.waitForSelector(".cup-stage[data-js]");
-  const li = page.locator(".cup-item").first();
-  const explore = li.locator(".cup-panel a[href^='/research/']");
-  const slug = (await explore.getAttribute("href"))!.split("/")[2]!;
+  // D-15 (change request pearls-1): the homepage morph source is the pearl itself
+  // (.pl-body, named pearl-{slug}); its link opens the direction.
+  await page.waitForSelector(".pl[data-js]");
+  const explore = page.locator(".pl-item").first().locator("a.pl-link");
+  const slug = (await explore.getAttribute("href"))!.split("/")[2]!;
   await page.evaluate(async (s) => void (await fetch(`/research/${s}/`)), slug);
   await page.waitForTimeout(1500);
-  await li.locator(".cup-lab").click(); // the pearl rises and takes the name pearl-{slug}
   await explore.focus();
   await page.keyboard.press("Enter");
```

`skipIntro` can keep `bobalab-cup-intro`. The homepage pearls still use that session key; see pearls-3.
