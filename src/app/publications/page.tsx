/**
 * /publications/ (brief §D7, DECISIONS D-05).
 *
 * Server-rendered: the full list of counted publications grouped by year with
 * year jump links. A client island inside <Suspense> adds search, chips and a
 * year range with the state in the URL; its fallback is the same full list,
 * which is what the static export ships in the HTML. Work in progress sits in
 * a collapsed section below and is never mixed into the main list.
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { pageMetadata } from "@/lib/seo/metadata";
import { buildIndexData } from "@/lib/publications/index-data";
import { groupDocsByYear, hasFilterPanel } from "@/lib/publications/filters";
import { PublicationEntry } from "@/components/ui/PublicationEntry";
import { PublicationsExplorer } from "@/components/publications/PublicationsExplorer";
import { PublicationsStatic } from "@/components/publications/PublicationsStatic";
import { WorkInProgress } from "@/components/publications/WorkInProgress";
import "@/components/publications/publications.css";

export function generateMetadata(): Metadata {
  const { site } = getContent();
  return pageMetadata({
    title: "Publications",
    description: `Papers and working papers from ${site.name}, the ${site.long_name}: search and filter by research direction, type, lab member and year.`,
    path: "/publications/",
  });
}

export default function PublicationsPage() {
  const c = getContent();
  const pubs = c.countedPublications;
  const { docs, facets } = buildIndexData(c, pubs);
  const entries = Object.fromEntries(
    pubs.map((p) => [p.slug, <PublicationEntry key={p.slug} pub={p} as="h3" />]),
  );
  const groups = groupDocsByYear(docs).map((g) => ({
    year: g.year,
    slugs: g.items.map((d) => d.slug),
  }));
  const hasSelfReported = pubs.some(
    (p) => p.status !== "published" && p.status_source === "self-reported",
  );

  return (
    <div className="bl-container pubs">
      <header className="pubs-head">
        <h1 tabIndex={-1}>Publications</h1>
        {/* The count lives in the results bar (and its live region), not here as well. */}
        {pubs.length > 0 ? (
          <p className="pubs-head__lead">
            Newest first, grouped by year.
            {hasSelfReported &&
              " Review statuses marked “reported by the lab” are the lab’s own account, dated as of the last check."}
          </p>
        ) : (
          <p className="pubs-head__lead">There are no publications to show yet.</p>
        )}
      </header>

      {pubs.length > 0 && (
        <Suspense
          fallback={
            <PublicationsStatic
              groups={groups}
              entries={entries}
              total={pubs.length}
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
