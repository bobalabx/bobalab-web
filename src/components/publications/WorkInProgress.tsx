/**
 * Work in progress on /publications/ (DECISIONS D-05): items without a public
 * version or a documented presentation never enter the main list; they sit
 * here, collapsed, in the label-column grid (D-13). Hidden when there are none.
 */
import type { PublicationView } from "@/lib/content/load";
import { PublicationRow } from "./PublicationRow";

export function WorkInProgress({ items }: { items: PublicationView[] }) {
  if (!items.length) return null;
  const n = items.length;
  return (
    <section className="pubs-wip" aria-labelledby="pubs-wip-h">
      <div className="pubs-wip__label">
        <h2 id="pubs-wip-h" className="pubs-wip__h">
          Work in progress
        </h2>
      </div>
      <div className="pubs-wip__track">
        <p className="pubs-wip__note">Papers with no public draft yet.</p>
        <details className="pubs-wip__details">
          <summary className="pubs-wip__summary">
            Show {n} {n === 1 ? "work" : "works"} in progress
          </summary>
          <ul className="pubs-list" role="list">
            {items.map((p) => (
              <li key={p.slug}>
                <PublicationRow pub={p} as="h3" showYear />
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
