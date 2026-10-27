/**
 * public/admin/cms-start.js: starts Decap, after two guards (verification
 * findings CMS-02 and CMS-13): a reload when the address moves from one entry
 * straight to another (Decap 3.17.1 would keep showing the previous entry), and
 * no start at all inside a frame (the admin CSP is a <meta>, so frame-ancestors
 * cannot apply). tests/e2e/cms-local.spec.ts checks both in the browser.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { ROOT } from "./helpers";

const read = (f: string) => fs.readFileSync(path.join(ROOT, "public", "admin", f), "utf8");

type Listener = (args: { entry: { get: (k: string) => unknown } }) => unknown;

/** Run cms-hooks.js + cms-start.js against a fake page (with a clock the test can move). */
function boot({ hash = "", framed = false } = {}) {
  let now = Date.parse("2026-10-26T20:00:00Z");
  class FakeDate extends Date {
    constructor(...a: unknown[]) {
      if (a.length) super(...(a as [string]));
      else super(now);
    }
    static now() {
      return now;
    }
  }
  const events: Record<string, Array<() => void>> = {};
  const cmsEvents: Array<{ name: string; handler: Listener }> = [];
  const timers: Array<() => void> = [];
  const body = {
    textContent: "x",
    children: [] as Array<Record<string, unknown>>,
    appendChild(el: Record<string, unknown>) {
      this.children.push(el);
    },
  };
  const win: Record<string, unknown> = {};
  const location = {
    hash,
    href: `http://localhost:3100/admin/${hash}`,
    reloads: 0,
    reload() {
      this.reloads++;
    },
  };
  let inits = 0;
  Object.assign(win, {
    location,
    self: win,
    top: framed ? {} : win,
    setTimeout: (fn: () => void) => timers.push(fn),
    addEventListener: (n: string, fn: () => void) => (events[n] ??= []).push(fn),
    CMS: {
      init: () => inits++,
      registerEventListener: (l: { name: string; handler: Listener }) => cmsEvents.push(l),
    },
  });
  const document = {
    body,
    createElement: (tag: string) => {
      const el: Record<string, unknown> = { tag, children: [] as unknown[] };
      el.appendChild = (c: unknown) => (el.children as unknown[]).push(c);
      return el;
    },
  };
  win.Date = FakeDate;
  const ctx = vm.createContext({ window: win, globalThis: win, document, Date: FakeDate });
  vm.runInContext(read("cms-hooks.js"), ctx);
  vm.runInContext(read("cms-start.js"), ctx);
  const go = (next: string) => {
    location.hash = next;
    for (const fn of events.hashchange ?? []) fn();
    while (timers.length) timers.shift()!();
  };
  const saved = (collection: string, slug: string, extra: Record<string, unknown> = {}) => {
    const fields: Record<string, unknown> = { collection, slug, ...extra };
    for (const l of cmsEvents.filter((e) => e.name === "postSave"))
      l.handler({ entry: { get: (k: string) => fields[k] } });
  };
  const wait = (ms: number) => (now += ms);
  return { win, location, go, saved, wait, body, inits: () => inits, cmsEvents };
}

