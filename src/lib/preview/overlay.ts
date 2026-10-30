/**
 * Editor live preview: put the entry being edited (the "overlay", what the form
 * holds right now) into the saved site (spec §2.2).
 *
 * The draft is tidied like cms-hooks.js clean() does before a save (trim text,
 * drop empty values), then goes through the entry's schema; `slug` and `file`
 * are added. It replaces the saved entry with the same slug, or joins its
 * collection for a new entry. Settings fill raw.site, pages raw.pages[slug].
 *
 *   applyStrict   the site check (§3.6e): the entry exactly as Save would write
 *                 it. A schema problem becomes E_SCHEMA on the edited file and
 *                 the entry is NOT applied (the saved version stays).
 *   applyLenient  the render: a half-filled form still shows. Missing required
 *                 fields get a placeholder ("(Title not filled in yet)", today's
 *                 date, …); an invalid field keeps its last good value, else gets
 *                 the placeholder, else is dropped (up to 3 passes). If that
 *                 still fails, the last valid version of the entry shows, else
 *                 the saved one. Strict problems come back as `stillNeeded`.
 *   forceVisible  the editor view: the edited entry shows even with Draft on.
 *
 * Pure (no DOM), so it is unit-tested in Node and runs in the browser.
 */
import type { ZodError, ZodType } from "zod";
import type { Issue, RawContent } from "@/lib/content/parse";
import { DEFAULT_SITE } from "@/lib/content/build";
import { SWATCH_IDS } from "@/lib/content/palette";
import {
  COLLECTIONS,
  COLLECTION_SCHEMAS,
  PAGE_SCHEMAS,
  siteSchema,
  type CollectionName,
  type PageName,
  type SiteData,
} from "@/lib/content/schema";
import { BASE_SCHEMA_CODE, entryInput } from "./base";
import { isObject, type DecapCollection, type EntryRef } from "./protocol";
import { fileOf } from "./targets";

type Data = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Tidy (cms-hooks.js clean())

const isBlank = (v: unknown) =>
  v === null ||
  v === undefined ||
  (typeof v === "string" && v.trim() === "") ||
  (isObject(v) && Object.keys(v).length === 0);

/** Mirror of cms-hooks.js clean(): trim strings, drop blank values from objects and lists. */
export function tidy(v: unknown): unknown {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v.map(tidy).filter((x) => !isBlank(x));
  if (isObject(v)) {
    const out: Data = {};
    for (const [k, x] of Object.entries(v)) {
      const t = tidy(x);
      if (!isBlank(t)) out[k] = t;
    }
    return out;
  }
  return v;
}

// ---------------------------------------------------------------------------
// Entries

/** A new entry whose address is not known yet renders as "new-<collection>". */
export function entryOf(entry: EntryRef): EntryRef {
  return entry.slug ? entry : { collection: entry.collection, slug: `new-${entry.collection}` };
}

function schemaFor(entry: EntryRef): ZodType | undefined {
  if (entry.collection === "settings") return siteSchema;
  if (entry.collection === "pages") return PAGE_SCHEMAS[entry.slug as PageName];
  return COLLECTION_SCHEMAS[entry.collection as CollectionName];
}

const isFolder = (c: DecapCollection): c is CollectionName => (COLLECTIONS as string[]).includes(c);

/** The schema input, as the build would read the saved file. */
function inputOf(entry: EntryRef, data: Data): Data {
  const t = tidy(data) as Data;
  return isFolder(entry.collection) ? entryInput(t) : t;
}

export function schemaErrors(err: ZodError, file: string): Issue[] {
  return err.issues.map((i) => ({
    severity: "error" as const,
    code: "E_SCHEMA",
    file,
    field: i.path.map(String).join(".") || undefined,
    message: i.message,
  }));
}

const byFile = (a: { file: string }, b: { file: string }) => a.file.localeCompare(b.file);

