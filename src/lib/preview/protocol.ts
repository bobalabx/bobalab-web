/**
 * The editor live preview's message protocol (spec §2.4; Interfaces §4): the
 * content manager (public/admin/cms-live.js, its parent window) and the
 * preview page /editor-preview/ (src/app/editor-preview) talk only through
 * these messages, sent with postMessage(msg, location.origin).
 *
 *   parent → preview  ToPreview    iframe.contentWindow.postMessage(msg, location.origin)
 *   preview → parent  FromPreview  window.parent.postMessage(msg, location.origin)
 *
 * Both sides accept only `e.origin === location.origin` (the parent also checks
 * `e.source === iframe.contentWindow`) and a message that passes the guards
 * below. Every message carries `v: 1`; unknown types or versions are ignored.
 * Messages carry content only: never the GitHub token, never storage.
 *
 * Pure (no DOM), so the guards are unit-tested in Node.
 */

export const PREVIEW_PROTOCOL = 1 as const;

export type DecapCollection =
  | "news"
  | "publications"
  | "people"
  | "directions"
  | "projects"
  | "opportunities"
  | "pages"
  | "settings";

export type PreviewPage =
  | "home"
  | "research"
  | "direction"
  | "projects"
  | "project"
  | "publications"
  | "publication"
  | "people"
  | "person"
  | "news"
  | "news-item"
  | "join"
  | "about"
  | "accessibility"
  | "privacy";

/** slug is required for direction | project | publication | person | news-item. */
export interface PreviewTarget {
  page: PreviewPage;
  slug?: string;
}

/** pages: the file name ("home"); settings: "site". */
export interface EntryRef {
  collection: DecapCollection;
  slug: string;
}

export interface BaseEntry {
  slug: string;
  data: Record<string, unknown>;
}

export type PreviewBase = Record<DecapCollection, BaseEntry[]>;

/** content/.published-slugs.json on main (null when the file is absent). */
export type PublishedSlugs = Record<string, string[]> | null;

/** `file` is content-relative, e.g. "news/x.md". */
export interface PreviewIssue {
  code: string;
  file: string;
  field?: string;
  message: string;
}

export interface LiveProblems {
  available: boolean;
  blocking: PreviewIssue[];
  warnings: PreviewIssue[];
  stillNeeded: PreviewIssue[];
}

export type ToPreview =
  | { type: "bobalab:mode"; v: 1; visitor: boolean }
  | { type: "bobalab:loading"; v: 1; done: number; total: number }
  | {
      type: "bobalab:base";
      v: 1;
      base: PreviewBase;
      complete: boolean;
      publishedSlugs: PublishedSlugs;
    }
  | {
      type: "bobalab:overlay";
      v: 1;
      rev: number;
      entry: EntryRef;
      isNew: boolean;
      data: Record<string, unknown>;
    }
  | { type: "bobalab:overlay-clear"; v: 1; rev: number }
  /** "/uploads/x.jpg" → "data:image/jpeg;base64,…" */
  | { type: "bobalab:assets"; v: 1; assets: Record<string, string> }
  | { type: "bobalab:navigate"; v: 1; target: PreviewTarget }
  | { type: "bobalab:find"; v: 1 }
  | { type: "bobalab:parse"; v: 1; id: string; path: string; text: string }
  | {
      type: "bobalab:check";
      v: 1;
      id: string;
      entry: EntryRef;
      isNew: boolean;
      data: Record<string, unknown>;
    };

export type FromPreview =
  | { type: "bobalab:ready"; v: 1 }
  | {
      type: "bobalab:rendered";
      v: 1;
      rev: number;
      target: PreviewTarget;
      path: string;
      title: string;
      found: "page" | "marker" | "absent" | "not-found";
      problems: LiveProblems;
      renderError?: string;
    }
  | { type: "bobalab:navigated"; v: 1; target: PreviewTarget; path: string }
  | { type: "bobalab:parsed"; v: 1; id: string; ok: true; data: Record<string, unknown> }
  | { type: "bobalab:parsed"; v: 1; id: string; ok: false; error: string }
  | {
      type: "bobalab:checked";
      v: 1;
      id: string;
      available: boolean;
      blocking: PreviewIssue[];
      warnings: PreviewIssue[];
    }
  | { type: "bobalab:key"; v: 1; key: "save" };

// ---------------------------------------------------------------------------
// Runtime guards

export const DECAP_COLLECTIONS: readonly DecapCollection[] = [
  "news",
  "publications",
  "people",
  "directions",
  "projects",
  "opportunities",
  "pages",
  "settings",
];

export const PREVIEW_PAGES: readonly PreviewPage[] = [
  "home",
  "research",
  "direction",
  "projects",
  "project",
  "publications",
  "publication",
  "people",
  "person",
  "news",
  "news-item",
  "join",
  "about",
  "accessibility",
  "privacy",
];

