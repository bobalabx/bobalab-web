"use client";
/**
 * The live preview the content manager shows beside its form (spec §2, D1).
 * Everything arrives by message from the parent window (cms-live.js), in
 * order (src/lib/preview/protocol.ts):
 *
 *   mode      editor view (default) or "Show as visitors see it"
 *   loading   progress while the saved site loads ("Loading the site… (3 of 8)")
 *   base      the saved site: every entry as the content manager loaded it
 *   overlay   the form's draft of the entry being edited (one per edit)
 *   assets    unsaved uploads as data URLs, keyed by public path
 *   navigate  which page to show; find: scroll to the edited entry
 *   parse     a service for History: one file's data before the schema
 *   check     a service for Save: the site check on exactly the data to save
 *
 * Rendering is the site's own pipeline: rawFromBase(base) with the draft put
 * in leniently (a half-filled form still shows), buildContent(raw,
 * {preview: false}) like the live site, then the shared page views. In the
 * editor view the edited entry shows even with Draft on; other drafts never
 * do. After every render the page posts `rendered` (and again when the live
 * problems are ready, 400 ms after the last edit). An error boundary keeps the
 * last good render, so the column is never blank.
 *
 * Nothing renders at build time but the shell; entry marks are turned on in a
 * mount effect (never at module top, src/lib/preview/mark.ts). The page reads
 * no storage and contacts nothing: the site CSP's connect-src 'self' holds.
 */
// First: zod must be jitless before any schema is built (see the file).
import "./zod-jitless";
import { Component, memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildContent, type Content } from "@/lib/content/build";
import type { RawContent } from "@/lib/content/parse";
import { todayInLab } from "@/lib/content/dates";
import {
  directionDetail,
  newsDetail,
  projectDetail,
  publicationDetail,
} from "@/lib/content/queries";
import { setAssetOverrides } from "@/lib/preview/assets";
import {
  baseRaw,
  checkSave,
  liveProblems,
  type CheckResult,
  type CheckState,
} from "@/lib/preview/check";
import { enableEntryMarks } from "@/lib/preview/mark";
import { applyLenient, entryOf, forceVisible, type LastGood } from "@/lib/preview/overlay";
import {
  isToPreview,
  type EntryRef,
  type FromPreview,
  type LiveProblems,
  type PreviewBase,
  type PreviewTarget,
  type PublishedSlugs,
  type ToPreview,
} from "@/lib/preview/protocol";
import { isOwnPage, pathOf, sameTarget, targetFromPath } from "@/lib/preview/targets";
import { BASE_PATH } from "@/lib/site/paths";
import { HomeView } from "@/components/views/HomeView";
import { ResearchView } from "@/components/views/ResearchView";
import { DirectionPageView } from "@/components/views/DirectionPageView";
import { ProjectsView } from "@/components/views/ProjectsView";
import { ProjectDetailView } from "@/components/views/ProjectDetailView";
import { PublicationsView } from "@/components/views/PublicationsView";
import { PublicationDetailView } from "@/components/views/PublicationDetailView";
import { NewsListView } from "@/components/views/NewsListView";
import { NewsArticleView } from "@/components/views/NewsArticleView";
import { JoinView } from "@/components/views/JoinView";
import { AboutView } from "@/components/views/AboutView";
import { TextPageView } from "@/components/views/TextPageView";
import { PeopleIndex } from "@/components/people/PeopleIndex";
import { PersonProfile } from "@/components/people/PersonProfile";
import { buildPersonProfile } from "@/components/people/model";
import { SiteFooter } from "@/components/site/SiteFooter";
import "./editor-preview.css";

const STANDALONE_TEXT =
  "This page shows the content manager’s live preview. Open it from the content manager.";

/** How long a page may wait for its first message before it says it is standalone. */
const STANDALONE_AFTER_MS = 3000;
/** Live problems are computed this long after the last edit. */
const PROBLEMS_AFTER_MS = 400;
const FLASH_MS = 1200;
const FLASH_REDUCED_MS = 1000;

const NO_PROBLEMS: LiveProblems = { available: false, blocking: [], warnings: [], stillNeeded: [] };

type Overlay = { entry: EntryRef; isNew: boolean; data: Record<string, unknown> };

