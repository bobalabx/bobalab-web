import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import YAML from "yaml";

/**
 * `next dev` only: the site's own redirects (content/site.yml → redirects, D-05),
 * so an old address such as /people/ (now /#people, D-21) also works while
 * editing locally. The export gets noindex meta-refresh stubs from
 * scripts/content/write-redirects.mjs instead (same entries, same check). Read
 * once at start: restart `next dev` after changing the list. Never throws, so a
 * broken site.yml cannot stop the dev server (the validator reports it).
 */
function devRedirects() {
  try {
    // The content folder the site reads (src/lib/content/read.ts).
    const dir = path.resolve(process.cwd(), process.env.CONTENT_DIR || "content");
    const file = path.join(dir, "site.yml");
    const site = (YAML.parse(fs.readFileSync(file, "utf8")) ?? {}) as {
      redirects?: Array<{ from?: unknown; to?: unknown }>;
    };
    return (
      (site.redirects ?? [])
        .filter(
          (r): r is { from: string; to: string } =>
            typeof r?.from === "string" &&
            /^\/([a-z0-9-]+\/)+$/.test(r.from) &&
            typeof r?.to === "string" &&
            /^(\/|https?:\/\/)/i.test(r.to),
        )
        // GitHub Pages also serves the stub as <from>index.html.
        .flatMap((r) =>
          [r.from, `${r.from}index.html`].map((source) => ({
            source,
            destination: r.to,
            permanent: false,
          })),
        )
    );
  } catch {
    return [];
  }
}

// Static export for GitHub Pages (brief §F1, DECISIONS D-08).
// Deliberately NOT set: cacheComponents, partialPrefetching, turbopack.rules (H-13).
// NEXT_PUBLIC_BASE_PATH is inlined into client code by Next automatically;
// src/lib/site/paths.ts uses it to prefix plain <img>/<a> paths.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  // `next dev` only: serve /admin/ like GitHub Pages does (WP6 request 5), and the
  // site.yml redirects like the export's stubs do. A static export cannot use
  // rewrites or redirects, so these keys must be absent from every build.
  ...(process.env.NODE_ENV === "development"
    ? {
        rewrites: async () => [{ source: "/admin/", destination: "/admin/index.html" }],
        redirects: async () => devRedirects(),
      }
    : {}),
};

export default nextConfig;
