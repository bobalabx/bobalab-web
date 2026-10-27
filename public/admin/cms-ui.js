/*
 * BOBALAB CMS: dialogs, toasts, announcements and times (editor v2, WP3).
 * Loaded by /admin/ after cms-a11y.js; sets window.BobalabUi.
 *
 *  - confirm(): a native <dialog> opened with showModal(). It is built from
 *    buttons only, because the admin CSP has form-action 'none'. Cancel has the
 *    first focus, Esc cancels, and focus goes back to the opener afterwards.
 *  - toast(): small messages stacked in #bl-toasts (role=status), with an
 *    optional action button. A toast closes by itself after 8 s (0 = it stays);
 *    the timer pauses while the pointer is over it or focus is inside it.
 *  - announce(): one polite and one assertive screen-reader region.
 *  - timeAgo(), fullTime() and friends: times in the viewer's own time zone
 *    (owner default, open question 15), e.g. "Oct 26, 2026, 3:14 pm PDT".
 *
 * #bl-toasts sits in one fixed corner box (.bl-corner) together with the
 * dock's #bl-banner and #bl-dock (cms-dock.js), so the three never overlap.
 * Styles: cms-ui.css. tests/unit/cms/ui.test.ts runs this file in a sandbox.
 */
(function (root) {
  "use strict";

  var uid = 0;

  function doc() {
    var d = root.document;
    return d && typeof d.createElement === "function" ? d : null;
  }

  /** A new element: el("p", { className, text, attrs: {...}, on: {click: fn} }, [children]). */
  function el(tag, props, kids) {
    var d = doc();
    var n = d.createElement(tag);
    props = props || {};
    if (props.className) n.className = props.className;
    if (props.id) n.id = props.id;
    if (props.text !== undefined && props.text !== null) n.textContent = String(props.text);
    var attrs = props.attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false)
        n.setAttribute(k, attrs[k] === true ? "" : String(attrs[k]));
    });
    var on = props.on || {};
    Object.keys(on).forEach(function (k) {
      n.addEventListener(k, on[k]);
    });
    (kids || []).forEach(function (k) {
      if (k) n.appendChild(k);
    });
    return n;
  }

  function button(text, className, onClick, attrs) {
    return el(
      "button",
      {
        className: className || "bl-btn",
        text: text,
        attrs: Object.assign({ type: "button" }, attrs || {}),
        on: onClick ? { click: onClick } : {},
      },
      [],
    );
  }

  function focusSafely(target) {
    try {
      if (!target || typeof target.focus !== "function") return;
      // An element inside a frame (the live column's buttons sit in Decap's
      // preview frame): focus that frame first, so the focus lands on the element
      // and not on the frame's page.
      var view = target.ownerDocument && target.ownerDocument.defaultView;
      var frame = view && view !== root ? view.frameElement : null;
      if (frame && typeof frame.focus === "function") frame.focus();
      target.focus();
    } catch {
      // the element may have left the page
    }
  }

  // ---------------------------------------------------------------------------
  // The fixed corner box: toasts, then the dock's banner and dock (cms-dock.js)

  function corner() {
    var d = doc();
    if (!d) return null;
    var box = d.getElementById("bl-corner");
    if (!box) {
      box = el("div", { id: "bl-corner", className: "bl-corner" });
      d.body.appendChild(box);
    }
    return box;
  }

  function toastBox() {
    var d = doc();
    if (!d) return null;
    var box = d.getElementById("bl-toasts");
    if (!box) {
      box = el("div", {
        id: "bl-toasts",
        className: "bl-toasts",
        attrs: { role: "status", "aria-live": "polite", "aria-atomic": "false" },
      });
      var c = corner();
      c.insertBefore(box, c.firstChild || null);
    }
    return box;
  }

  // ---------------------------------------------------------------------------
  // Dialogs

  /** Paragraphs for a dialog body: a string is a paragraph, an array a bulleted list. */
  function bodyNodes(body) {
    return (body || [])
      .filter(function (p) {
        return p !== null && p !== undefined && p !== "" && !(Array.isArray(p) && !p.length);
      })
      .map(function (p) {
        if (Array.isArray(p)) {
          return el(
            "ul",
            { className: "bl-dialog__list" },
            p.map(function (li) {
              return el("li", { text: li });
            }),
          );
        }
        return el("p", { text: p });
      });
  }

  /**
   * The shared dialog builder: a modal <dialog class="bl-dialog"> with a title,
   * body, optional checkboxes and buttons. Resolves with the pressed button's key
   * ("cancel" for Esc) and the checkbox states.
   */
  function dialog(opts) {
    var d = doc();
    if (!d) return Promise.resolve({ key: "cancel", checked: {} });
    return new Promise(function (resolve) {
      var id = "bl-dlg-" + ++uid;
      var opener = opts.returnFocus || d.activeElement;
      var boxes = {};
      var done = false;
      var dlg = el("dialog", {
        className: "bl-dialog" + (opts.className ? " " + opts.className : ""),
        attrs: { "aria-labelledby": id + "-title", "aria-describedby": id + "-body" },
      });

      function finish(key) {
        if (done) return;
        done = true;
        var checked = {};
        Object.keys(boxes).forEach(function (k) {
          checked[k] = !!boxes[k].checked;
        });
        try {
          if (dlg.open && typeof dlg.close === "function") dlg.close();
        } catch {
          // already closed
        }
        if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
        focusSafely(opener);
        resolve({ key: key, checked: checked });
      }

      dlg.appendChild(
        el("h2", { id: id + "-title", className: "bl-dialog__title", text: opts.title }),
      );
      dlg.appendChild(
        el("div", { id: id + "-body", className: "bl-dialog__body" }, bodyNodes(opts.body)),
      );
      if (opts.content) dlg.appendChild(opts.content);
      if (opts.checkboxes && opts.checkboxes.length) {
        var checks = el("div", { className: "bl-dialog__checks" });
        opts.checkboxes.forEach(function (c) {
          var cid = id + "-" + c.id;
          var input = el("input", { id: cid, attrs: { type: "checkbox" } });
          input.checked = !!c.checked;
          boxes[c.id] = input;
          checks.appendChild(
            el("div", { className: "bl-check" }, [
              input,
              el("label", { text: c.label, attrs: { for: cid } }),
            ]),
          );
        });
        dlg.appendChild(checks);
      }
      if (opts.link && opts.link.href) {
        dlg.appendChild(
          el("p", { className: "bl-dialog__link" }, [
            el("a", {
              text: opts.link.label,
              attrs: { href: opts.link.href, target: "_blank", rel: "noopener noreferrer" },
            }),
          ]),
        );
      }
      var first = null;
      var actions = el("div", { className: "bl-dialog__actions" });
      (opts.buttons || []).forEach(function (b) {
        var cls =
          "bl-btn" + (b.primary ? " bl-btn--primary" : "") + (b.danger ? " bl-btn--danger" : "");
        var btn = button(b.label, cls, function () {
          finish(b.key);
        });
        actions.appendChild(btn);
        if (b.focus) first = btn;
      });
      dlg.appendChild(actions);

      // Esc fires "cancel"; closing by any other route counts as Cancel too.
      dlg.addEventListener("cancel", function (e) {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        finish("cancel");
      });
      dlg.addEventListener("close", function () {
        finish("cancel");
      });

      d.body.appendChild(dlg);
      if (typeof dlg.showModal === "function") dlg.showModal();
      else dlg.setAttribute("open", "");
      focusSafely(first || actions.firstChild);
      if (typeof opts.onOpen === "function") opts.onOpen(dlg, finish);
    });
  }

  /**
   * confirm({title, body, confirm, cancel?, checkboxes?, danger?, returnFocus?})
   * → Promise<{ok, checked}>. Buttons: [confirm] [Cancel]; Cancel has first focus.
   */
  function confirm(opts) {
    opts = opts || {};
    return dialog({
      title: opts.title,
      body: opts.body,
      checkboxes: opts.checkboxes,
      returnFocus: opts.returnFocus,
      className: opts.danger ? "bl-dialog--danger" : "",
      buttons: [
        { key: "ok", label: opts.confirm || "OK", primary: !opts.danger, danger: !!opts.danger },
        { key: "cancel", label: opts.cancel || "Cancel", focus: true },
      ],
    }).then(function (r) {
      return { ok: r.key === "ok", checked: r.checked };
    });
  }

  /** info({title, body, link?: {label, href}, close?, returnFocus?}): one Close button. */
  function info(opts) {
    opts = opts || {};
    return dialog({
      title: opts.title,
      body: opts.body,
      link: opts.link,
      returnFocus: opts.returnFocus,
      buttons: [{ key: "close", label: opts.close || "Close", focus: true }],
    }).then(function () {
      return undefined;
    });
  }

  // ---------------------------------------------------------------------------
  // Toasts

  /**
   * toast({text, action?: {label, run, ariaLabel?}, timeoutMs?, onClose?}) →
   * {close(), setText(t), setAction(a), el, isOpen()}. timeoutMs: default 8000;
   * 0 keeps it until closed. onClose(reason): "timeout" | "dismiss" | "action" | "closed".
   */
  function toast(opts) {
    opts = opts || {};
    var timeoutMs = opts.timeoutMs === undefined || opts.timeoutMs === null ? 8000 : opts.timeoutMs;
    var open = true;
    var timer = null;
    var remaining = timeoutMs;
    var armedAt = 0;
    var hover = false;
    var focus = false;
    var handle = {
      el: null,
      isOpen: function () {
        return open;
      },
      close: function () {
        closeIt("closed");
      },
      setText: function () {},
      setAction: function () {},
    };
    var box = toastBox();
    if (!box) {
      open = false;
      return handle;
    }
    var textEl = el("p", { className: "bl-toast__text", text: opts.text });
    var actions = el("div", { className: "bl-toast__actions" });
    var t = el("div", { className: "bl-toast" }, [textEl, actions]);
    var actionBtn = null;
    var closeBtn = button("Dismiss", "bl-btn bl-btn--quiet bl-toast__close", function () {
      closeIt("dismiss");
    });
    actions.appendChild(closeBtn);

    function disarm() {
      if (timer !== null) {
        root.clearTimeout(timer);
        remaining -= Date.now() - armedAt;
        timer = null;
      }
    }
    function arm() {
      if (!open || !timeoutMs || timer !== null || hover || focus) return;
      armedAt = Date.now();
      timer = root.setTimeout(
        function () {
          timer = null;
          closeIt("timeout");
        },
        Math.max(0, remaining),
      );
    }
    function closeIt(reason) {
      if (!open) return;
      open = false;
      if (timer !== null) root.clearTimeout(timer);
      timer = null;
      var hadFocus = typeof t.contains === "function" && t.contains(doc().activeElement);
      if (t.parentNode) t.parentNode.removeChild(t);
      if (hadFocus) focusSafely(opts.returnFocus || null);
      if (typeof opts.onClose === "function") {
        try {
          opts.onClose(reason);
        } catch {
          // a listener's problem must not break the toast stack
        }
      }
    }
    function setAction(a) {
      if (actionBtn && actionBtn.parentNode) actionBtn.parentNode.removeChild(actionBtn);
      actionBtn = null;
      if (!a || !open) return;
      actionBtn = button(
        a.label,
        "bl-btn bl-btn--primary bl-toast__action",
        function () {
          closeIt("action");
          a.run();
        },
        a.ariaLabel ? { "aria-label": a.ariaLabel } : null,
      );
      actions.insertBefore(actionBtn, closeBtn);
    }

    t.addEventListener("mouseenter", function () {
      hover = true;
      disarm();
    });
    t.addEventListener("mouseleave", function () {
      hover = false;
      arm();
    });
    t.addEventListener("focusin", function () {
      focus = true;
      disarm();
    });
    t.addEventListener("focusout", function (e) {
      if (e && e.relatedTarget && typeof t.contains === "function" && t.contains(e.relatedTarget))
        return;
      focus = false;
      arm();
    });

    handle.el = t;
    handle.setText = function (text) {
      textEl.textContent = String(text);
    };
    handle.setAction = setAction;
    if (opts.action) setAction(opts.action);
    box.appendChild(t);
    arm();
    return handle;
  }

  // ---------------------------------------------------------------------------
  // Screen-reader announcements

  var announceTimer = { polite: null, assertive: null };

  function region(kind) {
    var d = doc();
    if (!d) return null;
    var id = kind === "assertive" ? "bl-announce-assertive" : "bl-announce-polite";
    var r = d.getElementById(id);
    if (!r) {
      r = el("div", {
        id: id,
        className: "bl-sr-only",
        attrs:
          kind === "assertive"
            ? { role: "alert", "aria-live": "assertive", "aria-atomic": "true" }
            : { "aria-live": "polite", "aria-atomic": "true" },
      });
      d.body.appendChild(r);
    }
    return r;
  }

  /** Say `text` once to screen readers; assertive for a failure of the editor's own save. */
  function announce(text, assertive) {
    var kind = assertive ? "assertive" : "polite";
    var r = region(kind);
    if (!r) return;
    // Clear first so the same words are read again.
    r.textContent = "";
    if (announceTimer[kind] !== null) root.clearTimeout(announceTimer[kind]);
    announceTimer[kind] = root.setTimeout(function () {
      announceTimer[kind] = null;
      r.textContent = String(text || "");
    }, 60);
  }

  // ---------------------------------------------------------------------------
  // Times, in the viewer's own time zone ("en-US" wording, "3:14 pm")

  function toDate(x) {
    if (x instanceof Date) return x;
    if (typeof x === "number") return new Date(x);
    return new Date(String(x || ""));
  }

  function valid(d) {
    return d instanceof Date && !isNaN(d.getTime());
  }

  function tidy(s) {
    return String(s)
      .replace(/[  ]/g, " ")
      .replace(/ (AM|PM)\b/g, function (_, p) {
        return " " + p.toLowerCase();
      });
  }

  function fmt(d, options, opts) {
    var o = Object.assign({}, options);
    if (opts && opts.timeZone) o.timeZone = opts.timeZone;
    return tidy(new Intl.DateTimeFormat("en-US", o).format(d));
  }

  /** "3:14 pm" */
  function clock(iso, opts) {
    var d = toDate(iso);
    return valid(d) ? fmt(d, { hour: "numeric", minute: "2-digit" }, opts) : "";
  }

  /** "Oct 24, 2026" */
  function shortDate(iso, opts) {
    var d = toDate(iso);
    return valid(d) ? fmt(d, { month: "short", day: "numeric", year: "numeric" }, opts) : "";
  }

  /** "Oct 26, 2026, 3:14 pm PDT" ({zone: false} leaves out "PDT"). */
  function fullTime(iso, opts) {
    var d = toDate(iso);
    if (!valid(d)) return "";
    var o = { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" };
    if (!opts || opts.zone !== false) o.timeZoneName = "short";
    return fmt(d, o, opts);
  }

  function dayKey(d, opts) {
    return fmt(d, { year: "numeric", month: "2-digit", day: "2-digit" }, opts);
  }

  /** "3:14 pm" today, else "Oct 24, 3:14 pm" (or with the year when it is not this year). */
  function when(iso, now, opts) {
    var d = toDate(iso);
    if (!valid(d)) return "";
    var n = toDate(now === undefined ? Date.now() : now);
    if (dayKey(d, opts) === dayKey(n, opts)) return clock(d, opts);
    var sameYear = fmt(d, { year: "numeric" }, opts) === fmt(n, { year: "numeric" }, opts);
    var o = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
    if (!sameYear) o.year = "numeric";
    return fmt(d, o, opts);
  }

  /** "Today", "Yesterday", or "Sat, Oct 24" ("Sat, Oct 24, 2025" in another year). */
  function dayLabel(iso, now, opts) {
    var d = toDate(iso);
    if (!valid(d)) return "";
    var n = toDate(now === undefined ? Date.now() : now);
    if (dayKey(d, opts) === dayKey(n, opts)) return "Today";
    if (dayKey(d, opts) === dayKey(new Date(n.getTime() - 86400000), opts)) return "Yesterday";
    var sameYear = fmt(d, { year: "numeric" }, opts) === fmt(n, { year: "numeric" }, opts);
    var o = { weekday: "short", month: "short", day: "numeric" };
    if (!sameYear) o.year = "numeric";
    return fmt(d, o, opts);
  }

  /** "just now", "5 min ago", "3 hours ago", "yesterday", "2 days ago", then "Oct 24". */
  function timeAgo(iso, now, opts) {
    var d = toDate(iso);
    if (!valid(d)) return "";
    var n = toDate(now === undefined ? Date.now() : now);
    var s = (n.getTime() - d.getTime()) / 1000;
    if (s < 45) return "just now";
    var m = Math.floor(s / 60);
    if (m < 1) m = 1;
    if (m < 60) return m + " min ago";
    var h = Math.floor(s / 3600);
    if (h < 24) return h === 1 ? "1 hour ago" : h + " hours ago";
    var days = Math.floor(s / 86400);
    if (days < 2) return "yesterday";
    if (days < 7) return days + " days ago";
    var sameYear = fmt(d, { year: "numeric" }, opts) === fmt(n, { year: "numeric" }, opts);
    var o = { month: "short", day: "numeric" };
    if (!sameYear) o.year = "numeric";
    return fmt(d, o, opts);
  }

  var api = {
    confirm: confirm,
    info: info,
    dialog: dialog,
    toast: toast,
    announce: announce,
    timeAgo: timeAgo,
    fullTime: fullTime,
    shortDate: shortDate,
    clock: clock,
    when: when,
    dayLabel: dayLabel,
    corner: corner,
    el: el,
    button: button,
  };
  root.BobalabUi = api;
})(typeof window !== "undefined" ? window : globalThis);
