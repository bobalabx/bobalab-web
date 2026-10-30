/**
 * Test helpers for public/admin/cms-live.js (editor v2, WP4): a Node vm
 * sandbox that runs cms-data.js, cms-hooks.js, cms-history.js and cms-live.js
 * with fakes for everything else (no jsdom, no network):
 *  - Decap's globals: CMS (templates, styles, CMS.editor), h, createClass;
 *  - BobalabGitHub (GET answers from a handler), BobalabUi, BobalabSave,
 *    BobalabLayout, BobalabDeploy;
 *  - a virtual clock, localStorage/sessionStorage;
 *  - Decap's preview frame and the site frame inside it: what cms-live.js
 *    posts to the site frame is recorded, and a fake preview can answer
 *    `parse` (with the site's own parseFileData) and `check`.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { parseFileData } from "@/lib/content/parse";
import { FakeList, FakeMap, ROOT, fromJS } from "./helpers";

export { FakeList, FakeMap, fromJS };

export const ORIGIN = "http://localhost:3100";
export const T0 = Date.parse("2026-10-26T20:00:00Z");

/** Let pending promises settle (the sandbox shares this realm's microtask queue). */
export async function flush(rounds = 20) {
  for (let i = 0; i < rounds; i++) await new Promise((r) => setImmediate(r));
}

interface Timer {
  id: number;
  at: number;
  fn: () => void;
  every?: number;
}

export class Clock {
  t: number;
  private timers: Timer[] = [];
  private next = 1;
  readonly Date: DateConstructor;
  constructor(start = T0) {
    this.t = start;
    const now = () => this.t;
    class FakeDate extends Date {
      constructor(...args: unknown[]) {
        if (args.length) super(...(args as [string]));
        else super(now());
      }
      static now() {
        return now();
      }
    }
    this.Date = FakeDate as unknown as DateConstructor;
  }
  setTimeout = (fn: () => void, ms = 0) => {
    const id = this.next++;
    this.timers.push({ id, at: this.t + Math.max(0, Number(ms) || 0), fn });
    return id;
  };
  clearTimeout = (id: number) => {
    this.timers = this.timers.filter((t) => t.id !== id);
  };
  setInterval = (fn: () => void, ms = 0) => {
    const id = this.next++;
    const every = Math.max(1, Number(ms) || 0);
    this.timers.push({ id, at: this.t + every, fn, every });
    return id;
  };
  clearInterval = (id: number) => this.clearTimeout(id);
  /** Move time on, running due timers in order and settling promises after each. */
  async advance(ms: number) {
    const end = this.t + ms;
    await flush();
    for (;;) {
      const due = this.timers
        .filter((t) => t.at <= end)
        .sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      this.t = Math.max(this.t, due.at);
      if (due.every) due.at += due.every;
      else this.timers = this.timers.filter((t) => t !== due);
      due.fn();
      await flush();
    }
    this.t = end;
    await flush();
  }
}

export class Store {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

// ---------------------------------------------------------------------------
// Decap's render output (h) and the frames

/** Props of a rendered element: anything, plus the event handlers the tests call. */
export type NodeProps = Record<string, unknown> & {
  onClick?: (e?: unknown) => void;
  onChange?: (e: unknown) => void;
  onKeyDown?: (e: unknown) => void;
};

export interface Node {
  type: unknown;
  props: NodeProps;
  children: unknown[];
}

export const h = (
  type: unknown,
  props: Record<string, unknown> | null,
  ...children: unknown[]
) => ({
  type,
  props: (props ?? {}) as NodeProps,
  children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false),
});

export function textOf(node: unknown): string {
  if (node === null || node === undefined || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return ((node as Node).children ?? []).map(textOf).join("");
}

export function findAll(node: unknown, pred: (n: Node) => boolean): Node[] {
  const out: Node[] = [];
  const walk = (x: unknown) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) return x.forEach(walk);
    const n = x as Node;
    if (pred(n)) out.push(n);
    (n.children ?? []).forEach(walk);
  };
  walk(node);
  return out;
}

/** The button whose text (or aria-label) matches. */
export function button(tree: unknown, name: string | RegExp): Node | undefined {
  return findAll(tree, (n) => {
    if (n.type !== "button") return false;
    const t = textOf(n);
    const l = String(n.props["aria-label"] ?? "");
    return typeof name === "string" ? t === name || l === name : name.test(t) || name.test(l);
  })[0];
}

