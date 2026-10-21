/**
 * The full publication list, grouped by year, with year jump links: what the
 * page shows without JavaScript and the <Suspense> fallback of the filter
 * island (brief §D7). Same layout as the island, so nothing jumps sideways
 * when the island takes over.
 *
 * The static export ships this fallback in the HTML; with JavaScript the
 * island replaces it after hydration. Below 64rem the island's search box and
 * "Filters" button sit ABOVE the list, so swapping them in would push the
 * whole list down (~200 px: a layout shift over the §G2 CLS budget). The
 * fallback therefore draws an inert, aria-hidden stand-in of the same size.
 * Without JavaScript it would be a dead control, so a <noscript> style hides
 * it (the same pattern as the People filters).
 */
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { YearGroups, YearNav, pubCount, type YearGroup } from "./YearGroups";

const NOSCRIPT_CSS = ".pubs-filters--pending{display:none!important}";

/**
 * Visual stand-in for the island's "Search and filter" block (same classes and
 * box sizes as PublicationsExplorer; keep the two in step). Not interactive:
 * `inert`, `aria-hidden`, and the input is read-only and out of the tab order.
 */
function FiltersPending({ hasPanel }: { hasPanel: boolean }) {
  return (
    <div className="pubs-filters pubs-filters--pending" aria-hidden="true" inert>
      {/* Inside the stand-in, so it adds no grid row of its own when scripting is off. */}
      <noscript>
        <style>{NOSCRIPT_CSS}</style>
      </noscript>
      <p className="pubs-filters__h">Search and filter</p>
      <div className="pubs-search">
        <span className="pubs-label">Search publications</span>
        <div className="pubs-search__field">
          <Icon name="search" className="pubs-search__icon" />
          <input
            type="search"
            className="pubs-input"
            placeholder="Title, author or topic"
            readOnly
            tabIndex={-1}
          />
        </div>
      </div>
      {hasPanel && (
        <span className="pubs-toggle">
          <Icon name="filter" />
          <span>Filters</span>
          <Icon name="chevron" className="pubs-toggle__chev" />
        </span>
      )}
    </div>
  );
}

export function PublicationsStatic({
  groups,
  entries,
  total,
  hasPanel = false,
}: {
  groups: YearGroup[];
  entries: Record<string, ReactNode>;
  total: number;
  /** The island will show a "Filters" panel (see hasFilterPanel in lib/publications/filters). */
  hasPanel?: boolean;
}) {
  return (
    <div className="pubs-layout">
      <div className="pubs-aside">
        <YearNav groups={groups} />
        <FiltersPending hasPanel={hasPanel} />
      </div>
      <div className="pubs-results">
        <div className="pubs-bar">
          <p className="pubs-status">{pubCount(total)}</p>
        </div>
        <YearGroups groups={groups} entries={entries} />
      </div>
    </div>
  );
}
