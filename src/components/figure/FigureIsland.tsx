"use client";
/**
 * Fig. 1 client island (brief §E3–§E4, DECISIONS D-02/D-02a). It renders the
 * Pause/Play motion button and wires the server-rendered plate around it:
 *   - live caption + active state on hover (80 ms intent, fine pointers) and
 *     focus (no delay); reverts 300 ms after leave/blur; Esc resets;
 *   - bounded seed "stir" (±14°, 2.4 s) while active, eased back on leave;
 *   - pointer parallax (fine pointers; rAF only while values settle);
 *   - idle float switched on ([data-live]) and paused off-screen / hidden tab;
 *   - intro hand-off: keeps the plate's own data-intro alive until the intro ends.
 * Pause/Play writes the same preference as the footer MotionToggle
 * (localStorage "bobalab-motion" + <html data-motion>).
 */
import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  motionReduced,
  readStoredMotion,
  setMotionPreference,
  subscribeMotion,
  systemPrefersReducedMotion,
} from "@/lib/site/motion";

const snap = () => (systemPrefersReducedMotion() ? "os" : readStoredMotion());
const serverSnap = () => "ssr";

type Stir = { a?: Animation };

function wire(fig: HTMLElement): () => void {
  const D = document;
  const R = D.documentElement;
  const items = [...fig.querySelectorAll<HTMLElement>(".f1-item")];
  const caps = new Map<string, HTMLElement>();
  fig.querySelectorAll<HTMLElement>("[data-cap]").forEach((c) => caps.set(c.dataset.cap!, c));
  const legend = caps.get("legend")!;
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const figMode = () => getComputedStyle(fig).getPropertyValue("--f1-mode").trim() === "fig";
  const stirs = new Map<HTMLElement, Stir>();
  const timers: number[] = [];
  const off: Array<() => void> = [];
  const on = <K extends keyof HTMLElementEventMap>(
    el: HTMLElement | Document | Window,
    type: K | string,
    fn: (e: never) => void,
  ) => {
    el.addEventListener(type, fn as EventListener);
    off.push(() => el.removeEventListener(type, fn as EventListener));
  };
  let act = -1;
  let tIn = 0;
  let tOut = 0;
  let shown = legend;

  const show = (c: HTMLElement) => {
    if (c === shown) return;
    shown.classList.remove("is-on");
    c.classList.add("is-on");
    shown = c;
  };

  const stir = (li: HTMLElement, go: boolean) => {
    const el = li.querySelector<HTMLElement>(".f1-seeds");
    if (!el || !el.animate) return;
    const s = stirs.get(el) ?? {};
    stirs.set(el, s);
    if (go) {
      if (motionReduced() || !figMode()) return;
      s.a?.cancel();
      const k = (r: string) => ({ rotate: r, easing: "ease-in-out" });
      s.a = el.animate([k("0deg"), k("14deg"), k("-14deg"), k("0deg")], {
        duration: 2400,
        iterations: Infinity,
        direction: "alternate",
      });
    } else if (s.a) {
      const r = getComputedStyle(el).rotate;
      s.a.cancel();
      s.a = motionReduced()
        ? undefined
        : el.animate([{ rotate: r === "none" ? "0deg" : r }, { rotate: "0deg" }], {
            duration: 400,
            easing: "ease-out",
          });
    }
  };

  const set = (i: number) => {
    clearTimeout(tIn);
    clearTimeout(tOut);
    if (i === act) return;
    if (act >= 0) {
      items[act]!.classList.remove("is-on");
      stir(items[act]!, false);
    }
    act = i;
    if (i < 0) {
      delete fig.dataset.active;
      show(legend);
      return;
    }
    const li = items[i]!;
    fig.dataset.active = "";
    li.classList.add("is-on");
    show((figMode() && caps.get(li.dataset.slug!)) || legend);
    stir(li, true);
  };
  const idxOf = (el: Element | null) => (el ? items.findIndex((li) => li.contains(el)) : -1);
  const later = () => {
    clearTimeout(tOut);
    tOut = window.setTimeout(() => set(idxOf(D.activeElement)), 300);
  };

  items.forEach((li, i) => {
    on(li, "pointerenter", (e: PointerEvent) => {
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
  on(fig, "focusin", (e: FocusEvent) => set(idxOf(e.target as Element)));
  on(fig, "focusout", later);
  on(D, "keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && act >= 0) set(-1);
  });

  // Pointer parallax: halo −2 px, pearl +2 px, seeds +4 px (CSS), τ = 160 ms.
  let tx = 0;
  let ty = 0;
  let px = 0;
  let py = 0;
  let raf = 0;
  let last = 0;
  const clamp = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);
  const write = () => {
    fig.style.setProperty("--mx", px.toFixed(3));
    fig.style.setProperty("--my", py.toFixed(3));
  };
  const tick = (t: number) => {
    const k = 1 - Math.exp(-Math.max(0, t - last) / 160);
    last = t;
    px += (tx - px) * k;
    py += (ty - py) * k;
    const done = Math.abs(tx - px) + Math.abs(ty - py) < 0.002;
    if (done) {
      px = tx;
      py = ty;
    }
    write();
    raf = done ? 0 : requestAnimationFrame(tick);
  };
  const kick = () => {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  on(fig, "pointermove", (e: PointerEvent) => {
    if (e.pointerType === "touch" || !fine.matches || motionReduced() || !figMode()) return;
    const b = fig.getBoundingClientRect();
    tx = clamp(((e.clientX - b.left) / b.width) * 2 - 1);
    ty = clamp(((e.clientY - b.top) / b.height) * 2 - 1);
    kick();
  });
  on(fig, "pointerleave", () => {
    tx = ty = 0;
    kick();
  });

  // Motion preference changes (this button, the footer toggle, the OS).
  const sync = () => {
    if (!motionReduced()) return;
    stirs.forEach((s) => s.a?.cancel());
    cancelAnimationFrame(raf);
    raf = 0;
    tx = ty = px = py = 0;
    write();
  };
  off.push(subscribeMotion(sync));

  // Idle float: on once the Pause control exists; paused off-screen and in hidden tabs.
  fig.dataset.live = "";
  const vis = () => fig.toggleAttribute("data-hid", D.hidden);
  vis();
  on(D, "visibilitychange", vis);
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(([e]) =>
      fig.toggleAttribute("data-off", !e?.isIntersecting),
    );
    io.observe(fig);
    off.push(() => io.disconnect());
  }

  // Intro hand-off: the pre-paint script drops <html data-intro> after 2 s; keep the
  // plate's copy until the longest intro (n = 8, 12 seeds) has finished.
  if (R.hasAttribute("data-intro")) {
    fig.dataset.intro = "";
    timers.push(window.setTimeout(() => delete fig.dataset.intro, 2000));
  }

  return () => {
    off.forEach((f) => f());
    timers.forEach(clearTimeout);
    clearTimeout(tIn);
    clearTimeout(tOut);
    cancelAnimationFrame(raf);
    stirs.forEach((s) => s.a?.cancel());
    delete fig.dataset.live;
  };
}

export function FigureIsland() {
  const ref = useRef<HTMLButtonElement>(null);
  const state = useSyncExternalStore(subscribeMotion, snap, serverSnap);
  useEffect(() => {
    const fig = ref.current?.closest<HTMLElement>(".f1-plate");
    return fig ? wire(fig) : undefined;
  }, []);
  const paused = state === "reduce";
  return (
    <button
      ref={ref}
      type="button"
      className="f1-pause"
      hidden={state === "ssr" || state === "os"}
      onClick={() => setMotionPreference(!paused)}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {paused ? <path d="M5 3.5v9l7-4.5z" /> : <path d="M5.5 3.5v9M10.5 3.5v9" />}
      </svg>
      {paused ? "Play motion" : "Pause motion"}
    </button>
  );
}
