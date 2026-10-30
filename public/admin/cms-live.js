/*
 * BOBALAB CMS: the live column beside the form (editor v2, WP4; spec §2, §3.7, §4).
 * Loaded by /admin/ after cms-dock.js and before cms-guards.js; sets
 * window.BobalabLive and registers ONE preview template for all 12 entry types,
 * plus live.css for Decap's preview frame.
 *
 * The right column has two tabs:
 *  - Live preview: the real site. Decap's preview frame holds a bar (page
 *    tabs, Desktop/Phone, Find my entry, the address) and a second frame,
 *    ../editor-preview/ (src/app/editor-preview), which draws the site's own
 *    pages from the saved content plus the form's draft. The two frames talk
 *    only by postMessage (src/lib/preview/protocol.ts). This file posts the
 *    saved site (`base`, read with Decap's own getCollection, two collections
 *    at a time), the draft (`overlay`, the first at once, then at most every
 *    120 ms), unsaved uploads (`assets`, as data URLs) and the page to show.
 *    The preview answers with `rendered` (with its live problems) and runs two
 *    services: `parse` (a file's data, for History) and `check` (the site
 *    check that Save runs, cms-save.js).
 *  - History: every saved version of the entry, read from GitHub
 *    (cms-history.js, GET only). Selecting a version shows in the preview what
 *    Restore would save, never the raw old data, so a photo whose consent was
 *    withdrawn is never shown again. Restore and Undo put the old values into
 *    the form and press Save (cms-save.js), so every check runs. Consent and
 *    visibility switches may go from on to off but never back on, and removed
 *    personal details come back only when asked for in History.
 *
 * "Bring in their changes" (mergeLatest) merges a colleague's newer save into
 * the form field by field. Where both changed a field, the form gets their
 * value and the editor's own value is kept in the bar, ready to copy.
 *
 * Nothing here writes to GitHub: the only write is Decap's own Save.
 * tests/unit/cms/{live,restore,merge}.test.ts run this file in a sandbox;
 * tests/e2e/cms-live.spec.ts runs it in the browser against the local demo.
 */
