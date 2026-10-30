/*
 * BOBALAB CMS: saved versions of an entry, read from GitHub (editor v2, WP3;
 * spec §4.1). Loaded by /admin/ after cms-github.js; sets window.BobalabHistory.
 *
 * Every Save is one commit on main (Decap's simple mode). This file reads those
 * commits through BobalabGitHub (GET only) and turns them into plain records:
 *
 *  - versions(path) / latest(path): the commits that changed one file, newest
 *    first, as Version = {sha, parentSha, date, author: {login, name,
 *    avatarUrl}, subject, kind, url}. kind comes from the commit message that
 *    Decap writes (cms-data.js commit_messages; Interfaces §3), tested in this
 *    order: Upload/Delete file → upload, delete-file; Add/Edit/Delete →
 *    create, edit, delete; Decap's own defaults; the deploy's published-slugs
 *    commit → system; anything else → maintainer ("changed outside the
 *    content manager").
 *  - textAt(path, sha): the file's text at a version, kept for good in memory
 *    and in sessionStorage "bobalab.gh.text.v1" (at most 2 MB, oldest dropped).
 *  - fileAtMain, treeCount, uploadPaths: the files on main today.
 *  - mine(): the commit of the editor's own save (the dock waits for it).
 *  - recent(): every content and upload commit, for "Recent changes".
 *  - diff(), display(), sameData(): what changed between two parsed versions,
 *    in words. The values are never shown when the caller passes a mask
 *    ("Email: changed (hidden: Email public is off)").
 *
 * tests/unit/cms/history.test.ts runs this file in a sandbox against recorded
 * GitHub answers (tests/fixtures/github/).
 */
