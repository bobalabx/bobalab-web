/*
 * Accessibility patches for Decap CMS 3.17.1's own editor UI (WP6; brief §G1).
 *
 * axe (wcag2a/2aa/21aa/22aa) found unnamed controls in the vendored editor
 * (MEASURED 2026-10-20, tests/e2e/cms-local.spec.ts). The bundle itself must
 * stay byte-identical to npm (SHA-256 pinned), so this script only adds
 * missing names and states after Decap renders, and never removes an element:
 *  - the preview iframe gets a title;
 *  - rich-text editors get the name of their field label;
 *  - the "Markdown" mode switch gets a name and an aria-checked state;
 *  - icon-only list buttons (expand/collapse, remove) and drag handles get names
 *    that say which item they act on and its position (verification CMS-12);
 *  - dnd-kit's spoken drag messages name the item and position instead of UUIDs;
 *  - "(optional)" is hidden on labels that state their own condition (CMS-09);
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

  // Names this script set (and may update when the item or its position changes).
  var OURS = "data-bobalab-name";
  function name(el, text) {
    if (el.getAttribute("aria-label") !== text) el.setAttribute("aria-label", text);
    if (!el.hasAttribute(OURS)) el.setAttribute(OURS, "");
  }

  /** The visible name of a list item: the summary Decap shows under its top bar. */
  function itemName(bar) {
    var next = bar && bar.nextElementSibling;
    var t = next && /NestedObjectLabel/.test(String(next.className)) ? next.textContent : "";
    return (t || "").replace(/\s+/g, " ").trim().slice(0, 80);
  }

  var HELP_ID = "bobalab-reorder-help";
  function helpText() {
    if (document.getElementById(HELP_ID)) return;
    var d = document.createElement("div");
    d.id = HELP_ID;
    d.hidden = true;
    d.textContent =
      "Press the up or down arrow key to move this item. You can also drag it with the mouse.";
    document.body.appendChild(d);
  }

  var UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

  // Positions seen while dragging (the items only move in the page after the
  // drop, so "dropped over" uses the position the item was moved over).
  var overPos = {};

  /** "Draggable item <uuid> was dropped over droppable area <uuid>" → item names and positions. */
  function readable(text) {
    UUID.lastIndex = 0;
    if (!UUID.test(text)) return text;
    UUID.lastIndex = 0;
    var dropped = /dropped over/i.test(text);
    if (/^Picked up/i.test(text)) overPos = {};
    var where = function (id) {
      // cms-widgets.js tags each list item with its key (dnd-kit's id).
      var item = document.querySelector('[data-bobalab-key="' + id + '"]');
      if (!item || !item.parentElement) return null;
      var items = Array.prototype.slice.call(
        item.parentElement.querySelectorAll(":scope > [data-bobalab-key]"),
      );
      var bar = item.querySelector(':scope > [class*="TopBar"]');
      return { name: itemName(bar) || "item", pos: items.indexOf(item) + 1, of: items.length };
    };
    var out = text
      .replace(/^Picked up draggable item ([0-9a-f-]{36})/i, function (m, id) {
        var w = where(id);
        return w
          ? "Picked up “" + w.name + "”, item " + w.pos + " of " + w.of
          : "Picked up the item";
      })
      .replace(/Draggable item ([0-9a-f-]{36})/gi, function (m, id) {
        var w = where(id);
        return w ? "“" + w.name + "”" : "The item";
      })
      .replace(/droppable area ([0-9a-f-]{36})/gi, function (m, id) {
        var w = where(id);
        if (!w) return "its new position";
        if (dropped && overPos[id]) return overPos[id];
        overPos[id] = "position " + w.pos + " of " + w.of;
        return overPos[id];
      });
    return out.replace(UUID, "item");
  }

  function watchLiveRegion(region) {
    region.setAttribute("data-bobalab-live", "");
    var fix = function () {
      // Change the text node in place: React keeps writing to the same node.
      for (var n = region.firstChild; n; n = n.nextSibling) {
        if (n.nodeType !== 3) continue;
        var t = readable(n.nodeValue || "");
        if (t !== n.nodeValue) n.nodeValue = t;
      }
    };
    fix();
    new MutationObserver(fix).observe(region, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  function patch() {
    var i, el, list;

    // Labels of fields that are required only in some cases say so themselves,
    // e.g. "Alt text (required with an image)"; Decap would still append
    // "(optional)" (CMS-09). The suffix is hidden, also from screen readers. So it
    // is on "Visible on the website" (cms-widgets.js), a Yes/No switch that always
    // has a value.
    list = document.querySelectorAll("label > span:not([hidden])");
    for (i = 0; i < list.length; i++) {
      var lab = list[i].parentElement;
      var own = lab.firstChild;
      var target = lab.htmlFor ? document.getElementById(lab.htmlFor) : null;
      if (
        (own && own.nodeType === 3 && /\(required\b/i.test(own.textContent || "")) ||
        (target && target.classList && target.classList.contains("bl-visible"))
      )
        list[i].setAttribute("hidden", "");
    }

    // Decap's preview frame holds the live column: the site preview and History (cms-live.js).
    list = document.querySelectorAll("iframe#preview-pane:not([title])");
    for (i = 0; i < list.length; i++) list[i].setAttribute("title", "Live preview and history");

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

    // Icon-only list buttons: named after their item (CMS-12), e.g. "Remove “ai-at-work”".
    list = document.querySelectorAll('[class*="TopBar"] > button');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      if (!el.hasAttribute(OURS) && el.hasAttribute("aria-label")) continue; // Decap's own name
      if (!el.hasAttribute(OURS) && (el.textContent || "").trim()) continue;
      var buttons = el.parentElement.querySelectorAll(":scope > button");
      var item = itemName(el.parentElement);
      var what = item ? "“" + item + "”" : "this item";
      name(el, el === buttons[0] ? "Expand or collapse " + what : "Remove " + what);
    }

    // Drag handles (list items and the chips of multi-select fields): what they
    // move and where it is, e.g. "Reorder “ai-at-work”, item 2 of 4" (CMS-12).
    // List items move with the Up and Down arrow keys (cms-widgets.js), not with
    // dnd-kit's Space-then-arrows that Decap's list never enabled, so their
    // description says so. Multi-select chips keep dnd-kit's own description.
    list = document.querySelectorAll('[role="button"][aria-roledescription="sortable"]');
    var groups = [];
    var groupOf = function (box) {
      for (var x = 0; x < groups.length; x++) if (groups[x].box === box) return groups[x];
      groups.push({ box: box, handles: [] });
      return groups[groups.length - 1];
    };
    for (i = 0; i < list.length; i++) {
      var bar = list[i].closest('[class*="TopBar"]');
      // list item: top bar → item → the list's own container; chips: their context
      var box = bar
        ? bar.parentElement && bar.parentElement.parentElement
        : list[i].getAttribute("aria-describedby") || "chips";
      groupOf(box).handles.push(list[i]);
      if (bar) {
        helpText();
        if (list[i].getAttribute("aria-describedby") !== HELP_ID)
          list[i].setAttribute("aria-describedby", HELP_ID);
      }
    }
    groups.forEach(function (g) {
      g.handles.forEach(function (h, k) {
        var bar = h.closest('[class*="TopBar"]');
        var item = bar ? itemName(bar) : (h.textContent || "").trim();
        name(
          h,
          "Reorder " +
            (item ? "“" + item + "”" : "item") +
            ", item " +
            (k + 1) +
            " of " +
            g.handles.length,
        );
      });
    });

    // dnd-kit's spoken drag messages name items by internal ids (UUIDs).
    list = document.querySelectorAll('[id^="DndLiveRegion"]:not([data-bobalab-live])');
    for (i = 0; i < list.length; i++) watchLiveRegion(list[i]);

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
