/*
 * BOBALAB CMS: "Save goes live" (editor v2, WP5; spec §3.2–§3.9).
 * Loaded by /admin/ after cms-guards.js and before cms-layout.js; sets
 * window.BobalabSave.
 *
 * Every Save is one commit on main, which the deploy puts on the live site in
 * about 2 minutes (Decap's simple mode). This file makes that safe:
 *
 *  1. One click. Decap's simple mode shows "Save" as a menu button whose first
 *     item, "Save now", does the save. A capture listener opens that menu and
 *     picks "Save now" itself (html.bl-one-click hides the menu meanwhile), so
 *     Save is one click, Enter or Space. If the menu item does not appear within
 *     600 ms (Decap's markup changed), the menu simply shows: two clicks, never
 *     a dead button.
 *  2. A latch. Decap has no guard against a second click while it saves, which
 *     would save twice (a duplicate "-1" entry, or a refused second commit). From
 *     the click until the save ends, further clicks, Enter and Ctrl/Cmd+S are
 *     swallowed ("Already saving"). The latch clears when the toolbar stops
 *     saying "Saving…", when Decap's own check stops the save before it starts,
 *     or after 60 s at the latest.
 *  3. Checks before the commit (a preSave listener registered after
 *     cms-hooks.js, which runs first and tidies the data): (b) uploads the site
 *     would refuse, (c) names the lab asked never to publish (cms-guards.js),
 *     (d) the conflict guard: did someone else save this entry after it was
 *     opened here, or after the local backup this form came from was made?
 *     (e) the site check: the deploy's own validator, run in the live preview
 *     (cms-live.js) on the saved site with and without this change. A refusal
 *     shows the "Not saved" band above the form (#bl-refusal, role=alert) and
 *     stops the save; the form keeps everything. The conflict and site checks
 *     fail open: when GitHub or the preview does not answer in time, the save
 *     goes ahead and the status dock says it was saved without that check.
 *  4. After the commit (postSave, which Decap awaits before it says "Saved", so
 *     it returns at once): find the new entry's address, then hand the save to
 *     the status dock (cms-dock.js), which finds the commit and follows the
 *     deploy.
 *  5. Around Save: the note next to it says what Save will do with this entry
 *     (#bl-save-note); Decap's error toasts after a Save are shown in the band
 *     instead (they vanish after 8 s); Decap's "Saved." toast gives way to the
 *     dock's; window.confirm refuses Decap's "replace the existing file?" for a
 *     same-name upload (Decap would delete the saved file at once) and records
 *     the answer to "bring back your unsaved changes?" for the conflict guard.
 *
 * Nothing here writes to GitHub: the only write is Decap's own Save.
 * tests/unit/cms/save.test.ts runs this file in a sandbox with a small fake
 * DOM; tests/e2e/cms-save.spec.ts runs it in the browser against the local demo.
 */
