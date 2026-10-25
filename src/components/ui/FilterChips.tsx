"use client";
/**
 * Accessible filter toggles (brief §D7, §D9, §G1; D-13 item 5): real
 * <button aria-pressed> inside a labelled group, styled as text toggles
 * (pressed = ink with a 3 px ink underline; unpressed = muted with a 1 px rule
 * underline). Direction options are prefixed by their 16 px line segment.
 * State is owned by the caller (e.g. a URL-synced filter island).
 * The `.bl-chips` / `.bl-chip` class names stay for the selector-based tests.
 */
import type { SwatchId } from "@/lib/content/palette";

export interface ChipOption {
  value: string;
  label: string;
  count?: number;
  /** Direction colour: renders the 16 px line segment before the label. */
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
                {o.swatch && <span className="bl-seg" data-swatch={o.swatch} aria-hidden="true" />}
                <span className="bl-chip__label">{o.label}</span>
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