export class FakeEl {
  attrs: Record<string, string> = {};
  style: Record<string, string> = {};
  children: FakeEl[] = [];
  className = "";
  src = "";
  contentWindow: {
    postMessage: (msg: Record<string, unknown> & { type: string }, origin: string) => void;
  } | null = null;
  rect = { width: 900, height: 700 };
  constructor(readonly tagName: string) {}
  appendChild(c: FakeEl) {
    this.children.push(c);
    return c;
  }
  setAttribute(k: string, v: unknown) {
    this.attrs[k] = String(v);
  }
  getAttribute(k: string) {
    return k in this.attrs ? this.attrs[k]! : null;
  }
  getBoundingClientRect() {
    return this.rect;
  }
}

export interface Posted {
  msg: Record<string, unknown> & { type: string };
  origin: string;
}

// ---------------------------------------------------------------------------
// The sandbox

export interface Editor {
  collection: string;
  slug: string | null;
  newRecord?: boolean;
  data: Record<string, unknown>;
  fields: Array<Record<string, unknown>>;
  hasChanged?: boolean;
  path?: string | null;
}

export interface GitHubAnswer {
  status?: number;
  data?: unknown;
  link?: { next?: string };
}

export interface BootOptions {
  mode?: "github" | "local";
  login?: string | null;
  github?: (path: string, opts: { accept?: string }) => GitHubAnswer | Promise<GitHubAnswer>;
  editor?: Editor | null;
  confirm?: (opts: Record<string, unknown>) => { ok: boolean; checked?: Record<string, boolean> };
  saveNow?: () => string;
  layoutShown?: boolean;
  hash?: string;
  session?: Record<string, string>;
  local?: Record<string, string>;
  site?: { liveAt: string | null } | null;
  /**
   * Decap's own copy of the entry is the version from before this editor's last
   * save (MEASURED: its `entries` store is not updated by a save), so a patch
   * back to those values leaves hasChanged false.
   */
  staleCopy?: Record<string, unknown> | null;
}

function sortKeys(o: Record<string, unknown>) {
  return Object.fromEntries(
    Object.keys(o)
      .sort()
      .map((k) => [k, o[k]]),
  );
}

