/**
 * Work in progress on /publications/ (DECISIONS D-05): items without a public
 * version or a documented presentation never enter the main list; they sit
 * here, collapsed. Hidden when there are none.
 */
import type { PublicationView } from "@/lib/content/load";
import { PublicationEntry } from "@/components/ui/PublicationEntry";

export function WorkInProgress({ items }: { items: PublicationView[] }) {
  if (!items.length) return null;
  const n = items.length;
  return (
    <section className="pubs-wip" aria-labelledby="pubs-wip-h">
      <h2 id="pubs-wip-h" className="pubs-wip__h">
        Work in progress
      </h2>
      <p className="pubs-wip__note">
        Papers with no public version or documented presentation yet, so they are not part of the
        list above.
      </p>
      <details className="pubs-wip__details">
        <summary className="pubs-wip__summary">
          <span>
            Show {n} {n === 1 ? "item" : "items"} in progress
          </span>
        </summary>
        <ul className="pubs-list" role="list">
          {items.map((p) => (
            <li key={p.slug}>
              <PublicationEntry pub={p} as="h3" />
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
