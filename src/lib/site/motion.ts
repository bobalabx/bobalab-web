/**
 * The visitor's "Reduce motion" preference (brief §E7, D-02). Stored only in
 * this browser (localStorage "bobalab-motion"), mirrored to <html data-motion>.
 * The footer MotionToggle and the figure's Pause/Play button (WP1) both use
 * these helpers so they stay in sync. Client-only; every access is guarded.
 */
export const MOTION_STORAGE_KEY = "bobalab-motion";
export const INTRO_STORAGE_KEY = "bobalab-intro";
export const MOTION_EVENT = "bobalab-motion-change";

export function readStoredMotion(): "reduce" | "auto" {
  try {
    return window.localStorage.getItem(MOTION_STORAGE_KEY) === "reduce" ? "reduce" : "auto";
  } catch {
    return document.documentElement.dataset.motion === "reduce" ? "reduce" : "auto";
  }
}

export function systemPrefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** True when motion should be off for any reason (OS setting or the site toggle). */
export function motionReduced(): boolean {
  return readStoredMotion() === "reduce" || systemPrefersReducedMotion();
}

export function setMotionPreference(reduce: boolean): void {
  const root = document.documentElement;
  if (reduce) root.setAttribute("data-motion", "reduce");
  else root.removeAttribute("data-motion");
  try {
    if (reduce) window.localStorage.setItem(MOTION_STORAGE_KEY, "reduce");
    else window.localStorage.removeItem(MOTION_STORAGE_KEY);
  } catch {
    // storage blocked: the attribute still applies for this page view
  }
  window.dispatchEvent(new Event(MOTION_EVENT));
}

export function subscribeMotion(cb: () => void): () => void {
  const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  window.addEventListener(MOTION_EVENT, cb);
  window.addEventListener("storage", cb);
  mq?.addEventListener?.("change", cb);
  return () => {
    window.removeEventListener(MOTION_EVENT, cb);
    window.removeEventListener("storage", cb);
    mq?.removeEventListener?.("change", cb);
  };
}

/**
 * Pre-paint script body (runs synchronously in <head> before first paint):
 * 1. apply the stored motion preference;
 * 2. on the first home view of the browser session, set <html data-intro>
 *    (removed after 2 s) so the Fig. 1 intro plays once (D-02a, WP1 request 3).
 */
export function prePaintSource(basePath: string): string {
  const b = JSON.stringify(basePath.replace(/\/+$/, ""));
  return (
    `(function(){var d=document.documentElement;` +
    `try{if(localStorage.getItem(${JSON.stringify(MOTION_STORAGE_KEY)})==="reduce")d.setAttribute("data-motion","reduce")}catch(e){}` +
    `try{var b=${b},p=location.pathname;` +
    `if((p===b+"/"||p===b+"/index.html"||p===b)&&!sessionStorage.getItem(${JSON.stringify(INTRO_STORAGE_KEY)})){` +
    `sessionStorage.setItem(${JSON.stringify(INTRO_STORAGE_KEY)},"1");d.setAttribute("data-intro","");` +
    `setTimeout(function(){d.removeAttribute("data-intro")},2000)}}catch(e){}})();`
  );
}
