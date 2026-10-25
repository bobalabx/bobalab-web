/**
 * DirectionPearl — the Fig. 1 pearl outside the home figure (the research package
 * imports it through src/components/direction/DirPearl.ts). Shared component
 * contract: the props are unchanged from the pre-redesign version.
 *
 *   <DirectionPearl slug="ai-at-work" index={2} swatch="lychee" seedCount={5}
 *                   size="hero" vtName={pearlVtName("ai-at-work")} bloomOnMount />
 *
 * - Renders the matte pearl of D-13 item 2: one flat ink disc (light ink in dark
 *   mode), the same element as the pearl at the end of each Fig. 1 lane. No halo,
 *   orbit, seeds or numeral (RC-7).
 * - `size="hero"` = 96 px (P3 Figure 2 pearl, direction header); `size="rail"` =
 *   24 px (P3 strip pearl; sibling rail).
 * - `vtName` wraps the disc in React <ViewTransition name share="pearl-morph"
 *   default="none">. Only ONE mounted element per `pearl-{slug}` name; pass it only
 *   where this pearl is the morph source/target.
 * - `index={null}` draws an archived direction's quiet pearl: an open disc with a
 *   rule-coloured edge, never a view-transition name.
 * - Kept for API stability, no longer drawn: `index` as a numeral, `swatch` (set as
 *   `data-swatch` for callers that colour around it), `seedCount`, `bloomOnMount`
 *   (the morph itself is the arrival; nothing else moves).
 * - Decorative: the wrapper is aria-hidden; adjacent text carries the meaning.
 */
import type { JSX } from "react";
import type { SwatchId } from "@/lib/content/palette";
import { PearlBody } from "./parts";
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
  size,
  vtName,
  className,
}: DirectionPearlProps): JSX.Element {
  const archived = index == null;
  const cls = ["f1-dp", `f1-dp--${size}`, archived ? "f1-dp--quiet" : null, className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} data-swatch={swatch} data-slug={slug} aria-hidden="true">
      <PearlBody vtName={archived ? undefined : vtName} />
    </span>
  );
}

export default DirectionPearl;