/** Everything the messages have set; lives outside React so services read it at once. */
interface Model {
  base: Partial<PreviewBase> | null;
  complete: boolean;
  publishedSlugs: PublishedSlugs;
  overlay: Overlay | null;
  lastGood: LastGood | null;
  visitor: boolean;
  rev: number;
  target: PreviewTarget;
  loading: { done: number; total: number } | null;
  problems: LiveProblems;
  heard: boolean;
  seq: number;
}

/** What one render shows. */
interface View {
  seq: number;
  raw: RawContent | null;
  today: string;
  target: PreviewTarget;
  rev: number;
  overlay: { entry: EntryRef; isNew: boolean } | null;
  loading: { done: number; total: number } | null;
  /** Bumped when the page changes (scroll to the top, clear the query). */
  nav: number;
}

interface Built {
  content: Content | null;
  error?: string;
}

const INITIAL_VIEW: View = {
  seq: 0,
  raw: null,
  today: "",
  target: { page: "home" },
  rev: 0,
  overlay: null,
  loading: null,
  nav: 0,
};

/**
 * A prefetch by the client router (next/link prefetches the pages its links
 * point to). The preview never navigates (every click is handled here), and
 * the page of a draft or of a new entry does not exist on the server, so such
 * requests are answered locally instead of producing "404" console errors.
 * On the static export the router first checks the page with a HEAD request
 * (no prefetch header), then fetches its files with the header; the preview
 * itself never sends HEAD.
 */
function isRouterPrefetch(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  if (method.toUpperCase() === "HEAD") return true;
  const h = init?.headers ?? (input instanceof Request ? input.headers : undefined);
  if (!h) return false;
  if (h instanceof Headers) return h.has("next-router-prefetch");
  const keys = Array.isArray(h) ? h.map(([k]) => k) : Object.keys(h);
  return keys.some((k) => k.toLowerCase() === "next-router-prefetch");
}

function post(msg: FromPreview) {
  try {
    window.parent.postMessage(msg, window.location.origin);
  } catch {
    // A detached or cross-origin parent: nothing to tell.
  }
}

const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
  document.documentElement.dataset.motion === "reduce";

