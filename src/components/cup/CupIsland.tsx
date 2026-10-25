"use client";
/**
 * The cup's client island (DECISIONS D-14; JUDGE.md R2, R7–R11, R15, R16;
 * prototype docs/simplify/prototypes/c/c.js). Kept small: positions, the drawing
 * and every panel's content come from the server (BobaCup); this only
 *   - upgrades each label from a link (the no-JS fallback) to a disclosure button
 *     (aria-expanded, aria-controls) once hydrated;
 *   - picks one pearl at a time (click, tap, Enter or Space on the label, or a
 *     click on the pearl): it rises, its panel shows, the others step back; Esc
 *     or picking it again sinks it and returns focus to its button (Esc only when
 *     focus was in the cup); a click or tap outside the cup sinks it (never a
 *     scroll gesture, and only after the click has landed: see the effect);
 *   - names the risen pearl's wrapper `pearl-{slug}` (one name per slug, only
 *     while it is up) so "Explore" morphs it into the direction page's pearl;
 *   - tints the header wordmark's O to the open direction's colour
 *     (<html data-cup-open> + --cup-o, styled in cup.css) and back;
 *   - on narrow screens reserves room for the panel below the cup (--cup-pad) and
 *     scrolls it into view only when it is off-screen;
 *   - plays the settle-once intro on the first home view of the session
 *     (sessionStorage "bobalab-cup-intro" → <html data-cup-intro>; CSS gates it
 *     on reduced motion).
 * Hover needs no script: CSS lifts the pearl and thickens the underline.
 */
import Link from "next/link";
import {
  ViewTransition,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motionReduced } from "@/lib/site/motion";
import { pearlVtName, VT } from "@/lib/vt";

export interface CupItem {
  slug: string;
  label: string;
  href: string;
  swatch: string;
  style: CSSProperties;
}

/** Session key of the cup's settle-once intro (separate from the figure's "bobalab-intro"). */
export const CUP_INTRO_KEY = "bobalab-cup-intro";
const noop = () => () => {};

