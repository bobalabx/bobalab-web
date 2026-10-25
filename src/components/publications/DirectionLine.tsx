/**
 * The paper's place on its direction's line (P3 paper.html `.onl`): every
 * counted paper of the direction as a dot in year order, this paper ringed,
 * and the direction's pearl at "now". A small data mark: one dot per paper,
 * nothing decorative. Text carries the same fact for everyone.
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
    <>
      <span
        className="pub-onl"
        data-swatch={swatch}
        role="img"
        aria-label={`The papers on the ${label} line, oldest first; this paper is ringed.`}
        style={{ "--n": n } as CSSProperties}
      >
        <span className="pub-onl__dots">
          {slugs.map((s) => (
            <i key={s} className={s === current ? "pub-onl__me" : undefined} />
          ))}
        </span>
        <b className="pub-onl__pearl" />
      </span>
      <span className="pub-onl__text">
        {n === 1
          ? "The only paper on this line so far."
          : `One of ${n} papers on this line; the ringed dot is this paper.`}
      </span>
    </>
  );
}
