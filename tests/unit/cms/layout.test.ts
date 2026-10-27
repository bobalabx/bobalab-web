/**
 * public/admin/cms-layout.js and the layout rules of admin.css (editor v2, WP5;
 * spec §3.10, §7, §8): the live column forced on at every load, the first
 * split, showLivePane(), the hidden Media button and media-library Delete, the
 * "Skip to the live preview" link and the phone [Edit] [Preview & history] switch.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FakeDocument, type FakeElement } from "./github-helpers";
import { ROOT } from "./helpers";
import { bootSave } from "./save-helpers";

const CSS = fs.readFileSync(path.join(ROOT, "public", "admin", "admin.css"), "utf8");

type Layout = {
  showLivePane: () => Promise<boolean>;
  isLivePaneShown: () => boolean;
  setPhonePreview: (on: boolean) => Promise<boolean>;
  _splitSeed: (w: number) => number;
  _sync: () => void;
};

/** A booted admin page with cms-layout.js and Decap's split pane (live column on or off). */
function page(
  o: { phone?: boolean; pane2?: boolean; storage?: Record<string, string>; hash?: string } = {},
) {
  const b = bootSave({ layout: true, phone: o.phone, storage: o.storage, hash: o.hash });
  const layout = b.win.BobalabLayout as Layout;
  const split = b.make("div", "css-11-StyledSplitPane");
  const p1 = b.make("div", "Pane vertical Pane1");
  split.appendChild(p1);
  let p2: FakeElement | null = null;
  const addPane2 = () => {
    p2 = b.make("div", "Pane vertical Pane2");
    split.appendChild(p2);
  };
  if (o.pane2 !== false) addPane2();
  b.document.body.appendChild(split);
  // Decap's eye button ("toggle preview"), titled from the locale
  const controls = b.make("div", "css-12-ViewControls");
  const eye = b.make("button", "css-13-EditorToggle");
  eye.setAttribute("title", "Hide or show the live preview and history");
  eye.addEventListener("click", () => {
    b.log.eyeClicks++;
    if (!p2) addPane2();
  });
  controls.appendChild(eye);
  b.document.body.appendChild(controls);
  layout._sync();
  return { b, layout, split, pane2: () => p2, eye };
}

describe("before Decap starts: localStorage (spec §8)", () => {
  it("seeds the split once: 36% of the window, 440 to 640 px", () => {
    const { layout } = page();
    expect(layout._splitSeed(1366)).toBe(492);
    expect(layout._splitSeed(800)).toBe(440);
    expect(layout._splitSeed(2560)).toBe(640);
    const fresh = page();
    expect(fresh.b.env.local.getItem("cms.split-pane-position")).toBe("492"); // innerWidth 1366
    const chosen = page({ storage: { "cms.split-pane-position": "700" } });
    expect(chosen.b.env.local.getItem("cms.split-pane-position")).toBe("700");
  });

  it("forces the live column on at every load, even after the eye turned it off", () => {
    for (const before of [undefined, "none", "i18n", "notes", "preview"]) {
      const { b } = page({ storage: before ? { "cms.right-pane": before } : {} });
      expect(b.env.local.getItem("cms.right-pane")).toBe("preview");
    }
  });
});

describe("the live column", () => {
  it("isLivePaneShown() follows Decap's second pane", () => {
    expect(page().layout.isLivePaneShown()).toBe(true);
    expect(page({ pane2: false }).layout.isLivePaneShown()).toBe(false);
  });

  it("showLivePane() clicks the eye button only when the column is hidden", async () => {
    const on = page();
    expect(await on.layout.showLivePane()).toBe(true);
    expect(on.b.log.eyeClicks).toBe(0);
    const off = page({ pane2: false });
    const p = off.layout.showLivePane();
    await off.b.run(100);
    expect(await p).toBe(true);
    expect(off.b.log.eyeClicks).toBe(1);
    expect(off.layout.isLivePaneShown()).toBe(true);
  });
});

