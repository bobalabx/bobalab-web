# Verify request ci-docs-1: figure.spec.ts Tab walk works in Playwright WebKit on Windows

- File(s): tests/e2e/figure.spec.ts (area figure-home)
- Why: finding A11Y-01. In Playwright's WebKit on Windows (WebKit 2370, Playwright
  1.64.1) Tab and Alt+Tab only ever focus buttons, never links (MEASURED
  2026-10-20 with a blank page `<a> <button> <a>`: Chromium Tab → a, b, c;
  WebKit Tab → b, BODY, b, BODY). So `keyboard: Tab order 01→0N …` fails with
  `toBeFocused … inactive` in WebKit on Windows (reproduced against a preview
  export with `E2E_WEBKIT=1 --project=webkit`). Not a site defect: script focus
  on the same links gives the 2 px ring, the caption swap and `is-on`.
  The same probe helper and fallback are already in
  tests/e2e/motion-and-colors.spec.ts (ci-docs area), which now passes in WebKit.
- Proposed change: probe which key reaches links on a blank page ("Tab", or
  "Alt+Tab" for WebKit on macOS); if neither does, focus each figure link by
  script and still check focus, caption, `is-on` and the ring; the Tab order
  itself stays checked in Chromium (and in Linux WebKit in CI if its Tab reaches links; not verified). Exact diff:

```diff
--- a/tests/e2e/figure.spec.ts
+++ b/tests/e2e/figure.spec.ts
@@ -17,6 +17,29 @@
 const capOn = (page: Page) => page.locator(".f1-cap-layer.is-on");
 const hydrated = (page: Page) => page.waitForSelector(".f1-plate[data-live]");

+/**
+ * The key that moves focus through links in this browser, probed on a blank
+ * page: "Tab" (Chromium), "Alt+Tab" (WebKit on macOS), or
+ * null when neither reaches a link: Playwright's WebKit on Windows (MEASURED
+ * 2026-10-20, Playwright 1.64) only Tab-focuses buttons.
+ */
+async function linkTabKey(page: Page): Promise<string | null> {
+  const probe = await page.context().newPage();
+  try {
+    await probe.setContent('<button>b</button><a href="#x">a</a>');
+    for (const key of ["Tab", "Alt+Tab"]) {
+      await probe.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
+      for (let i = 0; i < 2; i++) {
+        await probe.keyboard.press(key);
+        if (await probe.evaluate(() => document.activeElement?.tagName === "A")) return key;
+      }
+    }
+    return null;
+  } finally {
+    await probe.close();
+  }
+}
+
 test.use({ viewport: { width: 1366, height: 768 } });

 test("DOM contract: one labelled nav, one <ol role=list> of real links, unique VT names", async ({
@@ -71,15 +94,24 @@
   await skipIntro(page);
   await page.goto("/");
   await hydrated(page);
+  const tabKey = await linkTabKey(page);
+  if (!tabKey) {
+    test.info().annotations.push({
+      type: "keyboard",
+      description:
+        "Tab does not reach links in this browser (Playwright WebKit on Windows): each figure link is focused by script; the Tab order itself is checked in Chromium",
+    });
+  }
   const n = await items(page).count();
   const first = items(page).first().locator("a");
   // Tab until the first figure link is focused.
-  for (let k = 0; k < 40; k++) {
-    await page.keyboard.press("Tab");
+  for (let k = 0; tabKey && k < 40; k++) {
+    await page.keyboard.press(tabKey);
     if (await first.evaluate((el) => el === document.activeElement)) break;
   }
   for (let i = 0; i < n; i++) {
     const li = items(page).nth(i);
+    if (!tabKey) await li.locator("a").focus();
     await expect(li.locator("a")).toBeFocused();
     const slug = await li.getAttribute("data-slug");
     await expect(li).toHaveClass(/is-on/);
@@ -90,7 +122,7 @@
       return `${cs.outlineStyle} ${cs.outlineWidth}`;
     });
     expect(ring).toBe("solid 2px");
-    if (i < n - 1) await page.keyboard.press("Tab");
+    if (tabKey && i < n - 1) await page.keyboard.press(tabKey);
   }
   await page.keyboard.press("Escape");
   await expect(capOn(page)).toHaveAttribute("data-cap", "legend");
```

- Blocking? no (CI runs on Linux; only local WebKit runs on Windows fail).
- Test that proves it: the patched spec, run from a copy against a preview export
  (`E2E_STATIC=1 E2E_WEBKIT=1 BASE_URL=… npx playwright test --project=webkit
--project=chromium`): 17 passed, 1 skipped (the existing skip), including
  `[webkit] keyboard: Tab order 01→0N` (was failing) and `[chromium]` unchanged.

Applied by the figure-home fixer (2026-10-20), verbatim, in tests/e2e/figure.spec.ts (Chromium re-run on the shared dev server).

Status: Applied (figure-home fixer, verified by the final verifier 2026-10-20; commit "verify(figure-home): …").
