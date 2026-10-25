/**
 * Production CMS configuration, the admin page and the vendored bundle
 * (brief §I WP6 #1, #3, #5; §F2–F4; §G4; DECISIONS D-03…D-06).
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { SWATCH_IDS } from "@/lib/content/palette";
import { backendProblems, verdict } from "../../../scripts/cms/check-backend.mjs";
import { URL_OR_PATH_RE } from "../../../scripts/cms/lib/decap-config.mjs";
import { ROOT } from "./helpers";

type Cfg = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const admin = (f: string) => path.join(ROOT, "public", "admin", f);
const config: Cfg = parse(fs.readFileSync(admin("config.yml"), "utf8"));
const html = fs.readFileSync(admin("index.html"), "utf8");
const collection = (name: string) => (config.collections as Cfg[]).find((c) => c.name === name)!;
const field = (fields: Cfg[], name: string) => fields.find((f) => f.name === name)!;
const siteFields = () =>
  collection("settings").files.find((f: Cfg) => f.name === "site").fields as Cfg[];

describe("production config.yml", () => {
  it("uses the GitHub backend with the editorial workflow and the verified settings", () => {
    expect(config.backend.name).toBe("github");
    expect(config.publish_mode).toBe("editorial_workflow");
    expect(config.backend.auth_scope).toBe("public_repo");
    expect(config.backend.squash_merges).toBe(true);
    expect(config.backend.branch).toBe("main");
    // An https origin: the REPLACE-ME placeholder until the lab deploys its OAuth
    // Worker (R4 §8 C, docs/SETUP-PRODUCTION.md §5), then the Worker's own origin.
    // scripts/cms/check-backend.mjs fails a launched site that still has the placeholder.
    const origin = new URL(config.backend.base_url);
    expect(origin.protocol).toBe("https:");
    expect(origin.pathname).toBe("/");
    expect(origin.hostname).toMatch(/^[a-z0-9.-]+$/i);
    expect(config.local_backend).toBeUndefined();
  });

  it("stores media in public/uploads, served from /uploads", () => {
    expect(config.media_folder).toBe("public/uploads");
    expect(config.public_folder).toBe("/uploads");
  });

  it("uses richtext for every Markdown body and never offers deletion (archive instead)", () => {
    for (const c of config.collections as Cfg[]) {
      expect(c.delete).toBe(false);
      if (c.folder) expect(field(c.fields, "body").widget).toBe("richtext");
    }
    for (const page of ["about", "accessibility", "privacy"]) {
      const f = collection("pages").files.find((x: Cfg) => x.name === page);
      expect(field(f.fields, "body").widget).toBe("richtext");
    }
  });

  it("covers every collection with the right folder and slug scheme (D-05)", () => {
    expect((config.collections as Cfg[]).map((c) => c.name).sort()).toEqual(
      [
        "directions",
        "news",
        "opportunities",
        "pages",
        "people",
        "projects",
        "publications",
        "settings",
      ].sort(),
    );
    expect(collection("news").slug).toMatch(/^\{\{fields\.date \| date\('YYYY-MM-DD'\)\}\}-/);
    expect(collection("people").identifier_field).toBe("name");
    expect(collection("directions").slug).toBe("{{fields.short_label}}");
  });

  it("directions: status includes archived, colour is a select of the 8 swatches, findings exist", () => {
    const d = collection("directions").fields as Cfg[];
    expect(field(d, "status").options.map((o: Cfg) => o.value)).toContain("archived");
    expect(field(d, "color").options.map((o: Cfg) => o.value)).toEqual([...SWATCH_IDS]);
    const findings = field(d, "findings");
    expect(findings.widget).toBe("list");
    expect(findings.fields.map((f: Cfg) => f.name)).toEqual(["text", "publication", "evidence"]);
  });

  it("site.yml: direction_order is a reorderable list of direction relations; launched, redirects, figure_mode", () => {
    const f = siteFields();
    const order = field(f, "direction_order");
    expect(order.widget).toBe("list");
    expect(order.allow_reorder).not.toBe(false);
    expect(order.field.widget).toBe("relation");
    expect(order.field.collection).toBe("directions");
    expect(order.field.filters).toEqual([{ field: "status", values: ["active", "emerging"] }]);
    expect(field(f, "launched").widget).toBe("boolean");
    expect(field(f, "redirects").fields.map((x: Cfg) => x.name)).toEqual(["from", "to"]);
    // Retired by D-13 (one Fig. 1 layout); kept in the schema, hidden from editors.
    expect(field(f, "figure_mode").widget).toBe("hidden");
    expect(field(f, "figure_mode").options).toBeUndefined();
  });

  it("publications: authors {name, person relation, url}; PDF and slides are file widgets with Insert-from-URL", () => {
    const p = collection("publications").fields as Cfg[];
    const authors = field(p, "authors");
    expect(authors.fields.map((f: Cfg) => f.name)).toEqual(["name", "person", "url"]);
    expect(field(authors.fields, "person").widget).toBe("relation");
    expect(field(authors.fields, "person").collection).toBe("people");
    const links = field(p, "links").fields as Cfg[];
    for (const k of ["pdf", "slides"]) {
      expect(field(links, k).widget).toBe("file");
      expect(field(links, k).choose_url).toBe(true);
      expect(field(links, k).media_library.config.max_file_size).toBe(10 * 1024 * 1024);
    }
    expect(field(p, "as_of")).toBeTruthy();
    expect(field(p, "status_source").options.map((o: Cfg) => o.value)).toEqual([
      "documented",
      "self-reported",
    ]);
  });

  it("people: consent flags are booleans defaulting to off; relations only offer listed people (D-06)", () => {
    const p = collection("people").fields as Cfg[];
    for (const k of ["photo_consent", "email_public", "now_at_public", "listed"]) {
      expect(field(p, k).widget).toBe("boolean");
      expect(field(p, k).default).toBe(false);
    }
    const team = field(collection("projects").fields, "team");
    expect(team.filters).toEqual([{ field: "listed", values: [true] }]);
    // Images are uploaded (the site CSP allows only same-origin images), ≤ 2 MB.
    expect(field(p, "photo").widget).toBe("image");
    expect(field(p, "photo").choose_url).toBe(false);
    expect(field(p, "photo").media_library.config.max_file_size).toBe(2 * 1024 * 1024);
  });

  it("news and opportunities collections exist with the D-05 fields", () => {
    expect(collection("news").fields.map((f: Cfg) => f.name)).toContain("event_date");
    const o = collection("opportunities").fields as Cfg[];
    expect(field(o, "status").options.map((x: Cfg) => x.value)).toEqual([
      "open",
      "closed",
      "rolling",
      "unknown",
    ]);
    expect(field(o, "closes_on").widget).toBe("datetime");
  });
});

describe("URL fields (ENG-06: mirrors schema urlField)", () => {
  const re = new RegExp(URL_OR_PATH_RE);
  it("accepts https addresses and site paths", () => {
    for (const v of ["https://x.test/", "/uploads/a.pdf", "/"]) expect(re.test(v), v).toBe(true);
  });
  it("rejects protocol-relative //host and /\\host, which browsers send off-site", () => {
    for (const v of ["//evil.example/x", "/\\evil.example", "http://x.test/"])
      expect(re.test(v), v).toBe(false);
  });
});

describe("/admin/ page", () => {
  const csp = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)?.[1] ?? "";
  const directive = (name: string) =>
    csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith(`${name} `)) ?? "";

  it("is noindex", () => {
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
  });

  it("has a minimal CSP: scripts from self (+ 'unsafe-eval', measured as required), no inline scripts", () => {
    expect(directive("default-src")).toBe("default-src 'self'");
    expect(directive("script-src")).toBe("script-src 'self' 'unsafe-eval'");
    expect(directive("object-src")).toBe("object-src 'none'");
    expect(directive("base-uri")).toBe("base-uri 'self'");
    expect(directive("connect-src")).toContain("https://api.github.com");
    expect(directive("connect-src")).not.toMatch(/localhost|127\.0\.0\.1/);
    expect(directive("img-src")).toContain("https://avatars.githubusercontent.com");
    // Every script is an external same-origin file: no inline code to allow.
    const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(scripts.length).toBeGreaterThan(0);
    for (const [, attrs, body] of scripts) {
      expect(attrs).toMatch(/src="[a-z0-9-]+\.js"/);
      expect(body!.trim()).toBe("");
    }
  });

  it("registers hooks and previews before Decap starts (manual init), and loads the production config", () => {
    const order = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    expect(order).toEqual([
      "cms-data.js",
      "decap-cms.js",
      "cms-widgets.js",
      "cms-hooks.js",
      "cms-a11y.js",
      "preview-templates.js",
      "cms-start.js",
    ]);
    expect(fs.readFileSync(admin("cms-data.js"), "utf8")).toContain(
      "window.CMS_MANUAL_INIT = true;",
    );
    expect(html).toMatch(/<link rel="cms-config-url" type="text\/yaml" href="config.yml"/);
  });
});

describe("vendored Decap bundle", () => {
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, "cms", "decap-cms.lock.json"), "utf8"));
  const bundle = fs.readFileSync(admin("decap-cms.js"));
  const sha = crypto.createHash("sha256").update(bundle).digest("hex");

  it("is decap-cms 3.17.1 and its SHA-256 matches the recorded value (tarball-verified by vendor-decap.mjs)", () => {
    expect(lock.version).toBe("3.17.1");
    expect(lock.package).toBe("decap-cms");
    expect(fs.readFileSync(admin("decap-cms.js.sha256"), "utf8")).toBe(`${sha}  decap-cms.js\n`);
    expect(lock.sha256).toBe(sha);
    expect(lock.bytes).toBe(bundle.length);
    expect(lock.integrity).toMatch(/^sha512-/);
    expect(bundle.toString("utf8", bundle.length - 2000)).toContain(
      'console.log("decap-cms 3.17.1")',
    );
  });

  it("ships its third-party licence file unchanged", () => {
    const lic = fs.readFileSync(admin("decap-cms.js.LICENSE.txt"));
    expect(crypto.createHash("sha256").update(lic).digest("hex")).toBe(lock.license_sha256);
  });

  it.runIf(process.env.CMS_VENDOR_CHECK === "1")(
    "matches the npm tarball byte for byte (network; CMS_VENDOR_CHECK=1)",
    () => {
      const r = spawnSync(
        process.execPath,
        [path.join(ROOT, "scripts/cms/vendor-decap.mjs"), "--check"],
        {
          cwd: ROOT,
          encoding: "utf8",
        },
      );
      expect(r.stdout + r.stderr).toContain("CHECK OK");
      expect(r.status).toBe(0);
    },
    300_000,
  );
});

describe("generated admin files", () => {
  it("are up to date with cms/source.mjs, the schema and the site styles", () => {
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, "scripts/cms/build-config.mjs"), "--check"],
      {
        cwd: ROOT,
        encoding: "utf8",
      },
    );
    expect(r.stderr).not.toMatch(/out of date/);
    expect(r.status).toBe(0);
  }, 120_000);
});

describe("scripts/cms/check-backend.mjs (CMS-05: no dead login after launch)", () => {
  const prod = (base_url: string, extra: Cfg = {}) => ({
    backend: { name: "github", repo: "lab/site", base_url },
    ...extra,
  });

  it("accepts a configured Worker origin or a custom host", () => {
    expect(backendProblems(prod("https://bobalab-cms-auth.lab.workers.dev"))).toEqual([]);
    expect(backendProblems(prod("https://cms-auth.example.edu"))).toEqual([]);
  });

  it("flags the placeholder: a warning before launch, an error after", () => {
    const placeholder = prod("https://bobalab-cms-auth.REPLACE-ME.workers.dev");
    expect(backendProblems(placeholder)).toEqual([
      "backend.base_url still has the placeholder: https://bobalab-cms-auth.REPLACE-ME.workers.dev",
    ]);
    expect(verdict(placeholder, { launched: false })?.level).toBe("warning");
    expect(verdict(placeholder, { launched: true })?.level).toBe("error");
    expect(verdict(prod("https://a.workers.dev"), { launched: true })).toBeNull();
  });

  it("rejects http, paths and a local backend in a production config", () => {
    expect(backendProblems(prod("http://a.workers.dev")).join()).toMatch(/https origin/);
    expect(backendProblems(prod("https://a.workers.dev/auth")).join()).toMatch(/https origin/);
    expect(backendProblems(prod("https://a.workers.dev", { local_backend: true })).join()).toMatch(
      /local_backend/,
    );
  });

  it("agrees with the committed config.yml (placeholder or not)", () => {
    const placeholder = /REPLACE-ME/.test(config.backend.base_url);
    expect(backendProblems(config).length > 0).toBe(placeholder);
  });

  it("exits 1 for a launched site that still has the placeholder, 0 before launch", () => {
    const tmp = fs.mkdtempSync(path.join(ROOT, "test-results", "cms-backend-"));
    try {
      const site = path.join(tmp, "site.yml");
      const run = () =>
        spawnSync(
          process.execPath,
          [path.join(ROOT, "scripts/cms/check-backend.mjs"), admin("config.yml"), "--site", site],
          { cwd: ROOT, encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "" } },
        );
      if (!/REPLACE-ME/.test(config.backend.base_url)) return; // configured: nothing to show
      fs.writeFileSync(site, "launched: false\n");
      expect(run().status).toBe(0);
      fs.writeFileSync(site, "launched: true\n");
      const r = run();
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/sign-in cannot work yet/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