export function boot(o: BootOptions = {}) {
  const clock = new Clock();
  const local = new Store();
  const session = new Store();
  for (const [k, v] of Object.entries(o.local ?? {})) local.setItem(k, v);
  for (const [k, v] of Object.entries(o.session ?? {})) session.setItem(k, v);
  const reg = {
    templates: {} as Record<string, unknown>,
    styles: [] as string[],
  };
  const state = {
    editor: o.editor === undefined ? null : o.editor,
    patches: [] as Array<Array<{ path: string; value: unknown }>>,
    editorListeners: [] as Array<(e: unknown) => void>,
    saves: 0,
    savedListeners: [] as Array<(e: Record<string, unknown>) => void>,
    saving: false,
    baselines: {} as Record<string, string>,
    setBaselines: [] as Array<[string, string]>,
    confirms: [] as Array<Record<string, unknown>>,
    toasts: [] as Array<Record<string, unknown>>,
    announced: [] as string[],
    shown: 0,
    layoutShown: o.layoutShown ?? true,
    stale: (o.staleCopy ?? null) as Record<string, unknown> | null,
    github: [] as string[],
    opened: [] as string[],
  };
  const location = {
    hash: o.hash ?? "",
    origin: ORIGIN,
    get href() {
      return ORIGIN + "/admin/index.html" + (this.hash || "");
    },
  };
  const ghFake = {
    mode: () => o.mode ?? "github",
    repo: () => "bobalabx/bobalab-web",
    branch: () => "main",
    user: () =>
      o.login === null ? null : { login: o.login ?? "ada-editor", name: "Ada Editor", token: "t" },
    signedIn: () => true,
    encodePath: (p: string) => p.split("/").map(encodeURIComponent).join("/"),
    get: async (p: string, opts: { accept?: string } = {}) => {
      state.github.push(decodeURIComponent(p));
      const handler: NonNullable<BootOptions["github"]> = o.github ?? (() => ({ status: 404 }));
      const a = await handler(decodeURIComponent(p), opts);
      if ((a.status ?? 200) === 404) {
        const e = Object.assign(new Error("GitHub has no such file or page."), {
          name: "GitHubError",
          kind: "not-found",
          status: 404,
        });
        throw e;
      }
      if ((a.status ?? 200) >= 400) {
        throw Object.assign(new Error("GitHub answered with an error."), {
          name: "GitHubError",
          kind: "http",
          status: a.status,
        });
      }
      return { status: a.status ?? 200, data: a.data, headers: {}, link: a.link ?? {} };
    },
  };
  const uiFake = {
    confirm: async (opts: Record<string, unknown>) => {
      state.confirms.push(opts);
      const r = o.confirm ? o.confirm(opts) : { ok: true, checked: {} };
      return { ok: r.ok, checked: r.checked ?? {} };
    },
    toast: (opts: Record<string, unknown>) => {
      state.toasts.push(opts);
      return { close() {} };
    },
    announce: (t: string) => state.announced.push(t),
    fullTime: (iso: string, opts?: { zone?: boolean }) =>
      iso ? (opts && opts.zone === false ? `FULL(${iso})` : `FULLZ(${iso})`) : "",
    shortDate: (iso: string) => (iso ? `DATE(${String(iso).slice(0, 10)})` : ""),
    clock: (iso: string) => (iso ? `CLOCK(${iso})` : ""),
    timeAgo: (iso: string) => (iso ? `AGO(${iso})` : ""),
  };
  const saveFake = {
    saveNow: async () => {
      state.saves += 1;
      const r = o.saveNow ? o.saveNow() : "started";
      if (r === "started") state.saving = true;
      return r;
    },
    onSaved: (fn: (e: Record<string, unknown>) => void) => {
      state.savedListeners.push(fn);
      return () => {
        state.savedListeners = state.savedListeners.filter((f) => f !== fn);
      };
    },
    isSaving: () => state.saving,
    baseline: (p: string) => state.baselines[p] ?? null,
    setBaseline: (p: string, sha: string) => {
      state.setBaselines.push([p, sha]);
      state.baselines[p] = sha;
    },
    ownShas: () => new Set<string>(),
  };
  const layoutFake = {
    isLivePaneShown: () => state.layoutShown,
    showLivePane: async () => {
      state.shown += 1;
      state.layoutShown = true;
      return true;
    },
  };
  const deployFake = {
    lastSite: () => (o.site === undefined ? null : o.site),
    site: async () => o.site ?? { ok: true, updating: false, liveSha: null, liveAt: null },
  };
  const editorFake = {
    getCurrentEntry: () => (state.editor ? JSON.parse(JSON.stringify(state.editor)) : null),
    applyFieldPatch: (patches: Array<{ path: string; value: unknown }>) => {
      state.patches.push(JSON.parse(JSON.stringify(patches)));
      const applied: string[] = [];
      const rejected: Array<{ path: string; reason: string }> = [];
      for (const p of patches) {
        const f = state.editor?.fields.find((x) => x.name === p.path);
        if (!f) rejected.push({ path: p.path, reason: "no such field" });
        else if (f.widget === "hidden")
          rejected.push({ path: p.path, reason: "hidden fields cannot be edited" });
        else {
          applied.push(p.path);
          state.editor!.data[p.path] = JSON.parse(JSON.stringify(p.value));
          state.editor!.hasChanged = state.stale
            ? JSON.stringify(sortKeys(state.editor!.data)) !== JSON.stringify(sortKeys(state.stale))
            : true;
        }
      }
      return { applied, rejected };
    },
    onEditorChange: (fn: (e: unknown) => void) => {
      state.editorListeners.push(fn);
      return () => {
        state.editorListeners = state.editorListeners.filter((f) => f !== fn);
      };
    },
  };
  class FakeReader {
    result: string | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    error: unknown = null;
    readAsDataURL(file: { type?: string; body?: string }) {
      Promise.resolve().then(() => {
        this.result = `data:${file.type || "image/png"};base64,${Buffer.from(file.body ?? "x").toString("base64")}`;
        this.onload?.();
      });
    }
  }
  const winListeners = new Map<string, Array<(e: unknown) => void>>();
  const win: Record<string, unknown> = {
    localStorage: local,
    sessionStorage: session,
    location,
    URL,
    console,
    Date: clock.Date,
    Promise,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    setInterval: clock.setInterval,
    clearInterval: clock.clearInterval,
    FileReader: FakeReader,
    document: { baseURI: ORIGIN + "/admin/index.html", querySelector: () => null },
    open: (url: string) => state.opened.push(url),
    addEventListener: (t: string, fn: (e: unknown) => void) =>
      winListeners.set(t, [...(winListeners.get(t) ?? []), fn]),
    removeEventListener: (t: string, fn: (e: unknown) => void) =>
      winListeners.set(
        t,
        (winListeners.get(t) ?? []).filter((f) => f !== fn),
      ),
    h,
    createClass: (spec: Record<string, unknown>) => ({ __spec: spec }),
    CMS: {
      registerPreviewTemplate: (n: string, c: unknown) => (reg.templates[n] = c),
      registerPreviewStyle: (s: string) => reg.styles.push(s),
      registerEventListener: () => {},
      editor: editorFake,
    },
    BobalabGitHub: ghFake,
    BobalabUi: uiFake,
    BobalabSave: saveFake,
    BobalabLayout: layoutFake,
    BobalabDeploy: deployFake,
  };
  win.window = win;
  win.top = win;
  const ctx = vm.createContext(win);
  for (const f of ["cms-data.js", "cms-hooks.js", "cms-history.js", "cms-live.js"]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, "public", "admin", f), "utf8"), ctx, {
      filename: f,
    });
  }
  const live = win.BobalabLive as Live;

  // Decap's preview frame and the site frame cms-live.js creates in it.
  const posted: Posted[] = [];
  const frameWin = {
    postMessage: (msg: Record<string, unknown> & { type: string }, origin: string) => {
      posted.push({ msg: JSON.parse(JSON.stringify(msg)), origin });
      preview.onPost(msg);
    },
  };
  const frameListeners = new Map<string, Array<(e: unknown) => void>>();
  const doc = {
    createElement: (tag: string) => {
      const el = new FakeEl(tag);
      if (tag === "iframe") el.contentWindow = frameWin;
      return el;
    },
    querySelector: () => null,
  };
  const pwin = {
    addEventListener: (t: string, fn: (e: unknown) => void) =>
      frameListeners.set(t, [...(frameListeners.get(t) ?? []), fn]),
    removeEventListener: (t: string, fn: (e: unknown) => void) =>
      frameListeners.set(
        t,
        (frameListeners.get(t) ?? []).filter((f) => f !== fn),
      ),
  };

  /** A fake preview: answers parse with the site's parseFileData, check with `checkAnswer`. */
  const preview = {
    autoParse: true,
    checkAnswer: null as null | ((msg: Record<string, unknown>) => Record<string, unknown> | null),
    onPost(msg: Record<string, unknown> & { type: string }) {
      if (msg.type === "bobalab:parse" && this.autoParse) {
        const r = parseFileData(String(msg.path), String(msg.text));
        Promise.resolve().then(() =>
          send(
            r.ok
              ? { type: "bobalab:parsed", v: 1, id: msg.id, ok: true, data: r.data }
              : { type: "bobalab:parsed", v: 1, id: msg.id, ok: false, error: r.error },
          ),
        );
      }
      if (msg.type === "bobalab:check" && this.checkAnswer) {
        const a = this.checkAnswer(msg);
        if (a)
          Promise.resolve().then(() => send({ type: "bobalab:checked", v: 1, id: msg.id, ...a }));
      }
    },
  };

  /** A message from the site frame, as the browser delivers it to Decap's preview frame. */
  function send(data: Record<string, unknown>, extra: { origin?: string; source?: unknown } = {}) {
    const e = {
      data,
      origin: extra.origin ?? ORIGIN,
      source: "source" in extra ? extra.source : frameWin,
    };
    for (const fn of [...(frameListeners.get("message") ?? [])]) fn(e);
  }

  /** Mount the live column for an entry (Decap's props), as React would. */
  function mount(entry: FakeMap, more: Record<string, unknown> = {}) {
    const spec = (live._LiveColumn as unknown as { __spec: Column }).__spec;
    const clip = new FakeEl("div");
    const inst: Instance = {
      props: { entry, fieldsMetaData: fromJS({}), window: pwin, document: doc, ...more },
      state: spec.getInitialState(),
      renders: 0,
      setState(next: Record<string, unknown>) {
        const prev = { props: this.props, state: this.state };
        const nextState = { ...this.state, ...next };
        const go = spec.shouldComponentUpdate.call(this, this.props, nextState);
        this.state = nextState;
        if (go) {
          this.tree = spec.render.call(this);
          this.renders += 1;
          spec.componentDidUpdate.call(this, prev.props, prev.state);
        }
      },
      tree: null,
    };
    inst.tree = spec.render.call(inst);
    // React attaches refs before componentDidMount.
    findAll(inst.tree, (n) => n.props.id === "bl-live-site").forEach((n) => {
      (n.props.ref as (el: unknown) => void)(clip);
    });
    spec.componentDidMount.call(inst);
    const update = (next: Record<string, unknown>) => {
      const prevProps = inst.props;
      const nextProps = { ...inst.props, ...next };
      if (spec.shouldComponentUpdate.call(inst, nextProps, inst.state)) {
        inst.props = nextProps;
        inst.tree = spec.render.call(inst);
        inst.renders += 1;
        spec.componentDidUpdate.call(inst, prevProps, inst.state);
      } else inst.props = nextProps;
    };
    const unmount = () => spec.componentWillUnmount.call(inst);
    const frame = clip.children[0];
    return { inst, clip, frame, update, unmount, spec };
  }

  /** Tell the sandbox's editor listeners about a change (CMS.editor.onEditorChange). */
  function editorChanged() {
    for (const fn of [...state.editorListeners])
      fn(state.editor ? JSON.parse(JSON.stringify(state.editor)) : null);
  }

  /** Finish a save started with saveNow(): `saved` calls the onSaved listeners. */
  function finishSave(saved: boolean, p?: string) {
    state.saving = false;
    if (saved) for (const fn of [...state.savedListeners]) fn({ path: p ?? null });
  }

  const types = () => posted.map((p) => p.msg.type);
  /** The newest message of a type that cms-live.js posted to the site frame. */
  const last = (type: string): unknown =>
    [...posted].reverse().find((p) => p.msg.type === type)?.msg;

  return {
    win,
    live,
    clock,
    state,
    reg,
    local,
    session,
    location,
    posted,
    types,
    last,
    send,
    preview,
    mount,
    editorChanged,
    finishSave,
    frameListeners,
    winListeners,
  };
}

