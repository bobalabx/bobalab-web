# WP6 request 3 (owner decision, no longer urgent): `richtext` or `markdown` for body fields

- File(s): `docs/DECISIONS.md` (new entry; owner/integrator). Implementation, if ever wanted, is one line in WP6's `cms/source.mjs` (`RICHTEXT.widget`) plus regenerating `public/admin/config.yml`.
- Background: brief §F3 and WP6 acceptance #3 ask for Decap's `richtext` widget (beta) for Markdown bodies. WP6 uses it. MEASURED 2026-10-20 with decap-cms 3.17.1 in Chromium (local proxy):
  1. Out of the box, opening **any** entry with a richtext field showed "Unsaved changes" at once (8 of 8 entries with a body; Home page and Site settings, which have none, did not). Leaving then asked "leave this page?", and in the editorial workflow Save would open no-op pull requests. With `widget: markdown` the same entries open clean.
  2. Saving after an edit rewrites the whole body in the widget's Markdown style: `-` list markers become `*`, tight lists become loose lists (a blank line between items, so each item renders as a paragraph).
- **Update (WP6 review, 2026-10-20): item 1 is fixed without leaving `richtext`.** `public/admin/cms-widgets.js` re-registers Decap's own richtext control under the same name with a thin wrapper: changes the control reports before the editor touches that field (its load-time re-serialisation) are not passed on, and returning to the load-time form restores the stored text. MEASURED: 8 of 8 entries (news, people, directions, publications, projects, opportunities, About, Join) now open with "Changes saved"; a click or caret move changes nothing; typing makes the entry changed; undoing the typing returns it to "Changes saved". Covered by `tests/unit/cms/widgets.test.ts` and `tests/e2e/cms-local.spec.ts` ("rich-text bodies …"). The bundle stays byte-identical to npm.
- Remaining difference: item 2 (re-formatting of a body that the editor actually edits). `docs/EDITING.md` §12 explains it.
- Options:
  - **A (current, recommended now):** keep `richtext` with the wrapper. Re-check at every Decap bump: if a future richtext stops normalising on load, delete `cms-widgets.js` (and its line in `cms/admin.html`).
  - **B:** switch bodies to `markdown`: also avoids item 2; the widget is deprecated and may disappear in a future Decap major. Change `widget: "richtext"` to `widget: "markdown"` in `cms/source.mjs`, run `node scripts/cms/build-config.mjs`, update the assertion `field(c.fields, "body").widget).toBe("richtext")` in `tests/unit/cms/config.test.ts`; `cms-widgets.js` then does nothing and can be removed.
- Record the choice as a DECISIONS entry either way.
- Blocking? no.
- Test that proves it: `npx playwright test tests/e2e/cms-local.spec.ts -g "rich-text bodies"`.
