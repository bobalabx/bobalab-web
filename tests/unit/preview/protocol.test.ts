/**
 * WP2 (spec §2.4; Interfaces §4): the preview protocol's runtime guards accept
 * every message of the protocol and refuse anything else (another version, an
 * unknown type, a field of the wrong type), so neither side acts on a stray
 * postMessage.
 */
import { describe, expect, it } from "vitest";
import {
  DECAP_COLLECTIONS,
  PREVIEW_PROTOCOL,
  isFromPreview,
  isToPreview,
  type FromPreview,
  type ToPreview,
} from "@/lib/preview/protocol";

const entry = { collection: "news", slug: "2026-10-26-x" } as const;
const issue = { code: "E_SCHEMA", file: "news/x.md", field: "title", message: "Required" };
const base = Object.fromEntries(DECAP_COLLECTIONS.map((c) => [c, []]));

const TO: ToPreview[] = [
  { type: "bobalab:mode", v: 1, visitor: true },
  { type: "bobalab:loading", v: 1, done: 3, total: 8 },
  { type: "bobalab:base", v: 1, base: base as never, complete: true, publishedSlugs: null },
  {
    type: "bobalab:base",
    v: 1,
    base: { ...base, news: [{ slug: "x", data: { title: "X", body: "" } }] } as never,
    complete: false,
    publishedSlugs: { news: ["x"] },
  },
  { type: "bobalab:overlay", v: 1, rev: 7, entry, isNew: false, data: { title: "X" } },
  { type: "bobalab:overlay-clear", v: 1, rev: 8 },
  { type: "bobalab:assets", v: 1, assets: { "/uploads/x.jpg": "data:image/jpeg;base64,AA==" } },
  { type: "bobalab:navigate", v: 1, target: { page: "news-item", slug: "x" } },
  { type: "bobalab:navigate", v: 1, target: { page: "home" } },
  { type: "bobalab:find", v: 1 },
  { type: "bobalab:parse", v: 1, id: "1", path: "content/news/x.md", text: "---\n---\n" },
  { type: "bobalab:check", v: 1, id: "2", entry, isNew: true, data: {} },
];

const FROM: FromPreview[] = [
  { type: "bobalab:ready", v: 1 },
  {
    type: "bobalab:rendered",
    v: 1,
    rev: 3,
    target: { page: "people" },
    path: "/people/",
    title: "People",
    found: "marker",
    problems: { available: true, blocking: [issue], warnings: [], stillNeeded: [] },
  },
  {
    type: "bobalab:rendered",
    v: 1,
    rev: 3,
    target: { page: "person", slug: "a-b" },
    path: "/people/a-b/",
    title: "",
    found: "not-found",
    problems: { available: false, blocking: [], warnings: [], stillNeeded: [] },
    renderError: "boom",
  },
  { type: "bobalab:navigated", v: 1, target: { page: "research" }, path: "/research/" },
  { type: "bobalab:parsed", v: 1, id: "1", ok: true, data: { title: "X" } },
  { type: "bobalab:parsed", v: 1, id: "1", ok: false, error: "YAML: bad" },
  { type: "bobalab:checked", v: 1, id: "2", available: true, blocking: [issue], warnings: [] },
  { type: "bobalab:key", v: 1, key: "save" },
];

describe("protocol guards", () => {
  it("the protocol version is 1", () => {
    expect(PREVIEW_PROTOCOL).toBe(1);
  });

  it.each(TO.map((m) => [m.type, m]))("accepts %s (to the preview)", (_t, m) => {
    expect(isToPreview(m)).toBe(true);
    expect(isFromPreview(m)).toBe(false);
  });

  it.each(FROM.map((m) => [m.type, m]))("accepts %s (from the preview)", (_t, m) => {
    expect(isFromPreview(m)).toBe(true);
    expect(isToPreview(m)).toBe(false);
  });

  it("refuses other versions, unknown types and non-objects", () => {
    for (const m of [...TO, ...FROM]) {
      expect(isToPreview({ ...m, v: 2 })).toBe(false);
      expect(isFromPreview({ ...m, v: 2 })).toBe(false);
      const noVersion: Record<string, unknown> = { ...m };
      delete noVersion.v;
      expect(isToPreview(noVersion)).toBe(false);
      expect(isFromPreview(noVersion)).toBe(false);
    }
    for (const m of [null, undefined, "bobalab:ready", 1, [], { type: "bobalab:nope", v: 1 }]) {
      expect(isToPreview(m)).toBe(false);
      expect(isFromPreview(m)).toBe(false);
    }
  });

  it("refuses wrong field types", () => {
    const bad: unknown[] = [
      { type: "bobalab:mode", v: 1, visitor: "yes" },
      { type: "bobalab:loading", v: 1, done: "3", total: 8 },
      { type: "bobalab:loading", v: 1, done: Number.NaN, total: 8 },
      { type: "bobalab:base", v: 1, base: [], complete: true, publishedSlugs: null },
      { type: "bobalab:base", v: 1, base: { unknown: [] }, complete: true, publishedSlugs: null },
      {
        type: "bobalab:base",
        v: 1,
        base: { news: [{ slug: 1, data: {} }] },
        complete: true,
        publishedSlugs: null,
      },
      {
        type: "bobalab:base",
        v: 1,
        base: { news: [{ slug: "x", data: [] }] },
        complete: true,
        publishedSlugs: null,
      },
      { type: "bobalab:base", v: 1, base, complete: "yes", publishedSlugs: null },
      { type: "bobalab:base", v: 1, base, complete: true, publishedSlugs: { news: "x" } },
      { type: "bobalab:base", v: 1, base, complete: true },
      { type: "bobalab:overlay", v: 1, rev: "1", entry, isNew: false, data: {} },
      {
        type: "bobalab:overlay",
        v: 1,
        rev: 1,
        entry: { collection: "blog", slug: "x" },
        isNew: false,
        data: {},
      },
      { type: "bobalab:overlay", v: 1, rev: 1, entry, isNew: false, data: null },
      { type: "bobalab:overlay", v: 1, rev: 1, entry, isNew: false, data: [] },
      { type: "bobalab:overlay-clear", v: 1 },
      { type: "bobalab:assets", v: 1, assets: { "/uploads/x.jpg": 1 } },
      { type: "bobalab:navigate", v: 1, target: { page: "blog" } },
      { type: "bobalab:navigate", v: 1, target: { page: "person" } },
      { type: "bobalab:navigate", v: 1, target: { page: "news-item", slug: "" } },
      { type: "bobalab:parse", v: 1, id: 1, path: "x", text: "" },
      { type: "bobalab:check", v: 1, id: "1", entry, data: {} },
    ];
    for (const m of bad) expect(isToPreview(m), JSON.stringify(m)).toBe(false);
    const badFrom: unknown[] = [
      { ...FROM[1], found: "maybe" },
      { ...FROM[1], problems: { available: true, blocking: [], warnings: [] } },
      {
        ...FROM[1],
        problems: { available: true, blocking: [{ code: "X" }], warnings: [], stillNeeded: [] },
      },
      { ...FROM[1], renderError: 1 },
      { type: "bobalab:parsed", v: 1, id: "1", ok: true, data: "x" },
      { type: "bobalab:parsed", v: 1, id: "1", ok: false },
      { type: "bobalab:checked", v: 1, id: "1", available: true, blocking: [] },
      { type: "bobalab:key", v: 1, key: "undo" },
    ];
    for (const m of badFrom) expect(isFromPreview(m), JSON.stringify(m)).toBe(false);
  });
});
