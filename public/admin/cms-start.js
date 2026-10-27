/*
 * Start Decap CMS (WP6). Loaded last by /admin/.
 *
 * cms-data.js sets window.CMS_MANUAL_INIT before decap-cms.js runs, so Decap
 * waits until every script before this one (hooks, wording, the live column,
 * Save) has registered. Without
 * this, a slow download of a later script let Decap render its unstyled
 * default preview first (MEASURED 2026-10-20: about 1 load in 10 on the dev server).
 *
 * Before starting, two guards (verification findings CMS-13, CMS-02):
 *
 *  1. No framing. The admin CSP is a <meta> tag (GitHub Pages sends no custom
 *     headers), and browsers ignore `frame-ancestors` there, so another site
 *     could load /admin/ in a frame and trick an editor into clicking (Decap
 *     keeps the editor's GitHub token in this origin's localStorage). Framed,
 *     the page shows a short note with a link instead and never starts Decap.
 *
 *  2. A fresh editor for every entry address. MEASURED 2026-10-20 (Decap 3.17.1):
 *     the editor loads its entry only when it mounts; when the address changes
 *     from one entry straight to another (a pasted link, a bookmark, the address
 *     bar), it keeps showing the previous entry, and a Save wrote that entry's
 *     file. When the address moves from one entry to a DIFFERENT existing entry,
 *     this script reloads the page, so Decap mounts the editor afresh. Decap's
 *     own moves are left alone: "new" → the entry just saved (after the first
 *     save), and entry → "new" (Decap creates the empty entry itself). From a
 *     new entry to a new entry of ANOTHER collection Decap kept the old form
 *     (and Save then refused), so that move reloads too.
 *     cms-hooks.js also refuses a save whose entry is not the one in the address.
 *     MEASURED (editor v2): for a NEW entry, postSave carries an empty slug, so
 *     the move "new" → "entries/<slug>" is recognised by the collection and the
 *     time instead: within 15 s of a save in that collection (spec §3.11).
 */
(function (root) {
  "use strict";

  var hooks = root.BobalabCmsHooks || {};

  function framed() {
    try {
      return root.top !== root.self;
    } catch {
      return true; // a cross-origin parent can make even the comparison throw
    }
  }

  var NEW_SAVE_MS = 15000;

  function key(r) {
    return r ? r.collection + "/" + (r.isNew ? "#new" : r.slug) : "";
  }

  /**
   * Does moving from hash `from` to hash `to` need a reload? `saved` is the
   * entry saved last in this tab, if any: {key: "collection/slug", collection,
   * at} (or just the key). `now` defaults to the current time.
   */
  function needsReload(from, to, saved, now) {
    var route = hooks.editorRoute;
    if (typeof route !== "function") return false;
    var a = route(from);
    var b = route(to);
    if (!a || !b) return false;
    // To a new entry Decap starts an empty form itself, except from a new entry
    // of another collection: then it kept the old form (MEASURED, Decap 3.17.1).
    if (b.isNew) return !!a.isNew && a.collection !== b.collection;
    if (key(a) === key(b)) return false;
    if (a.isNew && a.collection === b.collection && saved) {
      // Decap moves from "new" to the entry it has just created.
      var s = typeof saved === "string" ? { key: saved } : saved;
      if (s.key === key(b)) return false;
      // A new entry's postSave has no slug yet: same collection, within 15 s.
      var t = typeof now === "number" ? now : Date.now();
      if (s.collection === b.collection && s.at && t - s.at >= 0 && t - s.at <= NEW_SAVE_MS)
        return false;
    }
    return true;
  }

  var api = { needsReload: needsReload, framed: framed };
  root.BobalabCmsStart = api;

  if (typeof document === "undefined" || !root.location) return;

  if (framed()) {
    document.body.textContent = "";
    var p = document.createElement("p");
    p.textContent = "The BOBALAB content manager cannot be opened inside another page. ";
    var a = document.createElement("a");
    a.href = root.location.href;
    a.target = "_top";
    a.rel = "noopener";
    a.textContent = "Open it in its own window";
    p.appendChild(a);
    document.body.appendChild(p);
    return;
  }

  var saved = null;
  var shown = root.location.hash;
  if (root.CMS && typeof root.CMS.registerEventListener === "function") {
    root.CMS.registerEventListener({
      name: "postSave",
      handler: function (args) {
        var e = args && args.entry;
        if (e && typeof e.get === "function") {
          var collection = e.get("collection");
          saved = {
            key: collection + "/" + (e.get("slug") || ""),
            collection: collection,
            at: Date.now(),
          };
        }
        return undefined;
      },
    });
  }
  root.addEventListener("hashchange", function () {
    var from = shown;
    // Let Decap's router act first: with unsaved changes it asks "leave this
    // page?" and, on Cancel, puts the old address back.
    root.setTimeout(function () {
      var to = root.location.hash;
      if (to === from) return;
      shown = to;
      if (needsReload(from, to, saved)) root.location.reload();
    }, 0);
  });

  if (root.CMS && typeof root.CMS.init === "function") root.CMS.init();
})(typeof window !== "undefined" ? window : globalThis);
