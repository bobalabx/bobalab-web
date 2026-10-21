/**
 * "More directions" rail (§D5.10, §E5): 40 px pearls with index and label.
 * Each rail pearl carries its OWN `pearl-{slug}` name (so it morphs into that
 * direction's hero). The current direction is never in the rail, so every name
 * is mounted once per page. Links slide `nav-forward` / `nav-back` by index.
 */
import Link from "next/link";
import type { DirectionView } from "@/lib/content/load";
import { pearlVtName } from "@/lib/vt";
import { DirectionPearl } from "./DirPearl";
import { plural, railTransition } from "./model";

export function DirectionRail({
  current,
  siblings,
}: {
  current: DirectionView;
  siblings: DirectionView[];
}) {
  const items = siblings.filter((s) => s.slug !== current.slug && s.index != null);
  if (!items.length) return null;
  return (
    <nav className="dr-rail" aria-labelledby="dr-rail-h">
      <h2 id="dr-rail-h" className="dr-rail__title">
        More directions
      </h2>
      <ol className="dr-rail__list" role="list">
        {items.map((s) => (
          <li key={s.slug} data-swatch={s.color}>
            <Link
              href={`/research/${s.slug}/`}
              className="dr-rail__link"
              transitionTypes={[railTransition(current, s)]}
            >
              <DirectionPearl
                slug={s.slug}
                index={s.index!}
                swatch={s.color}
                seedCount={s.counts.papers}
                size="rail"
                vtName={pearlVtName(s.slug)}
              />
              <span className="dr-rail__text">
                <span className="dr-rail__label">{s.short_label}</span>
                <span className="dr-rail__count">{plural(s.counts.papers, "paper")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
