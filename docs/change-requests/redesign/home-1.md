# Redesign HOME request 1: make the home statement (h1) editable content

> **Status: APPLIED (integration, 2026-10-24).** Schema field, CMS field, `content/pages/home.yml` and the importer's `HOME` copy carry `statement`; `src/app/page.tsx` dropped the cast; `public/admin/*` regenerated. Wording logged for the PI as R-22 in `docs/CONTENT-QUESTIONS.md`. Tested in `tests/unit/integration/redesign-requests.test.tsx`.

- File(s): `src/lib/content/schema.ts` (content layer, FOUNDATION), `cms/source.mjs` (CMS),
  `content/pages/home.yml` (content), then `npm run cms:config` to regenerate `public/admin/*`.
- Why: D-13 / P3 open the home page with a display statement, "How people learn to work with
  algorithms" (P3's paraphrase of the mission). JUDGE refinement 8 and P3 NOTES known issue 11
  say the PI must confirm that wording. Today it is a constant (`HOME_STATEMENT` in
  `src/components/home/HomeHero.tsx`), because `homePageSchema` is a `z.strictObject` and
  rejects an unknown key. As content, the PI or an editor can change it in the CMS.
- Blocking? No. `src/app/page.tsx` already reads `home.statement` when present and falls back
  to the constant.
- Proposed change:

```diff
--- a/src/lib/content/schema.ts
+++ b/src/lib/content/schema.ts
 export const homePageSchema = z.strictObject({
+  /** Home h1, the display statement (P3 "Lines"); falls back to the HomeHero constant. */
+  statement: z.string().trim().min(1).max(80).optional(),
   mission: z.string().trim().max(240).optional(),
```

```diff
--- a/cms/source.mjs
+++ b/cms/source.mjs
         fields: {
+          statement: {
+            label: "Statement (page heading)",
+            hint: "The large first line of the home page, ≤ 80 characters. Leave empty for the default.",
+          },
           mission: {
             label: "Mission",
             widget: "text",
-            hint: "One or two sentences under the lab name (≤ 240 characters).",
+            hint: "One or two sentences beside the lab name, before the research directions (≤ 240 characters).",
           },
```

```diff
--- a/content/pages/home.yml
+++ b/content/pages/home.yml
+statement: How people learn to work with algorithms
 mission: We study how people learn, decide and work alongside algorithms and AI, with field data from gig platforms and controlled experiments, to improve human–AI interaction in the future of work.
```

After it lands, the home package can drop the cast in `src/app/page.tsx`
(`(home as { statement?: string } | undefined)?.statement` becomes `home?.statement`).

- Test that proves it: `npm run validate` (schema), `npx vitest run tests/unit/cms` (config is
  regenerated), and `npx playwright test tests/e2e/home.spec.ts -g "one h1"`.
