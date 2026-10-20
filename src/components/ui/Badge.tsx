/** Pill badge with a text label (never colour alone). */
import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "strong" | "accent" | "solid" | "draft";

export function Badge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
}) {
  return (
    <span className={`bl-badge${tone !== "neutral" ? ` bl-badge--${tone}` : ""}`}>
      {dot && <span className="bl-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Shown on draft items in preview builds only (DECISIONS D-03). */
export function DraftBadge({ show = true }: { show?: boolean }) {
  if (!show) return null;
  return <Badge tone="draft">Draft · pending lab review</Badge>;
}

/** Derived "Open to RAs" flag (D-05: from open student opportunities). */
export function OpenToRAsBadge() {
  return (
    <Badge tone="accent" dot>
      Open to RAs
    </Badge>
  );
}
