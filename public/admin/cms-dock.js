/*
 * BOBALAB CMS: the status dock, the "site not updating" banner, the Undo
 * toast and the Recent changes sheet (editor v2, WP3; spec §3.4, §4.4, §4.5, §5).
 * Loaded by /admin/ after cms-deploy.js; sets window.BobalabDock.
 *
 *  - #bl-dock: a small fixed box on every CMS screen once the editor is signed
 *    in. It says whether the live site is up to date and, after a Save, follows
 *    that save: "Saved. The live site updates in about 2 minutes." → "Live on
 *    the site ✓ · View page" (or "Saved · not shown on the live site because …"
 *    for a hidden entry). [Recent changes] opens the sheet.
 *  - saved({...}) is called by cms-save.js after every save. The dock finds the
 *    save's commit (BobalabHistory.mine: the editor's newest commit of that
 *    file that is not the version they started from; 5 retries 2 s apart),
 *    hands its SHA to BobalabSave.setBaseline, and tracks the deploy
 *    (BobalabDeploy.track). The pending save is kept in sessionStorage
 *    "bobalab.deploy.pending.v1", so a reload keeps following it.
 *  - The toast "Saved. The live site updates in about 2 minutes. [Undo]" stays
 *    30 s (paused under the pointer or focus). It closes when the editor moves
 *    to another address or entry, or changes the form again; then "Undo is in
 *    this entry's History" shows for 5 s. Undo asks cms-live.js to restore the
 *    version before the save (BobalabLive.restoreVersion), which saves through
 *    the form like any other Save. A save that created the entry offers the
 *    Draft advice instead: there is no earlier version to go back to.
 *  - #bl-banner (role=status) shows on every screen while the live site is
 *    not updating, and names the save after which it stopped (BobalabDeploy
 *    site(): the oldest failing run) with [Open it] and [What happened?]. A
 *    failed daily rebuild is said not to be caused by a save. Its text changes
 *    only when the problem changes, so screen readers do not repeat it.
 *  - Local demo: "Saved to this computer (local demo: there is no live site)";
 *    no tracking and no banner.
 *
 * Styles: cms-ui.css. tests/unit/cms/dock.test.ts runs this file in a sandbox.
 */