(function (root) {
  "use strict";

  var TEXT_KEY = "bobalab.gh.text.v1";
  var TEXT_MAX = 2 * 1024 * 1024; // characters of the stored JSON
  var LATEST_TTL = 15000;
  var UPLOADS_TTL = 60000;
  var MINE_SLACK = 120000; // clocks differ: a commit may carry a time up to 2 min before the click

  // Used only until cms-data.js carries `collections` (WP5); the same shape.
  var DEFAULT_COLLECTIONS = [
    {
      name: "news",
      label: "News",
      labelSingular: "News item",
      folder: "content/news",
      extension: "md",
    },
    {
      name: "publications",
      label: "Publications",
      labelSingular: "Publication",
      folder: "content/publications",
      extension: "md",
    },
    {
      name: "people",
      label: "People",
      labelSingular: "Person",
      folder: "content/people",
      extension: "md",
    },
    {
      name: "directions",
      label: "Research directions",
      labelSingular: "Research direction",
      folder: "content/directions",
      extension: "md",
    },
    {
      name: "projects",
      label: "Projects",
      labelSingular: "Project",
      folder: "content/projects",
      extension: "md",
    },
    {
      name: "opportunities",
      label: "Opportunities",
      labelSingular: "Opportunity",
      folder: "content/opportunities",
      extension: "md",
    },
    {
      name: "pages",
      label: "Pages",
      files: [
        { name: "home", label: "Home page", file: "content/pages/home.yml" },
        { name: "join", label: "Join the lab", file: "content/pages/join.yml" },
        { name: "about", label: "About", file: "content/pages/about.yml" },
        {
          name: "accessibility",
          label: "Accessibility statement",
          file: "content/pages/accessibility.yml",
        },
        { name: "privacy", label: "Privacy statement", file: "content/pages/privacy.yml" },
      ],
    },
    {
      name: "settings",
      label: "Settings",
      files: [{ name: "site", label: "Site", file: "content/site.yml" }],
    },
  ];

  function gh() {
    var g = root.BobalabGitHub;
    if (!g) throw new Error("cms-github.js must load before cms-history.js");
    return g;
  }

  function cfg() {
    return root.BOBALAB_CMS || {};
  }

  function collections() {
    var c = cfg().collections;
    return Array.isArray(c) && c.length ? c : DEFAULT_COLLECTIONS;
  }

  function byName(name) {
    var list = collections();
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return null;
  }

  /** The collection a commit message names: its singular label, its label or its name. */
  function byLabel(label) {
    var list = collections();
    var l = String(label || "").trim();
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.labelSingular === l || c.label_singular === l || c.label === l || c.name === l)
        return c;
    }
    return null;
  }

  function trimSlash(s) {
    return String(s || "").replace(/\/+$/, "");
  }

  /** The repository path of an entry: "content/news/<slug>.md", "content/site.yml"; null if unknown. */
  function pathOf(collection, slug) {
    var c = byName(collection);
    if (!c || !slug) return null;
    if (c.files) {
      for (var i = 0; i < c.files.length; i++) if (c.files[i].name === slug) return c.files[i].file;
      return null;
    }
    if (!c.folder) return null;
    return trimSlash(c.folder) + "/" + slug + "." + String(c.extension || "md").replace(/^\./, "");
  }

  /**
   * {collection, slug, label, name, text, path} for an entry. label: "News item"
   * (folder collections) or the file's own label ("Home page"); name: News item
   * “2026-10-07-x” (for sentences); text: "News item › 2026-10-07-x" (for lists).
   */
  function entryRef(c, slug) {
    if (!c || !slug) return null;
    if (c.files) {
      var f = null;
      for (var i = 0; i < c.files.length; i++) if (c.files[i].name === slug) f = c.files[i];
      var fileLabel = (f && f.label) || slug;
      return {
        collection: c.name,
        slug: slug,
        label: fileLabel,
        name: c.label + " “" + fileLabel + "”",
        text: c.label + " › " + fileLabel,
        path: f ? f.file : null,
      };
    }
    var label = c.labelSingular || c.label_singular || c.label || c.name;
    return {
      collection: c.name,
      slug: slug,
      label: label,
      name: label + " “" + slug + "”",
      text: label + " › " + slug,
      path: pathOf(c.name, slug),
    };
  }

  /** The entry a repository path belongs to, or null ("content/news/x.md" → news/x). */
  function entryOfPath(path) {
    var p = String(path || "");
    var list = collections();
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.files) {
        for (var j = 0; j < c.files.length; j++)
          if (c.files[j].file === p) return entryRef(c, c.files[j].name);
      } else if (c.folder) {
        var dir = trimSlash(c.folder) + "/";
        var ext = "." + String(c.extension || "md").replace(/^\./, "");
        if (p.indexOf(dir) === 0 && p.slice(-ext.length) === ext) {
          var slug = p.slice(dir.length, -ext.length);
          if (slug && slug.indexOf("/") === -1) return entryRef(c, slug);
        }
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Commit messages → kinds (Interfaces §3; the order matters: "Delete file “…”"
  // would also match the entry pattern).

  var RE_MEDIA = /^(Upload|Delete file) “([^”]+)” \(by @([A-Za-z0-9-]+)\)$/;
  var RE_ENTRY = /^(Add|Edit|Delete) (.+) “([^”]+)” \(by @([A-Za-z0-9-]+)\)$/;
  var RE_DECAP = /^(Create|Update|Delete) (.+) “([^”]+)”$/;
  var RE_DECAP_MEDIA = /^(Upload|Delete) “([^”]+)”$/; // Decap's default media messages
  var RE_SYSTEM = /published[ -]slugs/i;
  var ENTRY_KIND = {
    Add: "create",
    Create: "create",
    Edit: "edit",
    Update: "edit",
    Delete: "delete",
  };

  /** {kind, subject, login?, path?, entry?} from a commit message (its first line). */
  function parseSubject(message) {
    var subject = String(message || "")
      .split("\n")[0]
      .trim();
    var m;
    if ((m = RE_MEDIA.exec(subject))) {
      return {
        kind: m[1] === "Upload" ? "upload" : "delete-file",
        subject: subject,
        path: m[2],
        login: m[3],
      };
    }
    m = RE_ENTRY.exec(subject) || RE_DECAP.exec(subject);
    if (m) {
      var c = byLabel(m[2]);
      return {
        kind: ENTRY_KIND[m[1]],
        subject: subject,
        login: m[4] || null,
        entry: c ? entryRef(c, m[3]) : null,
        collectionLabel: m[2],
        slug: m[3],
      };
    }
    if ((m = RE_DECAP_MEDIA.exec(subject))) {
      return {
        kind: m[1] === "Upload" ? "upload" : "delete-file",
        subject: subject,
        path: m[2],
        login: null,
      };
    }
    if (RE_SYSTEM.test(subject)) return { kind: "system", subject: subject };
    return { kind: "maintainer", subject: subject };
  }

  function repoUrl() {
    return "https://github.com/" + gh().repo();
  }

  /** A GitHub commit (REST "commits" row) → Version. */
  function toVersion(c) {
    var commit = (c && c.commit) || {};
    var ca = commit.author || {};
    var top = c && c.author && c.author.login ? c.author : null;
    var parsed = parseSubject(commit.message);
    var login = top ? top.login : parsed.login || null;
    return {
      sha: c.sha,
      parentSha: c.parents && c.parents[0] ? c.parents[0].sha : null,
      date: (commit.committer && commit.committer.date) || ca.date || null,
      author: {
        login: login,
        name: ca.name || login || "Someone",
        avatarUrl: top && top.avatar_url ? top.avatar_url : null,
      },
      subject: parsed.subject,
      kind: parsed.kind,
      url: c.html_url || repoUrl() + "/commit/" + c.sha,
    };
  }

  /** Version plus the entry or upload it is about, for "Recent changes". */
  function toChange(c) {
    var v = toVersion(c);
    var parsed = parseSubject((c.commit || {}).message);
    v.entry = parsed.entry || null;
    if (parsed.path) v.uploadPath = parsed.path;
    return v;
  }

  function commitsUrl(path, page, perPage) {
    return (
      "/repos/" +
      gh().repo() +
      "/commits?sha=" +
      encodeURIComponent(gh().branch()) +
      "&path=" +
      encodeURIComponent(path) +
      "&per_page=" +
      perPage +
      "&page=" +
      page
    );
  }

  function listCommits(path, page, perPage, map) {
    return gh()
      .get(commitsUrl(path, page, perPage))
      .then(function (r) {
        var rows = Array.isArray(r.data) ? r.data : [];
        return { rows: rows.map(map || toVersion), hasMore: !!(r.link && r.link.next) };
      });
  }

  var latestMemo = {}; // path → {at, value}

  /** The versions of one file, newest first: {rows: Version[], hasMore}. */
  function versions(path, opts) {
    opts = opts || {};
    var page = opts.page || 1;
    return listCommits(path, page, opts.perPage || 30).then(function (r) {
      if (page === 1) latestMemo[path] = { at: Date.now(), value: r.rows[0] || null };
      return r;
    });
  }

  /** The newest version of one file (null: the file has no commits on main). */
  function latest(path, opts) {
    var memo = latestMemo[path];
    if (!(opts && opts.fresh) && memo && Date.now() - memo.at < LATEST_TTL)
      return Promise.resolve(memo.value);
    return listCommits(path, 1, 1).then(function (r) {
      var v = r.rows[0] || null;
      latestMemo[path] = { at: Date.now(), value: v };
      return v;
    });
  }

  // ---------------------------------------------------------------------------
  // File text at a version (kept for good: a version never changes)

  var texts = new Map(); // "path@sha" → string | null
  var store = null; // the sessionStorage copy: {keys: [...oldest first], items: {key: text|null}}

  function loadStore() {
    if (store) return store;
    store = { keys: [], items: {} };
    try {
      var raw = root.sessionStorage && root.sessionStorage.getItem(TEXT_KEY);
      var s = raw ? JSON.parse(raw) : null;
      if (s && Array.isArray(s.keys) && s.items && typeof s.items === "object") store = s;
    } catch {
      // unreadable or blocked storage: memory only
    }
    return store;
  }

  function saveStore() {
    try {
      if (!root.sessionStorage) return;
      var json = JSON.stringify(store);
      while (json.length > TEXT_MAX && store.keys.length) {
        delete store.items[store.keys.shift()];
        json = JSON.stringify(store);
      }
      root.sessionStorage.setItem(TEXT_KEY, json);
    } catch {
      // storage full or blocked: drop the older half once, else keep memory only
      try {
        store.keys.splice(0, Math.ceil(store.keys.length / 2)).forEach(function (k) {
          delete store.items[k];
        });
        root.sessionStorage.setItem(TEXT_KEY, JSON.stringify(store));
      } catch {
        // give up quietly
      }
    }
  }

  function cachedText(key) {
    if (texts.has(key)) return { hit: true, value: texts.get(key) };
    var s = loadStore();
    if (Object.prototype.hasOwnProperty.call(s.items, key)) {
      var v = s.items[key];
      texts.set(key, v);
      s.keys = s.keys.filter(function (k) {
        return k !== key;
      });
      s.keys.push(key);
      return { hit: true, value: v };
    }
    return { hit: false };
  }

  function keepText(key, value) {
    texts.set(key, value);
    var s = loadStore();
    if (typeof value === "string" && value.length > TEXT_MAX / 4) return; // too big to keep in the tab
    s.keys = s.keys.filter(function (k) {
      return k !== key;
    });
    s.keys.push(key);
    s.items[key] = value;
    saveStore();
  }

  function contentsUrl(path, ref) {
    return (
      "/repos/" +
      gh().repo() +
      "/contents/" +
      gh().encodePath(path) +
      "?ref=" +
      encodeURIComponent(ref)
    );
  }

  function rawText(path, ref) {
    return gh()
      .get(contentsUrl(path, ref), { accept: "raw" })
      .then(
        function (r) {
          return typeof r.data === "string" ? r.data : r.data === null ? "" : String(r.data);
        },
        function (e) {
          if (e && e.kind === "not-found") return null;
          throw e;
        },
      );
  }

  /** The file's text at commit `sha`, or null when the file did not exist there. */
  function textAt(path, sha) {
    if (!path || !sha) return Promise.resolve(null);
    var key = path + "@" + sha;
    var c = cachedText(key);
    if (c.hit) return Promise.resolve(c.value);
    return rawText(path, sha).then(function (t) {
      keepText(key, t);
      return t;
    });
  }

  /** The file's text on main now (not kept), or null when it is not there. */
  function fileAtMain(path) {
    return rawText(path, gh().branch());
  }

  function tree(folder, recursive) {
    return gh()
      .get(
        "/repos/" +
          gh().repo() +
          "/git/trees/" +
          encodeURIComponent(gh().branch()) +
          ":" +
          gh().encodePath(trimSlash(folder)) +
          (recursive ? "?recursive=1" : ""),
      )
      .then(
        function (r) {
          return (r.data && Array.isArray(r.data.tree) && r.data.tree) || [];
        },
        function (e) {
          if (e && e.kind === "not-found") return [];
          throw e;
        },
      );
  }

  /** How many files with this extension the folder holds on main (".md"; 0 if it is missing). */
  function treeCount(folder, ext) {
    var e = String(ext || "");
    if (e && e.charAt(0) !== ".") e = "." + e;
    e = e.toLowerCase();
    return tree(folder, false).then(function (items) {
      return items.filter(function (it) {
        return it.type === "blob" && (!e || String(it.path).toLowerCase().slice(-e.length) === e);
      }).length;
    });
  }

  var uploadsMemo = null;

  /** The public paths of every upload on main ("/uploads/people/x.jpg"), as a Set. */
  function uploadPaths(opts) {
    if (!(opts && opts.fresh) && uploadsMemo && Date.now() - uploadsMemo.at < UPLOADS_TTL)
      return Promise.resolve(uploadsMemo.value);
    var media = cfg().media || {};
    var folder = trimSlash(media.folder || "public/uploads");
    var pub = trimSlash(media.publicFolder || "/uploads");
    return tree(folder, true).then(function (items) {
      var set = new Set();
      items.forEach(function (it) {
        if (it.type === "blob") set.add(pub + "/" + it.path);
      });
      uploadsMemo = { at: Date.now(), value: set };
      return set;
    });
  }

  function toMs(x) {
    if (x === null || x === undefined || x === "") return 0;
    if (typeof x === "number") return x;
    var t = Date.parse(String(x));
    return isNaN(t) ? 0 : t;
  }

  /**
   * The editor's own save of `path`: the newest of the last 5 commits that the
   * signed-in `login` made, that is not `notSha` (one SHA or a list: the version
   * the editor started from) and not older than `since` (2 min of clock slack).
   */
  function mine(o) {
    o = o || {};
    var not = [].concat(o.notSha || []).filter(Boolean);
    var since = toMs(o.since);
    var login = String(o.login || "").toLowerCase();
    if (!o.path || !login) return Promise.resolve(null);
    return listCommits(o.path, 1, 5).then(function (r) {
      for (var i = 0; i < r.rows.length; i++) {
        var v = r.rows[i];
        if (String(v.author.login || "").toLowerCase() !== login) continue;
        if (not.indexOf(v.sha) !== -1) continue;
        if (since && toMs(v.date) < since - MINE_SLACK) continue;
        return v;
      }
      return null;
    });
  }

  /**
   * Every save to the website, newest first: commits that changed content/ or
   * the uploads folder, merged (a commit that touched both appears once).
   * Commits that changed only code never appear. {rows: Change[], hasMore}.
   */
  function recent(opts) {
    opts = opts || {};
    var page = opts.page || 1;
    var perPage = opts.perPage || 30;
    var media = cfg().media || {};
    return Promise.all([
      listCommits("content", page, perPage, toChange),
      listCommits(trimSlash(media.folder || "public/uploads"), page, perPage, toChange),
    ]).then(function (lists) {
      var seen = {};
      var rows = [];
      lists[0].rows.concat(lists[1].rows).forEach(function (r) {
        if (seen[r.sha]) return;
        seen[r.sha] = true;
        rows.push(r);
      });
      rows.sort(function (a, b) {
        return toMs(b.date) - toMs(a.date);
      });
      return { rows: rows, hasMore: lists[0].hasMore || lists[1].hasMore };
    });
  }

  // ---------------------------------------------------------------------------
  // Comparing parsed versions

  function isObj(v) {
    return !!v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
  }

  /**
   * The data as the site reads it: trimmed text; empty text, empty lists, empty
   * objects, null and false dropped (the content schema's defaults); keys sorted.
   * Decap rewrites the YAML of every file it saves, so the text of two equal
   * versions rarely matches; their normalised data does.
   */
  function normalize(v) {
    if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v.toISOString();
    if (typeof v === "string") {
      var s = v.trim();
      return s === "" ? undefined : s;
    }
    if (Array.isArray(v)) {
      var arr = [];
      v.forEach(function (x) {
        var n = normalize(x);
        if (n !== undefined) arr.push(n);
      });
      return arr.length ? arr : undefined;
    }
    if (isObj(v)) {
      var o = {};
      Object.keys(v)
        .sort()
        .forEach(function (k) {
          var n = normalize(v[k]);
          if (n !== undefined) o[k] = n;
        });
      return Object.keys(o).length ? o : undefined;
    }
    if (v === null || v === undefined || v === false) return undefined;
    if (typeof v === "number" && isNaN(v)) return undefined;
    return v;
  }

  function same(a, b) {
    return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
  }

  /** Do two parsed versions hold the same data (for "restored the version from …")? */
  function sameData(a, b) {
    return same(a || {}, b || {});
  }

  /** Top-level fields to compare: the form's fields in order, then any other keys. */
  function fieldList(fields, a, b) {
    var out = [];
    var seen = {};
    (Array.isArray(fields) ? fields : []).forEach(function (f) {
      if (!f || !f.name || seen[f.name]) return;
      seen[f.name] = true;
      out.push(f);
    });
    [a, b].forEach(function (d) {
      if (!isObj(d)) return;
      Object.keys(d).forEach(function (k) {
        if (seen[k]) return;
        seen[k] = true;
        out.push({ name: k, label: k });
      });
    });
    return out;
  }

  var LONG = { markdown: true, richtext: true };
  var SHOW_MAX = 80;

  /** A short value for a sentence, or null when it is too long or too nested to show. */
  function show(v, f) {
    if (f && LONG[f.widget]) return null;
    if (v === true) return "on";
    if (v === false) return "off";
    if (typeof v === "number") return String(v);
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
    if (typeof v === "string") {
      var s = v.replace(/\s+/g, " ").trim();
      return s.length > SHOW_MAX ? null : s;
    }
    if (Array.isArray(v)) {
      var simple = v.every(function (x) {
        return typeof x === "string" || typeof x === "number";
      });
      if (simple) {
        var j = v.join(", ");
        return j.length > SHOW_MAX ? v.length + " items" : j;
      }
      return v.length === 1 ? "1 item" : v.length + " items";
    }
    return null;
  }

  /**
   * What changed from `before` (null for a new entry) to `after`, field by field:
   * FieldChange = {name, label, change: "changed" | "added" | "removed", before?, after?}.
   * Object fields are compared per sub-field ("links.cv", label "Links › CV").
   */
  function diff(before, after, fields) {
    var a0 = isObj(before) ? before : null;
    var b0 = isObj(after) ? after : {};
    var out = [];
    fieldList(fields, a0, b0).forEach(function (f) {
      var a = a0 ? a0[f.name] : undefined;
      var b = b0[f.name];
      var label = f.label || f.name;
      if (f.widget === "object" && Array.isArray(f.fields) && (isObj(a) || isObj(b))) {
        diff(isObj(a) ? a : a0 ? {} : null, isObj(b) ? b : {}, f.fields).forEach(function (s) {
          var c = { name: f.name + "." + s.name, label: label + " › " + s.label, change: s.change };
          if (s.before !== undefined) c.before = s.before;
          if (s.after !== undefined) c.after = s.after;
          out.push(c);
        });
        return;
      }
      if (f.widget === "visible") {
        // "Visible on the website" shows `draft` the other way round (cms-widgets.js):
        // draft true is "No"; false and "not set" are "Yes" (the schema's default),
        // so a new hidden entry reads "Yes → No" from that default.
        if (!!a === !!b) return;
        out.push({
          name: f.name,
          label: label,
          change: "changed",
          before: a ? "No" : "Yes",
          after: b ? "No" : "Yes",
        });
        return;
      }
      if (f.widget === "boolean" || typeof a === "boolean" || typeof b === "boolean") {
        // A switch: off and "not set" are the same (the schema's default).
        if (!!a === !!b) return;
        out.push(
          a0
            ? {
                name: f.name,
                label: label,
                change: "changed",
                before: a ? "on" : "off",
                after: b ? "on" : "off",
              }
            : { name: f.name, label: label, change: "added", after: "on" },
        );
        return;
      }
      if (same(a, b)) return;
      var emptyA = normalize(a) === undefined;
      var emptyB = normalize(b) === undefined;
      var change = {
        name: f.name,
        label: label,
        change: emptyA ? "added" : emptyB ? "removed" : "changed",
      };
      var sa = emptyA ? null : show(a, f);
      var sb = emptyB ? null : show(b, f);
      if (sa !== null) change.before = sa;
      if (sb !== null) change.after = sb;
      out.push(change);
    });
    return out;
  }

  function quoted(s) {
    return s === "on" ||
      s === "off" ||
      s === "Yes" ||
      s === "No" ||
      /^-?\d+(\.\d+)?$/.test(s) ||
      / items?$/.test(s)
      ? s
      : "“" + s + "”";
  }

  /**
   * One FieldChange in words: "Title: “Old” → “New”", "Photo: removed". With
   * {mask: "Email public"} no value is shown: "Email: changed (hidden: Email public is off)".
   */
  function display(change, opts) {
    var c = change || {};
    var label = c.label || c.name || "A field";
    var mask = opts && opts.mask;
    if (mask) return label + ": " + (c.change || "changed") + " (hidden: " + mask + " is off)";
    if (c.change === "added")
      return c.after !== undefined ? label + ": added " + quoted(c.after) : label + ": added";
    if (c.change === "removed") return label + ": removed";
    if (c.before !== undefined && c.after !== undefined)
      return label + ": " + quoted(c.before) + " → " + quoted(c.after);
    return label + ": changed";
  }

  /** For tests: forget remembered answers. */
  function reset() {
    texts.clear();
    store = null;
    latestMemo = {};
    uploadsMemo = null;
  }

  var api = {
    pathOf: pathOf,
    entryOfPath: entryOfPath,
    entryRef: function (collection, slug) {
      return entryRef(byName(collection), slug);
    },
    collections: collections,
    parseSubject: parseSubject,
    toVersion: toVersion,
    versions: versions,
    latest: latest,
    textAt: textAt,
    fileAtMain: fileAtMain,
    treeCount: treeCount,
    uploadPaths: uploadPaths,
    mine: mine,
    recent: recent,
    diff: diff,
    display: display,
    sameData: sameData,
    _normalize: normalize,
    _reset: reset,
  };
  root.BobalabHistory = api;
})(typeof window !== "undefined" ? window : globalThis);
