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
    var slug = slugProblem(args.entry, data, cfg.rules && cfg.rules.slugs);
    if (slug) throw new Error(slug);
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
    preSave: preSave,
  };
  root.BobalabCmsHooks = api;
  if (root.CMS && typeof root.CMS.registerEventListener === "function") {
    root.CMS.registerEventListener({ name: "preSave", handler: preSave });
  }
})(typeof window !== "undefined" ? window : globalThis);
