/**
 * public/admin/cms-widgets.js: the rich-text gate that stops Decap 3.17.1's
 * load-time re-serialisation from marking every opened entry "Unsaved changes",
 * while passing on every real edit (the e2e spec checks it in the browser).
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { ROOT, runAdminScripts } from "./helpers";

type Gate = {
  act: () => void;
  reset: (v: unknown) => void;
  isOwn: (v: unknown) => boolean;
  change: (next: unknown, current: unknown, rest?: unknown[]) => boolean;
};
const { window } = runAdminScripts(["cms-widgets.js"]);
const api = window.BobalabCmsWidgets as { createGate: (stored: unknown, fwd: Fwd) => Gate };
type Fwd = (v: unknown, rest: unknown[]) => void;

function gate(stored: unknown) {
  const sent: unknown[] = [];
  const g = api.createGate(stored, (v) => sent.push(v));
  return { g, sent };
}

describe("cms-widgets.js rich-text gate", () => {
  it("swallows the load-time re-serialisation (no false 'Unsaved changes')", () => {
    const stored = "- one\n- two";
    const { g, sent } = gate(stored);
    expect(g.change("* one\n* two", stored)).toBe(false);
    expect(g.change("* one\n* two", stored)).toBe(false); // repeated normalisation passes
    expect(sent).toEqual([]);
  });

  it("passes on real edits once the editor has touched the field", () => {
    const stored = "- one";
    const { g, sent } = gate(stored);
    g.change("* one", stored); // load
    g.act();
    expect(g.change("* one!", stored)).toBe(true);
    expect(sent).toEqual(["* one!"]);
    expect(g.isOwn("* one!")).toBe(true);
  });

  it("a click or caret move without an edit changes nothing", () => {
    const stored = "Text";
    const { g, sent } = gate(stored);
    g.change("Text", stored);
    g.act();
    expect(g.change("Text", stored)).toBe(false);
    expect(sent).toEqual([]);
  });

  it("undoing an edit restores the stored text exactly (entry back to 'Changes saved')", () => {
    const stored = "- a\n- b";
    const { g, sent } = gate(stored);
    g.change("* a\n* b", stored);
    g.act();
    g.change("* a\n* bc", stored);
    expect(g.change("* a\n* b", "* a\n* bc")).toBe(true);
    expect(sent).toEqual(["* a\n* bc", "- a\n- b"]);
  });

  it("an undo that outruns React (props still show the stored text) is still passed on", () => {
    const stored = "Text";
    const { g, sent } = gate(stored);
    g.change("Text", stored);
    g.act();
    g.change("Text Zq", stored); // props not re-rendered yet
    expect(g.change("Text", stored)).toBe(true);
    expect(sent).toEqual(["Text Zq", "Text"]);
    expect(g.change("Text", stored)).toBe(false); // already given to Decap
    // props that lag behind show an older value of ours: not a change from outside
    expect(g.isOwn("Text Zq")).toBe(true);
    expect(g.isOwn("Something else")).toBe(false);
  });

  it("without a load-time change, the first change after an interaction is passed on", () => {
    const { g, sent } = gate(undefined);
    g.act();
    expect(g.change("New text", undefined)).toBe(true);
    expect(sent).toEqual(["New text"]);
  });

  it("a value from outside (another entry) starts over", () => {
    const { g, sent } = gate("old");
    g.change("old*", "old");
    g.act();
    g.reset("other");
    expect(g.change("other*", "other")).toBe(false); // that entry's load-time form
    expect(sent).toEqual([]);
  });

  it("re-registers Decap's richtext widget under the same name, keeping its preview and schema", () => {
    const registered: unknown[][] = [];
    const base = { control: function Base() {}, preview: function Prev() {}, schema: { s: 1 } };
    const win: Record<string, unknown> = {
      h: (...a: unknown[]) => a,
      createClass: (spec: Record<string, unknown>) => ({ spec }),
      CMS: {
        getWidget: (n: string) => (n === "richtext" ? base : undefined),
        registerWidget: (...a: unknown[]) => registered.push(a),
      },
    };
    const ctx = vm.createContext({ window: win, globalThis: win });
    vm.runInContext(fs.readFileSync(path.join(ROOT, "public/admin/cms-widgets.js"), "utf8"), ctx);
    // Our own "visible" switch is registered too (below).
    expect(registered.map((r) => r[0])).toEqual(["visible", "richtext"]);
    const [name, control, preview, schema] = registered.find((r) => r[0] === "richtext")!;
    expect(name).toBe("richtext");
    expect(preview).toBe(base.preview);
    expect(schema).toBe(base.schema);
    const spec = (control as { spec: Record<string, unknown> }).spec;
    expect(typeof spec.focus).toBe("function"); // Decap's Widget focuses its control
    expect(typeof spec.render).toBe("function");
  });

  it("is loaded right after decap-cms.js and before Decap starts", () => {
    const html = fs.readFileSync(path.join(ROOT, "public/admin/index.html"), "utf8");
    const order = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    expect(order.indexOf("cms-widgets.js")).toBe(order.indexOf("decap-cms.js") + 1);
    expect(order.indexOf("cms-widgets.js")).toBeLessThan(order.indexOf("cms-start.js"));
  });
});

describe("cms-widgets.js list patch (CMS-01: removing a Direction order item)", () => {
  // A stand-in for Decap 3.17.1's ListControl.handleRemove: for single-field lists
  // it calls metadata.removeIn(<the item's value>), which Immutable rejects.
  type Props = {
    field: { get: (k: string) => unknown };
    value: string[];
    metadata?: { size: number; removeIn: (p: unknown) => unknown };
    onChange: (v: string[], meta: unknown) => void;
  };
  class FakeListControl {
    props: Props;
    handleRemove: (i: number, e: unknown) => void;
    constructor(props: Props) {
      this.props = props;
      this.handleRemove = (i: number) => {
        const { value, metadata, onChange, field } = this.props;
        const single = !field.get("fields") && !!field.get("field");
        const p = single ? value[i] : [value[i]];
        const meta = metadata && metadata.size ? { list: metadata.removeIn(p) } : metadata;
        onChange(
          value.filter((_, k) => k !== i),
          meta,
        );
      };
    }
  }
  const strictMeta = {
    size: 1,
    removeIn: (p: unknown) => {
      if (typeof p === "string")
        throw new TypeError(`Invalid keyPath: expected Ordered Collection or Array: ${p}`);
      return "removed";
    },
  };
  const single = { get: (k: string) => (k === "field" ? { name: "direction" } : undefined) };
  const multi = { get: (k: string) => (k === "fields" ? [{ name: "a" }] : undefined) };
  const widgets = window.BobalabCmsWidgets as {
    patchList: (B: unknown) => new (p: Props) => FakeListControl;
  };

  it("reproduces the bug without the patch", () => {
    const c = new FakeListControl({
      field: single,
      value: ["algorithmic-advice", "ai-at-work"],
      metadata: strictMeta,
      onChange: () => {},
    });
    expect(() => c.handleRemove(1, {})).toThrow(/Invalid keyPath.*ai-at-work/);
  });

  it("removes the item from a single-field list that has relation metadata", () => {
    const Patched = widgets.patchList(FakeListControl);
    const calls: unknown[][] = [];
    const props: Props = {
      field: single,
      value: ["algorithmic-advice", "ai-at-work", "platform-work"],
      metadata: strictMeta,
      onChange: (...a) => calls.push(a),
    };
    const c = new Patched(props);
    expect(c).toBeInstanceOf(FakeListControl);
    c.handleRemove(1, {});
    expect(calls).toEqual([[["algorithmic-advice", "platform-work"], undefined]]);
    expect(c.props).toBe(props); // the real props are back after the call
    expect(c.props.metadata).toBe(strictMeta);
  });

  it("leaves lists of objects and lists without metadata to Decap's own code", () => {
    const Patched = widgets.patchList(FakeListControl);
    const calls: unknown[][] = [];
    new Patched({
      field: multi,
      value: ["x", "y"],
      metadata: strictMeta,
      onChange: (...a) => calls.push(a),
    }).handleRemove(0, {});
    new Patched({
      field: single,
      value: ["x", "y"],
      onChange: (...a) => calls.push(a),
    }).handleRemove(0, {});
    expect(calls).toEqual([
      [["y"], { list: "removed" }],
      [["y"], undefined],
    ]);
  });

  it("re-registers Decap's list widget under the same name, keeping its preview and schema", () => {
    const registered: unknown[][] = [];
    const list = { control: FakeListControl, preview: function Prev() {}, schema: { s: 2 } };
    const win: Record<string, unknown> = {
      CMS: {
        getWidget: (n: string) => (n === "list" ? list : undefined),
        registerWidget: (...a: unknown[]) => registered.push(a),
      },
    };
    const ctx = vm.createContext({ window: win, globalThis: win });
    vm.runInContext(fs.readFileSync(path.join(ROOT, "public/admin/cms-widgets.js"), "utf8"), ctx);
    expect(registered).toHaveLength(1);
    const [name, control, preview, schema] = registered[0]!;
    expect(name).toBe("list");
    expect(Object.getPrototypeOf((control as { prototype: object }).prototype)).toBe(
      FakeListControl.prototype,
    );
    expect(preview).toBe(list.preview);
    expect(schema).toBe(list.schema);
  });
});

describe("cms-widgets.js “Visible on the website” switch (D-21)", () => {
  type El = { type: string; props: Record<string, unknown>; children: unknown[] };
  type Props = Record<string, unknown> & { value?: unknown; onChange: (v: unknown) => void };
  type Spec = Record<string, unknown> & { render: () => El; props: Props };
  const w = window.BobalabCmsWidgets as {
    isHidden: (v: unknown) => boolean;
    toggled: (v: unknown) => boolean;
    visibleWord: (v: unknown) => string;
    visibleControl: (h: unknown, createClass: unknown) => (p: Props) => Spec;
  };
  const h = (type: string, props: Record<string, unknown> | null, ...children: unknown[]): El => ({
    type,
    props: props ?? {},
    children,
  });
  // A stand-in for create-react-class: an instance with its methods bound (autobinding).
  const createClass = (spec: Record<string, unknown>) => (props: Props) => {
    const inst: Record<string, unknown> = { props };
    for (const [k, v] of Object.entries(spec))
      inst[k] = typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(inst) : v;
    return inst as Spec;
  };
  const text = (el: unknown): string =>
    typeof el === "string"
      ? el
      : el && typeof el === "object"
        ? ((el as El).children ?? []).map(text).join("")
        : "";
  const buttonOf = (root: El) => root.children[0] as El;

  function mount(value: unknown) {
    const changes: unknown[] = [];
    const Control = w.visibleControl(h, createClass);
    const inst = Control({
      value,
      forID: "draft-field-1",
      classNameWrapper: "wrap",
      setActiveStyle: () => {},
      setInactiveStyle: () => {},
      onChange: (v) => changes.push(v),
    });
    return { inst, changes, root: inst.render() };
  }

  it("shows the stored draft boolean the other way round: Yes = draft false, No = draft true", () => {
    expect([false, undefined, null, true].map(w.visibleWord)).toEqual(["Yes", "Yes", "Yes", "No"]);
    expect([false, undefined, true].map(w.isHidden)).toEqual([false, false, true]);
    // One press always writes a boolean, never a string.
    expect([false, undefined, true].map(w.toggled)).toEqual([true, true, false]);
  });

  it("is a named switch with a visible Yes/No word, and opening an entry changes nothing", () => {
    for (const [value, checked, word] of [
      [false, "true", "Yes"],
      [undefined, "true", "Yes"],
      [true, "false", "No"],
    ] as const) {
      const { root, changes } = mount(value);
      const b = buttonOf(root);
      expect(root.props.className).toBe("wrap");
      expect(b.type).toBe("button");
      expect(b.props.type).toBe("button");
      expect(b.props.role).toBe("switch");
      // Decap's label points at forID, so the label "Visible on the website" names the switch.
      expect(b.props.id).toBe("draft-field-1");
      expect(b.props["aria-checked"]).toBe(checked);
      expect(text(b)).toBe(word);
      expect((b.children[0] as El).props["aria-hidden"]).toBe("true");
      expect(changes).toEqual([]); // no onChange while mounting: no "Unsaved changes"
    }
  });

  it("a press writes the opposite boolean to draft (Enter and Space press a button)", () => {
    const shown = mount(false);
    (buttonOf(shown.root).props.onClick as () => void)();
    expect(shown.changes).toEqual([true]);
    const hidden = mount(true);
    (buttonOf(hidden.root).props.onClick as () => void)();
    expect(hidden.changes).toEqual([false]);
    const unset = mount(undefined);
    (buttonOf(unset.root).props.onClick as () => void)();
    expect(unset.changes).toEqual([true]);
  });

  it("follows a value set from outside (Restore, Undo, Bring in their changes)", () => {
    const { inst } = mount(false);
    expect(buttonOf(inst.render()).props["aria-checked"]).toBe("true");
    inst.props = { ...inst.props, value: true };
    expect(buttonOf(inst.render()).props["aria-checked"]).toBe("false");
    expect(text(buttonOf(inst.render()))).toBe("No");
  });

  it("is registered as “visible” before Decap starts, with a Yes/No preview", () => {
    const registered: unknown[][] = [];
    const win: Record<string, unknown> = {
      h,
      createClass,
      CMS: {
        getWidget: () => undefined,
        registerWidget: (...a: unknown[]) => registered.push(a),
      },
    };
    const ctx = vm.createContext({ window: win, globalThis: win });
    vm.runInContext(fs.readFileSync(path.join(ROOT, "public/admin/cms-widgets.js"), "utf8"), ctx);
    expect(registered.map((r) => r[0])).toEqual(["visible"]);
    const preview = registered[0]![2] as (p: { value: unknown }) => El;
    expect(text(preview({ value: true }))).toBe("No");
    expect(text(preview({ value: false }))).toBe("Yes");
  });
});
