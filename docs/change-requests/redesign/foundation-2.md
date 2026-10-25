# Redesign FOUNDATION request 2: the Fig. 1 gallery renderer inlines Archivo

> **Status: APPLIED (by the HOME package, verified at integration).** `tests/visual/gallery.render.test.tsx` already inlines `archivo-latin-wdth-normal.woff2` with `font-stretch: 62% 125%`; nothing left to change.

- File(s): `tests/visual/gallery.render.test.tsx` (figure package / WP1)
- Why: D-13 item 3. The gallery inlines the old font files, which FOUNDATION deleted, so the
  gallery render throws ENOENT. Not part of `npm run test` (vitest.config includes only
  `tests/unit/**`), so nothing in CI fails today.
- Blocking? No.
- Proposed change (lines 40–44, and the face rule in `fontCss()` gains `font-stretch`):

```diff
-const FONTS: Array<[family: string, file: string, weight: string, cssVar: string]> = [
-  ["BL Fraunces", "fraunces-latin-wght-normal.woff2", "100 900", "--font-fraunces"],
-  ["BL Inter", "inter-latin-wght-normal.woff2", "100 900", "--font-inter"],
-  ["BL Plex Mono", "ibm-plex-mono-latin-500-normal.woff2", "500", "--font-plex-mono"],
-];
+const FONTS: Array<[family: string, file: string, weight: string, cssVar: string]> = [
+  ["BL Archivo", "archivo-latin-wdth-normal.woff2", "100 900", "--font-archivo"],
+];
@@ function fontCss()
-    return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:${weight};font-style:normal;font-display:block}`;
+    return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:${weight};font-stretch:62% 125%;font-style:normal;font-display:block}`;
```

- Test that proves it: `npx vitest run tests/visual/gallery.render.test.tsx` writes the pages.
