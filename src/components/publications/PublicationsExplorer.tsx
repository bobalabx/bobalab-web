"use client";
/**
 * Publications filter island (brief §D7; D-13 "Lines"): MiniSearch free text,
 * text toggles for Type / Direction / Lab member, a year range, and the result
 * count announced through a polite live region.
 *
 * State lives in the URL (?direction=&type=&year=&member=&q=). The URL is the
 * source of truth: toggles and selects write it with history.replaceState (Next
 * syncs useSearchParams), the search box writes it 250 ms after typing stops.
 * Rendered inside <Suspense> (useSearchParams in a prerendered page); the
 * fallback is the full static list, so nothing is lost without JavaScript.
 *
 * Rows are server-rendered nodes passed in by slug, so no row markup or
 * citation code ships to the browser.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
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
import { FilterBlock } from "./FilterBlock";
import { YearGroups, YearNav, pubCount } from "./YearGroups";

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
  // The query the page opened with: results steep in only after the reader changes them.
  const [initialQuery] = useState(urlQuery);
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
  const visible = visibleFacetKeys(facets, state);
  const counts = useMemo(() => {
    const out: Partial<Record<FacetKey, Map<string, number>>> = {};
    for (const key of visible) out[key] = facetCounts(docs, state, hits, key);
    return out;
  }, [docs, state, hits, visible]);
  const hasPanel = hasFilterPanel(facets) || visible.length > 0;

  const statusRef = useRef<HTMLParagraphElement>(null);
  const clearAll = () => {
    setQuery("");
    setWrittenQ("");
    writeUrl(EMPTY_FILTERS);
    // The button disappears with the filters; keep keyboard focus where it was
    // (the result count beside it) instead of dropping it to <body> (WCAG 2.4.3).
    statusRef.current?.focus();
  };

  return (
    <div className="pubs-layout" data-hydrated={hydrated ? "" : undefined}>
      <FilterBlock
        facets={facets}
        visible={visible}
        counts={counts}
        state={state}
        query={query}
        panelOpen={panelOpen}
        hasPanel={hasPanel}
        onQuery={setQuery}
        onToggle={(key, v) => writeUrl({ ...toggleValue(state, key, v), q: query.trim() })}
        onYear={(which, value) =>
          writeUrl({ ...state, q: query.trim(), [which]: value ? Number(value) : undefined })
        }
        onPanel={() => setPanelOpen((o) => !o)}
      />

      <div className="pubs-results">
        <div className="pubs-bar">
          <div className="pubs-bar__status">
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
                Clear all filters
              </button>
            )}
          </div>
          <YearNav groups={groups} />
        </div>
        {results.length > 0 ? (
          <YearGroups
            key={urlQuery}
            groups={groups}
            entries={entries}
            steep={urlQuery !== initialQuery}
          />
        ) : (
          <div className="pubs-empty">
            <p className="pubs-empty__title">No publications match these filters.</p>
            <p className="pubs-empty__hint">Try fewer filters or a shorter search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
