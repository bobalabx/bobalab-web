/**
 * The direction pearl body (DECISIONS D-13 item 2): a matte tapioca pearl drawn as
 * one flat ink disc (light ink in dark mode). No gloss, halo, seeds or numeral.
 * Shared by Fig. 1 (each lane ends in it at "now") and DirectionPearl (direction
 * header and sibling rail), so both draw the same pearl. Always aria-hidden by its
 * caller.
 */
import { ViewTransition } from "react";
import { VT } from "@/lib/vt";

/** The pearl, optionally the morph source/target (one mounted element per name). */
export function PearlBody({ vtName }: { vtName?: string }) {
  const body = <span className="pearl f1-pearl" />;
  if (!vtName) return body;
  return (
    <ViewTransition name={vtName} share={VT.morph} default="none">
      {body}
    </ViewTransition>
  );
}
