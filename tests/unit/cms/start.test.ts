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

/** Run cms-hooks.js + cms-start.js against a fake page. */
function boot({ hash = "", framed = false } = {}) {
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
  const ctx = vm.createContext({ window: win, globalThis: win, document });
  vm.runInContext(read("cms-hooks.js"), ctx);
  vm.runInContext(read("cms-start.js"), ctx);
  const go = (next: string) => {
    location.hash = next;
    for (const fn of events.hashchange ?? []) fn();
    while (timers.length) timers.shift()!();
  };
  const saved = (collection: string, slug: string) => {
    for (const l of cmsEvents.filter((e) => e.name === "postSave"))
      l.handler({ entry: { get: (k: string) => (k === "collection" ? collection : slug) } });
  };
  return { win, location, go, saved, body, inits: () => inits, cmsEvents };
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

  it("registers a postSave listener that changes nothing", () => {
    const b = boot();
    const l = b.cmsEvents.find((e) => e.name === "postSave")!;
    expect(l.handler({ entry: { get: () => "x" } })).toBeUndefined();
  });
});
