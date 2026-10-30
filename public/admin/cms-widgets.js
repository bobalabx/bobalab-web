/*
 * Widget fixes and our own widget for Decap 3.17.1, registered before Decap starts:
 *  - rich-text body fields without false "Unsaved changes" (WP6, below);
 *  - the list widget: removing a single-field item, Up/Down arrow keys (further down);
 *  - "visible": the "Visible on the website: Yes / No" switch, which shows the
 *    stored `draft` boolean the other way round (D-21, at the end).
 *
 * Rich-text body fields without false "Unsaved changes" (WP6).
 *
 * MEASURED 2026-10-20 (decap-cms 3.17.1, tests/e2e/cms-local.spec.ts): the
 * `richtext` widget re-serialises the stored Markdown as soon as it mounts
 * (e.g. "-" list markers become "*", tight lists become loose) and reports that
 * as a change. Every entry with a body field therefore showed "Unsaved changes"
 * the moment it opened, asked "leave this page?" on the way out, and a Save
 * would have opened a pull request that only re-formats the text.
 *
 * This file keeps the brief's `richtext` widget (config.yml is unchanged) and
 * re-registers it under the same name with a thin wrapper around Decap's own
 * control. Until the editor interacts with that field (a key, click, touch,
 * paste, drop or text input inside it), changes are taken to be the load-time
 * re-serialisation and are not passed on. Afterwards every change is passed on,
 * except that the load-time form is mapped back to the stored text, so undoing
 * an edit returns the entry to "Changes saved". A real edit still saves Decap's
 * own Markdown for the whole body (docs/EDITING.md, "Tips and known quirks").
 *
 * The bundle stays byte-identical to npm. tests/unit/cms/widgets.test.ts covers
 * the gate; tests/e2e/cms-local.spec.ts checks the behaviour in the browser.
 */