export interface Column {
  getInitialState(): Record<string, unknown>;
  shouldComponentUpdate(this: Instance, p: Record<string, unknown>, s: unknown): boolean;
  componentDidMount(this: Instance): void;
  componentDidUpdate(this: Instance, p: Record<string, unknown>, s: unknown): void;
  componentWillUnmount(this: Instance): void;
  render(this: Instance): Node;
}

export interface Instance {
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  setState(next: Record<string, unknown>): void;
  tree: Node | null;
  renders: number;
}

type Fn = (...args: unknown[]) => unknown;
/** window.BobalabLive as the tests use it. */
export interface Live {
  current: Fn;
  whenReady: Fn;
  checkSave: Fn;
  parse: Fn;
  viewTarget: Fn;
  formatIssue: Fn;
  openHistory: Fn;
  restoreVersion: Fn;
  mergeLatest: Fn;
  _buildRestorePatch: Fn;
  _merge3: Fn;
  _applyPatches: Fn;
  _deviceBox: Fn;
  _effectiveDevice: Fn;
  _tabsFor: Fn;
  _overlayMessage: Fn;
  _identityOf: Fn;
  _assetCandidates: Fn;
  _assetsMap: Fn;
  _publicPathOf: Fn;
  _emptyFor: Fn;
  _maskFor: Fn;
  _consentSummary: Fn;
  _colourUse: Fn;
  _shouldUpdate: Fn;
  _loadBase: Fn;
  _receive: Fn;
  _selectVersion: Fn;
  _loadHistory: Fn;
  _rowVerb: Fn;
  _bands: Fn;
  _render: Fn;
  _rememberLoader: Fn;
  _LiveColumn: unknown;
  _state: Record<string, unknown>;
  _base: Record<string, unknown>;
  _options: Record<string, number>;
  PAGE_MAP: Record<string, Array<{ page: string; label: string; own?: boolean }>>;
  ISSUE_TEXT: Record<string, string>;
  TEMPLATES: string[];
  ONE_WAY_FIELDS: Record<string, unknown>;
  PERSONAL_FIELDS: Record<string, string[]>;
}

