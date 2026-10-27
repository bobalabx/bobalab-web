/*
 * BOBALAB CMS: is the live site up to date? (editor v2, WP3; spec §5)
 * Loaded by /admin/ after cms-history.js; sets window.BobalabDeploy.
 *
 * Every save is a commit on main, and each push starts the "Deploy" workflow
 * (.github/workflows/deploy.yml): build → deploy → record-slugs. This file
 * reads the workflow's runs and jobs from GitHub (GET only, BobalabGitHub):
 *
 *  - track(sha): follows one save until the site shows it. Stages: waiting
 *    (no run yet; "unknown" after 90 s) → queued → building → publishing →
 *    live. "live" is read from the DEPLOY JOB, not from the whole run: the
 *    record-slugs job runs after the site is already updated, so its failure
 *    does not undo "live". A run that GitHub cancelled because a newer save
 *    came in is followed through that newer run (main only moves forward, so
 *    the newer run publishes this save too). A failed run is "failed", unless
 *    an earlier run since the last good deploy failed as well: then the site is
 *    stuck on that earlier problem ("waiting-behind-failure", with `culprit`).
 *    After 6 minutes without an answer the stage is "slow".
 *    Polls every 10 s while the tab is visible, every 30 s when it is hidden
 *    or when fewer than 300 GitHub requests are left; stops at live or failed,
 *    or after 25 minutes.
 *  - site(): the live site now: the newest run whose deploy job succeeded
 *    (liveSha, liveAt) and, when a later run failed, the culprit: the OLDEST
 *    failing run after the last good deploy. A culprit from the daily schedule
 *    or a manual run is not blamed on a save (its `event` says so).
 *    onSite(fn) repeats site() every 60 s while the tab is visible.
 *
 * Nothing is polled in the local demo or before sign-in.
 * tests/unit/cms/deploy.test.ts runs this file against recorded and
 * synthetic GitHub answers (tests/fixtures/github/).
 */
