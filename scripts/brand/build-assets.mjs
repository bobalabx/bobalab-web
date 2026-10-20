#!/usr/bin/env node
/**
 * Raster brand assets from the outlined wordmark (sharp, build-time only):
 *   src/app/apple-icon.png                180×180 pearl on the plate colour
 *   public/brand/og-default.png           1200×630 default Open Graph still
 *                                         (WP1 may replace it with a Fig. 1 still)
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

const INK = "#1F1712";
const PLATE = "#F7F1E8";
const PAPER = "#FCFAF6";
const MUTED = "#5C4F45";
const HAIR = "#D8CAB6";

function crescent(cx, cy, pr) {
  const r = pr * 0.68;
  const a0 = (200 * Math.PI) / 180;
  const a1 = (252 * Math.PI) / 180;
  const f = (n) => n.toFixed(2);
  return `M${f(cx + r * Math.cos(a0))} ${f(cy + r * Math.sin(a0))}A${f(r)} ${f(r)} 0 0 1 ${f(cx + r * Math.cos(a1))} ${f(cy + r * Math.sin(a1))}`;
}

function wordmarkGroup(x, y, scale) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="${INK}">
    ${W.boba.map((d) => `<path d="${d}"/>`).join("")}
    <circle cx="${P.cx}" cy="${P.cy}" r="${P.r}"/>
    ${W.lab.map((d) => `<path d="${d}"/>`).join("")}
    <path d="${crescent(P.cx, P.cy, P.r)}" fill="none" stroke="${PLATE}" stroke-opacity=".25" stroke-width="${(P.r * 0.13).toFixed(2)}" stroke-linecap="round"/>
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

// apple-icon: pearl on plate
await write(
  "src/app/apple-icon.png",
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
    <rect width="180" height="180" fill="${PLATE}"/>
    <circle cx="90" cy="90" r="62" fill="#2B1D15"/>
    <path d="${crescent(90, 90, 62)}" fill="none" stroke="${PLATE}" stroke-opacity=".25" stroke-width="8" stroke-linecap="round"/>
  </svg>`,
  "png",
);

// OG default: plate card, wordmark, a hairline frame. No text other than the outlined mark.
const ogScale = 820 / VW;
const ogX = (1200 - VW * ogScale) / 2;
const ogY = 250 - (VH * ogScale) / 2;
await write(
  "public/brand/og-default.png",
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${PAPER}"/>
    <rect x="48" y="48" width="1104" height="534" rx="20" fill="${PLATE}" stroke="${HAIR}" stroke-width="2"/>
    ${wordmarkGroup(ogX, ogY, ogScale)}
    <g fill="${MUTED}">
      ${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${510 + i * 36}" cy="430" r="${i === 2 ? 12 : 7}" fill-opacity="${i === 2 ? 1 : 0.55}"/>`).join("")}
    </g>
  </svg>`,
  "png",
);

// Fixture portrait placeholder (abstract, not a person).
await write(
  "public/brand/fixtures/portrait.webp",
  `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" fill="#DFE6F5"/>
    <circle cx="64" cy="52" r="22" fill="#A7B1C9"/>
    <path d="M22 128c4-26 22-40 42-40s38 14 42 40z" fill="#A7B1C9"/>
  </svg>`,
  "webp",
);
