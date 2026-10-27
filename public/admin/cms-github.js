/*
 * BOBALAB CMS: a read-only GitHub REST client (editor v2, WP3; spec §4.1).
 * Loaded by /admin/ after cms-ui.js; sets window.BobalabGitHub.
 *
 * History, Recent changes, the deploy status and the conflict check read
 * GitHub through this one function, get(). It can only make GET requests:
 * every write to the repository goes through Decap's own Save (spec D5).
 *
 *  - Signed in: the GitHub token Decap keeps in localStorage "decap-cms-user"
 *    (backendName "github") is sent as "Authorization: token …", to
 *    api.github.com only. Before sign-in, get() refuses (kind "auth") and makes
 *    no request at all: anonymous calls are limited to 60 an hour per address.
 *  - Local demo (the config link names config.local….yml): there is no GitHub
 *    sign-in, so History is read from GitHub anonymously.
 *  - Every response's ETag is remembered in memory; the next request for the
 *    same address sends If-None-Match, and a 304 answer returns the remembered
 *    data. GitHub does not count a 304 against the hourly limit.
 *  - Errors reject with {name: "GitHubError", kind, status, resetAt?, message};
 *    kind is "auth" (sign in again), "rate" (GitHub is busy until resetAt),
 *    "not-found", "network" or "http". The message is plain English.
 *
 * tests/unit/cms/github.test.ts runs this file in a sandbox with a fake fetch.
 */
