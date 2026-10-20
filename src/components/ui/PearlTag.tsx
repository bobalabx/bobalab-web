/**
 * Direction tag: a 10 px flat dot in the direction tone plus a text label (§C9).
 * Never colour alone. With `href` it is a link (≥ 24 px target).
 */
import Link from "next/link";
import type { SwatchId } from "@/lib/content/palette";

export interface PearlTagProps {
  label: string;
  swatch?: SwatchId;
  href?: string;
  size?: "sm" | "md";
}

export function PearlTag({ label, swatch, href, size = "md" }: PearlTagProps) {
  const dot = (
    <span
      className={`bl-dot${size === "sm" ? "bl-dot--sm" : ""}`}
      data-swatch={swatch}
      aria-hidden="true"
    />
  );
  if (href) {
    return (
      <Link className="bl-tag" href={href} data-swatch={swatch}>
        {dot}
        {label}
      </Link>
    );
  }
  return (
    <span className="bl-tag" data-swatch={swatch}>
      {dot}
      {label}
    </span>
  );
}

/** A list of tags for a set of directions. */
export function PearlTagList({
  items,
  linked = true,
  label = "Research directions",
}: {
  items: Array<{ slug: string; short_label: string; color: SwatchId }>;
  linked?: boolean;
  label?: string;
}) {
  if (!items.length) return null;
  return (
    <ul className="bl-tags" aria-label={label}>
      {items.map((d) => (
        <li key={d.slug}>
          <PearlTag
            label={d.short_label}
            swatch={d.color}
            href={linked ? `/research/${d.slug}/` : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