(function (root) {
  "use strict";

  var SEC = 1000;
  var MIN = 60 * SEC;
  var POLL_VISIBLE = 10 * SEC;
  var POLL_HIDDEN = 30 * SEC;
  var SITE_EVERY = 60 * SEC;
  var NO_RUN_UNKNOWN = 90 * SEC;
  var SLOW_AFTER = 6 * MIN;
  var TRACK_MAX = 25 * MIN;
  var LOW_RATE = 300;

  var QUEUED = { queued: true, waiting: true, requested: true, pending: true };
  var FAILED = { failure: true, timed_out: true, startup_failure: true, action_required: true };

  // The deploy workflow's step names (deploy.yml) → what went wrong, in plain words.
  var STEP_TEXT = [
    [/^Validate content/i, "the content check found a problem"],
    [/^Upload types/i, "an uploaded file is too big or of the wrong type"],
    [/^Image variants/i, "an image could not be processed"],
    [/^Production export/i, "the site build failed"],
    [/^Export contract/i, "the export check failed"],
    [
      /^CMS sign-in configured/i,
      "the content manager's sign-in setting is wrong; tell a maintainer",
    ],
  ];
  var STEP_OTHER = "GitHub could not update the site; tell a maintainer";

  function gh() {
    return root.BobalabGitHub;
  }

  function cfg() {
    return root.BOBALAB_CMS || {};
  }

  function now() {
    return Date.now();
  }

  function toMs(x) {
    if (x === null || x === undefined || x === "") return 0;
    if (typeof x === "number") return x;
    var t = Date.parse(String(x));
    return isNaN(t) ? 0 : t;
  }

  /** May this tab poll GitHub? Not in the local demo, and not before sign-in. */
  function canPoll() {
    var g = gh();
    return !!(g && g.mode() === "github" && g.user());
  }

  function visible() {
    var d = root.document;
    return !d || d.visibilityState !== "hidden";
  }

  function lowRate() {
    var g = gh();
    var r = g && typeof g.rate === "function" ? g.rate() : null;
    return !!(r && r.remaining !== null && r.remaining < LOW_RATE);
  }

  function stepText(name) {
    for (var i = 0; i < STEP_TEXT.length; i++)
      if (STEP_TEXT[i][0].test(String(name || ""))) return STEP_TEXT[i][1];
    return STEP_OTHER;
  }

  // ---------------------------------------------------------------------------
  // Reading runs and jobs

  function runsUrl() {
    return (
      "/repos/" +
      gh().repo() +
      "/actions/workflows/" +
      encodeURIComponent(cfg().deployWorkflow || "deploy.yml") +
      "/runs?branch=" +
      encodeURIComponent(gh().branch()) +
      "&per_page=10"
    );
  }

  /** The newest runs first (by creation time, then id). */
  function sortRuns(runs) {
    return (runs || []).slice().sort(function (a, b) {
      return toMs(b.created_at) - toMs(a.created_at) || (b.id || 0) - (a.id || 0);
    });
  }

  function fetchRuns() {
    return gh()
      .get(runsUrl())
      .then(function (r) {
        return sortRuns((r.data && r.data.workflow_runs) || []);
      });
  }

  var jobsCache = new Map(); // run id → jobs, once the run has completed

  function fetchJobs(run) {
    if (jobsCache.has(run.id)) return Promise.resolve(jobsCache.get(run.id));
    return gh()
      .get("/repos/" + gh().repo() + "/actions/runs/" + run.id + "/jobs")
      .then(
        function (r) {
          var jobs = (r.data && r.data.jobs) || [];
          if (run.status === "completed") {
            jobsCache.set(run.id, jobs);
            while (jobsCache.size > 60) jobsCache.delete(jobsCache.keys().next().value);
          }
          return jobs;
        },
        function () {
          return null; // unknown: the run's own conclusion decides
        },
      );
  }

  function job(jobs, name) {
    for (var i = 0; i < (jobs || []).length; i++) if (jobs[i].name === name) return jobs[i];
    return null;
  }

  function deployDone(jobs) {
    var d = job(jobs, "deploy");
    return !!(d && d.status === "completed" && d.conclusion === "success");
  }

  /** The first failing step of the build or deploy job, in plain words. */
  function failedStep(jobs) {
    var names = ["build", "deploy"];
    for (var i = 0; i < names.length; i++) {
      var j = job(jobs, names[i]);
      if (
        !j ||
        j.status !== "completed" ||
        j.conclusion === "success" ||
        j.conclusion === "skipped"
      )
        continue;
      var steps = j.steps || [];
      for (var k = 0; k < steps.length; k++) {
        if (steps[k].conclusion === "failure" || steps[k].conclusion === "timed_out")
          return stepText(steps[k].name);
      }
      return STEP_OTHER;
    }
    return jobs ? STEP_OTHER : undefined;
  }

  /** Does this run need its jobs read to tell its state? */
  function needsJobs(run) {
    return run.status !== "completed" || FAILED[run.conclusion] || run.conclusion === "cancelled";
  }

  /**
   * One run's state: {stage: "queued" | "building" | "publishing" | "live" |
   * "failed" | "cancelled", step?}. `jobs` may be null (not read).
   */
  function runState(run, jobs) {
    if (deployDone(jobs)) return { stage: "live" };
    if (run.status === "completed") {
      if (run.conclusion === "success") return { stage: "live" };
      if (FAILED[run.conclusion]) return { stage: "failed", step: failedStep(jobs) };
      return { stage: "cancelled" };
    }
    if (QUEUED[run.status] || run.status !== "in_progress") return { stage: "queued" };
    var build = job(jobs, "build");
    var deploy = job(jobs, "deploy");
    var chainFailed = [build, deploy].some(function (j) {
      return j && j.status === "completed" && FAILED[j.conclusion];
    });
    if (chainFailed) return { stage: "failed", step: failedStep(jobs) };
    if (build && build.status === "completed" && build.conclusion === "success")
      return { stage: "publishing" };
    return { stage: "building" };
  }

  function stateOf(run, jobsFor) {
    if (!needsJobs(run)) return Promise.resolve(runState(run, null));
    return Promise.resolve(jobsFor(run)).then(function (jobs) {
      return runState(run, jobs);
    });
  }

  function subjectOf(run) {
    var m = (run.head_commit && run.head_commit.message) || run.display_title || "";
    return String(m).split("\n")[0].trim();
  }

  /** Culprit = {sha, subject, entry?, authorLogin?, at, runUrl, step?, event}. */
  function culpritOf(run, jobs) {
    var hist = root.BobalabHistory;
    var c = {
      sha: run.head_sha,
      subject: subjectOf(run),
      at: (run.head_commit && run.head_commit.timestamp) || run.created_at || null,
      runUrl: run.html_url || null,
      event: run.event || "push",
    };
    // Only a push is a save: a scheduled or manual rebuild of the same commit is not that save's fault.
    if (c.event === "push") {
      var parsed =
        hist && typeof hist.parseSubject === "function" ? hist.parseSubject(c.subject) : {};
      if (parsed.entry) c.entry = parsed.entry;
      var login = parsed.login || (run.actor && run.actor.login) || null;
      if (login) c.authorLogin = login;
    }
    var step = failedStep(jobs);
    if (step) c.step = step;
    return c;
  }

  /**
   * The oldest failing run after the last good deploy (newest-first `runs`),
   * as a Culprit, or null when nothing failed since the site was last updated.
   */
  function oldestFailure(runs, jobsFor) {
    var found = null;
    var i = 0;
    function next() {
      if (i >= runs.length) return Promise.resolve(found);
      var run = runs[i++];
      if (run.status === "completed" && run.conclusion === "success") return Promise.resolve(found);
      if (!needsJobs(run)) return next();
      return stateOf(run, jobsFor).then(function (st) {
        if (st.stage === "live") return found; // the site was updated after any older failure
        if (st.stage !== "failed") return next(); // in progress or cancelled: no verdict
        return Promise.resolve(jobsFor(run)).then(function (jobs) {
          found = culpritOf(run, jobs);
          return next();
        });
      });
    }
    return next();
  }

  function slowCheck(st) {
    var open = { waiting: true, queued: true, building: true, publishing: true, unknown: true };
    if (open[st.stage] && st.elapsedMs > SLOW_AFTER) st.stage = "slow";
    return st;
  }

  /**
   * The DeployState of the save `sha` from the runs (newest first). Pure but for
   * `jobsFor(run)`, which reads a run's jobs. Exported for tests as _evaluate.
   */
  function evaluate(sha, runs, jobsFor, at, startedAt) {
    var list = sortRuns(runs);
    var st = { sha: sha, stage: "waiting", elapsedMs: Math.max(0, at - startedAt) };
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].head_sha === sha && list[i].event === "push") {
        idx = i;
        break;
      }
    }
    if (idx < 0) {
      for (var j = 0; j < list.length; j++) {
        if (list[j].head_sha === sha) {
          idx = j;
          break;
        }
      }
    }
    if (idx < 0) {
      st.stage = st.elapsedMs >= NO_RUN_UNKNOWN ? "unknown" : "waiting";
      return Promise.resolve(slowCheck(st));
    }
    var mine = list[idx];
    var later = list.slice(0, idx); // newer than this save's run, newest first
    st.runUrl = mine.html_url;

    function laterLive(k) {
      // Any newer run whose deploy job succeeded published this save as well.
      if (k < 0) return Promise.resolve(null);
      var run = later[k];
      return stateOf(run, jobsFor).then(function (s) {
        return s.stage === "live" ? run : laterLive(k - 1);
      });
    }

    return stateOf(mine, jobsFor).then(function (own) {
      if (own.stage === "live") {
        st.stage = "live";
        return st;
      }
      return laterLive(later.length - 1).then(function (liveRun) {
        if (liveRun) {
          st.stage = "live";
          st.runUrl = liveRun.html_url;
          return st;
        }
        var follow = Promise.resolve({ run: mine, state: own });
        if (own.stage === "cancelled") {
          // Superseded: GitHub dropped this run for a newer push; follow that one.
          var newer = null;
          for (var k = 0; k < later.length && !newer; k++)
            if (later[k].event === "push") newer = later[k];
          if (!newer) {
            st.stage = st.elapsedMs >= NO_RUN_UNKNOWN ? "unknown" : "waiting";
            return slowCheck(st);
          }
          st.runUrl = newer.html_url;
          follow = stateOf(newer, jobsFor).then(function (s) {
            return { run: newer, state: s };
          });
        }
        return follow.then(function (f) {
          if (f.state.stage === "cancelled") {
            st.stage = "unknown";
            return slowCheck(st);
          }
          if (f.state.stage !== "failed") {
            st.stage = f.state.stage;
            return slowCheck(st);
          }
          return oldestFailure(list, jobsFor).then(function (culprit) {
            if (culprit && culprit.sha !== sha) {
              st.stage = "waiting-behind-failure";
              st.culprit = culprit;
            } else {
              st.stage = "failed";
              if (f.state.step) st.failedStep = f.state.step;
            }
            return st;
          });
        });
      });
    });
  }

  /** SiteState from the runs (newest first). Exported for tests as _siteFrom. */
  function siteFrom(runs, jobsFor) {
    var list = sortRuns(runs);
    var out = { ok: true, updating: false, liveSha: null, liveAt: null };
    var failedSince = false;
    var i = 0;
    function next() {
      if (i >= list.length) return Promise.resolve(null);
      var run = list[i++];
      return stateOf(run, jobsFor).then(function (s) {
        if (s.stage === "live") return run; // (record-slugs may still run: the site is updated)
        if (run.status !== "completed") out.updating = true;
        if (s.stage === "failed") failedSince = true;
        return next();
      });
    }
    return next().then(function (liveRun) {
      if (liveRun) {
        out.liveSha = liveRun.head_sha;
        out.liveAt =
          (liveRun.head_commit && liveRun.head_commit.timestamp) || liveRun.created_at || null;
      }
      if (!failedSince) return out;
      return oldestFailure(list, jobsFor).then(function (culprit) {
        if (culprit) {
          out.ok = false;
          out.failed = culprit;
        }
        return out;
      });
    });
  }

  // ---------------------------------------------------------------------------
  // track(sha)

  function track(sha, opts) {
    opts = opts || {};
    var startedAt = toMs(opts.startedAt) || now();
    var listeners = [];
    var state = { sha: sha, stage: canPoll() ? "waiting" : "unknown", elapsedMs: 0 };
    var stopped = false;
    var timer = null;
    var busy = false;

    function key(s) {
      return JSON.stringify([s.stage, s.runUrl, s.failedStep, s.culprit && s.culprit.sha]);
    }
    function emit(next) {
      var changed = key(next) !== key(state);
      state = next;
      if (!changed) return;
      listeners.slice().forEach(function (fn) {
        try {
          fn(state);
        } catch {
          // a listener's error must not stop the tracking
        }
      });
    }
    function delay() {
      return visible() && !lowRate() ? POLL_VISIBLE : POLL_HIDDEN;
    }
    function schedule(ms) {
      if (stopped) return;
      if (timer !== null) root.clearTimeout(timer);
      timer = root.setTimeout(poll, ms === undefined ? delay() : ms);
    }
    function poll() {
      timer = null;
      if (stopped || busy) return;
      if (now() - startedAt > TRACK_MAX) {
        stop();
        return;
      }
      busy = true;
      fetchRuns()
        .then(function (runs) {
          return evaluate(sha, runs, fetchJobs, now(), startedAt);
        })
        .then(
          function (next) {
            busy = false;
            emit(next);
            if (next.stage === "live" || next.stage === "failed") stop();
            else schedule();
          },
          function (err) {
            busy = false;
            if (err && err.kind === "auth") {
              stop();
              return;
            }
            var wait =
              err && err.kind === "rate" && err.resetAt
                ? Math.max(delay(), err.resetAt - now())
                : delay();
            schedule(wait);
          },
        );
    }
    function onVisibility() {
      if (!stopped && visible() && timer !== null && !busy) schedule(0);
    }
    function stop() {
      stopped = true;
      if (timer !== null) root.clearTimeout(timer);
      timer = null;
      var d = root.document;
      if (d && typeof d.removeEventListener === "function")
        d.removeEventListener("visibilitychange", onVisibility);
    }

    if (canPoll() && sha) {
      var d = root.document;
      if (d && typeof d.addEventListener === "function")
        d.addEventListener("visibilitychange", onVisibility);
      schedule(0);
    } else {
      stopped = true;
    }

    return {
      on: function (fn) {
        listeners.push(fn);
        return function () {
          listeners = listeners.filter(function (f) {
            return f !== fn;
          });
        };
      },
      stop: stop,
      state: function () {
        return state;
      },
    };
  }

  // ---------------------------------------------------------------------------
  // site() and onSite()

  var OFF_SITE = { ok: true, updating: false, liveSha: null, liveAt: null };

  /** The live site's state now (SiteState). Makes no request in the local demo or before sign-in. */
  function site() {
    if (!canPoll()) return Promise.resolve(Object.assign({}, OFF_SITE));
    return fetchRuns().then(function (runs) {
      return siteFrom(runs, fetchJobs);
    });
  }

  var siteSubs = [];
  var siteLast = null;
  var siteKey = "";
  var siteTimer = null;
  var siteAt = 0;
  var siteBusy = false;
  var siteListening = false;

  function siteDelay() {
    return lowRate() ? 2 * SITE_EVERY : SITE_EVERY;
  }

  function siteSchedule(ms) {
    if (siteTimer !== null) root.clearTimeout(siteTimer);
    siteTimer = null;
    if (!siteSubs.length) return;
    siteTimer = root.setTimeout(sitePoll, ms === undefined ? siteDelay() : ms);
  }

  function sitePoll() {
    siteTimer = null;
    if (!siteSubs.length || siteBusy) return;
    if (!visible()) return; // resumed by the visibilitychange listener
    if (!canPoll()) {
      siteSchedule();
      return;
    }
    siteBusy = true;
    siteAt = now();
    site().then(
      function (s) {
        siteBusy = false;
        var k = JSON.stringify(s);
        siteLast = s;
        if (k !== siteKey) {
          siteKey = k;
          siteSubs.slice().forEach(function (fn) {
            try {
              fn(s);
            } catch {
              // ignore a listener's error
            }
          });
        }
        siteSchedule();
      },
      function (err) {
        siteBusy = false;
        var wait =
          err && err.kind === "rate" && err.resetAt
            ? Math.max(siteDelay(), err.resetAt - now())
            : siteDelay();
        siteSchedule(wait);
      },
    );
  }

  function siteVisibility() {
    if (!siteSubs.length || !visible() || siteBusy) return;
    if (siteTimer === null || now() - siteAt >= SITE_EVERY) siteSchedule(0);
  }

  /** Call fn(SiteState) now (when known) and whenever it changes; returns an unsubscribe function. */
  function onSite(fn) {
    siteSubs.push(fn);
    var d = root.document;
    if (!siteListening && d && typeof d.addEventListener === "function") {
      d.addEventListener("visibilitychange", siteVisibility);
      siteListening = true;
    }
    if (siteLast) {
      try {
        fn(siteLast);
      } catch {
        // ignore
      }
    }
    if (siteTimer === null && !siteBusy)
      siteSchedule(siteLast && now() - siteAt < SITE_EVERY ? undefined : 0);
    return function () {
      siteSubs = siteSubs.filter(function (f) {
        return f !== fn;
      });
      if (!siteSubs.length) siteSchedule(); // clears the timer
    };
  }

  /** The last SiteState onSite() saw, or null. */
  function lastSite() {
    return siteLast;
  }

  /** Check the live site again now (e.g. right after a save went live), for onSite() listeners. */
  function refreshSite() {
    if (siteSubs.length && !siteBusy) siteSchedule(0);
  }

  /** For tests: forget cached jobs and the site loop. */
  function reset() {
    jobsCache.clear();
    siteSubs = [];
    siteLast = null;
    siteKey = "";
    if (siteTimer !== null) root.clearTimeout(siteTimer);
    siteTimer = null;
    siteBusy = false;
  }

  var api = {
    track: track,
    site: site,
    onSite: onSite,
    lastSite: lastSite,
    refreshSite: refreshSite,
    stepText: stepText,
    _evaluate: evaluate,
    _siteFrom: siteFrom,
    _reset: reset,
  };
  root.BobalabDeploy = api;
})(typeof window !== "undefined" ? window : globalThis);
