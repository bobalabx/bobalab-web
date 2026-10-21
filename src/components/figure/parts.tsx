/**
 * Shared decorative parts of a direction pearl (DECISIONS D-02a, JUDGE.md
 * "Pearl body", "Halo", "Seeds and orbit"). Used by the home figure (Fig. 1)
 * and by DirectionPearl (direction header + sibling rail), so both draw the
 * exact same pearl. Everything here is aria-hidden by its caller.
 */
import type { CSSProperties } from "react";
import { ViewTransition } from "react";
import { pad2 } from "@/lib/content/directions";
import { seedLayout } from "@/lib/figure/seeds";
import { VT } from "@/lib/vt";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** The matte pearl body with its index numeral, optionally the morph source/target. */
export function PearlBody({ index, vtName }: { index: number; vtName?: string }) {
  const body = (
    <span className="pearl f1-pearl">
      <span className="f1-idx">{pad2(index)}</span>
    </span>
  );
  if (!vtName) return body;
  return (
    <ViewTransition name={vtName} share={VT.morph} default="none">
      {body}
    </ViewTransition>
  );
}

/** Colour halo behind the pearl (identity at rest, no tint on the pearl itself). */
export function Halo() {
  return <span className="f1-halo" />;
}

/** Hairline orbit with one flat dot per counted paper (≤ 12, capped at ±75°). */
export function SeedOrbit({ papers }: { papers: number }) {
  const seeds = seedLayout(papers);
  return (
    <span className="f1-orbit">
      <span className="f1-ring" />
      <span className="f1-seeds">
        {seeds.map((s) => (
          <i
            key={s.k}
            className="seed f1-seed"
            style={{ "--a": `${s.angle}deg`, "--k": s.k } as Vars}
          />
        ))}
      </span>
    </span>
  );
}
