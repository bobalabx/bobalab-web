/**
 * The full publication list, grouped by year, with year jump links: what the
 * page shows without JavaScript and the <Suspense> fallback of the filter
 * island (brief §D7). Same layout as the island, so nothing moves when the
 * island takes over.
 *
 * The static export ships this fallback in the HTML; with JavaScript the
 * island replaces it after hydration. The search and filter block sits ABOVE
 * the list at every width, so the fallback draws the island's block as an
 * inert, aria-hidden stand-in of the same size (FilterBlock `pending`);
 * without JavaScript a <noscript> style hides it (no dead controls).
 */
import type { ReactNode } from "react";
import { EMPTY_FILTERS, type FacetKey, type Facets } from "@/lib/publications/filters";
import { FilterBlock } from "./FilterBlock";
import { YearGroups, YearNav, pubCount, type YearGroup } from "./YearGroups";

export function PublicationsStatic({
  groups,
  entries,
  total,
  facets,
  visible = [],
  counts = {},
  hasPanel = false,
}: {
  groups: YearGroup[];
  entries: Record<string, ReactNode>;
  total: number;
  /** The island's facets: when given, the stand-in filter block is drawn. */
  facets?: Facets;
  visible?: FacetKey[];
  counts?: Partial<Record<FacetKey, Map<string, number>>>;
  /** The island will show a filter panel (see hasFilterPanel in lib/publications/filters). */
  hasPanel?: boolean;
}) {
  return (
    <div className="pubs-layout">
      {facets && (
        <FilterBlock
          facets={facets}
          visible={visible}
          counts={counts}
          state={EMPTY_FILTERS}
          query=""
          panelOpen={false}
          hasPanel={hasPanel}
          pending
        />
      )}
      <div className="pubs-results">
        <div className="pubs-bar">
          <div className="pubs-bar__status">
            <p className="pubs-status">{pubCount(total)}</p>
          </div>
          <YearNav groups={groups} />
        </div>
        <YearGroups groups={groups} entries={entries} />
      </div>
    </div>
  );
}