describe("nothing reaches GitHub without Save (spec §3.10)", () => {
  it("admin.css hides only the header Media button, not the Contents link", () => {
    expect(CSS).toContain(
      'nav [class*="AppHeaderNavList"] li > button[class*="AppHeaderButton"] {\n  display: none !important;\n}',
    );
    // the Contents NavLink is an <a>: no rule hides links in the header list
    expect(CSS).not.toMatch(/AppHeaderNavList[^{]*\ba\b[^{]*\{\s*display:\s*none/);
  });

  it("hides the media library's 'Delete selected' (and 'Deleting...'), nothing else", async () => {
    const { b, layout } = page();
    const del = b.make("button", "", "Delete selected");
    const deleting = b.make("button", "", "Deleting...");
    const choose = b.make("button", "", "Choose selected");
    const upload = b.make("button", "", "Upload");
    for (const x of [del, deleting, choose, upload]) b.document.body.appendChild(x);
    layout._sync();
    expect([del.hidden, deleting.hidden, choose.hidden, upload.hidden]).toEqual([
      true,
      true,
      false,
      false,
    ]);
    // MEASURED: Decap's button styles (display:flex) beat the hidden attribute, so
    // admin.css hides the marked buttons itself.
    expect(del.getAttribute("data-bl-hidden")).toBe("media-delete");
    expect(CSS).toMatch(/button\[data-bl-hidden="media-delete"\] \{\s*display: none !important;/);
  });

  it("admin.css lifts the 'rename your file' toast above Decap's open media library", () => {
    expect(CSS).toMatch(
      /body\.ReactModal__Body--open #bl-corner:has\(\[data-bl-rename\]\) \{\s*z-index: 100000;/,
    );
  });
});

describe("Skip to the live preview (spec §7)", () => {
  it("is the first element of the page on editor routes, hidden elsewhere", () => {
    const { b, layout } = page();
    const skip = b.document.getElementById("bl-skip")!;
    expect(b.document.body.firstChild).toBe(skip);
    expect(skip.tagName).toBe("button");
    expect(skip.textContent).toBe("Skip to the live preview");
    expect(skip.hidden).toBe(false);
    b.env.go("#/collections/news");
    layout._sync();
    expect(skip.hidden).toBe(true);
  });

  it("moves the focus to the live column's selected tab inside Decap's preview frame", () => {
    const { b } = page();
    const inner = new FakeDocument();
    const live = inner.createElement("div");
    live.className = "bl-live";
    const list = inner.createElement("div");
    list.setAttribute("role", "tablist");
    const tab = inner.createElement("button");
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", "true");
    list.appendChild(tab);
    live.appendChild(list);
    inner.body.appendChild(live);
    const frame = b.make("iframe");
    frame.setAttribute("id", "preview-pane");
    (frame as unknown as { contentDocument: FakeDocument }).contentDocument = inner;
    b.document.body.appendChild(frame);
    b.document.getElementById("bl-skip")!.click();
    expect(inner.activeElement).toBe(tab);
  });
});

describe("phones: [Edit] [Preview & history] (spec §8)", () => {
  it("shows the switch on editor routes below 800 px, Edit first", () => {
    const { b } = page({ phone: true });
    const bar = b.document.getElementById("bl-phonebar")!;
    expect(bar.hidden).toBe(false);
    expect(bar.getAttribute("role")).toBe("group");
    const [edit, preview] = bar.querySelectorAll("button");
    expect([edit!.textContent, preview!.textContent]).toEqual(["Edit", "Preview & history"]);
    expect([edit!.getAttribute("aria-pressed"), preview!.getAttribute("aria-pressed")]).toEqual([
      "true",
      "false",
    ]);
    expect(b.document.documentElement!.classList.contains("bl-phone-preview")).toBe(false);
    expect(b.document.documentElement!.classList.contains("bl-editor")).toBe(true);
  });

  it("Preview sets html.bl-phone-preview; Edit takes it off; another entry starts on Edit", async () => {
    const { b, layout } = page({ phone: true });
    const html = b.document.documentElement!;
    const [edit, preview] = b.document.getElementById("bl-phonebar")!.querySelectorAll("button");
    preview!.click();
    await b.run(50);
    expect(html.classList.contains("bl-phone-preview")).toBe(true);
    expect(preview!.getAttribute("aria-pressed")).toBe("true");
    edit!.click();
    await b.run(50);
    expect(html.classList.contains("bl-phone-preview")).toBe(false);
    preview!.click();
    await b.run(50);
    b.env.go("#/collections/news/entries/2026-05-11-other");
    layout._sync();
    expect(html.classList.contains("bl-phone-preview")).toBe(false);
    b.env.go("#/collections/news");
    layout._sync();
    expect(b.document.getElementById("bl-phonebar")!.hidden).toBe(true);
    expect(html.classList.contains("bl-editor")).toBe(false);
  });

  it("Preview turns the live column on first when the eye had turned it off", async () => {
    const { b } = page({ phone: true, pane2: false });
    b.document.getElementById("bl-phonebar")!.querySelectorAll("button")[1]!.click();
    await b.run(200);
    expect(b.log.eyeClicks).toBe(1);
    expect(b.document.documentElement!.classList.contains("bl-phone-preview")).toBe(true);
  });

  it("no switch on wider screens", () => {
    const { b } = page({ phone: false });
    const bar = b.document.getElementById("bl-phonebar");
    expect(bar === null || bar.hidden).toBe(true);
  });

  it("admin.css keeps the live column rendered off-screen in Edit (not display:none), full width in Preview", () => {
    const phone = CSS.slice(CSS.indexOf("@media (max-width: 799px)"));
    expect(phone).toMatch(
      /\[class\*="StyledSplitPane"\] > \.Pane2 \{\s*position: absolute !important;\s*top: 0;\s*left: -10000px;\s*width: 390px !important;\s*height: 100%;\s*visibility: hidden;/,
    );
    expect(phone).toMatch(
      /html\.bl-phone-preview body \[class\*="StyledSplitPane"\] > \.Pane1 \{\s*display: none;/,
    );
    expect(phone).toMatch(
      /html\.bl-phone-preview body \[class\*="StyledSplitPane"\] > \.Pane2 \{[^}]*visibility: visible;/,
    );
    // The old rule that removed the live column on phones is gone; ViewControls stay hidden.
    expect(CSS).not.toMatch(/> \.Pane2,\s*html body \[class\*="ViewControls"\]/);
    expect(phone).toMatch(/\[class\*="ViewControls"\] \{\s*display: none;/);
    // The switch sits on the safe area; the form makes room for it and the dock.
    expect(CSS).toContain("height: calc(44px + env(safe-area-inset-bottom));");
    expect(CSS).toContain(
      "padding-bottom: calc(44px + 8px + 44px + 16px + env(safe-area-inset-bottom));",
    );
  });

  it("admin.css hides Decap's Save menu only while the one-click pick runs", () => {
    expect(CSS).toContain(
      'html.bl-one-click [class*="ToolbarDropdown"]:has([class*="PublishButton"]) [role="menu"] {\n  display: none !important;\n}',
    );
  });
});
