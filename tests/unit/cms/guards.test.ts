/**
 * public/admin/cms-guards.js (editor v2, WP5; spec §3.6 b, c): the upload rules
 * a Save must pass (the deploy's own, from asset-budget.mjs via cms-data.js),
 * and the hidden-roster name check, which must find exactly what
 * scripts/import/hidden-names.mjs finds (fictional self-test name only).
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import {
  hashName,
  loadHashes,
  normalizeName,
  scanText,
} from "../../../scripts/import/hidden-names.mjs";
import { LIMITS, UPLOAD_EXTENSIONS } from "../../../scripts/perf/asset-budget.mjs";
import { ROOT, runAdminScripts } from "./helpers";

type Media = Record<string, unknown>;
type Problem = { name: string; message: string; field?: string };
type Guards = {
  uploadProblems: (e: { data: unknown; mediaFiles: unknown[] }, m: Media) => Problem[];
  normalizeName: (s: string) => string;
  hiddenNameHits: (texts: string[], h: { salt: string; hashes: string[] }) => Promise<number>;
  strings: (v: unknown) => string[];
};

function load(): Guards {
  const win: Record<string, unknown> = { crypto: globalThis.crypto, TextEncoder };
  win.window = win;
  const ctx = vm.createContext(win);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "public/admin/cms-guards.js"), "utf8"), ctx);
  return ctx.BobalabGuards as Guards;
}

const G = load();
const MEDIA = (runAdminScripts(["cms-data.js"]).window.BOBALAB_CMS as { media: Media }).media;
const MB = 1024 * 1024;

/** A draft upload of `name` (`size` bytes) used by the image field "photo". */
function entryWith(name: string, size: number, extra: Record<string, unknown> = {}) {
  const pub = `/uploads/people/${name}`;
  return {
    data: { name: "Ada Editor", photo: pub },
    mediaFiles: [
      {
        id: "1",
        name,
        path: `public/uploads/people/${name}`,
        url: "blob:x",
        draft: true,
        file: { name, size },
        ...extra,
      },
    ],
  };
}

const ADVICE = "Upload a PDF (at most 10 MB) or a JPG, PNG, WebP or GIF image (at most 2 MB).";

describe("cms-guards.js uploadProblems (the deploy's own rules)", () => {
  it("cms-data.js carries asset-budget's extensions and limits", () => {
    expect(MEDIA.uploadExtensions).toEqual([...UPLOAD_EXTENSIONS]);
    expect(MEDIA.limits).toEqual({
      uploadBytes: LIMITS.uploadBytes,
      rasterBytes: LIMITS.rasterBytes,
    });
  });

  // One row per extension and limit.
  const rows: Array<[string, number, boolean]> = [
    ["photo.jpg", 1 * MB, true],
    ["photo.jpeg", 1 * MB, true],
    ["photo.png", 1 * MB, true],
    ["photo.webp", 1 * MB, true],
    ["photo.gif", 1 * MB, true],
    ["paper.pdf", 1 * MB, true],
    ["PHOTO.JPG", 1 * MB, true], // case does not matter
    ["photo.png", LIMITS.rasterBytes, true], // exactly at the raster limit
    ["photo.png", LIMITS.rasterBytes + 1, false], // a 2 MB + 1 byte image
    ["photo.jpg", 3 * MB, false], // a 3 MB photo
    ["paper.pdf", 3 * MB, true], // PDFs may be bigger than images
    ["paper.pdf", LIMITS.uploadBytes, true],
    ["paper.pdf", LIMITS.uploadBytes + 1, false],
    ["IMG_0001.heic", 1 * MB, false], // a phone photo
    ["cv.docx", 20_000, false],
    ["logo.svg", 5_000, false],
    ["notes", 100, false], // no extension
  ];
  for (const [name, size, ok] of rows) {
    it(`${name}, ${size} bytes → ${ok ? "allowed" : "refused"}`, () => {
      const p = G.uploadProblems(entryWith(name, size), MEDIA);
      expect(p.length).toBe(ok ? 0 : 1);
      if (!ok) {
        expect(p[0]!.name).toBe(name);
        expect(p[0]!.field).toBe("photo");
        expect(p[0]!.message).toMatch(
          new RegExp(`^Not saved: “${name.replace(".", "\\.")}” can't go on the website`),
        );
        expect(p[0]!.message.endsWith(ADVICE)).toBe(true);
      }
    });
  }

  it("says it in the spec's words, with the size when that is the problem", () => {
    expect(G.uploadProblems(entryWith("cv.docx", 20_000), MEDIA)[0]!.message).toBe(
      `Not saved: “cv.docx” can't go on the website. ${ADVICE}`,
    );
    expect(G.uploadProblems(entryWith("photo.png", 3 * MB), MEDIA)[0]!.message).toBe(
      `Not saved: “photo.png” can't go on the website: it is 3 MB. ${ADVICE}`,
    );
  });

  it("checks only this entry's unsaved uploads that the form still uses", () => {
    // already saved (not a draft): the deploy has accepted it before
    expect(G.uploadProblems(entryWith("cv.docx", 1, { draft: false }), MEDIA)).toEqual([]);
    // uploaded, then removed from the field again: Decap does not save it
    const e = entryWith("cv.docx", 1);
    e.data.photo = "";
    expect(G.uploadProblems(e, MEDIA)).toEqual([]);
    expect(G.uploadProblems({ data: {}, mediaFiles: [] }, MEDIA)).toEqual([]);
  });

  it("finds uploads used in nested fields and names the top-level field", () => {
    const e = {
      data: { title: "X", links: { cv: "/uploads/cv.docx" }, figure: { image: "/uploads/f.heic" } },
      mediaFiles: [
        { name: "cv.docx", path: "public/uploads/cv.docx", draft: true, file: { size: 10 } },
        { name: "f.heic", path: "public/uploads/f.heic", draft: true, file: { size: 10 } },
      ],
    };
    const p = G.uploadProblems(e, MEDIA);
    expect(p.map((x) => [x.name, x.field])).toEqual([
      ["cv.docx", "links"],
      ["f.heic", "figure"],
    ]);
  });

  it("uses the item's size when the File is gone (a restored local backup)", () => {
    const e = entryWith("photo.jpg", 0);
    delete (e.mediaFiles[0] as Record<string, unknown>).file;
    (e.mediaFiles[0] as Record<string, unknown>).size = 3 * MB;
    expect(G.uploadProblems(e, MEDIA)).toHaveLength(1);
  });

  it("strings() lists every text in the data, nested ones too", () => {
    expect(G.strings({ a: "x", b: [{ c: "y" }, 3, true], d: { e: "z" } })).toEqual(["x", "y", "z"]);
  });
});

