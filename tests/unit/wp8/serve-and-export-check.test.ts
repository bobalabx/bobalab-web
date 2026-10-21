/**
 * WP8: scripts/serve-out.mjs (GitHub Pages behaviour) and
 * scripts/perf/export-check.mjs (production export contract) on fixtures.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createServer, resolveRequest } from "../../../scripts/serve-out.mjs";
import { checkExport, hiddenSlugs } from "../../../scripts/perf/export-check.mjs";

const tmp: string[] = [];
afterEach(() => {
  for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});
function mkdir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "wp8-serve-"));
  tmp.push(d);
  return d;
}
function write(root: string, rel: string, body = rel) {
  const f = path.join(root, ...rel.split("/"));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body);
}

describe("serve-out resolveRequest", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "wp8-serve-static-"));
  afterAll(() => fs.rmSync(out, { recursive: true, force: true }));
  write(out, "index.html");
  write(out, "404.html", "not found page");
  write(out, "research/index.html");
  write(out, "research/__next._tree.txt");
  write(out, "about.html");
  write(out, "sitemap.xml");

  it.each([
    ["/", 200, "index.html"],
    ["/research/", 200, "research/index.html"],
    ["/research/__next._tree.txt", 200, "research/__next._tree.txt"],
    ["/sitemap.xml", 200, "sitemap.xml"],
    ["/about", 200, "about.html"],
    ["/research/missing/", 404, undefined],
    ["/missing", 404, undefined],
    ["/%2e%2e/%2e%2e/etc/passwd", 404, undefined],
    ["/..%5c..%5cwindows", 404, undefined],
  ])("%s → %i", (url, status, file) => {
    const r = resolveRequest(out, url);
    expect(r.status).toBe(status);
    if (file) expect(path.relative(out, r.file!).split(path.sep).join("/")).toBe(file);
  });

  it("redirects a directory without its trailing slash", () => {
    expect(resolveRequest(out, "/research")).toEqual({ status: 301, location: "/research/" });
  });

  it("strips a base path and rejects requests outside it", () => {
    expect(resolveRequest(out, "/website/research/", { basePath: "/website" }).status).toBe(200);
    expect(resolveRequest(out, "/research/", { basePath: "/website" }).status).toBe(404);
    expect(resolveRequest(out, "/", { basePath: "/website" })).toEqual({
      status: 301,
      location: "/website/",
    });
    expect(resolveRequest(out, "/website", { basePath: "/website" })).toEqual({
      status: 301,
      location: "/website/",
    });
  });
});

describe("serve-out HTTP", () => {
  let base = "";
  let server: ReturnType<typeof createServer>;
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "wp8-serve-http-"));
  write(out, "index.html", "<h1>home</h1>");
  write(out, "404.html", "<h1>404 page</h1>");
  write(out, "x/index.txt", "rsc");
  beforeAll(async () => {
    server = createServer({ dir: out, logger: { log: () => {} } });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise((r) => server.close(r));
    fs.rmSync(out, { recursive: true, force: true });
  });

  it("serves 404.html with status 404, .txt as text/plain, and keeps the query on redirects", async () => {
    const nf = await fetch(`${base}/nope/`);
    expect(nf.status).toBe(404);
    expect(await nf.text()).toContain("404 page");
    const txt = await fetch(`${base}/x/index.txt`);
    expect(txt.headers.get("content-type")).toMatch(/^text\/plain/);
    const red = await fetch(`${base}/x?direction=a`, { redirect: "manual" });
    expect(red.status).toBe(404); // x/ has no index.html
    write(out, "x/index.html", "x");
    const red2 = await fetch(`${base}/x?direction=a`, { redirect: "manual" });
    expect(red2.status).toBe(301);
    expect(red2.headers.get("location")).toBe("/x/?direction=a");
    const post = await fetch(`${base}/`, { method: "POST" });
    expect(post.status).toBe(405);
  });
});

describe("export-check", () => {
  function contentFixture() {
    const c = mkdir();
    write(c, "directions/live-one.md", "---\ntitle: Live\ndraft: false\n---\n");
    write(c, "directions/secret-direction.md", "---\ntitle: Secret\ndraft: true\n---\n");
    write(c, "people/avery-pi.md", "---\nname: A\nrole: pi\nlisted: true\n---\n");
    write(c, "people/hidden-person.md", "---\nname: H\nrole: phd\nlisted: false\n---\n");
    write(c, "people/listed-noprofile.md", "---\nname: L\nrole: phd\nlisted: true\n---\n");
    write(c, "news/2026-01-01-draft-news.md", "---\ntitle: D\ndraft: true\n---\n");
    return c;
  }
  function goodOut() {
    const o = mkdir();
    for (const f of [
      "index.html",
      "404.html",
      "admin/index.html",
      "research/live-one/index.html",
    ]) {
      write(o, f, `<a href="/research/live-one/">x</a><a href="/people/avery-pi/">pi</a>`);
    }
    write(o, "people/avery-pi/index.html", "pi");
    write(o, "research/_none/index.html", "placeholder");
    write(
      o,
      "sitemap.xml",
      "<urlset><url><loc>https://x.test/</loc></url><url><loc>https://x.test/research/live-one/</loc></url></urlset>",
    );
    write(
      o,
      "robots.txt",
      "User-Agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: https://x.test/sitemap.xml\n",
    );
    return o;
  }

  it("lists non-public slugs from front matter", () => {
    const h = hiddenSlugs(contentFixture());
    expect(h.directions).toEqual(["secret-direction"]);
    expect([...(h.people ?? [])].sort()).toEqual(["hidden-person", "listed-noprofile"]);
    expect(h.news).toEqual(["2026-01-01-draft-news"]);
  });

  it("passes a clean production export", () => {
    expect(checkExport(goodOut(), { contentDir: contentFixture() }).errors).toEqual([]);
  });

  it("fails on draft pages, links to unlisted people, bad sitemap/robots and Windows folders", () => {
    const o = goodOut();
    write(o, "research/secret-direction/index.html", "draft page");
    write(o, "news/index.html", `<a href="/people/hidden-person/">h</a>`);
    write(
      o,
      "sitemap.xml",
      "<urlset><url><loc>https://x.test/research/_none/</loc></url><url><loc>https://x.test/kit/</loc></url></urlset>",
    );
    write(o, "robots.txt", "User-Agent: *\nAllow: /\n");
    write(o, "kit/__next.kit/__PAGE__.txt", "seg");
    fs.rmSync(path.join(o, "admin"), { recursive: true });
    const errors = checkExport(o, { contentDir: contentFixture() }).errors.join("\n");
    expect(errors).toContain("missing out/admin/index.html");
    expect(errors).toContain(
      "directions/secret-direction is not public but out/research/secret-direction/index.html exists",
    );
    expect(errors).toContain(
      "people/hidden-person is not public but out/news/index.html links to it",
    );
    expect(errors).toContain("sitemap lists https://x.test/research/_none/");
    expect(errors).toContain("sitemap lists https://x.test/kit/");
    expect(errors).toContain("robots.txt does not disallow /admin/");
    expect(errors).toContain("Windows-style segment folder out/kit/__next.kit/");
  });

  it("fails when a hidden URL leaks into an RSC payload, the feed or JSON-LD; ignores other origins", () => {
    const o = goodOut();
    // RSC payload the client router fetches for a public page.
    write(
      o,
      "research/live-one/__next.research.$d$direction.__PAGE__.txt",
      `1:["$","a",null,{"href":"/research/secret-direction/"}]`,
    );
    // RSS feed with an absolute URL on the site's own origin (taken from the sitemap).
    write(
      o,
      "news/feed.xml",
      "<rss><item><link>https://x.test/news/2026-01-01-draft-news/</link></item></rss>",
    );
    // JSON-LD on a public page.
    write(
      o,
      "people/avery-pi/index.html",
      `<script type="application/ld+json">{"colleague":"https://x.test/people/listed-noprofile/"}</script>`,
    );
    // An external profile that happens to share the path shape is not a leak.
    write(
      o,
      "index.html",
      `<a href="https://other.edu/people/hidden-person/">elsewhere</a><a href="/research/live-one/">x</a>`,
    );
    const errors = checkExport(o, { contentDir: contentFixture() }).errors;
    expect(errors).toEqual([
      "directions/secret-direction is not public but out/research/live-one/__next.research.$d$direction.__PAGE__.txt mentions its URL",
      "people/listed-noprofile is not public but out/people/avery-pi/index.html links to it",
      "news/2026-01-01-draft-news is not public but out/news/feed.xml mentions its URL",
    ]);
  });

  it("fails when a sitemap URL has no page or is a not-found page (soft 404)", () => {
    const o = goodOut();
    write(
      o,
      "projects/gone-elsewhere/index.html",
      '<meta name="robots" content="noindex"/><h1>Not found</h1>',
    );
    write(
      o,
      "sitemap.xml",
      [
        "<urlset>",
        "<url><loc>https://x.test/research/live-one/</loc></url>",
        "<url><loc>https://x.test/publications/never-built/</loc></url>",
        "<url><loc>https://x.test/projects/gone-elsewhere/</loc></url>",
        "</urlset>",
      ].join(""),
    );
    const errors = checkExport(o, { contentDir: contentFixture() }).errors;
    expect(errors).toEqual([
      "sitemap lists https://x.test/publications/never-built/ but out/publications/never-built/index.html does not exist",
      "sitemap lists https://x.test/projects/gone-elsewhere/ but out/projects/gone-elsewhere/index.html is a noindex (not-found) page",
    ]);
  });

  it("checks sitemap pages under a base path", () => {
    const o = goodOut();
    write(
      o,
      "sitemap.xml",
      "<urlset><url><loc>https://x.test/site/research/live-one/</loc></url><url><loc>https://x.test/other/</loc></url></urlset>",
    );
    write(o, "robots.txt", "User-Agent: *\nAllow: /site/\nDisallow: /site/admin/\n");
    const errors = checkExport(o, { contentDir: contentFixture(), basePath: "/site" }).errors;
    expect(errors).toEqual(["sitemap URL is outside the base path /site: https://x.test/other/"]);
  });
});
