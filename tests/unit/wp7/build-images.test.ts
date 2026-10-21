/** WP7: media pipeline (scripts/media/build-images.mjs; brief §I WP7 #9; WP6 request 6). */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildImages, MAX_BYTES } from "../../../scripts/media/build-images.mjs";

let root: string;
/** The CMS media folder (editors' uploads only). */
let dir: string;
/** Generated output, outside the CMS media folder. */
let outDir: string;
const quiet = () => {};
const run = (opts: { check?: boolean; force?: boolean } = {}) =>
  buildImages({ dir, outDir, log: quiet, ...opts });

async function img(rel: string, width: number, height: number) {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const raw = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 120, b: 60 } },
  });
  if (rel.endsWith(".png")) await raw.png().toFile(abs);
  else await raw.jpeg().toFile(abs);
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "wp7-media-"));
  dir = path.join(root, "uploads");
  outDir = path.join(root, "media");
  fs.mkdirSync(dir);
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe("build-images", () => {
  it("handles a missing uploads folder: writes an empty manifest", async () => {
    fs.rmSync(dir, { recursive: true });
    const r = await run();
    expect(r.errors).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(outDir, "manifest.json"), "utf8"))).toEqual({
      version: 1,
      images: {},
    });
  });

  it("defaults the output to the media folder next to the uploads folder", async () => {
    await img("a.jpg", 1200, 800);
    const r = await buildImages({ dir, log: quiet });
    expect(r.errors).toEqual([]);
    expect(fs.existsSync(path.join(root, "media", "a-960.webp"))).toBe(true);
    expect(fs.existsSync(path.join(root, "media", "manifest.json"))).toBe(true);
  });

  it("writes 480/960 WebP variants and the manifest format Img.tsx reads, outside the uploads", async () => {
    await img("team/wide.jpg", 1600, 900);
    const r = await run();
    expect(r.errors).toEqual([]);
    const m = JSON.parse(fs.readFileSync(path.join(outDir, "manifest.json"), "utf8"));
    expect(m.version).toBe(1);
    expect(m.images["/uploads/team/wide.jpg"]).toEqual({
      width: 1600,
      height: 900,
      variants: [
        { width: 480, src: "/media/team/wide-480.webp" },
        { width: 960, src: "/media/team/wide-960.webp" },
      ],
    });
    const v = await sharp(path.join(outDir, "team/wide-960.webp")).metadata();
    expect(v.format).toBe("webp");
    expect(v.width).toBe(960);
    expect(v.height).toBe(540);
    // The CMS media folder holds only what the editor uploaded.
    expect(fs.readdirSync(path.join(dir, "team"))).toEqual(["wide.jpg"]);
    expect(fs.readdirSync(dir)).toEqual(["team"]);
  });

  it("never upscales: a narrow image gets a variant at its own width", async () => {
    await img("narrow.png", 600, 400);
    await img("tiny.png", 300, 300);
    const { manifest } = await run();
    expect(manifest.images["/uploads/narrow.png"]?.variants.map((v) => v.width)).toEqual([
      480, 600,
    ]);
    expect(manifest.images["/uploads/tiny.png"]?.variants.map((v) => v.width)).toEqual([300]);
  });

  it("is incremental, and --check passes when up to date", async () => {
    await img("a.jpg", 1200, 800);
    await run();
    const again = await run();
    expect(again.built).toEqual([]);
    const check = await run({ check: true });
    expect(check.stale).toEqual([]);
  });

  it("--check reports a new upload; a rebuild prunes variants of deleted sources", async () => {
    await img("a.jpg", 1200, 800);
    await img("sub/c.jpg", 1200, 800);
    await run();
    await img("b.jpg", 1000, 1000);
    const check = await run({ check: true });
    expect(check.stale.length).toBeGreaterThan(0);
    fs.rmSync(path.join(dir, "a.jpg"));
    fs.rmSync(path.join(dir, "sub"), { recursive: true });
    const r = await run();
    expect(r.pruned.sort()).toEqual([
      "/media/a-480.webp",
      "/media/a-960.webp",
      "/media/sub/c-480.webp",
      "/media/sub/c-960.webp",
    ]);
    expect(fs.existsSync(path.join(outDir, "a-480.webp"))).toBe(false);
    expect(fs.existsSync(path.join(outDir, "sub"))).toBe(false);
    expect(Object.keys(r.manifest.images)).toEqual(["/uploads/b.jpg"]);
  });

  it("rejects uploads over 10 MB and leaves SVG/PDF alone", async () => {
    fs.writeFileSync(path.join(dir, "huge.jpg"), Buffer.alloc(MAX_BYTES + 1));
    fs.writeFileSync(path.join(dir, "logo.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
    fs.writeFileSync(path.join(dir, "paper.pdf"), "%PDF-1.4");
    const r = await run();
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/huge\.jpg is 10\.0 MB \(limit 10 MB\)/);
    expect(r.manifest.images).toEqual({});
    expect(fs.readdirSync(dir).sort()).toEqual(["huge.jpg", "logo.svg", "paper.pdf"]);
    expect(fs.readdirSync(outDir)).toEqual(["manifest.json"]);
  });
});
