/**
 * Test helpers for the editor-v2 Save scripts (public/admin/cms-{locale,guards,
 * save,layout}.js; WP5). Builds on github-helpers.ts (virtual clock, fake
 * storage, small fake DOM) and adds:
 *  - a fake Decap: CMS.registerEventListener/getLocale/registerLocale, the
 *    CMS.editor API (getCurrentEntry, onEditorChange), and a fake editor toolbar
 *    whose Save menu button behaves like Decap 3.17.1's (a click opens a menu
 *    whose first item, "Save now", persists; while persisting the button says
 *    "Saving…"; preSave handlers chain as in Decap's hg(); postSave is awaited;
 *    failures add an error toast, success a "Saved." toast);
 *  - events that pass the document's capture listeners first, as in a browser;
 *  - a fake MutationObserver (mutate() runs the callbacks), requestAnimationFrame
 *    on the virtual clock, window.confirm, and fakes for BobalabGitHub,
 *    BobalabHistory, BobalabLive and BobalabDock with call logs.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { FakeEvent, boot, flush, type FakeDocument, type FakeElement } from "./github-helpers";
import { FakeMap, ROOT, fromJS } from "./helpers";

export { FakeEvent, flush };
export type { FakeElement };

const BUNDLE_EN_MARKER = '{auth:{login:"Login",loggingIn:"Logging in...",';

let englishCache: Record<string, unknown> | null = null;

/** Decap's own English phrases, read from the vendored bundle (see locale.test.ts). */
export function bundleEnglish(): Record<string, unknown> {
  if (englishCache) return structuredClone(englishCache);
  const src = fs.readFileSync(path.join(ROOT, "public", "admin", "decap-cms.js"), "utf8");
  const start = src.indexOf(BUNDLE_EN_MARKER);
  if (start < 0) throw new Error("English phrases not found in decap-cms.js");
  let depth = 0;
  let quote: string | null = null;
  let i = start;
  for (; i < src.length; i++) {
    const c = src[i]!;
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) break;
  }
  englishCache = new Function(`return (${src.slice(start, i + 1)})`)() as Record<string, unknown>;
  return structuredClone(englishCache);
}

export interface Version {
  sha: string;
  parentSha?: string | null;
  date: string;
  author: { login: string | null; name: string; avatarUrl?: string | null };
  subject?: string;
  kind?: string;
}

export interface EditorEntry {
  collection: string;
  slug: string | null;
  newRecord: boolean;
  path: string | null;
  data: Record<string, unknown>;
  hasChanged: boolean;
  fields: Array<{
    name: string;
    label: string;
    widget?: string;
    /** An object's or a list's own fields; a pattern is [regex, message]. */
    fields?: Array<Record<string, unknown>>;
    pattern?: [string, string];
  }>;
  mediaFiles?: unknown[];
}

export interface SaveBoot {
  mode?: "github" | "local";
  hash?: string;
  entry?: Partial<EditorEntry> | null;
  /** BobalabHistory.latest(path) answers: a Version, null, an Error (rejects) or "hang". */
  latest?: (path: string) => Version | null | Error | "hang";
  /** BobalabLive.checkSave answer, or "hang", or null for "no BobalabLive". */
  check?: { available: boolean; blocking: unknown[]; warnings?: unknown[] } | "hang" | null;
  features?: Record<string, unknown>;
  confirmAnswer?: boolean;
  /** Decap's required-field check fails (no persist starts). */
  requiredMissing?: boolean;
  /**
   * Decap's check finds a value in the wrong format (a pattern): no persist
   * starts and, as in Decap 3.17.1, NO toast is shown (only the field is marked).
   */
  formatInvalid?: boolean;
  /** The commit fails with this message after the preSave checks pass. */
  commitError?: string;
  tipSeen?: boolean;
  me?: string;
  storage?: Record<string, string>;
  files?: string[];
  /** Load cms-layout.js as well. */
  layout?: boolean;
  phone?: boolean;
  /** No toolbar at first (an entry list). */
  noToolbar?: boolean;
  extra?: Record<string, unknown>;
}

export const T0 = Date.parse("2026-10-26T20:00:00Z");

