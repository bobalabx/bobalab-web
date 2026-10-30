/**
 * E_LINK_HIDDEN (editor v2, spec §2.12.6b; src/lib/content/links.ts, called from
 * validateContent): a publicly rendered entry, page or site.yml links to the page
 * of an entry that has no page on the live site. export-check finds the same
 * thing in the built HTML; the validator finds it first and names the LINKING
 * file and field. Each case starts from the valid fixture set n4 plus one hidden
 * person (listed, no profile page) and applies one in-memory edit.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseContentFiles } from "@/lib/content/read";
import { hiddenLinkIssues } from "@/lib/content/links";
import { ownOrigins, validateContent } from "@/lib/content/validate";
import { Files, TODAY } from "../../content/helpers";

const NEWS = "news/2026-05-11-fixture-paper-accepted.md";
const HIDDEN = "/people/isabelle-cho/";
const MESSAGE =
  "This links to /people/isabelle-cho/, which is not a page on the live site. Link to /#people (the home page's People section) instead, or remove the link.";

/** n4 plus Isabelle Cho: listed in the home page's People section, without a profile page of her own. */
function base(): Files {
  return Files.of("n4").copy("people/avery-example.md", "people/isabelle-cho.md", (d) => {
    d.name = "Isabelle Cho";
    d.role = "phd";
    delete d.title;
    d.profile_page = false;
  });
}
const linkIssues = (f: Files, origins?: string[]) =>
  validateContent(parseContentFiles(f.files), { today: TODAY, origins }).filter(
    (i) => i.code === "E_LINK_HIDDEN",
  );
const body = (f: Files, file: string, text: string) => {
  const t = f.get(file).text.replace(/\n---\n[\s\S]*$/, `\n---\n\n${text}\n`);
  return f.set(file, t);
};

