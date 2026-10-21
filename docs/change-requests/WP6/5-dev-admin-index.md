# WP6 request 5 (optional): serve /admin/ in `next dev`

- File(s): `next.config.ts` (WP0)
- Why: GitHub Pages serves `out/admin/index.html` at `/admin/`, but `next dev` does not serve directory indexes from `public/`. MEASURED on the shared dev server: `/admin/` → 404, `/admin` → 308 to `/admin/`, `/admin/index.html` → 200. Locally, editors and tests therefore use `/admin/index.html` (production login screen) and `/admin/local.html` (no-account demo); `docs/EDITING.md` and `scripts/cms/local.mjs` print those URLs. Nothing is broken; this would only make the dev URL match production.
- Proposed change (dev only; static export does not support rewrites, so they must not be present in a build):
  ```ts
  const nextConfig: NextConfig = {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
    basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
    ...(process.env.NODE_ENV === "development"
      ? { rewrites: async () => [{ source: "/admin/", destination: "/admin/index.html" }] }
      : {}),
  };
  ```
- Status: UNTESTED (WP6 may not edit `next.config.ts` or restart the shared dev server). Verify that `next dev` accepts it with `output: "export"` and that `npm run build` is unaffected.
- Blocking? no.
- Test that proves it: with the dev server restarted, `curl -I http://localhost:3100/admin/` → 200 and the page shows "Login with GitHub".
