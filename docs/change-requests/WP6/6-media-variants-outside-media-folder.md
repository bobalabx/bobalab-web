# WP6 request 6: keep generated media files out of the CMS media folder

- File(s): `scripts/media/build-images.mjs` (WP7), `src/components/ui/Img.tsx` (WP0), and their tests
- Why: Decap's media library lists every file in `media_folder: public/uploads` (brief §F3). MEASURED 2026-10-20 on the shared dev server (`/admin/local.html` → Media): the library already shows `manifest.json`, and once images are uploaded it will also show the pipeline's `<name>-480.webp` / `<name>-960.webp` variants next to each original. Editors can then pick a variant instead of the original (the site would look up a manifest entry that does not exist) or select and delete generated files with "Delete selected". The brief's upload allowlist (jpg/jpeg/png/webp/gif/pdf under `public/uploads/`) would also have to make an exception for `manifest.json`.
- Proposed change: write generated output to a folder the CMS does not manage, e.g.
  - variants: `public/media/<same relative path>-480.webp`, `-960.webp` (served at `/media/…`);
  - manifest: `public/media/manifest.json` (or `src/generated/media-manifest.json` if only the build reads it);
  - `Img.tsx` reads the manifest from the new path; `public/uploads/` then holds only what editors uploaded.
- Blocking? no (no images are uploaded yet; `manifest.json` is the only stray file today).
- Test that proves it: after `npm run media` with a sample upload, `/admin/local.html` → Media lists only the uploaded original; `npm run media -- --check` and the Img unit tests pass.
