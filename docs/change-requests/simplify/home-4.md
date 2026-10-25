# home-4: foundation morph test starts from the cup (Fig. 1 left the homepage)

**Status (integration, 2026-10-25):** APPLIED as written (`tests/e2e/foundation.spec.ts`: cup key in `skipIntro`, morph from the risen cup pearl).

- **From:** HOME (simplify), 2026-10-25. **To:** the owner of `tests/e2e/foundation.spec.ts`.
- **Why:** "pearl morph: the travelling pearl paints above the page-swap groups, below the header" opens `/` and waits for `.f1-plate[data-live]`. D-14 moved Fig. 1 to `/research/#map`, so the test now times out on `/` (MEASURED 2026-10-25).
  - The homepage morph source is now the risen cup pearl. Its wrapper carries `pearl-{slug}`, only while it is up.
  - Pick its label, then follow "Explore …".
  - The z-order assertion still applies unchanged.
- **Blocking?** No.
- **Proposed change** (keep `skipIntro`, and add the cup key to it):

```diff
 const skipIntro = (page: Page) =>
   page.context().addInitScript(() => {
     try {
       sessionStorage.setItem("bobalab-intro", "1");
+      sessionStorage.setItem("bobalab-cup-intro", "1");
     } catch {}
   });
@@ test("pearl morph: …"
   await page.goto("/");
-  await page.waitForSelector(".f1-plate[data-live]");
-  const li = page.locator(".f1-item").first();
-  const slug = (await li.getAttribute("data-slug"))!;
+  await page.waitForSelector(".cup-stage[data-js]");
+  const li = page.locator(".cup-item").first();
+  const explore = li.locator(".cup-panel a[href^='/research/']");
+  const slug = (await explore.getAttribute("href"))!.split("/")[2]!;
   await page.evaluate(async (s) => void (await fetch(`/research/${s}/`)), slug);
   await page.waitForTimeout(1500);
-  await li.locator("a").focus();
+  await li.locator(".cup-lab").click(); // the pearl rises and takes the name pearl-{slug}
+  await explore.focus();
   await page.keyboard.press("Enter");
   await page.waitForURL(`**/research/${slug}/`);
```

(Alternatively the research package can point it at `/research/` and a `.f1-item` in `#map`. Both are valid morph sources.)

- **Test that proves it:** `npx playwright test tests/e2e/foundation.spec.ts -g "pearl morph"`. `tests/e2e/home.spec.ts` › "Explore morphs the risen pearl …" already checks that exactly one `pearl-{slug}` group forms from the cup.