/**
 * The same SHA-256 as the browser's crypto.subtle.digest, settled in a
 * microtask. Node's own runs on its thread pool and, on a busy machine, can
 * outlast the virtual clock's flush rounds, so a Save would still be checking
 * names when the test looks (MEASURED: 1 run in 5 of the whole cms folder).
 */
const syncSubtle = {
  digest: async (_alg: string, data: ArrayBufferView | ArrayBuffer) => {
    const bytes =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const h = createHash("sha256").update(bytes).digest();
    return h.buffer.slice(h.byteOffset, h.byteOffset + h.byteLength);
  },
};
export const SHA = (c: string) => c.repeat(40);

export function version(o: Partial<Version> & { login?: string; at?: number }): Version {
  return {
    sha: o.sha ?? SHA("a"),
    parentSha: o.parentSha ?? SHA("0"),
    date: o.date ?? new Date(T0 + (o.at ?? 0) * 1000).toISOString(),
    author: o.author ?? {
      login: o.login === undefined ? "icho" : o.login,
      name: o.login === "ada-editor" ? "Ada Editor" : "Isabelle Cho",
      avatarUrl: null,
    },
    subject: o.subject ?? "Edit News item “x”",
    kind: o.kind ?? "edit",
  };
}

const NEWS_FIELDS = [
  { name: "date", label: "Date", widget: "datetime" },
  { name: "title", label: "Title", widget: "string" },
  { name: "summary", label: "Summary", widget: "text" },
  { name: "image", label: "Image", widget: "object" },
  { name: "draft", label: "Draft · pending lab review", widget: "boolean" },
  { name: "body", label: "Body", widget: "richtext" },
];

