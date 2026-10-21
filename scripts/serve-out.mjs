#!/usr/bin/env node
/**
 * Static server for the exported site in out/ that behaves like GitHub Pages
 * (brief §D2, §F5; WP8). Used by `npm run serve:out` / `npm start`, by CI
 * (e2e, a11y, links jobs) and by the Windows export check (DECISIONS D-07).
 *
 *   node scripts/serve-out.mjs [--dir out] [--port 4173] [--host 127.0.0.1] [--log]
 *   PORT=4173 npm run serve:out
 *
 * Rules (GitHub Pages behaviour, trailingSlash: true):
 *   /a/b/      → out/a/b/index.html
 *   /a/b       → 301 to /a/b/ when out/a/b/index.html exists (query kept),
 *                else out/a/b.html when it exists, else 404
 *   /file.ext  → the file, with a content type from its extension
 *                (.txt as text/plain: the App Router's static-export payloads)
 *   anything else → status 404 with out/404.html as the body
 *   text, JSON, XML and SVG bodies are gzip-compressed when the client accepts it
 * NEXT_PUBLIC_BASE_PATH (or --base-path) is stripped from request paths; a
 * request outside it is a 404, and "/" redirects to the base path.
 * Paths are decoded and confined to the served folder (no traversal).
 * --log prints every request; 404s are always printed (they are what the D-07
 * check looks for).
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

/** Content types GitHub Pages serves gzip-compressed (text, JSON, XML, SVG). */
const COMPRESSIBLE = /^(text\/|application\/(json|xml|manifest\+json)|image\/svg\+xml)/;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".sha256": "text/plain; charset=utf-8",
};

const isFile = (p) => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};

/**
 * Resolve a request path to a response plan (pure apart from fs.stat; unit-tested).
 * @param {string} dir absolute folder being served
 * @param {string} urlPath the request's pathname (still percent-encoded)
 * @param {{ basePath?: string }} [opts]
 * @returns {{ status: 200|301|404, file?: string, location?: string }}
 */
export function resolveRequest(dir, urlPath, { basePath = "" } = {}) {
  const base = basePath.replace(/\/+$/, "");
  let p;
  try {
    p = decodeURIComponent(urlPath);
  } catch {
    return { status: 404 };
  }
  if (p.includes("\0")) return { status: 404 };
  if (base) {
    if (p === "/" || p === "" || p === base) return { status: 301, location: `${base}/` };
    if (!p.startsWith(`${base}/`)) return { status: 404 };
    p = p.slice(base.length);
  }
  const abs = path.resolve(dir, `.${p.startsWith("/") ? p : `/${p}`}`);
  if (abs !== dir && !abs.startsWith(dir + path.sep)) return { status: 404 };

  if (p.endsWith("/")) {
    const index = path.join(abs, "index.html");
    return isFile(index) ? { status: 200, file: index } : { status: 404 };
  }
  if (isFile(abs)) return { status: 200, file: abs };
  if (isFile(path.join(abs, "index.html"))) {
    return { status: 301, location: `${base}${p}/` };
  }
  if (isFile(`${abs}.html`)) return { status: 200, file: `${abs}.html` };
  return { status: 404 };
}

/**
 * @param {{ dir?: string, basePath?: string, log?: boolean, logger?: Pick<Console, "log"> }} [opts]
 */
export function createServer({
  dir = path.join(ROOT, "out"),
  basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  log = false,
  logger = console,
} = {}) {
  const root = path.resolve(dir);
  const notFound = path.join(root, "404.html");
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const method = req.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    const plan = resolveRequest(root, url.pathname, { basePath });
    if (log || plan.status === 404) logger.log(`${plan.status} ${method} ${url.pathname}`);
    if (plan.status === 301) {
      res.writeHead(301, { Location: `${plan.location}${url.search}` }).end();
      return;
    }
    const file = plan.status === 200 ? plan.file : isFile(notFound) ? notFound : undefined;
    const headers = {
      "Content-Type": file
        ? (MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream")
        : "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    };
    if (!file) {
      res.writeHead(plan.status, headers).end(method === "HEAD" ? undefined : "Not found\n");
      return;
    }
    // GitHub Pages gzips text responses; do the same so local Lighthouse/transfer
    // numbers match production (uncompressed HTML/CSS/JS cost ~25 Performance points).
    const gzip =
      COMPRESSIBLE.test(headers["Content-Type"]) &&
      /\bgzip\b/.test(String(req.headers["accept-encoding"] ?? ""));
    if (gzip) {
      const body = zlib.gzipSync(fs.readFileSync(file));
      res.writeHead(plan.status, {
        ...headers,
        "Content-Encoding": "gzip",
        Vary: "Accept-Encoding",
        "Content-Length": body.length,
      });
      res.end(method === "HEAD" ? undefined : body);
      return;
    }
    const size = fs.statSync(file).size;
    res.writeHead(plan.status, { ...headers, "Content-Length": size });
    if (method === "HEAD") res.end();
    else fs.createReadStream(file).pipe(res);
  });
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1]
    : fallback;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(arg("--dir", path.join(ROOT, "out")));
  const port = Number(arg("--port", process.env.PORT ?? "4173"));
  const host = arg("--host", "127.0.0.1");
  const basePath = arg("--base-path", process.env.NEXT_PUBLIC_BASE_PATH ?? "");
  if (!fs.existsSync(path.join(dir, "index.html"))) {
    console.error(`[serve-out] ${path.relative(process.cwd(), dir) || dir}/index.html not found.`);
    console.error("[serve-out] Run `npm run build` first (it writes out/).");
    process.exit(1);
  }
  const server = createServer({ dir, basePath, log: process.argv.includes("--log") });
  server.listen(port, host, () => {
    const shown = host === "0.0.0.0" || host === "127.0.0.1" ? "localhost" : host;
    console.log(`[serve-out] ${dir} at http://${shown}:${port}${basePath || ""}/`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
