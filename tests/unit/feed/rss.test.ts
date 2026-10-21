/**
 * WP5 acceptance #2: /news/feed.xml is well-formed RSS 2.0 with the required
 * channel and item elements (brief §D10, §G5 "RSS XML").
 * Checked with a strict in-repo XML checker (./xml.ts) and, when it is
 * installed, with the saxes XML parser (namespace-aware).
 */
import path from "node:path";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { buildContent, loadRawContent, type Content } from "@/lib/content/load";
import { parseContentFiles, type VirtualFile } from "@/lib/content/read";
import {
  absolutizeHtml,
  buildRssFeed,
  cdata,
  contentDateToInstant,
  rfc822,
  stripInvalidXmlChars,
  xmlEscape,
} from "@/components/news/rss";
import { child, childrenNamed, parseXml, type XmlElement } from "./xml";

const ROOT = process.cwd();
const FIXTURE = path.join(ROOT, "tests/fixtures/content/consent-edge-cases");
const NOW = new Date("2026-10-20T18:30:00Z");
const RFC822 =
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;

type Saxes = typeof import("saxes");
let saxes: Saxes | null | undefined;
async function saxesCheck(xml: string): Promise<"ok" | "skipped"> {
  if (saxes === undefined) saxes = await import("saxes").catch(() => null);
  if (!saxes) return "skipped";
  const p = new saxes.SaxesParser({ xmlns: true });
  let err: Error | null = null;
  p.on("error", (e) => {
    err ??= e;
  });
  p.write(xml).close();
  if (err) throw err;
  return "ok";
}

function fromFiles(files: VirtualFile[], preview = false): Content {
  return buildContent(parseContentFiles(files), { preview, today: "2026-10-20" });
}

const SITE_YML = `name: TESTLAB
long_name: Test Operations Lab
affiliation_text: Test School of Business, Test University
email: lab@example.org
address: 1 Test Way, Test City
site_url: https://example.org
`;

function newsFile(slug: string, front: string, body = ""): VirtualFile {
  return { path: `news/${slug}.md`, text: `---\n${front}\n---\n${body}` };
}

function channelOf(xml: string): XmlElement {
  const rss = parseXml(xml);
  expect(rss.name).toBe("rss");
  expect(rss.attrs.version).toBe("2.0");
  const channels = childrenNamed(rss, "channel");
  expect(channels).toHaveLength(1);
  return channels[0]!;
}

function expectItemShape(item: XmlElement) {
  for (const name of ["title", "link", "guid", "pubDate", "description"]) {
    const el = child(item, name);
    expect(el, `item is missing <${name}>`).toBeDefined();
    expect(el!.text.trim().length, `<${name}> is empty`).toBeGreaterThan(0);
  }
  const link = child(item, "link")!.text;
  expect(link).toMatch(/^https:\/\/[^\s]+\/news\/\d{4}-\d{2}-\d{2}-[a-z0-9-]+\/$/);
  const guid = child(item, "guid")!;
  expect(guid.attrs.isPermaLink).toBe("true");
  expect(guid.text).toBe(link);
  expect(child(item, "pubDate")!.text).toMatch(RFC822);
}

