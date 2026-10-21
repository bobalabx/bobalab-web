/*
 * BOBALAB CMS hooks (WP6). Loaded by /admin/ right after decap-cms.js.
 *
 * One "preSave" listener runs before every save (simple and editorial mode):
 *  1. Tidy the data: trim text, and drop empty optional values ("" / null /
 *     empty objects) that Decap keeps after a field is cleared. The content
 *     schema (src/lib/content/schema.ts) rejects "" for URLs, dates and DOIs,
 *     so without this a cleared field would fail the validate-content check.
 *  2. Block the save, with a message, when an image has no alt text
 *     (the validator's E_ALT_MISSING rule, brief §G1 1.1.1).
 *  3. Block the save when an optional group is only partly filled in (e.g. a
 *     news link with an address but no link text). Decap cannot express
 *     "required when the group is used"; the rules come from cms-data.js.
 *  4. Block a save that breaks a cross-field rule of the schema (a person's
 *     End before Start, a project's End year before its Start year).
 *  5. Block the FIRST save of a new entry whose file name (page address) would
 *     break the site's slug rule (validator E_SLUG), e.g. a publication whose
 *     first author's full name makes it longer than 60 characters. The name
 *     cannot be changed in the CMS later; the rules come from cms-data.js.
 *     A new publication whose address would carry the first author's full name
 *     or another year than the paper's is held back ONCE with advice; saving
 *     again keeps the address (verification finding CMS-11).
 *  6. Block a save that the validator would reject as an error although Decap
 *     cannot express the rule: "required when ..." fields (As of, Status source,
 *     Year, Research directions) and duplicate list items (Direction order);
 *     the rules come from cms-data.js (cms/source.mjs requiredRules, uniqueRules).
 *  7. Block saving a person's photo while "Photo consent" is off: uploaded
 *     files are public once published, even when the site does not show them.
 *  8. Block a save when the editor shows another entry than the address bar
 *     names (Decap 3.17.1 keeps the previous entry when only the URL changes;
 *     cms-start.js reloads the page then, this is the safety net).
 *
 * A second, asynchronous preSave listener blocks a research direction whose
 * colour another live direction already uses (validator W_COLOR_DUP). It reads
 * the other directions through Decap's own getCollection, which the direction
 * preview hands over (rememberCollectionLoader); without it the check is skipped.
 *
 * Decap passes Immutable.js collections; they are detected by their sentinel
 * keys so this file needs no access to Decap's internal Immutable copy.
 * tests/unit/cms/hooks.test.ts runs this file in a sandbox.
 */
