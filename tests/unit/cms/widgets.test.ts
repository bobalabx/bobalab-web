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
    expect(registered).toHaveLength(1);
    const [name, control, preview, schema] = registered[0]!;
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
