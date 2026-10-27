/**
 * public/admin/cms-locale.js (editor v2, WP5; spec §3.3): the editor says Save,
 * not Publish. Every overridden phrase must exist in the vendored Decap bundle's
 * English phrases, so a Decap bump cannot silently drop one (docs/HANDOVER.md §7
 * bump checklist), and the locale must be registered before Decap starts.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { ROOT } from "./helpers";

type Phrases = Record<string, unknown>;

const BUNDLE = fs.readFileSync(path.join(ROOT, "public", "admin", "decap-cms.js"), "utf8");

/** The bundle's English phrases: the object literal that starts with English login words. */
function bundleEnglish(): Phrases {
  const marker = '{auth:{login:"Login",loggingIn:"Logging in...",';
  const start = BUNDLE.indexOf(marker);
  if (start < 0) throw new Error("English phrases not found in decap-cms.js (Decap changed?)");
  let depth = 0;
  let quote: string | null = null;
  let i = start;
  for (; i < BUNDLE.length; i++) {
    const c = BUNDLE[i]!;
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) break;
  }
  return vm.runInNewContext(`(${BUNDLE.slice(start, i + 1)})`) as Phrases;
}

const EN = bundleEnglish();

function at(obj: unknown, p: string): unknown {
  return p
    .split(".")
    .reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Phrases)[k] : undefined), obj);
}

/** Run cms-locale.js (after a fake decap-cms.js) and record what it registers. */
function run(extra: string[] = []) {
  const calls: string[] = [];
  const registered: Record<string, Phrases> = {};
  const win: Record<string, unknown> = {
    CMS: {
      getLocale: (l: string) => (l === "en" ? structuredClone(EN) : undefined),
      registerLocale: (l: string, p: Phrases) => {
        calls.push(`registerLocale:${l}`);
        registered[l] = p;
      },
      registerEventListener: () => {},
      init: () => calls.push("init"),
    },
  };
  // Enough of a page for cms-start.js to reach CMS.init().
  Object.assign(win, {
    window: win,
    self: win,
    top: win,
    location: { hash: "", href: "http://localhost:3100/admin/" },
    addEventListener: () => {},
    setTimeout: () => 0,
  });
  const ctx = vm.createContext({ ...win, document: { body: {} } });
  ctx.window = ctx;
  ctx.self = ctx;
  ctx.top = ctx;
  for (const f of ["cms-locale.js", ...extra])
    vm.runInContext(fs.readFileSync(path.join(ROOT, "public", "admin", f), "utf8"), ctx, {
      filename: f,
    });
  const api = ctx.BobalabLocale as {
    OVERRIDES: Phrases;
    keyPaths: (o: Phrases) => string[];
    deepMerge: (a: Phrases, b: Phrases) => Phrases;
    phrase: (p: string) => string;
  };
  return { api, calls, registered };
}

