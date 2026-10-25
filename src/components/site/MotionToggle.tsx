"use client";
/**
 * Footer "Reduce motion" switch (brief §D1, §E7; decision H-14; D-13 item 6),
 * styled as a text toggle (P3 `.tbtn`): underlined like a link, a 2 px ink
 * underline and the word "on" when active. Still a real switch
 * (role="switch", aria-checked). Writes localStorage "bobalab-motion" and
 * <html data-motion="reduce">. Server render and hydration use the "off"
 * snapshot; the real state follows immediately after hydration
 * (useSyncExternalStore), so there is no mismatch.
 */
import { useSyncExternalStore } from "react";
import {
  readStoredMotion,
  setMotionPreference,
  subscribeMotion,
  systemPrefersReducedMotion,
} from "@/lib/site/motion";

const snapshot = () => `${readStoredMotion()}|${systemPrefersReducedMotion() ? 1 : 0}`;
const serverSnapshot = () => "auto|0";

export function MotionToggle() {
  const state = useSyncExternalStore(subscribeMotion, snapshot, serverSnapshot);
  const [stored, os] = state.split("|");
  const on = stored === "reduce";
  const viaSystem = os === "1" && !on;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className="bl-switch"
      onClick={() => setMotionPreference(!on)}
    >
      <span className="bl-switch__label">Reduce motion</span>
      <span className="bl-switch__state" aria-hidden="true">
        {on ? "on" : "off"}
      </span>
      {viaSystem && (
        <span className="bl-switch__note">(already reduced by your system setting)</span>
      )}
    </button>
  );
}
