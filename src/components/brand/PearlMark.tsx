/**
 * Brand marks without the word.
 *  - `PearlMark`: the pearl on its own, a flat matte disc in currentColor
 *    (no gloss, no rim, no numeral). Decorative by default.
 *  - `ShoulderMark`: the favicon motif (P2 "shoulder on floor"): three pearls
 *    resting on a rule and one settled on the left shoulder, as tapioca pearls
 *    settle at the bottom of a cup. Same geometry as src/app/icon.svg.
 * Pass `title` to give either an accessible name.
 */
type MarkProps = {
  size?: number | string;
  title?: string;
  className?: string;
};

function a11yOf(title?: string) {
  return title ? { role: "img", "aria-label": title } : { "aria-hidden": true as const };
}

export function PearlMark({ size = 32, title, className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={["bl-pearlmark", className].filter(Boolean).join(" ")}
      focusable="false"
      {...a11yOf(title)}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="32" cy="32" r="30" fill="currentColor" />
    </svg>
  );
}

/** Geometry of the shoulder-on-floor mark in a 16 × 16 box (shared with icon.svg). */
export const SHOULDER = {
  floor: { x: 0, y: 14.5, w: 16, h: 1.5 },
  r: 2.3,
  pearls: [
    [2.8, 12.2],
    [8, 12.2],
    [13.2, 12.2],
    [5.4, 7.7],
  ],
} as const;

export function ShoulderMark({ size = 16, title, className }: MarkProps) {
  const { floor, r, pearls } = SHOULDER;
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className={["bl-shouldermark", className].filter(Boolean).join(" ")}
      focusable="false"
      {...a11yOf(title)}
    >
      {title ? <title>{title}</title> : null}
      <g fill="currentColor">
        <rect x={floor.x} y={floor.y} width={floor.w} height={floor.h} />
        {pearls.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  );
}