describe("cms-guards.js hidden roster names: parity with scripts/import/hidden-names.mjs", () => {
  const h = loadHashes();
  // The repo test's fictional self-test name (wp7-hidden-names.test.ts); no real name is used.
  const fakeHashes = [hashName(h.salt, normalizeName("Quinby Zorander"))];
  const fakeNode = { salt: h.salt, hashes: new Set(fakeHashes) };
  const fakeBrowser = { salt: h.salt, hashes: fakeHashes };
  const samples = [
    "Thanks to Quinby Zorander.",
    "ZORANDER, Quinby (2024)",
    "quinby-zorander.md",
    "Quinby Smith and Ada Zorander",
    "Quinby (Q) Zorander joined the lab",
    "Quínby Zoránder",
    "content/people/quinby-zorander.md",
    "Nothing to see here",
    "",
    "Quinby Zorander and again Quinby Zorander",
  ];

  for (const text of samples) {
    it(`same count as scanText for ${JSON.stringify(text)}`, async () => {
      const node = scanText(text, fakeNode).length;
      expect(await G.hiddenNameHits([text], fakeBrowser)).toBe(node);
    });
  }

  it("the self-test cases of wp7-hidden-names.test.ts", async () => {
    expect(await G.hiddenNameHits(["Thanks to Quinby Zorander."], fakeBrowser)).toBe(1);
    expect(await G.hiddenNameHits(["ZORANDER, Quinby (2024)"], fakeBrowser)).toBe(1);
    expect(await G.hiddenNameHits(["quinby-zorander.md"], fakeBrowser)).toBe(1);
    expect(await G.hiddenNameHits(["Quinby Smith and Ada Zorander"], fakeBrowser)).toBe(0);
  });

  it("sums over several texts (every string of an entry and its file name)", async () => {
    const texts = ["Quinby Zorander", "x", "people/quinby-zorander.md"];
    const node = texts.reduce((n, t) => n + scanText(t, fakeNode).length, 0);
    expect(await G.hiddenNameHits(texts, fakeBrowser)).toBe(node);
    expect(node).toBe(2);
  });

  it("normalizeName matches the node version", () => {
    for (const s of [
      "Quinby Zorander",
      "  ZORANDER,  Quinby ",
      "Quínby (Q) Zoränder-Smith",
      "Ådа Łove 3rd",
      "",
    ])
      expect(G.normalizeName(s)).toBe(normalizeName(s));
  });

  it("finds nothing in today's content with the real hashes, and never needs the names", async () => {
    const real = { salt: h.salt, hashes: [...h.hashes] };
    const dir = path.join(ROOT, "content", "people");
    const texts = fs
      .readdirSync(dir)
      .slice(0, 12)
      .flatMap((f) => [f, fs.readFileSync(path.join(dir, f), "utf8")]);
    expect(await G.hiddenNameHits(texts, real)).toBe(0);
    expect(await G.hiddenNameHits(["anything"], { salt: "", hashes: [] })).toBe(0);
  });
});
