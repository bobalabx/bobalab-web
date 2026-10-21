/*
 * Accessibility patches for Decap CMS 3.17.1's own editor UI (WP6; brief §G1).
 *
 * axe (wcag2a/2aa/21aa/22aa) found unnamed controls in the vendored editor
 * (MEASURED 2026-10-20, tests/e2e/cms-local.spec.ts). The bundle itself must
 * stay byte-identical to npm (SHA-256 pinned), so this script only ADDS
 * missing names and states after Decap renders; it never removes anything:
 *  - the preview iframe gets a title;
 *  - rich-text editors get the name of their field label;
 *  - the "Markdown" mode switch gets a name and an aria-checked state;
 *  - icon-only list buttons (expand/collapse, remove) and drag handles get names;
 *  - toolbar menus get one tab stop instead of two nested ones.
 * Colour-contrast fixes for the same UI are in admin.css.
 */
(function () {
  "use strict";

  function labelText(label) {
    // Decap appends "<span> (optional)</span>"; the first text node is the name.
    var first = label.firstChild;
    var t = first && first.nodeType === 3 ? first.textContent : label.textContent;
    return (t || "").trim();
  }

  function patch() {
    var i, el, list;

    list = document.querySelectorAll("iframe#preview-pane:not([title])");
    for (i = 0; i < list.length; i++) list[i].setAttribute("title", "Preview of this entry");

    list = document.querySelectorAll('.slate-editor[role="textbox"]:not([aria-label])');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var ctl = el.closest('[class*="ControlContainer"]');
      var label = ctl && ctl.querySelector("label");
      if (label && labelText(label)) el.setAttribute("aria-label", labelText(label));
    }

    list = document.querySelectorAll('button[role="switch"][class*="ToolbarToggle"]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", "Markdown mode");
      // In Markdown (raw) mode Decap disables the formatting buttons.
      var box = el.closest('[class*="ControlContainer"]');
      var bold = box && box.querySelector('button[title="Bold"]');
      var raw = String(!!(bold && bold.disabled));
      if (el.getAttribute("aria-checked") !== raw) el.setAttribute("aria-checked", raw);
    }

    list = document.querySelectorAll('[class*="TopBar"] > button:not([aria-label])');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      if ((el.textContent || "").trim()) continue;
      var buttons = el.parentElement.querySelectorAll(":scope > button");
      el.setAttribute(
        "aria-label",
        el === buttons[0] ? "Expand or collapse this item" : "Remove this item",
      );
    }

    list = document.querySelectorAll(
      '[role="button"][aria-roledescription="sortable"]:not([aria-label])',
    );
    for (i = 0; i < list.length; i++) list[i].setAttribute("aria-label", "Drag to reorder");

    // Lists in the rich-text editor: Slate wraps each <li> in a block <div>
    // (<ul><div><li>), which breaks the list structure for screen readers. The
    // wrapper becomes the list item and the inner <li> presentational.
    list = document.querySelectorAll(
      ".slate-editor ul > div[data-block-id]:not([role]), .slate-editor ol > div[data-block-id]:not([role])",
    );
    for (i = 0; i < list.length; i++) {
      list[i].setAttribute("role", "listitem");
      var li = list[i].querySelector(":scope > li");
      if (li && !li.hasAttribute("role")) li.setAttribute("role", "none");
    }

    // Toolbar menus (e.g. "Headings"): a focusable menu trigger wraps a second
    // focusable button, giving two tab stops for one control. Keep the trigger
    // (it owns the keyboard handling and gets the name) and make the inner button inert.
    list = document.querySelectorAll('span[role="button"][aria-haspopup="true"] > button[title]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      // inert: not focusable, not in the accessibility tree, and clicks fall through
      // to the trigger underneath, which opens the menu as before.
      if (!el.hasAttribute("inert")) el.setAttribute("inert", "");
      if (!el.parentElement.hasAttribute("aria-label"))
        el.parentElement.setAttribute("aria-label", el.title);
    }
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () {
      queued = false;
      patch();
    });
  }

  function start() {
    patch();
    // Structure, plus the `disabled` flips that mark Markdown mode. Our own writes
    // (aria-*, title, inert) are not observed, so patching never loops.
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled"],
    });
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
