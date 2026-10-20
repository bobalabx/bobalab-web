#!/usr/bin/env node
/**
 * Media pipeline (WP7, brief §I WP7 #9): responsive WebP variants + manifest.
 *
 *   npm run media                 build variants for new/changed uploads, prune stale ones
 *   npm run media -- --force      rebuild every variant
 *   npm run media -- --check      exit 1 if the manifest or variants are out of date (CI)
 *
 * Input:  public/uploads/** (raster images: jpg, jpeg, png, webp, avif, gif, tif, tiff).
 *         Override with UPLOADS_DIR (used by tests).
 * Output: <name>-480.webp and <name>-960.webp next to each source (never upscaled: an
 *         image narrower than 960 px gets one variant at its own width), and
 *         public/uploads/manifest.json, read by src/components/ui/Img.tsx:
 *         { "version": 1, "images": { "/uploads/x.jpg": { "width", "height",
 *           "variants": [ { "width": 480, "src": "/uploads/x-480.webp" }, … ] } } }
 *
 * Rules: uploads over 10 MB are rejected (exit 1). EXIF orientation is applied and
 * metadata stripped (sharp's default). SVG and PDF files are left as they are. An empty
 * or missing uploads folder is fine: the script writes an empty manifest.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

// No file cache: on Windows a cached input keeps the source file locked (EPERM on delete).
sharp.cache(false);

export const WIDTHS = [480, 960];
export const MAX_BYTES = 10 * 1024 * 1024;
const RASTER = /\.(jpe?g|png|webp|avif|gif|tiff?)$/i;
const VARIANT = /-(\d+)\.webp$/i;
const QUALITY = 78;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function walk(dir, rel = "") {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) out.push(...walk(path.join(dir, d.name), r));
    else out.push(r);
  }
  return out.sort();
}

/** Site path for a file under public/uploads ("/uploads/a/b.jpg"). */
const sitePath = (rel) => `/uploads/${rel}`;
const variantRel = (rel, w) => rel.replace(/\.[^./]+$/, `-${w}.webp`);

/**
 * Build variants and the manifest.
 * @typedef {{ width: number, height: number, variants: Array<{ width: number, src: string }> }} ManifestEntry
 * @param {{ dir?: string, force?: boolean, check?: boolean, log?: (msg: string) => void }} [opts]
 * @returns {Promise<{ manifest: { version: 1, images: Record<string, ManifestEntry> }, built: string[], pruned: string[], errors: string[], stale: string[] }>}
 */
export async function buildImages({ dir, force = false, check = false, log = console.log } = {}) {
  const uploads = path.resolve(
    dir ?? process.env.UPLOADS_DIR ?? path.join(ROOT, "public", "uploads"),
  );
  const manifestFile = path.join(uploads, "manifest.json");
  const all = walk(uploads);

  // Sources = raster files that are not themselves generated variants of another source.
  const rasters = all.filter((r) => RASTER.test(r));
  const generated = new Set();
  for (const r of rasters) {
    if (!/\.webp$/i.test(r) || !VARIANT.test(r)) continue;
    const base = r.replace(VARIANT, "");
    if (rasters.some((s) => s !== r && s.replace(/\.[^./]+$/, "") === base)) generated.add(r);
  }
  // A variant whose source was deleted is also generated (it matches the name scheme and
  // the previous manifest lists it).
  let previous = { version: 1, images: {} };
  try {
    previous = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  } catch {
    /* no manifest yet */
  }
  const previousVariants = new Set(
    Object.values(previous.images ?? {}).flatMap((e) => (e.variants ?? []).map((v) => v.src)),
  );
  for (const r of rasters) if (previousVariants.has(sitePath(r))) generated.add(r);

  const sources = rasters.filter((r) => !generated.has(r));
  const errors = [];
  const built = [];
  const stale = [];
  const images = {};
  const keep = new Set();

  for (const rel of sources) {
    const abs = path.join(uploads, rel);
    const stat = fs.statSync(abs);
    if (stat.size > MAX_BYTES) {
      errors.push(
        `${sitePath(rel)} is ${(stat.size / 1048576).toFixed(1)} MB (limit 10 MB); resize it before uploading`,
      );
      continue;
    }
    let meta;
    try {
      meta = await sharp(abs).metadata();
    } catch (e) {
      errors.push(`${sitePath(rel)}: cannot read image (${e.message})`);
      continue;
    }
    // Apply EXIF orientation to the reported size.
    const rotated = (meta.orientation ?? 1) >= 5;
    const width = rotated ? meta.height : meta.width;
    const height = rotated ? meta.width : meta.height;
    const targets = WIDTHS.filter((w) => w <= width);
    if (!targets.length || width < WIDTHS[WIDTHS.length - 1]) {
      if (!targets.includes(width)) targets.push(width); // largest variant at native width
    }
    const variants = [];
    for (const w of [...new Set(targets)].sort((a, b) => a - b)) {
      const vrel = variantRel(rel, w);
      const vabs = path.join(uploads, vrel);
      if (keep.has(vrel)) {
        errors.push(
          `${sitePath(rel)}: variant ${sitePath(vrel)} clashes with another upload of the same name`,
        );
        continue;
      }
      keep.add(vrel);
      const fresh = fs.existsSync(vabs) && fs.statSync(vabs).mtimeMs >= stat.mtimeMs;
      if (force || !fresh) {
        if (check) stale.push(sitePath(vrel));
        else {
          await sharp(abs)
            .rotate()
            .resize({ width: w, withoutEnlargement: true })
            .webp({ quality: QUALITY })
            .toFile(vabs);
          built.push(sitePath(vrel));
        }
      }
      variants.push({ width: w, src: sitePath(vrel) });
    }
    images[sitePath(rel)] = { width, height, variants };
  }

  // Prune variants that no longer belong to a source.
  const pruned = [];
  for (const r of generated) {
    if (keep.has(r)) continue;
    if (check) stale.push(`${sitePath(r)} (orphan)`);
    else {
      fs.rmSync(path.join(uploads, r));
      pruned.push(sitePath(r));
    }
  }

  const sorted = Object.fromEntries(Object.entries(images).sort(([a], [b]) => a.localeCompare(b)));
  const manifest = { version: 1, images: sorted };
  const text = JSON.stringify(manifest, null, 2) + "\n";
  const current = fs.existsSync(manifestFile) ? fs.readFileSync(manifestFile, "utf8") : null;
  if (check) {
    if (current !== text) stale.push(`${sitePath("manifest.json")} (out of date)`);
  } else if (current !== text) {
    fs.mkdirSync(uploads, { recursive: true });
    fs.writeFileSync(manifestFile, text);
  }

  log(
    `[media] ${uploads}: ${sources.length} source image(s), ${built.length} variant(s) built, ` +
      `${pruned.length} pruned, ${errors.length} error(s)${check ? `, ${stale.length} stale` : ""}`,
  );
  return { manifest, built, pruned, errors, stale };
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const r = await buildImages({ force: args.includes("--force"), check: args.includes("--check") });
  for (const e of r.errors) console.error(`[media] error: ${e}`);
  for (const s of r.stale) console.error(`[media] stale: ${s}`);
  process.exit(r.errors.length || r.stale.length ? 1 : 0);
}
