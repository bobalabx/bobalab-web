/**
 * Hand-drawn inline icons (brief §C7): 24×24, 1.5 px stroke, currentColor,
 * aria-hidden. An icon is never the only label — always pair it with text.
 */
import type { SVGProps } from "react";

const PATHS = {
  "arrow-right": <path d="M4.5 12h14.5m-5.5-5.5L19 12l-5.5 5.5" />,
  external: (
    <>
      <path d="M13.5 4.5h6v6" />
      <path d="M19.5 4.5 11 13" />
      <path d="M17.5 13.5v5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h5" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
      <path d="M15.5 8.5v-3a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  "file-pdf": (
    <>
      <path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3.5Z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M9 13h6M9 16.5h4" />
    </>
  ),
  code: <path d="m8.5 7.5-4.5 4.5 4.5 4.5m7-9 4.5 4.5-4.5 4.5M13.5 5l-3 14" />,
  database: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" />
      <path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </>
  ),
  slides: (
    <>
      <rect x="3.5" y="4.5" width="17" height="11.5" rx="1" />
      <path d="M12 16v3.5M8.5 19.5h7" />
    </>
  ),
  video: (
    <>
      <rect x="3.5" y="6" width="12" height="12" rx="1.5" />
      <path d="m15.5 10.5 5-3v9l-5-3" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="m4 6.5 8 6.5 8-6.5" />
    </>
  ),
  rss: (
    <>
      <path d="M5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14" />
      <circle cx="6" cy="18" r="1.25" fill="currentColor" stroke="none" />
    </>
  ),
  chevron: <path d="m9.5 6 6 6-6 6" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="1.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export function Icon({ name, className, ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={["bl-icon", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
