/*
 * BOBALAB CMS: two checks a Save must pass before anything reaches GitHub
 * (editor v2, WP5; spec §3.6 b and c). Pure functions; cms-save.js runs them.
 * Loaded by /admin/ after cms-live.js; sets window.BobalabGuards.
 *
 *  - uploadProblems(): files uploaded into this entry and not saved yet must be
 *    of a type and size the site accepts. The rules are the deploy's own
 *    (scripts/perf/asset-budget.mjs, copied into cms-data.js `media`), so a
 *    .heic photo from a phone, a .docx CV or a 3 MB PNG is refused at Save
 *    instead of failing the deploy after it.
 *  - hiddenNameHits(): a name the lab has asked never to publish (the PI's
 *    hidden roster) must not be saved. Only salted SHA-256 hashes are known
 *    (cms-data.js `hiddenNames`, from tests/content/wp7-hidden-name-hashes.json,
 *    already public in the repo); this is a port of normalizeName/scanText in
 *    scripts/import/hidden-names.mjs using the browser's crypto.subtle. The
 *    result is a count, never the name.
 *
 * tests/unit/cms/guards.test.ts checks the upload rules and that the port finds
 * exactly what scripts/import/hidden-names.mjs finds.
 */
(function (root) {
  "use strict";

  var KINDS = {
    ".jpg": "JPG",
    ".jpeg": "JPG",
    ".png": "PNG",
    ".webp": "WebP",
    ".gif": "GIF",
    ".pdf": "PDF",
  };

  function extOf(name) {
    var m = /(\.[^./\\]+)$/.exec(String(name || ""));
    return m ? m[1].toLowerCase() : "";
  }

  function mb(bytes) {
    var n = bytes / (1024 * 1024);
    return (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10) + " MB";
  }

  function list(words) {
    if (words.length < 2) return words.join("");
    return words.slice(0, -1).join(", ") + " or " + words[words.length - 1];
  }

  /** "Upload a PDF (at most 10 MB) or a JPG, PNG, WebP or GIF image (at most 2 MB)." */
  function advice(media) {
    var limits = media.limits || {};
    var raster = media.rasterExtensions || [];
    var others = (media.uploadExtensions || []).filter(function (x) {
      return raster.indexOf(x) === -1;
    });
    var kinds = function (exts) {
      var out = [];
      exts.forEach(function (x) {
        var k = KINDS[x] || x.replace(/^\./, "").toUpperCase();
        if (out.indexOf(k) === -1) out.push(k);
      });
      return out;
    };
    var parts = [];
    if (others.length)
      parts.push("a " + list(kinds(others)) + " (at most " + mb(limits.uploadBytes) + ")");
    if (raster.length)
      parts.push("a " + list(kinds(raster)) + " image (at most " + mb(limits.rasterBytes) + ")");
    return "Upload " + parts.join(" or ") + ".";
  }

  /** The public address of an upload: "public/uploads/x.jpg" → "/uploads/x.jpg". */
  function publicPath(itemPath, media) {
    var p = String(itemPath || "").replace(/^\/+/, "");
    var folder = String(media.folder || "").replace(/^\/+|\/+$/g, "");
    var pub = String(media.publicFolder || "/").replace(/\/+$/, "");
    if (folder && p.indexOf(folder + "/") === 0) return pub + "/" + p.slice(folder.length + 1);
    if (p.indexOf(pub.replace(/^\//, "") + "/") === 0) return "/" + p;
    return null;
  }

  /** Every string in a value, with the top-level field it sits in. */
  function strings(value, top, out) {
    if (typeof value === "string") out.push({ field: top, text: value });
    else if (Array.isArray(value))
      value.forEach(function (v) {
        strings(v, top, out);
      });
    else if (value && typeof value === "object")
      Object.keys(value).forEach(function (k) {
        strings(value[k], top === undefined ? k : top, out);
      });
    return out;
  }

  /**
   * Draft uploads of this entry that the site would refuse:
   * uploadProblems({data, mediaFiles}, media) → [{name, message, field?}].
   * Only files uploaded into this entry and not saved yet (draft: true) whose
   * address the data still uses; the size is the File's own.
   */
  function uploadProblems(entryJS, media) {
    var out = [];
    if (!entryJS || !media) return out;
    var limits = media.limits || {};
    var allowed = media.uploadExtensions || [];
    var raster = media.rasterExtensions || [];
    var texts = strings(entryJS.data || {}, undefined, []);
    (entryJS.mediaFiles || []).forEach(function (item) {
      if (!item || item.draft !== true) return;
      var pub = publicPath(item.path, media);
      var name =
        item.name ||
        String(item.path || "")
          .split("/")
          .pop() ||
        "";
      if (!pub) return;
      var used = texts.filter(function (t) {
        return t.text.indexOf(pub) !== -1;
      });
      if (!used.length) return; // removed from the form again: Decap does not save it
      var ext = extOf(name);
      var size = item.file && typeof item.file.size === "number" ? item.file.size : item.size;
      var reason = "";
      if (allowed.indexOf(ext) === -1) reason = "";
      else if (typeof size === "number" && size > limits.uploadBytes)
        reason = ": it is " + mb(size);
      else if (raster.indexOf(ext) !== -1 && typeof size === "number" && size > limits.rasterBytes)
        reason = ": it is " + mb(size);
      else return;
      out.push({
        name: name,
        field: used[0].field,
        message:
          "Not saved: “" + name + "” can't go on the website" + reason + ". " + advice(media),
      });
    });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Hidden roster names (a port of scripts/import/hidden-names.mjs)

  var MARKS = /[̀-ͯ]/g;

  /** NFKD, no diacritics or parentheticals, lower-case, letters only, single spaces. */
  function normalizeName(s) {
    return String(s)
      .normalize("NFKD")
      .replace(MARKS, "")
      .toLowerCase()
      .replace(/\([^)]*\)/g, " ")
      .replace(/[^a-z]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  /** Token list of a text, normalised like names (no parenthetical removal). */
  function tokens(text) {
    return String(text)
      .normalize("NFKD")
      .replace(MARKS, "")
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean);
  }

  /**
   * The 2-, 3- and 4-word windows scanText() hashes, per token offset (2-word
   * windows also reversed, "Last, First"), for the raw text and the text with
   * short parentheticals removed ("First (Nick) Last").
   */
  function windows(text) {
    var out = [];
    [text, String(text).replace(/\([^)\n]{0,40}\)/g, " ")].forEach(function (variant, v) {
      var t = tokens(variant);
      for (var i = 0; i < t.length; i++) {
        var c = [];
        if (i + 1 < t.length) c.push(t[i] + " " + t[i + 1], t[i + 1] + " " + t[i]);
        if (i + 2 < t.length) c.push(t.slice(i, i + 3).join(" "));
        if (i + 3 < t.length) c.push(t.slice(i, i + 4).join(" "));
        out.push({ key: v + ":" + i, i: i, cands: c });
      }
    });
    return out;
  }

  function hex(buf) {
    var b = new Uint8Array(buf);
    var s = "";
    for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? "0" : "") + b[i].toString(16);
    return s;
  }

  function sha256(text) {
    var c = root.crypto;
    if (!c || !c.subtle || typeof root.TextEncoder !== "function")
      return Promise.reject(new Error("crypto.subtle is not available"));
    return c.subtle.digest("SHA-256", new root.TextEncoder().encode(text)).then(hex);
  }

  /**
   * How many places in `texts` match a hidden name (scanText's count, summed
   * over the texts). Never says which name. Rejects when the browser cannot hash.
   */
  function hiddenNameHits(texts, hidden) {
    var salt = hidden && hidden.salt;
    var hashes = (hidden && hidden.hashes) || [];
    if (!salt || !hashes.length) return Promise.resolve(0);
    var set = {};
    hashes.forEach(function (h) {
      set[String(h).toLowerCase()] = true;
    });
    var perText = (texts || []).map(function (t) {
      return windows(t);
    });
    var unique = {};
    perText.forEach(function (ws) {
      ws.forEach(function (w) {
        w.cands.forEach(function (c) {
          unique[c] = true;
        });
      });
    });
    var cands = Object.keys(unique);
    return Promise.all(
      cands.map(function (c) {
        return sha256(salt + ":" + c);
      }),
    ).then(function (digests) {
      var hit = {};
      cands.forEach(function (c, i) {
        if (set[digests[i]]) hit[c] = true;
      });
      var total = 0;
      perText.forEach(function (ws) {
        var offsets = {};
        ws.forEach(function (w) {
          if (
            w.cands.some(function (c) {
              return hit[c];
            })
          )
            offsets[w.i] = true;
        });
        total += Object.keys(offsets).length;
      });
      return total;
    });
  }

  root.BobalabGuards = {
    uploadProblems: uploadProblems,
    normalizeName: normalizeName,
    hiddenNameHits: hiddenNameHits,
    publicPath: publicPath,
    advice: advice,
    strings: function (value) {
      return strings(value, undefined, []).map(function (s) {
        return s.text;
      });
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
