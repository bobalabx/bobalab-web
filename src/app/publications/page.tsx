/**
 * /publications/ (brief §D7, DECISIONS D-05; redesign D-13, prototype
 * docs/redesign/prototypes/p3/publications.html).
 *
 * Server-rendered: the full list of counted publications as one ruled ledger
 * grouped by year (the year rail sits in the label column), with year jump
 * links. A client island inside <Suspense> adds search, type / direction /
 * member toggles and a year range with the state in the URL; its fallback is
 * the same full list, which is what the static export ships in the HTML. Work
 * in progress sits in a collapsed section below and is never mixed into the
 * main list. One provenance footnote replaces the per-row hedges (D-13 item 7).
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { pageMetadata } from "@/lib/seo/metadata";
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
import { isSelfReportedStatus } from "@/components/publications/PaperParts";
import "@/components/publications/publications.css";

export function generateMetadata(): Metadata {
  const { site } = getContent();
  return pageMetadata({
    title: "Publications",
    description: `Papers and working papers from ${site.name}, the ${site.long_name}: search and filter by research direction, type, lab member and year.`,
    path: "/publications/",
  });
}

/** "17 publications and 8 works in progress, newest first." */
function lead(n: number, wip: number): string {
  const pubs = `${n} ${n === 1 ? "publication" : "publications"}`;
  if (!wip) return `${pubs}, newest first.`;
  return `${pubs} and ${wip} ${wip === 1 ? "work" : "works"} in progress, newest first.`;
}

export default function PublicationsPage() {
  const c = getContent();
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
  // One footnote for the page, only when a shown status is the lab's own report.
  const needsNote = [...pubs, ...c.inProgress].some(isSelfReportedStatus);

  return (
    <div className="bl-container pubs">
      <header className="pubs-head">
        <div className="pubs-head__track">
          <h1 tabIndex={-1}>Publications</h1>
          <p className="pubs-head__lead">
            {pubs.length > 0
              ? lead(pubs.length, c.inProgress.length)
              : "There are no publications to show yet."}
          </p>
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

      {needsNote && (
        <p className="pubs-fn">
          Review statuses are as reported by the lab, dated by when each was last checked.
        </p>
      )}
    </div>
  );
}