describe("cms-locale.js", () => {
  const { api, registered } = run();
  const keys = api.keyPaths(api.OVERRIDES);

  it("overrides exactly the phrases of spec §3.3", () => {
    expect(keys.sort()).toEqual(
      [
        "editor.editorToolbar.publish",
        "editor.editorToolbar.publishing",
        "editor.editorToolbar.publishNow",
        "editor.editorToolbar.publishAndCreateNew",
        "editor.editorToolbar.publishAndDuplicate",
        "editor.editorToolbar.published",
        "editor.editorToolbar.unsavedChanges",
        "editor.editorToolbar.changesSaved",
        "editor.editor.onLeavePage",
        "editor.editor.confirmLoadBackup",
        "editor.editorInterface.togglePreview",
        // A field in the wrong format: "Address: Use a full https:// address …"
        // (every pattern in config.yml carries its own plain instruction).
        "editor.editorControlPane.widget.regexPattern",
        "ui.toast.entrySaved",
        "ui.toast.onFailToPersist",
        "ui.toast.missingRequiredField",
      ].sort(),
    );
    expect(at(api.OVERRIDES, "editor.editorControlPane.widget.regexPattern")).toBe(
      "%{fieldLabel}: %{pattern}",
    );
    expect(at(api.OVERRIDES, "editor.editorToolbar.publish")).toBe("Save");
    expect(at(api.OVERRIDES, "editor.editorToolbar.publishing")).toBe("Saving…");
    expect(at(api.OVERRIDES, "editor.editorToolbar.publishNow")).toBe("Save now");
    expect(at(api.OVERRIDES, "editor.editorToolbar.published")).toBe("Saved");
    expect(at(api.OVERRIDES, "ui.toast.onFailToPersist")).toBe("%{details}");
  });

  it("every overridden key exists in the vendored bundle's English phrases, as a string", () => {
    const missing = keys.filter((k) => typeof at(EN, k) !== "string");
    expect(missing).toEqual([]);
  });

  it("the keys Decap looks up are the ones overridden (checked in the bundle's code)", () => {
    for (const k of [
      "editor.editorToolbar.publishNow",
      "editor.editor.confirmLoadBackup",
      "editor.editorInterface.togglePreview",
      "ui.toast.missingRequiredField",
      "ui.toast.onFailToPersist",
      "ui.toast.entrySaved",
      "editor.editorControlPane.widget.regexPattern",
      // cms-layout.js finds the media library's delete button by this phrase
      "mediaLibrary.mediaLibraryModal.deleteSelected",
    ])
      expect(BUNDLE.includes(`"${k}"`), k).toBe(true);
    expect(typeof at(EN, "mediaLibrary.mediaLibraryModal.deleteSelected")).toBe("string");
  });

  it("registers the merged English phrases: ours on top, every other phrase kept", () => {
    const en = registered.en!;
    expect(at(en, "editor.editorToolbar.publish")).toBe("Save");
    expect(at(en, "editor.editorToolbar.unsavedChanges")).toBe("Unsaved changes");
    expect(at(en, "ui.toast.missingRequiredField")).toBe(
      "Not saved: a required field is empty. It is marked in red.",
    );
    // untouched neighbours survive the merge
    expect(at(en, "editor.editorToolbar.duplicate")).toBe(at(EN, "editor.editorToolbar.duplicate"));
    expect(at(en, "auth.login")).toBe("Login");
    const count = (o: unknown): number =>
      o && typeof o === "object"
        ? Object.values(o as Phrases).reduce<number>((n, v) => n + count(v), 0)
        : 1;
    expect(count(en)).toBe(count(EN));
  });

  it("phrase() reads Decap's current English, falling back to our own wording", () => {
    expect(api.phrase("mediaLibrary.mediaLibraryModal.deleteSelected")).toBe("Delete selected");
    expect(api.phrase("editor.editorToolbar.publishing")).toBe(
      at(EN, "editor.editorToolbar.publishing"),
    ); // the fake getLocale returns the bundle's own; Decap returns ours once registered
    expect(api.phrase("no.such.key")).toBe("");
  });

  it("deepMerge copies, never mutates its inputs", () => {
    const a = { x: { y: 1, z: 2 } };
    const out = api.deepMerge(a, { x: { y: 3 } });
    expect(out).toEqual({ x: { y: 3, z: 2 } });
    expect(a).toEqual({ x: { y: 1, z: 2 } });
  });

  it("is registered before Decap starts: at load, and before cms-start.js calls CMS.init()", () => {
    const { calls } = run(["cms-hooks.js", "cms-start.js"]);
    expect(calls).toEqual(["registerLocale:en", "init"]);
    const html = fs.readFileSync(path.join(ROOT, "public", "admin", "index.html"), "utf8");
    const order = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    expect(order.indexOf("cms-locale.js")).toBeGreaterThan(order.indexOf("decap-cms.js"));
    expect(order.indexOf("cms-locale.js")).toBe(order.indexOf("cms-hooks.js") + 1);
    expect(order.indexOf("cms-locale.js")).toBeLessThan(order.indexOf("cms-start.js"));
  });
});
