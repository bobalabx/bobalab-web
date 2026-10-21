/**
 * Formatted reference (APA 7 via citation-js + the bundled CSL template),
 * generated at build time. Returned as plain-text segments with an `italic`
 * flag, so pages render it with React (no dangerouslySetInnerHTML, brief §G4).
 */
import { cite } from "./cite";
import { toCsl, type CitablePublication } from "./csl";

export interface CitationSegment {
  text: string;
  italic?: boolean;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/**
 * Turn citation-js HTML for ONE entry into segments. Only <i>/<em> carry
 * meaning; every other tag is dropped and the text is entity-decoded.
 */
export function htmlToSegments(html: string): CitationSegment[] {
  const inner = html
    .replace(/^[\s\S]*?<div[^>]*class="csl-entry"[^>]*>/, "")
    .replace(/<\/div>\s*<\/div>\s*$/, "")
    .replace(/<\/div>\s*$/, "");
  const out: CitationSegment[] = [];
  let italic = false;
  for (const token of inner.split(/(<\/?(?:i|em)>)/i)) {
    if (/^<(i|em)>$/i.test(token)) italic = true;
    else if (/^<\/(i|em)>$/i.test(token)) italic = false;
    else {
      const text = decodeEntities(token.replace(/<[^>]*>/g, ""));
      if (!text) continue;
      const last = out[out.length - 1];
      if (last && Boolean(last.italic) === italic) last.text += text;
      else out.push(italic ? { text, italic: true } : { text });
    }
  }
  if (out.length) {
    out[0]!.text = out[0]!.text.replace(/^\s+/, "");
    out[out.length - 1]!.text = out[out.length - 1]!.text.replace(/\s+$/, "");
  }
  return out.filter((s) => s.text);
}

/** APA reference as segments (italics preserved). */
export function formatCitation(p: CitablePublication): CitationSegment[] {
  const html = cite(toCsl(p)).format("bibliography", {
    format: "html",
    template: "apa",
    lang: "en-US",
  }) as string;
  return htmlToSegments(html);
}

/** APA reference as plain text. */
export function formatCitationText(p: CitablePublication): string {
  return formatCitation(p)
    .map((s) => s.text)
    .join("");
}