/** A Decap entry (Immutable-like) for the live column's props. */
export function decapEntry(
  collection: string,
  slug: string,
  data: Record<string, unknown>,
  more: { newRecord?: boolean; mediaFiles?: FakeList } = {},
) {
  return new FakeMap([
    ["collection", collection],
    ["slug", slug],
    ["newRecord", !!more.newRecord],
    ["data", fromJS(data)],
    ["mediaFiles", more.mediaFiles ?? new FakeList([])],
  ]);
}

/** Decap's field definitions (getCurrentEntry().fields) of the people collection. */
export const PEOPLE_FIELDS = [
  { name: "name", label: "Name", widget: "string" },
  { name: "role", label: "Role", widget: "select" },
  { name: "title", label: "Position title", widget: "string" },
  { name: "program", label: "Program", widget: "string" },
  { name: "interests", label: "Interests", widget: "list" },
  { name: "directions", label: "Research directions", widget: "relation", multiple: true },
  { name: "photo", label: "Image", widget: "image" },
  { name: "photo_alt", label: "Photo alt text (required with a photo)", widget: "string" },
  { name: "photo_consent", label: "Photo consent", widget: "boolean", default: false },
  {
    name: "links",
    label: "Links",
    widget: "object",
    fields: [
      { name: "website", label: "Website", widget: "string" },
      { name: "cv", label: "CV", widget: "file" },
    ],
  },
  { name: "email", label: "Email", widget: "string" },
  { name: "email_public", label: "Email public", widget: "boolean", default: false },
  { name: "now_at", label: "Now at", widget: "string" },
  { name: "now_at_public", label: "Now at public", widget: "boolean", default: false },
  { name: "listed", label: "Listed (consented to appear)", widget: "boolean", default: false },
  { name: "profile_page", label: "Profile page", widget: "boolean", default: false },
  { name: "draft", label: "Visible on the website", widget: "visible", default: false },
  { name: "body", label: "Bio", widget: "richtext" },
];

