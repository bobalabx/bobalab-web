/**
 * Breadcrumb trail (§D6.1; P3 `.crumb`): plain muted links above the h1. The
 * last crumb is the current page (aria-current); it is visually hidden because
 * the h1 directly below says the same thing, but it stays in the trail for
 * assistive technology.
 */
import Link from "next/link";
import type { Crumb } from "./model";

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="pj-crumbs">
      <ol role="list">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li
              key={`${c.label}-${i}`}
              aria-current={last ? "page" : undefined}
              className={last ? "vh" : undefined}
            >
              {c.href && !last ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