export function CupIsland({
  items,
  panels,
  children,
}: {
  items: CupItem[];
  panels: ReactNode[];
  children: ReactNode;
}) {
  // false on the server and during hydration, true after: links → buttons.
  const js = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const [sel, setSel] = useState(-1);
  const stage = useRef<HTMLDivElement>(null);
  const pick = (i: number) => setSel((s) => (s === i ? -1 : i));

  // Settle once per session. A client-side navigation to home mounts the island
  // before paint, so the intro starts with the first frame. On a full page load the
  // pearls are painted before hydration: starting the intro then would make them
  // jump, so that case belongs to the pre-paint script (prePaintSource in
  // lib/site/motion.ts, change requests home-1 and home-6), which has already set
  // the key by the time this runs.
  const mountedOnClient = useRef(js);
  useLayoutEffect(() => {
    const d = document.documentElement;
    try {
      if (sessionStorage.getItem(CUP_INTRO_KEY)) return;
      sessionStorage.setItem(CUP_INTRO_KEY, "1");
      if (!mountedOnClient.current) return;
      d.setAttribute("data-cup-intro", "");
      setTimeout(() => d.removeAttribute("data-cup-intro"), 1200);
    } catch {
      // storage blocked: no intro
    }
  }, []);

  useLayoutEffect(() => {
    const st = stage.current;
    const d = document.documentElement;
    if (!st || sel < 0) return;
    const li = st.querySelectorAll<HTMLElement>(".cup-item")[sel]!;
    const btn = () => li.querySelector<HTMLElement>(".cup-lab");
    const panel = li.querySelector<HTMLElement>(".cup-panel")!;
    d.setAttribute("data-cup-open", items[sel]!.slug);
    d.style.setProperty("--cup-o", getComputedStyle(li).getPropertyValue("--dir"));
    // Narrow: reserve room below the cup. Wide: the panel sits above the label
    // stack; if a long question would reach it, tighten (smaller question, then
    // no "first read"), as C's fit() did.
    const fit = () => {
      const narrow = !matchMedia("(min-width: 80rem)").matches;
      st.style.setProperty("--cup-pad", narrow ? `${panel.offsetHeight + 24}px` : "0px");
      delete st.dataset.tight;
      if (!narrow) {
        const top = Math.min(
          ...[...st.querySelectorAll(".cup-lab")].map((e) => e.getBoundingClientRect().top),
        );
        for (const t of ["1", "2"]) {
          if (panel.getBoundingClientRect().bottom <= top - 6) break;
          st.dataset.tight = t;
        }
      }
      return narrow;
    };
    if (fit() && panel.getBoundingClientRect().bottom > innerHeight)
      panel.scrollIntoView({ block: "nearest", behavior: motionReduced() ? "auto" : "smooth" });
    // Focus goes back to the pearl's button only when it was in the cup (or
    // nowhere): Esc pressed while reading the footer must not pull the page up.
    const ownsFocus = () => {
      const a = document.activeElement;
      return !a || a === document.body || st.contains(a);
    };
    const close = (focus: boolean) => {
      setSel(-1);
      if (focus) btn()?.focus();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(ownsFocus());
    };
    // A press outside the cup closes it, but only once the browser has decided
    // what was pressed: closing gives back the room reserved for the panel, and
    // on phones that moves everything below the cup under the finger (a tap on
    // a link there would land on whatever moved up). So close on the click; a
    // touch that turns into a scroll never clicks and leaves the pearl up. iOS
    // Safari fires no click on plain text, so a touch there closes after a wait.
    let wait = 0;
    const outside = (e: Event) => !st.contains(e.target as Node);
    const click = (e: MouseEvent) => {
      clearTimeout(wait);
      if (outside(e)) close(false); // the press already moved focus where it belongs
    };
    const up = (e: PointerEvent) => {
      clearTimeout(wait);
      if (e.pointerType !== "mouse" && outside(e))
        wait = window.setTimeout(() => close(false), 400);
    };
    const cancel = () => clearTimeout(wait);
    document.addEventListener("keydown", key);
    document.addEventListener("click", click);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", cancel);
    window.addEventListener("resize", fit);
    return () => {
      clearTimeout(wait);
      document.removeEventListener("keydown", key);
      document.removeEventListener("click", click);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", cancel);
      window.removeEventListener("resize", fit);
      d.removeAttribute("data-cup-open");
      d.style.removeProperty("--cup-o");
      st.style.setProperty("--cup-pad", "0px");
      delete st.dataset.tight;
    };
  }, [sel, items]);

  return (
    <div
      ref={stage}
      className="cup-stage"
      data-js={js ? "" : undefined}
      data-sel={sel < 0 ? undefined : sel}
    >
      {children}
      <nav aria-label="Research directions">
        <ol role="list" className="cup-list">
          {items.map((it, i) => {
            const up = i === sel;
            const id = `cup-p-${it.slug}`;
            const text = <span className="cup-lab-t">{it.label}</span>;
            return (
              <li
                key={it.slug}
                className={up ? "cup-item is-up" : "cup-item"}
                data-swatch={it.swatch}
                style={it.style}
              >
                <span className="cup-ld" aria-hidden="true" />
                <span className="cup-ext" aria-hidden="true" />
                <span className="cup-sfc" aria-hidden="true" />
                {up &&
                  [0, 1, 2].map((k) => (
                    <span
                      key={k}
                      className="cup-bub"
                      style={{ "--k": k } as CSSProperties}
                      aria-hidden="true"
                    />
                  ))}
                <ViewTransition
                  name={up ? pearlVtName(it.slug) : undefined}
                  share={VT.morph}
                  default="none"
                >
                  <span
                    className="cup-pearl"
                    aria-hidden="true"
                    onClick={js ? () => pick(i) : undefined}
                  />
                </ViewTransition>
                {js ? (
                  <button
                    type="button"
                    className="cup-lab"
                    aria-expanded={up}
                    aria-controls={id}
                    onClick={() => pick(i)}
                  >
                    {text}
                  </button>
                ) : (
                  <Link href={it.href} className="cup-lab" prefetch={false}>
                    {text}
                  </Link>
                )}
                <div className="cup-panel" id={id} hidden={!up}>
                  {panels[i]}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
