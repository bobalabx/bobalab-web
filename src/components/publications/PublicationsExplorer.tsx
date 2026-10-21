"use client";
/**
 * Publications filter island (brief §D7): MiniSearch free text, chips for
 * Direction / Type / Lab member, a year range, and the result count announced
 * through a polite live region.
 *
 * State lives in the URL (?direction=&type=&year=&member=&q=). The URL is the
 * source of truth: chips and selects write it with history.replaceState (Next
 * syncs useSearchParams), the search box writes it 250 ms after typing stops.
 * Rendered inside <Suspense> (useSearchParams in a prerendered page); the
 * fallback is the full static list, so nothing is lost without JavaScript.
 *
 * Entries are server-rendered <PublicationEntry> nodes passed in by slug, so
 * no entry markup or citation code ships to the browser.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { FilterChips } from "@/components/ui/FilterChips";
import { Icon } from "@/components/ui/icons";
import { createIndex, searchSlugs, type PubDoc } from "@/lib/publications/search";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  applyFilters,
  facetCounts,
  groupDocsByYear,
  hasFilterPanel,
  parseFilters,
  serializeFilters,
  toggleValue,
  visibleFacetKeys,
  type FacetKey,
  type Facets,
  type FilterState,
} from "@/lib/publications/filters";
import { YearGroups, YearNav, pubCount } from "./YearGroups";

const LEGENDS: Record<FacetKey, string> = {
  direction: "Research direction",
  type: "Type",
  member: "Lab member",
};

/** Write the state to the address bar without a navigation (Next keeps useSearchParams in sync). */
function writeUrl(next: FilterState) {
  const s = { ...next };
  if (s.yearFrom !== undefined && s.yearTo !== undefined && s.yearFrom > s.yearTo) {
    [s.yearFrom, s.yearTo] = [s.yearTo, s.yearFrom];
  }
  const qs = serializeFilters(s);
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

const noopSubscribe = () => () => {};

export interface PublicationsExplorerProps {
  docs: PubDoc[];
  facets: Facets;
  entries: Record<string, ReactNode>;
}

export function PublicationsExplorer({ docs, facets, entries }: PublicationsExplorerProps) {
  const searchParams = useSearchParams();
  // true once hydrated (a hook for tests and styles; the server render says false)
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const urlQuery = searchParams.toString();
  const state = useMemo(() => parseFilters(urlQuery, facets), [urlQuery, facets]);
  const index = useMemo(() => createIndex(docs), [docs]);

  // The search box is local while typing; the URL follows after a pause.
  const [query, setQuery] = useState(state.q);
  const [seenQ, setSeenQ] = useState(state.q);
  const [writtenQ, setWrittenQ] = useState(state.q);
  if (state.q !== seenQ) {
    // The URL changed. Adopt its query unless it is the one we just wrote
    // (the user may have typed further in the meantime).
    setSeenQ(state.q);
    if (state.q !== writtenQ) {
      setQuery(state.q);
      setWrittenQ(state.q);
    }
  }
  useEffect(() => {
    if (query.trim() === state.q.trim()) return;
    const t = window.setTimeout(() => {
      setWrittenQ(query.trim());
      writeUrl({ ...state, q: query.trim() });
    }, 250);
    return () => window.clearTimeout(t);
  }, [query, state]);

  const [panelOpen, setPanelOpen] = useState(false);

  const hits = useMemo(() => searchSlugs(index, state.q), [index, state.q]);
  const results = useMemo(() => applyFilters(docs, state, hits), [docs, state, hits]);
  const groups = useMemo(
    () =>
      groupDocsByYear(results).map((g) => ({ year: g.year, slugs: g.items.map((d) => d.slug) })),
    [results],
  );

  const active = activeFilterCount(state);
  const facetActive = active - (state.q.trim() ? 1 : 0);
  const visibleFacets = visibleFacetKeys(facets, state);
  const yearsAsc = [...facets.years].sort((a, b) => a - b);
  const hasYearRange = yearsAsc.length >= 2;
  const hasPanel = hasFilterPanel(facets) || visibleFacets.length > 0;

  const statusRef = useRef<HTMLParagraphElement>(null);
  const clearAll = () => {
    setQuery("");
    setWrittenQ("");
    writeUrl(EMPTY_FILTERS);
    // The button disappears with the filters; keep keyboard focus where it was
    // (the result count beside it) instead of dropping it to <body> (WCAG 2.4.3).
    statusRef.current?.focus();
  };
  const setYear = (which: "yearFrom" | "yearTo", value: string) =>
    writeUrl({ ...state, q: query.trim(), [which]: value ? Number(value) : undefined });

  return (
    <div className="pubs-layout" data-hydrated={hydrated ? "" : undefined}>
      <div className="pubs-aside">
        <YearNav groups={groups} />
        <section className="pubs-filters" aria-labelledby="pubs-filters-h">
          <h2 id="pubs-filters-h" className="pubs-filters__h">
            Search and filter
          </h2>
          <div role="search" className="pubs-search">
            <label htmlFor="pubs-q" className="pubs-label">
              Search publications
            </label>
            <div className="pubs-search__field">
              <Icon name="search" className="pubs-search__icon" />
              <input
                id="pubs-q"
                type="search"
                className="pubs-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
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
                aria-expanded={panelOpen}
                aria-controls="pubs-panel"
                onClick={() => setPanelOpen((o) => !o)}
              >
                <Icon name="filter" />
                <span>
                  Filters
                  {facetActive > 0 && <span className="pubs-toggle__n"> · {facetActive} on</span>}
                </span>
                <Icon name="chevron" className="pubs-toggle__chev" />
              </button>
              <div id="pubs-panel" className="pubs-panel" data-open={panelOpen ? "true" : "false"}>
                {visibleFacets.map((key) => {
                  const counts = facetCounts(docs, state, hits, key);
                  return (
                    <FilterChips
                      key={key}
                      legend={LEGENDS[key]}
                      options={facets[key].map((o) => ({
                        value: o.value,
                        label: o.label,
                        count: counts.get(o.value) ?? 0,
                      }))}
                      selected={state[key]}
                      onToggle={(v) => writeUrl({ ...toggleValue(state, key, v), q: query.trim() })}
                    />
                  );
                })}
                {hasYearRange && (
                  <fieldset className="pubs-range">
                    <legend className="bl-chips__legend">Years</legend>
                    <div className="pubs-range__row">
                      <div className="pubs-range__field">
                        <label htmlFor="pubs-year-from" className="pubs-range__label">
                          From
                        </label>
                        <select
                          id="pubs-year-from"
                          className="pubs-select"
                          value={state.yearFrom ?? ""}
                          onChange={(e) => setYear("yearFrom", e.target.value)}
                        >
                          <option value="">Any year</option>
                          {yearsAsc.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="pubs-range__field">
                        <label htmlFor="pubs-year-to" className="pubs-range__label">
                          To
                        </label>
                        <select
                          id="pubs-year-to"
                          className="pubs-select"
                          value={state.yearTo ?? ""}
                          onChange={(e) => setYear("yearTo", e.target.value)}
                        >
                          <option value="">Any year</option>
                          {yearsAsc.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </fieldset>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <div className="pubs-results">
        <div className="pubs-bar">
          <p
            ref={statusRef}
            tabIndex={-1}
            className="pubs-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {active > 0
              ? `Showing ${results.length} of ${pubCount(docs.length)}`
              : pubCount(docs.length)}
          </p>
          {active > 0 && (
            <button type="button" className="pubs-clear" onClick={clearAll}>
              <Icon name="close" />
              Clear all filters
            </button>
          )}
        </div>
        {results.length > 0 ? (
          <YearGroups groups={groups} entries={entries} />
        ) : (
          <div className="pubs-empty">
            <p className="pubs-empty__title">No publications match these filters.</p>
            <p className="t-sm t-muted">Try fewer filters or a shorter search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
