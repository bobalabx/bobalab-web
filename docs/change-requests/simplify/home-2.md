# home-2: privacy page names the cup's session key

**Status (integration, 2026-10-25):** APPLIED with a wording change. `bobalab-intro` is not retired (FigureIsland still uses it on /research/#map), so the page says "Three … all three", and the `bobalab-intro` line now reads "the research map's opening animation" instead of "the opening animation". `docs/ARCHITECTURE.md` updated (both §4 bullets and §2).

- **From:** HOME (simplify), 2026-10-25. **To:** the owner of `content/pages/privacy.yml` (and `docs/ARCHITECTURE.md`).
- **Why:** the homepage cup now stores one more flag in this browser: `sessionStorage["bobalab-cup-intro"] = "1"`. It records that the pearls' settle-once intro has played this session (D-14, R11; `src/components/cup/CupIsland.tsx`). The privacy page lists every key the site stores and says "Two small settings". That statement is now wrong and must be corrected before anything ships. The key holds no personal data and is never sent anywhere.
- **Blocking?** It does not block the build, but it **blocks the merge**: the privacy page would be inaccurate.
- **Proposed change** (`content/pages/privacy.yml`):

```diff
-  Two small settings stay in your own browser and are never sent anywhere:
+  Three small settings stay in your own browser and are never sent anywhere:

   - your "Reduce motion" choice, kept in `localStorage` under the key `bobalab-motion`;
-  - a note that the opening animation has already played in this session, kept in `sessionStorage` under the key `bobalab-intro` and cleared when you close the tab.
+  - a note that the opening animation has already played in this session, kept in `sessionStorage` under the key `bobalab-intro` and cleared when you close the tab;
+  - a note that the pearls on the home page have already settled once in this session, kept in `sessionStorage` under the key `bobalab-cup-intro` and cleared when you close the tab.

-  You can remove both by clearing this site's data in your browser settings.
+  You can remove all three by clearing this site's data in your browser settings.
```

If `bobalab-intro` is retired (Fig. 1 left the home page), drop its line and keep "Two … both".

- **`docs/ARCHITECTURE.md`** (line about the motion preference):

```diff
-… Intro flag: `sessionStorage["bobalab-intro"]`.
+… Intro flags: `sessionStorage["bobalab-intro"]` (Fig. 1) and `sessionStorage["bobalab-cup-intro"]` (the homepage cup, D-14).
```

- **Test:** `tests/e2e/offorigin.spec.ts` (home-3) allows exactly the documented keys.
