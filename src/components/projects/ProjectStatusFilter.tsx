"use client";
/**
 * Optional status filter for /projects/ (§D6 "The client-side chip filter
 * is optional; without JS everything shows"); D-13 text toggles. The server-rendered list is the
 * child; this island only toggles `hidden` on items marked `data-status` and
 * on groups marked `data-group` that end up empty. The result count is
 * announced politely (WCAG 4.1.3).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FilterChips, type ChipOption } from "@/components/ui/FilterChips";
import { motionReduced } from "@/lib/site/motion";

export function ProjectStatusFilter({
  options,
  total,
  children,
}: {
  options: ChipOption[];
  total: number;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const root = useRef<HTMLDivElement>(null);
  /** The selection last applied to the DOM (null before the first run). */
  const applied = useRef<string | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const on = (s: string | null) => !selected.length || (s !== null && selected.includes(s));
    el.querySelectorAll<HTMLElement>("[data-status]").forEach((item) => {
      item.hidden = !on(item.getAttribute("data-status"));
    });
    el.querySelectorAll<HTMLElement>("[data-group]").forEach((g) => {
      g.hidden = !g.querySelector("[data-status]:not([hidden])");
    });
    // Results steep in (opacity only, finite; nothing under reduced motion),
    // only when the selection really changed: a re-run with the same selection
    // (React's StrictMode double effect in development, a remount) must not
    // fade the whole list, or every row is mid-fade when it is first read.
    const key = selected.join("|");
    if (applied.current !== null && applied.current !== key && !motionReduced()) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: "ease-out" });
    }
    applied.current = key;
  }, [selected]);

  const shown = selected.length
    ? options.filter((o) => selected.includes(o.value)).reduce((n, o) => n + (o.count ?? 0), 0)
    : total;

  return (
    <div className="pj-filter">
      <div className="pj-filter__bar">
        <p className="pj-filter__count" aria-live="polite" aria-atomic="true">
          {selected.length
            ? `Showing ${shown} of ${total} projects`
            : `${total} ${total === 1 ? "project" : "projects"}`}
        </p>
        <FilterChips
          legend="Filter by status"
          options={options}
          selected={selected}
          onToggle={(v) =>
            setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))
          }
        />
      </div>
      <div ref={root}>{children}</div>
    </div>
  );
}
