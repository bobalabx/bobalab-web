"use client";
/**
 * Accessible filter chips (brief §D7, §D9, §G1): real <button aria-pressed>
 * inside a labelled group; one scrolling row on mobile, wrapping on desktop.
 * State is owned by the caller (e.g. a URL-synced filter island).
 */
import type { SwatchId } from "@/lib/content/palette";

export interface ChipOption {
  value: string;
  label: string;
  count?: number;
  /** Direction colour: renders the flat 10 px dot before the label (§C9; WP4 request 3). */
  swatch?: SwatchId;
}

export interface FilterChipsProps {
  legend: string;
  options: ChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
  /** Visually hide the legend (it is still announced). */
  hideLegend?: boolean;
}

export function FilterChips({ legend, options, selected, onToggle, hideLegend }: FilterChipsProps) {
  return (
    <fieldset className="bl-chips">
      <legend className={hideLegend ? "vh" : "bl-chips__legend"}>{legend}</legend>
      <ul className="bl-chips__row" role="list">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <li key={o.value}>
              <button
                type="button"
                className="bl-chip press"
                aria-pressed={on}
                onClick={() => onToggle(o.value)}
              >
                {o.swatch && <span className="bl-dot" data-swatch={o.swatch} aria-hidden="true" />}
                <span>{o.label}</span>
                {o.count !== undefined && (
                  <span className="bl-chip__count">
                    <span className="vh">, </span>
                    {o.count}
                    <span className="vh"> items</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
