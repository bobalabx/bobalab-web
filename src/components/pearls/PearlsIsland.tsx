"use client";
/**
 * The homepage pearl figure's client island (DECISIONS D-15; a trimmed port of
 * the original FigureIsland at 4740e10). It renders nothing visible and wires
 * the server-rendered figure around it:
 *   - hover (80 ms intent, not touch) or focus makes one pearl active: it lifts,
 *     its halo brightens and its seeds bloom (CSS on .is-on), the other pearls'
 *     graphics dim (CSS on [data-active]), and the caption swaps to that
 *     direction's question and counts; it reverts 300 ms after leave or blur;
 *     Esc resets;
 *   - the header wordmark's O takes the active direction's colour
 *     (<html data-pearl-on> + --pearl-o, styled in pearls.css), and back;
 *   - the settle-once intro: on a full page load the pre-paint script
 *     (prePaintSource in lib/site/motion.ts) has already set <html
 *     data-cup-intro> and the session key; when home is reached by client
 *     navigation, this sets them before the first paint. The figure keeps its
 *     own data-intro until the longest settle has finished. CSS gates all of it
 *     on reduced motion.
 * No idle loop, no parallax, no Pause button (D-15).
 */
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";

/** Same key as CUP_INTRO_STORAGE_KEY in lib/site/motion.ts (unit-tested; privacy.yml names it). */
export const PEARLS_INTRO_KEY = "bobalab-cup-intro";
const INTRO = "data-cup-intro";
const noop = () => () => {};

function wire(fig: HTMLElement): () => void {
  const D = document;
  const R = D.documentElement;
  const items = [...fig.querySelectorAll<HTMLElement>(".pl-item")];
  const caps = new Map<string, HTMLElement>();
  fig.querySelectorAll<HTMLElement>("[data-cap]").forEach((c) => caps.set(c.dataset.cap!, c));
  const legend = caps.get("legend")!;
  const off: Array<() => void> = [];
  const on = <E extends Event>(el: EventTarget, type: string, fn: (e: E) => void) => {
    el.addEventListener(type, fn as EventListener);
    off.push(() => el.removeEventListener(type, fn as EventListener));
  };
  let act = -1;
  let tIn = 0;
  let tOut = 0;
  let shown = legend;

  const tint = (li?: HTMLElement) => {
    if (li) {
      R.setAttribute("data-pearl-on", li.dataset.slug!);
      R.style.setProperty("--pearl-o", getComputedStyle(li).getPropertyValue("--dir"));
    } else {
      R.removeAttribute("data-pearl-on");
      R.style.removeProperty("--pearl-o");
    }
  };
  const set = (i: number) => {
    clearTimeout(tIn);
    clearTimeout(tOut);
    if (i === act) return;
    items[act]?.classList.remove("is-on");
    act = i;
    const li = items[i];
    const cap = (li && caps.get(li.dataset.slug!)) || legend;
    shown.classList.remove("is-on");
    cap.classList.add("is-on");
    shown = cap;
    fig.toggleAttribute("data-active", Boolean(li));
    li?.classList.add("is-on");
    tint(li);
  };
  const idx = (el: EventTarget | null) =>
    el instanceof Node ? items.findIndex((li) => li.contains(el)) : -1;
  const later = () => {
    clearTimeout(tOut);
    tOut = window.setTimeout(() => set(idx(D.activeElement)), 300);
  };

  items.forEach((li, i) => {
    on<PointerEvent>(li, "pointerenter", (e) => {
      if (e.pointerType === "touch") return;
      clearTimeout(tOut);
      clearTimeout(tIn);
      tIn = window.setTimeout(() => set(i), 80);
    });
    on(li, "pointerleave", () => {
      clearTimeout(tIn);
      later();
    });
  });
  on<FocusEvent>(fig, "focusin", (e) => set(idx(e.target)));
  on(fig, "focusout", later);
  on<KeyboardEvent>(D, "keydown", (e) => {
    if (e.key === "Escape" && act >= 0) set(-1);
  });
  fig.dataset.js = ""; // wired (tests wait for it)

  return () => {
    delete fig.dataset.js;
    off.forEach((f) => f());
    clearTimeout(tIn);
    clearTimeout(tOut);
    tint();
  };
}

export function PearlsIsland() {
  const ref = useRef<HTMLSpanElement>(null);
  // false while hydrating a server-rendered page, true when mounted by a client navigation.
  const client = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const fresh = useRef(client);
  const started = useRef(false);

  useLayoutEffect(() => {
    const fig = ref.current?.closest<HTMLElement>(".pl");
    if (!fig) return;
    // One-shot (an effect re-run, e.g. React's dev double-invoke, never restarts it).
    if (!started.current) {
      started.current = true;
      const R = document.documentElement;
      let mine = false;
      try {
        if (!sessionStorage.getItem(PEARLS_INTRO_KEY)) {
          sessionStorage.setItem(PEARLS_INTRO_KEY, "1");
          // A full load without the pre-paint flag must not start the settle on
          // pearls that are already painted (they would jump).
          mine = fresh.current;
          if (mine) R.setAttribute(INTRO, "");
        }
      } catch {
        // storage blocked: no intro
      }
      if (R.hasAttribute(INTRO)) {
        fig.dataset.intro = "";
        window.setTimeout(() => {
          delete fig.dataset.intro;
          if (mine) R.removeAttribute(INTRO);
        }, 1600);
      }
    }
    return wire(fig);
  }, []);

  return <span ref={ref} hidden />;
}
