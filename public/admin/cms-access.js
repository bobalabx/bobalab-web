/*
 * BOBALAB CMS: "Who can edit" (DECISIONS D-20). Loaded by /admin/ after
 * cms-deploy.js and before cms-dock.js, whose [Who can edit] button opens this
 * panel (below 800 px the button is in the Recent changes sheet instead, so the
 * dock keeps its words); sets window.BobalabAccess.
 *
 * The panel lists who can sign in to the dashboard and save (the repository's
 * collaborators), the invitations still waiting, and lets the owner (or a
 * repository admin, once the account is an organization) invite someone by
 * GitHub username, cancel an invitation and remove an editor.
 *
 *  - Who may manage editors: GET /repos/{repo} with the editor's everyday
 *    sign-in (BobalabGitHub, scope public_repo) says permissions.admin. On a
 *    personal account only the owner is admin; in an organization, its repo
 *    admins. Everyone else gets a plain explanation of whom to ask.
 *  - The extra permission. Listing collaborators and every change need the
 *    classic OAuth scope "repo" (GitHub documents "read:org" too for the list),
 *    which the everyday sign-in does not have. The scopes asked for are
 *    cms-data.js auth.scopes (cms/source.mjs access.scopes; "repo" today). An
 *    admin presses [Give permission]: the lab's sign-in service (the Worker in
 *    cms-data.js auth.baseUrl, a fork of sveltia-cms-auth) opens in a popup
 *    with scope=<those scopes> and answers with Decap's handshake: the popup
 *    posts "authorizing:github", this page echoes it back to the popup only,
 *    then the popup posts "authorization:github:success:{"provider":"github",
 *    "token":…}" (or ":error:{…}").
 *  - Messages from a popup this file opened are this file's alone: a capturing
 *    listener on window stops them before any other listener sees them (at the
 *    target, capturing listeners run first). Decap's own sign-in listener, left
 *    over from an unfinished Login in this tab, would otherwise sign in with the
 *    token and keep it in localStorage. They count only when their origin is
 *    exactly the Worker's and (for the answer) the handshake came first. The
 *    token must belong to the account signed in to the dashboard (GET /user)
 *    and, when GitHub says the token's scopes (X-OAuth-Scopes, exposed by
 *    GitHub's CORS), carry every scope asked for.
 *  - That token lives only in this page's memory: never in any storage, never
 *    in an address, never logged, for at most 8 hours. A reload or closing the
 *    page drops it, and so do sign-out, another account signing in, a 401 and
 *    [Turn it off now]. It is used for nothing but the six requests in rules()
 *    below, never on the owner account. This file is the only admin script
 *    that writes to GitHub (D-20); every other write is Decap's Save.
 *    (GitHub itself keeps the grant until the account withdraws it under
 *    Settings → Applications; the page cannot revoke a token.)
 *  - A change still being sent when the panel closes is not lost: reopening
 *    the panel waits for it and shows its result.
 *  - Local demo: there is no GitHub sign-in, so the panel only explains that
 *    access is managed on the live dashboard, and makes no request.
 *
 * Styles: cms-ui.css (.bl-access). tests/unit/cms/access.test.ts runs this file
 * in a sandbox with a fake GitHub and a fake popup (window.BOBALAB_TEST_HOOKS
 * adds its test hooks); tests/e2e/cms-access.spec.ts drives it in the browser
 * with routed fakes.
 */
