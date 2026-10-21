/**
 * BibTeX for a publication, generated at build time with citation-js from the
 * content fields (brief §D8, WP3 acceptance #3). `bibtex_override` wins when
 * the lab sets it.
 *
 * citation-js output is normalised for readability only (no value changes):
 * fields in a conventional order, two-space indent, a `howpublished` that
 * merely repeats `url` is dropped, and on @unpublished a `type` that repeats
 * the (required) `note` is dropped, so biblatex does not print it twice.
 */
import { cite } from "./cite";
import { toCsl, type CitablePublication } from "./csl";

const FIELD_ORDER = [
  "title",
  "author",
  "editor",
  "journal",
  "booktitle",
  "school",
  "institution",
  "publisher",
  "type",
  "year",
  "month",
  "volume",
  "number",
  "pages",
  "doi",
  "url",
  "howpublished",
  "note",
];

interface Field {
  name: string;
  value: string;
}

function parseEntry(raw: string): { head: string; fields: Field[] } | null {
  const lines = raw.trim().split(/\r?\n/);
  const head = lines[0];
  if (!head || !/^@\w+\{[^,]*,$/.test(head) || lines[lines.length - 1] !== "}") return null;
  const fields: Field[] = [];
  for (const line of lines.slice(1, -1)) {
    const m = /^\s*([A-Za-z]+)\s*=\s*(.*?),?\s*$/.exec(line);
    if (!m) return null; // unexpected shape (e.g. a multi-line value): keep citation-js output as is
    fields.push({ name: m[1]!.toLowerCase(), value: m[2]! });
  }
  return { head, fields };
}

/** Reorder fields, indent with two spaces, drop a howpublished that repeats url. */
export function normaliseBibtex(raw: string): string {
  const entry = parseEntry(raw);
  if (!entry) return raw.trim();
  // url is verbatim, howpublished is TeX-escaped ("\&"): compare unescaped.
  const plain = (v: string | undefined) => v?.replace(/\\([&%$#_{}])/g, "$1");
  const url = plain(entry.fields.find((f) => f.name === "url")?.value);
  const note = entry.fields.find((f) => f.name === "note")?.value;
  const unpublished = /^@unpublished\{/i.test(entry.head);
  const fields = entry.fields.filter(
    (f) =>
      !(f.name === "howpublished" && url !== undefined && plain(f.value) === url) &&
      !(unpublished && f.name === "type" && note !== undefined && f.value === note),
  );
  const rank = (n: string) => {
    const i = FIELD_ORDER.indexOf(n);
    return i < 0 ? FIELD_ORDER.length : i;
  };
  fields.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
  const width = Math.max(...fields.map((f) => f.name.length));
  const body = fields.map(
    (f, i) => `  ${f.name.padEnd(width)} = ${f.value}${i < fields.length - 1 ? "," : ""}`,
  );
  return [entry.head, ...body, "}"].join("\n");
}

/** The BibTeX entry shown on the paper page and offered for copying. */
export function bibtexFor(p: CitablePublication & { bibtex_override?: string }): string {
  const override = p.bibtex_override?.trim();
  if (override) return override;
  const raw = cite(toCsl(p)).format("bibtex", { format: "text" }) as string;
  return normaliseBibtex(raw);
}
