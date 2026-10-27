/*
 * BOBALAB CMS: the editor's own wording (editor v2, WP5; spec §3.3).
 * Loaded by /admin/ after cms-hooks.js and before Decap starts (cms-start.js);
 * sets window.BobalabLocale.
 *
 * "Save goes live": Decap's simple mode calls its button "Publish". Every Save
 * here IS the live site update, so the button, its menu, the toolbar status and
 * the messages around it say Save, in plain words. The English phrases Decap
 * ships are deep-merged with OVERRIDES and registered again as "en" before
 * CMS.init() reads them.
 *
 * tests/unit/cms/locale.test.ts checks that every key below exists in the
 * vendored bundle's English phrases (so a Decap bump cannot silently drop one)
 * and that this file registers the locale before Decap starts.
 */
(function (root) {
  "use strict";

  var OVERRIDES = {
    editor: {
      editorToolbar: {
        publish: "Save",
        publishing: "Saving…",
        publishNow: "Save now",
        publishAndCreateNew: "Save and add another",
        publishAndDuplicate: "Save and duplicate",
        published: "Saved",
        unsavedChanges: "Unsaved changes",
        changesSaved: "All changes saved",
      },
      editor: {
        onLeavePage: "You have unsaved changes. Leave this page without saving them?",
        confirmLoadBackup:
          "This entry has unsaved changes from your last visit, kept only in this browser. OK brings them back (they are still not saved until you press Save). Cancel throws them away.",
      },
      editorInterface: {
        togglePreview: "Hide or show the live preview and history",
      },
      editorControlPane: {
        widget: {
          // Every pattern in config.yml comes with its own plain instruction
          // ("Use a full https:// address …"): "Address: Use a full https://
          // address …" instead of "Address didn't match the pattern: …".
          regexPattern: "%{fieldLabel}: %{pattern}",
        },
      },
    },
    ui: {
      toast: {
        entrySaved: "Saved.",
        // Decap passes the Error itself, so the toast reads "Error: …"; cms-save.js
        // shows the cleaned reason in the "Not saved" band and hides this toast.
        onFailToPersist: "%{details}",
        missingRequiredField: "Not saved: a required field is empty. It is marked in red.",
      },
    },
  };

  function isObj(v) {
    return !!v && typeof v === "object" && !Array.isArray(v);
  }

  /** A copy of `base` with every key of `over` laid on top, object by object. */
  function deepMerge(base, over) {
    var out = {};
    var k;
    if (isObj(base))
      for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    if (!isObj(over)) return out;
    for (k in over) {
      if (!Object.prototype.hasOwnProperty.call(over, k)) continue;
      out[k] = isObj(over[k]) && isObj(out[k]) ? deepMerge(out[k], over[k]) : over[k];
    }
    return out;
  }

  /** Every key path of an object of phrases ("editor.editorToolbar.publish", …). */
  function keyPaths(obj, prefix) {
    var out = [];
    Object.keys(obj || {}).forEach(function (k) {
      var p = prefix ? prefix + "." + k : k;
      if (isObj(obj[k])) out = out.concat(keyPaths(obj[k], p));
      else out.push(p);
    });
    return out;
  }

  function at(obj, path) {
    var cur = obj;
    var parts = String(path).split(".");
    for (var i = 0; i < parts.length; i++) {
      if (!isObj(cur)) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /**
   * The English phrase Decap shows for a key, with our wording on top:
   * phrase("editor.editorInterface.togglePreview"). Used by cms-save.js and
   * cms-layout.js to find Decap's own buttons by their text or title.
   */
  function phrase(path) {
    var cms = root.CMS;
    var en = null;
    try {
      en = cms && typeof cms.getLocale === "function" ? cms.getLocale("en") : null;
    } catch {
      en = null;
    }
    var v = at(en, path);
    if (typeof v !== "string") v = at(OVERRIDES, path);
    return typeof v === "string" ? v : "";
  }

  var registered = false;

  /** Register the merged English phrases. Runs once, at load, before CMS.init(). */
  function register() {
    var cms = root.CMS;
    if (!cms || typeof cms.registerLocale !== "function") return false;
    var en = typeof cms.getLocale === "function" ? cms.getLocale("en") : null;
    cms.registerLocale("en", deepMerge(en || {}, OVERRIDES));
    registered = true;
    return true;
  }

  root.BobalabLocale = {
    OVERRIDES: OVERRIDES,
    deepMerge: deepMerge,
    keyPaths: keyPaths,
    phrase: phrase,
    isRegistered: function () {
      return registered;
    },
  };

  register();
})(typeof window !== "undefined" ? window : globalThis);
