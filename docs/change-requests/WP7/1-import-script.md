# WP7 request 1: npm scripts for the content importer and the media check

- File(s): `package.json`
- Why: WP7 owns `scripts/import/**` and `scripts/media/**` (brief §I). Editors and CI should not need to remember the raw `node` commands.
- Proposed change: add to `"scripts"`:
  ```json
  "import:content": "node scripts/import/import-dataset.mjs",
  "media:check": "node scripts/media/build-images.mjs --check"
  ```
  Usage: `npm run import:content -- --dataset <path> --write`. `media:check` is suitable for CI (exits 1 if an upload over 10 MB exists or the manifest/variants are out of date). The existing `"media"` script already points at `scripts/media/build-images.mjs`.
- Blocking? no (the scripts run with `node …` directly).
- Test that proves it: `npm run media:check` exits 0 on the current tree; `npm run import:content` without arguments prints the usage line and exits 2.
