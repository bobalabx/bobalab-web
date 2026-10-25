/**
 * The search and filter block of /publications/ (brief §D7; D-13 item 5; P3
 * `publications.html` `.filters`). One row per control in the label-column
 * grid: the plain label ("Search", "Type", "Direction", "Lab member", "Years")
 * in the 18rem column, the control in the track. Toggles are real
 * `<button aria-pressed>` styled as text (pressed = ink with a 3 px underline);
 * direction toggles carry their 16 px line segment.
 *
 * Presentational and hook-free, so the same markup serves two places:
 *   - the client island (PublicationsExplorer) passes state and handlers;
 *   - the server fallback (PublicationsStatic) renders it `pending`: inert,
 *     aria-hidden, every control disabled and out of the tab order. It keeps
 *     the island's exact geometry (no layout shift when the island takes
 *     over), and a <noscript> style hides it when scripting is off, so no
 *     visitor ever meets a dead control.
 * Below 48rem everything but the search box sits behind a "Filters" disclosure.
 */
import type { FacetKey, Facets, FilterState } from "@/lib/publications/filters";

export const NOSCRIPT_CSS = ".pubs-filters--pending{display:none!important}";

const LABELS: Record<FacetKey, string> = {
  type: "Type",
  direction: "Direction",
  member: "Lab member",
};
/** Row order follows P3: search, type, direction, then lab member. */
const ORDER: FacetKey[] = ["type", "direction", "member"];

export interface FilterBlockProps {
  facets: Facets;
  /** Facets offered as toggles (see visibleFacetKeys). */
  visible: FacetKey[];
  /** Per-option counts for each visible facet. */
  counts: Partial<Record<FacetKey, Map<string, number>>>;
  state: FilterState;
  query: string;
  /** Phone disclosure state (the panel is always open from 48rem). */
  panelOpen: boolean;
  /** Toggles plus a year range: whether there is a panel at all. */
  hasPanel: boolean;
  pending?: boolean;
  onQuery?: (value: string) => void;
  onToggle?: (key: FacetKey, value: string) => void;
  onYear?: (which: "yearFrom" | "yearTo", value: string) => void;
  onPanel?: () => void;
}

export function FilterBlock({
  facets,
  visible,
  counts,
  state,
  query,
  panelOpen,
  hasPanel,
  pending = false,
  onQuery,
  onToggle,
  onYear,
  onPanel,
}: FilterBlockProps) {
  const id = (s: string) => (pending ? undefined : s);
  const facetActive =
    state.direction.length +
    state.type.length +
    state.member.length +
    (state.yearFrom !== undefined || state.yearTo !== undefined ? 1 : 0);
  const yearsAsc = [...facets.years].sort((a, b) => a - b);
  const hasYearRange = yearsAsc.length >= 2;
  const keys = ORDER.filter((k) => visible.includes(k));
  const off = pending ? { disabled: true, tabIndex: -1 } : {};

  return (
    <section
      className={pending ? "pubs-filters pubs-filters--pending" : "pubs-filters"}
      aria-labelledby={id("pubs-filters-h")}
      aria-hidden={pending || undefined}
      inert={pending || undefined}
    >
      {pending ? (
        <noscript>
          <style>{NOSCRIPT_CSS}</style>
        </noscript>
      ) : (
        <h2 id="pubs-filters-h" className="vh">
          Search and filter
        </h2>
      )}

      <div className="pubs-frow pubs-frow--search" role={pending ? undefined : "search"}>
        <label htmlFor={id("pubs-q")} className="pubs-fl">
          Search<span className="vh"> publications</span>
        </label>
        <div className="pubs-search">
          <input
            id={id("pubs-q")}
            type="search"
            className="pubs-input"
            value={query}
            onChange={onQuery ? (e) => onQuery(e.target.value) : undefined}
            onKeyDown={
              pending
                ? undefined
                : (e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }
            }
            readOnly={pending}
            tabIndex={pending ? -1 : undefined}
            placeholder="Title, author or topic"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            maxLength={200}
          />
        </div>
      </div>

      {hasPanel && (
        <>
          <button
            type="button"
            className="pubs-toggle"
            aria-expanded={pending ? undefined : panelOpen}
            aria-controls={id("pubs-panel")}
            onClick={onPanel}
            {...off}
          >
            Filters
            {facetActive > 0 && <span className="pubs-toggle__n">, {facetActive} on</span>}
          </button>
          <div
            id={id("pubs-panel")}
            className="pubs-panel"
            data-open={panelOpen ? "true" : "false"}
          >
            {keys.map((key) => {
              const c = counts[key];
              const labelId = id(`pubs-fl-${key}`);
              return (
                <div key={key} className="pubs-frow">
                  <span className="pubs-fl" id={labelId}>
                    {LABELS[key]}
                  </span>
                  <div
                    className="bl-chips__row pubs-toggles"
                    role={pending ? undefined : "group"}
                    aria-labelledby={labelId}
                  >
                    {facets[key].map((o) => {
                      const on = state[key].includes(o.value);
                      const n = c?.get(o.value) ?? 0;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          className="bl-chip pubs-chip"
                          aria-pressed={on}
                          onClick={onToggle ? () => onToggle(key, o.value) : undefined}
                          {...off}
                        >
                          {o.swatch && (
                            <span className="bl-seg" data-swatch={o.swatch} aria-hidden="true" />
                          )}
                          <span className="bl-chip__label">{o.label}</span>
                          <span className="bl-chip__count">
                            <span className="vh">, </span>
                            {n}
                            <span className="vh">{n === 1 ? " item" : " items"}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {hasYearRange && (
              <div
                className="pubs-frow"
                role={pending ? undefined : "group"}
                aria-labelledby={id("pubs-fl-year")}
              >
                <span className="pubs-fl" id={id("pubs-fl-year")}>
                  Years
                </span>
                <div className="pubs-range">
                  {(["yearFrom", "yearTo"] as const).map((which) => {
                    const fid = which === "yearFrom" ? "pubs-year-from" : "pubs-year-to";
                    return (
                      <span key={which} className="pubs-range__field">
                        <label htmlFor={id(fid)} className="pubs-range__label">
                          {which === "yearFrom" ? "From" : "To"}
                        </label>
                        <select
                          id={id(fid)}
                          className="pubs-select"
                          value={state[which] ?? ""}
                          onChange={onYear ? (e) => onYear(which, e.target.value) : undefined}
                          {...off}
                        >
                          <option value="">any year</option>
                          {yearsAsc.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