/** Pages that show one entry and so need a slug. */
export const SLUG_PAGES: readonly PreviewPage[] = [
  "direction",
  "project",
  "publication",
  "person",
  "news-item",
];

type Obj = Record<string, unknown>;

/** A plain object (not an array, not null). */
export const isObject = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isOptString = (v: unknown) => v === undefined || isString(v);

export function isDecapCollection(v: unknown): v is DecapCollection {
  return isString(v) && (DECAP_COLLECTIONS as readonly string[]).includes(v);
}

export function isPreviewTarget(v: unknown): v is PreviewTarget {
  if (!isObject(v) || !isString(v.page)) return false;
  if (!(PREVIEW_PAGES as readonly string[]).includes(v.page)) return false;
  if ((SLUG_PAGES as readonly string[]).includes(v.page)) return isString(v.slug) && v.slug !== "";
  return isOptString(v.slug);
}

export function isEntryRef(v: unknown): v is EntryRef {
  return isObject(v) && isDecapCollection(v.collection) && isString(v.slug);
}

function isBaseEntry(v: unknown): v is BaseEntry {
  return isObject(v) && isString(v.slug) && isObject(v.data);
}

/**
 * A base: every key is a Decap collection whose value is a list of
 * {slug, data}. A collection that is missing counts as empty (the loader
 * then also reports `complete: false`).
 */
export function isPreviewBase(v: unknown): v is Partial<PreviewBase> {
  if (!isObject(v)) return false;
  return Object.entries(v).every(
    ([k, list]) =>
      isDecapCollection(k) &&
      (list === undefined || (Array.isArray(list) && list.every(isBaseEntry))),
  );
}

export function isPublishedSlugs(v: unknown): v is PublishedSlugs {
  if (v === null) return true;
  return (
    isObject(v) && Object.values(v).every((l) => Array.isArray(l) && l.every((s) => isString(s)))
  );
}

function isStringMap(v: unknown): v is Record<string, string> {
  return isObject(v) && Object.values(v).every(isString);
}

function isIssue(v: unknown): v is PreviewIssue {
  return (
    isObject(v) &&
    isString(v.code) &&
    isString(v.file) &&
    isOptString(v.field) &&
    isString(v.message)
  );
}
const isIssues = (v: unknown): v is PreviewIssue[] => Array.isArray(v) && v.every(isIssue);

function isLiveProblems(v: unknown): v is LiveProblems {
  return (
    isObject(v) &&
    isBool(v.available) &&
    isIssues(v.blocking) &&
    isIssues(v.warnings) &&
    isIssues(v.stillNeeded)
  );
}

/** A message the preview acts on (parent → preview). */
export function isToPreview(m: unknown): m is ToPreview {
  if (!isObject(m) || m.v !== PREVIEW_PROTOCOL || !isString(m.type)) return false;
  switch (m.type) {
    case "bobalab:mode":
      return isBool(m.visitor);
    case "bobalab:loading":
      return isNum(m.done) && isNum(m.total);
    case "bobalab:base":
      return isPreviewBase(m.base) && isBool(m.complete) && isPublishedSlugs(m.publishedSlugs);
    case "bobalab:overlay":
      return isNum(m.rev) && isEntryRef(m.entry) && isBool(m.isNew) && isObject(m.data);
    case "bobalab:overlay-clear":
      return isNum(m.rev);
    case "bobalab:assets":
      return isStringMap(m.assets);
    case "bobalab:navigate":
      return isPreviewTarget(m.target);
    case "bobalab:find":
      return true;
    case "bobalab:parse":
      return isString(m.id) && isString(m.path) && isString(m.text);
    case "bobalab:check":
      return isString(m.id) && isEntryRef(m.entry) && isBool(m.isNew) && isObject(m.data);
    default:
      return false;
  }
}

/** A message the parent acts on (preview → parent). */
export function isFromPreview(m: unknown): m is FromPreview {
  if (!isObject(m) || m.v !== PREVIEW_PROTOCOL || !isString(m.type)) return false;
  switch (m.type) {
    case "bobalab:ready":
      return true;
    case "bobalab:rendered":
      return (
        isNum(m.rev) &&
        isPreviewTarget(m.target) &&
        isString(m.path) &&
        isString(m.title) &&
        (m.found === "page" ||
          m.found === "marker" ||
          m.found === "absent" ||
          m.found === "not-found") &&
        isLiveProblems(m.problems) &&
        isOptString(m.renderError)
      );
    case "bobalab:navigated":
      return isPreviewTarget(m.target) && isString(m.path);
    case "bobalab:parsed":
      return (
        isString(m.id) && (m.ok === true ? isObject(m.data) : m.ok === false && isString(m.error))
      );
    case "bobalab:checked":
      return isString(m.id) && isBool(m.available) && isIssues(m.blocking) && isIssues(m.warnings);
    case "bobalab:key":
      return m.key === "save";
    default:
      return false;
  }
}
