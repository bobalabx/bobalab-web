/**
 * DirectionPearl — the Fig. 1 pearl outside the home figure (WP1 owns, WP2
 * imports). Shared component contract: keep these props stable.
 *
 *   <DirectionPearl slug="ai-at-work" index={2} swatch="lychee" seedCount={5}
 *                   size="hero" vtName={pearlVtName("ai-at-work")} bloomOnMount />
 *
 * - Renders the matte pearl + index numeral + halo + hairline orbit + seeds
 *   exactly like the home figure (DECISIONS D-02a, docs/design/JUDGE.md).
 * - Decorative: the wrapper is aria-hidden; adjacent text carries the meaning.
 * - `size="hero"` ≈ 120–160 px (direction header); `size="rail"` = 40 px for
 *   the sibling rail (pearl + numeral only: no halo, orbit or seeds).
 * - `vtName` wraps the pearl body in React <ViewTransition name share="pearl-morph"
 *   default="none">. Only ONE mounted element per `pearl-{slug}` name; pass it
 *   only where this pearl is the morph source/target.
 * - `bloomOnMount` replays the destination re-bloom (halo, then seeds) once on
 *   mount. CSS only, inside the motion gate (off under reduced motion).
 * - `seedCount` is the number of counted papers (D-05); at most 12 dots are drawn.
 * - `index={null}` draws an archived direction's quiet pearl (D-04): halo and body
 *   only — no numeral, no seeds, never a view-transition name (WP2 request 3).
 */
import type { JSX } from "react";
import type { SwatchId } from "@/lib/content/palette";
import { Halo, PearlBody, SeedOrbit } from "./parts";
import "./figure.css";

export interface DirectionPearlProps {
  slug: string;
  /** 1…N for live directions; null for an archived (unindexed) direction. */
  index: number | null;
  swatch: SwatchId;
  seedCount: number;
  size: "hero" | "rail";
  vtName?: string;
  bloomOnMount?: boolean;
  className?: string;
}

export function DirectionPearl({
  slug,
  index,
  swatch,
  seedCount,
  size,
  vtName,
  bloomOnMount = false,
  className,
}: DirectionPearlProps): JSX.Element {
  const hero = size === "hero";
  const archived = index == null;
  const cls = ["f1-dp", `f1-dp--${size}`, className].filter(Boolean).join(" ");
  return (
    <span
      className={cls}
      data-swatch={swatch}
      data-slug={slug}
      data-bloom={hero && bloomOnMount && !archived ? "" : undefined}
      aria-hidden="true"
    >
      {hero && <Halo />}
      {hero && !archived && <SeedOrbit papers={seedCount} />}
      <PearlBody index={index} vtName={archived ? undefined : vtName} />
    </span>
  );
}

export default DirectionPearl;
