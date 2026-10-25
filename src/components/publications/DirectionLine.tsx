/**
 * The paper's place on its direction's line (P3 paper.html `.onl`): every
 * counted paper of the direction as a dot in year order, this paper ringed,
 * and the direction's pearl at "now". A small data mark: one dot per paper,
 * nothing decorative. Its accessible name says what it shows; no counting
 * sentence beside it (copy sweep).
 */
import type { CSSProperties } from "react";
import type { SwatchId } from "@/lib/content/palette";

export function DirectionLine({
  label,
  swatch,
  slugs,
  current,
}: {
  label: string;
  swatch: SwatchId;
  /** The direction's counted papers, oldest first. */
  slugs: string[];
  current: string;
}) {
  const at = slugs.indexOf(current);
  if (at < 0) return null;
  const n = slugs.length;
  return (
    <span
      className="pub-onl"
      data-swatch={swatch}
      role="img"
      aria-label={`${label} papers by year, with this one highlighted`}
      style={{ "--n": n } as CSSProperties}
    >
      <span className="pub-onl__dots">
        {slugs.map((s) => (
          <i key={s} className={s === current ? "pub-onl__me" : undefined} />
        ))}
      </span>
      <b className="pub-onl__pearl" />
    </span>
  );
}
