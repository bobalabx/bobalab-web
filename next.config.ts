import type { NextConfig } from "next";

// Static export for GitHub Pages (brief §F1, DECISIONS D-08).
// Deliberately NOT set: cacheComponents, partialPrefetching, turbopack.rules (H-13).
// NEXT_PUBLIC_BASE_PATH is inlined into client code by Next automatically;
// src/lib/site/paths.ts uses it to prefix plain <img>/<a> paths.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
};

export default nextConfig;
