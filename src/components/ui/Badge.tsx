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

/**
 * Shown on draft items in preview builds only (DECISIONS D-03).
 * `line`: the badge sits on its own line under running text (in block flow, not
 * in a flex/grid row that already has a gap): it gets a block wrapper with the
 * standard stacked-metadata step above it (verify VIS-15).
 */
export function DraftBadge({ show = true, line = false }: { show?: boolean; line?: boolean }) {
  if (!show) return null;
  const badge = <Badge tone="draft">Draft · pending lab review</Badge>;
  return line ? <span className="bl-draft-line">{badge}</span> : badge;
}

/** Derived "Open to RAs" flag (D-05: from open student opportunities). */
export function OpenToRAsBadge() {
  return (
    <Badge tone="accent" dot>
      Open to RAs
    </Badge>
  );
}