(function (root) {
  "use strict";

  /**
   * Decides which changes of one rich-text control reach Decap.
   * @param {unknown} stored the field's value as loaded from the file
   * @param {(value: unknown, rest: unknown[]) => void} forward
   */
  function createGate(stored, forward) {
    var baseline; // the control's own re-serialisation of `stored`
    var hasBaseline = false;
    var acted = false;
    var sent;
    var hasSent = false;
    var recent = []; // values passed on lately: props may still show an older one
    return {
      /** The editor touched this field (key, pointer, paste, drop, input). */
      act: function () {
        acted = true;
      },
      /** A new value arrived from outside (another entry, a revert): start over. */
      reset: function (value) {
        stored = value;
        baseline = undefined;
        hasBaseline = false;
        acted = false;
        hasSent = false;
        recent = [];
      },
      /** Did this gate pass `value` on (lately)? Then it is not a change from outside. */
      isOwn: function (value) {
        return recent.indexOf(value) !== -1;
      },
      /**
       * A change from the control. `current` is the field's value in the props.
       * Returns true when the change was passed on.
       */
      change: function (next, current, rest) {
        if (!acted) {
          baseline = next;
          hasBaseline = true;
          return false;
        }
        var out = hasBaseline && next === baseline ? stored : next;
        // Fast typing can outrun React: the props may not show our last change
        // yet, so compare with what Decap was last given (MEASURED: an undo
        // right after typing was otherwise dropped and the entry stayed changed).
        var held = hasSent ? sent : current;
        if (out === held) return false;
        sent = out;
        hasSent = true;
        recent.push(out);
        if (recent.length > 50) recent.shift();
        forward(out, rest || []);
        return true;
      },
    };
  }

  var EVENTS = [
    "onKeyDownCapture",
    "onMouseDownCapture",
    "onPointerDownCapture",
    "onTouchStartCapture",
    "onPasteCapture",
    "onDropCapture",
    "onCutCapture",
    "onBeforeInputCapture",
    "onInputCapture",
    "onCompositionStartCapture",
  ];

  function wrap(Base, h, createClass) {
    return createClass({
      displayName: "BobalabRichtextControl",
      getInitialState: function () {
        this.inner = null;
        // createClass binds component methods, so `this.forward` keeps its `this`.
        this.gate = createGate(this.props.value, this.forward);
        return {};
      },
      forward: function (value, rest) {
        this.props.onChange.apply(null, [value].concat(rest));
      },
      componentDidUpdate: function (prev) {
        var v = this.props.value;
        if (v !== prev.value && !this.gate.isOwn(v)) this.gate.reset(v);
      },
      handleChange: function (next) {
        this.gate.change(next, this.props.value, Array.prototype.slice.call(arguments, 1));
      },
      markActed: function () {
        this.gate.act();
      },
      setInner: function (ref) {
        this.inner = ref;
      },
      // Decap's Widget calls focus() on its control (label click, error jump).
      focus: function (e) {
        if (this.inner && typeof this.inner.focus === "function") this.inner.focus(e);
      },
      render: function () {
        var props = {};
        for (var k in this.props) props[k] = this.props[k];
        props.onChange = this.handleChange;
        props.ref = this.setInner;
        var outer = { className: "bobalab-richtext" };
        for (var i = 0; i < EVENTS.length; i++) outer[EVENTS[i]] = this.markActed;
        return h("div", outer, h(Base, props));
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Removing an item from a single-field list (verification finding CMS-01).
  //
  // MEASURED 2026-10-20 (decap-cms 3.17.1): ListControl.handleRemove computes the
  // metadata path of the removed item as the item's VALUE for single-field lists
  // (`field:` instead of `fields:`), e.g. the slug "ai-at-work", and then calls
  // `metadata.removeIn("ai-at-work")` whenever the list has relation metadata.
  // Immutable rejects a string key path ("Invalid keyPath: expected Ordered
  // Collection or Array"), so the click throws and nothing is removed. Every
  // Settings → Site → Direction order item has such metadata (relation widget).
  //
  // The subclass below runs Decap's own handleRemove unchanged, but for
  // single-field lists it hides the metadata from that one call. Decap then
  // passes no metadata update along with the shorter list, which is what the
  // removeIn could at best have done anyway: list metadata is keyed by the item
  // field's name ("direction"), never by a value, so the path matched nothing.
  // The metadata is kept for the remaining items' preview labels.
  // tests/unit/cms/widgets.test.ts covers it; tests/e2e/cms-local.spec.ts removes
  // a Direction order item in the browser. Re-check at every Decap bump.

  /** Is this a list of single values (`field:`), Decap's "SINGLE" list type? */
  function isSingleList(field) {
    if (!field || typeof field.get !== "function") return false;
    return !field.get("fields") && !field.get("types") && !!field.get("field");
  }

  // ---------------------------------------------------------------------------
  // Reordering list items with the keyboard (verification findings CMS-08, CMS-12).
  //
  // MEASURED 2026-10-20: Decap 3.17.1's list widget gives dnd-kit only mouse and
  // touch sensors, so a focused drag handle ignores the keyboard (Space, arrows),
  // although dnd-kit still describes the keyboard steps to screen readers. The
  // subclass wraps the list in a <div> that listens for Up and Down arrow keys on
  // one of ITS OWN handles, moves the item with Decap's own onSortEnd (the same
  // call a mouse drop makes), puts the focus back on the moved handle and
  // announces the new position. cms-a11y.js names the handles and describes the keys.

  // Decap renders no item ids into the page, so each item gets its list key
  // (dnd-kit's id for it) as data-bobalab-key after every render; cms-a11y.js
  // uses it to name items in dnd-kit's spoken messages.
  var KEY = "data-bobalab-key";
  var ITEM = '[class*="SortableListItem"]';
  var live = null;

  function announce(text) {
    if (typeof document === "undefined") return;
    if (!live || !live.isConnected) {
      live = document.createElement("div");
      live.id = "bobalab-reorder-status";
      live.setAttribute("role", "status");
      live.setAttribute("aria-live", "polite");
      live.style.cssText =
        "position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap";
      document.body.appendChild(live);
    }
    live.textContent = "";
    // Cleared first, so the same message twice is read twice.
    setTimeout(function () {
      live.textContent = text;
    }, 50);
  }

  /** The list item element of a keydown on its drag handle, or null. */
  function handleItem(target) {
    if (!target || typeof target.closest !== "function") return null;
    if (target.getAttribute("aria-roledescription") !== "sortable") return null;
    if (!target.closest('[class*="TopBar"]')) return null; // a multi-select chip
    return target.closest(ITEM);
  }

  /** New index for an arrow key, or -1 when the item cannot move that way. */
  function moveTarget(key, index, size) {
    var j = key === "ArrowUp" ? index - 1 : key === "ArrowDown" ? index + 1 : -1;
    return j >= 0 && j < size && index >= 0 ? j : -1;
  }

  /** This list's own item elements, in order (not those of nested lists). */
  function itemsOf(wrapper, forID) {
    if (!wrapper) return [];
    var listRoot = null;
    for (var c = wrapper.firstElementChild; c; c = c.nextElementSibling)
      if (c.id === forID) listRoot = c;
    if (!listRoot) return [];
    return Array.prototype.slice.call(listRoot.querySelectorAll(":scope > div > " + ITEM));
  }

  function itemLabel(item) {
    var bar = item && item.querySelector(':scope > [class*="TopBar"]');
    var next = bar && bar.nextElementSibling;
    return next ? (next.textContent || "").replace(/s+/g, " ").trim() : "";
  }

  function patchList(Base, h) {
    if (typeof Base !== "function") return Base;
    class BobalabListControl extends Base {
      constructor(props) {
        super(props);
        var self = this;
        this.bobalabEl = null;
        this.bobalabRef = function (el) {
          self.bobalabEl = el;
        };
        this.bobalabKeyDown = function (e) {
          if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
          var item = handleItem(e.target);
          var key = item && item.getAttribute(KEY);
          var keys = (self.state && self.state.keys) || [];
          var i = key ? keys.indexOf(key) : -1;
          if (i === -1) return; // not a handle of THIS list (a nested list handles its own)
          var j = moveTarget(e.key, i, keys.length);
          if (j === -1) return;
          e.preventDefault();
          e.stopPropagation();
          var label = itemLabel(item);
          self.onSortEnd({ oldIndex: i, newIndex: j });
          setTimeout(function () {
            var moved = itemsOf(self.bobalabEl, self.props.forID).filter(function (el) {
              return el.getAttribute(KEY) === key;
            })[0];
            var h2 = moved && moved.querySelector('[aria-roledescription="sortable"]');
            if (h2 && document.activeElement !== h2) h2.focus();
          }, 0);
          announce(
            (label ? "“" + label + "”" : "Item") +
              " moved to position " +
              (j + 1) +
              " of " +
              keys.length +
              ".",
          );
        };
        var inherited = this.handleRemove;
        if (typeof inherited !== "function") return;
        this.handleRemove = function (index, event) {
          var props = self.props;
          var meta = props && props.metadata;
          if (!isSingleList(props && props.field) || !meta || meta.size === 0) {
            return inherited(index, event);
          }
          // handleRemove reads this.props synchronously, then calls onChange.
          self.props = Object.assign({}, props, { metadata: undefined });
          try {
            return inherited(index, event);
          } finally {
            self.props = props;
          }
        };
      }
      bobalabTag() {
        var keys = (this.state && this.state.keys) || [];
        itemsOf(this.bobalabEl, this.props.forID).forEach(function (el, i) {
          if (keys[i] && el.getAttribute(KEY) !== keys[i]) el.setAttribute(KEY, keys[i]);
        });
      }
      componentDidMount() {
        if (super.componentDidMount) super.componentDidMount();
        this.bobalabTag();
      }
      componentDidUpdate(prevProps, prevState, snapshot) {
        if (super.componentDidUpdate) super.componentDidUpdate(prevProps, prevState, snapshot);
        this.bobalabTag();
      }
      render() {
        var inner = super.render();
        if (typeof h !== "function" || typeof this.onSortEnd !== "function") return inner;
        return h(
          "div",
          { className: "bobalab-list", onKeyDown: this.bobalabKeyDown, ref: this.bobalabRef },
          inner,
        );
      }
    }
    return BobalabListControl;
  }

  // ---------------------------------------------------------------------------
  // "Visible on the website: Yes / No" (owner decision 2026-10-29, DECISIONS D-21).
  //
  // Every entry keeps its stored `draft` boolean (the site, the validator and
  // D-03 are unchanged); the editor shows it the other way round, as a switch:
  //   Yes = draft: false (on the live site), No = draft: true (hidden).
  // A missing value is Yes, as the schema's default (false) says. The control
  // only ever writes true or false, and only when the editor presses it: it
  // never calls onChange while mounting, so opening an entry does not mark it
  // changed. It shows the value it is given (Restore, Undo and "Bring in their
  // changes" set the field from outside), unlike Decap's own toggle, which keeps
  // the value it had when it mounted.
  //
  // A <button role="switch"> like Decap's toggle: Decap's label (for=forID)
  // names it, aria-checked carries the state, and the visible word Yes/No says
  // it without colour. Enter and Space press it. Styles: admin.css (.bl-visible).

  /** Is the entry hidden from the live site? Only `true` hides it (as on the site). */
  function isHidden(value) {
    return value === true;
  }

  /** The stored value after one press: always a boolean. */
  function toggled(value) {
    return !isHidden(value);
  }

  /** "Yes" (shown on the live site) or "No" (hidden). */
  function visibleWord(value) {
    return isHidden(value) ? "No" : "Yes";
  }

  function visibleControl(h, createClass) {
    return createClass({
      displayName: "BobalabVisibleControl",
      press: function () {
        this.props.onChange(toggled(this.props.value));
      },
      focus: function () {
        if (this.button && typeof this.button.focus === "function") this.button.focus();
      },
      setButton: function (el) {
        this.button = el;
      },
      render: function () {
        var shown = !isHidden(this.props.value);
        return h(
          "div",
          { className: this.props.classNameWrapper },
          h(
            "button",
            {
              type: "button",
              id: this.props.forID,
              role: "switch",
              "aria-checked": shown ? "true" : "false",
              className: shown ? "bl-visible bl-visible--yes" : "bl-visible bl-visible--no",
              onClick: this.press,
              onFocus: this.props.setActiveStyle,
              onBlur: this.props.setInactiveStyle,
              ref: this.setButton,
            },
            h(
              "span",
              { className: "bl-visible__track", "aria-hidden": "true" },
              h("span", { className: "bl-visible__knob" }),
            ),
            h("span", { className: "bl-visible__word" }, visibleWord(this.props.value)),
          ),
        );
      },
    });
  }

  /** Decap's widget preview (not shown by our live column, which draws the real site). */
  function visiblePreview(h) {
    return function (props) {
      return h("span", null, visibleWord(props && props.value));
    };
  }

  var api = {
    createGate: createGate,
    wrap: wrap,
    patchList: patchList,
    isSingleList: isSingleList,
    handleItem: handleItem,
    moveTarget: moveTarget,
    itemsOf: itemsOf,
    isHidden: isHidden,
    toggled: toggled,
    visibleWord: visibleWord,
    visibleControl: visibleControl,
  };
  root.BobalabCmsWidgets = api;

  var CMS = root.CMS;
  if (!CMS || typeof CMS.getWidget !== "function") return;
  var list = CMS.getWidget("list");
  if (list && list.control) {
    CMS.registerWidget("list", patchList(list.control, root.h), list.preview, list.schema);
  }
  if (!root.h || !root.createClass) return;
  // Before Decap starts (cms-start.js), so config.yml may name the widget.
  CMS.registerWidget("visible", visibleControl(root.h, root.createClass), visiblePreview(root.h));
  var rt = CMS.getWidget("richtext");
  if (!rt || !rt.control) return;
  CMS.registerWidget("richtext", wrap(rt.control, root.h, root.createClass), rt.preview, rt.schema);
})(typeof window !== "undefined" ? window : globalThis);
