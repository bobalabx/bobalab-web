/**
 * A direction pearl (D-13 item 2): a matte black tapioca pearl, drawn as one
 * flat ink disc. No gloss, halo, rim, gradient or numeral (RC-7: index
 * numerals are a notification-badge tell). In dark mode the disc is light ink.
 * Always decorative (aria-hidden): meaning is carried by adjacent text. It
 * never carries a view-transition name itself — wrap it in
 * <ViewTransition name={pearlVtName(slug)}> where it is the morph source/target.
 *
 * With `initials` it renders the person placeholder instead: a square tile
 * with the initials (people are shown with square photos, D-13 item 5).
 */
import type { CSSProperties } from "react";
import type { SwatchId } from "@/lib/content/palette";

export type PearlSize = "rail" | "row" | "card" | "avatar" | "hero";

export interface PearlProps {
  swatch?: SwatchId;
  size?: PearlSize;
  /** @deprecated Ignored: no numerals inside pearls (RC-7). */
  index?: number | null;
  /** Initials for the person placeholder (a square tile, not a pearl). */
  initials?: string;
  className?: string;
  style?: CSSProperties;
}

export function Pearl({ swatch, size = "row", initials, className, style }: PearlProps) {
  const cls = ["bl-pearl", `bl-pearl--${size}`, initials ? "bl-pearl--initials" : null, className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} data-swatch={swatch} aria-hidden="true" style={style}>
      {initials ? <span className="bl-pearl__initials">{initials}</span> : null}
    </span>
  );
}
