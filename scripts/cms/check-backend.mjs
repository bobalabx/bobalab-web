#!/usr/bin/env node
/**
 * Is the CMS sign-in configured? (verification finding CMS-05)
 *
 *   node scripts/cms/check-backend.mjs [config.yml] [--site content/site.yml]
 *
 * Reads a Decap config (default public/admin/config.yml; in a deploy job the
 * exported out/admin/config.yml) and the site settings. While the backend still
 * contains a REPLACE-ME placeholder (cms/source.mjs, docs/SETUP-PRODUCTION.md §5),
 * /admin/ shows a "Login with GitHub" button that cannot work:
 *  - before launch (site.yml `launched: false`) that is a warning (exit 0), so
 *    the site can be previewed before the OAuth bridge exists;
 *  - after launch it is an error (exit 1), so a deploy cannot ship a dead login.
 * In GitHub Actions the message is also printed as a ::warning:: / ::error:: annotation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PLACEHOLDER = /REPLACE-ME/i;

/**
 * Problems with the production backend of a Decap config object.
 * @param {Record<string, any>} config
 * @returns {string[]}
 */
export function backendProblems(config) {
  const out = [];
  const b = (config && config.backend) || {};
  if (b.name !== "github") out.push(`backend.name is ${JSON.stringify(b.name)}, expected "github"`);
  for (const key of ["repo", "base_url"]) {
    const v = b[key];
    if (typeof v !== "string" || !v) out.push(`backend.${key} is missing`);
    else if (PLACEHOLDER.test(v)) out.push(`backend.${key} still has the placeholder: ${v}`);
  }
  if (typeof b.base_url === "string" && !PLACEHOLDER.test(b.base_url)) {
    let u;
    try {
      u = new URL(b.base_url);
    } catch {
      out.push(`backend.base_url is not a URL: ${b.base_url}`);
    }
    if (u && (u.protocol !== "https:" || u.pathname.replace(/\/$/, "") !== "" || u.search))
      out.push(`backend.base_url must be an https origin without a path: ${b.base_url}`);
  }
  if (config && config.local_backend) out.push("local_backend is set in a production config");
  return out;
}

/** "error" after launch, "warning" before; null when the backend is configured. */
export function verdict(config, { launched }) {
  const problems = backendProblems(config);
  if (!problems.length) return null;
  return { level: launched ? "error" : "warning", problems };
}

function main() {
  const args = process.argv.slice(2);
  const siteIdx = args.indexOf("--site");
  const sitePath = path.resolve(ROOT, siteIdx >= 0 ? args[siteIdx + 1] : "content/site.yml");
  const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--site");
  const configPath = path.resolve(ROOT, file ?? "public/admin/config.yml");
  const config = parse(fs.readFileSync(configPath, "utf8"));
  const site = fs.existsSync(sitePath) ? parse(fs.readFileSync(sitePath, "utf8")) : {};
  const launched = Boolean(site && site.launched);
  const v = verdict(config, { launched });
  const rel = path.relative(ROOT, configPath).replace(/\\/g, "/");
  if (!v) {
    console.log(`[cms] ${rel}: the CMS backend is configured`);
    return;
  }
  const msg =
    `${rel}: the CMS sign-in cannot work yet (${v.problems.join("; ")}). ` +
    "Fill in cms/source.mjs (docs/SETUP-PRODUCTION.md §5) and run `npm run cms:config`." +
    (launched ? "" : " Allowed while site.yml has launched: false.");
  if (process.env.GITHUB_ACTIONS) console.log(`::${v.level} file=${rel}::${msg}`);
  console[v.level === "error" ? "error" : "warn"](`[cms] ${v.level}: ${msg}`);
  if (v.level === "error") process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (e) {
    console.error(`[cms] ${e.message}`);
    process.exit(1);
  }
}