describe("RSS feed (fixture content)", () => {
  const c = buildContent(loadRawContent(FIXTURE), { preview: false, today: "2026-10-20" });
  const xml = buildRssFeed(c, { now: NOW });

  it("is well-formed XML (strict checker and saxes)", async () => {
    expect(() => parseXml(xml)).not.toThrow();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(["ok", "skipped"]).toContain(await saxesCheck(xml));
  });

  it("has the required channel elements", () => {
    const ch = channelOf(xml);
    expect(child(ch, "title")!.text).toBe(`${c.site.name} news`);
    expect(child(ch, "link")!.text).toMatch(/^https:\/\/.+\/news\/$/);
    expect(child(ch, "description")!.text).toContain(c.site.long_name);
    expect(child(ch, "language")!.text).toBe("en-us");
    expect(child(ch, "lastBuildDate")!.text).toBe("Tue, 20 Oct 2026 18:30:00 GMT");
    const self = child(ch, "atom:link")!;
    expect(self.attrs.rel).toBe("self");
    expect(self.attrs.type).toBe("application/rss+xml");
    expect(self.attrs.href).toMatch(/\/news\/feed\.xml$/);
  });

  it("lists every news item in this build, newest first, each with the required elements", () => {
    const items = childrenNamed(channelOf(xml), "item");
    expect(items.length).toBe(c.news.length);
    expect(items.length).toBeGreaterThan(0);
    items.forEach(expectItemShape);
    const titles = items.map((i) => child(i, "title")!.text);
    expect(titles).toEqual(c.news.map((n) => n.title));
    const times = items.map((i) => Date.parse(child(i, "pubDate")!.text));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("excludes drafts in production and marks them in preview", () => {
    const prodDrafts = c.news.filter((n) => n.draft);
    expect(prodDrafts).toHaveLength(0);
    const preview = buildContent(loadRawContent(FIXTURE), { preview: true, today: "2026-10-20" });
    const drafts = preview.news.filter((n) => n.draft);
    const pxml = buildRssFeed(preview, { now: NOW });
    const ptitles = childrenNamed(channelOf(pxml), "item").map((i) => child(i, "title")!.text);
    for (const d of drafts) expect(ptitles).toContain(`[Draft] ${d.title}`);
  });

  it("describes an event with its full date", () => {
    const withEvent = c.news.find((n) => n.event_date);
    expect(withEvent).toBeDefined();
    const item = childrenNamed(channelOf(xml), "item").find(
      (i) => child(i, "title")!.text === withEvent!.title,
    )!;
    expect(child(item, "description")!.text).toMatch(/Event: [A-Z][a-z]{2} \d{1,2}, \d{4}/);
  });
});

describe("RSS feed escaping", () => {
  const hostile = `Ampersand & <tag> "quotes" 'apostrophes' ]]> \u0007bell`;
  const files: VirtualFile[] = [
    { path: "site.yml", text: SITE_YML },
    newsFile(
      "2026-10-01-hostile",
      [
        "date: 2026-10-01",
        "type: media",
        `title: ${JSON.stringify(hostile)}`,
        `summary: ${JSON.stringify(`Summary with ${hostile}`)}`,
      ].join("\n"),
      "Body with <script>alert(1)</script> and ]]> and **bold** & [a link](https://example.org/?a=1&b=2).",
    ),
    newsFile("2026-09-15-plain", "date: 2026-09-15T15:30\ntype: talk\ntitle: Plain item"),
  ];
  const c = fromFiles(files);
  const xml = buildRssFeed(c, { now: NOW });

  it("stays well-formed with markup characters, CDATA terminators and control characters", async () => {
    expect(() => parseXml(xml)).not.toThrow();
    expect(["ok", "skipped"]).toContain(await saxesCheck(xml));
  });

  it("round-trips the text (minus forbidden characters)", () => {
    const items = childrenNamed(channelOf(xml), "item");
    expect(child(items[0]!, "title")!.text).toBe(stripInvalidXmlChars(hostile));
    const encoded = child(items[0]!, "content:encoded")!.text;
    expect(encoded).toContain("&lt;script&gt;");
    expect(encoded).not.toContain("<script>");
    expect(encoded).toContain("<strong>bold</strong>");
    // Markdoc escapes ">" in text, and cdata() splits any literal terminator.
    expect(encoded).toContain("]]&gt;");
    expect(child(items[1]!, "content:encoded")).toBeUndefined();
  });

  it("uses absolute URLs from site_url", () => {
    const ch = channelOf(xml);
    expect(child(ch, "link")!.text).toBe("https://example.org/news/");
    const link = child(childrenNamed(ch, "item")[0]!, "link")!.text;
    expect(link).toBe("https://example.org/news/2026-10-01-hostile/");
  });

  it("is valid with no news at all", async () => {
    const empty = buildRssFeed(fromFiles([{ path: "site.yml", text: SITE_YML }]), { now: NOW });
    const ch = channelOf(empty);
    expect(childrenNamed(ch, "item")).toHaveLength(0);
    for (const name of ["title", "link", "description"]) expect(child(ch, name)).toBeDefined();
    expect(["ok", "skipped"]).toContain(await saxesCheck(empty));
  });
});

describe("feed helpers", () => {
  it("escapes the five XML specials", () => {
    expect(xmlEscape(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;",
    );
  });

  it("makes site-relative links and images in item HTML absolute", () => {
    const html =
      '<p><a href="/publications/x-2026-y/">paper</a> <img src="/uploads/a.webp" alt=""/> ' +
      '<a href="https://example.com/z">ext</a> <a href="#n">anchor</a> ' +
      '<a href="mailto:lab@example.org">mail</a> <a href="//cdn.example.com/q">proto</a></p>';
    const out = absolutizeHtml(html, "https://example.org");
    expect(out).toContain('href="https://example.org/publications/x-2026-y/"');
    expect(out).toContain('src="https://example.org/uploads/a.webp"');
    expect(out).toContain('href="https://example.com/z"');
    expect(out).toContain('href="#n"');
    expect(out).toContain('href="mailto:lab@example.org"');
    expect(out).toContain('href="//cdn.example.com/q"');
  });

  it("adds the base path once, also when the HTML already carries it", () => {
    const saved = process.env.NEXT_PUBLIC_BASE_PATH;
    process.env.NEXT_PUBLIC_BASE_PATH = "/lab";
    try {
      const out = absolutizeHtml(
        '<a href="/news/">a</a> <a href="/lab/people/">b</a>',
        "https://example.org",
      );
      expect(out).toContain('href="https://example.org/lab/news/"');
      expect(out).toContain('href="https://example.org/lab/people/"');
    } finally {
      if (saved === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
      else process.env.NEXT_PUBLIC_BASE_PATH = saved;
    }
  });

  it("writes absolute URLs into content:encoded", () => {
    const c = fromFiles([
      { path: "site.yml", text: SITE_YML },
      newsFile(
        "2026-10-02-linked",
        "date: 2026-10-02\ntype: media\ntitle: Linked",
        "See [our news](/news/).",
      ),
    ]);
    const xml = buildRssFeed(c, { now: NOW });
    const item = childrenNamed(channelOf(xml), "item")[0]!;
    const encoded = child(item, "content:encoded")!.text;
    expect(encoded).toContain('href="https://example.org/news/"');
    expect(encoded).not.toMatch(/href="\/[^/]/);
  });

  it("splits a CDATA terminator", () => {
    expect(cdata("a]]>b")).toBe("<![CDATA[a]]]]><![CDATA[>b]]>");
  });

  it("dates date-only items at noon lab time (PDT and PST)", () => {
    expect(rfc822(contentDateToInstant("2026-10-20")!)).toBe("Tue, 20 Oct 2026 19:00:00 GMT");
    expect(rfc822(contentDateToInstant("2026-12-01")!)).toBe("Tue, 01 Dec 2026 20:00:00 GMT");
  });

  it("reads date-times as lab wall-clock time unless a zone is given", () => {
    expect(contentDateToInstant("2026-10-20T15:00")!.toISOString()).toBe(
      "2026-10-20T22:00:00.000Z",
    );
    expect(contentDateToInstant("2026-10-20T15:00Z")!.toISOString()).toBe(
      "2026-10-20T15:00:00.000Z",
    );
    expect(contentDateToInstant("2026-10-20T15:00:00+0200")!.toISOString()).toBe(
      "2026-10-20T13:00:00.000Z",
    );
    expect(contentDateToInstant("not a date")).toBeNull();
  });
});

describe("RSS feed (the real content directory)", () => {
  const dir = path.join(ROOT, "content");
  const present = fs.existsSync(path.join(dir, "site.yml"));
  it.skipIf(!present)("is well-formed for production and preview builds", async () => {
    for (const preview of [false, true]) {
      const c = buildContent(loadRawContent(dir), { preview, today: "2026-10-20" });
      const xml = buildRssFeed(c, { now: NOW });
      const items = childrenNamed(channelOf(xml), "item");
      expect(items.length).toBe(Math.min(c.news.length, 50));
      items.forEach(expectItemShape);
      expect(["ok", "skipped"]).toContain(await saxesCheck(xml));
    }
  });
});

describe("the strict XML checker itself", () => {
  it.each([
    ["unbalanced tags", "<a><b></a></b>"],
    ["a bare ampersand", "<a>Tom & Jerry</a>"],
    ["a raw less-than", "<a>1 < 2</a>"],
    ["two roots", "<a/><b/>"],
    ["an unquoted attribute", "<a x=1/>"],
    ["a duplicate attribute", '<a x="1" x="2"/>'],
    ["an unknown entity", "<a>&nbsp;</a>"],
    ["a control character", "<a>\u0007</a>"],
    ["text outside the root", "<a/>tail"],
  ])("rejects %s", (_label, bad) => {
    expect(() => parseXml(bad)).toThrow();
  });
});
