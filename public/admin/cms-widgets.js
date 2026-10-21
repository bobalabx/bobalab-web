/*
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

  var api = { createGate: createGate, wrap: wrap };
  root.BobalabCmsWidgets = api;

  var CMS = root.CMS;
  if (!CMS || typeof CMS.getWidget !== "function" || !root.h || !root.createClass) return;
  var rt = CMS.getWidget("richtext");
  if (!rt || !rt.control) return;
  CMS.registerWidget("richtext", wrap(rt.control, root.h, root.createClass), rt.preview, rt.schema);
})(typeof window !== "undefined" ? window : globalThis);
