/** D-05 redirect stubs (scripts/content/write-redirects.mjs). */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stubHtml, targetUrl, writeRedirects } from "../../../scripts/content/write-redirects.mjs";

describe("redirect stubs", () => {
  it("builds base-path-aware targets and a canonical URL", () => {
    expect(
      targetUrl("/research/new/", { basePath: "/site", siteUrl: "https://x.example/" }),
    ).toEqual({ href: "/site/research/new/", canonical: "https://x.example/site/research/new/" });
    expect(targetUrl("https://doi.org/10.1/x").href).toBe("https://doi.org/10.1/x");
  });

  it("escapes the target and includes refresh, canonical and noindex", () => {
    const html = stubHtml('/a/"b/', {});
    expect(html).toContain('http-equiv="refresh"');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('content="noindex"');
    expect(html).not.toContain('"b/"');
  });

  it("writes stubs into out/ and never overwrites an exported page", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bl-redir-"));
    const out = path.join(tmp, "out");
    const content = path.join(tmp, "content");
    fs.mkdirSync(path.join(out, "research", "live"), { recursive: true });
    fs.writeFileSync(path.join(out, "research", "live", "index.html"), "LIVE");
    fs.mkdirSync(content);
    fs.writeFileSync(
      path.join(content, "site.yml"),
      [
        "redirects:",
        "  - from: /research/old/",
        "    to: /research/new/",
        "  - from: /research/live/",
        "    to: /research/new/",
      ].join("\n"),
    );
    const quiet = { log: () => {}, warn: () => {} } as unknown as Console;
    const r = writeRedirects({ outDir: out, contentDir: content, basePath: "", log: quiet });
    expect(r).toEqual({ written: 1, skipped: 1 });
    expect(fs.readFileSync(path.join(out, "research", "old", "index.html"), "utf8")).toContain(
      "url=/research/new/",
    );
    expect(fs.readFileSync(path.join(out, "research", "live", "index.html"), "utf8")).toBe("LIVE");
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
