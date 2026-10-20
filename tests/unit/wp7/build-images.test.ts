/** WP7: media pipeline (scripts/media/build-images.mjs; brief §I WP7 #9). */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildImages, MAX_BYTES } from "../../../scripts/media/build-images.mjs";

let dir: string;
const quiet = () => {};

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
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "wp7-media-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe("build-images", () => {
  it("handles a missing uploads folder: writes an empty manifest", async () => {
    const missing = path.join(dir, "uploads");
    const r = await buildImages({ dir: missing, log: quiet });
    expect(r.errors).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(missing, "manifest.json"), "utf8"))).toEqual({
      version: 1,
      images: {},
    });
  });

  it("writes 480/960 WebP variants and the manifest format Img.tsx reads", async () => {
    await img("team/wide.jpg", 1600, 900);
    const r = await buildImages({ dir, log: quiet });
    expect(r.errors).toEqual([]);
    const m = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
    expect(m.version).toBe(1);
    expect(m.images["/uploads/team/wide.jpg"]).toEqual({
      width: 1600,
      height: 900,
      variants: [
        { width: 480, src: "/uploads/team/wide-480.webp" },
        { width: 960, src: "/uploads/team/wide-960.webp" },
      ],
    });
    const v = await sharp(path.join(dir, "team/wide-960.webp")).metadata();
    expect(v.format).toBe("webp");
    expect(v.width).toBe(960);
    expect(v.height).toBe(540);
  });

  it("never upscales: a narrow image gets a variant at its own width", async () => {
    await img("narrow.png", 600, 400);
    await img("tiny.png", 300, 300);
    const { manifest } = await buildImages({ dir, log: quiet });
    expect(manifest.images["/uploads/narrow.png"]?.variants.map((v) => v.width)).toEqual([
      480, 600,
    ]);
    expect(manifest.images["/uploads/tiny.png"]?.variants.map((v) => v.width)).toEqual([300]);
  });

  it("is incremental, and --check passes when up to date", async () => {
    await img("a.jpg", 1200, 800);
    await buildImages({ dir, log: quiet });
    const again = await buildImages({ dir, log: quiet });
    expect(again.built).toEqual([]);
    const check = await buildImages({ dir, check: true, log: quiet });
    expect(check.stale).toEqual([]);
  });

  it("--check reports a new upload; a rebuild prunes variants of deleted sources", async () => {
    await img("a.jpg", 1200, 800);
    await buildImages({ dir, log: quiet });
    await img("b.jpg", 1000, 1000);
    const check = await buildImages({ dir, check: true, log: quiet });
    expect(check.stale.length).toBeGreaterThan(0);
    fs.rmSync(path.join(dir, "a.jpg"));
    const r = await buildImages({ dir, log: quiet });
    expect(r.pruned.sort()).toEqual(["/uploads/a-480.webp", "/uploads/a-960.webp"]);
    expect(fs.existsSync(path.join(dir, "a-480.webp"))).toBe(false);
    expect(Object.keys(r.manifest.images)).toEqual(["/uploads/b.jpg"]);
  });

  it("rejects uploads over 10 MB and leaves SVG/PDF alone", async () => {
    fs.writeFileSync(path.join(dir, "huge.jpg"), Buffer.alloc(MAX_BYTES + 1));
    fs.writeFileSync(path.join(dir, "logo.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
    fs.writeFileSync(path.join(dir, "paper.pdf"), "%PDF-1.4");
    const r = await buildImages({ dir, log: quiet });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/huge\.jpg is 10\.0 MB \(limit 10 MB\)/);
    expect(r.manifest.images).toEqual({});
    expect(fs.readdirSync(dir).sort()).toEqual([
      "huge.jpg",
      "logo.svg",
      "manifest.json",
      "paper.pdf",
    ]);
  });
});
