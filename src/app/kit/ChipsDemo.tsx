"use client";
import { useState } from "react";
import { FilterChips, type ChipOption } from "@/components/ui/FilterChips";

/** Interactive FilterChips demo for the kit page (state only, no URL sync). */
export function ChipsDemo({
  options,
  legend = "Type",
}: {
  options: ChipOption[];
  legend?: string;
}) {
  const [selected, setSelected] = useState<string[]>([options[0]?.value ?? ""]);
  const toggle = (v: string) =>
    setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  return (
    <div className="bl-stack">
      <FilterChips legend={legend} options={options} selected={selected} onToggle={toggle} />
      <p className="t-sm t-muted" aria-live="polite">
        {selected.length} filter{selected.length === 1 ? "" : "s"} selected
      </p>
    </div>
  );
}