describe("cms-start.js", () => {
  it("starts Decap once, outside a frame", () => {
    const b = boot({ hash: "#/collections/news" });
    expect(b.inits()).toBe(1);
  });

  it("inside a frame: does not start Decap and shows a link to open it on its own", () => {
    const b = boot({ framed: true });
    expect(b.inits()).toBe(0);
    expect(b.body.textContent).toBe("");
    const p = b.body.children[0] as { children: Array<Record<string, unknown>> };
    const a = p.children[0]!;
    expect(a.target).toBe("_top");
    expect(a.textContent).toMatch(/Open it in its own window/);
  });

  it("reloads when the address moves from one entry straight to another (the stale-editor bug)", () => {
    const b = boot({ hash: "#/collections/directions/entries/ai-at-work" });
    b.saved("directions", "ai-at-work");
    b.go("#/collections/projects/entries/learning-on-the-go");
    expect(b.location.reloads).toBe(1);
    const c = boot({ hash: "#/collections/directions/entries/ai-at-work" });
    c.go("#/collections/settings/entries/site");
    expect(c.location.reloads).toBe(1);
  });

  it("leaves Decap's own moves and list navigation alone", () => {
    const b = boot({ hash: "#/collections/news/new" });
    b.saved("news", "2026-10-20-a-new-item");
    b.go("#/collections/news/entries/2026-10-20-a-new-item"); // after the first save
    b.go("#/collections/news/new"); // "Publish and create new"
    b.go("#/collections/news"); // back to the list
    b.go("#/collections/news/entries/2026-05-11-learning-to-gig-revision"); // from the list
    b.go("#/collections/news/entries/2026-05-11-learning-to-gig-revision?ref=x");
    b.go("#/workflow");
    expect(b.location.reloads).toBe(0);
  });

  it("a new entry the address replaces with an existing one is reloaded too", () => {
    const b = boot({ hash: "#/collections/news/new" });
    b.go("#/collections/news/entries/2026-05-11-learning-to-gig-revision");
    expect(b.location.reloads).toBe(1);
  });

  it("a new entry the address replaces with a new entry of ANOTHER collection is reloaded (Decap kept the old form)", () => {
    const b = boot({ hash: "#/collections/news/new" });
    b.go("#/collections/publications/new");
    expect(b.location.reloads).toBe(1);
    // …but not an existing entry → new (Decap starts an empty form itself), nor new → the same new.
    const c = boot({ hash: "#/collections/news/entries/2026-05-11-learning-to-gig-revision" });
    c.go("#/collections/publications/new");
    c.go("#/collections/publications/new?ref=x");
    expect(c.location.reloads).toBe(0);
    const api = b.win.BobalabCmsStart as { needsReload: (a: string, b: string) => boolean };
    expect(api.needsReload("#/collections/news/new", "#/collections/news/new")).toBe(false);
    expect(api.needsReload("#/collections/news/new", "#/collections/people/new")).toBe(true);
  });

  it("does nothing when Decap's 'leave this page?' was cancelled (the old address is back)", () => {
    const b = boot({ hash: "#/collections/directions/entries/ai-at-work" });
    const before = b.location.hash;
    // the router reverts the address before our deferred check runs
    b.location.hash = "#/collections/projects/entries/learning-on-the-go";
    const timers: Array<() => void> = [];
    (b.win as { setTimeout: unknown }).setTimeout = (fn: () => void) => timers.push(fn);
    b.go("#/collections/projects/entries/learning-on-the-go");
    b.location.hash = before;
    while (timers.length) timers.shift()!();
    expect(b.location.reloads).toBe(0);
  });

  it("a NEW entry's first save (postSave has an empty slug, as Decap sends it) does not reload (spec §3.11)", () => {
    const b = boot({ hash: "#/collections/news/new" });
    // MEASURED: for a new entry Decap's postSave entry still has newRecord and slug "".
    b.saved("news", "", { newRecord: true, path: "" });
    b.wait(2000);
    b.go("#/collections/news/entries/2026-10-26-informs-annual-meeting");
    expect(b.location.reloads).toBe(0);
  });

  it("…but only for that collection, and only within 15 s of the save", () => {
    const late = boot({ hash: "#/collections/news/new" });
    late.saved("news", "", { newRecord: true });
    late.wait(16_000);
    late.go("#/collections/news/entries/2026-10-26-informs-annual-meeting");
    expect(late.location.reloads).toBe(1);
    const other = boot({ hash: "#/collections/projects/new" });
    other.saved("news", "", { newRecord: true });
    other.go("#/collections/projects/entries/learning-on-the-go");
    expect(other.location.reloads).toBe(1);
    const unsaved = boot({ hash: "#/collections/news/new" });
    unsaved.go("#/collections/news/entries/2026-10-26-informs-annual-meeting");
    expect(unsaved.location.reloads).toBe(1);
  });

  it("needsReload(): the old string form of `saved` still works", () => {
    const b = boot();
    const api = b.win.BobalabCmsStart as {
      needsReload: (from: string, to: string, saved?: unknown, now?: number) => boolean;
    };
    expect(
      api.needsReload("#/collections/news/new", "#/collections/news/entries/x", "news/x"),
    ).toBe(false);
    expect(
      api.needsReload("#/collections/news/new", "#/collections/news/entries/y", "news/x"),
    ).toBe(true);
    const s = { key: "news/", collection: "news", at: 1000 };
    expect(
      api.needsReload("#/collections/news/new", "#/collections/news/entries/y", s, 15_000),
    ).toBe(false);
    expect(
      api.needsReload("#/collections/news/new", "#/collections/news/entries/y", s, 16_001),
    ).toBe(true);
  });

  it("registers a postSave listener that changes nothing", () => {
    const b = boot();
    const l = b.cmsEvents.find((e) => e.name === "postSave")!;
    expect(l.handler({ entry: { get: () => "x" } })).toBeUndefined();
  });
});
