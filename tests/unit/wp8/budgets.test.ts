/**
 * WP8 acceptance #4: the budget scripts fail when they should, proven on
 * synthetic out/ fixtures (brief §G2). Script bodies are random bytes, so
 * their gzip size is predictable (≈ raw size + a few bytes of header).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  budgetFor,
  checkBudgets,
  EXTRA,
  KB,
  parseBaseline,
  routeOf,
  scriptsOf,
} from "../../../scripts/perf/js-budget.mjs";
import { checkOut, checkUploads, LIMITS } from "../../../scripts/perf/asset-budget.mjs";

const JS_BUDGET = fileURLToPath(new URL("../../../scripts/perf/js-budget.mjs", import.meta.url));
const ASSET_BUDGET = fileURLToPath(
  new URL("../../../scripts/perf/asset-budget.mjs", import.meta.url),
);
const B = 100_000;
const tmp: string[] = [];
afterEach(() => {
  for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function mkdir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "wp8-budget-"));
  tmp.push(d);
  return d;
}
function write(root: string, rel: string, body: string | Buffer) {
  const f = path.join(root, ...rel.split("/"));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body);
}
/** A script whose gzip -9 size is exactly `gz` bytes (random bytes + padding search). */
function scriptOfGz(gz: number): Buffer {
  let n = gz - 30;
  for (;;) {
    const buf = crypto.randomBytes(n);
    const size = zlib.gzipSync(buf, { level: 9 }).length;
    if (size === gz) return buf;
    n += gz - size;
  }
}
const page = (scripts: string[], extra = "") =>
  `<!doctype html><html><head>${scripts.map((s) => `<script src="${s}" async=""></script>`).join("")}${extra}</head><body><h1>x</h1></body></html>`;

/** out/ with a shared framework chunk of exactly B bytes gz plus per-route extras. */
function siteFixture(extraByRoute: Record<string, number>) {
  const out = mkdir();
  write(out, "_next/static/chunks/framework.js", scriptOfGz(B));
  write(out, "_next/static/chunks/legacy.js", scriptOfGz(40_000));
  for (const [route, extra] of Object.entries(extraByRoute)) {
    const scripts = ["/_next/static/chunks/framework.js"];
    if (extra > 0) {
      const name = `/_next/static/chunks/r${crypto.randomBytes(4).toString("hex")}.js`;
      write(out, name.slice(1), scriptOfGz(extra));
      scripts.push(name);
    }
    const rel = route === "/" ? "index.html" : `${route.replace(/^\/|\/$/g, "")}/index.html`;
    write(
      out,
      rel,
      page(scripts, `<script src="/_next/static/chunks/legacy.js" noModule=""></script>`),
    );
  }
  return out;
}

describe("js-budget helpers", () => {
  it("reads B from docs/PERF-BASELINE.md", () => {
    const md = fs.readFileSync(
      fileURLToPath(new URL("../../../docs/PERF-BASELINE.md", import.meta.url)),
      "utf8",
    );
    expect(parseBaseline(md)).toBeGreaterThan(50_000);
    expect(parseBaseline("**B = 139,144 bytes gz (135.9 KiB)**")).toBe(139_144);
    expect(parseBaseline("no baseline here")).toBeNull();
  });

  it("maps files to routes and routes to budgets (§G2)", () => {
    expect(routeOf("index.html")).toBe("/");
    expect(routeOf(path.join("publications", "index.html"))).toBe("/publications/");
    expect(routeOf("404.html")).toBe("/404.html");
    expect(budgetFor("/", B)).toEqual({ kind: "home", limit: B + 8 * KB });
    expect(budgetFor("/publications/", B)).toEqual({ kind: "publications", limit: B + 30 * KB });
    expect(budgetFor("/publications/x-2020-y/", B)).toEqual({ kind: "other", limit: B + 10 * KB });
  });

  it("counts <script src> and preloads once, skips nomodule, inline and JSON-LD", () => {
    const html = `<script src="/a.js" async=""></script><script src="/a.js"></script>
      <script src="/legacy.js" noModule=""></script><link rel="preload" as="script" href="/b.js"/>
      <link rel="preload" as="font" href="/f.woff2"/><script>self.x=1</script>
      <script type="application/ld+json">{"@context":"https://schema.org"}</script>`;
    const s = scriptsOf(html);
    expect(s.external).toEqual(["/a.js", "/b.js"]);
    expect(s.skipped).toEqual(["/legacy.js"]);
    expect(s.inline).toHaveLength(1);
  });
});

