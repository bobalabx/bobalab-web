/**
 * A direction pearl (brief §E2 material, §C9 motif rules). Always decorative
 * (aria-hidden): meaning is carried by adjacent text. It never carries a
 * view-transition name itself — wrap it in <ViewTransition name={pearlVtName(slug)}>
 * where it is the morph source/target (WP1 figure, WP2 header and rail).
 */
import type { CSSProperties } from "react";
import type { SwatchId } from "@/lib/content/palette";
import { pad2 } from "@/lib/content/directions";

export type PearlSize = "rail" | "row" | "card" | "avatar" | "hero";
const GLOSS_SIZES: PearlSize[] = ["rail", "row", "card", "avatar", "hero"]; // all ≥ 32 px

export interface PearlProps {
  swatch?: SwatchId;
  size?: PearlSize;
  /** 1-based direction index, shown as "01". */
  index?: number | null;
  /** Initials for the person avatar variant (instead of an index). */
  initials?: string;
  className?: string;
  style?: CSSProperties;
}

export function Pearl({ swatch, size = "row", index, initials, className, style }: PearlProps) {
  const cls = [
    "bl-pearl",
    `bl-pearl--${size}`,
    GLOSS_SIZES.includes(size) && "bl-pearl--gloss",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} data-swatch={swatch} aria-hidden="true" style={style}>
      {initials ? (
        <span className="bl-pearl__initials">{initials}</span>
      ) : index != null ? (
        <span className="bl-pearl__idx">{pad2(index)}</span>
      ) : null}
    </span>
  );
}