/** raw with `value` (schema output) as the entry; the saved version's preview warnings go. */
function withEntry(raw: RawContent, entry: EntryRef, value: unknown): RawContent {
  const file = fileOf(entry);
  const out: RawContent = {
    ...raw,
    issues: raw.issues.filter((i) => !(i.code === BASE_SCHEMA_CODE && i.file === file)),
  };
  if (entry.collection === "settings") {
    out.site = value as SiteData;
  } else if (entry.collection === "pages") {
    out.pages = { ...raw.pages, [entry.slug]: value };
  } else if (isFolder(entry.collection)) {
    const c = entry.collection;
    const list = (raw.entries[c] as Array<{ slug: string; file: string }>).filter(
      (e) => e.slug !== entry.slug,
    );
    list.push({ ...(value as Data), slug: entry.slug, file });
    out.entries = { ...raw.entries, [c]: list.sort(byFile) };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Strict (the site check)

export interface StrictResult {
  raw: RawContent;
  /** E_SCHEMA errors on the edited file; the entry was not applied when there are any. */
  schemaIssues: Issue[];
}

export function applyStrict(raw: RawContent, entryRef: EntryRef, data: Data): StrictResult {
  const entry = entryOf(entryRef);
  const schema = schemaFor(entry);
  if (!schema) return { raw, schemaIssues: [] }; // not a page file the site reads
  const r = schema.safeParse(inputOf(entry, data));
  if (!r.success) return { raw, schemaIssues: schemaErrors(r.error, fileOf(entry)) };
  return { raw: withEntry(raw, entry, r.data), schemaIssues: [] };
}

// ---------------------------------------------------------------------------
// Lenient (the render)

const NOT_FILLED = "(Title not filled in yet)";

/**
 * A schema-valid stand-in for every required field, per collection (and a year
 * for an invalid publication year). Every set passes its schema on its own.
 */
export const PLACEHOLDERS: Record<DecapCollection, (today: string) => Data> = {
  directions: () => ({
    title: NOT_FILLED,
    short_label: "(Not filled in yet)",
    color: SWATCH_IDS[0],
  }),
  projects: () => ({ title: NOT_FILLED, status: "active" }),
  publications: (today) => ({
    title: NOT_FILLED,
    authors: [{ name: "(Author not filled in yet)" }],
    type: "working-paper",
    status: "in-progress",
    year: Number(today.slice(0, 4)),
  }),
  people: () => ({ name: "(Name not filled in yet)", role: "phd" }),
  news: (today) => ({ date: today, type: "lab-life", title: NOT_FILLED }),
  opportunities: () => ({ title: NOT_FILLED, audience: "students", status: "open" }),
  pages: () => ({}),
  settings: () => ({
    name: DEFAULT_SITE.name,
    long_name: DEFAULT_SITE.long_name,
    affiliation_text: DEFAULT_SITE.affiliation_text,
    email: DEFAULT_SITE.email,
    address: DEFAULT_SITE.address,
  }),
};

/** The last strictly valid version of the entry being edited. */
export interface LastGood {
  /** "<collection>/<slug>" */
  key: string;
  /** The tidied form data. */
  data: Data;
  /** Its schema output. */
  value: unknown;
}

export interface LenientResult {
  raw: RawContent;
  lastGood: LastGood | null;
  /** The strict schema problems (E_SCHEMA on the edited file): "Still needed before Save". */
  stillNeeded: Issue[];
}

export const LENIENT_PASSES = 3;

type Path = Array<string | number>;
const DROP = Symbol("drop");

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** One repair pass over the top-level fields named by the zod issues. */
function repair(
  d: Data,
  issues: ZodError["issues"],
  fine: boolean,
  placeholders: Data,
  prev: Data | undefined,
): Data {
  const out: Data = { ...d };
  const dropItems = new Map<string, Set<number>>();
  const replace = (key: string) => {
    const cur = out[key];
    let next: unknown = DROP;
    // An invalid value keeps the last good one; a missing one shows the placeholder.
    if (cur !== undefined && prev && key in prev && !same(prev[key], cur)) next = prev[key];
    else if (key in placeholders) next = placeholders[key];
    if (next === DROP) delete out[key];
    else out[key] = next;
  };
  for (const i of issues) {
    const path = i.path.map((p) => (typeof p === "number" ? p : String(p))) as Path;
    if (i.code === "unrecognized_keys" && path.length === 0) {
      for (const k of i.keys) delete out[k];
      continue;
    }
    if (path.length === 0) continue; // a whole-object problem: nothing to repair here
    const key = String(path[0]);
    if (fine) {
      const v = out[key];
      // A bad list item goes (an author row still being typed), the list stays.
      if (Array.isArray(v) && typeof path[1] === "number") {
        dropItems.set(key, (dropItems.get(key) ?? new Set()).add(path[1]));
        continue;
      }
      // A bad sub-field goes (links.cv, link.url), the object stays.
      if (isObject(v) && (path.length >= 2 || i.code === "unrecognized_keys")) {
        const o = { ...v };
        if (path.length >= 2) delete o[String(path[1])];
        if (i.code === "unrecognized_keys" && path.length === 1)
          for (const k of i.keys) delete o[k];
        out[key] = o;
        continue;
      }
    }
    replace(key);
  }
  for (const [k, idx] of dropItems) {
    const v = out[k];
    if (Array.isArray(v)) out[k] = v.filter((_, n) => !idx.has(n));
  }
  return out;
}

/** Schema output after up to LENIENT_PASSES repairs, or null. */
function lenientParse(
  schema: ZodType,
  input: Data,
  placeholders: Data,
  prev: Data | undefined,
  passes: number,
): { value: unknown } | null {
  let d = input;
  for (let pass = 0; ; pass++) {
    const r = schema.safeParse(d);
    if (r.success) return { value: r.data };
    if (pass >= passes) return null;
    d = repair(d, r.error.issues, pass === 0, placeholders, prev);
  }
}

export interface LenientOptions {
  /** 'YYYY-MM-DD' in the lab's time zone (placeholder dates and years). */
  today: string;
  /** Repair passes before giving up (default LENIENT_PASSES). */
  passes?: number;
}

export function applyLenient(
  raw: RawContent,
  entryRef: EntryRef,
  data: Data,
  lastGood: LastGood | null,
  { today, passes = LENIENT_PASSES }: LenientOptions,
): LenientResult {
  const entry = entryOf(entryRef);
  const key = `${entry.collection}/${entry.slug}`;
  const prev = lastGood?.key === key ? lastGood : null;
  const schema = schemaFor(entry);
  if (!schema) return { raw, lastGood: prev, stillNeeded: [] };
  const file = fileOf(entry);
  const input = inputOf(entry, data);
  const strict = schema.safeParse(input);
  if (strict.success)
    return {
      raw: withEntry(raw, entry, strict.data),
      lastGood: { key, data: input, value: strict.data },
      stillNeeded: [],
    };
  const stillNeeded = schemaErrors(strict.error, file);
  const fixed = lenientParse(
    schema,
    input,
    PLACEHOLDERS[entry.collection](today),
    prev?.data,
    passes,
  );
  if (fixed) return { raw: withEntry(raw, entry, fixed.value), lastGood: prev, stillNeeded };
  return { raw: prev ? withEntry(raw, entry, prev.value) : raw, lastGood: prev, stillNeeded };
}

// ---------------------------------------------------------------------------
// Editor view

/** The edited entry with Draft off (its render copy), so the editor sees the page as it will look. */
export function forceVisible(raw: RawContent, entryRef: EntryRef): RawContent {
  const entry = entryOf(entryRef);
  if (entry.collection === "pages") {
    const page = raw.pages[entry.slug as PageName] as { draft?: boolean } | undefined;
    if (!page?.draft) return raw;
    return { ...raw, pages: { ...raw.pages, [entry.slug]: { ...page, draft: false } } };
  }
  if (!isFolder(entry.collection)) return raw;
  const c = entry.collection;
  const list = raw.entries[c] as Array<{ slug: string; draft: boolean }>;
  if (!list.some((e) => e.slug === entry.slug && e.draft)) return raw;
  return {
    ...raw,
    entries: {
      ...raw.entries,
      [c]: list.map((e) => (e.slug === entry.slug ? { ...e, draft: false } : e)),
    },
  };
}
