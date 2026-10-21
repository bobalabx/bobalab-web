/**
 * Test helpers for the browser-side CMS scripts (public/admin/*.js):
 * a minimal stand-in for the Immutable.js collections Decap passes around
 * (only what cms-hooks.js and preview-templates.js use, marked with the same
 * sentinel keys), and a sandbox that runs a script with a fake `window.CMS`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const MAP = "@@__IMMUTABLE_MAP__@@";
const LIST = "@@__IMMUTABLE_LIST__@@";

type Plain = unknown;

export class FakeMap {
  readonly [MAP] = true;
  constructor(readonly entries: Array<[string, Plain]>) {}
  get size() {
    return this.entries.length;
  }
  get(k: string) {
    return this.entries.find(([key]) => key === k)?.[1];
  }
  getIn(p: Array<string | number>): Plain {
    return p.reduce<Plain>(
      (cur, k) =>
        cur instanceof FakeMap
          ? cur.get(String(k))
          : cur instanceof FakeList
            ? cur.get(Number(k))
            : undefined,
      this,
    );
  }
  map(fn: (v: Plain, k: string) => Plain) {
    return new FakeMap(this.entries.map(([k, v]) => [k, fn(v, k)]));
  }
  filter(fn: (v: Plain, k: string) => boolean) {
    return new FakeMap(this.entries.filter(([k, v]) => fn(v, k)));
  }
  toJS(): Record<string, Plain> {
    return Object.fromEntries(this.entries.map(([k, v]) => [k, toJS(v)]));
  }
}

export class FakeList {
  readonly [LIST] = true;
  constructor(readonly items: Plain[]) {}
  get size() {
    return this.items.length;
  }
  get(i: number) {
    return this.items[i];
  }
  map(fn: (v: Plain, i: number) => Plain) {
    return new FakeList(this.items.map(fn));
  }
  filter(fn: (v: Plain, i: number) => boolean) {
    return new FakeList(this.items.filter(fn));
  }
  toJS(): Plain[] {
    return this.items.map(toJS);
  }
}

export function toJS(v: Plain): Plain {
  return v instanceof FakeMap || v instanceof FakeList ? v.toJS() : v;
}

export function fromJS(v: Plain): Plain {
  if (Array.isArray(v)) return new FakeList(v.map(fromJS));
  if (v && typeof v === "object") {
    return new FakeMap(Object.entries(v as Record<string, Plain>).map(([k, x]) => [k, fromJS(x)]));
  }
  return v;
}

/** A Decap-like entry: { collection, slug, data }. */
export function entry(collection: string, slug: string, data: Record<string, Plain>) {
  return fromJS({ collection, slug, data }) as FakeMap;
}

export interface Registered {
  events: Array<{ name: string; handler: (args: { entry: FakeMap }) => unknown }>;
  templates: Record<string, (props: Record<string, unknown>) => unknown>;
  styles: string[];
}

/** Run public/admin/<file> (after cms-data.js) in a sandbox with a fake CMS and `h`. */
export function runAdminScripts(files: string[]) {
  const reg: Registered = { events: [], templates: {}, styles: [] };
  const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({
    type,
    props: props ?? {},
    children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false),
  });
  const window: Record<string, unknown> = {
    h,
    CMS: {
      registerEventListener: (l: Registered["events"][number]) => reg.events.push(l),
      registerPreviewTemplate: (n: string, c: Registered["templates"][string]) =>
        (reg.templates[n] = c),
      registerPreviewStyle: (s: string) => reg.styles.push(s),
    },
  };
  const context = vm.createContext({
    window,
    globalThis: window,
    document: { baseURI: "http://localhost:3100/admin/index.html" },
    URL,
    Intl,
    Date,
  });
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, "public", "admin", f), "utf8"), context, {
      filename: f,
    });
  }
  return { reg, window };
}

/** All text in a rendered fake element tree. */
export function textOf(node: unknown): string {
  if (node === null || node === undefined || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  const n = node as { children?: unknown[] };
  return (n.children ?? []).map(textOf).join("");
}

/** Find elements in a rendered fake tree. */
export function findAll(
  node: unknown,
  pred: (n: { type: unknown; props: Record<string, unknown> }) => boolean,
) {
  const out: Array<{ type: unknown; props: Record<string, unknown>; children: unknown[] }> = [];
  const walk = (x: unknown) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) return x.forEach(walk);
    const n = x as { type: unknown; props: Record<string, unknown>; children: unknown[] };
    if (pred(n)) out.push(n);
    (n.children ?? []).forEach(walk);
  };
  walk(node);
  return out;
}
