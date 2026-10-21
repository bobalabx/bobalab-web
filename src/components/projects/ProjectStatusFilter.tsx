"use client";
/**
 * Optional status chip filter for /projects/ (§D6 "The client-side chip filter
 * is optional; without JS everything shows"). The server-rendered list is the
 * child; this island only toggles `hidden` on items marked `data-status` and
 * on groups marked `data-group` that end up empty. The result count is
 * announced politely (WCAG 4.1.3).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FilterChips, type ChipOption } from "@/components/ui/FilterChips";

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
  }, [selected]);

  const shown = selected.length
    ? options.filter((o) => selected.includes(o.value)).reduce((n, o) => n + (o.count ?? 0), 0)
    : total;

  return (
    <div className="pj-filter">
      <div className="pj-filter__bar">
        <FilterChips
          legend="Filter by status"
          options={options}
          selected={selected}
          onToggle={(v) =>
            setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))
          }
        />
        <p className="t-sm t-muted pj-filter__count" aria-live="polite" aria-atomic="true">
          {selected.length
            ? `Showing ${shown} of ${total} projects`
            : `${total} ${total === 1 ? "project" : "projects"}`}
        </p>
      </div>
      <div ref={root}>{children}</div>
    </div>
  );
}
