#!/usr/bin/env node
/**
 * Raster brand assets (sharp, build-time only; DECISIONS D-13 item 2):
 *   src/app/apple-icon.png                180×180 "shoulder on floor" mark (four pearls on a rule)
 *   public/brand/og-default.png           1200×630 default Open Graph still: the outlined
 *                                         wordmark on white over a 2 px ink rule
 *   public/brand/fixtures/portrait.webp   128×128 neutral placeholder used by
 *                                         the consent-edge-cases fixture (no real person)
 *
 *   node scripts/brand/build-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const geoSrc = fs.readFileSync(
  path.join(root, "src/components/brand/wordmark-geometry.ts"),
  "utf8",
);
const W = JSON.parse(geoSrc.slice(geoSrc.indexOf("{"), geoSrc.lastIndexOf("}") + 1));
const [, , VW, VH] = W.viewBox;
const P = W.pearl;

// P3 "Lines" tokens (src/styles/tokens.css)
const INK = "#111410";
const PAPER = "#FFFFFF";
const BAND = "#F2F3F1";

/** The favicon geometry in a 16-unit box (src/app/icon.svg, components/brand/PearlMark.tsx). */
const SHOULDER = {
  floor: [0, 14.5, 16, 1.5],
  r: 2.3,
  pearls: [
    [2.8, 12.2],
    [8, 12.2],
    [13.2, 12.2],
    [5.4, 7.7],
  ],
};
function shoulder(x, y, scale, fill) {
  const [fx, fy, fw, fh] = SHOULDER.floor;
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="${fill}">
    <rect x="${fx}" y="${fy}" width="${fw}" height="${fh}"/>
    ${SHOULDER.pearls.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="${SHOULDER.r}"/>`).join("")}
  </g>`;
}

function wordmarkGroup(x, y, scale) {
  const [b1, ...restBoba] = W.boba;
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="${INK}">
    <path d="${b1}"/>
    <circle cx="${P.cx}" cy="${P.cy}" r="${P.r}"/>
    ${restBoba.map((d) => `<path d="${d}"/>`).join("")}
    ${W.lab.map((d) => `<path d="${d}"/>`).join("")}
  </g>`;
}

async function write(file, svg, fmt) {
  const out = path.join(root, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let img = sharp(Buffer.from(svg));
  img = fmt === "webp" ? img.webp({ quality: 80 }) : img.png({ compressionLevel: 9 });
  await img.toFile(out);
  console.log("wrote", file, fs.statSync(out).size, "bytes");
}

// apple-icon: the shoulder-on-floor mark on paper (iOS adds its own rounded mask).
const appleScale = 120 / 16;
await write(
  "src/app/apple-icon.png",
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
    <rect width="180" height="180" fill="${PAPER}"/>
    ${shoulder(30, 10, appleScale, INK)}
  </svg>`,
  "png",
);

// OG default: white card, the wordmark, one 2 px ink rule beneath it. No other text.
const ogScale = 760 / VW;
const ogX = (1200 - VW * ogScale) / 2;
const ogY = 290 - (VH * ogScale) / 2;
await write(
  "public/brand/og-default.png",
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${PAPER}"/>
    ${wordmarkGroup(ogX, ogY, ogScale)}
    <rect x="${ogX}" y="${ogY + VH * ogScale + 48}" width="${VW * ogScale}" height="2" fill="${INK}"/>
  </svg>`,
  "png",
);

// Fixture portrait placeholder (abstract, not a person).
await write(
  "public/brand/fixtures/portrait.webp",
  `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" fill="${BAND}"/>
    <circle cx="64" cy="52" r="22" fill="#AAB9DC"/>
    <path d="M22 128c4-26 22-40 42-40s38 14 42 40z" fill="#AAB9DC"/>
  </svg>`,
  "webp",
);
