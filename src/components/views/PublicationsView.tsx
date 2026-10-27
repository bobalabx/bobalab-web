/**
 * The /publications/ page body, shared by the static route and the editor live
 * preview (src/app/editor-preview). Synchronous and pure: everything comes from
 * Content.
 */
import { Suspense } from "react";
import type { Content } from "@/lib/content/build";
import { buildIndexData } from "@/lib/publications/index-data";
import {
  EMPTY_FILTERS,
  facetCounts,
  groupDocsByYear,
  hasFilterPanel,
  visibleFacetKeys,
  type FacetKey,
} from "@/lib/publications/filters";
import { PublicationRow } from "@/components/publications/PublicationRow";
import { PublicationsExplorer } from "@/components/publications/PublicationsExplorer";
import { PublicationsStatic } from "@/components/publications/PublicationsStatic";
import { WorkInProgress } from "@/components/publications/WorkInProgress";
import "@/components/publications/publications.css";

export function PublicationsView({ c }: { c: Content }) {
  const pubs = c.countedPublications;
  const { docs, facets } = buildIndexData(c, pubs);
  const entries = Object.fromEntries(
    pubs.map((p) => [p.slug, <PublicationRow key={p.slug} pub={p} as="h3" />]),
  );
  const groups = groupDocsByYear(docs).map((g) => ({
    year: g.year,
    slugs: g.items.map((d) => d.slug),
  }));
  const visible = visibleFacetKeys(facets);
  const counts: Partial<Record<FacetKey, Map<string, number>>> = {};
  for (const key of visible) counts[key] = facetCounts(docs, EMPTY_FILTERS, null, key);

  return (
    <div className="bl-container pubs">
      <header className="pubs-head">
        <div className="pubs-head__track">
          <h1 tabIndex={-1}>Publications</h1>
          {pubs.length === 0 && (
            <p className="pubs-head__lead">There are no publications to show yet.</p>
          )}
        </div>
      </header>

      {pubs.length > 0 && (
        <Suspense
          fallback={
            <PublicationsStatic
              groups={groups}
              entries={entries}
              total={pubs.length}
              facets={facets}
              visible={visible}
              counts={counts}
              hasPanel={hasFilterPanel(facets)}
            />
          }
        >
          <PublicationsExplorer docs={docs} facets={facets} entries={entries} />
        </Suspense>
      )}

      <WorkInProgress items={c.inProgress} />
    </div>
  );
}
