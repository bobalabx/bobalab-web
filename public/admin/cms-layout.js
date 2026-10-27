/*
 * BOBALAB CMS: the editor's layout (editor v2, WP5; spec §3.10, §7, §8).
 * Loaded by /admin/ after cms-save.js and before cms-start.js; sets
 * window.BobalabLayout.
 *
 *  - The live column stays on. Decap keeps its eye button's state in
 *    localStorage "cms.right-pane" and, with no value, shows no preview at all,
 *    so one accidental click would turn off the live preview, History and the
 *    site check for good. Every load sets it back to "preview" before Decap
 *    starts. The first visit also gets a sensible split ("cms.split-pane-position":
 *    36% of the window for the form, between 440 and 640 px).
 *  - showLivePane() clicks the eye button (its title comes from the locale) when
 *    the live column is hidden; cms-save.js offers it in the note next to Save.
 *  - Nothing reaches GitHub without Save: the media library's "Delete selected"
 *    (it deletes the file on GitHub at once, and History cannot bring it back)
 *    is hidden. The header Media button is hidden in admin.css.
 *  - "Skip to the live preview": the first focusable element on editor routes;
 *    it moves focus to the live column's tabs.
 *  - Phones (below 800 px): a fixed [Edit] [Preview & history] switch at the
 *    bottom. Preview sets html.bl-phone-preview (the live column at full width);
 *    in Edit the live column stays rendered off-screen (admin.css), so the site
 *    check and History keep working.
 *
 * tests/unit/cms/layout.test.ts runs this file in a sandbox with a small fake DOM.
 */
