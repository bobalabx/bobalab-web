/**
 * Test helpers for the editor-v2 admin scripts that talk to GitHub
 * (public/admin/cms-{ui,github,history,deploy,dock}.js): a sandbox that runs
 * them in Node's vm with
 *  - a virtual clock (setTimeout/setInterval/Date.now), advanced by hand;
 *  - fake localStorage/sessionStorage;
 *  - a fake fetch that answers from a handler and records every call (no
 *    test reaches the network: the sandbox has no other fetch);
 *  - optionally a small DOM (enough for the dock, toasts and dialogs: elements,
 *    attributes, classes, text, events with bubbling, focus, <dialog>, and
 *    simple selectors), since the unit tests run without jsdom.
 * Recorded GitHub answers live in tests/fixtures/github/.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { ROOT } from "./helpers";

export const FIXTURES = path.join(ROOT, "tests", "fixtures", "github");

/** A recorded answer: {status, headers, body}. */
export interface Recorded {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export function fixture<T = Recorded>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8")) as T;
}

/** The editor-v2 shape of cms-data.js (Interfaces §2), as WP5 generates it. */
export const CMS_DATA = {
  repo: "bobalabx/bobalab-web",
  branch: "main",
  deployWorkflow: "deploy.yml",
  media: {
    folder: "public/uploads",
    publicFolder: "/uploads",
    uploadExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"],
    rasterExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    limits: { uploadBytes: 10485760, rasterBytes: 2097152 },
  },
  features: { previewCheckBlocksSave: true },
  collections: [
    {
      name: "news",
      label: "News",
      labelSingular: "News item",
      folder: "content/news",
      extension: "md",
    },
    {
      name: "publications",
      label: "Publications",
      labelSingular: "Publication",
      folder: "content/publications",
      extension: "md",
    },
    {
      name: "people",
      label: "People",
      labelSingular: "Person",
      folder: "content/people",
      extension: "md",
    },
    {
      name: "directions",
      label: "Research directions",
      labelSingular: "Research direction",
      folder: "content/directions",
      extension: "md",
    },
    {
      name: "projects",
      label: "Projects",
      labelSingular: "Project",
      folder: "content/projects",
      extension: "md",
    },
    {
      name: "opportunities",
      label: "Opportunities",
      labelSingular: "Opportunity",
      folder: "content/opportunities",
      extension: "md",
    },
    {
      name: "pages",
      label: "Pages",
      files: [
        { name: "home", label: "Home page", file: "content/pages/home.yml" },
        { name: "join", label: "Join the lab", file: "content/pages/join.yml" },
        { name: "about", label: "About", file: "content/pages/about.yml" },
        {
          name: "accessibility",
          label: "Accessibility statement",
          file: "content/pages/accessibility.yml",
        },
        { name: "privacy", label: "Privacy statement", file: "content/pages/privacy.yml" },
      ],
    },
    {
      name: "settings",
      label: "Settings",
      files: [{ name: "site", label: "Site", file: "content/site.yml" }],
    },
  ],
};

/** What Decap keeps in localStorage "decap-cms-user" after a GitHub sign-in (a fictional editor). */
export const GITHUB_USER = {
  login: "ada-editor",
  name: "Ada Editor",
  avatar_url: "https://avatars.githubusercontent.com/u/1000001?v=4",
  token: "gho_test_token_not_real",
  useOpenAuthoring: false,
  backendName: "github",
};

// ---------------------------------------------------------------------------
// Virtual clock

interface Timer {
  id: number;
  at: number;
  fn: () => void;
  every?: number;
}

/** Let every pending promise (in the sandbox too: one microtask queue) settle. */
export async function flush(rounds = 25) {
  for (let i = 0; i < rounds; i++) await new Promise((r) => setImmediate(r));
}

export class FakeClock {
  t: number;
  private timers: Timer[] = [];
  private nextId = 1;
  readonly Date: DateConstructor;

