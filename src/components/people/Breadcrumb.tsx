/** Breadcrumb for person pages: People / {name}. Separators are hidden from assistive tech. */
import Link from "next/link";

export function Breadcrumb({
  trail,
  current,
}: {
  trail: Array<{ href: string; label: string }>;
  current: string;
}) {
  return (
    <nav className="pp-crumbs" aria-label="Breadcrumb">
      <ol role="list">
        {trail.map((t) => (
          <li key={t.href}>
            <Link href={t.href}>{t.label}</Link>
            <span className="pp-crumbs__sep" aria-hidden="true">
              /
            </span>
          </li>
        ))}
        <li>
          <span aria-current="page">{current}</span>
        </li>
      </ol>
    </nav>
  );
}