(function (root) {
  "use strict";

  var PENDING_KEY = "bobalab.deploy.pending.v1";
  var SEC = 1000;
  var MIN = 60 * SEC;
  var TRACK_MAX = 25 * MIN;
  var DONE_SHOW = 30 * SEC; // "Live on the site ✓" before the dock goes back to the site status
  var LOST_SHOW = 2 * MIN;
  var UNDO_SHOW = 30 * SEC;
  var AFTER_UNDO = 5 * SEC;
  var FIND_TRIES = 6; // the first look and 5 retries
  var FIND_GAP = 2 * SEC;
  var CHECK_EVERY = 2 * SEC;

  var DRAFT = "“Draft · pending lab review”";
  var SAVED = "Saved. The live site updates in about 2 minutes.";
  var LOCAL_SAVED = "Saved to this computer (local demo: there is no live site)";
  var STEP_OTHER = "GitHub could not update the site; tell a maintainer";

  function ui() {
    return root.BobalabUi;
  }
  function gh() {
    return root.BobalabGitHub;
  }
  function hist() {
    return root.BobalabHistory;
  }
  function deploy() {
    return root.BobalabDeploy;
  }

  function hasDom() {
    var d = root.document;
    return !!(d && typeof d.createElement === "function" && d.body && ui());
  }

  function toMs(x) {
    if (x === null || x === undefined || x === "") return 0;
    if (typeof x === "number") return x;
    var t = Date.parse(String(x));
    return isNaN(t) ? 0 : t;
  }

  function safe(fn, fallback) {
    try {
      return fn();
    } catch {
      return fallback;
    }
  }

  function mode() {
    var g = gh();
    return g ? g.mode() : "github";
  }

  var S = {
    mounted: false,
    els: null,
    save: null, // the save being followed (kept in sessionStorage)
    phase: null, // "finding" | "tracking" | "lost" | "done"
    deploy: null, // its DeployState
    tracker: null,
    trackerOff: null,
    trackTimer: null,
    doneTimer: null,
    site: null,
    siteOff: null,
    claimed: [], // commits already matched to earlier saves in this tab
    undo: null,
    sheet: null,
    dockKey: "",
    bannerKey: "",
    spoken: "",
  };

  // ---------------------------------------------------------------------------
  // Words (pure; exported for tests as _describe and _banner)

  /** Why a saved entry is not on the live site: "because “Draft · pending lab review” is on". */
  function hiddenReason(rec) {
    var r = String((rec && rec.view && rec.view.reason) || "");
    if (/list/i.test(r)) return "because Listed is off";
    if (!r || /draft/i.test(r)) return "because " + DRAFT + " is on";
    return "because " + r.charAt(0).toLowerCase() + r.slice(1);
  }

  /**
   * "News item “Learning to gig”" (the saved title, when the live column has
   * loaded the site: cms-live.js), "News item “2026-10-07-x”" (the commit's
   * address) or the commit's own words.
   */
  function changeName(c) {
    var e = c && c.entry;
    var l = root.BobalabLive;
    if (e && e.collection && e.slug && l && typeof l.savedEntryName === "function") {
      var n = safe(function () {
        return l.savedEntryName(e.collection, e.slug);
      }, "");
      if (n) return n;
    }
    if (e && e.name) return e.name;
    return "“" + String((c && c.subject) || "an earlier change").slice(0, 80) + "”";
  }

  function notMadeBySave(c) {
    return c && c.event && c.event !== "push";
  }

  function rebuildName(c) {
    return c && c.event === "workflow_dispatch" ? "a rebuild started by hand" : "the daily rebuild";
  }

  function behindText(c, rec) {
    if (notMadeBySave(c)) {
      return (
        "Saved. The live site is stuck on an earlier problem (" +
        rebuildName(c) +
        ", not caused by a save); your change goes live once that is fixed. No need to undo."
      );
    }
    var later = c && rec && toMs(c.at) > toMs(rec.date || rec.startedAt);
    return (
      "Saved. The live site is stuck on " +
      (later ? "a problem from a later save" : "an earlier problem") +
      " (" +
      changeName(c) +
      (c && c.authorLogin ? ", saved by @" + c.authorLogin : "") +
      "); your change goes live once that is fixed. No need to undo."
    );
  }

  function siteIdle(site) {
    if (!site) return { tone: "idle", text: "Checking the live site…", notes: [] };
    if (site.failed)
      return {
        tone: "fail",
        text: "The live site is not updating",
        notes: [],
        action: { kind: "why-site", label: "What happened?" },
      };
    if (site.updating) return { tone: "busy", text: "The live site is updating…", notes: [] };
    return { tone: "ok", text: "Live site up to date", notes: [] };
  }

  /**
   * The dock's words for one moment: {tone, text, notes: [], action?: {kind, label}}.
   * m = {mode, save, phase, deploy, site}.
   */
  function describe(m) {
    var rec = m.save;
    if (m.mode === "local") {
      if (rec)
        return {
          tone: "ok",
          text: LOCAL_SAVED,
          notes: [],
        };
      return { tone: "idle", text: "Local demo: Save writes to this computer", notes: [] };
    }
    if (!rec) return siteIdle(m.site);
    var notes = (rec.notes || []).slice();
    var view = rec.view || { state: "live" };
    var hidden = view.state === "hidden";
    var hiddenText = "Saved · not shown on the live site " + hiddenReason(rec);
    var d = m.deploy || {};
    var stage = m.phase === "lost" || m.phase === "finding" ? m.phase : d.stage || "waiting";
    switch (stage) {
      case "live":
        if (hidden) return { tone: "ok", text: hiddenText, notes: [] };
        return {
          tone: "ok",
          text: "Live on the site ✓",
          notes: ["If you still see the old page, reload it."],
          action: {
            kind: "view",
            label:
              view.state === "elsewhere" && view.label ? "View the " + view.label : "View page",
          },
        };
      case "failed":
        return {
          tone: "fail",
          text: "Saved, but the live site did not update",
          notes: notes,
          action: { kind: "why", label: "What happened?" },
        };
      case "waiting-behind-failure":
        return { tone: "warn", text: behindText(d.culprit, rec), notes: notes };
      case "slow":
        return {
          tone: "warn",
          text: "Saved · the live site is taking longer than usual",
          notes: notes,
        };
      case "unknown":
        return {
          tone: "warn",
          text: hidden ? hiddenText : "Saved · GitHub hasn't started updating the live site yet",
          notes: notes,
        };
      case "lost":
        return { tone: "busy", text: hidden ? hiddenText : SAVED, notes: notes };
      default:
        // finding, waiting, queued, building, publishing
        return { tone: "busy", text: hidden ? hiddenText : SAVED, notes: notes };
    }
  }

  /** The banner's words, or null when the live site is fine. */
  function banner(site, now) {
    var c = site && site.failed;
    if (!c) return null;
    var u = ui();
    var at = c.at && u ? u.when(c.at, now) : "";
    if (notMadeBySave(c)) {
      var first = rebuildName(c);
      return {
        text:
          first.charAt(0).toUpperCase() +
          first.slice(1) +
          " failed; this isn't caused by a save. Tell a maintainer. Saves are still recorded and go live once it is fixed.",
        entry: null,
      };
    }
    var by = c.authorLogin ? "saved by @" + c.authorLogin : "saved";
    return {
      text:
        "The live site is not updating: the update after " +
        changeName(c) +
        " (" +
        by +
        (at ? " at " + at : "") +
        ") failed. Later saves wait until it is fixed.",
      entry: c.entry
        ? { collection: c.entry.collection, slug: c.entry.slug, text: c.entry.text }
        : null,
    };
  }

  // ---------------------------------------------------------------------------
  // The pending save in sessionStorage

  function persist() {
    if (!S.save || mode() === "local") return;
    try {
      root.sessionStorage.setItem(PENDING_KEY, JSON.stringify(S.save));
    } catch {
      // storage blocked: the dock simply forgets the save on reload
    }
  }

  function clearPending() {
    try {
      root.sessionStorage.removeItem(PENDING_KEY);
    } catch {
      // ignore
    }
  }

  function readPending() {
    try {
      var raw = root.sessionStorage.getItem(PENDING_KEY);
      var rec = raw ? JSON.parse(raw) : null;
      return rec && rec.path && rec.startedAt ? rec : null;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // The dock and banner elements

  function build() {
    var u = ui();
    var box = u.corner();
    var bannerText = u.el("p", { className: "bl-banner__text" });
    var bannerOpen = u.button("Open it", "bl-btn bl-btn--small", function () {
      var b = banner(S.site, Date.now());
      if (b && b.entry) openEntry(b.entry.collection, b.entry.slug);
    });
    var bannerWhy = u.button("What happened?", "bl-btn bl-btn--small", function (e) {
      explainSite(e && e.currentTarget);
    });
    bannerOpen.hidden = true;
    bannerWhy.hidden = true;
    var bannerEl = u.el(
      "div",
      {
        id: "bl-banner",
        className: "bl-banner",
        attrs: { role: "status", "aria-atomic": "false", "data-state": "off" },
      },
      [bannerText, u.el("div", { className: "bl-banner__actions" }, [bannerOpen, bannerWhy])],
    );
    var dot = u.el("span", { className: "bl-dock__dot", attrs: { "aria-hidden": "true" } });
    var text = u.el("span", { className: "bl-dock__text" });
    var action = u.button("", "bl-btn bl-btn--link bl-dock__action", function (e) {
      runAction(e && e.currentTarget);
    });
    action.hidden = true;
    var notes = u.el("span", { className: "bl-dock__notes" });
    var recent = u.button("Recent changes", "bl-btn bl-dock__recent", function () {
      openRecentChanges();
    });
    var dockEl = u.el(
      "div",
      {
        id: "bl-dock",
        className: "bl-dock",
        attrs: { role: "region", "aria-label": "Live site status", "data-tone": "idle" },
      },
      [dot, u.el("div", { className: "bl-dock__body" }, [text, action, notes]), recent],
    );
    box.appendChild(bannerEl);
    box.appendChild(dockEl);
    S.els = {
      dock: dockEl,
      text: text,
      action: action,
      notes: notes,
      recent: recent,
      banner: bannerEl,
      bannerText: bannerText,
      bannerOpen: bannerOpen,
      bannerWhy: bannerWhy,
    };
  }

  function current() {
    return describe({ mode: mode(), save: S.save, phase: S.phase, deploy: S.deploy, site: S.site });
  }

  function render() {
    if (!S.mounted || !S.els) return;
    var m = current();
    var key = JSON.stringify(m);
    if (key !== S.dockKey) {
      S.dockKey = key;
      var e = S.els;
      e.dock.setAttribute("data-tone", m.tone);
      e.text.textContent = m.text;
      e.notes.textContent = (m.notes || []).join(" ");
      e.notes.hidden = !(m.notes && m.notes.length);
      if (m.action) {
        e.action.textContent = m.action.label;
        e.action.setAttribute("data-kind", m.action.kind);
        e.action.hidden = false;
      } else {
        e.action.hidden = true;
        e.action.removeAttribute("data-kind");
      }
      // One polite announcement per save state (the failure of one's own save is assertive, below).
      if (S.save && m.text !== S.spoken && m.tone !== "fail") {
        S.spoken = m.text;
        ui().announce(m.text);
      }
    }
    renderBanner();
  }

  function renderBanner() {
    if (!S.els) return;
    var b = mode() === "local" ? null : banner(S.site, Date.now());
    var key = b ? JSON.stringify(b) : "";
    if (key === S.bannerKey) return; // unchanged: screen readers are not told again
    S.bannerKey = key;
    var e = S.els;
    e.banner.setAttribute("data-state", b ? "on" : "off");
    e.bannerText.textContent = b ? b.text : "";
    e.bannerOpen.hidden = !(b && b.entry);
    if (b && b.entry) e.bannerOpen.setAttribute("aria-label", "Open it: " + b.entry.text);
    e.bannerWhy.hidden = !b;
  }

  function runAction(btn) {
    var a = S.els && S.els.action.getAttribute("data-kind");
    if (a === "view") viewPage();
    else if (a === "why") explainOwn(btn);
    else if (a === "why-site") explainSite(btn);
  }

  /** The published page, past the 10-minute page cache (?v=<time>). */
  function publishedUrl(path) {
    var base = new URL("../", root.location.href).href;
    return base + String(path || "/").replace(/^\//, "") + "?v=" + Date.now();
  }

  function viewPage() {
    var rec = S.save;
    var path = rec && rec.view && rec.view.path;
    if (!path) return;
    var w = root.top && root.top !== root ? root.top : root;
    w.open(publishedUrl(path), "_blank", "noopener");
  }

  function openEntry(collection, slug) {
    root.location.hash =
      "#/collections/" + encodeURIComponent(collection) + "/entries/" + encodeURIComponent(slug);
  }

  function explainOwn(btn) {
    var d = S.deploy || {};
    return ui().info({
      title: "Why the live site did not update",
      body: [
        "Your save is kept: it is in this entry's History.",
        "The update after your save stopped because " + (d.failedStep || STEP_OTHER) + ".",
        "What to do: undo the save in this entry's History, or tell a maintainer and send them the link below. Later saves wait until this is fixed.",
      ],
      link: d.runUrl
        ? { label: "Open the update log on GitHub (opens a new tab)", href: d.runUrl }
        : null,
      returnFocus: btn || null,
    });
  }

  function explainSite(btn) {
    var c = S.site && S.site.failed;
    if (!c) return Promise.resolve();
    var step = c.step || STEP_OTHER;
    var body;
    if (notMadeBySave(c)) {
      var r = rebuildName(c);
      body = [
        r.charAt(0).toUpperCase() +
          r.slice(1) +
          " stopped because " +
          step +
          ". This isn't caused by a save.",
        "Saves are still recorded and go live once it is fixed.",
        "Tell a maintainer and send them the link below.",
      ];
    } else {
      var at = c.at ? " at " + ui().when(c.at) : "";
      body = [
        "The update after " +
          changeName(c) +
          " (" +
          (c.authorLogin ? "saved by @" + c.authorLogin : "saved") +
          at +
          ") stopped because " +
          step +
          ".",
        "Saves made after it are kept and go live once it is fixed.",
        "To fix it: open that entry and undo the save in its History, or tell a maintainer and send them the link below.",
      ];
    }
    return ui().info({
      title: "Why the live site is not updating",
      body: body,
      link: c.runUrl
        ? { label: "Open the update log on GitHub (opens a new tab)", href: c.runUrl }
        : null,
      returnFocus: btn || null,
    });
  }

  // ---------------------------------------------------------------------------
  // Mounting once signed in

  function onSite(s) {
    S.site = s;
    var rec = S.save;
    // A later good deploy published a save that was stuck behind a failure.
    if (
      rec &&
      rec.date &&
      s &&
      s.ok &&
      s.liveAt &&
      S.deploy &&
      (S.deploy.stage === "failed" || S.deploy.stage === "waiting-behind-failure") &&
      toMs(s.liveAt) >= toMs(rec.date)
    ) {
      onDeploy(rec, Object.assign({}, S.deploy, { stage: "live" }));
      return;
    }
    render();
  }

  function mount() {
    if (!hasDom()) return;
    S.mounted = true;
    build();
    if (mode() === "github") {
      var dep = deploy();
      if (dep && typeof dep.onSite === "function") S.siteOff = dep.onSite(onSite);
      if (!S.save) resume();
    }
    render();
  }

  function unmount() {
    stopTracking();
    if (S.siteOff) safe(S.siteOff);
    S.siteOff = null;
    closeUndo(null);
    if (S.els) {
      [S.els.dock, S.els.banner].forEach(function (n) {
        if (n.parentNode) n.parentNode.removeChild(n);
      });
    }
    S.els = null;
    S.mounted = false;
    S.dockKey = "";
    S.bannerKey = "";
    S.site = null;
    // Signed out: a later sign-in picks the pending save up again from sessionStorage.
    S.save = null;
    S.phase = null;
    S.deploy = null;
  }

  function check() {
    var g = gh();
    var show = !!(g && g.signedIn());
    if (show && !S.mounted) mount();
    else if (!show && S.mounted) unmount();
  }

  // ---------------------------------------------------------------------------
  // After a save

  function stopTracking() {
    if (S.trackerOff) safe(S.trackerOff);
    if (S.tracker) safe(S.tracker.stop);
    if (S.trackTimer !== null && S.trackTimer !== undefined) root.clearTimeout(S.trackTimer);
    if (S.doneTimer !== null && S.doneTimer !== undefined) root.clearTimeout(S.doneTimer);
    S.tracker = null;
    S.trackerOff = null;
    S.trackTimer = null;
    S.doneTimer = null;
  }

  function finish(rec, after) {
    if (S.doneTimer !== null) root.clearTimeout(S.doneTimer);
    S.doneTimer = root.setTimeout(function () {
      S.doneTimer = null;
      if (S.save !== rec) return;
      stopTracking();
      S.save = null;
      S.phase = null;
      S.deploy = null;
      S.spoken = "";
      render();
    }, after);
  }

  function onDeploy(rec, st) {
    if (S.save !== rec) return;
    var before = S.deploy && S.deploy.stage;
    S.deploy = st;
    if ((st.stage === "live" || st.stage === "failed") && st.stage !== before) {
      // The site's own status (shown once this save's message goes) is older than this news.
      var dep = deploy();
      if (dep && typeof dep.refreshSite === "function") dep.refreshSite();
    }
    if (st.stage === "live") {
      clearPending();
      stopTracking();
      S.phase = "done";
      finish(rec, DONE_SHOW);
    } else if (st.stage === "failed") {
      clearPending();
      if (before !== "failed") {
        ui().announce(
          "Saved, but the live site did not update. Press What happened? in the status box.",
          true,
        );
      }
    } else {
      persist();
    }
    render();
  }

  function startTracking(rec) {
    var dep = deploy();
    if (!rec.sha || !dep) return;
    var t = dep.track(rec.sha, { startedAt: rec.startedAt });
    S.tracker = t;
    S.phase = "tracking";
    S.deploy = t.state();
    S.trackerOff = t.on(function (st) {
      if (S.tracker === t) onDeploy(rec, st);
    });
    // The deploy tracker gives up after 25 minutes; so does the dock.
    S.trackTimer = root.setTimeout(
      function () {
        S.trackTimer = null;
        if (S.save !== rec || (S.deploy && S.deploy.stage === "failed")) return;
        clearPending();
        finish(rec, 0);
      },
      Math.max(0, TRACK_MAX - (Date.now() - rec.startedAt)),
    );
    render();
  }

  function found(rec, v) {
    rec.sha = v.sha;
    rec.parentSha = v.parentSha;
    rec.kind = v.kind;
    rec.date = v.date;
    S.claimed.push(v.sha);
    var save = root.BobalabSave;
    if (save && typeof save.setBaseline === "function") {
      safe(function () {
        save.setBaseline(rec.path, v.sha);
      });
    }
    persist();
    offerUndo(rec, v);
    startTracking(rec);
  }

  function lost(rec) {
    S.phase = "lost";
    clearPending();
    finish(rec, LOST_SHOW);
    render();
  }

  function find(rec, attempt) {
    if (S.save !== rec) return;
    var h = hist();
    function retry() {
      if (S.save !== rec) return;
      if (attempt + 1 >= FIND_TRIES) {
        lost(rec);
        return;
      }
      root.setTimeout(function () {
        find(rec, attempt + 1);
      }, FIND_GAP);
    }
    if (!h) {
      lost(rec);
      return;
    }
    var not = S.claimed.slice();
    if (rec.baselineSha && rec.baselineSha !== "unknown") not.push(rec.baselineSha);
    h.mine({ login: rec.login, path: rec.path, notSha: not, since: rec.startedAt }).then(function (
      v,
    ) {
      if (S.save !== rec) return;
      if (v) found(rec, v);
      else retry();
    }, retry);
  }

  function resume() {
    var rec = readPending();
    if (!rec) return;
    if (Date.now() - rec.startedAt > TRACK_MAX) {
      clearPending();
      return;
    }
    S.save = rec;
    if (rec.sha) {
      if (S.claimed.indexOf(rec.sha) === -1) S.claimed.push(rec.sha);
      startTracking(rec);
    } else {
      S.phase = "finding";
      find(rec, 0);
    }
  }

  /**
   * After a save (cms-save.js postSave): {collection, slug, path, label, login,
   * startedAt, baselineSha, view: {state, path?, label?, reason?}, notes?: string[]}.
   */
  function saved(info) {
    if (!info || !info.path) return;
    var g = gh();
    var me = g && g.user();
    var rec = {
      collection: info.collection,
      slug: info.slug,
      path: info.path,
      label: info.label || "",
      login: info.login || (me && me.login) || "",
      startedAt: toMs(info.startedAt) || Date.now(),
      baselineSha: info.baselineSha || null,
      view: info.view || { state: "live" },
      notes: Array.isArray(info.notes) ? info.notes.slice() : [],
    };
    stopTracking();
    closeUndo(null); // an older Undo toast belongs to the older save
    S.save = rec;
    S.deploy = null;
    // The toast (role=status) says it already: the dock does not announce it a second time.
    S.spoken = mode() === "local" ? LOCAL_SAVED : SAVED;
    check();
    if (mode() === "local") {
      S.phase = "done";
      render();
      if (hasDom()) ui().toast({ text: LOCAL_SAVED + "." });
      finish(rec, DONE_SHOW);
      return;
    }
    S.phase = "finding";
    persist();
    render();
    if (hasDom()) openUndoToast(rec);
    find(rec, 0);
  }

  // ---------------------------------------------------------------------------
  // The Undo toast

  function editorRoute(hash) {
    var hooks = root.BobalabCmsHooks;
    if (hooks && typeof hooks.editorRoute === "function") return hooks.editorRoute(hash);
    var m = /^#?\/collections\/([^/]+)\/entries\/(.+?)\/?(?:\?.*)?$/.exec(String(hash || ""));
    return m
      ? {
          collection: safe(function () {
            return decodeURIComponent(m[1]);
          }, m[1]),
          slug: safe(function () {
            return decodeURIComponent(m[2]);
          }, m[2]),
          isNew: false,
        }
      : null;
  }

  function isOwnRoute(rec, hash) {
    var r = editorRoute(hash);
    return !!(r && !r.isNew && r.collection === rec.collection && r.slug === rec.slug);
  }

  function openUndoToast(rec) {
    var u = { rec: rec, ready: false, offs: [], closing: null, toast: null };
    u.toast = ui().toast({
      text: SAVED,
      timeoutMs: UNDO_SHOW,
      onClose: function () {
        undoClosed(u);
      },
    });
    S.undo = u;
    function onHash() {
      if (S.undo !== u || isOwnRoute(rec, root.location.hash)) return;
      closeUndo("navigate");
    }
    root.addEventListener("hashchange", onHash);
    u.offs.push(function () {
      root.removeEventListener("hashchange", onHash);
    });
    var editor = root.CMS && root.CMS.editor;
    if (editor && typeof editor.onEditorChange === "function") {
      var cur = safe(function () {
        return typeof editor.getCurrentEntry === "function" ? editor.getCurrentEntry() : null;
      }, null);
      var clean = !(cur && cur.hasChanged); // only a change made AFTER this save closes the toast
      var off = safe(function () {
        return editor.onEditorChange(function (e) {
          if (S.undo !== u || !e) return;
          if (e.path && e.path !== rec.path) {
            closeUndo("path");
            return;
          }
          if (e.hasChanged) {
            if (clean) closeUndo("changed");
          } else {
            clean = true;
          }
        });
      }, null);
      if (typeof off === "function") u.offs.push(off);
    }
  }

  function undoClosed(u) {
    if (S.undo !== u) return;
    S.undo = null;
    u.offs.forEach(function (f) {
      safe(f);
    });
    var why = u.closing;
    if (u.ready && (why === "navigate" || why === "path" || why === "changed")) {
      ui().toast({ text: "Undo is in this entry's History", timeoutMs: AFTER_UNDO });
    }
  }

  function closeUndo(reason) {
    var u = S.undo;
    if (!u) return;
    u.closing = reason;
    u.toast.close();
  }

  function createAdvice(rec) {
    return rec.collection === "people"
      ? "To take it off the site, turn off “Listed” and Save."
      : "To take it off the site, turn on " + DRAFT + " and Save.";
  }

  function offerUndo(rec, v) {
    var u = S.undo;
    if (!u || u.rec !== rec || !u.toast.isOpen()) return;
    var parentHas =
      !v.parentSha || v.kind === "create"
        ? Promise.resolve(false)
        : v.kind === "edit"
          ? Promise.resolve(true)
          : hist()
              .textAt(rec.path, v.parentSha)
              .then(
                function (t) {
                  return t !== null;
                },
                function () {
                  return true;
                },
              );
    parentHas.then(function (has) {
      if (S.undo !== u || !u.toast.isOpen()) return;
      if (!has) {
        u.toast.setText(SAVED + " " + createAdvice(rec));
        return;
      }
      var live = root.BobalabLive;
      var cur = live && typeof live.current === "function" ? safe(live.current, null) : null;
      if (!cur || cur.path !== rec.path) return;
      u.ready = true;
      u.toast.setAction({
        label: "Undo",
        ariaLabel: "Undo this save: go back to the version before it",
        run: function () {
          runUndo(rec);
        },
      });
      ui().announce("Undo is also in this entry's History");
    });
  }

  function runUndo(rec) {
    var live = root.BobalabLive;
    if (!live || typeof live.restoreVersion !== "function") return;
    Promise.resolve()
      .then(function () {
        return live.restoreVersion({
          path: rec.path,
          sha: rec.parentSha,
          save: true,
          source: "undo",
        });
      })
      .then(null, function (e) {
        ui().toast({
          text:
            "Couldn't undo: " +
            String((e && e.message) || "something went wrong").replace(/\.$/, "") +
            ". Undo is in this entry's History.",
        });
      });
  }

  // ---------------------------------------------------------------------------
  // Recent changes (spec §4.5)

  function baseName(p) {
    return String(p || "")
      .split("/")
      .pop();
  }

  /** "changed", "uploaded isabelle-cho.jpg", "changed outside the content manager", … */
  function verb(row) {
    switch (row.kind) {
      case "create":
        return "created";
      case "edit":
        return "changed";
      case "delete":
        return "deleted";
      case "upload":
        return "uploaded " + baseName(row.uploadPath);
      case "delete-file":
        return "deleted the file " + baseName(row.uploadPath);
      default:
        return "changed outside the content manager";
    }
  }

  function notLiveYet(row, site) {
    if (!site || !site.liveAt || mode() === "local") return false;
    if (site.liveSha && row.sha === site.liveSha) return false;
    return toMs(row.date) > toMs(site.liveAt);
  }

  function avatar(row) {
    var u = ui();
    var src = row.author && row.author.avatarUrl;
    if (src && /^https:\/\/avatars\.githubusercontent\.com\//.test(src)) {
      return u.el("img", {
        className: "bl-avatar",
        attrs: {
          src: src + (src.indexOf("?") === -1 ? "?" : "&") + "s=64",
          alt: "",
          width: 32,
          height: 32,
        },
      });
    }
    var name = (row.author && (row.author.name || row.author.login)) || "?";
    return u.el("span", {
      className: "bl-avatar bl-avatar--none",
      text: name.charAt(0).toUpperCase(),
      attrs: { "aria-hidden": "true" },
    });
  }

  function rowEl(row, site, close) {
    var u = ui();
    var line = u.el("p", { className: "bl-change__line" }, [
      u.el("strong", { text: (row.author && row.author.name) || "Someone" }),
    ]);
    line.appendChild(u.el("span", { text: " " + verb(row) }));
    if (row.entry && row.entry.text) {
      line.appendChild(u.el("span", { text: " " }));
      line.appendChild(u.el("span", { className: "bl-change__entry", text: row.entry.text }));
    }
    var meta = u.el("p", { className: "bl-change__meta" }, [
      u.el("time", {
        text: u.timeAgo(row.date),
        attrs: { datetime: row.date, title: u.fullTime(row.date) },
      }),
    ]);
    if (notLiveYet(row, site))
      meta.appendChild(u.el("span", { className: "bl-chip", text: "Not live yet" }));
    if (row.kind === "maintainer" && row.subject) {
      meta.appendChild(
        u.el("span", {
          className: "bl-change__subject",
          text: "“" + row.subject.slice(0, 80) + "”",
        }),
      );
    }
    var side = u.el("div", { className: "bl-change__side" });
    if (row.entry && row.kind !== "delete") {
      side.appendChild(
        u.button(
          "Open",
          "bl-btn bl-btn--small",
          function () {
            openEntry(row.entry.collection, row.entry.slug);
            close();
          },
          { "aria-label": "Open " + row.entry.text },
        ),
      );
    }
    if (row.kind === "maintainer" && row.url) {
      side.appendChild(
        u.el("a", {
          className: "bl-btn bl-btn--small bl-btn--link",
          text: "On GitHub ↗",
          attrs: {
            href: row.url,
            target: "_blank",
            rel: "noopener noreferrer",
            "aria-label": "See this change on GitHub (opens a new tab)",
          },
        }),
      );
    }
    return u.el("li", { className: "bl-change" }, [
      avatar(row),
      u.el("div", { className: "bl-change__main" }, [line, meta]),
      side,
    ]);
  }

  function statusCard(site) {
    var card = ui().el("div", { className: "bl-sheet__status" });
    fillStatus(card, site, false);
    return card;
  }

  /**
   * The sheet's status card. `behind`: the list shows saves newer than the live
   * site while GitHub has not started updating it yet (no run for them so far),
   * so it must not say "up to date" above rows marked "Not live yet".
   */
  function fillStatus(card, site, behind) {
    var u = ui();
    while (card.firstChild) card.removeChild(card.firstChild);
    if (mode() === "local") {
      card.appendChild(
        u.el("p", {
          text:
            "Local demo: this list is read from GitHub (" +
            gh().repo() +
            "), not from your computer.",
        }),
      );
      return;
    }
    var idle = siteIdle(site);
    var b = banner(site, Date.now());
    var waiting = !b && !!behind && idle.tone === "ok";
    card.setAttribute("data-tone", waiting ? "busy" : idle.tone);
    card.appendChild(
      u.el("p", {
        className: "bl-sheet__status-text",
        text: b ? b.text : waiting ? "Waiting for the live site to update" : idle.text,
      }),
    );
    if (!b && site && site.liveAt) {
      card.appendChild(
        u.el("p", {
          text:
            "The live site shows the saves up to " +
            u.fullTime(site.liveAt) +
            "." +
            (waiting ? " The newer ones go live in a few minutes." : ""),
        }),
      );
    }
  }

  /** Open the "Recent changes" sheet (a modal dialog). */
  function openRecentChanges() {
    if (!hasDom()) return;
    if (S.sheet) return;
    var u = ui();
    var h = hist();
    var d = root.document;
    var opener = d.activeElement;
    var site = S.site || (deploy() && deploy().lastSite && deploy().lastSite()) || null;
    var list = u.el("div", { className: "bl-sheet__list" });
    var problem = u.el("div", { className: "bl-sheet__problem" });
    var more = u.button("Show older saves", "bl-btn", function () {
      load(page + 1);
    });
    more.hidden = true;
    var card = statusCard(site);
    var behind = false;
    var content = u.el("div", { className: "bl-sheet__content" }, [card, problem, list, more]);
    var page = 0;
    var lastDay = "";
    var lastList = null;
    var shown = 0;
    var closeSheet = function () {};

    function load(p) {
      problem.textContent = "";
      more.disabled = true;
      list.setAttribute("aria-busy", "true");
      if (p === 1)
        list.appendChild(u.el("p", { className: "bl-sheet__loading", text: "Loading…" }));
      h.recent({ page: p }).then(
        function (r) {
          if (!S.sheet) return;
          var loading = list.querySelector ? list.querySelector(".bl-sheet__loading") : null;
          if (loading && loading.parentNode) loading.parentNode.removeChild(loading);
          page = p;
          r.rows.forEach(function (row) {
            if (row.kind === "system") return; // the deploy's own bookkeeping, not a save
            var day = u.dayLabel(row.date);
            if (day !== lastDay || !lastList) {
              lastDay = day;
              list.appendChild(u.el("h3", { className: "bl-sheet__day", text: day }));
              lastList = u.el("ul", { className: "bl-sheet__rows" });
              list.appendChild(lastList);
            }
            lastList.appendChild(rowEl(row, site, closeSheet));
            shown++;
            if (!behind && notLiveYet(row, site)) {
              behind = true;
              fillStatus(card, site, true);
            }
          });
          if (!shown && !r.hasMore) list.appendChild(u.el("p", { text: "No saves yet." }));
          more.hidden = !r.hasMore;
          more.disabled = false;
          list.removeAttribute("aria-busy");
        },
        function (e) {
          if (!S.sheet) return;
          var loading = list.querySelector ? list.querySelector(".bl-sheet__loading") : null;
          if (loading && loading.parentNode) loading.parentNode.removeChild(loading);
          list.removeAttribute("aria-busy");
          more.disabled = false;
          problem.appendChild(u.el("p", { text: (e && e.message) || "Couldn't reach GitHub." }));
          if (!e || e.kind !== "auth") {
            problem.appendChild(
              u.button("Try again", "bl-btn bl-btn--small", function () {
                load(page + 1);
              }),
            );
          }
        },
      );
    }

    S.sheet = { pending: true };
    u.dialog({
      title: "Recent changes",
      body: ["Every save to the website, newest first."],
      content: content,
      className: "bl-sheet",
      returnFocus: opener,
      buttons: [{ key: "close", label: "Close", focus: true }],
      onOpen: function (dlg, finishDialog) {
        closeSheet = function () {
          finishDialog("close");
        };
        S.sheet = { dlg: dlg, close: closeSheet };
      },
    }).then(function () {
      S.sheet = null;
    });
    load(1);
  }

  // ---------------------------------------------------------------------------

  var api = {
    saved: saved,
    openRecentChanges: openRecentChanges,
    _describe: describe,
    _banner: banner,
    _check: check,
    _state: function () {
      return S;
    },
  };
  root.BobalabDock = api;

  if (!hasDom() || typeof root.setInterval !== "function") return;
  check();
  root.setInterval(check, CHECK_EVERY);
  if (typeof root.addEventListener === "function") {
    root.addEventListener("storage", function (e) {
      if (!e || e.key === "decap-cms-user" || e.key === null) check();
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