  constructor(start: number) {
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
    const id = this.nextId++;
    this.timers.push({ id, at: this.t + Math.max(0, Number(ms) || 0), fn });
    return id;
  };
  clearTimeout = (id: number) => {
    this.timers = this.timers.filter((t) => t.id !== id);
  };
  setInterval = (fn: () => void, ms = 0) => {
    const id = this.nextId++;
    const every = Math.max(1, Number(ms) || 0);
    this.timers.push({ id, at: this.t + every, fn, every });
    return id;
  };
  clearInterval = (id: number) => this.clearTimeout(id);
  pending() {
    return this.timers.length;
  }
  /** Move time forward by `ms`, running each due timer in order and settling promises after each. */
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

// ---------------------------------------------------------------------------
// Storage

export class FakeStorage {
  map = new Map<string, string>();
  throwOnSet = false;
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    if (this.throwOnSet) throw new Error("QuotaExceededError");
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

// ---------------------------------------------------------------------------
// A small DOM

type Listener = (e: FakeEvent) => void;

export class FakeEvent {
  defaultPrevented = false;
  propagationStopped = false;
  target: FakeElement | null = null;
  currentTarget: FakeElement | null = null;
  constructor(
    readonly type: string,
    readonly init: { bubbles?: boolean; key?: string; relatedTarget?: FakeElement | null } = {},
  ) {}
  get bubbles() {
    return !!this.init.bubbles;
  }
  get key() {
    return this.init.key;
  }
  get relatedTarget() {
    return this.init.relatedTarget ?? null;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopPropagation() {
    this.propagationStopped = true;
  }
  stopImmediatePropagation() {
    this.propagationStopped = true;
  }
}

function parseSimple(sel: string) {
  const out: {
    tag?: string;
    id?: string;
    classes: string[];
    attrs: Array<{ name: string; op?: string; value?: string }>;
  } = { classes: [], attrs: [] };
  const re = /([a-zA-Z][\w-]*)|#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:([*$^]?=)"?([^"\]]*)"?)?\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sel))) {
    if (m[1]) out.tag = m[1].toLowerCase();
    else if (m[2]) out.id = m[2];
    else if (m[3]) out.classes.push(m[3]);
    else out.attrs.push({ name: m[4]!, op: m[5], value: m[6] });
  }
  return out;
}

function matchesSimple(el: FakeElement, sel: string) {
  const s = parseSimple(sel);
  if (s.tag && el.tagName.toLowerCase() !== s.tag) return false;
  if (s.id && el.id !== s.id) return false;
  for (const c of s.classes) if (!el.classList.contains(c)) return false;
  for (const a of s.attrs) {
    const v = el.getAttribute(a.name);
    if (v === null) return false;
    if (!a.op) continue;
    const want = a.value ?? "";
    if (a.op === "=" && v !== want) return false;
    if (a.op === "*=" && !v.includes(want)) return false;
    if (a.op === "$=" && !v.endsWith(want)) return false;
    if (a.op === "^=" && !v.startsWith(want)) return false;
  }
  return true;
}

/** Simple and descendant selectors ("#bl-dock .bl-dock__text", 'link[rel="x"]'). */
function matches(el: FakeElement, selector: string): boolean {
  return selector.split(",").some((one) => {
    const parts = one.trim().split(/\s+/);
    if (!matchesSimple(el, parts[parts.length - 1]!)) return false;
    let node = el.parentNode;
    for (let i = parts.length - 2; i >= 0; i--) {
      while (node && !matchesSimple(node, parts[i]!)) node = node.parentNode;
      if (!node) return false;
      node = node.parentNode;
    }
    return true;
  });
}

export class FakeElement {
  children: FakeElement[] = [];
  parentNode: FakeElement | null = null;
  attributes = new Map<string, string>();
  listeners = new Map<string, Listener[]>();
  style: Record<string, string> = {};
  checked = false;
  open = false;
  private text = "";
  constructor(
    readonly tagName: string,
    readonly ownerDocument: FakeDocument,
  ) {}
  get nodeType() {
    return this.tagName === "#text" ? 3 : 1;
  }
  get id() {
    return this.getAttribute("id") ?? "";
  }
  set id(v: string) {
    this.setAttribute("id", v);
  }
  get className() {
    return this.getAttribute("class") ?? "";
  }
  set className(v: string) {
    this.setAttribute("class", v);
  }
  get classList() {
    const list = () => this.className.split(/\s+/).filter(Boolean);
    return {
      contains: (c: string) => list().includes(c),
      add: (...cs: string[]) => (this.className = [...new Set([...list(), ...cs])].join(" ")),
      remove: (...cs: string[]) =>
        (this.className = list()
          .filter((x) => !cs.includes(x))
          .join(" ")),
      toggle: (c: string, force?: boolean) => {
        const on = force ?? !list().includes(c);
        this.className = on
          ? [...new Set([...list(), c])].join(" ")
          : list()
              .filter((x) => x !== c)
              .join(" ");
        return on;
      },
    };
  }
  get hidden() {
    return this.attributes.has("hidden");
  }
  set hidden(v: boolean) {
    if (v) this.attributes.set("hidden", "");
    else this.attributes.delete("hidden");
  }
  get disabled() {
    return this.attributes.has("disabled");
  }
  set disabled(v: boolean) {
    if (v) this.attributes.set("disabled", "");
    else this.attributes.delete("disabled");
  }
  get textContent(): string {
    return this.text + this.children.map((c) => c.textContent).join("");
  }
  set textContent(v: string) {
    for (const c of this.children) c.parentNode = null;
    this.children = [];
    this.text = String(v ?? "");
  }
  get firstChild(): FakeElement | null {
    return this.children[0] ?? null;
  }
  setAttribute(k: string, v: string) {
    this.attributes.set(k, String(v));
  }
  getAttribute(k: string) {
    return this.attributes.has(k) ? this.attributes.get(k)! : null;
  }
  hasAttribute(k: string) {
    return this.attributes.has(k);
  }
  removeAttribute(k: string) {
    this.attributes.delete(k);
  }
  appendChild(c: FakeElement) {
    return this.insertBefore(c, null);
  }
  insertBefore(c: FakeElement, ref: FakeElement | null) {
    if (c.parentNode) c.parentNode.removeChild(c);
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i === -1) this.children.push(c);
    else this.children.splice(i, 0, c);
    c.parentNode = this;
    return c;
  }
  removeChild(c: FakeElement) {
    this.children = this.children.filter((x) => x !== c);
    c.parentNode = null;
    if (this.ownerDocument.activeElement && c.contains(this.ownerDocument.activeElement))
      this.ownerDocument.activeElement = this.ownerDocument.body;
    return c;
  }
  remove() {
    this.parentNode?.removeChild(this);
  }
  contains(x: FakeElement | null): boolean {
    for (let n: FakeElement | null = x; n; n = n.parentNode) if (n === this) return true;
    return false;
  }
  isConnected() {
    return this.ownerDocument.body.contains(this) || this.ownerDocument.head.contains(this);
  }
  addEventListener(type: string, fn: Listener) {
    const l = this.listeners.get(type) ?? [];
    l.push(fn);
    this.listeners.set(type, l);
  }
  removeEventListener(type: string, fn: Listener) {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((f) => f !== fn),
    );
  }
  dispatchEvent(e: FakeEvent) {
    e.target = this;
    const path: FakeElement[] = [this];
    if (e.bubbles) for (let p = this.parentNode; p; p = p.parentNode) path.push(p);
    for (const n of path) {
      e.currentTarget = n;
      for (const fn of [...(n.listeners.get(e.type) ?? [])]) fn(e);
      if (e.propagationStopped) break;
    }
    return !e.defaultPrevented;
  }
  click() {
    if (this.disabled) return;
    this.dispatchEvent(new FakeEvent("click", { bubbles: true }));
  }
  focus() {
    const doc = this.ownerDocument;
    const prev = doc.activeElement;
    if (prev === this) return;
    if (prev && prev !== doc.body)
      prev.dispatchEvent(new FakeEvent("focusout", { bubbles: true, relatedTarget: this }));
    doc.activeElement = this;
    this.dispatchEvent(new FakeEvent("focusin", { bubbles: true, relatedTarget: prev }));
  }
  blur() {
    const doc = this.ownerDocument;
    if (doc.activeElement !== this) return;
    doc.activeElement = doc.body;
    this.dispatchEvent(new FakeEvent("focusout", { bubbles: true, relatedTarget: null }));
  }
  showModal() {
    this.open = true;
    this.setAttribute("open", "");
  }
  close() {
    if (!this.open) return;
    this.open = false;
    this.removeAttribute("open");
    this.dispatchEvent(new FakeEvent("close"));
  }
  querySelectorAll(sel: string): FakeElement[] {
    const out: FakeElement[] = [];
    const walk = (n: FakeElement) => {
      for (const c of n.children) {
        if (c.tagName !== "#text" && matches(c, sel)) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  querySelector(sel: string) {
    return this.querySelectorAll(sel)[0] ?? null;
  }
}

export class FakeDocument {
  head: FakeElement;
  body: FakeElement;
  activeElement: FakeElement | null;
  visibilityState: "visible" | "hidden" = "visible";
  listeners = new Map<string, Listener[]>();
  constructor() {
    this.head = new FakeElement("head", this);
    this.body = new FakeElement("body", this);
    this.activeElement = this.body;
  }
  createElement(tag: string) {
    return new FakeElement(tag.toLowerCase(), this);
  }
  createTextNode(t: string) {
    const n = new FakeElement("#text", this);
    n.textContent = t;
    return n;
  }
  getElementById(id: string) {
    return this.querySelector("#" + id);
  }
  querySelectorAll(sel: string) {
    return [...this.head.querySelectorAll(sel), ...this.body.querySelectorAll(sel)];
  }
  querySelector(sel: string) {
    return this.querySelectorAll(sel)[0] ?? null;
  }
  addEventListener(type: string, fn: Listener) {
    const l = this.listeners.get(type) ?? [];
    l.push(fn);
    this.listeners.set(type, l);
  }
  removeEventListener(type: string, fn: Listener) {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((f) => f !== fn),
    );
  }
  /** Switch the tab between visible and hidden, as the browser does. */
  setVisibility(v: "visible" | "hidden") {
    this.visibilityState = v;
    for (const fn of [...(this.listeners.get("visibilitychange") ?? [])])
      fn(new FakeEvent("visibilitychange"));
  }
}

/** All text of an element, with runs of spaces collapsed. */
export const text = (el: FakeElement | null | undefined) =>
  el ? el.textContent.replace(/\s+/g, " ").trim() : "";

/**
 * The words a sighted reader sees: the text of elements that are not hidden,
 * each element's own words separated by a space (as the layout shows them).
 */
export function visibleText(el: FakeElement | null | undefined): string {
  if (!el) return "";
  const parts: string[] = [];
  const walk = (n: FakeElement) => {
    if (n.hidden) return;
    if (!n.children.length) {
      if (n.textContent.trim()) parts.push(n.textContent.trim());
      return;
    }
    n.children.forEach(walk);
  };
  walk(el);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** The visible buttons in an element, by their text. */
export function buttons(el: FakeElement | null) {
  return el ? el.querySelectorAll("button").filter((b) => !b.hidden) : [];
}

export function buttonNamed(el: FakeElement | null, name: string | RegExp) {
  return (
    buttons(el).find((b) =>
      typeof name === "string" ? b.textContent.trim() === name : name.test(b.textContent.trim()),
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// fetch

export interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  init: Record<string, unknown>;
}

export interface Answer {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
}

/** (url, call) → an answer, a promise of one, or a thrown error (= the network failed). */
export type Handler = (url: URL, call: Call) => Answer | Promise<Answer>;

function response(a: Answer) {
  const status = a.status ?? 200;
  const headers = Object.fromEntries(
    Object.entries(a.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => (typeof a.body === "string" ? JSON.parse(a.body) : a.body),
    text: async () => (typeof a.body === "string" ? a.body : JSON.stringify(a.body)),
  };
}

/** Answers from a list of [test, answer] rules, tried in order; anything else is a 404. */
export function routes(
  rules: Array<[RegExp | ((u: URL) => boolean), Answer | ((u: URL) => Answer)]>,
): Handler {
  return (u) => {
    const s = u.pathname + u.search;
    for (const [test, ans] of rules) {
      const hit = typeof test === "function" ? test(u) : test.test(decodeURIComponent(s));
      if (hit) return typeof ans === "function" ? ans(u) : ans;
    }
    return { status: 404, body: { message: "Not Found" } };
  };
}

// ---------------------------------------------------------------------------
// The sandbox

export interface BootOptions {
  files: string[];
  mode?: "github" | "local";
  user?: Record<string, unknown> | null;
  fetch?: Handler;
  now?: number | string;
  dom?: boolean;
  cmsData?: Record<string, unknown> | null;
  hash?: string;
  extra?: Record<string, unknown>;
  session?: Record<string, string>;
}

export const T0 = Date.parse("2026-10-26T20:00:00Z");

export function boot(o: BootOptions) {
  const clock = new FakeClock(typeof o.now === "string" ? Date.parse(o.now) : (o.now ?? T0));
  const local = new FakeStorage();
  const session = new FakeStorage();
  if (o.user !== null) local.setItem("decap-cms-user", JSON.stringify(o.user ?? GITHUB_USER));
  for (const [k, v] of Object.entries(o.session ?? {})) session.setItem(k, v);
  const document = o.dom === false ? undefined : new FakeDocument();
  if (document) {
    const link = document.createElement("link");
    link.setAttribute("rel", "cms-config-url");
    link.setAttribute("type", "text/yaml");
    link.setAttribute("href", o.mode === "local" ? "config.local.yml" : "config.yml");
    document.head.appendChild(link);
  }
  const calls: Call[] = [];
  const handler = o.fetch ?? (() => ({ status: 404, body: { message: "Not Found" } }));
  const winListeners = new Map<string, Listener[]>();
  const location = {
    hash: o.hash ?? "",
    get href() {
      return "https://bobalabx.github.io/bobalab-web/admin/" + (this.hash || "");
    },
  };
  const opened: Array<{ url: string; target: string; features: string }> = [];
  const win: Record<string, unknown> = {
    BOBALAB_CMS: o.cmsData === null ? undefined : (o.cmsData ?? CMS_DATA),
    localStorage: local,
    sessionStorage: session,
    document,
    location,
    URL,
    URLSearchParams,
    AbortController,
    console,
    Date: clock.Date,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    setInterval: clock.setInterval,
    clearInterval: clock.clearInterval,
    open: (url: string, target: string, features: string) => opened.push({ url, target, features }),
    addEventListener: (t: string, fn: Listener) =>
      winListeners.set(t, [...(winListeners.get(t) ?? []), fn]),
    removeEventListener: (t: string, fn: Listener) =>
      winListeners.set(
        t,
        (winListeners.get(t) ?? []).filter((f) => f !== fn),
      ),
    fetch: async (url: string, init: Record<string, unknown> = {}) => {
      const headers = { ...((init.headers as Record<string, string>) ?? {}) };
      const call: Call = { url, method: String(init.method ?? "GET"), headers, init };
      calls.push(call);
      const ans = await handler(new URL(url), call); // a thrown error rejects, like a network failure
      return response(ans);
    },
    ...(o.extra ?? {}),
  };
  win.window = win;
  win.top = win;
  win.self = win;
  const ctx = vm.createContext(win);
  for (const f of o.files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, "public", "admin", f), "utf8"), ctx, {
      filename: f,
    });
  }
  /** Fire a window event (hashchange, storage, …). */
  const fire = (type: string, init: Record<string, unknown> = {}) => {
    const e = Object.assign(new FakeEvent(type), init);
    for (const fn of [...(winListeners.get(type) ?? [])]) fn(e);
  };
  /** Change the address hash and fire hashchange. */
  const go = (hash: string) => {
    location.hash = hash;
    fire("hashchange");
  };
  return { win, clock, calls, local, session, document, fire, go, opened, location };
}

/** Requests that reached the fake fetch, as "path?query" strings (decoded). */
export const requested = (calls: Call[]) =>
  calls.map((c) => {
    const u = new URL(c.url);
    return decodeURIComponent(u.pathname + u.search);
  });
