/**
 * "More directions" (§D5.10, §E5; D-13): a compact ruled list in the label
 * column grid, each row the direction's line segment, its name and its paper
 * count. No pearls here (the only pearl on the page is Figure 2's, the morph
 * target), so no view-transition names either. Links slide `nav-forward` /
 * `nav-back` by editorial index.
 */
import Link from "next/link";
import type { DirectionView } from "@/lib/content/load";
import { countsSentence, railTransition } from "./model";

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
    <nav className="dr-rail dr-section" aria-labelledby="dr-rail-h">
      <div className="dr-section__head">
        <h2 id="dr-rail-h" className="dr-section__title">
          More directions
        </h2>
      </div>
      <div className="dr-section__body">
        <ol className="dr-rail__list" role="list">
          {items.map((s) => (
            <li key={s.slug} data-swatch={s.color}>
              <span className="bl-seg" aria-hidden="true" />
              <Link
                href={`/research/${s.slug}/`}
                className="dr-rail__link"
                transitionTypes={[railTransition(current, s)]}
              >
                {s.short_label}
              </Link>
              <span className="dr-rail__count">{countsSentence(s.counts)}</span>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
