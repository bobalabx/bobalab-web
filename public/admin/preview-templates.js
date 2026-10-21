/*
 * BOBALAB preview templates for Decap CMS (WP6; brief §F4 step 3).
 *
 * The preview pane is an iframe styled with preview.css (the site's own tokens,
 * base, prose and component CSS). These templates reuse the site components'
 * class names (bl-news, bl-person, bl-pub, bl-badge, …) and the site's wording
 * (cms-data.js, generated from the site's source), so a preview looks
 * like the live card. They also show the rules the site applies: consent
 * gating for people, the "counts as a publication" rule, the draft badge.
 * Only what the entry provides is rendered; empty sections are left out.
 *
 * Uses Decap's globals: CMS, h (React.createElement).
 */
(function () {
  "use strict";
  var CMS = window.CMS;
  var h = window.h;
  if (!CMS || !h) return;
  var L = (window.BOBALAB_CMS && window.BOBALAB_CMS.labels) || {
    newsTypes: {},
    publicationTypes: {},
    publicationStatus: {},
    roles: {},
    swatches: {},
  };

  CMS.registerPreviewStyle(new URL("preview.css", document.baseURI).href);

  // -------------------------------------------------------------------------
  // Helpers

  function js(v) {
    return v && typeof v.toJS === "function" ? v.toJS() : v;
  }
  function data(entry) {
    return js(entry.get("data")) || {};
  }
  function has(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }
  function cx() {
    return Array.prototype.filter.call(arguments, Boolean).join(" ");
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  /** Same output as src/lib/content/dates.ts formatDate: "Oct 20, 2026" · "Oct 2026" · "2026". */
  function formatDate(value) {
    if (!has(value)) return "";
    var m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/.exec(String(value).trim());
    if (!m) return String(value);
    if (!m[2]) return m[1];
    var mon = MONTHS[Number(m[2]) - 1];
    if (!m[3]) return mon + " " + m[1];
    return mon + " " + Number(m[3]) + ", " + m[1];
  }
  /** Today in the lab's time zone, YYYY-MM-DD. */
  function today() {
    try {
      var parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: L.labTimeZone || "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      var get = function (t) {
        var p = parts.filter(function (x) {
          return x.type === t;
        })[0];
        return p ? p.value : "";
      };
      return get("year") + "-" + get("month") + "-" + get("day");
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }
  /** A "YYYY" / "YYYY-MM" end date is current through the end of that period. */
  function ended(end) {
    if (!has(end)) return false;
    var s = String(end).trim();
    var t = today();
    if (/^\d{4}$/.test(s)) return s < t.slice(0, 4);
    if (/^\d{4}-\d{2}$/.test(s)) return s < t.slice(0, 7);
    return s < t;
  }
  function initials(name) {
    var parts = String(name || "")
      .replace(/["“”(].*?["“”)]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "?";
    var last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (parts[0].charAt(0) + last).toUpperCase();
  }
  function assetUrl(props, path) {
    if (!has(path)) return null;
    try {
      var a = props.getAsset(path);
      if (a && typeof a.then !== "function") return String(a);
    } catch {
      /* fall through */
    }
    return path;
  }

  /** Find a related entry's data in Decap's relation metadata (any depth). */
  function related(props, collection, slug) {
    var meta = js(props.fieldsMetaData);
    var found = null;
    (function walk(node) {
      if (found || !node || typeof node !== "object") return;
      if (node[collection] && node[collection][slug]) {
        found = node[collection][slug];
        return;
      }
      Object.keys(node).forEach(function (k) {
        walk(node[k]);
      });
    })(meta);
    return found;
  }
  function directionLabel(props, slug) {
    var d = related(props, "directions", slug);
    return (d && (d.short_label || d.title)) || slug;
  }

  function Badge(tone, text, key) {
    return h("span", { className: cx("bl-badge", tone && "bl-badge--" + tone), key: key }, text);
  }
  function DraftBadge(show) {
    return show ? Badge("draft", "Draft · pending lab review", "draft") : null;
  }
  function Note(children, warn) {
    return h.apply(
      null,
      ["p", { className: cx("cms-preview__note", warn && "cms-preview__warn") }].concat(children),
    );
  }
  /** Direction tags as on the site (src/components/ui/PearlTag.tsx): a coloured dot plus the label. */
  function Tags(props, slugs) {
    if (!has(slugs)) return null;
    return h(
      "ul",
      { className: "bl-tags", "aria-label": "Research directions" },
      slugs.map(function (s) {
        var d = related(props, "directions", s);
        var swatch = d && d.color ? d.color : undefined;
        return h(
          "li",
          { key: s },
          h(
            "span",
            { className: "bl-tag", "data-swatch": swatch },
            h("span", { className: "bl-dot", "data-swatch": swatch, "aria-hidden": "true" }),
            directionLabel(props, s),
          ),
        );
      }),
    );
  }
  /** A Markdown field rendered by Decap, styled with the site's prose rules. */
  function Markdown(props, field) {
    if (!has(props.entry.getIn(["data", field]))) return null;
    return h("div", { className: "prose cms-preview__prose" }, props.widgetFor(field));
  }
  function Body(props, label) {
    var body = props.entry.getIn(["data", "body"]);
    if (!has(body)) return null;
    return h(
      "section",
      { className: "cms-preview__section", "aria-label": label || "Page text" },
      Markdown(props, "body"),
    );
  }
  function Section(id, title, children) {
    return h.apply(
      null,
      [
        "section",
        { className: "cms-preview__section", key: id, "aria-labelledby": id },
        h("h2", { id: id }, title),
      ].concat(children),
    );
  }
  /** Name of a related person (relation metadata), else the slug. */
  function personName(props, slug) {
    var p = related(props, "people", slug);
    return (p && p.name) || slug;
  }
  /** Children are spread as arguments, so React needs no keys for them. */
  function Frame(children) {
    return h.apply(null, ["div", { className: "cms-preview" }].concat(children));
  }

  // -------------------------------------------------------------------------
  // News (mirrors src/components/ui/NewsItem.tsx)

  function NewsPreview(props) {
    var d = data(props.entry);
    var upcoming = has(d.event_date) && String(d.event_date).slice(0, 10) >= today();
    var img = d.image || {};
    var imgSrc = assetUrl(props, img.image);
    return Frame([
      Note(
        [
          h("strong", { key: "a" }, "Preview. "),
          "The news list and the item’s own page show it like this.",
        ],
        false,
      ),
      h(
        "article",
        { className: "bl-news", key: "card", "aria-labelledby": "pv-news-title" },
        h(
          "div",
          { className: "bl-news__head" },
          has(d.date)
            ? h(
                "time",
                { className: "bl-news__date", dateTime: String(d.date).slice(0, 10) },
                formatDate(d.date),
              )
            : null,
          has(d.type) ? Badge("", L.newsTypes[d.type] || d.type, "type") : null,
          upcoming ? Badge("accent", "Upcoming", "up") : null,
          DraftBadge(d.draft),
        ),
        h(
          "h1",
          { className: "bl-news__title", id: "pv-news-title" },
          d.title || h("span", { className: "cms-preview__empty" }, "Untitled"),
        ),
        has(d.event_date)
          ? h(
              "p",
              { className: "t-sm t-muted" },
              "Event: " + formatDate(d.event_date) + (has(d.location) ? " · " + d.location : ""),
            )
          : null,
        has(d.summary) ? h("p", null, d.summary) : null,
        Tags(props, d.directions),
      ),
      imgSrc
        ? h(
            "figure",
            { className: "cms-preview__figure", key: "img" },
            h("img", { src: imgSrc, alt: img.alt || "" }),
            has(img.caption) ? h("figcaption", { className: "t-sm t-muted" }, img.caption) : null,
          )
        : null,
      has(d.link && d.link.url)
        ? h("p", { key: "link" }, h("a", { href: d.link.url }, d.link.label || d.link.url))
        : null,
      h("div", { key: "body" }, Body(props)),
    ]);
  }

  // -------------------------------------------------------------------------
  // Person (mirrors src/components/ui/PersonCard.tsx and the consent rules)

  var LINK_LABELS = {
    website: "Website",
    scholar: "Google Scholar",
    linkedin: "LinkedIn",
    github: "GitHub",
    orcid: "ORCID",
    cv: "CV",
  };

  function PersonPreview(props) {
    var d = data(props.entry);
    var alumni = ended(d.end);
    var roleLabel = L.roles[d.role] || d.role || "";
    var role = alumni ? "Alumni · " + roleLabel : d.title || roleLabel;
    var showPhoto = has(d.photo) && d.photo_consent === true;
    var photoSrc = showPhoto ? assetUrl(props, d.photo) : null;
    var links = Object.keys(d.links || {}).filter(function (k) {
      return has(d.links[k]);
    });
    var showEmail = has(d.email) && d.email_public === true;
    var showNowAt = has(d.now_at) && d.now_at_public === true;
    var firstDir = has(d.directions) ? related(props, "directions", d.directions[0]) : null;

    var consent = [
      [
        "Listed",
        d.listed === true ? "yes: may appear on the site" : "no: never shown or linked anywhere",
      ],
      [
        "Photo",
        has(d.photo)
          ? showPhoto
            ? "shown"
            : "hidden (no photo consent)"
          : "none (initials pearl)",
      ],
      ["Email", has(d.email) ? (showEmail ? "shown" : "hidden (not public)") : "none"],
      ["Now at", has(d.now_at) ? (showNowAt ? "shown" : "hidden (not public)") : "none"],
      ["Profile page", d.profile_page === true || d.role === "pi" ? "yes" : "no"],
    ];

    return Frame([
      d.listed === true
        ? Note([h("strong", { key: "a" }, "Preview. "), "The People page shows this card."], false)
        : Note(
            [
              h("strong", { key: "a" }, "Not listed. "),
              "This person has not agreed to appear, so the site never shows or links them, not even in preview builds.",
            ],
            true,
          ),
      h(
        "article",
        { className: "bl-person", key: "card", "aria-labelledby": "pv-person-name" },
        photoSrc
          ? h("img", {
              className: "bl-person__photo",
              src: photoSrc,
              alt: d.photo_alt || "",
              width: 64,
              height: 64,
            })
          : h(
              "span",
              {
                className: "bl-pearl bl-pearl--avatar bl-pearl--gloss",
                "data-swatch": firstDir && firstDir.color ? firstDir.color : undefined,
                "aria-hidden": "true",
              },
              h("span", { className: "bl-pearl__initials" }, initials(d.name)),
            ),
        h(
          "div",
          { className: "bl-person__body" },
          h(
            "h1",
            { className: "bl-person__name", id: "pv-person-name" },
            d.name || h("span", { className: "cms-preview__empty" }, "No name"),
          ),
          h(
            "p",
            { className: "bl-person__role" },
            role + (has(d.program) ? " · " + d.program : ""),
          ),
          DraftBadge(d.draft),
          showNowAt ? h("p", { className: "t-sm" }, "Now at " + d.now_at) : null,
          has(d.interests) ? h("p", { className: "t-sm t-muted" }, d.interests.join(" · ")) : null,
          Tags(props, d.directions),
          links.length || showEmail
            ? h(
                "ul",
                {
                  className: "bl-person__links",
                  "aria-label": "Links for " + (d.name || "this person"),
                },
                links.map(function (k) {
                  return h("li", { key: k }, h("a", { href: d.links[k] }, LINK_LABELS[k] || k));
                }),
                showEmail
                  ? h("li", { key: "email" }, h("a", { href: "mailto:" + d.email }, "Email"))
                  : null,
              )
            : null,
        ),
      ),
      h(
        "section",
        { className: "cms-preview__section", key: "consent", "aria-labelledby": "pv-consent" },
        h("h2", { id: "pv-consent" }, "What the site will show"),
        h(
          "ul",
          { className: "cms-preview__list t-sm" },
          consent.map(function (row) {
            return h("li", { key: row[0] }, h("strong", null, row[0] + ": "), row[1]);
          }),
        ),
      ),
      h("div", { key: "body" }, Body(props, "Bio")),
    ]);
  }

  // -------------------------------------------------------------------------
  // Publication (mirrors src/components/ui/PublicationEntry.tsx)

  var MATERIALS = [
    ["pdf", "PDF"],
    ["ssrn", "SSRN"],
    ["arxiv", "arXiv"],
    ["doi", "DOI"],
    ["publisher", "Publisher"],
    ["code", "Code"],
    ["data", "Data"],
    ["slides", "Slides"],
    ["video", "Video"],
  ];

  function statusLine(d) {
    if (!has(d.status) || d.status === "published") return null;
    var parts = [
      (L.publicationStatus[d.status] || d.status) + (has(d.status_note) ? " " + d.status_note : ""),
    ];
    if (has(d.as_of)) parts.push("as of " + formatDate(d.as_of));
    if (d.status_source === "self-reported") parts.push("reported by the lab");
    return parts.join(" · ");
  }

  function PublicationPreview(props) {
    var d = data(props.entry);
    var links = d.links || {};
    var authors = Array.isArray(d.authors) ? d.authors : [];
    var venue = [
      d.venue,
      has(d.volume) ? d.volume + (has(d.issue) ? "(" + d.issue + ")" : "") : null,
      d.pages,
    ]
      .filter(has)
      .join(", ");
    var status = statusLine(d);
    var publicVersion =
      has(d.doi) || has(links.ssrn) || has(links.arxiv) || has(links.pdf) || has(links.publisher);
    var documentedTalk = (d.presentations || []).some(function (p) {
      return p && has(p.url);
    });
    var counts = publicVersion || documentedTalk;
    var materials = MATERIALS.filter(function (m) {
      return m[0] === "doi"
        ? has(d.doi)
        : m[0] === "publisher"
          ? !has(d.doi) && has(links.publisher)
          : has(links[m[0]]);
    }).map(function (m) {
      var href = m[0] === "doi" ? "https://doi.org/" + d.doi : links[m[0]];
      return { key: m[0], label: m[1], href: href };
    });
    (d.press || []).forEach(function (p, i) {
      if (p && has(p.url))
        materials.push({ key: "press" + i, label: "Press: " + (p.outlet || "link"), href: p.url });
    });
    var title = d.title || "this paper";

    return Frame([
      counts
        ? Note(
            [
              h("strong", { key: "a" }, "Preview. "),
              "The publication list and the paper page show it like this.",
            ],
            false,
          )
        : Note(
            [
              h("strong", { key: "a" }, "In progress only. "),
              "Without a DOI, SSRN, arXiv, PDF or publisher link, or a presentation with an evidence link, this item is listed under “Work in progress” and does not count toward a direction.",
            ],
            true,
          ),
      h(
        "article",
        { className: "bl-pub", key: "card", "aria-labelledby": "pv-pub-title" },
        h(
          "div",
          { className: "bl-card__meta" },
          has(d.type) ? Badge("", L.publicationTypes[d.type] || d.type, "type") : null,
          has(d.year) ? h("span", { className: "t-mono", key: "year" }, String(d.year)) : null,
          DraftBadge(d.draft),
        ),
        h(
          "h1",
          { className: "bl-pub__title", id: "pv-pub-title" },
          d.title || h("span", { className: "cms-preview__empty" }, "Untitled"),
        ),
        authors.length
          ? h(
              "p",
              { className: "bl-pub__authors" },
              authors.map(function (a, i) {
                var sep =
                  i === 0
                    ? ""
                    : i === authors.length - 1
                      ? authors.length > 2
                        ? ", and "
                        : " and "
                      : ", ";
                var name = (a && a.name) || "?";
                return h(
                  "span",
                  { key: i },
                  sep,
                  a && has(a.person)
                    ? h("strong", { className: "bl-pub__author--lab" }, name)
                    : name,
                );
              }),
            )
          : null,
        venue || status
          ? h(
              "p",
              { className: "bl-pub__venue" },
              venue ? h("cite", null, venue) : null,
              venue && status ? h("span", { "aria-hidden": "true" }, " · ") : null,
              status ? h("span", { className: "bl-pub__status" }, status) : null,
            )
          : null,
        has(d.awards)
          ? h(
              "ul",
              { className: "bl-pub__awards", "aria-label": "Awards" },
              d.awards.map(function (a, i) {
                return h(
                  "li",
                  { key: i },
                  Badge("strong", (a.name || "") + (has(a.year) ? ", " + a.year : ""), "b"),
                  has(a.under_title)
                    ? h("span", { className: "t-sm t-muted" }, " (as “" + a.under_title + "”)")
                    : null,
                );
              }),
            )
          : null,
        Tags(props, d.directions),
        materials.length
          ? h(
              "ul",
              { className: "bl-materials", "aria-label": "Materials for " + title },
              materials.map(function (m) {
                return h("li", { key: m.key }, h("a", { href: m.href }, m.label));
              }),
            )
          : null,
      ),
      has(d.in_brief)
        ? h(
            "section",
            { className: "cms-preview__section", key: "brief", "aria-labelledby": "pv-brief" },
            h("h2", { id: "pv-brief" }, "In brief"),
            h("p", null, d.in_brief),
          )
        : null,
      h("div", { key: "body" }, Body(props, "Notes")),
    ]);
  }

  // -------------------------------------------------------------------------
  // Research direction: the pearl, its colour and the page header (helps choosing colours)

  /** Mirrors src/components/ui/EvidenceLabel.tsx. */
  var EVIDENCE = {
    published: "Published",
    "working-paper": "Working paper",
    preliminary: "Preliminary",
  };

  // Colours of the OTHER directions (verification finding CMS-07). Decap hands
  // previews getCollection(name); cms-hooks.js keeps it for its save check and
  // caches the saved directions. The note re-renders once they have loaded.

  var hooks = window.BobalabCmsHooks || {};

  function swatchName(id) {
    return ((L.swatches || {})[id] || { name: id }).name;
  }

  function colourUseRows(slug, d, pairs) {
    var list = typeof hooks.cachedDirections === "function" ? hooks.cachedDirections() : null;
    var rows = [];
    var archived = d.status === "archived";
    var hits =
      list && typeof hooks.colourConflicts === "function"
        ? hooks.colourConflicts(slug, d.color, list, L.confusablePairs || [])
        : null;
    if (hits && hits.same.length && !archived) {
      rows.push(
        Note(
          [
            h("strong", { key: "a" }, "Colour taken. "),
            swatchName(d.color) +
              " is already the colour of " +
              hits.same
                .map(function (x) {
                  return "“" + x.name + "”";
                })
                .join(", ") +
              ". Choose another colour: the CMS will not save this one.",
          ],
          true,
        ),
      );
    }
    if (pairs.length) {
      rows.push(
        h(
          "p",
          { className: "t-sm t-muted", key: "pairs" },
          "Colour-blind readers may confuse it with " +
            pairs
              .map(function (p) {
                var other = p[0] === d.color ? p[1] : p[0];
                var users = hits
                  ? hits.confusable.filter(function (x) {
                      return x.color === other;
                    })
                  : [];
                var use = !list
                  ? ""
                  : users.length
                    ? ", used by " +
                      users
                        .map(function (x) {
                          return "“" + x.name + "”";
                        })
                        .join(", ")
                    : ", not used by another direction now";
                return swatchName(other) + " (" + p[2] + use + ")";
              })
              .join(", ") +
            "; do not use both.",
        ),
      );
    }
    if (list) {
      var others = list.filter(function (x) {
        return x.slug !== slug && x.data && x.data.status !== "archived" && x.data.color;
      });
      if (others.length) {
        rows.push(
          h(
            "p",
            { className: "t-sm t-muted", key: "inuse" },
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
          ),
        );
      }
    }
    return rows;
  }

  // With Decap's createClass (the browser), a small component loads the other
  // directions once and re-renders; without it (unit tests), rows render directly.
  var ColourUseClass =
    typeof window.createClass === "function"
      ? window.createClass({
          displayName: "BobalabColourUse",
          getInitialState: function () {
            return { n: 0 };
          },
          componentDidMount: function () {
            var self = this;
            self.alive = true;
            if (typeof hooks.loadDirections === "function")
              hooks.loadDirections(false).then(function () {
                if (self.alive) self.setState({ n: self.state.n + 1 });
              });
          },
          componentWillUnmount: function () {
            this.alive = false;
          },
          render: function () {
            return h.apply(
              null,
              ["div", null].concat(colourUseRows(this.props.slug, this.props.d, this.props.pairs)),
            );
          },
        })
      : null;

  function ColourUse(props, d, pairs) {
    if (typeof hooks.rememberCollectionLoader === "function")
      hooks.rememberCollectionLoader(props.getCollection);
    var slug = (props.entry && props.entry.get("slug")) || "";
    if (ColourUseClass)
      return h(ColourUseClass, { key: "use", slug: slug, d: d, pairs: pairs, color: d.color });
    return h.apply(null, ["div", { key: "use" }].concat(colourUseRows(slug, d, pairs)));
  }

  function DirectionPreview(props) {
    var d = data(props.entry);
    var sw = (L.swatches || {})[d.color] || null;
    var archived = d.status === "archived";
    var pairs = (L.confusablePairs || []).filter(function (p) {
      return p[0] === d.color || p[1] === d.color;
    });
    var findings = Array.isArray(d.findings) ? d.findings : [];
    return Frame([
      archived
        ? Note(
            [
              h("strong", { key: "a" }, "Archived. "),
              "Not in Fig. 1; the page stays, with an “Archived” note" +
                (has(d.archived_on)
                  ? " dated " + formatDate(d.archived_on)
                  : " (set “Archived on”)") +
                ".",
            ],
            true,
          )
        : Note(
            [h("strong", { key: "a" }, "Preview. "), "The direction’s pearl and page header."],
            false,
          ),
      h(
        "header",
        { className: "cms-preview__band", "data-swatch": d.color, key: "band" },
        h(
          "div",
          { className: "cms-preview__band-row" },
          h("span", {
            className: "bl-pearl bl-pearl--card bl-pearl--gloss",
            "data-swatch": d.color,
            "aria-hidden": "true",
          }),
          h(
            "div",
            null,
            has(d.short_label)
              ? h("p", { className: "t-eyebrow cms-preview__label" }, d.short_label)
              : null,
            h("h1", null, d.title || h("span", { className: "cms-preview__empty" }, "Untitled")),
          ),
        ),
        has(d.question) ? h("p", { className: "t-lead" }, d.question) : null,
        has(d.summary) ? h("p", null, d.summary) : null,
        d.draft ? h("p", null, DraftBadge(true)) : null,
      ),
      h(
        "section",
        { className: "cms-preview__section", key: "colour", "aria-labelledby": "pv-colour" },
        h("h2", { id: "pv-colour" }, "Colour"),
        h(
          "p",
          { className: "t-sm" },
          sw ? sw.name : "No colour chosen",
          sw && sw.reserve
            ? " · a reserve colour: use it only when the six main colours are taken"
            : "",
        ),
        ColourUse(props, d, pairs),
      ),
      findings.length
        ? h(
            "section",
            {
              className: "cms-preview__section",
              key: "findings",
              "aria-labelledby": "pv-findings",
            },
            h("h2", { id: "pv-findings" }, "Key findings"),
            h(
              "ul",
              { className: "cms-preview__list" },
              findings.map(function (f, i) {
                return h(
                  "li",
                  { key: i },
                  h("p", null, (f && f.text) || ""),
                  f && f.evidence
                    ? h(
                        "span",
                        { className: "bl-evidence bl-evidence--" + f.evidence },
                        h("span", { className: "bl-evidence__glyph", "aria-hidden": "true" }),
                        h("span", null, EVIDENCE[f.evidence] || f.evidence),
                      )
                    : null,
                );
              }),
            ),
          )
        : null,
      has(d.methods)
        ? h("p", { className: "t-sm t-muted", key: "methods" }, "Methods: " + d.methods.join(" · "))
        : null,
      h("div", { key: "body" }, Body(props)),
    ]);
  }

  // -------------------------------------------------------------------------
  // Project (mirrors src/components/ui/ProjectCard.tsx; consent gating for
  // collaborators and partners as on the project page)

  var PROJECT_STATUS = {
    active: "Active",
    completed: "Completed",
    paused: "Paused",
    archived: "Archived",
  };

  function projectYears(d) {
    if (has(d.start_year) && has(d.end_year) && d.end_year !== d.start_year)
      return d.start_year + "–" + d.end_year;
    if (has(d.start_year))
      return d.status === "active" ? "Since " + d.start_year : String(d.start_year);
    return null;
  }

  function LinkList(label, items) {
    if (!items.length) return null;
    return h(
      "ul",
      { className: "cms-preview__list", "aria-label": label },
      items.map(function (it, i) {
        return h(
          "li",
          { key: i },
          has(it.href) ? h("a", { href: it.href }, it.text) : it.text,
          has(it.after) ? h("span", { className: "t-muted" }, " · " + it.after) : null,
        );
      }),
    );
  }

  function ProjectPreview(props) {
    var d = data(props.entry);
    var years = projectYears(d);
    var firstDir = has(d.directions) ? related(props, "directions", d.directions[0]) : null;
    var collaborators = Array.isArray(d.collaborators) ? d.collaborators : [];
    var partners = Array.isArray(d.partners) ? d.partners : [];
    var shownCollab = collaborators.filter(function (c) {
      return c && c.consent === true && has(c.name);
    });
    var shownPartners = partners.filter(function (p) {
      return p && p.public === true && has(p.name);
    });
    var hiddenCollab = collaborators.length - shownCollab.length;
    var hiddenPartners = partners.length - shownPartners.length;
    var team = (d.team || []).map(function (s) {
      return { text: personName(props, s) };
    });
    var outputs = (d.outputs || [])
      .filter(function (o) {
        return o && has(o.label);
      })
      .map(function (o) {
        return { text: o.label, href: o.url };
      });
    var funding = (d.funding || [])
      .filter(function (f) {
        return f && has(f.name);
      })
      .map(function (f) {
        return { text: f.name, href: f.url };
      });
    var hidden = [];
    if (hiddenCollab > 0)
      hidden.push(
        hiddenCollab +
          (hiddenCollab === 1 ? " collaborator" : " collaborators") +
          " without consent",
      );
    if (hiddenPartners > 0)
      hidden.push(
        hiddenPartners + (hiddenPartners === 1 ? " partner" : " partners") + " not public",
      );

    return Frame([
      Note(
        [
          h("strong", { key: "a" }, "Preview. "),
          "The project card on the Research and Projects pages, then the project page.",
        ],
        false,
      ),
      h(
        "article",
        {
          className: "bl-card",
          key: "card",
          "data-swatch": firstDir && firstDir.color ? firstDir.color : undefined,
          "aria-labelledby": "pv-project-title",
        },
        h(
          "div",
          { className: "bl-card__meta" },
          has(d.status)
            ? Badge(
                d.status === "active" ? "strong" : "neutral",
                PROJECT_STATUS[d.status] || d.status,
                "st",
              )
            : null,
          years ? h("span", { className: "t-mono", key: "y" }, years) : null,
          DraftBadge(d.draft),
        ),
        h(
          "h1",
          { className: "bl-card__title", id: "pv-project-title" },
          d.title || h("span", { className: "cms-preview__empty" }, "Untitled"),
        ),
        has(d.summary) ? h("p", { className: "bl-project__summary" }, d.summary) : null,
        Tags(props, d.directions),
      ),
      h("div", { key: "body" }, Body(props)),
      team.length ? Section("pv-team", "Team", [LinkList("Team", team)]) : null,
      shownCollab.length
        ? Section("pv-collab", "Collaborators", [
            LinkList(
              "Collaborators",
              shownCollab.map(function (c) {
                return { text: c.name, href: c.url, after: c.affiliation };
              }),
            ),
          ])
        : null,
      shownPartners.length
        ? Section("pv-partners", "Partners", [
            LinkList(
              "Partners",
              shownPartners.map(function (p) {
                return { text: p.name, href: p.url };
              }),
            ),
          ])
        : null,
      outputs.length ? Section("pv-outputs", "Outputs", [LinkList("Outputs", outputs)]) : null,
      funding.length ? Section("pv-funding", "Funding", [LinkList("Funding", funding)]) : null,
      hidden.length
        ? Note(
            [h("strong", { key: "a" }, "Not shown on the site: "), hidden.join("; ") + "."],
            true,
          )
        : null,
    ]);
  }

  // -------------------------------------------------------------------------
  // Opportunity (mirrors src/components/pages/OpportunityCard.tsx on /join/)

  var ROUTE_LABELS = {
    students: "How to join",
    "phd-postdoc": "How to join",
    partners: "Next step",
    press: "Next step",
  };

  function OpportunityPreview(props) {
    var d = data(props.entry);
    var closes = has(d.closes_on) ? String(d.closes_on).slice(0, 10) : "";
    var open = (d.status === "open" || d.status === "rolling") && (!closes || closes >= today());
    var label = open
      ? d.status === "rolling"
        ? "Open, rolling"
        : "Open"
      : d.status === "unknown"
        ? "Status not confirmed"
        : "Closed";
    var title = d.title || "this opportunity";
    var links = [];
    if (open && has(d.apply_url)) links.push({ text: "Apply", href: d.apply_url });
    if (has(d.url)) links.push({ text: "More information", href: d.url });
    if (has(d.email)) links.push({ text: d.email, href: "mailto:" + d.email });
    return Frame([
      Note(
        [
          h("strong", { key: "a" }, "Preview. "),
          "The Join page lists this under its audience. “Apply” appears only while it is open.",
        ],
        false,
      ),
      h(
        "article",
        { className: "bl-card", key: "card", "aria-labelledby": "pv-opp-title" },
        h(
          "h1",
          { className: "bl-card__title", id: "pv-opp-title" },
          d.title || h("span", { className: "cms-preview__empty" }, "Untitled"),
        ),
        h(
          "p",
          { className: "bl-card__meta" },
          has(d.status) ? Badge(open ? "accent" : "", label, "st") : null,
          open && closes ? h("span", { key: "c" }, "Closes " + formatDate(closes)) : null,
          has(d.as_of) ? h("span", { key: "a" }, "as of " + formatDate(d.as_of)) : null,
          DraftBadge(d.draft),
        ),
        has(d.route)
          ? h(
              "p",
              null,
              h("strong", null, (ROUTE_LABELS[d.audience] || "How to apply") + ": "),
              d.route,
            )
          : null,
        Markdown(props, "body"),
        LinkList("Links for " + title, links),
        Tags(props, d.directions),
      ),
    ]);
  }

  // -------------------------------------------------------------------------
  // Pages (file collection): About, Accessibility, Privacy; Join; Home texts

  var PAGE_NAMES = { about: "About", accessibility: "Accessibility", privacy: "Privacy" };

  function pagePreview(name) {
    return function TextPagePreview(props) {
      var d = data(props.entry);
      return Frame([
        Note(
          [h("strong", { key: "a" }, "Preview. "), "The page header and text of /" + name + "/."],
          false,
        ),
        h(
          "header",
          { className: "cms-preview__head", key: "head" },
          h("h1", null, d.title || PAGE_NAMES[name]),
          has(d.intro) ? h("p", { className: "t-lead" }, d.intro) : null,
          has(d.last_reviewed) || d.draft
            ? h(
                "p",
                { className: "cms-preview__meta" },
                has(d.last_reviewed)
                  ? h("span", { key: "r" }, "Last reviewed " + formatDate(d.last_reviewed))
                  : null,
                DraftBadge(d.draft),
              )
            : null,
        ),
        h("div", { key: "body" }, Body(props)),
      ]);
    };
  }

  /** Section titles as on /join/ (src/app/join/page.tsx). */
  function JoinPreview(props) {
    var d = data(props.entry);
    var sections = [
      ["students", "Students & research assistants"],
      ["partners", "Partners & data collaborators"],
      ["press", "Press"],
    ];
    return Frame(
      [
        Note(
          [
            h("strong", { key: "a" }, "Preview. "),
            "The texts of /join/. Positions and their status come from Opportunities.",
          ],
          false,
        ),
        h(
          "header",
          { className: "cms-preview__head", key: "head" },
          h("h1", null, "Work with us"),
          has(d.intro) ? h("div", { className: "t-lead" }, Markdown(props, "intro")) : null,
          d.draft ? h("p", { className: "cms-preview__meta" }, DraftBadge(true)) : null,
        ),
      ].concat(
        sections.map(function (s) {
          var extra =
            s[0] === "partners" && has(d.data_statement)
              ? h(
                  "div",
                  { key: "data", className: "cms-preview__section" },
                  h("h3", null, "How we handle data"),
                  Markdown(props, "data_statement"),
                )
              : null;
          if (!has(d[s[0]]) && !extra) return null;
          return Section("pv-" + s[0], s[1], [Markdown(props, s[0]), extra]);
        }),
      ),
    );
  }

  function HomePreview(props) {
    var d = data(props.entry);
    var findings = Array.isArray(d.featured_findings) ? d.featured_findings : [];
    return Frame([
      Note(
        [
          h("strong", { key: "a" }, "Preview. "),
          "The mission under the lab name, and the home page’s featured findings.",
        ],
        false,
      ),
      has(d.mission) ? h("p", { className: "t-lead", key: "mission" }, d.mission) : null,
      d.draft ? h("p", { className: "cms-preview__meta", key: "draft" }, DraftBadge(true)) : null,
      findings.length
        ? Section("pv-featured", "What we’ve learned", [
            h(
              "ul",
              { className: "cms-preview__list cms-preview__findings" },
              findings.map(function (f, i) {
                var pub =
                  f && has(f.publication) ? related(props, "publications", f.publication) : null;
                return h(
                  "li",
                  { key: i },
                  h("p", null, (f && f.text) || ""),
                  h(
                    "div",
                    { className: "cms-preview__meta" },
                    f && f.evidence
                      ? h(
                          "span",
                          { className: "bl-evidence bl-evidence--" + f.evidence },
                          h("span", { className: "bl-evidence__glyph", "aria-hidden": "true" }),
                          h("span", null, EVIDENCE[f.evidence] || f.evidence),
                        )
                      : null,
                    pub ? h("span", { className: "t-sm t-muted" }, pub.title) : null,
                    f && has(f.direction) ? Tags(props, [f.direction]) : null,
                  ),
                );
              }),
            ),
          ])
        : null,
    ]);
  }

  CMS.registerPreviewTemplate("directions", DirectionPreview);
  CMS.registerPreviewTemplate("news", NewsPreview);
  CMS.registerPreviewTemplate("people", PersonPreview);
  CMS.registerPreviewTemplate("publications", PublicationPreview);
  CMS.registerPreviewTemplate("projects", ProjectPreview);
  CMS.registerPreviewTemplate("opportunities", OpportunityPreview);
  // File collections register by file name.
  CMS.registerPreviewTemplate("about", pagePreview("about"));
  CMS.registerPreviewTemplate("accessibility", pagePreview("accessibility"));
  CMS.registerPreviewTemplate("privacy", pagePreview("privacy"));
  CMS.registerPreviewTemplate("join", JoinPreview);
  CMS.registerPreviewTemplate("home", HomePreview);
})();
