/**
 * Plain-word metadata ("Working paper", "Active", "Open to RAs"): text only, no
 * pill, no border, no dot (D-13 item 5: type and status are plain words).
 * The `.bl-badge` element and class stay so the selector-based tests hold.
 */
import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "strong" | "accent" | "solid" | "draft";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  /** @deprecated No effect: discs mean papers and directions only (RC-8). */
  dot?: boolean;
}) {
  return (
    <span className={tone === "neutral" ? "bl-badge" : `bl-badge bl-badge--${tone}`}>
      {children}
    </span>
  );
}

/**
 * Shown on draft items in preview builds only (DECISIONS D-03): a small muted
 * text marker. `line`: the marker sits on its own line under running text (in
 * block flow, not in a flex/grid row that already has a gap): it gets a block
 * wrapper with the standard stacked-metadata step above it (verify VIS-15).
 */
export function DraftBadge({ show = true, line = false }: { show?: boolean; line?: boolean }) {
  if (!show) return null;
  const badge = <Badge tone="draft">Draft · pending lab review</Badge>;
  return line ? <span className="bl-draft-line">{badge}</span> : badge;
}

/** Derived "Open to RAs" flag (D-05: from open student opportunities). */
export function OpenToRAsBadge() {
  return <Badge tone="accent">Open to RAs</Badge>;
}
