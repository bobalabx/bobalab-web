/** Optional key figure (§D5.4): image with alt, caption and a "What this shows" text summary. */
import type { DirectionView } from "@/lib/content/load";
import { Img } from "@/components/ui/Img";

export function KeyFigure({ figure }: { figure: DirectionView["figure"] }) {
  if (!figure?.image || !figure.alt) return null;
  return (
    <figure className="dr-figure">
      <Img src={figure.image} alt={figure.alt} className="dr-figure__img" />
      {figure.caption && <figcaption className="dr-figure__caption">{figure.caption}</figcaption>}
      {figure.what_this_shows && (
        <div className="dr-figure__shows">
          <p className="t-eyebrow">What this shows</p>
          <p>{figure.what_this_shows}</p>
        </div>
      )}
    </figure>
  );
}