describe("js-budget fails when it should", () => {
  it("passes at the limit and fails one byte over, per route class", () => {
    const out = siteFixture({
      "/": EXTRA.home,
      "/publications/": EXTRA.publications + 1,
      "/people/": EXTRA.other,
      "/news/": EXTRA.home + 1, // within "other" (10 KB): home's 8 KB limit does not apply
    });
    const { rows, failures } = checkBudgets(out, { baseline: B });
    const by = Object.fromEntries(rows.map((r) => [r.route, r]));
    expect(by["/"]!.gz).toBe(B + EXTRA.home);
    expect(by["/"]!.ok).toBe(true);
    expect(by["/people/"]!.ok).toBe(true);
    expect(by["/news/"]!.ok).toBe(true);
    expect(by["/publications/"]!.ok).toBe(false);
    expect(failures.map((f) => f.route)).toEqual(["/publications/"]);
    // The 40 KB noModule chunk is never counted.
    expect(by["/people/"]!.skipped).toBe(1);
  });

  it("home over B + 8 KB fails; the CLI exits 1 and names the page", () => {
    const out = siteFixture({ "/": EXTRA.home + 500, "/people/": 0 });
    const r = spawnSync(process.execPath, [JS_BUDGET, out, "--baseline", String(B)], {
      encoding: "utf8",
    });
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/FAIL \/\s/);
    expect(r.stdout).toContain("1 page(s) over budget");
  });

  it("a page referencing a missing or off-origin script fails", () => {
    const out = siteFixture({ "/people/": 0 });
    write(
      out,
      "news/index.html",
      page(["/_next/static/chunks/gone.js", "https://cdn.example.com/x.js"]),
    );
    const { failures } = checkBudgets(out, { baseline: B });
    expect(failures).toHaveLength(1);
    expect(failures[0]!.errors.join(" ")).toMatch(/missing script.*off-origin script/);
  });

  it("the CLI exits 0 within budget and 2 without out/ or baseline", () => {
    const out = siteFixture({ "/": 0, "/people/": 1000 });
    const ok = spawnSync(process.execPath, [JS_BUDGET, out, "--baseline", String(B)], {
      encoding: "utf8",
    });
    expect(ok.status).toBe(0);
    const missing = spawnSync(process.execPath, [JS_BUDGET, path.join(out, "nope")], {
      encoding: "utf8",
    });
    expect(missing.status).toBe(2);
    const noBaseline = spawnSync(
      process.execPath,
      [JS_BUDGET, out, "--baseline-file", path.join(out, "none.md")],
      { encoding: "utf8", env: { ...process.env, PERF_BASELINE_B: "" } },
    );
    expect(noBaseline.status).toBe(2);
  });

  it("strips NEXT_PUBLIC_BASE_PATH from script URLs", () => {
    const out = mkdir();
    write(out, "_next/static/chunks/f.js", scriptOfGz(1000));
    write(out, "index.html", page(["/website/_next/static/chunks/f.js"]));
    const { rows } = checkBudgets(out, { baseline: B, basePath: "/website" });
    expect(rows[0]!.gz).toBe(1000);
    expect(rows[0]!.errors).toEqual([]);
  });
});