(function (root) {
  "use strict";

  var LIST = "@@__IMMUTABLE_LIST__@@";
  var MAP = "@@__IMMUTABLE_MAP__@@";

  function isList(v) {
    return !!(v && typeof v === "object" && v[LIST]);
  }
  function isMap(v) {
    return !!(v && typeof v === "object" && v[MAP]);
  }
  function isBlank(v) {
    return (
      v === null ||
      v === undefined ||
      (typeof v === "string" && v.trim() === "") ||
      (isMap(v) && v.size === 0)
    );
  }

  /** Recursively trim strings and drop blank values from maps and lists. */
  function clean(v) {
    if (typeof v === "string") return v.trim();
    if (isMap(v) || isList(v)) {
      return v.map(clean).filter(function (x) {
        return !isBlank(x);
      });
    }
    return v;
  }

  /** Image objects in the schema, and their human names for the message. */
  var IMAGE_OBJECTS = {
    figure: "Figure",
    hero: "Hero image",
    teaser: "Teaser image",
    image: "Image",
  };

  function str(v) {
    return typeof v === "string" ? v.trim() : v ? String(v) : "";
  }

  /** Names of images that are set but have no alt text. */
  function missingAlt(data) {
    var out = [];
    if (!isMap(data)) return out;
    Object.keys(IMAGE_OBJECTS).forEach(function (key) {
      var obj = data.get(key);
      if (isMap(obj) && str(obj.get("image")) && !str(obj.get("alt"))) out.push(IMAGE_OBJECTS[key]);
    });
    if (str(data.get("photo")) && !str(data.get("photo_alt"))) out.push("Photo");
    return out;
  }

  /**
   * Optional groups whose parts belong together (e.g. a news link needs both its
   * text and its address). Rules come from cms-data.js (generated from the schema).
   * Returns messages for groups that are partly filled in.
   */
  function incompleteGroups(data, scope, rules) {
    var out = [];
    (rules || []).forEach(function (rule) {
      if (rule.scope !== scope) return;
      var obj = isMap(data) ? data.getIn(rule.object) : null;
      if (!isMap(obj) || obj.size === 0) return; // left empty: fine, it is optional
      var missing = [];
      rule.fields.forEach(function (f, i) {
        if (!str(obj.get(f))) missing.push(rule.fieldLabels[i] || f);
      });
      if (missing.length)
        out.push(rule.label + ": add " + missing.join(" and ") + ", or clear the whole group");
    });
    return out;
  }

  /**
   * Cross-field rules of the schema (e.g. a person's End not before Start; a
   * project's End year not before its Start year). Rules come from cms-data.js.
   */
  function orderProblems(data, scope, rules) {
    var out = [];
    (rules || []).forEach(function (r) {
      if (r.scope !== scope || !isMap(data)) return;
      var a = data.get(r.earlier);
      var b = data.get(r.later);
      if (isBlank(a) || isBlank(b)) return;
      var before = typeof a === "number" && typeof b === "number" ? b < a : String(b) < String(a);
      if (before) out.push(r.labels[1] + " (" + b + ") is before " + r.labels[0] + " (" + a + ")");
    });
    return out;
  }

  // ---------------------------------------------------------------------------
  // File names of NEW entries (the page address; brief D-05 slug rules).
  // Decap makes the file name from the collection's `slug` template when an
  // entry is first saved, and cannot rename it later. The validator rejects
  // names that break the schema's SLUG_PATTERNS (E_SLUG), so a bad name would
  // only surface as a red check on the pull request. This re-computes the name
  // the way decap-cms 3.17.1 does (stringTemplate.ts + urlHelper.ts sanitizeSlug
  // with encoding "ascii", clean_accents, replacement "-") and blocks the save
  // with a message instead. Anything it cannot evaluate is let through.

  var UNKNOWN = {};
  var TOKEN = /\{\{ *([^}{| ]+)( \| ([^}{]+?))? *\}\}/g;
  var DATE_KEYS = {
    year: function (d) {
      return String(d.getUTCFullYear());
    },
    month: function (d) {
      return ("0" + (d.getUTCMonth() + 1)).slice(-2);
    },
    day: function (d) {
      return ("0" + d.getUTCDate()).slice(-2);
    },
  };

  function pathOf(key) {
    return key.split(/[.[\]]/).filter(Boolean);
  }

  function filtered(value, filter) {
    if (!filter) return value;
    var m;
    if ((m = /^truncate\(([0-9]+)(?:(?:,\s*['"])([^'"]*)(?:['"]))?\)$/.exec(filter))) {
      var omission = m[2] || "...";
      var n = parseInt(m[1], 10);
      var s = String(value);
      return s.length > n + omission.length ? s.slice(0, n) + omission : s;
    }
    if ((m = /^date\('(.+)'\)$/.exec(filter))) {
      var d = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
      if (!d || !/^(YYYY|MM|DD|[-/ ])+$/.test(m[1])) throw UNKNOWN;
      return m[1].replace("YYYY", d[1]).replace("MM", d[2]).replace("DD", d[3]);
    }
    if (filter === "upper") return String(value).toUpperCase();
    if (filter === "lower") return String(value).toLowerCase();
    if ((m = /^default\('(.+)'\)$/.exec(filter))) return value || m[1];
    if ((m = /^ternary\('(.*)',\s*'(.*)'\)$/.exec(filter))) return value ? m[1] : m[2];
    throw UNKNOWN;
  }

  /** One template value → file-name segment (prepareSlug + sanitizeSlug). */
  function segment(value) {
    var s = String(value).trim().toLocaleLowerCase().replace(/'/g, "").replace(/\./g, "-");
    s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    s = Array.from(s)
      .map(function (c) {
        return /[\w\-.~]/.test(c) ? c : "-";
      })
      .join("");
    return s.replace(/-+/g, "-").replace(/^-/, "").replace(/-$/, "");
  }

  /** The file name Decap will give a new entry, or null if it cannot be told. */
  function expectedSlug(template, data, identifierField, now) {
    try {
      return template.replace(TOKEN, function (_, key, _f, filter) {
        var v;
        if (key.indexOf("fields.") === 0) {
          v = data.getIn(pathOf(key.slice(7)));
          if (isMap(v) || isList(v)) throw UNKNOWN;
        }
        if (!v) {
          if (DATE_KEYS[key]) v = DATE_KEYS[key](now);
          else if (key === "slug") v = data.get(identifierField);
          else if (/^(hour|minute|second)$/.test(key)) throw UNKNOWN;
          else v = data.getIn(pathOf(key));
          if (v === undefined || v === null) v = "";
        }
        return segment(filtered(v, filter));
      });
    } catch (e) {
      if (e === UNKNOWN) return null;
      throw e;
    }
  }

  /** A message when a NEW entry's file name would break the site's rule, else null. */
  function slugProblem(entry, data, rules) {
    if (!entry.get("newRecord") || !rules) return null;
    var collection = entry.get("collection");
    var rule = rules[collection];
    if (!rule) return null;
    var slug = expectedSlug(rule.template, data, rule.identifier, new Date());
    if (slug === null) return null;
    var shapeOk = new RegExp(rule.pattern).test(slug);
    if (shapeOk && slug.length <= rule.max) return null;
    if (collection === "publications" && shapeOk) {
      return (
        "Not saved: this publication’s address would be " +
        slug.length +
        " characters long, and at most " +
        rule.max +
        " are allowed. It is made from the first author’s name, the year and the title. " +
        "For the first save, type only the first author’s last name (for example “Doe”), then complete the name and save again."
      );
    }
    if (collection === "people") {
      return (
        "Not saved: a person’s address is their first and last name, like “jane-doe”, and this name gives “" +
        slug +
        "”. Enter at least a first and a last name in Latin letters."
      );
    }
    return (
      "Not saved: this entry’s address would be “" +
      slug +
      "”, which does not fit the site’s rule (" +
      rule.hint +
      ", at most " +
      rule.max +
      " characters). Change the fields it is made from before the first save; it cannot be renamed later."
    );
  }

  // ---------------------------------------------------------------------------
  // "Required when ..." and distinct-list rules (cms-data.js rules.required / unique)

  /** Values at a dotted path; "*" fans out over list items. */
  function valuesAt(data, dotted) {
    var out = [];
    (function walk(node, parts) {
      if (!parts.length) {
        out.push(node);
        return;
      }
      var head = parts[0];
      var rest = parts.slice(1);
      if (head === "*") {
        if (isList(node)) for (var i = 0; i < node.size; i++) walk(node.get(i), rest);
        return;
      }
      if (isMap(node)) walk(node.get(head), rest);
    })(data, dotted.split("."));
    return out;
  }

  function hasValue(v) {
    if (isList(v)) return v.size > 0;
    return !isBlank(v) && v !== false;
  }

  function conditionHolds(data, c) {
    var v = isMap(data) ? data.get(c.field) : undefined;
    if (c.in) return c.in.indexOf(v) !== -1;
    if (c.notIn) return c.notIn.indexOf(v) === -1;
    return true;
  }

  /** Messages for "required when ..." rules of this scope that the data breaks. */
  function requiredProblems(data, scope, rules) {
    var out = [];
    if (!isMap(data)) return out;
    (rules || []).forEach(function (r) {
      if (r.scope !== scope) return;
      var applies = (r.when || []).every(function (c) {
        return conditionHolds(data, c);
      });
      if (!applies) return;
      if (
        r.anySet &&
        r.anySet.length &&
        !r.anySet.some(function (p) {
          return valuesAt(data, p).some(hasValue);
        })
      )
        return;
      var v = data.getIn(r.field.split("."));
      var ok = r.min != null ? isList(v) && v.size >= r.min : hasValue(v);
      if (!ok) out.push(r.message);
    });
    return out;
  }

  /** Messages for lists of this scope that name an item twice. */
  function uniqueProblems(data, scope, rules) {
    var out = [];
    if (!isMap(data)) return out;
    (rules || []).forEach(function (r) {
      if (r.scope !== scope) return;
      var list = data.getIn(r.field.split("."));
      if (!isList(list)) return;
      var seen = {};
      var twice = [];
      for (var i = 0; i < list.size; i++) {
        var k = str(list.get(i));
        if (!k) continue;
        if (seen[k] && twice.indexOf(k) === -1) twice.push(k);
        seen[k] = true;
      }
      twice.forEach(function (k) {
        out.push("“" + r.label + "” lists “" + k + "” more than once; keep it once");
      });
    });
    return out;
  }

  /** A person's photo needs consent before it is saved (D-06; uploads are public). */
  function consentProblem(collection, data) {
    if (collection !== "people" || !isMap(data)) return null;
    if (!str(data.get("photo")) || data.get("photo_consent") === true) return null;
    return (
      "Not saved: a photo is set but “Photo consent” is off. Files you upload are public as soon as they are published, even when the site does not show them. " +
      "Remove the photo, or turn on “Photo consent” once the person has agreed in writing (docs/EDITING.md, “Consent rules”)."
    );
  }

  // ---------------------------------------------------------------------------
  // The entry on screen must be the one the address names (CMS-02)

  function decode(x) {
    try {
      return decodeURIComponent(x);
    } catch {
      return x;
    }
  }

  /**
   * The editor route in a location hash: { collection, slug } for an existing
   * entry, { collection, slug: null, isNew: true } for a new one, else null.
   */
  function editorRoute(hash) {
    var path = String(hash || "")
      .replace(/^#/, "")
      .split("?")[0];
    var m = /^\/collections\/([^/]+)\/(?:entries\/(.+?)|(new))\/?$/.exec(path);
    if (!m) return null;
    return m[3]
      ? { collection: decode(m[1]), slug: null, isNew: true }
      : { collection: decode(m[1]), slug: decode(m[2]), isNew: false };
  }

  /** A message when the entry being saved is not the one the address bar names. */
  function routeProblem(entry, hash) {
    var r = editorRoute(hash);
    if (!r) return null;
    var collection = entry.get("collection");
    var slug = entry.get("slug") || "";
    var same =
      r.collection === collection && (r.isNew ? !!entry.get("newRecord") : r.slug === slug);
    if (same) return null;
    return (
      "Not saved: the editor still shows " +
      (slug ? "“" + collection + "/" + slug + "”" : "an earlier new entry") +
      ", but the address bar names another entry. Reload the page (F5) and make the change again."
    );
  }

  // ---------------------------------------------------------------------------
  // Advice before the first save of a new publication (CMS-11)

  var advised = {};

  /**
   * Once per address: when a new publication's address would start with the
   * first author's full name, or carry another year than the paper's, hold the
   * first save back with advice. Saving again keeps the address.
   */
  function publicationAdvice(entry, data, rules, now) {
    if (!rules || !entry.get("newRecord") || entry.get("collection") !== "publications")
      return null;
    var rule = rules.publications;
    if (!rule) return null;
    var slug = expectedSlug(rule.template, data, rule.identifier, now);
    if (!slug || !new RegExp(rule.pattern).test(slug) || slug.length > rule.max) return null;
    var first = str(isMap(data) ? data.getIn(["authors", 0, "name"]) : "");
    var words = first.split(/\s+/).filter(Boolean);
    var year = isMap(data) ? data.get("year") : undefined;
    var thisYear = String(now.getUTCFullYear());
    var otherYear = !isBlank(year) && String(year) !== thisYear;
    if (words.length < 2 && !otherYear) return null;
    if (advised[slug]) return null; // shown once already: the editor keeps this address
    advised[slug] = true;
    var parts = [
      "Not saved yet: check the address first. This publication would be saved as “" +
        slug +
        "”, and the CMS cannot rename it later.",
    ];
    if (words.length > 1) {
      var last = words[words.length - 1];
      parts.push(
        "The lab’s addresses start with the first author’s last name only (like “" +
          segment(last) +
          "-" +
          thisYear +
          "-…”): type only “" +
          last +
          "” as the first author’s name, save, then complete the name and save again.",
      );
    }
    if (otherYear) {
      parts.push(
        "The year in the address is the year the entry is created (" +
          thisYear +
          "), not the paper’s year (" +
          year +
          "); if it must match, ask a maintainer to add the file instead.",
      );
    }
    parts.push("To keep the address as shown, save again.");
    return parts.join(" ");
  }

  // ---------------------------------------------------------------------------
  // Colours of the other research directions (CMS-07)

  var siblings = { load: null, list: null, at: 0, pending: null };
  var SIBLINGS_MAX_AGE = 30000;

  /** The direction preview hands over Decap's getCollection(name[, slug]). */
  function rememberCollectionLoader(fn) {
    if (typeof fn === "function") siblings.load = fn;
  }

  function plain(v) {
    return v && typeof v.toJS === "function" ? v.toJS() : v;
  }

  /** The saved research directions [{ slug, data }], cached for 30 s; null if unknown. */
  function loadDirections(force) {
    if (!siblings.load) return Promise.resolve(null);
    if (!force && siblings.list && Date.now() - siblings.at < SIBLINGS_MAX_AGE)
      return Promise.resolve(siblings.list);
    if (siblings.pending) return siblings.pending;
    siblings.pending = Promise.resolve()
      .then(function () {
        return siblings.load("directions");
      })
      .then(function (res) {
        var arr = plain(res) || [];
        siblings.list = arr
          .map(function (e) {
            var x = plain(e) || {};
            return { slug: x.slug, data: plain(x.data) || {} };
          })
          .filter(function (e) {
            return e.slug;
          });
        siblings.at = Date.now();
        return siblings.list;
      })
      .catch(function () {
        return siblings.list;
      })
      .then(function (list) {
        siblings.pending = null;
        return list;
      });
    return siblings.pending;
  }

  function cachedDirections() {
    return siblings.list;
  }

  function directionName(d) {
    return (d.data && (d.data.short_label || d.data.title)) || d.slug;
  }

  /**
   * Other live (non-archived) directions that use this colour, and those that
   * use a colour easily confused with it: { same: [...], confusable: [...] }.
   */
  function colourConflicts(slug, colour, list, pairs) {
    var out = { same: [], confusable: [] };
    if (!colour || !list) return out;
    list.forEach(function (d) {
      if (d.slug === slug || !d.data || d.data.status === "archived") return;
      var c = d.data.color;
      if (c === colour) out.same.push({ slug: d.slug, name: directionName(d), color: c });
      (pairs || []).forEach(function (p) {
        if ((p[0] === colour && p[1] === c) || (p[1] === colour && p[0] === c))
          out.confusable.push({ slug: d.slug, name: directionName(d), color: c, why: p[2] });
      });
    });
    return out;
  }

  function swatchName(id) {
    var labels = (root.BOBALAB_CMS && root.BOBALAB_CMS.labels) || {};
    var w = (labels.swatches || {})[id];
    return (w && w.name) || id;
  }

  /** Second preSave listener: a live direction's colour must not be taken already. */
  function preSaveColour(args) {
    var e = args.entry;
    if (e.get("collection") !== "directions") return undefined;
    var data = e.get("data");
    if (!isMap(data) || data.get("status") === "archived") return undefined;
    var colour = str(data.get("color"));
    if (!colour || !siblings.load) return undefined;
    return loadDirections(true).then(function (list) {
      var hit = colourConflicts(e.get("slug") || "", colour, list, []).same;
      if (!hit.length) return undefined;
      throw new Error(
        "Not saved: " +
          swatchName(colour) +
          " is already the colour of " +
          hit
            .map(function (d) {
              return "“" + d.name + "”";
            })
            .join(", ") +
          ". Each direction needs its own colour; the preview lists the colours in use (docs/EDITING.md, “Choose a colour”).",
      );
    });
  }

  function scopeOf(entry) {
    var collection = entry.get("collection");
    var slug = entry.get("slug");
    // File collections (pages, settings) are scoped by "<collection>/<file name>".
    return collection === "pages" || collection === "settings"
      ? collection + "/" + slug
      : collection;
  }

  function preSave(args) {
    var data = clean(args.entry.get("data"));
    var missing = missingAlt(data);
    if (missing.length) {
      throw new Error(
        "Not saved: " +
          missing
            .map(function (m) {
              return "“" + m + "”";
            })
            .join(", ") +
          (missing.length > 1 ? " have" : " has") +
          " an image but no alt text. Describe in a sentence what the image shows (docs/EDITING.md, “Images and alt text”).",
      );
    }
    var cfg = root.BOBALAB_CMS || {};
    var groups = incompleteGroups(data, scopeOf(args.entry), cfg.rules && cfg.rules.allOrNothing);
    if (groups.length) throw new Error("Not saved: " + groups.join("; ") + ".");
    var order = orderProblems(data, scopeOf(args.entry), cfg.rules && cfg.rules.order);
    if (order.length) throw new Error("Not saved: " + order.join("; ") + ".");
    var rules = cfg.rules || {};
    var scope = scopeOf(args.entry);
    var needed = requiredProblems(data, scope, rules.required).concat(
      uniqueProblems(data, scope, rules.unique),
    );
    if (needed.length) throw new Error("Not saved: " + needed.join("; ") + ".");
    var consent = consentProblem(args.entry.get("collection"), data);
    if (consent) throw new Error(consent);
    var where = root.location && root.location.hash;
    var route = where ? routeProblem(args.entry, where) : null;
    if (route) throw new Error(route);
    var slug = slugProblem(args.entry, data, rules.slugs);
    if (slug) throw new Error(slug);
    var advice = publicationAdvice(args.entry, data, rules.slugs, new Date());
    if (advice) throw new Error(advice);
    return data;
  }

  var api = {
    clean: clean,
    isBlank: isBlank,
    missingAlt: missingAlt,
    incompleteGroups: incompleteGroups,
    orderProblems: orderProblems,
    expectedSlug: expectedSlug,
    slugProblem: slugProblem,
    requiredProblems: requiredProblems,
    uniqueProblems: uniqueProblems,
    consentProblem: consentProblem,
    editorRoute: editorRoute,
    routeProblem: routeProblem,
    publicationAdvice: publicationAdvice,
    rememberCollectionLoader: rememberCollectionLoader,
    loadDirections: loadDirections,
    cachedDirections: cachedDirections,
    colourConflicts: colourConflicts,
    preSave: preSave,
    preSaveColour: preSaveColour,
  };
  root.BobalabCmsHooks = api;
  if (root.CMS && typeof root.CMS.registerEventListener === "function") {
    root.CMS.registerEventListener({ name: "preSave", handler: preSave });
    root.CMS.registerEventListener({ name: "preSave", handler: preSaveColour });
  }
})(typeof window !== "undefined" ? window : globalThis);