export function bootSave(o: SaveBoot = {}) {
  const entryState: EditorEntry | null =
    o.entry === null
      ? null
      : {
          collection: "news",
          slug: "2026-10-07-informs-talk",
          newRecord: false,
          path: "content/news/2026-10-07-informs-talk.md",
          data: { title: "INFORMS talk", date: "2026-10-07", type: "talk", draft: false },
          hasChanged: false,
          fields: NEWS_FIELDS,
          mediaFiles: [],
          ...(o.entry ?? {}),
        };
  let entry = entryState;
  const editorFns: Array<(e: unknown) => void> = [];
  const events: Array<{ name: string; handler: (a: unknown) => unknown }> = [];
  const locales: Record<string, unknown> = { en: bundleEnglish() };
  const log = {
    persisted: 0,
    attempts: 0,
    preSaveErrors: [] as string[],
    confirms: [] as string[],
    latest: [] as string[],
    checks: [] as unknown[],
    docked: [] as Array<Record<string, unknown>>,
    merges: [] as unknown[],
    announced: [] as string[],
    eyeClicks: 0,
  };
  const observers: Array<() => void> = [];
  class FakeMutationObserver {
    constructor(private fn: () => void) {}
    observe() {
      observers.push(this.fn);
    }
    disconnect() {}
  }
  const history = {
    pathOf: (c: string, slug: string) => {
      if (!slug) return null;
      if (c === "pages") return `content/pages/${slug}.yml`;
      if (c === "settings") return "content/site.yml";
      return `content/${c}/${slug}.md`;
    },
    entryOfPath: (p: string) => {
      const m = /^content\/([^/]+)\/(.+)\.md$/.exec(p);
      if (!m) return null;
      const label = m[1] === "news" ? "News item" : m[1] === "projects" ? "Project" : m[1];
      return {
        collection: m[1],
        slug: m[2],
        label,
        name: `${label} “${m[2]}”`,
        text: `${label} › ${m[2]}`,
        path: p,
      };
    },
    latest: (p: string) => {
      log.latest.push(p);
      const a = o.latest ? o.latest(p) : null;
      if (a === "hang") return new Promise(() => {});
      if (a instanceof Error) return Promise.reject(a);
      return Promise.resolve(a);
    },
  };
  const liveCheck =
    o.check === undefined ? { available: true, blocking: [], warnings: [] } : o.check;
  const live =
    liveCheck === null
      ? undefined
      : {
          checkSave: (req: unknown) => {
            log.checks.push(req);
            if (liveCheck === "hang") return new Promise(() => {});
            return Promise.resolve(structuredClone(liveCheck));
          },
          viewTarget: (c: string, slug: string, data: Record<string, unknown>) =>
            data.draft
              ? { state: "hidden", reason: "draft" }
              : { state: "live", path: `/${c}/${slug}/` },
          formatIssue: (i: { file: string; field?: string; message: string }) =>
            `${i.file}${i.field ? " › " + i.field : ""}: ${i.message}`,
          mergeLatest: (req: unknown) => {
            log.merges.push(req);
            return Promise.resolve({ ok: true, applied: ["title"], conflicts: [] });
          },
          whenReady: () => Promise.resolve(true),
          current: () =>
            entry
              ? {
                  collection: entry.collection,
                  slug: entry.slug,
                  path: entry.path,
                  isNew: entry.newRecord,
                }
              : null,
        };
  const dock = {
    saved: (info: Record<string, unknown>) => {
      log.docked.push(info);
      // Like cms-dock.js: its toast is up synchronously inside saved().
      const d = env.document!;
      let box = d.getElementById("bl-toasts");
      if (!box) {
        box = d.createElement("div");
        box.id = "bl-toasts";
        d.body.appendChild(box);
      }
      const t = d.createElement("div");
      t.className = "bl-toast";
      t.textContent = "Saved. The live site updates in about 2 minutes.";
      box.appendChild(t);
    },
  };
  const me = o.me ?? "ada-editor";
  const github = {
    mode: () => o.mode ?? "github",
    user: () => ({ login: me, name: "Ada Editor", token: "t" }),
  };
  const CMS = {
    registerEventListener: (l: { name: string; handler: (a: unknown) => unknown }) =>
      events.push(l),
    getLocale: (l: string) => locales[l],
    registerLocale: (l: string, p: unknown) => (locales[l] = p),
    editor: {
      getCurrentEntry: () => (entry ? structuredClone(entry) : null),
      onEditorChange: (fn: (e: unknown) => void) => {
        editorFns.push(fn);
        return () => editorFns.splice(editorFns.indexOf(fn), 1);
      },
    },
  };
  const confirmFn = (m: string) => {
    log.confirms.push(m);
    return o.confirmAnswer ?? true;
  };
  const storage: Record<string, string> = { ...(o.storage ?? {}) };
  if (o.tipSeen !== false) storage["bobalab.saveTip.v1"] = "1";
  const matchMedia = (q: string) => ({
    matches: /max-width: 799px/.test(q) ? !!o.phone : false,
    addEventListener: () => {},
  });
  const files = o.files ?? [
    "cms-data.js",
    "cms-hooks.js",
    "cms-locale.js",
    "cms-ui.js",
    "cms-guards.js",
    "cms-save.js",
    ...(o.layout ? ["cms-layout.js"] : []),
  ];
  // The toolbar must exist before the scripts start, as Decap renders it later anyway.
  const pre = boot({
    files: [],
    mode: o.mode,
    hash:
      o.hash ??
      (entry
        ? `#/collections/${entry.collection}/${entry.newRecord ? "new" : "entries/" + entry.slug}`
        : "#/collections/news"),
    extra: {
      CMS,
      BobalabHistory: history,
      BobalabGitHub: github,
      ...(live ? { BobalabLive: live } : {}),
      BobalabDock: dock,
      MutationObserver: FakeMutationObserver,
      confirm: confirmFn,
      crypto: { subtle: syncSubtle },
      TextEncoder,
      structuredClone,
      innerWidth: o.phone ? 375 : 1366,
      matchMedia,
      ...(o.extra ?? {}),
    },
  });
  const env = pre;
  const win = env.win as Record<string, unknown>;
  win.requestAnimationFrame = (fn: () => void) => env.clock.setTimeout(fn, 16);
  for (const [k, v] of Object.entries(storage)) env.local.setItem(k, v);
  const document = env.document as FakeDocument & { documentElement?: FakeElement };
  document.documentElement = document.createElement("html");

  // ---- Events through the document's capture listeners, then the target
  function dispatch(target: FakeElement, type: string, init: Record<string, unknown> = {}) {
    const { key, ...rest } = init as { key?: string };
    const e = new FakeEvent(type, { bubbles: true, key });
    Object.assign(e, rest);
    e.target = target;
    for (const fn of [...(document.listeners.get(type) ?? [])]) {
      fn(e);
      if (e.propagationStopped) return e;
    }
    // FakeElement.dispatchEvent resets target to itself; keep the same event.
    target.dispatchEvent(e);
    return e;
  }
  function make(tag: string, cls = "", text = "") {
    const el = document.createElement(tag);
    if (cls) el.setAttribute("class", cls);
    if (text) el.textContent = text;
    el.click = () => {
      dispatch(el, "click");
    };
    return el;
  }

  // ---- The fake Decap toolbar and form
  const toolbar = make("div", "css-1-ToolbarContainer");
  const main = make("div", "css-2-ToolbarSectionMain");
  const first = make("div", "css-3-ToolbarSubSectionFirst");
  const last = make("div", "css-4-ToolbarSubSectionLast");
  main.appendChild(first);
  main.appendChild(last);
  toolbar.appendChild(main);
  const form = make("div", "css-9-ControlPaneContainer");
  const titleInput = make("input");
  titleInput.setAttribute("id", "title-field-3");
  form.appendChild(titleInput);
  const toasts = make("div", "Toastify__toast-container");
  document.body.appendChild(toolbar);
  document.body.appendChild(form);
  document.body.appendChild(toasts);

  const state = {
    open: false,
    persisting: false,
    menuItems: true,
    requiredMissing: !!o.requiredMissing,
    formatInvalid: !!o.formatInvalid,
    commitError: o.commitError ?? null,
  };
  let dd: FakeElement | null = null;
  let btn: FakeElement | null = null;
  let saved: FakeElement | null = null;

  function label() {
    const en = (locales.en as Record<string, Record<string, Record<string, string>>>).editor!
      .editorToolbar!;
    return state.persisting ? en.publishing! : en.publish!;
  }

  function renderToolbar() {
    first.textContent = "";
    dd = null;
    btn = null;
    saved = null;
    if (!entry) return;
    if (entry.newRecord || entry.hasChanged || state.persisting) {
      const wrap = make("div");
      dd = make("div", "css-5-ToolbarDropdown");
      const source = make("div");
      btn = make("span", "css-6-DropdownButton css-7-PublishButton", label());
      btn.setAttribute("role", "button");
      btn.setAttribute("tabindex", "0");
      btn.setAttribute("aria-haspopup", "true");
      btn.setAttribute("aria-expanded", String(state.open));
      btn.addEventListener("click", () => toggle());
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle(true);
        }
      });
      source.appendChild(btn);
      dd.appendChild(source);
      if (state.open && state.menuItems) {
        const menu = make("div");
        menu.setAttribute("role", "menu");
        for (const [i, t] of ["Save now", "Save and add another", "Save and duplicate"].entries()) {
          const item = make("div", "css-8-StyledMenuItem", t);
          item.setAttribute("role", "menuitem");
          item.setAttribute("tabindex", "-1");
          item.addEventListener("click", () => select(i));
          item.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              select(i);
            }
          });
          menu.appendChild(item);
        }
        dd.appendChild(menu);
      } else if (state.open) {
        const menu = make("div");
        menu.setAttribute("role", "menu");
        dd.appendChild(menu);
      }
      wrap.appendChild(dd);
      first.appendChild(wrap);
    } else {
      saved = make("span", "css-10-PublishedToolbarButton", "Saved");
      first.appendChild(saved);
    }
  }

  function toggle(focusMenu = false) {
    state.open = !state.open;
    renderToolbar();
    if (state.open && focusMenu && dd) dd.querySelector('[role="menuitem"]')?.focus();
  }

  function select(i: number) {
    state.open = false;
    renderToolbar();
    if (i >= 0) void persist();
  }

  function toast(kind: "error" | "success", text: string) {
    const t = make("div", `Toastify__toast Toastify__toast--${kind}`);
    const body = make("div", "Toastify__toast-body", text);
    t.appendChild(body);
    toasts.appendChild(t);
    return t;
  }

  /** Like Decap's persistEntry: required fields, then preSave (chained), commit, postSave. */
  async function persist() {
    log.attempts++;
    if (state.formatInvalid) {
      mutate(); // Decap marks the field in red; there is no toast
      return;
    }
    if (state.requiredMissing) {
      toast("error", "Not saved: a required field is empty. It is marked in red.");
      mutate();
      return;
    }
    state.persisting = true;
    renderToolbar();
    mutate();
    await Promise.resolve();
    const cur = entry!;
    let imm = fromJS({
      collection: cur.collection,
      slug: cur.newRecord ? "" : cur.slug,
      path: cur.path ?? "",
      newRecord: cur.newRecord,
      data: cur.data,
      mediaFiles: cur.mediaFiles ?? [],
    }) as FakeMap;
    const author = { login: me, name: "Ada Editor" };
    try {
      for (const ev of events.filter((x) => x.name === "preSave")) {
        const out = await ev.handler({ entry: imm, author });
        if (out !== undefined) {
          imm = new FakeMap(imm.entries.map(([k, v]) => [k, k === "data" ? out : v]));
        }
      }
      if (state.commitError) throw new Error(state.commitError);
    } catch (err) {
      log.preSaveErrors.push(String((err as Error).message));
      state.persisting = false;
      renderToolbar();
      toast("error", `Error: ${(err as Error).message}`);
      mutate();
      return;
    }
    log.persisted++;
    for (const ev of events.filter((x) => x.name === "postSave"))
      await ev.handler({ entry: imm, author });
    state.persisting = false;
    if (cur.newRecord) {
      const slug = String((cur.data.title as string) ?? "new")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const s = `2026-10-26-${slug}`;
      entry = {
        ...cur,
        newRecord: false,
        slug: s,
        path: `content/news/${s}.md`,
        hasChanged: false,
      };
      env.location.hash = `#/collections/news/entries/${s}`;
    } else entry = { ...cur, hasChanged: false };
    renderToolbar();
    toast("success", "Saved.");
    emitEditor();
    mutate();
  }

  function mutate() {
    for (const fn of [...observers]) fn();
  }
  function emitEditor() {
    const e = entry ? structuredClone(entry) : null;
    for (const fn of [...editorFns]) fn(e);
  }
  /** Change the open entry (an edit, another entry, a new one), as Decap does. */
  function setEntry(next: Partial<EditorEntry> | null) {
    entry = next === null ? null : ({ ...(entry ?? entryState!), ...next } as EditorEntry);
    renderToolbar();
    emitEditor();
    mutate();
  }

  if (!o.noToolbar) renderToolbar();
  for (const f of files) {
    vm.runInContext(
      fs.readFileSync(path.join(ROOT, "public", "admin", f), "utf8"),
      env.win as never,
      {
        filename: f,
      },
    );
  }
  if (entry) emitEditor();

  const save = win.BobalabSave as {
    saveNow: () => Promise<string>;
    onSaved: (fn: (e: unknown) => void) => () => void;
    isSaving: () => boolean;
    baseline: (p: string) => string | null;
    setBaseline: (p: string, sha: string) => void;
    ownShas: () => Set<string>;
    refuse: (m: string, o?: unknown) => void;
    saveNote: (c: string, d: unknown) => string;
    _options: Record<string, unknown>;
    _state: Record<string, unknown>;
    _conflictDecision: (o: unknown) => {
      ok: boolean;
      adopt?: string;
      self?: boolean;
      message?: string;
    };
    _newEntryDecision: (v: unknown, now?: number) => { ok: boolean; message?: string };
    _refusalText: (t: string) => string;
    _fallbackView: (c: string, s: string, d: unknown) => unknown;
  };
  const ui = win.BobalabUi as { announce: (t: string) => void } | undefined;
  if (ui) {
    const orig = ui.announce;
    ui.announce = (t: string) => {
      log.announced.push(t);
      orig(t);
    };
  }

  return {
    env,
    win,
    document,
    clock: env.clock,
    log,
    save,
    state,
    dispatch,
    make,
    mutate,
    setEntry,
    entry: () => entry,
    toolbar: { main, first, last },
    form,
    toasts,
    /** Decap's Save menu button, the "Saved" button, the dropdown. */
    btn: () => btn,
    savedBtn: () => saved,
    dd: () => dd,
    click: (el: FakeElement | null) => {
      if (!el) throw new Error("no element to click");
      return dispatch(el, "click");
    },
    key: (el: FakeElement, key: string, mods: Record<string, unknown> = {}) =>
      dispatch(el, "keydown", { key, ...mods }),
    band: () => document.getElementById("bl-refusal"),
    note: () => document.getElementById("bl-save-note"),
    /** Let timers (rAF, the menu pick, checks) run for `ms` of virtual time. */
    run: (ms = 2000) => env.clock.advance(ms),
  };
}