function build(raw: RawContent | null, today: string): Built {
  if (!raw) return { content: null };
  try {
    return { content: buildContent(raw, { preview: false, today }) };
  } catch (e) {
    return { content: null, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------------------
// Pages

/** What the publication page shows where the published page has its citation box. */
const CITATION = (
  <section className="pub-sec ep-cite" aria-labelledby="cite-h">
    <h2 id="cite-h" className="pub-sec__h">
      Cite
    </h2>
    <div className="pub-sec__body">
      <p className="ep-citation">Citation box: shown on the published page</p>
    </div>
  </section>
);

function NotOnSite() {
  return (
    <div className="bl-container ep-notonsite">
      <h1 tabIndex={-1}>Not on the live site</h1>
      <p>Visitors get “Page not found” at this address.</p>
    </div>
  );
}

function PageFor({ built, target }: { built: Built; target: PreviewTarget }) {
  if (!built.content) throw new Error(built.error ?? "The site could not be built.");
  const c = built.content;
  const slug = target.slug ?? "";
  switch (target.page) {
    case "home":
      return <HomeView c={c} />;
    case "research":
      return <ResearchView c={c} />;
    case "direction": {
      const d = directionDetail(c, slug);
      return d ? <DirectionPageView c={c} detail={d} /> : <NotOnSite />;
    }
    case "projects":
      return <ProjectsView c={c} />;
    case "project": {
      const d = projectDetail(c, slug);
      return d ? <ProjectDetailView c={c} d={d} /> : <NotOnSite />;
    }
    case "publications":
      return <PublicationsView c={c} />;
    case "publication": {
      const d = publicationDetail(c, slug);
      return d ? <PublicationDetailView c={c} d={d} citation={CITATION} /> : <NotOnSite />;
    }
    case "people":
      return <PeopleIndex content={c} />;
    case "person": {
      const m = buildPersonProfile(c, slug);
      return m ? <PersonProfile content={c} model={m} /> : <NotOnSite />;
    }
    case "news":
      return <NewsListView c={c} />;
    case "news-item": {
      const d = newsDetail(c, slug);
      return d ? <NewsArticleView c={c} d={d} /> : <NotOnSite />;
    }
    case "join":
      return <JoinView c={c} />;
    case "about":
      return <AboutView c={c} />;
    case "accessibility":
    case "privacy":
      return <TextPageView c={c} name={target.page} />;
  }
}

const Page = memo(PageFor);

/**
 * Keeps the last good render when a page throws: a new render (resetKey) tries
 * again; until then the previous page stays and the error is reported.
 */
class LastGoodBoundary extends Component<
  { resetKey: number; onError: (message: string) => void; children: ReactNode },
  { error: string | null; resetKey: number }
> {
  state = { error: null as string | null, resetKey: this.props.resetKey };
  private lastGood: ReactNode = null;

  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }

  static getDerivedStateFromProps(
    props: { resetKey: number },
    state: { error: string | null; resetKey: number },
  ) {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(e: unknown) {
    this.props.onError(e instanceof Error ? e.message : String(e));
  }

  componentDidMount() {
    this.keep();
  }

  componentDidUpdate() {
    this.keep();
  }

  private keep() {
    if (!this.state.error) this.lastGood = this.props.children;
  }

  render() {
    if (!this.state.error) return this.props.children;
    return this.lastGood ?? <LastResort message={this.state.error} />;
  }
}

/** Shown only when even the last good render fails. */
class OuterBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  render() {
    return this.state.error ? <LastResort message={this.state.error} /> : this.props.children;
  }
}

function LastResort({ message }: { message: string }) {
  return (
    <div className="bl-container ep-notonsite" role="alert">
      <h1 tabIndex={-1}>This page can’t be previewed with the current changes</h1>
      <p>Keep editing: the preview comes back as soon as the page can be drawn. ({message})</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The page

export function EditorPreview() {
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [standalone, setStandalone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const model = useRef<Model | null>(null);
  const renderError = useRef<string | undefined>(undefined);
  /** The last `rendered` facts, re-sent with new problems. */
  const last = useRef<Omit<Extract<FromPreview, { type: "bobalab:rendered" }>, "problems"> | null>(
    null,
  );
  const lastNav = useRef(0);
  const pendingHash = useRef<string | null>(null);

  const built = useMemo(() => build(view.raw, view.today), [view.raw, view.today]);

  // Messages, keys and clicks: set up once on mount.
  useEffect(() => {
    enableEntryMarks();
    const realFetch = window.fetch;
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
      isRouterPrefetch(input, init)
        ? Promise.reject(new TypeError("The editor preview does not load other pages."))
        : realFetch.call(window, input, init)) as typeof window.fetch;
    const m: Model = {
      base: null,
      complete: false,
      publishedSlugs: null,
      overlay: null,
      lastGood: null,
      visitor: false,
      rev: 0,
      target: { page: "home" },
      loading: null,
      problems: NO_PROBLEMS,
      heard: false,
      seq: 0,
    };
    model.current = m;
    let problemsTimer: ReturnType<typeof setTimeout> | undefined;

    const checkState = (): CheckState => ({
      base: m.base,
      complete: m.complete,
      publishedSlugs: m.publishedSlugs,
      today: todayInLab(new Date()),
    });

    const refresh = (nav = false) => {
      const today = todayInLab(new Date());
      let raw = baseRaw(m);
      if (raw && m.overlay) {
        const r = applyLenient(raw, m.overlay.entry, m.overlay.data, m.lastGood, { today });
        m.lastGood = r.lastGood;
        raw = m.visitor ? r.raw : forceVisible(r.raw, m.overlay.entry);
      }
      m.seq += 1;
      const seq = m.seq;
      setView((v) => ({
        seq,
        raw,
        today,
        target: m.target,
        rev: m.rev,
        overlay: m.overlay ? { entry: m.overlay.entry, isNew: m.overlay.isNew } : null,
        loading: m.loading,
        nav: nav ? v.nav + 1 : v.nav,
      }));
    };

    const sendProblems = () => {
      if (!last.current) return;
      post({ ...last.current, problems: m.problems });
    };
    const scheduleProblems = () => {
      clearTimeout(problemsTimer);
      problemsTimer = setTimeout(() => {
        try {
          const o = m.overlay;
          m.problems = liveProblems(checkState(), o ? { ...o } : null);
        } catch {
          m.problems = NO_PROBLEMS;
        }
        sendProblems();
      }, PROBLEMS_AFTER_MS);
    };

    const goTo = (target: PreviewTarget) => {
      const changed = !sameTarget(m.target, target);
      m.target = target;
      refresh(changed);
    };

    const handle = (msg: ToPreview) => {
      switch (msg.type) {
        case "bobalab:mode":
          m.visitor = msg.visitor;
          refresh();
          return;
        case "bobalab:loading":
          m.loading = { done: msg.done, total: msg.total };
          if (!m.base) refresh();
          return;
        case "bobalab:base":
          m.base = msg.base;
          m.complete = msg.complete;
          m.publishedSlugs = msg.publishedSlugs;
          m.loading = null;
          refresh();
          scheduleProblems();
          return;
        case "bobalab:overlay":
          m.overlay = { entry: entryOf(msg.entry), isNew: msg.isNew, data: msg.data };
          m.rev = msg.rev;
          refresh();
          scheduleProblems();
          return;
        case "bobalab:overlay-clear":
          m.overlay = null;
          m.lastGood = null;
          m.rev = msg.rev;
          refresh();
          scheduleProblems();
          return;
        case "bobalab:assets":
          setAssetOverrides(msg.assets);
          refresh();
          return;
        case "bobalab:navigate":
          goTo(msg.target);
          return;
        case "bobalab:find":
          find(m);
          return;
        case "bobalab:parse": {
          const { id, path, text } = msg;
          import("@/lib/content/parse")
            .then(({ parseFileData }) => {
              const r = parseFileData(path, text);
              post(
                r.ok
                  ? { type: "bobalab:parsed", v: 1, id, ok: true, data: r.data }
                  : { type: "bobalab:parsed", v: 1, id, ok: false, error: r.error },
              );
            })
            .catch((e: unknown) =>
              post({ type: "bobalab:parsed", v: 1, id, ok: false, error: String(e) }),
            );
          return;
        }
        case "bobalab:check": {
          let r: CheckResult;
          try {
            r = checkSave(checkState(), { entry: msg.entry, isNew: msg.isNew, data: msg.data });
          } catch {
            r = { available: false, blocking: [], warnings: [] };
          }
          post({ type: "bobalab:checked", v: 1, id: msg.id, ...r });
          return;
        }
      }
    };

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || !isToPreview(e.data)) return;
      if (!m.heard) {
        m.heard = true;
        setStandalone(false);
      }
      handle(e.data);
    };

    // Internal links switch the previewed page; files and other sites open in a new tab.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (href.startsWith("#") || /^(mailto|tel):/i.test(href)) return;
      let url: URL;
      try {
        url = new URL(href, document.baseURI);
      } catch {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (url.protocol !== "https:" && url.protocol !== "http:") return;
      const target =
        url.origin === window.location.origin ? targetFromPath(url.pathname, BASE_PATH) : null;
      if (!target) {
        window.open(url.href, "_blank", "noopener");
        return;
      }
      pendingHash.current = url.hash ? decodeURIComponent(url.hash.slice(1)) : null;
      goTo(target);
      post({ type: "bobalab:navigated", v: 1, target, path: pathOf(target) });
    };

    // Ctrl/Cmd+S saves in the content manager, wherever the focus is.
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        post({ type: "bobalab:key", v: 1, key: "save" });
      }
    };

    window.addEventListener("message", onMessage);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    const standaloneTimer = setTimeout(() => {
      if (!m.heard) setStandalone(true);
    }, STANDALONE_AFTER_MS);
    post({ type: "bobalab:ready", v: 1 });
    return () => {
      window.fetch = realFetch;
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
      clearTimeout(standaloneTimer);
      clearTimeout(problemsTimer);
    };
  }, []);

  // After every render of the site: highlight, report, scroll.
  useEffect(() => {
    const root = rootRef.current;
    const m = model.current;
    if (!root || !m || !view.raw) return;
    const page = root.querySelector<HTMLElement>(".ep-page");
    if (view.nav !== lastNav.current) {
      lastNav.current = view.nav;
      // The publications explorer keeps its filters in the query; a new page starts clean.
      if (window.location.search)
        window.history.replaceState(window.history.state, "", window.location.pathname);
      const hash = pendingHash.current;
      pendingHash.current = null;
      const at = hash ? document.getElementById(hash) : null;
      if (at) at.scrollIntoView();
      else window.scrollTo(0, 0);
    }
    for (const el of root.querySelectorAll("[data-ep-editing]")) {
      el.removeAttribute("data-ep-editing");
      el.removeAttribute("data-ep-pos");
    }
    const marks = editedMarks(root, view.overlay?.entry ?? null);
    let found: "page" | "marker" | "absent" | "not-found" = "absent";
    if (page?.querySelector(":scope > .ep-notonsite")) found = "not-found";
    else if (view.overlay && isOwnPage(view.overlay.entry, view.target)) found = "page";
    else if (marks.length) {
      found = "marker";
      const tag = view.overlay?.isNew ? "New · not saved yet" : "Editing";
      for (const el of marks) {
        el.setAttribute("data-ep-editing", tag);
        if (el instanceof HTMLElement && getComputedStyle(el).position === "static")
          el.setAttribute("data-ep-pos", "");
      }
    }
    const error = renderError.current;
    renderError.current = undefined;
    last.current = {
      type: "bobalab:rendered",
      v: 1,
      rev: view.rev,
      target: view.target,
      path: pathOf(view.target),
      title: page?.querySelector("h1")?.textContent?.trim() ?? "",
      found,
      ...(error ? { renderError: error } : {}),
    };
    post({ ...last.current, problems: m.problems });
  }, [view, built]);

  const content = built.content;
  return (
    <div className="ep-root" ref={rootRef}>
      {view.raw ? (
        <>
          <OuterBoundary>
            <LastGoodBoundary
              resetKey={view.seq}
              onError={(message) => {
                renderError.current = message;
              }}
            >
              <div className="ep-page">
                <Page built={built} target={view.target} />
              </div>
            </LastGoodBoundary>
          </OuterBoundary>
          {content ? <SiteFooter site={content.site} lastUpdated={content.today} /> : null}
        </>
      ) : (
        <div className="bl-container ep-shell">
          {standalone ? null : (
            <>
              <p className="ep-loading" role="status">
                Loading the site…
                {view.loading ? ` (${view.loading.done} of ${view.loading.total})` : ""}
              </p>
              <div className="ep-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </>
          )}
          {standalone ? (
            // Opened on its own (no content manager around it): say so, and nothing else.
            <div className="ep-standalone">
              <h1>Content manager preview</h1>
              <p>{STANDALONE_TEXT}</p>
            </div>
          ) : (
            <p className="ep-standalone" hidden>
              {STANDALONE_TEXT}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Find my entry

/** Collections whose entries carry marks (src/lib/preview/mark.ts); pages and Settings have none. */
const MARKED = new Set([
  "news",
  "publications",
  "people",
  "directions",
  "projects",
  "opportunities",
]);

/** The marked elements of the edited entry. */
function editedMarks(root: HTMLElement, entry: EntryRef | null): Element[] {
  if (!entry || !MARKED.has(entry.collection)) return [];
  const key = `${entry.collection}/${entry.slug}`;
  return [...root.querySelectorAll(`[data-entry="${CSS.escape(key)}"]`)];
}

/** Scroll the edited entry (or the top of its own page) to the centre, flash and focus it. */
function find(m: Model) {
  const root = document.querySelector<HTMLElement>(".ep-root");
  const page = root?.querySelector<HTMLElement>(".ep-page");
  if (!root || !page) return;
  const entry = m.overlay?.entry ?? null;
  const own = entry ? isOwnPage(entry, m.target) : false;
  const mark = own ? undefined : editedMarks(root, entry)[0];
  const el = (mark as HTMLElement | undefined) ?? page.querySelector<HTMLElement>("h1") ?? page;
  const reduce = reducedMotion();
  if (mark) el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  else window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
  el.classList.remove("ep-flash");
  void el.getBoundingClientRect(); // restart the animation
  el.classList.add("ep-flash");
  setTimeout(() => el.classList.remove("ep-flash"), reduce ? FLASH_REDUCED_MS : FLASH_MS);
}
