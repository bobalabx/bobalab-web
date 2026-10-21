/**
 * Responsive image for the static export (server component: reads the media manifest).
 *
 * Manifest: public/media/manifest.json, written by `npm run media` (WP7). Generated
 * files live in public/media/, outside the CMS media folder (WP6 request 6):
 *   { "version": 1, "images": { "/uploads/x.jpg": { "width": 1600, "height": 900,
 *       "variants": [ { "width": 480, "src": "/media/x-480.webp" },
 *                     { "width": 960, "src": "/media/x-960.webp" } ] } } }
 * With a manifest entry we emit srcset plus intrinsic width/height (no CLS).
 * Without one, pass width/height explicitly.
 */
import fs from "node:fs";
import path from "node:path";
import { withBasePath } from "@/lib/site/paths";

interface ManifestEntry {
  width: number;
  height: number;
  variants: Array<{ width: number; src: string }>;
}
let manifest: Record<string, ManifestEntry> | null = null;

function readManifest(): Record<string, ManifestEntry> {
  if (manifest && process.env.NODE_ENV !== "development") return manifest;
  try {
    const file = path.join(process.cwd(), "public", "media", "manifest.json");
    const json = JSON.parse(fs.readFileSync(file, "utf8")) as {
      images?: Record<string, ManifestEntry>;
    };
    manifest = json.images ?? {};
  } catch {
    manifest = {};
  }
  return manifest;
}

export interface ImgProps {
  src: string;
  /** Required. Use "" only for purely decorative images. */
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  loading?: "lazy" | "eager";
}

export function Img({
  src,
  alt,
  width,
  height,
  sizes = "(min-width: 64rem) 960px, 100vw",
  className,
  loading = "lazy",
}: ImgProps) {
  const entry = readManifest()[src];
  if (entry && entry.variants.length) {
    const variants = [...entry.variants].sort((a, b) => a.width - b.width);
    const largest = variants[variants.length - 1]!;
    return (
      <img
        src={withBasePath(largest.src)}
        srcSet={variants.map((v) => `${withBasePath(v.src)} ${v.width}w`).join(", ")}
        sizes={sizes}
        width={entry.width}
        height={entry.height}
        alt={alt}
        loading={loading}
        decoding="async"
        className={className}
      />
    );
  }
  return (
    <img
      src={withBasePath(src)}
      width={width}
      height={height}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
    />
  );
}
