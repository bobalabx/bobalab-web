"use client";
/**
 * Fig. 1 client island (DECISIONS D-13 item 6: linked highlighting). The figure
 * draws without it; this only links the parts on pointer and keyboard focus:
 *   - a direction (lane label, its pearl, or the lede's direction word) lights its
 *     line and the papers it shares; every other line dims to 0.3 (pearls never dim);
 *   - a paper (a dot, or its row in "Recent publications") lights its dots and its
 *     ledger row; a ring names one piece of work in progress;
 *   - the figcaption's live layer names what is lit (aria-live="off": nothing is
 *     announced; the links and rows carry the same text);
 *   - Esc, leaving, or blurring resets. Touch and the strip layout are left alone.
 * Clicking a pearl follows its lane's link. Sets data-live on the plate once wired.
 */
import { useEffect, useRef } from "react";

function wire(plate: HTMLElement): () => void {
  const D = document;
  const off: Array<() => void> = [];
  const on = (el: EventTarget, type: string, fn: (e: Event) => void) => {
    el.addEventListener(type, fn);
    off.push(() => el.removeEventListener(type, fn));
  };
  const all = (sel: string, root: ParentNode = plate) => [
    ...root.querySelectorAll<HTMLElement>(sel),
  ];
  const caps = new Map(all("[data-cap]").map((c) => [c.dataset.cap!, c]));
  const legend = caps.get("legend")!;
  const marks = all("[data-ds]");
  const fig = () => getComputedStyle(plate).getPropertyValue("--f1-mode").trim() === "fig";
  let shown = legend;
  let lit: HTMLElement[] = [];
  let timer = 0;

  const show = (key: string) => {
    const c = caps.get(key) ?? legend;
    if (c === shown) return;
    if (shown !== legend) shown.hidden = true;
    c.hidden = false;
    shown = c;
    plate.toggleAttribute("data-live-cap", c !== legend);
  };
  const reset = () => {
    clearTimeout(timer);
    marks.forEach((m) => m.classList.remove("dim", "big"));
    lit.forEach((e) => e.classList.remove("is-on", "is-hl"));
    lit = [];
    delete plate.dataset.active;
    show("legend");
  };
  const light = (els: HTMLElement[], cls: string) => {
    els.forEach((e) => e.classList.add(cls));
    lit.push(...els);
  };
  const dim = (f: (m: HTMLElement) => boolean) =>
    marks.forEach((m) => m.classList.toggle("dim", f(m)));
  const has = (m: HTMLElement, d: string) => m.dataset.ds!.split(" ").includes(d);

  const lane = (d: string) => {
    reset();
    dim((m) => !has(m, d));
    light([...all(`.f1-item[data-slug="${d}"]`), ...all(`[data-dir="${d}"]`, D)], "is-on");
    plate.dataset.active = d;
    show(`d:${d}`);
  };
  const paper = (s: string) => {
    const dots = all(`.f1-dot[data-s="${s}"]`);
    if (!dots.length) return;
    reset();
    const ds = dots[0]!.dataset.ds!.split(" ");
    dim((m) => (m.dataset.s ? m.dataset.s !== s : m.dataset.w ? true : !ds.some((d) => has(m, d))));
    dots.forEach((e) => e.classList.add("big"));
    light(all(`[data-f1-row="${s}"]`, D), "is-hl");
    plate.dataset.active = s;
    show(`p:${s}`);
  };
  const wip = (w: string) => {
    reset();
    dim((m) => m.dataset.w !== w);
    plate.dataset.active = w;
    show(`w:${w}`);
  };
  const leave = () => {
    clearTimeout(timer);
    timer = window.setTimeout(reset, 120);
  };
  const ok = (e: Event) => (e as PointerEvent).pointerType !== "touch" && fig();
  const laneOf = (el: Element | null) => el?.closest<HTMLElement>(".f1-item")?.dataset.slug;

  // Inside the plate: lanes (label or pearl), dots and rings.
  on(plate, "pointerover", (e) => {
    if (!ok(e)) return;
    const t = e.target as HTMLElement;
    clearTimeout(timer);
    if (t.dataset.s && t.classList.contains("f1-dot")) paper(t.dataset.s);
    else if (t.dataset.w) wip(t.dataset.w);
    else if (t.closest(".f1-lab, .f1-pearl-at")) lane(laneOf(t)!);
  });
  on(plate, "pointerout", (e) => {
    if (ok(e)) leave();
  });
  on(plate, "focusin", (e) => {
    const d = laneOf(e.target as Element);
    if (d && fig()) lane(d);
  });
  on(plate, "focusout", leave);
  on(plate, "click", (e) => {
    const p = (e.target as Element).closest(".f1-pearl-at");
    p?.closest(".f1-item")?.querySelector<HTMLAnchorElement>(".f1-link")?.click();
  });

  // Outside the plate: the lede's direction words and the publication rows.
  const bind = (el: HTMLElement, go: () => void) => {
    const enter = (e: Event) => {
      if (e.type === "focusin" ? fig() : ok(e)) {
        clearTimeout(timer);
        go();
      }
    };
    on(el, "pointerenter", enter);
    on(el, "focusin", enter);
    on(el, "pointerleave", leave);
    on(el, "focusout", leave);
  };
  all("[data-dir]", D).forEach((a) => bind(a, () => lane(a.dataset.dir!)));
  all("[data-f1-row]", D).forEach((r) => bind(r, () => paper(r.dataset.f1Row!)));
  on(D, "keydown", (e) => {
    if ((e as KeyboardEvent).key === "Escape" && plate.dataset.active) reset();
  });

  plate.dataset.live = "";
  return () => {
    off.forEach((f) => f());
    clearTimeout(timer);
    reset();
    delete plate.dataset.live;
  };
}

export function FigureIsland() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const plate = ref.current?.closest<HTMLElement>(".f1-plate");
    return plate ? wire(plate) : undefined;
  }, []);
  return <i ref={ref} hidden />;
}