beforeEach(() => {
  // ownOrigins() reads NEXT_PUBLIC_SITE_URL (like siteOrigin()); keep it out of these cases.
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("E_LINK_HIDDEN: links to pages that are not on the live site", () => {
  it("the base set is clean: a hidden person nobody links to is fine", () => {
    expect(linkIssues(base())).toEqual([]);
  });

  it("a Markdown body link, filed on the LINKING entry's file and field, in plain words", () => {
    const issues = linkIssues(body(base(), NEWS, `See [Isabelle](${HIDDEN}) for details.`));
    expect(issues).toEqual([
      { severity: "error", code: "E_LINK_HIDDEN", file: NEWS, field: "body", message: MESSAGE },
    ]);
  });

  it.each([
    ["without the trailing slash", "[x](/people/isabelle-cho)"],
    ["with an anchor", "[x](/people/isabelle-cho/#about)"],
    ["with a query", "[x](/people/isabelle-cho?ref=news)"],
    ["in an HTML attribute", '<a href="/people/isabelle-cho/">x</a>'],
    ["as a reference definition", "[x][1]\n\n[1]: /people/isabelle-cho/"],
    ["in brackets", "[/people/isabelle-cho]"],
    ["as bare text at the start of a line", "/people/isabelle-cho/ is her page"],
    ["after a comma", "pages:/people/x/,/people/isabelle-cho/"],
  ])("root-relative %s", (_name, text) => {
    expect(linkIssues(body(base(), NEWS, text)).map((i) => i.message)).toEqual([MESSAGE]);
  });

  it.each([
    ["site_url (n4: https://example.invalid)", "https://example.invalid/people/isabelle-cho/"],
    ["the production origin", "https://bobalabx.github.io/people/isabelle-cho/"],
    [
      "the production origin with its base path",
      "https://bobalabx.github.io/bobalab-web/people/isabelle-cho",
    ],
    ["a protocol-relative own origin", "//example.invalid/people/isabelle-cho/"],
  ])("absolute on the site's own origin: %s", (_name, url) => {
    expect(linkIssues(body(base(), NEWS, `[x](${url})`)).map((i) => i.message)).toEqual([MESSAGE]);
  });

  it.each([
    ["an external domain", "https://other.edu/people/isabelle-cho/"],
    ["a look-alike host", "https://example.invalid.evil.test/people/isabelle-cho/"],
    ["a longer slug", "/people/isabelle-cho-lab/"],
    ["a sub-path of another folder", "/files/people/isabelle-cho/"],
    ["a live page", "/people/avery-example/"],
    ["the People index", "/people/"],
    ["a slug in running text without the folder", "isabelle-cho"],
  ])("does not match %s", (_name, url) => {
    expect(linkIssues(body(base(), NEWS, `[x](${url})`))).toEqual([]);
  });

  it("scans every string value, not only the body (here a news link.url)", () => {
    const f = base().edit(NEWS, (d) => void (d.link = { label: "Her page", url: HIDDEN }));
    expect(linkIssues(f).map((i) => [i.file, i.field])).toEqual([[NEWS, "link.url"]]);
  });

  it("one issue per linking field and target, even when the body links twice", () => {
    const f = body(base(), NEWS, `[a](${HIDDEN}) and [b](${HIDDEN}) and [c](/people/isabelle-cho)`);
    expect(linkIssues(f)).toHaveLength(1);
  });

  it("finds two hidden targets in one field, in text order", () => {
    const f = base().edit("projects/advice-project.md", (d) => void (d.draft = true));
    body(f, NEWS, `[a](${HIDDEN}) [b](/projects/advice-project/)`);
    expect(linkIssues(f).map((i) => i.message.split(",")[0])).toEqual([
      "This links to /people/isabelle-cho/",
      "This links to /projects/advice-project/",
    ]);
  });

  it("drafts and unlisted people are hidden targets too (projects, directions, news, people)", () => {
    const f = base()
      .edit("directions/advice.md", (d) => void (d.draft = true))
      .edit("people/isabelle-cho.md", (d) => void (d.listed = false));
    body(f, NEWS, "[d](/research/advice/) [p](/people/isabelle-cho/)");
    expect(
      linkIssues(f)
        .map((i) => i.message.split(",")[0])
        .sort(),
    ).toEqual(["This links to /people/isabelle-cho/", "This links to /research/advice/"]);
  });

  it("a draft linking entry is ignored (it is not on the live site either)", () => {
    const f = body(base(), NEWS, `[x](${HIDDEN})`).edit(NEWS, (d) => void (d.draft = true));
    expect(linkIssues(f)).toEqual([]);
  });

  it("an unlisted person's own fields are ignored (the site never shows them)", () => {
    const f = base().copy("people/isabelle-cho.md", "people/jordan-hidden.md", (d) => {
      d.name = "Jordan Hidden";
      d.listed = false;
    });
    body(f, "people/jordan-hidden.md", `Works with [Isabelle](${HIDDEN}).`);
    expect(linkIssues(f)).toEqual([]);
  });

  it("a page links: filed on pages/<name>.yml; a draft page is ignored", () => {
    const f = base().edit("pages/about.yml", (d) => void (d.body = `Meet [Isabelle](${HIDDEN}).`));
    expect(linkIssues(f).map((i) => [i.file, i.field])).toEqual([["pages/about.yml", "body"]]);
    f.edit("pages/about.yml", (d) => void (d.draft = true));
    expect(linkIssues(f)).toEqual([]);
  });

  it("site.yml: redirects[].from is ignored (it is the old address itself), redirects[].to is not", () => {
    const f = base().edit(
      "site.yml",
      (d) => void (d.redirects = [{ from: HIDDEN, to: "/people/" }]),
    );
    expect(linkIssues(f)).toEqual([]);
    f.edit("site.yml", (d) => void (d.redirects = [{ from: "/people/old-name/", to: HIDDEN }]));
    expect(linkIssues(f).map((i) => [i.file, i.field])).toEqual([["site.yml", "redirects.0.to"]]);
  });

  it("an entry with a live page is never a hidden target", () => {
    const f = body(base(), NEWS, "[pi](/people/avery-example/) [d](/research/advice/)");
    expect(linkIssues(f)).toEqual([]);
  });

  it("validateContent passes options.origins through; the default is ownOrigins(site_url)", () => {
    const f = body(base(), NEWS, "[x](https://lab.example.edu/people/isabelle-cho/)");
    expect(linkIssues(f)).toEqual([]);
    expect(linkIssues(f, ["https://lab.example.edu"])).toHaveLength(1);
    expect(ownOrigins("https://example.invalid/")).toEqual([
      "https://example.invalid",
      "https://bobalabx.github.io",
      "https://example.invalid/",
    ]);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lab.example.edu");
    expect(ownOrigins(undefined)).toEqual(["https://lab.example.edu"]);
    expect(linkIssues(f)).toHaveLength(1);
  });

  it("hiddenLinkIssues alone: an origin given with its base path matches only under that path", () => {
    const raw = parseContentFiles(
      body(base(), NEWS, "[a](https://bobalabx.github.io/other/people/isabelle-cho/)").files,
    );
    expect(hiddenLinkIssues(raw, { origins: ["https://bobalabx.github.io/bobalab-web"] })).toEqual(
      [],
    );
    expect(hiddenLinkIssues(raw, { origins: ["https://bobalabx.github.io"] })).toHaveLength(1);
    expect(hiddenLinkIssues(raw, { origins: [] })).toEqual([]);
  });
});
