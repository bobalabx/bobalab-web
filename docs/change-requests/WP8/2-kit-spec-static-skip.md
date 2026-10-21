# WP8 request 2: kit.spec.ts must skip on a static export (the kit is a 200 not-found page there)

- File(s): `tests/e2e/kit.spec.ts` (WP0)
- Why: `openKit()` skips only when `/kit/` answers 404. In a production export `out/kit/index.html` is the not-found page and GitHub Pages / `scripts/serve-out.mjs` serve it with **200**, so every kit test would run and fail in CI's `e2e` job. CI currently excludes `kit.spec.ts` by name (`.github/workflows/ci.yml`, e2e step), which hides the WP0 checks entirely.
- Proposed change in `openKit()`:
  ```diff
   const res = await page.goto("/kit/");
  -test.skip(res?.status() === 404, "kit page disabled (start the server with NEXT_PUBLIC_KIT=1)");
  +const disabled =
  +  res?.status() === 404 ||
  +  (await page.locator('meta[name="robots"][content*="noindex"]').count()) > 0;
  +test.skip(disabled, "kit page disabled (start the server with NEXT_PUBLIC_KIT=1)");
  ```
  (assuming the kit page itself is not `noindex` when enabled; otherwise test for the kit's own h1.) The "data-intro is set on the first home view only" test in the same file does not open the kit and would then run in CI too; WP1's request 3 changes that timing (2 s), so its `waitForTimeout(1100)` needs to follow.
- After this lands, remove `-e '/kit\.spec\.ts$'` from the e2e step in `.github/workflows/ci.yml` (WP8).
- Blocking? no (CI excludes the file).
- Test that proves it: `E2E_STATIC=1 BASE_URL=http://127.0.0.1:4173 npx playwright test tests/e2e/kit.spec.ts` against `npm run build && npm run serve:out` reports the kit tests as skipped, not failed.

## Correction (WP8 reviewer, 2026-10-20)

The `noindex` test above does not work: `src/app/kit/page.tsx` sets `robots: { index: false, follow: false }`, so the **enabled** kit is `noindex` too and every kit test would be skipped everywhere. Detect the kit by its own heading instead:

```diff
 const res = await page.goto("/kit/");
-test.skip(res?.status() === 404, "kit page disabled (start the server with NEXT_PUBLIC_KIT=1)");
+const enabled =
+  res?.status() === 200 &&
+  (await page.getByRole("heading", { level: 1, name: "Component kit" }).count()) > 0;
+test.skip(!enabled, "kit page disabled (start the server with NEXT_PUBLIC_KIT=1)");
```

(In a production or preview export `/kit/` is Next's not-found page, whose `h1` is the 404 copy, so the tests skip; under `NEXT_PUBLIC_KIT=1 next dev` they run.)