(function (root) {
  "use strict";

  var DRAFT_BASE_KEY = "bobalab.draftBase.v1";
  var TIP_KEY = "bobalab.saveTip.v1";
  var SEC = 1000;

  /** Timings and the menu item selector (tests may change them). */
  var OPTIONS = {
    autoSelectMs: 600, // how long to wait for Decap's "Save now" menu item
    menuItem: '[role="menuitem"]',
    fieldCheckMs: 400, // then look for fields Decap's own check marked red (a wrong format)
    noStartMs: 1500, // no "Saving…" this long after the click: Decap's own check stopped it
    latchMaxMs: 60 * SEC,
    releaseAfterSaveMs: 3 * SEC, // after postSave, if the label never leaves "Saving…"
    saveNowWaitMs: 1000,
    conflictMs: 5 * SEC,
    checkMs: 4 * SEC,
    slugWaitMs: 3 * SEC,
    mirrorMs: 15 * SEC, // an error toast this soon after a Save is about that Save
    ownSlackMs: 120 * SEC, // commit times may be up to 2 min before the click
  };

  var SAVE_DROPDOWN = "ToolbarDropdown";
  var PUBLISH_BUTTON = "PublishButton";
  var SAME_NAME = /already exists\. Do you want to replace it\?$/;
  var DRAFT = "“Draft · pending lab review”";

  var NOTE_NO_CHECK = "Saved without the site check (the preview wasn't ready)";
  var NOTE_NO_CONFLICT = "Saved without the conflict check (GitHub didn't answer)";
  var SAVE_DESC = "Saves and updates the live site in about 2 minutes";
  var TIP =
    "Save puts your changes on the live site in about 2 minutes. Every save is listed in History, where you can undo it. Not ready for visitors? Turn on " +
    DRAFT +
    " first: it hides the entry from the website, but every save can still be read on github.com.";
  var RENAME =
    "A file with this name is already on the site. Rename your file (for example isabelle-cho-2026.jpg) and upload it again.";

  // ---------------------------------------------------------------------------
  // Other scripts (each may be missing: then its part is skipped)

  function cfg() {
    return root.BOBALAB_CMS || {};
  }
  function hooks() {
    return root.BobalabCmsHooks || null;
  }
  function gh() {
    return root.BobalabGitHub || null;
  }
  function hist() {
    return root.BobalabHistory || null;
  }
  function live() {
    return root.BobalabLive || null;
  }
  function editor() {
    return (root.CMS && root.CMS.editor) || null;
  }

  function mode() {
    var g = gh();
    return g && typeof g.mode === "function" ? g.mode() : "github";
  }

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

  function toMs(x) {
    if (x === null || x === undefined || x === "") return 0;
    if (typeof x === "number") return x;
    var t = Date.parse(String(x));
    return isNaN(t) ? 0 : t;
  }

  function lower(s) {
    return String(s || "").toLowerCase();
  }

  function plain(v) {
    return v && typeof v.toJS === "function" ? v.toJS() : v;
  }

  /** "2:03 pm" in the viewer's own time zone. */
  function clock(iso) {
    var u = root.BobalabUi;
    if (u && typeof u.clock === "function") {
      var c = safe(function () {
        return u.clock(iso);
      }, "");
      if (c) return c;
    }
    var d = new Date(toMs(iso));
    var h = d.getHours();
    var m = d.getMinutes();
    return (h % 12 || 12) + ":" + (m < 10 ? "0" : "") + m + " " + (h < 12 ? "am" : "pm");
  }

  function shortDate(iso) {
    var u = root.BobalabUi;
    if (u && typeof u.shortDate === "function") {
      var c = safe(function () {
        return u.shortDate(iso);
      }, "");
      if (c) return c;
    }
    return new Date(toMs(iso)).toDateString();
  }

  /** "Isabelle Cho (@icho)", "@icho" or "Someone". */
  function who(v) {
    var a = (v && v.author) || {};
    var login = a.login ? "@" + a.login : "";
    if (a.name && a.login && a.name !== a.login) return a.name + " (" + login + ")";
    return login || a.name || "Someone";
  }

  function nameOf(v) {
    var a = (v && v.author) || {};
    return a.name || a.login || "Someone";
  }

  // ---------------------------------------------------------------------------
  // Storage (every access guarded: blocked storage must not break Save)

  function readDraftBase() {
    try {
      var raw = root.localStorage && root.localStorage.getItem(DRAFT_BASE_KEY);
      var v = raw ? JSON.parse(raw) : {};
      return v && typeof v === "object" && !Array.isArray(v) ? v : {};
    } catch {
      return {};
    }
  }

  function writeDraftBase(all) {
    try {
      if (!root.localStorage) return;
      if (Object.keys(all).length) root.localStorage.setItem(DRAFT_BASE_KEY, JSON.stringify(all));
      else root.localStorage.removeItem(DRAFT_BASE_KEY);
    } catch {
      // full or blocked storage: the guard then falls back to the opening time
    }
  }

  function putDraftBase(path, sha) {
    var all = readDraftBase();
    all[path] = { sha: sha || "unknown", at: Date.now() };
    writeDraftBase(all);
  }

  function dropDraftBase(path) {
    var all = readDraftBase();
    if (!(path in all)) return;
    delete all[path];
    writeDraftBase(all);
  }

  function storageGet(key) {
    try {
      return root.localStorage ? root.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      if (root.localStorage) root.localStorage.setItem(key, value);
    } catch {
      // nothing to do: the tip shows again next time
    }
  }

  // ---------------------------------------------------------------------------
  // Pure decisions (unit-tested)

  /**
   * The conflict guard for an existing entry (spec §3.7 decision table).
   * o = {latest: Version|null, baseline: sha|"unknown"|null, ownShas, pendingOwn:
   * {at}|null, me: login, openedAt: ms}. → {ok: true, adopt?: sha} or
   * {ok: false, self: boolean, message}.
   */
  function conflictDecision(o) {
    var v = o.latest;
    if (!v || !v.sha) return { ok: true };
    var own = o.ownShas || [];
    var isOwn = typeof own.has === "function" ? own.has(v.sha) : own.indexOf(v.sha) !== -1;
    var mine = !!o.me && lower(v.author && v.author.login) === lower(o.me);
    if (o.baseline && v.sha === o.baseline) return { ok: true };
    if (isOwn) return { ok: true };
    if (mine && o.pendingOwn && toMs(v.date) >= toMs(o.pendingOwn.at) - OPTIONS.ownSlackMs)
      return { ok: true, adopt: v.sha };
    if (o.baseline === "unknown" && mine) return { ok: true };
    // The version this form started from never loaded (GitHub did not answer
    // when the entry was opened): the newest version is older than that moment.
    if (!o.baseline && o.openedAt && toMs(v.date) && toMs(v.date) < o.openedAt)
      return { ok: true, adopt: v.sha };
    if (mine)
      return {
        ok: false,
        self: true,
        message:
          "Not saved: you saved this entry in another tab or window at " +
          clock(v.date) +
          ". Saving now would replace that version. Press “Bring in that version” above the form; your changes here stay.",
      };
    return {
      ok: false,
      self: false,
      message:
        "Not saved: " +
        who(v) +
        " saved this entry at " +
        clock(v.date) +
        ", after you opened it. Saving now would replace their change. Press “Bring in their changes” above the form; your changes stay, theirs are added, then Save again.",
    };
  }

  /** A new entry whose address already exists on main (spec §3.7 "New entry"). */
  function newEntryDecision(latest, now) {
    if (!latest || !latest.sha) return { ok: true };
    var at = toMs(latest.date);
    var recent = at && (now || Date.now()) - at < 24 * 60 * 60 * SEC;
    return {
      ok: false,
      message: recent
        ? "Not saved: " +
          nameOf(latest) +
          " just created an entry with this address at " +
          clock(latest.date) +
          ". Open it instead, or change the title so the address differs."
        : "Not saved: an entry with this address already exists (last saved by " +
          nameOf(latest) +
          " on " +
          shortDate(latest.date) +
          "). Open it instead, or change the title so the address differs.",
    };
  }

  /** Decap's error toast text → the band's words (spec §3.8). */
  function refusalText(raw) {
    var t = String(raw || "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^(Error:\s*)+/i, "")
      .replace(/^(Not saved:\s*)(Not saved:\s*)+/i, "$1")
      .trim();
    if (/^Not saved/i.test(t)) return t;
    if (/not a fast.forward|422|409/i.test(t))
      return "Not saved: someone else saved at the same moment. Nothing was lost — press Save again.";
    if (/Bad credentials|401/.test(t))
      return "Not saved: your sign-in expired. Sign in again; your changes are kept in this browser.";
    if (/Failed to fetch|NetworkError/.test(t))
      return "Not saved: couldn't reach GitHub. Check the connection and press Save again.";
    return "Not saved: " + (t || "something went wrong. Press Save again.");
  }

  /** The note next to Save: what Save will do with this entry (spec §3.5). */
  function saveNote(collection, data) {
    var d = data || {};
    if (collection === "people" && d.listed !== true)
      return "Not listed: Save won't show this person";
    if (d.draft === true) return "Save keeps it hidden: Draft is on";
    if (collection === "people" && !(d.role === "pi" || d.profile_page === true))
      return "Save updates the People page";
    if (collection === "opportunities") return "Save updates the Join page";
    if (collection === "pages" || collection === "settings") return "Save updates the live site";
    return "Save puts this on the live site";
  }

  /** "Not saved: the site check would reject this: A; B; C (and 2 more)." */
  function siteCheckMessage(blocking, format) {
    var shown = blocking.slice(0, 3).map(function (i) {
      var t = safe(function () {
        return format(i);
      }, "");
      return String(t || i.message || i.code || "").replace(/\.$/, "");
    });
    var more = blocking.length - shown.length;
    return (
      "Not saved: the site check would reject this: " +
      shown.join("; ") +
      (more > 0 ? " (and " + more + " more)" : "") +
      "."
    );
  }

  /** The page "View page" opens, when cms-live.js is missing (mirrors hasLivePage). */
  function fallbackView(collection, slug, data) {
    var d = data || {};
    var own = {
      news: "/news/",
      publications: "/publications/",
      directions: "/research/",
      projects: "/projects/",
      people: "/people/",
    };
    if (d.draft === true) return { state: "hidden", reason: "draft" };
    if (collection === "people") {
      if (d.listed !== true) return { state: "hidden", reason: "unlisted" };
      if (!(d.role === "pi" || d.profile_page === true))
        return { state: "elsewhere", path: "/people/", label: "People page" };
    }
    if (own[collection] && slug) return { state: "live", path: own[collection] + slug + "/" };
    if (collection === "opportunities")
      return { state: "elsewhere", path: "/join/", label: "Join page" };
    if (collection === "settings") return { state: "elsewhere", path: "/", label: "Home page" };
    if (collection === "pages")
      return { state: "live", path: slug === "home" ? "/" : "/" + slug + "/" };
    return { state: "live" };
  }

  // ---------------------------------------------------------------------------
  // State

  var S = {
    saving: false,
    sawSaving: false,
    inPreSave: false,
    postSaved: false,
    autoSelecting: false,
    latchTimers: [],
    startedAt: 0,
    lastTry: 0,
    notes: [],
    base: {}, // path → {sha: sha|"unknown"|null, src}
    baseReady: {}, // path → Promise
    visits: {}, // path → {openedAt, backup}
    pendingBackup: null,
    own: [],
    pendingOwn: {}, // path → {at}
    current: null, // {collection, slug, path, isNew, hasChanged, data, fields}
    listeners: [],
    refusal: null, // {message, field, fieldValue, path, action, at}
    tipShown: false,
  };

  function pathFor(collection, slug, fallback) {
    var h = hist();
    var p =
      h && typeof h.pathOf === "function"
        ? safe(function () {
            return h.pathOf(collection, slug);
          }, null)
        : null;
    return p || fallback || null;
  }

  function setBase(path, sha, src) {
    S.base[path] = { sha: sha === undefined ? null : sha, src: src };
  }

  function baseline(path) {
    var b = S.base[path];
    return b && b.sha ? b.sha : null;
  }

  function ownShas() {
    return new Set(S.own);
  }

  // ---------------------------------------------------------------------------
  // Baselines: the version each open form started from (spec §3.7)

  function loadBaseline(path) {
    var h = hist();
    if (!h || typeof h.latest !== "function" || mode() === "local") return;
    setBase(path, null, "loading");
    var p = Promise.resolve()
      .then(function () {
        return h.latest(path, { fresh: true });
      })
      .then(
        function (v) {
          var b = S.base[path];
          if (!b || b.src !== "loading") return; // the backup answer or a save came first
          setBase(path, v ? v.sha : null, "open");
          if (v === null) S.base[path].missing = true;
        },
        function () {
          var b = S.base[path];
          if (b && b.src === "loading") setBase(path, null, "failed");
        },
      );
    S.baseReady[path] = p;
    return p;
  }

  function opened(path) {
    var pb = S.pendingBackup && S.pendingBackup.path === path ? S.pendingBackup : null;
    S.pendingBackup = null;
    S.visits[path] = { openedAt: Date.now(), backup: !!pb };
    if (pb) {
      setBase(path, pb.sha, "backup");
      return;
    }
    if (S.pendingOwn[path]) return; // this tab just saved it: the dock sets the baseline
    loadBaseline(path);
  }

  /** The editor answered Decap's "bring back your unsaved changes?" question. */
  function backupAnswered(ok) {
    var h = hooks();
    var r =
      h && typeof h.editorRoute === "function"
        ? h.editorRoute(root.location && root.location.hash)
        : null;
    if (!r || r.isNew) return;
    var path = pathFor(r.collection, r.slug, null);
    if (!path) return;
    if (!ok) {
      dropDraftBase(path);
      return;
    }
    var rec = readDraftBase()[path];
    var sha = rec && rec.sha ? rec.sha : "unknown";
    if (S.current && S.current.path === path && S.visits[path]) {
      S.visits[path].backup = true;
      setBase(path, sha, "backup");
    } else S.pendingBackup = { path: path, sha: sha };
  }

  /** The form has its first unsaved change: remember the version it started from. */
  function firstChange(path) {
    var visit = S.visits[path] || {};
    if (visit.backup && readDraftBase()[path]) return; // a restored backup keeps its own
    var b = S.base[path];
    var write = function () {
      var cur = S.current;
      if (!cur || cur.path !== path || !cur.hasChanged) return;
      var bb = S.base[path];
      putDraftBase(path, bb && bb.sha ? bb.sha : "unknown");
    };
    if (b && b.src === "loading" && S.baseReady[path]) S.baseReady[path].then(write, write);
    else write();
  }

  /** The dock found this tab's commit, or "Bring in their changes" moved the form on. */
  function setBaseline(path, sha) {
    if (!path || !sha) return;
    var own = !!S.pendingOwn[path];
    if (own) {
      if (S.own.indexOf(sha) === -1) S.own.push(sha);
      delete S.pendingOwn[path];
    }
    setBase(path, sha, own ? "own" : "set");
    var cur = S.current;
    if (cur && cur.path === path && cur.hasChanged) putDraftBase(path, sha);
  }

  // ---------------------------------------------------------------------------
  // Following the editor (CMS.editor.onEditorChange)

  function sameValue(a, b) {
    return (
      JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b)
    );
  }

  function onEditor(e) {
    var prev = S.current;
    if (!e || !e.collection) {
      S.current = null;
      schedule();
      return;
    }
    var isNew = !!e.newRecord;
    var path = isNew ? null : pathFor(e.collection, e.slug, e.path);
    var cur = {
      collection: e.collection,
      slug: isNew ? null : e.slug,
      path: path,
      isNew: isNew,
      hasChanged: !!e.hasChanged,
      data: e.data || {},
      fields: e.fields || [],
    };
    S.current = cur;
    var sameEntry =
      prev &&
      prev.collection === cur.collection &&
      prev.path === cur.path &&
      prev.isNew === cur.isNew;
    if (path && !(prev && prev.path === path)) opened(path);
    if (path && cur.hasChanged && !(sameEntry && prev.hasChanged)) firstChange(path);
    var r = S.refusal;
    if (r) {
      if (prev && !sameEntry) hideRefusal();
      else if (r.field && cur.data && !sameValue(cur.data[r.field], r.fieldValue)) hideRefusal();
    }
    showTip();
    schedule();
  }

  // ---------------------------------------------------------------------------
  // The DOM helpers (all optional: without a document, only the logic runs)

  function doc() {
    var d = root.document;
    return d && typeof d.createElement === "function" ? d : null;
  }

  function classOf(el) {
    if (!el || typeof el.getAttribute !== "function") return "";
    return el.getAttribute("class") || "";
  }

  function hasPart(el, part) {
    return classOf(el).indexOf(part) !== -1;
  }

  /** The nearest element (el itself or an ancestor, below `stop`) that passes `test`. */
  function closest(el, test, stop) {
    for (var n = el; n && n !== stop; n = n.parentNode) {
      if (n.nodeType === 1 && test(n)) return n;
      if (n === stop) break;
    }
    return stop && test(stop) ? stop : null;
  }

  /** {dd, btn}: Decap's Save menu button (a "ToolbarDropdown" holding the "PublishButton"). */
  function findSave() {
    var d = doc();
    if (!d) return null;
    var all = d.querySelectorAll('[class*="' + PUBLISH_BUTTON + '"]');
    for (var i = 0; i < all.length; i++) {
      var dd = closest(all[i], function (n) {
        return hasPart(n, SAVE_DROPDOWN);
      });
      if (dd) return { dd: dd, btn: all[i] };
    }
    return null;
  }

  function onEditorRoute() {
    var h = hooks();
    return !!(
      h &&
      typeof h.editorRoute === "function" &&
      root.location &&
      h.editorRoute(root.location.hash)
    );
  }

  function announce(text) {
    var u = root.BobalabUi;
    if (u && typeof u.announce === "function")
      safe(function () {
        u.announce(text);
      });
  }

  function toast(opts) {
    var u = root.BobalabUi;
    return u && typeof u.toast === "function" && doc()
      ? safe(function () {
          return u.toast(opts);
        }, null)
      : null;
  }

  function raf(fn) {
    if (typeof root.requestAnimationFrame === "function") return root.requestAnimationFrame(fn);
    return root.setTimeout(fn, 16);
  }

  // ---------------------------------------------------------------------------
  // The latch

  function clearLatchTimers() {
    S.latchTimers.forEach(function (t) {
      root.clearTimeout(t);
    });
    S.latchTimers = [];
  }

  function startLatch() {
    clearLatchTimers();
    S.saving = true;
    S.sawSaving = false;
    S.postSaved = false;
    S.startedAt = Date.now();
    S.lastTry = S.startedAt;
    S.latchTimers.push(
      root.setTimeout(function () {
        release("timeout");
      }, OPTIONS.latchMaxMs),
    );
  }

  /**
   * After the click: Decap's own check may stop the save before "Saving…" ever
   * shows. For an empty required field Decap says so in a toast (the band takes
   * it over, scanToasts). For a field in the wrong format (an address without
   * https://, a title over 160 characters) Decap 3.17.1 only marks the field in
   * red, often out of sight: then the band says which field and why (MEASURED).
   */
  function armNoStart() {
    var clicked = S.startedAt;
    var notStarted = function () {
      return S.saving && S.startedAt === clicked && !S.sawSaving && !S.inPreSave && !S.postSaved;
    };
    S.latchTimers.push(
      root.setTimeout(function () {
        if (notStarted() && refuseMarkedFields(clicked)) release("not-started");
      }, OPTIONS.fieldCheckMs),
    );
    S.latchTimers.push(
      root.setTimeout(function () {
        if (!notStarted()) return;
        refuseMarkedFields(clicked);
        release("not-started");
      }, OPTIONS.noStartMs),
    );
  }

  function release() {
    clearLatchTimers();
    S.saving = false;
    S.sawSaving = false;
    S.inPreSave = false;
    S.autoSelecting = false;
  }

  /** Follow the Save button's label: "Saving…" while Decap saves, anything else after. */
  function watchLabel() {
    if (!S.saving) return;
    var found = findSave();
    var label = found ? String(found.btn.textContent || "").trim() : "";
    var saving = phrase("editor.editorToolbar.publishing", "Saving…");
    if (found && label === saving) S.sawSaving = true;
    else if (S.sawSaving && !S.inPreSave) release("ended");
  }

  function swallow(e) {
    if (typeof e.preventDefault === "function") e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
  }

  function setOneClick(on) {
    var d = doc();
    var html = d && d.documentElement;
    if (html && html.classList) html.classList[on ? "add" : "remove"]("bl-one-click");
  }

  /** Let Decap open its menu, then pick "Save now" (its first item) for the editor. */
  function oneClick() {
    setOneClick(true);
    var until = Date.now() + OPTIONS.autoSelectMs;
    var tick = function () {
      var found = findSave();
      var item = found ? found.dd.querySelector(OPTIONS.menuItem) : null;
      if (item) {
        S.autoSelecting = true;
        try {
          item.click();
        } finally {
          S.autoSelecting = false;
        }
        setOneClick(false);
        var again = findSave();
        if (again && typeof again.btn.focus === "function")
          safe(function () {
            again.btn.focus();
          });
        armNoStart();
        return;
      }
      if (Date.now() >= until) {
        // No "Save now" item: Decap's menu shows as it is (two clicks, never a dead button).
        setOneClick(false);
        release("no-menu");
        return;
      }
      raf(tick);
    };
    raf(tick);
  }

  /** Capture-phase click and Enter/Space anywhere inside the Save menu button. */
  function onCapture(e) {
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    var found = findSave();
    if (!found || !e.target || !found.dd.contains(e.target)) return;
    var item = closest(
      e.target,
      function (n) {
        return n.getAttribute && n.getAttribute("role") === "menuitem";
      },
      found.dd,
    );
    if (item && S.autoSelecting) return; // our own pick of "Save now"
    if (S.saving) {
      swallow(e);
      announce("Already saving");
      return;
    }
    if (item) {
      // Picked from Decap's own menu (the two-click fallback): latch, let it through.
      startLatch();
      armNoStart();
      return;
    }
    if (
      !closest(
        e.target,
        function (n) {
          return hasPart(n, PUBLISH_BUTTON);
        },
        found.dd,
      )
    )
      return;
    startLatch();
    oneClick();
  }

  function isSaveKey(e) {
    return (e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "s" || e.key === "S");
  }

  /** Ctrl/Cmd+S on editor routes: Save, wherever the focus is (the rich-text editor too). */
  function onKey(e) {
    if (isSaveKey(e)) {
      if (!onEditorRoute()) return;
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (S.saving) {
        swallow(e);
        announce("Already saving");
        return;
      }
      if (!findSave()) {
        announce("No changes to save");
        return;
      }
      saveNow();
      return;
    }
    onCapture(e);
  }

  /**
   * Press Save for the editor (Ctrl/Cmd+S, Restore, Undo, "Bring in their changes"):
   * "started", "busy" (a save is running), "nothing-to-save" (no Save button
   * within 1 s: the form has no changes) or "unavailable" (not in the editor).
   */
  function saveNow() {
    if (!onEditorRoute()) return Promise.resolve("unavailable");
    if (S.saving) return Promise.resolve("busy");
    return new Promise(function (resolve) {
      var until = Date.now() + OPTIONS.saveNowWaitMs;
      var look = function () {
        if (S.saving) return resolve("busy");
        var found = findSave();
        if (found) {
          found.btn.click(); // the capture listener runs the one-click Save
          return resolve(S.saving ? "started" : "nothing-to-save");
        }
        if (Date.now() >= until) return resolve("nothing-to-save");
        root.setTimeout(look, 50);
      };
      look();
    });
  }

  // ---------------------------------------------------------------------------
  // The "Not saved" band (#bl-refusal)

  function formPane() {
    var d = doc();
    return d ? d.querySelector('[class*="ControlPaneContainer"]') : null;
  }

  /** "Alt text (required with an image)" → "Alt text"; "Address (optional)" → "Address". */
  function shortLabel(label) {
    return String(label || "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\s*\([^()]*\)$/, "");
  }

  function fieldDefs() {
    return (S.current && S.current.fields) || [];
  }

  function fieldDef(fields, name) {
    for (var i = 0; i < (fields || []).length; i++)
      if (fields[i] && fields[i].name === name) return fields[i];
    return null;
  }

  /** "title" → "Title"; "image.alt" → "Image › Alt text" (the form's own labels). */
  function fieldLabel(name) {
    var parts = String(name || "").split(".");
    var level = fieldDefs();
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var f = fieldDef(level, parts[i]);
      out.push(f ? shortLabel(f.label || f.name) : parts[i]);
      level = (f && f.fields) || [];
    }
    return out.join(" › ");
  }

  function isControlBox(n) {
    return hasPart(n, "ControlContainer");
  }

  /** The control of a field inside `box` (its label's `for`, else its first control). */
  function controlIn(box, name) {
    var d = doc();
    var label = box.querySelector('label[for^="' + name + '-field-"]');
    var id = label && label.getAttribute("for");
    var target = id ? d.getElementById(id) : null;
    if (target) return target;
    var inner = label ? closest(label, isControlBox, box) || label.parentNode : null;
    return inner
      ? inner.querySelector(
          'input, textarea, select, [contenteditable="true"], [role="textbox"], button',
        )
      : null;
  }

  /** Focus a field's control in the form (by Decap's "<name>-field-<n>" ids). */
  function focusField(name, id, nested) {
    var d = doc();
    if (!d || (!name && !id)) return false;
    var target =
      (id && d.getElementById(id)) ||
      (name && !nested && d.querySelector('[id^="' + name + '-field-"]'));
    if (!target && !name) return false;
    if (!target) {
      var pane = formPane() || d.body;
      target = controlIn(pane, name);
      // A field inside an object ("image.alt"): look inside that object's box.
      var label = nested ? d.querySelector('label[for^="' + name + '-field-"]') : null;
      var box = label ? closest(label, isControlBox) : null;
      if (box) target = controlIn(box, nested) || target;
    }
    if (!target) return false;
    expandAround(target);
    var go = function () {
      safe(function () {
        if (typeof target.scrollIntoView === "function") target.scrollIntoView({ block: "center" });
      });
      safe(function () {
        target.focus();
      });
    };
    go();
    if (!shown(target)) raf(go); // an object opened just now: once it has rendered
    return true;
  }

  /** Is the element on screen? (A field inside a collapsed object is not.) */
  function shown(n) {
    return typeof n.getClientRects !== "function" || n.getClientRects().length > 0;
  }

  /**
   * Open the collapsed objects a field sits in (Link, Image: Decap shows them
   * closed), outermost first: an object is closed when its own Expand button
   * shows but the next box on the way to the field does not.
   */
  function expandAround(target) {
    var boxes = [];
    for (var n = target.parentNode; n; n = n.parentNode)
      if (n.nodeType === 1 && isControlBox(n)) boxes.unshift(n);
    boxes.forEach(function (box, i) {
      var next = boxes[i + 1] || target;
      if (shown(next)) return;
      var toggle = box.querySelector('[class*="TopBarContainer"] button[class*="ExpandButton"]');
      if (toggle && toggle !== target && shown(toggle))
        safe(function () {
          toggle.click();
        });
    });
  }

  function el(tag, cls, text) {
    var n = doc().createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function button(text, cls, run) {
    var b = el("button", cls, text);
    b.setAttribute("type", "button");
    b.addEventListener("click", run);
    return b;
  }

  function bandEl() {
    var d = doc();
    if (!d) return null;
    var b = d.getElementById("bl-refusal");
    if (!b) {
      b = el("div", "bl-refusal");
      b.id = "bl-refusal";
      b.setAttribute("role", "alert");
      b.hidden = true;
    }
    placeBand(b);
    return b;
  }

  /** At the top of the form pane; fixed under the toolbar when the pane is not found. */
  function placeBand(b) {
    var d = doc();
    var pane = formPane();
    if (pane) {
      if (b.parentNode !== pane || pane.firstChild !== b) pane.insertBefore(b, pane.firstChild);
      if (hasPart(b, "bl-refusal--fixed")) b.className = "bl-refusal";
    } else if (d && b.parentNode !== d.body) {
      d.body.appendChild(b);
      b.className = "bl-refusal bl-refusal--fixed";
    }
  }

  function renderBand() {
    var r = S.refusal;
    var b = bandEl();
    if (!b) return;
    b.textContent = "";
    if (!r) {
      b.hidden = true;
      return;
    }
    b.hidden = false;
    b.appendChild(el("p", "bl-refusal__text", r.message));
    var actions = el("div", "bl-refusal__actions");
    if (r.field || r.focusId)
      actions.appendChild(
        button(
          "Go to " + (r.fieldLabel || fieldLabel(r.nested ? r.field + "." + r.nested : r.field)),
          "bl-btn bl-btn--small",
          function () {
            focusField(r.field, r.focusId, r.nested);
          },
        ),
      );
    if (r.action && r.action.label)
      actions.appendChild(
        button(r.action.label, "bl-btn bl-btn--small bl-btn--primary", function () {
          safe(r.action.run);
        }),
      );
    actions.appendChild(
      button("Dismiss", "bl-btn bl-btn--small bl-btn--quiet", function () {
        hideRefusal();
      }),
    );
    b.appendChild(actions);
  }

  /**
   * Show "Not saved: …" above the form until the next successful save, an edit
   * of the named field, another entry, or [Dismiss]. Does not stop a save by
   * itself: the preSave listener throws after calling it.
   */
  function refuse(message, opts) {
    opts = opts || {};
    var cur = S.current;
    S.refusal = {
      message: String(message || "Not saved."),
      field: opts.field || null,
      fieldValue: opts.field && cur && cur.data ? cur.data[opts.field] : undefined,
      // A field Decap's own check marked: its control's id and label (erroredField()).
      focusId: opts.focusId || null,
      fieldLabel: opts.fieldLabel || null,
      // A field inside the named object ("alt" in "image"): [Go to Image › Alt text].
      nested: opts.nested || null,
      action: opts.action || null,
      at: Date.now(),
    };
    renderBand();
    // On a phone showing "Preview & history", the band (and the field) are in the
    // hidden form: switch back to Edit.
    var d = doc();
    var lay = root.BobalabLayout;
    if (
      d &&
      d.documentElement &&
      d.documentElement.classList &&
      d.documentElement.classList.contains("bl-phone-preview") &&
      lay &&
      typeof lay.setPhonePreview === "function"
    )
      safe(function () {
        lay.setPhonePreview(false);
      });
  }

  function hideRefusal() {
    if (!S.refusal) return;
    S.refusal = null;
    renderBand();
  }

  // ---------------------------------------------------------------------------
  // Decap's toasts

  function cleanToast(t) {
    return String(t || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function dockToastUp() {
    var d = doc();
    return !!(d && d.querySelector("#bl-toasts .bl-toast"));
  }

  /** A field's label as Decap shows it, without its " (optional)" tail. */
  function labelText(label) {
    return cleanToast(label.textContent).replace(/\s*\(optional\)$/i, "");
  }

  /**
   * "Address: Use a full https:// address…" (our wording of Decap's pattern
   * message, cms-locale.js) or Decap's own "Address didn't match the pattern: …"
   * → "Link › Address: Use a full https:// address…"; "Year must be between
   * 1990 and 2100." keeps its words. `labels` are the field and the objects it
   * sits in, outermost first.
   */
  function problemText(message, labels, fullLabel) {
    var m = cleanToast(message).replace(/\.+$/, "");
    var shown = labels.join(" › ");
    var leaf = fullLabel || labels[labels.length - 1] || "";
    if (leaf && m.toLowerCase().indexOf(leaf.toLowerCase()) === 0) {
      var rest = m.slice(leaf.length);
      var said = /^\s*(didn't match the pattern)?\s*:\s*/i.exec(rest);
      if (said) return shown + ": " + upperFirst(rest.slice(said[0].length));
      // "Year must be between …": the label already starts the sentence.
      return (labels.length > 1 ? labels.slice(0, -1).join(" › ") + " › " : "") + m;
    }
    return shown + ": " + m;
  }

  function upperFirst(s) {
    var t = String(s || "");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  /**
   * The fields Decap's own check marked in red (a required field is empty, a
   * value has the wrong format or is out of range), in form order:
   * [{field, focusId, fieldLabel, text}] for the band. Decap lists a field's
   * problems in its "ControlErrorsList", in the field's top bar next to the
   * label whose `for` is the control's id ("<name>-field-<n>"); a field inside
   * an object or a list sits in that object's own box.
   */
  function erroredFields() {
    var d = doc();
    if (!d) return [];
    var out = [];
    var lists = d.querySelectorAll('[class*="ControlErrorsList"]');
    for (var i = 0; i < lists.length; i++) {
      var item = lists[i].querySelector("li");
      var message = cleanToast((item || lists[i]).textContent);
      if (!message) continue;
      var box = closest(lists[i], isControlBox);
      var label = box && box.querySelector("label[for]");
      if (!label) continue;
      var id = label.getAttribute("for");
      var labels = [];
      var names = [];
      for (var b = box; b; b = b.parentNode ? closest(b.parentNode, isControlBox) : null) {
        var l = b.querySelector("label[for]");
        if (!l) continue;
        labels.unshift(shortLabel(labelText(l)) || String(l.getAttribute("for")));
        names.unshift(String(l.getAttribute("for")).replace(/-field-\d+$/, ""));
      }
      var top = !!fieldDef(fieldDefs(), names[0]);
      out.push({
        field: top ? names[0] : null,
        focusId: id,
        fieldLabel: labels.join(" › "),
        text: problemText(message, labels, labelText(label)),
      });
    }
    return out;
  }

  /** The first field Decap marked: {field, focusId, fieldLabel} for [Go to …], or {}. */
  function erroredField() {
    var f = erroredFields()[0];
    return f ? { field: f.field, focusId: f.focusId, fieldLabel: f.fieldLabel } : {};
  }

  /**
   * The same problems from the form's own rules, when Decap's markup is not
   * found: text that does not match its field's pattern (Decap checks these
   * patterns before it saves anything).
   */
  function patternProblems() {
    var cur = S.current;
    var out = [];
    if (!cur) return out;
    var walk = function (fields, data, labels, top) {
      (fields || []).forEach(function (f) {
        if (!f || !f.name || !data || typeof data !== "object") return;
        var v = data[f.name];
        var path = labels.concat([shortLabel(f.label || f.name)]);
        var name = top || f.name;
        if (f.fields && v && typeof v === "object") {
          (Array.isArray(v) ? v : [v]).forEach(function (x) {
            walk(f.fields, x, path, name);
          });
          return;
        }
        var p = f.pattern;
        if (typeof v !== "string" || v === "" || !Array.isArray(p) || !p[0]) return;
        var ok = safe(function () {
          return new RegExp(p[0]).test(v);
        }, true);
        if (ok) return;
        out.push({
          field: name,
          focusId: null,
          fieldLabel: path.join(" › "),
          text:
            path.join(" › ") +
            ": " +
            cleanToast(p[1] || "this isn't in the form the site expects").replace(/\.+$/, ""),
        });
      });
    };
    walk(cur.fields, cur.data, [], null);
    return out;
  }

  /**
   * Decap's own check stopped a Save before it started ("Saving…" never
   * showed): say in the band which field to fix, unless its toast already did
   * (an empty required field). True when the band now explains the refusal.
   */
  function refuseMarkedFields(since) {
    if (S.refusal && S.refusal.at >= since) return true;
    var marked = erroredFields();
    var list = marked.length ? marked : patternProblems();
    if (!list.length) return false;
    var first = list[0];
    var more = list.length - 1;
    refuse(
      "Not saved: " +
        first.text +
        (more > 0
          ? " (and " + more + " more " + (more === 1 ? "field" : "fields") + " to fix)"
          : "") +
        ".",
      { field: first.field, focusId: first.focusId, fieldLabel: first.fieldLabel },
    );
    return true;
  }

  /**
   * cms-hooks.js's refusals name their field in words; the band's [Go to …]
   * needs the field itself: {field, nested?} or {}.
   */
  function hookField(text) {
    var t = String(text || "");
    var m = /^Not saved: “([^”]+)”[^.]* an image but no alt text/.exec(t);
    if (m) {
      if (m[1] === "Photo") return { field: "photo_alt" };
      var objects = (hooks() && hooks().IMAGE_OBJECTS) || {};
      for (var k in objects)
        if (Object.prototype.hasOwnProperty.call(objects, k) && objects[k] === m[1])
          return fieldDef(fieldDefs(), k) ? { field: k, nested: "alt" } : {};
    }
    if (/“Photo consent” is off/.test(t) && fieldDef(fieldDefs(), "photo_consent"))
      return { field: "photo_consent" };
    if (/is already the colour of/.test(t) && fieldDef(fieldDefs(), "color"))
      return { field: "color" };
    return {};
  }

  function scanToasts() {
    var d = doc();
    if (!d) return;
    var errs = d.querySelectorAll(".Toastify__toast--error");
    for (var i = 0; i < errs.length; i++) {
      var t = errs[i];
      if (t.hasAttribute("data-bl-seen")) continue;
      t.setAttribute("data-bl-seen", "");
      var raw = cleanToast(t.textContent);
      var aboutSave =
        /^(Error:\s*)?Not saved/i.test(raw) || Date.now() - S.lastTry < OPTIONS.mirrorMs;
      if (!aboutSave) continue;
      var text = refusalText(raw);
      var r = S.refusal;
      // Our own refusals are already in the band, with their buttons. Decap's own
      // (a required field is empty) get [Go to …] for the first field it marked;
      // cms-hooks' (an image without alt text) for the field they name.
      if (!(r && r.message === text && Date.now() - r.at < OPTIONS.mirrorMs)) {
        var marked = erroredField();
        refuse(text, marked.focusId || marked.field ? marked : hookField(text));
      }
      t.setAttribute("data-bl-hide", "");
      // Decap's own check (a required field) or the commit failed: the save is over.
      if (S.saving && !S.inPreSave) release("failed");
    }
    if (dockToastUp()) {
      var oks = d.querySelectorAll(".Toastify__toast--success");
      for (var j = 0; j < oks.length; j++)
        if (!oks[j].hasAttribute("data-bl-hide")) oks[j].setAttribute("data-bl-hide", "");
    }
  }

  // ---------------------------------------------------------------------------
  // The note next to Save, Save's description, the first-use tip

  function noteEl() {
    var d = doc();
    if (!d) return null;
    var n = d.getElementById("bl-save-note");
    if (!n) {
      n = el("div", "bl-save-note");
      n.id = "bl-save-note";
      n.appendChild(el("span", "bl-save-note__text"));
    }
    return n;
  }

  function livePaneHidden() {
    var l = root.BobalabLayout;
    return !!(l && typeof l.isLivePaneShown === "function" && !l.isLivePaneShown());
  }

  function syncNote() {
    var d = doc();
    if (!d) return;
    var main = d.querySelector('[class*="ToolbarSectionMain"]');
    var cur = S.current;
    var n = d.getElementById("bl-save-note");
    if (!main || !cur || !onEditorRoute()) {
      if (n && n.parentNode) n.parentNode.removeChild(n);
      return;
    }
    n = noteEl();
    var last = main.querySelector('[class*="ToolbarSubSectionLast"]');
    if (n.parentNode !== main) main.insertBefore(n, last && last.parentNode === main ? last : null);
    // Not named "hidden": Tailwind scans this file too, and that word right after a
    // "!" adds an important-utility class to the public site's CSS (MEASURED with
    // the build helper).
    var paneOff = livePaneHidden();
    var text = paneOff
      ? "Site check and History are off while the live column is hidden."
      : saveNote(cur.collection, cur.data);
    var span = n.querySelector(".bl-save-note__text");
    if (span && span.textContent !== text) span.textContent = text;
    var show = n.querySelector(".bl-save-note__show");
    if (paneOff && !show) {
      n.appendChild(
        button("Show it", "bl-btn bl-btn--small bl-btn--link bl-save-note__show", function () {
          var l = root.BobalabLayout;
          if (l && typeof l.showLivePane === "function") l.showLivePane();
        }),
      );
    } else if (show && !paneOff) n.removeChild(show);
  }

  function syncSaveButton() {
    var d = doc();
    if (!d) return;
    if (!d.getElementById("bl-save-desc")) {
      var desc = el("span", "bl-sr-only", SAVE_DESC);
      desc.id = "bl-save-desc";
      d.body.appendChild(desc);
    }
    var found = findSave();
    if (!found) return;
    var b = found.btn;
    if (b.hasAttribute("aria-haspopup")) b.removeAttribute("aria-haspopup");
    if (b.hasAttribute("aria-expanded")) b.removeAttribute("aria-expanded");
    if (b.getAttribute("aria-describedby") !== "bl-save-desc")
      b.setAttribute("aria-describedby", "bl-save-desc");
  }

  function showTip() {
    if (S.tipShown || !S.current || !doc() || !root.BobalabUi) return;
    if (storageGet(TIP_KEY)) {
      S.tipShown = true;
      return;
    }
    S.tipShown = true;
    toast({
      text: TIP,
      timeoutMs: 0,
      action: { label: "Got it", run: function () {} },
      onClose: function () {
        storageSet(TIP_KEY, String(Date.now()));
      },
    });
  }

  /** Ctrl/Cmd+S inside Decap's preview frame (the live column's bar) saves too. */
  function watchPreviewFrame() {
    var d = doc();
    var f = d && d.querySelector("iframe#preview-pane");
    var fd = safe(function () {
      return f && f.contentDocument;
    }, null);
    if (!fd || fd.__bobalabSaveKeys) return;
    fd.__bobalabSaveKeys = true;
    fd.addEventListener(
      "keydown",
      function (e) {
        if (!isSaveKey(e)) return;
        e.preventDefault();
        if (S.saving) announce("Already saving");
        else if (!findSave()) announce("No changes to save");
        else saveNow();
      },
      true,
    );
  }

  var scheduled = false;
  function schedule() {
    if (scheduled || !doc()) return;
    scheduled = true;
    raf(function () {
      scheduled = false;
      sync();
    });
  }

  /** Everything that follows Decap's DOM, run after each batch of DOM changes. */
  function sync() {
    watchLabel();
    syncSaveButton();
    syncNote();
    scanToasts();
    if (S.refusal) {
      var b = doc() && doc().getElementById("bl-refusal");
      if (!b || b.hidden || (formPane() && b.parentNode !== formPane())) renderBand();
    }
    watchPreviewFrame();
  }

  // ---------------------------------------------------------------------------
  // The checks before the commit (preSave)

  /** A promise that settles with `fallback` after ms, or with the promise's own result. */
  function within(promise, ms, fallback) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = root.setTimeout(function () {
        if (done) return;
        done = true;
        resolve(fallback);
      }, ms);
      Promise.resolve(promise).then(
        function (v) {
          if (done) return;
          done = true;
          root.clearTimeout(t);
          resolve(v);
        },
        function (e) {
          if (done) return;
          done = true;
          root.clearTimeout(t);
          reject(e);
        },
      );
    });
  }

  var TIMEOUT = { timeout: true };

  function Refused(message) {
    var e = new Error(message);
    e.refused = true;
    return e;
  }

  function predictSlug(collection, dataImm) {
    var h = hooks();
    var rule = ((cfg().rules || {}).slugs || {})[collection];
    if (!h || typeof h.expectedSlug !== "function" || !rule) return null;
    return safe(function () {
      return h.expectedSlug(rule.template, dataImm, rule.identifier, new Date()) || null;
    }, null);
  }

  function contextOf(args) {
    var entry = args.entry;
    var collection = entry.get("collection");
    var isNew = !!entry.get("newRecord");
    var dataImm = entry.get("data");
    var slug = isNew ? predictSlug(collection, dataImm) : entry.get("slug") || null;
    var g = gh();
    var me =
      (args.author && args.author.login) ||
      (g && typeof g.user === "function"
        ? safe(function () {
            var u = g.user();
            return u && u.login;
          }, "")
        : "");
    var path = slug ? pathFor(collection, slug, isNew ? null : entry.get("path")) : null;
    return {
      collection: collection,
      slug: slug,
      isNew: isNew,
      dataImm: dataImm,
      data: plain(dataImm) || {},
      mediaFiles: plain(entry.get("mediaFiles")) || [],
      me: me || "",
      path: path,
    };
  }

  /** (b) Upload types and sizes, with the deploy's own limits. */
  function checkUploads(ctx) {
    var g = root.BobalabGuards;
    var media = cfg().media;
    if (!g || !media) return;
    var problems = g.uploadProblems({ data: ctx.data, mediaFiles: ctx.mediaFiles }, media);
    if (!problems.length) return;
    var message =
      problems.length === 1
        ? problems[0].message
        : "Not saved: " +
          problems
            .map(function (p) {
              return "“" + p.name + "”";
            })
            .join(", ") +
          " can't go on the website. " +
          g.advice(media);
    refuse(message, { field: problems[0].field });
    throw Refused(message);
  }

  /** (c) Names the lab asked never to publish (the PI's hidden roster). */
  function checkNames(ctx) {
    var g = root.BobalabGuards;
    var roster = cfg().hiddenNames;
    if (!g || !roster || !roster.hashes || !roster.hashes.length) return;
    var texts = g.strings(ctx.data);
    if (ctx.path) texts.push(ctx.path);
    else if (ctx.slug) texts.push(ctx.slug);
    return g.hiddenNameHits(texts, roster).then(
      function (hits) {
        if (!hits) return;
        var message =
          "Not saved: this entry contains a name the lab has asked never to publish. Ask the PI before adding it.";
        refuse(message);
        throw Refused(message);
      },
      function (e) {
        if (e && e.refused) throw e;
        // The browser cannot hash (no crypto.subtle): the repo test still guards the names.
      },
    );
  }

  function openEntryAction(collection, slug, label) {
    return {
      label: label,
      run: function () {
        root.location.hash = "#/collections/" + collection + "/entries/" + slug;
      },
    };
  }

  function mergeAction(path, baseSha, latest, self) {
    var l = live();
    if (!l || typeof l.mergeLatest !== "function") return null;
    return {
      label: self ? "Bring in that version" : "Bring in their changes",
      run: function () {
        var lay = root.BobalabLayout;
        Promise.resolve()
          .then(function () {
            if (lay && typeof lay.isLivePaneShown === "function" && !lay.isLivePaneShown())
              return lay.showLivePane();
          })
          .then(function () {
            return typeof l.whenReady === "function" ? l.whenReady() : true;
          })
          .then(function () {
            return l.mergeLatest({
              path: path,
              baseSha: baseSha || "unknown",
              latestSha: latest.sha,
            });
          })
          .then(
            function (res) {
              if (res && res.ok) hideRefusal();
            },
            function (e) {
              refuse(
                "Couldn't bring in the other version: " +
                  String((e && e.message) || "something went wrong").replace(/\.$/, "") +
                  ". Reload the page to start from the saved version; copy your changes first.",
              );
            },
          );
      },
    };
  }

  /** (d) Did someone save this entry after the form here started from it? */
  function checkConflict(ctx) {
    if (mode() === "local") return; // the demo writes to this computer only
    var h = hist();
    if (!h || typeof h.latest !== "function" || !ctx.path) return;
    var noAnswer = function () {
      S.notes.push(NOTE_NO_CONFLICT);
    };
    if (ctx.isNew) {
      return within(h.latest(ctx.path, { fresh: true }), OPTIONS.conflictMs, TIMEOUT).then(
        function (v) {
          if (v === TIMEOUT) return noAnswer();
          var d = newEntryDecision(v, Date.now());
          if (d.ok) return;
          refuse(d.message, { action: openEntryAction(ctx.collection, ctx.slug, "Open it") });
          throw Refused(d.message);
        },
        function (e) {
          if (e && e.refused) throw e;
          noAnswer();
        },
      );
    }
    var path = ctx.path;
    var started = Date.now();
    var ready = S.baseReady[path] || Promise.resolve();
    return within(
      Promise.resolve(ready).then(function () {
        return h.latest(path, { fresh: true });
      }),
      OPTIONS.conflictMs,
      TIMEOUT,
    ).then(
      function (v) {
        if (v === TIMEOUT) return noAnswer();
        var b = S.base[path];
        var visit = S.visits[path] || {};
        var d = conflictDecision({
          latest: v,
          baseline: b ? b.sha : null,
          ownShas: S.own,
          pendingOwn: S.pendingOwn[path] || null,
          me: ctx.me,
          openedAt: visit.openedAt || started,
        });
        if (d.adopt) {
          if (S.pendingOwn[path]) setBaseline(path, d.adopt);
          else setBase(path, d.adopt, "open");
        }
        if (d.ok) return;
        refuse(d.message, { action: mergeAction(path, b ? b.sha : null, v, d.self) });
        throw Refused(d.message);
      },
      function (e) {
        if (e && e.refused) throw e;
        noAnswer();
      },
    );
  }

  /** "news/x.md" (the check's file names) → the entry, for [Open News item “x”]. */
  function entryOfIssue(file) {
    var h = hist();
    if (!file || !h || typeof h.entryOfPath !== "function") return null;
    return safe(function () {
      return h.entryOfPath("content/" + String(file).replace(/^\/+|^content\//g, ""));
    }, null);
  }

  /**
   * The other entry a site-check problem is about, for [Open …]: named as the
   * live column names it (by its title, "Publication “Managing Multihoming…”"),
   * else by its address.
   */
  function otherEntry(l, issue, file, ownFile) {
    if (l && typeof l.issueEntry === "function") {
      var e = safe(function () {
        return l.issueEntry(issue);
      }, undefined);
      if (e !== undefined) return e;
    }
    return ownFile && file !== ownFile ? entryOfIssue(file) : null;
  }

  /** (e) The deploy's own validator on the saved site, with and without this change. */
  function checkSite(ctx) {
    var l = live();
    var noCheck = function () {
      S.notes.push(NOTE_NO_CHECK);
    };
    if (!l || typeof l.checkSave !== "function") return noCheck();
    var blocks = (cfg().features || {}).previewCheckBlocksSave !== false;
    var req = safe(function () {
      return l.checkSave({
        entry: { collection: ctx.collection, slug: ctx.slug },
        isNew: ctx.isNew,
        data: ctx.data,
        timeoutMs: OPTIONS.checkMs,
      });
    }, null);
    if (!req) return noCheck();
    return within(req, OPTIONS.checkMs + 500, TIMEOUT).then(
      function (res) {
        if (res === TIMEOUT || !res || !res.available) return noCheck();
        var blocking = Array.isArray(res.blocking) ? res.blocking : [];
        if (!blocking.length || !blocks) return;
        var format =
          typeof l.formatIssue === "function"
            ? function (i) {
                return l.formatIssue(i);
              }
            : function (i) {
                return i.message;
              };
        var message = siteCheckMessage(blocking, format);
        var ownFile = ctx.path ? ctx.path.replace(/^content\//, "") : null;
        var other = null;
        var field = null;
        blocking.forEach(function (i) {
          var file = String(i.file || "").replace(/^content\//, "");
          if (!other) other = otherEntry(l, i, file, ownFile);
          // A duplicate title or DOI may sit on the other file: the field is this one's too.
          if ((!ownFile || file === ownFile || /^E_DUP_/.test(i.code)) && i.field && !field)
            field = String(i.field).split(".")[0];
        });
        refuse(message, {
          field: field,
          action: other
            ? openEntryAction(other.collection, other.slug, "Open " + other.name)
            : null,
        });
        throw Refused(message);
      },
      function (e) {
        if (e && e.refused) throw e;
        noCheck();
      },
    );
  }

  /** The preSave listener: checks (b) to (e), in order. Returns undefined: never replaces the data. */
  function preSave(args) {
    var entry = args && args.entry;
    if (!entry || typeof entry.get !== "function") return undefined;
    if (!S.saving) startLatch(); // a save that did not start with our click (Decap's menu, a script)
    S.inPreSave = true; // Decap is persisting: the latch must hold, whatever the label says
    S.lastTry = Date.now();
    S.notes = [];
    var ctx = contextOf(args);
    S.attempt = {
      ctx: ctx,
      baselineSha: ctx.path ? baseline(ctx.path) : null,
      startedAt: S.startedAt,
    };
    return Promise.resolve()
      .then(function () {
        return checkUploads(ctx);
      })
      .then(function () {
        return checkNames(ctx);
      })
      .then(function () {
        return checkConflict(ctx);
      })
      .then(function () {
        return checkSite(ctx);
      })
      .then(
        function () {
          S.inPreSave = false;
          return undefined;
        },
        function (e) {
          // Refused (or a check broke): nothing is committed, so Save may be pressed again.
          S.inPreSave = false;
          release("refused");
          throw e;
        },
      );
  }

  // ---------------------------------------------------------------------------
  // After the commit (postSave)

  function resolveNewSlug(collection) {
    return new Promise(function (resolve) {
      var until = Date.now() + OPTIONS.slugWaitMs;
      var look = function () {
        var ed = editor();
        var e =
          ed && typeof ed.getCurrentEntry === "function" ? safe(ed.getCurrentEntry, null) : null;
        if (e && e.collection === collection && !e.newRecord && e.slug) return resolve(e.slug);
        var h = hooks();
        var r =
          h && typeof h.editorRoute === "function"
            ? h.editorRoute(root.location && root.location.hash)
            : null;
        if (r && !r.isNew && r.collection === collection && r.slug) return resolve(r.slug);
        if (Date.now() >= until) return resolve(null);
        root.setTimeout(look, 100);
      };
      look();
    });
  }

  function afterSave(info) {
    var slugP = info.isNew ? resolveNewSlug(info.collection) : Promise.resolve(info.slug);
    return slugP.then(function (slug) {
      if (!slug) slug = info.predictedSlug;
      var path = slug ? pathFor(info.collection, slug, info.isNew ? null : info.path) : null;
      if (path) {
        S.pendingOwn[path] = { at: info.startedAt };
        dropDraftBase(path);
      }
      var l = live();
      var view =
        (l && typeof l.viewTarget === "function"
          ? safe(function () {
              return l.viewTarget(info.collection, slug, info.data);
            }, null)
          : null) || fallbackView(info.collection, slug, info.data);
      var h = hist();
      var ref =
        path && h && typeof h.entryOfPath === "function"
          ? safe(function () {
              return h.entryOfPath(path);
            }, null)
          : null;
      var dock = root.BobalabDock;
      if (path && dock && typeof dock.saved === "function") {
        safe(function () {
          dock.saved({
            collection: info.collection,
            slug: slug,
            path: path,
            label: ref ? ref.name : info.collection + " “" + slug + "”",
            login: info.login,
            startedAt: info.startedAt,
            baselineSha: info.baselineSha || "unknown",
            view: view,
            notes: info.notes,
          });
        });
      }
      schedule(); // hide Decap's "Saved." once the dock's toast is up
      var event = {
        collection: info.collection,
        slug: slug,
        path: path,
        login: info.login,
        startedAt: info.startedAt,
      };
      S.listeners.slice().forEach(function (fn) {
        safe(function () {
          fn(event);
        });
      });
    });
  }

  /** The postSave listener: returns at once (Decap waits for it before it says "Saved"). */
  function postSave(args) {
    var entry = args && args.entry;
    S.postSaved = true;
    S.latchTimers.push(
      root.setTimeout(function () {
        if (S.postSaved) release("saved");
      }, OPTIONS.releaseAfterSaveMs),
    );
    hideRefusal();
    if (!entry || typeof entry.get !== "function") return undefined;
    var attempt = S.attempt || {};
    var ctx = attempt.ctx || {};
    var isNew = !!entry.get("newRecord") || !entry.get("slug");
    var g = gh();
    var info = {
      collection: entry.get("collection"),
      slug: entry.get("slug") || null,
      isNew: isNew,
      path: entry.get("path") || null,
      predictedSlug: ctx.slug || null,
      data: plain(entry.get("data")) || {},
      login:
        (args.author && args.author.login) ||
        ctx.me ||
        (g && typeof g.user === "function"
          ? safe(function () {
              var u = g.user();
              return u && u.login;
            }, "")
          : ""),
      startedAt: attempt.startedAt || S.startedAt || Date.now(),
      baselineSha: isNew ? null : attempt.baselineSha,
      notes: S.notes.slice(),
    };
    S.attempt = null;
    root.setTimeout(function () {
      afterSave(info);
    }, 0);
    return undefined;
  }

  function onSaved(fn) {
    if (typeof fn !== "function") return function () {};
    S.listeners.push(fn);
    return function () {
      S.listeners = S.listeners.filter(function (f) {
        return f !== fn;
      });
    };
  }

  // ---------------------------------------------------------------------------
  // window.confirm: same-name uploads and the local backup

  function wrapConfirm() {
    var orig = root.confirm;
    if (typeof orig !== "function" || orig.__bobalab) return;
    var wrapped = function (message) {
      var text = String(message === undefined || message === null ? "" : message);
      if (SAME_NAME.test(text)) {
        // Decap would delete the saved file at once, before any Save (spec §3.10).
        // The media library is open: admin.css lifts this toast above its overlay.
        var t = toast({ text: RENAME, timeoutMs: 12000 });
        if (t && t.el && typeof t.el.setAttribute === "function")
          t.el.setAttribute("data-bl-rename", "");
        announce(RENAME);
        return false;
      }
      var backup = phrase("editor.editor.confirmLoadBackup");
      var answer = orig.apply(this, arguments);
      if (backup && text === backup) backupAnswered(!!answer);
      return answer;
    };
    wrapped.__bobalab = true;
    root.confirm = wrapped;
  }

  // ---------------------------------------------------------------------------
  // Start

  var api = {
    saveNow: saveNow,
    onSaved: onSaved,
    isSaving: function () {
      return S.saving;
    },
    baseline: function (path) {
      var b = S.base[path];
      return b && b.sha ? b.sha : null;
    },
    setBaseline: setBaseline,
    ownShas: ownShas,
    refuse: refuse,
    // For tests and other scripts
    hideRefusal: hideRefusal,
    saveNote: saveNote,
    _options: OPTIONS,
    _conflictDecision: conflictDecision,
    _newEntryDecision: newEntryDecision,
    _refusalText: refusalText,
    _siteCheckMessage: siteCheckMessage,
    _fallbackView: fallbackView,
    _preSave: preSave,
    _postSave: postSave,
    _onEditor: onEditor,
    _sync: sync,
    _state: S,
  };
  root.BobalabSave = api;

  var cms = root.CMS;
  if (cms && typeof cms.registerEventListener === "function") {
    // After cms-hooks.js (loaded earlier): its checks run first and tidy the data.
    cms.registerEventListener({ name: "preSave", handler: preSave });
    cms.registerEventListener({ name: "postSave", handler: postSave });
  }
  var ed = editor();
  if (ed && typeof ed.onEditorChange === "function")
    safe(function () {
      ed.onEditorChange(onEditor);
    });
  wrapConfirm();

  var d = doc();
  if (!d) return;
  d.addEventListener("click", onCapture, true);
  d.addEventListener("keydown", onKey, true);
  if (typeof root.MutationObserver === "function" && d.body) {
    new root.MutationObserver(schedule).observe(d.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-haspopup", "aria-expanded"],
    });
  }
  if (typeof root.addEventListener === "function") root.addEventListener("hashchange", schedule);
})(typeof window !== "undefined" ? window : globalThis);