(function (root) {
  "use strict";

  var V1 = 1; // the preview protocol version
  /** Decap template names: folder collections by name, file collections by file name. */
  var TEMPLATES = [
    "news",
    "publications",
    "people",
    "directions",
    "projects",
    "opportunities",
    "home",
    "join",
    "about",
    "accessibility",
    "privacy",
    "site",
  ];
  /** The order the saved site is read in (spec §2.2). */
  var BASE_ORDER = [
    "pages",
    "settings",
    "people",
    "directions",
    "projects",
    "publications",
    "news",
    "opportunities",
  ];
  var SEC = 1000;
  var OPTIONS = {
    overlayMs: 120,
    baseMaxAgeMs: 5 * 60 * SEC,
    baseAfterSaveMs: 2 * SEC,
    baseRetryMs: 15 * SEC,
    parseMs: 5 * SEC,
    checkMs: 4 * SEC,
    readyMs: 10 * SEC,
    freshEveryMs: 2 * 60 * SEC,
    freshMinGapMs: 30 * SEC,
    saveWatchMs: 60 * SEC,
    savedGraceMs: 1500,
    intentMaxAgeMs: 2 * 60 * SEC,
    reopenMs: 300,
    narrowPx: 560,
    desktopMinPx: 760,
    assetMaxBytes: 10 * 1024 * 1024,
    summaryRows: 10,
    perPage: 30,
  };
  var DEVICE_KEY = "bobalab.live.device";
  var VISITOR_KEY = "bobalab.live.visitor";
  var INTENT_KEY = "bobalab.live.intent";
  // The visibility switch: stored as `draft` (true = hidden), shown as
  // "Visible on the website: Yes / No" (cms-widgets.js, DECISIONS D-21).
  var VISIBLE = "“Visible on the website”";
  var RASTER_DEFAULT = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

  // ---------------------------------------------------------------------------
  // Pages of the site per entry (spec §2.5; page ids and paths: src/lib/preview/targets.ts)

  /** The first tab is the default. `own`: the entry's own page (people: only with a profile). */
  var PAGE_MAP = {
    news: [
      { page: "news-item", label: "Article", own: true },
      { page: "news", label: "News list" },
      { page: "home", label: "Home page" },
    ],
    publications: [
      { page: "publication", label: "Paper page", own: true },
      { page: "publications", label: "Publications list" },
      { page: "home", label: "Home page" },
      { page: "research", label: "Research page" },
    ],
    // "people" is the home page's People section (the list page moved there,
    // 2026-10-29): it draws that section alone, so the person shows highlighted
    // at the top of the column.
    people: [
      { page: "person", label: "Profile page", own: true },
      { page: "people", label: "People (home page)" },
    ],
    directions: [
      { page: "direction", label: "Direction page", own: true },
      { page: "home", label: "Home page" },
      { page: "research", label: "Research page" },
    ],
    projects: [
      { page: "project", label: "Project page", own: true },
      { page: "projects", label: "Projects list" },
      { page: "research", label: "Research page" },
    ],
    opportunities: [
      { page: "join", label: "Join page" },
      { page: "research", label: "Research page" },
    ],
    "pages/home": [
      { page: "home", label: "Home page" },
      { page: "about", label: "About page" },
    ],
    "pages/join": [{ page: "join", label: "Join page" }],
    "pages/about": [{ page: "about", label: "About page" }],
    "pages/accessibility": [{ page: "accessibility", label: "Accessibility page" }],
    "pages/privacy": [{ page: "privacy", label: "Privacy page" }],
    settings: [
      { page: "home", label: "Home page" },
      { page: "research", label: "Research page" },
      { page: "about", label: "About page" },
    ],
  };

  var SECTION = {
    research: "research",
    direction: "research",
    projects: "projects",
    project: "projects",
    publications: "publications",
    publication: "publications",
    people: "people",
    person: "people",
    news: "news",
    "news-item": "news",
    join: "join",
    about: "about",
    accessibility: "accessibility",
    privacy: "privacy",
  };
  var SLUG_PAGES = { direction: 1, project: 1, publication: 1, person: 1, "news-item": 1 };

  // ---------------------------------------------------------------------------
  // Consent and personal details (spec §4.3; Interfaces §7)

  /** Switches that a restore or a merge may turn off but never on. */
  var ONE_WAY_FIELDS = {
    people: ["listed", "profile_page", "photo_consent", "email_public", "now_at_public"],
    projects: [
      { list: "collaborators", key: "consent" },
      { list: "partners", key: "public" },
    ],
  };
  /** A person's details that come back only when asked for (History's tick box). */
  var PERSONAL_FIELDS = { people: ["email", "now_at", "photo", "photo_alt", "links.cv"] };
  /** The switch that hides each personal detail on the site (null: only Listed hides it). */
  var PERSONAL_SWITCH = {
    email: "email_public",
    now_at: "now_at_public",
    photo: "photo_consent",
    photo_alt: "photo_consent",
    "links.cv": null,
  };
  var PERSONAL_WORDS = {
    email: "Email",
    now_at: "Now at",
    photo: "Photo",
    photo_alt: "Photo alt text",
    "links.cv": "CV",
  };
  var SWITCH_WORDS = {
    listed: "Listed",
    profile_page: "Profile page",
    photo_consent: "Photo consent",
    email_public: "Email public",
    now_at_public: "Now at public",
  };

  // ---------------------------------------------------------------------------
  // The site check's problems in plain words (spec §3.6e; every error code of
  // src/lib/content/validate.ts, links.ts, copy-rules.ts and the schema check)

  var ISSUE_TEXT = {
    E_SCHEMA: "{schema}",
    E_PARSE: "the file can't be read; tell a maintainer",
    E_SITE_MISSING: "the site's settings file is missing; tell a maintainer",
    E_SLUG: "the page address “{slug}” doesn't fit the site's rules; tell a maintainer",
    E_NEWS_SLUG_DATE: "the date must stay {date}, the date in this item's page address",
    E_RELATION: "this points to {target}, which doesn't exist",
    E_HTTP_URL: "a web address must start with https://, not http://",
    E_ALT_MISSING: "the image needs alt text: describe in a sentence what it shows",
    E_DUP_DOI: "this DOI is already used by {other}",
    E_DUP_TITLE: "{other} already has this title; two publications can't share a title",
    E_AS_OF_MISSING: "“As of” is needed when the status is not Published",
    E_STATUS_SOURCE_MISSING: "“Status source” is needed when the status is not Published",
    E_YEAR_MISSING:
      "a publication with a public version (a DOI, PDF, SSRN, arXiv, publisher or presentation link) needs a year",
    E_DIRECTIONS_EMPTY: "choose at least one research direction",
    E_DIR_COUNT_ZERO:
      "once the site has launched, at least one research direction must be on it (visible on the website, not archived)",
    E_DIR_COUNT_MAX: "the site shows at most 8 research directions, and this would make {n}",
    E_DIR_ORDER_DUP: "“Direction order” lists the same direction twice",
    E_DIR_ORDER_UNKNOWN: "“Direction order” lists a direction that doesn't exist",
    E_COLOR_DUP: "another research direction already has this colour; each one needs its own",
    E_REDIRECT_DUP: "the same old address is redirected twice",
    E_REDIRECT_CONFLICT: "a redirect would replace {path}, a page on the live site",
    E_REDIRECT_MISSING:
      "{path} was on the live site but its entry is gone; a maintainer must add a redirect",
    E_LINK_HIDDEN: "{message}",
    E_HOME_QUESTION: "{message}",
    E_HOME_WHY_LONG: "{message}",
    E_HERO_LONG: "{message}",
    W_PUBLISHED_HIDDEN:
      "this page was on the live site; after this save, people who open its address get “Page not found”",
  };

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
  function ui() {
    return root.BobalabUi || null;
  }
  function saver() {
    return root.BobalabSave || null;
  }
  function layout() {
    return root.BobalabLayout || null;
  }
  function deployer() {
    return root.BobalabDeploy || null;
  }
  function editor() {
    return (root.CMS && root.CMS.editor) || null;
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
    return g && typeof g.mode === "function" ? safe(g.mode, "github") : "github";
  }

  function plain(v) {
    return v && typeof v.toJS === "function" ? v.toJS() : v;
  }

  function isObj(v) {
    return !!v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
  }

  /** A deep copy of plain data (dates become text, as in the files). */
  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  /**
   * The data as the site reads it (mirror of cms-history.js normalize): trimmed
   * text; empty text, lists and objects, null and false dropped; keys sorted.
   */
  function norm(v) {
    if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v.toISOString();
    if (typeof v === "string") {
      var s = v.trim();
      return s === "" ? undefined : s;
    }
    if (Array.isArray(v)) {
      var arr = [];
      v.forEach(function (x) {
        var n = norm(x);
        if (n !== undefined) arr.push(n);
      });
      return arr.length ? arr : undefined;
    }
    if (isObj(v)) {
      var o = {};
      Object.keys(v)
        .sort()
        .forEach(function (k) {
          var n = norm(v[k]);
          if (n !== undefined) o[k] = n;
        });
      return Object.keys(o).length ? o : undefined;
    }
    if (v === null || v === undefined || v === false) return undefined;
    if (typeof v === "number" && isNaN(v)) return undefined;
    return v;
  }

  function same(a, b) {
    return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
  }

  function isEmpty(v) {
    return norm(v) === undefined;
  }

  function storageGet(kind, key) {
    try {
      var s = root[kind];
      return s ? s.getItem(key) : null;
    } catch {
      return null;
    }
  }

  function storageSet(kind, key, value) {
    try {
      var s = root[kind];
      if (!s) return;
      if (value === null) s.removeItem(key);
      else s.setItem(key, value);
    } catch {
      // blocked or full storage: the choice is simply not remembered
    }
  }

  function announce(text, assertive) {
    var u = ui();
    if (u && typeof u.announce === "function")
      safe(function () {
        u.announce(text, assertive);
      });
  }

  function toast(opts) {
    var u = ui();
    return u && typeof u.toast === "function"
      ? safe(function () {
          return u.toast(opts);
        }, null)
      : null;
  }

  /** "Oct 24, 2026, 10:02 am" in the viewer's own time zone. */
  function fullTime(iso, zone) {
    var u = ui();
    if (u && typeof u.fullTime === "function")
      return safe(
        function () {
          return u.fullTime(iso, zone === false ? { zone: false } : undefined);
        },
        String(iso || ""),
      );
    return String(iso || "");
  }

  function shortDate(iso) {
    var u = ui();
    if (u && typeof u.shortDate === "function")
      return safe(
        function () {
          return u.shortDate(iso);
        },
        String(iso || "").slice(0, 10),
      );
    return String(iso || "").slice(0, 10);
  }

  function clockTime(iso) {
    var u = ui();
    if (u && typeof u.clock === "function")
      return safe(function () {
        return u.clock(iso);
      }, "");
    return "";
  }

  function timeAgo(iso) {
    var u = ui();
    if (u && typeof u.timeAgo === "function")
      return safe(function () {
        return u.timeAgo(iso);
      }, "");
    return shortDate(iso);
  }

  function upperFirst(s) {
    var t = String(s || "");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // ---------------------------------------------------------------------------
  // Site addresses (Interfaces §1)

  /** The home page's People section (src/lib/preview/targets.ts PEOPLE_PATH). */
  var PEOPLE_PATH = "/#people";

  function targetPath(t) {
    if (!t || t.page === "home") return "/";
    if (t.page === "people") return PEOPLE_PATH;
    var section = SECTION[t.page] || t.page;
    return SLUG_PAGES[t.page] ? "/" + section + "/" + (t.slug || "") + "/" : "/" + section + "/";
  }

  function sameTarget(a, b) {
    return !!a && !!b && a.page === b.page && (a.slug || "") === (b.slug || "");
  }

  /** The site's root address ("https://bobalabx.github.io/bobalab-web/"). */
  function siteRoot() {
    return safe(function () {
      return new URL("../", root.location.href).href;
    }, "/");
  }

  /** A page's published address, past the 10-minute page cache (a #section stays last). */
  function publishedUrl(path) {
    var p = String(path || "/").replace(/^\//, "");
    var hash = p.indexOf("#") === -1 ? "" : p.slice(p.indexOf("#"));
    return siteRoot() + p.slice(0, p.length - hash.length) + "?v=" + Date.now() + hash;
  }

  /** The preview page beside /admin/. */
  function previewSrc() {
    return new URL("../editor-preview/", root.location.href).href;
  }

  /** "bobalabx.github.io/bobalab-web/news/x/" for the address line. */
  function shownAddress(path) {
    return safe(
      function () {
        var u = new URL(siteRoot());
        return u.host + u.pathname.replace(/\/$/, "") + path;
      },
      String(path || ""),
    );
  }

  // ---------------------------------------------------------------------------
  // Collections (cms-data.js `collections`, else cms-history.js's same-shaped list)

  function collections() {
    var c = cfg().collections;
    if (Array.isArray(c) && c.length) return c;
    var h = hist();
    return (
      (h &&
        typeof h.collections === "function" &&
        safe(function () {
          return h.collections();
        }, null)) ||
      []
    );
  }

  function collectionInfo(name) {
    var list = collections();
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return null;
  }

  /** The repository path of an entry ("content/news/x.md"), or null. */
  function pathOf(collection, slug) {
    if (!collection || !slug) return null;
    var h = hist();
    var p =
      h && typeof h.pathOf === "function"
        ? safe(function () {
            return h.pathOf(collection, slug);
          }, null)
        : null;
    if (p) return p;
    var c = collectionInfo(collection);
    if (!c) return null;
    if (c.files) {
      for (var i = 0; i < c.files.length; i++) if (c.files[i].name === slug) return c.files[i].file;
      return null;
    }
    return String(c.folder || "").replace(/\/+$/, "") + "/" + slug + "." + (c.extension || "md");
  }

  /** {collection, slug} of a repository path, or null. */
  function entryOfPath(path) {
    var h = hist();
    var e =
      h && typeof h.entryOfPath === "function"
        ? safe(function () {
            return h.entryOfPath(path);
          }, null)
        : null;
    return e ? { collection: e.collection, slug: e.slug } : null;
  }

  /** The content file an issue names ("news/x.md") → {collection, slug}. */
  function entryOfFile(file) {
    var f = String(file || "").replace(/^content\//, "");
    if (f === "site.yml") return { collection: "settings", slug: "site" };
    var m = /^pages\/([^/]+)\.ya?ml$/.exec(f);
    if (m) return { collection: "pages", slug: m[1] };
    m = /^([a-z-]+)\/([^/]+)\.md$/.exec(f);
    return m ? { collection: m[1], slug: m[2] } : null;
  }

  function fileOfEntry(collection, slug) {
    if (collection === "settings") return "site.yml";
    if (collection === "pages") return "pages/" + slug + ".yml";
    return collection + "/" + slug + ".md";
  }

  /**
   * The words an entry is known by: a person's name (their `title` is the
   * position, "Assistant Professor of …"), else the title, a direction's
   * short label, or a name.
   */
  function titleOf(d, collection) {
    if (!isObj(d)) return "";
    var t = collection === "people" ? d.name || d.title : d.title || d.short_label || d.name;
    return String(t || "").trim();
  }

  /** The saved data of an entry in the loaded site, or null. */
  function baseData(collection, slug) {
    var list = BASE.data && BASE.data[collection];
    if (!Array.isArray(list)) return null;
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i].data;
    return null;
  }

  /** "News item “INFORMS talk”", "Home page", "Settings" for an entry. */
  function entryName(collection, slug, data) {
    var c = collectionInfo(collection);
    if (collection === "settings") return "Settings";
    if (c && c.files) {
      for (var i = 0; i < c.files.length; i++)
        if (c.files[i].name === slug) return c.files[i].label;
      return slug;
    }
    var label = (c && (c.labelSingular || c.label_singular || c.label)) || collection;
    var title = titleOf(data, collection);
    return label + " “" + (title || slug) + "”";
  }

  /**
   * An entry's name from its SAVED title, for the status dock and its banner
   * ("News item “Learning to gig”"), or "" while the saved site isn't loaded.
   */
  function savedEntryName(collection, slug) {
    var data = baseData(collection, slug);
    return data && titleOf(data, collection) ? entryName(collection, slug, data) : "";
  }

  /** The name of the entry a content file holds: the form's title for the edited one. */
  function nameOfFile(file) {
    var e = entryOfFile(file);
    if (!e) return String(file || "");
    var cur = V.id;
    var data =
      cur && cur.collection === e.collection && cur.slug === e.slug
        ? formData()
        : baseData(e.collection, e.slug);
    return entryName(e.collection, e.slug, data);
  }

  // ---------------------------------------------------------------------------
  // Page tabs and the "View page" target

  function hasProfile(d) {
    return !!d && (d.role === "pi" || d.profile_page === true);
  }

  function pageKey(collection, slug) {
    return collection === "pages" ? "pages/" + slug : collection;
  }

  /** The page tabs for an entry: [{id, page, label, own, target}]. */
  function tabsFor(collection, slug, data) {
    var list = PAGE_MAP[pageKey(collection, slug)] || [];
    var out = [];
    list.forEach(function (t) {
      if (collection === "people" && t.own && !hasProfile(data)) return;
      var target = { page: t.page };
      if (SLUG_PAGES[t.page]) target.slug = slug || "new-" + collection;
      out.push({ id: t.page, page: t.page, label: t.label, own: !!t.own, target: target });
    });
    return out;
  }

  /**
   * Where Save puts this entry on the live site (mirrors hasLivePage,
   * src/lib/content/links.ts): its own page ("live"), another page
   * ("elsewhere": the home page's People section, the Join page, the Home page)
   * or none ("hidden", because Visible on the website is No or Listed is off).
   */
  function viewTarget(collection, slug, data) {
    var d = isObj(data) ? data : {};
    if (d.draft === true) return { state: "hidden", reason: "draft" };
    if (collection === "people") {
      if (d.listed !== true) return { state: "hidden", reason: "unlisted" };
      if (!hasProfile(d)) return { state: "elsewhere", path: PEOPLE_PATH, label: "People section" };
      return { state: "live", path: "/people/" + slug + "/" };
    }
    if (collection === "opportunities")
      return { state: "elsewhere", path: "/join/", label: "Join page" };
    if (collection === "settings") return { state: "elsewhere", path: "/", label: "Home page" };
    if (collection === "pages")
      return { state: "live", path: slug === "home" ? "/" : "/" + slug + "/" };
    var own = (PAGE_MAP[collection] || [])[0];
    if (own && own.own && slug)
      return { state: "live", path: targetPath({ page: own.page, slug: slug }) };
    return { state: "live", path: "/" };
  }

  // ---------------------------------------------------------------------------
  // Problems in plain words

  function fieldDef(fields, name) {
    var list = Array.isArray(fields) ? fields : [];
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].name === name) return list[i];
    return null;
  }

  function humanize(name) {
    return upperFirst(String(name || "").replace(/_/g, " "));
  }

  function shortLabel(label) {
    return String(label || "").replace(/\s*\(.*\)\s*$/, "");
  }

  /** "Links › CV" for "links.cv"; list indexes are skipped ("authors.0.name" → "Authors › Name"). */
  function fieldLabel(path, fields) {
    var parts = String(path || "")
      .split(".")
      .filter(function (p) {
        return p !== "" && !/^\d+$/.test(p);
      });
    var out = [];
    var level = Array.isArray(fields) ? fields : [];
    parts.forEach(function (p) {
      var f = fieldDef(level, p);
      out.push(f ? shortLabel(f.label || f.name) : humanize(p));
      level = f ? f.fields || (f.field ? [f.field] : []) : [];
    });
    return out.join(" › ");
  }

  /** zod's words for a schema problem, in plain words. */
  function schemaWords(message) {
    var m = String(message || "");
    if (isMissing(m)) return "this needs a value";
    var big = /Too big: expected string to have <=\s*(\d+) characters/i.exec(m);
    if (big) return "this is too long (at most " + big[1] + " characters)";
    if (/Invalid (option|enum)/i.test(m)) return "this has a value the site doesn't accept";
    var fix = urlWords(m);
    if (fix) return fix;
    return "this isn't in the form the site expects (" + m + ")";
  }

  /** An empty required value (not a wrong one). */
  function isMissing(message) {
    var m = String(message || "");
    return (
      /received undefined|^Required$/i.test(m) ||
      /Too small: expected (string|array) to have >=\s*1\b/i.test(m)
    );
  }

  /** src/lib/content/schema.ts urlField / externalUrlField, in the form's words. */
  function urlWords(m) {
    if (/must be an https:\/\/ URL or a site path/i.test(m))
      return "use a full https:// address or a site path starting with /";
    if (/must be an https:\/\/ URL/i.test(m)) return "use a full https:// address";
    return "";
  }

  /**
   * A strict schema problem of the form as it is now, for the live bar: what to
   * fix for a value in the wrong form ("use a full https:// address"), or null
   * for a value that is still missing or not filled in yet ("Still needed
   * before Save").
   */
  function fixWords(message) {
    var m = String(message || "");
    if (isMissing(m)) return null;
    var big = /Too big: expected string to have <=\s*(\d+) characters/i.exec(m);
    if (big) return "use at most " + big[1] + " characters";
    if (/Invalid (option|enum)/i.test(m)) return "choose one of the listed options";
    return urlWords(m) || null;
  }

  function fillIssue(template, issue) {
    var msg = String(issue.message || "");
    var other = /([a-z-]+\/[^\s,;)]+\.md)/.exec(msg);
    var target = /→\s*([a-z-]+)\/([^\s]+)/.exec(msg);
    var path = /(\/[a-z0-9-]+\/[^\s,;)“”"]*)/.exec(msg);
    var n = /(\d+)/.exec(msg.replace(/max \d+\)/, ""));
    var slug = /slug "([^"]+)"/.exec(msg);
    var date = /(\d{4}-\d{2}-\d{2})/.exec(msg);
    return template.replace(/\{(\w+)\}/g, function (_, k) {
      switch (k) {
        case "schema":
          return schemaWords(msg);
        case "other":
          return other ? nameOfFile(other[1]) : "another entry";
        case "target":
          return target
            ? entryName(target[1], target[2].replace(/\.$/, ""), baseData(target[1], target[2]))
            : "an entry";
        case "path":
          return path ? path[1] : "a page";
        case "n":
          return n ? n[1] : "more";
        case "slug":
          return slug ? slug[1] : "";
        case "date":
          return date ? date[1] : "the same";
        default:
          return msg;
      }
    });
  }

  /**
   * One site-check problem in plain words: "News item “INFORMS talk” › Title:
   * This needs a value". Field names come from the form (the edited entry) or
   * are spelled out (other entries).
   */
  function formatIssue(issue) {
    var i = issue || {};
    var dup = duplicateOf(i);
    if (dup) {
      // Two publications with one title (or DOI): the validator puts the problem
      // on whichever file sorts later, and both carry the same title, so say it
      // from the edited entry's side, with the other one's title.
      var f = fieldLabel(i.field || dup.field, formFields());
      var t = titleOf(baseData(dup.other.collection, dup.other.slug), dup.other.collection);
      return (
        f +
        ": " +
        (dup.field === "doi"
          ? "Another publication" +
            (t ? " (“" + t + "”)" : "") +
            " already has this DOI. Check the DOI"
          : "Another publication already has this exact title" +
            (t ? " (“" + t + "”)" : "") +
            ". Change one of them")
      );
    }
    var template = ISSUE_TEXT[i.code] || "{message}";
    var text = upperFirst(fillIssue(template, i));
    var where = i.file ? nameOfFile(i.file) : "";
    var e = entryOfFile(i.file);
    var field = i.field ? fieldLabel(i.field, isEdited(e) ? formFields() : []) : "";
    var head = [where, field].filter(Boolean).join(" › ");
    return head ? head + ": " + text : text;
  }

  function isEdited(e) {
    return !!(e && V.id && e.collection === V.id.collection && e.slug === V.id.slug);
  }

  /**
   * A duplicate title or DOI between the edited publication and another one:
   * {field, other: {collection, slug, file}}, or null.
   */
  function duplicateOf(i) {
    if (i.code !== "E_DUP_TITLE" && i.code !== "E_DUP_DOI") return null;
    var named = /([a-z-]+\/[^\s,;)]+\.md)/.exec(String(i.message || ""));
    var a = entryOfFile(i.file);
    var b = named ? entryOfFile(named[1]) : null;
    var other = isEdited(a) ? b : isEdited(b) ? a : null;
    if (!other) return null;
    other.file = isEdited(a) ? named[1] : i.file;
    return { field: i.code === "E_DUP_DOI" ? "doi" : "title", other: other };
  }

  /**
   * The other entry a site-check problem is about, for its [Open …] button:
   * {collection, slug, name}, or null when the problem is the edited entry's own.
   */
  function issueEntry(issue) {
    var i = issue || {};
    var dup = duplicateOf(i);
    if (dup)
      return {
        collection: dup.other.collection,
        slug: dup.other.slug,
        name: "the other publication",
      };
    var e = entryOfFile(i.file);
    if (!e || isEdited(e)) return null;
    return { collection: e.collection, slug: e.slug, name: nameOfFile(i.file) };
  }

  // ---------------------------------------------------------------------------
  // Device scaling (spec §2.6)

  /**
   * How the site frame fits a clip box of W × H: Desktop renders at a width of
   * 1024 to 1440 px scaled to fit; Phone at 390 px, at most at scale 1, centred.
   * Null when the box has no size yet (W or H is 0): then nothing changes.
   */
  function deviceBox(W, H, device) {
    if (!(W > 0) || !(H > 0)) return null;
    if (device === "phone") {
      var s = Math.min(1, W / 390);
      return { device: "phone", width: 390, height: H / s, scale: s, left: (W - 390 * s) / 2 };
    }
    var v = Math.min(1440, Math.max(1024, W));
    var sd = W / v;
    return { device: "desktop", width: v, height: H / sd, scale: sd, left: 0 };
  }

  function effectiveDevice(chosen, W) {
    if (chosen === "desktop" || chosen === "phone") return chosen;
    return W > 0 && W < OPTIONS.desktopMinPx ? "phone" : "desktop";
  }

  // ---------------------------------------------------------------------------
  // Unsaved uploads (spec §2.8)

  function trimSlash(s) {
    return String(s || "").replace(/\/+$/, "");
  }

  /** "public/uploads/x.jpg" → "/uploads/x.jpg" (the address the form's fields hold). */
  function publicPathOf(p) {
    var media = cfg().media || {};
    var folder = trimSlash(media.folder || "public/uploads").replace(/^\/+/, "");
    var pub = trimSlash(media.publicFolder || "/uploads");
    var path = String(p || "").replace(/^\/+/, "");
    if (path.indexOf(folder + "/") === 0) return pub + path.slice(folder.length);
    return "/" + path;
  }

  function extOf(name) {
    var m = /(\.[A-Za-z0-9]+)$/.exec(String(name || ""));
    return m ? m[1].toLowerCase() : "";
  }

  /** The draft uploads to show: raster images of at most 10 MB, with their file. */
  function assetCandidates(mediaFiles) {
    var media = cfg().media || {};
    var raster = (media.rasterExtensions || RASTER_DEFAULT).map(function (x) {
      return String(x).toLowerCase();
    });
    var list = plain(mediaFiles);
    if (!Array.isArray(list)) return [];
    var out = [];
    list.forEach(function (item) {
      var m = plain(item);
      if (!m || m.draft !== true || !m.file) return;
      var name = m.path || m.name || (m.file && m.file.name) || "";
      if (raster.indexOf(extOf(name)) === -1) return;
      var size = m.file && typeof m.file.size === "number" ? m.file.size : m.size;
      if (!(size >= 0) || size > OPTIONS.assetMaxBytes) return;
      out.push({ id: String(m.id || name), key: publicPathOf(m.path || m.name), file: m.file });
    });
    return out;
  }

  var ASSETS = {}; // media file id → {key, url} or {key, pending: true}

  function readDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var Reader = root.FileReader;
      if (typeof Reader !== "function") return reject(new Error("no FileReader"));
      var r = new Reader();
      r.onload = function () {
        resolve(String(r.result || ""));
      };
      r.onerror = function () {
        reject(r.error || new Error("unreadable"));
      };
      r.readAsDataURL(file);
    });
  }

  /** The map "/uploads/x.jpg" → data URL for these candidates (only those read so far). */
  function assetsMap(cands) {
    var map = {};
    cands.forEach(function (c) {
      var a = ASSETS[c.id];
      if (a && a.url && /^data:image\//.test(a.url)) map[c.key] = a.url;
    });
    return map;
  }

  /** Read every new candidate; calls done() when one finishes. */
  function readAssets(cands, done) {
    cands.forEach(function (c) {
      if (ASSETS[c.id]) return;
      ASSETS[c.id] = { key: c.key, pending: true };
      readDataUrl(c.file).then(
        function (url) {
          ASSETS[c.id] = { key: c.key, url: url };
          done();
        },
        function () {
          ASSETS[c.id] = { key: c.key, url: null };
        },
      );
    });
  }

  // ---------------------------------------------------------------------------
  // The entry being edited

  function editorInfo() {
    var ed = editor();
    var e = ed && typeof ed.getCurrentEntry === "function" ? safe(ed.getCurrentEntry, null) : null;
    return e && e.collection ? e : null;
  }

  /** The address Decap will give a new entry, or null while it can't be told or breaks the rule. */
  function predictSlug(collection, dataImm) {
    var h = hooks();
    var rule = ((cfg().rules || {}).slugs || {})[collection];
    if (!h || typeof h.expectedSlug !== "function" || !rule) return null;
    var slug = safe(function () {
      return h.expectedSlug(rule.template, dataImm, rule.identifier, new Date()) || null;
    }, null);
    if (!slug) return null;
    var ok = safe(function () {
      return new RegExp(rule.pattern).test(slug) && (!rule.max || slug.length <= rule.max);
    }, true);
    return ok ? slug : null;
  }

  /** Has the field a new entry's address is made from been filled in? */
  function identifierFilled(collection, dataImm) {
    var rule = ((cfg().rules || {}).slugs || {})[collection];
    if (!rule || !dataImm || typeof dataImm.get !== "function") return false;
    var v = safe(function () {
      return dataImm.get(rule.identifier);
    }, null);
    return typeof v === "string" ? v.trim() !== "" : v !== null && v !== undefined;
  }

  /**
   * Who the entry is: {collection, slug, isNew, predicted, key}. A new entry's
   * slug is the address Decap will give it (cms-hooks expectedSlug, with the
   * form's Immutable data), else "new-<collection>" for rendering only.
   */
  function identityOf(entry) {
    if (!entry || typeof entry.get !== "function") return null;
    var collection = entry.get("collection");
    var isNew = !!entry.get("newRecord");
    var predicted = isNew ? predictSlug(collection, entry.get("data")) : null;
    var slug = isNew ? predicted || "new-" + collection : entry.get("slug") || "";
    return {
      collection: collection,
      slug: slug,
      isNew: isNew,
      predicted: predicted,
      key: collection + "/" + (isNew ? "(new)" : slug),
    };
  }

  /** The overlay message for an entry: the form's draft as it is now. */
  function overlayMessage(entry, rev) {
    var id = identityOf(entry);
    if (!id) return null;
    var data = plain(entry.get("data"));
    return {
      type: "bobalab:overlay",
      v: V1,
      rev: rev,
      entry: { collection: id.collection, slug: id.slug },
      isNew: id.isNew,
      data: isObj(data) ? data : {},
    };
  }

  var formMemo = { entry: null, data: null };

  /** The form's data as plain JS (converted once per entry object: renders ask often). */
  function formData() {
    if (V.entry && typeof V.entry.get === "function") {
      if (formMemo.entry === V.entry) return formMemo.data;
      var d = plain(V.entry.get("data"));
      if (isObj(d)) {
        formMemo = { entry: V.entry, data: d };
        return d;
      }
    }
    var e = editorInfo();
    return (e && e.data) || {};
  }

  function formFields() {
    var e = V.info || editorInfo();
    return (e && e.fields) || [];
  }

  function hasChanged() {
    var e = V.info || editorInfo();
    return !!(e && e.hasChanged);
  }

  // ---------------------------------------------------------------------------
  // Restore: the patch (spec §4.3; pure, unit-tested)

  function widgetOf(f) {
    return (f && f.widget) || "string";
  }

  /** The empty value of a field the old version lacks (accepted by applyFieldPatch). */
  function emptyFor(f) {
    var w = widgetOf(f);
    if (w === "list") return [];
    if ((w === "relation" || w === "select") && f.multiple) return [];
    if (w === "object") return {};
    // "visible" shows the boolean `draft` the other way round (cms-widgets.js).
    if (w === "boolean" || w === "visible") return f.default !== undefined ? !!f.default : false;
    return "";
  }

  /** The editor's word for a select value ("Under revision"), or the value itself. */
  function optionLabel(f, value) {
    var opts = (f && Array.isArray(f.options) ? f.options : []).filter(function (o) {
      return isObj(o) ? o.value === value : o === value;
    });
    return opts.length && isObj(opts[0]) && opts[0].label ? String(opts[0].label) : String(value);
  }

  function inferCollection(fields) {
    if (fieldDef(fields, "photo_consent") || fieldDef(fields, "listed")) return "people";
    if (fieldDef(fields, "collaborators") || fieldDef(fields, "partners")) return "projects";
    return null;
  }

  function nameOf(item) {
    return isObj(item) ? String(item.name || "").trim() : "";
  }

  /**
   * In `value` (a list), items whose switch is off in `ref` stay off. An item
   * missing from `ref` counts as off when `missingIsOff` (Restore: it is not
   * shown now); a merge keeps the editor's own new items as they are.
   */
  function keepListOff(value, ref, key, missingIsOff) {
    var turnedOff = [];
    if (!Array.isArray(value)) return { value: value, off: turnedOff };
    var refList = Array.isArray(ref) ? ref : [];
    var out = value.map(function (item) {
      if (!isObj(item) || item[key] !== true) return item;
      var n = nameOf(item);
      var match = null;
      for (var i = 0; i < refList.length; i++) if (nameOf(refList[i]) === n) match = refList[i];
      if (match ? match[key] === true : !missingIsOff) return item;
      var copy = clone(item);
      copy[key] = false;
      turnedOff.push(n || "an item");
      return copy;
    });
    return { value: out, off: turnedOff };
  }

  function uploadPrefix() {
    return trimSlash((cfg().media || {}).publicFolder || "/uploads") + "/";
  }

  function isUploadPath(s) {
    return typeof s === "string" && s.indexOf(uploadPrefix()) === 0 && !/\s/.test(s);
  }

  /** Every upload address in a value. */
  function uploadsIn(v, out) {
    out = out || [];
    if (isUploadPath(v)) out.push(v);
    else if (Array.isArray(v))
      v.forEach(function (x) {
        uploadsIn(x, out);
      });
    else if (isObj(v))
      Object.keys(v).forEach(function (k) {
        uploadsIn(v[k], out);
      });
    return out;
  }

  /** The value with every upload address missing from `has` replaced by "". */
  function dropMissing(v, has, missing) {
    if (isUploadPath(v)) {
      if (has(v)) return v;
      missing.push(v);
      return "";
    }
    if (Array.isArray(v))
      return v.map(function (x) {
        return dropMissing(x, has, missing);
      });
    if (isObj(v)) {
      var o = {};
      Object.keys(v).forEach(function (k) {
        o[k] = dropMissing(v[k], has, missing);
      });
      return o;
    }
    return v;
  }

  function getPath(obj, dotted) {
    return String(dotted)
      .split(".")
      .reduce(function (cur, k) {
        return isObj(cur) ? cur[k] : undefined;
      }, obj);
  }

  /**
   * What Restore puts into the form (spec §4.3 step 4–5), pure:
   * _buildRestorePatch(current, old, fields, {unhide, personal, collection?,
   * uploads?, source?}) → {patches: [{path, value}], notes, result, held}.
   *  - Only top-level fields whose old value differs from the current one are
   *    patched; a field the old version lacks gets its empty value; hidden
   *    fields are never touched.
   *  - ONE_WAY_FIELDS may go from on to off, never from off to on (projects:
   *    a collaborator's consent and a partner's "Public", matched by name).
   *  - PERSONAL_FIELDS that are empty now stay empty unless `personal` is set.
   *  - Without photo consent, the photo and its alt text are cleared.
   *  - A retired value (cms-data.js `legacy`: a publication status from before
   *    2026-10-29) comes back as the value it means now.
   *  - A hidden entry ("Visible on the website: No", stored as draft: true)
   *    stays hidden unless `unhide` is set.
   *  - Upload addresses missing from `uploads` (a Set of "/uploads/…") are cleared.
   */
  function buildRestorePatch(current, old, fields, opts) {
    opts = opts || {};
    var cur = isObj(current) ? current : {};
    var prev = isObj(old) ? old : {};
    var list = (Array.isArray(fields) ? fields : []).filter(function (f) {
      return f && f.name && widgetOf(f) !== "hidden";
    });
    var collection = opts.collection || inferCollection(list);
    var undo = opts.source === "undo";
    var notes = [];
    var held = { draft: false, personal: [], oneWay: [] };
    var result = clone(cur) || {};

    // Start from the old version: every field it has, or the field's empty value.
    list.forEach(function (f) {
      var has = Object.prototype.hasOwnProperty.call(prev, f.name) && prev[f.name] !== undefined;
      if (has) result[f.name] = clone(prev[f.name]);
      else if (cur[f.name] !== undefined) result[f.name] = emptyFor(f);
    });

    // A value the site no longer has (a publication status saved before
    // 2026-10-29) comes back as the value it means now (cms-data.js `legacy`).
    var legacy = (cfg().legacy || {})[collection] || {};
    Object.keys(legacy).forEach(function (name) {
      var f = fieldDef(list, name);
      var map = legacy[name] || {};
      var v = result[name];
      if (!f || typeof v !== "string" || !Object.prototype.hasOwnProperty.call(map, v)) return;
      result[name] = map[v];
      notes.push(
        "“" +
          shortLabel(f.label || name) +
          "”: that version says “" +
          v +
          "”, which the site no longer uses, so it comes back as “" +
          optionLabel(f, map[v]) +
          "”.",
      );
    });

    // Consent and visibility: on → off only.
    if (collection === "people") {
      ONE_WAY_FIELDS.people.forEach(function (name) {
        var f = fieldDef(list, name);
        if (!f) return;
        if (cur[name] !== true && result[name] === true) {
          result[name] = cur[name] === undefined ? emptyFor(f) : cur[name];
          held.oneWay.push(name);
          notes.push(
            "“" +
              (SWITCH_WORDS[name] || shortLabel(f.label)) +
              "” stays off: a restore never turns a consent or visibility switch back on. Turn it on in the form if the person has agreed.",
          );
        }
      });
    }
    if (collection === "projects") {
      ONE_WAY_FIELDS.projects.forEach(function (rule) {
        var f = fieldDef(list, rule.list);
        if (!f || !Array.isArray(result[rule.list])) return;
        var r = keepListOff(result[rule.list], cur[rule.list], rule.key, true);
        result[rule.list] = r.value;
        r.off.forEach(function (n) {
          held.oneWay.push(rule.list + "." + n);
          notes.push(
            "“" +
              n +
              "” (" +
              shortLabel(f.label || rule.list) +
              ") stays hidden: a restore never turns “" +
              (rule.key === "consent" ? "Consent to be shown" : "Public") +
              "” back on.",
          );
        });
      });
    }

    // Removed personal details stay removed unless asked for.
    if (collection === "people" && !opts.personal) {
      var words = [];
      PERSONAL_FIELDS.people.forEach(function (dotted) {
        var now = getPath(cur, dotted);
        var back = getPath(result, dotted);
        if (!isEmpty(now) || isEmpty(back)) return;
        var top = dotted.split(".")[0];
        if (dotted.indexOf(".") === -1) {
          var f = fieldDef(list, top);
          result[top] = Object.prototype.hasOwnProperty.call(cur, top)
            ? clone(cur[top])
            : emptyFor(f);
        } else {
          var sub = dotted.split(".")[1];
          var obj = isObj(result[top]) ? clone(result[top]) : {};
          if (isObj(cur[top]) && Object.prototype.hasOwnProperty.call(cur[top], sub))
            obj[sub] = clone(cur[top][sub]);
          else delete obj[sub];
          result[top] = obj;
        }
        held.personal.push(dotted);
        // The alt text goes with its photo: one word for both.
        if (!(dotted === "photo_alt" && held.personal.indexOf("photo") !== -1))
          words.push(PERSONAL_WORDS[dotted]);
      });
      if (words.length) {
        var list2 =
          words.length === 1
            ? words[0]
            : words.slice(0, -1).join(", ") + " and " + words[words.length - 1];
        notes.push(
          list2 +
            (words.length === 1 ? " was" : " were") +
            " not brought back. " +
            (undo
              ? "To bring back removed personal details, use History."
              : "Removed personal details come back only with “Also bring back removed personal details” ticked."),
        );
      }
    }

    // A hidden entry (Visible on the website: No) stays hidden unless asked otherwise.
    if (cur.draft === true && result.draft !== true && fieldDef(list, "draft") && !opts.unhide) {
      result.draft = true;
      held.draft = true;
      notes.push(
        "It stays hidden: " +
          VISIBLE +
          " stays No." +
          (undo
            ? " Set it to Yes in the form and Save to show it."
            : " Tick “Also make it visible on the live site” to show it."),
      );
    }

    // Uploads that are no longer on the site.
    if (opts.uploads) {
      var set = opts.uploads;
      var has = function (p) {
        return typeof set.has === "function" ? set.has(p) : set.indexOf(p) !== -1;
      };
      list.forEach(function (f) {
        if (same(result[f.name], cur[f.name])) return;
        var missing = [];
        result[f.name] = dropMissing(result[f.name], has, missing);
        missing.forEach(function (p) {
          notes.push(
            "“" +
              shortLabel(f.label || f.name) +
              "” left empty: " +
              p +
              " is no longer on the site.",
          );
        });
      });
    }

    // No photo without photo consent.
    if (collection === "people" && fieldDef(list, "photo") && result.photo_consent !== true) {
      var hadPhoto = !isEmpty(result.photo);
      if (hadPhoto) result.photo = "";
      if (!isEmpty(result.photo_alt) && fieldDef(list, "photo_alt")) result.photo_alt = "";
      if (hadPhoto) notes.push("Photo not shown: Photo consent is off now.");
    }

    // Uploads the restore stops using stay on the site.
    var before = uploadsIn(cur);
    var after = uploadsIn(result);
    before.forEach(function (p) {
      if (after.indexOf(p) === -1)
        notes.push("The file stays at " + p + " until a maintainer deletes it.");
    });

    var patches = [];
    list.forEach(function (f) {
      if (same(result[f.name], cur[f.name])) return;
      var value = result[f.name];
      patches.push({ path: f.name, value: value === undefined ? emptyFor(f) : value });
    });
    return { patches: patches, notes: notes, result: result, held: held };
  }

  /** The form's data with the patches applied (what the preview shows for an older version). */
  function applyPatches(current, patches) {
    var out = clone(isObj(current) ? current : {}) || {};
    (patches || []).forEach(function (p) {
      out[p.path] = clone(p.value);
    });
    return out;
  }

  // ---------------------------------------------------------------------------
  // "Bring in their changes": the three-way merge (spec §3.7; pure, unit-tested)

  /**
   * _merge3(base, mine, theirs, fields, {collection?}) → {patches, applied,
   * conflicts: [{name, label, mine}], held, result}. Per top-level field
   * (hidden ones skipped):
   *   mine = theirs → nothing; mine = base → theirs; theirs = base → mine;
   *   otherwise a conflict: theirs, and mine is kept for the editor to copy.
   * An unknown base (null) makes every difference a conflict. A consent or
   * visibility switch that is off in theirs stays off, whatever the base.
   */
  function merge3(base, mine, theirs, fields, opts) {
    opts = opts || {};
    var m0 = isObj(mine) ? mine : {};
    var t0 = isObj(theirs) ? theirs : {};
    var b0 = isObj(base) ? base : null;
    var list = (Array.isArray(fields) ? fields : []).filter(function (f) {
      return f && f.name && widgetOf(f) !== "hidden";
    });
    var collection = opts.collection || inferCollection(list);
    var patches = [];
    var applied = [];
    var conflicts = [];
    var held = [];
    var result = clone(m0) || {};
    list.forEach(function (f) {
      var name = f.name;
      var m = m0[name];
      var t = t0[name];
      var value = m;
      var conflict = false;
      if (same(m, t)) value = m;
      else if (b0 && same(m, b0[name])) value = t;
      else if (b0 && same(t, b0[name])) value = m;
      else {
        value = t;
        conflict = true;
      }
      if (collection === "people" && ONE_WAY_FIELDS.people.indexOf(name) !== -1) {
        if (t !== true && value === true) {
          value = t === undefined ? emptyFor(f) : t;
          if (!conflict)
            held.push({ name: name, label: SWITCH_WORDS[name] || shortLabel(f.label) });
        }
      }
      if (collection === "projects") {
        ONE_WAY_FIELDS.projects.forEach(function (rule) {
          if (rule.list !== name || !Array.isArray(value)) return;
          var r = keepListOff(value, t, rule.key, false);
          if (r.off.length && !conflict)
            held.push({ name: name, label: shortLabel(f.label || name), items: r.off });
          value = r.value;
        });
      }
      if (conflict)
        conflicts.push({ name: name, label: shortLabel(f.label || name), mine: clone(m) });
      if (!same(value, m)) {
        patches.push({ path: name, value: value === undefined ? emptyFor(f) : clone(value) });
        applied.push(name);
        result[name] = clone(value);
      }
    });
    return {
      patches: patches,
      applied: applied,
      conflicts: conflicts,
      held: held,
      result: result,
    };
  }

  // ---------------------------------------------------------------------------
  // The saved site (spec §2.2): read once per tab, refreshed in the background

  var BASE = {
    data: null, // {pages: [{slug, data}], …}
    complete: false,
    publishedSlugs: null,
    at: 0,
    gen: 0, // bumped for every finished load
    stale: false,
    loading: null,
    done: 0,
    total: BASE_ORDER.length,
    retried: false,
    timer: null,
  };
  var loader = null; // Decap's getCollection, from the newest preview props

  function rememberLoader(fn) {
    if (typeof fn === "function") loader = fn;
  }

  function toEntries(res) {
    var list = plain(res);
    if (!Array.isArray(list)) return [];
    var out = [];
    list.forEach(function (x) {
      var o = plain(x) || {};
      var data = plain(o.data);
      if (o.slug && isObj(data)) out.push({ slug: String(o.slug), data: data });
    });
    return out;
  }

  function folderCheck(c, n) {
    var h = hist();
    if (!h || typeof h.treeCount !== "function") return Promise.resolve(false);
    return h
      .treeCount(c.folder, "." + String(c.extension || "md").replace(/^\./, ""))
      .then(function (count) {
        return count === n;
      });
  }

  /** Every configured file that is on main was loaded (one tree read per folder). */
  function filesCheck(c, loaded) {
    var g = gh();
    if (!g || typeof g.get !== "function") return Promise.resolve(false);
    var dirs = {};
    (c.files || []).forEach(function (f) {
      var i = String(f.file).lastIndexOf("/");
      var dir = String(f.file).slice(0, i);
      (dirs[dir] = dirs[dir] || []).push({ name: f.name, base: String(f.file).slice(i + 1) });
    });
    return Promise.all(
      Object.keys(dirs).map(function (dir) {
        var url =
          "/repos/" +
          g.repo() +
          "/git/trees/" +
          encodeURIComponent(g.branch()) +
          ":" +
          (typeof g.encodePath === "function" ? g.encodePath(dir) : dir);
        return g.get(url).then(function (r) {
          var names = {};
          ((r.data && r.data.tree) || []).forEach(function (it) {
            if (it.type === "blob") names[it.path] = true;
          });
          return dirs[dir].every(function (f) {
            return !names[f.base] || loaded.indexOf(f.name) !== -1;
          });
        });
      }),
    ).then(function (oks) {
      return oks.every(Boolean);
    });
  }

  /** Is every collection complete? Local demo: every load worked. GitHub: counts match main. */
  function completeness(results, ok) {
    var all = BASE_ORDER.every(function (n) {
      return ok[n];
    });
    if (!all) return Promise.resolve(false);
    if (mode() === "local") return Promise.resolve(true);
    var checks = BASE_ORDER.map(function (name) {
      var c = collectionInfo(name);
      if (!c) return Promise.resolve(false);
      var loaded = results[name] || [];
      if (c.files)
        return filesCheck(
          c,
          loaded.map(function (e) {
            return e.slug;
          }),
        );
      return folderCheck(c, loaded.length);
    });
    return Promise.all(checks).then(
      function (oks) {
        return oks.every(Boolean);
      },
      function () {
        return false;
      },
    );
  }

  function publishedSlugs() {
    var h = hist();
    if (mode() === "local" || !h || typeof h.fileAtMain !== "function")
      return Promise.resolve(null);
    return h.fileAtMain("content/.published-slugs.json").then(
      function (text) {
        if (text === null || text === undefined) return null;
        var v = safe(function () {
          return JSON.parse(text);
        }, null);
        return isObj(v) ? v : null;
      },
      function () {
        return null;
      },
    );
  }

  /** Load all 8 collections, two at a time, posting progress; resolves when done. */
  function loadBase() {
    if (BASE.loading) return BASE.loading;
    if (!loader) return Promise.resolve(false);
    var get = loader;
    var queue = BASE_ORDER.slice();
    var results = {};
    var ok = {};
    var done = 0;
    BASE.done = 0;
    function worker() {
      var name = queue.shift();
      if (!name) return Promise.resolve();
      return Promise.resolve()
        .then(function () {
          return get(name);
        })
        .then(
          function (res) {
            results[name] = toEntries(res);
            ok[name] = true;
          },
          function () {
            results[name] = [];
            ok[name] = false;
          },
        )
        .then(function () {
          done += 1;
          BASE.done = done;
          if (!BASE.data) postLoading();
          return worker();
        });
    }
    BASE.loading = Promise.all([worker(), worker()])
      .then(function () {
        return Promise.all([completeness(results, ok), publishedSlugs()]);
      })
      .then(function (r) {
        var data = {};
        BASE_ORDER.forEach(function (n) {
          data[n] = results[n] || [];
        });
        BASE.data = data;
        BASE.complete = !!r[0];
        BASE.publishedSlugs = r[1];
        BASE.at = Date.now();
        BASE.gen += 1;
        BASE.stale = false;
        BASE.loading = null;
        baseLoaded();
        return true;
      })
      .then(null, function () {
        BASE.loading = null;
        return false;
      });
    return BASE.loading;
  }

  /** Load the saved site when it is missing, stale (after a Save) or older than 5 minutes. */
  function ensureBase() {
    if (BASE.loading) return BASE.loading;
    if (!BASE.data || BASE.stale || Date.now() - BASE.at > OPTIONS.baseMaxAgeMs) return loadBase();
    return Promise.resolve(true);
  }

  function baseLoaded() {
    if (!BASE.complete && !BASE.retried && V.comp) {
      // GitHub's view of main can lag right after a save: try once more.
      BASE.retried = true;
      if (BASE.timer) root.clearTimeout(BASE.timer);
      BASE.timer = root.setTimeout(function () {
        BASE.timer = null;
        if (V.comp) loadBase();
      }, OPTIONS.baseRetryMs);
    } else if (BASE.complete) BASE.retried = false;
    postBase();
    bump();
  }

  var savedHooked = false;
  function hookSaves() {
    var s = saver();
    if (savedHooked || !s || typeof s.onSaved !== "function") return;
    savedHooked = true;
    s.onSaved(function (ev) {
      BASE.stale = true;
      if (ev && ev.path && HIST[ev.path]) HIST[ev.path].stale = true;
      if (V.latest && ev && V.latest.path === ev.path) {
        // "Last saved by you · just now" until GitHub is read again.
        var g = gh();
        var u = g && typeof g.user === "function" ? safe(g.user, null) : null;
        V.latest = {
          path: ev.path,
          version: {
            date: new Date().toISOString(),
            author: { login: (u && u.login) || ev.login || null, name: (u && u.name) || "you" },
          },
        };
      }
      if (BASE.timer) root.clearTimeout(BASE.timer);
      BASE.timer = root.setTimeout(function () {
        BASE.timer = null;
        if (V.comp) loadBase();
      }, OPTIONS.baseAfterSaveMs);
      if (V.comp) {
        V.bands.restoreBlocked = null;
        if (
          V.tab === "history" &&
          ev &&
          ev.path &&
          V.id &&
          pathOf(V.id.collection, V.id.slug) === ev.path
        )
          root.setTimeout(function () {
            loadHistory(ev.path, false);
          }, 3 * SEC);
        bump();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // The bridge to the preview frame (one live column at a time)

  var V = {
    comp: null, // the mounted LiveColumn
    win: null, // Decap's preview frame window
    doc: null,
    clip: null,
    frame: null, // iframe.bl-live__site
    ready: false,
    baseSent: 0,
    rev: 0,
    timer: null,
    dirty: false,
    entry: null, // the newest Immutable entry
    id: null,
    info: null, // CMS.editor.getCurrentEntry(), from onEditorChange
    tab: "live",
    pageId: null,
    other: null, // {target, path} after a link click in the preview
    target: null, // the page last posted
    device: null, // the editor's explicit choice
    width: 0,
    height: 0,
    visitor: false,
    rendered: null,
    latest: null, // {path, version} for "Last saved by …"
    older: null, // the older version shown in the preview
    expanded: null, // History: the sha whose row is open
    bands: { conflict: null, merge: null, restoreBlocked: null, notes: null },
    assetsKey: "{}",
    assets: {},
    offs: [],
    waiters: [],
    handledKey: null, // the entry the per-entry state belongs to
    freshAt: 0,
    focusTop: false,
    lastRestore: null,
  };
  var PENDING = {}; // service id → {msg, resolve, timer}
  var seq = 0;

  function post(msg) {
    var f = V.frame;
    var w = f && f.contentWindow;
    if (!w || !msg) return false;
    try {
      w.postMessage(msg, root.location.origin);
      return true;
    } catch {
      return false;
    }
  }

  function postLoading() {
    if (V.ready) post({ type: "bobalab:loading", v: V1, done: BASE.done, total: BASE.total });
  }

  function postBase() {
    if (!V.ready || !BASE.data) return;
    post({
      type: "bobalab:base",
      v: V1,
      base: BASE.data,
      complete: BASE.complete,
      publishedSlugs: BASE.publishedSlugs,
    });
    V.baseSent = BASE.gen;
    wake();
  }

  /** The data the preview shows: the older version being looked at, else the form. */
  function overlayNow() {
    if (!V.entry) return null;
    var msg = overlayMessage(V.entry, ++V.rev);
    if (msg && V.older) msg.data = clone(V.older.data);
    return msg;
  }

  function flushOverlay() {
    V.dirty = false;
    if (!V.ready) return;
    var msg = overlayNow();
    if (msg) post(msg);
    postNavigate();
  }

  /** The first change goes out at once; then at most one post every 120 ms. */
  function scheduleOverlay() {
    V.dirty = true;
    if (V.timer !== null) return;
    flushOverlay();
    V.timer = root.setTimeout(tick, OPTIONS.overlayMs);
  }

  function tick() {
    V.timer = null;
    if (!V.dirty) return;
    flushOverlay();
    V.timer = root.setTimeout(tick, OPTIONS.overlayMs);
  }

  function postNavigate() {
    var t = currentTarget();
    if (!t || !V.ready) return;
    if (sameTarget(t, V.target)) return;
    V.target = t;
    post({ type: "bobalab:navigate", v: V1, target: t });
  }

  function postAssets() {
    if (V.ready) post({ type: "bobalab:assets", v: V1, assets: V.assets });
  }

  function syncAssets() {
    if (!V.entry) return;
    var cands = assetCandidates(V.entry.get("mediaFiles"));
    readAssets(cands, syncAssets);
    var map = assetsMap(cands);
    var key = JSON.stringify(map);
    if (key === V.assetsKey) return;
    V.assetsKey = key;
    V.assets = map;
    postAssets();
  }

  /** On every `ready` (a load, a reload, a hot update): everything again, in order. */
  function handshake() {
    post({ type: "bobalab:mode", v: V1, visitor: V.visitor });
    if (BASE.data) postBase();
    else post({ type: "bobalab:loading", v: V1, done: BASE.done, total: BASE.total });
    postAssets();
    var msg = overlayNow();
    if (msg) post(msg);
    V.dirty = false;
    V.target = null;
    postNavigate();
    frameTitle();
    Object.keys(PENDING).forEach(function (id) {
      post(PENDING[id].msg);
    });
    wake();
  }

  function isReady() {
    return V.ready && V.baseSent > 0;
  }

  function wake() {
    var w = V.waiters;
    V.waiters = [];
    w.forEach(function (x) {
      if (x.ready()) x.resolve(true);
      else V.waiters.push(x);
    });
  }

  function waitFor(test, ms) {
    return new Promise(function (resolve) {
      if (test()) return resolve(true);
      var x = { ready: test, resolve: null };
      var t = root.setTimeout(function () {
        V.waiters = V.waiters.filter(function (y) {
          return y !== x;
        });
        resolve(false);
      }, ms);
      x.resolve = function (v) {
        root.clearTimeout(t);
        resolve(v);
      };
      V.waiters.push(x);
    });
  }

  /** A service request to the preview; resolves with its answer, or null after `ms`. */
  function request(type, fields, ms) {
    return new Promise(function (resolve) {
      var id = "bl" + ++seq;
      var msg = Object.assign({ type: type, v: V1, id: id }, fields);
      var timer = root.setTimeout(function () {
        delete PENDING[id];
        resolve(null);
      }, ms);
      PENDING[id] = {
        msg: msg,
        resolve: function (m) {
          root.clearTimeout(timer);
          delete PENDING[id];
          resolve(m);
        },
      };
      if (V.ready) post(msg);
    });
  }

  function isIssueList(v) {
    return (
      Array.isArray(v) &&
      v.every(function (i) {
        return isObj(i) && typeof i.code === "string" && typeof i.message === "string";
      })
    );
  }

  /** The preview's messages (preview → parent), checked like protocol.ts isFromPreview. */
  function onMessage(e) {
    if (!V.frame || e.source !== V.frame.contentWindow) return;
    if (e.origin !== root.location.origin) return;
    var m = e.data;
    if (!isObj(m) || m.v !== V1 || typeof m.type !== "string") return;
    receive(m);
  }

  function receive(m) {
    switch (m.type) {
      case "bobalab:ready":
        V.ready = true;
        handshake();
        return;
      case "bobalab:rendered":
        if (typeof m.rev !== "number" || !isObj(m.target) || !isObj(m.problems)) return;
        onRendered(m);
        return;
      case "bobalab:navigated":
        if (!isObj(m.target) || typeof m.target.page !== "string") return;
        V.other = { target: m.target, path: String(m.path || targetPath(m.target)) };
        V.pageId = "other";
        V.target = m.target;
        frameTitle();
        bump();
        return;
      case "bobalab:parsed":
      case "bobalab:checked": {
        var p = typeof m.id === "string" ? PENDING[m.id] : null;
        if (p) p.resolve(m);
        return;
      }
      case "bobalab:key":
        if (m.key === "save") pressSave();
        return;
    }
  }

  function onRendered(m) {
    var prev = V.rendered;
    if (prev && m.rev < prev.rev) return;
    var p = m.problems;
    var problems = {
      available: !!p.available,
      blocking: isIssueList(p.blocking) ? p.blocking : [],
      warnings: isIssueList(p.warnings) ? p.warnings : [],
      stillNeeded: isIssueList(p.stillNeeded) ? p.stillNeeded : [],
    };
    var next = { rev: m.rev, found: m.found, title: m.title, problems: problems };
    var changed =
      !prev ||
      prev.found !== next.found ||
      JSON.stringify(prev.problems) !== JSON.stringify(next.problems);
    V.rendered = next;
    if (changed) bump();
  }

  function pressSave() {
    var s = saver();
    if (!s || typeof s.saveNow !== "function") return;
    Promise.resolve(
      safe(function () {
        return s.saveNow();
      }, "unavailable"),
    ).then(function (r) {
      if (r === "nothing-to-save") announce("No changes to save");
      else if (r === "busy") announce("Already saving");
    });
  }

  // ---------------------------------------------------------------------------
  // The BobalabLive services (Interfaces §7)

  var UNAVAILABLE = { available: false, blocking: [], warnings: [] };

  /** {collection, slug, path, isNew} of the entry in the editor, or null. */
  function current() {
    var e = editorInfo();
    var collection = e ? e.collection : V.id && V.id.collection;
    if (!collection) return null;
    var isNew = e ? !!e.newRecord : !!(V.id && V.id.isNew);
    var slug = isNew ? null : e ? e.slug : V.id.slug;
    var path = slug ? pathOf(collection, slug) || (e && e.path) || null : null;
    return { collection: collection, slug: slug || null, path: path, isNew: isNew };
  }

  /** Resolves true once the preview is up and has the saved site (false after `ms`). */
  function whenReady(ms) {
    return waitFor(isReady, typeof ms === "number" ? ms : OPTIONS.readyMs);
  }

  /** The site check on exactly `data` (spec §3.6e); {available: false} when it can't run in time. */
  function checkSave(o) {
    o = o || {};
    if (!V.comp && !V.frame) return Promise.resolve(Object.assign({}, UNAVAILABLE));
    if (V.dirty) flushOverlay();
    var entry = o.entry || {};
    var ms = typeof o.timeoutMs === "number" ? o.timeoutMs : OPTIONS.checkMs;
    return request(
      "bobalab:check",
      {
        entry: { collection: String(entry.collection || ""), slug: String(entry.slug || "") },
        isNew: !!o.isNew,
        data: isObj(o.data) ? o.data : {},
      },
      ms,
    ).then(function (m) {
      if (!m) return Object.assign({}, UNAVAILABLE);
      return {
        available: !!m.available,
        blocking: isIssueList(m.blocking) ? m.blocking : [],
        warnings: isIssueList(m.warnings) ? m.warnings : [],
      };
    });
  }

  /** A content file's data before the schema (the shape Decap loads into the form). */
  function parse(path, text) {
    return request(
      "bobalab:parse",
      { path: String(path), text: String(text) },
      OPTIONS.parseMs,
    ).then(function (m) {
      if (!m)
        throw new Error(
          "The live preview didn't answer, so this version can't be read. Try again in a moment",
        );
      if (m.ok !== true || !isObj(m.data))
        throw new Error(
          "This version can't be read (" + String(m.error || "unknown problem") + ")",
        );
      return m.data;
    });
  }

  /** The live column must be shown for parse and check: ask the layout to show it. */
  function ensureColumn() {
    var lay = layout();
    var show =
      lay && typeof lay.isLivePaneShown === "function" && !lay.isLivePaneShown()
        ? Promise.resolve(
            safe(function () {
              return lay.showLivePane();
            }, false),
          )
        : Promise.resolve(true);
    return show.then(function () {
      return waitFor(function () {
        return V.ready;
      }, OPTIONS.readyMs);
    });
  }

  var PARSED = {}; // "path@sha" → Promise<data|null>

  /** The parsed data of a file at a version, or null when the file was not there. */
  function versionData(path, sha) {
    var k = path + "@" + sha;
    if (PARSED[k]) return PARSED[k];
    var h = hist();
    if (!h || !sha) return Promise.resolve(null);
    var p = h.textAt(path, sha).then(function (text) {
      return text === null || text === undefined ? null : parse(path, text);
    });
    PARSED[k] = p;
    p.then(null, function () {
      delete PARSED[k];
    });
    return p;
  }

  /** The upload addresses on main (null when they can't be read: then nothing is cleared). */
  function uploadSet() {
    var h = hist();
    if (!h || typeof h.uploadPaths !== "function") return Promise.resolve(null);
    return Promise.resolve()
      .then(function () {
        return h.uploadPaths();
      })
      .then(null, function () {
        return null;
      });
  }

  /** Press Save and wait: "saved", "blocked", or saveNow's own answer. */
  function saveAndWatch(path) {
    var s = saver();
    if (!s || typeof s.saveNow !== "function") return Promise.resolve("unavailable");
    var saved = false;
    var off =
      typeof s.onSaved === "function"
        ? s.onSaved(function (ev) {
            if (!path || !ev || !ev.path || ev.path === path) saved = true;
          })
        : null;
    var stop = function (r) {
      V.lastSave = r;
      if (typeof off === "function") safe(off);
      return r;
    };
    var press = function () {
      return Promise.resolve(
        safe(function () {
          return s.saveNow();
        }, "unavailable"),
      );
    };
    // A save that is still running (the one just made, before Undo) is waited for, once.
    var whenFree = function (r) {
      if (r !== "busy") return r;
      return new Promise(function (resolve) {
        var until = Date.now() + OPTIONS.saveWatchMs / 4;
        (function look() {
          var busy = safe(function () {
            return s.isSaving();
          }, false);
          if (!busy) return resolve(press());
          if (Date.now() > until) return resolve("busy");
          root.setTimeout(look, 250);
        })();
      });
    };
    return press()
      .then(whenFree)
      .then(function (r) {
        if (r !== "started") return stop(r);
        return new Promise(function (resolve) {
          var until = Date.now() + OPTIONS.saveWatchMs;
          var idleSince = 0;
          (function look() {
            if (saved) return resolve(stop("saved"));
            var busy = safe(function () {
              return s.isSaving();
            }, false);
            if (busy) idleSince = 0;
            else if (!idleSince) idleSince = Date.now();
            if ((idleSince && Date.now() - idleSince > OPTIONS.savedGraceMs) || Date.now() > until)
              return resolve(stop(saved ? "saved" : "blocked"));
            root.setTimeout(look, 200);
          })();
        });
      });
  }

  function applyToForm(patches) {
    var ed = editor();
    if (!patches.length) return { applied: [], rejected: [] };
    if (!ed || typeof ed.applyFieldPatch !== "function")
      return {
        applied: [],
        rejected: patches.map(function (p) {
          return { path: p.path, reason: "the form can't be changed from here" };
        }),
      };
    var r = safe(function () {
      return ed.applyFieldPatch(patches);
    }, null) || { applied: [], rejected: [] };
    return { applied: r.applied || [], rejected: r.rejected || [] };
  }

  /** "the version from Oct 24" for a sha in History, else a neutral name. */
  function versionLabel(path, sha) {
    var row = versionRow(path, sha);
    return row && row.date ? "the version from " + shortDate(row.date) : "the earlier version";
  }

  function versionRow(path, sha) {
    var st = HIST[path];
    return st
      ? st.rows.filter(function (r) {
          return r.sha === sha;
        })[0] || null
      : null;
  }

  /** Undo that can't run here: go to the entry's History, with the top row open. */
  function routeToHistory(path, here) {
    storageSet(
      "sessionStorage",
      INTENT_KEY,
      JSON.stringify({ path: path, tab: "history", select: "top", at: Date.now() }),
    );
    var text = "Undo is in this entry's History";
    announce(text);
    if (here) openIntent();
    else {
      var e = entryOfPath(path);
      if (e)
        root.location.hash =
          "#/collections/" +
          encodeURIComponent(e.collection) +
          "/entries/" +
          encodeURIComponent(e.slug);
      toast({ text: text + ".", timeoutMs: 5000 });
    }
    return { ok: false, notes: [text], rejected: [], routed: true };
  }

  function changeLines(before, after, fields, nowData, collection) {
    var h = hist();
    if (!h || typeof h.diff !== "function") return [];
    var changes = safe(function () {
      return h.diff(before, after, fields);
    }, []);
    return changes.map(function (c) {
      var mask = maskFor(c.name, nowData, collection, fields);
      return typeof h.display === "function"
        ? h.display(c, mask ? { mask: mask } : undefined)
        : c.label + ": changed";
    });
  }

  /**
   * Put an older version into the form (spec §4.3) and, with `save`, press Save.
   * History asks first (a dialog with the changes and the guards); Undo does
   * not, and only acts on its own entry when the form has no unsaved changes.
   */
  function restoreVersion(o) {
    o = o || {};
    var path = o.path;
    var sha = o.sha;
    var source = o.source === "undo" ? "undo" : "history";
    var cur = current();
    var dirty = !!(editorInfo() || {}).hasChanged;
    if (source === "undo" && (!cur || cur.path !== path || dirty))
      return Promise.resolve(routeToHistory(path, !!(cur && cur.path === path)));
    if (!path || !sha)
      return Promise.reject(new Error("there is no earlier version to go back to"));
    var label = o.label || versionLabel(path, sha);
    var row = versionRow(path, sha);
    var opener = focusedNow(); // the dialog gives the focus back to it
    var info;
    var old;
    var uploads;
    var choice = { save: o.save !== false, unhide: false, personal: false };
    return ensureColumn()
      .then(function () {
        return versionData(path, sha);
      })
      .then(function (data) {
        if (!data) throw new Error("that version of the entry has no file");
        old = data;
        return uploadSet();
      })
      .then(function (set) {
        uploads = set;
        info = editorInfo();
        if (!info) throw new Error("no entry is open");
        var plan = buildRestorePatch(info.data, old, info.fields, {
          collection: info.collection,
          uploads: uploads,
          source: source,
        });
        var resumed = o.resume || null;
        if (resumed) {
          choice.unhide = !!resumed.unhide;
          choice.personal = !!resumed.personal;
          return buildRestorePatch(info.data, old, info.fields, {
            collection: info.collection,
            uploads: uploads,
            unhide: choice.unhide,
            personal: choice.personal,
            source: source,
          });
        }
        if (source === "undo") return plan;
        return restoreDialog(path, sha, row, label, info, plan, dirty, opener).then(function (r) {
          if (!r.ok) return null;
          choice.save = choice.save && !r.checked.check;
          choice.unhide = !!r.checked.unhide;
          choice.personal = !!r.checked.personal;
          return buildRestorePatch(info.data, old, info.fields, {
            collection: info.collection,
            uploads: uploads,
            unhide: choice.unhide,
            personal: choice.personal,
            source: source,
          });
        });
      })
      .then(function (plan) {
        if (!plan) return { ok: false, notes: [], rejected: [] };
        var beforeValues = plan.patches.map(function (p) {
          var f = fieldDef(info.fields, p.path);
          var had = Object.prototype.hasOwnProperty.call(info.data, p.path);
          return { path: p.path, value: had ? clone(info.data[p.path]) : emptyFor(f) };
        });
        if (!plan.patches.length) {
          var same0 = "The form already has " + label + ": there is nothing to restore.";
          noteBand([same0]);
          if (source === "undo") toast({ text: same0 });
          return { ok: true, notes: [same0].concat(plan.notes), rejected: [] };
        }
        var r = applyToForm(plan.patches);
        var rejected = r.rejected.map(function (x) {
          return x.path;
        });
        var notes = plan.notes.slice();
        if (rejected.length)
          notes.push(
            "These fields couldn't be put back: " +
              r.rejected
                .map(function (x) {
                  return fieldLabel(x.path, info.fields) + " (" + x.reason + ")";
                })
                .join(", "),
          );
        V.older = null;
        V.tab = "live";
        bump();
        // Decap compares the form with the copy it loaded when the entry was
        // opened; after a save in this editor that copy is out of date, so
        // putting the earlier values back looks like "no change" and Save is
        // not offered. Reopen the entry (its copy is read again) and finish there.
        var after = editorInfo();
        if (choice.save && r.applied.length && after && !after.hasChanged && !o.resume)
          return reopenAndRestore(path, sha, label, source, choice, notes, rejected);
        if (!choice.save) {
          noteBand(["The form now has " + label + ". Check it, then press Save."].concat(notes));
          announce("The form now has " + label + ". It is not saved yet.");
          return { ok: true, notes: notes, rejected: rejected };
        }
        return saveAndWatch(path).then(function (res) {
          if (res === "saved") {
            V.bands.restoreBlocked = null;
            V.lastRestore = { path: path, label: label, at: Date.now() };
            noteBand(notes.length ? ["Restored " + label + "."].concat(notes) : null);
            if (source === "undo" && notes.length)
              toast({ text: notes.join(" "), timeoutMs: 12000 });
            announce("Restored " + label + ". The live site updates in about 2 minutes.");
            bump();
            return { ok: true, notes: notes, rejected: rejected };
          }
          if (res === "blocked") {
            V.bands.restoreBlocked = { label: label, before: beforeValues };
            noteBand(notes.length ? notes : null);
            bump();
            return { ok: false, notes: notes, rejected: rejected };
          }
          noteBand(["The form now has " + label + ". Press Save to save it."].concat(notes));
          return { ok: false, notes: notes, rejected: rejected };
        });
      });
  }

  /** Reopen the entry, then restore again there (sessionStorage "bobalab.live.intent"). */
  function reopenAndRestore(path, sha, label, source, choice, notes, rejected) {
    var e = entryOfPath(path);
    if (!e) {
      noteBand(["The form now has " + label + ". Press Save to save it."].concat(notes));
      return Promise.resolve({ ok: false, notes: notes, rejected: rejected });
    }
    storageSet(
      "sessionStorage",
      INTENT_KEY,
      JSON.stringify({
        path: path,
        tab: "live",
        restore: {
          sha: sha,
          label: label,
          source: source,
          unhide: !!choice.unhide,
          personal: !!choice.personal,
        },
        at: Date.now(),
      }),
    );
    announce("Reopening the entry to restore " + label + "…");
    var w = root.top && root.top !== root ? root.top : root;
    var list = "#/collections/" + encodeURIComponent(e.collection);
    var entry = list + "/entries/" + encodeURIComponent(e.slug);
    w.location.hash = list;
    root.setTimeout(function () {
      w.location.hash = entry;
    }, OPTIONS.reopenMs);
    return Promise.resolve({ ok: true, notes: notes, rejected: rejected, reopened: true });
  }

  /**
   * The element with the focus now: a button of the bar inside Decap's preview
   * frame (the admin page itself then only knows that the frame has the focus),
   * else the admin page's own.
   */
  function focusedNow() {
    var fd = V.doc;
    var a = fd && fd.activeElement;
    if (a && a !== fd.body && a !== fd.documentElement) return a;
    var d = root.document;
    return (d && d.activeElement) || null;
  }

  function restoreDialog(path, sha, row, label, info, plan, dirty, opener) {
    var u = ui();
    if (!u || typeof u.confirm !== "function") return Promise.resolve({ ok: true, checked: {} });
    var when = row && row.date ? fullTime(row.date, false) : "";
    var title = when ? "Restore the version from " + when + "?" : "Restore " + label + "?";
    var result = applyPatches(info.data, plan.patches);
    var lines = changeLines(info.data, result, info.fields, info.data, info.collection);
    var st = HIST[path];
    var later = [];
    if (st) {
      for (var i = 0; i < st.rows.length && st.rows[i].sha !== sha; i++) later.push(st.rows[i]);
    }
    var body = [];
    if (dirty)
      body.push(
        "Replace your unsaved changes with the version from " +
          (when || shortDate(row && row.date)) +
          "?",
      );
    if (lines.length) {
      body.push("What changes back:");
      body.push(
        lines
          .slice(0, 12)
          .concat(lines.length > 12 ? ["and " + (lines.length - 12) + " more"] : []),
      );
    } else body.push("This version has the same content as the form.");
    if (later.length) {
      body.push(
        later.length === 1
          ? "It replaces 1 later save:"
          : "It replaces " + later.length + " later saves:",
      );
      body.push(
        later.slice(0, 5).map(function (r) {
          return (r.author && r.author.name) + ", " + fullTime(r.date, false);
        }),
      );
    }
    if (plan.notes.length) body.push(plan.notes.slice());
    body.push(
      "It is saved now and the live site updates in about 2 minutes. Nothing is lost: the current version stays in History.",
    );
    var boxes = [{ id: "check", label: "Let me check it in the form first (don't save yet)" }];
    if (plan.held.draft)
      boxes.push({ id: "unhide", label: "Also make it visible on the live site" });
    if (plan.held.personal.length)
      boxes.push({
        id: "personal",
        label: "Also bring back removed personal details (email, now at, photo, CV)",
      });
    return u.confirm({
      title: title,
      body: body,
      confirm: "Restore this version",
      checkboxes: boxes,
      returnFocus: opener || null,
    });
  }

  /** Back out of a blocked restore: the form gets the values it had before. */
  function cancelRestore() {
    var b = V.bands.restoreBlocked;
    if (!b) return;
    applyToForm(b.before);
    V.bands.restoreBlocked = null;
    V.bands.notes = null;
    announce("The restore was undone in the form.");
    bump();
  }

  function noteBand(lines) {
    V.bands.notes = lines && lines.length ? lines : null;
    bump();
  }

  /**
   * "Bring in their changes" (spec §3.7): merge the newer save into the form,
   * show what both changed, and move the conflict baseline to their version.
   */
  function mergeLatest(o) {
    o = o || {};
    var path = o.path;
    var baseSha = o.baseSha && o.baseSha !== "unknown" ? o.baseSha : null;
    var latestSha = o.latestSha;
    if (!path || !latestSha) return Promise.reject(new Error("there is no newer save to bring in"));
    var h = hist();
    return ensureColumn()
      .then(function () {
        return Promise.all([
          baseSha ? versionData(path, baseSha) : null,
          versionData(path, latestSha),
          h && typeof h.latest === "function"
            ? h.latest(path).then(null, function () {
                return null;
              })
            : null,
        ]);
      })
      .then(function (r) {
        var theirs = r[1];
        if (!theirs) throw new Error("their version can't be read");
        var info = editorInfo();
        if (!info) throw new Error("no entry is open");
        var m = merge3(r[0], info.data, theirs, info.fields, { collection: info.collection });
        var res = applyToForm(m.patches);
        var who = r[2] && r[2].sha === latestSha ? r[2] : versionRow(path, latestSha);
        var s = saver();
        if (s && typeof s.setBaseline === "function")
          safe(function () {
            s.setBaseline(path, latestSha);
          });
        V.bands.conflict = null;
        V.bands.merge = {
          self: !!(who && isMe(who.author && who.author.login)),
          name: who ? (who.author && who.author.name) || "Someone" : "Someone",
          at: who ? who.date : null,
          conflicts: m.conflicts,
          held: m.held,
          rejected: res.rejected,
          fields: info.fields,
        };
        V.tab = "live";
        bump();
        announce(mergeText(V.bands.merge));
        return {
          ok: true,
          applied: res.applied.length ? res.applied : m.applied,
          conflicts: m.conflicts,
        };
      });
  }

  function isMe(login) {
    var g = gh();
    var u = g && typeof g.user === "function" ? safe(g.user, null) : null;
    return !!(u && login && String(u.login).toLowerCase() === String(login).toLowerCase());
  }

  function mergeText(b) {
    var when = b.at ? " from " + clockTime(b.at) : "";
    var head = b.self
      ? "Brought in your save" + when + " from another tab or window."
      : "Brought in " + b.name + "'s save" + when + ".";
    return head + " Your other changes are kept.";
  }

  // ---------------------------------------------------------------------------
  // History (spec §4.2)

  var HIST = {}; // path → state

  function histState(path) {
    if (!HIST[path])
      HIST[path] = {
        rows: [],
        hasMore: false,
        page: 0,
        loading: false,
        error: null,
        stale: true,
        summary: {}, // sha → {verb, changes, before, after} once known
      };
    return HIST[path];
  }

  function loadHistory(path, more) {
    var h = hist();
    var st = histState(path);
    if (!h || st.loading) return Promise.resolve();
    var page = more ? st.page + 1 : 1;
    st.loading = true;
    st.error = null;
    bump();
    return h.versions(path, { page: page, perPage: OPTIONS.perPage }).then(
      function (r) {
        st.rows = more ? st.rows.concat(r.rows) : r.rows;
        st.hasMore = !!r.hasMore;
        st.page = page;
        st.stale = false;
        if (!more) st.summary = {};
        st.loading = false;
        if (V.expanded === "top" && st.rows[0]) V.expanded = st.rows[0].sha;
        bump();
        if (V.focusTop) {
          V.focusTop = false;
          focusLater("[data-undo], .bl-history__item--top .bl-history__row");
        }
        summarize(path);
        liveAt();
      },
      function (e) {
        st.loading = false;
        st.error = e || { kind: "http", message: "Couldn't read History." };
        bump();
      },
    );
  }

  var siteState = { at: 0, liveAt: null };
  function liveAt() {
    var d = deployer();
    if (!d || mode() === "local") return;
    var last = typeof d.lastSite === "function" ? safe(d.lastSite, null) : null;
    if (last) siteState = { at: Date.now(), liveAt: last.liveAt || null };
    if (Date.now() - siteState.at < 60 * SEC && siteState.at) return;
    if (typeof d.site !== "function") return;
    siteState.at = Date.now();
    Promise.resolve()
      .then(function () {
        return d.site();
      })
      .then(
        function (s) {
          siteState = { at: Date.now(), liveAt: (s && s.liveAt) || null };
          bump();
        },
        function () {},
      );
  }

  /** Field summaries for the newest rows, one version after the other (lazy). */
  function summarize(path) {
    var st = histState(path);
    var rows = st.rows.slice(0, OPTIONS.summaryRows);
    var chain = Promise.resolve();
    rows.forEach(function (row, i) {
      if (st.summary[row.sha]) return;
      chain = chain.then(function () {
        if (HIST[path] !== st) return;
        var prevSha = st.rows[i + 1] ? st.rows[i + 1].sha : row.parentSha;
        return Promise.all([
          versionData(path, row.sha),
          prevSha ? versionData(path, prevSha) : null,
        ]).then(
          function (r) {
            st.summary[row.sha] = { after: r[0], before: r[1], ok: true };
            bump();
          },
          function () {
            st.summary[row.sha] = { ok: false };
            bump();
          },
        );
      });
    });
    return chain;
  }

  /** Which switch hides a personal detail now ("Email public"), or null when it shows. */
  function maskFor(name, nowData, collection, fields) {
    if (collection !== "people") return null;
    var key = PERSONAL_SWITCH.hasOwnProperty(name) ? name : null;
    if (!key) return null;
    var d = isObj(nowData) ? nowData : {};
    if (d.listed !== true) return SWITCH_WORDS.listed;
    var sw = PERSONAL_SWITCH[key];
    if (sw && d[sw] !== true) {
      var f = fieldDef(fields, sw);
      return SWITCH_WORDS[sw] || shortLabel(f && f.label);
    }
    return null;
  }

  function labelsOf(changes, fields) {
    var seen = {};
    var out = [];
    changes.forEach(function (c) {
      var top = String(c.name).split(".")[0];
      if (seen[top]) return;
      seen[top] = true;
      var f = fieldDef(fields, top);
      out.push(f ? shortLabel(f.label || top) : String(c.label || top).split(" › ")[0]);
    });
    return out;
  }

  /** The words after the name in a History row. */
  function rowVerb(path, i, fields) {
    var st = histState(path);
    var row = st.rows[i];
    if (!row) return "";
    if (row.kind === "maintainer")
      return "changed this entry (outside the content manager): “" + row.subject + "”";
    var lr = V.lastRestore;
    var sum = st.summary[row.sha];
    if (sum && sum.ok) {
      if (sum.after === null) return "deleted this entry";
      if (sum.before === null || row.kind === "create") return "created this entry";
      var h = hist();
      // The same data as an older version (not its own parent): a restore.
      // Decap rewrites the YAML on every save, so the parsed data is compared.
      for (var j = i + 2; j < st.rows.length; j++) {
        var older = st.summary[st.rows[j].sha];
        if (
          older &&
          older.ok &&
          older.after &&
          h &&
          typeof h.sameData === "function" &&
          h.sameData(sum.after, older.after)
        )
          return "restored the version from " + shortDate(st.rows[j].date);
      }
      var changes =
        h && typeof h.diff === "function"
          ? safe(function () {
              return h.diff(sum.before, sum.after, fields);
            }, [])
          : [];
      if (!changes.length) return "saved without changing the content (formatting only)";
      var labels = labelsOf(changes, fields);
      var shown = labels.slice(0, 3).join(", ");
      return (
        "changed " + shown + (labels.length > 3 ? " and " + (labels.length - 3) + " more" : "")
      );
    }
    if (row.kind === "create") return "created this entry";
    if (i === 0 && lr && lr.path === path && Date.parse(row.date) >= lr.at - 2 * 60 * SEC)
      return "restored " + lr.label;
    return "saved a change";
  }

  /** Open History on a path's entry (Interfaces §7); another entry is opened first. */
  function openHistory(path) {
    var cur = current();
    if (!cur || cur.path !== path) {
      storageSet(
        "sessionStorage",
        INTENT_KEY,
        JSON.stringify({ path: path, tab: "history", select: null, at: Date.now() }),
      );
      var e = entryOfPath(path);
      if (e)
        root.location.hash =
          "#/collections/" +
          encodeURIComponent(e.collection) +
          "/entries/" +
          encodeURIComponent(e.slug);
      return;
    }
    var lay = layout();
    if (lay && typeof lay.isLivePaneShown === "function" && !lay.isLivePaneShown())
      safe(function () {
        lay.showLivePane();
      });
    setTab("history");
  }

  /** sessionStorage "bobalab.live.intent": open History (and its top row) when the entry is here. */
  function openIntent() {
    var raw = storageGet("sessionStorage", INTENT_KEY);
    var intent = raw
      ? safe(function () {
          return JSON.parse(raw);
        }, null)
      : null;
    if (!intent || !intent.path) return false;
    var cur = current();
    if (!cur || cur.path !== intent.path) {
      if (Date.now() - Number(intent.at || 0) > OPTIONS.intentMaxAgeMs)
        storageSet("sessionStorage", INTENT_KEY, null);
      return false;
    }
    storageSet("sessionStorage", INTENT_KEY, null);
    if (intent.restore && intent.restore.sha) {
      // A restore that needed the entry reopened: finish it now, without asking again.
      var x = intent.restore;
      root.setTimeout(function () {
        restoreVersion({
          path: intent.path,
          sha: x.sha,
          label: x.label,
          save: true,
          source: x.source,
          resume: { unhide: !!x.unhide, personal: !!x.personal },
        }).then(null, function (e) {
          noteBand([
            "Couldn't restore: " + String((e && e.message) || "something went wrong") + ".",
          ]);
        });
      }, 0);
      return true;
    }
    V.tab = "history";
    V.focusTop = intent.select === "top";
    var st = histState(intent.path);
    if (intent.select === "top") V.expanded = st.rows[0] ? st.rows[0].sha : "top";
    loadHistory(intent.path, false);
    bump();
    return true;
  }

  // ---------------------------------------------------------------------------
  // Selecting an older version: the preview shows what Restore would save

  function selectVersion(path, row) {
    V.expanded = row.sha;
    V.tab = "live";
    bump();
    var info = editorInfo() || {
      data: formData(),
      fields: formFields(),
      collection: V.id && V.id.collection,
    };
    return Promise.all([versionData(path, row.sha), uploadSet()]).then(
      function (r) {
        var old = r[0];
        if (!old) {
          noteBand(["That version of the entry has no file, so there is nothing to show."]);
          return;
        }
        var plan = buildRestorePatch(info.data, old, info.fields, {
          collection: info.collection,
          uploads: r[1],
          source: "history",
        });
        V.older = {
          path: path,
          sha: row.sha,
          row: row,
          data: applyPatches(info.data, plan.patches),
          notes: plan.notes,
          formRev: V.entry,
        };
        V.rendered = null;
        flushOverlay();
        frameTitle();
        bump();
        focusLater(".bl-band--older button");
      },
      function (e) {
        noteBand([
          "This version can't be shown: " + String((e && e.message) || "it can't be read") + ".",
        ]);
      },
    );
  }

  function leaveOlder(toHistory) {
    var o = V.older;
    V.older = null;
    V.rendered = null;
    flushOverlay();
    frameTitle();
    if (toHistory) {
      V.tab = "history";
      bump();
      if (o) focusLater('[data-sha="' + o.sha + '"]');
    } else bump();
  }

  // ---------------------------------------------------------------------------
  // "@x saved this entry after you opened it" (spec §3.7, proactive check)

  function freshCheck(force) {
    if (mode() === "local" || !V.comp) return;
    if (!force && Date.now() - V.freshAt < OPTIONS.freshMinGapMs) return;
    var info = editorInfo();
    if (!info || info.newRecord || !info.hasChanged) return;
    var path = pathOf(info.collection, info.slug);
    var h = hist();
    var s = saver();
    if (!path || !h || !s || typeof s.baseline !== "function") return;
    V.freshAt = Date.now();
    h.latest(path, { fresh: true }).then(
      function (v) {
        var base = s.baseline(path);
        if (!v || !base) return;
        var own = typeof s.ownShas === "function" ? s.ownShas() : null;
        var mine = isMe(v.author && v.author.login);
        var newer =
          v.sha !== base &&
          !(own && typeof own.has === "function" && own.has(v.sha)) &&
          !(base === "unknown" && mine);
        V.bands.conflict = newer ? { path: path, version: v, base: base, self: mine } : null;
        bump();
      },
      function () {},
    );
  }

  // ---------------------------------------------------------------------------
  // Rendering (Decap's React: h, createClass)

  var h = function () {
    return root.h.apply(null, arguments);
  };

  function bump() {
    var c = V.comp;
    if (!c || typeof c.setState !== "function") return;
    safe(function () {
      c.setState({ n: ((c.state && c.state.n) || 0) + 1 });
    });
  }

  /** Move the focus once the column has drawn, unless a dialog has opened meanwhile. */
  function focusLater(selector) {
    root.setTimeout(function () {
      var top = root.document;
      var dialogOpen =
        top &&
        typeof top.querySelector === "function" &&
        safe(function () {
          return !!top.querySelector("dialog[open]");
        }, false);
      if (dialogOpen) return;
      var d = V.doc;
      var el =
        d &&
        safe(function () {
          return d.querySelector(selector);
        }, null);
      if (el && typeof el.focus === "function")
        safe(function () {
          el.focus();
        });
    }, 50);
  }

  function tabsNow() {
    if (!V.id) return [];
    return tabsFor(V.id.collection, V.id.slug, formData());
  }

  function currentTab() {
    var tabs = tabsNow();
    if (V.pageId === "other" && V.other)
      return { id: "other", label: "Other page: " + V.other.path, target: V.other.target };
    for (var i = 0; i < tabs.length; i++) if (tabs[i].id === V.pageId) return tabs[i];
    return tabs[0] || null;
  }

  function currentTarget() {
    var t = currentTab();
    return t ? t.target : null;
  }

  function setPage(id) {
    V.pageId = id;
    if (id !== "other") V.other = null;
    V.rendered = null;
    postNavigate();
    frameTitle();
    bump();
  }

  function setTab(tab) {
    V.tab = tab;
    if (tab === "history" && V.id && !V.id.isNew) {
      var path = pathOf(V.id.collection, V.id.slug);
      var st = path ? histState(path) : null;
      if (st && (st.stale || st.error) && !st.loading) loadHistory(path, false);
    }
    bump();
  }

  function setDevice(d) {
    V.device = d;
    storageSet("localStorage", DEVICE_KEY, d);
    applyScale();
    bump();
  }

  function setVisitor(on) {
    V.visitor = !!on;
    storageSet("sessionStorage", VISITOR_KEY, on ? "1" : null);
    if (V.ready) post({ type: "bobalab:mode", v: V1, visitor: V.visitor });
    bump();
  }

  function applyScale() {
    var f = V.frame;
    if (!f) return;
    var box = deviceBox(V.width, V.height, effectiveDevice(V.device, V.width));
    if (!box) return;
    f.style.width = box.width + "px";
    f.style.height = box.height + "px";
    f.style.left = box.left + "px";
    f.style.transform = "scale(" + box.scale + ")";
    f.setAttribute("data-device", box.device);
  }

  function suffix() {
    if (V.older) return "older version · " + fullTime(V.older.row.date, false);
    return hasChanged() ? "your unsaved changes" : "saved version";
  }

  function frameTitle() {
    var f = V.frame;
    var t = currentTab();
    if (!f || !t) return;
    var s = V.older
      ? "the version from " + fullTime(V.older.row.date, false)
      : hasChanged()
        ? "with your unsaved changes"
        : "saved version";
    var title = "Site preview: " + t.label + ", " + s;
    if (f.getAttribute("title") !== title) f.setAttribute("title", title);
  }

  function goHash(collection, slug) {
    var w = root.top && root.top !== root ? root.top : root;
    w.location.hash =
      "#/collections/" + encodeURIComponent(collection) + "/entries/" + encodeURIComponent(slug);
  }

  function openPublished(path) {
    var w = root.top || root;
    safe(function () {
      w.open(publishedUrl(path), "_blank", "noopener");
    });
  }

  function focusForm() {
    var d = root.document;
    var el =
      d &&
      safe(function () {
        return d.querySelector(
          '[class*="ControlPaneContainer"] input:not([type="hidden"]), [class*="ControlPaneContainer"] textarea, [class*="ControlPaneContainer"] [contenteditable="true"], [class*="ControlPaneContainer"] select, [class*="ControlPaneContainer"] button',
        );
      }, null);
    if (el && typeof el.focus === "function")
      safe(function () {
        el.focus();
      });
  }

  function btn(label, onClick, extra) {
    var props = Object.assign(
      { type: "button", className: "bl-btn", onClick: onClick },
      extra || {},
    );
    return h("button", props, label);
  }

  /** Tabs with manual activation: arrows move the focus, Enter or Space selects. */
  function onTabKeys(e) {
    var keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    var k = keys[e.key];
    if (!k) return;
    var list = e.currentTarget;
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    var i = tabs.indexOf(list.ownerDocument.activeElement);
    if (!tabs.length) return;
    var next =
      k === "first" ? 0 : k === "last" ? tabs.length - 1 : (i + k + tabs.length) % tabs.length;
    e.preventDefault();
    tabs[next].focus();
  }

  function swatchName(id) {
    var w = ((cfg().labels || {}).swatches || {})[id];
    return (w && w.name) || id;
  }

  function quotedNames(list) {
    return list
      .map(function (x) {
        return "“" + x.name + "”";
      })
      .join(", ");
  }

  /**
   * A research direction's colour among the others (the saved site): taken
   * already (cms-hooks.js refuses that Save), easily confused, and the colours
   * in use. The same words as the earlier direction preview.
   */
  function colourUse(slug, d) {
    var hk = hooks();
    var labels = cfg().labels || {};
    var list = BASE.data && BASE.data.directions;
    if (!list || !d.color || !hk || typeof hk.colourConflicts !== "function") return [];
    var all = labels.confusablePairs || [];
    var pairs = all.filter(function (p) {
      return p[0] === d.color || p[1] === d.color;
    });
    var hits = safe(function () {
      return hk.colourConflicts(slug, d.color, list, all);
    }, null) || { same: [], confusable: [] };
    var out = [];
    if (hits.same.length && d.status !== "archived")
      out.push(
        "Colour taken. " +
          swatchName(d.color) +
          " is already the colour of " +
          quotedNames(hits.same) +
          ". Choose another colour: the CMS will not save this one.",
      );
    // Only when the colour is being chosen (new, or changed from the saved one),
    // and only for colours another direction uses now.
    var saved = baseData("directions", slug);
    var near = [];
    if (!saved || saved.color !== d.color)
      pairs.forEach(function (p) {
        var other = p[0] === d.color ? p[1] : p[0];
        var users = hits.confusable.filter(function (x) {
          return x.color === other;
        });
        if (users.length)
          near.push(swatchName(other) + " (the colour of " + quotedNames(users) + ")");
      });
    if (near.length)
      out.push(
        "Hard to tell apart from " +
          joinWords(near) +
          " for some colour-blind readers. Choose another colour if you can.",
      );
    var others = list.filter(function (x) {
      return x.slug !== slug && x.data && x.data.status !== "archived" && x.data.color;
    });
    if (others.length)
      out.push(
        "Colours of the other live directions: " +
          others
            .map(function (x) {
              return (
                swatchName(x.data.color) +
                " (" +
                (x.data.short_label || x.data.title || x.slug) +
                ")"
              );
            })
            .join(", ") +
          ".",
      );
    return out;
  }

  function consentSummary(d, fields) {
    var shown = [];
    var hidden = [];
    var item = function (has, on, word, sw) {
      if (!has) return;
      if (on) shown.push(word);
      else hidden.push(word + " (" + (SWITCH_WORDS[sw] || fieldLabel(sw, fields)) + " is off)");
    };
    item(!isEmpty(d.photo), d.photo_consent === true, "photo", "photo_consent");
    if (!isEmpty(d.program)) shown.push("program");
    item(!isEmpty(d.email), d.email_public === true, "email", "email_public");
    item(!isEmpty(d.now_at), d.now_at_public === true, "now at", "now_at_public");
    if (!isEmpty(getPath(d, "links.cv"))) shown.push("CV");
    if (hasProfile(d)) shown.push("profile page");
    var parts = [];
    if (shown.length) parts.push("Shown: " + shown.join(", ") + ".");
    if (hidden.length) parts.push("Hidden: " + hidden.join(", ") + ".");
    return parts.join(" ");
  }

  function issueButtons(issues) {
    var seen = {};
    var out = [];
    issues.forEach(function (i) {
      var e = issueEntry(i);
      if (!e) return;
      var k = e.collection + "/" + e.slug;
      if (seen[k]) return;
      seen[k] = true;
      out.push(
        btn(
          "Open " + e.name,
          function () {
            goHash(e.collection, e.slug);
          },
          { key: "open-" + k, className: "bl-btn bl-btn--small" },
        ),
      );
    });
    return out;
  }

  function band(kind, key, kids) {
    return h(
      "div",
      { key: key, className: "bl-band bl-band--" + kind },
      kids.filter(function (k) {
        return k !== null && k !== undefined && k !== false;
      }),
    );
  }

  function bandsNow() {
    var out = [];
    var id = V.id;
    var d = formData();
    var fields = formFields();
    var blocks = (cfg().features || {}).previewCheckBlocksSave !== false;
    var o = V.older;
    if (o) {
      var who = (o.row.author && o.row.author.name) || "someone";
      out.push(
        band("older", "older", [
          h(
            "p",
            { key: "t", className: "bl-band__text" },
            h("strong", null, "Older version"),
            " · saved by " +
              who +
              " on " +
              fullTime(o.row.date, false) +
              ". The form still has the current text; Save saves the form, not this version.",
          ),
          o.notes.length
            ? h(
                "ul",
                { key: "n", className: "bl-band__list" },
                o.notes.map(function (n, i) {
                  return h("li", { key: i }, n);
                }),
              )
            : null,
          h(
            "p",
            { key: "img", className: "bl-band__text" },
            "Images show the file that is at that address today.",
          ),
          h(
            "div",
            { key: "a", className: "bl-band__actions" },
            btn(
              "Restore this version",
              function () {
                restoreVersion({ path: o.path, sha: o.sha, save: true, source: "history" }).then(
                  null,
                  function (e) {
                    noteBand([
                      "Couldn't restore: " +
                        String((e && e.message) || "something went wrong") +
                        ".",
                    ]);
                  },
                );
              },
              {
                key: "r",
                className: "bl-btn bl-btn--primary",
                "aria-label": "Restore the version from " + fullTime(o.row.date, false),
              },
            ),
            btn(
              "Back to the current version",
              function () {
                leaveOlder(false);
              },
              { key: "c" },
            ),
            btn(
              "Back to History",
              function () {
                leaveOlder(true);
              },
              { key: "h" },
            ),
          ),
        ]),
      );
    }
    var r = V.rendered;
    var p = r ? r.problems : null;
    if (p && p.blocking.length) {
      var first = formatIssue(p.blocking[0]).replace(/[\s.]+$/, "");
      var more = p.blocking.length > 1 ? " (and " + (p.blocking.length - 1) + " more)" : "";
      out.push(
        band("problem", "problem", [
          h(
            "p",
            { key: "t", className: "bl-band__text" },
            "The site check would stop this save: " +
              first +
              more +
              "." +
              (blocks ? " Save is blocked until this is fixed." : ""),
          ),
          p.blocking.length > 1
            ? h(
                "ul",
                { key: "l", className: "bl-band__list" },
                p.blocking.slice(1, 4).map(function (i, n) {
                  return h("li", { key: n }, formatIssue(i));
                }),
              )
            : null,
          h("div", { key: "a", className: "bl-band__actions" }, issueButtons(p.blocking)),
        ]),
      );
    }
    if (p && p.stillNeeded.length && !o) {
      // Neutral while typing: values still missing, and values in the wrong form
      // (an address without https://), each named down to the field to fix.
      var labels = [];
      var fixes = [];
      p.stillNeeded.forEach(function (i) {
        var where = fieldLabel(i.field, fields) || "A field";
        var fix = fixWords(i.message);
        if (fix === null) {
          if (labels.indexOf(where) === -1) labels.push(where);
          return;
        }
        var line = where + ": " + fix;
        if (fixes.indexOf(line) === -1) fixes.push(line);
      });
      out.push(
        band("needed", "needed", [
          fixes.length
            ? h(
                "p",
                { key: "f", className: "bl-band__text" },
                "Fix before Save: " +
                  fixes.slice(0, 3).join("; ") +
                  (fixes.length > 3 ? " (and " + (fixes.length - 3) + " more)" : "") +
                  ".",
              )
            : null,
          labels.length
            ? h(
                "p",
                { key: "t", className: "bl-band__text" },
                "Still needed before Save: " + labels.join(", ") + ".",
              )
            : null,
        ]),
      );
    }
    var info = [];
    if (id && d.draft === true)
      info.push(
        h(
          "p",
          { key: "draft", className: "bl-band__text" },
          "Hidden from the live site: " +
            VISIBLE +
            " is No." +
            (V.visitor ? "" : " Shown here so you can check it."),
        ),
      );
    if (id && id.collection === "people") {
      if (d.listed !== true)
        info.push(
          h(
            "p",
            { key: "listed", className: "bl-band__text" },
            "Not listed: the site never shows or links this person, not even in the People section of the home page.",
          ),
        );
      else {
        var cs = consentSummary(d, fields);
        if (cs) info.push(h("p", { key: "consent", className: "bl-band__text" }, cs));
      }
    }
    if (id && id.collection === "directions" && !o)
      colourUse(id.slug, d).forEach(function (line, i) {
        info.push(h("p", { key: "colour-" + i, className: "bl-band__text" }, line));
      });
    if (r && r.found === "absent" && !o)
      info.push(
        h("p", { key: "absent", className: "bl-band__text" }, "This entry isn't on this page."),
      );
    if (p && id) {
      var own = fileOfEntry(id.collection, id.slug);
      var hiddenNow = p.warnings.some(function (w) {
        return w.code === "W_PUBLISHED_HIDDEN" && (!w.file || w.file === own);
      });
      if (hiddenNow)
        info.push(
          h(
            "p",
            { key: "published", className: "bl-band__text" },
            "This page was on the live site. After this save, people who open its address get “Page not found”.",
          ),
        );
    }
    var c = V.bands.conflict;
    if (c) {
      var v = c.version;
      var who2 = c.self
        ? "You"
        : v.author && v.author.login
          ? "@" + v.author.login
          : (v.author && v.author.name) || "Someone";
      info.push(
        h(
          "div",
          { key: "conflict", className: "bl-band__row" },
          h(
            "p",
            { className: "bl-band__text" },
            c.self
              ? "You saved this entry in another tab or window " + timeAgo(v.date) + "."
              : who2 + " saved this entry " + timeAgo(v.date) + ", after you opened it.",
          ),
          btn(
            c.self ? "Bring in that version" : "Bring in their changes",
            function () {
              mergeLatest({ path: c.path, baseSha: c.base, latestSha: v.sha }).then(
                null,
                function (e) {
                  noteBand([
                    "Couldn't bring in the other version: " +
                      String((e && e.message) || "something went wrong") +
                      ".",
                  ]);
                },
              );
            },
            { className: "bl-btn bl-btn--small bl-btn--primary" },
          ),
        ),
      );
    }
    var m = V.bands.merge;
    if (m) {
      var kids = [h("p", { key: "t", className: "bl-band__text" }, mergeText(m))];
      m.conflicts.forEach(function (x) {
        var text =
          typeof x.mine === "string"
            ? x.mine
            : x.mine === undefined
              ? ""
              : JSON.stringify(x.mine, null, 2);
        kids.push(
          h(
            "div",
            { key: "c-" + x.name, className: "bl-band__conflict" },
            h(
              "p",
              { className: "bl-band__text" },
              "You both changed " +
                x.label +
                ": the form now has " +
                (m.self ? "that" : "their") +
                " " +
                (typeof x.mine === "string" ? "text" : "value") +
                "; yours is below.",
            ),
            h("pre", { className: "bl-band__mine" }, text || "(empty)"),
            btn(
              "Copy my " + x.label,
              function () {
                copyText(text);
              },
              { className: "bl-btn bl-btn--small" },
            ),
          ),
        );
      });
      m.held.forEach(function (x) {
        kids.push(
          h(
            "p",
            { key: "h-" + x.name, className: "bl-band__text" },
            "“" +
              x.label +
              "” stays off as in " +
              (m.self ? "that" : "their") +
              " version: bringing in a save never turns a consent or visibility switch back on. Turn it on again if the person has agreed.",
          ),
        );
      });
      kids.push(
        h(
          "div",
          { key: "a", className: "bl-band__actions" },
          btn(
            "Dismiss",
            function () {
              V.bands.merge = null;
              bump();
            },
            { className: "bl-btn bl-btn--small bl-btn--quiet" },
          ),
        ),
      );
      info.push(h("div", { key: "merge", className: "bl-band__block" }, kids));
    }
    var rb = V.bands.restoreBlocked;
    if (rb)
      info.push(
        h(
          "div",
          { key: "restore", className: "bl-band__row" },
          h(
            "p",
            { className: "bl-band__text" },
            "These are the values from " +
              rb.label.replace(/^the version from /, "") +
              ". Fix the marked problem, then press Save.",
          ),
          btn("Cancel restore", cancelRestore, { className: "bl-btn bl-btn--small" }),
        ),
      );
    var notes = V.bands.notes;
    if (notes)
      info.push(
        h(
          "div",
          { key: "notes", className: "bl-band__row" },
          h(
            "ul",
            { className: "bl-band__list" },
            notes.map(function (n, i) {
              return h("li", { key: i }, n);
            }),
          ),
          btn(
            "Dismiss",
            function () {
              noteBand(null);
            },
            { className: "bl-btn bl-btn--small bl-btn--quiet" },
          ),
        ),
      );
    if (BASE.data && !BASE.complete)
      info.push(
        h(
          "div",
          { key: "incomplete", className: "bl-band__row" },
          h(
            "p",
            { className: "bl-band__text" },
            "Some entries couldn't be loaded, so the preview may be missing them and the site check is off.",
          ),
          btn(
            "Try again",
            function () {
              BASE.retried = false;
              loadBase();
            },
            { className: "bl-btn bl-btn--small" },
          ),
        ),
      );
    if (info.length) out.push(band("info", "info", info));
    return out;
  }

  function copyText(text) {
    var nav = root.navigator;
    var done = function () {
      announce("Copied.");
    };
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === "function") {
      nav.clipboard.writeText(text).then(done, function () {
        fallbackCopy(text);
      });
    } else fallbackCopy(text);
  }

  function fallbackCopy(text) {
    var d = V.doc || root.document;
    if (!d) return;
    var ta = d.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    d.body.appendChild(ta);
    ta.select();
    safe(function () {
      d.execCommand("copy");
    });
    d.body.removeChild(ta);
    announce("Copied.");
  }

  /** What a new entry's address is made from (cms-data rules.slugs templates), in words. */
  var MADE_FROM = {
    news: {
      words: "the date and the title",
      parts: [
        ["date", "the date"],
        ["title", "the title"],
      ],
    },
    publications: {
      words: "the first author’s name, the year and the title",
      parts: [
        ["authors.0.name", "the first author"],
        ["title", "the title"],
      ],
    },
    people: { words: "the first and last name", parts: [["name", "the name"]] },
    directions: { words: "the short label", parts: [["short_label", "the short label"]] },
    projects: { words: "the title", parts: [["title", "the title"]] },
    opportunities: { words: "the title", parts: [["title", "the title"]] },
  };

  function joinWords(list) {
    return list.length < 2
      ? list.join("")
      : list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
  }

  /**
   * The address line for a new entry whose address can't be told yet, or would
   * break the site's rule: {text, problem} or null. It looks forward ("Add the
   * first author to see it"); "Not saved: …" is Save's wording (cms-hooks
   * slugProblem). Red only once every part is filled in and it still can't work.
   */
  function addressAdvice(collection, dataImm) {
    var hk = hooks();
    var rule = ((cfg().rules || {}).slugs || {})[collection];
    var made = MADE_FROM[collection];
    if (!rule || !made || !hk || typeof hk.expectedSlug !== "function" || !dataImm) return null;
    var slug = safe(function () {
      return hk.expectedSlug(rule.template, dataImm, rule.identifier, new Date());
    }, null);
    if (slug === null || slug === undefined) return null;
    var shapeOk = safe(function () {
      return new RegExp(rule.pattern).test(slug);
    }, true);
    if (shapeOk && slug.length <= rule.max) return null;
    var from = "The address is made from " + made.words + ".";
    var missing = made.parts
      .filter(function (p) {
        return isEmpty(
          plain(
            safe(function () {
              return dataImm.getIn(
                p[0].split(".").map(function (k) {
                  return /^\d+$/.test(k) ? Number(k) : k;
                }),
              );
            }, null),
          ),
        );
      })
      .map(function (p) {
        return p[1];
      });
    if (missing.length)
      return { text: from + " Add " + joinWords(missing) + " to see it.", problem: false };
    if (shapeOk)
      return {
        text:
          "The address would be " +
          slug.length +
          " characters long, and at most " +
          rule.max +
          " fit. " +
          (collection === "publications"
            ? "For the first save, type only the first author’s last name; complete it after saving."
            : "Use a shorter title for the first save; you can change the title later."),
        problem: true,
      };
    return {
      text:
        from +
        (collection === "people"
          ? " Type at least a first and a last name in Latin letters."
          : " Use some plain letters or numbers (a–z, 0–9) there."),
      problem: true,
    };
  }

  function addressLine() {
    var id = V.id;
    var t = currentTarget();
    if (!id || !t) return null;
    if (id.isNew) {
      // The address rule (cms-hooks), once the field it is named after is filled in.
      var advice =
        V.entry && identifierFilled(id.collection, V.entry.get("data"))
          ? addressAdvice(id.collection, V.entry.get("data"))
          : null;
      if (advice)
        return h(
          "p",
          {
            className: "bl-live__address" + (advice.problem ? " bl-live__address--problem" : ""),
            key: "addr",
          },
          advice.text,
        );
      var own = currentTab();
      var path = targetPath(t);
      if (own && own.own && id.predicted)
        return h(
          "p",
          { className: "bl-live__address", key: "addr" },
          "New page · address after the first save: " +
            shownAddress(path) +
            " · it can't be changed later",
        );
      if (own && own.own)
        return h(
          "p",
          { className: "bl-live__address", key: "addr" },
          "New page · the address is made from its fields at the first save, and can't be changed later",
        );
    }
    return h(
      "p",
      { className: "bl-live__address", key: "addr" },
      shownAddress(V.other && V.pageId === "other" ? V.other.path : targetPath(t)) +
        " · " +
        suffix(),
    );
  }

  function pageTabs() {
    var tabs = tabsNow();
    var cur = currentTab();
    var all = tabs.slice();
    if (V.other)
      all.push({ id: "other", label: "Other page: " + V.other.path, target: V.other.target });
    if (V.width > 0 && V.width < OPTIONS.narrowPx) {
      var sid = "bl-live-page-select";
      return h(
        "div",
        { key: "pages", className: "bl-live__pagesel" },
        h("label", { htmlFor: sid }, "Page"),
        h(
          "select",
          {
            id: sid,
            value: cur ? cur.id : "",
            onChange: function (e) {
              setPage(e.target.value);
            },
          },
          all.map(function (t) {
            return h("option", { key: t.id, value: t.id }, t.label);
          }),
        ),
      );
    }
    return h(
      "div",
      {
        key: "pages",
        role: "tablist",
        "aria-label": "Page",
        className: "bl-live__pages",
        onKeyDown: onTabKeys,
      },
      all.map(function (t) {
        var on = !!cur && cur.id === t.id;
        return h(
          "button",
          {
            key: t.id,
            type: "button",
            role: "tab",
            className: "bl-live__page",
            "aria-selected": on ? "true" : "false",
            "aria-controls": "bl-live-site",
            tabIndex: on ? 0 : -1,
            onClick: function () {
              setPage(t.id);
            },
          },
          t.label,
        );
      }),
    );
  }

  function publishedButton() {
    var id = V.id;
    var t = currentTab();
    if (!id || !t) return null;
    var path = V.pageId === "other" && V.other ? V.other.path : targetPath(t.target);
    var saved = id.isNew ? null : baseData(id.collection, id.slug);
    var view = saved ? viewTarget(id.collection, id.slug, saved) : null;
    // The entry's own page is on the live site only if the SAVED entry has it:
    // turning on "Profile page" in the form shows the tab, but the page itself
    // appears only after Save (until then its address says "Page not found").
    var off =
      t.own &&
      (id.isNew ||
        (view && (view.state !== "live" || (view.path && view.path !== targetPath(t.target)))));
    if (off)
      return h(
        "button",
        { type: "button", className: "bl-btn", disabled: true, key: "pub" },
        "Not on the live site yet",
      );
    return btn(
      "Open the published page ↗",
      function () {
        openPublished(path);
      },
      { key: "pub", "aria-label": "Open the published page (" + t.label + ") in a new tab" },
    );
  }

  function avatar(v) {
    var a = v.author || {};
    if (a.avatarUrl)
      return h("img", {
        className: "bl-history__avatar",
        src: a.avatarUrl + (a.avatarUrl.indexOf("?") === -1 ? "?" : "&") + "s=64",
        alt: "",
        width: 32,
        height: 32,
      });
    var initials = String(a.name || a.login || "?")
      .split(/\s+/)
      .filter(Boolean)
      .map(function (w) {
        return w.charAt(0);
      })
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return h(
      "span",
      { className: "bl-history__avatar bl-history__avatar--initials", "aria-hidden": "true" },
      initials || "?",
    );
  }

  function historyPanel() {
    var id = V.id;
    var kids = [];
    var g = gh();
    if (mode() === "local")
      kids.push(
        h(
          "p",
          { key: "local", className: "bl-history__note" },
          "History is read from GitHub (" +
            (g && typeof g.repo === "function" ? g.repo() : "bobalabx/bobalab-web") +
            "), not from your computer.",
        ),
      );
    var path = id && !id.isNew ? pathOf(id.collection, id.slug) : null;
    if (!path) {
      kids.push(
        h(
          "p",
          { key: "empty", className: "bl-history__empty" },
          "No history yet. The first row appears when you save.",
        ),
      );
      return kids;
    }
    var st = histState(path);
    var fields = formFields();
    var nowData = formData();
    var collection = id.collection;
    if (st.error && !st.rows.length) {
      var e = st.error;
      var msg =
        e.kind === "auth"
          ? "Sign in again to see History."
          : e.kind === "rate"
            ? String(e.message || "GitHub is busy; try again later.")
            : e.kind === "network"
              ? "Couldn't reach GitHub."
              : String(e.message || "Couldn't read History.");
      kids.push(
        h(
          "div",
          { key: "error", className: "bl-history__error", role: "alert" },
          h("p", null, msg),
          e.kind === "auth"
            ? null
            : btn(
                "Try again",
                function () {
                  loadHistory(path, false);
                },
                { className: "bl-btn bl-btn--small" },
              ),
        ),
      );
      return kids;
    }
    if (!st.rows.length) {
      kids.push(
        h(
          "p",
          { key: "loading", className: "bl-history__empty" },
          st.loading
            ? "Loading the saved versions…"
            : st.stale
              ? "Loading the saved versions…"
              : "No saved versions on GitHub yet.",
        ),
      );
      return kids;
    }
    var items = [];
    if (hasChanged())
      items.push(
        h(
          "li",
          { key: "unsaved", className: "bl-history__unsaved" },
          "Your unsaved changes (not saved yet)",
        ),
      );
    var live = siteState.liveAt ? Date.parse(siteState.liveAt) : 0;
    st.rows.forEach(function (row, i) {
      var top = i === 0;
      var open = V.expanded === row.sha || (top && V.expanded === "top");
      var who = isMe(row.author && row.author.login)
        ? "You"
        : (row.author && row.author.name) || "Someone";
      var verb = rowVerb(path, i, fields);
      var notLive = live && Date.parse(row.date) > live;
      var meta = [
        h("time", { key: "t", dateTime: row.date, title: fullTime(row.date) }, timeAgo(row.date)),
        top ? h("span", { key: "cur", className: "bl-pill" }, "Current version") : null,
        notLive ? h("span", { key: "nl", className: "bl-chip" }, "Not live yet") : null,
      ];
      var rowBtn = h(
        "button",
        {
          type: "button",
          className: "bl-history__row",
          "aria-expanded": open ? "true" : "false",
          "data-sha": row.sha,
          onClick: function () {
            if (top) {
              V.expanded = open ? null : row.sha;
              bump();
              return;
            }
            selectVersion(path, row);
          },
        },
        avatar(row),
        h(
          "span",
          { className: "bl-history__text" },
          h("span", { className: "bl-history__line" }, h("strong", null, who), " " + verb),
          h("span", { className: "bl-history__meta" }, meta),
        ),
      );
      var detail = open ? historyDetail(path, row, i, fields, nowData, collection) : null;
      items.push(
        h(
          "li",
          { key: row.sha, className: "bl-history__item" + (top ? " bl-history__item--top" : "") },
          rowBtn,
          detail,
        ),
      );
    });
    kids.push(
      h(
        "ol",
        {
          key: "list",
          className: "bl-history__list",
          "aria-label": "Saved versions, newest first",
        },
        items,
      ),
    );
    if (st.hasMore)
      kids.push(
        btn(
          st.loading ? "Loading…" : "Show older saves",
          function () {
            loadHistory(path, true);
          },
          { key: "more", className: "bl-btn bl-history__more", disabled: st.loading },
        ),
      );
    if (st.error && st.rows.length)
      kids.push(
        h(
          "p",
          { key: "err2", className: "bl-history__note", role: "alert" },
          String(st.error.message || "Couldn't read more of History."),
        ),
      );
    return kids;
  }

  function historyDetail(path, row, i, fields, nowData, collection) {
    var st = histState(path);
    var sum = st.summary[row.sha];
    var kids = [];
    if (row.kind === "maintainer")
      kids.push(h("p", { key: "s", className: "bl-history__subject" }, "“" + row.subject + "”"));
    if (sum && sum.ok && sum.after) {
      var lines = changeLines(sum.before, sum.after, fields, nowData, collection);
      kids.push(
        lines.length
          ? h(
              "ul",
              { key: "c", className: "bl-history__changes" },
              lines.map(function (l, n) {
                return h("li", { key: n }, l);
              }),
            )
          : h("p", { key: "c", className: "bl-history__note" }, "No change to the content."),
      );
    } else if (i < OPTIONS.summaryRows && !sum)
      kids.push(h("p", { key: "c", className: "bl-history__note" }, "Loading what changed…"));
    else
      kids.push(
        h(
          "p",
          { key: "c", className: "bl-history__note" },
          "The list of changes isn't shown for this save.",
        ),
      );
    var actions = [];
    if (i === 0) {
      var created = row.kind === "create" || (sum && sum.ok && sum.before === null);
      if (created)
        kids.push(
          h(
            "p",
            { key: "adv", className: "bl-history__note" },
            collection === "people"
              ? "To take it off the site, turn off “Listed” and Save."
              : "To take it off the site, set " + VISIBLE + " to No and Save.",
          ),
        );
      else if (row.parentSha)
        actions.push(
          btn(
            "Undo this change",
            function () {
              restoreVersion({
                path: path,
                sha: st.rows[1] ? st.rows[1].sha : row.parentSha,
                save: true,
                source: "history",
              }).then(null, function (e) {
                noteBand([
                  "Couldn't undo: " + String((e && e.message) || "something went wrong") + ".",
                ]);
              });
            },
            {
              key: "undo",
              className: "bl-btn bl-btn--primary bl-btn--small",
              "data-undo": "",
              "aria-label":
                "Undo this change: go back to " +
                (st.rows[1]
                  ? "the version from " + fullTime(st.rows[1].date, false)
                  : "the version before it"),
            },
          ),
        );
    } else {
      actions.push(
        btn(
          "Restore this version",
          function () {
            restoreVersion({ path: path, sha: row.sha, save: true, source: "history" }).then(
              null,
              function (e) {
                noteBand([
                  "Couldn't restore: " + String((e && e.message) || "something went wrong") + ".",
                ]);
              },
            );
          },
          {
            key: "restore",
            className: "bl-btn bl-btn--primary bl-btn--small",
            "aria-label": "Restore the version from " + fullTime(row.date, false),
          },
        ),
      );
      actions.push(
        btn(
          "Show it in the preview",
          function () {
            selectVersion(path, row);
          },
          {
            key: "show",
            className: "bl-btn bl-btn--small",
            "aria-label": "Show the version from " + fullTime(row.date, false) + " in the preview",
          },
        ),
      );
    }
    if (row.url)
      actions.push(
        btn(
          "Open on github.com ↗",
          function () {
            var w = root.top || root;
            safe(function () {
              w.open(row.url, "_blank", "noopener");
            });
          },
          { key: "gh", className: "bl-btn bl-btn--small bl-btn--quiet" },
        ),
      );
    kids.push(h("div", { key: "a", className: "bl-history__actions" }, actions));
    return h("div", { className: "bl-history__detail" }, kids);
  }

  function statusLine() {
    var l = V.latest;
    if (!l || !l.version || !V.id || V.id.isNew) return null;
    var v = l.version;
    var who = isMe(v.author && v.author.login) ? "you" : (v.author && v.author.name) || "someone";
    return h(
      "button",
      {
        type: "button",
        className: "bl-live__status",
        key: "status",
        onClick: function () {
          setTab("history");
        },
      },
      "Last saved by " + who + " · " + timeAgo(v.date),
    );
  }

  function loadLatest() {
    var id = V.id;
    var h0 = hist();
    if (!id || id.isNew || mode() === "local" || !h0 || typeof h0.latest !== "function") return;
    var path = pathOf(id.collection, id.slug);
    if (!path) return;
    h0.latest(path).then(
      function (v) {
        if (!V.id || pathOf(V.id.collection, V.id.slug) !== path) return;
        V.latest = { path: path, version: v };
        bump();
      },
      function () {},
    );
  }

  function clipRef(el) {
    V.clip = el;
  }

  function renderColumn() {
    var id = V.id;
    var live = V.tab === "live";
    var device = effectiveDevice(V.device, V.width);
    var row1 = h(
      "div",
      { className: "bl-live__row1", key: "row1" },
      h(
        "div",
        {
          role: "tablist",
          "aria-label": "Right column",
          className: "bl-live__tabs",
          onKeyDown: onTabKeys,
        },
        h(
          "button",
          {
            type: "button",
            role: "tab",
            id: "bl-live-tab-live",
            className: "bl-live__tab",
            "aria-selected": live ? "true" : "false",
            "aria-controls": "bl-live-panel-live",
            tabIndex: live ? 0 : -1,
            onClick: function () {
              setTab("live");
            },
          },
          "Live preview",
        ),
        h(
          "button",
          {
            type: "button",
            role: "tab",
            id: "bl-live-tab-history",
            className: "bl-live__tab",
            "aria-selected": live ? "false" : "true",
            "aria-controls": "bl-live-panel-history",
            tabIndex: live ? -1 : 0,
            onClick: function () {
              setTab("history");
            },
          },
          "History",
        ),
      ),
      live
        ? h(
            "div",
            { className: "bl-live__tools" },
            h(
              "div",
              { role: "group", "aria-label": "Preview width", className: "bl-live__device" },
              btn(
                "Desktop",
                function () {
                  setDevice("desktop");
                },
                { "aria-pressed": device === "desktop" ? "true" : "false", key: "d" },
              ),
              btn(
                "Phone",
                function () {
                  setDevice("phone");
                },
                { "aria-pressed": device === "phone" ? "true" : "false", key: "p" },
              ),
            ),
            btn(
              "Find my entry",
              function () {
                if (V.ready) post({ type: "bobalab:find", v: V1 });
              },
              { key: "find" },
            ),
            publishedButton(),
          )
        : null,
    );
    var row2 = h(
      "div",
      { className: "bl-live__row2", key: "row2" },
      id ? pageTabs() : null,
      V.pageId === "other" && V.other
        ? btn(
            "Back to " + ((tabsNow()[0] || {}).label || "the entry"),
            function () {
              setPage(tabsNow()[0] ? tabsNow()[0].id : null);
            },
            { key: "back", className: "bl-btn bl-btn--small" },
          )
        : null,
      addressLine(),
      h(
        "label",
        { key: "visitor", className: "bl-live__visitor" },
        h("input", {
          type: "checkbox",
          checked: V.visitor,
          onChange: function (e) {
            setVisitor(e.target.checked);
          },
        }),
        " Show as visitors see it",
      ),
    );
    return h(
      "div",
      { className: "bl-live", "data-tab": V.tab, "data-device": device },
      h(
        "div",
        { className: "bl-live__bar", key: "bar" },
        btn("Back to the form", focusForm, { className: "bl-btn bl-live__skip", key: "skip" }),
        row1,
        statusLine(),
      ),
      h(
        "div",
        { className: "bl-live__main", key: "main" },
        h(
          "div",
          {
            id: "bl-live-panel-live",
            role: "tabpanel",
            "aria-labelledby": "bl-live-tab-live",
            className: "bl-live__panel",
            key: "panel-live",
            inert: live ? undefined : true,
            "aria-hidden": live ? undefined : "true",
          },
          row2,
          h("div", { className: "bl-live__bands", key: "bands" }, bandsNow()),
          h("div", {
            className: "bl-live__clip",
            key: "clip",
            id: "bl-live-site",
            ref: clipRef,
            "data-device": device,
          }),
        ),
        h(
          "div",
          {
            id: "bl-live-panel-history",
            role: "tabpanel",
            "aria-labelledby": "bl-live-tab-history",
            className: "bl-live__history",
            key: "panel-history",
            hidden: live,
          },
          live ? null : historyPanel(),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // The template's life cycle

  function resetEntry() {
    V.tab = "live";
    V.pageId = null;
    V.other = null;
    V.older = null;
    V.expanded = null;
    V.rendered = null;
    V.latest = null;
    V.bands = { conflict: null, merge: null, restoreBlocked: null, notes: null };
    V.target = null;
  }

  function measure() {
    var c = V.clip;
    if (!c) return;
    var r = safe(function () {
      return c.getBoundingClientRect();
    }, null);
    if (!r) return;
    var narrowBefore = V.width > 0 && V.width < OPTIONS.narrowPx;
    var deviceBefore = effectiveDevice(V.device, V.width);
    V.width = r.width;
    V.height = r.height;
    applyScale();
    if (
      narrowBefore !== (V.width > 0 && V.width < OPTIONS.narrowPx) ||
      deviceBefore !== effectiveDevice(V.device, V.width)
    )
      bump();
  }

  function mount(comp) {
    var props = comp.props || {};
    V.comp = comp;
    V.win = props.window || null;
    V.doc = props.document || null;
    V.entry = props.entry || null;
    V.id = identityOf(V.entry);
    V.handledKey = V.id ? V.id.key : null;
    V.info = editorInfo();
    V.ready = false;
    V.baseSent = 0;
    V.assetsKey = "{}";
    V.assets = {};
    V.device = storageGet("localStorage", DEVICE_KEY);
    V.visitor = storageGet("sessionStorage", VISITOR_KEY) === "1";
    rememberLoader(props.getCollection);
    hookSaves();
    var d = V.doc;
    if (d && V.clip && typeof d.createElement === "function") {
      var f = d.createElement("iframe");
      f.className = "bl-live__site";
      f.setAttribute("title", "Site preview");
      f.src = previewSrc();
      V.clip.appendChild(f);
      V.frame = f;
      frameTitle();
    }
    var w = V.win;
    if (w && typeof w.addEventListener === "function") {
      w.addEventListener("message", onMessage);
      V.offs.push(function () {
        w.removeEventListener("message", onMessage);
      });
      var RO = w.ResizeObserver || root.ResizeObserver;
      if (typeof RO === "function" && V.clip) {
        // Measure on the next frame, not inside the observer: measure() can
        // re-render the bar (tabs → "Page" menu), which resizes the observed box
        // again, and WebKit reports that as an error ("ResizeObserver loop
        // completed with undelivered notifications", MEASURED in cms-save.spec).
        var raf = w.requestAnimationFrame || root.requestAnimationFrame;
        var caf = w.cancelAnimationFrame || root.cancelAnimationFrame;
        var queued = 0;
        var ro = new RO(function () {
          if (typeof raf !== "function") return measure();
          if (queued) return;
          queued = raf.call(w, function () {
            queued = 0;
            measure();
          });
        });
        ro.observe(V.clip);
        V.offs.push(function () {
          ro.disconnect();
          if (queued && typeof caf === "function") caf.call(w, queued);
          queued = 0;
        });
      }
    }
    measure();
    var ed = editor();
    if (ed && typeof ed.onEditorChange === "function") {
      var off = safe(function () {
        return ed.onEditorChange(function (e) {
          var before = V.info;
          V.info = e && e.collection ? e : null;
          var changedNow = !!(V.info && V.info.hasChanged) !== !!(before && before.hasChanged);
          if (changedNow) {
            frameTitle();
            bump();
          }
        });
      }, null);
      if (typeof off === "function") V.offs.push(off);
    }
    var onFocus = function () {
      freshCheck(false);
    };
    if (typeof root.addEventListener === "function") {
      root.addEventListener("focus", onFocus);
      V.offs.push(function () {
        root.removeEventListener("focus", onFocus);
      });
    }
    var every = root.setInterval
      ? root.setInterval(function () {
          freshCheck(true);
        }, OPTIONS.freshEveryMs)
      : null;
    if (every !== null)
      V.offs.push(function () {
        root.clearInterval(every);
      });
    V.freshAt = 0;
    ensureBase();
    loadLatest();
    syncAssets();
    openIntent();
    bump();
  }

  function update(comp, prevProps) {
    var props = comp.props || {};
    rememberLoader(props.getCollection);
    if (props.entry === (prevProps && prevProps.entry)) return;
    // render() has already taken the new entry (V.entry, V.id).
    var key = V.id ? V.id.key : null;
    if (key !== V.handledKey) {
      V.handledKey = key;
      resetEntry();
      loadLatest();
      openIntent();
      bump();
    } else if (V.older) {
      // The form changed: the preview shows the form again.
      V.older = null;
      bump();
    }
    syncAssets();
    scheduleOverlay();
    frameTitle();
    if (BASE.stale || (BASE.data && Date.now() - BASE.at > OPTIONS.baseMaxAgeMs)) ensureBase();
  }

  function unmount(comp) {
    if (V.comp !== comp) return;
    V.offs.forEach(function (f) {
      safe(f);
    });
    V.offs = [];
    if (V.timer !== null) root.clearTimeout(V.timer);
    V.timer = null;
    V.comp = null;
    V.frame = null;
    V.clip = null;
    V.win = null;
    V.doc = null;
    V.ready = false;
    V.baseSent = 0;
  }

  /** Decap re-renders the preview on every store change: only these matter. */
  function shouldUpdate(props, state, nextProps, nextState) {
    return (
      nextProps.entry !== props.entry ||
      nextProps.fieldsMetaData !== props.fieldsMetaData ||
      nextState !== state
    );
  }

  var COLUMN = {
    displayName: "BobalabLiveColumn",
    getInitialState: function () {
      return { n: 0 };
    },
    shouldComponentUpdate: function (nextProps, nextState) {
      return shouldUpdate(this.props || {}, this.state, nextProps || {}, nextState);
    },
    componentDidMount: function () {
      mount(this);
    },
    componentDidUpdate: function (prevProps) {
      update(this, prevProps);
    },
    componentWillUnmount: function () {
      unmount(this);
    },
    render: function () {
      var props = this.props || {};
      if (!V.comp || V.comp === this) {
        // The bar always shows the entry as it is now (render runs before componentDidUpdate).
        V.entry = props.entry || null;
        V.id = identityOf(V.entry);
      }
      if (!V.comp) resetEntry(); // a new editor starts on the live preview, with nothing selected
      if (typeof props.getCollection === "function") {
        rememberLoader(props.getCollection);
        var hk = hooks();
        if (hk && typeof hk.rememberCollectionLoader === "function")
          safe(function () {
            hk.rememberCollectionLoader(props.getCollection);
          });
      }
      return renderColumn();
    },
  };

  // ---------------------------------------------------------------------------
  // API and registration

  var api = {
    current: current,
    whenReady: whenReady,
    checkSave: checkSave,
    parse: parse,
    viewTarget: viewTarget,
    formatIssue: formatIssue,
    // For cms-save.js and cms-dock.js: the same names for entries everywhere.
    issueEntry: issueEntry,
    savedEntryName: savedEntryName,
    openHistory: openHistory,
    restoreVersion: restoreVersion,
    mergeLatest: mergeLatest,
    PAGE_MAP: PAGE_MAP,
    ONE_WAY_FIELDS: ONE_WAY_FIELDS,
    PERSONAL_FIELDS: PERSONAL_FIELDS,
    ISSUE_TEXT: ISSUE_TEXT,
    TEMPLATES: TEMPLATES,
    // For tests
    _buildRestorePatch: buildRestorePatch,
    _merge3: merge3,
    _applyPatches: applyPatches,
    _deviceBox: deviceBox,
    _effectiveDevice: effectiveDevice,
    _tabsFor: tabsFor,
    _overlayMessage: overlayMessage,
    _identityOf: identityOf,
    _assetCandidates: assetCandidates,
    _assetsMap: assetsMap,
    _publicPathOf: publicPathOf,
    _emptyFor: emptyFor,
    _maskFor: maskFor,
    _consentSummary: consentSummary,
    _colourUse: colourUse,
    _shouldUpdate: shouldUpdate,
    _column: COLUMN,
    _receive: receive,
    _state: V,
    _base: BASE,
    _history: HIST,
    _options: OPTIONS,
    _loadBase: loadBase,
    _rememberLoader: rememberLoader,
    _selectVersion: selectVersion,
    _loadHistory: loadHistory,
    _rowVerb: rowVerb,
    _bands: bandsNow,
    _render: renderColumn,
  };
  root.BobalabLive = api;

  var cms = root.CMS;
  if (!cms || typeof cms.registerPreviewTemplate !== "function" || typeof root.h !== "function")
    return;
  var make = root.createClass;
  if (typeof make !== "function") return;
  var LiveColumn = make(COLUMN);
  api._LiveColumn = LiveColumn;
  if (typeof cms.registerPreviewStyle === "function") {
    var d = root.document;
    var baseUri = (d && d.baseURI) || root.location.href;
    cms.registerPreviewStyle(new URL("live.css", baseUri).href);
  }
  TEMPLATES.forEach(function (name) {
    cms.registerPreviewTemplate(name, LiveColumn);
  });
})(typeof window !== "undefined" ? window : globalThis);
