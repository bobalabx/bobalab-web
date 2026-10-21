/**
 * Markdown rendering with Markdoc (brief §0.2 "Rich text", §G4 content safety).
 * - Raw HTML in content is escaped (Markdoc parses with html disabled) — unit-tested.
 * - `javascript:` and other unsafe link schemes are not turned into links.
 * - Headings inside bodies start at h2 (each page has exactly one h1).
 * - External links get rel="noopener noreferrer".
 */
import Markdoc, { Tag, type Config, type Node, type RenderableTreeNode } from "@markdoc/markdoc";
import { withBasePath } from "@/lib/site/paths";

const isExternal = (href: string) => /^https?:\/\//i.test(href);
/** Site-relative ("/x/") links and images get the base path (WP5 request 9); "#…", "mailto:" and URLs do not. */
const siteRelative = (href: string) =>
  href.startsWith("/") && !href.startsWith("//") ? withBasePath(href) : href;

export const markdocConfig: Config = {
  nodes: {
    heading: {
      children: ["inline"],
      attributes: { level: { type: Number, required: true } },
      transform(node: Node, config: Config) {
        const level = Math.min(6, Math.max(2, Number(node.attributes.level) || 2));
        return new Tag(`h${level}`, {}, node.transformChildren(config));
      },
    },
    link: {
      children: ["strong", "em", "s", "code", "text", "tag", "image"],
      attributes: { href: { type: String, required: true }, title: { type: String } },
      transform(node: Node, config: Config) {
        const href = String(node.attributes.href ?? "");
        const attrs: Record<string, string> = { href: siteRelative(href) };
        if (node.attributes.title) attrs.title = String(node.attributes.title);
        if (isExternal(href)) attrs.rel = "noopener noreferrer";
        return new Tag("a", attrs, node.transformChildren(config));
      },
    },
    image: {
      attributes: {
        src: { type: String, required: true },
        alt: { type: String },
        title: { type: String },
      },
      transform(node: Node) {
        return new Tag("img", {
          src: siteRelative(String(node.attributes.src ?? "")),
          alt: String(node.attributes.alt ?? ""),
          loading: "lazy",
          decoding: "async",
        });
      },
    },
  },
};

export function renderMarkdown(source: string | undefined | null): RenderableTreeNode {
  const ast = Markdoc.parse(source ?? "");
  return Markdoc.transform(ast, markdocConfig);
}

/** HTML string (RSS, admin preview, tests). The outer <article> wrapper is removed. */
export function markdownToHtml(source: string | undefined | null): string {
  const html = Markdoc.renderers.html(renderMarkdown(source));
  return html.replace(/^<article>/, "").replace(/<\/article>$/, "");
}

/** Plain text (meta descriptions, word counts). */
export function markdownToText(source: string | undefined | null): string {
  return (
    markdownToHtml(source)
      // Block tags separate words; inline tags (a, strong, em, code…) do not (WP5 request 9).
      .replace(/<\/?(?:p|li|ul|ol|h[1-6]|blockquote|pre|tr|td|th|table|br|hr|img)\b[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
  );
}