export const NEWS_FIELDS = [
  { name: "date", label: "Date", widget: "datetime" },
  { name: "type", label: "Type", widget: "select" },
  { name: "title", label: "Title", widget: "string" },
  { name: "summary", label: "Summary", widget: "text" },
  { name: "people", label: "People", widget: "relation", multiple: true },
  {
    name: "link",
    label: "Link",
    widget: "object",
    fields: [
      { name: "label", label: "Link text", widget: "string" },
      { name: "url", label: "Address", widget: "string" },
    ],
  },
  {
    name: "image",
    label: "Image",
    widget: "object",
    fields: [
      { name: "image", label: "Image", widget: "image" },
      { name: "alt", label: "Alt text (required with an image)", widget: "string" },
    ],
  },
  { name: "draft", label: "Visible on the website", widget: "visible", default: false },
  { name: "body", label: "Body", widget: "richtext" },
];

export const PROJECT_FIELDS = [
  { name: "title", label: "Title", widget: "string" },
  { name: "status", label: "Status", widget: "select" },
  {
    name: "collaborators",
    label: "Collaborators",
    widget: "list",
    fields: [
      { name: "name", label: "Name", widget: "string" },
      { name: "consent", label: "Consent to be shown", widget: "boolean" },
    ],
  },
  {
    name: "partners",
    label: "Partners",
    widget: "list",
    fields: [
      { name: "name", label: "Name", widget: "string" },
      { name: "public", label: "Public", widget: "boolean" },
    ],
  },
  { name: "draft", label: "Visible on the website", widget: "visible", default: false },
  { name: "body", label: "Body", widget: "richtext" },
];

/** A commits?path= row as GitHub returns it. */
export function commit(
  sha: string,
  parent: string | null,
  date: string,
  message: string,
  login: string | null = "icho",
  name = "Isabelle Cho",
) {
  return {
    sha,
    parents: parent ? [{ sha: parent }] : [],
    html_url: `https://github.com/bobalabx/bobalab-web/commit/${sha}`,
    author: login ? { login, avatar_url: null } : null,
    commit: {
      message,
      author: { name, date },
      committer: { date },
    },
  };
}

/** A .md content file from front-matter data and a body. */
export function mdFile(data: Record<string, unknown>, body = ""): string {
  const yaml = Object.entries(data)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  return `---\n${yaml}\n---\n${body}\n`;
}
