#!/usr/bin/env node
/**
 * Vendor the Decap CMS browser bundle (brief §F1, §G4, §I WP6 #1).
 *
 *   node scripts/cms/vendor-decap.mjs            download decap-cms@<version> with `npm pack`
 *                                                (no install, no lifecycle scripts) into a temp
 *                                                folder, verify the tarball against the registry's
 *                                                integrity, copy dist/decap-cms.js (+ its LICENSE
 *                                                file) into public/admin/, record SHA-256
 *   node scripts/cms/vendor-decap.mjs --check    re-download and verify the vendored files match
 *                                                the tarball byte for byte (writes nothing)
 *   node scripts/cms/vendor-decap.mjs --version 3.17.2   bump (then run the unit tests)
 *
 * The pinned version lives in cms/decap-cms.lock.json. Only dist/decap-cms.js is
 * vendored: its lazy chunks (CodeMirror language modes for the `code` widget, a
 * WebP encoder for `media_processing`) belong to features this site's config does
 * not use (cms/README.md).
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readTgzFile } from "./lib/tar.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ADMIN = path.join(ROOT, "public", "admin");
const LOCK = path.join(ROOT, "cms", "decap-cms.lock.json");
const PKG = "decap-cms";
const FILE = "dist/decap-cms.js";
const LICENSE = "dist/decap-cms.js.LICENSE.txt";

const args = process.argv.slice(2);
const check = args.includes("--check");
const vIdx = args.indexOf("--version");
const lock = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, "utf8")) : null;
const version = vIdx >= 0 ? args[vIdx + 1] : (lock?.version ?? "3.17.1");
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  console.error(`[vendor-decap] invalid version: ${version}`);
  process.exit(1);
}

const sha = (alg, buf, enc = "hex") => crypto.createHash(alg).update(buf).digest(enc);

/** npm's JS entry point, so npm runs under this node without a shell. */
function npmCli() {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(
      path.dirname(process.execPath),
      "..",
      "lib",
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
  ];
  return candidates.find((c) => c && c.endsWith(".js") && fs.existsSync(c)) ?? null;
}

/** Run npm with fixed arguments (the only variable part, the version, is validated above). */
function npm(npmArgs, cwd) {
  const cli = npmCli();
  const r = cli
    ? spawnSync(process.execPath, [cli, ...npmArgs], { cwd, encoding: "utf8" })
    : spawnSync(["npm", ...npmArgs].map((a) => JSON.stringify(a)).join(" "), {
        cwd,
        encoding: "utf8",
        shell: true,
      });
  if (r.status !== 0) {
    throw new Error(`npm ${npmArgs.join(" ")} failed (${r.status}): ${r.stderr || r.stdout}`);
  }
  return r.stdout;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bobalab-decap-pack-"));
try {
  console.log(`[vendor-decap] npm pack ${PKG}@${version} → ${tmp}`);
  const packed = JSON.parse(
    npm(
      ["pack", `${PKG}@${version}`, "--json", "--ignore-scripts", "--pack-destination", tmp],
      tmp,
    ),
  )[0];
  const tgzPath = path.join(tmp, packed.filename);
  const tgz = fs.readFileSync(tgzPath);

  // 1. Tarball integrity: our own sha512 == npm pack's == the registry's dist.integrity.
  const integrity = `sha512-${sha("sha512", tgz, "base64")}`;
  const registry = JSON.parse(npm(["view", `${PKG}@${version}`, "dist", "--json"], tmp));
  if (integrity !== packed.integrity || integrity !== registry.integrity) {
    throw new Error(
      `tarball integrity mismatch: computed ${integrity}, npm pack ${packed.integrity}, registry ${registry.integrity}`,
    );
  }
  if (sha("sha1", tgz) !== registry.shasum) throw new Error("tarball sha1 mismatch");

  // 2. The files we vendor, straight from the verified tarball.
  const pkgJson = JSON.parse(readTgzFile(tgz, "package/package.json")?.toString("utf8") ?? "{}");
  if (pkgJson.name !== PKG || pkgJson.version !== version) {
    throw new Error(`tarball package.json is ${pkgJson.name}@${pkgJson.version}`);
  }
  const bundle = readTgzFile(tgz, `package/${FILE}`);
  const license = readTgzFile(tgz, `package/${LICENSE}`);
  if (!bundle) throw new Error(`${FILE} not found in the tarball`);
  const bundleSha = sha("sha256", bundle);
  const licenseSha = license ? sha("sha256", license) : null;
  console.log(`[vendor-decap] tarball ${integrity}`);
  console.log(`[vendor-decap] ${FILE} sha256 ${bundleSha} (${bundle.length} bytes)`);

  if (check) {
    const vendored = path.join(ADMIN, "decap-cms.js");
    const problems = [];
    if (!fs.existsSync(vendored)) problems.push("public/admin/decap-cms.js is missing");
    else if (sha("sha256", fs.readFileSync(vendored)) !== bundleSha)
      problems.push("public/admin/decap-cms.js differs from the tarball");
    const recorded = fs.existsSync(`${vendored}.sha256`)
      ? fs.readFileSync(`${vendored}.sha256`, "utf8").split(/\s+/)[0]
      : null;
    if (recorded !== bundleSha) problems.push("decap-cms.js.sha256 does not match the tarball");
    if (lock && lock.sha256 !== bundleSha) problems.push("cms/decap-cms.lock.json sha256 differs");
    if (lock && lock.integrity !== integrity)
      problems.push("cms/decap-cms.lock.json integrity differs");
    if (problems.length) {
      console.error(`[vendor-decap] CHECK FAILED:\n  - ${problems.join("\n  - ")}`);
      process.exitCode = 1;
    } else {
      console.log(`[vendor-decap] CHECK OK: vendored bundle == ${PKG}@${version} tarball ${FILE}`);
    }
  } else {
    fs.mkdirSync(ADMIN, { recursive: true });
    fs.writeFileSync(path.join(ADMIN, "decap-cms.js"), bundle);
    fs.writeFileSync(path.join(ADMIN, "decap-cms.js.sha256"), `${bundleSha}  decap-cms.js\n`);
    if (license) fs.writeFileSync(path.join(ADMIN, "decap-cms.js.LICENSE.txt"), license);
    const record = {
      package: PKG,
      version,
      tarball: registry.tarball,
      integrity,
      shasum: registry.shasum,
      file: FILE,
      sha256: bundleSha,
      bytes: bundle.length,
      license_file: license ? LICENSE : null,
      license_sha256: licenseSha,
      verified_on: new Date().toISOString().slice(0, 10),
      method:
        "npm pack --ignore-scripts into a temp folder (no install); tarball sha512 checked against npm pack and `npm view dist.integrity`; file extracted in memory",
    };
    fs.mkdirSync(path.dirname(LOCK), { recursive: true });
    fs.writeFileSync(LOCK, `${JSON.stringify(record, null, 2)}\n`);
    console.log(
      `[vendor-decap] wrote public/admin/decap-cms.js (+ .sha256, LICENSE) and cms/decap-cms.lock.json`,
    );
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
