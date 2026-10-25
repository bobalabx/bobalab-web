/** Optional key figure (§D5.4): image with alt, a numbered caption and a "What this shows" note. */
import type { DirectionView } from "@/lib/content/load";
import { Img } from "@/components/ui/Img";

export function KeyFigure({ figure, number }: { figure: DirectionView["figure"]; number: number }) {
  if (!figure?.image || !figure.alt) return null;
  return (
    <figure className="dr-figure">
      <Img src={figure.image} alt={figure.alt} className="dr-figure__img" />
      <figcaption className="dr-figure__caption">
        <b>Figure {number}.</b> {figure.caption}
        {figure.what_this_shows && (
          <>
            {" "}
            <span className="dr-figure__shows">What this shows: {figure.what_this_shows}</span>
          </>
        )}
      </figcaption>
    </figure>
  );
}