(function (root) {
  "use strict";

  var API = "https://api.github.com";
  var API_VERSION = "2022-11-28";
  var TOKEN_TTL = 8 * 60 * 60 * 1000;
  var GRANT_MAX = 10 * 60 * 1000; // the sign-in service's own state cookie lasts 10 minutes
  var POLL_MS = 500;
  var CLOSED_GRACE = 600; // a last message may still be on its way when the popup closes
  var CHECK_EVERY = 2000;
  var PAGES_MAX = 5; // 100 collaborators a page
  var POPUPS_KEPT = 5;
  var LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
  var SCOPE_RE = /^[a-z_]+(?::[a-z_]+)?$/;
  // GitHub's secondary limits may come as a 403 (or a 422 "spammed") without any header (DOCUMENTED).
  var RATE_WORDS = /rate limit|abuse|spammed|too many requests/i;
  // A wider scope GitHub may list instead of the one asked for.
  var IMPLIED = { "read:org": ["write:org", "admin:org"] };
  var DEFAULT_AUTH = {
    baseUrl: "https://bobalab-cms-auth.bobalabx-034.workers.dev",
    endpoint: "auth",
    adminUrl: "https://bobalabx.github.io/bobalab-web/admin/",
  };
  var WITHDRAW_AT = "github.com → Settings → Applications → Authorized OAuth Apps";

  function ui() {
    return root.BobalabUi;
  }
  function gh() {
    return root.BobalabGitHub;
  }
  function cfg() {
    return root.BOBALAB_CMS || {};
  }
  function doc() {
    var d = root.document;
    return d && typeof d.createElement === "function" ? d : null;
  }
  function safe(fn, fallback) {
    try {
      return fn();
    } catch {
      return fallback;
    }
  }
  /** Run fn after the browser's own scrolling for a focus change (next frame). */
  function later(fn) {
    if (typeof root.requestAnimationFrame === "function") root.requestAnimationFrame(fn);
    else root.setTimeout(fn, 0);
  }

  function repo() {
    var g = gh();
    return (g && g.repo()) || cfg().repo || "bobalabx/bobalab-web";
  }

  function authCfg() {
    var a = cfg().auth || {};
    var scopes = (Array.isArray(a.scopes) ? a.scopes : [])
      .map(function (s) {
        return String(s).trim();
      })
      .filter(function (s, i, all) {
        return SCOPE_RE.test(s) && all.indexOf(s) === i;
      });
    if (scopes.indexOf("repo") === -1) scopes.unshift("repo");
    return {
      baseUrl: String(a.baseUrl || DEFAULT_AUTH.baseUrl).replace(/\/+$/, ""),
      endpoint: String(a.endpoint || DEFAULT_AUTH.endpoint).replace(/^\/+|\/+$/g, ""),
      adminUrl: String(a.adminUrl || DEFAULT_AUTH.adminUrl),
      scopes: scopes,
    };
  }

  /** “repo” or “repo” and “read:org”. */
  function scopeNames() {
    return authCfg()
      .scopes.map(function (s) {
        return "“" + s + "”";
      })
      .join(" and ");
  }

  /** The sign-in service's origin, or null when cms-data.js has no usable address. */
  function workerOrigin() {
    return safe(function () {
      var u = new URL(authCfg().baseUrl);
      return u.protocol === "https:" ? u.origin : null;
    }, null);
  }

  /** The site_id Decap sends to the sign-in service (its getSiteID: the host without the port). */
  function siteId() {
    var host = safe(function () {
      return new URL(root.location.href).hostname;
    }, "");
    return host === "localhost" ? "demo.decapcms.org" : host;
  }

  function grantUrl() {
    var a = authCfg();
    return (
      a.baseUrl +
      "/" +
      a.endpoint +
      "?provider=github&site_id=" +
      encodeURIComponent(siteId()) +
      "&scope=" +
      encodeURIComponent(a.scopes.join(","))
    );
  }

  /** github.com's page for the repository's collaborators (the way to manage them without this panel). */
  function collaboratorsUrl() {
    return "https://github.com/" + repo() + "/settings/access";
  }

  function me() {
    var g = gh();
    return g ? safe(g.user, null) : null;
  }

  function sameLogin(a, b) {
    return !!a && !!b && String(a).toLowerCase() === String(b).toLowerCase();
  }

  /** The token's scopes from X-OAuth-Scopes ("repo, user"), or null when GitHub did not say. */
  function scopesOf(headers) {
    var raw = safe(function () {
      return headers && typeof headers.get === "function" ? headers.get("x-oauth-scopes") : null;
    }, null);
    if (raw === null || raw === undefined) return null;
    return String(raw)
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  /** The scopes asked for that the token lacks ([] when GitHub did not say which it has). */
  function missingScopes(scopes) {
    if (!scopes) return [];
    return authCfg().scopes.filter(function (want) {
      if (scopes.indexOf(want) !== -1) return false;
      return !(IMPLIED[want] || []).some(function (w) {
        return scopes.indexOf(w) !== -1;
      });
    });
  }

  // ---------------------------------------------------------------------------
  // The extra permission: in this page's memory only

  var held = null; // {token, login, at, scopes}
  var dropped = ""; // why the last one went: signed-out | other-account | expired | withdrawn | off

  function keep(token, login, scopes) {
    held = { token: token, login: login, at: Date.now(), scopes: scopes || null };
    dropped = "";
  }

  function forget(why) {
    if (held) dropped = why || "off";
    held = null;
  }

  /** The extra permission for the signed-in account, or null (a stale or foreign one is dropped). */
  function permission() {
    var t = held;
    if (!t) return null;
    var u = me();
    var age = Date.now() - Number(t.at || 0);
    // (a minute of clock skew is allowed; anything older than 8 hours goes)
    var why = !u
      ? "signed-out"
      : !sameLogin(t.login, u.login)
        ? "other-account"
        : !(age > -60000 && age < TOKEN_TTL)
          ? "expired"
          : "";
    if (why) {
      forget(why);
      return null;
    }
    return t;
  }

  // ---------------------------------------------------------------------------
  // Requests with the extra permission: these six, nothing else

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function rules() {
    var r = "^/repos/" + escapeRe(repo());
    return [
      ["GET", /^\/user$/],
      [
        "GET",
        new RegExp(r + "/collaborators\\?affiliation=(?:all|direct)&per_page=100&page=[1-9]$"),
      ],
      ["GET", new RegExp(r + "/invitations\\?per_page=100&page=[1-9]$")],
      ["PUT", new RegExp(r + "/collaborators/[A-Za-z0-9-]{1,39}$")],
      ["DELETE", new RegExp(r + "/collaborators/[A-Za-z0-9-]{1,39}$")],
      ["DELETE", new RegExp(r + "/invitations/[0-9]{1,15}$")],
    ];
  }

  function allowed(method, path) {
    return rules().some(function (rule) {
      return rule[0] === method && rule[1].test(path);
    });
  }

  /** True for a change to the owner account's own access (never sent). */
  function touchesOwner(method, path) {
    if (method !== "PUT" && method !== "DELETE") return false;
    var m = /\/collaborators\/([^/?#]+)$/.exec(path);
    if (!m) return false;
    return [repo().split("/")[0], S.info && S.info.ownerLogin].some(function (o) {
      return sameLogin(o, m[1]);
    });
  }

  function accessError(kind, status, message, extra) {
    var e = new Error(message);
    e.name = "AccessError";
    e.kind = kind;
    e.status = status || 0;
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        e[k] = extra[k];
      });
    }
    return e;
  }

  function header(res, name) {
    return safe(function () {
      return res.headers.get(name);
    }, null);
  }

  /** GitHub's own words from an error body ("Validation Failed: …"). */
  function githubWords(data) {
    if (!data || typeof data !== "object") return "";
    var parts = [];
    if (data.message) parts.push(String(data.message));
    (Array.isArray(data.errors) ? data.errors : []).forEach(function (x) {
      var m = x && (x.message || x.code);
      if (m) parts.push(String(m));
    });
    return parts.join(": ").slice(0, 300);
  }

  function errorFor(res, data) {
    var s = res.status;
    var words = githubWords(data);
    var extra = { github: words };
    if (s === 401) return accessError("auth", s, "GitHub no longer accepts the permission.", extra);
    if (s === 403 || s === 429 || s === 422) {
      var retry = Number(header(res, "retry-after"));
      var empty = header(res, "x-ratelimit-remaining") === "0";
      if (empty || retry > 0 || s === 429 || RATE_WORDS.test(words)) {
        // GitHub: wait Retry-After; else until x-ratelimit-reset when none are left; else a minute.
        var reset = Number(header(res, "x-ratelimit-reset"));
        extra.resetAt =
          retry > 0
            ? Date.now() + retry * 1000
            : empty && reset
              ? reset * 1000
              : Date.now() + 60 * 1000;
        return accessError("rate", s, "GitHub is busy.", extra);
      }
    }
    if (s === 403) return accessError("forbidden", s, "GitHub refused.", extra);
    if (s === 404) return accessError("not-found", s, "GitHub couldn't find it.", extra);
    if (s === 422) return accessError("invalid", s, "GitHub couldn't do it.", extra);
    return accessError("http", s, "GitHub answered with an error (" + s + ").", extra);
  }

  /**
   * One request with the extra permission. Refuses (without a request) any
   * method and address outside rules(), any change to the owner account, and
   * any call without the permission.
   */
  function request(method, path, body) {
    method = String(method || "").toUpperCase();
    path = String(path || "");
    if (!allowed(method, path) || touchesOwner(method, path)) {
      return Promise.reject(
        accessError("refused", 0, "BobalabAccess does not send " + method + " " + path),
      );
    }
    var t = permission();
    if (!t) return Promise.reject(accessError("no-permission", 0, "No extra permission."));
    if (typeof root.fetch !== "function") {
      return Promise.reject(accessError("network", 0, "Couldn't reach GitHub."));
    }
    var headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": API_VERSION,
      Authorization: "token " + t.token,
    };
    var init = { method: method, headers: headers, cache: "no-store", credentials: "omit" };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    return Promise.resolve()
      .then(function () {
        return root.fetch(API + path, init);
      })
      .then(
        function (res) {
          var read =
            res.status === 204 || res.status === 304
              ? Promise.resolve(null)
              : Promise.resolve()
                  .then(function () {
                    return res.json();
                  })
                  .then(null, function () {
                    return null;
                  });
          return read.then(function (data) {
            if (res.status >= 200 && res.status < 300) {
              return { status: res.status, data: data, headers: res.headers };
            }
            throw errorFor(res, data);
          });
        },
        function () {
          throw accessError("network", 0, "Couldn't reach GitHub.");
        },
      );
  }

  /** Every page of a list (100 a page, at most PAGES_MAX pages). */
  function listAll(base) {
    var out = [];
    function page(n) {
      return request("GET", base + "&page=" + n).then(function (r) {
        var rows = Array.isArray(r.data) ? r.data : [];
        out = out.concat(rows);
        var next = /rel="?next"?/.test(String(header(r, "link") || ""));
        if ((next || rows.length >= 100) && n < PAGES_MAX && rows.length) return page(n + 1);
        return out;
      });
    }
    return page(1);
  }

  // ---------------------------------------------------------------------------
  // Usernames (pure; exported)

  /**
   * What the admin typed → {login} or {problem}. Accepts "@name" and a
   * github.com profile address; refuses an email address with advice.
   */
  function parseUsername(input) {
    var first = "Type their GitHub username first.";
    var s = String(input === undefined || input === null ? "" : input).trim();
    if (!s) return { problem: first };
    var m = /^(?:https?:\/\/)?(?:www\.)?github\.com(?:\/([^/?#\s]*))?\/?(?:[?#].*)?$/i.exec(s);
    if (m) s = m[1] || "";
    if (s.charAt(0) === "@") s = s.slice(1).trim();
    if (!s) return { problem: first };
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) {
      return {
        problem:
          "That looks like an email address. GitHub invitations need the person's GitHub username: ask them for it (it is on their GitHub profile).",
      };
    }
    if (!LOGIN_RE.test(s)) {
      return {
        problem:
          "“" +
          s.slice(0, 60) +
          "” isn't a GitHub username. Usernames have only letters, numbers and single hyphens, at most 39 characters.",
      };
    }
    return { login: s };
  }

  // ---------------------------------------------------------------------------
  // Words

  function fullName(p) {
    return (p && (p.name || p.login)) || "Someone";
  }

  function busyUntil(e) {
    var u = ui();
    var at = e && e.resetAt && u && typeof u.clock === "function" ? u.clock(e.resetAt) : "";
    return "GitHub is busy" + (at ? "; try again at " + at + "." : "; try again in a minute.");
  }

  function lowerFirst(s) {
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  /** Plain words for the sign-in service's error codes (sveltia-cms-auth). */
  function workerProblem(code) {
    switch (code) {
      case "AUTH_CODE_REQUEST_FAILED":
        return "the GitHub window was cancelled or did not finish.";
      case "CSRF_DETECTED":
        return "the GitHub window was open too long, or opened twice.";
      case "UNSUPPORTED_DOMAIN":
        return "the sign-in service does not accept this site's address. Tell a maintainer.";
      case "MISCONFIGURED_CLIENT":
      case "UNSUPPORTED_BACKEND":
        return "the sign-in service is not set up correctly. Tell a maintainer.";
      case "TOKEN_REQUEST_FAILED":
      case "MALFORMED_RESPONSE":
        return "the sign-in service had a problem. Try again in a minute.";
      default:
        // GitHub's own codes ("bad_verification_code", …) and malformed answers
        return "the sign-in stopped on GitHub's side. Try again; if it keeps happening, tell a maintainer.";
    }
  }

  /** Why the extra permission went, and what to do (what: "send the invitation", or "" for the lists). */
  function goneText(why, what) {
    var again = what
      ? " Give it again, then " + what + " again."
      : " Give it again to manage editors.";
    if (why === "signed-out")
      return (
        "You were signed out of the dashboard, so managing editors stopped" +
        (what ? " and nothing was changed" : "") +
        ". Sign in again first."
      );
    if (why === "other-account")
      return (
        "Another account signed in to the dashboard in this browser, so the extra permission was dropped" +
        (what ? " and nothing was changed" : "") +
        "."
      );
    if (why === "expired")
      return "The extra permission ran out: this page keeps it for at most 8 hours." + again;
    return "The extra permission has expired or was withdrawn on GitHub." + again;
  }

  /** The scopes a new token lacks, in plain words. */
  function missingText(missing) {
    if (missing.length === 1 && missing[0] === "repo") {
      return "GitHub gave less access than needed. Press Give permission again and, on GitHub's screen, leave “repo” (access to repositories) ticked.";
    }
    var others = missing.filter(function (s) {
      return s !== "repo";
    });
    return (
      "GitHub didn't give " +
      others
        .map(function (s) {
          return "“" + s + "”";
        })
        .join(" and ") +
      (missing.indexOf("repo") !== -1 ? " (nor “repo”)" : "") +
      ". The lab's sign-in service may not offer it yet: tell a maintainer (docs/HANDOVER.md §4). Nothing was changed."
    );
  }

  // ---------------------------------------------------------------------------
  // State

  var S = {
    phase: "idle", // local | signed-out | checking | check-failed | not-admin | needs-grant | granting | loading | load-failed | list-refused | ready | removed-self | sending
    info: null, // {admin, push, ownerLogin, ownerType, org, decapScopes}
    people: [], // [{login, name, avatarUrl, admin, direct}]
    invites: [], // [{id, login, name, avatarUrl, createdAt, inviter, expired}]
    lookup: null, // {login, name, avatarUrl, htmlUrl}
    wrong: null, // the other account GitHub gave the permission for
    refused: null, // {status, github}: GitHub's answer when it refused to list
    busy: false,
    msg: null, // {text, tone, change}: what the status line says
    inflight: null, // {text}: a change still being sent (it survives closing the panel)
    outcome: null, // {text, tone}: a change answered while the panel was closed
    panel: null, // {dlg, close, status, view, input, content}
    grant: null, // {popup, handshook, poll, timer, grace, done, receive}
    names: new Map(), // login → {name, avatarUrl}
  };

  function hasDom() {
    return !!(doc() && ui() && doc().body);
  }

  /** True while the panel that started a request is still the open one. */
  function alive(panel) {
    return !!panel && S.panel === panel;
  }

  function isOrg() {
    return !!(S.info && S.info.org);
  }

  function ownerLogin() {
    return (S.info && S.info.ownerLogin) || repo().split("/")[0];
  }

  /** Who can invite this account back once it removed itself. */
  function whoCanAddBack() {
    var owner = ownerLogin();
    return isOrg()
      ? "another admin of the " + owner + " organization"
      : "the owner account " + owner;
  }

  // ---------------------------------------------------------------------------
  // Rendering

  function el(tag, props, kids) {
    return ui().el(tag, props, kids);
  }

  function btn(text, className, run, attrs) {
    var b = ui().button(
      text,
      className,
      function (e) {
        if (S.busy && !(attrs && attrs["data-always"])) return;
        run(e);
      },
      attrs,
    );
    return b;
  }

  function link(text, href) {
    return el("p", { className: "bl-dialog__link" }, [
      el("a", { text: text, attrs: { href: href, target: "_blank", rel: "noopener noreferrer" } }),
    ]);
  }

  /**
   * The status line. `change`: these words report a finished change (invite,
   * cancel, remove), so a failing reload of the lists adds to them instead of
   * replacing them (see kept()).
   */
  function setMessage(text, tone, change) {
    var p = S.panel;
    if (!p) return;
    text = String(text || "");
    S.msg = { text: text, tone: tone || "info", change: !!change };
    p.status.setAttribute("data-tone", tone || "info");
    if (p.status.textContent === text && text) {
      // the same words again: clear first, so screen readers hear them once more
      p.status.textContent = "";
      root.setTimeout(function () {
        if (S.panel !== p) return;
        p.status.textContent = text;
        fitStatus();
      }, 60);
      return;
    }
    p.status.textContent = text;
    fitStatus();
  }

  /** The words of a finished change, when opts.keepMessage asks to keep them, or "". */
  function kept(opts) {
    var m = S.msg;
    return opts && opts.keepMessage && m && m.change && m.text ? m.text : "";
  }

  function withKept(opts, text) {
    var k = kept(opts);
    return k ? k + " " + text : text;
  }

  /**
   * WCAG 2.4.11: the status line sticks to the top of the scrolling list, so a
   * focused control must never sit under it. The list scrolls with that much
   * scroll-padding (for the browser's own scrolling), and keepInView() corrects
   * anything the browser still left under it.
   */
  function fitStatus() {
    var p = S.panel;
    if (!p || !p.content) return;
    safe(function () {
      var h = p.status.textContent ? Math.ceil(p.status.getBoundingClientRect().height) + 16 : 0;
      p.content.style.scrollPaddingTop = h ? h + "px" : "";
    });
    later(function () {
      var d = doc();
      keepInView(d && d.activeElement);
    });
  }

  function keepInView(target) {
    var p = S.panel;
    if (!p || !p.content || !target || !p.view.contains(target) || !p.status.textContent) return;
    safe(function () {
      var s = p.status.getBoundingClientRect();
      var r = target.getBoundingClientRect();
      var gap = 8;
      if (r.top < s.bottom + gap && r.bottom > s.top) {
        p.content.scrollTop = Math.max(0, p.content.scrollTop - (s.bottom + gap - r.top));
      }
    });
  }

  function avatar(p) {
    var src = p && p.avatarUrl;
    if (src && /^https:\/\/avatars\.githubusercontent\.com\//.test(src)) {
      return el("img", {
        className: "bl-avatar",
        attrs: {
          src: src + (src.indexOf("?") === -1 ? "?" : "&") + "s=64",
          alt: "",
          width: 32,
          height: 32,
        },
      });
    }
    return el("span", {
      className: "bl-avatar bl-avatar--none",
      text: fullName(p).charAt(0).toUpperCase(),
      attrs: { "aria-hidden": "true" },
    });
  }

  function chip(text, warn) {
    return el("span", {
      className: "bl-chip bl-access__chip" + (warn ? " bl-access__chip--warn" : ""),
      text: text,
    });
  }

  function heading(text, key) {
    return el("h3", {
      className: "bl-access__heading",
      text: text,
      attrs: { tabindex: "-1", "data-k": key || "heading" },
    });
  }

  function para(text, className) {
    return el("p", { className: className || "", text: text });
  }

  function nameLine(p) {
    var line = el("p", { className: "bl-access__name" }, [el("strong", { text: fullName(p) })]);
    if (p.name && p.name !== p.login) {
      line.appendChild(el("span", { className: "bl-access__login", text: " @" + p.login }));
    }
    return line;
  }

  function personRow(p) {
    var u = me();
    var isMe = sameLogin(p.login, u && u.login);
    var isOwner = !isOrg() && sameLogin(p.login, ownerLogin());
    var chips = el("p", { className: "bl-access__meta" });
    if (isMe) chips.appendChild(chip("you"));
    if (isOwner) chips.appendChild(chip("owner"));
    else if (p.admin) chips.appendChild(chip("admin"));
    if (isOrg() && !p.direct) chips.appendChild(chip("through the organization"));
    var side = el("div", { className: "bl-access__side" });
    if (!isOwner && (!isOrg() || p.direct)) {
      side.appendChild(
        btn(
          "Remove",
          "bl-btn bl-btn--small",
          function (e) {
            removePerson(p, e && e.currentTarget);
          },
          {
            "aria-label": isMe ? "Remove yourself (@" + p.login + ")" : "Remove " + label(p),
            "data-k": "remove:" + p.login,
          },
        ),
      );
    }
    return el("li", { className: "bl-access__row", attrs: { "data-login": p.login } }, [
      avatar(p),
      el("div", { className: "bl-access__main" }, [nameLine(p), chips.firstChild ? chips : null]),
      side,
    ]);
  }

  function label(p) {
    return p.name && p.name !== p.login ? p.name + " (@" + p.login + ")" : "@" + p.login;
  }

  function inviteRow(inv) {
    var u = ui();
    var meta = el("p", { className: "bl-access__meta" });
    var when = inv.createdAt ? u.shortDate(inv.createdAt) : "";
    meta.appendChild(
      el("span", {
        text:
          "Invited" +
          (when ? " " + when : "") +
          (inv.inviter ? " by @" + inv.inviter : "") +
          (inv.expired ? "" : " · waiting for them to accept the email from GitHub"),
      }),
    );
    if (inv.expired) {
      meta.appendChild(chip("Expired", true));
      meta.appendChild(el("span", { text: "Cancel it and invite them again." }));
    }
    return el("li", { className: "bl-access__row", attrs: { "data-invite": String(inv.id) } }, [
      avatar(inv),
      el("div", { className: "bl-access__main" }, [nameLine(inv), meta]),
      el("div", { className: "bl-access__side" }, [
        btn(
          "Cancel invitation",
          "bl-btn bl-btn--small",
          function (e) {
            cancelInvite(inv, e && e.currentTarget);
          },
          {
            "aria-label": "Cancel invitation for " + label(inv),
            "data-k": "cancel:" + inv.id,
          },
        ),
      ]),
    ]);
  }

  function viewLocal() {
    var a = authCfg();
    return [
      heading("Editors are managed on the live dashboard"),
      para(
        "This is the local demo. It has no GitHub sign-in, so nobody can be invited or removed here, and nothing you do here changes who can edit.",
      ),
      para(
        "On the live dashboard, the owner account " +
          repo().split("/")[0] +
          " (or a repository admin, if the account becomes an organization) adds and removes editors with this same “Who can edit” button.",
      ),
      link("Open the live dashboard (opens a new tab)", a.adminUrl),
    ];
  }

  function viewNotAdmin() {
    var u = me();
    var owner = ownerLogin();
    var canSave = !S.info || S.info.push !== false;
    var by = isOrg()
      ? "by the admins of the " + repo() + " repository in the " + owner + " organization."
      : "with the owner account, " + owner + ".";
    return [
      heading(
        isOrg()
          ? "Only the repository's admins can change who can edit"
          : "Only the owner can change who can edit",
      ),
      para(
        canSave
          ? "You can edit and save the website. Adding and removing editors is done " + by
          : "Your account isn't one of the website's editors at the moment, so it can't save changes. Adding and removing editors is done " +
              by,
      ),
      para(
        "To add someone, ask the person who looks after " +
          (isOrg() ? "the organization" : "that account") +
          " (the PI or a maintainer) and send them the new editor's GitHub username, not their email address. GitHub then emails the new editor an invitation; once they accept it, they can sign in here.",
      ),
      para("When someone leaves the lab, ask the same person to remove them."),
      isOrg()
        ? null
        : para(
            "If the lab moves the website to a GitHub organization, the repository's admins can manage editors here too.",
            "bl-access__note",
          ),
      para("You are signed in as @" + (u ? u.login : "?") + ".", "bl-access__note"),
    ];
  }

  function viewGrant() {
    var u = me();
    var login = "@" + (u ? u.login : "?");
    var granting = S.phase === "granting";
    var out = [heading("Managing editors needs one extra GitHub permission", "grant-heading")];
    out.push(
      para(
        "Your everyday sign-in only lets this dashboard save the website. To list, invite and remove editors, GitHub must give it one more permission (GitHub calls it " +
          scopeNames() +
          ").",
      ),
    );
    out.push(
      el(
        "ul",
        { className: "bl-dialog__list" },
        [
          "A GitHub window opens. Check that it shows your account, " +
            login +
            ", then approve. GitHub describes the permission as full control of your account's public and private repositories; this panel uses it only to list, invite and remove the editors of " +
            repo() +
            ".",
          "This page keeps the permission until you reload or close it or press Turn it off now, and for at most 8 hours.",
          "GitHub itself keeps it for your account until you withdraw it (" +
            WITHDRAW_AT +
            "); withdrawing it also signs that account out of the dashboard. GitHub may also add it to your later sign-ins to this dashboard.",
        ].map(function (t) {
          return el("li", { text: t });
        }),
      ),
    );
    if (missingScopes(S.info && S.info.decapScopes).length === 0 && S.info && S.info.decapScopes) {
      out.push(
        para(
          "GitHub already gave this dashboard that permission for your account once, so the window may open and close by itself.",
          "bl-access__note",
        ),
      );
    }
    if (S.wrong && !granting) {
      out.push(
        para(
          "To use the right account: in this browser, open github.com, switch to " +
            login +
            " (or sign out of @" +
            S.wrong +
            "), then press Try again.",
        ),
      );
      out.push(
        para(
          "@" +
            S.wrong +
            " has now given this permission on GitHub. To withdraw it, sign in to github.com as @" +
            S.wrong +
            " and remove the app under Settings → Applications → Authorized OAuth Apps.",
          "bl-access__note",
        ),
      );
    }
    var actions = el("div", { className: "bl-access__actions" });
    if (granting) {
      actions.appendChild(
        para("Waiting for GitHub… Finish in the GitHub window.", "bl-access__waiting"),
      );
      actions.appendChild(
        btn(
          "Cancel",
          "bl-btn",
          function () {
            stopGrant();
            S.busy = false;
            S.phase = "needs-grant";
            setMessage("Cancelled. Nothing was changed.", "info");
            render({ focus: "grant" });
          },
          { "data-k": "grant-cancel", "data-always": "1" },
        ),
      );
    } else {
      actions.appendChild(
        btn(
          S.wrong ? "Try again" : "Give permission",
          "bl-btn bl-btn--primary",
          function () {
            grant();
          },
          { "data-k": "grant" },
        ),
      );
    }
    out.push(actions);
    return out;
  }

  function turnOff() {
    forget("off");
    S.people = [];
    S.invites = [];
    S.lookup = null;
    S.refused = null;
    S.phase = "needs-grant";
    setMessage("Managing editors is turned off on this page.", "info");
    render({ focus: "grant" });
  }

  function offButton(className) {
    return btn(
      "Turn it off now",
      className,
      function () {
        turnOff();
      },
      { "data-k": "off" },
    );
  }

  function viewReady() {
    var p = S.panel;
    var u = me();
    var out = [];
    var people = S.people.slice();
    out.push(
      el("div", { className: "bl-access__section-head" }, [
        heading("Can edit (" + people.length + ")", "people"),
        btn(
          "Refresh",
          "bl-btn bl-btn--small bl-btn--quiet",
          function () {
            load({ focus: "people" });
          },
          { "aria-label": "Refresh the lists", "data-k": "refresh" },
        ),
      ]),
    );
    out.push(
      people.length
        ? el("ul", { className: "bl-access__list" }, people.map(personRow))
        : para("Nobody yet."),
    );
    out.push(heading("Invited, not accepted yet (" + S.invites.length + ")", "invites"));
    out.push(
      S.invites.length
        ? el("ul", { className: "bl-access__list" }, S.invites.map(inviteRow))
        : para("No invitations are waiting.", "bl-access__note"),
    );
    out.push(heading("Invite someone", "invite"));
    out.push(
      el("p", {
        id: "bl-access-username-help",
        text: "Use their GitHub username, not their email address. No GitHub account yet? They can make a free one at github.com/signup and send you the username.",
      }),
    );
    var inputId = "bl-access-username";
    p.input.id = inputId;
    out.push(
      el("div", { className: "bl-access__field" }, [
        el("label", { text: "GitHub username", attrs: { for: inputId } }),
        el("div", { className: "bl-access__field-row" }, [
          p.input,
          btn(
            "Look up",
            "bl-btn",
            function () {
              lookup();
            },
            { "data-k": "lookup" },
          ),
        ]),
      ]),
    );
    if (S.lookup) {
      var l = S.lookup;
      var card = el(
        "div",
        { className: "bl-access__card", attrs: { "data-k": "card", tabindex: "-1" } },
        [
          avatar(l),
          el("div", { className: "bl-access__main" }, [
            nameLine(l),
            el("p", { className: "bl-access__meta" }, [
              l.htmlUrl
                ? el("a", {
                    text: "See their GitHub profile (opens a new tab)",
                    attrs: { href: l.htmlUrl, target: "_blank", rel: "noopener noreferrer" },
                  })
                : null,
            ]),
          ]),
        ],
      );
      out.push(card);
      out.push(
        el("div", { className: "bl-access__actions" }, [
          btn(
            "Send invitation",
            "bl-btn bl-btn--primary",
            function () {
              invite();
            },
            { "aria-label": "Send invitation to " + label(l), "data-k": "send" },
          ),
          btn(
            "Not this person",
            "bl-btn",
            function () {
              S.lookup = null;
              setMessage("", "info");
              render({ focus: "username" });
            },
            { "data-k": "not-this" },
          ),
        ]),
      );
    }
    out.push(
      el("div", { className: "bl-access__footer" }, [
        para(
          "Managing editors is on for @" +
            (u ? u.login : "?") +
            " until you reload or close this page or press Turn it off now, and for at most 8 hours. GitHub keeps the permission for your account until you withdraw it (" +
            WITHDRAW_AT +
            "); that also signs you out of the dashboard.",
          "bl-access__note",
        ),
        offButton("bl-btn bl-btn--small"),
      ]),
    );
    return out;
  }

  function viewRetry(text, again) {
    return [
      para(text),
      el("div", { className: "bl-access__actions" }, [
        btn(
          "Try again",
          "bl-btn",
          function () {
            again();
          },
          { "data-k": "retry" },
        ),
      ]),
    ];
  }

  /** GitHub refused the lists although the account is an admin and the token has every scope asked for. */
  function viewRefused() {
    var r = S.refused || {};
    var asksOrg = authCfg().scopes.indexOf("read:org") !== -1;
    return [
      heading("GitHub didn't show who can edit", "refused"),
      para(
        "Your account is an admin of the repository and GitHub gave the extra permission, but GitHub still refused to list the editors." +
          (asksOrg
            ? ""
            : " GitHub's documentation says this list also needs a second permission, “read:org”, which the lab's sign-in service doesn't ask for yet.") +
          " Nothing was changed.",
      ),
      para(
        "Tell a maintainer (docs/HANDOVER.md §4 says what to change). Until then, add and remove editors on github.com.",
      ),
      link(
        "Open the repository's collaborators on github.com (opens a new tab)",
        collaboratorsUrl(),
      ),
      r.status
        ? para(
            "GitHub's answer: " + r.status + (r.github ? " “" + r.github + "”" : "") + ".",
            "bl-access__note",
          )
        : null,
      el("div", { className: "bl-access__actions" }, [
        btn(
          "Try again",
          "bl-btn",
          function () {
            load({ focus: "people" });
          },
          { "data-k": "retry" },
        ),
        offButton("bl-btn"),
      ]),
    ];
  }

  function viewRemovedSelf() {
    return [
      heading("You no longer have edit access", "removed"),
      para("You can't save changes to the website any more. Your past changes stay in History."),
      para(
        "Log out (account menu, top right) when you are done. To get access again, ask " +
          whoCanAddBack() +
          " to invite you.",
      ),
    ];
  }

  function nodesFor() {
    switch (S.phase) {
      case "local":
        return viewLocal();
      case "signed-out":
        return [para("Sign in to GitHub first.")];
      case "checking":
        return [para("Checking your access on GitHub…")];
      case "check-failed":
        return viewRetry("Who can edit couldn't be checked.", start);
      case "not-admin":
        return viewNotAdmin();
      case "needs-grant":
      case "granting":
        return viewGrant();
      case "loading":
        return S.people.length ? viewReady() : [para("Loading who can edit…")];
      case "load-failed":
        return viewRetry("The lists couldn't be loaded.", function () {
          load({ focus: "people" });
        });
      case "list-refused":
        return viewRefused();
      case "ready":
        return viewReady();
      case "removed-self":
        return viewRemovedSelf();
      case "sending":
        return [para("A change is still being sent to GitHub. Its result shows here in a moment.")];
      default:
        return [];
    }
  }

  /**
   * Draw the panel for the current phase. Focus stays on the same control when
   * it is drawn again (data-k); when it is gone, or opts.focus names another,
   * focus moves there (or to the first heading), never to the page behind.
   */
  function render(opts) {
    opts = opts || {};
    var p = S.panel;
    if (!p) return;
    var d = doc();
    var active = d.activeElement;
    var inside = !!(active && p.view.contains(active));
    var lost = !active || active === d.body || active === p.dlg;
    var key = inside && active.getAttribute ? active.getAttribute("data-k") : null;
    p.view.textContent = "";
    p.view.setAttribute("data-phase", S.phase);
    p.view.setAttribute("aria-busy", S.busy ? "true" : "false");
    nodesFor().forEach(function (n) {
      if (n) p.view.appendChild(n);
    });
    markBusy();
    // Focus on the Close button (or in the GitHub window) stays where it is.
    if (!(inside || lost || opts.force)) return;
    var want = opts.focus || key;
    var target = want ? p.view.querySelector('[data-k="' + want + '"]') : null;
    if (!target) target = p.view.querySelector(".bl-access__heading");
    if (target) {
      safe(function () {
        target.focus();
      });
    }
  }

  /**
   * While a request runs, buttons say aria-disabled (their clicks are ignored)
   * instead of becoming disabled, so the focused one keeps the focus.
   */
  function markBusy() {
    var p = S.panel;
    if (!p) return;
    p.view.setAttribute("aria-busy", S.busy ? "true" : "false");
    p.view.querySelectorAll("button").forEach(function (b) {
      if (S.busy && !b.getAttribute("data-always")) b.setAttribute("aria-disabled", "true");
      else b.removeAttribute("aria-disabled");
    });
    p.input.readOnly = !!S.busy;
  }

  // ---------------------------------------------------------------------------
  // Steps

  function setBusy(on) {
    S.busy = !!on;
    markBusy();
  }

  /**
   * Who is signed in, which mode, and whether they are an admin of the
   * repository. opts.keepMessage: the status line keeps its words (a change's
   * result); otherwise it starts empty, so an old problem does not stay above a
   * working panel.
   */
  function start(opts) {
    opts = opts && typeof opts === "object" && !opts.type ? opts : {};
    var g = gh();
    S.lookup = null;
    S.wrong = null;
    S.refused = null;
    if (!opts.keepMessage) setMessage("", "info");
    if (!g) {
      S.phase = "check-failed";
      setMessage("The dashboard couldn't start the GitHub connection. Reload the page.", "problem");
      render();
      return Promise.resolve();
    }
    if (g.mode() === "local") {
      S.phase = "local";
      render();
      return Promise.resolve();
    }
    var u = me();
    if (!u) {
      S.phase = "signed-out";
      render();
      return Promise.resolve();
    }
    S.phase = "checking";
    render();
    var panel = S.panel;
    return g.get("/repos/" + repo()).then(
      function (r) {
        if (!alive(panel)) return;
        var data = (r && r.data) || {};
        var owner = data.owner || {};
        var perms = data.permissions || {};
        S.info = {
          admin: perms.admin === true,
          push: typeof perms.push === "boolean" ? perms.push : null,
          ownerLogin: owner.login || repo().split("/")[0],
          ownerType: owner.type || "User",
          org: owner.type === "Organization",
          decapScopes: scopesOf(r && r.headers),
        };
        if (!S.info.admin) {
          forget("off");
          S.phase = "not-admin";
          render();
          return;
        }
        if (permission()) return load({ focus: "people", keepMessage: opts.keepMessage });
        S.phase = "needs-grant";
        render(opts.focus ? { focus: opts.focus } : undefined);
      },
      function (e) {
        if (!alive(panel)) return;
        S.phase = "check-failed";
        var kind = e && e.kind;
        setMessage(
          withKept(
            opts,
            kind === "auth"
              ? "Your GitHub sign-in has expired. Log out (account menu, top right) and sign in again."
              : kind === "rate"
                ? busyUntil(e)
                : kind === "not-found"
                  ? "GitHub couldn't find the website's repository (" + repo() + ")."
                  : kind === "network"
                    ? "Couldn't reach GitHub. Check your connection and try again."
                    : "GitHub answered with an error. Try again in a minute.",
          ),
          "problem",
        );
        render();
      },
    );
  }

  function nameOf(login) {
    var known = S.names.get(String(login).toLowerCase());
    if (known) return Promise.resolve(known);
    var g = gh();
    return g.get("/users/" + encodeURIComponent(login)).then(
      function (r) {
        var d = (r && r.data) || {};
        var v = { name: d.name || "", avatarUrl: d.avatar_url || null };
        S.names.set(String(login).toLowerCase(), v);
        return v;
      },
      function () {
        return { name: "", avatarUrl: null };
      },
    );
  }

  function sortPeople(list) {
    var u = me();
    var owner = ownerLogin();
    function rank(p) {
      if (!isOrg() && sameLogin(p.login, owner)) return 0;
      if (sameLogin(p.login, u && u.login)) return 1;
      return 2;
    }
    return list.sort(function (a, b) {
      return rank(a) - rank(b) || fullName(a).localeCompare(fullName(b));
    });
  }

  /**
   * Load both lists with the extra permission. opts.keepMessage: a change's
   * words stay, and a failure is added to them (the change did happen).
   */
  function load(opts) {
    opts = opts || {};
    var panel = S.panel;
    S.phase = "loading";
    S.refused = null;
    setBusy(true);
    // Lists on screen stay (marked busy) while they reload; otherwise the view says "Loading…".
    if (!opts.keepMessage) setMessage(S.people.length ? "Loading who can edit…" : "", "busy");
    if (!S.people.length) render();
    var base = "/repos/" + repo();
    return Promise.all([
      listAll(base + "/collaborators?affiliation=all&per_page=100"),
      isOrg()
        ? listAll(base + "/collaborators?affiliation=direct&per_page=100")
        : Promise.resolve(null),
      listAll(base + "/invitations?per_page=100"),
    ])
      .then(function (r) {
        var direct = r[1]
          ? r[1].map(function (c) {
              return String(c.login).toLowerCase();
            })
          : null;
        var people = r[0].map(function (c) {
          return {
            login: String(c.login),
            name: "",
            avatarUrl: c.avatar_url || null,
            admin: !!(c.permissions && c.permissions.admin),
            direct: direct ? direct.indexOf(String(c.login).toLowerCase()) !== -1 : true,
          };
        });
        var invites = r[2].map(function (i) {
          var who = i.invitee || {};
          return {
            id: i.id,
            login: String(who.login || "?"),
            name: "",
            avatarUrl: who.avatar_url || null,
            createdAt: i.created_at || "",
            inviter: (i.inviter && i.inviter.login) || "",
            expired: i.expired === true,
          };
        });
        return Promise.all(
          people.concat(invites).map(function (p) {
            return nameOf(p.login).then(function (n) {
              p.name = n.name;
              if (!p.avatarUrl) p.avatarUrl = n.avatarUrl;
            });
          }),
        ).then(function () {
          S.people = sortPeople(people);
          S.invites = invites;
        });
      })
      .then(
        function () {
          if (!alive(panel)) return;
          setBusy(false);
          S.phase = "ready";
          if (!opts.keepMessage) setMessage("", "info");
          render(opts);
        },
        function (e) {
          if (!alive(panel)) return;
          setBusy(false);
          if (regrant(e, "", opts)) return;
          var kind = e && e.kind;
          if (kind === "forbidden" || kind === "not-found") return listRefused(e, opts, panel);
          S.phase = "load-failed";
          var why =
            kind === "rate"
              ? busyUntil(e)
              : kind === "network"
                ? "Couldn't reach GitHub. Check your connection and try again."
                : "GitHub answered with an error. Try again in a minute.";
          setMessage(
            kept(opts) ? withKept(opts, "The lists couldn't be loaded: " + lowerFirst(why)) : why,
            "problem",
          );
          render({ focus: "retry" });
        },
      );
  }

  /**
   * GitHub answered 403 or 404 to a list. Either the account is no longer an
   * admin (checked again with the everyday sign-in), or GitHub wants more than
   * the token has: GitHub documents read:org as well as repo for the list. The
   * panel says so instead of asking for the same permission again.
   */
  function listRefused(e, opts, panel) {
    return gh()
      .get("/repos/" + repo())
      .then(
        function (r) {
          var p = (r && r.data && r.data.permissions) || {};
          return { admin: p.admin === true, push: typeof p.push === "boolean" ? p.push : null };
        },
        function () {
          return null;
        },
      )
      .then(function (now) {
        if (!alive(panel)) return;
        if (now && !now.admin) {
          forget("off");
          if (S.info) {
            S.info.admin = false;
            S.info.push = now.push;
          }
          S.people = [];
          S.invites = [];
          S.phase = "not-admin";
          setMessage(
            withKept(opts, "GitHub says your account can't manage editors any more."),
            "problem",
          );
          render({ force: true });
          return;
        }
        S.phase = "list-refused";
        S.refused = { status: e.status, github: String(e.github || "") };
        setMessage(withKept(opts, "GitHub didn't show who can edit."), "problem");
        render({ focus: "refused", force: true });
      });
  }

  // ---------------------------------------------------------------------------
  // [Give permission]: the sign-in service's popup and Decap's handshake

  var popups = []; // the windows this file opened: their messages are for this file only

  /**
   * Every message from a popup this file opened stops here: this listener
   * captures, so it runs before any listener that does not, and it ends the
   * event. No other script on the page sees the token that way. (Decap's own
   * sign-in listener, left over from an unfinished Login in this tab, takes any
   * "authorization:github:success" from the Worker's origin and keeps the token
   * in localStorage.) The current [Give permission] then reads its own popup's.
   */
  function onMessage(e) {
    if (!e || !e.source || popups.indexOf(e.source) === -1) return;
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    var g = S.grant;
    if (g && !g.done && e.source === g.popup) g.receive(e);
  }

  function stopGrant() {
    var g = S.grant;
    if (!g) return;
    S.grant = null;
    g.done = true;
    if (g.poll !== null) root.clearInterval(g.poll);
    if (g.timer !== null) root.clearTimeout(g.timer);
    if (g.grace !== null) root.clearTimeout(g.grace);
    safe(function () {
      if (g.popup && !g.popup.closed) g.popup.close();
    });
  }

  function grantFailed(text) {
    stopGrant();
    S.phase = "needs-grant";
    setMessage(text, "problem");
    render({ focus: "grant" });
  }

  function grant() {
    if (S.grant) return;
    var origin = workerOrigin();
    var u = me();
    if (!origin) {
      grantFailed("The sign-in service's address is not set up. Tell a maintainer.");
      return;
    }
    if (!u) {
      grantFailed("Sign in to GitHub first.");
      return;
    }
    S.wrong = null;
    var w = 960;
    var h = 600;
    var left = safe(function () {
      return Math.max(0, Math.round(root.screen.width / 2 - w / 2));
    }, 0);
    var top = safe(function () {
      return Math.max(0, Math.round(root.screen.height / 2 - h / 2));
    }, 0);
    var popup = safe(function () {
      return root.open(
        grantUrl(),
        "bobalab-access",
        "width=" + w + ",height=" + h + ",top=" + top + ",left=" + left,
      );
    }, null);
    if (!popup || typeof popup !== "object" || popup.closed) {
      grantFailed(
        "Your browser blocked the GitHub window. Allow pop-ups for this site (the browser shows an icon at the end of the address bar), then press Give permission again.",
      );
      return;
    }
    if (popups.indexOf(popup) === -1) popups.push(popup);
    if (popups.length > POPUPS_KEPT) popups.shift();
    safe(function () {
      popup.focus();
    });
    var g = {
      popup: popup,
      handshook: false,
      done: false,
      poll: null,
      timer: null,
      grace: null,
      receive: null,
    };
    g.receive = function (e) {
      if (S.grant !== g || g.done) return;
      // Strict: exactly the sign-in service's origin (the source is this popup: onMessage).
      if (e.origin !== origin) return;
      var data = typeof e.data === "string" ? e.data : "";
      if (data === "authorizing:github") {
        g.handshook = true;
        safe(function () {
          popup.postMessage("authorizing:github", origin);
        });
        return;
      }
      if (!g.handshook) return;
      var m = /^authorization:github:(success|error):([\s\S]+)$/.exec(data);
      if (!m) return;
      var body = safe(function () {
        return JSON.parse(m[2]);
      }, null);
      if (m[1] === "error" || !body || typeof body.token !== "string" || !body.token) {
        grantFailed(
          "GitHub did not give the permission: " +
            workerProblem(body && body.errorCode) +
            " Nothing was changed.",
        );
        return;
      }
      var token = body.token;
      stopGrant();
      verify(token, u.login);
    };
    g.poll = root.setInterval(function () {
      if (S.grant !== g || g.grace !== null) return;
      if (
        !safe(function () {
          return popup.closed;
        }, true)
      )
        return;
      g.grace = root.setTimeout(function () {
        if (S.grant !== g) return;
        grantFailed("The GitHub window was closed before it finished. Nothing was changed.");
      }, CLOSED_GRACE);
    }, POLL_MS);
    g.timer = root.setTimeout(function () {
      if (S.grant !== g) return;
      grantFailed("GitHub took too long (more than 10 minutes). Nothing was changed; try again.");
    }, GRANT_MAX);
    S.grant = g;
    S.phase = "granting";
    setMessage("Waiting for GitHub…", "busy");
    render({ focus: "grant-cancel" });
  }

  /** The new token must be for the signed-in account and carry every scope asked for (when GitHub says). */
  function verify(token, login) {
    var panel = S.panel;
    held = { token: token, login: login, at: Date.now(), scopes: null }; // memory only, until checked
    S.phase = "granting";
    setBusy(true);
    setMessage("Checking the permission…", "busy");
    return request("GET", "/user").then(
      function (r) {
        if (alive(panel)) setBusy(false);
        if (!alive(panel) || S.phase !== "granting") {
          forget("off"); // the panel was closed or Cancel was pressed meanwhile
          return;
        }
        var got = r && r.data && r.data.login ? String(r.data.login) : "";
        var scopes = scopesOf(r && r.headers);
        var missing = missingScopes(scopes);
        var everyday = me();
        if (!sameLogin(got, login)) {
          forget("off");
          S.wrong = got || "another account";
          S.phase = "needs-grant";
          setMessage(
            "GitHub gave the permission for @" +
              S.wrong +
              ", but you are signed in to this dashboard as @" +
              login +
              ". This panel didn't use it; nothing was changed.",
            "problem",
          );
          render({ focus: "grant", force: true });
          return;
        }
        if (everyday && everyday.token === token) {
          // Backstop: the dashboard's own sign-in took this token (onMessage should prevent it).
          forget("off");
          S.phase = "needs-grant";
          setMessage(
            "The dashboard's own sign-in picked up the extra permission too. Log out (account menu, top right) and sign in again, then press Give permission.",
            "problem",
          );
          render({ focus: "grant", force: true });
          return;
        }
        if (missing.length) {
          forget("off");
          S.phase = "needs-grant";
          setMessage(missingText(missing), "problem");
          render({ focus: "grant", force: true });
          return;
        }
        keep(token, login, scopes);
        setMessage(
          "Permission given. You can now manage editors until you reload or close this page.",
          "ok",
        );
        return load({ focus: "people", keepMessage: true, force: true });
      },
      function (e) {
        if (alive(panel)) setBusy(false);
        forget("off");
        if (!alive(panel) || S.phase !== "granting") return;
        S.phase = "needs-grant";
        setMessage(
          e && e.kind === "network"
            ? "Couldn't reach GitHub to check the permission. Try again."
            : e && e.kind === "rate"
              ? busyUntil(e)
              : "GitHub didn't accept the new permission. Try again.",
          "problem",
        );
        render({ focus: "grant", force: true });
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Invite, cancel, remove

  function lookup() {
    var p = S.panel;
    if (!p || S.busy) return;
    S.lookup = null;
    var parsed = parseUsername(p.input.value);
    if (parsed.problem) {
      setMessage(parsed.problem, "problem");
      render({ focus: "username" });
      return;
    }
    var login = parsed.login;
    if (!isOrg() && sameLogin(login, ownerLogin())) {
      setMessage("@" + ownerLogin() + " is the owner account; it can always edit.", "info");
      render({ focus: "username" });
      return;
    }
    var editor = S.people.filter(function (x) {
      return sameLogin(x.login, login);
    })[0];
    if (editor) {
      setMessage(label(editor) + " can already edit.", "info");
      render({ focus: "username" });
      return;
    }
    var waiting = S.invites.filter(function (x) {
      return sameLogin(x.login, login);
    })[0];
    if (waiting) {
      setMessage(
        label(waiting) +
          (waiting.expired
            ? " has an expired invitation. Cancel it below, then invite them again."
            : " already has an invitation waiting. They must accept the email from GitHub."),
        "info",
      );
      render({ focus: "username" });
      return;
    }
    setBusy(true);
    setMessage("Looking up @" + login + " on GitHub…", "busy");
    gh()
      .get("/users/" + encodeURIComponent(login))
      .then(
        function (r) {
          if (!alive(p)) return;
          setBusy(false);
          var d = (r && r.data) || {};
          if (d.type && d.type !== "User") {
            setMessage(
              "“" +
                (d.login || login) +
                "” is " +
                (d.type === "Organization" ? "an organization" : "not a person's account") +
                ". Invite a person's own GitHub account.",
              "problem",
            );
            render({ focus: "username" });
            return;
          }
          S.lookup = {
            login: String(d.login || login),
            name: d.name || "",
            avatarUrl: d.avatar_url || null,
            htmlUrl: d.html_url && /^https:\/\/github\.com\//.test(d.html_url) ? d.html_url : null,
          };
          S.names.set(S.lookup.login.toLowerCase(), {
            name: S.lookup.name,
            avatarUrl: S.lookup.avatarUrl,
          });
          setMessage(
            "Found " +
              label(S.lookup) +
              ". Check it is the right person, then send the invitation.",
            "info",
          );
          render({ focus: "send" });
        },
        function (e) {
          if (!alive(p)) return;
          setBusy(false);
          var kind = e && e.kind;
          setMessage(
            kind === "not-found"
              ? "There is no GitHub account called “" +
                  login +
                  "”. Check the spelling with them. No account yet? They can make a free one at github.com/signup."
              : kind === "rate"
                ? busyUntil(e)
                : kind === "network"
                  ? "Couldn't reach GitHub. Check your connection and try again."
                  : kind === "auth"
                    ? "Your GitHub sign-in has expired. Log out and sign in again."
                    : "GitHub answered with an error. Try again in a minute.",
            "problem",
          );
          render({ focus: "username" });
        },
      );
  }

  function isGone(e) {
    var kind = e && e.kind;
    return kind === "auth" || kind === "no-permission";
  }

  /** Why the permission is gone after a failed request: a 401 from GitHub, or it was dropped here. */
  function goneWhy(e) {
    return e && e.kind === "auth" ? "withdrawn" : dropped || "expired";
  }

  /**
   * After a failed request: true when the extra permission is gone (expired,
   * withdrawn on GitHub, signed out, another account), after the panel said
   * why and went back a step (signed out or another account: checked again).
   */
  function regrant(e, what, opts) {
    if (!isGone(e)) return false;
    var why = goneWhy(e);
    forget(why);
    S.people = [];
    S.invites = [];
    S.lookup = null;
    setMessage(withKept(opts, goneText(why, what)), "problem");
    if (why === "signed-out" || why === "other-account") {
      start({ keepMessage: true });
      return true;
    }
    S.phase = "needs-grant";
    render({ focus: "grant", force: true });
    return true;
  }

  /** Words for the failures every change shares (busy, offline, refused), or "". */
  function commonProblem(e) {
    var kind = e && e.kind;
    if (kind === "rate") return busyUntil(e) + " Nothing was changed.";
    if (kind === "network") return "Couldn't reach GitHub. Nothing was changed; try again.";
    if (kind === "forbidden")
      return "GitHub refused: your account can't manage editors (any more). Nothing was changed.";
    if (kind === "refused") return "This panel never changes the owner account's access.";
    return "";
  }

  /**
   * A change answered after its panel was closed: the panel open now (opened
   * again meanwhile) shows the words and reloads; with none open, the next one
   * shows them.
   */
  function settledElsewhere(text, tone, gone) {
    S.inflight = null;
    if (gone) forget("withdrawn");
    if (!S.panel) {
      S.outcome = { text: text, tone: tone };
      return;
    }
    S.busy = false;
    setMessage(text, tone, true);
    return start({ keepMessage: true });
  }

  /** GitHub's limit of 50 invitations a day (DOCUMENTED); its exact words are a HYPOTHESIS. */
  function inviteLimit(e) {
    var gw = String((e && e.github) || "");
    return (
      !!e &&
      e.status === 422 &&
      (e.kind === "rate" ||
        /spammed/i.test(gw) ||
        (/invitation/i.test(gw) && /(limit|maximum|exceed|too many)/i.test(gw)))
    );
  }

  function inviteFailText(e, l) {
    var gw = String((e && e.github) || "");
    if (isGone(e)) return goneText(goneWhy(e), "send the invitation");
    if (inviteLimit(e))
      return "GitHub allows at most 50 invitations a day for this repository. Nothing was sent; try again tomorrow.";
    var words = commonProblem(e);
    if (words) return words;
    if (e && e.kind === "invalid")
      return (
        "GitHub couldn't invite " + label(l) + (gw ? ": “" + gw + "”." : ".") + " Nothing was sent."
      );
    if (e && e.kind === "not-found")
      return (
        "GitHub couldn't find @" +
        l.login +
        " (or the repository) any more. Nothing was sent; check the username and try again."
      );
    return "GitHub answered with an error. Nothing was sent; try again in a minute.";
  }

  function invite() {
    var l = S.lookup;
    var panel = S.panel;
    if (!l || S.busy) return;
    // A personal repository ignores "permission"; an organization's needs it (write = "push").
    var body = isOrg() ? { permission: "push" } : undefined;
    var sending = "Sending the invitation to " + label(l) + "…";
    setBusy(true);
    setMessage(sending, "busy");
    S.inflight = { text: sending };
    request("PUT", "/repos/" + repo() + "/collaborators/" + l.login, body).then(
      function (r) {
        var text =
          r.status === 204
            ? fullName(l) + " can edit now; GitHub didn't need to send an invitation."
            : "Invitation sent. " +
              fullName(l) +
              " must accept the email from GitHub before they can sign in.";
        if (!alive(panel)) return settledElsewhere(text, "ok");
        S.inflight = null;
        setBusy(false);
        S.lookup = null;
        if (S.panel) S.panel.input.value = "";
        setMessage(text, "ok", true);
        return load({ focus: "username", keepMessage: true });
      },
      function (e) {
        if (!alive(panel)) return settledElsewhere(inviteFailText(e, l), "problem", isGone(e));
        S.inflight = null;
        setBusy(false);
        if (regrant(e, "send the invitation")) return;
        setMessage(inviteFailText(e, l), "problem");
        render({ focus: "send" });
      },
    );
  }

  function cancelFailText(e) {
    if (isGone(e)) return goneText(goneWhy(e), "cancel the invitation");
    if (e && e.kind === "not-found")
      return "That invitation is gone already (accepted, declined or cancelled).";
    return (
      commonProblem(e) ||
      "GitHub answered with an error. Nothing was changed; try again in a minute."
    );
  }

  function cancelInvite(inv, opener) {
    if (S.busy) return;
    var panel = S.panel;
    ui()
      .confirm({
        title: "Cancel the invitation for " + fullName(inv) + "?",
        body: [
          "The link in their invitation email stops working. You can invite them again later.",
        ],
        confirm: "Cancel invitation",
        cancel: "Keep it",
        danger: true,
        returnFocus: opener || null,
      })
      .then(function (r) {
        if (!r.ok || !alive(panel)) return;
        var sending = "Cancelling the invitation for " + label(inv) + "…";
        setBusy(true);
        setMessage(sending, "busy");
        S.inflight = { text: sending };
        return request("DELETE", "/repos/" + repo() + "/invitations/" + inv.id).then(
          function () {
            var text = "Invitation for " + label(inv) + " cancelled.";
            if (!alive(panel)) return settledElsewhere(text, "ok");
            S.inflight = null;
            setBusy(false);
            setMessage(text, "ok", true);
            return load({ focus: "invites", keepMessage: true });
          },
          function (e) {
            var gone = e && e.kind === "not-found";
            if (!alive(panel))
              return settledElsewhere(cancelFailText(e), gone ? "info" : "problem", isGone(e));
            S.inflight = null;
            setBusy(false);
            if (regrant(e, "cancel the invitation")) return;
            if (gone) {
              setMessage(cancelFailText(e), "info", true);
              return load({ focus: "invites", keepMessage: true });
            }
            setMessage(cancelFailText(e), "problem");
            render({ focus: "cancel:" + inv.id });
          },
        );
      });
  }

  function removeFailText(e, p) {
    var gw = String((e && e.github) || "");
    if (isGone(e)) return goneText(goneWhy(e), "remove them");
    if (e && e.kind === "not-found") return label(p) + " can't edit any more (already removed).";
    return (
      commonProblem(e) ||
      "GitHub couldn't remove " +
        label(p) +
        (gw ? ": “" + gw + "”." : ".") +
        " Nothing was changed."
    );
  }

  function removePerson(p, opener) {
    if (S.busy) return;
    var panel = S.panel;
    var u = me();
    var self = sameLogin(p.login, u && u.login);
    var name = fullName(p);
    var words = self
      ? {
          title: "Remove your own access?",
          body: [
            "You will no longer be able to sign in to the dashboard or save. Your past changes stay in History.",
            "This happens at once, and you can't undo it yourself: only " +
              whoCanAddBack() +
              " can invite you again.",
          ],
          confirm: "Remove my access",
        }
      : {
          title: "Remove " + name + "?",
          body: [
            name +
              " will no longer be able to sign in to the dashboard or save. Their past changes stay in History.",
            "To give them access again later, invite them again.",
          ],
          confirm: "Remove " + name,
        };
    ui()
      .confirm({
        title: words.title,
        body: words.body,
        confirm: words.confirm,
        danger: true,
        returnFocus: opener || null,
      })
      .then(function (r) {
        if (!r.ok || !alive(panel)) return;
        var sending = "Removing " + label(p) + "…";
        setBusy(true);
        setMessage(sending, "busy");
        S.inflight = { text: sending };
        return request("DELETE", "/repos/" + repo() + "/collaborators/" + p.login).then(
          function () {
            var text = self
              ? "You removed your own access."
              : name + " can no longer edit. Their past changes stay in History.";
            if (self) forget("off");
            if (!alive(panel)) return settledElsewhere(text, "ok");
            S.inflight = null;
            setBusy(false);
            if (self) {
              S.people = [];
              S.invites = [];
              S.lookup = null;
              if (S.info) S.info.admin = false;
              S.phase = "removed-self";
              setMessage(text, "ok", true);
              render({ focus: "removed", force: true });
              return;
            }
            setMessage(text, "ok", true);
            return load({ focus: "people", keepMessage: true });
          },
          function (e) {
            var gone = e && e.kind === "not-found";
            if (!alive(panel))
              return settledElsewhere(removeFailText(e, p), gone ? "info" : "problem", isGone(e));
            S.inflight = null;
            setBusy(false);
            if (regrant(e, "remove them")) return;
            if (gone) {
              setMessage(removeFailText(e, p), "info", true);
              return load({ focus: "people", keepMessage: true });
            }
            setMessage(removeFailText(e, p), "problem");
            render({ focus: "remove:" + p.login });
          },
        );
      });
  }

  // ---------------------------------------------------------------------------
  // The panel

  /** Open "Who can edit" (a modal dialog); `opener` gets the focus back. */
  function open(opener) {
    if (!hasDom()) return;
    if (S.panel) return;
    var u = ui();
    var d = doc();
    var status = u.el("p", {
      className: "bl-access__status",
      attrs: { role: "status", "aria-live": "polite", "aria-atomic": "true", "data-tone": "info" },
    });
    var view = u.el("div", { className: "bl-access__view" });
    var input = u.el("input", {
      className: "bl-access__input",
      attrs: {
        type: "text",
        autocomplete: "off",
        autocapitalize: "none",
        spellcheck: "false",
        "data-k": "username",
        "aria-describedby": "bl-access-username-help",
      },
    });
    input.addEventListener("keydown", function (e) {
      if (e && e.key === "Enter") {
        if (typeof e.preventDefault === "function") e.preventDefault();
        lookup();
      }
    });
    input.addEventListener("input", function () {
      if (S.lookup) {
        S.lookup = null;
        render({ focus: "username" });
      }
    });
    var content = u.el("div", { className: "bl-sheet__content bl-access" }, [status, view]);
    content.addEventListener("focusin", function (e) {
      var t = e && e.target;
      later(function () {
        keepInView(t);
      });
    });
    S.panel = {
      dlg: null,
      close: function () {},
      status: status,
      view: view,
      input: input,
      content: content,
    };
    S.msg = null;
    var panel = S.panel;
    u.dialog({
      title: "Who can edit",
      body: [
        "Everyone with edit access can sign in to this dashboard and save changes to the website.",
      ],
      content: content,
      className: "bl-sheet bl-access-sheet",
      returnFocus: opener || d.activeElement,
      buttons: [{ key: "close", label: "Close", focus: true }],
      onOpen: function (dlg, finish) {
        panel.dlg = dlg;
        panel.close = function () {
          finish("close");
        };
      },
    }).then(function () {
      stopGrant();
      if (S.panel === panel) S.panel = null;
      S.busy = false;
      S.lookup = null;
    });
    if (S.inflight) {
      // settledElsewhere() shows its result and goes on when GitHub answers.
      S.phase = "sending";
      S.busy = true;
      setMessage(S.inflight.text, "busy");
      render();
      return;
    }
    var outcome = S.outcome;
    S.outcome = null;
    if (outcome) setMessage(outcome.text, outcome.tone, true);
    start({ keepMessage: !!outcome });
  }

  var api = {
    open: open,
    forget: function () {
      forget("off");
    },
    hasPermission: function () {
      return !!permission();
    },
    parseUsername: parseUsername,
  };
  // Test hooks only where the unit tests' sandbox asks for them: the page itself
  // offers no way to send a request with the extra permission.
  if (root.BOBALAB_TEST_HOOKS === true) {
    api._request = request;
    api._allowed = allowed;
    api._grantUrl = grantUrl;
    api._state = function () {
      return S;
    };
    api._check = permission;
  }
  root.BobalabAccess = api;

  if (typeof root.addEventListener === "function") {
    root.addEventListener("message", onMessage, true);
  }
  if (!doc() || typeof root.setInterval !== "function") return;
  // Signed out, another account signed in, or older than 8 hours: the extra permission goes.
  root.setInterval(permission, CHECK_EVERY);
})(typeof window !== "undefined" ? window : globalThis);