(function (root) {
  "use strict";

  var SPLIT_KEY = "cms.split-pane-position";
  var PANE_KEY = "cms.right-pane";
  var PHONE = "(max-width: 799px)";

  function phrase(path, fallback) {
    var l = root.BobalabLocale;
    var v = l && typeof l.phrase === "function" ? l.phrase(path) : "";
    return v || fallback || "";
  }

  function safe(fn, fallback) {
    try {
      return fn();
    } catch {
      return fallback;
    }
  }

  /** The form's width on a first visit: 36% of the window, 440 to 640 px. */
  function splitSeed(width) {
    var w = Number(width) || 1280;
    return Math.round(Math.min(640, Math.max(440, w * 0.36)));
  }

  /** Before Decap starts: the live column on, and a first split if none was chosen. */
  function seed() {
    try {
      var ls = root.localStorage;
      if (!ls) return;
      if (!ls.getItem(SPLIT_KEY)) ls.setItem(SPLIT_KEY, String(splitSeed(root.innerWidth)));
      ls.setItem(PANE_KEY, "preview");
    } catch {
      // blocked storage: Decap uses its own defaults
    }
  }

  // ---------------------------------------------------------------------------
  // DOM helpers (all optional)

  function doc() {
    var d = root.document;
    return d && typeof d.createElement === "function" ? d : null;
  }

  function classOf(el) {
    return (el && typeof el.getAttribute === "function" && el.getAttribute("class")) || "";
  }

  function hasClass(el, c) {
    return (" " + classOf(el) + " ").indexOf(" " + c + " ") !== -1;
  }

  /** Decap's live column: the split pane's second pane (absent while the eye is off). */
  function pane2() {
    var d = doc();
    if (!d) return null;
    var splits = d.querySelectorAll('[class*="StyledSplitPane"]');
    for (var i = 0; i < splits.length; i++) {
      var kids = splits[i].children || [];
      for (var j = 0; j < kids.length; j++) if (hasClass(kids[j], "Pane2")) return kids[j];
    }
    return null;
  }

  function isLivePaneShown() {
    return !!pane2();
  }

  function route() {
    var h = root.BobalabCmsHooks;
    return h && typeof h.editorRoute === "function" && root.location
      ? h.editorRoute(root.location.hash)
      : null;
  }

  /** The eye button (Decap's "toggle preview", titled from the locale). */
  function eyeButton() {
    var d = doc();
    if (!d) return null;
    var title = phrase("editor.editorInterface.togglePreview", "Toggle preview");
    var all = d.querySelectorAll("button[title]");
    for (var i = 0; i < all.length; i++) if (all[i].getAttribute("title") === title) return all[i];
    return null;
  }

  /** Turn the live column back on. Resolves true once it is there. */
  function showLivePane() {
    if (isLivePaneShown()) return Promise.resolve(true);
    var eye = eyeButton();
    if (!eye) return Promise.resolve(false);
    eye.click();
    return new Promise(function (resolve) {
      var until = Date.now() + 2000;
      var look = function () {
        if (isLivePaneShown()) return resolve(true);
        if (Date.now() >= until) return resolve(false);
        root.setTimeout(look, 50);
      };
      look();
    });
  }

  // ---------------------------------------------------------------------------
  // The media library's Delete

  function hideMediaDelete() {
    var d = doc();
    if (!d) return;
    var names = [
      phrase("mediaLibrary.mediaLibraryModal.deleteSelected", "Delete selected"),
      phrase("mediaLibrary.mediaLibraryModal.deleting", "Deleting..."),
    ];
    var all = d.querySelectorAll("button");
    for (var i = 0; i < all.length; i++) {
      var b = all[i];
      if (names.indexOf(String(b.textContent || "").trim()) !== -1 && !b.hidden) {
        b.hidden = true;
        b.setAttribute("data-bl-hidden", "media-delete");
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Skip to the live preview

  function focusLive() {
    var d = doc();
    var f = d && d.querySelector("iframe#preview-pane");
    var fd = safe(function () {
      return f && f.contentDocument;
    }, null);
    var t =
      fd &&
      (fd.querySelector('.bl-live [role="tablist"] [role="tab"][aria-selected="true"]') ||
        fd.querySelector('.bl-live [role="tablist"]') ||
        fd.querySelector(".bl-live"));
    if (f)
      safe(function () {
        f.focus();
      });
    if (t) {
      if (!t.hasAttribute("tabindex") && t.getAttribute("role") !== "tab")
        t.setAttribute("tabindex", "-1");
      safe(function () {
        t.focus();
      });
      return true;
    }
    return !!f;
  }

  function skipButton() {
    var d = doc();
    var b = d.getElementById("bl-skip");
    if (!b) {
      b = d.createElement("button");
      b.id = "bl-skip";
      b.className = "bl-skip";
      b.setAttribute("type", "button");
      b.textContent = "Skip to the live preview";
      b.addEventListener("click", function () {
        var go = function () {
          root.setTimeout(focusLive, 0);
        };
        if (isPhone() && !S.preview) setPreview(true).then(go);
        else if (!isLivePaneShown()) showLivePane().then(go);
        else focusLive();
      });
    }
    if (d.body.firstChild !== b) d.body.insertBefore(b, d.body.firstChild);
    return b;
  }

  // ---------------------------------------------------------------------------
  // Phones: [Edit] [Preview & history]

  var S = { preview: false, route: "", mql: null };

  function isPhone() {
    if (!S.mql && typeof root.matchMedia === "function")
      S.mql = safe(function () {
        return root.matchMedia(PHONE);
      }, null);
    if (S.mql) return !!S.mql.matches;
    return typeof root.innerWidth === "number" && root.innerWidth < 800;
  }

  function htmlClass(name, on) {
    var d = doc();
    var html = d && d.documentElement;
    if (html && html.classList) html.classList[on ? "add" : "remove"](name);
  }

  function setPreview(on) {
    S.preview = !!on;
    var ready = on && !isLivePaneShown() ? showLivePane() : Promise.resolve(true);
    sync();
    return ready.then(function (ok) {
      sync();
      return ok;
    });
  }

  function phoneBar() {
    var d = doc();
    var bar = d.getElementById("bl-phonebar");
    if (!bar) {
      bar = d.createElement("div");
      bar.id = "bl-phonebar";
      bar.className = "bl-phonebar";
      bar.setAttribute("role", "group");
      bar.setAttribute("aria-label", "Show");
      [
        ["edit", "Edit", false],
        ["preview", "Preview & history", true],
      ].forEach(function (b) {
        var btn = d.createElement("button");
        btn.setAttribute("type", "button");
        btn.className = "bl-phonebar__btn";
        btn.setAttribute("data-view", b[0]);
        btn.textContent = b[1];
        btn.addEventListener("click", function () {
          setPreview(b[2]);
        });
        bar.appendChild(btn);
      });
      d.body.appendChild(bar);
    }
    return bar;
  }

  function sync() {
    var d = doc();
    if (!d || !d.body) return;
    var r = route();
    var key = r ? r.collection + "/" + (r.isNew ? "#new" : r.slug) : "";
    if (key !== S.route) {
      S.route = key;
      S.preview = false; // every entry opens on the form
    }
    htmlClass("bl-editor", !!r);
    var phone = isPhone();
    htmlClass("bl-phone-preview", !!(r && phone && S.preview));
    var bar = d.getElementById("bl-phonebar");
    if (r && phone) {
      bar = phoneBar();
      bar.hidden = false;
      var btns = bar.querySelectorAll("button");
      for (var i = 0; i < btns.length; i++) {
        var on = (btns[i].getAttribute("data-view") === "preview") === S.preview;
        if (btns[i].getAttribute("aria-pressed") !== String(on))
          btns[i].setAttribute("aria-pressed", String(on));
      }
    } else if (bar) bar.hidden = true;
    var skip = skipButton();
    var showSkip = !!r && (isLivePaneShown() || phone);
    if (skip.hidden === showSkip) skip.hidden = !showSkip;
    hideMediaDelete();
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    var run = function () {
      scheduled = false;
      sync();
    };
    if (typeof root.requestAnimationFrame === "function") root.requestAnimationFrame(run);
    else root.setTimeout(run, 16);
  }

  root.BobalabLayout = {
    showLivePane: showLivePane,
    isLivePaneShown: isLivePaneShown,
    // For tests and other scripts
    setPhonePreview: setPreview,
    _splitSeed: splitSeed,
    _seed: seed,
    _sync: sync,
  };

  seed();

  var d = doc();
  if (!d || !d.body) return;
  if (typeof root.MutationObserver === "function")
    new root.MutationObserver(schedule).observe(d.body, { childList: true, subtree: true });
  if (typeof root.addEventListener === "function") {
    root.addEventListener("hashchange", schedule);
    root.addEventListener("resize", schedule);
  }
  isPhone(); // creates the media query list
  if (S.mql && typeof S.mql.addEventListener === "function")
    S.mql.addEventListener("change", schedule);
  sync();
})(typeof window !== "undefined" ? window : globalThis);