describe("asset budgets fail when they should", () => {
  it("uploads: rejects SVG/HTML/XML, files over 10 MB and images over 2 MB", () => {
    const up = mkdir();
    write(up, "manifest.json", "{}");
    write(up, "ok.jpg", Buffer.alloc(1000));
    write(up, "paper.pdf", Buffer.alloc(3 * 1024 * 1024)); // PDFs may exceed 2 MB
    write(up, "evil.svg", "<svg/>");
    write(up, "page.html", "<p>");
    write(up, "sub/feed.xml", "<x/>");
    write(up, "huge.pdf", Buffer.alloc(LIMITS.uploadBytes + 1));
    write(up, "photo.png", Buffer.alloc(LIMITS.rasterBytes + 1));
    const errors = checkUploads(up);
    expect(errors).toHaveLength(5);
    for (const bad of ["evil.svg", "page.html", "sub/feed.xml", "huge.pdf", "photo.png"]) {
      expect(errors.some((e) => e.includes(bad))).toBe(true);
    }
    const r = spawnSync(process.execPath, [ASSET_BUDGET, "uploads", up], { encoding: "utf8" });
    expect(r.status).toBe(1);
  });

  it("out: fonts over 100 KiB, home over 350 KB and a 41 KB headshot fail", () => {
    const out = mkdir();
    const content = mkdir();
    write(out, "_next/static/media/a.woff2", Buffer.alloc(60 * KB));
    write(out, "_next/static/media/b.woff2", Buffer.alloc(41 * KB));
    write(out, "_next/static/chunks/big.js", scriptOfGz(300 * KB));
    const fonts = `<link rel="preload" href="/_next/static/media/a.woff2" as="font" crossorigin="" type="font/woff2"/><link rel="preload" href="/_next/static/media/b.woff2" as="font"/>`;
    write(out, "index.html", page(["/_next/static/chunks/big.js"], fonts));
    write(out, "media/p-480.webp", Buffer.alloc(41 * KB));
    write(
      out,
      "media/manifest.json",
      JSON.stringify({
        version: 1,
        images: {
          "/uploads/p.jpg": {
            width: 800,
            height: 800,
            variants: [{ width: 480, src: "/media/p-480.webp" }],
          },
        },
      }),
    );
    write(
      content,
      "people/pat-example.md",
      "---\nname: Pat Example\nrole: phd\nlisted: true\nphoto: /uploads/p.jpg\nphoto_alt: Pat\nphoto_consent: true\n---\n",
    );
    const { errors } = checkOut(out, { contentDir: content });
    expect(errors.some((e) => /fonts \(limit 100 KiB\)/.test(e))).toBe(true);
    expect(errors.some((e) => /home transfer .* over 350 KB/.test(e))).toBe(true);
    expect(errors.some((e) => /p-480\.webp .* 40 KB headshot/.test(e))).toBe(true);
    // Without consent the photo is never rendered, so it is not a headshot budget item.
    write(
      content,
      "people/pat-example.md",
      "---\nname: Pat Example\nrole: phd\nlisted: true\nphoto: /uploads/p.jpg\nphoto_consent: false\n---\n",
    );
    expect(checkOut(out, { contentDir: content }).errors.some((e) => /headshot/.test(e))).toBe(
      false,
    );
  });

  it("out: an <img> without explicit width and height fails (§G2)", () => {
    const out = mkdir();
    write(out, "_next/static/chunks/f.js", scriptOfGz(10 * KB));
    write(
      out,
      "index.html",
      page(
        ["/_next/static/chunks/f.js"],
        `<img src="/uploads/a-480.webp" width="480" height="270" alt="a"/>`,
      ),
    );
    write(out, "people/index.html", `<img src="/uploads/b.webp" alt="b" width="480">`);
    write(out, "news/index.html", `<img alt="c" src="/uploads/c.webp" width="auto" height="10">`);
    const { errors } = checkOut(out, { contentDir: mkdir() });
    expect(errors).toEqual([
      'news/index.html: <img src="/uploads/c.webp"> has no numeric width',
      'people/index.html: <img src="/uploads/b.webp"> has no numeric height',
    ]);
  });

  it("out: a lean site passes", () => {
    const out = mkdir();
    write(out, "_next/static/chunks/f.js", scriptOfGz(10 * KB));
    write(out, "_next/static/media/a.woff2", Buffer.alloc(50 * KB));
    write(
      out,
      "index.html",
      page(
        ["/_next/static/chunks/f.js"],
        `<link rel="preload" href="/_next/static/media/a.woff2" as="font"/>`,
      ),
    );
    expect(checkOut(out, { contentDir: mkdir() }).errors).toEqual([]);
  });
});
