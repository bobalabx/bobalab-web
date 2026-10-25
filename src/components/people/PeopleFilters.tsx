"use client";
/**
 * People filter island (brief §D9, §G1 2.1.1): role and direction chips as real
 * <button aria-pressed> (WP0 FilterChips), a polite live status line and a
 * "Clear filters" button.
 *
 * The server renders the FULL list; this island only hides non-matching
 * people and empty groups through the `hidden` attribute, so everything is
 * visible without JavaScript. The bar itself is hidden for no-JS visitors by
 * a <noscript> style in the server component (no layout shift with JS).
 */
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { FilterChips, type ChipOption } from "@/components/ui/FilterChips";
import {
  EMPTY_FILTER,
  isFiltering,
  matches,
  statusText,
  toggle,
  type FilterMeta,
  type FilterState,
} from "./filter";

const FilterContext = createContext<FilterState>(EMPTY_FILTER);

export interface PeopleFiltersProps {
  roleOptions: ChipOption[];
  directionOptions: ChipOption[];
  /** Every person in the list (for the status line). */
  all: FilterMeta[];
  children: ReactNode;
}

export function PeopleFilters({
  roleOptions,
  directionOptions,
  all,
  children,
}: PeopleFiltersProps) {
  const [state, setState] = useState<FilterState>(EMPTY_FILTER);
  const bar = useRef<HTMLDivElement>(null);
  const active = isFiltering(state);
  const apply = (next: FilterState) => {
    setState(next);
    // If only alumni match, reveal them (the Alumni <details> is collapsed by default).
    const hits = all.filter((m) => matches(m, next));
    if (isFiltering(next) && hits.length && hits.every((m) => m.alumni)) {
      const details = document.querySelector<HTMLDetailsElement>(".pp-alumni__details");
      if (details) details.open = true;
    }
  };
  const clear = () => {
    setState(EMPTY_FILTER);
    // The Clear button disappears; keep focus inside the filter bar.
    bar.current?.querySelector<HTMLButtonElement>("button[aria-pressed]")?.focus();
  };
  return (
    <FilterContext value={state}>
      <section className="pp-filters" aria-labelledby="pp-filters-h">
        <h2 id="pp-filters-h" className="vh">
          Filter people
        </h2>
        <div className="pp-filters__bar" ref={bar}>
          {roleOptions.length > 1 && (
            <FilterChips
              legend="Role"
              options={roleOptions}
              selected={state.roles}
              onToggle={(v) => apply(toggle(state, "roles", v))}
            />
          )}
          {directionOptions.length > 0 && (
            <FilterChips
              legend="Research direction"
              options={directionOptions}
              selected={state.directions}
              onToggle={(v) => apply(toggle(state, "directions", v))}
            />
          )}
        </div>
        <div className="pp-filters__foot">
          <p className="pp-filters__status" role="status" aria-live="polite">
            {statusText(all, state)}
          </p>
          {active && (
            <button type="button" className="pp-textbtn" onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
      </section>
      {children}
    </FilterContext>
  );
}

/** A list item that hides itself when it does not match the current filters. */
export function FilterItem({
  meta,
  className,
  children,
}: {
  meta: FilterMeta;
  className?: string;
  children: ReactNode;
}) {
  const state = useContext(FilterContext);
  return (
    <li className={className} hidden={!matches(meta, state)}>
      {children}
    </li>
  );
}

/** A section (or div) that hides itself when none of its members match. */
export function FilterGroup({
  metas,
  as: Tag = "section",
  role,
  className,
  labelledBy,
  children,
}: {
  metas: FilterMeta[];
  as?: "section" | "div";
  /** A labelled <div> needs a role (aria-labelledby is prohibited on a generic div). */
  role?: "group";
  className?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  const state = useContext(FilterContext);
  const visible = metas.some((m) => matches(m, state));
  return (
    <Tag className={className} role={role} aria-labelledby={labelledBy} hidden={!visible}>
      {children}
    </Tag>
  );
}
