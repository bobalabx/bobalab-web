#!/usr/bin/env node
/**
 * Local no-account CMS demo (`npm run cms:local`; brief §F4 "Local no-account demo").
 *
 *   npm run cms:local               generate the local config, start decap-server (port 8081)
 *                                   and `next dev` (port 3100), print the editor URL
 *   npm run cms:local -- --no-next  only decap-server; use a dev server that is already running
 *
 * Then open http://localhost:3100/admin/local.html and click "Login": no GitHub
 * account is needed. The CMS writes straight into content/ and public/uploads/
 * on this machine (Decap's proxy runs in simple mode: no drafts board, every
 * "Publish" writes the file). The site at http://localhost:3100 picks the
 * change up on reload. Review and commit with git as usual.
 *
 * Ctrl+C stops both servers and removes the generated local files
 * (public/admin/config.local.yml and local.html, both git-ignored).
 * If port 3100 already answers (a dev server is running), next dev is not
 * started a second time (DECISIONS D-01: never two next dev in this tree).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generate, LOCAL_FILES, ROOT } from "./build-config.mjs";

const args = process.argv.slice(2);
const noNext = args.includes("--no-next");
const PROXY_PORT = Number(process.env.CMS_PROXY_PORT || 8081);
const SITE_PORT = Number(process.env.CMS_SITE_PORT || 3100);

function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: "127.0.0.1" });
    s.once("connect", () => {
      s.end();
      resolve(true);
    });
    s.once("error", () => resolve(false));
  });
}

const children = [];
function start(name, file, fileArgs, env = {}) {
  const child = spawn(process.execPath, [file, ...fileArgs], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "inherit", "inherit"],
  });
  child.on("exit", (code) => {
    console.log(`[cms:local] ${name} exited (${code ?? "signal"})`);
    shutdown(code ?? 0);
  });
  children.push(child);
  return child;
}

let stopping = false;
function cleanLocalFiles() {
  for (const rel of LOCAL_FILES) fs.rmSync(path.join(ROOT, rel), { force: true });
}
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) if (c.exitCode === null) c.kill();
  cleanLocalFiles();
  console.log("[cms:local] stopped; removed the local config files");
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  if (await portOpen(PROXY_PORT)) {
    console.error(`[cms:local] port ${PROXY_PORT} is in use; is decap-server already running?`);
    process.exit(1);
  }
  const files = await generate({ local: true, localSiteUrl: `http://localhost:${SITE_PORT}` });
  for (const rel of LOCAL_FILES) {
    const abs = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, files[rel]);
  }
  console.log(`[cms:local] wrote ${LOCAL_FILES.join(", ")}`);

  start("decap-server", path.join(ROOT, "node_modules", "decap-server", "dist", "index.js"), [], {
    PORT: String(PROXY_PORT),
    MODE: "fs",
    GIT_REPO_DIRECTORY: ROOT,
  });

  if (noNext) {
    console.log(`[cms:local] --no-next: using the dev server at http://localhost:${SITE_PORT}`);
  } else if (await portOpen(SITE_PORT)) {
    console.log(
      `[cms:local] a server already answers on ${SITE_PORT}; not starting next dev again`,
    );
  } else {
    start("next dev", path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), [
      "dev",
      "--port",
      String(SITE_PORT),
    ]);
  }
  console.log(
    `\n[cms:local] Editor: http://localhost:${SITE_PORT}/admin/local.html  (Ctrl+C to stop)\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`[cms:local] ${e.message}`);
    shutdown(1);
  });
}
