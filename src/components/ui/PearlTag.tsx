/**
 * Direction tag: a 16 px line segment in the direction's tone plus the
 * direction's name (D-13 item 5; the same legend mark as Fig. 1's lanes).
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
  const seg = (
    <span
      className={size === "sm" ? "bl-dot bl-dot--sm" : "bl-dot"}
      data-swatch={swatch}
      aria-hidden="true"
    />
  );
  if (href) {
    return (
      <Link className="bl-tag" href={href} data-swatch={swatch}>
        {seg}
        {label}
      </Link>
    );
  }
  return (
    <span className="bl-tag" data-swatch={swatch}>
      {seg}
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
