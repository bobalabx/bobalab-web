/**
 * Date helpers. All "today" logic uses the lab's time zone (America/Los_Angeles)
 * so a build at 23:30 UTC does not flip alumni/upcoming states a day early.
 * Formatting is done from string parts, never through the host's locale/TZ,
 * so server and client output are identical (no hydration mismatch).
 */

export const LAB_TIME_ZONE = "America/Los_Angeles";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface DateParts {
  year: number;
  month?: number; // 1-12
  day?: number; // 1-31
}

/** Parse 'YYYY', 'YYYY-MM', 'YYYY-MM-DD' or an ISO date-time (date part only). */
export function parseDateParts(value: string | number | undefined | null): DateParts | null {
  if (value === undefined || value === null || value === "") return null;
  const s = String(value).trim();
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : undefined;
  const day = m[3] ? Number(m[3]) : undefined;
  if (month !== undefined && (month < 1 || month > 12)) return null;
  if (day !== undefined && (day < 1 || day > 31)) return null;
  return { year, month, day };
}

/** "Oct 20, 2026" · "Oct 2026" · "2026" (brief §D10). `long` spells the month. */
export function formatDate(
  value: string | number | undefined | null,
  opts: { long?: boolean } = {},
): string {
  const p = parseDateParts(value);
  if (!p) return "";
  const names = opts.long ? MONTHS_LONG : MONTHS;
  if (p.month === undefined) return String(p.year);
  const mon = names[p.month - 1];
  if (p.day === undefined) return `${mon} ${p.year}`;
  return `${mon} ${p.day}, ${p.year}`;
}

/** Machine-readable value for <time dateTime>. */
export function toDateTimeAttr(value: string | number | undefined | null): string {
  const p = parseDateParts(value);
  if (!p) return "";
  const mm = p.month ? `-${String(p.month).padStart(2, "0")}` : "";
  const dd = p.day ? `-${String(p.day).padStart(2, "0")}` : "";
  return `${p.year}${mm}${dd}`;
}

/** Today's calendar date in the lab's time zone, as 'YYYY-MM-DD'. */
export function todayInLab(now: Date = buildDate()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LAB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * The build's reference instant. BUILD_DATE (ISO) pins it for reproducible
 * builds and tests; otherwise "now".
 */
export function buildDate(): Date {
  const env = process.env.BUILD_DATE;
  if (env) {
    const d = new Date(env);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Has a 'YYYY' / 'YYYY-MM' / 'YYYY-MM-DD' period fully ended before `today`?
 * A period includes its whole last unit: end '2025' is current through
 * 2025-12-31; end '2025-06' through 2025-06-30.
 */
export function periodEndedBefore(end: string | number, today: string): boolean {
  const e = parseDateParts(end);
  const t = parseDateParts(today);
  if (!e || !t || t.month === undefined || t.day === undefined) return false;
  if (e.month === undefined) return t.year > e.year;
  if (e.day === undefined) return t.year > e.year || (t.year === e.year && t.month > e.month);
  return compareDateParts(t, e) > 0;
}

/** -1 / 0 / 1, comparing missing month/day as the start of the period. */
export function compareDateParts(a: DateParts, b: DateParts): number {
  const ka = [a.year, a.month ?? 0, a.day ?? 0];
  const kb = [b.year, b.month ?? 0, b.day ?? 0];
  for (let i = 0; i < 3; i++) {
    if (ka[i]! !== kb[i]!) return ka[i]! < kb[i]! ? -1 : 1;
  }
  return 0;
}

/** Sort key (descending-friendly) for any supported date string. */
export function dateSortKey(value: string | number | undefined | null): string {
  const p = parseDateParts(value);
  if (!p) return "0000-00-00";
  return `${p.year}-${String(p.month ?? 0).padStart(2, "0")}-${String(p.day ?? 0).padStart(2, "0")}`;
}

/** Is `value` (date or date-time) on or after `today` ('YYYY-MM-DD')? Date part only. */
export function isOnOrAfter(value: string, today: string): boolean {
  const a = parseDateParts(value);
  const b = parseDateParts(today);
  if (!a || !b) return false;
  return compareDateParts(a, b) >= 0;
}