(function (root) {
  "use strict";

  var API = "https://api.github.com";
  var API_VERSION = "2022-11-28";
  var ACCEPT = {
    json: "application/vnd.github+json",
    raw: "application/vnd.github.raw+json",
  };
  var USER_KEY = "decap-cms-user";
  var ETAG_MAX = 300; // remembered responses (the oldest are dropped first)

  var etags = new Map(); // "<accept> <url>" → {etag, status, data, link}
  var inflight = new Map(); // the same GET asked twice at once is sent once
  var rateState = { remaining: null, resetAt: null };
  var blockedUntil = 0; // after a rate-limit answer, no request until GitHub's reset time

  function cfg() {
    return root.BOBALAB_CMS || {};
  }

  /** "owner/name" of the site repository (cms-data.js; this default matches it). */
  function repo() {
    return cfg().repo || "bobalabx/bobalab-web";
  }

  function branch() {
    return cfg().branch || "main";
  }

  function configHref() {
    var d = root.document;
    if (!d || typeof d.querySelector !== "function") return "";
    var link = d.querySelector('link[rel="cms-config-url"]');
    return (link && link.getAttribute("href")) || "";
  }

  /**
   * "local" for the no-account demo, whose page loads config.local.yml
   * (scripts/cms/local.mjs; e2e copies use names like config.local-scratch.yml).
   */
  function mode() {
    var file = configHref().split(/[?#]/)[0].split("/").pop() || "";
    return /^config\.local[\w.-]*\.ya?ml$/.test(file) ? "local" : "github";
  }

  function storedUser() {
    try {
      var raw = root.localStorage && root.localStorage.getItem(USER_KEY);
      var u = raw ? JSON.parse(raw) : null;
      return u && typeof u === "object" ? u : null;
    } catch {
      return null;
    }
  }

  /** The signed-in GitHub user {login, name, token, avatarUrl}, or null. */
  function user() {
    var u = storedUser();
    if (!u || u.backendName !== "github" || !u.token || !u.login) return null;
    return {
      login: String(u.login),
      name: String(u.name || u.login),
      token: String(u.token),
      avatarUrl: u.avatar_url ? String(u.avatar_url) : null,
    };
  }

  /** True once Decap has a signed-in user (any backend: the local demo uses "proxy"). */
  function signedIn() {
    return mode() === "local" ? !!storedUser() : !!user();
  }

  function rate() {
    return { remaining: rateState.remaining, resetAt: rateState.resetAt };
  }

  function clockText(ms) {
    var ui = root.BobalabUi;
    if (ui && typeof ui.clock === "function") return ui.clock(ms);
    try {
      return new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return "later";
    }
  }

  function ghError(kind, status, message, extra) {
    var e = new Error(message);
    e.name = "GitHubError";
    e.kind = kind;
    e.status = status || 0;
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        e[k] = extra[k];
      });
    }
    return e;
  }

  function rateError(resetAt, status) {
    return ghError(
      "rate",
      status || 403,
      "GitHub is busy; History will be back at " + clockText(resetAt) + ".",
      { resetAt: resetAt },
    );
  }

  /** {next, last, prev, first} from a Link header. */
  function parseLink(header) {
    var out = {};
    String(header || "")
      .split(",")
      .forEach(function (part) {
        var m = /<([^>]+)>\s*;\s*rel="?([^";]+)"?/.exec(part);
        if (m) out[m[2]] = m[1];
      });
    return out;
  }

  function header(res, name) {
    try {
      return res && res.headers && typeof res.headers.get === "function"
        ? res.headers.get(name)
        : null;
    } catch {
      return null;
    }
  }

  function readRate(res) {
    var remaining = header(res, "x-ratelimit-remaining");
    var reset = header(res, "x-ratelimit-reset");
    if (remaining !== null && remaining !== undefined && remaining !== "")
      rateState.remaining = Number(remaining);
    if (reset) rateState.resetAt = Number(reset) * 1000;
  }

  /** An API path ("/repos/…") or an api.github.com address (a Link "next") → full URL. */
  function toUrl(path) {
    var p = String(path || "");
    if (/^https?:\/\//i.test(p)) {
      if (p.indexOf(API + "/") !== 0) throw new Error("BobalabGitHub only talks to " + API);
      return p;
    }
    if (p.charAt(0) !== "/") throw new Error("BobalabGitHub paths start with /");
    return API + p;
  }

  function remember(key, entry) {
    etags.delete(key);
    etags.set(key, entry);
    while (etags.size > ETAG_MAX) etags.delete(etags.keys().next().value);
  }

  function errorFor(res) {
    var status = res.status;
    if (status === 401) {
      return ghError("auth", 401, "Sign in again: your GitHub sign-in has expired.");
    }
    if (status === 403 || status === 429) {
      var remaining = header(res, "x-ratelimit-remaining");
      var retryAfter = Number(header(res, "retry-after"));
      if (remaining === "0") {
        var reset = Number(header(res, "x-ratelimit-reset"));
        return rateError(reset ? reset * 1000 : Date.now() + 60000, status);
      }
      if (retryAfter > 0 || status === 429) {
        return rateError(Date.now() + (retryAfter > 0 ? retryAfter : 60) * 1000, status);
      }
      return ghError("http", status, "GitHub refused this request (" + status + ").");
    }
    if (status === 404) return ghError("not-found", 404, "GitHub has no such file or page.");
    return ghError(
      "http",
      status,
      "GitHub answered with an error (" + status + "). Try again in a minute.",
    );
  }

  /**
   * GET an API path. opts: {accept: "json" | "raw", timeoutMs}. Resolves with
   * {status, data, headers, link: {next?}}; data is parsed JSON, or text for "raw".
   * Any method other than GET throws.
   */
  function get(path, opts) {
    opts = opts || {};
    var method = String(opts.method || "GET").toUpperCase();
    if (method !== "GET" || opts.body !== undefined) {
      throw new Error("BobalabGitHub is read-only: " + method + " requests are not allowed.");
    }
    var url = toUrl(path);
    var accept = opts.accept === "raw" ? "raw" : "json";
    var u = user();
    if (mode() === "github" && !u) {
      return Promise.reject(ghError("auth", 0, "Sign in to GitHub first."));
    }
    if (blockedUntil > Date.now()) return Promise.reject(rateError(blockedUntil, 403));
    if (typeof root.fetch !== "function") {
      return Promise.reject(ghError("network", 0, "Couldn't reach GitHub."));
    }
    var key = accept + " " + url;
    if (inflight.has(key)) return inflight.get(key);

    var headers = { Accept: ACCEPT[accept], "X-GitHub-Api-Version": API_VERSION };
    if (u) headers.Authorization = "token " + u.token;
    var cached = etags.get(key);
    if (cached && cached.etag) headers["If-None-Match"] = cached.etag;

    var controller = null;
    var timer = null;
    var timedOut = false;
    var init = { method: "GET", headers: headers, cache: "no-cache", credentials: "omit" };
    if (opts.timeoutMs && typeof root.AbortController === "function") {
      controller = new root.AbortController();
      init.signal = controller.signal;
      timer = root.setTimeout(function () {
        timedOut = true;
        controller.abort();
      }, opts.timeoutMs);
    }

    var p = Promise.resolve()
      .then(function () {
        return root.fetch(url, init);
      })
      .then(
        function (res) {
          readRate(res);
          if (res.status === 304 && cached) {
            remember(key, cached);
            return {
              status: cached.status,
              data: cached.data,
              headers: res.headers,
              link: cached.link,
              notModified: true,
            };
          }
          if (res.status >= 200 && res.status < 300) {
            var body =
              res.status === 204
                ? Promise.resolve(null)
                : accept === "raw"
                  ? res.text()
                  : res.json();
            return Promise.resolve(body).then(function (data) {
              var out = { status: res.status, data: data, link: parseLink(header(res, "link")) };
              var etag = header(res, "etag");
              if (etag)
                remember(key, { etag: etag, status: out.status, data: data, link: out.link });
              out.headers = res.headers;
              return out;
            });
          }
          var err = errorFor(res);
          if (err.kind === "rate") blockedUntil = err.resetAt;
          throw err;
        },
        function () {
          throw ghError(
            "network",
            0,
            timedOut ? "GitHub didn't answer in time." : "Couldn't reach GitHub.",
            timedOut ? { timeout: true } : null,
          );
        },
      )
      .then(
        function (r) {
          if (timer !== null) root.clearTimeout(timer);
          inflight.delete(key);
          return r;
        },
        function (e) {
          if (timer !== null) root.clearTimeout(timer);
          inflight.delete(key);
          if (e && e.name === "GitHubError") throw e;
          throw ghError("network", 0, "Couldn't read GitHub's answer.");
        },
      );
    inflight.set(key, p);
    return p;
  }

  /** Path segments encoded for a URL, keeping the slashes ("content/news/x.md"). */
  function encodePath(p) {
    return String(p || "")
      .split("/")
      .map(encodeURIComponent)
      .join("/");
  }

  /** For tests: forget remembered answers, the rate state and the rate block. */
  function reset() {
    etags.clear();
    inflight.clear();
    rateState = { remaining: null, resetAt: null };
    blockedUntil = 0;
  }

  var api = {
    mode: mode,
    repo: repo,
    branch: branch,
    user: user,
    signedIn: signedIn,
    get: get,
    rate: rate,
    parseLink: parseLink,
    encodePath: encodePath,
    _reset: reset,
  };
  root.BobalabGitHub = api;
})(typeof window !== "undefined" ? window : globalThis);
