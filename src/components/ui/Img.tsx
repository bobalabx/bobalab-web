/**
 * Responsive image for the static export (reads the media manifest; renders on
 * the server and, in the editor live preview, in the browser).
 *
 * Manifest: public/media/manifest.json, written by `npm run media` (WP7). Generated
 * files live in public/media/, outside the CMS media folder (WP6 request 6):
 *   { "version": 1, "images": { "/uploads/x.jpg": { "width": 1600, "height": 900,
 *       "variants": [ { "width": 480, "src": "/media/x-480.webp" },
 *                     { "width": 960, "src": "/media/x-960.webp" } ] } } }
 * With a manifest entry we emit srcset plus intrinsic width/height (no CLS).
 * Without one, pass width/height explicitly.
 *
 * Editor live preview: an unsaved upload at `src` (lib/preview/assets) is drawn
 * as a plain <img> with its data URL, keeping alt, width and height.
 */
import { withBasePath } from "@/lib/site/paths";
import { assetOverride } from "@/lib/preview/assets";
// Imported (not read with fs) so this component also renders in the browser. The
// manifest is committed; `npm run media` rewrites it before `next build` in CI,
// and `next dev` picks up a rewrite through HMR.
import manifestJson from "../../../public/media/manifest.json";

interface ManifestEntry {
  width: number;
  height: number;
  variants: Array<{ width: number; src: string }>;
}
const manifest: Record<string, ManifestEntry> =
  (manifestJson as { images?: Record<string, ManifestEntry> }).images ?? {};

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
  const entry = manifest[src];
  const draft = assetOverride(src);
  if (draft) {
    return (
      <img
        src={draft}
        width={entry?.width ?? width}
        height={entry?.height ?? height}
        alt={alt}
        loading={loading}
        decoding="async"
        className={className}
      />
    );
  }
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
