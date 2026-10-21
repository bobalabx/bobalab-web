/**
 * A small, strict XML 1.0 well-formedness checker and tree builder for the
 * feed tests (no dependency). It rejects: unbalanced or crossed tags, more
 * than one root, unquoted or duplicate attributes, unknown entity references,
 * a raw "<" or "&" in text or attribute values, "]]>" in text, characters
 * that XML forbids, and non-whitespace text outside the root element.
 */
export interface XmlElement {
  name: string;
  attrs: Record<string, string>;
  children: XmlElement[];
  /** Concatenated, entity-decoded text and CDATA directly inside this element. */
  text: string;
}

const NAME = /^[A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?$/;
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function isXmlChar(c: number): boolean {
  return (
    c === 0x9 ||
    c === 0xa ||
    c === 0xd ||
    (c >= 0x20 && c <= 0xd7ff) ||
    (c >= 0xe000 && c <= 0xfffd) ||
    (c >= 0x10000 && c <= 0x10ffff)
  );
}

function decode(raw: string, where: string): string {
  if (raw.includes("<")) throw new Error(`raw "<" in ${where}`);
  return raw.replace(/&([^;\s&]*);?/g, (m, ref: string) => {
    if (!m.endsWith(";")) throw new Error(`bare "&" in ${where}: ${JSON.stringify(m)}`);
    if (ref in ENTITIES) return ENTITIES[ref]!;
    const num = /^#(\d+)$/.exec(ref) ?? null;
    const hex = /^#x([0-9a-fA-F]+)$/.exec(ref) ?? null;
    const code = num ? Number(num[1]) : hex ? parseInt(hex[1]!, 16) : NaN;
    if (Number.isNaN(code) || !isXmlChar(code)) throw new Error(`bad entity &${ref}; in ${where}`);
    return String.fromCodePoint(code);
  });
}

export function parseXml(input: string): XmlElement {
  for (const ch of input) {
    if (!isXmlChar(ch.codePointAt(0)!))
      throw new Error(`forbidden character U+${ch.codePointAt(0)!.toString(16)}`);
  }
  let s = input;
  const decl =
    /^<\?xml\s+version="1\.0"(\s+encoding="[A-Za-z0-9._-]+")?(\s+standalone="(yes|no)")?\s*\?>/.exec(
      s,
    );
  if (decl) s = s.slice(decl[0].length);
  let i = 0;
  const stack: XmlElement[] = [];
  let root: XmlElement | null = null;
  let rootClosed = false;

  const pushText = (t: string) => {
    const top = stack[stack.length - 1];
    if (!top) {
      if (t.trim())
        throw new Error(`text outside the root element: ${JSON.stringify(t.slice(0, 40))}`);
      return;
    }
    top.text += t;
  };

  while (i < s.length) {
    const lt = s.indexOf("<", i);
    const chunk = lt < 0 ? s.slice(i) : s.slice(i, lt);
    if (chunk) {
      if (chunk.includes("]]>")) throw new Error('"]]>" in text');
      pushText(decode(chunk, "text"));
    }
    if (lt < 0) break;
    i = lt;
    if (s.startsWith("<!--", i)) {
      const end = s.indexOf("-->", i + 4);
      if (end < 0) throw new Error("unterminated comment");
      if (s.slice(i + 4, end).includes("--")) throw new Error('"--" inside a comment');
      i = end + 3;
      continue;
    }
    if (s.startsWith("<![CDATA[", i)) {
      if (!stack.length) throw new Error("CDATA outside the root element");
      const end = s.indexOf("]]>", i + 9);
      if (end < 0) throw new Error("unterminated CDATA");
      stack[stack.length - 1]!.text += s.slice(i + 9, end);
      i = end + 3;
      continue;
    }
    if (s.startsWith("<?", i)) {
      const end = s.indexOf("?>", i + 2);
      if (end < 0) throw new Error("unterminated processing instruction");
      if (/^<\?xml[\s?]/i.test(s.slice(i))) throw new Error("misplaced XML declaration");
      i = end + 2;
      continue;
    }
    if (s.startsWith("<!", i)) throw new Error("DOCTYPE or markup declaration not expected");
    const end = s.indexOf(">", i);
    if (end < 0) throw new Error("unterminated tag");
    const tag = s.slice(i + 1, end);
    i = end + 1;
    if (tag.startsWith("/")) {
      const name = tag.slice(1).trim();
      const open = stack.pop();
      if (!open || open.name !== name) {
        throw new Error(`closing </${name}> does not match <${open?.name ?? "(none)"}>`);
      }
      if (!stack.length) rootClosed = true;
      continue;
    }
    const selfClosing = tag.endsWith("/");
    const body = selfClosing ? tag.slice(0, -1) : tag;
    const m = /^([^\s/>]+)([\s\S]*)$/.exec(body);
    if (!m || !NAME.test(m[1]!)) throw new Error(`bad tag name in <${tag}>`);
    const el: XmlElement = { name: m[1]!, attrs: {}, children: [], text: "" };
    let rest = m[2]!;
    const attrRe = /^\s+([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/;
    for (;;) {
      const a = attrRe.exec(rest);
      if (!a) break;
      const [all, key, , dq, sq] = a;
      if (!NAME.test(key!)) throw new Error(`bad attribute name ${key}`);
      if (key! in el.attrs) throw new Error(`duplicate attribute ${key}`);
      el.attrs[key!] = decode(dq ?? sq ?? "", `attribute ${key}`);
      rest = rest.slice(all.length);
    }
    if (rest.trim()) throw new Error(`malformed attributes in <${tag}>: ${JSON.stringify(rest)}`);
    if (rootClosed || (!stack.length && root)) throw new Error("more than one root element");
    if (stack.length) stack[stack.length - 1]!.children.push(el);
    else root = el;
    if (selfClosing) {
      if (!stack.length) rootClosed = true;
    } else {
      stack.push(el);
    }
  }
  if (stack.length) throw new Error(`unclosed <${stack[stack.length - 1]!.name}>`);
  if (!root) throw new Error("no root element");
  return root;
}

export const child = (el: XmlElement, name: string) => el.children.find((c) => c.name === name);
export const childrenNamed = (el: XmlElement, name: string) =>
  el.children.filter((c) => c.name === name);
