/**
 * The pearl-O on its own (favicon motif, small brand marks). Decorative by
 * default; pass `title` to give it an accessible name.
 * In dark mode the body gets the mandatory --pearl-rim (brief §C2).
 */
export function PearlMark({
  size = 32,
  title,
  className,
}: {
  size?: number | string;
  title?: string;
  className?: string;
}) {
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true as const };
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={["bl-pearlmark", className].filter(Boolean).join(" ")}
      focusable="false"
      {...a11y}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="32" cy="32" r="29" className="bl-wordmark__pearl" />
      <circle cx="32" cy="32" r="28.5" className="bl-wordmark__rim" strokeWidth="1" />
      <path
        d="M14.9 25.8A18.6 18.6 0 0 1 26.3 14.3"
        fill="none"
        stroke="#F7F1E8"
        strokeOpacity="0.25"
        strokeWidth="3.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
