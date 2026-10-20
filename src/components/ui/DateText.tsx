/**
 * A date rendered server-side as "Oct 20, 2026" (or "Oct 2026" / "2026") inside
 * <time dateTime>. Formatting never depends on the visitor's locale or time
 * zone, so there is no hydration mismatch (Next "preventing flash" guide).
 */
import { formatDate, toDateTimeAttr } from "@/lib/content/dates";

export function DateText({
  value,
  long = false,
  className,
}: {
  value: string | number | undefined | null;
  long?: boolean;
  className?: string;
}) {
  const text = formatDate(value, { long });
  if (!text) return null;
  return (
    <time dateTime={toDateTimeAttr(value)} className={className}>
      {text}
    </time>
  );
}
